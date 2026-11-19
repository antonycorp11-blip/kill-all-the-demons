// Derived modifiers combining expedition upgrades, blessings, permanent tree and ascension shards.
import { G, treeLv, upLv, traitLv } from './state';

export interface Mods {
  dmg: number; hp: number; armor: number; atkSpd: number; crit: number; critDmg: number; aoe: number; regen: number;
  xp: number; gold: number; fortMax: number; fortRegen: number; recruitInterval: number; recruitCost: number; cap: number;
  legacy: number; vetBonus: number; essence: number; skillPow: number; skillCd: number; bossDmg: number; largeDmg: number;
  startLevels: number; frontDR: number; meleeSplash: number; fortBetween: number; interest: number; blessChoices: number;
}

let cached: Mods | null = null;
export function invalidateMods() { cached = null; }

export function shardMult() { return 1 + 0.1 * G.meta.shards; }

export function getMods(): Mods {
  if (cached) return cached;
  const sh = shardMult();
  const m: Mods = {
    dmg: Math.pow(1.11, upLv('dmg')) * Math.pow(1.2, treeLv('m_dmg')) * (1 + 0.2 * traitLv('t_fury')) * sh,
    hp: Math.pow(1.1, upLv('hp')) * Math.pow(1.2, treeLv('m_hp')) * (1 + 0.2 * traitLv('t_iron')) * sh,
    armor: upLv('armor') * 6 + treeLv('m_armor') * 8,
    atkSpd: 1 + upLv('atkspd') * 0.05 + traitLv('t_haste') * 0.1,
    crit: 0.05 + upLv('crit') * 0.02 + treeLv('m_crit') * 0.02 + traitLv('t_crit') * 0.06,
    critDmg: 1.5 + upLv('critdmg') * 0.2 + traitLv('t_crit') * 0.3,
    aoe: 1 + upLv('aoe') * 0.1 + treeLv('m_aoe') * 0.12,
    regen: upLv('regen') * 0.002 + traitLv('t_regen') * 0.005,
    xp: (1 + upLv('xp') * 0.12) * (1 + treeLv('m_xp') * 0.15),
    gold: (1 + upLv('gold') * 0.08) * Math.pow(1.15, treeLv('m_gold')) * (1 + 0.25 * traitLv('t_loot')) * sh,
    fortMax: 500 * Math.pow(1.12, upLv('fort')) * Math.pow(1.25, treeLv('m_fort')) * (1 + 0.25 * traitLv('t_wall')),
    fortRegen: upLv('fregen') * 0.002,
    recruitInterval: 4.2 * Math.pow(0.92, upLv('recruit')) * (1 - treeLv('m_recruit') * 0.06) * Math.pow(0.85, traitLv('t_horde')),
    recruitCost: Math.pow(0.95, upLv('rcost')),
    cap: 6 + upLv('cap') * 3 + treeLv('m_cap') * 3 + traitLv('t_horde') * 5,
    legacy: (0.06 + treeLv('m_legacy') * 0.04) * (traitLv('t_legacy') ? 2 : 1),
    vetBonus: 0.03 + treeLv('m_vet') * 0.01,
    essence: Math.pow(1.15, treeLv('m_essence')) * sh,
    skillPow: (1 + treeLv('m_skill') * 0.25),
    skillCd: 1 - treeLv('m_skillcd') * 0.05,
    bossDmg: 1 + treeLv('m_boss') * 0.2 + traitLv('t_slayer') * 0.35,
    largeDmg: 1 + traitLv('t_slayer') * 0.35,
    startLevels: treeLv('m_elite') + traitLv('t_vets') * 2,
    frontDR: traitLv('t_phalanx') * 0.15,
    meleeSplash: traitLv('t_blast') * 0.25,
    fortBetween: 0.1 + treeLv('m_fregen') * 0.04,
    interest: treeLv('m_interest') * 0.01,
    blessChoices: 3 + treeLv('m_bless'),
  };
  m.recruitInterval = Math.max(0.35, m.recruitInterval);
  cached = m;
  return m;
}

// Wave scaling curves -----------------------------------------------------
export function enemyHpScale(wave: number) { return Math.pow(1.165, wave - 1) * Math.pow(1.05, Math.max(0, wave - 12)) * Math.pow(1.03, Math.max(0, wave - 30)) * (1 + wave * 0.01); }
export function enemyDmgScale(wave: number) { return Math.pow(1.18, wave - 1) * Math.pow(1.02, Math.max(0, wave - 12)); }
export function enemyGoldScale(wave: number) { return Math.pow(1.125, wave - 1); }
export function enemyArmorAdd(wave: number) { return Math.min(80, wave * 0.8); }
export function siegeScale(wave: number) { return Math.pow(enemyDmgScale(wave), 0.85); }

export function essenceForRun(wave: number, kills: number, bossKills: number): number {
  const base = 2 * Math.pow(1.115, Math.max(0, wave - 1)) + kills * 0.02 + bossKills * 8;
  return Math.floor(base * getMods().essence);
}

export function ascensionShardsAvailable(): number {
  const pot = Math.floor(Math.pow(Math.max(0, G.meta.bestWave - 20) / 10, 1.6));
  return Math.max(0, pot - G.meta.shardsTotal);
}
