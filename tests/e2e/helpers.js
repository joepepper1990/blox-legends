// Shared helpers for the browser tests (Chromium, iPad-sized touch screen).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

export const SITE = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '_site');
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml',
};

// Serve _site/ on localhost (a secure context, so the service worker runs).
// `rewrite(path, body)` may change a response, e.g. to simulate a new release.
export async function serveSite(rewrite = (path, body) => body) {
  const server = createServer(async (req, res) => {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path.endsWith('/')) path += 'index.html';
    try {
      const body = rewrite(path, await readFile(join(SITE, path)));
      res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream', 'cache-control': 'no-cache' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('not found');
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { server, base: `http://127.0.0.1:${server.address().port}/` };
}

export const launch = () =>
  chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

// Pages are tracked so every one can be closed after each test, even a failed
// one: a page left running software WebGL slows every later test down.
export function pages(browser) {
  const open = new Set();
  return {
    async newPage(context) {
      const ctx = context || (await browser.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: true, acceptDownloads: true }));
      open.add(ctx);
      const page = await ctx.newPage();
      page.errors = [];
      page.on('pageerror', (e) => page.errors.push(`pageerror: ${e.message}`));
      page.on('console', (m) => m.type() === 'error' && page.errors.push(`console: ${m.text()}`));
      return { ctx, page };
    },
    async closeAll() {
      for (const ctx of open) await ctx.close().catch(() => {});
      open.clear();
    },
  };
}

export const ready = (page) => page.waitForFunction(() => window.__game?.world, null, { timeout: 30000 });

export async function startPlaying(page, name = 'Freddie') {
  await ready(page);
  const input = page.locator('.title-screen input');
  if (await input.count()) await input.fill(name);
  await page.locator('.play-btn').click();
  await page.waitForFunction(() => __game.started);
}

// Play a whole run of a world through its stable test hook (world.test),
// answering every question correctly, then wait for the results panel.
export async function playRun(page, world) {
  await page.evaluate((w) => __game.go(w), world);
  for (let guard = 0; guard < 600; guard++) {
    const s = await page.evaluate(() => __game.world.test.state());
    if (s.current >= s.total) break;
    if (s.hasQ) await page.evaluate(() => __game.world.test.answer(true));
    await page.waitForTimeout(100);
  }
  await page.evaluate(() => __game.world.test.finish());
  await page.waitForSelector('.results', { timeout: 15000 });
  await page.evaluate(() => __game.save.chain);
}

export const saveInfo = (page) =>
  page.evaluate(async () => {
    const s = __game.save;
    const ops = await s.getOps();
    return { mode: s.mode, coins: s.data.coins, name: s.data.name, device: s.deviceId, ops: ops.map((o) => ({ k: o.k, n: o.n, a: o.p?.a?.length || 0 })) };
  });

export async function openDashboard(page, pin = '2468') {
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
