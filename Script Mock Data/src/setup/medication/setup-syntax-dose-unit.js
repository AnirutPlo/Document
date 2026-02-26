import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'csv-parse/sync';

export async function setupSyntaxDoseUnit(sql, logger, skipRecordsTracker, dataDir) {
  logger.info('Setting up syntax_dose_unit data...');

  const filePath = join(dataDir, 'medication/syntax_dose_unit.csv');
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
      const doseUnitId = r.dose_unit_id ?? r.id ?? null;
      if (!doseUnitId) {
        skipRecordsTracker?.addSkippedRecord?.('syntax_dose_unit', '(empty id)', 'Missing dose_unit_id');
        return null;
      }

      let codes = null;
      if (r.codes) {
        try {
          // Parse JSON array from CSV string like '["code1", "code2"]'
          codes = typeof r.codes === 'string' ? JSON.parse(r.codes) : r.codes;
        } catch (_e) {
          skipRecordsTracker?.addSkippedRecord?.('syntax_dose_unit', doseUnitId, `Invalid codes: ${r.codes}`);
          return null;
        }
      }

      return {
        dose_unit_id: doseUnitId,
        codes,
        preferred_code: r.preferred_code ?? null,
        sort_order: r.sort_order ?? 0,
        active: r.active ?? false,
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

  logger.info(`Upserting ${values.length} syntax dose units...`);

  try {
    await sql`
      INSERT INTO syntax_dose_unit ${sql(
        values,
        'dose_unit_id',
        'codes',
        'preferred_code',
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
      ON CONFLICT (dose_unit_id)
      DO UPDATE SET
        codes          = EXCLUDED.codes,
        preferred_code = EXCLUDED.preferred_code,
        sort_order     = EXCLUDED.sort_order,
        active         = EXCLUDED.active,
        updated_at     = EXCLUDED.updated_at,
        updated_by     = EXCLUDED.updated_by,
        deleted_at     = EXCLUDED.deleted_at,
        deleted_by     = EXCLUDED.deleted_by
    `;
  } catch (bulkErr) {
    const code = bulkErr?.code ?? 'unknown';
    logger.error(`Bulk insert failed for syntax_dose_unit (code=${code}): ${bulkErr.message}`);
    skipRecordsTracker?.addSkippedRecord?.('syntax_dose_unit', code, bulkErr.message);
  }

  logger.info('syntax_dose_unit upserted successfully');
}
