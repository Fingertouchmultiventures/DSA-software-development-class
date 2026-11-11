import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { createServer } from 'node:http';
import { createApp } from '../src/http/app.js';

let server;
let baseUrl;

before(async () => {
  server = createServer(createApp());
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server?.listening) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

async function request(path, { method = 'GET', userId, body } = {}) {
  const headers = {};
  if (userId) headers['x-user-id'] = userId;
  if (body !== undefined) headers['content-type'] = 'application/json';
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: response.status,
    body: await response.json(),
  };
}

describe('Build 4 REST API', () => {
  it('creates, publishes, searches, and returns event details', async () => {
    const created = await request('/api/events', {
      method: 'POST',
      userId: 'organizer-1',
      body: {
        title: 'Lagos Tech Night',
        city: 'Lagos',
        venue: 'Test Hall',
        startsAt: '2026-12-05T17:00:00Z',
      },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.status, 'draft');
    assert.equal(created.body.organizerId, 'organizer-1');

    const tier = await request(`/api/events/${created.body.id}/tiers`, {
      method: 'POST',
      userId: 'organizer-1',
      body: { name: 'General', priceCents: 500000, capacity: 2 },
    });
    assert.equal(tier.status, 201);

    assert.deepEqual((await request('/api/events')).body.events, []);
    const published = await request(`/api/events/${created.body.id}/publish`, {
      method: 'POST',
      userId: 'organizer-1',
    });
    assert.equal(published.status, 200);
    assert.equal(published.body.status, 'published');

    const search = await request('/api/events?city=lagos&sort=price');
    assert.equal(search.status, 200);
    assert.equal(search.body.events.length, 1);
    assert.equal(search.body.events[0].id, created.body.id);

    const detail = await request(`/api/events/${created.body.id}`);
    assert.equal(detail.status, 200);
    assert.equal(detail.body.tiers[0].id, tier.body.id);
  });

  it('declined payment leaves a booking pending, then successful payment marks it paid once', async () => {
    const created = await request('/api/events', {
      method: 'POST',
      userId: 'organizer-2',
      body: {
        title: 'Abuja Jazz',
        city: 'Abuja',
        startsAt: '2026-12-12T18:00:00Z',
      },
    });
    const tier = await request(`/api/events/${created.body.id}/tiers`, {
      method: 'POST',
      userId: 'organizer-2',
      body: { name: 'General', priceCents: 2500, capacity: 3 },
    });
    await request(`/api/events/${created.body.id}/publish`, {
      method: 'POST',
      userId: 'organizer-2',
    });

    const booked = await request('/api/bookings', {
      method: 'POST',
      userId: 'attendee-1',
      body: { tierId: tier.body.id, quantity: 1 },
    });
    assert.equal(booked.status, 201);
    assert.equal(booked.body.status, 'pending');

    const declined = await request(`/api/bookings/${booked.body.reference}/pay`, {
      method: 'POST',
      userId: 'attendee-1',
      body: { paymentToken: 'tok_declined' },
    });
    assert.equal(declined.status, 402);
    assert.equal(declined.body.error.code, 'PAYMENT_DECLINED');

    const unchanged = await request(`/api/bookings/${booked.body.reference}`, {
      userId: 'attendee-1',
    });
    assert.equal(unchanged.body.status, 'pending');

    const paid = await request(`/api/bookings/${booked.body.reference}/pay`, {
      method: 'POST',
      userId: 'attendee-1',
      body: { paymentToken: 'tok_success' },
    });
    assert.equal(paid.status, 200);
    assert.equal(paid.body.status, 'paid');

    const repeat = await request(`/api/bookings/${booked.body.reference}/pay`, {
      method: 'POST',
      userId: 'attendee-1',
      body: { paymentToken: 'tok_success' },
    });
    assert.equal(repeat.status, 409);
    assert.equal(repeat.body.error.code, 'INVALID_TRANSITION');

    const stranger = await request(`/api/bookings/${booked.body.reference}/pay`, {
      method: 'POST',
      userId: 'attendee-2',
      body: { paymentToken: 'tok_success' },
    });
    assert.equal(stranger.status, 403);
    assert.equal(stranger.body.error.code, 'FORBIDDEN');
  });

  it('cancels pending bookings and rejects missing identity or invalid input', async () => {
    const unauthenticated = await request('/api/events', {
      method: 'POST',
      body: { title: 'No user', city: 'Lagos', startsAt: '2026-12-10' },
    });
    assert.equal(unauthenticated.status, 401);
    assert.equal(unauthenticated.body.error.code, 'UNAUTHENTICATED');

    const invalidSearch = await request('/api/events?sort=unknown');
    assert.equal(invalidSearch.status, 400);
    assert.equal(invalidSearch.body.error.code, 'VALIDATION');

    const created = await request('/api/events', {
      method: 'POST',
      userId: 'organizer-3',
      body: {
        title: 'Cancel Demo',
        city: 'Lagos',
        startsAt: '2026-12-10T12:00:00Z',
      },
    });
    const tier = await request(`/api/events/${created.body.id}/tiers`, {
      method: 'POST',
      userId: 'organizer-3',
      body: { name: 'General', priceCents: 100, capacity: 1 },
    });
    await request(`/api/events/${created.body.id}/publish`, {
      method: 'POST',
      userId: 'organizer-3',
    });
    const booking = await request('/api/bookings', {
      method: 'POST',
      userId: 'attendee-3',
      body: { tierId: tier.body.id, quantity: 1 },
    });
    const cancelled = await request(`/api/bookings/${booking.body.reference}/cancel`, {
      method: 'POST',
      userId: 'attendee-3',
    });
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.body.status, 'cancelled');

    const secondCancel = await request(`/api/bookings/${booking.body.reference}/cancel`, {
      method: 'POST',
      userId: 'attendee-3',
    });
    assert.equal(secondCancel.status, 409);
    assert.equal(secondCancel.body.error.code, 'INVALID_STATE');
  });
});
