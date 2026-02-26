import { join } from 'node:path';
import { loadCsv } from '../../helper/index.js';
import { validateInfoName } from '../../utils/index.js';
import { setupAddress } from './setup-address.js';

export async function setupOccupation(sql, logger, skipRecordsTracker, dataDir) {
  logger.info('Setting up occupation data...');

  const occupationPath = join(dataDir, 'demographic/occupation.csv');
  const occupations = loadCsv(occupationPath);

  logger.info(`Upserting ${occupations.length} occupations...`);

  const systemUser = 'system';
  const now = new Date();

  const values = occupations.map((occupation) => ({
    code: occupation.code,
    active: occupation.active,
    info: {
      th: { name: occupation['info.th.name'] },
      en: { name: occupation['info.en.name'] },
    },
    rank: parseInt(occupation.rank, 10),
    created_by: systemUser,
    updated_by: systemUser,
    created_at: now,
    updated_at: now,
  }));

  try {
    await sql`
      INSERT INTO occupation ${sql(
        values,
        'code',
        'active',
        'info',
        'rank',
        'created_by',
        'updated_by',
        'created_at',
        'updated_at',
      )}
      ON CONFLICT (code) DO UPDATE SET
        active = EXCLUDED.active,
        info = EXCLUDED.info,
        rank = EXCLUDED.rank,
        updated_at = EXCLUDED.updated_at,
        updated_by = EXCLUDED.updated_by
    `;
  } catch (bulkErr) {
    const code = bulkErr.code ?? 'unknown';
    logger.error(`Bulk insert failed for occupation (code=${code}): ${bulkErr.message}`);
    skipRecordsTracker.addSkippedRecord('occupation', code, bulkErr.message);
  }

  logger.info('Occupation data upserted (bulk only)');
}

export async function setupNationality(sql, logger, skipRecordsTracker, dataDir) {
  logger.info('Setting up nationality data...');

  const nationalityPath = join(dataDir, 'demographic/nationality.csv');
  const nationalities = loadCsv(nationalityPath);

  logger.info(`Upserting ${nationalities.length} nationalities...`);

  const systemUser = 'system';
  const now = new Date();

  const values = nationalities.map((nationality) => ({
    code: nationality.code,
    active: nationality.active,
    info: {
      th: { name: nationality['info.th.name'] },
      en: { name: nationality['info.en.name'] },
    },
    rank: parseInt(nationality.rank, 10),
    created_by: systemUser,
    updated_by: systemUser,
    created_at: now,
    updated_at: now,
  }));

  const batchSize = 500;
  for (let i = 0; i < values.length; i += batchSize) {
    const batch = values.slice(i, i + batchSize);
    logger.info(
      `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(values.length / batchSize)} (${batch.length} records)`,
    );

    try {
      await sql`
        INSERT INTO nationality ${sql(
          batch,
          'code',
          'active',
          'info',
          'rank',
          'created_by',
          'updated_by',
          'created_at',
          'updated_at',
        )} ON CONFLICT (code)
        DO UPDATE SET
          active = EXCLUDED.active,
          info = EXCLUDED.info,
          rank = EXCLUDED.rank,
          updated_at = EXCLUDED.updated_at,
          updated_by = EXCLUDED.updated_by
      `;
    } catch (bulkErr) {
      const code = bulkErr?.code ?? 'unknown';
      const message = `Bulk insert failed for nationality batch ${Math.floor(i / batchSize) + 1}: ${bulkErr.message} (code=${code})`;
      logger.error(message);
      skipRecordsTracker.addSkippedRecord('nationality', '-', message);
    }
  }

  logger.info('Nationality data upserted (bulk only, with batch skip logging)');
}

