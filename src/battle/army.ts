// Allied army: stats, recruitment, levelling/promotion, formation, legacy and merging.
import { CLASSES, CLASS_ORDER, TIER_MULT, TIER_LEVELS, MAX_LEVEL, tierForLevel, xpForLevel, type ClassId, type Role } from '../data/units';
import { G, traitLv, type UnitSave } from '../core/state';
import { getMods, enemyGoldScale } from '../core/mods';
import { weightedPick, rand } from '../core/util';
import type { Ent } from './types';
import type { World } from './world';

export function levelMult(level: number) { return Math.pow(1.06, level - 1); }

export function allyStats(cls: ClassId, level: number, vet: number) {
  const d = CLASSES[cls];
  const m = getMods();
  const tier = tierForLevel(level);
  const mastery = G.run?.mastery[cls] || 0;
  const k = TIER_MULT[tier] * levelMult(level) * (1 + vet * m.vetBonus) * (1 + mastery * 0.12);
  let dmg = d.dmg * k * m.dmg;
  let speed = d.speed;
  if (cls === 'knight') { dmg *= 1 + traitLv('t_cavalry') * 0.4; speed *= 1 + traitLv('t_cavalry') * 0.4; }
  return {
    tier,
    hp: d.hp * k * m.hp,
    dmg,
    armor: d.armor + m.armor + tier * 8,
    atkCd: d.atkCd / m.atkSpd,
    range: d.range * (d.role === 'ranged' || d.role === 'support' ? 1 + tier * 0.06 : 1),
    speed,
    heal: (d.heal || 0) * k * m.hp * (1 + traitLv('t_chain') * 0.3),
  };
}

export function totalXp(level: number, xp: number) {
  let s = xp;
  for (let l = 1; l < level; l++) s += xpForLevel(l);
  return s;
}

export function availableClasses(): ClassId[] {
  const run = G.run!;
  return CLASS_ORDER.filter((c) => run.unlocked.includes(c) && run.classEnabled[c] !== false);
}

export function recruitCost(w: World, cls: ClassId): number {
  const m = getMods();
  const count = w.armyCount();
  return Math.ceil(4 * CLASSES[cls].cost * Math.pow(enemyGoldScale(w.wave), 0.9) * m.recruitCost * (1 + count * 0.006));
}

export function pickRecruitClass(): ClassId | null {
  const run = G.run!;
  const avail = availableClasses();
  if (!avail.length) return null;
  const roles: Role[] = ['front', 'ranged', 'support', 'special'];
  const valid = roles.filter((r) => avail.some((c) => CLASSES[c].role === r) && run.weights[r] > 0);
  const role = weightedPick(valid, (r) => run.weights[r]) || CLASSES[avail[0]].role;
  const inRole = avail.filter((c) => CLASSES[c].role === role);
  return inRole[Math.floor(Math.random() * inRole.length)] || avail[0];
}

export function applyStats(w: World, e: Ent, keepRatio = true) {
  const s = allyStats(e.cls as ClassId, e.level, e.vet);
  const ratio = keepRatio && e.maxHp > 0 ? e.hp / e.maxHp : 1;
  e.tier = s.tier;
  e.uHp = s.hp;
  e.uDmg = s.dmg;
  e.maxHp = s.hp * e.stack;
  e.hp = Math.max(1, e.maxHp * ratio);
  e.dmg = s.dmg * e.stack;
  e.armor = s.armor;
  e.atkCd = s.atkCd;
  e.range = s.range;
  e.speed = s.speed;
  e.heal = s.heal * e.stack;
  const key = `u_${e.cls}_${e.tier}`;
  if (e.texKey !== key) { e.texKey = key; e.spr?.setTexture(key, 0); }
}

/** Award XP to an allied unit; handles level ups and promotions (visual + behaviour change). */
export function giveXp(w: World, e: Ent, amount: number) {
  if (e.kind !== 'ally' || e.level >= MAX_LEVEL) return;
  e.xp += amount * getMods().xp;
  let leveled = false;
  const oldTier = e.tier;
  while (e.level < MAX_LEVEL && e.xp >= xpForLevel(e.level)) {
    e.xp -= xpForLevel(e.level);
    e.level++;
    leveled = true;
  }
  if (leveled) {
    applyStats(w, e);
    e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.3);
    if (e.tier > oldTier) w.onPromote(e);
    else if (Math.random() < 0.3) w.fx.particle({ tex: 'spark', x: e.x, y: e.y - 30, vz: 30, life: 0.5, s0: 1.5, s1: 0.3, color: 0xffe14a, add: true });
  }
}

export function spawnRecruit(w: World, cls: ClassId, opts: { level?: number; vet?: number; xp?: number; stack?: number; x?: number; y?: number } = {}): Ent | null {
  const run = G.run!;
  const m = getMods();
  // squad aggregation when too many entities are on screen
  if (w.allyEntCount() >= w.entCap()) {
    let best: Ent | null = null;
    for (const a of w.allies) if (a.alive && a.kind === 'ally' && a.cls === cls && a.stack < 40 && (!best || a.stack < best.stack)) best = a;
    if (best) {
      best.stack++;
      const ratio = best.hp / best.maxHp;
      applyStats(w, best, false);
      best.hp = best.maxHp * Math.min(1, ratio + 0.2);
      w.fx.ring(best.x, best.y, 0x8ad0ff, 22, 0.4);
      w.markFormation();
      return best;
    }
  }
  let level = opts.level ?? 1 + m.startLevels;
  let xp = opts.xp ?? 0;
  // Battle Legacy: recruits inherit part of the fallen's experience pool
  const pool = run.legacy[cls] || 0;
  if (pool > 0 && opts.level == null) {
    const take = pool * 0.3;
    run.legacy[cls] = pool - take;
    xp += take;
  }
  const e = w.spawnAlly(cls, level, opts.vet ?? 0, opts.x ?? w.fortX + 14, opts.y ?? w.gateY + rand(-40, 40));
  if (!e) return null;
  e.stack = opts.stack ?? 1;
  if (xp > 0) giveXp(w, e, xp / getMods().xp);
  applyStats(w, e, false);
  run.stats.recruited++;
  w.markFormation();
  return e;
}

