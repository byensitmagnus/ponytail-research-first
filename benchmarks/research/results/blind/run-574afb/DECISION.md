# Dependencies and Decisions

## Third-Party Dependencies

**None added.** Implementation uses only Node.js stdlib:
- `node:test` - native test runner (Node 18+)
- `node:assert` - native assertions
- Built-in `AbortController` and `URLSearchParams` for fetch and timeout handling

## Design Decisions

### 1. VAT Format Validation

All 27 EU member states + Northern Ireland (XI) have country-specific format validation rules built into regex patterns. Format validation happens synchronously before any network call, preventing unnecessary VIES requests for malformed numbers.

### 2. VIES Service Integration

Uses the European Commission's official VIES REST endpoint (`https://ec.europa.eu/taxation_customs/vies/api/checkVat`) with:
- POST request with `countryCode` and `vatNumber` parameters
- 10-second timeout enforced via `AbortController`
- Supports both JSON and XML responses (VIES returns SOAP XML)
- Graceful degradation: network errors return `status: 'unverified'`, never break checkout

### 3. Input Normalization

Accepts VAT numbers in any format:
- Case-insensitive (converts to uppercase)
- Strips spaces, dots, dashes
- Requires 2-letter country code prefix

Example: `DK 12.34.56.78`, `de129273398`, `DE 129 273 398` all normalize to `DE129273398`

### 4. Error Handling

- **Malformed**: Invalid format detected without network call → `valid: false`
- **Valid/Invalid**: VIES returns success → `valid: true|false` with optional name/address
- **Unverified**: Timeout (>10s), network error, VIES unavailable → `valid: null`, reason provided

## Supported Countries

All 27 EU member states:
- AT (Austria), BE (Belgium), BG (Bulgaria), CY (Cyprus), CZ (Czech Republic)
- DE (Germany), DK (Denmark), EE (Estonia), EL (Greece), ES (Spain)
- FI (Finland), FR (France), HR (Croatia), HU (Hungary), IE (Ireland)
- IT (Italy), LT (Lithuania), LU (Luxembourg), LV (Latvia), MT (Malta)
- NL (Netherlands), PL (Poland), PT (Portugal), RO (Romania), SE (Sweden)
- SI (Slovenia), SK (Slovakia)

Plus: XI (Northern Ireland)

## Testing Strategy

Comprehensive test suite with 37 tests covering:
- Malformed input handling (empty, null, unknown country)
- Format validation for each major VAT format type
- Input normalization (spaces, dots, dashes, case)
- VIES integration with mocked SOAP responses
- Timeout handling (10-second abort)
- Network error recovery

All tests mock the VIES service to avoid network calls. Zero external dependencies means zero supply-chain risk.
