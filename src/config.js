import { fileURLToPath } from 'node:url';

export const DEFAULT_PORT = 3000;
const DEFAULT_DATABASE_PATH = fileURLToPath(new URL('../data/ticketing.db', import.meta.url));

export const DATABASE_PATH = process.env.DATABASE_PATH || DEFAULT_DATABASE_PATH;

export function getPort(value = process.env.PORT) {
  if (value === undefined || value === '') return DEFAULT_PORT;

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new RangeError('PORT must be a whole number between 1 and 65535');
  }
  return port;
}