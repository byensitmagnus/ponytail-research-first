# Implementation Decisions for EU VAT Checker

## Dependencies Added

**None.** This implementation uses only Node.js built-ins and no external npm packages.

## Why No External Dependencies

**Research Result:** Searched for existing VAT validation libraries on npm and GitHub:
- `validate-vat-ts` (1.3.0, ★★), `validate-vat` (0.9.0), `vies-vat` (1.2.4) all exist
- Examined candidate implementations; many either require paid APIs, sign-ups, API keys, or are language-specific (Python, Go, .NET, Django)
- The VIES service (European Commission's official VAT Information Exchange System) is free, public, and SOAP-based
- No single npm package fits the requirements: free access, offline format validation, optional custom fetch, network-free tests

**Decision:** Build lean using Node.js stdlib:
- Native `AbortController` for 10-second timeout (Node 16+)
- Native async/await and Promise
- SOAP XML hand-crafted (VIES service expects POST with XML body, minimal parsing overhead)
- Mock fetch in tests (no real network calls)

## Implementation Details

1. **VAT Format Validation**: 28 regex patterns covering all EU27 member states + Greece (EL) + Northern Ireland (XI)
   - Matches: country prefix normalization, optional spaces/dashes/dots in input, case-insensitive matching
   - Returns `malformed` status immediately for invalid formats (no network call)

2. **VIES Integration**: 
   - SOAP POST to `http://ec.europa.eu/taxation_customs/vies/services/checkVatService`
   - 10-second timeout via AbortController
   - Graceful degradation: VIES unavailable → `unverified` status with `valid: null`
   - XML response parsing (simple regex) for `<valid>`, `<name>`, `<address>`, `<faultstring>`

3. **Test Coverage**: 19 tests covering:
   - Format validation (valid/invalid patterns, case insensitivity, normalization)
   - VIES responses (valid, invalid, timeout, network error, SOAP faults)
   - Edge cases (null/undefined input, empty XML elements, entity decoding)
   - All 28 country codes

## Advantages of This Approach

- **Zero dependencies**: No supply-chain risk, smaller bundle, faster install
- **Network optional**: Optional `options.fetch` allows tests to mock without hitting real VIES
- **GDPR-friendly**: Only calls VIES when needed; format validation is offline
- **Checkout-safe**: 10-second timeout prevents checkout hangs; graceful `unverified` fallback
- **Maintainable**: Straightforward SOAP/XML without parsing libraries

## Known Ceiling ([rules] Notation)

- XML parsing is regex-based, not a full XML parser. Sufficient for VIES responses but if SOAP structure changes significantly, upgrade to a proper XML library (e.g., `xmldom` or `jsdom`).
- No caching layer. If high-volume checkout, add Redis/in-memory cache for per-VAT verification results (1–24 hour TTL).
- No rate limiting. VIES service allows verified queries; if rate-limited, upgrade to queuing + backoff.
