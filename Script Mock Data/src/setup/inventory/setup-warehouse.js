import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export async function setupWarehouse(logger, _skipRecordsTracker, dataDir, { cortexApiClient } = {}) {
  if (!cortexApiClient) {
    throw new Error('cortexApiClient is required');
  }

  const warehouseFilePath = join(dataDir, 'inventory', 'warehouse.csv');

  const warehouseFile = readFileSync(warehouseFilePath);

  if (!warehouseFile) {
    logger.info('No CSV files found:', warehouseFilePath);
    return;
  }

  try {
    logger.info(`Importing CSV: warehouse.csv`);
    const result = await cortexApiClient.importCsv('/inventory-warehouses/import', warehouseFilePath);
    logger.info(`Successfully imported warehouse.csv:`, result);
  } catch (err) {
    logger.info(`Failed to import file from ${warehouseFilePath}:`, err.message || err);
  }
}
