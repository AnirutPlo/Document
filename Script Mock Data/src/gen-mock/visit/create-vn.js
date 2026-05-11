import { createReadStream, createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { parse, format } from 'fast-csv';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import axios from 'axios';
import { requireEnv } from '../../helper/index.js';
import { createCortexApiClient, createTokenManager } from '../../service/index.js';
import { setupLogger } from '../../setup/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const argv = yargs(hideBin(process.argv))
  .option('input', {
    alias: 'i',
    type: 'string',
    description: 'Path to input CSV file',
    demandOption: true,
  })
  .option('batch', {
    alias: 'b',
    type: 'number',
    description: 'Batch size for API calls',
    default: 1,
  })
  .option('delay', {
    type: 'number',
    description: 'Delay in milliseconds between API calls',
    default: 100,
  })
  .option('log-file', {
    alias: 'l',
    type: 'string',
    description: 'Path to log file',
    default: null,
  })
  .option('verbose', {
    alias: 'v',
    type: 'boolean',
    description: 'Enable verbose logging',
    default: false,
  })
  .option('output', {
    alias: 'o',
    type: 'string',
    description: 'Output directory for results',
    default: 'output',
  })
  .example('$0 -i ./visits.csv', 'Create visits from CSV file')
  .example('$0 -i ./visits.csv --batch 5 --delay 200', 'Create visits in batches of 5 with 200ms delay')
  .help()
  .alias('help', 'h')
  .parse();

const logger = await setupLogger(argv['log-file']);

const CREATE_VISIT_MUTATION = `mutation CreateVisit($input: CreateVisitInput!) {
  createVisit(input: $input) {
    visit {
      vn
      hn
    }
    queueExamIds
    queueFifoIds
  }
}`;
// Path ต้องแก้เวลาเปลี่ยนENV
//const EN_API_URL = 'https://dev-x.cortexcloud.co/generated-emr-api/encounter-with-clinic-location';
const EN_API_URL = `${process.env.CORTEX_API_URL.split('/cortex-api')[0]}/generated-emr-api/encounter-with-clinic-location`;
//const EN API URLiffnew URL(requireEn ('CORTEX_API_URL')). origin}/generated-emr-api/encounter-with-clinic-location ;
console.log(EN_API_URL);
async function readCsvFile(csvPath) {
  const rows = [];

  await new Promise((resolve, reject) => {
    createReadStream(csvPath)
      .pipe(parse({ headers: true, trim: true }))
      .on('error', reject)
      .on('data', (row) => rows.push(row))
      .on('end', resolve);
  });

  return rows;
}

/**
 * Converts a CSV row into an API input object for creating a visit.
 *
 * Expected CSV Columns:
 * - hn                      : Required. Hospital Number (string)
 * - clinicId                : Required. Clinic ID (number)
 * - source                  : Visit source (string) default: "kiosk"
 * - encounterType           : Encounter type (string) default: "WALK_IN", options: "WALK_IN", "APPOINTMENT"
 * - preferReceivePostalPrescription : (boolean) e.g. "true" or "false"
 *
 * Insurance Plan Columns (for encounter):
 * - insurancePlanId_1 to insurancePlanId_5 : Optional. Insurance Plan ID (number)
 *
 * Coverage Columns:
 * - coverage_1.insurancePlanId to coverage_5.insurancePlanId : Required if coverage is present. Insurance Plan ID (number)
 * - coverage_1.priority to coverage_5.priority               : Optional. Priority (number) default: i * 10
 * - coverage_1.isChecked to coverage_5.isChecked             : Optional. Is Checked (boolean) default: true
 * - coverage_1.expiredAt to coverage_5.expiredAt             : Optional. Expiration date (string, ISO 8601 format)
 * - coverage_1.budgetLimit to coverage_5.budgetLimit         : Optional. Budget Limit (number)
 * - coverage_1.payorId to coverage_5.payorId                 : Optional. Payor ID (string)
 */
function buildVisitInputFromRow(row) {
  const hn = row.hn;
  const clinicId = Number(row.clinicId);
  const source = row.source || 'kiosk';
  const encounterType = row.encounterType || 'WALK_IN';
  const preferReceivePostalPrescription = row.preferReceivePostalPrescription === 'true' ? true : row.preferReceivePostalPrescription === 'false' ? false : undefined;

  if (!hn) {
    throw new Error('Missing required column: hn');
  }

  if (!clinicId || isNaN(clinicId)) {
    throw new Error('Missing or invalid required column: clinicId');
  }

  // Parse insurance plan IDs for encounter
  const insurancePlanIds = [];
  for (let i = 1; i <= 5; i++) {
    const planId = row[`insurancePlanId_${i}`];
    if (planId && !isNaN(Number(planId))) {
      insurancePlanIds.push(Number(planId));
    }
  }

  // Build encounter input
  const encounterInput = [
    {
      encounterType,
      walkInTarget: {
        clinicId,
      },
      ...(insurancePlanIds.length > 0 && { insurancePlanIds }),
    },
  ];

  // Build coverage input
  const coverageInput = [];
  for (let i = 1; i <= 5; i++) {
    const insurancePlanId = row[`coverage_${i}.insurancePlanId`];
    if (insurancePlanId && !isNaN(Number(insurancePlanId))) {
      const coverage = {
        insurancePlanId: Number(insurancePlanId),
        priority: Number(row[`coverage_${i}.priority`]) || i * 10,
        isChecked: row[`coverage_${i}.isChecked`] !== 'false',
      };

      // Optional fields
      if (row[`coverage_${i}.expiredAt`]) {
        coverage.expiredAt = row[`coverage_${i}.expiredAt`];
      }
      if (row[`coverage_${i}.budgetLimit`] && !isNaN(Number(row[`coverage_${i}.budgetLimit`]))) {
        coverage.budgetLimit = Number(row[`coverage_${i}.budgetLimit`]);
      }
      if (row[`coverage_${i}.payorId`]) {
        coverage.payorId = row[`coverage_${i}.payorId`];
      }

      coverageInput.push(coverage);
    }
  }

  return {
    hn,
    source,
    encounterInput,
    ...(coverageInput.length > 0 && { coverageInput }),
    ...(preferReceivePostalPrescription !== undefined && { preferReceivePostalPrescription }),
  };
}

async function createVisit(cortexApiClient, input, logger) {
  try {
    const response = await cortexApiClient.client.post('/graphql', {
      query: CREATE_VISIT_MUTATION,
      variables: { input },
    });

    if (response.data.errors) {
      return { success: false, errors: response.data.errors };
    }

    const result = response.data.data?.createVisit;
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err.response?.data || err.message };
  }
}

