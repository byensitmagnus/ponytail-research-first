// Research benchmark runner (Codex CLI, upstream Ponytail vs fork).
//   node run.mjs prepare            build pinned variant plugins + template CODEX_HOMEs, no model calls
//   node run.mjs run <pair...>      run pairs from plan() (both variants side by side), e.g. `run 1 2`
//   node run.mjs plan               print the neutral run order
// Env: BENCH_ROOT (scratch, default C:/Users/<you>/ponytail-bench), CODEX_EXE (codex binary),
//      BENCH_TOOLS (folder with python312/, readable by the sandbox users).
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync, execSync } from 'node:child_process';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { AGENT, BENCH, VARIANTS, codexConfig, copyTree, plan, prompt, runId } from './lib.mjs';

const ROOT = process.env.BENCH_ROOT || path.join(process.env.USERPROFILE, 'ponytail-bench');
const EXE = process.env.CODEX_EXE;
const TOOLS = process.env.BENCH_TOOLS || path.join(ROOT, 'tools');
const REAL_CODEX = path.join(process.env.USERPROFILE, '.codex');
const RESULTS = process.env.BENCH_RESULTS || path.join(BENCH, 'results');
const MAX_PLAN_PCT = Number(process.env.BENCH_MAX_PLAN_PCT || 98);
const repo = path.resolve(BENCH, '..', '..');

const codexVersion = () => spawnSync(EXE, ['--version'], { encoding: 'utf8' }).stdout.trim();
const junction = (link, target) => { if (!fs.existsSync(link)) execSync(`cmd /c mklink /J "${link}" "${target}"`); };

function baseEnv(codexHome, work) {
  const env = { ...process.env };
  // Nothing from the host agent, GitHub login or other AI tools leaks into a run.
  for (const k of Object.keys(env)) if (/^(GH_|GITHUB_|CLAUDE|ZCODE|CURSOR|PONYTAIL|CODEX|QODER|COPILOT|PLUGIN_DATA|OPENAI|ANTHROPIC)/i.test(k)) delete env[k];
  const bench = path.join(work, '.bench');
  const home = path.join(bench, 'home');
  for (const d of ['tmp', 'npm-cache', 'pip-cache', 'gh', 'home/AppData/Roaming', 'home/AppData/Local']) fs.mkdirSync(path.join(bench, d), { recursive: true });
  const py = path.join(TOOLS, 'python312');
  return Object.assign(env, {
    CODEX_HOME: codexHome, USERPROFILE: home, HOME: home,
    APPDATA: path.join(home, 'AppData', 'Roaming'), LOCALAPPDATA: path.join(home, 'AppData', 'Local'),
    TEMP: path.join(bench, 'tmp'), TMP: path.join(bench, 'tmp'),
    npm_config_cache: path.join(bench, 'npm-cache'), npm_config_update_notifier: 'false',
    PIP_CACHE_DIR: path.join(bench, 'pip-cache'), PIP_DISABLE_PIP_VERSION_CHECK: '1',
    GH_CONFIG_DIR: path.join(bench, 'gh'),
    PATH: [py, path.join(py, 'Scripts'), process.env.PATH].join(path.delimiter),
  });
}

