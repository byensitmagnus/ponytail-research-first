# Research-first benchmark

Does the fork's research-first rule help a coding agent on real feature tasks?
Method, tasks, verified ground truth and grading order are fixed in
[PREREGISTRATION.md](PREREGISTRATION.md), committed before any run. Results and
the full write-up land in [REPORT.md](REPORT.md) and `results/`.

## Layout

| Path | What |
|---|---|
| `tasks/<task>/TASK.md` | The prompt (plus the environment note in `harness/lib.mjs`) |
| `tasks/<task>/fixture/` | Starting code the agent gets |
| `tasks/<task>/accept/` | Hidden acceptance check, run outside the sandbox after the agent stops |
| `tasks/<task>/reference/` | A reference solution that passes the check (never shown to agents) |
| `harness/run.mjs` | `prepare` (isolated arms, no model calls), `plan`, `run <pairs>`, `accept <run ids>` |
| `harness/evidence.mjs` | Searches, pages, registry look-ups and third-party reads from the transcript; real dependencies from the manifests, verified in their registries |
| `results/<run>/` | `run.json`, `events.jsonl.gz` (full transcript), `diff.patch`, `DECISION.md`, `accept.json`, `evidence.json` |

## Reproduce (Windows)

Needs Codex logged in with ChatGPT, the Codex desktop app's `codex.exe`
(0.155+; the npm CLI 0.153 is refused `gpt-6-sol`), Node 24, and a CPython 3.12
the Codex sandbox users can execute (copy it to `<BENCH_ROOT>/tools/python312`
and grant the `Users` group read/execute on that folder only).

```bash
node benchmarks/research/harness/run.mjs prepare
```
```bash
node benchmarks/research/harness/run.mjs run 1
```
```bash
node benchmarks/research/harness/run.mjs accept t3-node-vat__fork__r2 t3-node-vat__upstream__r2
```
```bash
node benchmarks/research/harness/evidence.mjs t3-node-vat__fork__r2 t3-node-vat__upstream__r2
```

Set `CODEX_EXE` to the `codex.exe` path. Scratch data goes to `BENCH_ROOT`
(default `%USERPROFILE%\ponytail-bench`). Each run copies `auth.json` into its
own Codex home and deletes it when the run ends; the sandbox setup folders are
junctions to your existing `~/.codex` ones, nothing is copied from them.

The harness's own logic is tested without model calls in
`tests/research-benchmark.test.js`.
