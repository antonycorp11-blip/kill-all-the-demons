// Hero controller: the player's "bosses". Autonomous AI, auto-attacks, golden telegraphed abilities, respawn.
import Phaser from 'phaser';
import type { Ent } from './types';
import type { World } from './world';
import { HEROES, heroStarMult, type HeroAbility, type HeroDef } from '../data/heroes';
import { G } from '../core/state';
import { getMods } from '../core/mods';
import { rand, clamp } from '../core/util';
import { audio } from '../audio/audio';
import type { ClassId } from '../data/units';

interface Shape { kind: 'circle' | 'rect' | 'cone' | 'field'; x: number; y: number; r?: number; ang?: number; len?: number; w?: number; spread?: number }
interface Tele { ab: HeroAbility; shapes: Shape[]; t: number; dur: number }

export interface HeroRt {
  id: string;
  def: HeroDef;
  e: Ent | null;
  timers: number[];
  tele: Tele | null;
  respawn: number;
  buffT: number;
  slot: number;
}

export const HERO_SCALE = 1.4; // a bit taller than troops (1.8 on 32px frames), not a giant

export class HeroCtl {
  w: World;
  list: HeroRt[] = [];
  gfx: Phaser.GameObjects.Graphics;
  bars: Phaser.GameObjects.Graphics;
  onAbility: (rt: HeroRt, ab: HeroAbility) => void = () => {};

  constructor(w: World) {
    this.w = w;
    this.gfx = w.scene.add.graphics().setDepth(4.5);
    this.bars = w.scene.add.graphics().setDepth(9400);
  }

  stars(id: string) { return G.run?.heroes[id] || 0; }

  /** Make the runtime list match the heroes owned in the run. */
  sync() {
    const run = G.run;
    if (!run) return;
    const ids = Object.keys(run.heroes).filter((id) => run.heroes[id] > 0 && HEROES[id]);
    ids.forEach((id, i) => {
      let rt = this.list.find((r) => r.id === id);
      if (!rt) {
        rt = { id, def: HEROES[id], e: null, timers: HEROES[id].abilities.map((_, k) => 3 + k * 2), tele: null, respawn: 0, buffT: 0, slot: i };
        this.list.push(rt);
      }
      rt.slot = i;
    });
    this.list = this.list.filter((r) => ids.includes(r.id));
    for (const rt of this.list) {
      if (rt.e && rt.e.alive) this.applyStats(rt);
      else if (rt.respawn <= 0) this.spawn(rt, true);
    }
  }

  stats(rt: HeroRt) {
    const m = getMods();
    const run = G.run!;
    const k = heroStarMult(this.stars(rt.id)) * m.heroPower * (1 + run.armyLevel * 0.03);
    return {
      hp: 50 * rt.def.hp * m.hp * k,
      dmg: 7 * rt.def.dmg * m.dmg * k,
      armor: rt.def.armor + m.armor,
      atkCd: rt.def.atkCd / m.atkSpd,
    };
  }

  applyStats(rt: HeroRt) {
    const e = rt.e;
    if (!e) return;
    const s = this.stats(rt);
    const ratio = e.maxHp > 0 ? e.hp / e.maxHp : 1;
    e.maxHp = s.hp; e.hp = Math.max(1, s.hp * ratio); e.dmg = s.dmg; e.armor = s.armor; e.atkCd = s.atkCd;
    e.tier = this.stars(rt.id);
  }

  spawn(rt: HeroRt, fresh = false) {
    const w = this.w;
    const s = this.stats(rt);
    const y = w.gateY + (rt.slot % 2 ? 1 : -1) * (30 + rt.slot * 22);
    rt.e = w.spawnHeroEnt(rt.id, `h_${rt.id}`, HERO_SCALE, w.fortX + 30, clamp(y, w.fieldTop + 20, w.fieldBot - 20), s.hp, s.dmg, s.armor, rt.def.speed, rt.def.range, s.atkCd, rt.def.radius, rt.def.aura);
    rt.e.tier = this.stars(rt.id);
    rt.tele = null;
    if (!fresh) w.hooks.toast(`${rt.def.name} voltou à batalha!`);
    w.fx.ring(rt.e.x, rt.e.y, rt.def.aura, 60, 0.6);
    w.fx.glow(rt.e.x, rt.e.y - 30, rt.def.aura, 2.2, 0.6);
  }

