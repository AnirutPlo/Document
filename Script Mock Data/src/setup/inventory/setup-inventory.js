import { SkipRecordsTracker } from '../skip-records-tracker.js';
import { setupInventoryUom } from './setup-inventory-uom.js';
import { setupWarehouse } from './setup-warehouse.js';

export async function setupInventory(logger, skipRecordsTracker, dataDir, cortexApiClient) {
  logger.info('Setting up inventory data...');

  if (!skipRecordsTracker) {
    skipRecordsTracker = new SkipRecordsTracker(logger);
  }

  await setupWarehouse(logger, skipRecordsTracker, dataDir, {
    cortexApiClient: cortexApiClient,
  });

  await setupInventoryUom(logger, skipRecordsTracker, dataDir, {
    cortexApiClient: cortexApiClient,
  });

  logger.info('Inventory data setup completed successfully');
}
