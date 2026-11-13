import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DATABASE_PATH, getPort } from './config.js';
import { createHttpServer } from './http/app.js';
import { createSqliteRepository } from './repositories/sqlite.js';

export function startServer(port = getPort(), { databasePath = DATABASE_PATH } = {}) {
  const repository = createSqliteRepository({ path: databasePath });
  const server = createHttpServer({ repository });
  server.once('close', () => repository.close());
  server.listen(port, () => {
    console.log(`Event Ticketing server listening on port ${server.address().port}`);
  });
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startServer();
}