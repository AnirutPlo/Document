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

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const argv = yargs(hideBin(process.argv))
  .option('input', {
    alias: 'i',
    type: 'string',
    description: 'Path to input CSV file',
    demandOption: true,
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
 * Required for APIs that need practitioner context (e.g. signOPDOrders).
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

const SIGN_OPD_ORDERS_MUTATION = `mutation SignOPDOrders($input: SignOpdOrderInput!) {
  signOPDOrders(input: $input) {
    accepted
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

/**
 * Extract unique EN values from CSV rows.
 */
function extractUniqueENs(rows) {
  const enSet = new Set();
  for (const row of rows) {
    const en = row.EN || row.en;
    if (en) {
      enSet.add(en);
    }
  }
  return [...enSet];
}

async function signOpdOrder(cortexApiClient, en) {
  try {
    const response = await cortexApiClient.client.post('/graphql', {
      query: SIGN_OPD_ORDERS_MUTATION,
      variables: {
        input: {
          en: en,
        },
      },
    });

    // Log full response for debugging
    //console.log(`📋 Full API Response for EN ${en}:`, JSON.stringify(response.data, null, 2));

    if (response.data.errors) {
      return { success: false, errors: response.data.errors };
    }

    const result = response.data.data?.signOPDOrders;
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
  logger.info(`Found ${rows.length} rows in CSV`);

  if (rows.length === 0) {
    console.log('No data found in CSV file');
    return;
  }

  // Extract unique EN values
  const uniqueENs = extractUniqueENs(rows);
  logger.info(`Found ${uniqueENs.length} unique EN values to sign: ${uniqueENs.join(', ')}`);

  if (uniqueENs.length === 0) {
    console.log('No EN values found in CSV file');
    return;
  }

  // Prepare output
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  const fileName = `sign-orders-${new Date().toISOString().replace(/[:T]/g, '-').split('.')[0]}.csv`;
  const outFile = join(outputDir, fileName);

  const csvStream = format({ headers: true });
  const writable = createWriteStream(outFile, { encoding: 'utf-8' });
  csvStream.pipe(writable);

  logger.info(`Output file created at ${outFile}`);

  // Initialize services - use password grant to login as a practitioner user
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

  for (let i = 0; i < uniqueENs.length; i++) {
    const en = uniqueENs[i];

    try {
      if (argv.verbose) {
        logger.info(`Processing EN ${en} (${i + 1}/${uniqueENs.length})`);
      }

      const result = await signOpdOrder(cortexApiClient, en);

      if (result.success) {
        results.success.push({ en, accepted: result.data?.accepted });

        console.log(`✅ EN ${en} -> Sign Success (accepted: ${result.data?.accepted})`);

        csvStream.write({
          en: en,
          status: 'SUCCESS',
          accepted: result.data?.accepted ?? '',
          error: '',
        });
      } else {
        const errorMsg = JSON.stringify(result.errors || result.error);
        results.failed.push({ en, error: errorMsg });

        console.error(`❌ EN ${en} -> Sign Failed -`, errorMsg);

        csvStream.write({
          en: en,
          status: 'FAILED',
          accepted: '',
          error: errorMsg,
        });
      }
    } catch (err) {
      results.failed.push({ en, error: err.message });
      console.error(`❌ EN ${en} -> Sign Failed -`, err.message);

      csvStream.write({
        en: en,
        status: 'FAILED',
        accepted: '',
        error: err.message,
      });
    }

    if (delay > 0 && i < uniqueENs.length - 1) {
      await sleep(delay);
    }
  }

  await new Promise((resolve) => {
    csvStream.end();
    writable.on('finish', resolve);
  });

  console.log(`\nTotal ENs processed: ${uniqueENs.length}`);
  console.log(`Success: ${results.success.length}`);
  console.log(`Failed: ${results.failed.length}`);

  logger.info('OPD Order signing completed', {
    total: uniqueENs.length,
    success: results.success.length,
    failed: results.failed.length,
  });
}

run();


/*
bun run src/gen-mock/opd-order/sign-order.js -i assets/data/opd-order/orders.csv
*/
