import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export async function setupDistributor(logger, _skipRecordsTracker, dataDir, { cortexApiClient } = {}) {
  if (!cortexApiClient) {
    throw new Error('cortexApiClient is required');
  }

  const distributorFilePath = join(dataDir, 'medication', 'distributor.csv');

  const distributorFile = readFileSync(distributorFilePath);

  if (!distributorFile) {
    logger.info('No CSV files found:', distributorFilePath);
    return;
  }

  try {
    logger.info(`Importing CSV: distributor.csv`);
    const result = await cortexApiClient.importCsv('/distributors/import', distributorFilePath);
    logger.info(`Successfully imported distributor.csv:`, result);
  } catch (err) {
    logger.info(`Failed to import file from ${distributorFilePath}:`, err.message || err);
  }
}
