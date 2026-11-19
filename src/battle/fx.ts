// Pooled particles, floating combat text, beams and screen effects with hard caps for mobile.
import Phaser from 'phaser';
import { G } from '../core/state';
import { fmt } from '../core/format';
import { rand } from '../core/util';

interface Particle {
  spr: Phaser.GameObjects.Image;
  active: boolean;
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  g: number; drag: number;
  life: number; max: number;
  s0: number; s1: number;
  a0: number;
  rot: number; vr: number;
  ground: boolean;
}

interface FText {
  t: Phaser.GameObjects.Text;
  active: boolean;
  x: number; y: number; vy: number;
  life: number; max: number;
  big: boolean;
}

interface Beam { g: Phaser.GameObjects.Graphics; pts: number[]; life: number; max: number; color: number; width: number; active: boolean }

export const DEPTH_FX = 5000;
export const DEPTH_TEXT = 9000;

export class Fx {
  scene: Phaser.Scene;
  parts: Particle[] = [];
  texts: FText[] = [];
  beams: Beam[] = [];
  cap = 380;
  textCap = 34;
  shakeT = 0;
  shakeMag = 0;
  textCooldown = 0;
  flashRect: Phaser.GameObjects.Rectangle;
  flashT = 0;
  flashMax = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.applyQuality();
    this.flashRect = scene.add.rectangle(0, 0, 4000, 2000, 0xffffff, 0).setOrigin(0).setDepth(DEPTH_TEXT + 10).setScrollFactor(0);
  }

  applyQuality() {
    const q = G.settings.quality;
    this.cap = q === 'high' ? 420 : q === 'med' ? 240 : 110;
    this.textCap = q === 'low' ? 14 : 34;
  }

  private getPart(): Particle | null {
    for (const p of this.parts) if (!p.active) return p;
    if (this.parts.length >= this.cap) return null;
    const spr = this.scene.add.image(0, 0, 'px').setVisible(false);
    const p: Particle = { spr, active: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, g: 0, drag: 0, life: 0, max: 1, s0: 1, s1: 0, a0: 1, rot: 0, vr: 0, ground: false };
    this.parts.push(p);
    return p;
  }

  particle(o: {
    tex?: string; x: number; y: number; z?: number; vx?: number; vy?: number; vz?: number; g?: number; drag?: number; life: number;
    s0?: number; s1?: number; color?: number; add?: boolean; a0?: number; rot?: number; vr?: number; depth?: number; ground?: boolean;
  }) {
    const p = this.getPart();
    if (!p) return;
    p.active = true;
    p.x = o.x; p.y = o.y; p.z = o.z || 0;
    p.vx = o.vx || 0; p.vy = o.vy || 0; p.vz = o.vz || 0;
    p.g = o.g || 0; p.drag = o.drag || 0;
    p.life = 0; p.max = o.life;
    p.s0 = o.s0 ?? 1; p.s1 = o.s1 ?? 0;
    p.a0 = o.a0 ?? 1;
    p.rot = o.rot || 0; p.vr = o.vr || 0;
    p.ground = !!o.ground;
    const s = p.spr;
    s.setTexture(o.tex || 'px').setVisible(true).setTint(o.color ?? 0xffffff).setAlpha(p.a0).setScale(p.s0).setRotation(p.rot);
    s.setBlendMode(o.add ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL);
    s.setDepth(o.depth ?? (p.ground ? 2 : DEPTH_FX + o.y));
  }

  burst(x: number, y: number, color: number, n: number, speed = 80, opts: { tex?: string; add?: boolean; life?: number; up?: number; size?: number; g?: number } = {}) {
    const q = G.settings.quality === 'low' ? 0.4 : G.settings.quality === 'med' ? 0.7 : 1;
    const cnt = Math.max(1, Math.round(n * q));
    for (let i = 0; i < cnt; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = speed * (0.3 + Math.random() * 0.8);
      this.particle({
        tex: opts.tex || 'px', x, y, z: 4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: (opts.up ?? 60) * (0.5 + Math.random()),
        g: opts.g ?? 220, drag: 1.5, life: (opts.life || 0.5) * (0.6 + Math.random() * 0.6), s0: (opts.size || 1) * (0.6 + Math.random() * 0.6), s1: 0, color, add: opts.add,
      });
    }
  }

  glow(x: number, y: number, color: number, size: number, life: number, alpha = 0.8) {
    this.particle({ tex: 'glow', x, y, life, s0: size, s1: size * 1.4, color, add: true, a0: alpha });
  }

  ring(x: number, y: number, color: number, radius: number, life = 0.45, ground = true) {
    // ring texture is 128px with r=58 -> scale = radius/58, squashed for perspective via scaleY in update
    this.particle({ tex: 'ring', x, y, life, s0: radius / 58 * 0.3, s1: radius / 58, color, add: true, a0: 0.9, ground });
  }

  slash(x: number, y: number, facing: number, color = 0xffffff, size = 0.7) {
    this.particle({ tex: 'slash', x: x + facing * 6, y: y - 12, life: 0.16, s0: size, s1: size * 1.25, color, add: true, a0: 0.95, rot: facing > 0 ? 0 : Math.PI });
  }

  text(x: number, y: number, value: number | string, color = '#ffffff', big = false, force = false) {
    if (!G.settings.dmgNumbers) return;
    if (!force && this.textCooldown > 0) return;
    let t: FText | undefined = this.texts.find((tt) => !tt.active);
    if (!t) {
      if (this.texts.length >= this.textCap) {
        if (!big) return;
        t = this.texts.reduce((a, b) => (a.life / a.max > b.life / b.max ? a : b));
      } else {
        const txt = this.scene.add.text(0, 0, '', {
          fontFamily: '"Lilita One", "Arial Black", sans-serif', fontSize: '18px', color: '#fff', stroke: '#1a0a14', strokeThickness: 4,
        }).setOrigin(0.5).setDepth(DEPTH_TEXT);
        t = { t: txt, active: false, x: 0, y: 0, vy: 0, life: 0, max: 1, big: false };
        this.texts.push(t);
      }
    }
    t.active = true;
    t.x = x + rand(-6, 6); t.y = y; t.vy = big ? -55 : -42; t.life = 0; t.max = big ? 1.1 : 0.75; t.big = big;
    t.t.setText(typeof value === 'number' ? fmt(value) : value).setColor(color).setFontSize(big ? 24 : 16).setVisible(true).setAlpha(1).setScale(big ? 1.4 : 1);
    if (!force) this.textCooldown = 0.05;
  }

  beam(pts: number[], color: number, width = 2, life = 0.18) {
    let b = this.beams.find((bb) => !bb.active);
    if (!b) {
      if (this.beams.length > 24) return;
      const g = this.scene.add.graphics().setDepth(DEPTH_FX + 800).setBlendMode(Phaser.BlendModes.ADD);
      b = { g, pts: [], life: 0, max: 1, color, width, active: false };
      this.beams.push(b);
    }
    b.active = true; b.pts = pts; b.life = 0; b.max = life; b.color = color; b.width = width;
  }

  lightning(x0: number, y0: number, x1: number, y1: number, color = 0x9ae0ff) {
    const pts: number[] = [x0, y0];
    const n = 6;
    for (let i = 1; i < n; i++) {
      const t = i / n;
      pts.push(x0 + (x1 - x0) * t + rand(-8, 8), y0 + (y1 - y0) * t + rand(-8, 8));
    }
    pts.push(x1, y1);
    this.beam(pts, color, 2.5, 0.2);
  }

  shake(mag: number, dur: number) {
    if (!G.settings.shake) return;
    if (mag > this.shakeMag || this.shakeT <= 0) { this.shakeMag = mag; }
    this.shakeT = Math.max(this.shakeT, dur);
  }

  flash(color: number, alpha: number, dur: number) {
    this.flashRect.setFillStyle(color, alpha);
    this.flashT = dur; this.flashMax = dur;
  }

  update(dt: number) {
    this.textCooldown -= dt;
    for (const p of this.parts) {
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.max) { p.active = false; p.spr.setVisible(false); continue; }
      const k = Math.exp(-p.drag * dt);
      p.vx *= k; p.vy *= k;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vz -= p.g * dt; p.z += p.vz * dt;
      if (p.z < 0) { p.z = 0; p.vz *= -0.3; p.vx *= 0.6; p.vy *= 0.6; }
      p.rot += p.vr * dt;
      const t = p.life / p.max;
      const s = p.s0 + (p.s1 - p.s0) * t;
      p.spr.setPosition(p.x, p.y - p.z).setScale(s, p.ground ? s * 0.45 : s).setAlpha(p.a0 * (1 - t * t)).setRotation(p.rot);
      if (!p.ground) p.spr.setDepth(DEPTH_FX + p.y);
    }
    for (const t of this.texts) {
      if (!t.active) continue;
      t.life += dt;
      if (t.life >= t.max) { t.active = false; t.t.setVisible(false); continue; }
      t.y += t.vy * dt; t.vy *= Math.exp(-2.5 * dt);
      const k = t.life / t.max;
      const pop = t.big ? 1 + Math.max(0, 0.5 - t.life * 4) : 1;
      t.t.setPosition(t.x, t.y).setAlpha(k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1).setScale(pop);
    }
    for (const b of this.beams) {
      if (!b.active) continue;
      b.life += dt;
      b.g.clear();
      if (b.life >= b.max) { b.active = false; continue; }
      const a = 1 - b.life / b.max;
      b.g.lineStyle(b.width * 2.5, b.color, a * 0.35);
      b.g.strokePoints(toPts(b.pts));
      b.g.lineStyle(b.width, 0xffffff, a);
      b.g.strokePoints(toPts(b.pts));
    }
    if (this.flashT > 0) {
      this.flashT -= dt;
      this.flashRect.setAlpha(Math.max(0, this.flashT / this.flashMax));
    } else this.flashRect.setAlpha(0);
  }

  cameraShakeOffset(dt: number): [number, number] {
    if (this.shakeT <= 0) return [0, 0];
    this.shakeT -= dt;
    const m = this.shakeMag * Math.min(1, this.shakeT * 4);
    return [rand(-m, m), rand(-m, m)];
  }

  clear() {
    for (const p of this.parts) { p.active = false; p.spr.setVisible(false); }
    for (const t of this.texts) { t.active = false; t.t.setVisible(false); }
    for (const b of this.beams) { b.active = false; b.g.clear(); }
  }
}

function toPts(arr: number[]) {
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < arr.length; i += 2) out.push({ x: arr[i], y: arr[i + 1] });
  return out;
}