  onDeath(e: Ent) {
    const rt = this.list.find((r) => r.e === e);
    if (!rt) return;
    rt.respawn = getMods().heroRespawn;
    rt.tele = null;
    this.w.hooks.toast(`${rt.def.name} caiu! Retorna em ${Math.round(rt.respawn)}s`);
  }

  homeFor(rt: HeroRt) {
    const w = this.w;
    const run = G.run!;
    const lineX = Math.min(w.frontX - 30, run.stance === 'def' ? w.fortX + 150 : run.stance === 'off' ? w.frontX - 30 : w.fortX + (w.frontX - w.fortX) * 0.6);
    const x = rt.def.ranged ? lineX - 70 : lineX + 40;
    const mid = (w.fieldTop + w.fieldBot) / 2;
    const off = (rt.slot % 2 ? 1 : -1) * (40 + Math.floor(rt.slot / 2) * 70);
    return { x, y: clamp(mid + off, w.fieldTop + 20, w.fieldBot - 20) };
  }

  update(dt: number) {
    this.gfx.clear();
    for (const rt of this.list) {
      const e = rt.e;
      if (!e || !e.alive) {
        if (rt.respawn > 0) { rt.respawn -= dt; if (rt.respawn <= 0) this.spawn(rt); }
        continue;
      }
      this.think(rt, e, dt);
    }
    this.drawBars();
  }

  /** Health bar (and shield) floating over each hero's head so they can be watched in the crowd. */
  drawBars() {
    const g = this.bars;
    g.clear();
    for (const rt of this.list) {
      const e = rt.e;
      if (!e || !e.alive) continue;
      const w = 38, h = 5;
      const x = e.x - w / 2, y = e.y - e.z - 74;
      const p = Math.max(0, e.hp / e.maxHp);
      g.fillStyle(0x0c0614, 0.85).fillRect(x - 1, y - 1, w + 2, h + 2);
      g.fillStyle(p > 0.5 ? 0x5aff8a : p > 0.25 ? 0xffd24a : 0xff4a3a, 1).fillRect(x, y, w * p, h);
      if (e.shield > 0) g.fillStyle(0xfff2b0, 0.9).fillRect(x, y - 3, w * Math.min(1, e.shield / e.maxHp), 2);
      g.fillStyle(rt.def.aura, 1).fillRect(x - 4, y - 1, 3, h + 2);
    }
  }

