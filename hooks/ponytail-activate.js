#!/usr/bin/env node
// ponytail — Claude Code SessionStart activation hook (also Codex, Copilot,
// Grok and Cursor sessionStart)
//
// Runs on every session start:
//   1. Writes flag file at $CLAUDE_CONFIG_DIR/.ponytail-active (defaults to ~/.claude; statusline reads this)
//   2. Emits ponytail ruleset as hidden SessionStart context
//   3. Detects missing statusline config and emits setup nudge
//
// A resume or compact continues the session, so the level the user chose with
// /ponytail (including off) is kept; startup and clear start from the default.

const fs = require('fs');
const path = require('path');
const { getDefaultMode, getClaudeDir, isShellSafe } = require('./ponytail-config');
const { getPonytailInstructions } = require('./ponytail-instructions');
const {
  clearMode,
  cursorRuleNotice,
  cursorRulePath,
  isCodex,
  isCopilot,
  isCursor,
  isZCode,
  readMode,
  setMode,
  writeHookOutput,
} = require('./ponytail-runtime');

const claudeDir = getClaudeDir();
const settingsPath = path.join(claudeDir, 'settings.json');

function activate(event) {
  // ponytail: no flag on resume/compact means the user switched ponytail off
  // earlier in this session. A session resumed from before the plugin was
  // installed also has no flag and stays off until the next startup.
  const continued = event.source === 'resume' || event.source === 'compact';
  const mode = continued ? (readMode() || 'off') : getDefaultMode();

  // "off" mode — skip activation entirely, don't write flag or emit rules
  if (mode === 'off') {
    clearMode();
    const hookOutput = (isCodex || isCopilot || isCursor || isZCode) ? '' : 'OK';
    writeHookOutput('SessionStart', 'off', hookOutput);
    process.exit(0);
  }

  // Cursor with the always-on rule in the workspace: the rule already carries the
  // ruleset and would contradict any other level, so leave the flag alone and
  // hand the model a one-line notice instead of a second copy (#817).
  if (isCursor) {
    const rule = cursorRulePath();
    if (rule) {
      try {
        writeHookOutput('SessionStart', mode, cursorRuleNotice(rule));
      } catch (e) {
        // Silent fail — stdout closed/EPIPE at hook exit must not surface as a hook failure
      }
      process.exit(0);
    }
  }

  // 1. Write flag file
  try {
    setMode(mode);
  } catch (e) {
    // Silent fail -- flag is best-effort, don't block the hook
  }

  // 2. Emit the ponytail ruleset, filtered to the active intensity level.
  let output = getPonytailInstructions(mode);

  // 3. Detect missing statusline config — nudge Claude to help set it up
  if (!isCodex && !isCopilot && !isCursor && !isZCode) try {
    let hasStatusline = false;
    if (fs.existsSync(settingsPath)) {
      // Strip UTF-8 BOM some editors prepend on Windows (breaks JSON.parse)
      const raw = fs.readFileSync(settingsPath, 'utf8').replace(/^﻿/, '');
      const settings = JSON.parse(raw);
      if (settings.statusLine) {
        hasStatusline = true;
      }
    }

    // Nudge at most once — the flag file marks that the user has already seen
    // (and implicitly declined) the statusline setup offer. Repeating it every
    // session start turns a helpful hint into a nag.
    const nudgeFlagPath = path.join(claudeDir, '.ponytail-statusline-nudged');
    if (!hasStatusline && !fs.existsSync(nudgeFlagPath)) {
      try { fs.writeFileSync(nudgeFlagPath, ''); } catch (e) { /* best-effort */ }
      const isWindows = process.platform === 'win32';
      const scriptName = isWindows ? 'ponytail-statusline.ps1' : 'ponytail-statusline.sh';
      const scriptPath = path.join(__dirname, scriptName);
      if (isShellSafe(scriptPath)) {
        const command = isWindows
          ? `powershell -ExecutionPolicy Bypass -File "${scriptPath}"`
          : `bash "${scriptPath}"`;
        const statusLineSnippet =
          '"statusLine": { "type": "command", "command": ' + JSON.stringify(command) + ' }';
        output += "\n\n" +
          "STATUSLINE SETUP NEEDED: The ponytail plugin includes a statusline badge showing active mode " +
          "(e.g. [PONYTAIL], [PONYTAIL:ULTRA]). It is not configured yet. " +
          "To enable, add this to " + settingsPath + ": " +
          statusLineSnippet + " " +
          "Proactively offer to set this up for the user on first interaction.";
      } else {
        // ponytail: install path has shell metacharacters — don't embed it in a
        // command snippet; have the agent wire it up by hand instead.
        output += "\n\n" +
          "STATUSLINE SETUP NEEDED: The ponytail plugin includes a statusline badge showing active mode. " +
          "Its install path contains characters unsafe to embed in a shell command, so configure it manually: " +
          "add a statusLine command of type \"command\" that runs " + scriptName +
          " from the plugin's hooks directory to " + settingsPath + ", quoting/escaping the path for your shell. " +
          "Proactively offer to set this up for the user on first interaction.";
      }
    }
  } catch (e) {
    // Silent fail — don't block session start over statusline detection
  }

  try {
    writeHookOutput('SessionStart', mode, output);
  } catch (e) {
    // Silent fail — stdout closed/EPIPE at hook exit must not surface as a hook failure
  }
}

// The SessionStart event arrives as JSON on stdin ({ source: "startup" | "resume" |
// "clear" | "compact", ... }). Same never-hang contract as the mode tracker (#443):
// if stdin never ends, act on whatever arrived after one second.
let input = '';
let started = false;
function start() {
  if (started) return;
  started = true;
  let event = {};
  try { event = JSON.parse(input.replace(/^﻿/, '') || '{}'); } catch (e) { /* not JSON: treat as startup */ }
  activate(event);
}
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', start);
process.stdin.on('error', () => { start(); process.exit(0); });
setTimeout(() => { start(); process.exit(0); }, 1000).unref();
