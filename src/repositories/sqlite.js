import { DomainError } from '../domain/errors.js';
import { newId, newReference } from '../domain/ids.js';
import {
  requireDate,
  requireQuantity,
  requireRecord,
  requireText,
  requireWholeNumber,
} from '../domain/validation.js';
import { openDatabase } from '../db/connection.js';

function toEvent(row, tierIds = []) {
  if (!row) return undefined;
  return {
    id: row.id,
    organizerId: row.organizer_id,
    title: row.title,
    city: row.city,
    venue: row.venue,
    startsAt: row.starts_at,
    hallCapacity: row.hall_capacity ?? undefined,
    status: row.status,
    tierIds,
  };
}

function toTier(row) {
  if (!row) return undefined;
  return {
    id: row.id,
    eventId: row.event_id,
    name: row.name,
    priceCents: row.price_cents,
    capacity: row.capacity,
    sold: row.sold,
    guestsPerUnit: row.guests_per_unit,
  };
}

function toBooking(row) {
  if (!row) return undefined;
  return {
    id: row.id,
    reference: row.reference,
    userId: row.user_id,
    tierId: row.tier_id,
    quantity: row.quantity,
    amountCents: row.amount_cents,
    status: row.status,
    createdAt: row.created_at,
  };
}

function seatsLeft(tier) {
  return tier.capacity - tier.sold;
}

function requireVenue(value) {
  if (typeof value !== 'string') {
    throw new DomainError('VALIDATION', 'Venue must be text');
  }
  return value.trim();
}

