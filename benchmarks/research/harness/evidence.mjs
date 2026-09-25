// Evidence for one run: what the agent actually searched, fetched and read (from the
// transcript), and the dependencies it actually added (from the manifests), verified
// against the registries. A written "Research:" line is recorded but proves nothing.
//   node evidence.mjs <runId...>   (reads results/<id>/ and BENCH_ROOT/runs/<id>/work)
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { pathToFileURL } from 'node:url';
import { BENCH } from './lib.mjs';

export function parseEvents(jsonl) {
  return jsonl.split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}

const URL_RE = /https?:\/\/[^\s'"`<>()\\]+/g;
const READ_CMD = /\b(Get-Content|gc|cat|type|more|Select-String|rg|grep|findstr|head|tail)\b/i;
const THIRD_PARTY_PATH = /(node_modules[\\/]|site-packages[\\/]|\.bench[\\/]tmp[\\/]|downloads\.wordpress\.org|plugins\.(svn|trac)\.wordpress\.org|raw\.githubusercontent\.com|github\.com\/[^/\s]+\/[^/\s]+\/(blob|tree)\/|unpkg\.com|cdn\.jsdelivr\.net)/i;
const REGISTRY = /(registry\.npmjs\.org|npm (view|info|search)|pypi\.org\/(pypi|project|simple)|pip (index|download|show)|api\.wordpress\.org\/plugins|wordpress\.org\/plugins\/|api\.github\.com|github\.com\/[^/\s]+\/[^/\s'"]+)/i;

export function extract(events) {
  const items = events.filter((e) => e.type === 'item.completed' && e.item).map((e) => e.item);
  const ev = { searches: [], pagesOpened: [], commands: 0, commandFailures: 0, urlsInCommands: [], registryLookups: [], thirdPartyReads: [], agentMessages: 0, fileChanges: 0 };
  let firstResearch = -1;
  let firstChange = -1;
  items.forEach((it, i) => {
    if (it.type === 'web_search') {
      const a = it.action || {};
      if (a.type === 'open_page' || a.url) ev.pagesOpened.push(a.url || it.query);
      else ev.searches.push(a.query || it.query);
      if (firstResearch < 0) firstResearch = i;
    } else if (it.type === 'command_execution') {
      ev.commands++;
      if (it.exit_code) ev.commandFailures++;
      const cmd = String(it.command || '');
      const urls = cmd.match(URL_RE) || [];
      ev.urlsInCommands.push(...urls);
      if (REGISTRY.test(cmd)) { ev.registryLookups.push(cmd.slice(0, 300)); if (firstResearch < 0) firstResearch = i; }
      if (THIRD_PARTY_PATH.test(cmd) && (READ_CMD.test(cmd) || urls.length)) ev.thirdPartyReads.push(cmd.slice(0, 300));
      if (firstChange < 0 && /(Set-Content|Out-File|New-Item|apply_patch|>\s*\S)/.test(cmd) && !/\.bench/.test(cmd)) firstChange = i;
    } else if (it.type === 'file_change') {
      ev.fileChanges++;
      if (firstChange < 0) firstChange = i;
    } else if (it.type === 'agent_message') {
      ev.agentMessages++;
    }
  });
  const text = items.filter((it) => it.type === 'agent_message').map((it) => it.text).join('\n');
  ev.researchLine = /^\s*\**Research:?\**/im.test(text);
  ev.researchSkillRead = items.some((it) => it.type === 'command_execution' && /ponytail-research/i.test(it.command || ''));
  ev.researchedBeforeFirstChange = firstResearch >= 0 && (firstChange < 0 || firstResearch < firstChange);
  ev.urlsInCommands = [...new Set(ev.urlsInCommands)];
  return ev;
}

// Dependencies the solution really added, per ecosystem.
export function addedDeps(task, work, fixture) {
  const deps = [];
  const pkg = (dir) => { try { const j = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')); return { ...j.dependencies, ...j.devDependencies }; } catch { return {}; } };
  if (fs.existsSync(path.join(work, 'package.json'))) {
    const before = pkg(fixture);
    const lock = (() => { try { return JSON.parse(fs.readFileSync(path.join(work, 'package-lock.json'), 'utf8')).packages || {}; } catch { return {}; } })();
    for (const [name, range] of Object.entries(pkg(work))) {
      if (before[name] === range) continue;
      deps.push({ eco: 'npm', name, range, resolved: lock[`node_modules/${name}`]?.version || null });
    }
  }
  const req = path.join(work, 'requirements.txt');
  if (fs.existsSync(req)) {
    for (const line of fs.readFileSync(req, 'utf8').split('\n')) {
      const m = line.trim().match(/^([A-Za-z0-9_.\-]+)\s*(?:==\s*([^\s;#]+))?/);
      if (m && !line.trim().startsWith('#')) deps.push({ eco: 'pypi', name: m[1], range: m[2] || '(unpinned)', resolved: m[2] || null });
    }
  }
  const bpPath = path.join(work, 'staging', 'blueprint.json');
  if (task === 't1-wc-b2b' && fs.existsSync(bpPath)) {
    try {
      for (const s of JSON.parse(fs.readFileSync(bpPath, 'utf8')).steps || []) {
        if (s.step !== 'installPlugin') continue;
        const d = s.pluginData || s.pluginZipFile || {};
        const slug = d.slug || (String(d.url || '').match(/plugin\/([a-z0-9-]+)\.(?:([\d.]+)\.)?zip/) || [])[1];
        const version = (String(d.url || '').match(/plugin\/[a-z0-9-]+\.([\d.]+)\.zip/) || [])[1] || null;
        if (slug && slug !== 'woocommerce') deps.push({ eco: 'wporg', name: slug, range: version || 'latest', resolved: version });
      }
    } catch { /* unparsable blueprint is reported by acceptance */ }
  }
  return deps;
}

export async function verify(dep) {
  try {
    if (dep.eco === 'npm') {
      const j = await (await fetch(`https://registry.npmjs.org/${dep.name.replace('/', '%2F')}`)).json();
      const v = dep.resolved || j['dist-tags']?.latest;
      return { ...dep, exists: Boolean(j.versions?.[v]), license: j.versions?.[v]?.license ?? null, latest: j['dist-tags']?.latest, published: j.time?.[v] };
    }
    if (dep.eco === 'pypi') {
      const j = await (await fetch(`https://pypi.org/pypi/${dep.name}/json`)).json();
      const v = dep.resolved || j.info?.version;
      const rel = await fetch(`https://pypi.org/pypi/${dep.name}/${v}/json`).then((r) => (r.ok ? r.json() : null));
      const info = rel?.info || {};
      const classifiers = (info.classifiers || []).filter((c) => c.startsWith('License'));
      return { ...dep, exists: Boolean(rel), license: info.license_expression || (info.license || '').split('\n')[0] || classifiers.join('; ') || null, latest: j.info?.version };
    }
    if (dep.eco === 'wporg') {
      const j = await (await fetch(`https://api.wordpress.org/plugins/info/1.2/?action=plugin_information&request[slug]=${dep.name}&request[fields][sections]=0&request[fields][versions]=1`)).json();
      const versions = Object.keys(j.versions || {});
      return { ...dep, exists: !j.error && (!dep.resolved || versions.includes(dep.resolved)), license: 'GPL-2.0-or-later (wordpress.org directory rule)', latest: j.version, activeInstalls: j.active_installs };
    }
  } catch (e) {
    return { ...dep, exists: null, error: e.message };
  }
  return dep;
}

// Does DECISION.md name each real dependency with its version and license?
export function decisionCoverage(deps, decision) {
  const d = (decision || '').toLowerCase();
  return deps.map((x) => ({
    name: x.name,
    named: d.includes(x.name.toLowerCase()),
    versionStated: Boolean(x.resolved) && d.includes(String(x.resolved).toLowerCase()),
    licenseStated: Boolean(x.license) && d.includes(String(x.license).split(/[\s;(]/)[0].toLowerCase()),
  }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const ROOT = process.env.BENCH_ROOT || path.join(process.env.USERPROFILE, 'ponytail-bench');
  for (const id of process.argv.slice(2)) {
    const res = path.join(BENCH, 'results', id);
    const run = JSON.parse(fs.readFileSync(path.join(res, 'run.json'), 'utf8'));
    const events = parseEvents(zlib.gunzipSync(fs.readFileSync(path.join(res, 'events.jsonl.gz'))).toString('utf8'));
    const work = path.join(ROOT, 'runs', id, 'work');
    const deps = await Promise.all(addedDeps(run.task, work, path.join(BENCH, 'tasks', run.task, 'fixture')).map(verify));
    const decision = fs.existsSync(path.join(res, 'DECISION.md')) ? fs.readFileSync(path.join(res, 'DECISION.md'), 'utf8') : '';
    const out = { id, ...extract(events), deps, decisionCoverage: decisionCoverage(deps, decision), hasDecision: Boolean(decision) };
    fs.writeFileSync(path.join(res, 'evidence.json'), JSON.stringify(out, null, 2) + '\n');
    console.log(`${id}: searches=${out.searches.length} pages=${out.pagesOpened.length} registry=${out.registryLookups.length} 3p-reads=${out.thirdPartyReads.length} deps=${deps.map((x) => `${x.name}@${x.resolved}(${x.license})`).join(', ') || 'none'}`);
  }
}
