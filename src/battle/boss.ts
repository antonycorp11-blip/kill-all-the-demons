// Boss & miniboss controller: movement, phases, telegraphed abilities (ground markers) and army-wiping attacks.
import Phaser from 'phaser';
import type { Ent } from './types';
import type { World } from './world';
import { BOSSES, type BossAbility, type BossDef } from '../data/bosses';
import { ENEMIES, type EnemyId } from '../data/enemies';
import { G } from '../core/state';
import { enemyHpScale, enemyDmgScale } from '../core/mods';
import { rand, clamp } from '../core/util';
import { audio } from '../audio/audio';

interface Shape { kind: 'circle' | 'cone' | 'rect' | 'field' | 'wave'; x: number; y: number; r?: number; ang?: number; spread?: number; len?: number; w?: number; h?: number }

interface Tele {
  ab: BossAbility;
  shapes: Shape[];
  t: number;
  dur: number;
}

interface Controlled {
  e: Ent;
  def: BossDef;
  timers: number[];
  phase: number;
  tele: Tele | null;
  holdX: number;
  isMini: boolean;
  enter: number;
}

const MINI_ABILITY: BossAbility = { id: 'slam', name: 'Golpe Sísmico', shape: 'circle', target: 'cluster', telegraph: 1.6, cd: 8, dmg: 5, radius: 70, minPhase: 0, color: 0xff4a2a, fx: 'slam' };

export class BossCtl {
  w: World;
  list: Controlled[] = [];
  gfx: Phaser.GameObjects.Graphics;
  domeGfx: Phaser.GameObjects.Graphics;
  onPhase: (name: string, phase: number) => void = () => {};
  onTelegraph: (ab: BossAbility) => void = () => {};

  constructor(w: World) {
    this.w = w;
    this.gfx = w.scene.add.graphics().setDepth(4);
    this.domeGfx = w.scene.add.graphics().setDepth(4800);
  }

  get main(): Controlled | null { return this.list.find((c) => !c.isMini && c.e.alive) || this.list.find((c) => c.e.alive) || null; }

  spawnBoss(id: string) {
    const def = BOSSES[id];
    const w = this.w;
    const wave = w.wave;
    const inf = G.run?.modifier ? 1.25 : 1;
    const hp = 45 * def.hp * enemyHpScale(wave) * inf;
    const dmg = 5 * def.dmg * enemyDmgScale(wave);
    const e = w.spawnBossEnt(id, `b_${id}`, def.scale, hp, dmg, def.armor + wave, def.speed, def.range, def.atkCd, def.radius, !!def.flying);
    e.y = (w.fieldTop + w.fieldBot) / 2 + 10;
    this.list.push({ e, def, timers: def.abilities.map((a, i) => (a.wipe ? 16 : 4 + i * 2.5)), phase: 0, tele: null, holdX: def.holdX, isMini: false, enter: 0 });
    if (!G.run?.demo && !G.meta.seenBosses.includes(id)) G.meta.seenBosses.push(id);
    w.fx.shake(6, 0.8);
    audio.play('roar');
    return e;
  }

  spawnMini(id: EnemyId) {
    const w = this.w;
    const early = w.wave <= 10 ? 0.55 : w.wave <= 20 ? 0.8 : 1;
    const e = w.spawnEnemy(id, w.W + 40, (w.fieldTop + w.fieldBot) / 2, { hpMul: 12 * early, dmgMul: 1.3 * early, miniboss: true });
    const def: BossDef = {
      id: 'mini_' + id, name: ENEMIES[id].name + ' Ancestral', title: 'Miniboss', hp: 22, dmg: 3, armor: 0, speed: ENEMIES[id].speed, range: 30, atkCd: 1.5, radius: e.r, scale: 3.4, holdX: 0, desc: '',
      abilities: [MINI_ABILITY],
    };
    this.list.push({ e, def, timers: [4], phase: 0, tele: null, holdX: 0, isMini: true, enter: 0 });
    audio.play('roar', 0.6);
    return e;
  }

