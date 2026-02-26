import { join } from 'node:path';
import { loadCsv } from '../../helper/index.js';
import { validateInfoName } from '../../utils';
import { setupCSMBSCategory } from './setup-csmbs-category.js';

export async function setupNhsoCategory(sql, logger, skipRecordsTracker, dataDir) {
  logger.info('Setting up NHSO category data...');

  const filePath = join(dataDir, 'finance/nhso-category.csv');
  const rows = loadCsv(filePath);

  logger.info(`Upserting ${rows.length} NHSO categories...`);

  const systemUser = 'system';
  const now = new Date();
  const toNullableString = (value) => {
    if (value === undefined || value === null) return null;
    const str = String(value).trim();
    return str === '' ? null : str;
  };

  const values = rows
    .map((row, index) => {
      const code = toNullableString(row.code);
      if (!code) {
        skipRecordsTracker?.addSkippedRecord?.('nhso_category', `(row ${index + 1})`, 'Missing code');
        return null;
      }

      const benefitCode = toNullableString(row.benefit_code);
      if (!benefitCode) {
        skipRecordsTracker?.addSkippedRecord?.('nhso_category', code, 'Missing benefit_code');
        return null;
      }

      const noneBenefitCode = toNullableString(row.none_benefit_code);
      if (!noneBenefitCode) {
        skipRecordsTracker?.addSkippedRecord?.('nhso_category', code, 'Missing none_benefit_code');
        return null;
      }

      return {
        code,
        active: row.active ?? true,
        benefit_code: benefitCode,
        none_benefit_code: noneBenefitCode,
        adp_type: toNullableString(row.adp_type),
        rank: row.rank ? parseInt(row.rank, 10) : index + 1,
        info: validateInfoName(row),
        created_by: systemUser,
        updated_by: systemUser,
        created_at: now,
        updated_at: now,
      };
    })
    .filter(Boolean);

  logger.info(`Preparing ${values.length} NHSO categories for upsert...`);

  await sql`
    INSERT INTO nhso_category ${sql(
      values,
      'code',
      'active',
      'benefit_code',
      'none_benefit_code',
      'adp_type',
      'rank',
      'info',
      'created_by',
      'updated_by',
      'created_at',
      'updated_at',
    )}
    ON CONFLICT (code) DO UPDATE SET
      active = EXCLUDED.active,
      benefit_code = EXCLUDED.benefit_code,
      none_benefit_code = EXCLUDED.none_benefit_code,
      adp_type = EXCLUDED.adp_type,
      rank = EXCLUDED.rank,
      info = EXCLUDED.info,
      updated_at = EXCLUDED.updated_at,
      updated_by = EXCLUDED.updated_by
  `;

  logger.info('NHSO category data upserted successfully');
}

export async function setupProductCategory(sql, logger, skipRecordsTracker, dataDir) {
  logger.info('Setting up product category data...');

  const filePath = join(dataDir, 'finance/product-category.csv');
  const rows = loadCsv(filePath);

  logger.info(`Upserting ${rows.length} product categories...`);

  const systemUser = 'system';
  const now = new Date();

  const OrderType = {
    MEDICATION: 'MEDICATION',
    MEDICAL_SUPPLY: 'MEDICAL_SUPPLY',
    LAB: 'LAB',
    IMAGING: 'IMAGING',
    ACTIVITY: 'ACTIVITY',
  };

  const validOrderTypes = Object.values(OrderType);

  const values = rows.map((row) => ({
    code: row.code,
    active: row.active ?? true,
    order_type: row.order_type && validOrderTypes.includes(row.order_type) ? row.order_type : null,
    info: validateInfoName(row),
    rank: row.rank ? parseInt(row.rank, 10) : 1,
    created_by: systemUser,
    updated_by: systemUser,
    created_at: now,
    updated_at: now,
  }));

  try {
    await sql`
    INSERT INTO product_category ${sql(
      values,
      'code',
      'active',
      'order_type',
      'info',
      'rank',
      'created_by',
      'updated_by',
      'created_at',
      'updated_at',
    )}
    ON CONFLICT (code) DO UPDATE SET
      active = EXCLUDED.active,
      order_type = EXCLUDED.order_type,
      info = EXCLUDED.info,
      rank = EXCLUDED.rank,
      created_at = EXCLUDED.created_at,
      created_by = EXCLUDED.created_by,
      updated_at = EXCLUDED.updated_at,
      updated_by = EXCLUDED.updated_by
  `;
  } catch (bulkErr) {
    const errCode = bulkErr?.code ?? 'unknown';
    logger.error(`Bulk upsert failed for product_category (code=${errCode}): ${bulkErr.message}`);
    skipRecordsTracker?.addSkippedRecord?.('product_category', errCode, bulkErr.message);
  }

  logger.info('Product category data upserted successfully');
}

