import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export async function setupMedicationManufacturer(logger, _skipRecordsTracker, dataDir, { cortexApiClient } = {}) {
  if (!cortexApiClient) {
    throw new Error('cortexApiClient is required');
  }

  const medicationManufacturerFilePath = join(dataDir, 'medication', 'medication_manufacturer.csv');

  const medicationManufacturerFile = readFileSync(medicationManufacturerFilePath);

  if (!medicationManufacturerFile) {
    logger.info('No CSV files found:', medicationManufacturerFilePath);
    return;
  }

  try {
    logger.info(`Importing CSV: medication_manufacturer.csv`);
    const result = await cortexApiClient.importCsv('/medication-manufacturers/import', medicationManufacturerFilePath);
    logger.info(`Successfully imported medication_manufacturer.csv:`, result);
  } catch (err) {
    logger.info(`Failed to import file from ${medicationManufacturerFilePath}:`, err.message || err);
  }
}