  update(dt: number) {
    const w = this.w;
    this.gfx.clear();
    this.domeGfx.clear();
    w.domes = [];
    for (const c of this.list) {
      const e = c.e;
      if (!e.alive) { c.tele = null; continue; }
      if (!c.isMini) this.moveBoss(c, dt);
      // phases
      const p = e.hp / e.maxHp;
      const np = p < 0.33 ? 2 : p < 0.66 ? 1 : 0;
      if (np > c.phase && !c.isMini) {
        c.phase = np;
        this.onPhase(c.def.name, np);
        w.fx.shake(7, 0.6);
        w.fx.flash(0xff2a2a, 0.35, 0.5);
        audio.play('roar');
        e.speed *= 1.15;
        e.atkCd *= 0.85;
      }
      // abilities
      if (c.tele) {
        c.tele.t += dt;
        e.atkAnim = 0.3;
        e.behavior = 'casting';
        this.drawTele(c.tele);
        if (c.tele.ab.wipe) this.showDomes();
        if (c.tele.t >= c.tele.dur) { this.execute(c, c.tele); c.tele = null; e.behavior = 'boss'; e.atkAnim = 0.18; }
        continue;
      }
      if (e.frozen > 0) continue;
      for (let i = 0; i < c.def.abilities.length; i++) {
        const ab = c.def.abilities[i];
        if (ab.minPhase > c.phase) continue;
        c.timers[i] -= dt;
        if (c.timers[i] <= 0 && (c.isMini || e.x < w.W - 60)) {
          const cdMul = c.phase === 2 ? 0.7 : c.phase === 1 ? 0.85 : 1;
          c.timers[i] = ab.cd * cdMul * rand(0.9, 1.1);
          const tele = this.makeTele(c, ab);
          if (tele) { c.tele = tele; this.onTelegraph(ab); audio.play('warn', ab.wipe ? 1 : 0.5); break; }
        }
      }
    }
    this.list = this.list.filter((c) => c.e.alive);
  }

  private moveBoss(c: Controlled, dt: number) {
    const w = this.w;
    const e = c.e;
    e.atkT -= dt; e.atkAnim -= dt; e.hurt -= dt;
    if (e.frozen > 0) { e.frozen -= dt * 3; return; }
    if (c.tele) return;
    const holdX = w.fortX + (w.W - w.fortX) * Math.min(c.holdX, 0.5); // bosses cross the midline to fight
    // attack nearby allies
    const t = w.allyGrid.nearest(e.x, e.y, e.range + 40);
    if (t) {
      e.facing = t.x >= e.x ? 1 : -1;
      if (e.atkT <= 0) {
        e.atkT = e.atkCd;
        e.atkAnim = 0.35;
        w.aoe(e, t.x, t.y, 50, e.dmg, 0, undefined, false);
        w.fx.ring(t.x, t.y, 0xff5a3a, 50, 0.3);
        w.fx.shake(2.5, 0.12);
        audio.play('hit2', 0.9);
      }
      if (Math.hypot(t.x - e.x, t.y - e.y) > e.range) w.moveToward(e, t.x + e.range * 0.8, t.y, e.speed, dt);
      return;
    }
    if (e.x > holdX) { w.moveToward(e, holdX, (w.fieldTop + w.fieldBot) / 2 + 10, e.speed * (e.x > w.W - 40 ? 2.5 : 1), dt); e.facing = -1; }
    else {
      // bosses hunt the army; they only march on the wall when the whole army is gone
      const prey = w.allyGrid.nearest(e.x, e.y, 3000);
      if (prey) { w.moveToward(e, prey.x + e.range * 0.8, prey.y, e.speed * 0.8, dt); e.facing = prey.x >= e.x ? 1 : -1; return; }
      if (e.x > w.fortX + 120) w.moveToward(e, w.fortX + 60, w.gateY, e.speed * 0.6, dt);
      if (e.x < w.fortX + 90 && e.atkT <= 0) {
        e.atkT = e.atkCd; e.atkAnim = 0.35;
        w.fortDamage(e.siege, e.x - 40, e.y, c.def.name, 0.08);
        w.fx.shake(4, 0.2);
      }
    }
  }

