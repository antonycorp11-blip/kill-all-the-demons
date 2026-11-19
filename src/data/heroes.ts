// Heroes: the human counterpart of bosses. Big units with telegraphed abilities, 1–5 stars, respawn on death.
export type HeroShape = 'circle' | 'multi' | 'rect' | 'cone' | 'field' | 'self' | 'chain';
export type HeroEffect = 'stun' | 'heal' | 'shield' | 'revive' | 'buff' | 'invuln' | 'none';

export interface HeroAbility {
  id: string;
  name: string;
  desc: string;
  shape: HeroShape;
  telegraph: number;
  cd: number;
  dmg: number; // multiplier over hero damage (0 = no damage)
  radius?: number;
  count?: number;
  width?: number;
  length?: number;
  spread?: number;
  star: number; // stars required
  effect?: HeroEffect;
  power?: number;
  duration?: number;
  color: number;
}

export interface HeroDef {
  id: string;
  name: string;
  title: string;
  role: string;
  hp: number; // multiplier over a militia's hp
  dmg: number; // multiplier over a militia's damage
  armor: number;
  range: number;
  atkCd: number;
  speed: number;
  radius: number;
  splash: number;
  ranged: boolean;
  proj?: string;
  projTint?: number;
  aura: number;
  desc: string;
  abilities: HeroAbility[];
}

export const MAX_STARS = 5;

