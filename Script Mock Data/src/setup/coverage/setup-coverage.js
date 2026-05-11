import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'csv-parse/sync';
import { validateInfoName } from '../../utils';

export async function setupBenefitPlan(sql, logger, skipRecordsTracker, dataDir) {
  logger.info('Setting up benefit plan data...');

  const benefitPlanPath = join(dataDir, 'coverage/benefit-plan.csv');
  const benefitPlanData = readFileSync(benefitPlanPath, 'utf-8');

  const benefitPlans = parse(benefitPlanData, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    cast: (value, _context) => {
      if (value === 'TRUE') return true;
      if (value === 'FALSE') return false;
      return value;
    },
  });

  logger.info(`Upserting ${benefitPlans.length} benefit plans...`);
  const systemUser = 'system';
  const now = new Date();

  const values = benefitPlans.map((benefitPlan) => ({
    id: benefitPlan.id,
    code: benefitPlan.code,
    name: benefitPlan.name,
    active: benefitPlan.active,
    created_at: now,
    created_by: systemUser,
    updated_at: now,
    updated_by: systemUser,
  }));

  try {
    await sql`
    INSERT INTO benefit_plan ${sql(
      values,
      'id',
      'code',
      'name',
      'active',
      'created_at',
      'created_by',
      'updated_at',
      'updated_by',
    )}
    ON CONFLICT (code)
    DO UPDATE SET
      id = EXCLUDED.id,
      code = EXCLUDED.code,
      name = EXCLUDED.name,
      active = EXCLUDED.active,
      created_at = EXCLUDED.created_at,
      created_by = EXCLUDED.created_by,
      updated_at = EXCLUDED.updated_at,
      updated_by = EXCLUDED.updated_by
  `;
  } catch (bulkErr) {
    const code = bulkErr.code ?? 'unknown';
    logger.error(`Bulk insert failed for benefit_plan (code=${code}): ${bulkErr.message}`);
    skipRecordsTracker.addSkippedRecord('benefit_plan', code, bulkErr.message);
  }

  logger.info('Benefit plan data upserted successfully');
}

export async function setupPayor(sql, logger, skipRecordsTracker, dataDir) {
  logger.info('Setting up payor data...');

  const payorPath = join(dataDir, 'coverage/payor.csv');
  const payorData = readFileSync(payorPath, 'utf-8');

  const payors = parse(payorData, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    cast: (value, _context) => {
      if (value === 'TRUE') return true;
      if (value === 'FALSE') return false;
      if (value === '') return null;
      return value;
    },
  });

  logger.info(`Upserting ${payors.length} payors...`);

  const systemUser = 'system';
  const now = new Date();

  const values = payors.map((payor) => ({
    id: payor.id,
    code: payor.code,
    name: payor['info.th.name'],
    active: payor.active === true,
    info: validateInfoName(payor),
    created_at: now,
    created_by: systemUser,
    updated_at: now,
    updated_by: systemUser,
  }));

  const batchSize = 500;
  for (let i = 0; i < values.length; i += batchSize) {
    const batch = values.slice(i, i + batchSize);
    logger.info(
      `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
        values.length / batchSize,
      )} (${batch.length} records)`,
    );

    try {
      await sql`
      INSERT INTO payor ${sql(
        batch,
        'id',
        'code',
        'name',
        'active',
        'info',
        'created_at',
        'created_by',
        'updated_at',
        'updated_by',
      )}
      ON CONFLICT (code)
      DO UPDATE SET
        code = EXCLUDED.code,
        name = EXCLUDED.name,
        active = EXCLUDED.active,
        info = EXCLUDED.info,
        updated_at = EXCLUDED.updated_at,
        updated_by = EXCLUDED.updated_by
    `;
    } catch (bulkErr) {
      const code = bulkErr?.code ?? 'unknown';
      const message = `Bulk insert failed for payor batch ${Math.floor(i / batchSize) + 1}: ${bulkErr.message} (code=${code})`;
      logger.error(message);
      skipRecordsTracker.addSkippedRecord('payor', '-', message);
    }
    logger.info('Payor data upserted successfully');
  }
}

