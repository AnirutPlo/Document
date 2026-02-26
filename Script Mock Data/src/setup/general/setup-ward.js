import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'csv-parse/sync';
import { validateInfoName } from '../../utils';

export async function setupWard(sql, logger, skipRecordsTracker, dataDir) {
  logger.info('Setting up ward data...');

  const wardPath = join(dataDir, 'general/ward.csv');
  const wardData = readFileSync(wardPath, 'utf-8');

  const wards = parse(wardData, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    cast: (value) => {
      if (value === 'TRUE') return true;
      if (value === 'FALSE') return false;
      if (value === '') return null;
      return value;
    },
  });

  logger.info(`Upserting ${wards.length} wards...`);

  const departments = await sql`SELECT id,code FROM department`;
  const departmentCodeToId = new Map(departments.map((dept) => [dept.code, dept.id]));

  const systemUser = 'system';
  const now = new Date();

  const validWards = [];

  for (const ward of wards) {
    const departmentCode = ward.department_code;
    const departmentId = departmentCodeToId.get(departmentCode);

    if (!departmentId) {
      logger.warn(`Skipping ward ${ward.code} - department code '${departmentCode}' not found`);
      skipRecordsTracker.addSkippedRecord('ward', ward, `Department code '${departmentCode}' not found`);
      continue;
    }

    validWards.push({
      code: ward.code,
      department_id: departmentId,
      name: ward.name,
      ward_number: ward.ward_number ? parseInt(ward.ward_number, 10) : null,
      info: validateInfoName(ward),
      created_by: systemUser,
      updated_by: systemUser,
      created_at: now,
      updated_at: now,
    });
  }

  if (validWards.length === 0) {
    logger.warn('No wards to insert - all wards have invalid department IDs');
    return;
  }

  const skippedCount = skipRecordsTracker.getSkippedCount('ward');
  logger.info(`Upserting ${validWards.length} wards (${skippedCount} skipped)...`);

  try {
    await sql`
            INSERT INTO ward ${sql(validWards, 'code', 'department_id', 'name', 'info', 'ward_number', 'created_by', 'updated_by', 'created_at', 'updated_at')}
            ON CONFLICT (code)
            DO UPDATE SET
                department_id = EXCLUDED.department_id,
                name = EXCLUDED.name,
                info = EXCLUDED.info,
                ward_number = EXCLUDED.ward_number,
                updated_at = EXCLUDED.updated_at,
                updated_by = EXCLUDED.updated_by
            `;
  } catch (bulkErr) {
    const code = bulkErr.code ?? 'unknown';
    logger.error(`Bulk insert failed for ward (code=${code}): ${bulkErr.message}`);
    skipRecordsTracker.addSkippedRecord('ward', code, bulkErr.message);
  }

  logger.info('Ward data upserted successfully');
}
