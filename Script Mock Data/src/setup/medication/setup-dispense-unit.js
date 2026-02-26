import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'csv-parse/sync';

export async function setupDispenseUnit(sql, logger, skipRecordsTracker, dataDir) {
  logger.info('Setting up dispense_unit data…');

  const filePath = join(dataDir, 'medication/dispense_unit.csv');
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
      const name = String(r.name ?? '').trim();
      if (!name) {
        skipRecordsTracker?.addSkippedRecord?.('dispense_unit', '(empty name)', 'Missing required "name"');
        return null;
      }

      const standardDisplay = r.standard_display ?? r.standard_dosplay ?? null;

      const convTo = (r.convertible_to ?? '').toString().trim().toLowerCase();
      const convFactor = r.conversion_factor != null ? Number(r.conversion_factor) : null;

      let mlEquivalentFactor = null;
      let mgEquivalentFactor = null;
      if (convFactor != null && !Number.isNaN(convFactor)) {
        if (convTo === 'ml') mlEquivalentFactor = convFactor;
        else if (convTo === 'mg') mgEquivalentFactor = convFactor;
      }

      const info = {
        th: { name },
        en: { name },
      };

      return {
        version: 1,
        active: r.active ?? true,
        standard_code: r.standard_code ?? null,
        standard_display: standardDisplay,
        standard_system: r.standard_system ?? null,
        standard_version: r.standard_version ?? null,
        info,
        name,
        code: r.code,
        display: r.display ?? null,
        display_th: r.label_display ?? null,
        alias_name: r.abbr ?? null,
        hospital_code: r.hospital_code ?? null,
        ml_equivalent_factor: mlEquivalentFactor,
        mg_equivalent_factor: mgEquivalentFactor,
        org_id: r.org_id ?? null,
        sort_order: r.sort_order ?? null,
        rank: r.sort_order ?? i + 1,
        created_at: now,
        created_by: systemUser,
        updated_at: now,
        updated_by: systemUser,
        deleted_at: null,
        deleted_by: null,
        equivalent_dose_unit_id: null,
      };
    })
    .filter(Boolean);

  logger.info(`Upserting ${values.length} dispense units…`);
  try {
    await sql`
      INSERT INTO dispense_unit ${sql(
        values,
        'active',
        'standard_code',
        'standard_display',
        'standard_system',
        'standard_version',
        'info',
        'name',
        'code',
        'display',
        'display_th',
        'alias_name',
        'hospital_code',
        'ml_equivalent_factor',
        'mg_equivalent_factor',
        'org_id',
        'sort_order',
        'rank',
        'created_at',
        'created_by',
        'updated_at',
        'updated_by',
        'deleted_at',
        'deleted_by',
        'equivalent_dose_unit_id',
      )}
        ON CONFLICT (code)
        DO UPDATE SET
         active = EXCLUDED.active,
         standard_code = EXCLUDED.standard_code,
         standard_display = EXCLUDED.standard_display,
         standard_system = EXCLUDED.standard_system,
         standard_version = EXCLUDED.standard_version,
         info = EXCLUDED.info,
         name = EXCLUDED.name,
         display = EXCLUDED.display,
         display_th = EXCLUDED.display_th,
         alias_name = EXCLUDED.alias_name,
         hospital_code = EXCLUDED.hospital_code,
         ml_equivalent_factor = EXCLUDED.ml_equivalent_factor,
         mg_equivalent_factor = EXCLUDED.mg_equivalent_factor,
         org_id = EXCLUDED.org_id,
         sort_order = EXCLUDED.sort_order,
         rank = EXCLUDED.rank,
         updated_at = EXCLUDED.updated_at,
         updated_by = EXCLUDED.updated_by,
         deleted_at = EXCLUDED.deleted_at,
         deleted_by = EXCLUDED.deleted_by,
         equivalent_dose_unit_id = EXCLUDED.equivalent_dose_unit_id
    `;
  } catch (bulkErr) {
    logger.error(bulkErr);
    const code = bulkErr?.code ?? 'unknown';
    logger.error(`Bulk insert failed for dispense_unit (code=${code}): ${bulkErr.message}`);
    skipRecordsTracker?.addSkippedRecord?.('dispense_unit', code, bulkErr.message);
  }

  logger.info('dispense_unit upserted successfully');
}
