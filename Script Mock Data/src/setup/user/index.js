import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { format } from 'fast-csv';
import { loadCsv, parseActiveStrict } from '../../helper/index.js';

function extractPractitionerFields(r) {
  const active = parseActiveStrict(r.active);
  const medicalCertificateCode = r.medical_certificate_code || null;
  const prefix = r.prefix || '';
  const givenName = r.given_name || '';
  const middleName = r.middle_name || null;
  const familyName = r.family_name || '';
  const display = r.display || `${prefix} ${givenName} ${middleName ? `${middleName} ` : ''}${familyName}`.trim();
  const level = r.level || null;
  const role = r.role || null;
  const enPrefix = r.en_prefix || '';
  const enGiveName = r.en_give_name || '';
  const enMiddleName = r.en_middle_name || null;
  const enFamilyName = r.en_family_name || '';

  return {
    active,
    medicalCertificateCode,
    prefix,
    givenName,
    middleName,
    familyName,
    display,
    level,
    role,
    enPrefix,
    enGiveName,
    enMiddleName,
    enFamilyName,
  };
}

function createPractitionerObject(fields, userId, isDummy = false) {
  return {
    user_id: userId,
    active: fields.active,
    prefix: fields.prefix,
    given_name: fields.givenName,
    middle_name: fields.middleName,
    family_name: fields.familyName,
    display: fields.display,
    medical_certificate_code: fields.medicalCertificateCode,
    role: fields.role,
    level: fields.level,
    is_dummy: isDummy,
    info: {
      th: {
        prefix: fields.prefix,
        givenName: fields.givenName,
        middleName: fields.middleName,
        familyName: fields.familyName,
      },
      en: {
        prefix: fields.enPrefix,
        givenName: fields.enGiveName,
        middleName: fields.enMiddleName,
        familyName: fields.enFamilyName,
      },
    },
  };
}

