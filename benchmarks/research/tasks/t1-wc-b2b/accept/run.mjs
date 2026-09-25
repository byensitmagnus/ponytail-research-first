// Acceptance for t1-wc-b2b: the pristine staging check (a solution cannot edit it
// into passing) against the solution's blueprint and wp-content, plus where every
// installed plugin comes from. Usage: node run.mjs <workdir>
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const work = path.resolve(process.argv[2]);
const pristine = path.resolve(import.meta.dirname, '..', 'fixture', 'staging', 'check.mjs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 't1-'));
fs.cpSync(work, tmp, { recursive: true, filter: (p) => !/[\\/](node_modules|\.bench|\.git)([\\/]|$)/.test(p.slice(work.length)) });
fs.copyFileSync(pristine, path.join(tmp, 'staging', 'check.mjs'));
const checks = [];

// Where does each plugin come from? Anything outside wordpress.org needs a manual free/paid check.
const plugins = [];
try {
  const bp = JSON.parse(fs.readFileSync(path.join(tmp, 'staging', 'blueprint.json'), 'utf8'));
  for (const s of bp.steps || []) {
    if (s.step !== 'installPlugin') continue;
    const d = s.pluginData || s.pluginZipFile || {};
    plugins.push(d.resource === 'wordpress.org/plugins' ? `wordpress.org:${d.slug}` : `${d.resource}:${d.url || d.path || d.slug || '?'}`);
  }
  const own = path.join(tmp, 'wp-content', 'plugins');
  if (fs.existsSync(own)) for (const d of fs.readdirSync(own)) plugins.push(`own-code:${d}`);
  if (fs.existsSync(path.join(tmp, 'wp-content', 'mu-plugins'))) plugins.push('own-code:mu-plugins');
  checks.push({ id: 'blueprint-parses', req: 'deliverable', pass: true, detail: plugins.join(', ') });
} catch (e) {
  checks.push({ id: 'blueprint-parses', req: 'deliverable', pass: false, detail: e.message });
}
const offOrg = plugins.filter((p) => !/^wordpress\.org:|^url:https:\/\/downloads\.wordpress\.org\/|^own-code:/.test(p));
checks.push({ id: 'plugins-from-wordpress-org-or-own', req: 'R5', pass: offOrg.length === 0, detail: offOrg.join(', ') || plugins.join(', ') });

const r = spawnSync(process.execPath, ['staging/check.mjs'], { cwd: tmp, encoding: 'utf8', timeout: 20 * 60000 });
try {
  const reqOf = (id) => (id.startsWith('register') ? 'R1' : id === 'price:b2b_pending' ? 'R2' : id === 'price:b2b_approved' ? 'R3' : 'R4');
  for (const c of JSON.parse(r.stdout).checks) checks.push({ ...c, req: reqOf(c.id), detail: typeof c.detail === 'string' ? c.detail : JSON.stringify(c.detail) });
} catch {
  checks.push({ id: 'staging-check', req: 'R3', pass: false, detail: (r.stderr || r.stdout || '').slice(-300) });
}
console.log(JSON.stringify({ task: 't1-wc-b2b', checks }, null, 2));
// Best effort: the Playground server may still hold file locks for a moment.
try { fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 10, retryDelay: 1000 }); } catch { /* left in TEMP */ }
