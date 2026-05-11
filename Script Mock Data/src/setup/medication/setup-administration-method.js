import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'csv-parse/sync';

export async function setupAdministrationMethod(sql, logger, skipRecordsTracker, dataDir) {
  logger.info('Setting up administration_method data...');

  const filePath = join(dataDir, 'medication/administration_method.csv');
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
      const code = String(r.code ?? '').trim();
      if (!code) {
        skipRecordsTracker?.addSkippedRecord?.('administration_method', '(empty code)', 'Missing code');
        return null;
      }

      return {
        id: r.id ?? null,
        code,
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

  logger.info(`Upserting ${values.length} administration methods...`);

  try {
    await sql`
      INSERT INTO administration_method ${sql(
        values,
        'id',
        'code',
        'active',
        'version',
        'created_by',
        'updated_by',
        'created_at',
        'updated_at',
        'deleted_at',
        'deleted_by',
      )}
      ON CONFLICT (code)
      DO UPDATE SET
        active     = EXCLUDED.active,
        updated_at = EXCLUDED.updated_at,
        updated_by = EXCLUDED.updated_by,
        deleted_at = EXCLUDED.deleted_at,
        deleted_by = EXCLUDED.deleted_by
    `;
  } catch (bulkErr) {
    const code = bulkErr?.code ?? 'unknown';
    logger.error(`Bulk insert failed for administration_method (code=${code}): ${bulkErr.message}`);
    skipRecordsTracker?.addSkippedRecord?.('administration_method', code, bulkErr.message);
  }

  logger.info('administration_method upserted successfully');
}