export async function setupPaymentCategory(sql, logger, skipRecordsTracker, dataDir) {
  logger.info('Setting up payment category data...');

  const paymentCategoryPath = join(dataDir, 'finance/payment_category.csv');
  const paymentCategory = loadCsv(paymentCategoryPath);

  logger.info(`Upserting ${paymentCategory.length} payment categories...`);

  const now = new Date();

  const values = paymentCategory.map((paymentCategory) => ({
    code: paymentCategory.code,
    active: paymentCategory.active ?? true,
    info: validateInfoName(paymentCategory),
    created_at: now,
    updated_at: now,
  }));

  try {
    await sql`
    INSERT INTO payment_categories ${sql(values, 'code', 'active', 'info', 'created_at', 'updated_at')}
    ON CONFLICT (code)
    DO UPDATE SET
      code = EXCLUDED.code,
      active = EXCLUDED.active,
      info = EXCLUDED.info,
      created_at = EXCLUDED.created_at,
      updated_at = EXCLUDED.updated_at
  `;
  } catch (bulkErr) {
    const code = bulkErr.code ?? 'unknown';
    logger.error(`Bulk insert failed for payment_category (code=${code}): ${bulkErr.message}`);
    skipRecordsTracker.addSkippedRecord('payment_category', code, bulkErr.message);
  }

  logger.info('Payment category data upserted successfully');
}

export async function setupPaymentMethod(sql, logger, skipRecordsTracker, dataDir) {
  logger.info('Setting up payment method data...');

  const paymentMethodPath = join(dataDir, 'finance/payment_method.csv');
  const paymentMethods = loadCsv(paymentMethodPath);

  logger.info(`Upserting ${paymentMethods.length} payment methods...`);

  const systemUser = 'system';
  const now = new Date();

  const PaymentMethodType = {
    CASH: 'CASH',
    BANK_TRANSFER: 'BANK_TRANSFER',
    CREDIT_DEBIT_CARD: 'CREDIT_DEBIT_CARD',
    QR_CODE: 'QR_CODE',
    QR_EDC: 'QR_EDC',
    CREDIT_DEBIT_CARD_EDC: 'CREDIT_DEBIT_CARD_EDC',
  };

  const paymentCategory = await sql`SELECT code,id FROM payment_categories`;
  const paymentCategoryMap = new Map(paymentCategory.map((pc) => [pc.code, pc.id]));
  const validPaymentMethodTypes = Object.values(PaymentMethodType);

  const values = [];
  for (const [index, paymentMethod] of paymentMethods.entries()) {
    const paymentCategoryCode = paymentMethod.payment_category_code;
    const paymentCategoryId = paymentCategoryMap.get(paymentCategoryCode);

    const paymentMethodType = paymentMethod.type;

    if (!validPaymentMethodTypes.includes(paymentMethodType)) {
      const identifier = paymentMethod.code ?? `(row ${index + 1})`;
      const reason = `Invalid payment method type "${paymentMethodType}". Valid types: ${validPaymentMethodTypes.join(', ')}`;
      logger.warn(`Skipping payment method (code=${identifier}): ${reason}`);
      skipRecordsTracker?.addSkippedRecord?.('payment_method', identifier, reason);
      continue;
    }

    values.push({
      code: paymentMethod.code,
      active: paymentMethod.active ?? true,
      info: validateInfoName(paymentMethod),
      type: paymentMethodType,
      bank_code: paymentMethod.bank_code || null,
      bank_account_no: paymentMethod.bank_account_no || null,
      integration_provider: paymentMethod.integration_provider || null,
      rank: paymentMethod.rank ? parseInt(paymentMethod.rank, 10) : 1,
      receiver_tax_id: paymentMethod.receiver_tax_id || null,
      receiver_rank: paymentMethod.receiver_rank || null,
      receiver_reference: paymentMethod.receiver_reference || null,
      payment_category_id: paymentCategoryId || null,
      created_at: now,
      created_by: systemUser,
      updated_at: now,
      updated_by: systemUser,
    });
  }

  try {
    await sql`
    INSERT INTO payment_method ${sql(
      values,
      'code',
      'active',
      'info',
      'type',
      'bank_code',
      'bank_account_no',
      'integration_provider',
      'rank',
      'receiver_tax_id',
      'receiver_rank',
      'receiver_reference',
      'payment_category_id',
      'created_at',
      'created_by',
      'updated_at',
      'updated_by',
    )}
    ON CONFLICT (code)
    DO UPDATE SET
      code = EXCLUDED.code,
      active = EXCLUDED.active,
      info = EXCLUDED.info,
      type = EXCLUDED.type,
      bank_code = EXCLUDED.bank_code,
      bank_account_no = EXCLUDED.bank_account_no,
      integration_provider = EXCLUDED.integration_provider,
      rank = EXCLUDED.rank,
      receiver_tax_id = EXCLUDED.receiver_tax_id,
      receiver_rank = EXCLUDED.receiver_rank,
      receiver_reference = EXCLUDED.receiver_reference,
      payment_category_id = EXCLUDED.payment_category_id,
      updated_at = EXCLUDED.updated_at,
      updated_by = EXCLUDED.updated_by
    `;
  } catch (bulkErr) {
    const code = bulkErr.code ?? 'unknown';
    logger.error(`Bulk insert failed for payment_method (code=${code}): ${bulkErr.message}`);
    skipRecordsTracker.addSkippedRecord('payment_method', code, bulkErr.message);
  }

  logger.info('Payment method data upserted successfully');
}

