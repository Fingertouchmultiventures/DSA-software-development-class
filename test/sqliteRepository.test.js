import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { openDatabase } from '../src/db/connection.js';
import { createMockPaymentGateway } from '../src/lib/mockPaymentGateway.js';
import { createSqliteRepository } from '../src/repositories/sqlite.js';
import { createBookingService } from '../src/services/bookingService.js';
import { createEventService } from '../src/services/eventService.js';
import { startServer } from '../src/server.js';

function createServices(repository) {
  return {
    events: createEventService(repository),
    bookings: createBookingService(repository, createMockPaymentGateway()),
  };
}

async function createPublishedTier(events, tierDetails = {}) {
  const event = await events.createEvent('organizer-1', {
    title: 'Lagos Tech Meetup',
    city: 'Lagos',
    startsAt: '2026-12-05T17:00:00Z',
  });
  const tier = await events.addTier('organizer-1', event.id, {
    name: 'General',
    priceCents: 500000,
    capacity: 5,
    ...tierDetails,
  });
  await events.publishEvent('organizer-1', event.id);
  return { event, tier };
}

async function listen(server) {
  if (!server.listening) {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.once('listening', resolve);
    });
  }
  return `http://127.0.0.1:${server.address().port}`;
}

async function close(server) {
  if (!server.listening) return;
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

describe('SQLite repository', () => {
  it('matches the in-memory repository record shapes and supports ticket packages', async () => {
    const repository = createSqliteRepository();
    try {
      const { events, bookings } = createServices(repository);
      const { event, tier } = await createPublishedTier(events, {
        capacity: 2,
        guestsPerUnit: 2,
      });
      const booking = await bookings.book('attendee-1', { tierId: tier.id, quantity: 1 });

      assert.deepEqual(await repository.getEvent(event.id), {
        ...event,
        status: 'published',
        tierIds: [tier.id],
      });
      assert.equal(tier.guestsPerUnit, 2);
      assert.equal((await repository.listEvents())[0].seatsLeft, 2);
      assert.deepEqual(await repository.getBooking(booking.reference), booking);
      assert.equal(await repository.getTier('missing'), undefined);
      assert.equal(await repository.listTiersForEvent('missing'), undefined);
    } finally {
      repository.close();
    }
  });

  it('preserves data when the server closes and restarts', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'ticketing-server-'));
    const databasePath = join(directory, 'ticketing.db');
    let server;
    try {
      server = startServer(0, { databasePath });
      const firstUrl = await listen(server);
      const createdResponse = await fetch(`${firstUrl}/api/events`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-user-id': 'organizer-1',
        },
        body: JSON.stringify({
          title: 'Persistent Event',
          city: 'Lagos',
          startsAt: '2026-12-05T17:00:00Z',
        }),
      });
      const created = await createdResponse.json();
      assert.equal(createdResponse.status, 201);

      const tierResponse = await fetch(`${firstUrl}/api/events/${created.id}/tiers`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-user-id': 'organizer-1',
        },
        body: JSON.stringify({ name: 'General', priceCents: 1000, capacity: 3 }),
      });
      assert.equal(tierResponse.status, 201);
      await close(server);
      server = undefined;

      server = startServer(0, { databasePath });
      const secondUrl = await listen(server);
      const response = await fetch(`${secondUrl}/api/events/${created.id}`, {
        headers: { 'x-user-id': 'organizer-1' },
      });
      const persistedEvent = await response.json();
      assert.equal(response.status, 200);
      assert.equal(persistedEvent.title, 'Persistent Event');
      assert.equal(persistedEvent.tiers[0].capacity, 3);
    } finally {
      if (server) await close(server);
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('uses placeholders so input text cannot become SQL', async () => {
    const repository = createSqliteRepository();
    try {
      const { events } = createServices(repository);
      const title = "Robert'); DROP TABLE events; --";
      const event = await events.createEvent('organizer-1', {
        title,
        city: 'Lagos',
        startsAt: '2026-12-05T17:00:00Z',
      });

      assert.equal((await repository.getEvent(event.id)).title, title);
      assert.equal(await repository.getEvent("' OR '1'='1"), undefined);
      assert.equal((await repository.listEvents({ publishedOnly: false })).length, 1);
    } finally {
      repository.close();
    }
  });

  it('enforces CHECK, FOREIGN KEY, and UNIQUE constraints in SQLite', () => {
    const database = openDatabase();
    try {
      database.prepare('INSERT INTO users (id) VALUES (?)').run('organizer-1');
      database.prepare(
        `INSERT INTO events
          (id, organizer_id, title, city, starts_at)
         VALUES (?, ?, ?, ?, ?)`,
      ).run('event-1', 'organizer-1', 'Event', 'Lagos', '2026-12-05T17:00:00Z');
      database.prepare(
        `INSERT INTO ticket_tiers
          (id, event_id, name, price_cents, capacity)
         VALUES (?, ?, ?, ?, ?)`,
      ).run('tier-1', 'event-1', 'General', 1000, 2);

      assert.throws(
        () => database.prepare('UPDATE ticket_tiers SET sold = ? WHERE id = ?').run(3, 'tier-1'),
        /CHECK constraint failed/,
      );
      assert.throws(
        () => database.prepare('UPDATE ticket_tiers SET sold = ? WHERE id = ?').run(-1, 'tier-1'),
        /CHECK constraint failed/,
      );
      assert.throws(
        () => database.prepare(
          `INSERT INTO ticket_tiers
            (id, event_id, name, price_cents, capacity)
           VALUES (?, ?, ?, ?, ?)`,
        ).run('tier-2', 'missing-event', 'General', 1000, 1),
        /FOREIGN KEY constraint failed/,
      );
      database.prepare('INSERT INTO users (id, email) VALUES (?, ?)').run('u1', 'same@example.test');
      assert.throws(
        () => database.prepare('INSERT INTO users (id, email) VALUES (?, ?)').run('u2', 'same@example.test'),
        /UNIQUE constraint failed/,
      );
    } finally {
      database.close();
    }
  });
});
