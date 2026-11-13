import { openDatabase } from '../src/db/connection.js';
import { DomainError } from '../src/domain/errors.js';
import { newId, newReference } from '../src/domain/ids.js';
import { createMockPaymentGateway } from '../src/lib/mockPaymentGateway.js';
import { createSqliteRepository } from '../src/repositories/sqlite.js';
import { createBookingService } from '../src/services/bookingService.js';
import { createEventService } from '../src/services/eventService.js';

const ATTENDEES = 50;

async function setup() {
  const db = openDatabase();
  const repository = createSqliteRepository({ db });
  const events = createEventService(repository);
  const bookings = createBookingService(repository, createMockPaymentGateway());
  const event = await events.createEvent('demo-organizer', {
    title: 'Last Seat Demo',
    city: 'Lagos',
    startsAt: '2026-12-05T17:00:00Z',
  });
  const tier = await events.addTier('demo-organizer', event.id, {
    name: 'General',
    priceCents: 500000,
    capacity: 1,
  });
  await events.publishEvent('demo-organizer', event.id);
  return { db, repository, bookings, tier };
}

async function showBuild4Behavior() {
  const { db, repository, tier } = await setup();
  const snapshots = await Promise.all(
    Array.from({ length: ATTENDEES }, () => repository.getTier(tier.id)),
  );
  const ensureUser = db.prepare('INSERT OR IGNORE INTO users (id) VALUES (?)');
  const updateTier = db.prepare('UPDATE ticket_tiers SET sold = ? WHERE id = ?');
  const insertBooking = db.prepare(
    `INSERT INTO bookings
      (id, reference, user_id, event_id, tier_id, quantity, amount_cents, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  for (let index = 0; index < snapshots.length; index += 1) {
    const snapshot = snapshots[index];
    if (snapshot.capacity - snapshot.sold < 1) continue;

    const userId = `legacy-attendee-${index}`;
    ensureUser.run(userId);
    updateTier.run(snapshot.sold + 1, tier.id);
    insertBooking.run(
      newId(),
      newReference(),
      userId,
      snapshot.eventId,
      tier.id,
      1,
      snapshot.priceCents,
      'pending',
      new Date().toISOString(),
    );
  }

  const succeeded = db.prepare(
    'SELECT COUNT(*) AS count FROM bookings WHERE tier_id = ?',
  ).get(tier.id).count;
  const sold = (await repository.getTier(tier.id)).sold;
  console.log('\nBefore: read/check/write without atomic reservation');
  console.log(`  seats available before: 1`);
  console.log(`  booking requests accepted: ${succeeded}`);
  console.log(`  seats recorded as sold: ${sold}`);
  console.log(`  booking claims for the seat: ${succeeded}`);

  repository.close();
}

async function showBuild5Behavior() {
  const { db, repository, bookings, tier } = await setup();
  const results = await Promise.all(
    Array.from({ length: ATTENDEES }, async (_, index) => {
      try {
        return {
          status: 'fulfilled',
          value: await bookings.book(`attendee-${index}`, { tierId: tier.id, quantity: 1 }),
        };
      } catch (reason) {
        return { status: 'rejected', reason };
      }
    }),
  );
  const succeeded = results.filter((result) => result.status === 'fulfilled').length;
  const soldOut = results.filter(
    (result) =>
      result.status === 'rejected'
      && result.reason instanceof DomainError
      && result.reason.code === 'SOLD_OUT',
  ).length;
  const otherFailures = results.length - succeeded - soldOut;
  const tierAfter = await repository.getTier(tier.id);
  const bookingsSaved = db.prepare(
    'SELECT COUNT(*) AS count FROM bookings WHERE tier_id = ?',
  ).get(tier.id).count;

  console.log('\nAfter: one atomic conditional UPDATE');
  console.log(`  seats available before: 1`);
  console.log(`  bookings succeeded: ${succeeded}`);
  console.log(`  SOLD_OUT responses: ${soldOut}`);
  console.log(`  other failures: ${otherFailures}`);
  console.log(`  seats sold: ${tierAfter.sold} of ${tierAfter.capacity}`);
  console.log(`  bookings saved: ${bookingsSaved}`);

  repository.close();
  if (succeeded !== 1 || soldOut !== ATTENDEES - 1 || otherFailures !== 0) {
    throw new Error('The atomic booking demonstration did not produce the expected result');
  }
}

console.log(`${ATTENDEES} attendees try to book the same last seat.`);
await showBuild4Behavior();
await showBuild5Behavior();
