import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'csv-parse/sync';

export async function setupInventoryCategoryOrderTypeMapping(sql, logger, skipRecordsTracker, dataDir) {
  logger.info('Setting up inventory_category_order_type_mapping data...');

  const filePath = join(dataDir, 'inventory/inventory_category_order_type_mapping.csv');
  const raw = readFileSync(filePath, 'utf-8');

  const rows = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  });

  logger.info(`Parsed ${rows.length} rows...`);

  const values = rows
    .map((r) => {
      const orderType = String(r.order_type ?? '').trim();
      const categoryId = String(r.category_id ?? '').trim();

      if (!orderType || !categoryId) {
        skipRecordsTracker?.addSkippedRecord?.(
          'inventory_category_order_type_mapping',
          `${orderType || '(empty order_type)'}:${categoryId || '(empty category_id)'}`,
          'Missing required "order_type" or "category_id"',
        );
        return null;
      }

      return {
        order_type: orderType,
        category_id: categoryId,
      };
    })
    .filter(Boolean);

  logger.info(`Upserting ${values.length} inventory category/order type mappings...`);

  try {
    await sql`
      INSERT INTO inventory_category_order_type_mapping ${sql(values, 'order_type', 'category_id')}
      ON CONFLICT (order_type, category_id)
      DO UPDATE SET
        order_type = EXCLUDED.order_type,
        category_id = EXCLUDED.category_id
    `;
  } catch (bulkErr) {
    const code = bulkErr?.code ?? 'unknown';
    logger.error(`Bulk upsert failed for inventory_category_order_type_mapping (code=${code}): ${bulkErr.message}`);
    skipRecordsTracker?.addSkippedRecord?.('inventory_category_order_type_mapping', code, bulkErr.message);
  }

  logger.info('inventory_category_order_type_mapping upserted successfully');
}
