import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'csv-parse/sync';
import { validateConfig, validateInfoName } from '../../utils';

export async function setupClinic(sql, logger, skipRecordsTracker, dataDir) {
  logger.info('Setting up clinic data...');

  const clinicPath = join(dataDir, 'general/clinic.csv');
  const clinicData = readFileSync(clinicPath, 'utf-8');

  const clinics = parse(clinicData, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    cast: (value) => {
      if (value === 'TRUE') return true;
      if (value === 'FALSE') return false;
      if (value === '') return null;
      return value;
    },
  });

  logger.info(`Processing ${clinics.length} clinics...`);

  // Fetch all departments and create a code-to-id mapping
  const departments = await sql`
    SELECT id, code FROM department
  `;

  const departmentCodeToId = new Map(departments.map((dept) => [dept.code, dept.id]));

  const systemUser = 'system';
  const now = new Date();

  const queueServiceUnitCodes = await sql`
    SELECT id, code FROM queue_service_unit
  `;

  const queueServiceUnitCodeToId = new Map(queueServiceUnitCodes.map((unit) => [unit.code, unit.id]));

  // Filter and map clinics with valid department codes
  const validClinics = [];

  for (const clinic of clinics) {
    const departmentCode = clinic.department_code;
    const departmentId = departmentCodeToId.get(departmentCode);

    if (!departmentId) {
      logger.warn(`Skipping clinic ${clinic.code} - department code '${departmentCode}' not found`);
      skipRecordsTracker.addSkippedRecord('clinic', clinic, `Department code '${departmentCode}' not found`);
      continue;
    }

    const queueServiceUnitCode = clinic.queue_service_unit_code;
    const queueServiceUnitId = queueServiceUnitCodeToId.get(queueServiceUnitCode);

    let opdPreAssessmentFormConfig = null;
    const resultOpdPreAssessmentFormConfig = validateConfig(
      clinic,
      'opd_pre_assessment_form_config',
      ['name', 'version', 'templateId'],
      skipRecordsTracker,
    );

    if (resultOpdPreAssessmentFormConfig.status === 'complete') {
      opdPreAssessmentFormConfig = resultOpdPreAssessmentFormConfig.config;
    }

    let customOpdCardConfig = null;
    const resultCustomOpdCardConfig = validateConfig(
      clinic,
      'custom_opd_card_config',
      ['name', 'version', 'templateId'],
      skipRecordsTracker,
    );

    if (resultCustomOpdCardConfig.status === 'complete') {
      customOpdCardConfig = resultCustomOpdCardConfig.config;
    }

    validClinics.push({
      external_id: clinic.external_id,
      code: clinic.code,
      active: clinic.active,
      department_id: departmentId,
      name: clinic.name,
      info: validateInfoName(clinic),
      queue_service_unit_id: queueServiceUnitId || null,
      require_diagnosis: clinic.require_diagnosis || null,
      require_chief_complaint: clinic.require_chief_complaint || true,
      recommend_icd10: clinic.recommend_icd10 || null,
      csop_code: clinic.csop_code || null,
      nhso_code: clinic.nhso_code || null,
      opd_pre_assessment_form_config: opdPreAssessmentFormConfig,
      custom_opd_card_config: customOpdCardConfig,
      allow_skip_walk_in_request: clinic.allow_skip_walk_in_request || false,
      allow_doctor_fee: clinic.allow_doctor_fee || false,
      doctor_fee_product_code: clinic.doctor_fee_product_code || null,
      no_doctor_fee_product_code: clinic.no_doctor_fee_product_code || null,
      created_by: systemUser,
      updated_by: systemUser,
      created_at: now,
      updated_at: now,
    });
  }

  if (validClinics.length === 0) {
    logger.warn('No clinics to insert - all clinics have invalid department codes');
    return;
  }

  const skippedCount = skipRecordsTracker.getSkippedCount('clinic');
  logger.info(`Upserting ${validClinics.length} clinics (${skippedCount} skipped)...`);

  try {
    await sql`
      INSERT INTO clinic ${sql(validClinics, 'external_id', 'code', 'active', 'department_id', 'name', 'info', 'queue_service_unit_id', 'require_diagnosis', 'require_chief_complaint', 'recommend_icd10', 'csop_code', 'nhso_code', 'opd_pre_assessment_form_config', 'custom_opd_card_config', 'allow_skip_walk_in_request', 'allow_doctor_fee', 'doctor_fee_product_code', 'no_doctor_fee_product_code', 'created_by', 'updated_by', 'created_at', 'updated_at')}
      ON CONFLICT (code)
      DO UPDATE SET
        external_id = EXCLUDED.external_id,
        active = EXCLUDED.active,
        department_id = EXCLUDED.department_id,
        name = EXCLUDED.name,
        info = EXCLUDED.info,
        queue_service_unit_id = EXCLUDED.queue_service_unit_id,
        require_diagnosis = EXCLUDED.require_diagnosis,
        require_chief_complaint = EXCLUDED.require_chief_complaint,
        recommend_icd10 = EXCLUDED.recommend_icd10,
        csop_code = EXCLUDED.csop_code,
        nhso_code = EXCLUDED.nhso_code,
        opd_pre_assessment_form_config = EXCLUDED.opd_pre_assessment_form_config,
        custom_opd_card_config = EXCLUDED.custom_opd_card_config,
        allow_skip_walk_in_request = EXCLUDED.allow_skip_walk_in_request,
        allow_doctor_fee = EXCLUDED.allow_doctor_fee,
        doctor_fee_product_code = EXCLUDED.doctor_fee_product_code,
        no_doctor_fee_product_code = EXCLUDED.no_doctor_fee_product_code,
        updated_at = EXCLUDED.updated_at,
        updated_by = EXCLUDED.updated_by
    `;
  } catch (bulkErr) {
    const code = bulkErr.code ?? 'unknown';
    logger.error(`Bulk insert failed for clinic (code=${code}): ${bulkErr.message}`);
    skipRecordsTracker.addSkippedRecord('clinic', code, bulkErr.message);
  }

  logger.info('Clinic data upserted successfully');
}
