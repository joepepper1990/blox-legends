// Little synthesised sound effects (no audio files). iPad only allows sound
// after a tap, so `unlock()` is called from the Play button.

export class Audio {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  tone(freq, start, dur, { type = 'sine', vol = 0.3, slide = 0 } = {}) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + start;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  noise(start, dur, { vol = 0.2, freq = 1200 } = {}) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + start;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
  }

  coin() {
    this.tone(988, 0, 0.08, { type: 'square', vol: 0.12 });
    this.tone(1319, 0.07, 0.18, { type: 'square', vol: 0.12 });
  }
  correct() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, i * 0.07, 0.22, { type: 'triangle', vol: 0.25 }));
  }
  wrong() {
    // Gentle "boop", not a harsh buzzer.
    this.tone(330, 0, 0.18, { type: 'sine', vol: 0.25, slide: -120 });
    this.tone(247, 0.16, 0.25, { type: 'sine', vol: 0.22, slide: -80 });
  }
  jump() {
    this.tone(300, 0, 0.14, { type: 'square', vol: 0.06, slide: 300 });
  }
  land() {
    this.noise(0, 0.06, { vol: 0.08, freq: 400 });
  }
  smash() {
    this.noise(0, 0.35, { vol: 0.35, freq: 3000 });
    this.noise(0.05, 0.3, { vol: 0.2, freq: 6000 });
  }
  whoosh() {
    this.noise(0, 0.5, { vol: 0.25, freq: 800 });
    this.tone(200, 0, 0.5, { type: 'sine', vol: 0.12, slide: 500 });
  }
  door() {
    this.tone(110, 0, 0.6, { type: 'sawtooth', vol: 0.08, slide: 60 });
    this.noise(0, 0.6, { vol: 0.12, freq: 300 });
  }
  fanfare() {
    const notes = [523, 659, 784, 1047, 784, 1047];
    notes.forEach((f, i) => this.tone(f, i * 0.11, i === notes.length - 1 ? 0.6 : 0.16, { type: 'triangle', vol: 0.28 }));
  }
  levelUp() {
    [392, 523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, i * 0.08, 0.3, { type: 'square', vol: 0.1 }));
  }
  click() {
    this.tone(660, 0, 0.05, { type: 'square', vol: 0.06 });
  }
}
