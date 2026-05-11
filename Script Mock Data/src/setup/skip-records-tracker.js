export class SkipRecordsTracker {
  constructor(logger) {
    this.logger = logger;
    this.skipRecords = {};
  }

  addSkippedRecord(tableName, record, reason) {
    if (!this.skipRecords[tableName]) {
      this.skipRecords[tableName] = [];
    }

    this.skipRecords[tableName].push({
      record,
      reason,
      timestamp: new Date().toISOString(),
    });
  }

  getSkippedRecords(tableName) {
    return this.skipRecords[tableName] || [];
  }

  getAllSkippedRecords() {
    return this.skipRecords;
  }

  getSkippedCount(tableName) {
    return this.skipRecords[tableName]?.length || 0;
  }

  getTotalSkippedCount() {
    return Object.values(this.skipRecords).reduce((total, records) => total + records.length, 0);
  }

  generateReport() {
    const report = [];
    report.push('\n============ SKIPPED RECORDS REPORT ============');

    const allSkipped = this.getAllSkippedRecords();

    if (Object.keys(allSkipped).length === 0) {
      report.push('No records were skipped during the setup process.');
      report.push('================================================\n');
      return report.join('\n');
    }

    const totalSkipped = this.getTotalSkippedCount();
    report.push(`Total skipped records: ${totalSkipped}`);
    report.push('');

    for (const [tableName, records] of Object.entries(allSkipped)) {
      report.push(`Table: ${tableName.toUpperCase()}`);
      report.push(`Count: ${records.length}`);
      report.push('Details:');

      const reasonGroups = {};
      records.forEach(({ record, reason }) => {
        if (!reasonGroups[reason]) {
          reasonGroups[reason] = [];
        }
        const identifier = record.code || record.external_id || record.id || 'unknown';
        reasonGroups[reason].push(identifier);
      });

      for (const [reason, identifiers] of Object.entries(reasonGroups)) {
        report.push(`  - ${reason}:`);
        if (identifiers.length <= 5) {
          identifiers.forEach((id) => {
            report.push(`    • ${id}`);
          });
        } else {
          identifiers.slice(0, 5).forEach((id) => {
            report.push(`    • ${id}`);
          });
          report.push(`    ... and ${identifiers.length - 5} more`);
        }
      }
      report.push('');
    }

    report.push('================================================\n');
    return report.join('\n');
  }

  logReport() {
    const report = this.generateReport();
    this.logger.info(report);
  }

  saveReportToFile(filePath) {
    const fs = require('node:fs');
    const path = require('node:path');

    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const report = this.generateReport();
    fs.writeFileSync(filePath, report, 'utf-8');
    this.logger.info(`Skip records report saved to: ${filePath}`);
  }
}
