## Task Complete: EU VAT Number Validation ✓

I've successfully implemented the `checkVat` function for B2B checkout VAT validation. Here's what was delivered:

### Implementation Summary

**Zero dependencies.** The solution uses only Node.js 20+ built-in APIs:
- Native `fetch` + `AbortController` for VIES communication
- Inline SOAP request construction (no XML libraries)
- Regex-based response parsing (no DOM parser)

**All 28 country codes supported:**
- All 27 EU member states (AT, BE, BG, HR, CY, CZ, DK, EE, EL, ES, FI, FR, DE, HU, IE, IT, LV, LT, LU, MT, NL, PL, PT, RO, SK, SI, SE)
- Northern Ireland (XI)
- Greece correctly mapped to EL (not GR)

**Input normalization:**
- Accepts `DK 12 34 56 78`, `DK12345678`, `dk-12-34-56-78` — all equivalent
- Uppercase/lowercase agnostic

**Three-tier validation:**
1. Format check (immediate) → returns `malformed` if wrong pattern for country
2. VIES verification (10s timeout) → returns `valid`/`invalid` with company name/address
3. Graceful fallback → returns `unverified` with reason if VIES unavailable/slow

**Checkout never breaks:** Network errors, timeouts, and service unavailability all return status `unverified` with `valid: null` instead of throwing.

### Test Results
```
✔ 12/12 tests passing
✔ All scenarios covered (format, VIES responses, timeouts, errors)
✔ No network calls in tests (mocked fetch)
```

### Files Modified
- **`src/vat.js`** — Main implementation (117 lines)
- **`test/vat.test.js`** — Comprehensive test suite (180 lines)
- **`DECISION.md`** — Design decisions and scaling notes

**Commit:** `09881b7` - Implement checkVat for EU VAT number validation