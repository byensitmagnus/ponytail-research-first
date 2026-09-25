#!/usr/bin/env node
// ZCode drops hook stdout that is not a JSON object (zcode.cjs: `if(!r.startsWith("{"))return`),
// so SessionStart must emit hookSpecificOutput JSON carrying the ruleset, research-first rung included.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

test('ZCode SessionStart emits JSON with the research-first ruleset and its own state flag', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ponytail-zcode-'));
  try {
    const env = { ...process.env, HOME: home, USERPROFILE: home, ZCODE_SESSION_ID: 's1', PONYTAIL_DEFAULT_MODE: 'full' };
    for (const k of ['PLUGIN_DATA', 'COPILOT_PLUGIN_DATA', 'QODER_SESSION_ID', 'CURSOR_VERSION', 'CLAUDE_PLUGIN_ROOT', 'CLAUDE_CONFIG_DIR']) delete env[k];
    const r = spawnSync(process.execPath, [path.join(__dirname, '..', 'hooks', 'ponytail-activate.js')], { env, input: '{}', encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.equal(out.hookSpecificOutput.hookEventName, 'SessionStart');
    assert.match(out.hookSpecificOutput.additionalContext, /Already built out there/);
    assert.doesNotMatch(out.hookSpecificOutput.additionalContext, /STATUSLINE SETUP/);
    assert.equal(fs.readFileSync(path.join(home, '.zcode', '.ponytail-active'), 'utf8'), 'full');
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});
