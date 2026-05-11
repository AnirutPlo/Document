import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'csv-parse/sync';

export async function setupAdministrationMode(sql, logger, skipRecordsTracker, dataDir) {
  logger.info('Setting up administration_mode data...');

  const filePath = join(dataDir, 'medication/administration_mode.csv');
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
      const display = String(r.display ?? '').trim();
      if (!display) {
        skipRecordsTracker?.addSkippedRecord?.('administration_mode', '(empty display)', 'Missing display');
        return null;
      }

      return {
        id: r.id ?? null,
        standard_code: r.standard_code ?? null,
        standard_display: r.standard_display ?? null,
        standard_system: r.standard_system ?? null,
        standard_version: r.standard_version ?? null,
        code_name: r.code_name ?? null,
        display,
        abbr: r.abbr ?? null,
        org_id: r.org_id ?? null,
        sort_order: r.sort_order ?? null,
        app_display: r.app_display ?? null,
        label_display: r.label_display ?? null,
        description: r.description ?? null,
        route_id: r.route_id ?? null,
        body_site_id: r.body_site_id ?? null,
        lesion_id: r.lesion_id ?? null,
        method_id: r.method_id ?? null,
        preparation_id: r.preparation_id ?? null,
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

  logger.info(`Upserting ${values.length} administration modes...`);

  try {
    await sql`
      INSERT INTO administration_mode ${sql(
        values,
        'id',
        'standard_code',
        'standard_display',
        'standard_system',
        'standard_version',
        'code_name',
        'display',
        'abbr',
        'org_id',
        'sort_order',
        'app_display',
        'label_display',
        'description',
        'route_id',
        'body_site_id',
        'lesion_id',
        'method_id',
        'preparation_id',
        'active',
        'version',
        'created_by',
        'updated_by',
        'created_at',
        'updated_at',
        'deleted_at',
        'deleted_by',
      )}
      ON CONFLICT (id)
      DO UPDATE SET
        standard_code    = EXCLUDED.standard_code,
        standard_display = EXCLUDED.standard_display,
        standard_system  = EXCLUDED.standard_system,
        standard_version = EXCLUDED.standard_version,
        code_name        = EXCLUDED.code_name,
        display          = EXCLUDED.display,
        abbr             = EXCLUDED.abbr,
        org_id           = EXCLUDED.org_id,
        sort_order       = EXCLUDED.sort_order,
        app_display      = EXCLUDED.app_display,
        label_display    = EXCLUDED.label_display,
        description      = EXCLUDED.description,
        route_id         = EXCLUDED.route_id,
        body_site_id     = EXCLUDED.body_site_id,
        lesion_id        = EXCLUDED.lesion_id,
        method_id        = EXCLUDED.method_id,
        preparation_id   = EXCLUDED.preparation_id,
        active           = EXCLUDED.active,
        updated_at       = EXCLUDED.updated_at,
        updated_by       = EXCLUDED.updated_by,
        deleted_at       = EXCLUDED.deleted_at,
        deleted_by       = EXCLUDED.deleted_by
    `;
  } catch (bulkErr) {
    const code = bulkErr?.code ?? 'unknown';
    logger.error(`Bulk insert failed for administration_mode (code=${code}): ${bulkErr.message}`);
    skipRecordsTracker?.addSkippedRecord?.('administration_mode', code, bulkErr.message);
  }

  logger.info('administration_mode upserted successfully');
}
