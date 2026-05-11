import fs from 'node:fs';
import { join } from 'node:path';

export async function setupMedicationOrder(logger, _skipRecordsTracker, dataDir, { cortexApiClient } = {}) {
  if (!cortexApiClient) {
    throw new Error('cortexApiClient is required');
  }

  const medicationDir = join(dataDir, 'order-data/medication');

  // Read all CSV files in the directory
  const files = fs
    .readdirSync(medicationDir)
    .filter((file) => file.endsWith('.csv'))
    .sort();

  if (files.length === 0) {
    logger.info('No CSV files found in', medicationDir);
    return;
  }

  for (const fileName of files) {
    const filePath = join(medicationDir, fileName);
    try {
      logger.info(`Importing CSV: ${fileName}`);
      const result = await cortexApiClient.importCsv('/medications/import', filePath);

      logger.info(`Successfully imported ${fileName}:`, result);
    } catch (err) {
      logger.info(`Failed to import ${fileName}:`, err.message || err);
    }
  }
}
