# Research-first benchmark: report

Status on 2026-09-25, evening: the 16 runs moved from Codex (plan quota) to
Claude Haiku 4.5 subagents (Amendment 1). All 16 ran and were graded blind,
but **only pair 1 (2 runs) is clean**: from pair 2 on, the orchestrating
session's own instruction files, the fork repo's `AGENTS.md` with the research
rung among them, reached the subagents of **both** arms. Those 14 runs are
excluded (kept in `results/excluded/`) and, by decision, not re-run on Haiku
(section 7). Nothing below supports a claim
that the research step makes agents better or worse.

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

Level switching, live in Codex (`results/probes/level-switch-live.json`): with
the pre-registered fork (`210b272`), `/ponytail ultra` was reported as "full"
on the next resumed turn and `/ponytail off` was "active at full level" again.
Root cause, inherited from upstream: SessionStart fires on resume and compact
too, and `ponytail-activate.js` always wrote the default level, so a resume or
`/compact` reset the chosen level and switched ponytail back on after "stop
ponytail". Fixed in 4.10.4 (resume/compact keep the chosen level, including
off); `tests/level-persist.test.js` fails on the old hook and passes on the
fix; the same live check then answered "ultra" and "No, Ponytail is off".

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
`~/.claude/skills`. ZCode's own CLI lists all seven skills. Live sessions were only
possible in Codex: the Claude Code, Kimi and Grok CLIs are not logged in or
have no model configured on this machine, the ZCode CLI has no model
configured, Cursor has no headless agent installed and screen control only
gets click access to IDEs, and screen control of Kimi Desktop and ZCode was not
granted.

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

## 7. The 16 runs on Claude Haiku 4.5 (Amendment 1)

Codex was at 96% of its weekly window, so the user switched the agent to
Claude Haiku 4.5 subagents started by a Claude Code session. Tasks, ground
truth, acceptance checks, order and blind grading are unchanged. Each arm's
rules are the exact text its SessionStart hook injects (`results/haiku-rules/`,
upstream 5,252 chars, fork 7,951), placed at the top of a prompt that is
otherwise identical; `promptMatches` proves each subagent received its
`prompt.txt`.

### Clean runs: pair 1 (t3-node-vat, rep 2)

| Arm | Acceptance | Blind grade | Minutes | Output tokens | Lines added | Searches | What went wrong |
|---|---|---|---|---|---|---|---|
| upstream | 24/28 | partial | 3.1 | 15 k | +366 | 0 | official SOAP endpoint, offline tests; DE, NL, XI and AT formats reject real numbers |
| fork | 14/28 | fail | 4.8 | 16 k | +500 | 0 | calls `…/vies/api/checkVat`, which does not exist, so nothing is ever verified; DECISION.md calls it the official REST endpoint |

Neither arm looked anything up. On this pair the fork arm's rung 7 did not
start any research, and its invented endpoint is the failure research was
meant to prevent.

### Excluded: pairs 2–8 (14 runs), and why

The orchestrating session ran in the fork repo. Claude Code gives a subagent
the parent session's instruction files, and from pair 2 on those included the
repo's `AGENTS.md` (the fork ladder, rung 7 included) and the project memory
index, in **both** arms. The contamination check looked only at hook
injections and missed it; `finish` now lists every instruction file except
the user's global `CLAUDE.md` and marks a run contaminated when one carries
either ladder (`tests/research-benchmark.test.js`). The runs are kept, with
their blind grades, in `results/excluded/` and `results/excluded/round1-grading/`.
They are not evidence for the research question. What they show:

| | upstream | fork |
|---|---|---|
| Blind grade, 7 runs each | 1 pass, 3 partial, 3 fail | 5 partial, 2 fail |
| Runs that searched at all | 0 | 2 (t3: 4 `gh search repos` + 1 `npm search`; t2: 1 `gh search repos`) |
| Pages opened / third-party code read | 0 / 0 | 0 / 0 |