  private makeTele(c: Controlled, ab: BossAbility): Tele | null {
    const w = this.w;
    const e = c.e;
    const shapes: Shape[] = [];
    const R = (ab.radius || 60) * 1;
    const armyCenter = w.densestAlly();
    switch (ab.target) {
      case 'self':
        shapes.push({ kind: 'circle', x: e.x, y: e.y, r: R });
        break;
      case 'fortress':
        shapes.push({ kind: 'circle', x: w.fortX + 10, y: clamp(w.gateY + rand(-120, 120), w.fieldTop + 30, w.fieldBot - 30), r: R });
        break;
      case 'cluster': {
        if (!armyCenter && ab.shape !== 'circle') return null;
        const n = ab.shape === 'multi' ? ab.count || 3 : 1;
        if (ab.shape === 'rect') {
          const tgt = armyCenter || { x: w.fortX + 100, y: w.gateY };
          const ang = Math.atan2(tgt.y - e.y, tgt.x - e.x);
          shapes.push({ kind: 'rect', x: e.x, y: e.y, ang, len: ab.length || 600, w: ab.width || 60 });
        } else {
          const used: { x: number; y: number }[] = [];
          for (let i = 0; i < n; i++) {
            const a = this.pickAllyCluster(used) || armyCenter || { x: w.fortX + 150, y: w.gateY };
            used.push(a);
            shapes.push({ kind: 'circle', x: a.x + rand(-10, 10), y: a.y + rand(-10, 10), r: R });
          }
        }
        break;
      }
      case 'random': {
        const n = ab.count || 4;
        for (let i = 0; i < n; i++) {
          const a = w.allies.length ? w.allies[Math.floor(Math.random() * w.allies.length)] : null;
          shapes.push({ kind: 'circle', x: a ? a.x + rand(-20, 20) : rand(w.fortX + 60, e.x - 80), y: a ? a.y + rand(-15, 15) : rand(w.fieldTop + 30, w.fieldBot - 30), r: R });
        }
        break;
      }
      case 'army': {
        if (ab.shape === 'field') {
          shapes.push({ kind: 'field', x: w.fortX + 20, y: w.fieldTop - 10, w: Math.max(100, e.x - 70 - w.fortX), h: w.fieldBot - w.fieldTop + 30 });
        } else if (ab.shape === 'wave') {
          shapes.push({ kind: 'wave', x: w.fortX + 20, y: w.fieldTop - 10, w: e.x - 40 - w.fortX, h: w.fieldBot - w.fieldTop + 30 });
        } else if (ab.shape === 'cone') {
          const tgt = armyCenter || { x: w.fortX + 100, y: w.gateY };
          const ang = Math.atan2(tgt.y - (e.y - 20), tgt.x - e.x);
          shapes.push({ kind: 'cone', x: e.x - 30, y: e.y - 10, ang, spread: ab.spread || 0.6, len: ab.length || 800 });
        } else if (ab.shape === 'multi') {
          const used: { x: number; y: number }[] = [];
          for (let i = 0; i < (ab.count || 5); i++) {
            const a = this.pickAllyCluster(used) || { x: rand(w.fortX + 80, e.x - 100), y: rand(w.fieldTop + 30, w.fieldBot - 30) };
            used.push(a);
            shapes.push({ kind: 'circle', x: a.x, y: a.y, r: R });
          }
        }
        break;
      }
    }
    if (!shapes.length) return null;
    return { ab, shapes, t: 0, dur: ab.telegraph };
  }

  private pickAllyCluster(avoid: { x: number; y: number }[]): { x: number; y: number } | null {
    const w = this.w;
    let best: Ent | null = null, bc = -1;
    const step = Math.max(1, Math.floor(w.allies.length / 30));
    for (let i = 0; i < w.allies.length; i += step) {
      const a = w.allies[i];
      if (!a.alive) continue;
      if (avoid.some((p) => Math.hypot(p.x - a.x, p.y - a.y) < 90)) continue;
      const c = w.allyGrid.count(a.x, a.y, 70);
      if (c > bc) { bc = c; best = a; }
    }
    return best ? { x: best.x, y: best.y } : null;
  }

  private inShape(s: Shape, x: number, y: number): boolean {
    switch (s.kind) {
      case 'circle': return (x - s.x) ** 2 + ((y - s.y) * 1.25) ** 2 <= s.r! * s.r!;
      case 'field':
      case 'wave': return x >= s.x && x <= s.x + s.w! && y >= s.y && y <= s.y + s.h!;
      case 'rect': {
        const dx = x - s.x, dy = y - s.y;
        const c = Math.cos(s.ang!), sn = Math.sin(s.ang!);
        const along = dx * c + dy * sn, across = -dx * sn + dy * c;
        return along >= 0 && along <= s.len! && Math.abs(across) <= s.w! / 2;
      }
      case 'cone': {
        const dx = x - s.x, dy = y - s.y;
        const d = Math.hypot(dx, dy);
        if (d > s.len!) return false;
        let a = Math.atan2(dy, dx) - s.ang!;
        while (a > Math.PI) a -= Math.PI * 2;
        while (a < -Math.PI) a += Math.PI * 2;
        return Math.abs(a) <= s.spread!;
      }
    }
  }

