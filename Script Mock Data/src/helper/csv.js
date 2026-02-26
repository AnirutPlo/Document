import { readFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';

export function loadCsv(path) {
  const raw = readFileSync(path, 'utf-8');
  return parse(raw, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    cast: (value) => {
      if (value === 'TRUE') return true;
      if (value === 'FALSE') return false;
      return value;
    },
  });
}
