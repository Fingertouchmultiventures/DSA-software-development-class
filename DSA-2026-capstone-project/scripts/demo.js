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
  reallocateTierCapacity,
  seatsLeft,
} from '../src/domain/inventory.js';
import { DomainError } from '../src/domain/errors.js';

const HALL_CAPACITY = 150;
let demoClock = new Date('2026-11-01T09:00:00Z');
const store = createStore({ now: () => new Date(demoClock) });
const event = createEvent(store, {
  title: 'O2 Solution Hub',
  city: 'Lagos',
  venue: 'Cafe One',
  startsAt: '2026-12-05T10:00:00Z',
  organizerId: 'organizer-1',
  hallCapacity: HALL_CAPACITY,
});
const tiers = [
  { name: 'General', priceCents: 1500.00, capacity: 65 },
  { name: 'VIP', priceCents: 2500.00, capacity: 10 },
  { name: 'Red Carpet', priceCents: 5000.00, capacity: 5 },
  { name: 'Couple Pass', priceCents: 3000.00, capacity: 5, guestsPerUnit: 2 },
  { name: 'Emerald Table for 4', priceCents: 5500.00, capacity: 4, guestsPerUnit: 4 },
  { name: 'Sapphire Table for 6', priceCents: 7500.00, capacity: 4, guestsPerUnit: 6 },
  { name: 'Diamond Table for 10', priceCents: 12_000.00, capacity: 2, guestsPerUnit: 10 },
].map((details) => addTier(store, event.id, details));
const [
  general,
  vip,
  redCarpet,
  couplePass,
  tableForFour,
  tableForSix,
  tableForTen,
] = tiers;
publishEvent(store, event.id);
console.log(`Created "${event.title}" with ticket levels:`);
for (const item of tiers) {
  const guestCount = item.guestsPerUnit;
  const packageNote = guestCount ? ` (admits ${guestCount} people per unit)` : '';
  console.log(`- ${item.name}: ${item.priceCents} cents, ${item.capacity} available${packageNote}`);
}
console.log('Public listing:', listEventSummaries(store)[0]);
console.log();

function attempt(label, action) {
  try {
    const result = action();
    console.log(`OK    ${label}`);
    if (
      result
      && typeof result === 'object'
      && 'reference' in result
      && 'amountCents' in result
    ) {
      const tier = store.tiers.get(result.tierId);
      console.log('      Booking details:', {
        bookingId: result.id,
        reference: result.reference,
        userId: result.userId,
        tier: tier?.name ?? result.tierId,
        quantity: result.quantity,
        amountCents: result.amountCents,
        status: result.status,
        createdAt: result.createdAt,
      });
    }
    return result;
  } catch (error) {
    if (!(error instanceof DomainError)) throw error;
    console.log(`FAIL  ${label} -> ${error.code}: ${error.message}`);
    return undefined;
  }
}

function bookAt(isoTime, tierId, userId, quantity) {
  demoClock = new Date(isoTime);
  return bookTickets(store, tierId, userId, quantity);
}

const ada = attempt(
  'Ada books 2 General tickets',
  () => bookAt('2026-11-01T09:00:00Z', general.id, 'ada', 2),
);
attempt(
  'Bayo requests 8 General tickets (only 18 left)',
  () => bookAt('2026-11-01T09:30:00Z', general.id, 'bayo', 8),
);
const bayo = attempt(
  'Bayo books 7 General tickets',
  () => bookAt('2026-11-01T09:30:00Z', general.id, 'bayo', 7),
);
console.log(`\nGeneral tickets left: ${seatsLeft(general)}\n`);

attempt('Chidi joins the General waitlist for 2 tickets', () =>
  joinWaitlist(store, general.id, 'chidi', 2));
attempt('Dayo joins the General waitlist for 1 ticket', () =>
  joinWaitlist(store, general.id, 'dayo', 1));

console.log(`\nLooking up Ada's booking by reference ${ada.reference}:`);
console.log(findBookingByReference(store, ada.reference));

console.log('\nA booking is cancelled later:');
attempt('Bayo cancels 2 General booking', () => cancelBooking(store, bayo.reference));
console.log(`General tickets left: ${seatsLeft(general)}`);

const next = offerNextOnWaitlist(store, general.id);
console.log('Next person in line:', next?.userId ?? 'offer available');
if (next) {
  attempt(`Chidi accepts the offer and books ${next.quantity} General tickets`, () =>
    bookAt('2026-11-02T14:00:00Z', general.id, next.userId, next.quantity));
}

