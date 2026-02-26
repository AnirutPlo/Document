import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'csv-parse/sync';

export async function setupNLEM(sql, logger, skipRecordsTracker, dataDir) {
  logger.info('Setting up nlem data...');

  const filePath = join(dataDir, 'medication/nlem.csv'); // adjust path if needed
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
      const code = String(r.code ?? '').trim(); // supports Thai + parentheses
      if (!code) {
        skipRecordsTracker?.addSkippedRecord?.('nlem', '(empty code)', 'Missing code');
        return null;
      }

      const thName = r['info.th.name'] ?? '';

      return {
        code,
        info: {
          th: { name: String(thName) },
          en: { name: '' }, // keep empty; change to mirror TH if you want
        },
        rank: r.rank ?? i + 1,
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

  logger.info(`Upserting ${values.length} NLEM rows…`);

  try {
    await sql`
      INSERT INTO nlem ${sql(
        values,
        'code',
        'info',
        'rank',
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
        info       = EXCLUDED.info,
        rank       = EXCLUDED.rank,
        active     = EXCLUDED.active,
        version    = EXCLUDED.version,
        updated_at = EXCLUDED.updated_at,
        updated_by = EXCLUDED.updated_by,
        deleted_at = EXCLUDED.deleted_at,
        deleted_by = EXCLUDED.deleted_by
    `;
  } catch (bulkErr) {
    const code = bulkErr?.code ?? 'unknown';
    logger.error(`Bulk insert failed for nlem (code=${code}): ${bulkErr.message}`);
    skipRecordsTracker?.addSkippedRecord?.('nlem', code, bulkErr.message);
  }

  logger.info('nlem upserted successfully');
}