export async function setupInsurancePlan(sql, logger, skipRecordsTracker, dataDir) {
  logger.info('Setting up insurance plan data...');

  const insurancePlanPath = join(dataDir, 'coverage/insurance-plan.csv');
  const insurancePlanData = readFileSync(insurancePlanPath, 'utf-8');

  const insurancePlans = parse(insurancePlanData, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    cast: (value) => {
      if (value === 'TRUE') return true;
      if (value === 'FALSE') return false;
      return value;
    },
  });

  logger.info(`Upserting ${insurancePlans.length} insurance plan...`);

  const payors = await sql`
    SELECT id, code FROM payor
  `;

  const payorCodeToId = new Map(payors.map((payor) => [payor.code, payor.id]));

  const benefitPlans = await sql`
    SELECT id, code FROM benefit_plan
  `;

  const benefitPlanCodeToId = new Map(benefitPlans.map((benefitPlan) => [benefitPlan.code, benefitPlan.id]));

  const systemUser = 'system';
  const now = new Date();

  const validInsurancePlans = [];

  const CLAIM_PLATFORM_ENUM = ['MANUAL', 'E_CLAIM', 'CSOP', 'SSOP', 'AIPN', 'CIPN', 'DMIS_CAPD'];

  const normalizeClaimPlatform = (value) => {
    if (!value) return null;
    const key = String(value).trim().replaceAll('-', '_');
    const found = CLAIM_PLATFORM_ENUM.find((v) => v.toLowerCase() === key.toLowerCase());
    return found || null;
  };

  for (const insurancePlan of insurancePlans) {
    const payorId = payorCodeToId.get(insurancePlan.payor_id) || null;
    const benefitPlanId = benefitPlanCodeToId.get(insurancePlan.benefit_plan_id) || null;

    const extraClaimPlatform = (
      insurancePlan.extra_claim_platform ? String(insurancePlan.extra_claim_platform).split(',') : []
    )
      .map((v) => normalizeClaimPlatform(v))
      .filter((v) => v !== null);

    const uniqueExtraClaimPlatform = Array.from(new Set(extraClaimPlatform));

    validInsurancePlans.push({
      name: insurancePlan['info.th.name'],
      code: insurancePlan.code,
      active: insurancePlan.active || true,
      info: validateInfoName(insurancePlan),
      is_default: insurancePlan.is_default,
      eclaim_statement_format: insurancePlan.eclaim_statement_format || null,
      ipd_benefit_type: insurancePlan.ipd_benefit_type || null,
      opd_benefit_type: insurancePlan.opd_benefit_type || null,
      total_included_in_insurance_plan_id: insurancePlan.total_included_in_insurance_plan_id || [],
      allow_combine_with_other: insurancePlan.allow_combine_with_other || true,
      payor_id: payorId,
      nhso_insurance_plan_category_code: insurancePlan.nhso_insurance_plan_category_code || null,
      validation_method_code: insurancePlan.validation_method_code,
      is_refer: insurancePlan.is_refer,
      is_require_budget: insurancePlan.is_require_budget,
      is_require_document: insurancePlan.is_require_document,
      is_require_expire_date_time: insurancePlan.is_require_expire_date_time,
      benefit_plan_id: benefitPlanId,
      is_iclaim: insurancePlan.is_iclaim,
      require_payor_input: insurancePlan.require_payor_input,
      csop_pay_plan: insurancePlan.csop_pay_plan || null,
      claim_opd_platform: normalizeClaimPlatform(insurancePlan.claim_opd_platform),
      claim_ipd_platform: normalizeClaimPlatform(insurancePlan.claim_ipd_platform),
      extra_claim_platform: uniqueExtraClaimPlatform,
      created_at: now,
      created_by: systemUser,
      updated_at: now,
      updated_by: systemUser,
    });
  }

  try {
    await sql`
    INSERT INTO insurance_plan ${sql(
      validInsurancePlans,
      'name',
      'code',
      'active',
      'info',
      'is_default',
      'payor_id',
      'nhso_insurance_plan_category_code',
      'validation_method_code',
      'is_refer',
      'is_require_budget',
      'is_require_document',
      'is_require_expire_date_time',
      'benefit_plan_id',
      'is_iclaim',
      'require_payor_input',
      'claim_opd_platform',
      'claim_ipd_platform',
      'extra_claim_platform',
      'csop_pay_plan',
      'eclaim_statement_format',
      'ipd_benefit_type',
      'opd_benefit_type',
      'total_included_in_insurance_plan_id',
      'allow_combine_with_other',
      'created_at',
      'created_by',
      'updated_at',
      'updated_by',
    )}
    ON CONFLICT (code)
    DO UPDATE SET
      name = EXCLUDED.name,
      active = EXCLUDED.active,
      info = EXCLUDED.info,
      is_default = EXCLUDED.is_default,
      payor_id = EXCLUDED.payor_id,
      nhso_insurance_plan_category_code = EXCLUDED.nhso_insurance_plan_category_code,
      validation_method_code = EXCLUDED.validation_method_code,
      is_refer = EXCLUDED.is_refer,
      is_require_budget = EXCLUDED.is_require_budget,
      is_require_document = EXCLUDED.is_require_document,
      is_require_expire_date_time = EXCLUDED.is_require_expire_date_time,
      benefit_plan_id = EXCLUDED.benefit_plan_id,
      is_iclaim = EXCLUDED.is_iclaim,
      require_payor_input = EXCLUDED.require_payor_input,
      claim_opd_platform = EXCLUDED.claim_opd_platform,
      claim_ipd_platform = EXCLUDED.claim_ipd_platform,
      extra_claim_platform = EXCLUDED.extra_claim_platform,
      csop_pay_plan = EXCLUDED.csop_pay_plan,
      eclaim_statement_format = EXCLUDED.eclaim_statement_format,
      ipd_benefit_type = EXCLUDED.ipd_benefit_type,
      opd_benefit_type = EXCLUDED.opd_benefit_type,
      total_included_in_insurance_plan_id = EXCLUDED.total_included_in_insurance_plan_id,
      allow_combine_with_other = EXCLUDED.allow_combine_with_other,
      updated_at = EXCLUDED.updated_at,
      updated_by = EXCLUDED.updated_by
  `;
  } catch (bulkErr) {
    const code = bulkErr.code ?? 'unknown';
    logger.error(`Bulk insert failed for insurance_plan (code=${code}): ${bulkErr.message}`);
    skipRecordsTracker.addSkippedRecord('insurance_plan', code, bulkErr.message);
  }

  logger.info('Insurance plan data upserted successfully');
}

