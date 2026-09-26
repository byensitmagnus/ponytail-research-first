---
name: ponytail-research
description: "Research-first before building: find what already solves it on GitHub, plugin stores, and competitors, then reuse, adapt, or build."
homepage: https://github.com/byensitmagnus/ponytail-research-first
license: MIT
---

Find the thing that already exists before writing the thing. The goal is the
smallest amount of new code: install it, adapt it, or copy its principle.
One pass, about twenty minutes including one competitor teardown, then a decision.

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
`gh` not logged in, or `curl` blocked? The same search works unauthenticated
(10 requests a minute) from any HTTP client:
```bash
node -e "fetch('https://api.github.com/search/repositories?q=<terms>&sort=stars&per_page=10').then(r=>r.json()).then(j=>j.items.forEach(i=>console.log(i.stargazers_count,i.full_name,i.pushed_at,i.license?.spdx_id)))"
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
battle-tested spec. Study what you can lawfully see as a user:
- Web app or shop: the UI and flows, page source, network tab, public JS,
  theme and plugin names in the HTML (`/wp-content/plugins/<slug>/`).
- Desktop app you are licensed to use: its behavior, docs, settings, and the
  config, JSON, or SQLite it writes under `%APPDATA%`,
  `~/Library/Application Support`, or `~/.config`. Code it ships as plain
  source (a plugin zip, unobfuscated JavaScript) can be read.
- Mobile app: the store listing (screenshots, description, version history,
  permissions). App Store builds are encrypted; don't try to crack them.

Competitor teardown, for the one or two products that matter most:

1. Download the build from the vendor or the official store; keep the URL
   and a SHA-256 of what you got.
2. Unpack without running: `7z l` / `7z x` for installers (NSIS, Inno,
   MSI, zip), then `npx @electron/asar extract resources/app.asar out/` for
   Electron apps. Look for `package.json`, the renderer HTML, bundles, and
   the config, manifest, or SQL files it ships.
3. Read what ships in readable form: find the handlers for your feature
   (search the bundle for the feature's words, file paths, registry keys,
   IPC channel names) and note file and function names.
4. Capture the UI into the working folder: screenshots of the running app,
   the renderer HTML opened in a browser, or the store listing images.
5. Running or installing the build changes the machine: ask the user first,
   unless you are in a sandbox or VM.
- Decompiling binaries, deobfuscating, or decrypting is not assumed allowed.
  In the EU a lawful user may observe, study, and test a program while
  running it (Directive 2009/24/EC, Art. 5(3)); decompiling is allowed only
  for interoperability, under the conditions of Art. 6. Elsewhere a license
  can forbid more. Unsure → don't, and ask.
- Take the data model, flow, edge cases, and UX. Not the code.

## 3. Score the candidates

| Signal | Legit | Read the code first |
|---|---|---|
| GitHub stars | 1k+ | under 100 |
| Last push | this year | over 12 months |
| Plugin installs | 10k+, rating 4.5+ | under 1k or no ratings |
| License | MIT, Apache-2.0, BSD; GPL inside GPL projects (WordPress) | none = all rights reserved = inspiration only |
| Health | tests or CI, issues answered | open issues piling up, no tests |

Stars are a filter, not proof. A popular project can still fit the task
badly. A candidate you remember but did not look up in this session is a
hypothesis: look it up before it goes in the table, or mark it
`(from memory, unverified)`. For the top one or two, read the files that implement the feature
(not the README), check which features sit in a paid tier, and record:
- the exact version, tag, or commit you read
- the license at that version
- the files or functions you read
- why it fits this task, or where it doesn't

Then write the principle in two lines: where the data lives, which hook or
extension point it uses, which edge cases it handles.

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
- Official download sources only. Reading and unpacking need no execution
  and no permission; ask the user before running or installing a download,
  unless you are in a sandbox or VM.
- Never bypass licensing, DRM, or obfuscation, and never break a site's terms
  to scrape it. No decompiling or decrypting unless the license and the law
  clearly allow it.
- Supply chain: check the maintainer, the exact package name (typosquats),
  and install or postinstall scripts before adding anything.
- Never paste secrets, credentials, or customer data into a third-party tool.

## Output

```
## Research: <feature> (<stack>)
| Candidate | Version / commit | Signal | License | Fit |
|---|---|---|---|---|
| <owner/repo or slug> | <tag, version, or sha> | ★ / installs, last push | <license> | covers X, not Y |

Read: <files or functions read, at that version>
Teardown: <product@version, download URL, sha256> — unpacked: <what>; handlers: <files/functions>; UI: <screenshot paths>   (or: Teardown: none — <why>; an open-source project is not the teardown)
Principle: <two lines: data model, extension point, edge cases>
Decision: reuse | adapt | inspired by | build — <why it fits this task, not just its stars>
Next: <smallest integration step>
```

## Example

`/ponytail-research B2B login with wholesale prices, WooCommerce`

```
## Research: B2B wholesale prices (WooCommerce)
| Candidate | Version / commit | Signal | License | Fit |
|---|---|---|---|---|
| b2bking-wholesale-for-woocommerce | 5.2.60 | 10k installs, 4.9★ (108), updated 2026-09-11 | GPL | free: customer groups, per-group prices, account approval. Premium: B2B registration forms |
| woocommerce-wholesale-prices | 2.2.9 | 20k installs, 4.8★ (546), updated 2026-08-03 | GPL | wholesale prices per role |
| GitHub "woocommerce b2b" | — | best repo 1★ | mixed | nothing maintained |

Read: b2bking 5.2.60 public/class-b2bking-public.php. The group is user meta
`b2bking_customergroup`; the price is product meta
`b2bking_regular_product_price_group_<id>`, applied through the
`woocommerce_product_get_price` filters and `woocommerce_before_calculate_totals`.
Principle: a group on the customer plus a per-group price on each product,
swapped by WooCommerce's own price filters at render and in the cart, so the
B2C shop stays untouched.
Decision: reuse B2BKing free for groups and per-group prices. Its B2B
registration form is Premium: buy it, or let customers register normally and
approve them into the B2B group in the free customer hub.
Next: install on staging, create a "wholesale" group, price 3 products, test a B2C and a B2B login.
```

Signals from WordPress.org and its plugin SVN on 2026-09-25; re-run the search, numbers move.
