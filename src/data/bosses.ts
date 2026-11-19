import type { EnemyId } from './enemies';

export type AbilityShape = 'circle' | 'cone' | 'rect' | 'multi' | 'wave' | 'field';
export type AbilityTarget = 'cluster' | 'self' | 'random' | 'fortress' | 'army';

export interface BossAbility {
  id: string;
  name: string;
  shape: AbilityShape;
  target: AbilityTarget;
  telegraph: number; // seconds of wind-up
  cd: number;
  dmg: number; // multiplier over wave base damage
  radius?: number;
  length?: number;
  spread?: number; // cone half-angle (rad)
  width?: number;
  count?: number;
  summon?: { id: EnemyId; count: number };
  fortress?: number; // fortress siege multiplier
  healPct?: number;
  wipe?: boolean;
  minPhase: number;
  color: number;
  fx: 'roots' | 'slam' | 'fire' | 'poison' | 'dark' | 'holy' | 'meteor' | 'water' | 'void';
}

export interface BossDef {
  id: string;
  name: string;
  title: string;
  hp: number; // multiplier over wave hp scale
  dmg: number;
  armor: number;
  speed: number;
  range: number;
  atkCd: number;
  radius: number;
  scale: number;
  flying?: boolean;
  holdX: number; // fraction of field width the boss advances to
  desc: string;
  abilities: BossAbility[];
}