export async function setupEducationLevel(sql, logger, _skipRecordsTracker, dataDir) {
  logger.info('Setting up education level data...');

  const filePath = join(dataDir, 'demographic/education-level.csv');
  const rows = loadCsv(filePath);

  logger.info(`Upserting ${rows.length} education levels...`);

  const systemUser = 'system';
  const now = new Date();

  const values = rows.map((row) => ({
    code: row.code,
    active: row.active,
    info: {
      th: { name: row['info.th.name'] },
      en: { name: row['info.en.name'] },
    },
    rank: parseInt(row.rank, 10),
    created_by: systemUser,
    updated_by: systemUser,
    created_at: now,
    updated_at: now,
  }));

  await sql`
    INSERT INTO education_level ${sql(
      values,
      'code',
      'active',
      'info',
      'rank',
      'created_by',
      'updated_by',
      'created_at',
      'updated_at',
    )} ON CONFLICT (code)
    DO UPDATE SET
      active = EXCLUDED.active,
      info = EXCLUDED.info,
      rank = EXCLUDED.rank,
      updated_at = EXCLUDED.updated_at,
      updated_by = EXCLUDED.updated_by
  `;

  logger.info('Education level data upserted successfully');
}

export async function setupLanguage(sql, logger, _skipRecordsTracker, dataDir) {
  logger.info('Setting up language data...');

  const filePath = join(dataDir, 'demographic/language.csv');
  const rows = loadCsv(filePath);

  logger.info(`Upserting ${rows.length} languages...`);

  const systemUser = 'system';
  const now = new Date();

  const values = rows.map((row) => ({
    code: row.code,
    active: row.active,
    info: {
      th: { name: row['info.th.name'] },
      en: { name: row['info.en.name'] },
    },
    rank: parseInt(row.rank, 10),
    created_by: systemUser,
    updated_by: systemUser,
    created_at: now,
    updated_at: now,
  }));

  await sql`
    INSERT INTO language ${sql(
      values,
      'code',
      'active',
      'info',
      'rank',
      'created_by',
      'updated_by',
      'created_at',
      'updated_at',
    )} ON CONFLICT (code)
    DO UPDATE SET
      active = EXCLUDED.active,
      info = EXCLUDED.info,
      rank = EXCLUDED.rank,
      updated_at = EXCLUDED.updated_at,
      updated_by = EXCLUDED.updated_by
  `;

  logger.info('Language data upserted successfully');
}

export async function setupMaritalStatus(sql, logger, _skipRecordsTracker, dataDir) {
  logger.info('Setting up marital status data...');

  const filePath = join(dataDir, 'demographic/marital-status.csv');
  const rows = loadCsv(filePath);

  logger.info(`Upserting ${rows.length} marital statuses...`);

  const systemUser = 'system';
  const now = new Date();

  const values = rows.map((row) => ({
    code: row.code,
    active: row.active,
    info: {
      th: { name: row['info.th.name'] },
      en: { name: row['info.en.name'] },
    },
    rank: parseInt(row.rank, 10),
    created_by: systemUser,
    updated_by: systemUser,
    created_at: now,
    updated_at: now,
  }));

  await sql`
    INSERT INTO marital_status ${sql(
      values,
      'code',
      'active',
      'info',
      'rank',
      'created_by',
      'updated_by',
      'created_at',
      'updated_at',
    )} ON CONFLICT (code)
    DO UPDATE SET
      active = EXCLUDED.active,
      info = EXCLUDED.info,
      rank = EXCLUDED.rank,
      updated_at = EXCLUDED.updated_at,
      updated_by = EXCLUDED.updated_by
  `;

  logger.info('Marital status data upserted successfully');
}

export async function setupRace(sql, logger, _skipRecordsTracker, dataDir) {
  logger.info('Setting up race data...');

  const filePath = join(dataDir, 'demographic/race.csv');
  const rows = loadCsv(filePath);

  logger.info(`Upserting ${rows.length} races...`);

  const systemUser = 'system';
  const now = new Date();

  const values = rows.map((row) => ({
    code: row.code,
    active: row.active,
    info: {
      th: { name: row['info.th.name'] },
      en: { name: row['info.en.name'] },
    },
    rank: parseInt(row.rank, 10),
    created_by: systemUser,
    updated_by: systemUser,
    created_at: now,
    updated_at: now,
  }));

  await sql`
    INSERT INTO race ${sql(
      values,
      'code',
      'active',
      'info',
      'rank',
      'created_by',
      'updated_by',
      'created_at',
      'updated_at',
    )} ON CONFLICT (code)
    DO UPDATE SET
      active = EXCLUDED.active,
      info = EXCLUDED.info,
      rank = EXCLUDED.rank,
      updated_at = EXCLUDED.updated_at,
      updated_by = EXCLUDED.updated_by
  `;

  logger.info('Race data upserted successfully');
}