export async function setupSIMBCategory(sql, logger, skipRecordsTracker, dataDir) {
  logger.info('Setting up SIMB category data...');

  const filePath = join(dataDir, 'finance/simb-category.csv');
  const rows = loadCsv(filePath);

  logger.info(`Upserting ${rows.length} SIMB categories...`);

  const systemUser = 'system';
  const now = new Date();

  const values = rows.map((row) => ({
    code: row.code,
    active: row.active ?? true,
    info: validateInfoName(row),
    rank: row.rank ? parseInt(row.rank, 10) : 1,
    created_by: systemUser,
    updated_by: systemUser,
    created_at: now,
    updated_at: now,
  }));

  try {
    await sql`
    INSERT INTO simb_category ${sql(
      values,
      'code',
      'active',
      'info',
      'rank',
      'created_by',
      'updated_by',
      'created_at',
      'updated_at',
    )}
    ON CONFLICT (code) DO UPDATE SET
      active = EXCLUDED.active,
      info = EXCLUDED.info,
      rank = EXCLUDED.rank,
      updated_at = EXCLUDED.updated_at,
      updated_by = EXCLUDED.updated_by
  `;
  } catch (bulkErr) {
    const errCode = bulkErr?.code ?? 'unknown';
    logger.error(`Bulk upsert failed for simb_category (code=${errCode}): ${bulkErr.message}`);
    skipRecordsTracker?.addSkippedRecord?.('simb_category', errCode, bulkErr.message);
  }

  logger.info('SIMB category data upserted successfully');
}

export async function setupFinance(sql, logger, skipRecordsTracker, dataDir) {
  logger.info('Setting up finance data...');
  await setupNhsoCategory(sql, logger, skipRecordsTracker, dataDir);
  await setupCSMBSCategory(sql, logger, skipRecordsTracker, dataDir);
  await setupProductCategory(sql, logger, skipRecordsTracker, dataDir);
  await setupSIMBCategory(sql, logger, skipRecordsTracker, dataDir);
  await setupPaymentMethod(sql, logger, skipRecordsTracker, dataDir);
  logger.info('Finance data setup completed successfully');
}
