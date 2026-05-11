import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export async function setupInventoryUom(logger, _skipRecordsTracker, dataDir, { cortexApiClient } = {}) {
  if (!cortexApiClient) {
    throw new Error('cortexApiClient is required');
  }

  const inventoryUomFilePath = join(dataDir, 'inventory', 'inventory_uom.csv');

  const inventoryUomFile = readFileSync(inventoryUomFilePath);

  if (!inventoryUomFile) {
    logger.info('No CSV files found:', inventoryUomFilePath);
    return;
  }

  try {
    logger.info(`Importing CSV: inventory_uom.csv`);
    const result = await cortexApiClient.importCsv('/inventory-uoms/import', inventoryUomFilePath);
    logger.info(`Successfully imported inventory_uom.csv:`, result);
  } catch (err) {
    logger.info(`Failed to import file from ${inventoryUomFilePath}:`, err.message || err);
  }
}