function prepare() {
  const out = {};
  for (const [variant, v] of Object.entries(VARIANTS)) {
    const dir = path.join(ROOT, 'variants', variant);
    const market = path.join(dir, 'market');
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(path.join(market, 'plugin'), { recursive: true });
    fs.mkdirSync(path.join(market, '.agents', 'plugins'), { recursive: true });
    execSync(`git archive ${v.sha} | tar -x -C "${path.join(market, 'plugin')}"`, { cwd: repo, shell: 'cmd.exe' });
    fs.writeFileSync(path.join(market, '.agents', 'plugins', 'marketplace.json'), JSON.stringify({
      name: 'ponytail', interface: { displayName: 'Ponytail' },
      plugins: [{ name: 'ponytail', source: { source: 'local', path: './plugin' }, policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' }, category: 'Productivity' }],
    }, null, 2));
    const home = path.join(dir, 'codex-home');
    fs.mkdirSync(home, { recursive: true });
    for (const f of ['models_cache.json', 'version.json']) fs.copyFileSync(path.join(REAL_CODEX, f), path.join(home, f));
    fs.writeFileSync(path.join(home, 'config.toml'), codexConfig());
    const env = { ...process.env, CODEX_HOME: home };
    for (const args of [['plugin', 'marketplace', 'add', market], ['plugin', 'add', 'ponytail@ponytail']]) {
      const r = spawnSync(EXE, args, { env, encoding: 'utf8' });
      if (r.status !== 0) throw new Error(`${variant}: codex ${args.join(' ')} failed: ${r.stderr}`);
    }
    const cache = path.join(home, 'plugins', 'cache', 'ponytail', 'ponytail');
    const version = fs.readdirSync(cache)[0];
    const skill = fs.readFileSync(path.join(cache, version, 'skills', 'ponytail', 'SKILL.md'), 'utf8');
    // What the installed SessionStart hook actually injects under Codex (PLUGIN_DATA set).
    const pluginData = path.join(dir, 'hook-probe');
    const hook = spawnSync(process.execPath, [path.join(cache, version, 'hooks', 'ponytail-activate.js')],
      { env: { ...process.env, PLUGIN_DATA: pluginData, PONYTAIL_DEFAULT_MODE: 'full' }, input: '{}', encoding: 'utf8' });
    const injected = JSON.parse(hook.stdout).hookSpecificOutput?.additionalContext || '';
    out[variant] = {
      sha: v.sha, version,
      rung7Research: skill.includes('Already built out there'),
      researchSkill: fs.existsSync(path.join(cache, version, 'skills', 'ponytail-research')),
      hookInjectsResearchRung: injected.includes('Already built out there'),
      hookInjectedChars: injected.length,
      globalInstructions: fs.existsSync(path.join(home, 'AGENTS.md')),
      otherPlugins: fs.readdirSync(path.join(home, 'plugins', 'cache')).filter((d) => d !== 'ponytail'),
    };
  }
  fs.mkdirSync(RESULTS, { recursive: true });
  fs.writeFileSync(path.join(RESULTS, 'variants.json'), JSON.stringify({ codex: codexVersion(), agent: AGENT, variants: out }, null, 2) + '\n');
  console.log(JSON.stringify(out, null, 2));
}

function git(work, args) {
  return spawnSync('git', ['-c', 'user.name=bench', '-c', 'user.email=bench@example.test', '-c', 'core.autocrlf=false', ...args], { cwd: work, encoding: 'utf8' });
}

function usageFrom(events) {
  const total = { input_tokens: 0, cached_input_tokens: 0, output_tokens: 0, reasoning_output_tokens: 0, turns: 0 };
  for (const e of events) {
    if (e.type !== 'turn.completed' || !e.usage) continue;
    total.turns++;
    for (const k of Object.keys(total)) if (k !== 'turns') total[k] += e.usage[k] || 0;
  }
  return total;
}

function rateLimits(codexHome) {
  // Newest rate-limit snapshot in session rollouts touched in the last day (plan usage, not dollars).
  const sessions = path.join(codexHome, 'sessions');
  if (!fs.existsSync(sessions)) return null;
  const since = Date.now() - 24 * 3600000;
  let best = null;
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (!p.endsWith('.jsonl') || fs.statSync(p).mtimeMs < since) continue;
      for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
        if (!line.includes('rate_limits')) continue;
        try {
          const j = JSON.parse(line);
          const rl = j.payload?.rate_limits;
          if (rl?.primary && (!best || j.timestamp > best.at)) best = { at: j.timestamp, ...rl };
        } catch { /* partial line */ }
      }
    }
  };
  walk(sessions);
  return best;
}

