#!/usr/bin/env node
// Lists what an agent did in a run: searches, fetches, commands, files it wrote,
// images and downloads in the run folder. Scoring against the checklist stays manual.
//   node summarize.mjs <runId>
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.env.TEARDOWN_ROOT || 'C:/Users/Usmo1/pt-teardown';
const runId = process.argv[2];
if (!runId) { console.error('usage: node summarize.mjs <runId>'); process.exit(2); }
const dir = path.join(ROOT, runId);
const log = ['events.jsonl', 'stream.jsonl'].map((f) => path.join(ROOT, `${runId}.${f}`)).find(fs.existsSync);
const events = fs.readFileSync(log, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

const steps = [];
for (const e of events) {
  // Codex: {type:'item.completed', item:{type, ...}}
  const it = e.type === 'item.completed' ? e.item : null;
  if (it?.type === 'command_execution') steps.push(['cmd', `${it.command} → exit ${it.exit_code}`]);
  else if (it?.type === 'web_search') steps.push(['search', it.query ?? JSON.stringify(it.action ?? it)]);
  else if (it?.type === 'mcp_tool_call') steps.push(['mcp', `${it.server}.${it.tool} ${JSON.stringify(it.arguments ?? '').slice(0, 160)}`]);
  else if (it?.type === 'file_change') for (const c of it.changes ?? []) steps.push(['file', `${c.kind} ${c.path}`]);
  else if (it?.type === 'agent_message') steps.push(['say', it.text]);
  else if (it?.type === 'error') steps.push(['error', it.message]);
  // Claude stream-json: assistant messages carry tool_use blocks.
  for (const b of e.type === 'assistant' ? e.message?.content ?? [] : []) {
    if (b.type === 'tool_use') steps.push(['tool', `${b.name} ${JSON.stringify(b.input).slice(0, 200)}`]);
    if (b.type === 'text' && b.text.trim()) steps.push(['say', b.text]);
  }
  if (e.type === 'turn.completed' || e.type === 'result') steps.push(['usage', JSON.stringify(e.usage ?? e.total_cost_usd ?? '')]);
}

const walk = (d) => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((x) => {
  const p = path.join(d, x.name);
  return x.isDirectory() ? (x.name === 'node_modules' || x.name === '.git' ? [] : walk(p)) : [p];
}) : [];
const files = walk(dir).map((p) => path.relative(dir, p));
const pick = (re) => files.filter((f) => re.test(f));

const out = [];
out.push(`# ${runId}`, '', `${steps.filter((s) => s[0] === 'cmd' || s[0] === 'tool').length} commands/tool calls, ${steps.filter((s) => s[0] === 'search').length} web searches, ${files.length} files`, '');
out.push('## Steps', ...steps.map(([k, v]) => `- **${k}** ${String(v).replace(/\s+/g, ' ').slice(0, k === 'say' ? 600 : 300)}`), '');
out.push('## Images', ...pick(/\.(png|jpe?g|webp|gif)$/i).map((f) => `- ${f}`), '');
out.push('## Downloads and archives', ...pick(/\.(exe|msi|msix|appx|zip|7z|asar|nupkg|dmg|ipa|apk)$/i).map((f) => `- ${f} (${fs.statSync(path.join(dir, f)).size} bytes)`), '');
out.push('## Files written', ...files.filter((f) => !/[\\/](extract|unpacked|ex|src-ext)[\\/]/i.test(f)).slice(0, 60).map((f) => `- ${f}`), '');
const notes = files.find((f) => /^notes\.md$/i.test(f));
if (notes) out.push('## NOTES.md', '', fs.readFileSync(path.join(dir, notes), 'utf8'));
fs.writeFileSync(path.join(ROOT, `${runId}.SUMMARY.md`), out.join('\n'));
console.log(`${ROOT}/${runId}.SUMMARY.md: ${steps.length} steps, ${pick(/\.(png|jpe?g|webp)$/i).length} images, ${pick(/\.(exe|msi|zip|asar)$/i).length} downloads/archives`);
