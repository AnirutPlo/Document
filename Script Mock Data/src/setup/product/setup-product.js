import { join } from 'node:path';
import { loadCsv } from '../../helper/index.js';
import {
  toArray,
  toBoolean,
  toNullableDecimal,
  toNullableInt,
  toNullableString,
  validateInfoName,
} from '../../utils/index.js';

export async function setupProduct(sql, logger, skipRecordsTracker, dataDir) {
  logger.info('Setting up product data...');

  const filePath = join(dataDir, 'product/product.csv');
  const rows = loadCsv(filePath);

  logger.info(`Upserting ${rows.length} products...`);

  const systemUser = 'system';
  const now = new Date();

  // Load maps for FKs
  const productCategories = await sql`SELECT id, code FROM product_category`;
  const productCategoryMap = new Map(productCategories.map((r) => [r.code, r.id]));

  const nhsoCategories = await sql`SELECT id, code FROM nhso_category`;
  const nhsoCategoryMap = new Map(nhsoCategories.map((r) => [r.code, r.id]));

  const adpCategories = await sql`SELECT id, code FROM adp_category`;
  const adpCategoryMap = new Map(adpCategories.map((r) => [r.code, r.id]));

  const simbCategories = await sql`SELECT id, code FROM simb_category`;
  const simbCategoryMap = new Map(simbCategories.map((r) => [r.code, r.id]));

  const csmbsCategories = await sql`SELECT id, code FROM csmbs_category`;
  const csmbsCategoryMap = new Map(csmbsCategories.map((r) => [r.code, r.id]));

  const currencies = await sql`SELECT id, code FROM currency`;
  const currencyMap = new Map(currencies.map((r) => [r.code, r.id]));

  const dispenseUnits = await sql`SELECT id, name FROM dispense_unit`;
  const dispenseUnitMap = new Map(dispenseUnits.map((r) => [r.name, r.id]));

  const values = rows
    .map((row, index) => {
      const code = toNullableString(row.code);
      if (!code) {
        skipRecordsTracker?.addSkippedRecord?.('product', `(row ${index + 1})`, 'Missing code');
        return null;
      }

      const categoryCode = toNullableString(row.category_code);
      const categoryId = categoryCode ? productCategoryMap.get(categoryCode) : null;
      if (categoryCode && !categoryId) {
        logger.warn(`Product category code "${categoryCode}" not found for product "${code}"`);
      }

      const nhsoCategoryCode = toNullableString(row.nhso_category_code);
      const nhsoCategoryId = nhsoCategoryCode ? nhsoCategoryMap.get(nhsoCategoryCode) : null;
      if (nhsoCategoryCode && !nhsoCategoryId) {
        logger.warn(`NHSO category code "${nhsoCategoryCode}" not found for product "${code}"`);
      }

      const adpCategoryCode = toNullableString(row.adp_category_code);
      const adpCategoryId = adpCategoryCode ? adpCategoryMap.get(adpCategoryCode) : null;
      if (adpCategoryCode && !adpCategoryId) {
        logger.warn(`ADP category code "${adpCategoryCode}" not found for product "${code}"`);
      }

      const simbCategoryCode = toNullableString(row.simb_category_code);
      const simbCategoryId = simbCategoryCode ? simbCategoryMap.get(simbCategoryCode) : null;
      if (simbCategoryCode && !simbCategoryId) {
        logger.warn(`SIMB category code "${simbCategoryCode}" not found for product "${code}"`);
      }

      const csmbsCategoryCode = toNullableString(row.csmbs_category_code);
      const csmbsCategoryId = csmbsCategoryCode ? csmbsCategoryMap.get(csmbsCategoryCode) : null;
      if (csmbsCategoryCode && !csmbsCategoryId) {
        logger.warn(`CSMBS category code "${csmbsCategoryCode}" not found for product "${code}"`);
      }

      const currencyCode = toNullableString(row.default_currency_code);
      const currencyId = currencyCode ? currencyMap.get(currencyCode) : null;
      if (currencyCode && !currencyId) {
        logger.warn(`Currency code "${currencyCode}" not found for product "${code}"`);
      }

      const unitCode = toNullableString(row.unit_code);
      const unitId = unitCode ? dispenseUnitMap.get(unitCode) : null;
      if (unitCode && !unitId) {
        logger.warn(`Dispense unit "${unitCode}" not found for product "${code}"`);
      }

      const packageUnitCode = toNullableString(row.package_unit_code);
      const packageUnitId = packageUnitCode ? dispenseUnitMap.get(packageUnitCode) : null;
      if (packageUnitCode && !packageUnitId) {
        logger.warn(`Package unit "${packageUnitCode}" not found for product "${code}"`);
      }

      return {
        code,
        version: toNullableInt(row.version) ?? 1,
        active: row.active !== undefined ? toBoolean(row.active) : true,
        erp_code: toNullableString(row.erp_code),
        moph_code: toNullableString(row.moph_code),
        nhso_code: toNullableString(row.nhso_code),
        adp_code: toNullableString(row.adp_code),
        cgd_code: toNullableString(row.cgd_code),
        instrument_code: toNullableString(row.instrument_code),
        instrument_uc_code: toNullableString(row.instrument_uc_code),
        instrument_cs_code: toNullableString(row.instrument_cs_code),
        instrument_ss_code: toNullableString(row.instrument_ss_code),
        unit_id: unitId,
        package_unit_id: packageUnitId,
        unit_to_package_unit_quantity: toNullableInt(row.unit_to_package_unit_quantity),
        barcode: toNullableString(row.barcode),
        type: row.type, // Enum ProductType
        rank: toNullableInt(row.rank) ?? 1,
        info: validateInfoName(row),
        required_practitioner: row.required_practitioner !== undefined ? toBoolean(row.required_practitioner) : null,
        practitioner_role: toNullableString(row.practitioner_role),
        hospital_revenue_price: toNullableDecimal(row.hospital_revenue_price),
        recommend_icd9cm: toArray(row.recommend_icd9cm),
        recommend_icd10: row.recommend_icd10 ? JSON.parse(row.recommend_icd10) : null,
        recommend_product_code: toArray(row.recommend_product_code),
        category_id: categoryId,
        adp_category_id: adpCategoryId,
        simb_category_id: simbCategoryId,
        csmbs_category_id: csmbsCategoryId,
        nhso_category_id: nhsoCategoryId,
        last_lot_cost: toNullableDecimal(row.last_lot_cost),
        default_unit_price: toNullableDecimal(row.default_unit_price) ?? 0,
        unit_price_options: toArray(row.unit_price_options).map((v) => parseFloat(v)),
        default_currency_id: currencyId,
        cost_center_id: toNullableInt(row.cost_center_id),
        min_unit_price: toNullableDecimal(row.min_unit_price),
        max_unit_price: toNullableDecimal(row.max_unit_price),
        created_by: systemUser,
        updated_by: systemUser,
        created_at: now,
        updated_at: now,
      };
    })
    .filter(Boolean);

  logger.info(`Preparing ${values.length} products for upsert...`);

  try {
    await sql`
      INSERT INTO product ${sql(
        values,
        'code',
        'version',
        'active',
        'erp_code',
        'moph_code',
        'nhso_code',
        'adp_code',
        'cgd_code',
        'instrument_code',
        'instrument_uc_code',
        'instrument_cs_code',
        'instrument_ss_code',
        'unit_id',
        'package_unit_id',
        'unit_to_package_unit_quantity',
        'barcode',
        'type',
        'rank',
        'info',
        'required_practitioner',
        'practitioner_role',
        'hospital_revenue_price',
        'recommend_icd9cm',
        'recommend_icd10',
        'recommend_product_code',
        'category_id',
        'adp_category_id',
        'simb_category_id',
        'csmbs_category_id',
        'nhso_category_id',
        'last_lot_cost',
        'default_unit_price',
        'unit_price_options',
        'default_currency_id',
        'cost_center_id',
        'min_unit_price',
        'max_unit_price',
        'created_by',
        'updated_by',
        'created_at',
        'updated_at',
      )}
      ON CONFLICT (code) DO UPDATE SET
        version = EXCLUDED.version,
        active = EXCLUDED.active,
        erp_code = EXCLUDED.erp_code,
        moph_code = EXCLUDED.moph_code,
        nhso_code = EXCLUDED.nhso_code,
        adp_code = EXCLUDED.adp_code,
        cgd_code = EXCLUDED.cgd_code,
        instrument_code = EXCLUDED.instrument_code,
        instrument_uc_code = EXCLUDED.instrument_uc_code,
        instrument_cs_code = EXCLUDED.instrument_cs_code,
        instrument_ss_code = EXCLUDED.instrument_ss_code,
        unit_id = EXCLUDED.unit_id,
        package_unit_id = EXCLUDED.package_unit_id,
        unit_to_package_unit_quantity = EXCLUDED.unit_to_package_unit_quantity,
        barcode = EXCLUDED.barcode,
        type = EXCLUDED.type,
        rank = EXCLUDED.rank,
        info = EXCLUDED.info,
        required_practitioner = EXCLUDED.required_practitioner,
        practitioner_role = EXCLUDED.practitioner_role,
        hospital_revenue_price = EXCLUDED.hospital_revenue_price,
        recommend_icd9cm = EXCLUDED.recommend_icd9cm,
        recommend_icd10 = EXCLUDED.recommend_icd10,
        recommend_product_code = EXCLUDED.recommend_product_code,
        category_id = EXCLUDED.category_id,
        adp_category_id = EXCLUDED.adp_category_id,
        simb_category_id = EXCLUDED.simb_category_id,
        csmbs_category_id = EXCLUDED.csmbs_category_id,
        nhso_category_id = EXCLUDED.nhso_category_id,
        last_lot_cost = EXCLUDED.last_lot_cost,
        default_unit_price = EXCLUDED.default_unit_price,
        unit_price_options = EXCLUDED.unit_price_options,
        default_currency_id = EXCLUDED.default_currency_id,
        cost_center_id = EXCLUDED.cost_center_id,
        min_unit_price = EXCLUDED.min_unit_price,
        max_unit_price = EXCLUDED.max_unit_price,
        updated_at = EXCLUDED.updated_at,
        updated_by = EXCLUDED.updated_by
    `;
    logger.info('Product data upserted successfully');
  } catch (err) {
    const errCode = err?.code ?? 'unknown';
    logger.error(`Bulk upsert failed for product (code=${errCode}): ${err.message}`);
    skipRecordsTracker?.addSkippedRecord?.('product', errCode, err.message);
  }
}
