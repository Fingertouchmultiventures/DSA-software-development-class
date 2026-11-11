import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Router } from '../src/http/router.js';

describe('Router', () => {
  it('matches an HTTP method and extracts path parameters', () => {
    const handler = () => {};
    const router = new Router().add('GET', '/events/:eventId/tiers/:tierId', handler);

    assert.deepEqual(router.match('GET', '/events/event%201/tiers/general'), {
      handler,
      params: { eventId: 'event 1', tierId: 'general' },
    });
  });

  it('does not match another method or a different path', () => {
    const router = new Router().add('GET', '/events/:eventId', () => {});

    assert.equal(router.match('POST', '/events/123'), undefined);
    assert.equal(router.match('GET', '/events'), undefined);
  });

  it('rejects malformed encoded path segments', () => {
    const router = new Router().add('GET', '/events/:eventId', () => {});

    assert.throws(() => router.match('GET', '/events/%E0%A4%A'), URIError);
  });
});