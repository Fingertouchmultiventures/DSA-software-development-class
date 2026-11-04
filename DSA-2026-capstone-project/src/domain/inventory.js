import { newId, newReference } from './ids.js';
import { DomainError } from './errors.js';
import { Queue } from './waitlistQueue.js';

export const MAX_TICKETS_PER_BOOKING = 10;

const HOLDS_SEATS = new Set(['pending', 'paid']);

export function createStore() {
  return {
    events: new Map(),
    tiers: new Map(),
    bookings: new Map(),
    bookingsByReference: new Map(),
    waitlists: new Map(),
  };
}

function requireStore(store) {
  if (
    !store
    || !(store.events instanceof Map)
    || !(store.tiers instanceof Map)
    || !(store.bookings instanceof Map)
    || !(store.bookingsByReference instanceof Map)
    || !(store.waitlists instanceof Map)
  ) {
    throw new DomainError('VALIDATION', 'store must be created with createStore()');
  }
}

function requireRecord(value, field) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new DomainError('VALIDATION', `${field} must be an object`);
  }
}

function requireText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new DomainError('VALIDATION', `${field} is required`);
  }
  return value.trim();
}

function requireWholeNumber(value, field, min) {
  if (!Number.isSafeInteger(value) || value < min) {
    throw new DomainError('VALIDATION', `${field} must be a whole number of at least ${min}`);
  }
  return value;
}

function requireQuantity(quantity) {
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_TICKETS_PER_BOOKING) {
    throw new DomainError('VALIDATION', `quantity must be between 1 and ${MAX_TICKETS_PER_BOOKING}`);
  }
}

function getTier(store, tierId) {
  const tier = store.tiers.get(tierId);
  if (!tier) throw new DomainError('NOT_FOUND', 'Ticket tier not found');
  return tier;
}

function getEvent(store, eventId) {
  const event = store.events.get(eventId);
  if (!event) throw new DomainError('NOT_FOUND', 'Event not found');
  return event;
}

export function createEvent(store, details) {
  requireStore(store);
  requireRecord(details, 'event details');

  const title = requireText(details.title, 'Title');
  const city = requireText(details.city, 'City');
  const organizerId = requireText(details.organizerId, 'organizerId');
  const venue = details.venue ?? '';
  if (typeof venue !== 'string') {
    throw new DomainError('VALIDATION', 'Venue must be text');
  }
  const startsAt = details.startsAt;
  if (typeof startsAt !== 'string' || startsAt.trim() === '') {
    throw new DomainError('VALIDATION', 'startsAt must be a valid date');
  }
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) {
    throw new DomainError('VALIDATION', 'startsAt must be a valid date');
  }

  const event = {
    id: newId(),
    organizerId,
    title,
    city,
    venue: venue.trim(),
    startsAt: date.toISOString(),
    status: 'draft',
    tierIds: [],
  };
  store.events.set(event.id, event);
  return event;
}

export function publishEvent(store, eventId) {
  requireStore(store);
  requireText(eventId, 'eventId');
  const event = getEvent(store, eventId);
  if (event.status !== 'draft') {
    throw new DomainError('INVALID_STATE', 'Only draft events can be published');
  }
  if (event.tierIds.length === 0) {
    throw new DomainError('INVALID_STATE', 'An event needs at least one ticket tier before publishing');
  }
  event.status = 'published';
  return event;
}

export function unpublishEvent(store, eventId) {
  requireStore(store);
  requireText(eventId, 'eventId');
  const event = getEvent(store, eventId);
  if (event.status !== 'published') {
    throw new DomainError('INVALID_STATE', 'Only published events can be unpublished');
  }
  event.status = 'draft';
  return event;
}

export function addTier(store, eventId, details) {
  requireStore(store);
  requireText(eventId, 'eventId');
  requireRecord(details, 'tier details');
  const event = getEvent(store, eventId);
  const name = requireText(details.name, 'Tier name');
  const priceCents = requireWholeNumber(details.priceCents, 'priceCents', 0);
  const capacity = requireWholeNumber(details.capacity, 'capacity', 1);

  const tier = {
    id: newId(),
    eventId,
    name,
    priceCents,
    capacity,
    sold: 0,
  };
  store.tiers.set(tier.id, tier);
  store.waitlists.set(tier.id, new Queue());
  event.tierIds.push(tier.id);
  return tier;
}

