import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { requireEnv } from '../helper/index.js';
import { createDemographicApiClient, createTokenManager } from '../service/index.js';
import { setupLogger } from '../setup/logger.js';
import { generatePatients } from './patient/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

const argv = yargs(hideBin(process.argv))
  .option('type', {
    alias: 't',
    type: 'string',
    description: 'Mock data type to generate',
    choices: ['patient'],
    default: 'patient',
  })
  .option('count', {
    alias: 'c',
    type: 'number',
    description: 'Number of records to generate',
    default: 1,
  })
  .option('batch', {
    alias: 'b',
    type: 'number',
    description: 'Batch size for API calls',
    default: 10,
  })
  .option('output-dir', {
    alias: 'o',
    type: 'string',
    description: 'Directory to write generated CSVs',
    default: 'output',
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
  .option('data-dir', {
    alias: 'd',
    type: 'string',
    description: 'Path to data directory (for code tables lookups)',
    default: join(__dirname, '../../assets/data'),
  })
  .help()
  .alias('help', 'h')
  .parse();

const logger = await setupLogger(argv['log-file']);

const services = { tokenManager: null, demographicApiClient: null };
const getTokenManager = () => {
  if (!services.tokenManager) {
    services.tokenManager = createTokenManager({
      tokenUrl: requireEnv('OAUTH2_TOKEN_URL'),
      clientId: requireEnv('CLIENT_ID'),
      clientSecret: requireEnv('CLIENT_SECRET'),
    });
  }
  return services.tokenManager;
};

const getDemographicApiClient = () => {
  if (!services.demographicApiClient) {
    services.demographicApiClient = createDemographicApiClient({
      baseURL: requireEnv('DEMOGRAPHIC_API_URL'),
      tokenManager: getTokenManager(),
    });
  }
  return services.demographicApiClient;
};

async function run() {
  const dataDir = argv['data-dir'];
  logger.info('Starting mock generation...', {
    type: argv.type,
    count: argv.count,
    batch: argv.batch,
    outputDir: argv['output-dir'],
    dataDir,
  });

  if (argv.type === 'patient') {
    await generatePatients(logger, dataDir, { demographicApiClient: getDemographicApiClient() }, argv.count, {
      batchSize: argv.batch,
      outputDir: join(__dirname, '../../', argv['output-dir'] || 'output'),
    });
  } else {
    logger.warn(`Unknown type: ${argv.type}`);
  }

  logger.info('Mock generation completed');
}

run();