async function runOne(task, variant, rep, order) {
  const id = runId(task, variant, rep);
  const dir = path.join(ROOT, 'runs', id);
  const work = path.join(dir, 'work');
  const codexHome = path.join(dir, 'codex-home');
  // Unlink the junctions to ~/.codex's sandbox folders first (rmdir never touches a
  // junction's target), then remove the rest of an earlier run.
  // (Node 24 does not report junctions as symbolic links; readlink does resolve them.)
  for (const d of ['.sandbox', '.sandbox-bin', '.sandbox-secrets']) {
    const link = path.join(codexHome, d);
    let isLink = false;
    try { fs.readlinkSync(link); isLink = true; } catch { /* missing or a real folder */ }
    if (isLink) execSync(`cmd /c rmdir "${link}"`);
  }
  fs.rmSync(dir, { recursive: true, force: true });
  copyTree(path.join(ROOT, 'variants', variant, 'codex-home'), codexHome);
  fs.copyFileSync(path.join(REAL_CODEX, 'auth.json'), path.join(codexHome, 'auth.json'));
  for (const d of ['.sandbox', '.sandbox-bin', '.sandbox-secrets']) junction(path.join(codexHome, d), path.join(REAL_CODEX, d));
  // The sandbox users may traverse and stat the run folder and its parent (Node's realpath
  // needs it) but get no read access to anything in them, so codex-home stays private.
  for (const p of [path.join(ROOT, 'runs'), dir]) execSync(`icacls "${p}" /grant *S-1-5-32-545:(RA,X)`, { stdio: 'ignore' });
  copyTree(path.join(BENCH, 'tasks', task, 'fixture'), work);
  fs.appendFileSync(path.join(work, '.gitignore'), '\n.bench/\nnode_modules/\n.venv/\n__pycache__/\ndist/\n');
  git(work, ['init', '-q']); git(work, ['add', '-A']); git(work, ['commit', '-q', '-m', 'baseline']);
  const env = baseEnv(codexHome, work);
  const text = prompt(task);
  const planBefore = rateLimits(REAL_CODEX)?.primary?.used_percent ?? null;
  const started = new Date();
  const child = spawn(EXE, ['exec', '--json', '--dangerously-bypass-hook-trust', '-C', work, '-o', path.join(dir, 'last.md'), '-'],
    { env, cwd: work, stdio: ['pipe', 'pipe', 'pipe'] });
  child.stdin.end(text);
  const out = fs.createWriteStream(path.join(dir, 'events.jsonl'));
  child.stdout.pipe(out);
  let stderr = '';
  child.stderr.on('data', (d) => { stderr += d; });
  let killed = false;
  const kill = (why) => { if (!killed) { killed = why; spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F']); } };
  const timer = setTimeout(() => kill('timeout'), AGENT.timeoutMin * 60000);
  // Quota brake: never let the benchmark push the user's ChatGPT plan past MAX_PLAN_PCT.
  const brake = setInterval(() => {
    const pct = rateLimits(codexHome)?.primary?.used_percent;
    if (pct >= MAX_PLAN_PCT) kill(`plan-quota ${pct}%`);
  }, 20000);
  const exit = await new Promise((resolve) => child.on('close', resolve));
  clearTimeout(timer);
  clearInterval(brake);
  await new Promise((resolve) => out.end(resolve));
  const ended = new Date();
  const events = fs.readFileSync(path.join(dir, 'events.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return {}; } });
  git(work, ['add', '-A']);
  const numstat = git(work, ['diff', '--cached', '--numstat', 'HEAD', '--', '.', ':(exclude)*lock*', ':(exclude)*.lock']).stdout;
  const lines = numstat.split('\n').filter(Boolean).map((l) => l.split('\t'));
  const run = {
    id, task, variant, rep, order, variantSha: VARIANTS[variant].sha,
    codex: codexVersion(), model: AGENT.model, reasoning: AGENT.reasoning, sandbox: AGENT.sandbox, disabledFeatures: AGENT.disabledFeatures,
    promptSha256: crypto.createHash('sha256').update(text).digest('hex'),
    started: started.toISOString(), ended: ended.toISOString(), minutes: +((ended - started) / 60000).toFixed(2),
    exit, killed, usage: usageFrom(events), rateLimits: rateLimits(codexHome), planUsedPctBefore: planBefore,
    diff: { files: lines.length, added: lines.reduce((s, l) => s + (+l[0] || 0), 0), deleted: lines.reduce((s, l) => s + (+l[1] || 0), 0), numstat: lines.map((l) => l.join(' ')) },
    stderrTail: stderr.split('\n').filter((l) => !/dangerously-bypass-hook-trust|Reading additional input/.test(l)).slice(-20).join('\n'),
  };
  const res = path.join(RESULTS, id);
  fs.rmSync(res, { recursive: true, force: true });
  fs.mkdirSync(res, { recursive: true });
  fs.writeFileSync(path.join(res, 'run.json'), JSON.stringify(run, null, 2) + '\n');
  fs.writeFileSync(path.join(res, 'events.jsonl.gz'), zlib.gzipSync(fs.readFileSync(path.join(dir, 'events.jsonl'))));
  fs.writeFileSync(path.join(res, 'diff.patch'), git(work, ['diff', '--cached', 'HEAD', '--', '.', ':(exclude)*lock*', ':(exclude)*.lock', ':(exclude)data/*']).stdout);
  for (const f of ['DECISION.md']) if (fs.existsSync(path.join(work, f))) fs.copyFileSync(path.join(work, f), path.join(res, f));
  if (fs.existsSync(path.join(dir, 'last.md'))) fs.copyFileSync(path.join(dir, 'last.md'), path.join(res, 'last.md'));
  fs.rmSync(path.join(codexHome, 'auth.json'), { force: true }); // never leave credential copies behind
  console.log(`${id}: exit=${exit} killed=${killed} ${run.minutes}min tokens=${run.usage.input_tokens}/${run.usage.output_tokens}`);
  return run;
}

// Acceptance runs outside the sandbox on the run's final working folder.
function accept(id) {
  const run = JSON.parse(fs.readFileSync(path.join(RESULTS, id, 'run.json'), 'utf8'));
  const work = path.join(ROOT, 'runs', id, 'work');
  const r = spawnSync(process.execPath, [path.join(BENCH, 'tasks', run.task, 'accept', 'run.mjs'), work],
    { encoding: 'utf8', timeout: 30 * 60000, env: { ...process.env, BENCH_PYTHON: path.join(TOOLS, 'python312', 'python.exe') } });
  let out;
  try { out = JSON.parse(r.stdout); } catch { out = { task: run.task, checks: [{ id: 'acceptance-crashed', req: 'all', pass: false, detail: (r.stderr || r.stdout).slice(-500) }] }; }
  fs.writeFileSync(path.join(RESULTS, id, 'accept.json'), JSON.stringify(out, null, 2) + '\n');
  console.log(`${id}: ${out.checks.filter((c) => c.pass).length}/${out.checks.length} checks pass`);
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'plan') console.log(JSON.stringify(plan(), null, 2));
else if (cmd === 'accept') for (const id of args) accept(id);
else if (cmd === 'probe') {
  // Small activation probes (not part of the 16-run benchmark): probe <task> <variant...>
  const [task, ...variants] = args;
  await Promise.all(variants.map((v) => runOne(task, v, 1, 0)));
  fs.mkdirSync(path.join(RESULTS, 'probes'), { recursive: true });
  for (const v of variants) {
    const id = runId(task, v, 1);
    fs.rmSync(path.join(RESULTS, 'probes', id), { recursive: true, force: true });
    fs.renameSync(path.join(RESULTS, id), path.join(RESULTS, 'probes', id));
  }
}
else if (cmd === 'prepare') prepare();
else if (cmd === 'run') {
  if (!EXE) throw new Error('set CODEX_EXE');
  const pairs = plan();
  for (const n of args.map(Number)) {
    const p = pairs.find((x) => x.order === n);
    const second = p.first === 'upstream' ? 'fork' : 'upstream';
    const a = runOne(p.task, p.first, p.rep, p.order);
    await new Promise((r) => setTimeout(r, 5000)); // launch order from plan(), then run side by side
    const b = runOne(p.task, second, p.rep, p.order);
    await Promise.all([a, b]);
  }
} else {
  console.log('usage: node run.mjs prepare | plan | run <pair order numbers...>');
}