  private think(rt: HeroRt, e: Ent, dt: number) {
    const w = this.w;
    e.atkT -= dt; e.atkAnim -= dt; e.hurt -= dt;
    if (e.shieldT > 0) { e.shieldT -= dt; if (e.shieldT <= 0) e.shield = 0; }
    if (rt.buffT > 0) rt.buffT -= dt;
    if (e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * (0.01 + getMods().regen) * dt);
    if (e.stun > 0) { e.stun -= dt; return; }

    // abilities
    if (rt.tele) {
      rt.tele.t += dt;
      e.behavior = 'casting';
      e.atkAnim = 0.3;
      this.drawTele(rt.tele);
      if (rt.tele.t >= rt.tele.dur) { this.execute(rt, e, rt.tele); rt.tele = null; e.behavior = 'hero'; e.atkAnim = 0.18; }
      return;
    }
    const stars = this.stars(rt.id);
    const cdMul = getMods().skillCd;
    for (let i = 0; i < rt.def.abilities.length; i++) {
      const ab = rt.def.abilities[i];
      if (ab.star > stars) continue;
      rt.timers[i] -= dt;
      if (rt.timers[i] > 0) continue;
      const tele = this.makeTele(rt, e, ab);
      if (tele) {
        rt.timers[i] = ab.cd * cdMul * rand(0.9, 1.1);
        rt.tele = tele;
        this.onAbility(rt, ab);
        break;
      } else rt.timers[i] = 0.8;
    }

    // targeting
    e.retarget -= dt;
    if (e.retarget <= 0 || !e.target || !e.target.alive) {
      e.retarget = 0.25;
      let t: Ent | null = null;
      if (!rt.def.ranged && w.wallAttackers > 0) {
        let bd = Infinity;
        w.enemyGrid.query(w.fortX + 40, e.y, 600, (o, d2) => { if (o.atWall && d2 < bd) { bd = d2; t = o; } });
      }
      const lim = w.frontX + (rt.def.ranged ? rt.def.range : 60);
      if (!t && w.bossRef && w.bossRef.alive && w.bossRef.x < lim + 80 && Math.hypot(w.bossRef.x - e.x, w.bossRef.y - e.y) < 520) t = w.bossRef;
      if (!t) t = w.enemyGrid.nearest(e.x, e.y, rt.def.ranged ? rt.def.range + 120 : 480, (o) => o.x < lim);
      if (!t && w.enemies.length <= 8) t = w.enemyGrid.nearest(e.x, e.y, 3000, (o) => o.x < lim + 120);
      e.target = t;
    }
    const t = e.target;
    if (t && t.alive) {
      const dx = t.x - e.x, dy = t.y - e.y;
      const d = Math.hypot(dx, dy);
      e.facing = dx >= 0 ? 1 : -1;
      const reach = rt.def.range + t.r + 4;
      if (d > reach) { w.moveToward(e, t.x - (dx / d) * reach * 0.9, t.y - (dy / d) * reach * 0.9, e.speed, dt); return; }
      e.vx = e.vy = 0;
      if (e.atkT <= 0) {
        const fury = rt.buffT > 0 ? 2 : 1;
        e.atkT = e.atkCd / fury;
        e.atkAnim = 0.3;
        this.autoAttack(rt, e, t, fury);
      }
    } else {
      const h = this.homeFor(rt);
      if (Math.hypot(h.x - e.x, h.y - e.y) > 6) w.moveToward(e, h.x, h.y, e.speed * 0.8, dt);
      else { e.vx = e.vy = 0; e.facing = 1; }
    }
  }

  private autoAttack(rt: HeroRt, e: Ent, t: Ent, fury: number) {
    const w = this.w;
    const m = getMods();
    const crit = Math.random() < m.crit;
    const dmg = e.dmg * (crit ? m.critDmg : 1) * (fury > 1 ? 1.5 : 1) * w.dmgBonus(e, t);
    if (!rt.def.ranged) {
      w.fx.slash(e.x + e.facing * 10, e.y - 14, e.facing, rt.def.aura, 1.5);
      w.damage(e, t, dmg, { crit, melee: true });
      if (rt.def.splash) w.aoe(e, t.x, t.y, rt.def.splash, dmg * 0.6, 1, t);
      audio.play('hit2', 0.7);
    } else if (rt.id === 'lyra') {
      const targets = [t];
      w.enemyGrid.query(t.x, t.y, 120, (o) => { if (targets.length < 3 && o !== t) targets.push(o); });
      targets.forEach((tg, i) => w.proj.fire({ tex: 'arrow', x: e.x + 14, y: e.y - 40, target: tg, speed: 640 + i * 40, dmg: i ? dmg * 0.7 : dmg, src: e, team: 0, arc: 30, pierce: 2, scale: 2.4, tint: 0x9affff }));
      audio.play('arrow', 0.6);
    } else if (rt.id === 'seraphiel') {
      w.proj.fire({ tex: 'holy', x: e.x + 14, y: e.y - 50, target: t, speed: 420, dmg, src: e, team: 0, arc: 10, splash: rt.def.splash, scale: 2, add: true });
      // every bolt also mends the most wounded ally nearby
      const a = w.allyGrid.nearest(e.x, e.y, 260, (q) => q.hp < q.maxHp * 0.8);
      if (a) w.healUnit(e, a, a.maxHp * 0.08);
    } else {
      w.proj.fire({ tex: 'orb', x: e.x + 14, y: e.y - 50, target: t, speed: 380, dmg, src: e, team: 0, arc: 16, splash: rt.def.splash * m.aoe, tint: rt.def.projTint || 0xc08aff, add: true, scale: 3 });
      audio.play('magic', 0.6);
    }
  }

