import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export async function setupDosageFormCategory(logger, _skipRecordsTracker, dataDir, { cortexApiClient } = {}) {
  if (!cortexApiClient) {
    throw new Error('cortexApiClient is required');
  }

  const dosageFormCategoryFilePath = join(dataDir, 'medication', 'dosage_form_category.csv');

  const dosageFormCategoryFile = readFileSync(dosageFormCategoryFilePath);

  if (!dosageFormCategoryFile) {
    logger.info('No CSV files found:', dosageFormCategoryFilePath);
    return;
  }

  try {
    logger.info(`Importing CSV: dosage_form_category.csv`);
    const result = await cortexApiClient.importCsv('/dosage-form-categories/import', dosageFormCategoryFilePath);
    logger.info(`Successfully imported dosage_form_category.csv:`, result);
  } catch (err) {
    logger.info(`Failed to import file from ${dosageFormCategoryFilePath}:`, err.message || err);
  }
}
