// Acceptance for t2-py-fuzzy: fresh venv with only the solution's requirements,
// its own tests, then the hidden checks. Usage: node run.mjs <workdir>
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const work = path.resolve(process.argv[2]);
const PY = process.env.BENCH_PYTHON || 'python';
const venv = fs.mkdtempSync(path.join(os.tmpdir(), 't2-venv-'));
const vpy = path.join(venv, process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const run = (cmd, args, cwd = work) => spawnSync(cmd, args, { cwd, encoding: 'utf8', timeout: 600000 });
const checks = [];

let r = run(PY, ['-m', 'venv', venv]);
const reqs = path.join(work, 'requirements.txt');
const hasReqs = fs.existsSync(reqs) && fs.readFileSync(reqs, 'utf8').trim();
if (r.status === 0 && hasReqs) r = run(vpy, ['-m', 'pip', 'install', '-q', '-r', reqs]);
checks.push({ id: 'install-requirements', req: 'R5', pass: r.status === 0, detail: (r.stderr || '').slice(-300) });

const usesPytest = hasReqs && /^pytest\b/im.test(fs.readFileSync(reqs, 'utf8'));
r = usesPytest ? run(vpy, ['-m', 'pytest', '-q']) : run(vpy, ['-m', 'unittest', 'discover', '-s', 'tests', '-t', '.']);
checks.push({ id: 'own-tests', req: 'R5', pass: r.status === 0, detail: ((r.stdout || '') + (r.stderr || '')).slice(-300) });

r = run(vpy, [path.join(import.meta.dirname, 'accept.py'), work]);
try {
  checks.push(...JSON.parse(r.stdout).checks);
} catch {
  checks.push({ id: 'hidden-checks', req: 'interface', pass: false, detail: (r.stderr || r.stdout).slice(-300) });
}
fs.rmSync(venv, { recursive: true, force: true });
console.log(JSON.stringify({ task: 't2-py-fuzzy', checks }, null, 2));
