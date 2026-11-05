import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  addTier,
  bookTickets,
  createEvent,
  createStore,
  listEventSummaries,
  publishEvent,
  reallocateTierCapacity,
  seatsLeft,
  unpublishEvent,
} from '../src/domain/inventory.js';
import { filterEvents, searchEvents, sortEvents } from '../src/domain/eventSearch.js';
import { DomainError } from '../src/domain/errors.js';

const assertCode = (action, code) => {
  assert.throws(action, (error) => error instanceof DomainError && error.code === code);
};

function eventDetails(title, city, startsAt, venue = `${city} Hall`) {
  return { title, city, venue, startsAt, organizerId: 'organizer-1' };
}

describe('Build 2 event inventory', () => {
  let store;

  beforeEach(() => {
    store = createStore();
  });

  it('creates a draft event with a generated id', () => {
    const event = createEvent(store, eventDetails('Lagos Meetup', 'Lagos', '2026-12-05T17:00:00Z'));
    assert.ok(event.id);
    assert.equal(event.status, 'draft');
    assert.equal(listEventSummaries(store).length, 0);
    assert.equal(listEventSummaries(store, { publishedOnly: false }).length, 1);
  });

  it('rejects missing event text and invalid dates without saving an event', () => {
    assertCode(() => createEvent(store, eventDetails(' ', 'Lagos', '2026-12-05')), 'VALIDATION');
    assertCode(() => createEvent(store, eventDetails('Meetup', ' ', '2026-12-05')), 'VALIDATION');
    assertCode(() => createEvent(store, eventDetails('Meetup', 'Lagos', 'not-a-date')), 'VALIDATION');
    assert.equal(listEventSummaries(store, { publishedOnly: false }).length, 0);
  });

  it('adds tiers with zero sold and whole-cent prices', () => {
    const event = createEvent(store, eventDetails('Lagos Meetup', 'Lagos', '2026-12-05'));
    const tier = addTier(store, event.id, { name: 'General', priceCents: 500_000, capacity: 100 });
    assert.equal(tier.sold, 0);
    assert.equal(seatsLeft(tier), 100);
    assert.equal(tier.priceCents, 500_000);
  });

  it('rejects invalid prices, capacities, and unknown event IDs', () => {
    const event = createEvent(store, eventDetails('Lagos Meetup', 'Lagos', '2026-12-05'));
    for (const priceCents of [-1, 2.5, Number.MAX_SAFE_INTEGER + 1]) {
      assertCode(
        () => addTier(store, event.id, { name: 'Bad price', priceCents, capacity: 5 }),
        'VALIDATION',
      );
    }
    for (const capacity of [0, -1, 1.5]) {
      assertCode(
        () => addTier(store, event.id, { name: 'Bad capacity', priceCents: 100, capacity }),
        'VALIDATION',
      );
    }
    assertCode(
      () => addTier(store, 'missing-event', { name: 'General', priceCents: 100, capacity: 5 }),
      'NOT_FOUND',
    );
  });

  it('keeps tier allocations within the event hall capacity', () => {
    const event = createEvent(store, {
      ...eventDetails('Lagos Meetup', 'Lagos', '2026-12-05'),
      hallCapacity: 10,
    });
    addTier(store, event.id, {
      name: 'General',
      priceCents: 500_000,
      capacity: 6,
    });
    assertCode(
      () => addTier(store, event.id, { name: 'VIP', priceCents: 1_000_000, capacity: 5 }),
      'CAPACITY_EXCEEDED',
    );
    assert.equal(listEventSummaries(store, { publishedOnly: false })[0].seatsLeft, 6);
  });

  it('reallocates unbooked hall places between tiers, including packages', () => {
    const event = createEvent(store, {
      ...eventDetails('Lagos Meetup', 'Lagos', '2026-12-05'),
      hallCapacity: 20,
    });
    const general = addTier(store, event.id, {
      name: 'General',
      priceCents: 500_000,
      capacity: 10,
    });
    const vip = addTier(store, event.id, {
      name: 'VIP',
      priceCents: 1_000_000,
      capacity: 2,
    });
    const couple = addTier(store, event.id, {
      name: 'Couple Pass',
      priceCents: 900_000,
      capacity: 2,
      guestsPerUnit: 2,
    });
    const table = addTier(store, event.id, {
      name: 'Table for 4',
      priceCents: 2_000_000,
      capacity: 1,
      guestsPerUnit: 4,
    });
    bookTickets(store, general.id, 'booked-general', 3);

    reallocateTierCapacity(store, general.id, vip.id, 2);
    reallocateTierCapacity(store, vip.id, couple.id, 2);
    reallocateTierCapacity(store, general.id, table.id, 4);

    assert.equal(general.capacity, 4);
    assert.equal(general.sold, 3);
    assert.equal(seatsLeft(general), 1);
    assert.equal(vip.capacity, 2);
    assert.equal(couple.capacity, 3);
    assert.equal(table.capacity, 2);
    const allocatedPlaces = [general, vip, couple, table]
      .reduce((total, tier) => total + tier.capacity * tier.guestsPerUnit, 0);
    assert.equal(allocatedPlaces, event.hallCapacity);
  });

  it('reports available attendee places rather than package counts', () => {
    const event = createEvent(store, {
      ...eventDetails('Lagos Meetup', 'Lagos', '2026-12-05'),
      hallCapacity: 10,
    });
    addTier(store, event.id, {
      name: 'General',
      priceCents: 500_000,
      capacity: 2,
    });
    addTier(store, event.id, {
      name: 'Couple Pass',
      priceCents: 900_000,
      capacity: 2,
      guestsPerUnit: 2,
    });
    assert.equal(
      listEventSummaries(store, { publishedOnly: false })[0].seatsLeft,
      6,
    );
  });

  it('rejects invalid, incompatible, cross-event, and already-booked reallocations', () => {
    const event = createEvent(store, {
      ...eventDetails('Lagos Meetup', 'Lagos', '2026-12-05'),
      hallCapacity: 20,
    });
    const general = addTier(store, event.id, {
      name: 'General',
      priceCents: 500_000,
      capacity: 5,
    });
    const couple = addTier(store, event.id, {
      name: 'Couple Pass',
      priceCents: 900_000,
      capacity: 2,
      guestsPerUnit: 2,
    });
    const otherEvent = createEvent(store, {
      ...eventDetails('Other event', 'Abuja', '2026-12-06'),
      hallCapacity: 10,
    });
    const otherTier = addTier(store, otherEvent.id, {
      name: 'General',
      priceCents: 500_000,
      capacity: 5,
    });

    bookTickets(store, general.id, 'attendee-1', 4);
    assertCode(() => reallocateTierCapacity(store, general.id, couple.id, 1), 'VALIDATION');
    assertCode(() => reallocateTierCapacity(store, general.id, couple.id, 2), 'CAPACITY_EXCEEDED');
    assertCode(() => reallocateTierCapacity(store, general.id, otherTier.id, 1), 'VALIDATION');
    assertCode(() => reallocateTierCapacity(store, general.id, couple.id, 0), 'VALIDATION');
    assert.equal(general.capacity, 5);
    assert.equal(couple.capacity, 2);
  });

  it('publishes tiered events, hides drafts, and allows unpublishing', () => {
    const event = createEvent(store, eventDetails('Lagos Meetup', 'Lagos', '2026-12-05'));
    addTier(store, event.id, { name: 'General', priceCents: 500_000, capacity: 10 });
    addTier(store, event.id, { name: 'VIP', priceCents: 1_000_000, capacity: 5 });
    assert.equal(publishEvent(store, event.id).status, 'published');
    assert.equal(listEventSummaries(store).length, 1);
    assert.equal(listEventSummaries(store)[0].minPriceCents, 500_000);
    assert.equal(listEventSummaries(store)[0].seatsLeft, 15);
    assert.equal(unpublishEvent(store, event.id).status, 'draft');
    assert.equal(listEventSummaries(store).length, 0);
    assert.equal(listEventSummaries(store, { publishedOnly: false }).length, 1);
  });

  it('rejects publishing an event without tiers or invalid state transitions', () => {
    const event = createEvent(store, eventDetails('Empty event', 'Lagos', '2026-12-05'));
    assertCode(() => publishEvent(store, event.id), 'INVALID_STATE');
    addTier(store, event.id, { name: 'General', priceCents: 500_000, capacity: 10 });
    publishEvent(store, event.id);
    assertCode(() => publishEvent(store, event.id), 'INVALID_STATE');
    unpublishEvent(store, event.id);
    assertCode(() => unpublishEvent(store, event.id), 'INVALID_STATE');
  });
});

