import test from 'node:test';
import assert from 'node:assert/strict';
import { checkVat } from '../src/vat.js';

const fake = (body, status = 200) => async () => new Response(JSON.stringify(body), { status });

test('malformed without network', async () => {
  let called = false;
  const r = await checkVat('DK123', { fetch: async () => { called = true; } });
  assert.equal(r.status, 'malformed');
  assert.equal(called, false);
});

test('valid with name', async () => {
  const r = await checkVat('be 0403.170.701', { fetch: fake({ valid: true, name: 'X', address: 'Y' }) });
  assert.deepEqual([r.status, r.name], ['valid', 'X']);
});

test('busy member state is unverified, not invalid', async () => {
  const r = await checkVat('BE0403170701', { fetch: fake({ actionSucceed: false, errorWrappers: [{ error: 'MS_MAX_CONCURRENT_REQ' }] }) });
  assert.deepEqual([r.status, r.valid], ['unverified', null]);
});
