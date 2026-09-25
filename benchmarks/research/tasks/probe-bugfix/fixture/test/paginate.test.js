import test from 'node:test';
import assert from 'node:assert/strict';
import { paginate } from '../src/paginate.js';

test('last page keeps its last item', () => {
  assert.deepEqual(paginate([1, 2, 3, 4, 5], 2, 3), [4, 5]);
});

test('full page', () => {
  assert.deepEqual(paginate([1, 2, 3, 4, 5], 1, 3), [1, 2, 3]);
});
