import { setupQueueCounter } from './setup-queue-counter';
import { setupQueueServiceUnit } from './setup-queue-service-unit';
import { setupQueueType } from './setup-queue-type';

export * from './setup-queue-counter';
export * from './setup-queue-service-unit';
export * from './setup-queue-type';

export async function setupQueue(sql, logger, skipRecordsTracker, dataDir) {
  await setupQueueServiceUnit(sql, logger, skipRecordsTracker, dataDir);
  await setupQueueType(sql, logger, skipRecordsTracker, dataDir);
  await setupQueueCounter(sql, logger, skipRecordsTracker, dataDir);
}
