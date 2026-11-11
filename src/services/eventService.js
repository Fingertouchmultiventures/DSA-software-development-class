import { DomainError } from '../domain/errors.js';
import { searchEvents } from '../domain/eventSearch.js';
import { requireRecord } from '../domain/validation.js';

function requireUserId(userId) {
  if (typeof userId !== 'string' || userId.trim() === '') {
    throw new DomainError('UNAUTHENTICATED', 'x-user-id header is required');
  }
  return userId.trim();
}

function requireOwnership(event, userId) {
  if (event.organizerId !== userId) {
    throw new DomainError('FORBIDDEN', 'You do not own this event');
  }
}

export function createEventService(repository) {
  return {
    async createEvent(userId, details) {
      userId = requireUserId(userId);
      requireRecord(details, 'Event details');
      return repository.createEvent({ ...details, organizerId: userId });
    },

    async addTier(userId, eventId, details) {
      userId = requireUserId(userId);
      const event = await repository.getEvent(eventId);
      if (!event) throw new DomainError('NOT_FOUND', 'Event not found');
      requireOwnership(event, userId);
      if (event.status !== 'draft') {
        throw new DomainError('INVALID_STATE', 'Ticket tiers can only be added to draft events');
      }
      return repository.addTier(eventId, details);
    },

    async publishEvent(userId, eventId) {
      userId = requireUserId(userId);
      const event = await repository.getEvent(eventId);
      if (!event) throw new DomainError('NOT_FOUND', 'Event not found');
      requireOwnership(event, userId);
      return repository.publishEvent(eventId);
    },

    async unpublishEvent(userId, eventId) {
      userId = requireUserId(userId);
      const event = await repository.getEvent(eventId);
      if (!event) throw new DomainError('NOT_FOUND', 'Event not found');
      requireOwnership(event, userId);
      return repository.unpublishEvent(eventId);
    },

    async searchPublishedEvents(criteria, sortBy) {
      const summaries = await repository.listEvents({ publishedOnly: true });
      return searchEvents(summaries, criteria, sortBy);
    },

    async getEvent(userId, eventId) {
      const event = await repository.getEvent(eventId);
      if (!event) throw new DomainError('NOT_FOUND', 'Event not found');
      if (event.status !== 'published') {
        userId = requireUserId(userId);
        requireOwnership(event, userId);
      }
      const tiers = await repository.listTiersForEvent(eventId);
      return { ...event, tiers };
    },
  };
}