export async function setupReligion(sql, logger, _skipRecordsTracker, dataDir) {
  logger.info('Setting up religion data...');

  const filePath = join(dataDir, 'demographic/religion.csv');
  const rows = loadCsv(filePath);

  logger.info(`Upserting ${rows.length} religions...`);

  const systemUser = 'system';
  const now = new Date();

  const values = rows.map((row) => ({
    code: row.code,
    active: row.active,
    info: validateInfoName(row),
    rank: parseInt(row.rank, 10),
    created_by: systemUser,
    updated_by: systemUser,
    created_at: now,
    updated_at: now,
  }));

  await sql`
    INSERT INTO religion ${sql(
      values,
      'code',
      'active',
      'info',
      'rank',
      'created_by',
      'updated_by',
      'created_at',
      'updated_at',
    )} ON CONFLICT (code)
    DO UPDATE SET
      active = EXCLUDED.active,
      info = EXCLUDED.info,
      rank = EXCLUDED.rank,
      updated_at = EXCLUDED.updated_at,
      updated_by = EXCLUDED.updated_by
  `;

  logger.info('Religion data upserted successfully');
}

export async function setupNamePrefix(sql, logger, skipRecordsTracker, dataDir) {
  logger.info('Setting up name prefix data...');

  const filePath = join(dataDir, 'demographic/name_prefix.csv');
  const namePrefixes = loadCsv(filePath);

  logger.info(`Upserting ${namePrefixes.length} name prefixes...`);

  const systemUser = 'system';
  const now = new Date();

  const validNamePrefixes = [];

  for (const namePrefix of namePrefixes) {
    validNamePrefixes.push({
      code: namePrefix.code,
      gender_code: namePrefix.gender_code || null,
      active: namePrefix.active ?? true,
      info: validateInfoName(namePrefix),
      rank: parseInt(namePrefix.rank, 10),
      created_by: systemUser,
      updated_by: systemUser,
      created_at: now,
      updated_at: now,
    });
  }

  try {
    await sql`
    INSERT INTO name_prefix ${sql(
      validNamePrefixes,
      'code',
      'gender_code',
      'active',
      'info',
      'rank',
      'created_by',
      'updated_by',
      'created_at',
      'updated_at',
    )} ON CONFLICT (code)
    DO UPDATE SET
      gender_code = EXCLUDED.gender_code,
      active = EXCLUDED.active,
      info = EXCLUDED.info,
      rank = EXCLUDED.rank,
      updated_at = EXCLUDED.updated_at,
      updated_by = EXCLUDED.updated_by
  `;
  } catch (bulkErr) {
    const code = bulkErr.code ?? 'unknown';
    logger.error(`Bulk insert failed for name_prefix (code=${code}): ${bulkErr.message}`);
    skipRecordsTracker.addSkippedRecord('name_prefix', code, bulkErr.message);
  }
  logger.info('Name prefix data upserted successfully');
}

export async function setupGender(sql, logger, _skipRecordsTracker, dataDir) {
  logger.info('Setting up gender data...');

  const filePath = join(dataDir, 'demographic/gender.csv');
  const genders = loadCsv(filePath);

  logger.info(`Upserting ${genders.length} genders...`);

  const systemUser = 'system';
  const now = new Date();

  const values = genders.map((gender) => ({
    code: gender.code,
    active: gender.active ?? true,
    info: validateInfoName(gender),
    rank: parseInt(gender.rank, 10),
    created_by: systemUser,
    updated_by: systemUser,
    created_at: now,
    updated_at: now,
  }));

  await sql`
    INSERT INTO gender ${sql(
      values,
      'code',
      'active',
      'rank',
      'info',
      'created_by',
      'updated_by',
      'created_at',
      'updated_at',
    )} ON CONFLICT (code)
    DO UPDATE SET
    active = EXCLUDED.active,
    info = EXCLUDED.info,
    rank = EXCLUDED.rank,
    updated_at = EXCLUDED.updated_at,
    updated_by = EXCLUDED.updated_by
  `;

  logger.info('Gender data upserted successfully');
}

