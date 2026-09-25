# Staging check

`npm run check` builds a throw-away staging site with WordPress Playground from
`staging/blueprint.json` (WordPress 7.1.2, WooCommerce 11.1.2, PHP 8.3), mounts
this repo's `wp-content/mu-plugins/` and each folder in `wp-content/plugins/`,
and then checks, over HTTP:

- the Office Chair price on the product page **and** the price the cart
  charges (WooCommerce Store API) for: a guest, `b2c`, `b2b_pending`,
  `b2b_approved` (all users use the password `Bench-2026!`);
- that the registration form on My Account has a company field and a VAT
  number field (field `name` contains `company` / `vat`).

Expected: 1000 for guest, `b2c` and `b2b_pending`; 800 for `b2b_approved`.

The first run downloads WordPress and WooCommerce and takes a few minutes.
