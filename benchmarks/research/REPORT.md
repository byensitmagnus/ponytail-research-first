# Research-first benchmark: report

Status on 2026-09-25: harness, tasks, ground truth and grading are
pre-registered and validated; the pilot and four activation probes ran; **the
16-run benchmark itself has not run yet** because the ChatGPT plan it uses is
at 96% of its weekly window (see *Decision needed*). Nothing below supports a
claim that the research step makes agents better or worse. It shows the
benchmark works, where the rule behaves as intended, and two problems it found.

## 1. State of the fork before this work

| Check | Found | Now |
|---|---|---|
| Latest `main` | `210b272`, no open PRs | unchanged; this work is Draft PR #1 |
| CI on push / pull_request | **never ran**: GitHub disables workflows on a fork until the owner confirms them in the Actions tab; the API still reports the workflow `active` and Actions `enabled`. The only green run was a manual `workflow_dispatch`. | confirmed and enabled in the Actions tab; the next push to the PR branch started a `pull_request` run by itself |
| npm publishing | `publish.yml` disabled on the fork; `package.json` `private: true` | proven: `npm publish` against a dead local registry stops with `EPRIVATE`. (`npm publish --dry-run` does not check `private`, so it proves nothing.) |

## 2. Is the benchmark sound? (no model calls)

Each task's hidden acceptance check was run against a reference solution and
against the untouched starting code before any agent run:

| Task | Reference | Starting code | Notes |
|---|---|---|---|
| t1-wc-b2b | 8/8 (its 6 staging checks also pass inside the Codex sandbox) | 2/6 staging checks | WordPress Playground staging, checks product page **and** the price the cart charges |
| t2-py-fuzzy | 20/20 | 9/20 | rapidfuzz `QRatio` 15/15 queries at 0.4 ms; the default `WRatio` 8/15; stdlib `difflib` 15/15 but p95 ≈ 250 ms |
| t3-node-vat | 28/28 | 3/28 | mocks the real VIES REST POST/GET and SOAP shapes captured live |
| t4-react-grid | 8/8 | fails export | real `.xlsx` unpacked and checked |

Isolation (`results/variants.json`): each arm's Codex home has only its own
plugin, no global instructions, no other plugins; the installed hook injects
the research rung for the fork (7,914 chars) and not for upstream (5,229
chars). Live check: an isolated upstream session quotes its rung 7 as "Only
then: the minimum code that works", the fork session quotes "Already built out
there?". The harness's own logic is covered by `tests/research-benchmark.test.js`.

Harness faults found and fixed before the real runs (all would have hit both
arms equally, and would have measured the harness, not the rule):
- The npm Codex CLI (0.153) is refused `gpt-6-sol`; the desktop app's 0.155 binary is used.
- The *unelevated* Windows sandbox forbids pipes (`spawn EPERM`), which breaks
  `node --test`, Vite and tsx; runs use the elevated sandbox the user runs daily.
- The store Python cannot start under the sandbox users; a CPython 3.12 copy
  with read/execute for `Users` on that folder only.
- Node's `realpath` could not `lstat` the folder above the workspace (see pilot):
  sandbox users now get read-attributes + traverse on that folder only; the
  neighbouring Codex home stays unreadable (verified with a canary file).
- Cleaning an earlier run could have followed a junction into the user's real
  `~/.codex` sandbox folders (Node 24 does not always report junctions as
  links); junctions are now unlinked with `rmdir` first.

## 3. Pilot (pair 1: t3-node-vat, both arms, before the realpath fix)

| Arm | Acceptance | Minutes | Input tokens (cached) | Output tokens | Lines added | Web searches | Dependencies |
|---|---|---|---|---|---|---|---|
| upstream | 28/28 | 5.1 | 1.39 M (1.33 M) | 8,333 | +123 | 6 | none |
| fork | 28/28 | 5.6 | 1.60 M (1.53 M) | 10,012 | +151 (+1 in package.json) | 4 | none |

Both arms read the official VIES documentation and handled the "busy member
state answers HTTP 200 with the error in the body" trap. The fork was slower,
used more tokens and wrote more lines on this task. Both lost turns to the
realpath fault; the fork run changed `package.json` to work around it. The
pilot is kept in `results/pilot/` and pair 1 will be re-run with the fixed harness.

Blind grading of the pilot: see section 6.

## 4. Activation probes (fresh isolated sessions, `results/probes/`)