export async function setupPractitioners(
  sql,
  logger,
  practitionersOrCsvPath,
  skipRecordsTracker,
  { keycloakAdminClient } = {},
) {
  let practitioners = [];

  // Build user map from Keycloak if client is provided
  const userMap = new Map();
  if (keycloakAdminClient) {
    try {
      logger.info('Fetching all users from Keycloak...');
      const allUsers = await keycloakAdminClient.getAllUsers();
      logger.info(`Fetched ${allUsers.length} users from Keycloak`);

      for (const user of allUsers) {
        const firstName = user.firstName || '';
        const lastName = user.lastName || '';
        const fullName = `${firstName} ${lastName}`.trim();
        if (fullName) {
          userMap.set(fullName, user.id);
        }
      }
      logger.info(`Created user map with ${userMap.size} entries`);
    } catch (err) {
      logger.error('Failed to fetch users from Keycloak', { error: err.message });
    }
  }

  // If it's a string, treat it as a CSV file path
  if (typeof practitionersOrCsvPath === 'string') {
    const rows = loadCsv(practitionersOrCsvPath);
    logger.info(`Loading ${rows.length} practitioners from CSV: ${practitionersOrCsvPath}`);

    for (const row of rows) {
      let userId = row.user_id || null;

      // Try to find userId from Keycloak user map
      if (!userId && keycloakAdminClient && userMap.size > 0) {
        const givenName = row.given_name || '';
        const familyName = row.family_name || '';
        const fullName = `${givenName} ${familyName}`.trim();

        if (fullName) {
          userId = userMap.get(fullName) || null;
          if (userId) {
            logger.debug(`Mapped practitioner to Keycloak user: ${fullName} -> ${userId}`);
          }
        }
      }

      const fields = extractPractitionerFields(row);
      const isDummy = row.is_dummy === 'TRUE' || row.is_dummy === true;

      practitioners.push(createPractitionerObject(fields, userId, isDummy));
    }
  } else {
    // Otherwise, treat it as an array of practitioner objects
    practitioners = practitionersOrCsvPath;
  }

  if (practitioners.length === 0) {
    logger.info('No practitioners to process');
    return;
  }

  const systemUser = 'system';
  const now = new Date();

  // Filter out practitioners without role (role is required NOT NULL)
  const originalCount = practitioners.length;
  const practitionersWithRole = practitioners.filter((p) => {
    if (!p.role || (typeof p.role === 'string' && p.role.trim() === '')) {
      const rec = {
        prefix: p.prefix,
        given_name: p.given_name,
        family_name: p.family_name,
        medical_certificate_code: p.medical_certificate_code,
      };
      logger.warn('Skipping practitioner due to missing role', rec);
      if (skipRecordsTracker) {
        skipRecordsTracker.addSkippedRecord('practitioner', rec, 'Missing role');
      }
      return false;
    }
    return true;
  });

  if (originalCount > practitionersWithRole.length) {
    logger.info(`Filtered out ${originalCount - practitionersWithRole.length} practitioners without role`);
  }

  // Split practitioners into two groups based on medical_certificate_code
  const practitionersWithMedicalCertificateCode = practitionersWithRole.filter(
    (p) =>
      p.medical_certificate_code !== null &&
      p.medical_certificate_code !== undefined &&
      p.medical_certificate_code !== '',
  );

  const practitionersWithoutMedicalCertificateCode = practitionersWithRole.filter(
    (p) =>
      p.medical_certificate_code === null ||
      p.medical_certificate_code === undefined ||
      p.medical_certificate_code === '',
  );

  // Upsert practitioners with medical_certificate_code using partial unique index
  if (practitionersWithMedicalCertificateCode.length > 0) {
    try {
      await sql`
        INSERT INTO practitioner
          (active, prefix, given_name, middle_name, family_name, display, medical_certificate_code, is_dummy, role, level, user_id, info, created_by, updated_by, created_at, updated_at)
        VALUES ${sql(
          practitionersWithMedicalCertificateCode.map((u) => [
            u.active,
            u.prefix,
            u.given_name,
            u.middle_name,
            u.family_name,
            u.display,
            u.medical_certificate_code,
            u.is_dummy !== undefined ? u.is_dummy : false,
            u.role,
            u.level,
            u.user_id,
            u.info,
            systemUser,
            systemUser,
            now,
            now,
          ]),
        )}
        ON CONFLICT (prefix, given_name, family_name, medical_certificate_code, role) 
        WHERE medical_certificate_code IS NOT NULL
        DO UPDATE SET
          active = EXCLUDED.active,
          middle_name = EXCLUDED.middle_name,
          display = EXCLUDED.display,
          is_dummy = EXCLUDED.is_dummy,
          level = EXCLUDED.level,
          user_id = EXCLUDED.user_id,
          info = EXCLUDED.info,
          updated_at = ${now},
          updated_by = ${systemUser}
      `;
    } catch (bulkErr) {
      const code = bulkErr.code ?? 'unknown';
      logger.error(
        `Bulk insert failed for practitioner with medical_certificate_code (code=${code}): ${bulkErr.message}`,
      );
      skipRecordsTracker?.addSkippedRecord?.('practitioner', code, bulkErr.message);
    }
  }

  // Upsert practitioners without medical_certificate_code using partial unique index
  if (practitionersWithoutMedicalCertificateCode.length > 0) {
    try {
      await sql`
        INSERT INTO practitioner
          (active, prefix, given_name, middle_name, family_name, display, medical_certificate_code, is_dummy, role, level, user_id, info, created_by, updated_by, created_at, updated_at)
        VALUES ${sql(
          practitionersWithoutMedicalCertificateCode.map((u) => [
            u.active,
            u.prefix,
            u.given_name,
            u.middle_name,
            u.family_name,
            u.display,
            u.medical_certificate_code,
            u.is_dummy !== undefined ? u.is_dummy : false,
            u.role,
            u.level,
            u.user_id,
            u.info,
            systemUser,
            systemUser,
            now,
            now,
          ]),
        )}
        ON CONFLICT (prefix, given_name, family_name, role) 
        WHERE medical_certificate_code IS NULL
        DO UPDATE SET
          active = EXCLUDED.active,
          middle_name = EXCLUDED.middle_name,
          display = EXCLUDED.display,
          medical_certificate_code = EXCLUDED.medical_certificate_code,
          is_dummy = EXCLUDED.is_dummy,
          level = EXCLUDED.level,
          user_id = EXCLUDED.user_id,
          info = EXCLUDED.info,
          updated_at = ${now},
          updated_by = ${systemUser}
      `;
    } catch (bulkErr) {
      const code = bulkErr.code ?? 'unknown';
      logger.error(
        `Bulk insert failed for practitioner without medical_certificate_code (code=${code}): ${bulkErr.message}`,
      );
      skipRecordsTracker.addSkippedRecord('practitioner', code, bulkErr.message);
    }
  }

  logger.info('Practitioner upsert completed', { count: practitioners.length });
}

