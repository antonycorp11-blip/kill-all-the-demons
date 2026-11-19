// Pooled projectiles with arcs, homing, splash, pierce and chains.
import Phaser from 'phaser';
import type { Ent } from './types';
import { DEPTH_FX } from './fx';

export interface ShotOpts {
  tex: string;
  x: number; y: number;
  target: Ent | null;
  tx?: number; ty?: number;
  speed: number;
  dmg: number;
  src: Ent | null;
  team: 0 | 1;
  arc?: number;
  splash?: number;
  pierce?: number;
  chain?: number;
  tint?: number;
  scale?: number;
  add?: boolean;
  burn?: number;
  fall?: boolean; // meteor falling from sky
  wall?: boolean; // shot at fortress
  siege?: number; // fortress damage captured at fire time (the shooter may be recycled before impact)
  srcName?: string;
  onHit?: (x: number, y: number, target: Ent | null) => void;
}

export interface Shot extends ShotOpts {
  active: boolean;
  spr: Phaser.GameObjects.Image;
  sx: number; sy: number;
  t: number; dur: number;
  hitIds: number[];
}

export class Projectiles {
  scene: Phaser.Scene;
  shots: Shot[] = [];
  cap = 260;
  onImpact: (s: Shot, target: Ent | null, x: number, y: number) => void = () => {};

  constructor(scene: Phaser.Scene) { this.scene = scene; }

  fire(o: ShotOpts) {
    let s = this.shots.find((q) => !q.active);
    if (!s) {
      if (this.shots.length >= this.cap) return;
      const spr = this.scene.add.image(0, 0, o.tex).setVisible(false);
      s = { ...o, active: false, spr, sx: 0, sy: 0, t: 0, dur: 1, hitIds: [] } as Shot;
      this.shots.push(s);
    }
    const tx = o.target ? o.target.x : o.tx ?? o.x;
    const ty = o.target ? o.target.y - 10 : o.ty ?? o.y;
    // reset every optional field: pooled shots must never inherit flags (e.g. `wall`) from a previous shot
    Object.assign(s, {
      arc: 0, splash: 0, pierce: 0, chain: 0, tint: undefined, scale: undefined, add: false, burn: 0, fall: false,
      wall: false, siege: 0, srcName: undefined, onHit: undefined, tx: undefined, ty: undefined,
    }, o);
    s.active = true;
    s.sx = o.x; s.sy = o.y;
    s.tx = tx; s.ty = ty;
    s.t = 0;
    const d = Math.hypot(tx - o.x, ty - o.y);
    s.dur = Math.max(0.08, d / o.speed);
    if (o.fall) s.dur = 0.55;
    s.hitIds = [];
    s.spr.setTexture(o.tex).setVisible(true).setScale(o.scale ?? 2).setTint(o.tint ?? 0xffffff).setAlpha(1);
    s.spr.setBlendMode(o.add ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL);
  }

  update(dt: number) {
    for (const s of this.shots) {
      if (!s.active) continue;
      s.t += dt;
      if (s.target && s.target.alive && !s.fall) {
        s.tx = s.target.x; s.ty = s.target.y - 10 - s.target.z;
      }
      let k = Math.min(1, s.t / s.dur);
      let x: number, y: number;
      if (s.fall) {
        x = s.tx! + (1 - k) * 120;
        y = s.ty! - (1 - k) * 420;
      } else {
        x = s.sx + (s.tx! - s.sx) * k;
        y = s.sy + (s.ty! - s.sy) * k - Math.sin(k * Math.PI) * (s.arc || 0);
      }
      const px = s.spr.x, py = s.spr.y;
      s.spr.setPosition(x, y);
      if (s.t > dt) s.spr.setRotation(Math.atan2(y - py, x - px));
      s.spr.setDepth(DEPTH_FX + y + 30);
      if (k >= 1) {
        s.active = false;
        s.spr.setVisible(false);
        this.onImpact(s, s.target && s.target.alive ? s.target : null, s.tx!, s.ty!);
      }
    }
  }

  clear() { for (const s of this.shots) { s.active = false; s.spr.setVisible(false); } }
}
