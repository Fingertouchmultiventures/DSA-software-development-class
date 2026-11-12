import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const SCHEMA = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');

export const MEMORY_DATABASE = ':memory:';

export function openDatabase(path = MEMORY_DATABASE) {
  if (typeof path !== 'string' || path.trim() === '') {
    throw new TypeError('database path must be a non-empty string');
  }
  if (path !== MEMORY_DATABASE) {
    mkdirSync(dirname(resolve(path)), { recursive: true });
  }

  const database = new DatabaseSync(path);
  database.exec('PRAGMA foreign_keys = ON');
  if (path !== MEMORY_DATABASE) {
    database.exec('PRAGMA journal_mode = WAL');
    database.exec('PRAGMA busy_timeout = 5000');
  }
  database.exec(SCHEMA);
  return database;
}