export const HEROES: Record<string, HeroDef> = {
  arthon: {
    id: 'arthon', name: 'Arthon', title: 'o Paladino Solar', role: 'Tanque / Suporte', hp: 28.0, dmg: 2.5, armor: 80, range: 34, atkCd: 1.3, speed: 55, radius: 10, splash: 50, ranged: false, aura: 0xffd24a,
    desc: 'Muralha sagrada. Atordoa grupos e protege o exército com escudos de luz.',
    abilities: [
      { id: 'hammer', name: 'Martelo Solar', desc: 'Golpe em área que atordoa por 1,5s.', shape: 'circle', telegraph: 0.8, cd: 9, dmg: 6, radius: 90, star: 1, effect: 'stun', duration: 1.5, color: 0xffd24a },
      { id: 'aegis', name: 'Égide Solar', desc: 'Aliados próximos recebem escudo de 35% da vida.', shape: 'self', telegraph: 0.5, cd: 16, dmg: 0, radius: 200, star: 3, effect: 'shield', power: 0.35, color: 0xfff2a0 },
      { id: 'judgement', name: 'Julgamento', desc: 'Coluna de luz colossal no maior grupo de demônios.', shape: 'circle', telegraph: 1.2, cd: 22, dmg: 18, radius: 190, star: 5, effect: 'stun', duration: 2, color: 0xffffff },
    ],
  },
  lyra: {
    id: 'lyra', name: 'Lyra', title: 'Arqueira Lunar', role: 'Dano à distância', hp: 14.0, dmg: 2.0, armor: 20, range: 260, atkCd: 0.9, speed: 62, radius: 10, splash: 0, ranged: true, proj: 'arrow', projTint: 0x9affff, aura: 0x8affff,
    desc: 'Dispara três flechas por vez e cobre o campo com chuvas lunares.',
    abilities: [
      { id: 'moonrain', name: 'Chuva Lunar', desc: 'Seis chuvas de flechas sobre os demônios.', shape: 'multi', telegraph: 0.8, cd: 8, dmg: 4, radius: 55, count: 6, star: 1, color: 0x8affff },
      { id: 'starshot', name: 'Flecha Celestial', desc: 'Flecha que atravessa o campo inteiro.', shape: 'rect', telegraph: 0.9, cd: 14, dmg: 12, width: 64, length: 1400, star: 3, color: 0xbfffff },
      { id: 'fullmoon', name: 'Lua Cheia', desc: 'Atinge todos os demônios e os atordoa.', shape: 'field', telegraph: 1.2, cd: 26, dmg: 5, star: 5, effect: 'stun', duration: 1.5, color: 0xd8f0ff },
    ],
  },
  elandra: {
    id: 'elandra', name: 'Elandra', title: 'a Arquimaga', role: 'Magia em área', hp: 11.2, dmg: 2.5, armor: 10, range: 260, atkCd: 1.5, speed: 50, radius: 10, splash: 70, ranged: true, proj: 'orb', projTint: 0xc08aff, aura: 0xb05aff,
    desc: 'Orbes explosivos, tempestades em corrente e meteoros devastadores.',
    abilities: [
      { id: 'storm', name: 'Tempestade Arcana', desc: 'Relâmpago que salta entre 12 demônios.', shape: 'chain', telegraph: 0.5, cd: 7, dmg: 4, count: 12, star: 1, color: 0x9ae0ff },
      { id: 'meteor', name: 'Meteoro', desc: 'Um meteoro gigante cai sobre o maior grupo.', shape: 'circle', telegraph: 1.1, cd: 13, dmg: 14, radius: 140, star: 3, color: 0xff7a2a },
      { id: 'cataclysm', name: 'Cataclismo', desc: 'Chuva de oito meteoros.', shape: 'multi', telegraph: 1.4, cd: 24, dmg: 10, radius: 110, count: 8, star: 5, color: 0xff5a1a },
    ],
  },
  brannoc: {
    id: 'brannoc', name: 'Brannoc', title: 'Senhor da Guerra', role: 'Corpo a corpo', hp: 21.0, dmg: 3.5, armor: 50, range: 34, atkCd: 1.0, speed: 75, radius: 10, splash: 60, ranged: false, aura: 0xff4a3a,
    desc: 'Salta no meio da horda e gira o machado sem parar.',
    abilities: [
      { id: 'leap', name: 'Salto Devastador', desc: 'Salta até um grupo e esmaga tudo ao redor.', shape: 'circle', telegraph: 0.7, cd: 8, dmg: 7, radius: 100, star: 1, color: 0xff6a3a },
      { id: 'whirl', name: 'Redemoinho', desc: 'Gira o machado atingindo tudo ao redor.', shape: 'self', telegraph: 0.4, cd: 12, dmg: 10, radius: 130, star: 3, color: 0xff3a2a },
      { id: 'fury', name: 'Fúria Ancestral', desc: 'Dobra o dano e a velocidade de ataque por 8s.', shape: 'self', telegraph: 0.3, cd: 22, dmg: 0, radius: 60, star: 5, effect: 'buff', duration: 8, color: 0xff2a2a },
    ],
  },
  seraphiel: {
    id: 'seraphiel', name: 'Seraphiel', title: 'Anjo Guardião', role: 'Cura / Ressurreição', hp: 15.4, dmg: 1.25, armor: 30, range: 230, atkCd: 1.4, speed: 60, radius: 10, splash: 30, ranged: true, proj: 'holy', aura: 0xffffff,
    desc: 'Cura o exército inteiro e traz os caídos de volta à batalha.',
    abilities: [
      { id: 'radiance', name: 'Luz Curativa', desc: 'Cura 45% da vida dos aliados em grande área.', shape: 'self', telegraph: 0.5, cd: 8, dmg: 0, radius: 260, star: 1, effect: 'heal', power: 0.45, color: 0xfff6c0 },
      { id: 'rebirth', name: 'Renascer', desc: 'Ressuscita até 8 soldados caídos.', shape: 'self', telegraph: 0.8, cd: 18, dmg: 0, radius: 60, count: 8, star: 3, effect: 'revive', color: 0xffffa0 },
      { id: 'wings', name: 'Asas Celestiais', desc: 'Todo o exército fica quase invulnerável por 4s.', shape: 'self', telegraph: 0.6, cd: 30, dmg: 0, radius: 60, star: 5, effect: 'invuln', duration: 4, color: 0xffffff },
    ],
  },
  kael: {
    id: 'kael', name: 'Kael', title: 'Cavaleiro Dragão', role: 'Investida', hp: 23.8, dmg: 3.0, armor: 60, range: 40, atkCd: 1.1, speed: 85, radius: 10, splash: 55, ranged: false, aura: 0x3affd0,
    desc: 'Atravessa a horda em investidas e cospe fogo de dragão.',
    abilities: [
      { id: 'charge', name: 'Investida Dracônica', desc: 'Atravessa os demônios em linha reta.', shape: 'rect', telegraph: 0.7, cd: 9, dmg: 7, width: 80, length: 520, star: 1, effect: 'stun', duration: 0.8, color: 0x3affd0 },
      { id: 'breath', name: 'Sopro do Dragão', desc: 'Cone de fogo esmeralda.', shape: 'cone', telegraph: 0.9, cd: 13, dmg: 11, length: 380, spread: 0.6, star: 3, color: 0x5aff8a },
      { id: 'skyfall', name: 'Queda do Céu', desc: 'Mergulha do alto sobre o maior grupo.', shape: 'circle', telegraph: 1.1, cd: 22, dmg: 20, radius: 170, star: 5, effect: 'stun', duration: 1.5, color: 0x8affd0 },
    ],
  },
};

export const HERO_ORDER = ['arthon', 'lyra', 'elandra', 'brannoc', 'seraphiel', 'kael'];

export function heroStarMult(stars: number) { return Math.pow(1.45, Math.max(0, stars - 1)); }