export function tryRecruit(w: World, manual: boolean, forcedCls?: ClassId): boolean {
  const run = G.run!;
  if (w.armyCount() >= getMods().cap) { if (manual) w.toast('Exército no limite! Compre Quartéis ou funda tropas.'); return false; }
  const cls = forcedCls || pickRecruitClass();
  if (!cls) return false;
  const cost = recruitCost(w, cls);
  if (run.gold < cost) { if (manual) w.toast('Ouro insuficiente'); return false; }
  run.gold -= cost;
  spawnRecruit(w, cls);
  return true;
}

export function computeFormation(w: World) {
  const run = G.run!;
  const lineX = Math.min(w.frontX - 30, run.stance === 'def' ? w.fortX + 150 : run.stance === 'off' ? w.frontX - 30 : w.fortX + (w.frontX - w.fortX) * 0.6);
  const groups: Record<string, Ent[]> = { front: [], ranged: [], support: [], special: [] };
  for (const a of w.allies) if (a.alive && a.kind === 'ally') groups[a.role].push(a);
  const top = w.fieldTop + 22, bot = w.fieldBot - 22;
  const H = bot - top;
  const place = (list: Ent[], x0: number, dir: number, perCol: number, spacingX: number) => {
    list.sort((a, b) => a.id - b.id);
    const cols = Math.ceil(list.length / perCol);
    list.forEach((e, i) => {
      const col = Math.floor(i / perCol);
      const inCol = col === cols - 1 ? list.length - col * perCol : perCol;
      const row = i % perCol;
      const y = top + (H * (row + 0.5)) / inCol + (col % 2 ? 8 : 0);
      // stable per-unit jitter so lines look organic, not like a spreadsheet
      e.homeX = x0 - dir * col * spacingX + (((e.id * 37) % 13) - 6) * 1.4;
      e.homeY = y + (((e.id * 53) % 9) - 4);
    });
  };
  const perF = Math.max(8, Math.floor(H / 22)), perR = Math.max(7, Math.floor(H / 24)), perS = Math.max(5, Math.floor(H / 32));
  place(groups.front, lineX, 1, perF, 20);
  const frontDepth = Math.ceil(groups.front.length / perF) * 20;
  place(groups.ranged, lineX - frontDepth - 60, 1, perR, 22);
  const rangedDepth = Math.ceil(groups.ranged.length / perR) * 22;
  place(groups.support, lineX - frontDepth - rangedDepth - 70, 1, perS, 20);
  // specials: knights on the flanks ahead, summoners with ranged
  const knights = groups.special.filter((e) => e.cls === 'knight');
  const others = groups.special.filter((e) => e.cls !== 'knight');
  knights.forEach((k, i) => { k.homeX = lineX + 30 + Math.floor(i / 2) * 18; k.homeY = i % 2 ? bot - (i >> 1) * 14 : top + (i >> 1) * 14; });
  place(others, lineX - frontDepth - 40, 1, 12, 20);
}

export function serializeArmy(w: World): UnitSave[] {
  const out: UnitSave[] = [];
  for (const a of w.allies) if (a.alive && a.kind === 'ally') out.push({ cls: a.cls as ClassId, level: a.level, xp: Math.floor(a.xp), vet: a.vet, stack: a.stack });
  return out;
}

/** Merge three units of the same class & tier into one of the next tier. */
export function mergeTrio(w: World, cls: ClassId): boolean {
  const byTier: Ent[][] = [[], [], [], []];
  for (const a of w.allies) if (a.alive && a.kind === 'ally' && a.cls === cls && a.stack === 1) byTier[a.tier].push(a);
  for (let t = 0; t < 3; t++) {
    if (byTier[t].length >= 3) {
      const trio = byTier[t].sort((a, b) => b.level - a.level).slice(0, 3);
      const keep = trio[0];
      const vet = Math.max(...trio.map((e) => e.vet));
      for (let i = 1; i < 3; i++) w.removeAlly(trio[i]);
      keep.level = Math.max(keep.level, TIER_LEVELS[t + 1]);
      keep.xp = 0;
      keep.vet = vet;
      applyStats(w, keep, false);
      w.onPromote(keep);
      w.markFormation();
      return true;
    }
  }
  return false;
}

export function mergeCandidates(w: World, cls: ClassId): number {
  const byTier = [0, 0, 0, 0];
  for (const a of w.allies) if (a.alive && a.kind === 'ally' && a.cls === cls && a.stack === 1) byTier[a.tier]++;
  return Math.floor(byTier[0] / 3) + Math.floor(byTier[1] / 3) + Math.floor(byTier[2] / 3);
}
