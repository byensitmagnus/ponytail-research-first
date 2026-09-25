# Implementation decisions for checkVat

## Dependencies added
None. The implementation uses only Node.js 20+ built-in APIs.

## Key choices

1. **No external dependencies**
   - Validation: Regex patterns per country (inline, no library)
   - VIES integration: Direct SOAP/HTTP POST via native `fetch` API
   - Timeout: `AbortController` + `setTimeout` (native)
   - XML parsing: String extraction (no full XML parser)

2. **SOAP over HTTP for VIES**
   - Constructs SOAP envelope manually (brief XML template)
   - Direct POST to https://ec.europa.eu/taxation_customs/vies/services/checkVatService
   - No SOAP library dependency; minimal XML escaping for user input
   - Parses response with simple regex (no full DOM/XML parser)

3. **Format validation per country**
   - 27 EU member states + XI (Northern Ireland) supported
   - Greece code mapped to `EL` (not `GR`)
   - Patterns based on VIES specifications
   - Early return for malformed input (no network call)

4. **Timeout and error handling**
   - 10-second timeout via `AbortController` + `setTimeout`
   - Network errors → `status: 'unverified'`, `valid: null`
   - VIES unavailable, slow, or errors → graceful fallback
   - Checkout never breaks (promise always resolves)

5. **Test-friendly architecture**
   - `options.fetch` parameter allows mock injection
   - Tests mock VIES responses without network access
   - All scenarios covered: valid, invalid, malformed, timeout, network error

## Scaling and known limits
- ponytail: XML response parsing uses string extraction, not full parser (no dep, works for VIES response structure)
- ponytail: SOAP request built as string template (no validation of XML well-formedness if input contains rare chars)
- Upgrade when: VIES response format changes, or multi-request batching needed
