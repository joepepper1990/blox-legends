// The shop: spend coins on shirts, hats and trails. Coins only come from
// playing — there are no real-money purchases anywhere in the game.
import { SHIRTS, HATS, TRAILS } from './catalog.js';
import { levelInfo } from './save.js';
import { el } from './engine/ui.js';

const TABS = [
  { key: 'shirt', name: 'Shirts', items: SHIRTS },
  { key: 'hat', name: 'Hats', items: HATS },
  { key: 'trail', name: 'Trails', items: TRAILS },
];

export function openShop(game) {
  if (game.ui.hasOverlay()) return;
  const d = game.save.data;
  let tab = 'shirt';
  game.ui.overlay(
    (p, close) => {
      const render = () => {
        const level = levelInfo(d.xp).level;
        p.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
            <h2 style="margin:0">Shop</h2>
            <span class="pill" style="font-size:22px"><span class="coin-icon"></span>${d.coins.toLocaleString('en-GB')}</span>
          </div>
          <div class="tabs" style="margin-top:12px"></div>
          <div class="shop-grid"></div>
          <div class="row center"></div>`;
        const tabs = p.querySelector('.tabs');
        for (const t of TABS) {
          const b = el('button', t.key === tab ? 'on' : '', t.name);
          b.onclick = () => {
            tab = t.key;
            game.audio.click();
            render();
          };
          tabs.append(b);
        }
        const grid = p.querySelector('.shop-grid');
        const current = TABS.find((t) => t.key === tab);
        for (const item of current.items) {
          const owned = d.owned.includes(item.id);
          const equipped = d.look[tab] === item.id;
          const locked = item.level && level < item.level;
          const card = el('button', `shop-item${equipped ? ' equipped' : ''}`);
          const swatch =
            tab === 'shirt'
              ? `<span class="swatch" style="background:#${item.color.toString(16).padStart(6, '0')}"></span>`
              : `<span class="swatch" style="background:#fff">${item.icon}</span>`;
          let status;
          if (equipped) status = '<b>Wearing</b>';
          else if (owned) status = 'Tap to wear';
          else if (locked) status = `Level ${item.level} 🔒`;
          else status = `<span class="price"><span class="coin-icon"></span>${item.price}</span>`;
          card.innerHTML = `${swatch}<span>${item.name}</span><span>${status}</span>`;
          card.onclick = () => {
            if (equipped) return;
            if (!owned) {
              if (locked) {
                game.ui.say(`Reach level ${item.level} to unlock the ${item.name}!`);
                return;
              }
              if (d.coins < item.price) {
                game.ui.say(`You need ${item.price - d.coins} more coins. Play a portal to earn some!`);
                return;
              }
              d.coins -= item.price;
              d.owned.push(item.id);
              game.audio.fanfare();
              game.ui.setCoins(d.coins);
            } else {
              game.audio.click();
            }
            d.look[tab] = item.id;
            game.player.setLook(d.look);
            game.save.write();
            render();
          };
          grid.append(card);
        }
        const done = el('button', 'btn green', 'Done');
        done.onclick = () => {
          game.audio.click();
          close();
        };
        p.querySelector('.row').append(done);
      };
      render();
    },
    { dismiss: true },
  );
}