  private makeTele(rt: HeroRt, e: Ent, ab: HeroAbility): Tele | null {
    const w = this.w;
    const shapes: Shape[] = [];
    let enemiesNear = 0;
    w.enemyGrid.query(e.x, e.y, 700, (o) => { if (o.x < w.frontX + 260) enemiesNear++; });
    const needsEnemies = ab.dmg > 0 || ab.effect === 'stun';
    if (needsEnemies && enemiesNear === 0 && !(ab.shape === 'field' && w.enemies.length > 0)) return null;
    switch (ab.shape) {
      case 'circle': {
        const c = w.densestEnemy(e.x, e.y, 700, w.frontX + 260);
        if (!c) return null;
        shapes.push({ kind: 'circle', x: c.x, y: c.y, r: ab.radius || 80 });
        break;
      }
      case 'multi': {
        const n = ab.count || 4;
        const pool = w.enemies.filter((q) => q.x < w.frontX + 260 && Math.hypot(q.x - e.x, q.y - e.y) < 900);
        if (!pool.length) return null;
        for (let i = 0; i < n; i++) { const q = pool[Math.floor(Math.random() * pool.length)]; shapes.push({ kind: 'circle', x: q.x + rand(-12, 12), y: q.y + rand(-10, 10), r: ab.radius || 50 }); }
        break;
      }
      case 'rect':
      case 'cone': {
        const c = w.densestEnemy(e.x, e.y, ab.shape === 'cone' ? (ab.length || 380) + 50 : 900, w.frontX + 260);
        if (!c) return null;
        const ang = Math.atan2(c.y - e.y, c.x - e.x);
        shapes.push(ab.shape === 'rect' ? { kind: 'rect', x: e.x, y: e.y, ang, len: ab.length || 500, w: ab.width || 60 } : { kind: 'cone', x: e.x, y: e.y - 10, ang, len: ab.length || 380, spread: ab.spread || 0.6 });
        break;
      }
      case 'field':
        shapes.push({ kind: 'field', x: w.fortX + 30, y: w.fieldTop - 10, w: w.W - w.fortX - 30, r: w.fieldBot - w.fieldTop + 20 });
        break;
      case 'self': {
        if (ab.effect === 'heal') {
          let hurt = 0;
          w.allyGrid.query(e.x, e.y, ab.radius || 200, (a) => { if (a.hp < a.maxHp * 0.7) hurt++; });
          if (hurt < 3) return null;
        }
        if (ab.effect === 'revive' && w.fallen.length < 3) return null;
        if (ab.effect === 'shield' && w.enemyCount() < 5) return null;
        if (ab.effect === 'invuln' && !(w.bossRef || w.enemyCount() > 30)) return null;
        if (ab.effect === 'buff' && !e.target) return null;
        shapes.push({ kind: 'circle', x: e.x, y: e.y, r: ab.radius || 100 });
        break;
      }
      case 'chain':
        if (!enemiesNear) return null;
        shapes.push({ kind: 'circle', x: e.x, y: e.y, r: 30 });
        break;
    }
    return { ab, shapes, t: 0, dur: ab.telegraph };
  }

