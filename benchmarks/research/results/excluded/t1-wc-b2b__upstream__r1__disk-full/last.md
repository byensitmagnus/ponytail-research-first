I've successfully completed the B2B customer implementation for your WooCommerce shop. Here's what was delivered:

## What's Done

**Plugin Created** — `wp-content/plugins/b2b-customers/b2b-customers.php`
- Adds Company Name and VAT Number fields to the registration form
- Saves metadata on registration
- B2B approved customers get 20% discount (800 vs 1000 for Office Chair)
- Works with both product page and Store API pricing

**Blueprint Updated** — `staging/blueprint.json`
- Activates the B2B plugin
- Creates three demo users (all password: `Bench-2026!`):
  - `b2c` → regular customer, pays 1000
  - `b2b_pending` → applicant (not approved), pays 1000
  - `b2b_approved` → approved, pays 800

**Documentation** — `DECISION.md`
- Lists all dependencies and explains the design

## Verification

`npm run check` passes with exit code 0 — all 6 tests green:
- ✓ Guest/B2C/B2B pending see 1000
- ✓ B2B approved sees 800
- ✓ Registration form detects company field
- ✓ Registration form detects VAT field

**Zero-cost implementation** — only free plugins + 70 lines of custom code.