export async function setupUsers(
  sql,
  logger,
  skipRecordsTracker,
  dataDir,
  { keycloakAdminClient, realm, outputDir = 'output' },
) {
  const filePath = join(dataDir, 'user/user.csv');
  const rows = loadCsv(filePath);
  logger.info(`Processing ${rows.length} users from CSV`);

  const resolvedOutputDir = outputDir;
  if (!existsSync(resolvedOutputDir)) mkdirSync(resolvedOutputDir, { recursive: true });
  const fileName = `keycloak-users-${new Date().toISOString().replace(/[:T]/g, '-').split('.')[0]}.csv`;
  const outFile = join(resolvedOutputDir, fileName);
  const csvStream = format({ headers: true });
  const writable = createWriteStream(outFile, { encoding: 'utf-8' });
  csvStream.pipe(writable);

  const defaultPassword = process.env.KEYCLOAK_DEFAULT_PASSWORD || 'changeme123';

  const practitionerRows = [];

  for (const row of rows) {
    const fields = extractPractitionerFields(row);
    const role = row.role;
    const username = row.username;
    const email = row.email;
    const realmRole = row.realm_role || role;

    if (!username || !email) {
      const rec = { username, email };
      logger.warn('Skipping row due to missing username/email', rec);
      if (skipRecordsTracker) skipRecordsTracker.addSkippedRecord('user', rec, 'Missing username/email');
      continue;
    }

    try {
      // Create or ensure user in Keycloak
      const userPayload = {
        username,
        email,
        firstName: fields.givenName,
        lastName: fields.familyName,
        enabled: fields.active,
        emailVerified: true,
        credentials: [
          {
            type: 'password',
            value: defaultPassword,
            temporary: false,
          },
        ],
      };

      // If user exists, Keycloak returns 409; handle gracefully
      const resp = await keycloakAdminClient.createUser(userPayload);
      if (resp.status === 201) {
        logger.info('Created Keycloak user', { username });
      } else {
        logger.info('Ensured Keycloak user', { username, status: resp.status });
      }
    } catch (err) {
      if (err.response?.status === 409) {
        logger.info('User already exists in Keycloak', { username });
      } else {
        const rec = { username, email };
        logger.error('Failed to create user in Keycloak: {*}', {
          message: err.message,
          username,
          response: err.response?.data,
        });
        if (skipRecordsTracker) skipRecordsTracker.addSkippedRecord('user', rec, `Create user failed: ${err.message}`);
      }
    }

    // Fetch user id
    const user = await keycloakAdminClient.findUserByUsername(username);
    const userId = user?.id || null;

    if (!userId) {
      const rec = { username, email };
      logger.error('Unable to find user after creation', rec);
      if (skipRecordsTracker) skipRecordsTracker.addSkippedRecord('user', rec, 'User not found after creation');
      continue;
    }

    // Assign realm role if provided
    if (realmRole) {
      try {
        const roleRep = await keycloakAdminClient.getRealmRole(realmRole);
        await keycloakAdminClient.assignRealmRolesToUser(userId, [roleRep]);
      } catch (err) {
        const rec = { username, role: realmRole };
        logger.error('Failed to assign realm role: {*}', {
          username,
          role: realmRole,
          message: err.message,
          response: err.response?.data,
        });
        if (skipRecordsTracker)
          skipRecordsTracker.addSkippedRecord('user', rec, `Assign realm role failed: ${err.message}`);
      }
    }

    // Collect practitioner row for bulk upsert
    practitionerRows.push(createPractitionerObject(fields, userId));

    // Write mapping to CSV
    csvStream.write({ username, userId, email, realm: realm, realmRole, role, practitionerDisplay: fields.display });
  }

  await new Promise((resolve) => {
    csvStream.end();
    writable.on('finish', resolve);
  });

  // Upsert practitioners after Keycloak ops
  await setupPractitioners(sql, logger, practitionerRows, skipRecordsTracker);

  logger.info('Keycloak user setup completed', { output: outFile });
}