With rung 7 in context for both arms, Haiku researched in 2 of 14 runs and
never opened what it found. The run that searched most (t3) still failed and
claimed it had "examined candidate implementations". Unbacked research claims
appear in **both** arms (DECISION.md files that say plugin options were
reviewed, with no look-up in the transcript); two upstream runs called
GPL-2 fuzzywuzzy "MIT".

### Also found and fixed in the harness during these runs

- The Windows task `.output` file is empty; the transcript is
  `subagents/agent-<id>.jsonl`. `finish` refuses an empty transcript.
- Agents may commit; diffs are taken against the baseline commit.
- A new Claude session resets `~/.claude/.ponytail-active` to `full`; a
  subagent that resumed after its own background job got the hook ruleset
  (t1 fork r2, re-run). The flag is now held read-only at `off` during runs.
- The t1 staging check left a ~250 MB WordPress site in TEMP after every run
  (killed with `taskkill /F`); 24 of them filled the C: drive and both runs of
  one pair hit `ENOSPC` (re-run). The check now gives Playground a private
  TEMP and deletes it; verified reference 8/8, nothing left behind.
- Line counts skip virtualenvs, `site-packages`, `node_modules`, `dist`
  (a `venv/` had counted 149,739 lines); `gh search`/`npm search` count as
  searches, `pip show` (local metadata) does not count as research.

### Cost

Haiku subagents run inside the user's Claude plan; no paid service was
created. Summed over every model call of the 16 runs: 3.4 k uncached input,
27.6 M cache-read, 0.86 M cache-write and 0.20 M output tokens. The 4 blind
graders used a further 0.51 M tokens of final context. At Haiku 4.5's API list
price this would be roughly $5 for this round of 16 runs (upstream $2.45, fork $2.39)
plus $1 for the excluded re-runs.

### Pairs 2–8 are not re-run on Haiku (decision)

A clean re-run needs an orchestrating Claude Code session started in a folder
without project instructions; this session could not be moved (the move was
requested twice and never applied, and renaming the files on disk does not
change what a running session hands its subagents). It was also judged not
worth it: in the 14 excluded runs **both** arms had the research rung in
context, the fork arm twice, and Haiku still searched in only 2 of them and
opened nothing. A clean re-run can mainly show that the upstream arm, without
the rung, also does not research, which would not change the verdict.
Everything for it stays prepared (`subagent.mjs prepare 2`…`8`, prompts
unchanged, `finish` rejects a contaminated run) should a publishable
comparison be wanted.

The more informative next experiment is a stronger model: in the Codex pilot
both arms searched. Suggested: t1 and t3 (the two tasks where research
matters most), both arms, two reps, with the current fork rules (4.10.4,
which carries the look-up rule for `Research:` lines), from a clean
orchestrator folder.

## 8. Open problems

- The research rung does not make Haiku 4.5 research: 0 of 1 clean fork run,
  2 of 7 fork runs with the rule in context twice. A stronger model (the
  Codex pilot searched in both arms) may behave differently; measured here
  only on Haiku.
- Unbacked "Research:" and "reviewed alternatives" claims happen in both arms.
  The 4.10.3 rule ("only name a candidate you looked up; mark the rest
  `(from memory, unverified)`") targets this but is not in the pinned fork
  arm, so it is not measured.
- Live activation outside Codex (Claude Code, Cursor, Kimi, Grok, ZCode) is
  verified up to installation and hook/skill output only.

## 9. Verdict

- **Daily driver: yes.** Installs and updates pull the fork on every host
  tested, the rule reaches Codex sessions live, it stayed out of a small
  bugfix, `/ponytail` levels and off survive resume and compact (4.10.4), and
  the tests and CI are green. It did not make any run worse in a way the
  clean pair can attribute to it.
- **Broad promotion: no.** There is no evidence that the research step helps:
  on Haiku 4.5 it rarely fires, and when it fired the result was not better.
  The claim in the README and any promo must stay at "asks the agent to look
  first", not "makes agents better".
