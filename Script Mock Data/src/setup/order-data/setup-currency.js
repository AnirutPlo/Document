import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'csv-parse/sync';

export async function setupCurrency(sql, logger, _skipRecordsTracker, dataDir) {
  logger.info('Setting up currency data...');

  const currencyPath = join(dataDir, 'order-data/currency.csv');
  const currencyData = readFileSync(currencyPath, 'utf-8');

  const currencies = parse(currencyData, {
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

  logger.info(`Upserting ${currencies.length} currencies...`);

  const systemUser = 'system';
  const now = new Date();

  const values = currencies.map((currency) => ({
    code: currency.code,
    active: currency.active ?? true,
    name: currency.name,
    symbol: currency.symbol,
    position: currency.position || null,
    iso_numeric: currency.iso_numeric || null,
    created_by: systemUser,
    updated_by: systemUser,
    created_at: now,
    updated_at: now,
  }));

  try {
    await sql`
      INSERT INTO currency ${sql(values, 'code', 'active', 'name', 'symbol', 'position', 'iso_numeric', 'created_by', 'updated_by', 'created_at', 'updated_at')}
      ON CONFLICT (code)
      DO UPDATE SET
        active = EXCLUDED.active,
        name = EXCLUDED.name,
        symbol = EXCLUDED.symbol,
        position = EXCLUDED.position,
        iso_numeric = EXCLUDED.iso_numeric,
        updated_at = EXCLUDED.updated_at,
        updated_by = EXCLUDED.updated_by,
        created_at = EXCLUDED.created_at,
        created_by = EXCLUDED.created_by
    `;
  } catch (bulkErr) {
    const code = bulkErr.code ?? 'unknown';
    logger.error(`Bulk insert failed for currency (code=${code}): ${bulkErr.message}`);
    _skipRecordsTracker.addSkippedRecord('currency', code, bulkErr.message);
  }

  logger.info('Currency data upserted successfully');
}
