import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import postgres from 'postgres';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { requireEnv } from '../helper/index.js';
import {
  createCortexApiClient,
  createDemographicApiClient,
  createKeycloakAdminClient,
  createTokenManager,
} from '../service/index.js';
import {
  setupBenefitPlan,
  setupCoverage,
  setupInsurancePlan,
  setupNHSOInsurancePlanMapping,
  setupPayor,
} from './coverage';
import {
  setupAboBloodGroup,
  setupDemographic,
  setupDistrict,
  setupEducationLevel,
  setupGender,
  setupIdentityVerificationMode,
  setupInformationGiverOption,
  setupLanguage,
  setupMaritalStatus,
  setupNamePrefix,
  setupNationality,
  setupOccupation,
  setupPatientCategory,
  setupProvince,
  setupRace,
  setupReligion,
  setupRhBloodGroup,
  setupSubDistrict,
  setupThaiAddress,
} from './demographic';
import {
  setupCSMBSCategory,
  setupFinance,
  setupNhsoCategory,
  setupPaymentCategory,
  setupPaymentMethod,
  setupProductCategory,
  setupSIMBCategory,
} from './finance/index.js';
import {
  setupBranch,
  setupClinic,
  setupDepartment,
  setupDocumentType,
  setupGeneral,
  setupHospital,
  setupLocation,
  setupLocationType,
} from './general';
import { setupInventory } from './inventory';
import { setupLogger } from './logger.js';
import {
  setupAdministrationMethod,
  setupAdministrationMode,
  setupAdministrationPreparation,
  setupAdministrativeRoute,
  setupAsNeededCondition,
  setupAtc,
  setupBodySite,
  setupDispenseUnit,
  setupDosageForm,
  setupDosageRateUnit,
  setupInventoryCategoryOrderTypeMapping,
  setupLesion,
  setupMedication,
  setupMedicationCategory,
  setupMedicationSpecPrep,
  setupNedReason,
  setupNLEM,
  setupSyntaxAdministrationMode,
  setupSyntaxAsNeededCondition,
  setupSyntaxDoseUnit,
  setupTpuAtcMapping,
} from './medication';
import { setupCurrency, setupImaging, setupLab, setupMedSupply } from './order-data';
import { setupPrintTemplate } from './print-template';
import { setupProduct } from './product/index.js';
import { setupQueue, setupQueueCounter, setupQueueServiceUnit, setupQueueType } from './queue';
import { SkipRecordsTracker } from './skip-records-tracker.js';
import { setupPractitioners, setupUserAllowedBranch, setupUsers } from './user/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .option('mode', {
    alias: 'm',
    type: 'string',
    description: 'Setup mode: all or modules',
    choices: ['all', 'modules', 'entity'],
    default: 'all',
  })
  .option('modules', {
    type: 'string',
    description: 'Comma-separated list of modules to setup (demographic,general,coverage)',
    implies: ['mode'],
    coerce: (arg) => {
      // Convert comma-separated string to array
      return arg ? arg.split(',').map((m) => m.trim()) : [];
    },
  })
  .option('entities', {
    type: 'string',
    description:
      'Comma-separated list of entities to setup (nationality,occupation,branch,clinic,department,benefit_plan, payor, insurance_plan, atc, atc-mapper, medication_category, administrative_route, medication_spec_prep, nlem, ned_reason, dosage_form, dispense_unit, inventory_category_order_type_mapping, product_category,nhso_category,csmbs_category,simb_category,document_type,user_allowed_branch,hospital)',
    implies: ['mode'],
    coerce: (arg) => {
      // Convert comma-separated string to array
      return arg ? arg.split(',').map((e) => e.trim()) : [];
    },
  })
  .option('log-file', {
    alias: 'l',
    type: 'string',
    description: 'Path to log file',
    default: null,
  })
  .option('verbose', {
    alias: 'v',
    type: 'boolean',
    description: 'Enable verbose logging',
    default: false,
  })
  .option('data-dir', {
    alias: 'd',
    type: 'string',
    description: 'Path to data directory (must contain demographic/ general/ and coverage/ subdirectories)',
    default: join(__dirname, '../../assets/data'),
  })
  .check((argv) => {
    // Validate modules when mode is 'modules'
    if (argv.mode === 'modules' && (!argv.modules || argv.modules.length === 0)) {
      throw new Error('When mode is "modules", you must specify at least one module using --modules');
    }

    // Validate entities when mode is 'entity'
    if (argv.mode === 'entity' && (!argv.entities || argv.entities.length === 0)) {
      throw new Error('When mode is "entity", you must specify at least one entity using --entities');
    }

    // Validate module names
    if (argv.modules && argv.modules.length > 0) {
      const allowedModules = [
        'demographic',
        'general',
        'coverage',
        'lab',
        'imaging',
        'med-supply',
        'medication',
        'finance',
        'user',
        'inventory',
        'practitioners',
        'queue',
        'print-template',
      ];
      const invalidModules = argv.modules.filter((m) => !allowedModules.includes(m));

      if (invalidModules.length > 0) {
        throw new Error(
          `Invalid modules: ${invalidModules.join(', ')}. Allowed modules are: ${allowedModules.join(', ')}`,
        );
      }
    }

    // Validate entity names
    if (argv.entities && argv.entities.length > 0) {
      const allowedEntities = [
        'nationality',
        'occupation',
        'product',
        'product_category',
        'nhso_category',
        'csmbs_category',
        'simb_category',
        'education_level',
        'language',
        'marital_status',
        'race',
        'religion',
        'identity_verification_mode',
        'information_giver_option',
        'branch',
        'clinic',
        'department',
        'location',
        'ward',
        'queue_service_unit',
        'queue_type',
        'queue_counter',
        'benefit_plan',
        'payor',
        'insurance_plan',
        'document_type',
        'atc',
        'atc-mapper',
        'administration_method',
        'administration_mode',
        'administration_preparation',
        'administrative_route',
        'as_needed_condition',
        'body_site',
        'ned_reason',
        'dosage_form',
        'dosage_rate_unit',
        'lesion',
        'medication_category',
        'syntax_administration_mode',
        'syntax_as_needed_condition',
        'syntax_dose_unit',
        'dispense_unit',
        'inventory_category_order_type_mapping',
        'currency',
        'gender',
        'location_type',
        'nhso_category',
        'name_prefix',
        'payment_category',
        'patient_category',
        'csmbs_category',
        'simb_category',
        'payment_method',
        'thai_address',
        'district',
        'sub_district',
        'province',
        'rh_blood_group',
        'abo_blood_group',
        'nhso_insurance_plan_mapping',
        'user_allowed_branch',
        'hospital',
        'print_template',
      ];
      const invalidEntities = argv.entities.filter((e) => !allowedEntities.includes(e));

      if (invalidEntities.length > 0) {
        throw new Error(
          `Invalid entities: ${invalidEntities.join(', ')}. Allowed entities are: ${allowedEntities.join(', ')}`,
        );
      }
    }

    // Validate data directory structure
    if (argv['data-dir']) {
      const fs = require('node:fs');
      const path = require('node:path');
      const dataDir = path.resolve(argv['data-dir']);

      if (!fs.existsSync(dataDir)) {
        throw new Error(`Data directory does not exist: ${dataDir}`);
      }

      // Check for required subdirectories
      const requiredDirs = [
        'demographic',
        'general',
        'coverage',
        'order-data',
        'medication',
        'finance',
        'user',
        'queue',
      ];
      const missingDirs = requiredDirs.filter((dir) => !fs.existsSync(path.join(dataDir, dir)));

      if (missingDirs.length > 0) {
        throw new Error(
          `Data directory is missing required subdirectories: ${missingDirs.join(', ')}\n` +
            `Expected structure: ${dataDir}/{demographic,general,coverage,order-data,medication,user}/`,
        );
      }
    }

    return true;
  })
  .help()
  .alias('help', 'h')
  .parse();

