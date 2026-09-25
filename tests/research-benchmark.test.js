#!/usr/bin/env node
// The research benchmark's harness and scorer, tested without model calls: neutral
// order, identical prompts and config per arm, evidence extraction, dependency
// accounting, and that the t3 hidden acceptance check passes its reference.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { pathToFileURL } = require('url');

const bench = path.join(__dirname, '..', 'benchmarks', 'research');
const load = (f) => import(pathToFileURL(path.join(bench, 'harness', f)).href);

test('plan: every task x run pair once, both arms, launch order balanced, deterministic', async () => {
  const { plan, TASKS } = await load('lib.mjs');
  const p = plan();
  assert.equal(p.length, TASKS.length * 2);
  assert.equal(new Set(p.map((x) => `${x.task}:${x.rep}`)).size, p.length);
  assert.equal(p.filter((x) => x.first === 'upstream').length, p.length / 2);
  assert.deepEqual(plan(), p);
});

test('prompt and Codex config are identical for both arms', async () => {
  const { prompt, codexConfig, ENV_NOTE, TASKS } = await load('lib.mjs');
  for (const t of TASKS) {
    assert.ok(prompt(t).endsWith(ENV_NOTE + '\n'));
    assert.ok(prompt(t).includes(fs.readFileSync(path.join(bench, 'tasks', t, 'TASK.md'), 'utf8').trim()));
  }
  const c = codexConfig();
  for (const s of ['model = "gpt-6-sol"', 'sandbox_mode = "workspace-write"', 'network_access = true', 'web_search = "live"', 'sandbox = "elevated"', 'apps = false']) {
    assert.ok(c.includes(s), s);
  }
});

test('evidence: searches, pages, registry look-ups, third-party reads and order are read from the transcript', async () => {
  const { extract } = await load('evidence.mjs');
  const item = (i) => ({ type: 'item.completed', item: i });
  const ev = extract([
    item({ type: 'web_search', query: 'woocommerce b2b plugin', action: { type: 'search', query: 'woocommerce b2b plugin' } }),
    item({ type: 'web_search', action: { type: 'open_page', url: 'https://wordpress.org/plugins/b2bking-wholesale-for-woocommerce/' } }),
    item({ type: 'command_execution', command: 'node -e "fetch(\'https://api.wordpress.org/plugins/info/1.2/?action=plugin_information\')"', exit_code: 0 }),
    item({ type: 'command_execution', command: 'Get-Content node_modules/exceljs/package.json', exit_code: 0 }),
    item({ type: 'file_change', changes: [{ path: 'src/vat.js', kind: 'update' }] }),
    item({ type: 'agent_message', text: 'Research: b2bking@5.2.60 → reuse' }),
  ]);
  assert.deepEqual(ev.searches, ['woocommerce b2b plugin']);
  assert.equal(ev.pagesOpened.length, 1);
  assert.equal(ev.registryLookups.length, 1);
  assert.equal(ev.thirdPartyReads.length, 1);
  assert.equal(ev.researchedBeforeFirstChange, true);
  assert.equal(ev.researchLine, true);
  assert.equal(extract([item({ type: 'file_change' }), item({ type: 'web_search', action: { type: 'search', query: 'x' } })]).researchedBeforeFirstChange, false);
});

