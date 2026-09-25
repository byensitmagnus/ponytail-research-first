import test from 'node:test';
import assert from 'node:assert/strict';
import { checkVat } from '../src/vat.js';

test('checkVat is exported', () => {
  assert.equal(typeof checkVat, 'function');
});