describe('Build 2 event search and sorting', () => {
  const summaries = [
    {
      id: 'jazz',
      title: 'Jazz Night',
      city: 'Lagos',
      venue: 'Island Hall',
      startsAt: '2026-12-10T19:00:00.000Z',
      minPriceCents: 300_000,
      seatsLeft: 50,
    },
    {
      id: 'tech',
      title: 'Tech Summit',
      city: 'Abuja',
      venue: 'Abuja Hall',
      startsAt: '2026-12-05T09:00:00.000Z',
      minPriceCents: 1_000_000,
      seatsLeft: 100,
    },
    {
      id: 'food',
      title: 'Food Fair',
      city: 'Lagos',
      venue: 'City Park',
      startsAt: '2026-12-05T12:00:00.000Z',
      minPriceCents: 0,
      seatsLeft: 500,
    },
    {
      id: 'sold',
      title: 'Sold Out Gig',
      city: 'Ibadan',
      venue: 'Ibadan Hall',
      startsAt: '2026-12-20T20:00:00.000Z',
      minPriceCents: 500_000,
      seatsLeft: 0,
    },
    {
      id: 'no-tiers',
      title: 'Unpriced Event',
      city: 'Lagos',
      venue: 'Open Ground',
      startsAt: '2026-12-06T10:00:00.000Z',
      minPriceCents: null,
      seatsLeft: 0,
    },
  ];

  it('filters text in titles and venues without case sensitivity', () => {
    assert.deepEqual(filterEvents(summaries, { q: 'JAZZ' }).map((event) => event.id), ['jazz']);
    assert.deepEqual(filterEvents(summaries, { q: 'ibadan hall' }).map((event) => event.id), ['sold']);
  });

  it('filters by city without case sensitivity', () => {
    assert.deepEqual(
      filterEvents(summaries, { city: 'lagos' }).map((event) => event.id),
      ['jazz', 'food', 'no-tiers'],
    );
  });

  it('filters inclusively by date and includes the full date-only end day', () => {
    assert.deepEqual(
      filterEvents(summaries, { from: '2026-12-05', to: '2026-12-05' }).map((event) => event.id),
      ['tech', 'food'],
    );
  });

  it('filters by cheapest whole-cent price, including free events', () => {
    assert.deepEqual(
      filterEvents(summaries, { maxPriceCents: 300_000 }).map((event) => event.id),
      ['jazz', 'food'],
    );
    assert.deepEqual(
      filterEvents(summaries, { maxPriceCents: 0 }).map((event) => event.id),
      ['food'],
    );
  });

  it('filters out sold-out events when availability is required', () => {
    assert.deepEqual(
      filterEvents(summaries, { onlyAvailable: true }).map((event) => event.id),
      ['jazz', 'tech', 'food'],
    );
  });

  it('rejects invalid dates, price amounts, and filter values with VALIDATION', () => {
    assertCode(() => filterEvents(summaries, { from: '2026-02-31' }), 'VALIDATION');
    assertCode(() => filterEvents(summaries, { to: 'not-a-date' }), 'VALIDATION');
    assertCode(() => filterEvents(summaries, { maxPriceCents: 1.5 }), 'VALIDATION');
    assertCode(() => filterEvents(summaries, { q: 42 }), 'VALIDATION');
    assertCode(() => filterEvents(summaries, { onlyAvailable: 'yes' }), 'VALIDATION');
  });

  it('sorts by date, cheapest price, and available inventory with deterministic ties', () => {
    assert.deepEqual(sortEvents(summaries).map((event) => event.id), [
      'tech', 'food', 'no-tiers', 'jazz', 'sold',
    ]);
    assert.deepEqual(sortEvents(summaries, 'price').map((event) => event.id), [
      'food', 'jazz', 'sold', 'tech', 'no-tiers',
    ]);
    assert.deepEqual(sortEvents(summaries, 'availability').map((event) => event.id), [
      'food', 'tech', 'jazz', 'sold', 'no-tiers',
    ]);
    assertCode(() => sortEvents(summaries, 'not-a-sort'), 'VALIDATION');
  });

  it('sorts equal dates stably by title and then ID', () => {
    const sameDate = [
      { ...summaries[0], id: 'z', title: 'Zulu' },
      { ...summaries[0], id: 'b', title: 'Alpha' },
      { ...summaries[0], id: 'a', title: 'Alpha' },
    ];
    assert.deepEqual(sortEvents(sameDate).map((event) => event.id), ['a', 'b', 'z']);
  });

  it('composes filtering and sorting without mutating the source array', () => {
    const original = [...summaries];
    const result = searchEvents(summaries, { city: 'Lagos' }, 'price');
    assert.deepEqual(result.map((event) => event.id), ['food', 'jazz', 'no-tiers']);
    assert.deepEqual(summaries, original);
    assert.notEqual(result, summaries);
    assert.deepEqual(searchEvents([], {}), []);
  });
});