async function fetchEncounterNumber(vn, tokenManager) {
  if (!vn) return '';
  const token = await tokenManager.getAccessToken();
  const url = `${EN_API_URL}?filter[vn][equals]=${vn}`;
  
  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    
    const data = response.data;
    let items = [];
    if (Array.isArray(data)) {
        items = data;
    } else if (data.data && Array.isArray(data.data)) {
        items = data.data;
    } else if (data.results && Array.isArray(data.results)) {
        items = data.results;
    }

    if (items.length > 0) {
        const item = items[0];
        return item.encounterNumber || item.en || item.encounterId || item.code || item.id || '';
    }
    return 'NOT_FOUND';
  } catch (error) {
    console.error(`Error fetching EN for VN ${vn}:`, error.message);
    return 'ERROR';
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  const csvPath = argv.input;
  const batchSize = argv.batch;
  const delay = argv.delay;

  const outputDir = argv.output;

  logger.info(`Reading visits from ${csvPath}`);

  // Read CSV file
  const rows = await readCsvFile(csvPath);
  logger.info(`Found ${rows.length} rows to process`);

  if (rows.length === 0) {
    console.log('No data found in CSV file');
    return;
  }

  // Prepare output
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  const fileName = `visits-${new Date().toISOString().replace(/[:T]/g, '-').split('.')[0]}.csv`;
  const outFile = join(outputDir, fileName);

  // Set up CSV stream with headers
  const csvStream = format({ headers: true });
  const writable = createWriteStream(outFile, { encoding: 'utf-8' });
  csvStream.pipe(writable);

  logger.info(`Output file created at ${outFile}`);

  // Initialize services
  const tokenManager = createTokenManager({
    tokenUrl: requireEnv('OAUTH2_TOKEN_URL'),
    clientId: requireEnv('CLIENT_ID'),
    clientSecret: requireEnv('CLIENT_SECRET'),
  });

  const cortexApiClient = createCortexApiClient({
    baseURL: requireEnv('CORTEX_API_URL'),
    tokenManager,
  });

  // Process rows
  const results = {
    success: [],
    failed: [],
  };

  // Group rows by HN
  const visitsByHn = {};

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const hn = row.hn;

    if (!visitsByHn[hn]) {
      visitsByHn[hn] = {
        hn: hn,
        rows: [],
      };
    }
    visitsByHn[hn].rows.push(row);
  }

  const uniqueHns = Object.keys(visitsByHn);
  logger.info(`GroupBy HN: Found ${uniqueHns.length} unique HNs`);

  for (let i = 0; i < uniqueHns.length; i++) {
    const hn = uniqueHns[i];
    const group = visitsByHn[hn];
    const groupRows = group.rows;

    // Use the first row for visit-level data (source, postal preferences)
    // but aggregate encounterInput and coverageInput from all rows
    const firstRowJSON = buildVisitInputFromRow(groupRows[0]);
    
    // Combine encounters
    const aggregatedEncounterInput = [];
    const aggregatedCoverageInput = [];
    
    // Map existing coverages to avoid duplicates (key: insurancePlanId)
    const coverageMap = new Map();

    for (const row of groupRows) {
      const rowInput = buildVisitInputFromRow(row);
      
      // Add encounters
      if (rowInput.encounterInput) {
        aggregatedEncounterInput.push(...rowInput.encounterInput);
      }

      // Merge coverages (deduplicate by insurancePlanId)
      if (rowInput.coverageInput) {
        for (const cov of rowInput.coverageInput) {
           if (!coverageMap.has(cov.insurancePlanId)) {
             coverageMap.set(cov.insurancePlanId, cov);
             aggregatedCoverageInput.push(cov);
           }
        }
      }
    }

    const finalInput = {
      ...firstRowJSON,
      encounterInput: aggregatedEncounterInput,
      coverageInput: aggregatedCoverageInput.length > 0 ? aggregatedCoverageInput : undefined,
    };

    try {
      if (argv.verbose) {
        logger.info(`Processing HN ${hn} with ${aggregatedEncounterInput.length} encounters`, JSON.stringify(finalInput, null, 2));
      }

      const result = await createVisit(cortexApiClient, finalInput, logger);

      if (result.success) {
        const vn = result.data.visit?.vn;
        const en = await fetchEncounterNumber(vn, tokenManager);

        results.success.push({
          hn: hn,
          vn: vn,
          en: en,
          encountersCount: aggregatedEncounterInput.length
        });
        console.log(`✅ HN ${hn} -> VN ${vn} -> EN ${en} (${aggregatedEncounterInput.length} encounters)`);
        
        // Write to CSV (write one line per HN, or one per encounter? Let's write one per visit for now)
        csvStream.write({
          hn: hn,
          vn: vn,
          en: en,
        });
        
      } else {
        results.failed.push({
          hn: hn,
          error: result.errors || result.error,
        });
        console.error(`❌ HN ${hn} failed -`, JSON.stringify(result.errors || result.error));
      }
    } catch (err) {
      results.failed.push({
        hn: hn,
        error: err.message,
      });
      console.error(`❌ HN ${hn} failed -`, err.message);
    }

    // Add delay between distinct HNs
    if (delay > 0 && i < uniqueHns.length - 1) {
      await sleep(delay);
    }
  }

  // finalize CSV stream
  await new Promise((resolve) => {
    csvStream.end();
    writable.on('finish', resolve);
  });

  console.log(`Total processed: ${rows.length}`);
  console.log(`Success: ${results.success.length}`);
  console.log(`Failed: ${results.failed.length}`);

  if (results.success.length > 0) {
    console.log('\nCreated VNs:');
    results.success.forEach((r) => {
        console.log(`  - Row ${r.rowNum}: HN ${r.hn} -> VN ${r.vn} -> EN ${r.en}`);
    });
  }

  if (results.failed.length > 0) {
    console.log('\nFailed rows:');
    results.failed.forEach((r) => {
      console.log(`  - Row ${r.rowNum}: HN ${r.hn} -> ${JSON.stringify(r.error)}`);
    });
  }

  logger.info('VN creation completed', {
    total: rows.length,
    success: results.success.length,
    failed: results.failed.length,
  });
}

run();
/*สำหรับRun
bun run src/gen-mock/visit/create-vn.js -i assets/data/account-charge-item/visits.csv
*/