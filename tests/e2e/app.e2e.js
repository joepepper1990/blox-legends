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
  const logged = afterRun.ops.filter((o) => o.k === 'run' || o.k === 'run.part').reduce((n, o) => n + o.a, 0);
  assert.ok(afterRun.ops.some((o) => o.k === 'run') && logged >= 5, 'the run and its attempts are in the learning log');

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
    // answers are logged as the run goes (run.part) and when it ends (run)
    const logged = after.ops.filter((o) => o.k === 'run' || o.k === 'run.part').reduce((n, o) => n + o.a, 0);
    assert.ok(after.ops.some((o) => o.k === 'run'), 'run logged');
    assert.ok(logged >= (world === 'obby' ? 8 : 5), `every answer logged (${logged})`);
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

test('the learning state can be rebuilt exactly from the log', async () => {
  const { page } = await newPage();
  await page.goto(`${base}?nosw`);
  await startPlaying(page);
  await playRun(page, 'vault');
  await playRun(page, 'lab');
  const same = await page.evaluate(async () => {
    const { rebuildLearn } = await import('./src/data/replay.js');
    await __game.save.write();
    await __game.save.chain;
    const rebuilt = rebuildLearn(await __game.save.getOps(), __game.reg);
    const live = __game.save.data.learn;
    const sk = Object.values(live.sk);
    return { equal: JSON.stringify(rebuilt) === JSON.stringify(live), skills: sk.length, answers: sk.reduce((n, s) => n + s.n, 0) };
  });
  assert.ok(same.answers >= 10, `answers recorded: ${same.answers}`);
  assert.equal(same.equal, true);
});

test('rapid guesses earn nothing, and three in a row bring a short pause', async () => {
  const { page } = await newPage();
  await page.goto(`${base}?nosw`);
  await startPlaying(page);
  await page.evaluate(() => __game.go('vault'));
  await page.waitForFunction(() => __game.world.test.state().hasQ);
  const coins0 = await page.evaluate(() => __game.save.data.coins);
  for (let i = 0; i < 3; i++) {
    await page.waitForFunction(() => __game.world.test.state().hasQ && !__game.paused());
    await page.evaluate(() => __game.world.test.answer(true, { think: 50 }));
    await page.waitForTimeout(900);
  }
  const after = await page.evaluate(() => ({
    coins: __game.save.data.coins,
    paused: __game.paused(),
    frozen: __game.player.frozen,
    rapid: __game.save.pending.concat([]).filter((a) => a.rg === 1).length,
    bubble: document.querySelector('.bolt-bubble, .say, .bubble')?.textContent || '',
  }));
  assert.equal(after.coins, coins0, 'no coins for rapid guesses');
  assert.ok(after.paused && after.frozen, 'paused');
  assert.match(after.bubble, /Read each question/);
  // a thought-through answer after the pause earns again
  await page.waitForFunction(() => !__game.paused(), null, { timeout: 5000 });
  await page.waitForFunction(() => __game.world.test.state().hasQ);
  await page.evaluate(() => __game.world.test.answer(true, { think: 4000 }));
  assert.ok((await page.evaluate(() => __game.save.data.coins)) > coins0);
});

test('a wrong answer explains the exact mistake when it is a known one', async () => {
  const { page } = await newPage();
  await page.goto(`${base}?nosw`);
  await startPlaying(page);
  await page.evaluate(() => __game.go('lab'));
  let checked = 0;
  for (let i = 0; i < 5 && !checked; i++) {
    await page.waitForFunction(() => __game.world.test.state().hasQ);
    const res = await page.evaluate(() => {
      const pz = __game.world.puzzle;
      const k = pz.q.options.findIndex((o, i) => i !== pz.q.answerIndex && o.mis);
      if (k < 0) return null;
      pz.q.shownAt = performance.now() - 4000;
      __game.world.choose(k);
      return pz.q.explain[pz.q.options[k].mis];
    });
    if (res) {
      await page.waitForTimeout(300);
      const bubble = await page.evaluate(() => document.querySelector('.bolt-bubble, .say, .bubble')?.textContent || '');
      assert.ok(bubble.includes(res.slice(0, 20)), `"${bubble}" should explain "${res}"`);
      checked++;
    }
    await page.evaluate(() => __game.world.test.answer(true));
    await page.waitForTimeout(1900);
  }
  assert.equal(checked, 1, 'found a question with a known mistake');
});

