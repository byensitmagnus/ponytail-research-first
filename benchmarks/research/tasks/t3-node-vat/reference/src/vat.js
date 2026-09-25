// Reference solution: proves the task is solvable and the acceptance check is fair.
// Never shown to benchmark agents.
const FORMATS = {
  AT: /^U\d{8}$/, BE: /^[01]\d{9}$/, BG: /^\d{9,10}$/, CY: /^\d{8}[A-Z]$/, CZ: /^\d{8,10}$/,
  DE: /^\d{9}$/, DK: /^\d{8}$/, EE: /^\d{9}$/, EL: /^\d{9}$/, ES: /^[A-Z0-9]\d{7}[A-Z0-9]$/,
  FI: /^\d{8}$/, FR: /^[A-HJ-NP-Z0-9]{2}\d{9}$/, HR: /^\d{11}$/, HU: /^\d{8}$/,
  IE: /^(\d{7}[A-W][A-I]?|\d[A-Z+*]\d{5}[A-W])$/, IT: /^\d{11}$/, LT: /^(\d{9}|\d{12})$/,
  LU: /^\d{8}$/, LV: /^\d{11}$/, MT: /^\d{8}$/, NL: /^\d{9}B\d{2}$/, PL: /^\d{10}$/,
  PT: /^\d{9}$/, RO: /^\d{2,10}$/, SE: /^\d{12}$/, SI: /^\d{8}$/, SK: /^\d{10}$/,
  XI: /^(\d{9}|\d{12}|GD\d{3}|HA\d{3})$/,
};
const URL = 'https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number';
const clean = (s) => (s && s !== '---' ? s : undefined);

export async function checkVat(input, options = {}) {
  const fetchImpl = options.fetch || globalThis.fetch;
  const raw = String(input || '').toUpperCase().replace(/[\s.\-]/g, '');
  const countryCode = raw.slice(0, 2);
  const vatNumber = raw.slice(2);
  if (!FORMATS[countryCode] || !FORMATS[countryCode].test(vatNumber)) {
    return { status: 'malformed', valid: false, countryCode, vatNumber, reason: 'format' };
  }
  try {
    const res = await fetchImpl(URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ countryCode, vatNumber }),
      signal: AbortSignal.timeout(10000),
    });
    const body = await res.json();
    if (!res.ok || typeof body.valid !== 'boolean') {
      const reason = body.errorWrappers?.map((e) => e.error).join(',') || `HTTP ${res.status}`;
      return { status: 'unverified', valid: null, countryCode, vatNumber, reason };
    }
    return {
      status: body.valid ? 'valid' : 'invalid', valid: body.valid, countryCode, vatNumber,
      name: clean(body.name), address: clean(body.address),
    };
  } catch (e) {
    return { status: 'unverified', valid: null, countryCode, vatNumber, reason: e.name === 'TimeoutError' ? 'timeout' : e.message };
  }
}