  private drawTele(t: Tele) {
    const g = this.gfx;
    const k = t.t / t.dur;
    const col = t.ab.color;
    const friendly = t.ab.dmg === 0;
    for (const s of t.shapes) {
      g.lineStyle(2, col, 0.85);
      g.fillStyle(col, friendly ? 0.08 : 0.1);
      if (s.kind === 'circle') {
        g.fillEllipse(s.x, s.y, s.r! * 2, s.r! * 1.6); g.strokeEllipse(s.x, s.y, s.r! * 2, s.r! * 1.6);
        g.fillStyle(col, 0.22); g.fillEllipse(s.x, s.y, s.r! * 2 * k, s.r! * 1.6 * k);
      } else if (s.kind === 'field') {
        g.fillRect(s.x, s.y, s.w!, s.r!); g.strokeRect(s.x, s.y, s.w!, s.r!);
        g.fillStyle(col, 0.18); g.fillRect(s.x, s.y, s.w! * k, s.r!);
      } else if (s.kind === 'rect') {
        const c = Math.cos(s.ang!), sn = Math.sin(s.ang!), hw = s.w! / 2;
        const L = s.len!;
        const pts = (len: number) => [{ x: s.x - sn * hw, y: s.y + c * hw }, { x: s.x + sn * hw, y: s.y - c * hw }, { x: s.x + c * len + sn * hw, y: s.y + sn * len - c * hw }, { x: s.x + c * len - sn * hw, y: s.y + sn * len + c * hw }];
        g.fillPoints(pts(L), true); g.strokePoints(pts(L), true);
        g.fillStyle(col, 0.22); g.fillPoints(pts(L * k), true);
      } else if (s.kind === 'cone') {
        const mk = (len: number) => { const p = [{ x: s.x, y: s.y }]; for (let i = 0; i <= 12; i++) { const a = s.ang! - s.spread! + (2 * s.spread! * i) / 12; p.push({ x: s.x + Math.cos(a) * len, y: s.y + Math.sin(a) * len }); } return p; };
        g.fillPoints(mk(s.len!), true); g.strokePoints(mk(s.len!), true);
        g.fillStyle(col, 0.22); g.fillPoints(mk(s.len! * k), true);
      }
    }
  }

  private inShape(s: Shape, x: number, y: number) {
    switch (s.kind) {
      case 'circle': return (x - s.x) ** 2 + ((y - s.y) * 1.25) ** 2 <= s.r! * s.r!;
      case 'field': return x >= s.x && x <= s.x + s.w! && y >= s.y && y <= s.y + s.r!;
      case 'rect': {
        const dx = x - s.x, dy = y - s.y, c = Math.cos(s.ang!), sn = Math.sin(s.ang!);
        const along = dx * c + dy * sn, across = -dx * sn + dy * c;
        return along >= 0 && along <= s.len! && Math.abs(across) <= s.w! / 2;
      }
      case 'cone': {
        const dx = x - s.x, dy = y - s.y;
        if (Math.hypot(dx, dy) > s.len!) return false;
        let a = Math.atan2(dy, dx) - s.ang!;
        while (a > Math.PI) a -= Math.PI * 2;
        while (a < -Math.PI) a += Math.PI * 2;
        return Math.abs(a) <= s.spread!;
      }
    }
  }

