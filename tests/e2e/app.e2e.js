// End-to-end tests in a real browser (Chromium, iPad-sized touch screen),
// against the built site in _site/ served from localhost so the service
// worker runs. Run with: npm run e2e   (builds first)
import { test, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const SITE = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '_site');
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml',
};

let server;
let base;
let browser;
let swVersionOverride = null; // simulates a new release of sw.js

before(async () => {
  server = createServer(async (req, res) => {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path.endsWith('/')) path += 'index.html';
    try {
      let body = await readFile(join(SITE, path));
      if (path === '/sw.js' && swVersionOverride)
        body = Buffer.from(body.toString().replace(/const VERSION = '[^']+'/, `const VERSION = '${swVersionOverride}'`));
      res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream', 'cache-control': 'no-cache' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('not found');
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}/`;
  browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
});

// Close every page after each test, even a failed one: a page left running
// software WebGL would slow every later test down.
const open = new Set();
afterEach(async () => {
  for (const ctx of open) await ctx.close().catch(() => {});
  open.clear();
  swVersionOverride = null;
});

after(async () => {
  await browser?.close();
  server?.close();
});

async function newPage(context) {
  const ctx = context || (await browser.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: true, acceptDownloads: true }));
  open.add(ctx);
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && page.errors.push(`console: ${m.text()}`));
  return { ctx, page };
}

const ready = (page) => page.waitForFunction(() => window.__game?.world, null, { timeout: 30000 });

async function startPlaying(page, name = 'Freddie') {
  await ready(page);
  const input = page.locator('.title-screen input');
  if (await input.count()) await input.fill(name);
  await page.locator('.play-btn').click();
  await page.waitForFunction(() => __game.started);
}

// Play a full Code Vault run by stepping on the right tile at every door.
async function playVault(page) {
  await page.evaluate(() => __game.go('vault'));
  for (;;) {
    const state = await page.evaluate(() => {
      const w = __game.world;
      return { current: w.current, total: w.doors.length, hasQ: !!w.doors[w.current]?.q };
    });
    if (state.current >= state.total) break;
    if (!state.hasQ) {
      await page.waitForTimeout(100);
      continue;
    }
    await page.evaluate(() => {
      const w = __game.world;
      const door = w.doors[w.current];
      w.choose(door, door.q.answerIndex);
    });
    await page.waitForTimeout(50);
  }
  await page.evaluate(() => __game.world.finish());
  await page.evaluate(() => __game.save.chain);
  await page.waitForSelector('.results');
}

const saveInfo = (page) =>
  page.evaluate(async () => {
    const s = __game.save;
    const ops = await s.getOps();
    return { mode: s.mode, coins: s.data.coins, name: s.data.name, device: s.deviceId, ops: ops.map((o) => ({ k: o.k, n: o.n, a: o.p?.a?.length || 0 })) };
  });

async function openDashboard(page, pin = '2468') {
  await page.evaluate(() => {
    for (const o of document.querySelectorAll('.overlay')) o.remove();
    __game.input.enabled = true;
  });
  await page.locator('.hud-tr .icon-btn[aria-label="Grown-ups"]').click();
  const type = async () => {
    for (const k of pin) await page.locator('.pin-pad button', { hasText: new RegExp(`^${k}$`) }).click();
  };
  await type();
  if (await page.locator('text=Type the same PIN again').count()) await type();
  await page.waitForSelector('.panel.parent');
}

test('boots cleanly, plays a Code Vault run and keeps it after a reload', async () => {
  const { ctx, page } = await newPage();
  await page.goto(base);
  await startPlaying(page);
  const before = await saveInfo(page);
  assert.equal(before.mode, 'idb');
  assert.equal(before.name, 'Freddie');

  await playVault(page);
  const afterRun = await saveInfo(page);
  assert.ok(afterRun.coins > before.coins, 'coins earned');
  const run = afterRun.ops.find((o) => o.k === 'run');
  assert.ok(run && run.a > 0, 'the run and its attempts are in the learning log');

  await page.reload();
  await ready(page);
  const reloaded = await saveInfo(page);
  assert.equal(reloaded.coins, afterRun.coins);
  assert.equal(reloaded.device, afterRun.device);
  assert.deepEqual(reloaded.ops, afterRun.ops);
  assert.deepEqual(page.errors, []);
  await ctx.close();
});

test('every world loads and runs without errors', async () => {
  const { ctx, page } = await newPage();
  await page.goto(base);
  await startPlaying(page);
  for (const w of ['obby', 'vault', 'lab', 'hub']) {
    await page.evaluate((name) => __game.go(name), w);
    await page.waitForTimeout(1500);
    const ok = await page.evaluate((name) => __game.worldName === name && Number.isFinite(__game.player.pos.y), w);
    assert.ok(ok, `${w} is running`);
  }
  assert.deepEqual(page.errors, []);
  await ctx.close();
});

test('the old game save on this iPad is brought over once and left in place', async () => {
  const { ctx, page } = await newPage();
  const v1 = {
    v: 1, name: 'Freddie', coins: 82, xp: 228, owned: ['shirt-blue', 'hat-none', 'trail-none', 'hat-cap'],
    look: { shirt: 'shirt-blue', hat: 'hat-cap', trail: 'trail-none' }, settings: { readAloud: true, dailyMin: 25, pin: '2468' },
  };
  // The v1 save is already there before the new version's first launch.
  await ctx.addInitScript((v) => {
    if (!localStorage.getItem('blox-legends-save-v1')) localStorage.setItem('blox-legends-save-v1', JSON.stringify(v));
  }, v1);
  await page.goto(`${base}?nosw`);
  await ready(page);
  const info = await saveInfo(page);
  assert.equal(info.coins, 82);
  assert.equal(info.ops.filter((o) => o.k === 'import.v1').length, 1);
  const kept = await page.evaluate(() => localStorage.getItem('blox-legends-save-v1'));
  assert.deepEqual(JSON.parse(kept), v1, 'v1 save untouched');
  assert.equal(await page.evaluate(() => __game.save.verifyPin('2468')), true, 'v1 PIN still works (now hashed)');

  await page.reload();
  await ready(page);
  const again = await saveInfo(page);
  assert.equal(again.coins, 82, 'not imported twice');
  assert.equal(again.ops.filter((o) => o.k === 'import.v1').length, 1);
  assert.deepEqual(page.errors, []);
  await ctx.close();
});

test('grown-ups can bring old-game progress across once, using its code', async () => {
  const { ctx, page } = await newPage();
  await page.goto(`${base}?nosw`);
  await startPlaying(page);
  await openDashboard(page);
  const code = Buffer.from(JSON.stringify({ v: 1, name: 'Freddie', coins: 40, xp: 10 })).toString('base64');
  await page.fill('.v1code', code);
  await page.click('.do-v1');
  await page.waitForSelector('.do-v1:has-text("Added")');
  assert.equal((await saveInfo(page)).coins, 40);
  await page.fill('.v1code', code);
  await page.click('.do-v1');
  await page.waitForSelector('.do-v1:has-text("Already added before")');
  assert.equal((await saveInfo(page)).coins, 40);
  assert.deepEqual(page.errors, []);
  await ctx.close();
});

test('backup file → restore on another iPad (with a passphrase)', async () => {
  // iPad A: play, then save a protected backup.
  const a = await newPage();
  await a.page.goto(`${base}?nosw`);
  await startPlaying(a.page, 'Freddie');
  await playVault(a.page);
  const source = await saveInfo(a.page);
  await openDashboard(a.page);
  await a.page.check('.usepass');
  await a.page.fill('.pass', 'pine cones');
  const [download] = await Promise.all([a.page.waitForEvent('download'), a.page.click('.do-backup')]);
  assert.match(download.suggestedFilename(), /^blox-legends-backup-\d{4}-\d{2}-\d{2}\.bloxbak$/);
  const file = await download.path();
  assert.deepEqual(a.page.errors, []);

  // iPad B: different progress, then restore from the file.
  const b = await newPage();
  await b.page.goto(`${base}?nosw`);
  await startPlaying(b.page, 'Other');
  await b.page.evaluate(() => (__game.save.data.coins = 5));
  await openDashboard(b.page);
  await b.page.setInputFiles('.restore-file', file);
  await b.page.waitForSelector('.do-restore');
  assert.match(await b.page.textContent('.restore-area'), new RegExp(`Freddie · level \\d+ · ${source.coins} coins`));
  await b.page.fill('.rpass', 'wrong one');
  await b.page.click('.do-restore');
  await b.page.click('.do-restore');
  await b.page.waitForSelector('.restore-msg:has-text("Wrong passphrase")');
  assert.equal((await saveInfo(b.page)).coins, 5, 'nothing changed after a wrong passphrase');

  await b.page.fill('.rpass', 'pine cones');
  await b.page.click('.do-restore');
  await b.page.click('.do-restore');
  await b.page.waitForEvent('load');
  await ready(b.page);
  const restored = await saveInfo(b.page);
  assert.equal(restored.coins, source.coins);
  assert.equal(restored.name, 'Freddie');
  assert.notEqual(restored.device, source.device, 'restored iPad gets its own device id');
  assert.deepEqual(restored.ops, source.ops, 'learning log restored exactly');
  const safety = await b.page.evaluate(async () => (await __game.save.listSnapshots()).filter((s) => s.id.startsWith('safety-')).length);
  assert.equal(safety, 1, 'safety copy of the old progress kept');
  assert.deepEqual(b.page.errors.filter((e) => !/Wrong passphrase/.test(e)), []);
  await a.ctx.close();
  await b.ctx.close();
});

test('works offline after the first visit, and updates only when tapped in the hub', async () => {
  const { ctx, page } = await newPage();
  await page.goto(base);
  await ready(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // now controlled by the service worker
  await ready(page);
  const v1 = await page.evaluate(async () => (await caches.keys()).filter((k) => k.startsWith('blox-legends')));
  assert.equal(v1.length, 1, 'one complete versioned cache');

  // Offline reload still boots the game.
  await ctx.setOffline(true);
  await page.reload();
  await startPlaying(page);
  await ctx.setOffline(false);

  // A new release appears while Freddie is in a run: no prompt until the hub.
  swVersionOverride = 'e2e-next';
  await page.evaluate(() => __game.go('vault'));
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
  await page.waitForFunction(() => !!__game.pendingUpdate, null, { timeout: 30000 });
  assert.equal(await page.locator('.update-pill').count(), 0, 'no prompt during a run');
  await page.evaluate(() => __game.go('hub'));
  await page.waitForSelector('.update-pill');
  await Promise.all([page.waitForEvent('load'), page.click('.update-pill')]);
  await ready(page);
  const keys = await page.evaluate(async () => (await caches.keys()).filter((k) => k.startsWith('blox-legends')));
  assert.deepEqual(keys, ['blox-legends-e2e-next'], 'old version removed, new version complete');
  swVersionOverride = null;
  assert.deepEqual(page.errors.filter((e) => !/ERR_INTERNET_DISCONNECTED|Failed to fetch/.test(e)), []);
  await ctx.close();
});
