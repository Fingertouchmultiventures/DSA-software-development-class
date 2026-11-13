import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { openDatabase } from '../src/db/connection.js';
import { DomainError } from '../src/domain/errors.js';
import { createMockPaymentGateway } from '../src/lib/mockPaymentGateway.js';
import { createSqliteRepository } from '../src/repositories/sqlite.js';
import { createBookingService } from '../src/services/bookingService.js';
import { createEventService } from '../src/services/eventService.js';

const ATTENDEES = 50;

async function setupLastSeat(database) {
  const repository = createSqliteRepository({ db: database });
  const events = createEventService(repository);
  const bookings = createBookingService(repository, createMockPaymentGateway());
  const event = await events.createEvent('organizer-1', {
    title: 'Last Seat Event',
    city: 'Lagos',
    startsAt: '2026-12-05T17:00:00Z',
  });
  const tier = await events.addTier('organizer-1', event.id, {
    name: 'General',
    priceCents: 500000,
    capacity: 1,
  });
  await events.publishEvent('organizer-1', event.id);
  return { repository, bookings, tier };
}

async function race(bookings, tierId) {
  return Promise.allSettled(
    Array.from({ length: ATTENDEES }, (_, index) =>
      bookings.book(`attendee-${index}`, { tierId, quantity: 1 }),
    ),
  );
}

describe('S08: atomic last-seat booking', () => {
  it('lets exactly one of 50 simultaneous requests book the last seat', async () => {
    const database = openDatabase();
    const { repository, bookings, tier } = await setupLastSeat(database);
    try {
      const results = await race(bookings, tier.id);
      const successes = results.filter((result) => result.status === 'fulfilled');
      const failures = results.filter((result) => result.status === 'rejected');

      assert.equal(successes.length, 1);
      assert.equal(failures.length, 49);
      for (const result of failures) {
        assert.ok(result.reason instanceof DomainError);
        assert.equal(result.reason.code, 'SOLD_OUT');
      }

      const savedTier = await repository.getTier(tier.id);
      const savedBookings = await repository.listBookings();
      assert.equal(savedTier.sold, 1);
      assert.equal(savedTier.sold, savedTier.capacity);
      assert.equal(savedBookings.filter((booking) => booking.tierId === tier.id).length, 1);
    } finally {
      repository.close();
    }
  });

  it('does not oversell when each request asks for multiple units', async () => {
    const database = openDatabase();
    const { repository, bookings, tier } = await setupLastSeat(database);
    try {
      const results = await Promise.allSettled(
        Array.from({ length: ATTENDEES }, (_, index) =>
          bookings.book(`attendee-${index}`, { tierId: tier.id, quantity: 2 }),
        ),
      );
      assert.equal(results.filter((result) => result.status === 'fulfilled').length, 0);
      assert.equal((await repository.getTier(tier.id)).sold, 0);
      assert.equal((await repository.listBookings()).length, 0);
    } finally {
      repository.close();
    }
  });
});
