import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'csv-parse/sync';
import { validateInfoName } from '../../utils';

export async function setupQueueCounter(sql, logger, skipRecordsTracker, dataDir) {
  logger.info('Setting up queue counter data...');

  const queueCounterPath = join(dataDir, 'queue/queue-counter.csv');
  const queueCounterData = readFileSync(queueCounterPath, 'utf-8');

  const queueCounters = parse(queueCounterData, {
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

  logger.info(`Processing ${queueCounters.length} queue counters...`);

  // Fetch QueueServiceUnits to map code to id
  const queueServiceUnitCodes = [...new Set(queueCounters.map((item) => item.queue_service_unit_code))];
  const qsu = await sql`SELECT id, code FROM queue_service_unit WHERE code IN ${sql(queueServiceUnitCodes)}`;
  const qsuMap = new Map(qsu.map((i) => [i.code, i.id]));

  const validQueueCounters = [];
  const systemUser = 'system';
  const now = new Date();

  for (const queueCounter of queueCounters) {
    const qsuId = qsuMap.get(queueCounter.queue_service_unit_code);
    if (!qsuId) {
      logger.warn(
        `Queue Service Unit code not found: ${queueCounter.queue_service_unit_code} for queue counter ${queueCounter.code}`,
      );
      skipRecordsTracker.addSkippedRecord(
        'queue_counter',
        queueCounter.code,
        `Queue Service Unit code not found: ${queueCounter.queue_service_unit_code}`,
      );
      continue;
    }

    validQueueCounters.push({
      code: queueCounter.code,
      info: validateInfoName(queueCounter),
      rank: queueCounter.rank ? parseInt(queueCounter.rank, 10) : 1,
      queue_service_unit_id: qsuId,
      active: queueCounter.active,
      created_by: systemUser,
      updated_by: systemUser,
      created_at: now,
      updated_at: now,
    });
  }

  if (validQueueCounters.length === 0) {
    logger.warn('No queue counters to insert - all queue counters have invalid data');
    return;
  }

  logger.info(`Upserting ${validQueueCounters.length} queue counters...`);

  const skippedCount = skipRecordsTracker.getSkippedCount('queue_counter');
  logger.info(`Upserting ${validQueueCounters.length} queue counters (${skippedCount} skipped)...`);

  try {
    // Assuming queue_counter has a 'code' column for unique constraint
    await sql`
      INSERT INTO queue_counter ${sql(validQueueCounters, 'code', 'info', 'rank', 'queue_service_unit_id', 'active', 'created_by', 'updated_by', 'created_at', 'updated_at')}
      ON CONFLICT (code)
      DO UPDATE SET
        active = EXCLUDED.active,
        info = EXCLUDED.info,
        rank = EXCLUDED.rank,
        queue_service_unit_id = EXCLUDED.queue_service_unit_id,
        created_by = EXCLUDED.created_by,
        updated_by = EXCLUDED.updated_by,
        created_at = EXCLUDED.created_at,
        updated_at = EXCLUDED.updated_at
    `;
  } catch (bulkErr) {
    const code = bulkErr.code ?? 'unknown';
    logger.error(`Bulk insert failed for queue_counter (code=${code}): ${bulkErr.message}`);
    skipRecordsTracker.addSkippedRecord('queue_counter', code, bulkErr.message);
  }
}
