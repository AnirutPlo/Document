import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'csv-parse/sync';

export async function setupDosageUnit(sql, logger, skipRecordsTracker, dataDir) {
  logger.info('Setting up dosage_unit data…');

  const filePath = join(dataDir, 'medication/dosage_unit.csv');
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

  const now = new Date();

  // 1) ปั้นค่าที่จะ INSERT/UPSERT
  const values = rows
    .map((r) => {
      const name = String(r.name ?? '').trim();
      if (!name) {
        skipRecordsTracker?.addSkippedRecord?.('dosage_unit', '(empty name)', 'Missing "name"');
        return null;
      }

      const standardDisplay = r.standard_display ?? r.standard_dosplay ?? null;

      return {
        standard_code: r.standard_code ?? null,
        standard_display: standardDisplay,
        standard_system: r.standard_system ?? null,
        standard_version: r.standard_version ?? null,
        name,
        code_name: r.code_name ?? null,
        display: r.display ?? null,
        app_display: r.app_display ?? null,
        label_display: r.label_display ?? null,
        abbr: r.abbr ?? null,
        org_id: r.org_id ?? null,
        sort_order: r.sort_order ?? null,
        convertible_to: null,
        conversion_factor: null,
        is_active: r.is_active ?? true,
      };
    })
    .filter(Boolean);

  logger.info(`Upserting ${values.length} dosage units…`);

  // 2) Upsert รอบแรก (ไม่มี ON CONFLICT ก็ fallback 2 สเต็ป)
  try {
    await sql`
      INSERT INTO dosage_unit ${sql(
        values,
        'standard_code',
        'standard_display',
        'standard_system',
        'standard_version',
        'name',
        'code_name',
        'display',
        'app_display',
        'label_display',
        'abbr',
        'org_id',
        'sort_order',
        'convertible_to',
        'conversion_factor',
        'is_active',
      )}
    `;
  } catch (bulkErr) {
    logger.error(bulkErr);
    const code = bulkErr?.code ?? 'unknown';
    logger.error(`Bulk insert failed for dosage_unit (code=${code}): ${bulkErr.message}`);
    skipRecordsTracker?.addSkippedRecord?.('dosage_unit', code, bulkErr.message);
  }

  logger.info(`dosage_unit upserted successfully at ${now.toISOString()}`);
}
