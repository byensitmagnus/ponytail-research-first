# B2B Solution Decisions

## Dependencies & Plugins

This solution uses only free, open-source components:

| Component | Version | License | Why |
|-----------|---------|---------|-----|
| WordPress Playground CLI | 3.1.55 | MIT | Used by npm check; testing only |
| WooCommerce | 11.1.2 | GPL v3 | Already required; provides product types, cart, checkout |
| Custom B2B Plugin | 1.0.0 | (own code) | Minimal, single-file plugin for B2B features |

No external dependencies added to plugin beyond WordPress/WooCommerce core functions.

## Architecture

### B2B Plugin (`wp-content/plugins/woocommerce-b2b/`)

Single file implementing:
1. **Registration form fields** — Added via `woocommerce_register_form` hook
   - Field: `billing_company_name` (contains "company" for test regex)
   - Field: `billing_vat_number` (contains "vat" for test regex)
   - Both optional (B2C customers don't need to fill them)

2. **User metadata storage** — `woocommerce_created_customer` hook saves fields to user meta
   - Meta keys: `billing_company_name`, `billing_vat_number`

3. **B2B approval tracking** — User meta flag `_b2b_approved` (boolean)
   - Set by admin or programmatically; demo users created with correct status

4. **Price filtering** — Applied at multiple levels for complete coverage:
   - `woocommerce_get_price_html` — Frontend product page display
   - `woocommerce_product_get_price` — Cart/checkout calculations
   - `woocommerce_product_get_regular_price` — Store API responses
   - `woocommerce_rest_prepare_product_object` — REST API product endpoint

Price logic: If user is logged in AND has `_b2b_approved=true`, use product's `_b2b_price` meta; otherwise use regular price.

### Blueprint Setup (`staging/blueprint.json`)

1. Installs WooCommerce 11.1.2
2. Activates custom B2B plugin
3. Creates Office Chair product:
   - Regular price: 1000 EUR
   - B2B price: 800 EUR (stored as post meta `_b2b_price`)
4. Creates demo users:
   - `b2c` — Regular customer, no B2B metadata
   - `b2b_pending` — B2B fields filled, `_b2b_approved=false` → pays 1000
   - `b2b_approved` — B2B fields filled, `_b2b_approved=true` → pays 800

## Design Rationale

- **Lazy approach:** No custom admin page, no approval workflow UI, just user meta flags. Admin sets meta directly via code or future tools.
- **Zero external dependencies:** Uses only WordPress hooks and WooCommerce built-ins.
- **Minimal code:** ~100 lines total for core B2B logic. Reuses `woocommerce_form_field()` and standard meta storage.
- **Multiple price hooks:** Ensures consistent pricing across frontend, cart, checkout, and REST API (WooCommerce Store API).
- **Per-product pricing:** B2B price stored as `_b2b_price` post meta, so different products can have different B2B discounts.

## Testing Expectations

`npm run check` verifies:
1. Registration form has `company` and `vat` fields ✓
2. Guest sees 1000 on product and in cart ✓
3. `b2c` customer sees 1000 ✓
4. `b2b_pending` customer sees 1000 (not approved) ✓
5. `b2b_approved` customer sees 800 (approved) ✓

## Future Improvements (not in scope)

- Admin UI to approve/reject B2B applications
- Email notification to admin on application
- Custom approval workflow (currently just meta flag)
- B2B-only products or bulk pricing
- Company name / VAT validation
