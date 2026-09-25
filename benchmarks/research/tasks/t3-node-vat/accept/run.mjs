// Acceptance for t3-node-vat: the solution's own tests with the network blocked,
// then the hidden checks. Usage: node run.mjs <workdir>
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const work = path.resolve(process.argv[2]);
const here = import.meta.dirname;
const checks = [];
const blocker = path.join(os.tmpdir(), 't3-no-network.mjs');
fs.writeFileSync(blocker, [
  "import net from 'node:net';",
  "globalThis.fetch = async () => { throw new Error('NETWORK_BLOCKED_IN_TESTS'); };",
  "net.Socket.prototype.connect = function () { throw new Error('NETWORK_BLOCKED_IN_TESTS'); };",
].join('\n'));
const npmInstall = fs.existsSync(path.join(work, 'package-lock.json')) ? 'npm ci --no-fund --no-audit' : 'npm install --no-fund --no-audit';
let r = spawnSync(npmInstall, { cwd: work, shell: true, encoding: 'utf8', timeout: 600000 });
checks.push({ id: 'install', req: 'R6', pass: r.status === 0, detail: (r.stderr || '').slice(-300) });
r = spawnSync('npm test', { cwd: work, shell: true, encoding: 'utf8', timeout: 600000,
  env: { ...process.env, NODE_OPTIONS: `--import=${pathToFileURL(blocker).href}` } });
const out = (r.stdout || '') + (r.stderr || '');
const tests = +(out.match(/(?:#|ℹ) tests (\d+)/) || [0, 0])[1];
checks.push({ id: 'own-tests-offline', req: 'R6', pass: r.status === 0 && tests > 1 && !/NETWORK_BLOCKED_IN_TESTS/.test(out), detail: `tests=${tests} ` + out.slice(-300) });
r = spawnSync(process.execPath, [path.join(here, 'accept.mjs'), work], { encoding: 'utf8', timeout: 300000 });
try { checks.push(...JSON.parse(r.stdout).checks); } catch { checks.push({ id: 'hidden-checks', req: 'interface', pass: false, detail: (r.stderr || r.stdout).slice(-300) }); }
console.log(JSON.stringify({ task: 't3-node-vat', checks }, null, 2));
