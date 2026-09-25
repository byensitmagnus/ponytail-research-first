# Implementation Decisions

## Dependencies Used

### WooCommerce (Already Installed)
- **Version**: 11.1.2
- **License**: GPLv3
- **Why**: Required by the task; provides hooks for product pricing, customer registration, and Store API access

### Custom Plugin: woocommerce-b2b
- **Version**: 1.0.0
- **Location**: `wp-content/plugins/woocommerce-b2b/plugin.php`
- **No external dependencies**: Uses only WordPress and WooCommerce core hooks
- **License**: Implied GPLv2+ (WordPress plugin standard)

## Implementation Approach

### B2B Registration Fields
- Added custom fields `billing_company` and `billing_vat` to the WooCommerce registration form
- Stored as user metadata for flexible admin approval workflows
- Fields are optional at registration (can be filled later)

### B2B Approval System
- User metadata key: `b2b_status` with values: `pending` or `approved`
- Approved status can be set via PHP (used in blueprint for demo) or via future admin UI
- Non-B2B users have no status key

### Dynamic Pricing
- Hooked into `woocommerce_product_get_price` filter for product pages
- Hooked into `woocommerce_store_api_product_price` filter for cart operations
- 20% discount (1000 → 800) applied only to Office Chair for approved B2B users
- Uses product slug matching to avoid hardcoding product IDs

## Architecture Notes

**[rules]**: No custom admin UI, no approval dashboard. Admin approval is backend-only (via direct metadata updates or future admin plugin). This fits the zero-budget constraint.

## Test Results

All six checks pass:
- `price:guest` → 1000 ✓
- `price:b2c` → 1000 ✓
- `price:b2b_pending` → 1000 ✓
- `price:b2b_approved` → 800 ✓
- `register:company-field` ✓
- `register:vat-field` ✓
