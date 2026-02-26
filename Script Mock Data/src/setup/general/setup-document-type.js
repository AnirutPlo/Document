import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'csv-parse/sync';

export async function setupDocumentType(sql, logger, skipRecordsTracker, dataDir) {
  logger.info('Setting up document type data...');

  const documentTypePath = join(dataDir, 'general/document-type.csv');
  const documentTypeData = readFileSync(documentTypePath, 'utf-8');

  const documentTypes = parse(documentTypeData, {
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

  const systemUser = 'system';
  const now = new Date();

  const values = documentTypes.map((documentType) => ({
    code: documentType.code,
    active: documentType.active,
    info: {
      th: { name: documentType['info.th.name'] },
      en: { name: documentType['info.en.name'] },
    },
    created_by: systemUser,
    updated_by: systemUser,
    created_at: now,
    updated_at: now,
  }));

  try {
    await sql`
        INSERT INTO document_type ${sql(values, 'code', 'active', 'info', 'created_by', 'updated_by', 'created_at', 'updated_at')}
        ON CONFLICT (code)
        DO UPDATE SET
            active = EXCLUDED.active,
            info = EXCLUDED.info,
            updated_at = EXCLUDED.updated_at,
            updated_by = EXCLUDED.updated_by
    `;
  } catch (bulkErr) {
    const code = bulkErr.code ?? 'unknown';
    logger.error(`Bulk insert failed for document_type (code=${code}): ${bulkErr.message}`);
    skipRecordsTracker.addSkippedRecord('document_type', code, bulkErr.message);
  }

  logger.info('Document type data upserted successfully');
}
