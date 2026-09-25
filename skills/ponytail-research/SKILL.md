---
name: ponytail-research
description: >
  Research-first before building: find what already solves the feature on
  GitHub (ranked by stars), in plugin and app stores (WordPress.org,
  WooCommerce, Shopify App Store, npm, PyPI), and in competitors' shipped
  products, read the code that does the work, then decide reuse, adapt,
  inspired-by, or build. Use when the user invokes /ponytail-research, says
  "research first", "is there a plugin for", "has someone built this", "find
  a repo for", "don't reinvent the wheel", "how do competitors do X", or
  before building any feature, integration, or subsystem bigger than a
  function.
argument-hint: "<feature> [stack]"
---

Find the thing that already exists before writing the thing. The goal is the
smallest amount of new code: install it, adapt it, or copy its principle.
One pass, about ten minutes, then a decision.

## 1. Pin the need

One line: feature + stack + hard constraints (platform, license, budget,
hosting). `B2B login with per-customer wholesale prices, WooCommerce, free or
one-off license, self-hosted.` No stack given → read the project to find it.

## 2. Search where it most likely exists

Platform-native first (ponytail rung 4): Shopify B2B catalogs, WooCommerce
roles, Stripe Billing, Postgres row-level security. Then, in whatever order
fits the stack:

**GitHub**
```bash
gh search repos "<feature> <stack>" --sort stars --limit 10 --json fullName,stargazersCount,pushedAt,license,description
gh search code "<distinctive API, hook, or class name>" --limit 20
gh repo clone owner/repo <scratch-dir> -- --depth 1   # read it locally
```

**WordPress / WooCommerce**: the plugin directory beats GitHub here.
```bash
curl -s "https://api.wordpress.org/plugins/info/1.2/?action=query_plugins&request[search]=<terms>&request[per_page]=10"
curl -sLO "https://downloads.wordpress.org/plugin/<slug>.latest-stable.zip"   # then unzip and read the PHP
```
Signal: `active_installs`, `rating` (0-100), `last_updated`, `tested`.

**Shopify**: native features for the plan → Shopify App Store (reviews,
"Built for Shopify" badge) → open source under github.com/Shopify (themes,
Hydrogen, app templates).

**npm / PyPI / other registries**
```bash
npm view <pkg> repository.url time.modified license   # plus weekly downloads on npmjs.com
pip index versions <pkg>
```

**Competitors**: a product that already ships the feature is a free,
battle-tested spec.
- Web app or shop: page source, network tab, public JS and source maps,
  theme and plugin names in the HTML (`/wp-content/plugins/<slug>/`).
- Electron desktop app: `resources/app.asar` → `npx @electron/asar extract app.asar out/`.
- .NET app: `ilspycmd <assembly.dll>`. Any app: the config, JSON, or SQLite it
  writes under `%APPDATA%`, `~/Library/Application Support`, or `~/.config`.
- Take the data model, flow, edge cases, and UX. Not the code.

## 3. Score the candidates

| Signal | Legit | Read the code first |
|---|---|---|
| GitHub stars | 1k+ | under 100 |
| Last push | this year | over 12 months |
| Plugin installs | 10k+, rating 4.5+ | under 1k or no ratings |
| License | MIT, Apache-2.0, BSD; GPL inside GPL projects (WordPress) | none = all rights reserved = inspiration only |
| Health | tests or CI, issues answered | open issues piling up, no tests |

Stars are a filter, not proof. For the top one or two, read the files that
implement the feature (not the README) and write down the principle in two
lines: where the data lives, which hook or extension point it uses, which
edge cases it handles.

## 4. Decide

- **reuse**: install it as is. Smallest integration, done.
- **adapt**: fork or vendor it, keep the license and attribution, change the least.
- **inspired by**: proprietary, wrong stack, or too heavy. Write your own
  with the principle you found, and name the source in the PR.
- **build**: nothing fits. Say what you checked, then climb the rest of the
  ponytail ladder.

A dependency is also cost: a few lines you can write still beat a package
(rung 6). A whole subsystem you would have to maintain loses to a maintained one.

## Guardrails

- Copy code only when the license allows it, with attribution. Proprietary
  or unlicensed code is for learning the principle, never for pasting.
- Official download sources only. Run nothing untrusted outside a sandbox or
  VM; reading files needs no execution.
- Never bypass licensing, DRM, or obfuscation, and never break a site's terms
  to scrape it.
- Supply chain: check the maintainer, the exact package name (typosquats),
  and install or postinstall scripts before adding anything.
- Never paste secrets, credentials, or customer data into a third-party tool.

## Output

```
## Research: <feature> (<stack>)
| Candidate | Signal | License | Fit |
|---|---|---|---|
| <owner/repo or slug> | ★ / installs, last push | <license> | covers X, not Y |

Principle: <two lines: data model, extension point, edge cases>
Decision: reuse | adapt | inspired by | build — <one line why>
Next: <smallest integration step>
```

## Example

`/ponytail-research B2B login with wholesale prices, WooCommerce`

```
## Research: B2B wholesale prices (WooCommerce)
| Candidate | Signal | License | Fit |
|---|---|---|---|
| woocommerce-wholesale-prices | 20k installs, 4.8★ (546), updated 2026-08 | GPL | role-based prices, wholesale role |
| b2bking-wholesale-for-woocommerce | 10k installs, 4.9★ (108), updated 2026-09 | GPL | B2B registration, groups, price tiers |
| GitHub "woocommerce b2b" | top repo 1★ | mixed | nothing maintained |

Principle: a customer role plus per-role price meta on each product; prices
swap at render and at cart, so the B2C shop stays untouched.
Decision: reuse — B2BKing covers registration and per-group prices out of the box.
Next: install on staging, create a "wholesale" group, set prices on 3 products, test B2C vs B2B login.
```

Signals from WordPress.org on 2026-09-25; re-run the search, numbers move.
