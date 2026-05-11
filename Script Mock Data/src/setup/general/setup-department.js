import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'csv-parse/sync';
import { validateInfoName } from '../../utils';

export async function setupDepartment(sql, logger, skipRecordsTracker, dataDir) {
  logger.info('Setting up department data...');

  const departmentPath = join(dataDir, 'general/department.csv');
  const departmentData = readFileSync(departmentPath, 'utf-8');

  const departments = parse(departmentData, {
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

  const systemUser = 'system';
  const now = new Date();

  // Fetch all branches and create a code-to-id mapping
  const branches = await sql`
    SELECT id, code FROM branch
  `;

  const branchCodeToId = new Map(branches.map((branch) => [branch.code, branch.id]));

  // Filter departments based on branch availability
  const validDepartments = [];

  for (const dept of departments) {
    const branchCode = dept.branch_code;
    const branchId = branchCodeToId.get(branchCode);

    if (!branchId) {
      logger.warn(`Skipping department ${dept.code} - branch code '${branchCode}' not found`);
      skipRecordsTracker.addSkippedRecord('department', dept, `Branch code '${branchCode}' not found`);
      continue;
    }
    validDepartments.push({
      active: dept.active,
      name: `${dept['info.th.name']}`,
      code: dept.code,
      external_id: dept.external_id,
      branch_id: branchId,
      info: validateInfoName(dept),
      created_by: systemUser,
      updated_by: systemUser,
      created_at: now,
      updated_at: now,
    });
  }

  if (validDepartments.length === 0) {
    logger.warn('No departments to insert - all departments have invalid branch IDs');
    return;
  }

  const skippedCount = skipRecordsTracker.getSkippedCount('department');
  logger.info(`Upserting ${validDepartments.length} departments (${skippedCount} skipped)...`);

  try {
    await sql`
    INSERT INTO department ${sql(
      validDepartments,
      'active',
      'name',
      'code',
      'external_id',
      'branch_id',
      'info',
      'created_by',
      'updated_by',
      'created_at',
      'updated_at',
    )}
    ON CONFLICT (code)
    DO UPDATE SET 
      active = EXCLUDED.active,
      name = EXCLUDED.name,
      code = EXCLUDED.external_id,
      branch_id = EXCLUDED.branch_id,
      info = EXCLUDED.info,
      updated_at = EXCLUDED.updated_at,
      updated_by = EXCLUDED.updated_by
  `;
  } catch (bulkErr) {
    const code = bulkErr.code ?? 'unknown';
    logger.error(`Bulk insert failed for department (code=${code}): ${bulkErr.message}`);
    skipRecordsTracker.addSkippedRecord('department', code, bulkErr.message);
  }

  logger.info('Department data upserted successfully');
}
