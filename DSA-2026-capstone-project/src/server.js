import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPort } from './config.js';
import { createHttpServer } from './http/app.js';

export function startServer(port = getPort()) {
  const server = createHttpServer();
  server.listen(port, () => {
    console.log(`Event Ticketing server listening on port ${server.address().port}`);
  });
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startServer();
}