import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export async function setupLocation(logger, _skipRecordsTracker, dataDir, cortexApiClient) {
  if (!cortexApiClient) {
    throw new Error('cortexApiClient is required');
  }

  const locationFilePath = join(dataDir, 'general', 'location.csv');

  const locationFile = readFileSync(locationFilePath);

  if (!locationFile) {
    logger.info('No CSV files found:', locationFilePath);
    return;
  }

  try {
    logger.info(`Importing CSV: location.csv`);
    const result = await cortexApiClient.importCsv('/locations/import', locationFilePath);
    logger.info(`Successfully imported location.csv:`, result);
  } catch (err) {
    logger.info(`Failed to import file from ${locationFilePath}:`, err.message || err);
  }
}
