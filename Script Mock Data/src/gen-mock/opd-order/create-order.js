import { createReadStream, createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { parse, format } from 'fast-csv';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import axios from 'axios';
import { requireEnv } from '../../helper/index.js';
import { createCortexApiClient } from '../../service/index.js';
import { setupLogger } from '../../setup/logger.js';
import { randomUUID } from 'node:crypto';

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
  .help()
  .alias('help', 'h')
  .parse();

const logger = await setupLogger(argv['log-file']);

/**
 * Token manager that uses grant_type=password to login as a specific user.
 * Required for APIs that need practitioner context (e.g. upsertOpdOrder).
 */
function createPasswordTokenManager({ tokenUrl, clientId, clientSecret, username, password }) {
  let accessToken = null;
  let expiresAt = 0;
  let refreshPromise = null;
  const safetyWindowMs = 60_000;

  const isTokenValid = () => accessToken && Date.now() + safetyWindowMs < expiresAt;

  const fetchToken = async () => {
    const params = new URLSearchParams();
    params.append('grant_type', 'password');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('username', username);
    params.append('password', password);

    const response = await axios.post(tokenUrl, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const { access_token: newToken, expires_in: expiresIn } = response.data ?? {};
    if (!newToken) throw new Error('Unable to retrieve access token');

    const expiresInMs = Number(expiresIn) * 1000;
    accessToken = newToken;
    expiresAt = Number.isFinite(expiresInMs) && expiresInMs > 0 ? Date.now() + expiresInMs : Date.now() + safetyWindowMs;
    return accessToken;
  };

  const getAccessToken = async () => {
    if (isTokenValid()) return accessToken;
    if (!refreshPromise) refreshPromise = fetchToken();
    try { await refreshPromise; } finally { refreshPromise = null; }
    return accessToken;
  };

  return { getAccessToken, invalidate: () => { accessToken = null; expiresAt = 0; } };
}

const UPSERT_OPD_ORDER_MUTATION = `mutation UpsertOpdOrder($input: UpsertOpdOrderInput!) {
  upsertOpdOrder(input: $input) {
    medicationRequests {
      id
      reMedicationRequestId
      complexityTypeCode {
        code
        system
        display
      }
      productCode
      currentState
      careflowStep
      isMedicalSupply
      dispenseType
      isStat
      dispenseAmount {
        dispenseAmount
        dispenseUnit
        duration
      }
      parsableDirection
      overallDirectionDescription
      additionalInstruction
      therapeuticIntent
      therapeuticDirections {
        sequence
        duration
        durationStartDateTime
        durationEndDateTime
        dosages {
          sequence
          dose {
            quantity
            unit
          }
          formula {
            quantity
            unit
          }
          description
          dayOfWeeks
        }
      }
      calculatedDose {
        quantity
        unit
      }
      remark
      nedCategory
      diagnosis {
        code
        system
        display
      }
      authorizedForms {
        name
        url
      }
      estimatedPrice {
        reimbursablePrice
        nonReimbursablePrice
        totalPrice
      }
      pharmacyRoom {
        id
        code
        info {
          th {
            name
            shortName
          }
          en {
            name
            shortName
          }
        }
      }
      createdAt
      createdBy {
        id
        display
      }
      updatedAt
      updatedBy {
        id
        display
      }
    }
  }
}`;

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

function buildOpdOrderInputFromRow(row) {
  const en = row.EN || row.en;
  const productCode = row.productCode;
  //const isStat = row.isStat === 'true';
  const isStat = row.isStat?.toLowerCase() === 'true';
  const quantity = Number(row.quantity);
  const unit = row.unit;
  const parsableDirection = row.parsableDirection;
  const overallDirectionDescription = row.overallDirectionDescription;
  const dispenseType = row.dispenseType;

  if (!en) throw new Error('Missing required column: EN');
  if (!productCode) throw new Error('Missing required column: productCode');

  // Default dates
  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + 28); // +28 days default

  return {
    en: en,
    authorizingPractitionerId: 2, // Default: Practitioner ID 1 (นาย ทดสอบ มานะ - physician)
    medicationOrder: {
      medicationRequests: [
        {
          id: randomUUID(),
          productCode: productCode,
          complexityTypeCode: {
            code: "simple",
            display: "Simple",
            system: "internal"
          },
          isMedicalSupply: false,
          dispenseType: dispenseType,
          isStat: isStat,
          dispenseAmount: {
            quantity: quantity,
            unit: unit,
            duration: ""
          },
          parsableDirection: parsableDirection,
          overallDirectionDescription: overallDirectionDescription,
          therapeuticDirections: [
            {
              duration: "P28D",
              durationStartDateTime: now.toISOString(),
              durationEndDateTime: endDate.toISOString(),
              dosages: [
                {
                  description: "1 tab po bid" // Default dosage description as user didn't provide column
                }
              ]
            }
          ],
          calculatedDose: null,
          remark: "Created from script",
          nedCategory: null,
          diagnosis: null,
          authorizedForms: []
        }
      ],
      requestedPharmacyLocationID: 2 // Default from example (Dev=2)
    }
  };
}

async function createOpdOrder(cortexApiClient, input) {
  try {
    const response = await cortexApiClient.client.post('/graphql', {
      query: UPSERT_OPD_ORDER_MUTATION,
      variables: { input },
    });

    // Log full response for debugging
    //console.log('📋 Full API Response:', JSON.stringify(response.data, null, 2));

    if (response.data.errors) {
      return { success: false, errors: response.data.errors };
    }

    const result = response.data.data?.upsertOpdOrder;
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err.response?.data || err.message };
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  const csvPath = argv.input;
  const delay = argv.delay;
  const outputDir = argv.output;

  logger.info(`Reading orders from ${csvPath}`);

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
  const fileName = `opd-orders-${new Date().toISOString().replace(/[:T]/g, '-').split('.')[0]}.csv`;
  const outFile = join(outputDir, fileName);

  const csvStream = format({ headers: true });
  const writable = createWriteStream(outFile, { encoding: 'utf-8' });
  csvStream.pipe(writable);

  logger.info(`Output file created at ${outFile}`);
//
  // Initialize services - use password grant to login as a practitioner user
  // upsertOpdOrder requires the token to belong to a user linked to a practitioner
  const tokenManager = createPasswordTokenManager({
    tokenUrl: requireEnv('OAUTH2_TOKEN_URL'),
    clientId: requireEnv('CLIENT_ID'),
    clientSecret: requireEnv('CLIENT_SECRET'),
    username: 'user1',
    password: 'MyPassw0rd',
  });

  const cortexApiClient = createCortexApiClient({
    baseURL: requireEnv('CORTEX_API_URL'),
    tokenManager,
  });

  const results = {
    success: [],
    failed: [],
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    try {
      const input = buildOpdOrderInputFromRow(row);

      if (argv.verbose) {
        logger.info(`Row ${rowNum}: Processing EN ${input.en}`, JSON.stringify(input, null, 2));
      }

      const result = await createOpdOrder(cortexApiClient, input);

      if (result.success) {
        results.success.push({
          rowNum,
          en: input.en,
          medicationRequests: result.data.medicationRequests.map(r => r.id).join(', ')
        });

        console.log(`✅ Row ${rowNum}: EN ${input.en} -> Success`);

        csvStream.write({
          en: input.en,
           productCode: row.productCode,
          status: 'SUCCESS',
          medicationRequestIds: result.data.medicationRequests.map(r => r.id).join(', '),
          error: ''
        });

      } else {
        const errorMsg = JSON.stringify(result.errors || result.error);
        results.failed.push({
          rowNum,
          en: input.en,
          error: errorMsg,
        });
        console.error(`❌ Row ${rowNum}: EN ${input.en} failed -`, errorMsg);
        
        csvStream.write({
          en: input.en || row.EN || row.en,
          productCode: row.productCode,
          status: 'FAILED',
          medicationRequestIds: '',
          error: errorMsg
        });
      }
    } catch (err) {
      results.failed.push({
        rowNum,
        en: row.EN || row.en,
        error: err.message,
      });
      console.error(`❌ Row ${rowNum}: EN ${row.EN || row.en} failed -`, err.message);

      csvStream.write({
        en: row.EN || row.en,
        productCode: row.productCode,
        status: 'FAILED',
        medicationRequestIds: '',
        error: err.message
      });
    }

    if (delay > 0 && i < rows.length - 1) {
      await sleep(delay);
    }
  }

  await new Promise((resolve) => {
    csvStream.end();
    writable.on('finish', resolve);
  });

  console.log(`\nTotal processed: ${rows.length}`);
  console.log(`Success: ${results.success.length}`);
  console.log(`Failed: ${results.failed.length}`);

  logger.info('OPD Order creation completed', {
    total: rows.length,
    success: results.success.length,
    failed: results.failed.length,
  });
}

run();


/*
bun run src/gen-mock/opd-order/create-order.js -i assets/data/opd-order/orders.csv
*/