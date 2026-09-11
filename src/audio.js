// Proceduralny dźwięk (WebAudio) — efekty + ambient, bez plików audio.
export class AudioSys {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = localStorage.getItem('dk_muted') === '1';
    this.ambientNodes = [];
    this.lastStep = 0;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      this.startAmbient();
      return true;
    } catch { return false; }
  }

  setMuted(m) {
    this.muted = m;
    localStorage.setItem('dk_muted', m ? '1' : '0');
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  tone(freq, dur, type = 'sine', vol = 0.3, slideTo = null, delay = 0) {
    if (!this.ensure()) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  noise(dur, vol = 0.3, filterFreq = 1200, type = 'lowpass', delay = 0) {
    if (!this.ensure()) return;
    const t = this.ctx.currentTime + delay;
    const len = Math.max(1, (dur * this.ctx.sampleRate) | 0);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + dur + 0.05);
  }

  play(name, opt = {}) {
    if (this.muted) return;
    switch (name) {
      case 'click': this.tone(660, 0.07, 'triangle', 0.2); break;
      case 'swing': this.noise(0.16, 0.25, 2600, 'bandpass'); break;
      case 'hit': this.noise(0.12, 0.4, 500); this.tone(140, 0.12, 'square', 0.15, 60); break;
      case 'hurt': this.tone(220, 0.25, 'sawtooth', 0.25, 90); break;
      case 'coin': this.tone(990, 0.09, 'square', 0.12); this.tone(1320, 0.14, 'square', 0.12, null, 0.07); break;
      case 'quest': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.25, null, i * 0.11)); break;
      case 'questDone': [784, 659, 523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.2, 'triangle', 0.22, null, i * 0.1)); break;
      case 'potion': this.tone(300, 0.2, 'sine', 0.3, 700); this.noise(0.15, 0.1, 3000, 'highpass', 0.05); break;
      case 'eat': this.noise(0.1, 0.3, 700); this.noise(0.1, 0.3, 600, 'lowpass', 0.14); break;
      case 'levelup': [440, 554, 659, 880, 1108].forEach((f, i) => this.tone(f, 0.3, 'sine', 0.25, null, i * 0.09)); break;
      case 'death': this.tone(300, 0.8, 'sawtooth', 0.3, 50); break;
      case 'enemyDie': this.tone(180, 0.3, 'square', 0.2, 50); this.noise(0.2, 0.2, 400); break;
      case 'fireball': this.noise(0.4, 0.3, 900, 'bandpass'); this.tone(200, 0.35, 'sawtooth', 0.15, 600); break;
      case 'explode': this.noise(0.5, 0.5, 300); this.tone(90, 0.5, 'sine', 0.4, 35); break;
      case 'bow': this.tone(180, 0.1, 'triangle', 0.3, 420); this.noise(0.08, 0.2, 3000, 'highpass'); break;
      case 'pickup': this.tone(520, 0.1, 'sine', 0.25, 880); break;
      case 'step': {
        const now = performance.now();
        if (now - this.lastStep > 240) { this.lastStep = now; this.noise(0.06, 0.07, 500 + Math.random() * 300); }
        break;
      }
      case 'horse': this.noise(0.08, 0.22, 900); this.noise(0.08, 0.22, 800, 'lowpass', 0.13); break;
      case 'splash': this.noise(0.3, 0.25, 1400, 'bandpass'); break;
      case 'win': [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.25, null, i * 0.13)); break;
      case 'error': this.tone(160, 0.18, 'square', 0.2, 120); break;
      case 'heal': [440, 554, 659].forEach((f, i) => this.tone(f, 0.35, 'sine', 0.2, null, i * 0.08)); break;
      case 'wolf': this.tone(280, 0.7, 'sawtooth', 0.14, 420); this.tone(350, 0.6, 'sawtooth', 0.1, 500, 0.15); break;
      case 'goblin': this.tone(500, 0.12, 'square', 0.14, 900); this.tone(700, 0.1, 'square', 0.12, 400, 0.1); break;
      case 'snore': this.noise(0.5, 0.1, 300); break;
      default: break;
    }
  }

  startAmbient() {
    if (!this.ctx || this.ambientNodes.length) return;
    // Wiatr — filtrowany szum z wolną modulacją
    const len = this.ctx.sampleRate * 3;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 320; f.Q.value = 0.6;
    const g = this.ctx.createGain(); g.gain.value = 0.05;
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.13;
    const lfoG = this.ctx.createGain(); lfoG.gain.value = 0.025;
    lfo.connect(lfoG); lfoG.connect(g.gain);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(); lfo.start();
    this.ambientNodes.push(src, lfo);
    // Ptaki / świerszcze — losowe ćwierknięcia
    const chirp = () => {
      if (!this.muted && this.ctx) {
        const isNight = this.isNightFn ? this.isNightFn() : false;
        if (isNight) {
          const f0 = 3800 + Math.random() * 800;
          for (let i = 0; i < 3; i++) this.tone(f0, 0.05, 'sine', 0.03, null, i * 0.07);
        } else if (Math.random() < 0.6) {
          const f0 = 2200 + Math.random() * 1400;
          this.tone(f0, 0.09, 'sine', 0.035, f0 * 1.4);
          this.tone(f0 * 1.2, 0.08, 'sine', 0.03, f0 * 0.8, 0.11);
        }
      }
      setTimeout(chirp, 4000 + Math.random() * 9000);
    };
    setTimeout(chirp, 3000);
  }
}
