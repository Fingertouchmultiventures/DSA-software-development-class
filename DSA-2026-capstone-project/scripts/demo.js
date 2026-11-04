import {
  addTier,
  bookTickets,
  cancelBooking,
  createEvent,
  createStore,
  findBookingByReference,
  joinWaitlist,
  listEventSummaries,
  offerNextOnWaitlist,
  publishEvent,
  seatsLeft,
} from '../src/domain/inventory.js';
import { DomainError } from '../src/domain/errors.js';

const store = createStore();
const event = createEvent(store, {
  title: 'O2 Solution Hub Demo Day',
  city: 'Lagos',
  venue: 'Cafe One',
  startsAt: '2026-12-05T17:00:00Z',
  organizerId: 'organizer-1',
});
const tiers = [
  { name: 'General', priceCents: 1500_000, capacity: 3 },
  { name: 'VIP', priceCents: 2500_000, capacity: 20 },
  { name: 'Red Carpet', priceCents: 5000_000, capacity: 10 },
  { name: 'Couple Pass', priceCents: 2700_000, capacity: 10 },
].map((details) => addTier(store, event.id, details));
const [tier] = tiers;
publishEvent(store, event.id);
console.log(`Created "${event.title}" with ticket levels:`);
for (const item of tiers) {
  const packageNote = item.name === 'Couple Pass' ? ' (admits two people per pass)' : '';
  console.log(`- ${item.name}: ${item.priceCents} cents, ${item.capacity} available${packageNote}`);
}
console.log('Public listing:', listEventSummaries(store)[0]);
console.log();

function attempt(label, action) {
  try {
    const result = action();
    console.log(`OK    ${label}`);
    return result;
  } catch (error) {
    if (!(error instanceof DomainError)) throw error;
    console.log(`FAIL  ${label} -> ${error.code}: ${error.message}`);
    return undefined;
  }
}

const ada = attempt('Ada books 2 tickets', () => bookTickets(store, tier.id, 'ada', 2));
attempt('Bayo books 2 tickets (only 1 left)', () => bookTickets(store, tier.id, 'bayo', 2));
attempt('Bayo books the last ticket', () => bookTickets(store, tier.id, 'bayo', 1));
console.log(`\nSeats left: ${seatsLeft(tier)}\n`);

attempt('Chidi joins the waitlist for 2 seats', () => joinWaitlist(store, tier.id, 'chidi', 2));
attempt('Dayo joins the waitlist for 1 seat', () => joinWaitlist(store, tier.id, 'dayo', 1));

console.log(`\nLooking up Ada's booking by reference ${ada.reference}:`);
console.log(findBookingByReference(store, ada.reference));

console.log();
attempt('Ada cancels', () => cancelBooking(store, ada.reference));
console.log(`Seats left: ${seatsLeft(tier)}`);

const next = offerNextOnWaitlist(store, tier.id);
console.log('Next person in line:', next?.userId ?? 'no offer available');
