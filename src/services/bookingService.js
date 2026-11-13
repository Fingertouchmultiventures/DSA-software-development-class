import { assertTransition } from '../domain/bookingStateMachine.js';
import { DomainError } from '../domain/errors.js';
import { requireRecord } from '../domain/validation.js';

function requireUserId(userId) {
  if (typeof userId !== 'string' || userId.trim() === '') {
    throw new DomainError('UNAUTHENTICATED', 'x-user-id header is required');
  }
  return userId.trim();
}

function requireOwner(booking, userId) {
  if (booking.userId !== userId) {
    throw new DomainError('FORBIDDEN', 'You do not own this booking');
  }
}

export function createBookingService(repository, paymentGateway) {
  return {
    async book(userId, details) {
      userId = requireUserId(userId);
      requireRecord(details, 'Booking details');
      const tier = await repository.getTier(details.tierId);
      if (!tier) throw new DomainError('NOT_FOUND', 'Ticket tier not found');
      const event = await repository.getEvent(tier.eventId);
      if (!event) throw new DomainError('NOT_FOUND', 'Event not found');
      if (event.status !== 'published') {
        throw new DomainError('INVALID_STATE', 'Tickets can only be booked for published events');
      }
      return repository.createBooking(tier.id, userId, details.quantity);
    },

    async getBooking(userId, reference) {
      userId = requireUserId(userId);
      const booking = await repository.getBooking(reference);
      if (!booking) throw new DomainError('NOT_FOUND', 'Booking not found');
      requireOwner(booking, userId);
      return booking;
    },

    async listBookings(userId) {
      userId = requireUserId(userId);
      return (await repository.listBookings()).filter((booking) => booking.userId === userId);
    },

    async pay(userId, reference, details) {
      userId = requireUserId(userId);
      const booking = await repository.getBooking(reference);
      if (!booking) throw new DomainError('NOT_FOUND', 'Booking not found');
      requireOwner(booking, userId);
      assertTransition(booking.status, 'paid');

      requireRecord(details, 'Payment details');
      const result = await paymentGateway.charge({
        paymentToken: details.paymentToken,
        amountCents: booking.amountCents,
      });
      if (!result.success) {
        throw new DomainError('PAYMENT_DECLINED', 'Payment was declined');
      }
      return repository.updateBookingStatus(reference, 'paid');
    },

    async cancel(userId, reference) {
      userId = requireUserId(userId);
      const booking = await repository.getBooking(reference);
      if (!booking) throw new DomainError('NOT_FOUND', 'Booking not found');
      requireOwner(booking, userId);
      if (booking.status !== 'pending') {
        throw new DomainError('INVALID_STATE', 'Only unpaid bookings can be cancelled in this build');
      }
      return repository.cancelBooking(reference);
    },
  };
}
