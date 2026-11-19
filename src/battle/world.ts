// Battle simulation core: entity pool, autonomous AI for both armies, combat resolution, rewards, fortress.
import Phaser from 'phaser';
import { blankEnt, type Ent, type DeadAlly } from './types';
import { Grid } from './grid';
import { Fx } from './fx';
import { Projectiles, type Shot } from './projectiles';
import { CLASSES, type ClassId } from '../data/units';
import { ENEMIES, type EnemyId } from '../data/enemies';
import { G, armyXpNeeded, save } from '../core/state';
import { getMods, enemyHpScale, enemyDmgScale, enemyGoldScale, enemyArmorAdd, siegeScale } from '../core/mods';
import { rand, clamp, pick } from '../core/util';
import { audio } from '../audio/audio';
import { applyStats, giveXp, totalXp, computeFormation, levelMult } from './army';
import { REGIONS } from '../data/regions';

export interface WorldHooks {
  toast(msg: string): void;
  banner(title: string, sub?: string, color?: string): void;
  fortHit(amount: number): void;
  defeat(): void;
  armyLevelUp(): void;
}

const SPR_SCALE = 2;

export class World {
  scene: Phaser.Scene;
  fx: Fx;
  proj: Projectiles;
  hooks: WorldHooks;
  allyGrid = new Grid(48);
  enemyGrid = new Grid(48);
  ents: Ent[] = [];
  allies: Ent[] = [];
  enemies: Ent[] = [];
  sprPool: Phaser.GameObjects.Sprite[] = [];
  shdPool: Phaser.GameObjects.Image[] = [];
  auraPool: Phaser.GameObjects.Image[] = [];
  dying: Ent[] = [];
  nextId = 1;
  W = 1280;
  H = 720;
  fieldTop = 178;
  fieldBot = 612;
  fortX = 106;
  gateY = 395;
  wave = 1;
  region = 0;
  time = 0;
  formationDirty = true;
  formationT = 0;
  auraT = 0;
  fallen: DeadAlly[] = [];
  wallAttackers = 0;
  // live battle stats (per-second windows)
  acc = { dps: 0, tank: 0, heal: 0 };
  live = { dps: 0, tank: 0, heal: 0 };
  statT = 0;
  bossRef: Ent | null = null;
  onPromoteCb: (e: Ent) => void = () => {};
  onKillCb: (e: Ent) => void = () => {};
  onAllyDeathCb: (e: Ent) => void = () => {};
  /** set by the boss controller: domes active during telegraphs */
  domes: { x: number; y: number; r: number }[] = [];

  constructor(scene: Phaser.Scene, hooks: WorldHooks) {
    this.scene = scene;
    this.hooks = hooks;
    this.fx = new Fx(scene);
    this.proj = new Projectiles(scene);
    this.proj.onImpact = (s, t, x, y) => this.onShotImpact(s, t, x, y);
  }

  setSize(W: number) {
    this.W = W;
    this.markFormation();
  }

  entCap() { const q = G.settings.quality; return q === 'high' ? 170 : q === 'med' ? 120 : 80; }
  enemyCap() { const q = G.settings.quality; return q === 'high' ? 170 : q === 'med' ? 120 : 80; }
  allyEntCount() { let n = 0; for (const a of this.allies) if (a.alive && a.kind === 'ally') n++; return n; }
  armyCount() { let n = 0; for (const a of this.allies) if (a.alive && a.kind === 'ally') n += a.stack; return n; }
  summonCount() { let n = 0; for (const a of this.allies) if (a.alive && a.kind === 'summon') n++; return n; }
  enemyCount() { return this.enemies.length; }
  markFormation() { this.formationDirty = true; }
  toast(msg: string) { this.hooks.toast(msg); }

  // ---------------------------------------------------------------- pools
  private acquire(): Ent {
    let e = this.ents.find((q) => !q.alive && q.dead <= 0 && !q.spr);
    if (!e) { e = blankEnt(); this.ents.push(e); }
    Object.assign(e, blankEnt());
    e.id = this.nextId++;
    return e;
  }

  private attachSprite(e: Ent, key: string, scale: number, originY: number) {
    const spr = this.sprPool.pop() || this.scene.add.sprite(0, 0, key, 0);
    spr.setTexture(key, 0).setVisible(true).setAlpha(1).setRotation(0).clearTint().setFlipX(false).setScale(scale).setOrigin(0.5, originY);
    const shd = this.shdPool.pop() || this.scene.add.image(0, 0, 'shadow');
    shd.setVisible(true).setDepth(3).setAlpha(1);
    e.spr = spr; e.shd = shd; e.texKey = key; e.scale = scale; e.originY = originY;
  }

  private releaseSprite(e: Ent) {
    if (e.spr) { e.spr.setVisible(false); this.sprPool.push(e.spr); e.spr = null; }
    if (e.shd) { e.shd.setVisible(false); this.shdPool.push(e.shd); e.shd = null; }
    if (e.aura) { e.aura.setVisible(false); this.auraPool.push(e.aura); e.aura = null; }
    if (e.flag) { e.flag.setVisible(false); this.auraPool.push(e.flag); e.flag = null; }
  }

  private auraImg(tex: string) {
    const a = this.auraPool.pop() || this.scene.add.image(0, 0, tex);
    a.setTexture(tex).setVisible(true).setAlpha(1).setScale(1).clearTint().setBlendMode(Phaser.BlendModes.NORMAL).setRotation(0);
    return a;
  }

  // ---------------------------------------------------------------- spawning
  spawnAlly(cls: ClassId, level: number, vet: number, x: number, y: number): Ent | null {
    const d = CLASSES[cls];
    const e = this.acquire();
    e.alive = true; e.team = 0; e.kind = 'ally'; e.cls = cls; e.behavior = cls; e.role = d.role;
    e.level = level; e.vet = vet; e.stack = 1;
    e.x = x; e.y = y; e.homeX = x + 80; e.homeY = y; e.r = d.radius; e.facing = 1;
    e.atkT = rand(0, 0.5); e.abilT = rand(1, 3);
    this.attachSprite(e, `u_${cls}_0`, SPR_SCALE, cls === 'knight' ? 0.94 : 0.92);
    e.maxHp = 0;
    applyStats(this, e, false);
    e.hp = e.maxHp;
    this.allies.push(e);
    this.fx.burst(x, y, 0x8ad0ff, 6, 40, { tex: 'spark', add: true, life: 0.4 });
    return e;
  }

  spawnSummon(kind: 'spirit' | 'spiritArcher' | 'golem' | 'spectral', x: number, y: number, hp: number, dmg: number, life: number, owner: Ent | null): Ent | null {
    if (this.summonCount() >= 60) return null;
    const e = this.acquire();
    e.alive = true; e.team = 0; e.kind = 'summon'; e.cls = kind; e.role = kind === 'spiritArcher' ? 'ranged' : 'front';
    e.behavior = kind === 'spiritArcher' ? 'archer' : kind === 'golem' ? 'guardian' : 'swordsman';
    e.x = x; e.y = y; e.r = kind === 'golem' ? 12 : 7;
    e.maxHp = e.hp = hp; e.uHp = hp; e.dmg = e.uDmg = dmg; e.armor = kind === 'golem' ? 80 : 20;
    e.range = kind === 'spiritArcher' ? 200 : kind === 'golem' ? 26 : 20; e.atkCd = kind === 'golem' ? 1.4 : 0.9; e.speed = 70;
    e.life = life; e.owner = owner; e.tier = 1;
    e.homeX = x + 60; e.homeY = y;
    this.attachSprite(e, `s_${kind}`, SPR_SCALE, kind === 'golem' ? 0.95 : 0.92);
    this.allies.push(e);
    this.fx.burst(x, y, kind === 'spectral' ? 0xc08aff : 0x5affd0, 10, 60, { tex: 'spark', add: true });
    this.fx.glow(x, y - 10, kind === 'spectral' ? 0xb05aff : 0x5affd0, 0.8, 0.5);
    return e;
  }

