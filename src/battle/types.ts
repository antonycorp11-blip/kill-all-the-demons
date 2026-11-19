import type Phaser from 'phaser';

export type Kind = 'ally' | 'summon' | 'enemy' | 'boss';

export interface Ent {
  id: number;
  alive: boolean;
  team: 0 | 1;
  kind: Kind;
  cls: string;
  behavior: string;
  tier: number;
  level: number;
  xp: number;
  vet: number;
  stack: number;
  x: number; y: number; z: number;
  vx: number; vy: number;
  homeX: number; homeY: number;
  laneY: number;
  r: number;
  hp: number; maxHp: number; dmg: number; armor: number;
  range: number; atkCd: number; atkT: number; speed: number;
  target: Ent | null;
  retarget: number;
  spr: Phaser.GameObjects.Sprite | null;
  shd: Phaser.GameObjects.Image | null;
  aura: Phaser.GameObjects.Image | null;
  flag: Phaser.GameObjects.Image | null;
  texKey: string;
  scale: number;
  originY: number;
  facing: number;
  anim: number;
  atkAnim: number;
  hurt: number;
  large: boolean;
  flying: boolean;
  abilT: number;
  counter: number;
  frozen: number;
  stun: number;
  shield: number; shieldT: number;
  burn: number; burnDps: number;
  life: number;
  gold: number; xpVal: number; siege: number;
  atWall: boolean;
  tauntT: number;
  auraDR: number;
  miniboss: boolean;
  starT: number;
  chargeReady: boolean;
  trampleT: number;
  summons: number;
  owner: Ent | null;
  heal: number;
  uHp: number; // per-member max hp (squads)
  uDmg: number; // per-member damage
  role: string;
  dead: number; // corpse timer for death anim
}

export function blankEnt(): Ent {
  return {
    id: 0, alive: false, team: 0, kind: 'ally', cls: '', behavior: 'melee', tier: 0, level: 1, xp: 0, vet: 0, stack: 1,
    x: 0, y: 0, z: 0, vx: 0, vy: 0, homeX: 0, homeY: 0, laneY: 0, r: 7,
    hp: 1, maxHp: 1, dmg: 1, armor: 0, range: 20, atkCd: 1, atkT: 0, speed: 50,
    target: null, retarget: 0, spr: null, shd: null, aura: null, flag: null, texKey: '', scale: 2, originY: 0.9, facing: 1,
    anim: 0, atkAnim: 0, hurt: 0, large: false, flying: false, abilT: 0, counter: 0, frozen: 0, stun: 0, shield: 0, shieldT: 0,
    burn: 0, burnDps: 0, life: -1, gold: 0, xpVal: 0, siege: 0, atWall: false, tauntT: 0, auraDR: 0, miniboss: false, starT: 0,
    chargeReady: true, trampleT: 0, summons: 0, owner: null, heal: 0, uHp: 1, uDmg: 1, role: 'front', dead: 0,
  };
}

export interface DeadAlly { cls: string; level: number; x: number; y: number; t: number }
