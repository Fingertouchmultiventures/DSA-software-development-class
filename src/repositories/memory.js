import {
  addTier,
  bookTickets,
  cancelBooking,
  createEvent,
  createStore,
  findBookingByReference,
  listEventSummaries,
  publishEvent,
  unpublishEvent,
} from '../domain/inventory.js';

export function createMemoryRepository(options) {
  const store = createStore(options);

  return {
    async createEvent(details) {
      return createEvent(store, details);
    },

    async getEvent(id) {
      return store.events.get(id);
    },

    async listEvents({ publishedOnly = true } = {}) {
      return listEventSummaries(store, { publishedOnly });
    },

    async addTier(eventId, details) {
      return addTier(store, eventId, details);
    },

    async getTier(id) {
      return store.tiers.get(id);
    },

    async listTiersForEvent(eventId) {
      const event = store.events.get(eventId);
      if (!event) return undefined;
      return event.tierIds.map((id) => store.tiers.get(id));
    },

    async publishEvent(id) {
      return publishEvent(store, id);
    },

    async unpublishEvent(id) {
      return unpublishEvent(store, id);
    },

    async createBooking(tierId, userId, quantity) {
      return bookTickets(store, tierId, userId, quantity);
    },

    async getBooking(reference) {
      return findBookingByReference(store, reference);
    },

    async listBookings() {
      return [...store.bookings.values()];
    },

    async cancelBooking(reference) {
      return cancelBooking(store, reference);
    },

    async updateBookingStatus(reference, status) {
      const booking = findBookingByReference(store, reference);
      if (!booking) return undefined;
      booking.status = status;
      return booking;
    },
  };
}
