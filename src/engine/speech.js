// Read-aloud for every question and hint, using the iPad's built-in voices.
// A British voice is preferred. Nothing is sent anywhere: it's all on device.

export class Speech {
  constructor() {
    this.enabled = true;
    this.voice = null;
    this.supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
    if (this.supported) {
      this.chooseVoice();
      window.speechSynthesis.addEventListener?.('voiceschanged', () => this.chooseVoice());
    }
  }

  chooseVoice() {
    const voices = window.speechSynthesis.getVoices();
    const gb = voices.filter((v) => /en[-_]GB/i.test(v.lang));
    const prefer = ['Daniel', 'Arthur', 'Martha', 'Serena', 'Kate', 'Oliver', 'Google UK English'];
    this.voice =
      prefer.map((n) => gb.find((v) => v.name.includes(n))).find(Boolean) ||
      gb[0] ||
      voices.find((v) => /^en/i.test(v.lang)) ||
      null;
  }

  // Turn maths symbols and arrows into words a voice reads naturally.
  clean(text) {
    return String(text)
      .replace(/×/g, ' times ')
      .replace(/÷/g, ' divided by ')
      .replace(/−/g, ' take away ')
      .replace(/→/g, ' becomes ')
      .replace(/↔/g, ' swaps with ')
      .replace(/=\s*\?/g, ' equals what?')
      // Letter codes like GJTI are spelled out, letter by letter.
      .replace(/\b[A-Z]{2,6}\b/g, (w) => ` ${w.split('').join(', ')} `)
      .replace(/\(([+-]\d+)\)/g, (_, n) => (n[0] === '+' ? ` plus ${n.slice(1)} ` : ` minus ${n.slice(1)} `))
      .replace(/\s+/g, ' ');
  }

  speak(text, { force = false } = {}) {
    if (!this.supported || (!this.enabled && !force) || !text) return;
    try {
      const s = window.speechSynthesis;
      s.cancel();
      const u = new SpeechSynthesisUtterance(this.clean(text));
      if (this.voice) u.voice = this.voice;
      u.lang = this.voice?.lang || 'en-GB';
      u.rate = 0.92;
      u.pitch = 1.05;
      s.speak(u);
    } catch {
      /* speech is a nice-to-have */
    }
  }

  stop() {
    if (this.supported) window.speechSynthesis.cancel();
  }

  // iOS needs one utterance from a tap before speech works later.
  unlock() {
    if (!this.supported) return;
    try {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      window.speechSynthesis.speak(u);
    } catch {
      /* ignore */
    }
  }
}
