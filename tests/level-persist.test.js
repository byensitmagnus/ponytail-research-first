#!/usr/bin/env node
// "Level persists until changed or session end": a resume or compact fires
// SessionStart again and must keep the level chosen with /ponytail, including off.
// Before the fix, compact reset ultra to the default and turned ponytail back on
// after "stop ponytail" (found live in Codex, 2026-09-25).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const hooks = path.join(__dirname, '..', 'hooks');

test('resume/compact keep the chosen level and off; startup resets to the default', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ponytail-level-'));
  try {
    const env = { ...process.env, HOME: home, USERPROFILE: home, CLAUDE_CONFIG_DIR: path.join(home, '.claude'), PONYTAIL_DEFAULT_MODE: 'full' };
    for (const k of ['PLUGIN_DATA', 'COPILOT_PLUGIN_DATA', 'QODER_SESSION_ID', 'CURSOR_VERSION', 'ZCODE_SESSION_ID', 'CLAUDE_PLUGIN_ROOT']) delete env[k];
    const flag = path.join(home, '.claude', '.ponytail-active');
    const activate = (source) => spawnSync(process.execPath, [path.join(hooks, 'ponytail-activate.js')], { env, input: JSON.stringify({ hook_event_name: 'SessionStart', source }), encoding: 'utf8' }).stdout;
    const prompt = (text) => spawnSync(process.execPath, [path.join(hooks, 'ponytail-mode-tracker.js')], { env, input: JSON.stringify({ prompt: text }), encoding: 'utf8' }).stdout;
    const level = () => (fs.existsSync(flag) ? fs.readFileSync(flag, 'utf8') : 'off');

    assert.match(activate('startup'), /level: full/);
    prompt('/ponytail ultra');
    assert.equal(level(), 'ultra');
    assert.match(activate('compact'), /level: ultra/);
    assert.equal(level(), 'ultra');

    prompt('/ponytail off');
    assert.equal(level(), 'off');
    assert.doesNotMatch(activate('resume'), /PONYTAIL MODE ACTIVE/);
    assert.equal(level(), 'off');

    assert.match(activate('startup'), /level: full/);
    assert.equal(level(), 'full');
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});
