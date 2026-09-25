// Claude Haiku 4.5 subagent arm of the research benchmark (PREREGISTRATION.md, Amendment 1).
// The subagents themselves are spawned by the orchestrating Claude Code session; this script
// prepares their working folders and prompts, and turns their transcripts into results.
//   node subagent.mjs rules                 what each arm's SessionStart hook injects (Claude Code form)
//   node subagent.mjs prepare <pair order> [arm]  both runs of a plan() pair (or one arm): folders, git baseline, prompts
//   node subagent.mjs finish <id> <transcript.jsonl> <total_tokens> <tool_uses> <duration_ms>
// Env: BENCH_ROOT (default %USERPROFILE%\ponytail-haiku), VARIANTS_ROOT (default %USERPROFILE%\ponytail-bench).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { BENCH, VARIANTS, copyTree, plan, runId } from './lib.mjs';
import { addedDeps, decisionCoverage, verify } from './evidence.mjs';

const ROOT = process.env.BENCH_ROOT || path.join(os.homedir(), 'ponytail-haiku');
const VARIANTS_ROOT = process.env.VARIANTS_ROOT || path.join(os.homedir(), 'ponytail-bench');
const RESULTS = path.join(BENCH, 'results');
const RULES = path.join(RESULTS, 'haiku-rules');
const PYTHON = path.join(VARIANTS_ROOT, 'tools', 'python312', 'python.exe').replace(/\\/g, '/');

export const ENV_NOTE_HAIKU = [
  '',
  '---',
  'Environment: Windows. Your Bash tool runs Git Bash (PowerShell is also available). Node 24 with',
  `npm and npx, git, and Python 3.12 at ${PYTHON} (create a virtualenv inside the working folder).`,
  'gh is logged in: read-only use is fine (search, view, GET requests); never create, fork, star,',
  'edit or push anything. Do not use the Skill or Agent tools. Change nothing outside the working',
  'folder. Time limit: 30 minutes. Record every third-party dependency or plugin you add in',
  'DECISION.md: name, exact version, license, and why it fits. Finish with a short summary.',
].join('\n');

function rules() {
  fs.mkdirSync(RULES, { recursive: true });
  for (const arm of Object.keys(VARIANTS)) {
    const plugin = path.join(VARIANTS_ROOT, 'variants', arm, 'market', 'plugin');
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'rules-'));
    fs.mkdirSync(path.join(home, '.claude'), { recursive: true });
    fs.writeFileSync(path.join(home, '.claude', '.ponytail-statusline-nudged'), ''); // no statusline setup text
    const env = { ...process.env, HOME: home, USERPROFILE: home, CLAUDE_CONFIG_DIR: path.join(home, '.claude'), PONYTAIL_DEFAULT_MODE: 'full' };
    for (const k of ['PLUGIN_DATA', 'COPILOT_PLUGIN_DATA', 'QODER_SESSION_ID', 'CURSOR_VERSION', 'ZCODE_SESSION_ID', 'CLAUDE_PLUGIN_ROOT']) delete env[k];
    const r = spawnSync(process.execPath, [path.join(plugin, 'hooks', 'ponytail-activate.js')], { env, input: '{"source":"startup"}', encoding: 'utf8' });
    fs.writeFileSync(path.join(RULES, `${arm}.txt`), r.stdout);
    fs.rmSync(home, { recursive: true, force: true });
    console.log(`${arm}: ${r.stdout.length} chars, research rung: ${r.stdout.includes('Already built out there')}`);
  }
}

function git(work, args) {
  return spawnSync('git', ['-c', 'user.name=bench', '-c', 'user.email=bench@example.test', '-c', 'core.autocrlf=false', ...args], { cwd: work, encoding: 'utf8' });
}

