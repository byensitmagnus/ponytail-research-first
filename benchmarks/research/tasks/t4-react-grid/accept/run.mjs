// Acceptance for t4-react-grid: clean install, build, audit, licence scan, and a
// real .xlsx produced by the solution's exportGroupedXlsx. Usage: node run.mjs <workdir>
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const work = path.resolve(process.argv[2]);
const PY = process.env.BENCH_PYTHON || 'python';
const here = import.meta.dirname;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 't4-'));
const app = path.join(tmp, 'app');
fs.cpSync(work, app, { recursive: true, filter: (src) => !/[\\/](node_modules|dist|\.git)([\\/]|$)/.test(src.slice(work.length)) });
const sh = (cmd, cwd = app) => spawnSync(cmd, { cwd, shell: true, encoding: 'utf8', timeout: 900000 });
const checks = [];
const add = (id, req, pass, detail = '') => checks.push({ id, req, pass: Boolean(pass), detail: String(detail).slice(-300) });

let r = sh(fs.existsSync(path.join(app, 'package-lock.json')) ? 'npm ci --no-fund' : 'npm install --no-fund');
add('install', 'R5', r.status === 0, r.stderr);
r = sh('npm run build');
add('build', 'R5', r.status === 0, (r.stdout + r.stderr));
r = sh('npm audit --audit-level=high');
add('audit-high', 'R5', r.status === 0, r.stdout.split('\n').slice(-3).join(' '));

// R4: licence scan of everything installed.
const COMMERCIAL_NAME = /^(ag-grid-enterprise|@ag-grid-enterprise\/.*|@mui\/x-data-grid-(pro|premium)|handsontable|@handsontable\/.*|@progress\/kendo.*|devextreme.*|@syncfusion\/.*|@revolist\/revogrid-pro)$/;
const COMMERCIAL_LICENSE = /commercial|proprietary|unlicensed|see licen[cs]e in/i;
const offenders = [];
const walk = (dir) => {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory() || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.name.startsWith('@')) { walk(p); continue; }
    const pj = path.join(p, 'package.json');
    if (fs.existsSync(pj)) {
      try {
        const j = JSON.parse(fs.readFileSync(pj, 'utf8'));
        const lic = typeof j.license === 'string' ? j.license : JSON.stringify(j.license || j.licenses || '');
        if (COMMERCIAL_NAME.test(j.name || '') || COMMERCIAL_LICENSE.test(lic)) offenders.push(`${j.name}@${j.version} (${lic})`);
      } catch { /* ignore unreadable manifests */ }
    }
    walk(path.join(p, 'node_modules'));
  }
};
walk(path.join(app, 'node_modules'));
add('licences-free', 'R4', offenders.length === 0, offenders.join(', ') || 'no commercial licences found');

const xlsx = path.join(tmp, 'out.xlsx');
r = sh(`npx -y tsx@4.23.15 "${path.join(here, 'export-check.mts')}" "${xlsx}"`);
add('export-runs', 'R3', r.status === 0 && fs.existsSync(xlsx), r.stdout + r.stderr);
// Always emit the three workbook checks so every run is scored on the same checks.
let x = { error: 'no workbook produced' };
if (fs.existsSync(xlsx)) {
  r = spawnSync(PY, [path.join(here, 'inspect_xlsx.py'), xlsx], { encoding: 'utf8' });
  try { x = JSON.parse(r.stdout); } catch { x = { error: r.stderr }; }
}
add('xlsx-valid', 'R3', x.valid_zip, JSON.stringify(x));
add('xlsx-customers', 'R3', x.customers && Object.values(x.customers).every(Boolean), JSON.stringify(x.customers || x.error));
add('xlsx-subtotals', 'R2', x.subtotals && Object.values(x.subtotals).every(Boolean), JSON.stringify(x.subtotals || x.error));
fs.rmSync(tmp, { recursive: true, force: true });
console.log(JSON.stringify({ task: 't4-react-grid', checks }, null, 2));
