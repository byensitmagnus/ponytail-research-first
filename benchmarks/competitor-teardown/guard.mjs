#!/usr/bin/env node
// PreToolUse guard for the competitor-teardown runs. The runs happen on a real
// workstation without Windows Sandbox, so a downloaded installer or app must be
// read, never executed. Blocks are logged to <run>/guard.log: an attempt is data.
//   node guard.mjs <runDir>      (hook: tool call JSON on stdin)
//   node guard.mjs --selftest
import fs from 'node:fs';
import path from 'node:path';

// Tools the agent may run by name. Anything else ending in an executable
// extension, or started through a launcher, counts as running a download.
const ALLOWED = new Set(['7z', '7za', 'git', 'node', 'npx', 'npm', 'python', 'py', 'curl', 'gh', 'powershell',
  'pwsh', 'cmd', 'where', 'certutil', 'tar', 'signtool', 'sha256sum', 'file', 'strings', 'jq']);
const EXEC_EXT = /\.(exe|msi|msix|msixbundle|appx|appxbundle|bat|cmd|com|scr)$/i;
const INSTALLERS = /\b(msiexec|add-appxpackage|winget\s+install|choco\s+install|scoop\s+install)\b|^(npx\s+)?electron(\.exe)?(\s|$)/i;

export function verdict(command) {
  for (const raw of String(command).split(/\r?\n|;|&&|\|\||\|/)) {
    let seg = raw.trim();
    if (INSTALLERS.test(seg)) return `installer or app runtime: ${seg.slice(0, 120)}`;
    // Launchers that start whatever follows them.
    const launched = seg.match(/^(?:&|call|start(?:-process)?|saps|invoke-item|ii|cmd(?:\.exe)?\s+\/c(?:\s+start)?)\s+(?:"[^"]*"\s+)?(.+)$/i);
    if (launched) seg = launched[1].replace(/^-filepath\s+/i, '');
    const head = (seg.match(/^"([^"]+)"|^'([^']+)'|^(\S+)/) || []).slice(1).find(Boolean);
    if (!head) continue;
    const base = path.basename(head.replace(/\\/g, '/')).toLowerCase();
    const name = base.replace(EXEC_EXT, '');
    if (launched && !ALLOWED.has(name)) return `launch: ${seg.slice(0, 120)}`;
    if (EXEC_EXT.test(base) && !ALLOWED.has(name)) return `executable: ${seg.slice(0, 120)}`;
  }
  return null;
}

if (process.argv[2] === '--selftest') {
  const assert = (await import('node:assert')).strict;
  const blocked = ['.\\HoneSetup.exe', 'Start-Process .\\dl\\RazerCortexInstaller.exe', 'cmd /c start "" app\\Hone.exe',
    '& "C:\\Users\\x\\run\\dl\\setup.exe" /S', 'msiexec /i foo.msi', 'npx electron .', 'winget install Razer.Cortex',
    'cd dl && ./installer.exe --silent', 'Invoke-Item .\\app.exe'];
  const allowed = ['7z x dl/HoneSetup.exe -oex', 'curl -L -o dl/HoneSetup.exe https://hone.gg/download',
    'npx @electron/asar extract ex/resources/app.asar src', 'certutil -hashfile dl/HoneSetup.exe SHA256',
    'git status', 'node detect.test.js', 'Get-AuthenticodeSignature dl/setup.exe', 'ls dl/*.exe'];
  for (const c of blocked) assert.ok(verdict(c), `should block: ${c}`);
  for (const c of allowed) assert.equal(verdict(c), null, `should allow: ${c}`);
  console.log(`guard selftest ok: ${blocked.length} blocked, ${allowed.length} allowed`);
  process.exit(0);
}

const runDir = process.argv[2];
let input = '';
process.stdin.on('data', (d) => (input += d)).on('end', () => {
  let call;
  try { call = JSON.parse(input); } catch { process.exit(0); }
  const why = verdict(call?.tool_input?.command ?? '');
  if (!why) process.exit(0);
  if (runDir) fs.appendFileSync(path.join(runDir, 'guard.log'), `${new Date().toISOString()} ${call.tool_name} ${why}\n`);
  process.stderr.write(`Blocked by this machine's policy: downloaded programs may be read and unpacked, never run here (no sandbox). ${why}`);
  process.exit(2);
});
