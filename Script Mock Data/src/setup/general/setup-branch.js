import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'csv-parse/sync';

export async function setupBranch(sql, logger, skipRecordsTracker, dataDir) {
  logger.info('Setting up branch data...');

  const branchPath = join(dataDir, 'general/branch.csv');
  const branchData = readFileSync(branchPath, 'utf-8');

  const branches = parse(branchData, {
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

  logger.info(`Upserting ${branches.length} branches...`);

  const systemUser = 'system';
  const now = new Date();

  const values = branches.map((branch) => ({
    code: branch.code,
    external_id: branch.external_id || null,
    hospital_code: branch.hospital_code,
    active: branch.active,
    is_head_quarter: branch.is_head_quarter,
    opening_hour: branch.opening_hour,
    phone_number: branch.phone_number,
    hospital_logo_url: branch.hospital_logo_url || null,
    hospital_logo: branch.hospital_logo || null,
    web_url: branch.web_url || null,
    info: {
      th: {
        name: branch['info.th.name'],
        secondName: branch['info.th.secondName'],
        address: {
          line: branch['info.th.address.line'],
          subDistrict: branch['info.th.address.subDistrict'],
          district: branch['info.th.address.district'],
          province: branch['info.th.address.province'],
          postalCode: branch['info.th.address.postalCode'],
        },
      },
      en: {
        name: branch['info.en.name'],
        secondName: branch['info.en.secondName'],
        address: {
          line: branch['info.en.address.line'],
          subDistrict: branch['info.en.address.subDistrict'],
          district: branch['info.en.address.district'],
          province: branch['info.en.address.province'],
          postalCode: branch['info.en.address.postalCode'],
        },
      },
    },
    created_by: systemUser,
    updated_by: systemUser,
    created_at: now,
    updated_at: now,
  }));

  try {
    await sql`
      INSERT INTO branch ${sql(values, 'code', 'external_id', 'hospital_code', 'active', 'is_head_quarter', 'opening_hour', 'phone_number', 'info', 'hospital_logo_url', 'hospital_logo', 'web_url', 'created_by', 'updated_by', 'created_at', 'updated_at')}
      ON CONFLICT (code)
      DO UPDATE SET
        code = EXCLUDED.code,
        hospital_code = EXCLUDED.hospital_code,
        active = EXCLUDED.active,
        is_head_quarter = EXCLUDED.is_head_quarter,
        opening_hour = EXCLUDED.opening_hour,
        phone_number = EXCLUDED.phone_number,
        info = EXCLUDED.info,
        hospital_logo_url = EXCLUDED.hospital_logo_url,
        hospital_logo = EXCLUDED.hospital_logo,
        web_url = EXCLUDED.web_url,
        updated_at = EXCLUDED.updated_at,
        updated_by = EXCLUDED.updated_by
    `;
  } catch (bulkErr) {
    const code = bulkErr.code ?? 'unknown';
    logger.error(`Bulk insert failed for branch (code=${code}): ${bulkErr.message}`);
    skipRecordsTracker.addSkippedRecord('branch', code, bulkErr.message);
  }

  logger.info('Branch data upserted successfully');
}
