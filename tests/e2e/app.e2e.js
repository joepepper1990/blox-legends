// End-to-end tests in a real browser (Chromium, iPad-sized touch screen),
// against the built site in _site/ served from localhost so the service
// worker runs. Run with: npm run e2e   (builds first)
import { test, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { serveSite, launch, pages, ready, startPlaying, playRun, saveInfo, openDashboard } from './helpers.js';

let server;
let base;
let browser;
let tracked;
let swVersionOverride = null; // simulates a new release of sw.js

before(async () => {
  ({ server, base } = await serveSite((path, body) =>
    path === '/sw.js' && swVersionOverride
      ? Buffer.from(body.toString().replace(/const VERSION = '[^']+'/, `const VERSION = '${swVersionOverride}'`))
      : body,
  ));
  browser = await launch();
  tracked = pages(browser);
});

afterEach(async () => {
  await tracked.closeAll();
  swVersionOverride = null;
});

after(async () => {
  await browser?.close();
  server?.close();
});

const newPage = (ctx) => tracked.newPage(ctx);
const playVault = (page) => playRun(page, 'vault');

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

for (const [world, label] of [['obby', 'Glass Bridge'], ['lab', 'Build Lab']]) {
  test(`a full ${label} run is played, scored and saved`, async () => {
    const { page } = await newPage();
    await page.goto(`${base}?nosw`);
    await startPlaying(page);
    const before = await saveInfo(page);
    await playRun(page, world);
    const after = await saveInfo(page);
    assert.ok(after.coins > before.coins, 'coins earned');
    const run = after.ops.find((o) => o.k === 'run');
    assert.ok(run && run.a > 0, 'run logged with its attempts');
    const stars = await page.evaluate((w) => __game.save.data.day.stars[w], world);
    assert.equal(stars, true, 'daily star earned');
    assert.deepEqual(page.errors, []);
  });
}

test('a wrong answer on the Glass Bridge smashes the glass and the row can be retried', async () => {
  const { page } = await newPage();
  await page.goto(`${base}?nosw`);
  await startPlaying(page);
  await page.evaluate(() => __game.go('obby'));
  await page.waitForFunction(() => __game.world.test.state().hasQ);
  await page.evaluate(() => __game.world.test.answer(false));
  await page.waitForTimeout(600);
  const s = await page.evaluate(() => __game.world.test.state());
  assert.equal(s.current, 0, 'still on the first row');
  await page.evaluate(() => __game.world.test.answer(true));
  assert.equal((await page.evaluate(() => __game.world.test.state())).current, 1);
  assert.deepEqual(page.errors, []);
});

test('the glyph width table used to check text fits still matches the real font', async () => {
  const { page } = await newPage();
  await page.goto(`${base}?nosw`);
  await ready(page);
  const diffs = await page.evaluate(async () => {
    const { LEXEND_700 } = await import('./src/engine/font-metrics.js');
    await document.fonts.load("700 100px 'Lexend'");
    const c = document.createElement('canvas').getContext('2d');
    c.font = "700 1000px 'Lexend'";
    return Object.entries(LEXEND_700)
      .map(([ch, em]) => [ch, Math.abs(c.measureText(ch).width / 1000 - em)])
      .filter(([, d]) => d > 0.01);
  });
  assert.deepEqual(diffs, []);
});

test('shape-pattern pictures and flat cube drawings draw something in every box', async () => {
  const { page } = await newPage();
  await page.goto(`${base}?nosw`);
  await ready(page);
  const empty = await page.evaluate(async () => {
    const { drawSeries, drawCard, drawBox } = await import('./src/engine/nvr-draw.js');
    const { drawBuild } = await import('./src/engine/iso-draw.js');
    const { makeItem } = await import('./src/learning/question.js');
    const { seeded } = await import('./src/learning/rng.js');
    // dark ink pixels inside a box, clear of its border
    const inked = (g, x, y, size) => {
      const d = g.getImageData(x + 14, y + 14, size - 28, size - 28).data;
      for (let i = 0; i < d.length; i += 4) if (d[i] < 120 && d[i + 2] < 140) return true;
      return false;
    };
    const bad = [];
    for (let seed = 0; seed < 40; seed++) {
      const skill = seed % 2 ? 's.nvrOdd' : 's.nvrSeries';
      const q = makeItem(skill, { band: 1 + (seed % 5), count: 4, rng: seeded(seed) });
      const c = document.createElement('canvas');
      c.width = 1300;
      c.height = 300;
      const g = c.getContext('2d', { willReadFrequently: true });
      if (q.frames) {
        drawSeries(g, q.frames);
        q.frames.forEach((f, i) => inked(g, 24 + i * 224, 24, 200) || bad.push(`${skill} ${seed} frame ${i}`));
      }
      for (const o of q.options) {
        g.clearRect(0, 0, c.width, c.height);
        drawCard(g, o.figure, o.label);
        inked(g, 18, 18, 220) || bad.push(`${skill} ${seed} option ${o.label}`);
      }
    }
    // builds as drawn on Code Vault doors
    for (let seed = 0; seed < 20; seed++) {
      const skill = seed % 2 ? 's.rot3' : 's.rotY';
      const q = makeItem(skill, { band: 1 + (seed % 5), format: 'door', count: 4, rng: seeded(seed) });
      const c = document.createElement('canvas');
      c.width = 240;
      c.height = 240;
      const g = c.getContext('2d', { willReadFrequently: true });
      for (const [name, cubes] of [['target', q.target], ...q.options.map((o) => [o.label, o.cubes])]) {
        g.clearRect(0, 0, 240, 240);
        drawBox(g, 20, 20, 200);
        drawBuild(g, cubes, 120, 120, 200);
        inked(g, 20, 20, 200) || bad.push(`${skill} ${seed} build ${name}`);
      }
    }
    return bad;
  });
  assert.deepEqual(empty, []);
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
