// Commander active skills (manual or auto-cast): celestial blade, frost prison, holy blessing, arcane portal.
import { SKILLS } from '../data/upgrades';
import { G } from '../core/state';
import { getMods } from '../core/mods';
import { rand } from '../core/util';
import { audio } from '../audio/audio';
import type { World } from './world';
import type { BossCtl } from './boss';

export class Skills {
  w: World;
  boss: BossCtl;
  cd: number[] = [0, 0, 0, 0];
  pending: { t: number; fn: () => void }[] = [];

  constructor(w: World, boss: BossCtl) { this.w = w; this.boss = boss; }

  maxCd(i: number) { return SKILLS[i].cd * getMods().skillCd; }
  level(i: number) { return G.run?.skillLv[i] || 0; }
  ready(i: number) { return this.level(i) > 0 && this.cd[i] <= 0; }
  power(i: number) { return (1 + (this.level(i) - 1) * 0.6) * getMods().skillPow; }

  update(dt: number) {
    for (let i = 0; i < 4; i++) if (this.cd[i] > 0) this.cd[i] -= dt;
    for (const p of this.pending) p.t -= dt;
    const due = this.pending.filter((p) => p.t <= 0);
    this.pending = this.pending.filter((p) => p.t > 0);
    due.forEach((p) => p.fn());
    if (G.run?.autoSkills) this.autoCast();
  }

  private autoCast() {
    const w = this.w;
    const n = w.enemyCount();
    if (this.ready(2) && (this.boss.wipeIncoming() || (w.allies.length > 4 && this.avgHpPct() < 0.45))) this.cast(2);
    if (this.ready(0) && (n >= 8 || w.bossRef)) this.cast(0);
    if (this.ready(1) && (n >= 14 || w.wallAttackers >= 3)) this.cast(1);
    if (this.ready(3) && n >= 6 && (w.armyCount() < getMods().cap * 0.5 || w.bossRef)) this.cast(3);
  }

  private avgHpPct() {
    let s = 0, k = 0;
    for (const a of this.w.allies) if (a.alive) { s += a.hp / a.maxHp; k++; }
    return k ? s / k : 1;
  }

  cast(i: number): boolean {
    if (!this.ready(i)) return false;
    const w = this.w;
    const pw = this.power(i);
    this.cd[i] = this.maxCd(i);
    switch (i) {
      case 0: { // Celestial blade
        const tgt = w.bossRef && w.bossRef.alive ? w.bossRef : w.densestEnemy(w.W * 0.6, (w.fieldTop + w.fieldBot) / 2, w.W);
        const x = tgt ? tgt.x : w.W * 0.6, y = tgt ? tgt.y : w.gateY;
        w.fx.particle({ tex: 'blade', x, y: y - 40, z: 400, vz: -900, g: 0, life: 0.45, s0: 2.4, s1: 2.4, add: false, depth: 8000 });
        w.fx.ring(x, y, 0xffd24a, 110, 0.5);
        audio.play('blade');
        this.pending.push({ t: 0.42, fn: () => {
          const dmg = 40 * w.avgAllyDmg() * pw;
          w.fx.flash(0xfff6c0, 0.5, 0.35);
          w.fx.shake(10, 0.4);
          w.fx.glow(x, y - 20, 0xffe88a, 4, 0.6);
          w.fx.ring(x, y, 0xffffff, 130, 0.5);
          w.fx.burst(x, y, 0xffe88a, 30, 260, { tex: 'spark', add: true, life: 0.7 });
          w.enemyGrid.query(x, y, 120, (t) => { w.damage(null, t, dmg * (t.kind === 'boss' ? 1 : 1), { skill: true }); });
          if (w.bossRef && w.bossRef.alive && Math.hypot(w.bossRef.x - x, w.bossRef.y - y) > 120 && tgt === w.bossRef) w.damage(null, w.bossRef, dmg, { skill: true });
        } });
        break;
      }
      case 1: { // Frost prison
        const c = w.densestEnemy(w.W * 0.5, (w.fieldTop + w.fieldBot) / 2, w.W) || { x: w.W * 0.5, y: w.gateY };
        const r = 240;
        const dur = 2.5 + (this.level(i) - 1) * 0.25;
        audio.play('frost');
        w.fx.ring(c.x, c.y, 0x9adfff, r, 0.6);
        w.fx.flash(0x9adfff, 0.3, 0.4);
        w.enemyGrid.query(c.x, c.y, r, (t) => {
          t.frozen = t.kind === 'boss' ? dur * 0.4 : dur;
          w.damage(null, t, 5 * w.avgAllyDmg() * pw, { silent: true });
          if (Math.random() < 0.6) w.fx.particle({ tex: 'ice', x: t.x + rand(-4, 4), y: t.y, z: 0, vz: 30, g: 60, life: dur, s0: 1.6, s1: 1.2, a0: 0.9 });
        });
        break;
      }
      case 2: { // Holy blessing: full heal + shield
        audio.play('bless');
        w.fx.flash(0xfff2a0, 0.35, 0.6);
        const sh = 0.4 + (this.level(i) - 1) * 0.12;
        for (const a of w.allies) {
          if (!a.alive) continue;
          w.healUnit(null, a, a.maxHp, true);
          a.shield = a.maxHp * sh * getMods().skillPow; a.shieldT = 6;
          w.fx.particle({ tex: 'glow', x: a.x, y: a.y - 12, life: 0.8, s0: 0.6, s1: 1, color: 0xfff2a0, add: true, a0: 0.7 });
        }
        break;
      }
      case 3: { // Arcane portal
        audio.play('portal');
        const n = 4 + this.level(i) + Math.floor(getMods().skillPow);
        const x = w.fortX + 60, y = w.gateY;
        w.fx.ring(x, y, 0xb05aff, 70, 0.8);
        w.fx.glow(x, y - 20, 0xb05aff, 3, 0.8);
        const hp = w.avgAllyDmg() * 12 * pw + 60;
        const dmg = w.avgAllyDmg() * 1.2 * pw;
        for (let k = 0; k < n; k++) w.spawnSummon('spectral', x + rand(-10, 30), y + rand(-80, 80), hp * getMods().hp / getMods().dmg, dmg, 15, null);
        break;
      }
    }
    return true;
  }
}