  private execute(rt: HeroRt, e: Ent, t: Tele) {
    const w = this.w;
    const ab = t.ab;
    const col = ab.color;
    const dmg = e.dmg * ab.dmg;
    // movement abilities
    if (ab.id === 'leap' || ab.id === 'skyfall') { const s = t.shapes[0]; w.fx.beam([e.x, e.y - 30, s.x, s.y - 30], col, 4, 0.2); e.x = s.x - 20; e.y = s.y; }
    if (ab.id === 'charge') {
      const s = t.shapes[0];
      const nx = clamp(e.x + Math.cos(s.ang!) * s.len! * 0.9, w.fortX + 20, w.W - 40), ny = clamp(e.y + Math.sin(s.ang!) * s.len! * 0.9, w.fieldTop, w.fieldBot);
      w.fx.beam([e.x, e.y - 20, nx, ny - 20], col, 6, 0.3);
      e.x = nx; e.y = ny;
    }
    if (ab.shape === 'chain') {
      let cur: Ent | null = w.enemyGrid.nearest(e.x, e.y, 600);
      const done = new Set<number>();
      let px = e.x + 14, py = e.y - 50;
      for (let i = 0; i < (ab.count || 8) && cur; i++) {
        done.add(cur.id);
        w.fx.lightning(px, py, cur.x, cur.y - 12, col);
        w.damage(e, cur, dmg, { skill: true });
        px = cur.x; py = cur.y - 12;
        let next: Ent | null = null, nd = Infinity;
        w.enemyGrid.query(cur.x, cur.y, 160, (o, d2) => { if (!done.has(o.id) && d2 < nd) { nd = d2; next = o; } });
        cur = next;
      }
      audio.play('lightning');
      return;
    }
    if (dmg > 0) {
      for (const en of w.enemies) {
        if (!en.alive) continue;
        if (!t.shapes.some((s) => this.inShape(s, en.x, en.y))) continue;
        w.damage(e, en, dmg * w.dmgBonus(e, en), { skill: true });
        if (ab.effect === 'stun' && en.alive) en.stun = Math.max(en.stun, (ab.duration || 1) * (en.kind === 'boss' ? 0.3 : 1));
      }
    }
    switch (ab.effect) {
      case 'heal':
        w.allyGrid.query(e.x, e.y, ab.radius || 200, (a) => { w.healUnit(e, a, a.maxHp * (ab.power || 0.3)); w.fx.particle({ tex: 'heal', x: a.x, y: a.y - 20, vz: 40, life: 0.6, s0: 1.6, s1: 0.3, add: true }); });
        break;
      case 'shield':
        w.allyGrid.query(e.x, e.y, ab.radius || 200, (a) => { a.shield = Math.max(a.shield, a.maxHp * (ab.power || 0.3)); a.shieldT = 6; });
        break;
      case 'invuln':
        for (const a of w.allies) if (a.alive) { a.shield = a.maxHp * 6; a.shieldT = ab.duration || 4; }
        w.fx.flash(0xffffff, 0.35, 0.6);
        break;
      case 'revive': {
        const n = Math.min(ab.count || 6, w.fallen.length);
        for (let i = 0; i < n; i++) {
          const f = w.fallen.pop()!;
          const r = w.spawnAlly(f.cls as ClassId, f.level, 0, e.x + rand(-60, 60), e.y + rand(-50, 50));
          if (r) { r.hp = r.maxHp * 0.7; w.fx.glow(r.x, r.y - 12, 0xffffa0, 1.4, 0.7); }
        }
        w.markFormation();
        break;
      }
      case 'buff':
        rt.buffT = ab.duration || 6;
        break;
    }
    // visuals
    for (const s of t.shapes) {
      if (s.kind === 'circle') {
        w.fx.ring(s.x, s.y, col, s.r!, 0.5);
        w.fx.glow(s.x, s.y - 10, col, Math.max(1.2, s.r! / 30), 0.45);
        if (dmg > 0) w.fx.burst(s.x, s.y, col, 16, s.r! * 2, { add: true, tex: 'spark', life: 0.6 });
        if (ab.id === 'meteor' || ab.id === 'cataclysm') { w.fx.burst(s.x, s.y, 0xffd23a, 12, 160, { add: true }); }
      } else if (s.kind === 'field') {
        for (let i = 0; i < 24; i++) w.fx.glow(s.x + Math.random() * s.w!, s.y + Math.random() * s.r!, col, 1.4, 0.6);
        w.fx.flash(col, 0.3, 0.5);
      } else {
        for (let i = 0; i < 18; i++) {
          const along = Math.random() * s.len!;
          const a = s.ang! + (s.kind === 'cone' ? (Math.random() * 2 - 1) * s.spread! : 0);
          w.fx.glow(s.x + Math.cos(a) * along, s.y + Math.sin(a) * along, col, 1.3, 0.45);
        }
      }
    }
    if (dmg > 0) { w.fx.shake(ab.dmg >= 12 ? 7 : 3, 0.25); audio.play('boom', 0.7); }
    else audio.play(ab.effect === 'heal' || ab.effect === 'revive' ? 'bless' : 'promote', 0.6);
  }

  clear() { this.list = []; this.gfx.clear(); this.bars.clear(); }

  /** Remaining cooldown fraction of the first ready-able ability (for HUD). */
  cdFrac(rt: HeroRt): number {
    const stars = this.stars(rt.id);
    let best = 1;
    rt.def.abilities.forEach((ab, i) => { if (ab.star <= stars) best = Math.min(best, Math.max(0, rt.timers[i]) / (ab.cd * getMods().skillCd)); });
    return best;
  }
}
