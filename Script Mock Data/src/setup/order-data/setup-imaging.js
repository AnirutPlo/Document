import fs from 'node:fs';
import { join } from 'node:path';

export async function setupImaging(logger, _skipRecordsTracker, dataDir, { cortexApiClient } = {}) {
  if (!cortexApiClient) {
    throw new Error('cortexApiClient is required');
  }

  const labDir = join(dataDir, 'order-data/imaging');

  // Read all CSV files in the directory
  const files = fs
    .readdirSync(labDir)
    .filter((file) => file.endsWith('.csv'))
    .sort();

  if (files.length === 0) {
    logger.info('No CSV files found in', labDir);
    return;
  }

  for (const fileName of files) {
    const filePath = join(labDir, fileName);
    try {
      logger.info(`Importing CSV: ${fileName}`);
      const result = await cortexApiClient.importCsv('/imagings/import', filePath);
      logger.info(`Successfully imported ${fileName}:`, result);
    } catch (err) {
      logger.info(`Failed to import ${fileName}:`, err.message || err);
    }
  }
}