| Probe | Arm | Result |
|---|---|---|
| Bugfix: off-by-one in `paginate` | fork | 0 web searches, research skill not opened, fixed in 0.6 min, tests pass. The rule did not get in the way of a small fix. |
| Feature: GDPR cookie consent, plan only | upstream | 2 searches (EDPB, Datatilsynet); no dependency; did not consider existing consent libraries |
| same | fork | 2 searches (EDPB, Datatilsynet); no dependency; its `Research:` line names Klaro and vanilla-cookieconsent as rejected alternatives, **but the transcript shows no look-up of either** (a look-up shows Klaro's licence as `NOASSERTION`) |

In none of the five Codex sessions did the agent open `/ponytail-research` by
itself; the always-injected rung 7 does the work. The skill is effectively
opt-in (explicit `/ponytail-research` or `@ponytail-research`).

Fixed in 4.10.3 (no enforcement mechanism added): a `Research:` line may only
name candidates looked up in the session, anything else is marked
`(from memory, unverified)`; `/ponytail-research` gained an unauthenticated
GitHub REST search for when `gh` is not logged in or `curl` is blocked (true in
every run here). These fixes are not measured yet: the benchmark's fork arm is
pinned to `210b272` as pre-registered.

## 5. Installation and activation per host

See the README table *What is verified where*. Verified from the README's own
commands in empty homes: Claude Code, Codex and Grok install the fork (4.10.2
at the time: research rung, research skill, scope contract), not upstream or a
stale cache; the Cursor installer keeps other hooks on install, re-install and
uninstall; Kimi's own discovery finds all seven skills. Found and fixed: the
ZCode snippet lacked the `UserPromptSubmit` hook (so level switches could not
work); Kimi Desktop uses a private home the README did not mention; with
`merge_all_available_skills = false` a new `~/.kimi/skills` hides
`~/.claude/skills`. Live sessions were only possible in Codex: the Claude
Code CLI, Kimi CLI and Grok CLI are not logged in on this machine, and Cursor
and ZCode have no headless mode here.

## 6. Blind grading of the pilot

An independent grader (subagent, `GRADER.md`, runs relabelled) graded both
pilot runs before the labels were revealed (`results/pilot/grading.json`):

| Run | Arm | Outcome | Requirements | What the checks did not catch |
|---|---|---|---|---|
| run-4b9764 | upstream | pass | R1–R6 met | generic `reason` text; old IE `+`/`*` format not accepted; a real 10 s wait in one test |
| run-72b494 | fork | pass | R1–R6 met | XI government/health numbers (`GD###`, `HA###`) rejected as malformed; looser BE, SE and FR patterns; an undisclosed `package.json` change the task did not need |

On this one task the upstream run's format table was the more accurate one.
In **both** arms the agent cited a format source (Skatteverket, revenue.ie) that
the transcript shows it never opened: unbacked claims are not a fork-only
problem. The grader also caught a blinding leak (run folder names in
`last.md` file links); `harness/blind.mjs` now scrubs them.

## 7. Decision needed: run the 16 runs

- Measured: the pilot pair (≈ 3.0 M input tokens, 18 k output) and the three
  probes (≈ 0.46 M) moved the plan from 96% to 96% (under one point; Codex
  reports whole percents). The user's own Codex work moved it 89% → 96% during
  the same day.
- Estimate for all 16 runs (8 pairs; t1 and t4 run longer than t3): 5–13
  points of the weekly window.
- Available now: 4 points (the harness brakes at 98% so the user keeps some).
  Weekly window resets 2026-09-26 around 12:30 local time.
- Cap (pre-registered): stop if the estimate or running total exceeds 50 points.

Options: run after the reset (recommended, `node harness/run.mjs run 1 2 3 4 5
6 7 8`, then `accept`, `evidence`, `blind`, grading), or buy Codex credits to
run now. No paid service was created.

## 8. Verdict

- **Daily driver: yes.** Installs and updates pull the fork on every host
  tested, the rule reaches Codex sessions live, it stayed out of a small
  bugfix, and the test suite and CI are green. Hosts other than Codex are
  verified up to installation and hook/skill output, not in a live session.
- **Broad promotion: not yet.** The benchmark that would show whether the
  research step helps has not run. The pilot shows both arms passing, the fork
  about 10% slower with more tokens, and a blind grader rating the upstream
  run's solution as slightly more accurate; the probes show one fork research
  claim not backed by a look-up. Promote after the 16 runs, on their numbers.
