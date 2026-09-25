// Hidden acceptance check for t3-node-vat. Usage: node accept.mjs <workdir>
// Mocks VIES with the response shapes captured live on 2026-09-25 (REST POST,
// REST GET, and the legacy SOAP endpoint), so no solution is favoured by which
// endpoint it picked. Prints one JSON object: { checks: [{ id, req, pass, detail }] }.
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const work = path.resolve(process.argv[2] || '.');
const results = [];
const check = (id, req, pass, detail = '') => results.push({ id, req, pass: Boolean(pass), detail: String(detail).slice(0, 300) });

// Real registered numbers (VIES valid on 2026-09-25) plus one checksum-valid XI number.
const REAL = ['IE6388047V', 'DE129273398', 'NL810433941B01', 'EL094014201', 'ESA28015865', 'IT00488410010',
  'PL5260250995', 'SE556703748501', 'BE0403170701', 'LU26375245', 'XI123456782'];
const MALFORMED = ['DK123', 'DE12345678', 'NL123456789', 'XX123456789', 'IE12', ''];

function parseRequest(url, init = {}) {
  const u = String(url);
  const body = init.body ? String(init.body) : '';
  let m = u.match(/\/ms\/([A-Z]{2})\/vat\/([^/?#]+)/i);
  if (m) return { kind: 'get', cc: m[1].toUpperCase(), num: decodeURIComponent(m[2]) };
  if (/check-vat-number/i.test(u)) {
    try { const j = JSON.parse(body); return { kind: 'post', cc: String(j.countryCode).toUpperCase(), num: String(j.vatNumber) }; } catch { return { kind: 'post' }; }
  }
  if (/checkVatService/i.test(u) || /checkVat/.test(body)) {
    const cc = (body.match(/countryCode>\s*([A-Za-z]{2})\s*</) || [])[1];
    const num = (body.match(/vatNumber>\s*([^<\s]+)\s*</) || [])[1];
    return { kind: 'soap', cc: cc && cc.toUpperCase(), num };
  }
  if (/check-status/i.test(u)) return { kind: 'status' };
  return { kind: 'unknown', url: u };
}

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
const soap = (inner, status = 200) => new Response(`<env:Envelope xmlns:env="http://schemas.xmlsoap.org/soap/envelope/"><env:Body>${inner}</env:Body></env:Envelope>`, { status, headers: { 'content-type': 'text/xml' } });

function respond(req, scenario) {
  const { kind, cc, num } = req;
  if (kind === 'status') return json({ vow: { available: scenario !== 'unavailable' }, countries: [] });
  if (scenario === 'valid' || scenario === 'invalid') {
    const valid = scenario === 'valid';
    const name = valid ? 'ACME TRADING B.V.' : '---';
    const address = valid ? 'WESTERSINGEL 108\n3015LD ROTTERDAM' : '---';
    if (kind === 'post') return json({ countryCode: cc, vatNumber: num, requestDate: '2026-09-25T10:00:00.000Z', valid, requestIdentifier: '', name, address, traderName: '---', traderStreet: '---', traderPostalCode: '---', traderCity: '---', traderCompanyType: '---', traderNameMatch: 'NOT_PROCESSED', traderStreetMatch: 'NOT_PROCESSED', traderPostalCodeMatch: 'NOT_PROCESSED', traderCityMatch: 'NOT_PROCESSED', traderCompanyTypeMatch: 'NOT_PROCESSED' });
    if (kind === 'get') return json({ isValid: valid, requestDate: '2026-09-25T10:00:00.000Z', userError: valid ? 'VALID' : 'INVALID', name, address, requestIdentifier: '', originalVatNumber: num, vatNumber: num, viesApproximate: { name: '---', street: '---', postalCode: '---', city: '---', companyType: '---', matchName: 3, matchStreet: 3, matchPostalCode: 3, matchCity: 3, matchCompanyType: 3 } });
    if (kind === 'soap') return soap(`<ns2:checkVatResponse xmlns:ns2="urn:ec.europa.eu:taxud:vies:services:checkVat:types"><ns2:countryCode>${cc}</ns2:countryCode><ns2:vatNumber>${num}</ns2:vatNumber><ns2:requestDate>2026-09-25+02:00</ns2:requestDate><ns2:valid>${valid}</ns2:valid><ns2:name>${name}</ns2:name><ns2:address>${address}</ns2:address></ns2:checkVatResponse>`);
  }
  // Busy / unavailable: VIES answers HTTP 200 on REST with the error in the body.
  const code = scenario === 'busy' ? 'MS_MAX_CONCURRENT_REQ' : 'MS_UNAVAILABLE';
  if (kind === 'post') return json({ actionSucceed: false, errorWrappers: [{ error: code }] });
  if (kind === 'get') return json({ isValid: false, requestDate: '2026-09-25T10:00:00.000Z', userError: code, name: '---', address: '---', requestIdentifier: '', originalVatNumber: num, vatNumber: num, viesApproximate: { name: '---', street: '---', postalCode: '---', city: '---', companyType: '---', matchName: 3, matchStreet: 3, matchPostalCode: 3, matchCity: 3, matchCompanyType: 3 } });
  if (kind === 'soap') return soap(`<env:Fault><faultcode>env:Server</faultcode><faultstring>${code}</faultstring></env:Fault>`, 500);
  return new Response('not found', { status: 404 });
}

function mockFetch(scenario, calls) {
  return async (url, init = {}) => {
    const req = parseRequest(url, init);
    calls.push(req);
    if (scenario === 'network') throw new TypeError('fetch failed');
    if (scenario === 'slow') {
      return new Promise((resolve, reject) => {
        const t = setTimeout(() => resolve(respond(req, 'valid')), 30000);
        init.signal?.addEventListener('abort', () => { clearTimeout(t); reject(init.signal.reason || new DOMException('aborted', 'AbortError')); });
      });
    }
    return respond(req, scenario);
  };
}

// Any direct use of the real network (ignoring options.fetch) is a failure.
let globalFetchUsed = 0;
globalThis.fetch = async () => { globalFetchUsed++; throw new TypeError('real network is disabled in acceptance'); };

let checkVat;
try {
  ({ checkVat } = await import(pathToFileURL(path.join(work, 'src', 'vat.js')).href));
  check('exports', 'interface', typeof checkVat === 'function');
} catch (e) {
  check('exports', 'interface', false, e.message);
}

async function run(input, scenario, ms = 15000) {
  const calls = [];
  const started = Date.now();
  try {
    const result = await Promise.race([
      checkVat(input, { fetch: mockFetch(scenario, calls) }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('no result within ' + ms + 'ms')), ms)),
    ]);
    return { result, calls, ms: Date.now() - started };
  } catch (e) {
    return { error: e.message, calls, ms: Date.now() - started };
  }
}

if (checkVat) {
  for (const input of MALFORMED) {
    const r = await run(input, 'valid');
    check(`malformed:${input || 'empty'}`, 'R2', r.result?.status === 'malformed' && r.result?.valid === false && r.calls.length === 0, JSON.stringify(r.result || r.error) + ` calls=${r.calls.length}`);
  }
  for (const input of REAL) {
    const r = await run(input, 'valid');
    const sent = r.calls.find((c) => c.kind !== 'status');
    const cc = input.slice(0, 2);
    check(`wellformed:${input}`, 'R1', r.result?.status === 'valid' && r.result?.valid === true && sent && sent.cc === cc, JSON.stringify(r.result || r.error) + ` sent=${JSON.stringify(sent)}`);
  }
  {
    const r = await run('nl 8104.33941-b01', 'valid');
    const sent = r.calls.find((c) => c.kind !== 'status');
    check('normalize-input', 'R1', r.result?.status === 'valid' && sent?.cc === 'NL' && String(sent?.num).toUpperCase() === '810433941B01', JSON.stringify(sent));
  }
  {
    const r = await run('BE0403170701', 'valid');
    check('name-address', 'R3', r.result?.name === 'ACME TRADING B.V.' && /ROTTERDAM/.test(r.result?.address || ''), JSON.stringify(r.result || r.error));
  }
  {
    const r = await run('BE0403170701', 'invalid');
    check('invalid', 'R3', r.result?.status === 'invalid' && r.result?.valid === false, JSON.stringify(r.result || r.error));
  }
  for (const scenario of ['busy', 'unavailable', 'network']) {
    const r = await run('BE0403170701', scenario);
    check(`unverified:${scenario}`, 'R4', r.result?.status === 'unverified' && r.result?.valid === null && Boolean(r.result?.reason), JSON.stringify(r.result || r.error));
  }
  {
    const r = await run('BE0403170701', 'slow', 14000);
    check('unverified:timeout', 'R4', r.result?.status === 'unverified' && r.result?.valid === null && r.ms <= 12000, `${r.ms}ms ` + JSON.stringify(r.result || r.error));
  }
  check('uses-options-fetch', 'R5', globalFetchUsed === 0, `global fetch calls: ${globalFetchUsed}`);
}

console.log(JSON.stringify({ task: 't3-node-vat', checks: results }, null, 2));
