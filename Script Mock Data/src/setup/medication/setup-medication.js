import { SkipRecordsTracker } from '../skip-records-tracker.js';
import { setupAdministrationMethod } from './setup-administration-method.js';
import { setupAdministrationMode } from './setup-administration-mode.js';
import { setupAdministrationPreparation } from './setup-administration-preparation.js';
import { setupAdministrativeRoute } from './setup-administrative-route.js';
import { setupAsNeededCondition } from './setup-as-needed-condition.js';
import { setupAtc } from './setup-atc.js';
import { setupBodySite } from './setup-body-site.js';
import { setupDispenseUnit } from './setup-dispense-unit.js';
import { setupDistributor } from './setup-distributor.js';
import { setupDosageForm } from './setup-dosage-form.js';
import { setupDosageFormCategory } from './setup-dosage-form-category.js';
import { setupDosageRateUnit } from './setup-dosage-rate-unit.js';
import { setupDosageUnit } from './setup-dosage-unit.js';
import { setupInventoryCategoryOrderTypeMapping } from './setup-inventory-category-order-type-mapping.js';
import { setupLesion } from './setup-lesion.js';
import { setupMedicationCategory } from './setup-medication-catagory.js';
import { setupMedicationManufacturer } from './setup-medication-manufacturer.js';
import { setupMedicationOrder } from './setup-medication-order.js';
import { setupMedicationSpecPrep } from './setup-medication-spec-prep.js';
import { setupNedReason } from './setup-ned-reason.js';
import { setupNLEM } from './setup-nlem.js';
import { setupSyntaxAdministrationMode } from './setup-syntax-administration-mode.js';
import { setupSyntaxAsNeededCondition } from './setup-syntax-as-needed-condition.js';
import { setupSyntaxDoseUnit } from './setup-syntax-dose-unit.js';
import { setupTpuAtcMapping } from './setup-tpu-atc-mapping.js';

export async function setupMedication(sql, logger, skipRecordsTracker, dataDir, cortexApiClient) {
  logger.info('Setting up medication data...');

  if (!skipRecordsTracker) {
    skipRecordsTracker = new SkipRecordsTracker(logger);
  }

  // Base tables with no dependencies
  await setupAtc(sql, logger, skipRecordsTracker, dataDir);
  await setupTpuAtcMapping(sql, logger, skipRecordsTracker, dataDir);
  await setupMedicationCategory(sql, logger, skipRecordsTracker, dataDir);

  // Administration base tables
  await setupAdministrationMethod(sql, logger, skipRecordsTracker, dataDir);
  await setupAdministrationPreparation(sql, logger, skipRecordsTracker, dataDir);
  await setupAdministrativeRoute(sql, logger, skipRecordsTracker, dataDir);
  await setupLesion(sql, logger, skipRecordsTracker, dataDir);
  await setupBodySite(sql, logger, skipRecordsTracker, dataDir);
  await setupAsNeededCondition(sql, logger, skipRecordsTracker, dataDir);

  // Other tables
  await setupMedicationSpecPrep(sql, logger, skipRecordsTracker, dataDir);
  await setupNLEM(sql, logger, skipRecordsTracker, dataDir);
  await setupNedReason(sql, logger, skipRecordsTracker, dataDir);
  await setupDosageUnit(sql, logger, skipRecordsTracker, dataDir);
  await setupDosageRateUnit(sql, logger, skipRecordsTracker, dataDir);
  await setupDispenseUnit(sql, logger, skipRecordsTracker, dataDir);
  await setupInventoryCategoryOrderTypeMapping(sql, logger, skipRecordsTracker, dataDir);
  await setupDistributor(logger, skipRecordsTracker, dataDir, {
    cortexApiClient: cortexApiClient,
  });
  await setupMedicationManufacturer(logger, skipRecordsTracker, dataDir, {
    cortexApiClient: cortexApiClient,
  });
  await setupDosageFormCategory(logger, skipRecordsTracker, dataDir, {
    cortexApiClient: cortexApiClient,
  });
  await setupDosageForm(logger, skipRecordsTracker, dataDir, {
    cortexApiClient: cortexApiClient,
  });

  // Tables with dependencies (must run after their dependencies)
  await setupAdministrationMode(sql, logger, skipRecordsTracker, dataDir);
  await setupSyntaxAdministrationMode(sql, logger, skipRecordsTracker, dataDir);
  await setupSyntaxAsNeededCondition(sql, logger, skipRecordsTracker, dataDir);
  await setupSyntaxDoseUnit(sql, logger, skipRecordsTracker, dataDir);

  await setupMedicationOrder(logger, skipRecordsTracker, dataDir, {
    cortexApiClient: cortexApiClient,
  });

  logger.info('Medication data setup completed successfully');
}
