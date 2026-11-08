import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { DEFAULT_PORT, getPort } from '../src/config.js';
import { createApp } from '../src/http/app.js';

const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
let server;
let baseUrl;

before(async () => {
  server = createServer(createApp({ publicDir }));
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server?.listening) {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

async function request(pathname, { method = 'GET', headers = {}, body } = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, { method, headers, body });
  return {
    status: response.status,
    contentType: response.headers.get('content-type'),
    body: await response.text(),
  };
}

describe('HTTP application', () => {
  it('uses the default port and validates an explicit PORT value', () => {
    assert.equal(DEFAULT_PORT, 3000);
    assert.equal(getPort(''), 3000);
    assert.equal(getPort('4312'), 4312);
    assert.throws(() => getPort('0'), RangeError);
    assert.throws(() => getPort('not-a-port'), RangeError);
  });

  it('returns the health response over HTTP', async () => {
    const response = await request('/health');

    assert.equal(response.status, 200);
    assert.match(response.contentType, /application\/json/);
    assert.deepEqual(JSON.parse(response.body), { status: 'ok' });
  });

  it('returns the static page from public', async () => {
    const response = await request('/');

    assert.equal(response.status, 200);
    assert.match(response.contentType, /text\/html/);
    assert.match(response.body, /Event Ticketing/);
  });

  it('returns consistent JSON for an unknown API route', async () => {
    const response = await request('/api/not-implemented');

    assert.equal(response.status, 404);
    assert.deepEqual(JSON.parse(response.body), {
      error: { code: 'NOT_FOUND', message: 'API route not found' },
    });
  });

  it('returns a JSON 400 for malformed JSON without exposing a stack', async () => {
    const response = await request('/api/example', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{invalid',
    });
    const parsed = JSON.parse(response.body);

    assert.equal(response.status, 400);
    assert.deepEqual(Object.keys(parsed), ['error']);
    assert.equal(parsed.error.code, 'BAD_JSON');
    assert.doesNotMatch(response.body, /stack|node:internal| at /i);
  });

  it('returns a safe JSON 400 for malformed path encoding', async () => {
    const response = await request('/health/%E0%A4%A');

    assert.equal(response.status, 400);
    assert.equal(JSON.parse(response.body).error.code, 'BAD_REQUEST');
    assert.doesNotMatch(response.body, /URIError|stack| at /i);
  });

  it('does not serve files outside public', async () => {
    const response = await request('/%2e%2e%2fpackage.json');

    assert.equal(response.status, 404);
    assert.equal(JSON.parse(response.body).error.code, 'NOT_FOUND');
    assert.doesNotMatch(response.body, /ticketing-capstone|"scripts"/);
  });
});