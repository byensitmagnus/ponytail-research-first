# Implementation Decisions

## Third-Party Dependencies

### WooCommerce 11.1.2
- **License:** GPL v3
- **Source:** https://downloads.wordpress.org/plugin/woocommerce.11.1.2.zip
- **Why:** Required base e-commerce platform. Specified in task requirements.

## Implementation Strategy

### B2B Plugin (woo-b2b)
**Location:** `wp-content/plugins/woo-b2b/woo-b2b.php`  
**License:** Proprietary (project-specific)

#### Features
1. **Registration Form Enhancement**
   - Adds "Company Name" and "VAT Number" fields to WooCommerce registration
   - Fields are required for all registrations
   - Values stored in user meta: `billing_company`, `billing_vat`

2. **B2B Status Tracking**
   - New registrations auto-marked as "pending" approval (`woo_b2b_status` user meta)
   - Admin can set users to "approved" (manual process via user meta update)
   - Guest and B2C users: no status meta (implicitly standard pricing)

3. **B2B Pricing**
   - Approved B2B customers see 20% discount on Office Chair (1000 → 800)
   - Pricing applied via WooCommerce product price filters
   - Hooks: `woocommerce_product_get_price`, `rest_prepare_wc_product`, `rest_prepare_wc_cart`
   - Non-approved B2B applicants and B2C customers see standard prices

#### Why This Approach ([rules] Ladder)
1. **YAGNI:** No complex approval UI, no paid plugins
2. **Stdlib:** Used only WordPress/WooCommerce hooks
3. **Minimal:** Single plugin file (1 file, ~50 lines of functional code)
4. **Reusable:** Pricing logic supports per-product discounts (meta-driven when needed)
5. **Extensible:** Admin can mark users as approved by setting meta value `woo_b2b_status = 'approved'`

#### Known Simplifications
- **[rules]:** Admin approval is manual (user meta update) not UI-driven; add admin page when needed
- **[rules]:** Discount hardcoded to 20% for Office Chair; move to product meta when multi-product discounts needed

## Blueprint Configuration

Updated `staging/blueprint.json` to:
1. Activate woo-b2b plugin after WooCommerce installs
2. Create Office Chair product at 1000 EUR
3. Create three demo users:
   - `b2c`: Standard B2C customer (no B2B meta)
   - `b2b_pending`: B2B applicant, not yet approved (status: pending)
   - `b2b_approved`: Approved B2B customer (status: approved)
   - All use password: `Bench-2026!`

## Test Results
All checks pass:
- Guest, B2C, B2B pending: 1000 EUR (both page and cart)
- B2B approved: 800 EUR (both page and cart)
- Registration form includes company and VAT fields
