Done. Your B2B system is built and verified.

## What was delivered

**wp-content/mu-plugins/b2b-system.php** — Zero-dependency B2B plugin (175 lines of PHP):
- Registration form adds **Company Name** and **VAT Number** fields (required)
- New registrants stored as `b2b_status = 'pending'`
- Admin approves by setting `b2b_status = 'approved'` on the user
- Price filter: **800 EUR** for approved B2B on Office Chair, **1000 EUR** for everyone else

**staging/blueprint.json** — Three demo users:
- `b2c` (password: `Bench-2026!`) → regular customer → sees 1000
- `b2b_pending` → applied for B2B, not approved → sees 1000
- `b2b_approved` → approved B2B → sees 800

**DECISION.md** — Documents all decisions and zero third-party dependencies.

## Verification: all 6 checks pass

```
price:guest              ✓ 1000 (page + cart)
price:b2c               ✓ 1000 (page + cart)
price:b2b_pending       ✓ 1000 (page + cart)
price:b2b_approved      ✓ 800 (page + cart)
register:company-field  ✓ present
register:vat-field      ✓ present
```

Run `npm run check` anytime to re-verify. Commit recorded as `db9ef0d`.