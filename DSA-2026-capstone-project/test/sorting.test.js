import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mergeSort } from '../src/domain/sorting.js';

describe('mergeSort', () => {
  it('sorts values without mutating the input', () => {
    const values = [5, 2, 9, 1, 5, 6];
    const result = mergeSort(values);
    assert.deepEqual(result, [1, 2, 5, 5, 6, 9]);
    assert.notEqual(result, values);
    assert.deepEqual(values, [5, 2, 9, 1, 5, 6]);
  });

  it('returns a new array for empty and one-item inputs', () => {
    const empty = [];
    const one = [42];
    assert.deepEqual(mergeSort(empty), []);
    assert.notEqual(mergeSort(empty), empty);
    assert.deepEqual(mergeSort(one), [42]);
    assert.notEqual(mergeSort(one), one);
  });

  it('is stable when items compare equal', () => {
    const input = [
      { key: 2, name: 'first two' },
      { key: 1, name: 'first one' },
      { key: 2, name: 'second two' },
      { key: 1, name: 'second one' },
    ];
    const result = mergeSort(input, (a, b) => a.key - b.key);
    assert.deepEqual(result.map((item) => item.name), [
      'first one',
      'second one',
      'first two',
      'second two',
    ]);
  });
});
