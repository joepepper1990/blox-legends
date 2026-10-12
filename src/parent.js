// Grown-ups area, behind a 4-digit PIN: progress towards the test, every skill's
// status, the daily time limit, read-aloud, and backup/restore.
import { AREAS, SKILLS } from './learning/index.js';
import { el } from './engine/ui.js';

export function openParent(game, { grant = false } = {}) {
  if (game.ui.hasOverlay()) return;
  const d = game.save.data;
  game.ui.overlay(
    (p, close) => {
      let entered = '';
      let first = '';
      const setting = !d.settings.pin;

      const pinScreen = (msg) => {
        p.innerHTML = `<h2>Grown-ups only</h2><p class="muted">${msg}</p>
          <div class="pin-dots">${[0, 1, 2, 3].map((i) => `<i class="${i < entered.length ? 'on' : ''}"></i>`).join('')}</div>
          <div class="pin-pad"></div><div class="row center"></div>`;
        const pad = p.querySelector('.pin-pad');
        for (const k of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']) {
          const b = el('button', '', k);
          if (!k) b.style.visibility = 'hidden';
          b.onclick = () => {
            if (k === '⌫') entered = entered.slice(0, -1);
            else if (entered.length < 4) entered += k;
            if (entered.length === 4) return submit();
            pinScreen(msg);
          };
          pad.append(b);
        }
        const cancel = el('button', 'btn ghost small', 'Back to game');
        cancel.onclick = close;
        p.querySelector('.row').append(cancel);
      };

      const submit = () => {
        if (setting) {
          if (!first) {
            first = entered;
            entered = '';
            return pinScreen('Type the same PIN again to confirm.');
          }
          if (entered !== first) {
            first = '';
            entered = '';
            return pinScreen('Those didn’t match. Choose a 4-digit PIN.');
          }
          d.settings.pin = entered;
          game.save.write();
          return grant ? grantScreen() : dashboard();
        }
        if (entered === d.settings.pin) return grant ? grantScreen() : dashboard();
        entered = '';
        pinScreen('Wrong PIN — try again.');
      };

      const grantScreen = () => {
        p.innerHTML = `<h2>More time today?</h2><p>Today: ${Math.round(d.day.ms / 60000)} minutes played.</p><div class="row center"></div>`;
        const row = p.querySelector('.row');
        for (const m of [5, 10, 20]) {
          const b = el('button', 'btn', `+${m} minutes`);
          b.onclick = () => {
            d.day.bonusMin += m;
            game.save.write();
            close();
            game.ui.say(`Portals recharged for ${m} more minutes!`);
          };
          row.append(b);
        }
        const no = el('button', 'btn ghost', 'No, that’s enough');
        no.onclick = close;
        row.append(no);
      };

      const dashboard = () => {
        p.classList.add('parent');
        const m = game.mastery;
        const mins = Math.round(d.day.ms / 60000);
        const acc = (c, n) => (n ? `${Math.round((c / n) * 100)}%` : '—');
        const days = new Set([...d.history.map((h) => h.date), d.day.ms > 0 ? d.day.date : null].filter(Boolean)).size;
        const areaRows = Object.entries(AREAS)
          .map(([key, a]) => {
            const pr = m.areaProgress(key);
            return `<div class="area-row"><b>${a.name}</b><div class="bar"><i style="width:${Math.round(pr.pct * 100)}%"></i></div><span>${pr.mastered}/${pr.total} skills</span></div>`;
          })
          .join('');
        const skillRows = Object.entries(AREAS)
          .map(([key, a]) => {
            const rows = m
              .summary()
              .filter((s) => s.area === key)
              .map(
                (s) =>
                  `<tr><td>${s.name}</td><td><span class="tag ${s.status}">${s.status}</span></td><td>${s.rec.n}</td><td>${acc(s.rec.c, s.rec.n)}</td><td>${s.rec.ms ? `${(s.rec.ms / 1000).toFixed(1)}s` : '—'}</td></tr>`,
              )
              .join('');
            return `<h3>${a.name}</h3><table><tr><th>Skill</th><th>Status</th><th>Tries</th><th>Right first time</th><th>Avg time</th></tr>${rows}</table>`;
          })
          .join('');
        p.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
            <h2 style="margin:0">${escapeHtml(d.name || 'Player')}’s progress</h2>
            <span class="close-slot"></span>
          </div>
          <p class="muted">Target: Kent Test &amp; Shepway Test, September 2029. Everything is stored only on this iPad.</p>
          <h3>Today</h3>
          <p>${mins} min played${d.settings.dailyMin ? ` of ${d.settings.dailyMin + d.day.bonusMin}` : ''} · ${d.day.answered} questions · ${acc(d.day.correct, d.day.answered)} right first time</p>
          <p class="muted">All time: ${Math.round(d.totals.ms / 60000)} min over ${days} day${days === 1 ? '' : 's'} · ${d.totals.answered} questions · ${acc(d.totals.correct, d.totals.answered)} right first time</p>
          <h3>Skill map</h3>
          ${areaRows}
          <p class="muted" style="font-size:15px">“Learning” skills are being practised now. “Mastered” ones come back for spaced review so they stick. “Locked” ones open once the skills before them are secure.</p>
          ${skillRows}
          <h3>Settings</h3>
          <div class="toggle"><span>Daily play limit</span><select class="limit" style="width:auto"></select></div>
          <div class="toggle"><span>Read questions aloud</span><input type="checkbox" class="aloud"></div>
          <div class="toggle"><span>Player name</span><input type="text" class="pname" maxlength="16" style="width:220px"></div>
          <div class="row"><button class="btn small more">+10 minutes today</button><button class="btn ghost small newpin">Change PIN</button></div>
          <h3>Backup</h3>
          <p class="muted" style="font-size:15px">Copy this code somewhere safe (e.g. Notes). If the iPad is reset, paste it back to restore progress.</p>
          <textarea class="code" readonly></textarea>
          <div class="row"><button class="btn small copy">Copy code</button></div>
          <textarea class="restore" placeholder="Paste a backup code here"></textarea>
          <div class="row"><button class="btn small ghost do-restore">Restore from code</button><button class="btn small ghost reset" style="background:#ffe1dc">Reset all progress</button></div>`;
        const closeBtn = el('button', 'btn green small', 'Back to game');
        closeBtn.onclick = close;
        p.querySelector('.close-slot').append(closeBtn);

        const limit = p.querySelector('.limit');
        for (const v of [15, 20, 25, 30, 40, 60, 0]) {
          const o = el('option', '', v ? `${v} minutes a day` : 'No limit');
          o.value = String(v);
          if (v === d.settings.dailyMin) o.selected = true;
          limit.append(o);
        }
        limit.onchange = () => {
          d.settings.dailyMin = Number(limit.value);
          game.save.write();
        };
        const aloud = p.querySelector('.aloud');
        aloud.checked = d.settings.readAloud;
        aloud.onchange = () => {
          d.settings.readAloud = aloud.checked;
          game.speech.enabled = aloud.checked;
          game.save.write();
        };
        const pname = p.querySelector('.pname');
        pname.value = d.name;
        pname.onchange = () => {
          d.name = pname.value.trim().slice(0, 16);
          game.player.setName(d.name);
          game.save.write();
        };
        p.querySelector('.more').onclick = (e) => {
          d.day.bonusMin += 10;
          game.save.write();
          e.target.textContent = 'Added 10 minutes ✓';
        };
        p.querySelector('.newpin').onclick = () => {
          d.settings.pin = '';
          game.save.write();
          close();
          openParent(game);
        };
        const code = p.querySelector('.code');
        code.value = game.save.exportCode();
        p.querySelector('.copy').onclick = async (e) => {
          try {
            await navigator.clipboard.writeText(code.value);
            e.target.textContent = 'Copied ✓';
          } catch {
            code.select();
            e.target.textContent = 'Select and copy the text above';
          }
        };
        p.querySelector('.do-restore').onclick = (e) => {
          try {
            game.save.importCode(p.querySelector('.restore').value);
            game.mastery.state = game.save.data.learn;
            game.player.setLook(game.save.data.look);
            game.player.setName(game.save.data.name);
            game.refreshHud();
            e.target.textContent = 'Restored ✓';
          } catch {
            e.target.textContent = 'That code didn’t work';
          }
        };
        let resetArmed = false;
        p.querySelector('.reset').onclick = (e) => {
          if (!resetArmed) {
            resetArmed = true;
            e.target.textContent = 'Tap again to really reset';
            return;
          }
          game.save.reset();
          game.mastery.state = game.save.data.learn;
          game.mastery.state.skills ||= {};
          game.mastery.state.recent ||= {};
          game.player.setLook(game.save.data.look);
          game.refreshHud();
          e.target.textContent = 'Progress reset';
        };
      };

      pinScreen(setting ? 'Choose a 4-digit PIN so only grown-ups can open this.' : 'Type your PIN.');
    },
    {},
  );
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

export { SKILLS };