export async function setupPatientCategory(sql, logger, _skipRecordsTracker, dataDir) {
  logger.info('Setting up patient category data...');
  const filePath = join(dataDir, 'demographic/patient_category.csv');
  const rows = loadCsv(filePath);

  logger.info(`Upserting ${rows.length} patient categories...`);

  const systemUser = 'system';
  const now = new Date();

  const values = rows.map((row) => ({
    code: row.code,
    active: row.active ?? true,
    info: validateInfoName(row),
    is_faculty: row.is_faculty ?? false,
    tag: row.tag ? row.tag : null,
    rank: parseInt(row.rank, 10),
    created_by: systemUser,
    updated_by: systemUser,
    created_at: now,
    updated_at: now,
  }));

  await sql`
    INSERT INTO patient_category ${sql(
      values,
      'code',
      'active',
      'info',
      'is_faculty',
      'tag',
      'rank',
      'created_by',
      'updated_by',
      'created_at',
      'updated_at',
    )} ON CONFLICT (code)
    DO UPDATE SET
    active = EXCLUDED.active,
    info = EXCLUDED.info,
    is_faculty = EXCLUDED.is_faculty,
    tag = EXCLUDED.tag,
    rank = EXCLUDED.rank,
    updated_at = EXCLUDED.updated_at,
    updated_by = EXCLUDED.updated_by
  `;

  logger.info('Patient category data upserted successfully');
}

export async function setupRhBloodGroup(sql, logger, _skipRecordsTracker, dataDir) {
  logger.info('Setting up Rh blood group data...');

  const filePath = join(dataDir, 'demographic/rh_blood_group.csv');
  const rows = loadCsv(filePath);

  logger.info(`Upserting ${rows.length} Rh blood groups...`);

  const systemUser = 'system';
  const now = new Date();

  const values = rows.map((row) => ({
    code: row.code,
    active: row.active ?? true,
    info: validateInfoName(row),
    rank: parseInt(row.rank, 10),
    created_by: systemUser,
    updated_by: systemUser,
    created_at: now,
    updated_at: now,
  }));

  await sql`
    INSERT INTO rh_blood_group ${sql(
      values,
      'code',
      'active',
      'info',
      'rank',
      'created_by',
      'updated_by',
      'created_at',
      'updated_at',
    )} ON CONFLICT (code)
    DO UPDATE SET
    code = EXCLUDED.code,
    active = EXCLUDED.active,
    info = EXCLUDED.info,
    rank = EXCLUDED.rank,
    updated_at = EXCLUDED.updated_at,
    updated_by = EXCLUDED.updated_by
  `;

  logger.info('Rh blood group data upserted successfully');
}

export async function setupAboBloodGroup(sql, logger, _skipRecordsTracker, dataDir) {
  logger.info('Setting up Abo blood group data...');

  const filePath = join(dataDir, 'demographic/abo_blood_group.csv');
  const rows = loadCsv(filePath);

  logger.info(`Upserting ${rows.length} Abo blood groups...`);

  const systemUser = 'system';
  const now = new Date();

  const values = rows.map((row) => ({
    code: row.code,
    active: row.active ?? true,
    info: validateInfoName(row),
    rank: parseInt(row.rank, 10),
    created_by: systemUser,
    updated_by: systemUser,
    created_at: now,
    updated_at: now,
  }));

  await sql`
    INSERT INTO abo_blood_group ${sql(
      values,
      'code',
      'active',
      'info',
      'created_by',
      'updated_by',
      'rank',
      'created_at',
      'updated_at',
    )} ON CONFLICT (code)
    DO UPDATE SET
    active = EXCLUDED.active,
    info = EXCLUDED.info,
    updated_at = EXCLUDED.updated_at,
    updated_by = EXCLUDED.updated_by,
    rank = EXCLUDED.rank
  `;

  logger.info('Abo blood group data upserted successfully');
}

