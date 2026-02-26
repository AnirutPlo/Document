import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'csv-parse/sync';

export async function setupNedReason(sql, logger, skipRecordsTracker, dataDir) {
  logger.info('Setting up ned_reason data...');

  const filePath = join(dataDir, 'medication/ned_reason.csv');
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
    .map((r, i) => {
      const code = String(r.code ?? '').trim();
      if (!code) {
        skipRecordsTracker?.addSkippedRecord?.('ned_reason', '(empty code)', 'Missing code');
        return null;
      }

      const thName = String(r['info.th.name'] ?? '').trim();
      if (!thName) {
        skipRecordsTracker?.addSkippedRecord?.('ned_reason', code, 'Missing info.th.name');
        return null;
      }

      const enName = String(r['info.en.name'] ?? '').trim();

      return {
        code,
        info: {
          th: { name: thName },
          en: { name: enName },
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

  logger.info(`Upserting ${values.length} ned_reason rows...`);

  try {
    await sql`
      INSERT INTO ned_reason ${sql(
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
    logger.error(`Bulk insert failed for ned_reason (code=${code}): ${bulkErr.message}`);
    skipRecordsTracker?.addSkippedRecord?.('ned_reason', code, bulkErr.message);
  }

  logger.info('ned_reason upserted successfully');
}
