# Research-first benchmark: pre-registration

Written and committed before any benchmark run. Results that contradict it are
reported, not re-scored.

## Question

Does the fork's research-first rule (rung 7 and `/ponytail-research`) lead a
coding agent to better solutions on feature-sized tasks than upstream Ponytail,
judged on quality first?

This is a **pilot**: 4 tasks × 2 variants × 2 runs = 16 runs. It can show
failure modes and direction. It cannot support a percentage claim, and none
will be made from it.

## Variants (the only difference between arms)

| Arm | Plugin | Commit | Research rung in the injected ruleset |
|---|---|---|---|
| upstream | DietrichGebert/ponytail | `e3ba2aa` (v4.10.0) | no |
| fork | byensitmagnus/ponytail-research-first | `210b272` (v4.10.2, the version in daily use) | yes |

Verified without model calls by `harness/run.mjs prepare` →
`results/variants.json`: each arm's isolated Codex home has only its own
plugin, no global `AGENTS.md`, no other plugins, and its installed
SessionStart hook injects the research rung (fork) or not (upstream).

## Agent and environment (identical for both arms)

- Codex CLI `0.155.0-alpha.16.4` (the desktop app's bundled binary: the npm CLI
  0.153.3 is refused `gpt-6-sol` by the server), model `gpt-6-sol`, reasoning
  `medium`, ChatGPT login (no API key).
- `codex exec --json`, approval `never`, `workspace-write` sandbox (Windows
  elevated sandbox, the same mode the user runs daily), network on, live web
  search on. Features `apps`, `browser_use`, `computer_use`, `memories` off.
