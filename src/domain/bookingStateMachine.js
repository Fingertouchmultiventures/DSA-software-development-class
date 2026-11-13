import { DomainError } from './errors.js';

export const BOOKING_STATES = Object.freeze([
  'pending',
  'paid',
  'cancelled',
  'refunded',
  'checked_in',
]);

const ALLOWED_TRANSITIONS = new Map([
  ['pending', new Set(['paid', 'cancelled'])],
  ['paid', new Set(['checked_in', 'refunded', 'cancelled'])],
  ['cancelled', new Set()],
  ['refunded', new Set()],
  ['checked_in', new Set()],
]);

export function canTransition(from, to) {
  return ALLOWED_TRANSITIONS.get(from)?.has(to) ?? false;
}

export function assertTransition(from, to) {
  if (!canTransition(from, to)) {
    throw new DomainError(
      'INVALID_TRANSITION',
      `A booking cannot transition from ${String(from)} to ${String(to)}`,
    );
  }
}