// Every skill can be shown in its home world and in every world its
// transfer formats send it to (plan §4, §7 "Applied").
test('every skill and transfer format can be shown and answered in its world', async () => {
  const { page } = await newPage();
  await page.goto(`${base}?nosw`);
  await startPlaying(page);
  const WORLD = { 'choice-path': 'obby', 'logic-lock': 'vault', 'pattern-plates': 'lab' };
  const jobs = await page.evaluate(async () => {
    const { SKILLS, ZONES } = await import('./src/learning/skills.js');
    const { GEN } = await import('./src/learning/gen/index.js');
    const out = [];
    for (const s of SKILLS.filter((x) => x.status !== 'planned' && GEN[x.gen])) {
      const home = s.home || ZONES[s.zone].home;
      if (home) out.push({ s: s.id, mech: home, format: null });
      for (const t of s.transfer) out.push({ s: s.id, mech: t.mech, format: t.format });
    }
    return out;
  });
  const problems = [];
  for (const mech of Object.keys(WORLD)) {
    await page.evaluate((w) => __game.go(w), WORLD[mech]);
    await page.waitForFunction(() => __game.world.test.state().hasQ);
    for (const job of jobs.filter((j) => j.mech === mech)) {
      const res = await page.evaluate(async ({ job }) => {
        const { makeItem, formatsAt, canAsk } = await import('./src/learning/question.js');
        const { fitsMechanic } = await import('./src/mechanics/fit.js');
        const { MECHANICS } = await import('./src/mechanics/caps.js');
        const { seeded } = await import('./src/learning/rng.js');
        const count = MECHANICS[job.mech].options[1];
        const band = 3;
        const format = job.format || formatsAt(job.s, band, count).find((f) => canAsk(job.s, f, band, count));
        if (!format || !canAsk(job.s, format, band, count)) return { skip: true };
        const q = makeItem(job.s, { band, count, format, rng: seeded(7), accept: (x) => fitsMechanic(x, job.mech) === null });
        __game.world.test.ask(q);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const shown = __game.world.test.question();
        return { ok: shown === q, n: q.options.length, kind: q.kind || q.format };
      }, { job });
      if (!res.skip && !res.ok) problems.push(`${job.s} ${job.format || 'home'} in ${mech}`);
    }
    // the last one shown is answered through the real path
    const before = await page.evaluate(() => __game.save.pending.length + __game.save.data.learn.cnt);
    await page.evaluate(() => __game.world.test.answer(true));
    const after = await page.evaluate(() => __game.save.pending.length + __game.save.data.learn.cnt);
    assert.ok(after > before, `${mech}: answer recorded`);
  }
  assert.deepEqual(problems, []);
  assert.deepEqual(page.errors, []);
});

test('a skill he is accurate at comes back in another world as a transfer question', async () => {
  const { page } = await newPage();
  await page.goto(`${base}?nosw`);
  await startPlaying(page);
  await page.evaluate(() => {
    const learn = __game.save.data.learn;
    learn.sk['m.x3'] = { n: 20, c: 19, b: 3, bs: 0, pf: 19, ev: [1, 1, 1, 1, 1, 1, 1, 1], ms: { intro: 0, prac: 0, acc: 0 }, uv: 0, rf: 0, chk: null, tr: {}, tl: [], fa: [], fl: [], last: 0 };
  });
  await playRun(page, 'vault');
  const got = await page.evaluate(async () => {
    const ops = await __game.save.getOps();
    const all = ops.flatMap((o) => o.p?.a || []).concat(__game.save.pending);
    const t = all.filter((a) => a.pu === 'transfer');
    return { transfers: t.map((a) => `${a.s}:${a.fm}:${a.m}`), tl: __game.save.data.learn.sk['m.x3'].tl.length };
  });
  assert.ok(got.transfers.some((x) => x.startsWith('m.x3:word:logic-lock')), JSON.stringify(got.transfers));
  assert.ok(got.tl >= 1, 'counted towards Applied');
  assert.deepEqual(page.errors, []);
});

test('the grown-ups see each skill’s stage, the Term Tracker, and can set the school year', async () => {
  const { page } = await newPage();
  await page.goto(`${base}?nosw`);
  await startPlaying(page);
  await playRun(page, 'vault');
  await openDashboard(page);
  const text = await page.locator('.parent').innerText();
  assert.match(text, /Term Tracker/);
  assert.match(text, /Year 3, Autumn term/);
  assert.match(text, /Objectives secure: \d+ of \d+/);
  assert.match(text, /introduced|practising/, 'stages shown');
  assert.match(text, /Word portals/);
  await page.locator('.parent select.cohort').selectOption('2025');
  await page.waitForFunction(() => document.querySelector('.parent')?.innerText.includes('Year 4'));
  assert.equal(await page.evaluate(() => __game.save.data.prefs.cohort), 2025);
  assert.deepEqual(page.errors, []);
});
