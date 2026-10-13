// All the DOM on top of the 3D canvas: HUD, question card, alphabet strip,
// Bolt's speech bubble, banners and pop-up panels.

const ICONS = {
  speaker:
    '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 4V5L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.47 4.47 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>',
  home: '<svg viewBox="0 0 24 24"><path d="M12 3 2 12h3v8h5v-5h4v5h5v-8h3z" fill="#1d2340"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><path fill="#1d2340" d="M19.4 13a7.6 7.6 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3h-4l-.4 2.9a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.4 7.4 0 0 0 1.7 1L11 21h4l.4-2.9a7.4 7.4 0 0 0 1.7-1l2.5 1 2-3.5zM13 15.5A3.5 3.5 0 1 1 16.5 12 3.5 3.5 0 0 1 13 15.5z"/></svg>',
  bag: '<svg viewBox="0 0 24 24"><path fill="#1d2340" d="M7 7V6a5 5 0 0 1 10 0v1h3l-1 14H5L4 7zm2 0h6V6a3 3 0 0 0-6 0z"/></svg>',
  bolt: '<svg viewBox="0 0 40 40"><rect x="4" y="8" width="32" height="24" rx="7" fill="#16203f"/><rect x="11" y="14" width="6" height="9" rx="2" fill="#5ff2ff"/><rect x="23" y="14" width="6" height="9" rx="2" fill="#5ff2ff"/><rect x="15" y="26" width="10" height="2" fill="#5ff2ff"/></svg>',
};

const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
};

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const ANCHORS = new Set(['E', 'J', 'O', 'T', 'Y']);

