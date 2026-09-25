# checkVat Implementation Decisions

## Dependencies

**None added.** Implementation uses only Node.js built-in APIs:
- `String.prototype.match()` for regex parsing
- `fetch` (global, available in Node 18+) for VIES service
- `AbortController` for timeout handling
- Standard XML parsing via regex (no external XML lib)

## Architecture

### Format Validation (Offline)
- Per-country regex patterns for 27 EU members + Northern Ireland (XI)
- Validates format before any network call
- Returns `malformed` status immediately for invalid formats
- Prevents unnecessary VIES calls and avoids exposing bad data to the service

### VIES Integration (Online)
- Constructs SOAP 1.1 requests manually (no XML library)
- POSTs to `https://ec.europa.eu/taxation_customs/vies/services/checkVatService`
- Parses VIES response via simple regex XML parsing
- Extracts `valid`, `name`, `address` fields

### Timeout Handling
- 10-second timeout via `AbortController`
- Returns `unverified` with reason on timeout or network errors
- Checkout never breaks: all failures degrade gracefully

### Input Normalization
- Accepts flexible formatting: spaces, dots, dashes
- Case-insensitive (normalizes to uppercase)
- Handles both prefixed (`DK 12 34 56 78`) and non-prefixed inputs
- Special case: Greece uses `EL` (not `GR`), Northern Ireland uses `XI`

## Skipped

1. **SOAP client library**: Would add dependency and complexity. Manual SOAP is simple for this single operation.
2. **XML parsing library**: Regex extraction is sufficient for VIES's simple, well-formed response structure.
3. **VAT format database**: Hardcoded per-country patterns sufficient; VIES is the real validator.
4. **Rate limiting / caching**: Defer to caller's layer; checkout systems typically implement this.
5. **Extended error details**: Return only actionable info; checkout flow doesn't need granular error codes.

## Test Coverage

17 tests, all without hitting the real network:
- Malformed input handling (6 tests)
- Input normalization (2 tests)
- VIES response parsing (valid/invalid, with/without details)
- Error conditions (HTTP error, timeout, network error, no fetch available)
- Country codes including special cases (EL, XI)

## Interface Preserved

```js
export async function checkVat(input, options = {})
// options.fetch: optional fetch implementation
// Returns: {status, valid, countryCode?, vatNumber?, name?, address?, reason?}
```

All statuses implemented: `valid`, `invalid`, `malformed`, `unverified`.
