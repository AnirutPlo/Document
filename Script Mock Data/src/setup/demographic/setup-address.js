import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'csv-parse/sync';
import { validateInfoName } from '../../utils';

export async function setupProvince(sql, logger, skipRecordsTracker, dataDir) {
  logger.info('Setting up province data...');

  const provincePath = join(dataDir, 'demographic/province.csv');
  const provinceData = readFileSync(provincePath, 'utf-8');

  const provinces = parse(provinceData, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    cast: (value, _context) => {
      if (value === 'TRUE') return true;
      if (value === 'FALSE') return false;
      return value;
    },
  });

  logger.info(`Upserting ${provinces.length} provinces...`);

  const systemUser = 'system';
  const now = new Date();

  const values = provinces.map((province) => ({
    code: province.code,
    active: province.active ?? true,
    info: validateInfoName(province),
    created_by: systemUser,
    updated_by: systemUser,
    created_at: now,
    updated_at: now,
  }));

  try {
    await sql`
      INSERT INTO province ${sql(
        values,
        'code',
        'active',
        'info',
        'created_by',
        'updated_by',
        'created_at',
        'updated_at',
      )} ON CONFLICT (code)
      DO UPDATE SET
        active = EXCLUDED.active,
        info = EXCLUDED.info,
        updated_at = EXCLUDED.updated_at,
        updated_by = EXCLUDED.updated_by
    `;
  } catch (bulkErr) {
    const errCode = bulkErr?.code ?? 'unknown';
    const message = `Bulk insert failed for province (code=${errCode}): ${bulkErr.message}`;
    logger.error(message);
    skipRecordsTracker.addSkippedRecord('province', errCode, message);
  }

  logger.info('Province data upserted (bulk only)');
}

export async function setupDistrict(sql, logger, skipRecordsTracker, dataDir) {
  logger.info('Setting up district data...');

  const districtPath = join(dataDir, 'demographic/district.csv');
  const districtData = readFileSync(districtPath, 'utf-8');

  const districts = parse(districtData, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    cast: (value, _context) => {
      if (value === 'TRUE') return true;
      if (value === 'FALSE') return false;
      return value;
    },
  });

  logger.info(`Upserting ${districts.length} districts...`);

  const systemUser = 'system';
  const now = new Date();

  const values = districts.map((district) => ({
    code: district.code,
    active: district.active ?? true,
    info: validateInfoName(district),
    created_by: systemUser,
    updated_by: systemUser,
    created_at: now,
    updated_at: now,
  }));

  try {
    await sql`
        INSERT INTO district ${sql(values, 'code', 'active', 'info', 'created_by', 'updated_by', 'created_at', 'updated_at')} ON CONFLICT (code)
    DO
        UPDATE SET
            active = EXCLUDED.active,
            info = EXCLUDED.info,
            updated_at = EXCLUDED.updated_at,
            updated_by = EXCLUDED.updated_by
    `;
  } catch (bulkErr) {
    const code = bulkErr.code ?? 'unknown';
    logger.error(`Bulk insert failed for district (code=${code}): ${bulkErr.message}`);
    skipRecordsTracker.addSkippedRecord('district', code, bulkErr.message);
  }

  logger.info('District data upserted successfully');
}

