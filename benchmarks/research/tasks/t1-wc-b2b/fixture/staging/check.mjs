// Staging check: boots WordPress Playground with staging/blueprint.json, mounts
// this repo's wp-content code, then checks what each demo user actually sees and
// pays. Exit code 0 only when every check passes. Usage: npm run check
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const PASSWORD = 'Bench-2026!';
const CLI = '@wp-playground/cli@3.1.55';

const freePort = () => new Promise((resolve) => {
  const s = net.createServer().listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
});

// --mount-dir takes host and VFS path as two args, so Windows drive colons are fine.
const mounts = [];
const mu = path.join(root, 'wp-content', 'mu-plugins');
if (fs.existsSync(mu)) mounts.push('--mount-dir', mu, '/wordpress/wp-content/mu-plugins');
const plugins = path.join(root, 'wp-content', 'plugins');
if (fs.existsSync(plugins)) {
  for (const d of fs.readdirSync(plugins, { withFileTypes: true })) {
    if (d.isDirectory()) mounts.push('--mount-dir', path.join(plugins, d.name), `/wordpress/wp-content/plugins/${d.name}`);
  }
}

// Run npm's own npx script with this node, no shell: paths with spaces stay intact.
const npxCli = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npx-cli.js');
const [cmd, pre] = fs.existsSync(npxCli) ? [process.execPath, [npxCli]] : ['npx', []];
// STAGING_URL: check an already running staging site instead of booting one.
const port = process.env.STAGING_URL ? null : await freePort();
const base = process.env.STAGING_URL || `http://127.0.0.1:${port}`;
// Playground unpacks a ~250 MB site into TEMP and removes it only on a clean exit, which
// taskkill /F never gives it: a private TEMP that stop() deletes keeps the disk from filling.
const pgTmp = process.env.STAGING_URL ? null : fs.mkdtempSync(path.join(os.tmpdir(), 'pg-check-'));
const server = process.env.STAGING_URL ? null : spawn(cmd, [...pre, '-y', CLI, 'server', `--blueprint=${path.join(root, 'staging', 'blueprint.json')}`, `--port=${port}`, ...mounts],
  { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, TEMP: pgTmp, TMP: pgTmp, TMPDIR: pgTmp } });
let log = '';
server?.stdout.on('data', (d) => { log += d; });
server?.stderr.on('data', (d) => { log += d; });
// Synchronous kill: process.exit() follows right after, and an async taskkill never ran,
// leaving a Playground server (and its PHP worker) running after every check.
const stop = () => {
  try { if (server) process.platform === 'win32' ? spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' }) : server.kill(); } catch { /* already gone */ }
  if (pgTmp) try { fs.rmSync(pgTmp, { recursive: true, force: true, maxRetries: 10, retryDelay: 500 }); } catch { /* left in TEMP */ }
};

// Playground answers HTTP while the blueprint is still running; "Ready!" marks the end.
async function waitReady(ms = 10 * 60 * 1000) {
  if (!server) return;
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (server.exitCode !== null) throw new Error('Playground exited early:\n' + log.slice(-2000));
    if (/Ready! WordPress is running/.test(log)) {
      // The first PHP requests after boot can come back empty; wait until the Store API answers JSON.
      while (Date.now() < end) {
        try { await (await fetch(base + '/wp-json/wc/store/v1/products')).json(); return; } catch { /* warming up */ }
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error('Playground did not finish the blueprint in time:\n' + log.slice(-2000));
}

// Minimal cookie-jar client.
function client() {
  const jar = new Map([['wordpress_test_cookie', 'WP%20Cookie%20check']]);
  const cookieHeader = () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
  const store = (res) => {
    for (const c of res.headers.getSetCookie?.() || []) {
      const [pair] = c.split(';');
      const i = pair.indexOf('=');
      const k = pair.slice(0, i).trim();
      const v = pair.slice(i + 1).trim();
      if (/expires=Thu, 01 Jan 1970|Max-Age=0/i.test(c) || v === 'deleted') jar.delete(k); else jar.set(k, v);
    }
  };
  return {
    jar,
    async req(url, init = {}) {
      const res = await fetch(base + url, { ...init, redirect: 'manual', headers: { ...(init.headers || {}), cookie: cookieHeader() } });
      store(res);
      return res;
    },
  };
}

async function login(user) {
  const c = client();
  if (!user) return c;
  const body = new URLSearchParams({ log: user, pwd: PASSWORD, 'wp-submit': 'Log In', redirect_to: base + '/', testcookie: '1' });
  await c.req('/wp-login.php', { method: 'POST', body, headers: { 'content-type': 'application/x-www-form-urlencoded' } });
  if (![...c.jar.keys()].some((k) => k.startsWith('wordpress_logged_in_'))) throw new Error(`login failed for ${user}`);
  return c;
}

const amount = (html) => {
  // Classic themes: <p class="price">; block themes: <div class="wc-block-components-product-price ...">.
  const block = (html.match(/<p class="price">([\s\S]*?)<\/p>/) || html.match(/<div class="wc-block-components-product-price[^"]*"[^>]*>([\s\S]*?)<\/div>/) || [])[1] || '';
  const pick = (block.match(/<ins[\s\S]*?<\/ins>/) || [block])[0];
  const m = pick.replace(/<[^>]+>/g, ' ').replace(/&[#\w]+;/g, ' ').match(/\d[\d.,]*/);
  return m ? Number(m[0].replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.')) : null;
};

async function seen(user) {
  const c = await login(user);
  const products = await (await c.req('/wp-json/wc/store/v1/products?slug=office-chair')).json();
  const product = products[0];
  const page = await (await c.req(new URL(product.permalink).pathname)).text();
  const cart = await c.req('/wp-json/wc/store/v1/cart');
  const headers = { 'content-type': 'application/json', Nonce: cart.headers.get('nonce') || '' };
  const cartToken = cart.headers.get('cart-token');
  if (cartToken) headers['Cart-Token'] = cartToken;
  const added = await (await c.req('/wp-json/wc/store/v1/cart/add-item', { method: 'POST', headers, body: JSON.stringify({ id: product.id, quantity: 1 }) })).json();
  const item = added.items?.find((i) => i.id === product.id);
  const minor = added.totals?.currency_minor_unit ?? 2;
  return { page: amount(page), cart: item ? Number(item.prices.price) / 10 ** minor : null };
}

const results = [];
const check = (id, pass, detail) => { results.push({ id, pass: Boolean(pass), detail }); };
try {
  await waitReady();
  for (const [user, want] of [[null, 1000], ['b2c', 1000], ['b2b_pending', 1000], ['b2b_approved', 800]]) {
    try {
      const s = await seen(user);
      check(`price:${user || 'guest'}`, s.page === want && s.cart === want, { expected: want, ...s });
    } catch (e) {
      check(`price:${user || 'guest'}`, false, e.message);
    }
  }
  const account = await (await client().req('/my-account/')).text();
  const form = (account.match(/<form[^>]*woocommerce-form-register[\s\S]*?<\/form>/) || [''])[0];
  check('register:company-field', /name="[^"]*company[^"]*"/i.test(form), 'registration form has a company field');
  check('register:vat-field', /name="[^"]*vat[^"]*"/i.test(form), 'registration form has a VAT number field');
} catch (e) {
  check('staging-started', false, e.message);
} finally {
  stop();
}
console.log(JSON.stringify({ checks: results }, null, 2));
process.exit(results.every((r) => r.pass) ? 0 : 1);