export function createSqliteRepository({
  path,
  db = openDatabase(path),
} = {}) {
  const sql = {
    ensureUser: db.prepare('INSERT OR IGNORE INTO users (id) VALUES (?)'),
    insertEvent: db.prepare(
      `INSERT INTO events
        (id, organizer_id, title, city, venue, starts_at, hall_capacity, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ),
    findEvent: db.prepare('SELECT * FROM events WHERE id = ?'),
    listEvents: db.prepare('SELECT * FROM events ORDER BY rowid'),
    insertTier: db.prepare(
      `INSERT INTO ticket_tiers
        (id, event_id, name, price_cents, capacity, sold, guests_per_unit)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ),
    findTier: db.prepare('SELECT * FROM ticket_tiers WHERE id = ?'),
    listTiersForEvent: db.prepare(
      'SELECT * FROM ticket_tiers WHERE event_id = ? ORDER BY rowid',
    ),
    publishEvent: db.prepare(
      `UPDATE events SET status = 'published'
       WHERE id = ? AND status = 'draft'`,
    ),
    unpublishEvent: db.prepare(
      `UPDATE events SET status = 'draft'
       WHERE id = ? AND status = 'published'`,
    ),
    reserveSeats: db.prepare(
      'UPDATE ticket_tiers SET sold = sold + ? WHERE id = ? AND sold + ? <= capacity',
    ),
    releaseSeats: db.prepare(
      'UPDATE ticket_tiers SET sold = sold - ? WHERE id = ? AND sold >= ?',
    ),
    insertBooking: db.prepare(
      `INSERT INTO bookings
        (id, reference, user_id, event_id, tier_id, quantity, amount_cents, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ),
    findBooking: db.prepare('SELECT * FROM bookings WHERE reference = ?'),
    listBookings: db.prepare('SELECT * FROM bookings ORDER BY rowid'),
    cancelBooking: db.prepare(
      `UPDATE bookings SET status = 'cancelled'
       WHERE reference = ? AND status IN ('pending', 'paid')`,
    ),
    updateBookingStatus: db.prepare(
      'UPDATE bookings SET status = ? WHERE reference = ?',
    ),
  };

  function transaction(operation) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = operation();
      db.exec('COMMIT');
      return result;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  function eventById(id) {
    const row = sql.findEvent.get(id);
    if (!row) return undefined;
    const tierIds = sql.listTiersForEvent.all(id).map((tier) => tier.id);
    return toEvent(row, tierIds);
  }

  function tiersForEvent(eventId) {
    return sql.listTiersForEvent.all(eventId).map(toTier);
  }

  function bookingByReference(reference) {
    return toBooking(sql.findBooking.get(reference));
  }

  return {
    async createEvent(details) {
      requireRecord(details, 'event details');
      const title = requireText(details.title, 'Title');
      const city = requireText(details.city, 'City');
      const organizerId = requireText(details.organizerId, 'organizerId');
      const venue = requireVenue(details.venue ?? '');
      const startsAt = requireDate(details.startsAt, 'startsAt');
      const hallCapacity = details.hallCapacity === undefined
        ? null
        : requireWholeNumber(details.hallCapacity, 'hallCapacity', 1);
      const event = {
        id: newId(),
        organizerId,
        title,
        city,
        venue,
        startsAt,
        hallCapacity: hallCapacity ?? undefined,
        status: 'draft',
        tierIds: [],
      };

      transaction(() => {
        sql.ensureUser.run(organizerId);
        sql.insertEvent.run(
          event.id,
          organizerId,
          title,
          city,
          venue,
          startsAt,
          hallCapacity,
          event.status,
        );
      });
      return event;
    },

    async getEvent(id) {
      requireText(id, 'eventId');
      return eventById(id);
    },

    async listEvents({ publishedOnly = true } = {}) {
      if (typeof publishedOnly !== 'boolean') {
        throw new DomainError('VALIDATION', 'publishedOnly must be a boolean');
      }

      return sql.listEvents.all()
        .map((row) => {
          const event = toEvent(row);
          const tiers = tiersForEvent(event.id);
          let minPriceCents = null;
          let available = 0;
          for (const tier of tiers) {
            minPriceCents = minPriceCents === null
              ? tier.priceCents
              : Math.min(minPriceCents, tier.priceCents);
            available += seatsLeft(tier) * tier.guestsPerUnit;
          }
          return {
            id: event.id,
            title: event.title,
            city: event.city,
            venue: event.venue,
            startsAt: event.startsAt,
            status: event.status,
            hallCapacity: event.hallCapacity,
            tierCount: tiers.length,
            minPriceCents,
            seatsLeft: available,
          };
        })
        .filter((event) => !publishedOnly || event.status === 'published');
    },

    async addTier(eventId, details) {
      requireText(eventId, 'eventId');
      requireRecord(details, 'tier details');
      const event = eventById(eventId);
      if (!event) throw new DomainError('NOT_FOUND', 'Event not found');
      if (event.status !== 'draft') {
        throw new DomainError('INVALID_STATE', 'Ticket tiers can only be added to draft events');
      }

      const name = requireText(details.name, 'Tier name');
      const priceCents = requireWholeNumber(details.priceCents, 'priceCents', 0);
      const capacity = requireWholeNumber(details.capacity, 'capacity', 1);
      const guestsPerUnit = details.guestsPerUnit === undefined
        ? 1
        : requireWholeNumber(details.guestsPerUnit, 'guestsPerUnit', 1);
      const tiers = tiersForEvent(eventId);
      const alreadyAllocated = tiers.reduce(
        (total, tier) => total + tier.capacity * tier.guestsPerUnit,
        0,
      );
      const requestedPlaces = capacity * guestsPerUnit;
      if (
        !Number.isSafeInteger(requestedPlaces)
        || !Number.isSafeInteger(alreadyAllocated + requestedPlaces)
      ) {
        throw new DomainError(
          'VALIDATION',
          'tier capacity in attendee places must be a safe whole number',
        );
      }
      if (
        event.hallCapacity !== undefined
        && alreadyAllocated + requestedPlaces > event.hallCapacity
      ) {
        throw new DomainError(
          'CAPACITY_EXCEEDED',
          `Ticket tiers cannot allocate more than the hall capacity of ${event.hallCapacity}`,
        );
      }

      const tier = {
        id: newId(),
        eventId,
        name,
        priceCents,
        capacity,
        sold: 0,
        guestsPerUnit,
      };
      sql.insertTier.run(
        tier.id,
        eventId,
        name,
        priceCents,
        capacity,
        tier.sold,
        guestsPerUnit,
      );
      return tier;
    },

    async getTier(id) {
      requireText(id, 'tierId');
      return toTier(sql.findTier.get(id));
    },

    async listTiersForEvent(eventId) {
      requireText(eventId, 'eventId');
      if (!sql.findEvent.get(eventId)) return undefined;
      return tiersForEvent(eventId);
    },

    async publishEvent(id) {
      requireText(id, 'eventId');
      const event = eventById(id);
      if (!event) throw new DomainError('NOT_FOUND', 'Event not found');
      if (event.status !== 'draft') {
        throw new DomainError('INVALID_STATE', 'Only draft events can be published');
      }
      if (event.tierIds.length === 0) {
        throw new DomainError(
          'INVALID_STATE',
          'An event needs at least one ticket tier before publishing',
        );
      }
      if (sql.publishEvent.run(id).changes !== 1) {
        throw new DomainError('INVALID_STATE', 'Only draft events can be published');
      }
      return eventById(id);
    },

    async unpublishEvent(id) {
      requireText(id, 'eventId');
      const event = eventById(id);
      if (!event) throw new DomainError('NOT_FOUND', 'Event not found');
      if (event.status !== 'published') {
        throw new DomainError('INVALID_STATE', 'Only published events can be unpublished');
      }
      if (sql.unpublishEvent.run(id).changes !== 1) {
        throw new DomainError('INVALID_STATE', 'Only published events can be unpublished');
      }
      return eventById(id);
    },

    async createBooking(tierId, userId, quantity) {
      requireText(tierId, 'tierId');
      userId = requireText(userId, 'userId');
      requireQuantity(quantity);

      const tier = toTier(sql.findTier.get(tierId));
      if (!tier) throw new DomainError('NOT_FOUND', 'Ticket tier not found');
      const amountCents = tier.priceCents * quantity;
      if (!Number.isSafeInteger(amountCents)) {
        throw new DomainError(
          'VALIDATION',
          'booking total must be a whole number of safe cents',
        );
      }
      const createdAt = new Date().toISOString();
      const eventRow = sql.findEvent.get(tier.eventId);
      if (!eventRow) throw new DomainError('NOT_FOUND', 'Event not found');

      const booking = {
        id: newId(),
        reference: newReference(),
        userId,
        tierId,
        quantity,
        amountCents,
        status: 'pending',
        createdAt,
      };

      return transaction(() => {
        sql.ensureUser.run(userId);
        const reservation = sql.reserveSeats.run(quantity, tierId, quantity);
        if (reservation.changes !== 1) {
          const currentTier = toTier(sql.findTier.get(tierId));
          if (!currentTier) throw new DomainError('NOT_FOUND', 'Ticket tier not found');
          const left = seatsLeft(currentTier);
          const message = left <= 0
            ? `${currentTier.name} is sold out`
            : `Only ${left} ticket(s) left in ${currentTier.name}`;
          throw new DomainError('SOLD_OUT', message, { seatsLeft: left });
        }
        sql.insertBooking.run(
          booking.id,
          booking.reference,
          userId,
          tier.eventId,
          tierId,
          quantity,
          amountCents,
          booking.status,
          createdAt,
        );
        return booking;
      });
    },

    async getBooking(reference) {
      requireText(reference, 'reference');
      return bookingByReference(reference);
    },

    async listBookings() {
      return sql.listBookings.all().map(toBooking);
    },

    async cancelBooking(reference) {
      requireText(reference, 'reference');
      return transaction(() => {
        const booking = bookingByReference(reference);
        if (!booking) throw new DomainError('NOT_FOUND', 'Booking not found');
        if (booking.status !== 'pending' && booking.status !== 'paid') {
          throw new DomainError(
            'INVALID_STATE',
            `A ${booking.status} booking cannot be cancelled`,
          );
        }
        const released = sql.releaseSeats.run(
          booking.quantity,
          booking.tierId,
          booking.quantity,
        );
        if (released.changes !== 1) {
          throw new DomainError('INVALID_STATE', 'Booking seats could not be released');
        }
        sql.cancelBooking.run(reference);
        return bookingByReference(reference);
      });
    },

    async updateBookingStatus(reference, status) {
      requireText(reference, 'reference');
      sql.updateBookingStatus.run(status, reference);
      return bookingByReference(reference);
    },

    close() {
      if (db.isOpen) db.close();
    },
  };
}