export function seatsLeft(tier) {
  if (!tier || !Number.isSafeInteger(tier.capacity) || !Number.isSafeInteger(tier.sold)) {
    throw new DomainError('VALIDATION', 'tier must have whole-number capacity and sold counts');
  }
  return tier.capacity - tier.sold;
}

export function listEventSummaries(store, { publishedOnly = true } = {}) {
  requireStore(store);
  if (typeof publishedOnly !== 'boolean') {
    throw new DomainError('VALIDATION', 'publishedOnly must be a boolean');
  }

  const summaries = [];
  for (const event of store.events.values()) {
    if (publishedOnly && event.status !== 'published') continue;
    const tiers = event.tierIds.map((tierId) => getTier(store, tierId));
    let minPriceCents = null;
    let available = 0;
    for (const tier of tiers) {
      minPriceCents = minPriceCents === null
        ? tier.priceCents
        : Math.min(minPriceCents, tier.priceCents);
      available += seatsLeft(tier);
    }

    summaries.push({
      id: event.id,
      title: event.title,
      city: event.city,
      venue: event.venue,
      startsAt: event.startsAt,
      status: event.status,
      tierCount: tiers.length,
      minPriceCents,
      seatsLeft: available,
    });
  }
  return summaries;
}

export function bookTickets(store, tierId, userId, quantity) {
  requireStore(store);
  requireText(tierId, 'tierId');
  userId = requireText(userId, 'userId');
  requireQuantity(quantity);

  const tier = getTier(store, tierId);
  const left = seatsLeft(tier);
  if (left < quantity) {
    const message = left <= 0
      ? `${tier.name} is sold out`
      : `Only ${left} ticket(s) left in ${tier.name}`;
    throw new DomainError('SOLD_OUT', message, { seatsLeft: left });
  }

  const amountCents = tier.priceCents * quantity;
  if (!Number.isSafeInteger(amountCents)) {
    throw new DomainError('VALIDATION', 'booking total must be a whole number of safe cents');
  }

  let reference;
  do {
    reference = newReference();
  } while (store.bookingsByReference.has(reference));

  const booking = {
    id: newId(),
    reference,
    userId,
    tierId,
    quantity,
    amountCents,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  tier.sold += quantity;
  store.bookings.set(booking.id, booking);
  store.bookingsByReference.set(reference, booking);
  return booking;
}

export function findBookingByReference(store, reference) {
  requireStore(store);
  requireText(reference, 'reference');
  return store.bookingsByReference.get(reference);
}

export function cancelBooking(store, reference) {
  requireStore(store);
  requireText(reference, 'reference');
  const booking = findBookingByReference(store, reference);
  if (!booking) throw new DomainError('NOT_FOUND', 'Booking not found');
  if (!HOLDS_SEATS.has(booking.status)) {
    throw new DomainError('INVALID_STATE', `A ${booking.status} booking cannot be cancelled`);
  }

  const tier = getTier(store, booking.tierId);
  tier.sold -= booking.quantity;
  booking.status = 'cancelled';
  return booking;
}

export function joinWaitlist(store, tierId, userId, quantity) {
  requireStore(store);
  requireText(tierId, 'tierId');
  userId = requireText(userId, 'userId');
  requireQuantity(quantity);

  const tier = getTier(store, tierId);
  if (seatsLeft(tier) >= quantity) {
    throw new DomainError('NOT_SOLD_OUT', 'Seats are available, so book them instead');
  }
  const queue = store.waitlists.get(tierId);
  if (!(queue instanceof Queue)) {
    throw new DomainError('INVALID_STATE', 'Waitlist queue is missing for this tier');
  }
  queue.enqueue({ userId, quantity });
  return { position: queue.size };
}

export function offerNextOnWaitlist(store, tierId) {
  requireStore(store);
  requireText(tierId, 'tierId');
  const tier = getTier(store, tierId);
  const queue = store.waitlists.get(tierId);
  if (!(queue instanceof Queue)) {
    throw new DomainError('INVALID_STATE', 'Waitlist queue is missing for this tier');
  }

  const next = queue.peek();
  if (!next || seatsLeft(tier) < next.quantity) return undefined;
  return queue.dequeue();
}
