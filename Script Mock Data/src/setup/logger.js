import { createWriteStream, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { configure, getConsoleSink, getLogger } from '@logtape/logtape';

export async function setupLogger(logFile = null) {
  const sinks = {
    console: getConsoleSink(),
  };

  // Add file sink if log file is specified
  if (logFile) {
    // Ensure directory exists
    mkdirSync(dirname(logFile), { recursive: true });

    const fileStream = createWriteStream(logFile, { flags: 'a' });

    sinks.file = (record) => {
      const timestamp = new Date(record.timestamp).toISOString();
      const level = record.level.toUpperCase().padEnd(3);
      const category = record.category.join('·');
      const message = typeof record.message === 'string' ? record.message : JSON.stringify(record.message);
      const line = `${timestamp} ${level} ${category} ${message}\n`;
      fileStream.write(line);
    };
  }

  await configure({
    sinks,
    loggers: [
      {
        category: 'setup',
        level: 'info',
        sinks: Object.keys(sinks),
      },
      {
        category: ['logtape', 'meta'],
        level: 'warn',
        sinks: ['console'],
      },
    ],
  });

  return getLogger('setup');
}
