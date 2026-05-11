import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export async function setupDosageForm(logger, _skipRecordsTracker, dataDir, { cortexApiClient } = {}) {
  if (!cortexApiClient) {
    throw new Error('cortexApiClient is required');
  }

  const dosageFormFilePath = join(dataDir, 'medication', 'dosage_form.csv');

  const dosageFormFile = readFileSync(dosageFormFilePath);

  if (!dosageFormFile) {
    logger.info('No CSV files found:', dosageFormFilePath);
    return;
  }

  try {
    logger.info(`Importing CSV: dosage_form.csv`);
    const result = await cortexApiClient.importCsv('/dosage-forms/import', dosageFormFilePath);
    logger.info(`Successfully imported dosage_form.csv:`, result);
  } catch (err) {
    logger.info(`Failed to import file from ${dosageFormFilePath}:`, err.message || err);
  }
}
