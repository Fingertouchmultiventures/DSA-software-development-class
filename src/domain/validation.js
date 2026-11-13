import { DomainError } from './errors.js';

export const MAX_TICKETS_PER_BOOKING = 10;

export function requireRecord(value, field) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new DomainError('VALIDATION', `${field} must be an object`);
  }
  return value;
}

export function requireText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new DomainError('VALIDATION', `${field} is required`);
  }
  return value.trim();
}

export function requireWholeNumber(value, field, min) {
  if (!Number.isSafeInteger(value) || value < min) {
    throw new DomainError(
      'VALIDATION',
      `${field} must be a whole number of at least ${min}`,
    );
  }
  return value;
}

export function requireDate(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new DomainError('VALIDATION', `${field} must be a valid date`);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new DomainError('VALIDATION', `${field} must be a valid date`);
  }
  return date.toISOString();
}

export function requireQuantity(quantity) {
  if (
    !Number.isSafeInteger(quantity)
    || quantity < 1
    || quantity > MAX_TICKETS_PER_BOOKING
  ) {
    throw new DomainError(
      'VALIDATION',
      `quantity must be between 1 and ${MAX_TICKETS_PER_BOOKING}`,
    );
  }
  return quantity;
}