export async function setupSubDistrict(sql, logger, skipRecordsTracker, dataDir) {
  logger.info('Setting up sub-district data...');

  const subDistrictPath = join(dataDir, 'demographic/sub_district.csv');
  const subDistrictData = readFileSync(subDistrictPath, 'utf-8');

  const subDistricts = parse(subDistrictData, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    cast: (value) => {
      if (value === 'TRUE') return true;
      if (value === 'FALSE') return false;
      return value;
    },
  });

  logger.info(`Upserting ${subDistricts.length} sub-districts...`);

  const systemUser = 'system';
  const now = new Date();

  const values = subDistricts.map((subDistrict) => ({
    code: subDistrict.code,
    active: subDistrict.active ?? true,
    info: validateInfoName(subDistrict),
    created_by: systemUser,
    updated_by: systemUser,
    created_at: now,
    updated_at: now,
  }));

  // Process in batches to avoid parameter limit
  const batchSize = 1000;
  for (let i = 0; i < values.length; i += batchSize) {
    const batch = values.slice(i, i + batchSize);
    logger.info(
      `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(values.length / batchSize)} (${batch.length} records)`,
    );

    try {
      await sql`
            INSERT INTO sub_district ${sql(batch, 'code', 'active', 'info', 'created_by', 'updated_by', 'created_at', 'updated_at')} ON CONFLICT (code)
      DO
            UPDATE SET
                active = EXCLUDED.active,
                info = EXCLUDED.info,
                updated_at = EXCLUDED.updated_at,
                updated_by = EXCLUDED.updated_by
        `;
    } catch (bulkErr) {
      const code = bulkErr?.code ?? 'unknown';
      const message = `Bulk insert failed for sub_district batch ${Math.floor(i / batchSize) + 1}: ${bulkErr.message} (code=${code})`;
      logger.error(message);
      skipRecordsTracker.addSkippedRecord('sub_district', '-', message);
    }
  }

  logger.info('Sub-district data upserted successfully');
}

export async function setupThaiAddress(sql, logger, skipRecordsTracker, dataDir) {
  logger.info('Setting up Thai address data...');

  const thaiAddressPath = join(dataDir, 'demographic/thai_address.csv');
  const thaiAddressData = readFileSync(thaiAddressPath, 'utf-8');

  const thaiAddresses = parse(thaiAddressData, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    cast: (value, _context) => {
      if (value === 'TRUE') return true;
      if (value === 'FALSE') return false;
      return value;
    },
  });

  logger.info(`Upserting ${thaiAddresses.length} Thai addresses...`);

  const systemUser = 'system';
  const now = new Date();

  const values = thaiAddresses.map((address) => ({
    code: address.code,
    postal_code: address.postal_code,
    province_code: address.province_code,
    district_code: address.district_code,
    sub_district_code: address.code,
    active: address.active ?? true,
    info: validateInfoName(address),
    rank: 1,
    created_by: systemUser,
    updated_by: systemUser,
    created_at: now,
    updated_at: now,
  }));

  // Process in batches to avoid parameter limit
  const batchSize = 500;
  for (let i = 0; i < values.length; i += batchSize) {
    const batch = values.slice(i, i + batchSize);
    logger.info(
      `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(values.length / batchSize)} (${batch.length} records)`,
    );

    try {
      await sql`
      INSERT INTO thai_address ${sql(
        batch,
        'code',
        'postal_code',
        'province_code',
        'district_code',
        'sub_district_code',
        'active',
        'info',
        'rank',
        'created_by',
        'updated_by',
        'created_at',
        'updated_at',
      )} ON CONFLICT (code)
      DO UPDATE SET
        postal_code = EXCLUDED.postal_code,
        province_code = EXCLUDED.province_code,
        district_code = EXCLUDED.district_code,
        sub_district_code = EXCLUDED.sub_district_code,
        active = EXCLUDED.active,
        info = EXCLUDED.info,
        rank = EXCLUDED.rank,
        updated_at = EXCLUDED.updated_at,
        updated_by = EXCLUDED.updated_by
    `;
    } catch (bulkErr) {
      const code = bulkErr?.code ?? 'unknown';
      const message = `Bulk insert failed for thai_address batch ${Math.floor(i / batchSize) + 1}: ${bulkErr.message} (code=${code})`;
      logger.error(message);
      skipRecordsTracker.addSkippedRecord('thai_address', '-', message);
    }
  }

  logger.info('Thai address data upserted successfully');
}

export async function setupAddress(sql, logger, skipRecordsTracker, dataDir) {
  logger.info('Setting up address data...');

  await setupProvince(sql, logger, skipRecordsTracker, dataDir);
  await setupDistrict(sql, logger, skipRecordsTracker, dataDir);
  await setupSubDistrict(sql, logger, skipRecordsTracker, dataDir);
  await setupThaiAddress(sql, logger, skipRecordsTracker, dataDir);

  logger.info('Address setup completed successfully');
}
