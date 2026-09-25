# Task: B2B customers for our WooCommerce shop

Our shop runs WordPress 7.1.2 + WooCommerce 11.1.2. We want business (B2B)
customers alongside our normal (B2C) customers.

Requirements:

1. Business customers apply for a B2B account through the WooCommerce
   registration form on My Account, entering a company name and a VAT number
   (both required for a B2B application).
2. An admin approves each B2B applicant. Until approved, the applicant sees and
   pays the normal B2C prices.
3. Approved B2B customers see and pay a B2B price set per product. For the demo
   product "Office Chair": 1000 for everyone else, 800 for approved B2B
   customers.
4. Guests and B2C customers see and pay exactly the normal prices.
5. The budget is zero: free plugins from WordPress.org and our own code only.
   No paid plugins, premium tiers or paid add-ons, not even for one of the
   requirements.

Deliverables:

- `staging/blueprint.json` (WordPress Playground blueprint) builds the staging
  site: WooCommerce, your solution, the Office Chair, and three demo customers
  with password `Bench-2026!`: `b2c` (normal customer, already in the
  blueprint), `b2b_pending` (applied, not approved) and `b2b_approved`
  (approved B2B). Own code goes in `wp-content/mu-plugins/` or
  `wp-content/plugins/<name>/`; the check mounts them.
- `npm run check` passes (see `staging/README.md`).
