import { SkipRecordsTracker } from '../skip-records-tracker.js';
import { setupBranch } from './setup-branch';
import { setupClinic } from './setup-clinic.js';
import { setupDepartment } from './setup-department.js';
import { setupDocumentType } from './setup-document-type.js';
import { setupHospital } from './setup-hospital.js';
import { setupLocation } from './setup-location.js';

export async function setupGeneral(sql, logger, skipRecordsTracker, dataDir, cortexApiClient) {
  logger.info('Setting up general data...');

  if (!skipRecordsTracker) {
    skipRecordsTracker = new SkipRecordsTracker(logger);
  }

  await setupBranch(sql, logger, skipRecordsTracker, dataDir);
  await setupDepartment(sql, logger, skipRecordsTracker, dataDir);
  await setupClinic(sql, logger, skipRecordsTracker, dataDir);
  await setupHospital(sql, logger, skipRecordsTracker, dataDir);
  await setupLocation(logger, skipRecordsTracker, dataDir, {
    cortexApiClient,
  });
  await setupDocumentType(sql, logger, skipRecordsTracker, dataDir);

  logger.info('General data setup completed successfully');
}
