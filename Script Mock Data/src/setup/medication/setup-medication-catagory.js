import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'csv-parse/sync';

export async function setupMedicationCategory(sql, logger, skipRecordsTracker, dataDir) {
  logger.info('Setting up medication_category data...');

  const filePath = join(dataDir, 'medication/medication_category.csv'); // <-- set your actual path
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

  logger.info(`Parsed ${rows.length} rows…`);

  const systemUser = 'system';
  const now = new Date();

  // Normalize to DB rows
  const values = rows
    .map((r, i) => {
      const code = String(r.code ?? '').trim();
      const thName = r['info.th.name'] ?? null; // from CSV
      const active = r.active ?? true;
      const rank = r.rank ?? i + 1;

      if (!code) {
        skipRecordsTracker?.addSkippedRecord?.('medication_category', '(empty code)', 'Missing code');
        return null;
      }

      // Build info JSON (leave en blank; change to copy th to en if you prefer)
      const info = {
        th: { name: thName ?? '' },
        en: { name: '' },
      };

      return {
        code,
        rank,
        info,
        active,
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

  logger.info(`Upserting ${values.length} categories…`);

  try {
    await sql`
      INSERT INTO medication_category ${sql(
        values,
        'code',
        'rank',
        'info',
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
        rank       = EXCLUDED.rank,
        info       = EXCLUDED.info,
        active     = EXCLUDED.active,
        version    = EXCLUDED.version,
        updated_at = EXCLUDED.updated_at,
        updated_by = EXCLUDED.updated_by,
        deleted_at = EXCLUDED.deleted_at,
        deleted_by = EXCLUDED.deleted_by
    `;
  } catch (bulkErr) {
    const code = bulkErr?.code ?? 'unknown';
    logger.error(`Bulk insert failed for medication_category (code=${code}): ${bulkErr.message}`);
    skipRecordsTracker?.addSkippedRecord?.('medication_category', code, bulkErr.message);
  }

  logger.info('medication_category upserted successfully');
}
