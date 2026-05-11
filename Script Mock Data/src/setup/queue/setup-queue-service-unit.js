import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'csv-parse/sync';
import { validateInfoName } from '../../utils';

export async function setupQueueServiceUnit(sql, logger, skipRecordsTracker, dataDir) {
  logger.info('Setting up queue service unit data...');

  const queueServiceUnitPath = join(dataDir, 'queue/queue-service-unit.csv');
  const queueServiceUnitData = readFileSync(queueServiceUnitPath, 'utf-8');

  const queueServiceUnits = parse(queueServiceUnitData, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    trim: true,
    cast: (value) => {
      if (value === 'TRUE') return true;
      if (value === 'FALSE') return false;
      if (value === '') return null;
      return value;
    },
  });

  logger.info(`Processing ${queueServiceUnits.length} queue service units...`);

  const validQueueServiceUnits = [];
  const systemUser = 'system';
  const now = new Date();
  for (const queueServiceUnit of queueServiceUnits) {
    let announceLanguages = queueServiceUnit.announce_languages;
    if (typeof announceLanguages === 'string') {
      try {
        announceLanguages = JSON.parse(announceLanguages);
      } catch (e) {
        logger.warn(`Failed to parse announce_languages for ${queueServiceUnit.code}: ${e.message}`);
      }
    }

    validQueueServiceUnits.push({
      code: queueServiceUnit.code,
      info: validateInfoName(queueServiceUnit),
      announce_languages: announceLanguages,
      instruction: queueServiceUnit.instruction || null,
      type: queueServiceUnit.type,
      patient_journey_rank: queueServiceUnit.patient_journey_rank
        ? parseInt(queueServiceUnit.patient_journey_rank, 10)
        : null,
      active: queueServiceUnit.active,
      created_by: systemUser,
      updated_by: systemUser,
      created_at: now,
      updated_at: now,
    });
  }

  if (validQueueServiceUnits.length === 0) {
    logger.warn('No queue service units to insert - all queue service units have invalid data');
    return;
  }

  logger.info(`Upserting ${validQueueServiceUnits.length} queue service units...`);

  const skippedCount = skipRecordsTracker.getSkippedCount('queue_service_unit');
  logger.info(`Upserting ${validQueueServiceUnits.length} queue service units (${skippedCount} skipped)...`);

  try {
    await sql`
      INSERT INTO queue_service_unit ${sql(validQueueServiceUnits, 'code', 'info', 'announce_languages', 'instruction', 'type', 'patient_journey_rank', 'active', 'created_by', 'updated_by', 'created_at', 'updated_at')}
      ON CONFLICT (code)
      DO UPDATE SET
        active = EXCLUDED.active,
        info = EXCLUDED.info,
        announce_languages = EXCLUDED.announce_languages,
        instruction = EXCLUDED.instruction,
        type = EXCLUDED.type,
        patient_journey_rank = EXCLUDED.patient_journey_rank,
        created_by = EXCLUDED.created_by,
        updated_by = EXCLUDED.updated_by,
        created_at = EXCLUDED.created_at,
        updated_at = EXCLUDED.updated_at
    `;
  } catch (bulkErr) {
    const code = bulkErr.code ?? 'unknown';
    logger.error(`Bulk insert failed for queue_service_unit (code=${code}): ${bulkErr.message}`);
    skipRecordsTracker.addSkippedRecord('queue_service_unit', code, bulkErr.message);
  }
}
