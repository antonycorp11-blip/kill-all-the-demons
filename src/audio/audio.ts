// Fully synthesized SFX + procedural music via WebAudio. No audio files.
import { G } from '../core/state';

type Sfx = 'hit' | 'hit2' | 'arrow' | 'magic' | 'boom' | 'coin' | 'level' | 'promote' | 'death' | 'edeath' | 'roar' | 'click' | 'buy' | 'warn' | 'heal'
  | 'blade' | 'frost' | 'bless' | 'portal' | 'wall' | 'victory' | 'defeat' | 'wave' | 'summon' | 'lightning';

class AudioEngine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  sfxGain!: GainNode;
  musicGain!: GainNode;
  noise!: AudioBuffer;
  last = new Map<string, number>();
  musicTimer: number | null = null;
  step = 0;
  root = 0;
  intensity = 0;
  nextNoteTime = 0;

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AC() as AudioContext;
    } catch (e) { return; }
    const ctx = this.ctx!;
    this.master = ctx.createGain(); this.master.gain.value = 0.8; this.master.connect(ctx.destination);
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    comp.connect(this.master);
    this.sfxGain = ctx.createGain(); this.sfxGain.connect(comp);
    this.musicGain = ctx.createGain(); this.musicGain.connect(comp);
    const len = ctx.sampleRate * 1;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.applyVolumes();
    this.startMusic();
  }

  applyVolumes() {
    if (!this.ctx) return;
    this.sfxGain.gain.value = G.settings.sfx ? G.settings.sfxVol * 0.6 : 0;
    this.musicGain.gain.value = G.settings.music ? G.settings.musicVol * 0.32 : 0;
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slide = 0, delay = 0, dest?: AudioNode) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.sfxGain);
    o.start(t); o.stop(t + dur + 0.02);
  }

  private noiseHit(dur: number, vol: number, freq: number, q = 1, delay = 0, type: BiquadFilterType = 'bandpass', dest?: AudioNode) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + delay;
    const s = ctx.createBufferSource(); s.buffer = this.noise;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || this.sfxGain);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }

  play(name: Sfx, vol = 1) {
    if (!this.ctx || !G.settings.sfx) return;
    const now = performance.now();
    const minGap: Record<string, number> = { hit: 45, hit2: 60, arrow: 70, magic: 90, coin: 60, edeath: 50, death: 90, heal: 120, lightning: 100 };
    const gap = minGap[name] ?? 30;
    if ((now - (this.last.get(name) || 0)) < gap) return;
    this.last.set(name, now);
    const r = 0.9 + Math.random() * 0.2;
    switch (name) {
      case 'hit': this.noiseHit(0.06, 0.25 * vol, 1800 * r, 1.2); this.tone(180 * r, 0.05, 'square', 0.05 * vol, 0.5); break;
      case 'hit2': this.noiseHit(0.1, 0.35 * vol, 700 * r, 0.8); this.tone(110 * r, 0.1, 'triangle', 0.15 * vol, 0.5); break;
      case 'arrow': this.noiseHit(0.08, 0.12 * vol, 4200 * r, 3, 0, 'highpass'); break;
      case 'magic': this.tone(600 * r, 0.18, 'sine', 0.08 * vol, 2.2); this.tone(900 * r, 0.14, 'triangle', 0.04 * vol, 1.8, 0.03); break;
      case 'lightning': this.noiseHit(0.18, 0.2 * vol, 3000, 0.5, 0, 'highpass'); this.tone(1200, 0.12, 'sawtooth', 0.03, 0.3); break;
      case 'boom': this.noiseHit(0.5, 0.55 * vol, 300, 0.6, 0, 'lowpass'); this.tone(80, 0.4, 'sine', 0.35 * vol, 0.4); break;
      case 'coin': this.tone(1320 * r, 0.06, 'square', 0.03 * vol); this.tone(1760 * r, 0.08, 'square', 0.03 * vol, 1, 0.05); break;
      case 'level': [523, 659, 784].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.08, 1, i * 0.06)); break;
      case 'promote': [392, 523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.18, 'square', 0.05, 1, i * 0.06)); this.noiseHit(0.4, 0.08, 6000, 1, 0.25, 'highpass'); break;
      case 'death': this.tone(300 * r, 0.25, 'triangle', 0.08 * vol, 0.4); break;
      case 'edeath': this.noiseHit(0.12, 0.15 * vol, 900 * r, 1); this.tone(220 * r, 0.12, 'sawtooth', 0.04 * vol, 0.4); break;
      case 'roar': this.tone(70, 1.2, 'sawtooth', 0.3, 0.6); this.tone(105, 1.1, 'sawtooth', 0.18, 0.5); this.noiseHit(1.2, 0.25, 400, 0.5, 0, 'lowpass'); break;
      case 'click': this.tone(880, 0.04, 'square', 0.04); break;
      case 'buy': this.tone(660, 0.06, 'square', 0.05); this.tone(990, 0.1, 'square', 0.05, 1, 0.05); break;
      case 'warn': this.tone(220, 0.25, 'square', 0.08, 1); this.tone(220, 0.25, 'square', 0.08, 1, 0.35); break;
      case 'heal': this.tone(880 * r, 0.2, 'sine', 0.05, 1.5); break;
      case 'blade': this.tone(1600, 0.5, 'sawtooth', 0.06, 0.2); this.noiseHit(0.6, 0.4, 500, 0.5, 0.35, 'lowpass'); this.tone(60, 0.6, 'sine', 0.4, 0.5, 0.35); break;
      case 'frost': this.noiseHit(0.8, 0.25, 5000, 2, 0, 'highpass'); [1318, 1568, 1975].forEach((f, i) => this.tone(f, 0.4, 'sine', 0.05, 1, i * 0.05)); break;
      case 'bless': [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.6, 'sine', 0.06, 1, i * 0.07)); break;
      case 'portal': this.tone(200, 0.9, 'sine', 0.15, 3); this.tone(300, 0.9, 'triangle', 0.08, 2.5); break;
      case 'summon': this.tone(400, 0.3, 'sine', 0.06, 2); break;
      case 'wall': this.noiseHit(0.15, 0.25 * vol, 500, 1); this.tone(90, 0.12, 'square', 0.06, 0.6); break;
      case 'wave': this.tone(392, 0.25, 'square', 0.06); this.tone(523, 0.35, 'square', 0.06, 1, 0.18); break;
      case 'victory': [523, 659, 784, 1046, 784, 1046].forEach((f, i) => this.tone(f, 0.25, 'square', 0.06, 1, i * 0.13)); break;
      case 'defeat': [392, 349, 311, 262].forEach((f, i) => this.tone(f, 0.45, 'triangle', 0.1, 1, i * 0.3)); break;
    }
  }

  // ------------- Music: dark fantasy loop sequencer -------------
  setRoot(r: number) { this.root = r; }
  setIntensity(i: number) { this.intensity = i; }

  startMusic() {
    if (!this.ctx || this.musicTimer != null) return;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.musicTimer = window.setInterval(() => this.schedule(), 50);
  }

  private schedule() {
    const ctx = this.ctx!;
    if (!G.settings.music) { this.nextNoteTime = ctx.currentTime + 0.1; return; }
    const bpm = 104 + this.intensity * 26;
    const s16 = 60 / bpm / 4;
    while (this.nextNoteTime < ctx.currentTime + 0.2) {
      this.note(this.step, this.nextNoteTime, s16);
      this.step = (this.step + 1) % 128;
      this.nextNoteTime += s16;
    }
  }

  private note(step: number, t: number, s16: number) {
    const ctx = this.ctx!;
    const base = 110 * Math.pow(2, this.root / 12);
    const prog = [0, 0, 8, 8, 5, 5, 7, 7]; // i - VI - iv - v (minor)
    const chord = prog[Math.floor(step / 16) % 8];
    const minor = [0, 3, 7];
    const f = (semi: number, oct = 0) => base * Math.pow(2, (semi + chord) / 12 + oct);
    const delay = t - ctx.currentTime;
    const dest = this.musicGain;
    // bass
    if (step % 4 === 0) this.tone(f(0, -1), s16 * 3.2, 'triangle', 0.22, 1, delay, dest);
    if (step % 8 === 6) this.tone(f(7, -1), s16 * 1.5, 'triangle', 0.14, 1, delay, dest);
    // arpeggio
    const arp = [0, 1, 2, 1, 2, 0, 1, 2];
    if (step % 2 === 0) this.tone(f(minor[arp[(step / 2) % 8]], 1), s16 * 1.6, 'square', 0.022 + this.intensity * 0.01, 1, delay, dest);
    // pad on chord change
    if (step % 16 === 0) { minor.forEach((m) => this.tone(f(m, 0), s16 * 15, 'sawtooth', 0.012, 1, delay, dest)); }
    // drums
    if (step % 8 === 0) { this.tone(120, 0.12, 'sine', 0.3, 0.35, delay, dest); }
    if (step % 8 === 4) this.noiseHit(0.12, 0.08 + this.intensity * 0.05, 1800, 0.7, delay, 'bandpass', dest);
    if (this.intensity > 0.3 && step % 2 === 1) this.noiseHit(0.03, 0.025, 8000, 1, delay, 'highpass', dest);
    if (this.intensity > 0.6 && step % 16 === 14) this.tone(120, 0.1, 'sine', 0.25, 0.35, delay, dest);
  }
}

export const audio = new AudioEngine();
