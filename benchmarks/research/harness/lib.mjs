// Shared pieces of the research benchmark harness. Pure functions are exported for tests.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const HERE = import.meta.dirname;
export const BENCH = path.resolve(HERE, '..');
export const TASKS = ['t1-wc-b2b', 't2-py-fuzzy', 't3-node-vat', 't4-react-grid'];
export const VARIANTS = {
  upstream: { repo: 'https://github.com/DietrichGebert/ponytail', sha: 'e3ba2aa' },
  fork: { repo: 'https://github.com/byensitmagnus/ponytail-research-first', sha: '210b272' },
};

// Identical for both variants: model, tools, sandbox, network, time.
export const AGENT = {
  model: 'gpt-6-sol',
  reasoning: 'medium',
  timeoutMin: 30,
  sandbox: 'workspace-write (Windows elevated sandbox), network on',
  disabledFeatures: ['apps', 'browser_use', 'computer_use', 'memories'],
};

export function codexConfig() {
  return [
    `model = "${AGENT.model}"`,
    `model_reasoning_effort = "${AGENT.reasoning}"`,
    'approval_policy = "never"',
    'service_tier = "default"',
    'sandbox_mode = "workspace-write"',
    'web_search = "live"',
    '',
    '[sandbox_workspace_write]',
    'network_access = true',
    '',
    '[windows]',
    'sandbox = "elevated"',
    '',
    '[features]',
    'hooks = true',
    ...AGENT.disabledFeatures.map((f) => `${f} = false`),
    '',
  ].join('\n');
}

export const ENV_NOTE = [
  '',
  '---',
  'Environment: Windows with PowerShell. Available: Node 24 with npm and npx, Python 3.12',
  '(`python`), git. Write only inside this folder. HTTPS from curl.exe or PowerShell does not',
  'work in this sandbox; for HTTP use your web search tool, `node -e "fetch(...)"`, npm, or Python.',
  'Time limit: 30 minutes. Record every third-party dependency or plugin you add in DECISION.md:',
  'name, exact version, license, and why it fits. Finish with a short summary.',
].join('\n');

export function prompt(task) {
  return fs.readFileSync(path.join(BENCH, 'tasks', task, 'TASK.md'), 'utf8').trim() + '\n' + ENV_NOTE + '\n';
}

// Deterministic neutral order: every (task, rep) pair runs both variants side by side;
// pair order and which variant is launched first come from a seeded shuffle.
export function plan(seed = 20260925, reps = 2) {
  let s = seed >>> 0;
  const rand = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  const pairs = [];
  for (const task of TASKS) for (let rep = 1; rep <= reps; rep++) pairs.push({ task, rep });
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  return pairs.map((p, i) => ({ ...p, order: i + 1, first: rand() < 0.5 ? 'upstream' : 'fork' }));
}

export const runId = (task, variant, rep) => `${task}__${variant}__r${rep}`;

export function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

// Copy a tree, skipping build output, dependencies and harness scratch.
export function copyTree(src, dst) {
  fs.cpSync(src, dst, {
    recursive: true,
    filter: (p) => !/[\\/](node_modules|dist|\.venv|\.bench|__pycache__)([\\/]|$)/.test(p.slice(src.length)),
  });
}
