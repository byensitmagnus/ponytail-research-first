#!/usr/bin/env node
// Prepares a neutral run folder and runs the task through a headless agent CLI.
//   node run.mjs <runId> [codex|claude] [budgetUsd]
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.TEARDOWN_ROOT || 'C:/Users/Usmo1/pt-teardown';
const [runId, cli = 'codex', budget = '15'] = process.argv.slice(2);
if (!runId || !['codex', 'claude'].includes(cli)) { console.error('usage: node run.mjs <runId> [codex|claude] [budgetUsd]'); process.exit(2); }

const prompt = fs.readFileSync(path.join(here, 'prompt.txt'), 'utf8');
const dir = path.join(ROOT, runId);
if (fs.existsSync(dir)) { console.error(`${dir} exists; pick a new run id`); process.exit(2); }
fs.mkdirSync(dir, { recursive: true });

let args;
if (cli === 'claude') {
  // The guard lives outside the run folder, so the agent never sees it as part of its task.
  const guard = path.join(here, 'guard.mjs').replace(/\\/g, '/');
  const settings = path.join(ROOT, `${runId}.settings.json`);
  fs.writeFileSync(settings, JSON.stringify({
    hooks: { PreToolUse: [{ matcher: 'Bash|PowerShell', hooks: [{ type: 'command', command: `node "${guard}" "${dir.replace(/\\/g, '/')}"` }] }] },
  }, null, 2));
  args = ['-p', '--output-format', 'stream-json', '--verbose', '--permission-mode', 'bypassPermissions', '--settings', settings, '--max-budget-usd', budget];
} else {
  // The user allowed this machine to be used as the test bench, so Codex runs with full access;
  // every command it runs is in the event log and scored from there.
  args = ['exec', '--json', '--skip-git-repo-check', '--dangerously-bypass-approvals-and-sandbox', '-C', dir];
}

const out = fs.openSync(path.join(ROOT, `${runId}.events.jsonl`), 'w');
const err = fs.openSync(path.join(ROOT, `${runId}.stderr.log`), 'w');
const started = Date.now();
// The Codex desktop app ships a newer codex.exe than the one on PATH; the PATH build rejects its default model.
const exe = cli === 'codex' ? (process.env.CODEX_EXE || 'codex') : 'claude';
const child = spawn(`"${exe}"`, args, { cwd: dir, stdio: ['pipe', out, err], shell: true });
child.stdin.end(prompt);
child.on('exit', (code) => console.log(`${runId} (${cli}): exit ${code} after ${Math.round((Date.now() - started) / 60000)} min`));
