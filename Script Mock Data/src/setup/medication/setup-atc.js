import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'csv-parse/sync';

export async function setupAtc(sql, logger, skipRecordsTracker, dataDir) {
  logger.info('Setting up anatomical_therapeutic_chemical data…');

  const filePath = join(dataDir, 'medication/atc.csv');
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
  const BATCH_SIZE = 500;

  const values = rows
    .map((r, i) => {
      const code = String(r.code ?? '').trim();
      if (!code) {
        skipRecordsTracker?.addSkippedRecord?.(
          'anatomical_therapeutic_chemical',
          '(empty code)',
          'Missing required "code"',
        );
        return null;
      }

      const enName = (r['info.en.name'] ?? r.en_name ?? r.info_en_name ?? r.name ?? '').toString().trim();

      const info = {
        th: { name: '' },
        en: { name: enName },
      };

      // rank from CSV "count" if present, else position
      const rank = (() => {
        const c = r.count != null ? Number(r.count) : null;
        return c != null && !Number.isNaN(c) ? c : i + 1;
      })();

      return {
        version: 1,
        active: r.active ?? true,
        code,
        lv: String(r.lv ?? '').trim(),
        info,
        rank,
        created_at: now,
        created_by: systemUser,
        updated_at: now,
        updated_by: systemUser,
        deleted_at: null,
        deleted_by: null,
      };
    })
    .filter(Boolean);

  logger.info(`Upserting ${values.length} ATC records…`);

  // Batch insert with conflict on unique(code)
  for (let i = 0; i < values.length; i += BATCH_SIZE) {
    const batch = values.slice(i, i + BATCH_SIZE);
    const batchNo = Math.floor(i / BATCH_SIZE) + 1;
    try {
      await sql`
        INSERT INTO anatomical_therapeutic_chemical ${sql(
          batch,
          'active',
          'code',
          'lv',
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
          active     = EXCLUDED.active,
          lv         = EXCLUDED.lv,
          info       = EXCLUDED.info,
          rank       = EXCLUDED.rank,
          updated_at = EXCLUDED.updated_at,
          updated_by = EXCLUDED.updated_by,
          deleted_at = EXCLUDED.deleted_at,
          deleted_by = EXCLUDED.deleted_by
      `;
      logger.info(`Batch ${batchNo} inserted (${batch.length} rows)`);
    } catch (bulkErr) {
      const code = bulkErr?.code ?? 'unknown';
      const msg = `Batch ${batchNo} failed: ${bulkErr.message} (code=${code})`;
      logger.error(`ATC upsert error — ${msg}`);
      skipRecordsTracker?.addSkippedRecord?.('anatomical_therapeutic_chemical', `batch-${batchNo}`, msg);
    }
  }

  logger.info('anatomical_therapeutic_chemical upserted successfully');
}
