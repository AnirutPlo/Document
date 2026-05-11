import { createReadStream } from 'node:fs';
import { writeFile, appendFile } from 'node:fs/promises'; // create mapping file if not exist
import { join } from 'node:path'; // create mapping file if not exist
import { parse } from 'fast-csv';

export async function generateVisits(logger, dataDir, { cortexApiClient }, options = {}) {
  const csvPath = options.csvPath;

  if (!csvPath) {
    throw new Error('CSV path is required for visit generation');
  }
/* create mapping file if not exist
  const mappingFile = join(dataDir, 'visit-mapping.csv');
  await writeFile(mappingFile, 'hn,vn\n');
  logger.info(`Created mapping file at ${mappingFile}`);
*/
  logger.info(`Reading visits from ${csvPath}`);

  const rows = [];

  await new Promise((resolve, reject) => {
    createReadStream(csvPath)
      .pipe(parse({ headers: true }))
      .on('error', reject)
      .on('data', (row) => rows.push(row))
      .on('end', resolve);
  });

  logger.info(`Found ${rows.length} rows to process`);

  const mutation = `mutation CreateVisit($input: [CreateVisitInput!]!) {
  createVisit(input: $input) {
    vn
    hn
    active
    latestStatusCode
    coverageUsages {
      id
      insurancePlanId
      priority
    }
  }
}`;

  const inputs = rows.map((row) => {
    const coverageInput = [];

    if (row.insurancePlanId_1) {
      const cov = {
        insurancePlanId: Number(row.insurancePlanId_1),
        priority: 10,
      };
      if (row['insurancePlanId_1.payorId']) cov.payorId = row['insurancePlanId_1.payorId'];
      if (row['insurancePlanId_1.expiredAt']) cov.expiredAt = row['insurancePlanId_1.expiredAt'];
      if (row['insurancePlanId_1.budgetLimit'])
        cov.budgetLimit = Number(row['insurancePlanId_1.budgetLimit']);

      coverageInput.push(cov);
    }

    if (row.insurancePlanId_2) {
      const cov = {
        insurancePlanId: Number(row.insurancePlanId_2),
        priority: 20,
      };
      if (row['insurancePlanId_2.payorId']) cov.payorId = row['insurancePlanId_2.payorId'];
      if (row['insurancePlanId_2.expiredAt']) cov.expiredAt = row['insurancePlanId_2.expiredAt'];
      if (row['insurancePlanId_2.budgetLimit'])
        cov.budgetLimit = Number(row['insurancePlanId_2.budgetLimit']);

      coverageInput.push(cov);
    }

    return {
      hn: row.hn,
      source: 'kiosk',
      encounterInput: [
        {
          encounterType: 'WALK_IN',
          walkInTarget: {
            clinicId: 217,
          },
        },
      ],
      coverageInput: coverageInput.length > 0 ? coverageInput : undefined,
    };
  });

  const batchSize = options.batchSize || 10;
  for (let i = 0; i < inputs.length; i += batchSize) {
    const batch = inputs.slice(i, i + batchSize);
    logger.info(`Processing batch ${Math.floor(i / batchSize) + 1} size ${batch.length}`);

    try {
      const response = await cortexApiClient.client.post('/graphql', {
        query: mutation,
        variables: { input: batch },
      });

      if (response.data.errors) {
        logger.error('GraphQL Errors:', response.data.errors);
      } else {
        const created = response.data.data?.createVisit || [];
        logger.info(`Batch success: ${created.length} visits created`);
/* create mapping file if not exist
        if (created.length > 0) {
          const rows = created.map((v) => `${v.hn},${v.vn}`).join('\n');
          await appendFile(mappingFile, rows + '\n');
        } 
*/
      }
    } catch (err) {
      logger.error('Request failed', err.response?.data || err.message);
    }
  }
}