export async function setupUserAllowedBranch(sql, logger, skipRecordsTracker, { keycloakAdminClient, realm } = {}) {
  logger.info('Setting up user allowed branch data...');

  if (!keycloakAdminClient) {
    throw new Error('keycloakAdminClient is required for setupUserAllowedBranch');
  }

  if (!realm) {
    throw new Error('realm is required for setupUserAllowedBranch');
  }

  logger.info(`Fetching all users from Keycloak realm: ${realm}`);

  const keycloakUsers = await keycloakAdminClient.getAllUsers();

  logger.info(`Found ${keycloakUsers.length} users in Keycloak realm ${realm}`);

  if (keycloakUsers.length === 0) {
    logger.warn('No users found in Keycloak realm, skipping user allowed branch setup');
    return;
  }

  logger.info('Fetching head quarter branches...');
  const headQuarterBranches = await sql`
    SELECT id, code FROM branch WHERE is_head_quarter = TRUE
  `;
  logger.info(`Found ${headQuarterBranches.length} head quarter branches`);

  if (headQuarterBranches.length === 0) {
    logger.warn('No head quarter branches found, skipping user allowed branch setup');
    return;
  }

  const validRecords = [];

  for (const user of keycloakUsers) {
    const userId = user.id;

    if (!userId) {
      logger.warn('Skipping user due to missing id', { username: user.username });
      if (skipRecordsTracker) {
        skipRecordsTracker.addSkippedRecord('user_allowed_branch', { username: user.username }, 'Missing user id');
      }
      continue;
    }

    for (let i = 0; i < headQuarterBranches.length; i++) {
      const branch = headQuarterBranches[i];
      const isDefault = i === 0; // First branch is default

      validRecords.push({
        user_id: userId,
        branch_id: branch.id,
        default: isDefault,
      });
    }
  }

  if (validRecords.length === 0) {
    logger.warn('No user allowed branch records to insert');
    return;
  }

  logger.info(
    `Upserting ${validRecords.length} user allowed branch records (${keycloakUsers.length} users × ${headQuarterBranches.length} branches)...`,
  );

  try {
    await sql`
      INSERT INTO user_allowed_branch ${sql(validRecords, 'user_id', 'branch_id', 'default')}
      ON CONFLICT (user_id, branch_id)
      DO UPDATE SET
        "default" = EXCLUDED."default"
    `;
  } catch (error_) {
    logger.error(`Bulk insert failed for user_allowed_branch: ${error_.message}`, {
      code: error_.code,
      detail: error_.detail,
      constraint: error_.constraint,
    });
    skipRecordsTracker.addSkippedRecord('user_allowed_branch', 'bulk', error_.message);
  }

  logger.info('User allowed branch data upserted successfully');
}