export async function setupNHSOInsurancePlanMapping(sql, logger, skipRecordsTracker, dataDir) {
  logger.info('Setting up NHSO insurance plan mapping data...');

  const nhsoInsurancePlanMappingPath = join(dataDir, 'coverage/nhso-insurance-plan-mapping.csv');
  const nhsoInsurancePlanMappingData = readFileSync(nhsoInsurancePlanMappingPath, 'utf-8');

  const nhsoInsurancePlanMappings = parse(nhsoInsurancePlanMappingData, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    cast: (value) => {
      if (value === 'TRUE') return true;
      if (value === 'FALSE') return false;
      return value;
    },
  });

  logger.info(`Upserting ${nhsoInsurancePlanMappings.length} NHSO insurance plan mappings...`);

  const insurancePlans = await sql`
    SELECT id,code FROM insurance_plan
  `;

  const insurancePlanCodeToId = new Map(insurancePlans.map((insurancePlan) => [insurancePlan.code, insurancePlan.id]));

  const systemUser = 'system';
  const now = new Date();

  const nhsoMappingsWithSubCode = [];
  const nhsoMappingsWithoutSubCode = [];

  for (const nhsoInsurancePlanMapping of nhsoInsurancePlanMappings) {
    const insurancePlanCode = nhsoInsurancePlanMapping.insurance_plan_code;
    const insurancePlanId = insurancePlanCodeToId.get(insurancePlanCode);

    if (!insurancePlanId) {
      const mappingIdentifier = `${nhsoInsurancePlanMapping.main_inscl_code}-${nhsoInsurancePlanMapping.sub_inscl_code || ''}`;
      logger.warn(
        `Skipping NHSO insurance plan mapping ${mappingIdentifier} - insurance plan code '${insurancePlanCode}' not found`,
      );
      skipRecordsTracker.addSkippedRecord(
        'nhso_insurance_plan_mapping',
        mappingIdentifier,
        `Insurance plan code '${insurancePlanCode}' not found`,
      );
      continue;
    }

    const baseRecord = {
      sub_inscl_code: nhsoInsurancePlanMapping.sub_inscl_code || null,
      active: nhsoInsurancePlanMapping.active ?? true,
      main_inscl_code: nhsoInsurancePlanMapping.main_inscl_code,
      is_only_for_main_hospital: nhsoInsurancePlanMapping.is_only_for_main_hospital,
      insurance_plan_id: insurancePlanId,
      created_at: now,
      created_by: systemUser,
      updated_at: now,
      updated_by: systemUser,
    };

    if (nhsoInsurancePlanMapping.sub_inscl_code) {
      nhsoMappingsWithSubCode.push(baseRecord);
    } else {
      nhsoMappingsWithoutSubCode.push(baseRecord);
    }
  }

  if (nhsoMappingsWithSubCode.length > 0) {
    try {
      await sql`
      INSERT INTO nhso_insurance_plan_mapping ${sql(
        nhsoMappingsWithSubCode,
        'is_only_for_main_hospital',
        'main_inscl_code',
        'sub_inscl_code',
        'insurance_plan_id',
        'active',
        'created_at',
        'created_by',
        'updated_at',
        'updated_by',
      )}
      ON CONFLICT (main_inscl_code, sub_inscl_code, insurance_plan_id)
      WHERE sub_inscl_code IS NOT NULL
      DO UPDATE SET
        is_only_for_main_hospital = EXCLUDED.is_only_for_main_hospital,
        active = EXCLUDED.active,
        updated_at = EXCLUDED.updated_at,
        updated_by = EXCLUDED.updated_by
      `;
    } catch (bulkErr) {
      const code = bulkErr.code ?? 'unknown';
      logger.error(`Bulk insert failed for nhso_insurance_plan_mapping (code=${code}): ${bulkErr.message}`);
      skipRecordsTracker.addSkippedRecord('nhso_insurance_plan_mapping', code, bulkErr.message);
    }
  }

  if (nhsoMappingsWithoutSubCode.length > 0) {
    try {
      await sql`
      INSERT INTO nhso_insurance_plan_mapping ${sql(
        nhsoMappingsWithoutSubCode,
        'is_only_for_main_hospital',
        'main_inscl_code',
        'insurance_plan_id',
        'active',
        'created_at',
        'created_by',
        'updated_at',
        'updated_by',
      )}
       ON CONFLICT (main_inscl_code, insurance_plan_id)
      DO UPDATE SET
        is_only_for_main_hospital = EXCLUDED.is_only_for_main_hospital,
        active = EXCLUDED.active,
        updated_at = EXCLUDED.updated_at,
        updated_by = EXCLUDED.updated_by
      `;
    } catch (bulkErr) {
      const code = bulkErr.code ?? 'unknown';
      logger.error(`Bulk insert failed for nhso_insurance_plan_mapping (code=${code}): ${bulkErr.message}`);
      skipRecordsTracker.addSkippedRecord('nhso_insurance_plan_mapping', code, bulkErr.message);
    }
  }

  logger.info('NHSO insurance plan mapping data upserted successfully');
}

export async function setupCoverage(sql, logger, skipRecordsTracker, dataDir) {
  logger.info('Setting up coverage data...');

  await setupBenefitPlan(sql, logger, skipRecordsTracker, dataDir);
  await setupPayor(sql, logger, skipRecordsTracker, dataDir);
  await setupInsurancePlan(sql, logger, skipRecordsTracker, dataDir);
  await setupNHSOInsurancePlanMapping(sql, logger, skipRecordsTracker, dataDir);

  logger.info('Coverage setup completed successfully');
}
