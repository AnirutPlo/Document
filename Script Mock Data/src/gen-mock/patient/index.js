import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { format } from 'fast-csv';
import { generateRandomPatient } from './generator.js';

export async function generatePatients(
  logger,
  dataDir,
  { demographicApiClient },
  count = 1,
  { batchSize = 10, outputDir = 'output' } = {},
) {
  const n = Number(count) || 1;
  const size = Math.max(1, Number(batchSize) || 10);

  // Prepare output
  const resolvedOutputDir = outputDir;
  if (!existsSync(resolvedOutputDir)) {
    mkdirSync(resolvedOutputDir, { recursive: true });
  }
  const fileName = `patients-${new Date().toISOString().replace(/[:T]/g, '-').split('.')[0]}.csv`;
  const outFile = join(resolvedOutputDir, fileName);

  // Set up CSV stream with headers
  const csvStream = format({ headers: true });
  const writable = createWriteStream(outFile, { encoding: 'utf-8' });
  csvStream.pipe(writable);

  logger.info(`Creating ${n} patient(s) in batches of ${size}`, { outFile });

  for (let offset = 0; offset < n; offset += size) {
    const remaining = n - offset;
    const thisBatch = Math.min(size, remaining);
    logger.info(`Generating batch ${offset / size + 1} (${thisBatch} records)`);

    const patients = await Promise.all(Array.from({ length: thisBatch }, () => generateRandomPatient(dataDir)));

    // Fire requests concurrently per batch
    const results = await Promise.all(
      patients.map((p) =>
        demographicApiClient
          .createPatient(p)
          .then((created) => ({ ok: true, created, p }))
          .catch((err) => ({ ok: false, err, p })),
      ),
    );

    let success = 0;
    for (const r of results) {
      if (r.ok) {
        success += 1;
        const row = {
          hn: r.created?.data?.hn,
          ehrId: r.created?.data?.ehrId,
          idCardNo: r.p.idCardNo,
          firstName: r.p.firstName,
          familyName: r.p.familyName,
          gender: r.p.gender,
          birthDate: r.p.birthDate,
          age: r.created?.data?.age,
          nationalityCode: r.p.nationalityCode,
          maritalStatusCode: r.p.maritalStatusCode,
          raceCode: r.p.raceCode,
          religionCode: r.p.religionCode?.code,
          occupationCode: r.p.occupationCode?.code,
          educationLevelCode: r.p.educationLevelCode,
          primaryLanguage: r.p.primaryLanguage,
          'official.stateCode': r.p.officialAddress?.stateCode,
          'official.districtCode': r.p.officialAddress?.districtCode,
          'official.cityCode': r.p.officialAddress?.cityCode,
          'official.postalCode': r.p.officialAddress?.postalCode,
        };
        csvStream.write(row);
      } else {
        logger.error('Failed to create patient: {*}', {
          message: r.err?.message,
          response: r.err?.response?.data,
          idCardNo: r.p?.idCardNo,
        });
      }
    }

    logger.info(`Batch done: ${success}/${thisBatch} created`);
  }

  // finalize CSV stream
  await new Promise((resolve) => {
    csvStream.end();
    writable.on('finish', resolve);
  });

  logger.info('Patient creation finished', { count: n, output: outFile });
}