  private drawTele(t: Tele) {
    const g = this.gfx;
    const k = t.t / t.dur;
    const col = t.ab.color;
    const pulse = 0.5 + Math.sin(this.w.time * 14) * 0.5;
    for (const s of t.shapes) {
      g.fillStyle(col, 0.12 + 0.06 * pulse);
      g.lineStyle(2, col, 0.6 + 0.4 * pulse);
      switch (s.kind) {
        case 'circle': {
          g.fillEllipse(s.x, s.y, s.r! * 2, s.r! * 1.6);
          g.strokeEllipse(s.x, s.y, s.r! * 2, s.r! * 1.6);
          g.fillStyle(col, 0.28);
          g.fillEllipse(s.x, s.y, s.r! * 2 * k, s.r! * 1.6 * k);
          break;
        }
        case 'field':
        case 'wave': {
          g.fillRect(s.x, s.y, s.w!, s.h!);
          g.strokeRect(s.x, s.y, s.w!, s.h!);
          g.fillStyle(col, 0.26);
          if (s.kind === 'wave') g.fillRect(s.x + s.w! * (1 - k), s.y, s.w! * k, s.h!);
          else g.fillRect(s.x, s.y + s.h! * (1 - k) / 2, s.w!, s.h! * k);
          // warning stripes
          g.lineStyle(1, col, 0.35);
          for (let x = s.x; x < s.x + s.w!; x += 40) g.lineBetween(x, s.y, x + 30, s.y + s.h!);
          break;
        }
        case 'rect': {
          const c = Math.cos(s.ang!), sn = Math.sin(s.ang!);
          const hw = s.w! / 2;
          const pts = [
            { x: s.x - sn * hw, y: s.y + c * hw }, { x: s.x + sn * hw, y: s.y - c * hw },
            { x: s.x + c * s.len! + sn * hw, y: s.y + sn * s.len! - c * hw }, { x: s.x + c * s.len! - sn * hw, y: s.y + sn * s.len! + c * hw },
          ];
          g.fillPoints(pts, true); g.strokePoints(pts, true);
          const L = s.len! * k;
          const pts2 = [pts[0], pts[1], { x: s.x + c * L + sn * hw, y: s.y + sn * L - c * hw }, { x: s.x + c * L - sn * hw, y: s.y + sn * L + c * hw }];
          g.fillStyle(col, 0.26); g.fillPoints(pts2, true);
          break;
        }
        case 'cone': {
          const pts = [{ x: s.x, y: s.y }];
          for (let i = 0; i <= 16; i++) { const a = s.ang! - s.spread! + (2 * s.spread! * i) / 16; pts.push({ x: s.x + Math.cos(a) * s.len!, y: s.y + Math.sin(a) * s.len! }); }
          g.fillPoints(pts, true); g.strokePoints(pts, true);
          const pts2 = [{ x: s.x, y: s.y }];
          for (let i = 0; i <= 16; i++) { const a = s.ang! - s.spread! + (2 * s.spread! * i) / 16; pts2.push({ x: s.x + Math.cos(a) * s.len! * k, y: s.y + Math.sin(a) * s.len! * k }); }
          g.fillStyle(col, 0.26); g.fillPoints(pts2, true);
          break;
        }
      }
    }
    // build-up particles at the boss
    if (Math.random() < 0.5) {
      const c = this.list.find((q) => q.tele === t);
      if (c) this.w.fx.particle({ tex: 'spark', x: c.e.x + rand(-40, 40), y: c.e.y - rand(20, 120), vz: 0, vy: -20, life: 0.5, s0: 2, s1: 0, color: col, add: true });
    }
  }

  private showDomes() {
    const w = this.w;
    for (const a of w.allies) {
      if (a.alive && a.kind === 'ally' && a.cls === 'guardian' && a.tier >= 3) {
        w.domes.push({ x: a.x, y: a.y, r: 100 });
        this.domeGfx.fillStyle(0x8ad0ff, 0.12);
        this.domeGfx.lineStyle(2, 0xbfefff, 0.7);
        this.domeGfx.fillEllipse(a.x, a.y - 20, 200, 150);
        this.domeGfx.strokeEllipse(a.x, a.y - 20, 200, 150);
      }
    }
  }

