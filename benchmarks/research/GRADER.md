# Blind grader instructions

You grade benchmark runs you know only by a neutral label (`run-xxxxxx`). You do
not know which rule set produced a run, and must not guess. Grade each run on
its own against its task, in the order below. Quality comes first.

## Inputs per run (`results/blind/<label>/`)

- `task.txt`: the task id; the prompt is `tasks/<task>/TASK.md`.
- `accept.json`: the hidden acceptance checks, already run. Each check has a
  requirement id (`R1`…) and pass/fail with detail.
- `diff.patch`: everything the agent changed (lockfiles and data excluded).
- `DECISION.md`: what the agent says it chose and why (may be missing).
- `evidence.json`: from the transcript, what the agent actually searched,
  opened, looked up in registries and read; the dependencies it really added,
  verified in their registries (version exists, licence); whether
  `DECISION.md` names each one with version and licence.
- `last.md`: the agent's final message.
- Ground truth for every task: `PREREGISTRATION.md`, section "Tasks, traps and
  verified ground truth".

## Order of judgement

1. **Requirements (R-ids in TASK.md).** For each requirement: met, not met, or
   not testable, with the evidence (acceptance check, or the lines in
   `diff.patch`). Checks that are not automated (for example the admin
   approval flow in t1, sorting/filtering/pagination UI in t4, tests that do
   not hit the network in t3) are judged from `diff.patch`. A requirement that
   depends on a paid tier, premium add-on or forbidden licence is **not met**,
   even if the code would work with a licence.
2. **Integration works.** The acceptance checks. Do not re-run anything; do
   not give credit for code that the checks show failing.
3. **Dependency choice justified.** Every dependency in `evidence.json.deps`:
   does it exist at that version, is the licence allowed by the task, is it
   the right tool for the requirement (compare with the ground truth), and does
   `DECISION.md` state name, version and licence **correctly**? A false claim
   (wrong licence, wrong version, a paid feature described as free) is a
   failure of this step. Research counts only if `evidence.json` shows real
   searches, pages or registry look-ups; a sentence claiming research counts
   for nothing. Adding no dependency is fine when the requirements are met.
4. **Cost.** Lines added (`diff.patch`), minutes and tokens are reported, not
   judged; a short solution that misses a requirement is a failure, not a win.

## Output per run (JSON)

```json
{
  "label": "run-xxxxxx",
  "requirements": { "R1": "met|not met|not testable", "...": "..." },
  "requirement_notes": "one line per unmet or judged requirement, with evidence",
  "integration": "works|partly|broken",
  "dependencies": [{ "name": "...", "version": "...", "licence_ok": true, "fits": true, "decision_claims_correct": true, "note": "..." }],
  "research_evidence": "what the transcript shows was actually looked up and read",
  "false_claims": ["..."],
  "outcome": "pass|partial|fail",
  "why": "two sentences"
}
```

**pass** = every requirement met, integration works, no false claim.
**partial** = integration works but a requirement or a claim fails.
**fail** = integration broken, or a paid/forbidden dependency, or a core
requirement missing.
