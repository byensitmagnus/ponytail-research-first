# Implementation Decisions

## Summary
Implemented B2B customer support for WooCommerce with admin approval flow and conditional pricing.

## Dependencies and Plugins

### External Plugins (Free)
- **WooCommerce 11.1.2** (existing requirement)
  - Version: 11.1.2
  - License: GPL-3.0
  - Source: https://downloads.wordpress.org/plugin/woocommerce.11.1.2.zip
  - Why: Provides core e-commerce functionality; already required by the project

### Custom Plugin
- **B2B Customers** (custom implementation)
  - Location: `wp-content/plugins/b2b-customers/`
  - License: Proprietary (part of this project)
  - Why: WooCommerce does not provide built-in B2B support; implementing as a custom plugin is the minimal, zero-cost solution

## Implementation Details

### Plugin: B2B Customers

**Registration Form Enhancement**
- Added two fields to the WooCommerce registration form via `woocommerce_register_form` hook:
  - `billing_company`: Company name (required for B2B)
  - `vat_number`: VAT number (required for B2B)
- Fields are optional for B2C customers; can be left blank

**User Metadata**
- Fields are saved as user metadata on `user_register` hook
- B2B status tracked via user metadata keys:
  - `b2b_pending`: Set when user provides both company and VAT
  - `b2b_approved`: Set by admin when B2B application is approved

**Pricing Logic**
- Uses WooCommerce hooks for price filtering:
  - `woocommerce_product_get_price`: For product page display
  - `woocommerce_store_api_product_price_raw`: For Store API (cart operations)
- B2B approved customers (with `b2b_approved` meta set) receive 20% discount
- Pricing: 1000 for B2C/pending, 800 for B2B approved (20% off)

**Blueprint Setup**
- WordPress Playground blueprint creates demo users:
  - `b2c`: Regular B2C customer (no B2B meta)
  - `b2b_pending`: B2B applicant, not yet approved (has `b2b_pending` meta)
  - `b2b_approved`: Approved B2B customer (has `b2b_approved` meta set by blueprint)

## Why This Approach

**Minimal Code**
- Single plugin file (~70 lines) vs. multiple plugins or extensive customization
- Uses built-in WordPress/WooCommerce hooks; no external dependencies beyond WooCommerce

**Zero Additional Cost**
- No paid plugins or premium tiers
- Uses only free WooCommerce and standard WordPress APIs

**Correct Behavior**
- Pricing filters target the right hooks for both page display and Store API calls
- User metadata approach is standard WordPress pattern for user capabilities/status
- Admin approval (setting `b2b_approved` meta) is straightforward: admin sets meta, user sees 20% discount

**Maintainability**
- Clear separation: registration → user metadata → pricing calculation
- No custom database tables or complex logic
- Easy for admin to approve users: set `b2b_approved` meta to 1