export function buildPrompt(task, arm, work) {
  const ruleText = fs.readFileSync(path.join(RULES, `${arm}.txt`), 'utf8').trim();
  const taskText = fs.readFileSync(path.join(BENCH, 'tasks', task, 'TASK.md'), 'utf8').trim();
  return [
    '<session-rules>', ruleText, '</session-rules>', '',
    `Working folder: ${work.replace(/\\/g, '/')} (everything you create or change must be inside it).`, '',
    taskText, ENV_NOTE_HAIKU, '',
  ].join('\n');
}

function prepare(order, only) {
  const p = plan().find((x) => x.order === Number(order));
  const arms = [p.first, p.first === 'upstream' ? 'fork' : 'upstream'];
  // `only`: re-prepare one arm (a contaminated re-run) without touching its running partner
  const out = arms.filter((arm) => !only || arm === only).map((arm) => {
    const id = runId(p.task, arm, p.rep);
    const dir = path.join(ROOT, 'runs', id);
    const work = path.join(dir, 'work');
    fs.rmSync(dir, { recursive: true, force: true });
    copyTree(path.join(BENCH, 'tasks', p.task, 'fixture'), work);
    fs.appendFileSync(path.join(work, '.gitignore'), '\nnode_modules/\n.venv/\n__pycache__/\ndist/\n');
    git(work, ['init', '-q']); git(work, ['add', '-A']); git(work, ['commit', '-q', '-m', 'baseline']);
    const promptFile = path.join(dir, 'prompt.txt');
    fs.writeFileSync(promptFile, buildPrompt(p.task, arm, work));
    fs.writeFileSync(path.join(dir, 'prepared.json'), JSON.stringify({ id, task: p.task, arm, rep: p.rep, order: p.order, launch: arms.indexOf(arm) + 1, preparedAt: new Date().toISOString() }));
    return { id, work, promptFile };
  });
  console.log(JSON.stringify(out, null, 2));
}