- Each run gets a fresh `CODEX_HOME` (copied from its arm's template) and a
  fresh working folder with the task's starting code as a git baseline. All
  writable caches (npm, pip, temp, tool home) live in the run's own `.bench/`.
  `GH_*`, `GITHUB_*`, `CLAUDE*`, `CURSOR*`, `ZCODE*`, `PONYTAIL*`, `OPENAI*`,
  `ANTHROPIC*` variables are removed; `gh` is unauthenticated.
- Same prompt text (`tasks/<task>/TASK.md` + the environment note in
  `harness/lib.mjs`), same 30-minute limit.
- Known limitation, same for both arms: `curl.exe` and PowerShell HTTPS fail in
  the sandbox (Windows TLS under the sandbox users); the prompt says to use web
  search, Node, npm or Python for HTTP.

## Order

`plan()` in `harness/lib.mjs`, seed 20260925: the 8 (task, run) pairs in a
seeded shuffle; within a pair both arms run side by side, launch order from the
same seed (4 pairs each arm first). Pair 1 is the pilot.

## Tasks, traps and verified ground truth (2026-09-25)

**t1-wc-b2b** (WordPress/WooCommerce/PHP). B2B applications with company +
VAT, admin approval, per-product B2B price, zero budget.
- Trap: free vs paid. B2BKing 5.2.60 free = customer groups, per-group prices,
  account approvals hub; business registration forms with custom fields are
  Premium (WordPress.org listing, plugin SVN `public/class-b2bking-public.php`).
  Wholesale Suite 2.2.9 free = wholesale price per role; registration and
  approvals are the separate "Wholesale Lead Capture" product.
- Leak, disclosed up front: the fork's skill text uses this exact B2BKing
  example. t1 results are reported with that caveat.
- Acceptance: the pristine `staging/check.mjs` (WordPress Playground: WP 7.1.2,
  WooCommerce 11.1.2) logs in as guest, `b2c`, `b2b_pending`, `b2b_approved`
  and reads both the product-page price and the price the cart charges (Store
  API); checks the registration form for company and VAT fields; lists every
  plugin's source. Reference solution passes 6/6, also inside the sandbox.

**t2-py-fuzzy** (Python). Typo-tolerant search over 4,952 products, p95 < 50 ms,
permissive licences only.
- Traps: licence (fuzzywuzzy GPLv2; Levenshtein / python-Levenshtein
  GPL-2.0-or-later; thefuzz 0.22.1 is MIT; rapidfuzz 3.14.6 MIT; jellyfish MIT)
  and "popular library, default settings" (rapidfuzz `WRatio` finds 8/15 hidden
  queries; `QRatio` 15/15 at 0.4 ms). Stdlib `difflib` finds 15/15 but p95 ≈ 230–270 ms.
- Acceptance: fresh venv with only the solution's `requirements.txt`, its own
  tests, 12 hidden typo queries + 3 exact queries, p95 latency, licence of
  every installed distribution. Reference 20/20.

**t3-node-vat** (Node.js). EU VAT check against the official VIES service,
format validation for EU-27 + XI, never breaking checkout.
- Trap: VIES answers HTTP 200 with the error in the body when a member state
  is busy or down (`actionSucceed:false` / `userError:"MS_MAX_CONCURRENT_REQ"`
  with `isValid:false` on the GET endpoint), so reading `isValid` alone marks a
  valid number invalid. Shapes captured live on 2026-09-25.
- Acceptance: own tests with the network blocked, then hidden checks with a
  mock that serves the real REST POST, REST GET and SOAP shapes; 11 real VAT
  numbers (VIES-valid today) + one checksum-valid XI number. Reference 28/28.

**t4-react-grid** (React/TypeScript). Sorting, filtering, pagination, grouping
with subtotals, `.xlsx` export, free/open-source only, `npm audit` high clean.
- Traps: AG Grid row grouping and Excel export are Enterprise only
  (`ag-grid-enterprise` 36.2.0 licence "Commercial" exports `RowGroupingModule`
  and `ExcelExportModule`; `ag-grid-community` MIT exports neither). npm `xlsx`
  0.18.5 (last npm publish 2022) has a high-severity advisory; `exceljs` 4.4.0
  moderate only; `write-excel-file` 4.1.1 and `@tanstack/react-table` 9.2.4 clean.
- Acceptance: clean install, build, audit, licence scan of every installed
  package, and the solution's real `.xlsx` unpacked and checked for customers
  and subtotals. Reference 8/8.

## Grading, in this order

1. **Requirements**: every stated requirement met, including free vs paid.
   A short solution missing a feature is a failure. A popular dependency with
   the wrong feature set, a paid tier, or a forbidden licence is a failure.
2. **Integration works**: the task's acceptance run (its checks above).
3. **Dependency choice justified**: every dependency actually added (from
   `package.json`, `requirements.txt`, the blueprint) exists at that version
   with that licence in its registry, and `DECISION.md` names it with version
   and licence. Research is credited only from the transcript: web searches,
   pages opened, registry look-ups and third-party code read, before the first
   file change. A written `Research:` line alone counts for nothing.
4. **Cost**: lines added, wall time, tokens, plan usage.

Outcome per run: **pass** (1 and 2 fully met, 3 without a false claim),
**partial** (integration works but a requirement or claim fails), **fail**.
The qualitative part of 1 and 3 (for example: is the approval flow real, is a
licence claim false) is judged blind: runs are relabelled A/B before an
independent grader sees them.

## Reporting

Every run is reported, including runs where the fork is slower, costlier or
worse. Tables per task and arm; no pooled percentages. Transcripts, diffs,
acceptance output and evidence are committed under `results/`.

## Budget and stop rule

Pilot first (pair 1, both arms): record tokens, time and the ChatGPT plan's
rate-limit usage. Estimate all 16 runs from it. Cap: stop if the estimate or
the running total would use more than 50 percentage points of the weekly plan
window, or if a single run exceeds 30 minutes (killed by the harness). No new
paid service, key or subscription is created.


## Amendment 1 (2026-09-25, before any run of this agent)

The Codex runs could not proceed: the ChatGPT plan was at 96% of its weekly
window (pilot and probes are kept in `results/pilot/` and `results/probes/`).
On the user's instruction the 16 runs use **Claude Haiku 4.5 subagents**
instead, spawned by the orchestrating Claude Code session. Everything else in
this document (tasks, ground truth, acceptance checks, order, grading) stands.

What changes, identically for both arms:
- Agent: Claude Code `general-purpose` subagent, model Haiku 4.5, the session's
  tools (Bash, PowerShell, file tools, WebSearch, WebFetch). No sandbox: runs
  use the real shell, in their own folder under `%USERPROFILE%\ponytail-haiku`,
  away from the repository and from the reference solutions.
- Ruleset: the exact text each arm's SessionStart hook injects in Claude Code
  (`results/haiku-rules/{upstream,fork}.txt`, 5,229 vs 7,914 chars, only the
  fork's has the research rung) is placed at the top of the prompt. The prompts
  differ only in that block (tested in `tests/research-benchmark.test.js`).
- The installed Ponytail plugin's SubagentStart hook would inject the fork's
  ruleset into every subagent; the session's ponytail flag is set to `off`
  during the runs so it injects nothing. Each transcript is checked for a hook
  injection (`contaminated`) and for reads of benchmark or reference files
  (`leaks`); an affected run is reported and re-run.
- Both arms still receive the user's global Claude Code instructions
  (`~/.claude/CLAUDE.md`), which cannot be removed from subagents and which
  contain their own research nudge ("for a significant new subsystem or new
  dependency: look at maintained GitHub projects"), plus the session's skill
  list (including `ponytail-research`). The prompt forbids the Skill and Agent
  tools. **This changes the question**: from "does the fork help a neutral
  agent" to "does the fork's ruleset add anything on top of this user's own
  setup". Results are reported as that.
- `gh` is logged in; read-only use is allowed, writes are forbidden and
  scanned for (`ghWrites`). HTTPS works from every tool (no sandbox).
- No wall-clock kill inside a subagent: runs over 30 minutes are stopped by
  the orchestrator.

Harness fixes made before these runs (t1 staging check): it left the
Playground server running after every check (async `taskkill` followed by
`process.exit`), and the first Store API request after boot could return an
empty body. Both fixed; the reference passes 6/6 twice in a row and no
server is left behind.

## Amendment 2 (2026-09-25, after round 1, before the re-run of pairs 2–8)

Round 1 showed that a Claude Code subagent receives its parent session's
instruction files. The parent ran in the fork repo, so from pair 2 on both
arms also got the repo's `AGENTS.md` (the fork ladder) and the project memory
index. Pairs 2–8 are therefore excluded and re-run; pair 1 is kept (its
subagents got only the user's global `CLAUDE.md`, identical in both arms).

- Contamination now also means: any instruction file other than the user's
  global `CLAUDE.md` that carries either ladder. Checked per run from the
  transcript; a contaminated run is excluded and re-run.
- The orchestrating session runs from a folder without project instructions.
- `~/.claude/.ponytail-active` is held read-only at `off` for the whole run,
  so no new Claude session can switch the hook back on mid-run.
- Tasks, prompts, acceptance checks, order and grading are unchanged; the t1
  staging check only cleans up its temporary WordPress site now.

Decision after Amendment 2 (same evening, no re-run started): pairs 2–8 are
not re-run on Haiku. The orchestrating session could not be moved to a folder
without project instructions, and the excluded runs already had the research
rung in context in both arms without it changing behaviour (REPORT.md
section 7). The comparison therefore rests on pair 1 only and is reported as
inconclusive; a re-run stays prepared.
