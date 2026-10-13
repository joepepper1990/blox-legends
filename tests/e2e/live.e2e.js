// Smoke tests against the published site (GitHub Pages). Run by CI right
// after each deploy:  BASE_URL=https://…/blox-legends/ npm run e2e:live
// It uses a throwaway browser profile, so no real player's save is touched.
// If EXPECT_VERSION is set, it first waits for that build to be live.
import { test, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { launch, pages, ready, startPlaying, playRun, saveInfo } from './helpers.js';

const base = process.env.BASE_URL || 'https://joepepper1990.github.io/blox-legends/';
let browser;
let tracked;

before(async () => {
  const want = process.env.EXPECT_VERSION;
  if (want) {
    // Pages can take a minute or two to serve a new deploy everywhere.
    for (let i = 0; ; i++) {
      const got = await fetch(`${base}version.json?t=${Date.now()}`, { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : {}))
        .catch(() => ({}));
      if (got.version === want) break;
      if (i > 36) throw new Error(`Live site still serves ${got.version}, expected ${want}`);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
  browser = await launch();
  tracked = pages(browser);
});

afterEach(() => tracked.closeAll());
after(() => browser?.close());

test('the published files are all there', async () => {
  for (const f of ['', 'index.html', 'sw.js', 'version.json', 'manifest.webmanifest', 'src/main.js', 'vendor/three.module.min.js']) {
    const r = await fetch(base + f);
    assert.equal(r.status, 200, `${f || '/'} is served`);
  }
  const v = await (await fetch(`${base}version.json`)).json();
  assert.match(v.version, /^[0-9a-f]{12}$/);
});

test('the live game boots, every world runs, and a run is saved across a reload', async () => {
  const { page } = await tracked.newPage();
  await page.goto(base);
  await startPlaying(page);
  assert.equal((await saveInfo(page)).mode, 'idb');
  for (const w of ['obby', 'lab', 'hub']) {
    await page.evaluate((name) => __game.go(name), w);
    await page.waitForTimeout(1000);
    assert.equal(await page.evaluate(() => __game.worldName), w);
  }
  await playRun(page, 'vault');
  const done = await saveInfo(page);
  assert.ok(done.ops.some((o) => o.k === 'run'));
  await page.reload();
  await ready(page);
  assert.equal((await saveInfo(page)).coins, done.coins);
  assert.deepEqual(page.errors, []);
});

test('the live game works offline after the first visit', async () => {
  const { ctx, page } = await tracked.newPage();
  await page.goto(base);
  await ready(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await ready(page);
  await ctx.setOffline(true);
  await page.reload();
  await startPlaying(page);
  assert.equal(await page.evaluate(() => __game.worldName), 'hub');
  await ctx.setOffline(false);
});
