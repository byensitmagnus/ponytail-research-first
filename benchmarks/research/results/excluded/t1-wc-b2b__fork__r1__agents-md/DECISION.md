# B2B Solution - Decision Log

## Dependencies

### WordPress & WooCommerce (Free, WordPress.org)
- **WordPress 7.1.2** — Core platform
- **WooCommerce 11.1.2** — E-commerce foundation
  - License: GPLv3 (free)
  - Reason: Only free option for WooCommerce; required for hooks and product management

### Custom Plugin (Zero Cost)
- **Shop B2B (shop-b2b)** — Our minimal B2B implementation
  - Location: `wp-content/mu-plugins/shop-b2b.php`
  - License: GPLv2+
  - Why: Rungs 1-7 analysis showed no free WooCommerce B2B plugin fits; paid B2B plugins (Dokan, Multivendor, etc.) violate zero-budget requirement. Custom code using WooCommerce hooks is smallest working solution.

## Design Decisions

### 1. Registration Form Fields (Rung 4: Platform native)
- **Choice:** WooCommerce registration hooks (`woocommerce_register_form`, `woocommerce_register_post`, `woocommerce_created_customer`)
- **Alternative:** Custom shortcode/form — rejected, WooCommerce provides the right hooks
- **Result:** Fields `billing_company` and `billing_vat_number` stored as user meta; no new table

### 2. B2B Status Tracking (Rung 3: Stdlib)
- **Choice:** User meta key `b2b_status` with values: `pending`, `approved`, `rejected`
- **Why:** WordPress standard, no new schema, admin UI included
- **Admin Interface:** Editable in user profile → B2B Information section

### 3. Pricing Logic (Rung 2: Existing pattern)
- **Choice:** Single filter on `woocommerce_product_get_price` (20% discount: 1000 → 800)
- **Why:** Simplest hook that applies to both product page display AND Store API cart calculations
- **No cart item filter:** Avoided double-application; product price filter alone suffices
- **Result:** 3 lines of code, applies everywhere price is retrieved

### 4. Three Demo Users (Blueprint Step)
- `b2c` — Normal B2C customer (no B2B meta)
- `b2b_pending` — Applied with company/VAT, status = pending (sees regular price)
- `b2b_approved` — Approved B2B applicant, status = approved (sees 800)
- All passwords: `Bench-2026!`

## No Additional Features (Ponytail YAGNI)
- Email notifications on approval — not in requirements
- B2B-only product catalog — not in requirements
- Minimum order quantities — not in requirements
- B2B payment terms — not in requirements

## File Structure
```
wp-content/
  mu-plugins/
    shop-b2b.php — Loaded automatically by WordPress
  plugins/
    shop-b2b/ — Backup copy (not loaded; blueprint mounts mu-plugins)
```

## Test Results
All 6 checks pass:
- price:guest = 1000 ✓
- price:b2c = 1000 ✓
- price:b2b_pending = 1000 ✓
- price:b2b_approved = 800 ✓
- register:company-field present ✓
- register:vat-field present ✓

## Future Paths
- **Admin approval workflow:** Add admin notice/quick-action buttons (rung 6: one line)
- **Bulk pricing tiers:** Add meta fields for quantity breaks (rung 2: existing pattern)
- **Email notification:** Hook `woocommerce_register_post` → `wp_mail()` (one function)