  private execute(c: Controlled, t: Tele) {
    const w = this.w;
    const ab = t.ab;
    const e = c.e;
    const dmg = ab.dmg * 3 * enemyDmgScale(w.wave) * (c.isMini ? 0.9 : ab.wipe ? 2.6 : 1.4);
    // damage allies inside the shapes
    if (dmg > 0) {
      let hits = 0;
      for (const a of w.allies) {
        if (!a.alive) continue;
        if (!t.shapes.some((s) => this.inShape(s, a.x, a.y))) continue;
        let d = dmg;
        if (ab.wipe && w.domes.some((dm) => Math.hypot(dm.x - a.x, dm.y - a.y) < dm.r)) d *= 0.4;
        w.damage(e, a, d, { ability: true, silent: hits > 12 });
        hits++;
      }
    }
    if (ab.fortress) w.fortDamage(e.siege * ab.fortress / 10, w.fortX, w.gateY, `${c.def.name}: ${ab.name}`, 0.18);
    if (ab.summon) {
      for (let i = 0; i < ab.summon.count; i++) {
        if (w.enemies.length >= w.enemyCap() + 10) break;
        w.spawnEnemy(ab.summon.id, e.x - 40 + rand(-40, 20), e.y + rand(-70, 70));
      }
    }
    if (ab.healPct) {
      w.enemyGrid.query(e.x, e.y, ab.radius || 200, (o) => { o.hp = Math.min(o.maxHp, o.hp + o.maxHp * ab.healPct!); });
      w.fx.text(e.x, e.y - 140, '+' + Math.round(ab.healPct * 100) + '%', '#7aff9a', true, true);
    }
    // visuals
    const col = ab.color;
    for (const s of t.shapes) {
      if (s.kind === 'circle') {
        w.fx.ring(s.x, s.y, col, s.r!, 0.5);
        w.fx.glow(s.x, s.y - 10, col, s.r! / 30, 0.4);
        w.fx.burst(s.x, s.y, col, 14, s.r! * 2, { add: true, life: 0.6 });
        if (ab.fx === 'meteor' || ab.fx === 'fire') w.fx.burst(s.x, s.y, 0xffd23a, 8, 120, { add: true });
      } else if (s.kind === 'field' || s.kind === 'wave') {
        const n = G.settings.quality === 'low' ? 14 : 34;
        for (let i = 0; i < n; i++) {
          const x = s.x + Math.random() * s.w!, y = s.y + Math.random() * s.h!;
          if (ab.fx === 'roots') {
            w.fx.particle({ tex: 'px', x, y, z: 0, vz: 260, g: 600, life: 0.6, s0: 3, s1: 1, color: 0x5a3a24 });
            w.fx.burst(x, y, 0xff3a2a, 2, 60, { add: true });
          } else w.fx.glow(x, y, col, 1.6, 0.6);
        }
        w.fx.flash(col, 0.4, 0.5);
      } else if (s.kind === 'cone' || s.kind === 'rect') {
        for (let i = 0; i < 30; i++) {
          const along = Math.random() * (s.len! * (s.kind === 'cone' ? 1 : 1));
          const sp = s.kind === 'cone' ? (Math.random() * 2 - 1) * s.spread! : 0;
          const a = s.ang! + sp;
          const off = s.kind === 'rect' ? (Math.random() - 0.5) * s.w! : 0;
          const x = s.x + Math.cos(a) * along - Math.sin(s.ang!) * off, y = s.y + Math.sin(a) * along + Math.cos(s.ang!) * off;
          w.fx.glow(x, y, col, 1.4, 0.5);
        }
        w.fx.flash(col, 0.3, 0.4);
      }
    }
    w.fx.shake(ab.wipe ? 12 : 5, ab.wipe ? 0.7 : 0.25);
    audio.play('boom', ab.wipe ? 1 : 0.7);
  }

  clear() { this.list = []; this.gfx.clear(); this.domeGfx.clear(); }

  /** true while a wipe ability is being telegraphed (used by auto-cast of Bênção). */
  wipeIncoming(): boolean { return this.list.some((c) => c.tele && c.tele.ab.wipe && c.tele.t > c.tele.dur * 0.35); }
}
