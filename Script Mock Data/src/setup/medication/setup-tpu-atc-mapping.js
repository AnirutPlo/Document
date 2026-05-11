import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'csv-parse/sync';

function toBoolOr(defaultVal, v) {
  if (typeof v === 'boolean') return v;
  if (v == null || String(v).trim() === '') return defaultVal;
  const s = String(v).toLowerCase();
  if (['true', 't', '1', 'yes', 'y'].includes(s)) return true;
  if (['false', 'f', '0', 'no', 'n'].includes(s)) return false;
  return defaultVal;
}

export async function setupTpuAtcMapping(sql, logger, skipRecordsTracker, dataDir) {
  logger.info('Setting up tpu_atc_mapping data…');

  const filePath = join(dataDir, 'medication/tpu_atc_mapping.csv');
  const raw = readFileSync(filePath, 'utf-8');

  const rows = parse(raw, { columns: true, skip_empty_lines: true, bom: true });
  logger.info(`Parsed ${rows.length} rows…`);

  const systemUser = 'system';
  const now = new Date();

  const values = rows
    .map((r) => {
      const tpu = String(r.tpuCode ?? '').trim();
      const atc = String(r.atcCode ?? '').trim();
      return {
        tpu_code: tpu,
        atc_code: atc,
        active: toBoolOr(true, r.active),
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

  logger.info(`Upserting ${values.length} mappings…`);

  const batchSize = 500;
  const totalBatches = Math.ceil(values.length / batchSize);

  for (let i = 0; i < values.length; i += batchSize) {
    const batch = values.slice(i, i + batchSize);
    const batchNo = Math.floor(i / batchSize) + 1;

    logger.info(`Processing batch ${batchNo}/${totalBatches} (${batch.length} records)`);

    try {
      await sql`
        INSERT INTO tpu_atc_mapping ${sql(
          batch,
          'tpu_code',
          'atc_code',
          'active',
          'version',
          'created_by',
          'updated_by',
          'created_at',
          'updated_at',
          'deleted_at',
          'deleted_by',
        )}
        ON CONFLICT (tpu_code)
        DO UPDATE SET
          atc_code   = EXCLUDED.atc_code,
          active     = COALESCE(EXCLUDED.active, tpu_atc_mapping.active),
          version    = EXCLUDED.version,
          updated_at = EXCLUDED.updated_at,
          updated_by = EXCLUDED.updated_by,
          deleted_at = EXCLUDED.deleted_at,
          deleted_by = EXCLUDED.deleted_by
      `;
    } catch (bulkErr) {
      const code = bulkErr?.code ?? 'unknown';
      const message = `Bulk insert failed for tpu_atc_mapping batch ${batchNo}: ${bulkErr.message} (code=${code})`;
      logger.error(message);
      skipRecordsTracker?.addSkippedRecord?.('tpu_atc_mapping', '-', message);
    }
  }

  logger.info('tpu_atc_mapping upserted (bulk with batch skip logging)');
}