export class UI {
  constructor(root, game) {
    this.root = root;
    this.game = game;

    // top-left: coins, level, daily stars
    this.tl = el('div', 'hud-tl');
    this.coinPill = el('div', 'pill', '<span class="coin-icon"></span><span class="coins">0</span>');
    this.levelPill = el('div', 'pill', '<span class="level-badge">1</span><span class="xpbar"><i></i></span>');
    this.starsEl = el('div', 'stars');
    this.tl.append(this.coinPill, this.levelPill, this.starsEl);

    // top-right: timer + buttons
    this.tr = el('div', 'hud-tr');
    this.timerEl = el('div', 'timer');
    this.timerEl.style.display = 'none';
    this.shopBtn = el('button', 'icon-btn', ICONS.bag);
    this.shopBtn.setAttribute('aria-label', 'Shop');
    this.homeBtn = el('button', 'icon-btn', ICONS.home);
    this.homeBtn.setAttribute('aria-label', 'Back to the hub');
    this.gearBtn = el('button', 'icon-btn', ICONS.gear);
    this.gearBtn.setAttribute('aria-label', 'Grown-ups');
    this.tr.append(this.timerEl, this.shopBtn, this.homeBtn, this.gearBtn);

    // question card
    this.qcard = el('div', 'qcard hidden');
    this.qtext = el('div', 'qtext');
    const speak = el('button', 'speak-btn', ICONS.speaker);
    speak.setAttribute('aria-label', 'Read it to me');
    speak.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      game.speech.speak(this.qspeak, { force: true });
    });
    this.qcard.append(this.qtext, speak);

    // alphabet strip
    this.alpha = el('div', 'alpha hidden');
    this.cells = {};
    for (const ch of ALPHA) {
      const c = el('div', 'cell', `${ch}<small>${ALPHA.indexOf(ch) + 1}</small>`);
      c.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        game.speech.speak(`${ch}. Number ${ALPHA.indexOf(ch) + 1}.`, { force: true });
        this.flashCells([[ch, ch]]);
      });
      this.cells[ch] = c;
      this.alpha.append(c);
    }

    // Bolt's bubble
    this.bolt = el('div', 'bolt hidden');
    this.boltFace = el('div', 'face', ICONS.bolt);
    this.boltText = el('div', 'say');
    this.boltAgain = el('button', 'again', ICONS.speaker);
    this.boltAgain.setAttribute('aria-label', 'Say it again');
    this.boltAgain.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      game.speech.speak(this.boltSpeak, { force: true });
    });
    this.bolt.append(this.boltFace, this.boltText, this.boltAgain);

    this.rotateNote = el('div', 'rotate-note', 'Turn your iPad sideways to play ↻');

    root.append(this.tl, this.tr, this.qcard, this.alpha, this.bolt, this.rotateNote);
    this.boltTimer = 0;
    this.stripToken = 0;
  }

  setCoins(n, gained = 0) {
    this.coinPill.querySelector('.coins').textContent = n.toLocaleString('en-GB');
    if (gained > 0) {
      this.coinPill.classList.remove('bump');
      void this.coinPill.offsetWidth;
      this.coinPill.classList.add('bump');
      const pop = el('div', 'coin-pop', `+${gained}`);
      const r = this.coinPill.getBoundingClientRect();
      pop.style.left = `${r.right + 8}px`;
      pop.style.top = `${r.top}px`;
      this.root.append(pop);
      setTimeout(() => pop.remove(), 1000);
    }
  }

  setLevel(level, frac) {
    this.levelPill.querySelector('.level-badge').textContent = level;
    this.levelPill.querySelector('.xpbar i').style.width = `${Math.round(frac * 100)}%`;
  }

  setStars(stars) {
    this.starsEl.innerHTML = '';
    for (const [key, on] of Object.entries(stars)) {
      const s = el('div', `star${on ? ' on' : ''}`, on ? '★' : '☆');
      s.title = key;
      this.starsEl.append(s);
    }
  }

  setTimer(ms) {
    if (ms === null) {
      this.timerEl.style.display = 'none';
      return;
    }
    this.timerEl.style.display = '';
    const s = Math.floor(ms / 1000);
    this.timerEl.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  setMode({ home = false, shop = false }) {
    this.homeBtn.style.display = home ? '' : 'none';
    this.shopBtn.style.display = shop ? '' : 'none';
  }

  // `picture`: a canvas shown under the question (a pattern, a build, a
  // written sum) when the world has nowhere better to put it.
  question(text, speak, sub = '', { picture = null } = {}) {
    if (!text) {
      this.qcard.classList.add('hidden');
      return;
    }
    this.qtext.innerHTML = '';
    this.qtext.append(document.createTextNode(text));
    this.qpic?.remove();
    this.qpic = null;
    if (picture) {
      // beside the words, so the card stays short and the world stays in view
      picture.classList.add('qpic');
      this.qtext.after(picture);
      this.qpic = picture;
    }
    if (sub) this.qtext.append(el('span', 'qsub', sub));
    this.qspeak = speak || text;
    this.qcard.classList.remove('hidden');
  }

  // Alphabet strip. numbers: show 1–26 under letters; anchors: highlight E J O T Y.
  showAlpha(show, { numbers = false, anchors = false } = {}) {
    this.alpha.classList.toggle('hidden', !show);
    this.alpha.classList.toggle('numbers', numbers);
    for (const ch of ALPHA) this.cells[ch].classList.toggle('anchor', anchors && ANCHORS.has(ch));
  }

  clearCells() {
    for (const ch of ALPHA) this.cells[ch].classList.remove('from', 'to', 'hop');
  }

  // Animate hops along the strip, e.g. [['C','D'], ['A','B']].
  async flashCells(steps, ms = 650) {
    const token = ++this.stripToken;
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    for (const [from, to] of steps) {
      if (token !== this.stripToken) return;
      this.clearCells();
      const a = ALPHA.indexOf(from);
      const b = ALPHA.indexOf(to);
      this.cells[from]?.classList.add('from');
      // light up the cells in between so the counting is visible
      const dir = Math.sign(b - a);
      const span = Math.abs(b - a);
      if (span > 0 && span <= 6)
        for (let i = a + dir; i !== b; i += dir) this.cells[ALPHA[i]]?.classList.add('hop');
      await wait(ms * 0.45);
      if (token !== this.stripToken) return;
      this.cells[to]?.classList.add('to');
      await wait(ms * 0.55);
    }
    await wait(900);
    if (token === this.stripToken) this.clearCells();
  }

  say(text, { speak = true, ms = 0, speakText } = {}) {
    clearTimeout(this.boltTimer);
    this.boltText.textContent = text;
    this.boltSpeak = speakText || text;
    this.bolt.classList.remove('hidden');
    if (speak) this.game.speech.speak(this.boltSpeak);
    const dur = ms || Math.min(14000, 3500 + text.length * 55);
    this.boltTimer = setTimeout(() => this.bolt.classList.add('hidden'), dur);
  }

  hideBolt() {
    if (this.game.paused?.()) return; // keep the "slow down" message up during the pause
    clearTimeout(this.boltTimer);
    this.bolt.classList.add('hidden');
  }

  banner(title, sub = '') {
    const b = el('div', 'banner', `<h1></h1>${sub ? '<p></p>' : ''}`);
    b.querySelector('h1').textContent = title;
    if (sub) b.querySelector('p').textContent = sub;
    this.root.append(b);
    setTimeout(() => b.remove(), 2700);
  }

  // Modal panel. `build(panel, close)` fills it. Returns close().
  overlay(build, { cls = '', dismiss = false } = {}) {
    const o = el('div', `overlay ${cls}`);
    const p = el('div', 'panel');
    o.append(p);
    const close = () => {
      o.remove();
      this.game.input.enabled = !this.root.querySelector('.overlay');
    };
    if (dismiss) o.addEventListener('pointerdown', (e) => e.target === o && close());
    build(p, close, o);
    this.root.append(o);
    this.game.input.enabled = false;
    this.game.input.reset();
    return close;
  }

  // "Update ready" button (only shown in the hub, so a run is never interrupted).
  showUpdate(onTap) {
    this.updateBtn?.remove();
    this.updateBtn = null;
    if (!onTap) return;
    const b = el('button', 'update-pill', '✨ Update ready! Tap to get the new version');
    b.addEventListener('click', () => {
      b.disabled = true;
      b.textContent = 'Updating…';
      onTap();
    });
    this.root.append(b);
    this.updateBtn = b;
  }

  hasOverlay() {
    return !!this.root.querySelector('.overlay');
  }
}

export { el, ICONS };
