import type { ClassId, Role } from '../data/units';
import { CLASSES, CLASS_ORDER } from '../data/units';
import { META_NODES, TRAITS, UPGRADES } from '../data/upgrades';
import { WAVES_PER_REGION } from '../data/regions';

export const SAVE_KEY = 'katd_save';
export const SAVE_VERSION = 2;

export interface Settings {
  speed: number;
  music: boolean;
  sfx: boolean;
  musicVol: number;
  sfxVol: number;
  dmgNumbers: boolean;
  quality: 'low' | 'med' | 'high';
  shake: boolean;
}

export interface MetaState {
  essence: number;
  essenceTotal: number;
  tree: Record<string, number>;
  maxRegion: number;
  bestWave: number;
  runs: number;
  ascensions: number;
  shards: number;
  shardsTotal: number;
  seenEnemies: string[];
  seenBosses: string[];
  tutorialDone: boolean;
  totalKills: number;
}

export interface UnitSave { cls: ClassId; level: number; xp: number; vet: number; stack: number }

export interface RunStats { kills: number; gold: number; bossKills: number; dmg: number; lost: number; recruited: number; time: number; regionsCleared: number }

export interface RunState {
  active: boolean;
  wave: number;
  startWave: number;
  gold: number;
  fortHp: number;
  upgrades: Record<string, number>;
  mastery: Record<string, number>;
  unlocked: ClassId[];
  weights: Record<Role, number>;
  classEnabled: Record<string, boolean>;
  stance: 'def' | 'bal' | 'off';
  autoRecruit: boolean;
  autoBless: boolean;
  autoSkills: boolean;
  armyLevel: number;
  armyXp: number;
  pendingBless: number;
  traits: Record<string, number>;
  skillLv: number[];
  legacy: Record<string, number>;
  stats: RunStats;
  essenceEarned: number;
  army: UnitSave[];
  modifier: string | null;
  heroes: Record<string, number>; // hero id -> stars (owned)
  demo?: boolean;
}

export interface GameData {
  version: number;
  meta: MetaState;
  settings: Settings;
  run: RunState | null;
  savedAt: number;
}

export function defaultSettings(): Settings {
  return { speed: 1, music: true, sfx: true, musicVol: 0.5, sfxVol: 0.7, dmgNumbers: true, quality: 'high', shake: true };
}

export function defaultMeta(): MetaState {
  return {
    essence: 0, essenceTotal: 0, tree: {}, maxRegion: 0, bestWave: 0, runs: 0, ascensions: 0, shards: 0, shardsTotal: 0,
    seenEnemies: [], seenBosses: [], tutorialDone: false, totalKills: 0,
  };
}

export const G: GameData = { version: SAVE_VERSION, meta: defaultMeta(), settings: defaultSettings(), run: null, savedAt: Date.now() };

export function treeLv(id: string): number {
  return G.meta.tree[id] || 0;
}

export function newRun(startRegion: number): RunState {
  const unlocked: ClassId[] = ['militia', 'archer'];
  for (const n of META_NODES) if (n.unlockClass && treeLv(n.id) > 0 && !unlocked.includes(n.unlockClass)) unlocked.push(n.unlockClass);
  const mastery: Record<string, number> = {};
  for (const c of CLASS_ORDER) mastery[c] = treeLv('m_mastery');
  const classEnabled: Record<string, boolean> = {};
  for (const c of CLASS_ORDER) classEnabled[c] = true;
  const startWave = startRegion * WAVES_PER_REGION + 1;
  const startGold = Math.floor(40 * Math.pow(1.8, treeLv('m_startgold')) - 40) + 20 + (startRegion > 0 ? Math.floor(25 * startWave * Math.pow(1.125, startWave - 1)) : 0);
  return {
    active: true, wave: startWave, startWave, gold: startGold, fortHp: -1, upgrades: {}, mastery, unlocked,
    weights: { front: 40, ranged: 35, support: 15, special: 10 }, classEnabled, stance: 'bal', autoRecruit: true, autoBless: false, autoSkills: true,
    armyLevel: 1, armyXp: 0, pendingBless: 0, traits: {}, skillLv: [0, 0, 0, 0], legacy: {},
    stats: { kills: 0, gold: 0, bossKills: 0, dmg: 0, lost: 0, recruited: 0, time: 0, regionsCleared: 0 },
    essenceEarned: 0, army: [], modifier: null, heroes: startHeroes(),
  };
}

function startHeroes(): Record<string, number> {
  if (treeLv('h_start') <= 0) return {};
  const ids = ['arthon', 'lyra', 'elandra', 'brannoc', 'seraphiel', 'kael'];
  return { [ids[Math.floor(Math.random() * ids.length)]]: 1 + treeLv('h_stars') };
}

export function upLv(id: string): number {
  return G.run?.upgrades[id] || 0;
}
export function traitLv(id: string): number {
  return G.run?.traits[id] || 0;
}

export function armyXpNeeded(level: number) {
  return Math.floor(20 * Math.pow(1.38, level - 1));
}

// --------------- Save / Load (versioned) ---------------
export function save() {
  try {
    G.savedAt = Date.now();
    const data = G.run && G.run.demo ? { ...G, run: null } : G;
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) {
    /* storage unavailable */
  }
}

export function load(): boolean {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw) as Partial<GameData>;
    migrate(data);
    G.meta = { ...defaultMeta(), ...(data.meta || {}) };
    G.settings = { ...defaultSettings(), ...(data.settings || {}) };
    G.run = data.run && data.run.active ? sanitizeRun(data.run) : null;
    G.savedAt = data.savedAt || Date.now();
    return true;
  } catch (e) {
    return false;
  }
}

function migrate(data: any) {
  const v = data.version || 1;
  if (v < 2) {
    // v1 stored settings.speed as string
    if (data.settings && typeof data.settings.speed === 'string') data.settings.speed = parseInt(data.settings.speed) || 1;
  }
  data.version = SAVE_VERSION;
}

function sanitizeRun(r: RunState): RunState {
  const base = newRun(0);
  const out = { ...base, ...r, stats: { ...base.stats, ...(r.stats || {}) } };
  out.unlocked = (out.unlocked || ['militia']).filter((c) => c in CLASSES);
  for (const u of UPGRADES) if (out.upgrades[u.id] == null) out.upgrades[u.id] = 0;
  for (const k of Object.keys(out.traits)) if (!TRAITS.find((t) => t.id === k)) delete out.traits[k];
  out.army = (out.army || []).filter((u) => u && u.cls in CLASSES);
  out.heroes = out.heroes || {};
  return out;
}

export function wipeSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* */ }
}