  spawnEnemy(id: EnemyId, x: number, y: number, o: { hpMul?: number; dmgMul?: number; miniboss?: boolean; laneY?: number; speedMul?: number } = {}): Ent {
    const d = ENEMIES[id];
    const w = this.wave;
    const mod = G.run?.modifier;
    const e = this.acquire();
    e.alive = true; e.team = 1; e.kind = 'enemy'; e.cls = id; e.behavior = d.behavior; e.role = 'enemy';
    e.x = x; e.y = y; e.r = d.radius; e.facing = -1;
    let hp = d.hp * 0.8 * enemyHpScale(w) * (o.hpMul || 1);
    let dmg = d.dmg * 1.8 * enemyDmgScale(w) * (o.dmgMul || 1);
    if (mod === 'armored') hp *= 1.6;
    if (mod === 'fury') dmg *= 1.4;
    e.maxHp = e.hp = hp; e.dmg = dmg;
    e.armor = d.armor + enemyArmorAdd(w);
    e.range = d.range; e.atkCd = d.atkCd; e.speed = d.speed * rand(0.9, 1.1) * (o.speedMul || 1) * (mod === 'swift' ? 1.3 : 1);
    e.gold = d.gold * 1.6 * enemyGoldScale(w) * (o.miniboss ? 12 : 1);
    e.xpVal = d.xp * 0.7 * (1 + w * 0.08) * (o.miniboss ? 20 : 1);
    e.siege = d.siege * siegeScale(w) * (mod === 'siege' ? 2 : 1) * (o.miniboss ? 2 : 1);
    e.large = !!d.large || !!o.miniboss; e.flying = !!d.flying;
    e.miniboss = !!o.miniboss;
    e.atkT = rand(0, d.atkCd); e.abilT = rand(1, d.atkCd);
    e.laneY = o.laneY ?? (d.flank ? (Math.random() < 0.5 ? this.fieldTop + rand(5, 40) : this.fieldBot - rand(5, 40)) : y);
    const scale = o.miniboss ? 3.4 : SPR_SCALE;
    this.attachSprite(e, `e_${this.region}_${id}`, scale, id === 'flyer' ? 0.85 : 0.9);
    if (o.miniboss) {
      e.r = d.radius * 1.8;
      e.aura = this.auraImg('glow');
      e.aura.setTint(0xff3a3a).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.5);
    }
    this.enemies.push(e);
    if (!G.run?.demo && !G.meta.seenEnemies.includes(id)) G.meta.seenEnemies.push(id);
    return e;
  }

  spawnBossEnt(id: string, key: string, scale: number, hp: number, dmg: number, armor: number, speed: number, range: number, atkCd: number, radius: number, flying: boolean): Ent {
    const e = this.acquire();
    e.alive = true; e.team = 1; e.kind = 'boss'; e.cls = id; e.behavior = 'boss'; e.role = 'boss';
    e.x = this.W + 80; e.y = (this.fieldTop + this.fieldBot) / 2; e.r = radius; e.facing = -1;
    e.maxHp = e.hp = hp; e.dmg = dmg; e.armor = armor; e.speed = speed; e.range = range; e.atkCd = atkCd;
    e.large = true; e.flying = flying;
    e.gold = 60 * enemyGoldScale(this.wave); e.xpVal = 200 * (1 + this.wave * 0.05); e.siege = 60 * siegeScale(this.wave);
    this.attachSprite(e, key, scale, 0.94);
    e.aura = this.auraImg('glow');
    e.aura.setTint(0xff2a4a).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.45);
    this.enemies.push(e);
    this.bossRef = e;
    return e;
  }

  removeAlly(e: Ent) {
    e.alive = false;
    this.releaseSprite(e);
    this.markFormation();
  }

  // ---------------------------------------------------------------- main update
  update(dt: number) {
    this.time += dt;
    this.allies = this.allies.filter((e) => e.alive);
    this.enemies = this.enemies.filter((e) => e.alive);
    this.allyGrid.reset(this.W + 200, this.H);
    this.enemyGrid.reset(this.W + 200, this.H);
    for (const a of this.allies) this.allyGrid.insert(a);
    this.wallAttackers = 0;
    for (const e of this.enemies) { this.enemyGrid.insert(e); if (e.atWall) this.wallAttackers++; }

    this.formationT -= dt;
    if (this.formationDirty && this.formationT <= 0) { computeFormation(this); this.formationDirty = false; this.formationT = 0.6; }
    this.auraT -= dt;
    if (this.auraT <= 0) { this.auraT = 0.5; this.computeAuras(); }

    const m = getMods();
    for (const a of this.allies) this.updateAlly(a, dt, m.regen);
    for (const e of this.enemies) if (e.kind === 'enemy') this.updateEnemy(e, dt);
    this.separate(dt);
    this.proj.update(dt);
    this.updateDying(dt);
    for (const a of this.allies) this.sync(a, dt);
    for (const e of this.enemies) this.sync(e, dt);
    this.fx.update(dt);
    this.fallen = this.fallen.filter((f) => this.time - f.t < 12);

    this.statT += dt;
    if (this.statT >= 1) {
      const k = 1 / this.statT;
      this.live.dps = this.live.dps * 0.5 + this.acc.dps * k * 0.5;
      this.live.tank = this.live.tank * 0.5 + this.acc.tank * k * 0.5;
      this.live.heal = this.live.heal * 0.5 + this.acc.heal * k * 0.5;
      this.acc.dps = this.acc.tank = this.acc.heal = 0;
      this.statT = 0;
    }
  }

  private computeAuras() {
    for (const a of this.allies) a.auraDR = 0;
    for (const g of this.allies) {
      if (!g.alive) continue;
      if (g.kind === 'ally' && g.cls === 'guardian' && g.tier >= 2) {
        this.allyGrid.query(g.x, g.y, 85, (a) => { a.auraDR = 0.25; });
      }
      if (g.kind === 'ally' && g.cls === 'healer' && g.tier >= 2) {
        const amt = g.heal * 0.12;
        this.allyGrid.query(g.x, g.y, 95, (a) => { if (a.hp < a.maxHp) this.healUnit(g, a, amt * (a.maxHp / Math.max(1, g.maxHp)) * 0.25 + a.maxHp * 0.006, true); });
      }
    }
    for (const a of this.allies) {
      if (a.alive && a.auraDR > 0 && G.settings.quality !== 'low' && Math.random() < 0.15) this.fx.particle({ tex: 'spark', x: a.x + rand(-6, 6), y: a.y - 6, vz: 20, life: 0.6, s0: 0.8, s1: 0, color: 0x8ad0ff, add: true });
    }
  }

  // ---------------------------------------------------------------- allies
  private updateAlly(e: Ent, dt: number, regen: number) {
    e.atkT -= dt; e.abilT -= dt; e.atkAnim -= dt; e.hurt -= dt; e.starT -= dt; e.tauntT -= dt;
    if (e.shieldT > 0) { e.shieldT -= dt; if (e.shieldT <= 0) e.shield = 0; }
    if (regen > 0 && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * regen * dt);
    if (e.life > 0) {
      e.life -= dt;
      if (e.life <= 0) { this.kill(e, null, true); return; }
    }
    if (e.stun > 0) { e.stun -= dt; return; }

    this.classAbility(e, dt);

    e.retarget -= dt;
    if (e.behavior === 'healer') { this.healerThink(e, dt); return; }
    if (e.retarget <= 0 || !e.target || !e.target.alive) {
      e.target = this.findAllyTarget(e);
      e.retarget = 0.22 + Math.random() * 0.15;
    }
    const t = e.target;
    if (t && t.alive) {
      const dx = t.x - e.x, dy = t.y - e.y;
      const dist = Math.hypot(dx, dy);
      const reach = e.range + t.r + 2;
      if (Math.abs(dx) > 2) e.facing = dx > 0 ? 1 : -1;
      if (dist > reach) {
        let sp = e.speed;
        // knight charge / swordsman dash
        if (e.behavior === 'knight' && dist > 70) sp *= 1.7;
        if (e.behavior === 'swordsman' && e.tier >= 3 && dist > 40 && dist < 160 && e.abilT <= 0) {
          e.abilT = 2.5;
          const nx = t.x - (dx / dist) * (reach - 2), ny = t.y - (dy / dist) * (reach - 2);
          this.fx.beam([e.x, e.y - 12, nx, ny - 12], 0xc08aff, 3, 0.15);
          e.x = nx; e.y = ny;
          return;
        }
        this.moveToward(e, t.x - (dx / dist) * reach * 0.9, t.y - (dy / dist) * reach * 0.9, sp, dt);
        if (e.behavior === 'knight' && e.tier >= 2) this.trample(e, dt);
      } else {
        e.vx = 0; e.vy = 0;
        if (e.atkT <= 0) {
          this.allyAttack(e, t);
          e.atkT = e.atkCd * rand(0.9, 1.1);
          e.atkAnim = 0.26;
        }
      }
    } else {
      e.target = null;
      if (e.behavior === 'knight') e.chargeReady = true;
      const d = Math.hypot(e.homeX - e.x, e.homeY - e.y);
      if (d > 5) { this.moveToward(e, e.homeX, e.homeY, e.speed * 0.85, dt); e.facing = e.homeX > e.x ? 1 : e.facing; }
      else { e.vx = 0; e.vy = 0; e.facing = 1; }
    }
  }

  private findAllyTarget(e: Ent): Ent | null {
    const ranged = e.role === 'ranged' || e.behavior === 'summoner';
    if (ranged) {
      let best: Ent | null = null, bs = Infinity;
      this.enemyGrid.query(e.x, e.y, e.range + 50, (t, d2) => {
        let s = Math.sqrt(d2);
        if (t.behavior === 'healer') s -= 110;
        if (t.flying) s -= 50;
        if (t.atWall) s -= 140;
        if (s < bs) { bs = s; best = t; }
      });
      return best;
    }
    // melee: defend the wall first
    if (this.wallAttackers > 0) {
      let best: Ent | null = null, bd = Infinity;
      this.enemyGrid.query(this.fortX + 30, e.y, 520, (t, d2) => {
        if (!t.atWall) return;
        const dd = (t.x - e.x) ** 2 + (t.y - e.y) ** 2;
        if (dd < bd) { bd = dd; best = t; }
      });
      if (best && bd < 420 * 420) {
        // only part of the army peels back: closest units and anyone idle
        if (!e.target || bd < 260 * 260) return best;
      }
    }
    // hunt mode: when only a few demons remain, everyone goes after them
    if (this.enemies.length <= 6) return this.enemyGrid.nearest(e.x, e.y, 3000);
    const aggro = e.behavior === 'knight' ? 360 : e.kind === 'summon' ? 300 : 235;
    // stay leashed to the home position unless an enemy is close
    const fromHome = Math.hypot(e.x - e.homeX, e.y - e.homeY);
    const r = fromHome > 320 ? 70 : aggro;
    return this.enemyGrid.nearest(e.x, e.y, r, (t) => !(t.flying && t.z > 30 && e.range < 30 && Math.random() < 0.3));
  }

  private crit(e: Ent): boolean {
    const m = getMods();
    let c = m.crit;
    if (e.behavior === 'swordsman' && e.tier >= 3) c += 0.2;
    return Math.random() < c;
  }

  dmgBonus(e: Ent, t: Ent): number {
    const m = getMods();
    let b = 1;
    if (t.large || t.kind === 'boss') {
      if (e.cls === 'lancer') b *= e.tier >= 3 ? 3 : 1.8;
      b *= m.largeDmg;
    }
    if (t.kind === 'boss') b *= m.bossDmg;
    return b;
  }

  private allyAttack(e: Ent, t: Ent) {
    const m = getMods();
    const isCrit = this.crit(e);
    const base = e.dmg * (isCrit ? m.critDmg : 1) * this.dmgBonus(e, t);
    const melee = e.range < 50;
    const b = e.behavior;
    if (melee) {
      this.fx.slash(e.x, e.y, e.facing, b === 'knight' && e.tier >= 3 ? 0xfff2a0 : 0xffffff, e.large ? 1 : 0.7);
      audio.play(Math.random() < 0.5 ? 'hit' : 'hit2', 0.6);
    }
    switch (b) {
      case 'militia': {
        this.damage(e, t, base, { crit: isCrit, melee: true });
        if (e.tier >= 3) this.cleave(e, t, base * 0.7, 30, 2);
        break;
      }
      case 'swordsman': {
        this.damage(e, t, base, { crit: isCrit, melee: true });
        if (e.tier >= 1 && t.alive) this.damage(e, t, base * 0.8, { melee: true });
        e.counter++;
        if (e.tier >= 2 && e.counter % 4 === 0) {
          this.fx.ring(e.x, e.y, 0xc08aff, 48 * m.aoe, 0.35);
          this.aoe(e, e.x, e.y, 48 * m.aoe, base * 1.5 * m.aoe, 1);
        }
        break;
      }
      case 'guardian': {
        this.damage(e, t, base, { crit: isCrit, melee: true });
        break;
      }
      case 'lancer': {
        this.damage(e, t, base, { crit: isCrit, melee: true });
        if (e.tier >= 1) {
          let extra = 0;
          this.enemyGrid.query(t.x + e.facing * 22, t.y, 22, (o) => { if (o !== t && extra < (e.tier >= 3 ? 3 : 1)) { extra++; this.damage(e, o, base * 0.8, { melee: true }); } });
        }
        if (e.tier >= 2 && t.alive && t.kind !== 'boss' && !t.miniboss) { t.x += e.facing * 14; t.stun = Math.max(t.stun, 0.25); }
        break;
      }
      case 'archer': {
        const arrows = e.tier >= 2 ? 3 : e.tier >= 1 ? 2 : 1;
        const targets = [t];
        if (arrows > 1) this.enemyGrid.query(t.x, t.y, 90, (o) => { if (targets.length < arrows && o !== t) targets.push(o); });
        while (targets.length < arrows) targets.push(t);
        const burn = G.run?.traits['t_fire'] ? base * 0.25 * G.run.traits['t_fire'] : 0;
        targets.forEach((tg, i) => {
          this.proj.fire({ tex: 'arrow', x: e.x + 6, y: e.y - 18, target: tg, speed: 520 + i * 30, dmg: i === 0 ? base : base * 0.75, src: e, team: 0, arc: 26, pierce: e.tier >= 2 ? 1 : 0, scale: 2, burn, tint: burn ? 0xffb07a : 0xffffff });
        });
        audio.play('arrow', 0.5);
        break;
      }
      case 'mage': {
        if (e.tier >= 2) {
          this.chainLightning(e, t, base, 4 + (G.run?.traits['t_storm'] || 0) * 2);
        } else {
          const splash = (e.tier >= 1 ? 40 : 28) * m.aoe * (1 + (G.run?.traits['t_storm'] || 0) * 0.4);
          this.proj.fire({ tex: 'orb', x: e.x + 8, y: e.y - 24, target: t, speed: 340, dmg: base, src: e, team: 0, arc: 12, splash, tint: 0x9a7aff, add: true, scale: 2 });
          audio.play('magic', 0.5);
        }
        break;
      }
      case 'knight': {
        let dmg = base;
        if (e.chargeReady) {
          dmg *= 2.2; e.chargeReady = false;
          this.fx.shake(1.5, 0.08);
          if (e.tier >= 1 && t.kind !== 'boss') t.stun = Math.max(t.stun, 0.9);
          this.fx.burst(t.x, t.y, 0xffffff, 6, 90);
        }
        this.damage(e, t, dmg, { crit: isCrit, melee: true });
        if (e.tier >= 3) { this.aoe(e, t.x, t.y, 50 * m.aoe, base * 0.6, 1, t); this.fx.glow(t.x, t.y - 8, 0xfff2a0, 1.2, 0.25); }
        break;
      }
      case 'summoner': {
        this.proj.fire({ tex: 'darkbolt', x: e.x + 8, y: e.y - 22, target: t, speed: 320, dmg: base, src: e, team: 0, arc: 10, tint: 0x5affd0, add: true, scale: 1.6 });
        break;
      }
      default: {
        // summons
        if (e.range > 60) this.proj.fire({ tex: 'arrow', x: e.x + 6, y: e.y - 18, target: t, speed: 500, dmg: base, src: e, team: 0, arc: 22, tint: 0x8affe0, scale: 2 });
        else this.damage(e, t, base, { crit: isCrit, melee: true });
      }
    }
    if (melee && m.meleeSplash > 0 && t) this.aoe(e, t.x, t.y, 32, base * m.meleeSplash, 1, t);
  }

  private classAbility(e: Ent, dt: number) {
    if (e.kind !== 'ally') return;
    const m = getMods();
    if (e.abilT > 0) return;
    switch (e.cls) {
      case 'guardian':
        if (e.tier >= 1) {
          e.abilT = 3;
          let n = 0;
          this.enemyGrid.query(e.x, e.y, 95, (t) => { if (t.kind === 'enemy' && t.behavior !== 'runner') { t.target = e; t.tauntT = 3; n++; } });
          if (n) this.fx.ring(e.x, e.y, 0xffd24a, 50, 0.35);
        }
        break;
      case 'archer':
        if (e.tier >= 3) {
          const c = this.densestEnemy(e.x, e.y, e.range + 60);
          if (!c) { e.abilT = 1; break; }
          e.abilT = 5;
          for (let i = 0; i < 10; i++) {
            const tx = c.x + rand(-55, 55), ty = c.y + rand(-35, 35);
            this.proj.fire({ tex: 'arrow', x: e.x, y: e.y - 30, target: null, tx, ty, speed: 420, dmg: e.dmg * 0.9, src: e, team: 0, arc: 160, splash: 18, scale: 2 });
          }
          audio.play('arrow');
        }
        break;
      case 'mage':
        if (e.tier >= 3) {
          const c = this.densestEnemy(e.x, e.y, e.range + 80);
          if (!c) { e.abilT = 1; break; }
          e.abilT = 6;
          this.proj.fire({ tex: 'meteor', x: c.x, y: c.y, target: null, tx: c.x, ty: c.y, speed: 1, dmg: e.dmg * 5, src: e, team: 0, splash: 75 * m.aoe, fall: true, scale: 3, onHit: (x, y) => { this.fx.shake(3, 0.15); this.fx.ring(x, y, 0xff7a2a, 75 * m.aoe); } });
        }
        break;
      case 'summoner': {
        const traitS = G.run?.traits['t_spirits'] || 0;
        const maxOwn = 3 + traitS * 2;
        if (e.summons >= maxOwn) { e.abilT = 1; break; }
        e.abilT = 7;
        const life = 12 * (1 + traitS * 0.5);
        if (e.tier >= 3) {
          this.spawnSummon('golem', e.x + 20, e.y, e.uHp * 6, e.uDmg * 2.5, life * 1.5, e);
          e.summons++;
        } else {
          const n = (e.tier >= 1 ? 2 : 1) + traitS;
          for (let i = 0; i < n; i++) {
            const s = this.spawnSummon(e.tier >= 2 ? 'spiritArcher' : 'spirit', e.x + 16, e.y + rand(-20, 20), e.uHp * 0.9, e.uDmg * 0.9, life, e);
            if (s) e.summons++;
          }
        }
        audio.play('summon');
        break;
      }
      case 'healer':
        if (e.tier >= 3 && this.fallen.length) {
          e.abilT = 8;
          const f = this.fallen.shift()!;
          const r = this.spawnAlly(f.cls as ClassId, f.level, 0, e.x + rand(-20, 20), e.y + rand(-20, 20));
          if (r) { r.hp = r.maxHp * 0.6; this.fx.glow(r.x, r.y - 10, 0xffffa0, 1.6, 0.8); this.fx.burst(r.x, r.y, 0xffffa0, 14, 80, { tex: 'spark', add: true }); this.markFormation(); }
        } else e.abilT = 1;
        break;
    }
  }

  private healerThink(e: Ent, dt: number) {
    // find most wounded ally in range
    let best: Ent | null = null, bp = 0.97;
    this.allyGrid.query(e.x, e.y, e.range + 60, (a) => { const p = a.hp / a.maxHp; if (p < bp) { bp = p; best = a; } });
    const t = best as Ent | null;
    let goal: Ent | null = t;
    if (!goal) {
      const d = Math.hypot(e.homeX - e.x, e.homeY - e.y);
      if (d > 5) this.moveToward(e, e.homeX, e.homeY, e.speed * 0.8, dt);
      // light attack on nearby enemy
      const en = this.enemyGrid.nearest(e.x, e.y, e.range);
      if (en && e.atkT <= 0) {
        e.atkT = e.atkCd * 1.4; e.atkAnim = 0.26;
        this.proj.fire({ tex: 'holy', x: e.x + 8, y: e.y - 24, target: en, speed: 360, dmg: e.dmg * getMods().dmg / getMods().dmg, src: e, team: 0, arc: 8, scale: 1.4, add: true });
      }
      return;
    }
    const dist = Math.hypot(goal.x - e.x, goal.y - e.y);
    if (dist > e.range) { this.moveToward(e, goal.x, goal.y, e.speed, dt); return; }
    if (e.atkT > 0) return;
    e.atkT = e.atkCd; e.atkAnim = 0.26;
    e.facing = goal.x >= e.x ? 1 : -1;
    const hops = e.tier >= 1 ? 3 + (G.run?.traits['t_chain'] || 0) * 2 : 1;
    let cur: Ent = goal;
    const done = new Set<number>();
    let px = e.x + 8, py = e.y - 26;
    let amount = e.heal * (1 + 0.15 * e.tier);
    for (let i = 0; i < hops && cur; i++) {
      done.add(cur.id);
      this.healUnit(e, cur, amount + cur.maxHp * 0.04);
      if (i > 0 || hops > 1) this.fx.beam([px, py, cur.x, cur.y - 14], 0x9affc0, 2, 0.2);
      else this.fx.particle({ tex: 'holy', x: cur.x, y: cur.y - 20, vz: 20, life: 0.5, s0: 1.6, s1: 0.4, add: true });
      px = cur.x; py = cur.y - 14;
      let next: Ent | null = null, np = 1;
      this.allyGrid.query(cur.x, cur.y, 90, (a) => { if (!done.has(a.id)) { const p = a.hp / a.maxHp; if (p < np) { np = p; next = a; } } });
      cur = next as any;
      amount *= 0.8;
    }
    audio.play('heal', 0.5);
  }

  healUnit(src: Ent | null, t: Ent, amount: number, silent = false) {
    if (!t.alive) return;
    const before = t.hp;
    t.hp = Math.min(t.maxHp, t.hp + amount);
    const real = t.hp - before;
    this.acc.heal += real;
    if (!silent && real > 0 && G.settings.quality !== 'low') this.fx.particle({ tex: 'heal', x: t.x + rand(-5, 5), y: t.y - 16, vz: 30, life: 0.5, s0: 1.2, s1: 0.2, add: true });
  }

  private trample(e: Ent, dt: number) {
    e.trampleT -= dt;
    if (e.trampleT > 0) return;
    e.trampleT = 0.25;
    this.enemyGrid.query(e.x, e.y, e.r + 10, (t) => { if (t.kind !== 'boss') this.damage(e, t, e.dmg * 0.3, { melee: true, silent: true }); });
  }

  private cleave(e: Ent, main: Ent, dmg: number, r: number, max: number) {
    let n = 0;
    this.enemyGrid.query(main.x, main.y, r, (t) => { if (t !== main && n < max) { n++; this.damage(e, t, dmg, { melee: true }); } });
  }

  private chainLightning(e: Ent, first: Ent, dmg: number, jumps: number) {
    let cur: Ent | null = first;
    const done = new Set<number>();
    let px = e.x + 8, py = e.y - 26;
    let d = dmg;
    for (let i = 0; i < jumps && cur; i++) {
      done.add(cur.id);
      this.fx.lightning(px, py, cur.x, cur.y - 12 - cur.z);
      this.damage(e, cur, d, { aoe: true });
      px = cur.x; py = cur.y - 12;
      let next: Ent | null = null, nd = Infinity;
      this.enemyGrid.query(cur.x, cur.y, 100, (o, d2) => { if (!done.has(o.id) && d2 < nd) { nd = d2; next = o; } });
      cur = next;
      d *= 0.85;
    }
    audio.play('lightning', 0.6);
  }

  aoe(src: Ent | null, x: number, y: number, r: number, dmg: number, team: 0 | 1, exclude?: Ent, ability = false) {
    const grid = team === 1 ? this.enemyGrid : this.allyGrid;
    grid.query(x, y, r, (t) => {
      if (t === exclude) return;
      this.damage(src, t, dmg, { aoe: true, ability, silent: !ability });
    });
  }

  densestEnemy(x: number, y: number, r: number): Ent | null {
    let best: Ent | null = null, bc = 0;
    let checks = 0;
    this.enemyGrid.query(x, y, r, (t) => {
      if (checks++ > 40) return true;
      const c = this.enemyGrid.count(t.x, t.y, 60) + (t.kind === 'boss' ? 6 : 0);
      if (c > bc) { bc = c; best = t; }
    });
    return best;
  }

  densestAlly(): { x: number; y: number } | null {
    let best: Ent | null = null, bc = -1;
    const sample = this.allies.length > 40 ? this.allies.filter((_, i) => i % Math.ceil(this.allies.length / 40) === 0) : this.allies;
    for (const a of sample) {
      if (!a.alive) continue;
      const c = this.allyGrid.count(a.x, a.y, 80);
      if (c > bc) { bc = c; best = a; }
    }
    return best ? { x: best.x, y: best.y } : null;
  }

  // ---------------------------------------------------------------- enemies
  private updateEnemy(e: Ent, dt: number) {
    e.atkT -= dt; e.abilT -= dt; e.atkAnim -= dt; e.hurt -= dt; e.tauntT -= dt;
    if (e.burn > 0) { e.burn -= dt; this.damage(null, e, e.burnDps * dt, { silent: true, dot: true }); if (!e.alive) return; }
    if (e.frozen > 0) { e.frozen -= dt; return; }
    if (e.stun > 0) { e.stun -= dt; return; }
    const wallX = this.fortX + 8;
    const b = e.behavior;
    // healer & summoner specials
    if (b === 'healer' && e.abilT <= 0) {
      e.abilT = e.atkCd;
      let best: Ent | null = null, bp = 0.95;
      this.enemyGrid.query(e.x, e.y, e.range, (o) => { const p = o.hp / o.maxHp; if (p < bp) { bp = p; best = o; } });
      if (best) {
        const tb = best as Ent;
        tb.hp = Math.min(tb.maxHp, tb.hp + tb.maxHp * 0.12 + e.dmg * 2);
        this.fx.beam([e.x - 6, e.y - 30, tb.x, tb.y - 14], 0x7aff5a, 2, 0.25);
        this.fx.particle({ tex: 'heal', x: tb.x, y: tb.y - 20, vz: 30, life: 0.5, s0: 1.4, s1: 0.2, add: true, color: 0x9aff6a });
        e.atkAnim = 0.3;
      }
    }
    if (b === 'summoner' && e.abilT <= 0 && e.x < this.W - 40) {
      e.abilT = e.atkCd;
      e.atkAnim = 0.4;
      if (this.enemies.length < this.enemyCap()) {
        for (let i = 0; i < 3; i++) this.spawnEnemy('imp', e.x - 20 + rand(-10, 10), e.y + rand(-25, 25), { hpMul: 0.6 });
        this.fx.ring(e.x - 20, e.y, 0xff3a5c, 40, 0.5);
        this.fx.glow(e.x - 20, e.y - 8, 0xff3a5c, 1.2, 0.5);
      }
    }

    // target selection
    if (e.retarget <= 0 || (e.target && !e.target.alive)) {
      e.retarget = 0.3 + Math.random() * 0.2;
      if (e.tauntT > 0 && e.target && e.target.alive) { /* keep taunt */ }
      else if (b === 'runner') e.target = null;
      else if (b === 'flyer') e.target = this.allyGrid.nearest(e.x, e.y, 120, (a) => a.role === 'ranged' || a.role === 'support') || null;
      else if (b === 'bomber') e.target = this.allyGrid.nearest(e.x, e.y, 320);
      else if (b === 'ranged' || b === 'caster' || b === 'healer' || b === 'summoner') e.target = this.allyGrid.nearest(e.x, e.y, e.range + 20);
      else e.target = this.allyGrid.nearest(e.x, e.y, e.large ? 90 : 70);
    }
    e.retarget -= dt;
    const t = e.target;
    if (t && t.alive) {
      e.atWall = false;
      const dx = t.x - e.x, dy = t.y - e.y;
      const dist = Math.hypot(dx, dy);
      e.facing = dx >= 0 ? 1 : -1;
      const reach = e.range + t.r + 2;
      if (b === 'bomber') {
        if (dist < 18 + t.r) { this.explodeBomber(e); return; }
        this.moveToward(e, t.x, t.y, e.speed, dt);
        return;
      }
      if (dist > reach) this.moveToward(e, t.x - (dx / dist) * reach * 0.9, t.y - (dy / dist) * reach * 0.9, e.speed, dt);
      else if (e.atkT <= 0 && b !== 'healer' && b !== 'summoner') {
        e.atkT = e.atkCd * rand(0.9, 1.1);
        e.atkAnim = 0.28;
        this.enemyAttack(e, t);
      }
      return;
    }
    // march toward the fortress
    const ranged = b === 'ranged' || b === 'caster' || b === 'healer' || b === 'summoner';
    const stopX = ranged ? wallX + Math.min(e.range * 0.7, 150) : wallX + e.r;
    if (e.x > stopX + 1) {
      e.atWall = false;
      const ty = e.flying || b === 'runner' ? (e.x > this.fortX + 200 ? e.laneY : this.gateY + (e.laneY - this.gateY) * 0.4) : e.laneY + Math.sin(this.time * 0.8 + e.id) * 10;
      this.moveToward(e, stopX, ty, e.speed, dt, true);
      e.facing = -1;
    } else {
      e.atWall = true;
      e.x = Math.max(e.x, stopX - 1);
      e.facing = -1;
      if (b === 'bomber') { this.explodeBomber(e); return; }
      if (e.atkT <= 0) {
        e.atkT = e.atkCd * rand(0.9, 1.1);
        e.atkAnim = 0.28;
        if (ranged) {
          this.proj.fire({ tex: b === 'caster' ? 'darkbolt' : 'firebolt', x: e.x - 6, y: e.y - 20, target: null, tx: this.fortX - 10, ty: e.y - 20, speed: 300, dmg: 0, src: e, team: 1, arc: 18, wall: true, add: true, scale: 2, tint: b === 'caster' ? 0xff6aff : 0xffffff });
        } else {
          this.fortDamage(e.siege, e.x - 10, e.y);
          this.fx.slash(e.x - 6, e.y, -1, 0xff6a5a, 0.7);
        }
      }
    }
  }

  private enemyAttack(e: Ent, t: Ent) {
    const b = e.behavior;
    if (b === 'ranged') {
      this.proj.fire({ tex: 'firebolt', x: e.x - 6, y: e.y - 20, target: t, speed: 300, dmg: e.dmg, src: e, team: 1, arc: 20, scale: 2, add: true });
    } else if (b === 'caster') {
      this.proj.fire({ tex: 'darkbolt', x: e.x - 6, y: e.y - 24, target: t, speed: 260, dmg: e.dmg, src: e, team: 1, arc: 30, splash: 38, tint: 0xff6aff, scale: 2, add: true });
    } else {
      const melee = true;
      let dmg = e.dmg;
      if (e.miniboss) { this.aoe(e, t.x, t.y, 40, dmg * 0.6, 0, t); this.fx.shake(2, 0.1); }
      this.damage(e, t, dmg, { melee });
      this.fx.slash(e.x, e.y, e.facing, 0xff7a6a, e.large ? 1.1 : 0.6);
      if (e.large) audio.play('hit2', 0.7);
    }
  }

  private explodeBomber(e: Ent) {
    const r = 46;
    this.fx.ring(e.x, e.y, 0xffa23a, r, 0.4);
    this.fx.burst(e.x, e.y, 0xffa23a, 18, 140, { add: true, life: 0.5 });
    this.fx.glow(e.x, e.y - 8, 0xff7a2a, 1.8, 0.35);
    this.fx.shake(2.5, 0.12);
    audio.play('boom', 0.7);
    if (e.atWall) this.fortDamage(e.siege, e.x, e.y);
    this.aoe(e, e.x, e.y, r, e.dmg, 0);
    e.gold *= 0.3;
    this.kill(e, null);
  }

  // ---------------------------------------------------------------- shots
  private onShotImpact(s: Shot, t: Ent | null, x: number, y: number) {
    if (s.onHit) s.onHit(x, y, t);
    if (s.wall) {
      if (s.src) this.fortDamage(s.src.siege, x + 10, y + 20);
      this.fx.burst(x + 10, y + 10, 0xff7a2a, 5, 60, { add: true });
      return;
    }
    if (s.splash) {
      const col = s.team === 0 ? (s.tex === 'meteor' ? 0xff7a2a : 0x9a7aff) : 0xff4aff;
      if (s.tex !== 'meteor') this.fx.ring(x, y + 10, col, s.splash, 0.3);
      this.fx.burst(x, y + 10, col, s.tex === 'meteor' ? 20 : 8, s.tex === 'meteor' ? 160 : 70, { add: true });
      if (s.tex === 'meteor') { this.fx.glow(x, y, 0xff7a2a, 2.2, 0.4); audio.play('boom'); }
      this.aoe(s.src, x, y + 10, s.splash, s.dmg, s.team === 0 ? 1 : 0);
      return;
    }
    if (t) {
      this.damage(s.src, t, s.dmg, {});
      if (s.burn && t.alive) { t.burn = 3; t.burnDps = s.burn; }
      if (s.pierce) {
        let n = 0;
        const grid = s.team === 0 ? this.enemyGrid : this.allyGrid;
        grid.query(x + 18, y + 10, 26, (o) => { if (o !== t && n < (s.pierce || 0)) { n++; this.damage(s.src, o, s.dmg * 0.7, { silent: true }); } });
      }
      if (s.tex === 'firebolt' && G.settings.quality !== 'low') this.fx.burst(x, y + 6, 0xff7a2a, 3, 40, { add: true, life: 0.25 });
    }
  }

  // ---------------------------------------------------------------- damage
  damage(src: Ent | null, t: Ent, amount: number, o: { crit?: boolean; melee?: boolean; aoe?: boolean; ability?: boolean; silent?: boolean; dot?: boolean; skill?: boolean } = {}): number {
    if (!t.alive || amount <= 0) return 0;
    if (t.team === 0) {
      if (t.cls === 'militia' && t.tier >= 2 && !o.ability && Math.random() < 0.25) { if (Math.random() < 0.2) this.fx.text(t.x, t.y - 30, 'Bloq!', '#9ad8ff'); return 0; }
      if (t.auraDR) amount *= 1 - t.auraDR;
      if (t.role === 'front') amount *= 1 - getMods().frontDR;
    }
    if (!o.dot) {
      // armor is normalised by wave so it never trivialises late-game damage
      const arm = Math.max(0, t.armor * (o.ability ? 0.5 : 1));
      amount *= 1 - arm / (arm + 100 + this.wave * 4);
    }
    if (o.melee && t.flying) amount *= 0.5;
    if (t.shield > 0) {
      const ab = Math.min(t.shield, amount);
      t.shield -= ab; amount -= ab;
      if (amount <= 0) return 0;
    }
    t.hp -= amount;
    t.hurt = 0.08;
    if (src && src.team === 0) {
      this.acc.dps += amount;
      if (G.run) G.run.stats.dmg += amount;
      if (src.kind === 'ally' && !o.dot) giveXp(this, src, 0.6);
    } else if (t.team === 0) this.acc.tank += amount;

    if (!o.silent) {
      if (t.team === 1) {
        const big = o.crit || t.kind === 'boss' || o.skill;
        if (big || Math.random() < 0.35) this.fx.text(t.x, t.y - 34 - t.z - (t.kind === 'boss' ? 110 : t.miniboss ? 50 : 0), Math.round(-amount) as any, o.crit ? '#ffe14a' : o.skill ? '#ffffff' : '#ffd0c0', !!(o.crit || o.skill), !!o.skill || t.kind === 'boss');
      } else if (o.ability) this.fx.text(t.x, t.y - 34, -amount as any, '#ff5a5a', false);
    }
    if (G.settings.quality !== 'low' && !o.dot && Math.random() < 0.5) {
      this.fx.particle({ tex: 'px', x: t.x + rand(-4, 4), y: t.y - 12, z: 6, vx: rand(-60, 60), vy: rand(-20, 20), vz: rand(40, 90), g: 300, life: 0.35, s0: 1, s1: 0.4, color: t.team === 1 ? (t.cls === 'flyer' || t.kind === 'boss' ? 0x9a2a4a : 0xb01a2a) : 0xd03030 });
    }
    // squads lose members progressively
    if (t.kind === 'ally' && t.stack > 1) {
      while (t.stack > 1 && t.hp <= (t.stack - 1) * t.uHp) {
        t.stack--;
        t.maxHp = t.uHp * t.stack; t.dmg = t.uDmg * t.stack;
        this.memberLost(t);
      }
    }
    if (t.hp <= 0) this.kill(t, src);
    return amount;
  }

  private memberLost(t: Ent) {
    const run = G.run!;
    run.stats.lost++;
    run.legacy[t.cls] = (run.legacy[t.cls] || 0) + totalXp(t.level, t.xp) * getMods().legacy;
    this.fx.particle({ tex: 'soul', x: t.x, y: t.y - 10, vz: 40, g: -10, life: 1, s0: 1.6, s1: 0.8, add: true, a0: 0.8 });
  }

  kill(e: Ent, src: Ent | null, silent = false) {
    if (!e.alive) return;
    e.alive = false;
    e.dead = 0.45;
    this.dying.push(e);
    const run = G.run!;
    if (e.team === 1) {
      const m = getMods();
      const gold = e.gold * m.gold * (run.modifier === 'siege' ? 1.5 : 1);
      run.gold += gold;
      run.stats.gold += gold;
      run.stats.kills++;
      if (!run.demo) G.meta.totalKills++;
      // xp to killer and nearby allies
      if (src && src.alive && src.kind === 'ally') giveXp(this, src, e.xpVal);
      this.allyGrid.query(e.x, e.y, 170, (a) => { if (a !== src && a.kind === 'ally') giveXp(this, a, e.xpVal * 0.4); });
      run.armyXp += e.xpVal * m.xp * 0.6;
      while (run.armyXp >= armyXpNeeded(run.armyLevel)) {
        run.armyXp -= armyXpNeeded(run.armyLevel);
        run.armyLevel++;
        run.pendingBless++;
        this.hooks.armyLevelUp();
      }
      const col = parseInt(REGIONS[this.region].palette.skin.slice(1), 16);
      if (!silent) {
        this.fx.burst(e.x, e.y - 8, col, e.large ? 16 : 7, e.large ? 120 : 80, { life: 0.5 });
        if (G.settings.quality !== 'low') this.fx.particle({ tex: 'coin', x: e.x, y: e.y - 14, vz: 120, g: 380, vx: rand(-20, 20), life: 0.7, s0: 2, s1: 1.6 });
        audio.play('edeath', 0.5);
        if (Math.random() < 0.3) audio.play('coin', 0.4);
      }
      if (e.owner) e.owner.summons = Math.max(0, e.owner.summons - 1);
      if (e.kind === 'boss' || e.miniboss) {
        this.fx.shake(8, 0.6);
        this.fx.flash(0xffffff, 0.6, 0.5);
        for (let i = 0; i < 4; i++) this.fx.burst(e.x + rand(-40, 40), e.y - rand(0, 80), 0xffa23a, 20, 200, { add: true, life: 0.8 });
        this.fx.glow(e.x, e.y - 60, 0xffd23a, 5, 0.9);
        audio.play('boom', 1);
        if (e.kind === 'boss') this.bossRef = null;
      }
      this.onKillCb(e);
    } else {
      if (e.kind === 'ally') {
        run.stats.lost++;
        run.legacy[e.cls] = (run.legacy[e.cls] || 0) + totalXp(e.level, e.xp) * getMods().legacy;
        this.fallen.push({ cls: e.cls, level: e.level, x: e.x, y: e.y, t: this.time });
        if (this.fallen.length > 20) this.fallen.shift();
        if (!silent) {
          this.fx.particle({ tex: 'soul', x: e.x, y: e.y - 10, vz: 40, g: -10, life: 1.2, s0: 1.8, s1: 0.8, add: true, a0: 0.85 });
          audio.play('death', 0.5);
        }
        this.markFormation();
        this.onAllyDeathCb(e);
      } else {
        if (e.owner) e.owner.summons = Math.max(0, e.owner.summons - 1);
        this.fx.burst(e.x, e.y - 10, 0x8affe0, 6, 50, { tex: 'spark', add: true });
      }
    }
  }

  private updateDying(dt: number) {
    for (const e of this.dying) {
      e.dead -= dt;
      if (e.spr) {
        const k = Math.max(0, e.dead / 0.45);
        e.spr.setAlpha(k).setTintFill(e.team === 1 ? 0x2a0a10 : 0x1a1a2a);
        e.spr.setRotation((1 - k) * (e.facing > 0 ? -1.2 : 1.2) * (e.kind === 'boss' ? 0.3 : 1));
        if (e.shd) e.shd.setAlpha(k);
        if (e.aura) e.aura.setAlpha(k * 0.5);
        if (e.flag) e.flag.setAlpha(k);
      }
      if (e.dead <= 0) this.releaseSprite(e);
    }
    this.dying = this.dying.filter((e) => e.dead > 0);
  }

  fortDamage(amount: number, x: number, y: number) {
    const run = G.run!;
    if (run.fortHp <= 0) return;
    run.fortHp -= amount;
    this.hooks.fortHit(amount);
    if (Math.random() < 0.5) this.fx.burst(this.fortX - 4, y - 10, 0xa8a0b0, 3, 50, { life: 0.4 });
    audio.play('wall', 0.6);
    if (run.fortHp <= 0) { run.fortHp = 0; this.hooks.defeat(); }
  }

  onPromote(e: Ent) {
    this.fx.ring(e.x, e.y, 0xffd24a, 34, 0.6);
    this.fx.glow(e.x, e.y - 14, 0xffd24a, 1.4, 0.6);
    for (let i = 0; i <= e.tier; i++) this.fx.particle({ tex: 'star', x: e.x - e.tier * 6 + i * 12, y: e.y - 44, vz: 12, g: 0, life: 2.2, s0: 2, s1: 1.6, a0: 1 });
    this.fx.burst(e.x, e.y - 10, 0xffe14a, 12, 90, { tex: 'spark', add: true, life: 0.6 });
    e.starT = 2.2;
    audio.play('promote', 0.7);
    this.onPromoteCb(e);
  }

  // ---------------------------------------------------------------- movement
  moveToward(e: Ent, tx: number, ty: number, speed: number, dt: number, march = false) {
    const dx = tx - e.x, dy = ty - e.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.5) { e.vx = e.vy = 0; return; }
    const s = Math.min(d, speed * dt);
    e.vx = (dx / d) * speed; e.vy = (dy / d) * speed;
    e.x += (dx / d) * s;
    e.y += (dy / d) * s * (march ? 0.6 : 1);
    e.anim += dt * speed * 0.06;
  }

  private separate(dt: number) {
    const push = (a: Ent, b: Ent, wa: number) => {
      const dx = b.x - a.x, dy = b.y - a.y;
      const min = (a.r + b.r) * 0.9;
      const d2 = dx * dx + dy * dy;
      if (d2 >= min * min || d2 === 0) return;
      const d = Math.sqrt(d2);
      const ov = (min - d) / d;
      const k = Math.min(1, dt * 14);
      a.x -= dx * ov * wa * k; a.y -= dy * ov * wa * k;
      b.x += dx * ov * (1 - wa) * k; b.y += dy * ov * (1 - wa) * k;
    };
    for (const a of this.allies) {
      if (!a.alive) continue;
      this.allyGrid.query(a.x, a.y, a.r * 2 + 4, (b) => { if (b.id > a.id) push(a, b, 0.5); });
      // allies physically block demons (except flyers)
      this.enemyGrid.query(a.x, a.y, a.r + 16, (b) => { if (!b.flying && b.kind !== 'boss') push(a, b, b.behavior === 'runner' ? 0.15 : 0.25); });
    }
    for (const e of this.enemies) {
      if (!e.alive || e.kind === 'boss') continue;
      this.enemyGrid.query(e.x, e.y, e.r * 2 + 4, (b) => { if (b.id > e.id && b.kind !== 'boss' && b.flying === e.flying) push(e, b, 0.5); });
    }
    const top = this.fieldTop - 10, bot = this.fieldBot + 8;
    for (const a of this.allies) { a.y = clamp(a.y, top, bot); a.x = clamp(a.x, this.fortX + 4, this.W - 20); }
    for (const e of this.enemies) { e.y = clamp(e.y, top, bot); if (e.x < this.fortX + 6) e.x = this.fortX + 6; }
  }

  // ---------------------------------------------------------------- render sync
  private sync(e: Ent, dt: number) {
    const s = e.spr;
    if (!s) return;
    const fly = e.flying ? (e.kind === 'boss' ? 40 : 24) + Math.sin(this.time * 4 + e.id) * 3 : 0;
    const persp = 0.88 + ((e.y - this.fieldTop) / (this.fieldBot - this.fieldTop)) * 0.16;
    s.setPosition(e.x, e.y - e.z - fly);
    s.setDepth(10 + e.y);
    s.setScale(e.scale * persp * (e.stack > 1 ? 1.1 : 1));
    let frame = 0;
    if (e.kind === 'boss') {
      frame = e.atkAnim > 0 ? (e.atkAnim > 0.2 ? 2 : 3) : (Math.floor(this.time * 2.2) % 2);
      if (e.behavior === 'casting') frame = 2;
    } else if (e.atkAnim > 0) frame = e.atkAnim > 0.13 ? 4 : 5;
    else if (Math.abs(e.vx) + Math.abs(e.vy) > 4) frame = 2 + (Math.floor(e.anim * 2) % 2);
    else frame = Math.floor(this.time * 1.6 + e.id * 0.37) % 2;
    if (e.frozen > 0 || e.stun > 0) frame = 0;
    s.setFrame(frame);
    const defaultFacing = e.team === 0 ? 1 : -1;
    s.setFlipX(e.facing !== defaultFacing);
    if (e.hurt > 0) s.setTintFill(0xffffff);
    else if (e.frozen > 0) s.setTint(0x9adfff);
    else if (e.shield > 0) s.setTint(0xfff2b0);
    else if (e.burn > 0) s.setTint(0xffb08a);
    else if (e.kind === 'summon') s.setTint(0xffffff).setAlpha(0.85);
    else s.clearTint();
    if (e.shd) {
      const w = e.kind === 'boss' ? 4.2 : e.miniboss ? 2.6 : e.large ? 1.5 : e.cls === 'knight' || e.cls === 'hound' ? 1.2 : 0.8;
      e.shd.setPosition(e.x, e.y + 1).setScale(w * persp, w * persp).setAlpha(e.flying ? 0.5 : 0.9);
    }
    if (e.aura) {
      e.aura.setPosition(e.x, e.y - (e.kind === 'boss' ? 60 : e.miniboss ? 30 : 6)).setDepth(9 + e.y);
      const pulse = 1 + Math.sin(this.time * 3 + e.id) * 0.08;
      if (e.kind === 'boss') e.aura.setScale(4.2 * pulse);
      else if (e.miniboss) e.aura.setScale(2.4 * pulse);
      else e.aura.setScale(0.9 * pulse, 0.45 * pulse);
    }
    // champion glow & squad flag (allies)
    if (e.team === 0 && e.kind === 'ally') {
      if (e.tier >= 3 && !e.aura) { e.aura = this.auraImg('glow'); e.aura.setTint(0xffd24a).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.55); }
      if (e.stack > 1 && !e.flag) { e.flag = this.auraImg('flag'); e.flag.setScale(1.6); }
      if (e.stack <= 1 && e.flag) { e.flag.setVisible(false); this.auraPool.push(e.flag); e.flag = null; }
      if (e.flag) e.flag.setPosition(e.x + 10, e.y - 44).setDepth(11 + e.y);
    }
  }

  clearAll() {
    for (const e of this.ents) { if (e.alive || e.dead > 0) { e.alive = false; e.dead = 0; } this.releaseSprite(e); }
    this.allies = []; this.enemies = []; this.dying = [];
    this.proj.clear(); this.fx.clear();
    this.bossRef = null;
    this.fallen = [];
  }

  avgAllyDmg(): number {
    let s = 0, n = 0;
    for (const a of this.allies) if (a.alive && a.kind === 'ally') { s += a.uDmg; n++; }
    return n ? s / n : 6 * getMods().dmg;
  }

  avgArmyLevel(): number {
    let s = 0, n = 0;
    for (const a of this.allies) if (a.alive && a.kind === 'ally') { s += a.level; n++; }
    return n ? s / n : 1;
  }

  saveArmyToRun() {
    const run = G.run;
    if (!run) return;
    const out = [];
    for (const a of this.allies) if (a.alive && a.kind === 'ally') out.push({ cls: a.cls as ClassId, level: a.level, xp: Math.floor(a.xp), vet: a.vet, stack: a.stack });
    run.army = out;
    save();
  }
}

export { levelMult, pick };
