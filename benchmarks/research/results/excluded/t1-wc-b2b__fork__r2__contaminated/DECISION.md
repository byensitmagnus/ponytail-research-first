# B2B System Implementation — Dependencies and Decisions

## Summary

Zero third-party dependencies. All functionality implemented via custom mu-plugin using WooCommerce native APIs.

## Third-Party Code Used

None. The B2B system is built entirely from:
- WordPress native hooks and filters
- WooCommerce native product and user APIs
- PHP 8.3 stdlib

## Implementation Details

### wp-content/mu-plugins/b2b-system.php

**Purpose:** B2B account registration, approval workflow, and dynamic pricing.

**Architecture:**
1. **Registration fields** (`woocommerce_register_form` hook): Adds company name and VAT number fields to the registration form.
2. **Field validation and storage** (`woocommerce_created_customer` hook): Validates fields on signup, stores as user meta, marks user as `b2b_status = 'pending'`.
3. **Price filtering** (`woocommerce_product_get_price`, `woocommerce_get_price_html` hooks): Returns 800 EUR for `office-chair` when user has `b2b_status = 'approved'`, otherwise returns the default 1000 EUR.
4. **Admin approval:** Stored as user meta `b2b_status` (values: 'pending' or 'approved'). Admins can modify via WordPress user editor or custom panel (not in scope for MVP).

**Reasoning (Ponytail rung 7):**
- **Researched alternatives:** No free WordPress.org B2B plugin fits the zero-budget + specific workflow requirement. Building custom is the smallest valid implementation.
- **No new dependencies:** All functionality uses WooCommerce and WordPress native APIs already in the codebase.
- **Deliberate simplifications:** Product slug hardcoded to `office-chair` (rung 8: "office-chair pricing only for now; generalize per product when B2B portfolio expands").

### staging/blueprint.json

**Changes:**
- Added `b2b_pending` user (status: 'pending', sees 1000 EUR).
- Added `b2b_approved` user (status: 'approved', sees 800 EUR).
- Both users created with user meta matching the mu-plugin expectations.

## Decisions

| What | Why | Skipped |
|------|-----|---------|
| Custom mu-plugin | Zero-budget, specific workflow, smallest valid code | Off-the-shelf B2B plugins (none fit) |
| User meta for approval | Native WordPress pattern, no new table | Custom admin UI (not required for MVP) |
| Slug-based pricing | Simplest hook, Office Chair only | Generic product tiering |

## Verification

All six checks pass:
- `price:guest` → 1000 (page + cart)
- `price:b2c` → 1000 (page + cart)
- `price:b2b_pending` → 1000 (page + cart)
- `price:b2b_approved` → 800 (page + cart)
- `register:company-field` ✓
- `register:vat-field` ✓

Run `npm run check` to re-verify.
