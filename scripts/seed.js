import { DATABASE_PATH } from '../src/config.js';
import { createSqliteRepository } from '../src/repositories/sqlite.js';
import { createEventService } from '../src/services/eventService.js';

const ORGANIZER_ID = 'seed-organizer';
const SAMPLE_EVENTS = [
  {
    event: {
      title: 'Lagos Tech Meetup',
      city: 'Lagos',
      venue: 'Landmark Centre',
      startsAt: '2026-12-05T17:00:00Z',
    },
    tiers: [
      { name: 'General', priceCents: 500000, capacity: 100 },
      { name: 'VIP', priceCents: 1500000, capacity: 20 },
    ],
  },
  {
    event: {
      title: 'Abuja Design Summit',
      city: 'Abuja',
      venue: 'Transcorp Hilton',
      startsAt: '2027-01-16T09:00:00Z',
    },
    tiers: [{ name: 'Standard', priceCents: 1000000, capacity: 150 }],
  },
  {
    event: {
      title: 'Afrobeats Night',
      city: 'Lagos',
      venue: 'Eko Hotel',
      startsAt: '2026-12-19T20:00:00Z',
    },
    tiers: [
      { name: 'Regular', priceCents: 800000, capacity: 300 },
      { name: 'Couple Pass', priceCents: 1400000, capacity: 25, guestsPerUnit: 2 },
    ],
  },
];

const repository = createSqliteRepository({ path: DATABASE_PATH });
try {
  const existingEvents = await repository.listEvents({ publishedOnly: false });
  if (existingEvents.length > 0) {
    console.log(`${DATABASE_PATH} already contains events; leaving existing data unchanged.`);
  } else {
    const events = createEventService(repository);
    for (const { event, tiers } of SAMPLE_EVENTS) {
      const created = await events.createEvent(ORGANIZER_ID, event);
      for (const tier of tiers) {
        await events.addTier(ORGANIZER_ID, created.id, tier);
      }
      await events.publishEvent(ORGANIZER_ID, created.id);
      console.log(`Added ${created.title} (${created.id})`);
    }
    console.log(`Seeded ${SAMPLE_EVENTS.length} events into ${DATABASE_PATH}`);
  }
} finally {
  repository.close();
}
