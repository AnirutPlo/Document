import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'csv-parse/sync';

export async function setupDosageRateUnit(sql, logger, skipRecordsTracker, dataDir) {
  logger.info('Setting up dosage_rate_unit data...');

  const filePath = join(dataDir, 'medication/dosage_rate_unit.csv');
  const raw = readFileSync(filePath, 'utf-8');

  const rows = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    cast: (v) => {
      if (v === 'TRUE' || v === 'true') return true;
      if (v === 'FALSE' || v === 'false') return false;
      if (v === '') return null;
      const n = Number(v);
      return Number.isNaN(n) ? v : n;
    },
  });

  logger.info(`Parsed ${rows.length} rows...`);

  const systemUser = 'system';
  const now = new Date();

  const values = rows
    .map((r) => {
      const name = String(r.name ?? '').trim();
      if (!name) {
        skipRecordsTracker?.addSkippedRecord?.('dosage_rate_unit', '(empty name)', 'Missing name');
        return null;
      }

      return {
        id: r.id ?? null,
        standard_code: r.standard_code ?? null,
        standard_display: r.standard_display ?? null,
        standard_system: r.standard_system ?? null,
        standard_version: r.standard_version ?? null,
        name,
        code_name: r.code_name ?? null,
        display: r.display ?? null,
        dose_unit_id: r.dose_unit_id ?? null,
        time_unit_id: r.time_unit_id ?? null,
        app_display: r.app_display ?? null,
        label_display: r.label_display ?? null,
        abbr: r.abbr ?? null,
        long_common_name: r.long_common_name ?? null,
        org_id: r.org_id ?? null,
        sort_order: r.sort_order ?? null,
        active: r.active ?? true,
        version: 1,
        created_by: systemUser,
        updated_by: systemUser,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        deleted_by: null,
      };
    })
    .filter(Boolean);

  logger.info(`Upserting ${values.length} dosage rate units...`);

  try {
    await sql`
      INSERT INTO dosage_rate_unit ${sql(
        values,
        'id',
        'standard_code',
        'standard_display',
        'standard_system',
        'standard_version',
        'name',
        'code_name',
        'display',
        'dose_unit_id',
        'time_unit_id',
        'app_display',
        'label_display',
        'abbr',
        'long_common_name',
        'org_id',
        'sort_order',
        'active',
        'version',
        'created_by',
        'updated_by',
        'created_at',
        'updated_at',
        'deleted_at',
        'deleted_by',
      )}
      ON CONFLICT (code_name)
      DO UPDATE SET
        standard_code    = EXCLUDED.standard_code,
        standard_display = EXCLUDED.standard_display,
        standard_system  = EXCLUDED.standard_system,
        standard_version = EXCLUDED.standard_version,
        name             = EXCLUDED.name,
        display          = EXCLUDED.display,
        dose_unit_id     = EXCLUDED.dose_unit_id,
        time_unit_id     = EXCLUDED.time_unit_id,
        app_display      = EXCLUDED.app_display,
        label_display    = EXCLUDED.label_display,
        abbr             = EXCLUDED.abbr,
        long_common_name = EXCLUDED.long_common_name,
        org_id           = EXCLUDED.org_id,
        sort_order       = EXCLUDED.sort_order,
        active           = EXCLUDED.active,
        updated_at       = EXCLUDED.updated_at,
        updated_by       = EXCLUDED.updated_by,
        deleted_at       = EXCLUDED.deleted_at,
        deleted_by       = EXCLUDED.deleted_by
    `;
  } catch (bulkErr) {
    const code = bulkErr?.code ?? 'unknown';
    logger.error(`Bulk insert failed for dosage_rate_unit (code=${code}): ${bulkErr.message}`);
    skipRecordsTracker?.addSkippedRecord?.('dosage_rate_unit', code, bulkErr.message);
  }

  logger.info('dosage_rate_unit upserted successfully');
}