test('dependencies are read from the real manifests, and DECISION.md coverage is checked', async () => {
  const { addedDeps, decisionCoverage } = await load('evidence.mjs');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bench-deps-'));
  const fixture = path.join(tmp, 'fixture');
  const work = path.join(tmp, 'work');
  fs.mkdirSync(fixture); fs.mkdirSync(path.join(work, 'staging'), { recursive: true });
  fs.writeFileSync(path.join(fixture, 'package.json'), JSON.stringify({ dependencies: { react: '19.3.0' } }));
  fs.writeFileSync(path.join(work, 'package.json'), JSON.stringify({ dependencies: { react: '19.3.0', exceljs: '^4.4.0' } }));
  fs.writeFileSync(path.join(work, 'package-lock.json'), JSON.stringify({ packages: { 'node_modules/exceljs': { version: '4.4.0' } } }));
  fs.writeFileSync(path.join(work, 'requirements.txt'), 'rapidfuzz==3.14.6\n# comment\n');
  fs.writeFileSync(path.join(work, 'staging', 'blueprint.json'), JSON.stringify({ steps: [
    { step: 'installPlugin', pluginData: { resource: 'url', url: 'https://downloads.wordpress.org/plugin/woocommerce.11.1.2.zip' } },
    { step: 'installPlugin', pluginData: { resource: 'url', url: 'https://downloads.wordpress.org/plugin/b2bking-wholesale-for-woocommerce.5.2.60.zip' } },
  ] }));
  const deps = addedDeps('t1-wc-b2b', work, fixture);
  assert.deepEqual(deps.map((d) => `${d.eco}:${d.name}@${d.resolved}`), ['npm:exceljs@4.4.0', 'pypi:rapidfuzz@3.14.6', 'wporg:b2bking-wholesale-for-woocommerce@5.2.60']);
  const cov = decisionCoverage([{ name: 'exceljs', resolved: '4.4.0', license: 'MIT' }], '| exceljs | 4.4.0 | MIT |');
  assert.deepEqual(cov[0], { name: 'exceljs', named: true, versionStated: true, licenseStated: true });
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Claude subagent transcripts: research, contamination, forbidden tools, leaks and gh writes are detected', async () => {
  const { extractClaude } = await load('subagent.mjs');
  const tool = (name, input) => ({ type: 'assistant', message: { content: [{ type: 'tool_use', name, input }] } });
  const clean = extractClaude([
    { type: 'attachment', attachment: { type: 'instructions', text: 'user CLAUDE.md' } },
    tool('WebSearch', { query: 'woocommerce wholesale plugin' }),
    tool('Bash', { command: 'gh search repos "woocommerce b2b" --sort stars' }),
    tool('Write', { file_path: 'C:/w/DECISION.md' }),
    { type: 'assistant', message: { content: [{ type: 'text', text: 'Research: b2bking@5.2.60 -> reuse' }] } },
  ]);
  assert.equal(clean.contaminated, false);
  assert.deepEqual(clean.searches, ['woocommerce wholesale plugin']);
  assert.equal(clean.registryLookups.length, 1);
  assert.equal(clean.researchedBeforeFirstChange, true);
  assert.equal(clean.researchLine, true);
  const dirty = extractClaude([
    { type: 'attachment', attachment: { type: 'hook_additional_context', content: 'PONYTAIL MODE ACTIVE — level: full' } },
    tool('Skill', { skill: 'ponytail:ponytail-research' }),
    tool('Read', { file_path: 'C:/Users/x/ponytail-harness/benchmarks/research/PREREGISTRATION.md' }),
    tool('Bash', { command: 'gh repo fork owner/repo' }),
  ]);
  assert.equal(dirty.contaminated, true);
  assert.deepEqual(dirty.forbiddenTools, ['Skill']);
  assert.equal(dirty.leaks.length, 1);
  assert.equal(dirty.ghWrites.length, 1);
});

test('Haiku prompts for the two arms differ only in the injected session rules', async () => {
  const { buildPrompt } = await load('subagent.mjs');
  const rules = path.join(bench, 'results', 'haiku-rules');
  if (!fs.existsSync(path.join(rules, 'fork.txt'))) return; // generated by `subagent.mjs rules`
  const up = buildPrompt('t3-node-vat', 'upstream', 'C:/w');
  const fork = buildPrompt('t3-node-vat', 'fork', 'C:/w');
  const strip = (s, arm) => s.replace(fs.readFileSync(path.join(rules, `${arm}.txt`), 'utf8').trim(), '<RULES>');
  assert.equal(strip(up, 'upstream'), strip(fork, 'fork'));
  assert.ok(fork.includes('Already built out there') && !up.includes('Already built out there'));
});

test('t3 hidden acceptance check: reference passes every check, the untouched fixture does not', () => {
  const accept = path.join(bench, 'tasks', 't3-node-vat', 'accept', 'accept.mjs');
  const run = (dir) => JSON.parse(spawnSync(process.execPath, [accept, dir], { encoding: 'utf8' }).stdout).checks;
  const ref = run(path.join(bench, 'tasks', 't3-node-vat', 'reference'));
  assert.ok(ref.every((c) => c.pass), JSON.stringify(ref.filter((c) => !c.pass)));
  const fixture = run(path.join(bench, 'tasks', 't3-node-vat', 'fixture'));
  assert.ok(fixture.filter((c) => c.pass).length <= 2);
});