// Evidence from a Claude Code subagent transcript (JSONL).
const REGISTRY = /(registry\.npmjs\.org|npm (view|info|search)|pypi\.org\/(pypi|project|simple)|pip (index|download|show)|api\.wordpress\.org\/plugins|wordpress\.org\/plugins\/|api\.github\.com|gh (search|repo view|api)|github\.com\/[^/\s]+\/[^/\s'"]+)/i;
const THIRD_PARTY = /(node_modules[\\/]|site-packages[\\/]|downloads\.wordpress\.org|plugins\.(svn|trac)\.wordpress\.org|raw\.githubusercontent\.com|github\.com\/[^/\s]+\/[^/\s]+\/(blob|tree)\/|unpkg\.com|cdn\.jsdelivr\.net)/i;
const LEAK = /(ponytail-harness|ponytail-bench[\\/](ref-|variants|runs)|PREREGISTRATION|GRADER\.md|[\\/]reference[\\/]|[\\/]accept[\\/])/i;
const GH_WRITE = /\bgh\s+(repo\s+(create|fork|edit|delete)|pr\s+create|issue\s+create|api\s+.*-X\s*(POST|PUT|PATCH|DELETE))|\bgit\s+push\b|starred/i;

export function extractClaude(lines) {
  const ev = { searches: [], pagesOpened: [], commands: 0, commandFailures: 0, registryLookups: [], thirdPartyReads: [], fileChanges: 0, forbiddenTools: [], leaks: [], ghWrites: [] };
  let contaminated = false;
  let firstResearch = -1;
  let firstChange = -1;
  let i = 0;
  const texts = [];
  for (const x of lines) {
    if (x.type === 'attachment' && /hook/.test(x.attachment?.type || '') && JSON.stringify(x.attachment).includes('PONYTAIL')) contaminated = true;
    const content = x.type === 'assistant' && Array.isArray(x.message?.content) ? x.message.content : [];
    for (const b of content) {
      if (b.type === 'text') texts.push(b.text);
      if (b.type !== 'tool_use') continue;
      i++;
      const input = b.input || {};
      const s = JSON.stringify(input);
      if (LEAK.test(s)) ev.leaks.push(`${b.name}: ${s.slice(0, 200)}`);
      if (b.name === 'Skill' || b.name === 'Agent' || b.name === 'Task') ev.forbiddenTools.push(b.name);
      if (b.name === 'WebSearch') { ev.searches.push(input.query); if (firstResearch < 0) firstResearch = i; }
      else if (b.name === 'WebFetch') { ev.pagesOpened.push(input.url); if (firstResearch < 0) firstResearch = i; if (THIRD_PARTY.test(input.url || '')) ev.thirdPartyReads.push(input.url); }
      else if (b.name === 'Bash' || b.name === 'PowerShell') {
        ev.commands++;
        const cmd = String(input.command || '');
        if (GH_WRITE.test(cmd)) ev.ghWrites.push(cmd.slice(0, 200));
        if (REGISTRY.test(cmd)) { ev.registryLookups.push(cmd.slice(0, 300)); if (firstResearch < 0) firstResearch = i; }
        if (THIRD_PARTY.test(cmd)) ev.thirdPartyReads.push(cmd.slice(0, 300));
      } else if (b.name === 'Read' && THIRD_PARTY.test(input.file_path || '')) ev.thirdPartyReads.push(input.file_path);
      else if (['Write', 'Edit', 'NotebookEdit'].includes(b.name)) { ev.fileChanges++; if (firstChange < 0) firstChange = i; }
    }
  }
  const allText = texts.join('\n');
  return {
    ...ev,
    contaminated,
    researchLine: /^\s*\**Research:?\**/im.test(allText),
    researchedBeforeFirstChange: firstResearch >= 0 && (firstChange < 0 || firstResearch < firstChange),
    finalText: texts[texts.length - 1] || '',
  };
}

// Summed over the model calls (one per message id): what the run cost, while total_tokens
// from the task notification is only the final context size.
function modelUsage(lines) {
  const byId = new Map();
  for (const l of lines) if (l.type === 'assistant' && l.message?.usage) byId.set(l.message.id, l.message.usage);
  const sum = (k) => [...byId.values()].reduce((s, u) => s + (u[k] || 0), 0);
  return { model_calls: byId.size, input_tokens: sum('input_tokens'), cache_read_input_tokens: sum('cache_read_input_tokens'), cache_creation_input_tokens: sum('cache_creation_input_tokens'), output_tokens: sum('output_tokens') };
}

async function finish(id, transcript, tokens, toolUses, ms) {
  const dir = path.join(ROOT, 'runs', id);
  const work = path.join(dir, 'work');
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'prepared.json'), 'utf8'));
  const raw = fs.readFileSync(transcript, 'utf8');
  const lines = raw.split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return {}; } });
  // the task .output file is empty on Windows; the transcript is subagents/agent-<id>.jsonl
  if (!lines.some((l) => l.type === 'user')) throw new Error(`${transcript}: no transcript lines`);
  const ev = extractClaude(lines);
  // the orchestrator pastes prompt.txt into the Agent call; prove the subagent got exactly that text
  const first = lines.find((l) => l.type === 'user')?.message?.content;
  const firstText = typeof first === 'string' ? first : (first || []).filter((c) => c.type === 'text').map((c) => c.text).join('');
  const lf = (t) => t.replace(/\r\n/g, '\n').trim();
  const promptMatches = lf(firstText) === lf(fs.readFileSync(path.join(dir, 'prompt.txt'), 'utf8'));
  const stamps = lines.map((l) => l.timestamp).filter(Boolean).sort();
  git(work, ['add', '-A']);
  // diff against the baseline commit: an agent may commit its own work, which moves HEAD
  const base = git(work, ['rev-list', '--max-parents=0', 'HEAD']).stdout.trim();
  const agentCommits = Number(git(work, ['rev-list', '--count', 'HEAD']).stdout.trim()) - 1;
  const numstat = git(work, ['diff', '--cached', '--numstat', base, '--', '.', ':(exclude)*lock*', ':(exclude)*.lock']).stdout.split('\n').filter(Boolean).map((l) => l.split('\t'));
  const res = path.join(RESULTS, id);
  fs.rmSync(res, { recursive: true, force: true });
  fs.mkdirSync(res, { recursive: true });
  const run = {
    id, task: meta.task, variant: meta.arm, rep: meta.rep, order: meta.order, launch: meta.launch, variantSha: VARIANTS[meta.arm].sha,
    agent: 'Claude Haiku 4.5 subagent (general-purpose), orchestrated by a Claude Code session', transcriptFormat: 'claude-code-subagent',
    promptSha256: (await import('node:crypto')).createHash('sha256').update(fs.readFileSync(path.join(dir, 'prompt.txt'))).digest('hex'),
    started: stamps[0] || null, ended: stamps[stamps.length - 1] || null, minutes: +(Number(ms) / 60000).toFixed(2),
    usage: { total_tokens: Number(tokens), tool_uses: Number(toolUses), ...modelUsage(lines) },
    sharedContextSha256: (await import('node:crypto')).createHash('sha256').update(JSON.stringify(lines.filter((l) => l.attachment?.type === 'instructions').map((l) => l.attachment.files?.map((x) => x.content)))).digest('hex'),
    promptMatches, agentCommits, contaminated: ev.contaminated, leaks: ev.leaks, forbiddenTools: ev.forbiddenTools, ghWrites: ev.ghWrites,
    diff: { files: numstat.length, added: numstat.reduce((s, l) => s + (+l[0] || 0), 0), deleted: numstat.reduce((s, l) => s + (+l[1] || 0), 0), numstat: numstat.map((l) => l.join(' ')) },
  };
  fs.writeFileSync(path.join(res, 'run.json'), JSON.stringify(run, null, 2) + '\n');
  fs.writeFileSync(path.join(res, 'events.jsonl.gz'), zlib.gzipSync(raw));
  fs.writeFileSync(path.join(res, 'diff.patch'), git(work, ['diff', '--cached', base, '--', '.', ':(exclude)*lock*', ':(exclude)*.lock', ':(exclude)data/*']).stdout);
  fs.writeFileSync(path.join(res, 'last.md'), ev.finalText);
  if (fs.existsSync(path.join(work, 'DECISION.md'))) fs.copyFileSync(path.join(work, 'DECISION.md'), path.join(res, 'DECISION.md'));
  const deps = await Promise.all(addedDeps(meta.task, work, path.join(BENCH, 'tasks', meta.task, 'fixture')).map(verify));
  const decision = fs.existsSync(path.join(res, 'DECISION.md')) ? fs.readFileSync(path.join(res, 'DECISION.md'), 'utf8') : '';
  const { finalText, ...evidence } = ev;
  fs.writeFileSync(path.join(res, 'evidence.json'), JSON.stringify({ id, ...evidence, deps, decisionCoverage: decisionCoverage(deps, decision), hasDecision: Boolean(decision) }, null, 2) + '\n');
  console.log(`${id}: ${run.minutes} min, ${run.usage.total_tokens} tokens, +${run.diff.added} lines, searches=${ev.searches.length} pages=${ev.pagesOpened.length} registry=${ev.registryLookups.length} promptMatches=${promptMatches} contaminated=${ev.contaminated} leaks=${ev.leaks.length} forbidden=${ev.forbiddenTools.length} ghWrites=${ev.ghWrites.length}`);
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'rules') rules();
else if (cmd === 'prepare') prepare(args[0], args[1]);
else if (cmd === 'finish') await finish(...args);
else if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) console.log('usage: node subagent.mjs rules | prepare <pair> | finish <id> <transcript> <tokens> <toolUses> <ms>');
