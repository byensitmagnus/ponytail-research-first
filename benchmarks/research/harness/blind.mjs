// Relabel runs for blind grading. Writes results/blind/<label>/ (what the grader sees)
// and results/blind/key.json (label -> run id), which is only read after grading.
//   node blind.mjs <runId...>
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { BENCH } from './lib.mjs';

const RESULTS = path.join(BENCH, 'results');
const out = path.join(RESULTS, 'blind');
const keyFile = path.join(out, 'key.json');
const key = fs.existsSync(keyFile) ? JSON.parse(fs.readFileSync(keyFile, 'utf8')) : {};
// Fields that reveal the arm rather than the quality of the work.
const REVEALING = ['researchLine', 'researchSkillRead'];
// Run folders are named <task>__<arm>__r<n>; the pilot grader saw the arm in last.md's file links.
const scrub = (text) => text
  .replace(/__(fork|upstream)__/gi, '__[arm]__')
  .replace(/ponytail[-_ ]?research(-first)?/gi, '[skill]')
  .replace(/\bponytail\b/gi, '[rules]');

for (const id of process.argv.slice(2)) {
  let label = Object.keys(key).find((k) => key[k] === id);
  if (!label) {
    label = 'run-' + crypto.createHash('sha256').update('blind-2026-09-25:' + id).digest('hex').slice(0, 6);
    key[label] = id;
  }
  const src = path.join(RESULTS, id);
  const dst = path.join(out, label);
  fs.mkdirSync(dst, { recursive: true });
  const run = JSON.parse(fs.readFileSync(path.join(src, 'run.json'), 'utf8'));
  fs.writeFileSync(path.join(dst, 'task.txt'), run.task + '\n');
  for (const f of ['DECISION.md', 'last.md', 'diff.patch', 'accept.json']) {
    if (fs.existsSync(path.join(src, f))) fs.writeFileSync(path.join(dst, f), scrub(fs.readFileSync(path.join(src, f), 'utf8')));
  }
  if (fs.existsSync(path.join(src, 'evidence.json'))) {
    const ev = JSON.parse(fs.readFileSync(path.join(src, 'evidence.json'), 'utf8'));
    for (const k of REVEALING) delete ev[k];
    delete ev.id;
    fs.writeFileSync(path.join(dst, 'evidence.json'), scrub(JSON.stringify(ev, null, 2)) + '\n');
  }
  console.log(label);
}
fs.writeFileSync(keyFile, JSON.stringify(key, null, 2) + '\n');
