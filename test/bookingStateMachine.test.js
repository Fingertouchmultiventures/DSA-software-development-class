import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertTransition,
  BOOKING_STATES,
  canTransition,
} from '../src/domain/bookingStateMachine.js';
import { DomainError } from '../src/domain/errors.js';

const allowed = [
  ['pending', 'paid'],
  ['pending', 'cancelled'],
  ['paid', 'checked_in'],
  ['paid', 'refunded'],
  ['paid', 'cancelled'],
];

describe('booking state machine', () => {
  it('accepts every allowed transition', () => {
    for (const [from, to] of allowed) {
      assert.equal(canTransition(from, to), true, `${from} -> ${to}`);
      assert.doesNotThrow(() => assertTransition(from, to));
    }
  });

  it('rejects every other transition between known states', () => {
    for (const from of BOOKING_STATES) {
      for (const to of BOOKING_STATES) {
        if (allowed.some(([allowedFrom, allowedTo]) => allowedFrom === from && allowedTo === to)) {
          continue;
        }

        assert.equal(canTransition(from, to), false, `${from} -> ${to}`);
        assert.throws(
          () => assertTransition(from, to),
          (error) => error instanceof DomainError && error.code === 'INVALID_TRANSITION',
        );
      }
    }
  });

  it('rejects unknown states', () => {
    assert.equal(canTransition('unknown', 'paid'), false);
    assert.throws(
      () => assertTransition('pending', 'unknown'),
      (error) => error instanceof DomainError && error.code === 'INVALID_TRANSITION',
    );
  });
});