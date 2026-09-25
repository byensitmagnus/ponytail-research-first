# B2B Implementation Decisions

## Architecture

**B2B Pricing Solution**: Custom mu-plugin (`wp-content/mu-plugins/b2b.php`)

### Why no external plugins?

Reviewed options for B2B registration fields and tiered pricing:
- WooCommerce natively supports custom registration fields via `woocommerce_register_form_end` hook
- WooCommerce pricing filters (`woocommerce_product_get_price`) allow per-user pricing
- No established free WordPress.org plugin covers both requirements well (most paid-tier features)
- Custom mu-plugin is 100 lines, testable, no dependencies, fully under our control

### Implementation approach ([rules] lazy):

1. **Registration fields**: Hook into WooCommerce registration form to add company name and VAT number fields
2. **Field persistence**: Save as user meta on registration via `woocommerce_created_customer` hook
3. **B2B approval workflow**: Simple user meta flag (`b2b_approved`) set by admin code or direct meta updates
4. **Dynamic pricing**: Hook `woocommerce_product_get_price` to return B2B price (stored as `_b2b_price` product meta) when:
   - User is logged in
   - User has `b2b_approved` meta flag set to 1
5. **Demo setup**: Blueprint.json creates three test customers:
   - `b2c`: Normal B2C customer (no B2B fields, no approval)
   - `b2b_pending`: Applied for B2B (has company/VAT meta, not approved yet)
   - `b2b_approved`: Approved B2B customer (has company/VAT meta + approval flag)

## Third-party dependencies

**None**. Solution uses only:
- WooCommerce 11.1.2 (already required)
- WordPress hooks and filters (core)
- User meta API (core)
- Product meta API (core)

No paid plugins, premium tiers, or add-ons.

## Product setup

Office Chair product in blueprint:
- Regular price: 1000 EUR (for guests, B2C, and unapproved B2B)
- B2B price meta: 800 EUR (applied only to approved B2B customers)

## Known simplifications

- **No admin UI for B2B management**: Approval done via direct meta updates in blueprint or admin code. For production, could add a WooCommerce admin page via custom code.
- **No email notifications**: B2B applications don't trigger emails. Could add via `updated_user_meta` hook if needed.
- **No expiration on approval**: Once approved, customer stays approved indefinitely. No automated revocation.

Mark for future expansion: `[rules]: admin UI, email notifications, approval expiry if scaled`
