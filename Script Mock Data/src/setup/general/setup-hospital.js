import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'csv-parse/sync';

export async function setupHospital(sql, logger, skipRecordsTracker, dataDir) {
  logger.info('Setting up hospital data...');

  const hospitalPath = join(dataDir, 'general/hospital.csv');
  const hospitalData = readFileSync(hospitalPath, 'utf-8');

  const hospitals = parse(hospitalData, {
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

  logger.info(`Processing ${hospitals.length} hospitals...`);

  const systemUser = 'system';
  const now = new Date();

  const values = hospitals.map((hospital) => ({
    id: hospital.id,
    name: hospital.name,
    code: hospital.code,
    region: hospital.region ? parseInt(hospital.region, 10) : null,
    active: hospital.active ?? true,
    created_by: systemUser,
    updated_by: systemUser,
    created_at: now,
    updated_at: now,
  }));

  // Process in batches to avoid parameter limit
  const batchSize = 5000;
  for (let i = 0; i < values.length; i += batchSize) {
    const batch = values.slice(i, i + batchSize);
    logger.info(
      `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(values.length / batchSize)} (${batch.length} records)`,
    );

    try {
      await sql`
        INSERT INTO hospital ${sql(
          batch,
          'id',
          'name',
          'code',
          'region',
          'active',
          'created_by',
          'updated_by',
          'created_at',
          'updated_at',
        )}
        ON CONFLICT (code)
        DO UPDATE SET
          name = EXCLUDED.name,
          region = EXCLUDED.region,
          active = EXCLUDED.active,
          updated_at = EXCLUDED.updated_at,
          updated_by = EXCLUDED.updated_by
      `;
    } catch (bulkErr) {
      const code = bulkErr?.code ?? 'unknown';
      const message = `Bulk insert failed for hospital batch ${Math.floor(i / batchSize) + 1}: ${bulkErr.message} (code=${code})`;
      logger.error(message);
      skipRecordsTracker.addSkippedRecord('hospital', '-', message);
    }
  }

  logger.info('Hospital data upserted successfully');
}