describe('Build 2 booking capacity', () => {
  it('uses the injected store clock for deterministic booking timestamps', () => {
    const bookedAt = new Date('2026-11-02T15:00:00Z');
    const store = createStore({ now: () => bookedAt });
    const event = createEvent(store, eventDetails('Meetup', 'Lagos', '2026-12-05'));
    const tier = addTier(store, event.id, { name: 'General', priceCents: 500_000, capacity: 3 });
    const booking = bookTickets(store, tier.id, 'attendee-1', 1);
    assert.equal(booking.createdAt, bookedAt.toISOString());
  });

  it('rejects an injected clock that does not return a valid Date', () => {
    const store = createStore({ now: () => 'not-a-date' });
    const event = createEvent(store, eventDetails('Meetup', 'Lagos', '2026-12-05'));
    const tier = addTier(store, event.id, { name: 'General', priceCents: 500_000, capacity: 3 });
    assertCode(() => bookTickets(store, tier.id, 'attendee-1', 1), 'VALIDATION');
  });

  it('books within capacity in whole cents and leaves the expected seats', () => {
    const store = createStore();
    const event = createEvent(store, eventDetails('Meetup', 'Lagos', '2026-12-05'));
    const tier = addTier(store, event.id, { name: 'General', priceCents: 500_000, capacity: 3 });
    publishEvent(store, event.id);
    const booking = bookTickets(store, tier.id, 'attendee-1', 2);
    assert.equal(booking.status, 'pending');
    assert.equal(booking.amountCents, 1_000_000);
    assert.equal(seatsLeft(tier), 1);
  });

  it('rejects over-capacity and invalid-quantity bookings without changing inventory', () => {
    const store = createStore();
    const event = createEvent(store, eventDetails('Meetup', 'Lagos', '2026-12-05'));
    const tier = addTier(store, event.id, { name: 'General', priceCents: 500_000, capacity: 3 });
    publishEvent(store, event.id);
    bookTickets(store, tier.id, 'attendee-1', 2);
    assertCode(() => bookTickets(store, tier.id, 'attendee-2', 2), 'SOLD_OUT');
    assert.equal(seatsLeft(tier), 1);
    for (const quantity of [0, -1, 1.5, 11]) {
      assertCode(() => bookTickets(store, tier.id, 'attendee-2', quantity), 'VALIDATION');
      assert.equal(seatsLeft(tier), 1);
    }
  });
});
