// Touch controls in the Roblox mobile style: a thumbstick that appears wherever
// the left thumb lands, a big jump button bottom-right, and drag anywhere else
// to look around. Short taps are reported so worlds can make things tappable.
// Keyboard + mouse work too, for testing on a computer.

export class Input {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.move = { x: 0, y: 0 };
    this.look = { dx: 0, dy: 0 };
    this.jumpQueued = 0; // time the jump was pressed (for buffering)
    this.jumpHeld = false;
    this.taps = [];
    this.keys = new Set();
    this.enabled = true;
    this.lastActivity = performance.now();

    this.stick = document.createElement('div');
    this.stick.className = 'stick';
    this.stick.innerHTML = '<i></i>';
    this.stickKnob = this.stick.firstChild;
    this.stickHint = document.createElement('div');
    this.stickHint.className = 'stick-hint';
    this.stickHint.textContent = 'MOVE';
    this.jumpBtn = document.createElement('button');
    this.jumpBtn.className = 'jump-btn';
    this.jumpBtn.setAttribute('aria-label', 'Jump');
    this.jumpBtn.innerHTML =
      '<svg viewBox="0 0 24 24"><path d="M12 4l7 8h-4v8H9v-8H5z" fill="#1d2340"/></svg>';
    ui.append(this.stickHint, this.stick, this.jumpBtn);

    this.stickId = null;
    this.stickOrigin = { x: 0, y: 0 };
    this.lookers = new Map(); // pointerId -> {x, y, sx, sy, t}

    canvas.addEventListener('pointerdown', (e) => this.down(e));
    window.addEventListener('pointermove', (e) => this.moveEv(e));
    window.addEventListener('pointerup', (e) => this.up(e));
    window.addEventListener('pointercancel', (e) => this.up(e, true));

    const jumpDown = (e) => {
      e.preventDefault();
      this.jumpQueued = performance.now();
      this.jumpHeld = true;
      this.jumpBtn.classList.add('down');
      this.lastActivity = performance.now();
    };
    const jumpUp = () => {
      this.jumpHeld = false;
      this.jumpBtn.classList.remove('down');
    };
    this.jumpBtn.addEventListener('pointerdown', jumpDown);
    this.jumpBtn.addEventListener('pointerup', jumpUp);
    this.jumpBtn.addEventListener('pointercancel', jumpUp);
    this.jumpBtn.addEventListener('pointerleave', jumpUp);

    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      this.keys.add(e.code);
      if (e.code === 'Space' && !e.repeat) {
        this.jumpQueued = performance.now();
        this.jumpHeld = true;
      }
      this.lastActivity = performance.now();
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      if (e.code === 'Space') this.jumpHeld = false;
    });
    // Stop iOS pinch-zoom and double-tap zoom.
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('dblclick', (e) => e.preventDefault());
    window.addEventListener('blur', () => this.reset());
  }

  reset() {
    this.stickId = null;
    this.move.x = this.move.y = 0;
    this.stick.classList.remove('on');
    this.lookers.clear();
    this.keys.clear();
    this.jumpHeld = false;
  }

  down(e) {
    if (!this.enabled) return;
    this.lastActivity = performance.now();
    const left = e.clientX < window.innerWidth * 0.42 && e.pointerType !== 'mouse';
    if (left && this.stickId === null) {
      this.stickId = e.pointerId;
      this.stickOrigin = { x: e.clientX, y: e.clientY };
      this.stick.style.left = `${e.clientX}px`;
      this.stick.style.top = `${e.clientY}px`;
      this.stickKnob.style.transform = '';
      this.stick.classList.add('on');
      this.stickHint.style.opacity = '0';
    } else {
      this.lookers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now() });
    }
  }

  moveEv(e) {
    if (e.pointerId === this.stickId) {
      const max = 60;
      let dx = e.clientX - this.stickOrigin.x;
      let dy = e.clientY - this.stickOrigin.y;
      const len = Math.hypot(dx, dy);
      if (len > max) {
        dx = (dx / len) * max;
        dy = (dy / len) * max;
      }
      this.stickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
      const dead = 8;
      const mag = Math.max(0, Math.min(1, (Math.hypot(dx, dy) - dead) / (max - dead)));
      const ang = Math.atan2(dy, dx);
      this.move.x = Math.cos(ang) * mag;
      this.move.y = -Math.sin(ang) * mag;
      return;
    }
    const l = this.lookers.get(e.pointerId);
    if (l) {
      this.look.dx += e.clientX - l.x;
      this.look.dy += e.clientY - l.y;
      l.x = e.clientX;
      l.y = e.clientY;
    }
  }

  up(e, cancelled = false) {
    if (e.pointerId === this.stickId) {
      this.stickId = null;
      this.move.x = this.move.y = 0;
      this.stick.classList.remove('on');
      return;
    }
    const l = this.lookers.get(e.pointerId);
    if (l) {
      this.lookers.delete(e.pointerId);
      const moved = Math.hypot(e.clientX - l.sx, e.clientY - l.sy);
      if (!cancelled && moved < 14 && performance.now() - l.t < 450) this.taps.push({ x: e.clientX, y: e.clientY });
    }
  }

  // Called once per frame by the game.
  sample() {
    const k = this.keys;
    if (this.stickId === null) {
      let x = 0;
      let y = 0;
      if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
      if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
      if (k.has('KeyW') || k.has('ArrowUp')) y += 1;
      if (k.has('KeyS') || k.has('ArrowDown')) y -= 1;
      const len = Math.hypot(x, y) || 1;
      this.move.x = x / len;
      this.move.y = y / len;
    }
    const look = { dx: this.look.dx, dy: this.look.dy };
    this.look.dx = this.look.dy = 0;
    const taps = this.taps;
    this.taps = [];
    return { move: this.move, look, taps };
  }

  // True if jump was pressed within the buffer window; consumes it.
  takeJump(windowMs = 140) {
    if (this.jumpQueued && performance.now() - this.jumpQueued < windowMs) {
      this.jumpQueued = 0;
      return true;
    }
    return false;
  }

  setVisible(v) {
    this.jumpBtn.style.display = v ? '' : 'none';
    this.stickHint.style.display = v ? '' : 'none';
    if (!v) this.reset();
  }
}
