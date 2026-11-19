export type EnemyId = 'imp' | 'hound' | 'brute' | 'archer' | 'sorcerer' | 'flyer' | 'bomber' | 'shaman' | 'summoner' | 'elite';
export type EnemyBehavior = 'melee' | 'runner' | 'ranged' | 'caster' | 'flyer' | 'bomber' | 'healer' | 'summoner';

export interface EnemyDef {
  id: EnemyId;
  name: string;
  behavior: EnemyBehavior;
  hp: number;
  dmg: number;
  armor: number;
  range: number;
  atkCd: number;
  speed: number;
  radius: number;
  gold: number;
  xp: number;
  siege: number; // damage to fortress per hit
  large?: boolean;
  flying?: boolean;
  flank?: boolean;
  desc: string;
}

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  imp: { id: 'imp', name: 'Diabrete', behavior: 'melee', hp: 15, dmg: 2.5, armor: 0, range: 16, atkCd: 0.9, speed: 62, radius: 6, gold: 1, xp: 2, siege: 2.5,
    desc: 'Rápido, fraco e sempre em bando.' },
  hound: { id: 'hound', name: 'Cão Infernal', behavior: 'runner', hp: 22, dmg: 4, armor: 5, range: 16, atkCd: 0.8, speed: 120, radius: 7, gold: 2, xp: 3, siege: 5.0, flank: true,
    desc: 'Ignora tropas e corre direto para a fortaleza pelos flancos.' },
  brute: { id: 'brute', name: 'Bruto', behavior: 'melee', hp: 110, dmg: 10, armor: 30, range: 22, atkCd: 1.6, speed: 34, radius: 12, gold: 6, xp: 8, siege: 15.0, large: true,
    desc: 'Montanha de músculos e chifres. Lento e resistente.' },
  archer: { id: 'archer', name: 'Arqueiro Infernal', behavior: 'ranged', hp: 24, dmg: 5, armor: 2, range: 200, atkCd: 1.6, speed: 48, radius: 6, gold: 3, xp: 3, siege: 5.0,
    desc: 'Lança flechas de fogo por trás das linhas.' },
  sorcerer: { id: 'sorcerer', name: 'Feiticeiro', behavior: 'caster', hp: 30, dmg: 9, armor: 2, range: 190, atkCd: 2.6, speed: 42, radius: 6, gold: 4, xp: 5, siege: 7.5,
    desc: 'Conjura explosões sombrias em área.' },
  flyer: { id: 'flyer', name: 'Gárgula Alada', behavior: 'flyer', hp: 28, dmg: 5, armor: 5, range: 18, atkCd: 1.0, speed: 80, radius: 7, gold: 3, xp: 4, siege: 7.5, flying: true, flank: true,
    desc: 'Voa por cima da linha. Ataques corpo a corpo causam metade do dano.' },
  bomber: { id: 'bomber', name: 'Diabrete Explosivo', behavior: 'bomber', hp: 20, dmg: 22, armor: 0, range: 14, atkCd: 1, speed: 74, radius: 6, gold: 2, xp: 3, siege: 20.0,
    desc: 'Corre até grupos de soldados e explode.' },
  shaman: { id: 'shaman', name: 'Xamã Profano', behavior: 'healer', hp: 34, dmg: 3, armor: 4, range: 160, atkCd: 2.0, speed: 40, radius: 6, gold: 5, xp: 5, siege: 5.0,
    desc: 'Cura demônios próximos. Prioridade máxima.' },
  summoner: { id: 'summoner', name: 'Invocador Abissal', behavior: 'summoner', hp: 46, dmg: 4, armor: 6, range: 170, atkCd: 6.0, speed: 36, radius: 7, gold: 7, xp: 7, siege: 7.5,
    desc: 'Abre fendas que vomitam diabretes.' },
  elite: { id: 'elite', name: 'Cavaleiro Infernal', behavior: 'melee', hp: 260, dmg: 18, armor: 60, range: 24, atkCd: 1.3, speed: 44, radius: 11, gold: 16, xp: 18, siege: 25.0, large: true,
    desc: 'Elite blindada das legiões. Golpes devastadores.' },
};

export const ENEMY_ORDER: EnemyId[] = ['imp', 'hound', 'archer', 'brute', 'flyer', 'bomber', 'sorcerer', 'shaman', 'summoner', 'elite'];
