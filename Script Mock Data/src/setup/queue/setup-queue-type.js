import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'csv-parse/sync';
import { validateInfoName } from '../../utils';

export async function setupQueueType(sql, logger, skipRecordsTracker, dataDir) {
  logger.info('Setting up queue type data...');

  const queueTypePath = join(dataDir, 'queue/queue-type.csv');
  const queueTypeData = readFileSync(queueTypePath, 'utf-8');

  const queueTypes = parse(queueTypeData, {
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

  logger.info(`Processing ${queueTypes.length} queue types...`);

  // Fetch QueueServiceUnits to map code to id
  const queueServiceUnitCodes = [...new Set(queueTypes.map((item) => item.queue_service_unit_code))];
  const qsu = await sql`SELECT id, code FROM queue_service_unit WHERE code IN ${sql(queueServiceUnitCodes)}`;
  const qsuMap = new Map(qsu.map((i) => [i.code, i.id]));

  const validQueueTypes = [];
  const systemUser = 'system';
  const now = new Date();

  for (const queueType of queueTypes) {
    const qsuId = qsuMap.get(queueType.queue_service_unit_code);
    if (!qsuId) {
      logger.warn(
        `Queue Service Unit code not found: ${queueType.queue_service_unit_code} for queue type ${queueType.code}`,
      );
      skipRecordsTracker.addSkippedRecord(
        'queue_type',
        queueType.code,
        `Queue Service Unit code not found: ${queueType.queue_service_unit_code}`,
      );
      continue;
    }

    validQueueTypes.push({
      code: queueType.code,
      info: validateInfoName(queueType),
      rank: queueType.rank ? parseInt(queueType.rank, 10) : 1,
      queue_service_unit_id: qsuId,
      instruction: queueType.instruction || null,
      is_required_identifier: queueType.is_required_identifier || false,
      active: queueType.active,
      created_by: systemUser,
      updated_by: systemUser,
      created_at: now,
      updated_at: now,
    });
  }

  if (validQueueTypes.length === 0) {
    logger.warn('No queue types to insert - all queue types have invalid data');
    return;
  }

  logger.info(`Upserting ${validQueueTypes.length} queue types...`);

  const skippedCount = skipRecordsTracker.getSkippedCount('queue_type');
  logger.info(`Upserting ${validQueueTypes.length} queue types (${skippedCount} skipped)...`);

  try {
    await sql`
      INSERT INTO queue_type ${sql(validQueueTypes, 'code', 'info', 'rank', 'queue_service_unit_id', 'instruction', 'is_required_identifier', 'active', 'created_by', 'updated_by', 'created_at', 'updated_at')}
      ON CONFLICT (code)
      DO UPDATE SET
        active = EXCLUDED.active,
        info = EXCLUDED.info,
        rank = EXCLUDED.rank,
        queue_service_unit_id = EXCLUDED.queue_service_unit_id,
        instruction = EXCLUDED.instruction,
        is_required_identifier = EXCLUDED.is_required_identifier,
        created_by = EXCLUDED.created_by,
        updated_by = EXCLUDED.updated_by,
        created_at = EXCLUDED.created_at,
        updated_at = EXCLUDED.updated_at
    `;
  } catch (bulkErr) {
    const code = bulkErr.code ?? 'unknown';
    logger.error(`Bulk insert failed for queue_type (code=${code}): ${bulkErr.message}`);
    skipRecordsTracker.addSkippedRecord('queue_type', code, bulkErr.message);
  }
}