export const BOSSES: Record<string, BossDef> = {
  mordrak: {
    id: 'mordrak', name: 'Mordrak', title: 'o Tronco Podre', hp: 70, dmg: 6, armor: 40, speed: 18, range: 60, atkCd: 2.2, radius: 34, scale: 2.4, holdX: 0.55,
    desc: 'Um carvalho ancestral possuído pela fenda. Suas raízes alcançam o exército inteiro.',
    abilities: [
      { id: 'spores', name: 'Esporos Pútridos', shape: 'circle', target: 'cluster', telegraph: 1.6, cd: 7, dmg: 10, radius: 70, minPhase: 0, color: 0x8aff3a, fx: 'poison' },
      { id: 'call', name: 'Chamado da Floresta', shape: 'circle', target: 'self', telegraph: 1.2, cd: 14, dmg: 0, radius: 60, summon: { id: 'imp', count: 6 }, minPhase: 0, color: 0xff3a5c, fx: 'dark' },
      { id: 'roots', name: 'Raízes da Ruína', shape: 'field', target: 'army', telegraph: 3.2, cd: 22, dmg: 40, minPhase: 0, wipe: true, color: 0xff2a2a, fx: 'roots' },
    ],
  },
  vulgrath: {
    id: 'vulgrath', name: 'Vulgrath', title: 'Carrasco de Cinzas', hp: 80, dmg: 9, armor: 60, speed: 26, range: 60, atkCd: 2.0, radius: 30, scale: 2.4, holdX: 0.5,
    desc: 'O executor das legiões. Seu machado parte formações ao meio.',
    abilities: [
      { id: 'leap', name: 'Salto Esmagador', shape: 'circle', target: 'cluster', telegraph: 1.5, cd: 8, dmg: 14, radius: 85, minPhase: 0, color: 0xff7a2a, fx: 'slam' },
      { id: 'siege', name: 'Arremesso de Brasas', shape: 'circle', target: 'fortress', telegraph: 2.0, cd: 13, dmg: 6, radius: 60, fortress: 14, minPhase: 0, color: 0xff5a1a, fx: 'fire' },
      { id: 'axe', name: 'Machado do Fim', shape: 'cone', target: 'army', telegraph: 3.0, cd: 20, dmg: 45, length: 900, spread: 0.62, minPhase: 0, wipe: true, color: 0xff2a1a, fx: 'fire' },
    ],
  },
  ssaelith: {
    id: 'ssaelith', name: 'Ssaelith', title: 'Rainha do Lodo', hp: 85, dmg: 7, armor: 50, speed: 22, range: 160, atkCd: 1.8, radius: 30, scale: 2.4, holdX: 0.62,
    desc: 'Serpente-bruxa que ergue as almas do pântano em marés assassinas.',
    abilities: [
      { id: 'venom', name: 'Poças de Veneno', shape: 'multi', target: 'random', telegraph: 1.6, cd: 7, dmg: 9, radius: 50, count: 5, minPhase: 0, color: 0x5affb0, fx: 'poison' },
      { id: 'mend', name: 'Lodo Restaurador', shape: 'circle', target: 'self', telegraph: 1.5, cd: 15, dmg: 0, radius: 200, healPct: 0.06, minPhase: 0, color: 0x3aff8a, fx: 'water' },
      { id: 'tide', name: 'Maré de Almas', shape: 'wave', target: 'army', telegraph: 3.0, cd: 21, dmg: 42, minPhase: 0, wipe: true, color: 0x3affd0, fx: 'water' },
    ],
  },
  kaedros: {
    id: 'kaedros', name: 'Sir Kaedros', title: 'o Profanado', hp: 95, dmg: 10, armor: 90, speed: 30, range: 50, atkCd: 1.6, radius: 26, scale: 2.4, holdX: 0.48,
    desc: 'Antigo campeão da humanidade, corrompido. Conhece cada formação que você usa.',
    abilities: [
      { id: 'charge', name: 'Investida Sombria', shape: 'rect', target: 'cluster', telegraph: 1.6, cd: 9, dmg: 16, width: 70, length: 700, minPhase: 0, color: 0xb05aff, fx: 'dark' },
      { id: 'raise', name: 'Erguer os Caídos', shape: 'circle', target: 'self', telegraph: 1.4, cd: 16, dmg: 0, radius: 60, summon: { id: 'elite', count: 2 }, minPhase: 0, color: 0x8a3aff, fx: 'dark' },
      { id: 'judgement', name: 'Julgamento Profano', shape: 'multi', target: 'army', telegraph: 2.8, cd: 19, dmg: 46, radius: 120, count: 6, minPhase: 0, wipe: true, color: 0xd05aff, fx: 'void' },
    ],
  },
  ignar: {
    id: 'ignar', name: 'Ignar', title: 'Dragão Abissal', hp: 100, dmg: 12, armor: 70, speed: 30, range: 220, atkCd: 2.2, radius: 34, scale: 2.4, flying: true, holdX: 0.66,
    desc: 'Dragão de cinzas e lava. Seu sopro transforma exércitos em pó.',
    abilities: [
      { id: 'rain', name: 'Chuva de Cinzas', shape: 'multi', target: 'random', telegraph: 1.4, cd: 6, dmg: 12, radius: 55, count: 7, minPhase: 0, color: 0xff7a1a, fx: 'meteor' },
      { id: 'fireball', name: 'Bola de Magma', shape: 'circle', target: 'fortress', telegraph: 2.2, cd: 12, dmg: 8, radius: 70, fortress: 18, minPhase: 0, color: 0xff3a0a, fx: 'fire' },
      { id: 'breath', name: 'Sopro Abissal', shape: 'cone', target: 'army', telegraph: 3.0, cd: 18, dmg: 50, length: 1000, spread: 0.7, minPhase: 0, wipe: true, color: 0xff2a00, fx: 'fire' },
    ],
  },
  azhgore: {
    id: 'azhgore', name: 'Azhgore', title: 'Senhor da Fenda', hp: 120, dmg: 14, armor: 110, speed: 24, range: 90, atkCd: 1.8, radius: 40, scale: 2.6, holdX: 0.6,
    desc: 'O soberano do abismo. Quando ele desperta, o mundo inteiro treme.',
    abilities: [
      { id: 'meteor', name: 'Meteoros da Fenda', shape: 'multi', target: 'cluster', telegraph: 1.5, cd: 7, dmg: 14, radius: 70, count: 4, minPhase: 0, color: 0xff3a5a, fx: 'meteor' },
      { id: 'legion', name: 'Portal da Legião', shape: 'circle', target: 'self', telegraph: 1.5, cd: 15, dmg: 0, radius: 70, summon: { id: 'elite', count: 3 }, minPhase: 0, color: 0xff2a4a, fx: 'void' },
      { id: 'throne', name: 'Fogo do Trono', shape: 'circle', target: 'fortress', telegraph: 2.0, cd: 13, dmg: 10, radius: 80, fortress: 22, minPhase: 1, color: 0xff1a1a, fx: 'fire' },
      { id: 'annihilate', name: 'Aniquilação da Fenda', shape: 'field', target: 'army', telegraph: 3.4, cd: 20, dmg: 60, minPhase: 0, wipe: true, color: 0xff0a3a, fx: 'void' },
    ],
  },
};

export const BOSS_ORDER = ['mordrak', 'vulgrath', 'ssaelith', 'kaedros', 'ignar', 'azhgore'];
