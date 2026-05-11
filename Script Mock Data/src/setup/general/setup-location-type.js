import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'csv-parse/sync';

export async function setupLocationType(sql, logger, _skipRecordsTracker, dataDir) {
  logger.info('Setting up location type data...');

  const locationTypePath = join(dataDir, 'general/location-type.csv');
  const locationTypeData = readFileSync(locationTypePath, 'utf-8');

  const locationTypes = parse(locationTypeData, {
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

  logger.info(`Upserting ${locationTypes.length} location types...`);

  const systemUser = 'system';
  const now = new Date();

  const values = locationTypes.map((locationType) => ({
    code: locationType.code,
    active: locationType.active,
    info: { name: locationType['info.name'] || '' },
    rank: locationType.rank,
    recommend_icd10: locationType.recommend_icd10 || null,
    created_by: systemUser,
    updated_by: systemUser,
    created_at: now,
    updated_at: now,
  }));

  const skippedCount = _skipRecordsTracker?.getSkippedCount('location_type');
  logger.info(`Upserting ${values.length} location types (${skippedCount} skipped)...`);

  try {
    await sql`
      INSERT INTO location_type ${sql(values, 'code', 'active', 'info', 'rank', 'recommend_icd10', 'created_by', 'updated_by', 'created_at', 'updated_at')}
      ON CONFLICT (code)
      DO UPDATE SET
        active = EXCLUDED.active,
        info = EXCLUDED.info,
        rank = EXCLUDED.rank,
        recommend_icd10 = EXCLUDED.recommend_icd10,
        updated_at = EXCLUDED.updated_at,
        updated_by = EXCLUDED.updated_by,
        created_at = EXCLUDED.created_at,
        created_by = EXCLUDED.created_by
  `;
  } catch (bulkErr) {
    const code = bulkErr.code ?? 'unknown';
    logger.error(`Bulk insert failed for location_type (code=${code}): ${bulkErr.message}`);
    _skipRecordsTracker.addSkippedRecord('location_type', code, bulkErr.message);
  }

  logger.info('Location type data upserted successfully');
}
