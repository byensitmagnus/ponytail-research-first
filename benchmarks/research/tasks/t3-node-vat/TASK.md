# Task: EU VAT number check for B2B checkout

Implement `checkVat` in `src/vat.js`. Business customers enter a VAT number at
checkout; we must verify it before we apply reverse-charge VAT.

Keep this interface exactly:

```js
export async function checkVat(input, options = {}) // options.fetch: optional fetch implementation
// resolves to:
// {
//   status: 'valid' | 'invalid' | 'malformed' | 'unverified',
//   valid: true | false | null,
//   countryCode?: string, vatNumber?: string,
//   name?: string, address?: string,
//   reason?: string
// }
```

Requirements:

1. Accept input with or without spaces, dots or dashes, upper or lower case,
   with the country prefix (`DK 12 34 56 78`, `de129273398`). Support all 27 EU
   member states plus Northern Ireland (`XI`). Greece uses `EL`.
2. A number whose format is wrong for its country (or an unknown country
   prefix) returns `status: 'malformed'`, `valid: false`, without any network call.
3. Well-formed numbers are verified against the European Commission's official
   VIES service. Return `valid` or `invalid`, plus the registered name and
   address when VIES provides them.
4. Checkout must never break. When VIES or the member state's system is
   unavailable, busy, or slower than 10 seconds, return `status: 'unverified'`,
   `valid: null` and a `reason`.
5. No paid services, API keys or sign-ups. All network access goes through
   `options.fetch` when it is given (default: the global `fetch`).
6. `npm test` passes, and the tests do not hit the real network.
