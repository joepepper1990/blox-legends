import { Game } from './game.js';
import { Store } from './data/store.js';
import { watchForUpdates } from './update.js';

async function boot() {
  // Canvas labels need the font ready before they're drawn.
  const fonts = Promise.race([
    Promise.all([
      document.fonts.load("700 72px 'Lexend'"),
      document.fonts.load("600 30px 'Lexend'"),
      document.fonts.load("400 22px 'Lexend'"),
    ]),
    new Promise((r) => setTimeout(r, 2500)),
  ]).catch(() => {});
  // The save (IndexedDB, or the localStorage fallback) loads before the game starts.
  const [store] = await Promise.all([Store.open(), fonts]);
  const game = new Game(document.getElementById('game'), document.getElementById('ui'), store);
  watchForUpdates(game);
}

boot();
