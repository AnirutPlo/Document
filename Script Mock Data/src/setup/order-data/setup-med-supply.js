import fs from 'node:fs';
import { join } from 'node:path';

export async function setupMedSupply(logger, _skipRecordsTracker, dataDir, { cortexApiClient } = {}) {
  if (!cortexApiClient) {
    throw new Error('cortexApiClient is required');
  }

  const medSupplyDir = join(dataDir, 'order-data/med-supply');

  // Read all CSV files in the directory
  const files = fs
    .readdirSync(medSupplyDir)
    .filter((file) => file.endsWith('.csv'))
    .sort();

  if (files.length === 0) {
    logger.info('No CSV files found in', medSupplyDir);
    return;
  }

  for (const fileName of files) {
    const filePath = join(medSupplyDir, fileName);
    try {
      logger.info(`Importing CSV: ${fileName}`);
      const result = await cortexApiClient.importCsv('/medical-supplies/import', filePath);
      logger.info(`Successfully imported ${fileName}:`, result);
    } catch (err) {
      logger.info(`Failed to import ${fileName}:`, err.message || err);
    }
  }
}
