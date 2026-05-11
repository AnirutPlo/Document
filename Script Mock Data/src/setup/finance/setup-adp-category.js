import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'csv-parse/sync';

export async function setupADPCategory(sql, logger, skipRecordsTracker, dataDir) {
  logger.info('Setting up adp_category data...');

  const filePath = join(dataDir, 'finance/adp-category.csv'); // adjust path if needed
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

  const values = rows
    .map((r, i) => {
      const code = String(r.code ?? '').trim();
      if (!code) {
        skipRecordsTracker?.addSkippedRecord?.('adp_category', '(empty code)', 'Missing code');
        return null;
      }

      const thName = r['info.th.name'] ?? '';
      const enName = r['info.en.name'] ?? '';

      return {
        version: r.version ?? 1,
        active: r.active ?? true,
        code,
        info: {
          th: { name: String(thName) },
          en: { name: String(enName) },
        },
        rank: r.rank ?? i + 1,
        created_at: now,
        created_by: systemUser,
        updated_at: now,
        updated_by: systemUser,
        deleted_at: null,
        deleted_by: null,
      };
    })
    .filter(Boolean);

  logger.info(`Upserting ${values.length} ADP categories…`);

  try {
    await sql`
      INSERT INTO adp_category ${sql(
        values,
        'version',
        'active',
        'code',
        'info',
        'rank',
        'created_at',
        'created_by',
        'updated_at',
        'updated_by',
        'deleted_at',
        'deleted_by',
      )}
      ON CONFLICT (code)
      DO UPDATE SET
        version   = EXCLUDED.version,
        active    = EXCLUDED.active,
        info      = EXCLUDED.info,
        rank      = EXCLUDED.rank,
        updated_at= EXCLUDED.updated_at,
        updated_by= EXCLUDED.updated_by,
        deleted_at= EXCLUDED.deleted_at,
        deleted_by= EXCLUDED.deleted_by
    `;
  } catch (bulkErr) {
    const errCode = bulkErr?.code ?? 'unknown';
    logger.error(`Bulk insert failed for adp_category (code=${errCode}): ${bulkErr.message}`);
    skipRecordsTracker?.addSkippedRecord?.('adp_category', errCode, bulkErr.message);
  }
  logger.info('adp_category upsert completed');
}