// Setup logger
const logger = await setupLogger(argv['log-file']);

const sql = postgres({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'emr',
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
  ssl: process.env.POSTGRES_SSL_MODE,
});

async function runSetup() {
  try {
    const dataDir = require('node:path').resolve(argv['data-dir']);

    logger.info('Starting database setup...', {
      mode: argv.mode,
      modules: argv.modules || 'all',
      entities: argv.entities || 'none',
      logFile: argv['log-file'],
      verbose: argv.verbose,
      dataDir: dataDir,
    });

    // Create skip records tracker
    const skipRecordsTracker = new SkipRecordsTracker(logger);

    const services = {
      tokenManager: null,
      cortexApiClient: null,
      demographicApiClient: null,
      keycloakAdminClient: null,
    };

    const getTokenManager = () => {
      if (!services.tokenManager) {
        services.tokenManager = createTokenManager({
          tokenUrl: requireEnv('OAUTH2_TOKEN_URL'),
          clientId: requireEnv('CLIENT_ID'),
          clientSecret: requireEnv('CLIENT_SECRET'),
        });
      }
      return services.tokenManager;
    };

    const getCortexApiClient = () => {
      if (!services.cortexApiClient) {
        services.cortexApiClient = createCortexApiClient({
          baseURL: requireEnv('CORTEX_API_URL'),
          tokenManager: getTokenManager(),
        });
      }
      return services.cortexApiClient;
    };

    const getDemographicApiClient = () => {
      if (!services.demographicApiClient) {
        services.demographicApiClient = createDemographicApiClient({
          baseURL: requireEnv('DEMOGRAPHIC_API_URL'),
          tokenManager: getTokenManager(),
        });
      }
      return services.demographicApiClient;
    };

    const getKeycloakAdminClient = () => {
      if (!services.keycloakAdminClient) {
        services.keycloakAdminClient = createKeycloakAdminClient({
          baseURL: requireEnv('KEYCLOAK_BASE_URL'),
          realm: requireEnv('KEYCLOAK_REALM'),
          tokenManager: getTokenManager(),
        });
      }
      return services.keycloakAdminClient;
    };

    // Determine what to run based on mode
    if (argv.mode === 'entity') {
      // Run specific entities
      const entitiesToRun = argv.entities;
      logger.info(`Entities to setup: ${entitiesToRun.join(', ')}`);

      // Execute selected entities
      for (const entity of entitiesToRun) {
        switch (entity) {
          case 'nationality':
            logger.info('Running nationality entity...');
            await setupNationality(sql, logger, skipRecordsTracker, dataDir);
            logger.info('Nationality entity completed');
            break;

          case 'occupation':
            logger.info('Running occupation entity...');
            await setupOccupation(sql, logger, skipRecordsTracker, dataDir);
            logger.info('Occupation entity completed');
            break;

          case 'education_level':
            logger.info('Running education_level entity...');
            await setupEducationLevel(sql, logger, skipRecordsTracker, dataDir);
            logger.info('Education_level entity completed');
            break;

          case 'language':
            logger.info('Running language entity...');
            await setupLanguage(sql, logger, skipRecordsTracker, dataDir);
            logger.info('Language entity completed');
            break;

          case 'marital_status':
            logger.info('Running marital_status entity...');
            await setupMaritalStatus(sql, logger, skipRecordsTracker, dataDir);
            logger.info('Marital_status entity completed');
            break;

          case 'race':
            logger.info('Running race entity...');
            await setupRace(sql, logger, skipRecordsTracker, dataDir);
            logger.info('Race entity completed');
            break;

          case 'religion':
            logger.info('Running religion entity...');
            await setupReligion(sql, logger, skipRecordsTracker, dataDir);
            logger.info('Religion entity completed');
            break;

          case 'identity_verification_mode':
            logger.info('Running identity_verification_mode entity...');
            await setupIdentityVerificationMode(sql, logger, skipRecordsTracker, dataDir);
            logger.info('Identity verification mode entity completed');
            break;

          case 'information_giver_option':
            logger.info('Running information_giver_option entity...');
            await setupInformationGiverOption(sql, logger, skipRecordsTracker, dataDir);
            logger.info('Information giver option entity completed');
            break;

          case 'branch':
            logger.info('Running branch entity...');
            await setupBranch(sql, logger, skipRecordsTracker, dataDir);
            logger.info('Branch entity completed');
            break;

          case 'clinic':
            logger.info('Running clinic entity...');
            await setupClinic(sql, logger, skipRecordsTracker, dataDir);
            logger.info('Clinic entity completed');
            break;

          case 'department':
            logger.info('Running department entity...');
            await setupDepartment(sql, logger, skipRecordsTracker, dataDir);
            logger.info('Department entity completed');
            break;

          case 'location':
            logger.info('Running location entity...');
            await setupLocation(logger, skipRecordsTracker, dataDir, getCortexApiClient());
            logger.info('Location entity completed');
            break;

          case 'hospital':
            logger.info('Running hospital entity...');
            await setupHospital(sql, logger, skipRecordsTracker, dataDir);
            logger.info('Hospital entity completed');
            break;

          case 'benefit_plan':
            logger.info('Running benefit plan entity...');
            await setupBenefitPlan(sql, logger, skipRecordsTracker, dataDir);
            logger.info('Benefit plan entity completed');
            break;
          case 'payor':
            logger.info('Running payor entity...');
            await setupPayor(sql, logger, skipRecordsTracker, dataDir);
            logger.info('Payor entity completed');
            break;
          case 'insurance_plan':
            logger.info('Running insurance plan entity...');
            await setupInsurancePlan(sql, logger, skipRecordsTracker, dataDir);
            logger.info('Insurance plan entity completed');
            break;

          case 'document_type':
            logger.info('Running document_type entity...');
            await setupDocumentType(sql, logger, skipRecordsTracker, dataDir);
            logger.info('Document_type entity completed');
            break;

          case 'atc':
            logger.info('Running atc entity...');
            await setupAtc(sql, logger, skipRecordsTracker, dataDir);
            logger.info('Atc entity completed');
            break;

          case 'atc-mapper':
            logger.info('Running atc-mapper entity...');
            await setupTpuAtcMapping(sql, logger, skipRecordsTracker, dataDir);
            logger.info('Atc-mapper entity completed');
            break;

          case 'medication_category':
            logger.info('Running medication_category entity...');
            await setupMedicationCategory(sql, logger, skipRecordsTracker, dataDir);
            logger.info('medication_category entity completed');
            break;

          case 'administrative_route':
            logger.info('Running administrative_route entity...');
            await setupAdministrativeRoute(sql, logger, skipRecordsTracker, dataDir);
            logger.info('administrative_route entity completed');
            break;

          case 'administration_method':
            logger.info('Running administration_method entity...');
            await setupAdministrationMethod(sql, logger, skipRecordsTracker, dataDir);
            logger.info('administration_method entity completed');
            break;

          case 'administration_mode':
            logger.info('Running administration_mode entity...');
            await setupAdministrationMode(sql, logger, skipRecordsTracker, dataDir);
            logger.info('administration_mode entity completed');
            break;

          case 'administration_preparation':
            logger.info('Running administration_preparation entity...');
            await setupAdministrationPreparation(sql, logger, skipRecordsTracker, dataDir);
            logger.info('administration_preparation entity completed');
            break;

          case 'as_needed_condition':
            logger.info('Running as_needed_condition entity...');
            await setupAsNeededCondition(sql, logger, skipRecordsTracker, dataDir);
            logger.info('as_needed_condition entity completed');
            break;

          case 'body_site':
            logger.info('Running body_site entity...');
            await setupBodySite(sql, logger, skipRecordsTracker, dataDir);
            logger.info('body_site entity completed');
            break;

          case 'dosage_rate_unit':
            logger.info('Running dosage_rate_unit entity...');
            await setupDosageRateUnit(sql, logger, skipRecordsTracker, dataDir);
            logger.info('dosage_rate_unit entity completed');
            break;

          case 'dispense_unit':
            logger.info('Running dispense_unit entity...');
            await setupDispenseUnit(sql, logger, skipRecordsTracker, dataDir);
            logger.info('dispense_unit entity completed');
            break;

          case 'inventory_category_order_type_mapping':
            logger.info('Running inventory_category_order_type_mapping entity...');
            await setupInventoryCategoryOrderTypeMapping(sql, logger, skipRecordsTracker, dataDir);
            logger.info('inventory_category_order_type_mapping entity completed');
            break;

          case 'lesion':
            logger.info('Running lesion entity...');
            await setupLesion(sql, logger, skipRecordsTracker, dataDir);
            logger.info('lesion entity completed');
            break;

          case 'syntax_administration_mode':
            logger.info('Running syntax_administration_mode entity...');
            await setupSyntaxAdministrationMode(sql, logger, skipRecordsTracker, dataDir);
            logger.info('syntax_administration_mode entity completed');
            break;

          case 'syntax_as_needed_condition':
            logger.info('Running syntax_as_needed_condition entity...');
            await setupSyntaxAsNeededCondition(sql, logger, skipRecordsTracker, dataDir);
            logger.info('syntax_as_needed_condition entity completed');
            break;

          case 'syntax_dose_unit':
            logger.info('Running syntax_dose_unit entity...');
            await setupSyntaxDoseUnit(sql, logger, skipRecordsTracker, dataDir);
            logger.info('syntax_dose_unit entity completed');
            break;

          case 'medication_spec_prep':
            logger.info('Running medication_spec_prep entity...');
            await setupMedicationSpecPrep(sql, logger, skipRecordsTracker, dataDir);
            logger.info('medication_spec_prep entity completed');
            break;

          case 'nlem':
            logger.info('Running nlem entity...');
            await setupNLEM(sql, logger, skipRecordsTracker, dataDir);
            logger.info('nlem entity completed');
            break;
          case 'ned_reason':
            logger.info('Running ned_reason entity...');
            await setupNedReason(sql, logger, skipRecordsTracker, dataDir);
            logger.info('ned_reason entity completed');
            break;

          case 'dosage_form':
            logger.info('Running nldosage_formem entity...');
            await setupDosageForm(sql, logger, skipRecordsTracker, dataDir);
            logger.info('dosage_form entity completed');
            break;
          case 'product_category':
            logger.info('Running product_category entity...');
            await setupProductCategory(sql, logger, skipRecordsTracker, dataDir);
            logger.info('Product_category entity completed');
            break;
          case 'product':
            logger.info('Running product entity...');
            await setupProduct(sql, logger, skipRecordsTracker, dataDir);
            logger.info('Product entity completed');
            break;
          case 'nhso_category':
            logger.info('Running nhso_category entity...');
            await setupNhsoCategory(sql, logger, skipRecordsTracker, dataDir);
            logger.info('Nhso_category entity completed');
            break;
          case 'csmbs_category':
            logger.info('Running csmbs_category entity...');
            await setupCSMBSCategory(sql, logger, skipRecordsTracker, dataDir);
            logger.info('Nhso_category entity completed');
            break;
          case 'simb_category':
            logger.info('Running simb_category entity...');
            await setupSIMBCategory(sql, logger, skipRecordsTracker, dataDir);
            logger.info('Nhso_category entity completed');
            break;
          case 'currency':
            logger.info('Running currency entity...');
            await setupCurrency(sql, logger, skipRecordsTracker, dataDir);
            logger.info('Currency entity completed');
            break;
          case 'gender':
            logger.info('Running gender entity...');
            await setupGender(sql, logger, skipRecordsTracker, dataDir);
            logger.info('Gender entity completed');
            break;
          case 'ward':
            logger.info('Running ward entity...');
            await setupWard(sql, logger, skipRecordsTracker, dataDir);
            logger.info('Ward entity completed');
            break;
          case 'queue_service_unit':
            logger.info('Running queue_service_unit entity...');
            await setupQueueServiceUnit(sql, logger, skipRecordsTracker, dataDir);
            logger.info('Queue_service_unit entity completed');
            break;
          case 'queue_type':
            logger.info('Running queue_type entity...');
            await setupQueueType(sql, logger, skipRecordsTracker, dataDir);
            logger.info('Queue_type entity completed');
            break;
          case 'queue_counter':
            logger.info('Running queue_counter entity...');
            await setupQueueCounter(sql, logger, skipRecordsTracker, dataDir);
            logger.info('Queue_counter entity completed');
            break;
          case 'location_type':
            logger.info('Running location_type entity...');
            await setupLocationType(sql, logger, skipRecordsTracker, dataDir);
            logger.info('Location_type entity completed');
            break;
          case 'name_prefix':
            logger.info('Running name_prefix entity...');
            await setupNamePrefix(sql, logger, skipRecordsTracker, dataDir);
            logger.info('Name_prefix entity completed');
            break;
          case 'abo_blood_group':
            logger.info('Running abo_blood_group entity...');
            await setupAboBloodGroup(sql, logger, skipRecordsTracker, dataDir);
            logger.info('Abo_blood_group entity completed');
            break;
          case 'thai_address':
            logger.info('Running thai_address entity...');
            await setupThaiAddress(sql, logger, skipRecordsTracker, dataDir);
            logger.info('Thai_address entity completed');
            break;
          case 'rh_blood_group':
            logger.info('Running rh_blood_group entity...');
            await setupRhBloodGroup(sql, logger, skipRecordsTracker, dataDir);
            logger.info('Rh_blood_group entity completed');
            break;
          case 'nhso_insurance_plan_mapping':
            logger.info('Running nhso_insurance_plan_mapping entity...');
            await setupNHSOInsurancePlanMapping(sql, logger, skipRecordsTracker, dataDir);
            logger.info('Nhso_insurance_plan_mapping entity completed');
            break;
          case 'payment_category':
            logger.info('Running payment_category entity...');
            await setupPaymentCategory(sql, logger, skipRecordsTracker, dataDir);
            logger.info('Payment_category entity completed');
            break;
          case 'patient_category':
            logger.info('Running patient_category entity...');
            await setupPatientCategory(sql, logger, skipRecordsTracker, dataDir);
            logger.info('Patient_category entity completed');
            break;
          case 'province':
            logger.info('Running province entity...');
            await setupProvince(sql, logger, skipRecordsTracker, dataDir);
            logger.info('Province entity completed');
            break;
          case 'district':
            logger.info('Running district entity...');
            await setupDistrict(sql, logger, skipRecordsTracker, dataDir);
            logger.info('District entity completed');
            break;
          case 'payment_method':
            logger.info('Running payment_method entity...');
            await setupPaymentMethod(sql, logger, skipRecordsTracker, dataDir);
            logger.info('Payment_method entity completed');
            break;
          case 'sub_district':
            logger.info('Running sub_district entity...');
            await setupSubDistrict(sql, logger, skipRecordsTracker, dataDir);
            logger.info('Sub_district entity completed');
            break;
          case 'user_allowed_branch':
            logger.info('Running user_allowed_branch entity...');
            await setupUserAllowedBranch(sql, logger, skipRecordsTracker, {
              keycloakAdminClient: getKeycloakAdminClient(),
              realm: requireEnv('KEYCLOAK_REALM'),
            });
            logger.info('User_allowed_branch entity completed');
            break;
          case 'print_template':
            logger.info('Running print_template entity...');
            await setupPrintTemplate(sql, logger, skipRecordsTracker, dataDir);
            logger.info('Print_template entity completed');
            break;
          default:
            logger.warn(`Unknown entity: ${entity}, skipping...`);
        }
      }
    } else {
      // Run modules (all or specific)
      let modulesToRun = [];

      if (argv.mode === 'all') {
        // Run all modules
        modulesToRun = [
          'demographic',
          'general',
          'coverage',
          'lab',
          'imaging',
          'med-supply',
          'medication',
          'finance',
          'practitioners',
          'queue',
          'print-template',
        ];
      } else if (argv.mode === 'modules' && argv.modules) {
        // Run only specified modules
        modulesToRun = argv.modules;
      }

      logger.info(`Modules to setup: ${modulesToRun.join(', ')}`);

      // Execute selected modules
      for (const module of modulesToRun) {
        switch (module) {
          case 'demographic':
            logger.info('Running demographic module...');
            getDemographicApiClient();
            await setupDemographic(sql, logger, skipRecordsTracker, dataDir);
            logger.info('Demographic module completed');
            break;

          case 'general':
            logger.info('Running general module...');
            await setupGeneral(sql, logger, skipRecordsTracker, dataDir, getCortexApiClient());
            logger.info('General module completed');
            break;

          case 'coverage':
            logger.info('Running coverage module...');
            await setupCoverage(sql, logger, skipRecordsTracker, dataDir);
            logger.info('Coverage module completed');
            break;

          case 'finance':
            logger.info('Running coverage module...');
            await setupFinance(sql, logger, skipRecordsTracker, dataDir);
            logger.info('Coverage module completed');
            break;

          case 'medication':
            logger.info('Running medication module...');
            await setupMedication(sql, logger, skipRecordsTracker, dataDir, getCortexApiClient());
            logger.info('Medication module completed');
            break;

          case 'lab':
            logger.info('Running lab module...');
            await setupLab(logger, skipRecordsTracker, dataDir, {
              cortexApiClient: getCortexApiClient(),
            });
            logger.info('Lab module completed');
            break;

          case 'imaging':
            logger.info('Running imaging module...');
            await setupImaging(logger, skipRecordsTracker, dataDir, {
              cortexApiClient: getCortexApiClient(),
            });
            logger.info('Imaging module completed');
            break;

          case 'med-supply':
            logger.info('Running med-supply module...');
            await setupMedSupply(logger, skipRecordsTracker, dataDir, {
              cortexApiClient: getCortexApiClient(),
            });
            logger.info('Med-supply module completed');
            break;

          case 'print-template':
            logger.info('Running print-template module...');
            await setupPrintTemplate(sql, logger, skipRecordsTracker, dataDir);
            logger.info('Print-template module completed');
            break;

          case 'user':
            logger.info('Running user module...');
            await setupUsers(sql, logger, skipRecordsTracker, dataDir, {
              keycloakAdminClient: getKeycloakAdminClient(),
              realm: requireEnv('KEYCLOAK_REALM'),
              outputDir: join(__dirname, '../../output'),
            });
            logger.info('User module completed');
            break;
          case 'inventory':
            logger.info('Running inventory module...');
            await setupInventory(logger, skipRecordsTracker, dataDir, getCortexApiClient());
            logger.info('Inventory module completed');
            break;

          case 'practitioners': {
            logger.info('Running practitioners module...');
            const practitionerCsvPath = join(dataDir, '/user/user.csv');
            await setupPractitioners(sql, logger, practitionerCsvPath, skipRecordsTracker, {
              keycloakAdminClient: getKeycloakAdminClient(),
            });
            logger.info('Practitioners module completed');
            break;
          }

          case 'queue':
            logger.info('Running queue module...');
            await setupQueue(sql, logger, skipRecordsTracker, dataDir);
            logger.info('Queue module completed');
            break;

          default:
            logger.warn(`Unknown module: ${module}, skipping...`);
        }
      }
    }

    // Print skip records report
    skipRecordsTracker.logReport();

    // Optionally save report to file
    const totalSkipped = skipRecordsTracker.getTotalSkippedCount();
    if (totalSkipped > 0) {
      const reportPath = join(__dirname, '../../logs', `skip-records-${new Date().toISOString().split('T')[0]}.txt`);
      skipRecordsTracker.saveReportToFile(reportPath);
    }

    logger.info('Setup completed successfully');
  } catch (error) {
    logger.error('Setup failed: {*}', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      constraint: error.constraint,
      stack: error.stack,
    });
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runSetup();
