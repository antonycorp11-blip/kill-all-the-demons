// Allied unit classes. All values are tier-1 baselines; tiers/levels/upgrades scale them.
export type ClassId = 'militia' | 'swordsman' | 'guardian' | 'lancer' | 'archer' | 'mage' | 'healer' | 'knight' | 'summoner';
export type Role = 'front' | 'ranged' | 'support' | 'special';

export interface TierInfo {
  name: string;
  desc: string; // what changes in battle
}

export interface ClassDef {
  id: ClassId;
  name: string;
  role: Role;
  hp: number;
  dmg: number;
  armor: number; // armor points -> reduction = a/(a+100)
  range: number;
  atkCd: number;
  speed: number;
  radius: number;
  cost: number; // recruit cost multiplier
  unlockGold: number; // in-run unlock cost (0 = always available)
  bonusLarge?: number;
  heal?: number;
  desc: string;
  tiers: TierInfo[];
}

export const TIER_MULT = [1, 1.6, 2.6, 4.2];
export const TIER_LEVELS = [1, 6, 14, 24]; // level at which tier index is reached
export const MAX_LEVEL = 40;

export const CLASSES: Record<ClassId, ClassDef> = {
  militia: {
    id: 'militia', name: 'Miliciano', role: 'front', hp: 50, dmg: 7, armor: 5, range: 20, atkCd: 1.0, speed: 52, radius: 7,
    cost: 1, unlockGold: 0,
    desc: 'Camponês convocado às pressas. Fraco sozinho, perigoso em bando.',
    tiers: [
      { name: 'Miliciano', desc: 'Forcado simples.' },
      { name: 'Soldado', desc: 'Espada e cota de malha. +Dano.' },
      { name: 'Veterano', desc: 'Escudo: bloqueia 25% dos golpes.' },
      { name: 'Campeão', desc: 'Golpe em arco atinge até 3 inimigos.' },
    ],
  },
  swordsman: {
    id: 'swordsman', name: 'Espadachim', role: 'front', hp: 55, dmg: 9, armor: 8, range: 20, atkCd: 0.72, speed: 64, radius: 7,
    cost: 1.6, unlockGold: 60,
    desc: 'Duelista ágil, ataques rápidos e precisos.',
    tiers: [
      { name: 'Espadachim', desc: 'Ataques rápidos.' },
      { name: 'Lâmina Dupla', desc: 'Ataca duas vezes por golpe.' },
      { name: 'Mestre de Lâminas', desc: 'A cada 4 golpes, giro em área.' },
      { name: 'Santo da Espada', desc: 'Investe contra alvos distantes e crita mais.' },
    ],
  },
  guardian: {
    id: 'guardian', name: 'Guardião', role: 'front', hp: 150, dmg: 5, armor: 45, range: 20, atkCd: 1.25, speed: 42, radius: 8,
    cost: 2.2, unlockGold: 140,
    desc: 'Muralha viva. Segura a linha para os demais.',
    tiers: [
      { name: 'Guardião', desc: 'Muita vida e armadura.' },
      { name: 'Provocador', desc: 'Provoca inimigos próximos para atacá-lo.' },
      { name: 'Bastião', desc: 'Aura: aliados próximos sofrem -25% de dano.' },
      { name: 'Égide Sagrada', desc: 'Domo que reduz 60% do dano de habilidades de chefes.' },
    ],
  },
  lancer: {
    id: 'lancer', name: 'Lanceiro', role: 'front', hp: 70, dmg: 11, armor: 12, range: 40, atkCd: 1.1, speed: 54, radius: 7,
    cost: 2, unlockGold: 220, bonusLarge: 1.8,
    desc: 'Alcance de lança, especialista contra brutos e chefes.',
    tiers: [
      { name: 'Lanceiro', desc: '+80% de dano contra grandes.' },
      { name: 'Perfurador', desc: 'Estocada atravessa 2 inimigos em linha.' },
      { name: 'Falange', desc: 'Empurra inimigos para trás ao golpear.' },
      { name: 'Empalador', desc: '+200% contra grandes e chefes.' },
    ],
  },
  archer: {
    id: 'archer', name: 'Arqueiro', role: 'ranged', hp: 34, dmg: 8, armor: 3, range: 230, atkCd: 1.1, speed: 54, radius: 6,
    cost: 1.8, unlockGold: 40,
    desc: 'Atira de longe. Única defesa sólida contra voadores.',
    tiers: [
      { name: 'Arqueiro', desc: 'Flechas certeiras.' },
      { name: 'Atirador', desc: 'Dispara 2 flechas.' },
      { name: 'Rastreador', desc: '3 flechas perfurantes.' },
      { name: 'Olho de Falcão', desc: 'Chuva de flechas em área a cada 5s.' },
    ],
  },
  mage: {
    id: 'mage', name: 'Mago', role: 'ranged', hp: 30, dmg: 13, armor: 2, range: 210, atkCd: 1.75, speed: 50, radius: 6,
    cost: 2.6, unlockGold: 320,
    desc: 'Orbes arcanos que explodem em área.',
    tiers: [
      { name: 'Aprendiz', desc: 'Explosão pequena.' },
      { name: 'Mago', desc: 'Explosão maior.' },
      { name: 'Arquimago', desc: 'Relâmpago em corrente (4 saltos).' },
      { name: 'Astromante', desc: 'Invoca meteoros a cada 6s.' },
    ],
  },
  healer: {
    id: 'healer', name: 'Curandeiro', role: 'support', hp: 40, dmg: 3, armor: 4, range: 170, atkCd: 1.4, speed: 50, radius: 6,
    cost: 2.4, unlockGold: 260, heal: 9,
    desc: 'Mantém os aliados de pé.',
    tiers: [
      { name: 'Acólito', desc: 'Cura o aliado mais ferido.' },
      { name: 'Clérigo', desc: 'Cura em corrente (3 alvos).' },
      { name: 'Sacerdote', desc: 'Aura de regeneração constante.' },
      { name: 'Santo', desc: 'Ressuscita um aliado caído a cada 8s.' },
    ],
  },
  knight: {
    id: 'knight', name: 'Cavaleiro', role: 'special', hp: 170, dmg: 16, armor: 30, range: 24, atkCd: 1.2, speed: 92, radius: 10,
    cost: 4, unlockGold: 600,
    desc: 'Cavalaria pesada que flanqueia e atropela.',
    tiers: [
      { name: 'Cavaleiro', desc: 'Rápido e resistente.' },
      { name: 'Paladino', desc: 'Investida atordoa o alvo.' },
      { name: 'Cruzado', desc: 'Atropela tudo no caminho.' },
      { name: 'Lança Divina', desc: 'Golpes de luz em área.' },
    ],
  },
  summoner: {
    id: 'summoner', name: 'Invocador', role: 'special', hp: 45, dmg: 6, armor: 4, range: 180, atkCd: 1.6, speed: 48, radius: 6,
    cost: 3.5, unlockGold: 480,
    desc: 'Convoca espíritos guerreiros para a batalha.',
    tiers: [
      { name: 'Invocador', desc: 'Invoca 1 espírito a cada 7s.' },
      { name: 'Conjurador', desc: 'Invoca 2 espíritos.' },
      { name: 'Necroluz', desc: 'Invoca espíritos arqueiros.' },
      { name: 'Senhor dos Espíritos', desc: 'Invoca um Golem colossal.' },
    ],
  },
};

export const CLASS_ORDER: ClassId[] = ['militia', 'archer', 'swordsman', 'guardian', 'healer', 'lancer', 'mage', 'summoner', 'knight'];
export const ROLE_NAMES: Record<Role, string> = { front: 'Linha de frente', ranged: 'Dano à distância', support: 'Suporte', special: 'Especiais' };

export function tierForLevel(level: number): number {
  let t = 0;
  for (let i = 0; i < TIER_LEVELS.length; i++) if (level >= TIER_LEVELS[i]) t = i;
  return t;
}

export function xpForLevel(level: number): number {
  return Math.floor(5 * Math.pow(1.2, level - 1));
}
