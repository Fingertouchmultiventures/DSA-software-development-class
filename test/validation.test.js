import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  MAX_TICKETS_PER_BOOKING,
  requireDate,
  requireQuantity,
  requireRecord,
  requireText,
  requireWholeNumber,
} from '../src/domain/validation.js';
import { DomainError } from '../src/domain/errors.js';

function assertValidation(action) {
  assert.throws(action, (error) => (
    error instanceof DomainError && error.code === 'VALIDATION'
  ));
}

describe('shared domain validation', () => {
  it('requires object records and returns valid records', () => {
    const record = { title: 'Event' };
    assert.equal(requireRecord(record, 'details'), record);
    for (const invalid of [null, undefined, [], 'text', 1]) {
      assertValidation(() => requireRecord(invalid, 'details'));
    }
  });

  it('trims non-empty text and rejects missing or whitespace-only values', () => {
    assert.equal(requireText('  General  ', 'tier name'), 'General');
    assertValidation(() => requireText('', 'tier name'));
    assertValidation(() => requireText('   ', 'tier name'));
  });

  it('accepts safe whole numbers at the minimum and rejects invalid values', () => {
    assert.equal(requireWholeNumber(0, 'priceCents', 0), 0);
    assert.equal(requireWholeNumber(4, 'capacity', 1), 4);
    for (const invalid of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, '4']) {
      assertValidation(() => requireWholeNumber(invalid, 'capacity', 1));
    }
  });

  it('normalizes valid date strings and rejects missing or invalid dates', () => {
    assert.equal(
      requireDate('2026-12-05T17:00:00Z', 'startsAt'),
      '2026-12-05T17:00:00.000Z',
    );
    assertValidation(() => requireDate('', 'startsAt'));
    assertValidation(() => requireDate('not-a-date', 'startsAt'));
    assertValidation(() => requireDate(new Date(), 'startsAt'));
  });

  it('enforces ticket quantity bounds for bookings and waitlists', () => {
    assert.equal(MAX_TICKETS_PER_BOOKING, 10);
    assert.equal(requireQuantity(1), 1);
    assert.equal(requireQuantity(10), 10);
    for (const invalid of [0, -1, 1.5, 11, Number.MAX_SAFE_INTEGER + 1]) {
      assertValidation(() => requireQuantity(invalid));
    }
  });
});