console.log('\nAdditional General bookings:');
for (const [name, bookedAt] of [
  ['Chika', '2026-11-02T15:00:00Z'],
  ['Dara', '2026-11-02T15:00:00Z'],
  ['Emeka', '2026-11-02T17:30:00Z'],
  ['Fatima', '2026-11-03T09:00:00Z'],
  ['Gideon', '2026-11-03T09:00:00Z'],
]) {
  attempt(`${name} books 1 General ticket`, () =>
    bookAt(bookedAt, general.id, name.toLowerCase(), 1));
}

console.log('\nVIP bookings:');
for (const [name, bookedAt] of [
  ['Hon. Grace', '2026-11-03T10:00:00Z'],
  ['Comr. Tunde', '2026-11-03T10:00:00Z'],
  ['Hon.Amina', '2026-11-04T12:00:00Z'],
]) {
  attempt(`${name} books 1 VIP ticket`, () =>
    bookAt(bookedAt, vip.id, name.toLowerCase(), 1));
}

console.log('\nCouple Pass bookings (one pass admits Mr. and Mrs.):');
for (const [couple, bookedAt] of [
  ['Mr. and Mrs. Adebayo', '2026-11-03T12:00:00Z'],
  ['Mr. and Mrs. Okafor', '2026-11-03T12:00:00Z'],
  ['Mr. and Mrs. Bello', '2026-11-04T13:00:00Z'],
  ['Mr. and Mrs. Mensah', '2026-11-04T14:30:00Z'],
]) {
  attempt(`${couple} books 1 Couple Pass`, () =>
    bookAt(bookedAt, couplePass.id, couple.toLowerCase(), 1));
}

console.log('\nRed Carpet bookings:');
for (const [name, bookedAt] of [
  ['Kemi', '2026-11-04T16:00:00Z'],
  ['Femi', '2026-11-05T08:30:00Z'],
]) {
  attempt(`${name} books 1 Red Carpet ticket`, () =>
    bookAt(bookedAt, redCarpet.id, name.toLowerCase(), 1));
}

console.log('\nTable bookings:');
for (const [tableTier, organizer, bookedAt] of [
  [tableForFour, 'Mr. and Mrs. Ibrahim', '2026-11-05T10:00:00Z'],
  [tableForSix, 'Mr. and Mrs. Nwosu', '2026-11-05T10:00:00Z'],
  [tableForTen, 'Mr. and Mrs. Okeke', '2026-11-05T11:30:00Z'],
]) {
  attempt(`${organizer} books 1 ${tableTier.name}`, () =>
    bookAt(bookedAt, tableTier.id, organizer.toLowerCase(), 1));
}

console.log('\nInventory summary (passes and tables count as one sellable unit):');
let totalCapacity = 0;
let totalBooked = 0;
let totalWaitlistEntries = 0;
let totalRemaining = 0;
let ticketedAttendeeCapacity = 0;
let bookedAttendees = 0;
let ticketedAttendeeSpotsLeft = 0;

for (const tier of tiers) {
  const waitlist = store.waitlists.get(tier.id);
  const remaining = seatsLeft(tier);
  const peoplePerUnit = tier.guestsPerUnit;
  totalCapacity += tier.capacity;
  totalBooked += tier.sold;
  totalWaitlistEntries += waitlist.size;
  totalRemaining += remaining;
  ticketedAttendeeCapacity += tier.capacity * peoplePerUnit;
  bookedAttendees += tier.sold * peoplePerUnit;
  ticketedAttendeeSpotsLeft += remaining * peoplePerUnit;
  console.log(
    `${tier.name}: total ${tier.capacity}, booked ${tier.sold}, `
    + `waitlist ${waitlist.size}, left ${remaining}`,
  );
}

console.log(
  `TOTAL sellable units: total ${totalCapacity}, booked ${totalBooked}, `
  + `waitlist entries ${totalWaitlistEntries}, left ${totalRemaining}`,
);
console.log(
  `TICKETED attendee places: total ${ticketedAttendeeCapacity}, `
  + `booked ${bookedAttendees}, left ${ticketedAttendeeSpotsLeft}`,
);
const unallocatedHallCapacity = HALL_CAPACITY - ticketedAttendeeCapacity;
const hallPlacesLeft = HALL_CAPACITY - bookedAttendees;
if (
  unallocatedHallCapacity < 0
  || hallPlacesLeft < 0
  || bookedAttendees + ticketedAttendeeSpotsLeft !== ticketedAttendeeCapacity
) {
  throw new Error('Ticket inventory and hall capacity totals are inconsistent');
}
console.log(
  `HALL attendee places: total ${HALL_CAPACITY}, booked ${bookedAttendees}, `
  + `left ${hallPlacesLeft}`,
);
console.log(`Hall places not allocated to ticket tiers: ${unallocatedHallCapacity}`);
console.log(
  `Organizer reallocation example: move 2 unbooked General places to VIP with `
  + `reallocateTierCapacity(store, '${general.id}', '${vip.id}', 2).`,
);
