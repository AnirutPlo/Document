import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'csv-parse/sync';

export async function setupPrintTemplate(sql, logger, skipRecordsTracker, dataDir) {
  logger.info('Setting up print template data...');

  const printTemplatePath = join(dataDir, 'print-template/print-template.csv');
  let printTemplateData;
  try {
    printTemplateData = readFileSync(printTemplatePath, 'utf-8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      logger.warn(`Print template data file not found at ${printTemplatePath}, skipping...`);
      return;
    }
    throw err;
  }

  const printTemplates = parse(printTemplateData, {
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

  const values = printTemplates.map((template) => {
    let templateBytes;
    if (template.file_name) {
      const templateFilePath = join(dataDir, 'print-template/template', template.file_name);
      try {
        templateBytes = readFileSync(templateFilePath);
      } catch (err) {
        logger.error(`Failed to read template file ${template.file_name}: ${err.message}`);
        throw err;
      }
    } else {
      throw new Error(`file_name is required for template ${template.name}`);
    }

    return {
      active: template.active ?? true,
      name: template.name,
      template: templateBytes,
      print_type: template.print_type || 'JRXML',
      note: template.note,
      sub_report_names: template.sub_report_names ? JSON.parse(template.sub_report_names) : [],
      rank: template.rank ? parseInt(template.rank, 10) : 1,
      created_by: systemUser,
      updated_by: systemUser,
      created_at: now,
      updated_at: now,
    };
  });

  if (values.length === 0) {
    logger.info('No print templates to upsert.');
    return;
  }

  try {
    await sql`
        INSERT INTO print_template ${sql(
          values,
          'active',
          'name',
          'template',
          'print_type',
          'note',
          'sub_report_names',
          'rank',
          'created_by',
          'updated_by',
          'created_at',
          'updated_at',
        )}
        ON CONFLICT (name)
        DO UPDATE SET
            active = EXCLUDED.active,
            template = EXCLUDED.template,
            print_type = EXCLUDED.print_type,
            note = EXCLUDED.note,
            sub_report_names = EXCLUDED.sub_report_names,
            rank = EXCLUDED.rank,
            updated_at = EXCLUDED.updated_at,
            updated_by = EXCLUDED.updated_by
    `;
  } catch (bulkErr) {
    const code = bulkErr.code ?? 'unknown';
    logger.error(`Bulk insert failed for print_template (code=${code}): ${bulkErr.message}`);
    skipRecordsTracker.addSkippedRecord('print_template', code, bulkErr.message);
  }

  logger.info('Print template data upserted successfully');
}
