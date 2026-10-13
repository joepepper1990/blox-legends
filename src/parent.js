// Grown-ups area, behind a 4-digit PIN: progress towards the test, every skill's
// status, the daily time limit, read-aloud, and backup/restore.
import { skillSummary, zoneProgress, retention, termTracker, ZONE_LIST, REALM_OPTIONS } from './learning/progress.js';
import { el } from './engine/ui.js';
import { createBackup, readEnvelope, decodeBackup, restoreBackup, deliverFile } from './data/backup.js';

// PIN helpers: hashed on this iPad (IndexedDB store); plain only in the
// basic localStorage fallback, exactly as v1 did.
const pinStore = (game) => ({
  has: () => (game.save.hasPin ? game.save.hasPin() : !!game.save.data.settings.pin),
  set: async (pin) => (game.save.setPin ? game.save.setPin(pin) : ((game.save.data.settings.pin = pin), game.save.write())),
  check: async (pin) => (game.save.verifyPin ? game.save.verifyPin(pin) : pin === game.save.data.settings.pin),
  clear: async () => (game.save.clearPin ? game.save.clearPin() : ((game.save.data.settings.pin = ''), game.save.write())),
});

// `skipPin` is only used to redraw the dashboard after a setting changes,
// once the PIN has already been given.
export function openParent(game, { grant = false, skipPin = false } = {}) {
  if (game.ui.hasOverlay()) return;
  const d = game.save.data;
  game.ui.overlay(
    (p, close) => {
      let entered = '';
      let first = '';
      const pins = pinStore(game);
      const setting = !pins.has();

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

      const submit = async () => {
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
          await pins.set(entered);
          return grant ? grantScreen() : dashboard();
        }
        if (await pins.check(entered)) return grant ? grantScreen() : dashboard();
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
        const learn = game.save.data.learn;
        const mins = Math.round(d.day.ms / 60000);
        const acc = (c, n) => (n ? `${Math.round((c / n) * 100)}%` : '—');
        const days = new Set([...d.history.map((h) => h.date), d.day.ms > 0 ? d.day.date : null].filter(Boolean)).size;
        const summary = skillSummary(learn);
        const zoneRows = ZONE_LIST.map(([key, z]) => {
          if (key === 'word') return `<div class="area-row"><b>${z.name}</b><div class="bar"><i style="width:0%"></i></div><span>coming soon</span></div>`;
          const pr = zoneProgress(learn, key);
          return `<div class="area-row"><b>${z.name}</b><div class="bar"><i style="width:${Math.round(pr.pct * 100)}%"></i></div><span>${pr.secure}/${pr.total} secure</span></div>`;
        }).join('');
        const stageTag = (s) =>
          !s.live
            ? '<span class="tag waiting">Word portals</span>'
            : `<span class="tag ${s.stage}">${s.stage}${s.unverified ? ' (to check)' : ''}</span>${s.refresh ? ' <span class="tag refresh">needs refresh</span>' : ''}`;
        const skillRows = ZONE_LIST.map(([key, z]) => {
          const rows = summary
            .filter((s) => s.zone === key)
            .map(
              (s) =>
                `<tr><td>${s.name}</td><td>${stageTag(s)}</td><td>${s.n}</td><td>${s.newRate}</td><td>${s.recallRate}</td><td>${s.ms ? `${(s.ms / 1000).toFixed(1)}s` : '—'}</td><td>${s.mis.map((m) => `<span class="tag mis">${escapeHtml(m.name)}</span>`).join(' ')}</td></tr>`,
            )
            .join('');
          return `<h3>${z.name}</h3><table><tr><th>Skill</th><th>Stage</th><th>Tries</th><th>New questions</th><th>Remembered after a gap</th><th>Speed</th><th>Mistakes to watch</th></tr>${rows}</table>`;
        }).join('');
        const tt = termTracker(learn, new Date(), d.prefs || {}, { startedAt: d.created });
        const ret = retention(learn);
        const objRows = tt.objectives
          .map(
            (o) =>
              `<tr><td>${escapeHtml(o.text)}</td><td>${o.waiting ? '<span class="tag waiting">Word portals</span>' : `<span class="tag obj-${o.status.replace(' ', '-')}">${o.status}</span>`}</td><td class="muted" style="font-size:14px">${o.skills.map((s) => `${escapeHtml(s.name)}: ${s.stage}${s.unverified ? ' (to check)' : ''}`).join('<br>')}</td></tr>`,
          )
          .join('');
        const tracker = `
          <h3>Term Tracker</h3>
          <p><b>Year ${tt.yearGroup}, ${tt.term} term${tt.holiday ? ' (holiday)' : ''}</b> — ${escapeHtml(tt.realmName)}${tt.override ? ' (chosen by you)' : ` · ${Math.round(tt.progress * 100)}% through the term`}</p>
          <p>Objectives secure: <b>${tt.actual} of ${tt.total}</b> (about ${tt.expected} expected by now, for the part of the term he’s been playing) — <b class="verdict">${tt.verdict}</b></p>
          <table><tr><th>This term’s objectives</th><th>Status</th><th>Skills</th></tr>${objRows}</table>
          <p class="muted" style="font-size:15px">“Secure” means every skill for it is at least Accurate (checked). Word objectives open with the Word portals in the next update, so they aren’t counted as behind.</p>
          <p class="muted" style="font-size:15px">Remembered after a gap: ${ret.total ? `${ret.passed} of ${ret.total} checks passed` : 'no checks yet'}. Percentages show a range (the likely true value); they appear once there are 5 or more answers.</p>`;
        p.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
            <h2 style="margin:0">${escapeHtml(d.name || 'Player')}’s progress</h2>
            <span class="close-slot"></span>
          </div>
          <p class="muted">Target: Kent Test &amp; Shepway Test, September 2029. Everything is stored only on this iPad.</p>
          <h3>Today</h3>
          <p>${mins} min played${d.settings.dailyMin ? ` of ${d.settings.dailyMin + d.day.bonusMin}` : ''} · ${d.day.answered} questions · ${acc(d.day.correct, d.day.answered)} right first time</p>
          <p class="muted">All time: ${Math.round(d.totals.ms / 60000)} min over ${days} day${days === 1 ? '' : 's'} · ${d.totals.answered} questions · ${acc(d.totals.correct, d.totals.answered)} right first time</p>
          ${tracker}
          <h3>Skill map</h3>
          ${zoneRows}
          <p class="muted" style="font-size:15px">Each skill goes: introduced → practising → accurate → applied (used in a new setting) → retained (remembered after a gap) → mastered. Skills from the old game start as “accurate (to check)” until a short check confirms them.</p>
          ${skillRows}
          <h3>Settings</h3>
          <div class="toggle"><span>Daily play limit</span><select class="limit" style="width:auto"></select></div>
          <div class="toggle"><span>Read questions aloud</span><input type="checkbox" class="aloud"></div>
          <div class="toggle"><span>Player name</span><input type="text" class="pname" maxlength="16" style="width:220px"></div>
          <div class="toggle"><span>In Year 3 from September</span><select class="cohort" style="width:auto"></select></div>
          <div class="toggle"><span>Term (if the school’s dates differ)</span><select class="termover" style="width:auto"></select></div>
          <div class="toggle"><span>New learning ahead of school</span><select class="lead" style="width:auto"></select></div>
          <div class="row"><button class="btn small more">+10 minutes today</button><button class="btn ghost small newpin">Change PIN</button></div>
          <h3>Saving and backups</h3>
          <p class="muted save-status" style="font-size:15px">Checking…</p>
          <div class="toggle"><span>Protect the backup with a passphrase</span><input type="checkbox" class="usepass"></div>
          <input type="password" class="pass" placeholder="Passphrase — write it down somewhere safe" style="display:none" autocomplete="new-password">
          <div class="row"><button class="btn small do-backup">Save a backup file</button><button class="btn small ghost pick-restore">Restore from a backup file</button>
            <input type="file" class="restore-file" accept=".bloxbak,application/octet-stream,application/gzip" hidden></div>
          <div class="restore-area"></div>
          <h3>Progress from the old game</h3>
          <p class="muted" style="font-size:15px">In the old version, open Grown-ups → Backup and copy the code. Paste it here. Each code can only be added once.</p>
          <textarea class="v1code" placeholder="Paste the old game's backup code here"></textarea>
          <div class="row"><button class="btn small ghost do-v1">Bring progress across</button><button class="btn small ghost reset" style="background:#ffe1dc">Reset all progress</button></div>`;
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
        d.prefs ||= { cohort: 2026, termOverride: '' };
        const cohort = p.querySelector('.cohort');
        for (const y of [2025, 2026, 2027, 2028]) {
          const o = el('option', '', `${y}`);
          o.value = String(y);
          if (y === (d.prefs.cohort ?? 2026)) o.selected = true;
          cohort.append(o);
        }
        const termover = p.querySelector('.termover');
        for (const r of [{ id: '', name: 'Work it out from the date' }, ...REALM_OPTIONS]) {
          const o = el('option', '', r.name);
          o.value = r.id;
          if (r.id === (d.prefs.termOverride || '')) o.selected = true;
          termover.append(o);
        }
        const lead = p.querySelector('.lead');
        for (const [v, t] of [[0, 'None (only this term)'], [1, 'Up to one term'], [2, 'Up to two terms']]) {
          const o = el('option', '', t);
          o.value = String(v);
          if (v === (d.settings.maxLead ?? 1)) o.selected = true;
          lead.append(o);
        }
        const rerender = () => {
          game.save.write();
          close();
          openParent(game, { skipPin: true });
        };
        cohort.onchange = () => {
          d.prefs.cohort = Number(cohort.value);
          rerender();
        };
        termover.onchange = () => {
          d.prefs.termOverride = termover.value;
          rerender();
        };
        lead.onchange = () => {
          d.settings.maxLead = Number(lead.value);
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
        p.querySelector('.newpin').onclick = async () => {
          await pins.clear();
          close();
          openParent(game);
        };
        const refreshGame = () => {
          // the learner state lives in game.save.data, which the store has replaced
          game.player.setLook(game.save.data.look);
          game.player.setName(game.save.data.name);
          game.refreshHud();
        };

        // storage status
        (async () => {
          const st = game.save;
          const bits = [];
          if (st.mode === 'idb') {
            bits.push('Saved on this iPad (IndexedDB)');
            bits.push(st.persisted ? 'protected from storage clean-up' : 'not yet protected from storage clean-up (open it from the Home Screen icon, and save backups)');
            const snaps = await st.listSnapshots();
            const daily = snaps.find((x) => x.id.startsWith('day-'));
            if (daily) bits.push(`last daily snapshot ${new Date(daily.created).toLocaleDateString('en-GB')}`);
            bits.push(`iPad ID ${st.deviceId.slice(0, 8)}`);
          } else {
            bits.push('Saving in basic mode (IndexedDB unavailable)');
          }
          if (st.warning) bits.push(st.warning);
          const el2 = p.querySelector('.save-status');
          if (el2) el2.textContent = `${bits.join(' · ')}.`;
        })();

        const usePass = p.querySelector('.usepass');
        const pass = p.querySelector('.pass');
        usePass.onchange = () => (pass.style.display = usePass.checked ? '' : 'none');

        p.querySelector('.do-backup').onclick = async (e) => {
          const btn = e.currentTarget;
          if (usePass.checked && pass.value.length < 6) {
            btn.textContent = 'Passphrase needs 6+ characters';
            return;
          }
          btn.disabled = true;
          btn.textContent = 'Preparing…';
          try {
            if (game.save.pending?.length) await game.save.endRun(game.worldName, { partial: true });
            await game.save.write();
            const { bytes, filename } = await createBackup(game.save, { passphrase: usePass.checked ? pass.value : undefined });
            const how = await deliverFile(bytes, filename);
            btn.textContent = how === 'cancelled' ? 'Save a backup file' : 'Backup saved ✓';
          } catch (err) {
            console.error(err);
            btn.textContent = 'Backup failed — try again';
          }
          btn.disabled = false;
        };

        const fileInput = p.querySelector('.restore-file');
        p.querySelector('.pick-restore').onclick = () => fileInput.click();
        fileInput.onchange = async () => {
          const area = p.querySelector('.restore-area');
          const file = fileInput.files?.[0];
          fileInput.value = '';
          if (!file) return;
          const bytes = new Uint8Array(await file.arrayBuffer());
          let env;
          try {
            env = await readEnvelope(bytes);
          } catch (err) {
            area.innerHTML = `<p><b>${escapeHtml(err.message)}</b></p>`;
            return;
          }
          const sm = env.summary || {};
          area.innerHTML = `<div class="panel" style="width:100%;animation:none;padding:14px 18px;margin-top:10px">
              <b>Backup from ${escapeHtml(new Date(env.created).toLocaleString('en-GB'))}</b>
              <p style="margin:6px 0">${escapeHtml(sm.name || 'Player')} · level ${sm.level ?? '?'} · ${sm.coins ?? '?'} coins · ${sm.answered ?? '?'} questions answered</p>
              <p class="muted" style="font-size:15px;margin:6px 0">Restoring <b>replaces</b> the progress on this iPad with this backup. A safety copy of the current progress is kept on this iPad first.</p>
              ${env.crypto ? '<input type="password" class="rpass" placeholder="Backup passphrase" autocomplete="off">' : ''}
              <div class="row"><button class="btn small do-restore" style="background:#e8423f">Restore this backup</button></div>
              <p class="restore-msg"></p></div>`;
          let armed = false;
          area.querySelector('.do-restore').onclick = async (ev) => {
            const btn = ev.currentTarget;
            const msg = area.querySelector('.restore-msg');
            if (!armed) {
              armed = true;
              btn.textContent = 'Tap again to replace progress';
              return;
            }
            btn.disabled = true;
            try {
              const decoded = await decodeBackup(bytes, { passphrase: area.querySelector('.rpass')?.value });
              await restoreBackup(game.save, decoded);
              msg.textContent = 'Restored ✓ Restarting…';
              setTimeout(() => location.reload(), 600);
            } catch (err) {
              msg.textContent = err.message || 'That backup could not be restored.';
              btn.disabled = false;
              armed = false;
              btn.textContent = 'Restore this backup';
            }
          };
        };

        p.querySelector('.do-v1').onclick = async (e) => {
          const btn = e.currentTarget;
          const code = p.querySelector('.v1code').value.trim();
          if (!code) return;
          try {
            const sum = await game.save.importV1Code(code);
            refreshGame();
            btn.textContent = `Added ✓ (${sum.coins} coins, ${sum.answered} answers)`;
            p.querySelector('.v1code').value = '';
          } catch (err) {
            btn.textContent = /already/.test(err.message) ? 'Already added before' : 'That code didn’t work';
          }
        };
        let resetArmed = false;
        p.querySelector('.reset').onclick = async (e) => {
          if (!resetArmed) {
            resetArmed = true;
            e.target.textContent = 'Tap again to really reset';
            return;
          }
          await game.save.reset();
          refreshGame();
          e.target.textContent = 'Progress reset';
        };
      };

      if (skipPin && !setting) dashboard();
      else pinScreen(setting ? 'Choose a 4-digit PIN so only grown-ups can open this.' : 'Type your PIN.');
    },
    {},
  );
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

