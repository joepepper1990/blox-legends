import { Game } from './game.js';

async function boot() {
  // Canvas labels need the font ready before they're drawn.
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load("700 72px 'Lexend'"),
        document.fonts.load("600 30px 'Lexend'"),
        document.fonts.load("400 22px 'Lexend'"),
      ]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch {
    /* fall back to system font */
  }
  new Game(document.getElementById('game'), document.getElementById('ui'));

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

boot();
