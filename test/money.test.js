import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatNaira } from '../src/domain/money.js';

describe('formatNaira', () => {
    it('formats valid kobo amounts correctly', () => {
        assert.equal(formatNaira(0), '₦0.00');
        assert.equal(formatNaira(1), '₦0.01');
        assert.equal(formatNaira(100), '₦1.00');
    });

    it('rejects invalid kobo amounts', () => {
        for (const kobo of [-1, 1.5, '100', NaN]) {
            assert.throws(
                () => formatNaira(kobo),
                /kobo must be a whole number zero or greater/,
            );
        }
    });
});