export async function setupIdentityVerificationMode(sql, logger, _skipRecordsTracker, dataDir) {
  logger.info('Setting up identity verification mode data...');

  const filePath = join(dataDir, 'demographic/identity_verification_mode.csv');
  const rows = loadCsv(filePath);

  logger.info(`Upserting ${rows.length} identity verification modes...`);

  const systemUser = 'system';
  const now = new Date();

  const values = rows.map((row) => ({
    code: row.code,
    active: row.active ?? true,
    info: validateInfoName(row),
    rank: parseInt(row.rank, 10),
    created_by: systemUser,
    updated_by: systemUser,
    created_at: now,
    updated_at: now,
  }));

  await sql`
    INSERT INTO identity_verification_mode ${sql(
      values,
      'code',
      'active',
      'info',
      'rank',
      'created_by',
      'updated_by',
      'created_at',
      'updated_at',
    )} ON CONFLICT (code)
    DO UPDATE SET
      active = EXCLUDED.active,
      info = EXCLUDED.info,
      rank = EXCLUDED.rank,
      updated_at = EXCLUDED.updated_at,
      updated_by = EXCLUDED.updated_by
  `;

  logger.info('Identity verification mode data upserted successfully');
}

export async function setupInformationGiverOption(sql, logger, _skipRecordsTracker, dataDir) {
  logger.info('Setting up information giver option data...');

  const filePath = join(dataDir, 'demographic/information_giver_option.csv');
  const rows = loadCsv(filePath);

  logger.info(`Upserting ${rows.length} information giver options...`);

  const systemUser = 'system';
  const now = new Date();

  const values = rows.map((row) => ({
    code: row.code,
    active: row.active ?? true,
    info: validateInfoName(row),
    rank: parseInt(row.rank, 10),
    created_by: systemUser,
    updated_by: systemUser,
    created_at: now,
    updated_at: now,
  }));

  await sql`
    INSERT INTO information_giver_option ${sql(
      values,
      'code',
      'active',
      'info',
      'rank',
      'created_by',
      'updated_by',
      'created_at',
      'updated_at',
    )} ON CONFLICT (code)
    DO UPDATE SET
      active = EXCLUDED.active,
      info = EXCLUDED.info,
      rank = EXCLUDED.rank,
      updated_at = EXCLUDED.updated_at,
      updated_by = EXCLUDED.updated_by
  `;

  logger.info('Information giver option data upserted successfully');
}

export async function setupDemographic(sql, logger, skipRecordsTracker, dataDir) {
  logger.info('Setting up demographic data...');

  await setupAddress(sql, logger, skipRecordsTracker, dataDir);
  await setupOccupation(sql, logger, skipRecordsTracker, dataDir);
  await setupNationality(sql, logger, skipRecordsTracker, dataDir);
  await setupEducationLevel(sql, logger, skipRecordsTracker, dataDir);
  await setupLanguage(sql, logger, skipRecordsTracker, dataDir);
  await setupMaritalStatus(sql, logger, skipRecordsTracker, dataDir);
  await setupRace(sql, logger, skipRecordsTracker, dataDir);
  await setupReligion(sql, logger, skipRecordsTracker, dataDir);
  await setupGender(sql, logger, skipRecordsTracker, dataDir);
  await setupNamePrefix(sql, logger, skipRecordsTracker, dataDir);

  await setupRhBloodGroup(sql, logger, skipRecordsTracker, dataDir);

  await setupAboBloodGroup(sql, logger, skipRecordsTracker, dataDir);
  await setupPatientCategory(sql, logger, skipRecordsTracker, dataDir);
  await setupIdentityVerificationMode(sql, logger, skipRecordsTracker, dataDir);
  await setupInformationGiverOption(sql, logger, skipRecordsTracker, dataDir);
  logger.info('Demographic data setup completed successfully');
}
