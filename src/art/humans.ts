// Procedural pixel-art for the human army. 6 frames: idle0, idle1, walk0, walk1, attackWindup, attackStrike.
import { PixelCanvas, shade } from './pixel';
import type { ClassId } from '../data/units';

export const HUMAN_FRAMES = 6;
export const HUMAN_W = 32;
export const HUMAN_H = 32;
export const KNIGHT_W = 38;
export const KNIGHT_H = 34;

type Helm = 'none' | 'cap' | 'helm' | 'plume' | 'crest' | 'hood' | 'hat' | 'halo' | 'crown';
type Weapon = 'fork' | 'sword' | 'dual' | 'mace' | 'spear' | 'bow' | 'staff' | 'holy' | 'orb' | 'lance' | 'greatsword';

interface Look {
  skin: string;
  hair: string;
  body: string;
  trim: string;
  tabard?: string;
  legs: string;
  boots: string;
  helm: Helm;
  helmColor: string;
  plume?: string;
  cape?: string;
  robe?: boolean;
  weapon: Weapon;
  weaponColor: string;
  glow?: string;
  shield?: { c: string; t: string; big?: boolean; emblem?: string };
  bulky?: boolean;
}

const SKIN = '#f2c79a';
const STEEL = '#aab6cc';
const STEEL2 = '#d0dbee';
const GOLD = '#ffd24a';
const BLUE = '#3a64d8';
const ROYAL = '#2a48c0';

function lookFor(cls: ClassId, tier: number): Look {
  const t = tier;
  switch (cls) {
    case 'militia':
      return [
        { skin: SKIN, hair: '#6a4a2a', body: '#8a6a48', trim: '#5a4430', legs: '#5a4a3a', boots: '#3a2a1e', helm: 'cap', helmColor: '#7a5a3a', weapon: 'fork', weaponColor: '#8a6a3a' },
        { skin: SKIN, hair: '#6a4a2a', body: STEEL, trim: '#6a7488', tabard: BLUE, legs: '#4a4a5a', boots: '#2a2a32', helm: 'helm', helmColor: STEEL, weapon: 'sword', weaponColor: STEEL2 },
        { skin: SKIN, hair: '#6a4a2a', body: STEEL2, trim: '#7a8498', tabard: ROYAL, legs: '#3a3a5a', boots: '#22222c', helm: 'plume', helmColor: STEEL2, plume: '#3a64d8', weapon: 'sword', weaponColor: STEEL2, shield: { c: BLUE, t: STEEL2, emblem: GOLD } },
        { skin: SKIN, hair: '#6a4a2a', body: STEEL2, trim: GOLD, tabard: ROYAL, legs: '#2a2a5a', boots: '#22222c', helm: 'crest', helmColor: GOLD, plume: '#ff4a4a', cape: '#c82a3a', weapon: 'greatsword', weaponColor: '#f0f6ff', glow: GOLD, shield: { c: ROYAL, t: GOLD, emblem: '#ffffff' } },
      ][t] as Look;
    case 'swordsman':
      return [
        { skin: SKIN, hair: '#3a2a1a', body: '#6a7a9a', trim: '#4a5470', tabard: '#5a4ab0', legs: '#3a3a4a', boots: '#2a2028', helm: 'none', helmColor: '#3a2a1a', weapon: 'sword', weaponColor: STEEL2 },
        { skin: SKIN, hair: '#3a2a1a', body: '#7a8aaa', trim: '#4a5470', tabard: '#6a4ad0', legs: '#2a2a4a', boots: '#22202a', helm: 'cap', helmColor: '#4a3a8a', weapon: 'dual', weaponColor: STEEL2 },
        { skin: SKIN, hair: '#3a2a1a', body: STEEL2, trim: '#6a5ad0', tabard: '#7a4ae0', legs: '#2a2a4a', boots: '#1a1a24', helm: 'plume', helmColor: STEEL2, plume: '#9a6aff', cape: '#4a2a9a', weapon: 'dual', weaponColor: '#e8f0ff' },
        { skin: SKIN, hair: '#3a2a1a', body: '#f0f4ff', trim: GOLD, tabard: '#8a5aff', legs: '#2a2a4a', boots: '#1a1a24', helm: 'crest', helmColor: GOLD, plume: '#c08aff', cape: '#6a3ad0', weapon: 'dual', weaponColor: '#fff6c0', glow: '#c08aff' },
      ][t] as Look;
    case 'guardian':
      return [
        { skin: SKIN, hair: '#5a3a2a', body: '#8a96aa', trim: '#5a6478', tabard: '#3a5aa8', legs: '#4a4a5a', boots: '#2a2a32', helm: 'helm', helmColor: '#8a96aa', weapon: 'mace', weaponColor: '#9aa4b8', shield: { c: '#6a5a4a', t: '#9aa4b8', big: true }, bulky: true },
        { skin: SKIN, hair: '#5a3a2a', body: STEEL, trim: '#6a7488', tabard: BLUE, legs: '#3a3a4a', boots: '#22222c', helm: 'helm', helmColor: STEEL, weapon: 'mace', weaponColor: STEEL2, shield: { c: BLUE, t: STEEL2, big: true, emblem: STEEL2 }, bulky: true },
        { skin: SKIN, hair: '#5a3a2a', body: STEEL2, trim: '#8090a8', tabard: ROYAL, legs: '#2a2a4a', boots: '#1a1a24', helm: 'plume', helmColor: STEEL2, plume: '#4a8aff', cape: '#2a3a9a', weapon: 'mace', weaponColor: STEEL2, shield: { c: ROYAL, t: '#e0e8f8', big: true, emblem: GOLD }, bulky: true },
        { skin: SKIN, hair: '#5a3a2a', body: '#f0f4ff', trim: GOLD, tabard: ROYAL, legs: '#2a2a4a', boots: '#1a1a24', helm: 'crest', helmColor: GOLD, plume: '#ffffff', cape: '#e0e8ff', weapon: 'mace', weaponColor: GOLD, glow: '#8ad0ff', shield: { c: '#e8eef8', t: GOLD, big: true, emblem: '#3a64d8' }, bulky: true },
      ][t] as Look;
    case 'lancer':
      return [
        { skin: SKIN, hair: '#4a3020', body: '#7a6a5a', trim: '#4a4038', tabard: '#a84a3a', legs: '#4a3a30', boots: '#2a1e18', helm: 'cap', helmColor: '#8a7a6a', weapon: 'spear', weaponColor: '#8a6a3a' },
        { skin: SKIN, hair: '#4a3020', body: STEEL, trim: '#6a7488', tabard: '#c84a3a', legs: '#3a3a4a', boots: '#22222c', helm: 'helm', helmColor: STEEL, weapon: 'spear', weaponColor: '#8a6a3a' },
        { skin: SKIN, hair: '#4a3020', body: STEEL2, trim: '#8090a8', tabard: '#d8503a', legs: '#2a2a3a', boots: '#1a1a24', helm: 'plume', helmColor: STEEL2, plume: '#ff6a3a', weapon: 'spear', weaponColor: '#6a4a2a', shield: { c: '#c84a3a', t: STEEL2 } },
        { skin: SKIN, hair: '#4a3020', body: '#f0f4ff', trim: GOLD, tabard: '#e85a3a', legs: '#2a2a3a', boots: '#1a1a24', helm: 'crest', helmColor: GOLD, plume: '#ff8a3a', cape: '#a82a2a', weapon: 'spear', weaponColor: GOLD, glow: '#ffaa4a', shield: { c: '#e85a3a', t: GOLD, emblem: '#fff' } },
      ][t] as Look;
    case 'archer':
      return [
        { skin: SKIN, hair: '#6a4a2a', body: '#5a7a3a', trim: '#3a5428', legs: '#5a4a3a', boots: '#3a2a1e', helm: 'hood', helmColor: '#5a7a3a', weapon: 'bow', weaponColor: '#8a5a2a' },
        { skin: SKIN, hair: '#6a4a2a', body: '#4a8a3a', trim: '#2a5a28', legs: '#4a4a3a', boots: '#2a2a1e', helm: 'hood', helmColor: '#3a7a2e', cape: '#2e6a28', weapon: 'bow', weaponColor: '#9a6a2a' },
        { skin: SKIN, hair: '#6a4a2a', body: '#4a9a4a', trim: '#c8b060', legs: '#3a4a3a', boots: '#2a2a1e', helm: 'hood', helmColor: '#2e8a3e', cape: '#1e6a2e', weapon: 'bow', weaponColor: '#c89a4a' },
        { skin: SKIN, hair: '#6a4a2a', body: '#e8f0e0', trim: GOLD, legs: '#3a5a3a', boots: '#2a2a1e', helm: 'hood', helmColor: '#f0f6e8', cape: '#3aa84a', weapon: 'bow', weaponColor: GOLD, glow: '#aaff6a' },
      ][t] as Look;
    case 'mage':
      return [
        { skin: SKIN, hair: '#aaaaaa', body: '#5a4ab0', trim: '#3a2a80', legs: '#3a2a70', boots: '#2a1a40', helm: 'hat', helmColor: '#5a4ab0', robe: true, weapon: 'staff', weaponColor: '#8a5a3a', glow: '#8ad0ff' },
        { skin: SKIN, hair: '#cccccc', body: '#6a3ac8', trim: GOLD, legs: '#4a2a90', boots: '#2a1a40', helm: 'hat', helmColor: '#6a3ac8', robe: true, weapon: 'staff', weaponColor: '#7a4a2a', glow: '#b08aff' },
        { skin: SKIN, hair: '#eeeeee', body: '#3a2a9a', trim: GOLD, legs: '#2a1a70', boots: '#1a1030', helm: 'hat', helmColor: '#3a2a9a', cape: '#6a3ac8', robe: true, weapon: 'staff', weaponColor: '#c8a050', glow: '#7affff' },
        { skin: SKIN, hair: '#ffffff', body: '#1a1a5a', trim: GOLD, legs: '#1a1a4a', boots: '#100a20', helm: 'hat', helmColor: '#1a1a5a', cape: '#ffd24a', robe: true, weapon: 'staff', weaponColor: GOLD, glow: '#ff8ae0' },
      ][t] as Look;
    case 'healer':
      return [
        { skin: SKIN, hair: '#e0c070', body: '#d8d8e0', trim: '#a0a0b0', legs: '#b0b0c0', boots: '#6a6a7a', helm: 'hood', helmColor: '#d8d8e0', robe: true, weapon: 'holy', weaponColor: '#c8a050', glow: '#fff2a0' },
        { skin: SKIN, hair: '#e0c070', body: '#ececf4', trim: GOLD, legs: '#c0c0d0', boots: '#6a6a7a', helm: 'hood', helmColor: '#ececf4', robe: true, weapon: 'holy', weaponColor: GOLD, glow: '#fff2a0' },
        { skin: SKIN, hair: '#e0c070', body: '#ffffff', trim: GOLD, legs: '#d0d0e0', boots: '#7a7a8a', helm: 'hood', helmColor: '#ffffff', cape: '#ffe08a', robe: true, weapon: 'holy', weaponColor: GOLD, glow: '#ffffa0' },
        { skin: SKIN, hair: '#ffe08a', body: '#ffffff', trim: GOLD, legs: '#e0e0f0', boots: '#8a8a9a', helm: 'halo', helmColor: GOLD, cape: '#ffd24a', robe: true, weapon: 'holy', weaponColor: GOLD, glow: '#ffffff' },
      ][t] as Look;
    case 'summoner':
      return [
        { skin: SKIN, hair: '#2a2a2a', body: '#2a6a6a', trim: '#1a4444', legs: '#1a4a4a', boots: '#102828', helm: 'hood', helmColor: '#2a6a6a', robe: true, weapon: 'orb', weaponColor: '#5a4a3a', glow: '#5affd0' },
        { skin: SKIN, hair: '#2a2a2a', body: '#2a7a7a', trim: '#8ae0d0', legs: '#1a5a5a', boots: '#102828', helm: 'hood', helmColor: '#2a7a7a', robe: true, weapon: 'orb', weaponColor: '#5a4a3a', glow: '#5affd0' },
        { skin: SKIN, hair: '#2a2a2a', body: '#1a5a6a', trim: '#aaf0ff', legs: '#1a4a5a', boots: '#0a2028', helm: 'hood', helmColor: '#1a5a6a', cape: '#2aa0a0', robe: true, weapon: 'orb', weaponColor: '#8ae0ff', glow: '#8affff' },
        { skin: SKIN, hair: '#2a2a2a', body: '#0a3a4a', trim: GOLD, legs: '#0a2a3a', boots: '#06161e', helm: 'crown', helmColor: GOLD, cape: '#3affd0', robe: true, weapon: 'orb', weaponColor: GOLD, glow: '#aaffff' },
      ][t] as Look;
    case 'knight':
    default:
      return [
        { skin: SKIN, hair: '#4a3020', body: STEEL, trim: '#6a7488', tabard: BLUE, legs: '#3a3a4a', boots: '#22222c', helm: 'helm', helmColor: STEEL, weapon: 'lance', weaponColor: '#8a6a3a', shield: { c: BLUE, t: STEEL2 } },
        { skin: SKIN, hair: '#4a3020', body: STEEL2, trim: '#8090a8', tabard: ROYAL, legs: '#2a2a3a', boots: '#1a1a24', helm: 'plume', helmColor: STEEL2, plume: '#ffffff', cape: '#2a3a9a', weapon: 'lance', weaponColor: '#c8c8d8', shield: { c: ROYAL, t: STEEL2, emblem: GOLD } },
        { skin: SKIN, hair: '#4a3020', body: '#f0f4ff', trim: GOLD, tabard: ROYAL, legs: '#2a2a3a', boots: '#1a1a24', helm: 'plume', helmColor: '#f0f4ff', plume: '#ff4a4a', cape: '#c82a3a', weapon: 'lance', weaponColor: '#e8e8f8', shield: { c: '#e8eef8', t: GOLD, emblem: '#c82a3a' } },
        { skin: SKIN, hair: '#4a3020', body: '#fff6d8', trim: GOLD, tabard: '#ffffff', legs: '#2a2a3a', boots: '#1a1a24', helm: 'crest', helmColor: GOLD, plume: '#ffffff', cape: '#ffd24a', weapon: 'lance', weaponColor: GOLD, glow: '#fff2a0', shield: { c: GOLD, t: '#ffffff', emblem: '#3a64d8' } },
      ][t] as Look;
  }
}

interface Pose {
  bob: number;
  legA: number;
  legB: number;
  hand: [number, number];
  ang: number;
  phase: 'idle' | 'wind' | 'strike';
}

function poseFor(frame: number): Pose {
  switch (frame) {
    case 1: return { bob: 1, legA: 0, legB: 0, hand: [18, 18], ang: -1.15, phase: 'idle' };
    case 2: return { bob: 0, legA: -1, legB: 1, hand: [18, 17], ang: -1.0, phase: 'idle' };
    case 3: return { bob: 1, legA: 1, legB: -1, hand: [18, 18], ang: -1.2, phase: 'idle' };
    case 4: return { bob: 0, legA: -1, legB: 0, hand: [15, 13], ang: -2.5, phase: 'wind' };
    case 5: return { bob: 0, legA: 1, legB: -1, hand: [20, 16], ang: 0.15, phase: 'strike' };
    default: return { bob: 0, legA: 0, legB: 0, hand: [18, 17], ang: -1.1, phase: 'idle' };
  }
}

function drawWeapon(p: PixelCanvas, L: Look, pose: Pose, hx: number, hy: number, back = false) {
  const wc = L.weaponColor;
  const ang = pose.ang;
  const dx = Math.cos(ang), dy = Math.sin(ang);
  switch (L.weapon) {
    case 'sword':
    case 'dual':
    case 'greatsword': {
      const len = L.weapon === 'greatsword' ? 11 : 8;
      // guard
      p.line(hx - dy * 2, hy + dx * 2, hx + dy * 2, hy - dx * 2, '#c8a040');
      p.thickLine(hx + dx * 1, hy + dy * 1, hx + dx * len, hy + dy * len, wc, L.weapon === 'greatsword' ? 2 : 1);
      p.px(hx + dx * (len - 1), hy + dy * (len - 1), '#ffffff');
      p.px(hx - dx, hy - dy, '#6a4a2a');
      break;
    }
    case 'fork': {
      const len = 13;
      p.line(hx - dx * 3, hy - dy * 3, hx + dx * len, hy + dy * len, '#8a6a3a');
      const tx = hx + dx * len, ty = hy + dy * len;
      p.line(tx - dy * 2, ty + dx * 2, tx + dy * 2, ty - dx * 2, '#9aa0aa');
      p.line(tx - dy * 2, ty + dx * 2, tx - dy * 2 + dx * 3, ty + dx * 2 + dy * 3, '#9aa0aa');
      p.line(tx, ty, tx + dx * 3, ty + dy * 3, '#9aa0aa');
      p.line(tx + dy * 2, ty - dx * 2, tx + dy * 2 + dx * 3, ty - dx * 2 + dy * 3, '#9aa0aa');
      break;
    }
    case 'mace': {
      const len = 7;
      p.line(hx, hy, hx + dx * len, hy + dy * len, '#6a4a2a');
      p.ellipse(hx + dx * (len + 1), hy + dy * (len + 1), 1.6, 1.6, wc);
      p.px(hx + dx * (len + 1) - 1, hy + dy * (len + 1) - 1, '#ffffff');
      break;
    }
    case 'spear':
    case 'lance': {
      // spear holds more horizontally while attacking
      let a = ang;
      if (pose.phase === 'idle') a = L.weapon === 'lance' ? -0.35 : -1.35;
      if (pose.phase === 'wind') a = L.weapon === 'lance' ? -0.25 : -0.35;
      if (pose.phase === 'strike') a = L.weapon === 'lance' ? 0.05 : 0.02;
      const ddx = Math.cos(a), ddy = Math.sin(a);
      const len = L.weapon === 'lance' ? 18 : 16;
      const back = pose.phase === 'wind' ? 7 : 4;
      p.line(hx - ddx * back, hy - ddy * back, hx + ddx * len, hy + ddy * len, L.weapon === 'lance' ? wc : '#8a6a3a');
      const tx = hx + ddx * len, ty = hy + ddy * len;
      p.line(tx, ty, tx + ddx * 3, ty + ddy * 3, '#e8eef8');
      p.px(tx - ddy, ty + ddx, '#c8d0e0');
      p.px(tx + ddy, ty - ddx, '#c8d0e0');
      if (L.weapon === 'lance') { p.px(hx + ddx * 3 - ddy, hy + ddy * 3 + ddx, GOLD); p.px(hx + ddx * 3 + ddy, hy + ddy * 3 - ddx, GOLD); }
      if (L.glow) p.px(tx + ddx * 3, ty + ddy * 3, L.glow);
      break;
    }
    case 'bow': {
      const bx = hx + 1;
      const top = hy - 7, bot = hy + 6;
      const bend = 3;
      for (let y = top; y <= bot; y++) {
        const t = (y - top) / (bot - top);
        const x = bx + Math.round(Math.sin(t * Math.PI) * bend);
        p.px(x, y, wc);
      }
      const sx = pose.phase === 'wind' ? bx - 4 : bx;
      p.line(bx, top, sx, hy, '#e8e8e8');
      p.line(sx, hy, bx, bot, '#e8e8e8');
      if (pose.phase !== 'strike') {
        p.line(sx, hy, bx + 5, hy, '#c8a070');
        p.px(bx + 6, hy, '#e8eef8');
      }
      break;
    }
    case 'staff':
    case 'holy':
    case 'orb': {
      let a = -1.45;
      if (pose.phase === 'wind') a = -1.9;
      if (pose.phase === 'strike') a = -0.7;
      const ddx = Math.cos(a), ddy = Math.sin(a);
      const len = 13;
      p.line(hx - ddx * 5, hy - ddy * 5, hx + ddx * len, hy + ddy * len, wc);
      const tx = hx + ddx * (len + 1), ty = hy + ddy * (len + 1);
      const glow = L.glow || '#ffffff';
      if (L.weapon === 'holy') {
        p.line(tx, ty - 2, tx, ty + 2, GOLD);
        p.line(tx - 2, ty, tx + 2, ty, GOLD);
        p.px(tx, ty, '#ffffff');
        if (pose.phase === 'strike') p.ring(tx, ty, 3, 3, glow, 1, 0.8);
      } else {
        const r = pose.phase === 'strike' ? 2.2 : 1.6;
        p.ellipse(tx, ty, r, r, glow);
        p.px(tx - 1, ty - 1, '#ffffff');
        if (pose.phase === 'strike') p.ring(tx, ty, 3.5, 3.5, glow, 1, 0.55);
      }
      break;
    }
  }
}

// ---------------- chibi foot-soldier renderer (32x32, big heads like the reference) ----------------
function pose32(frame: number): Pose {
  switch (frame) {
    case 1: return { bob: 1, legA: 0, legB: 0, hand: [21, 23], ang: -1.15, phase: 'idle' };
    case 2: return { bob: 0, legA: -1, legB: 1, hand: [21, 22], ang: -1.0, phase: 'idle' };
    case 3: return { bob: 1, legA: 1, legB: -1, hand: [21, 23], ang: -1.2, phase: 'idle' };
    case 4: return { bob: 0, legA: -1, legB: 0, hand: [18, 17], ang: -2.5, phase: 'wind' };
    case 5: return { bob: 0, legA: 1, legB: -1, hand: [24, 21], ang: 0.15, phase: 'strike' };
    default: return { bob: 0, legA: 0, legB: 0, hand: [21, 22], ang: -1.1, phase: 'idle' };
  }
}

function drawFace(p: PixelCanvas, L: Look, oy: number) {
  // head: big rounded skin blob
  p.ellipse(15, 12 + oy, 5.4, 4.9, L.skin);
  p.rect(12, 16 + oy, 7, 1, shade(L.skin, -0.18));
  // eyes (2px tall with highlight) + blush + mouth, facing right
  p.rect(16, 11 + oy, 1, 2, '#1a1020');
  p.rect(19, 11 + oy, 1, 2, '#1a1020');
  p.px(16, 11 + oy, '#ffffff', 0.85);
  p.px(19, 11 + oy, '#ffffff', 0.85);
  p.px(15, 14 + oy, '#ff9a8a', 0.7);
  p.px(20, 14 + oy, '#ff9a8a', 0.5);
  p.px(18, 15 + oy, shade(L.skin, -0.35));
}

function openFace(p: PixelCanvas, L: Look, oy: number, x0 = 14) {
  p.rect(x0, 11 + oy, 21 - x0, 5, L.skin);
  p.rect(x0 + 1, 16 + oy, 19 - x0, 1, shade(L.skin, -0.18));
  p.rect(16, 12 + oy, 1, 2, '#1a1020');
  p.rect(19, 12 + oy, 1, 2, '#1a1020');
  p.px(16, 12 + oy, '#ffffff', 0.85);
  p.px(19, 12 + oy, '#ffffff', 0.85);
  p.px(20, 14 + oy, '#ff9a8a', 0.6);
  p.px(18, 15 + oy, shade(L.skin, -0.35));
}

function drawHelm32(p: PixelCanvas, L: Look, oy: number) {
  const c = L.helmColor, cd = shade(c, -0.28), cl = shade(c, 0.35);
  const y = oy;
  switch (L.helm) {
    case 'none':
      p.ellipse(14, 9 + y, 5.6, 3.2, L.hair);
      p.rect(9, 9 + y, 3, 5, L.hair);
      p.px(17, 7 + y, shade(L.hair, 0.3));
      break;
    case 'cap':
      p.ellipse(15, 8.5 + y, 5.8, 3, c);
      p.rect(9, 9 + y, 3, 4, L.hair);
      p.rect(17, 10 + y, 5, 1, cd);
      p.px(13, 7 + y, cl);
      break;
    case 'helm':
    case 'plume':
    case 'crest': {
      // dome
      p.ellipse(15, 9.5 + y, 6.2, 4.4, c);
      // back + cheek guard (face window stays open on the right)
      p.rect(9, 9 + y, 5, 7, c);
      p.rect(9, 15 + y, 5, 1, cd);
      p.rect(10, 13 + y, 4, 1, cd);
      // rim / visor line
      p.rect(14, 10 + y, 8, 1, cd);
      p.rect(14, 9 + y, 7, 1, cl);
      p.px(12, 6 + y, cl); p.px(13, 6 + y, cl); p.px(11, 7 + y, cl);
      openFace(p, L, y, 15);
      p.rect(15, 11 + y, 1, 4, cd);
      if (L.helm === 'plume' && L.plume) {
        p.ellipse(13, 4 + y, 3.4, 1.8, L.plume);
        p.rect(9, 4 + y, 3, 3, L.plume);
        p.px(14, 3 + y, shade(L.plume, 0.35));
      }
      if (L.helm === 'crest') {
        p.rect(14, 3 + y, 2, 3, c);
        p.px(14, 3 + y, cl);
        if (L.plume) { p.ellipse(11, 3 + y, 4, 1.8, L.plume); p.rect(7, 3 + y, 3, 4, L.plume); p.px(12, 2 + y, shade(L.plume, 0.35)); }
        p.px(20, 9 + y, '#ffffff');
      }
      break;
    }
    case 'hood':
      p.ellipse(14.5, 10 + y, 6.4, 5.2, c);
      p.rect(8, 10 + y, 5, 8, c);
      p.rect(8, 17 + y, 6, 1, cd);
      p.rect(13, 9 + y, 8, 1, cd);
      p.px(12, 6 + y, cl); p.px(13, 6 + y, cl);
      openFace(p, L, y, 15);
      break;
    case 'hat':
      p.ellipse(15, 9 + y, 8, 1.6, cd);
      p.poly([[9, 9 + y], [21, 9 + y], [15, 0 + y], [11, -1 + y]], c);
      p.px(10, -1 + y, c); p.px(9, 0 + y, c);
      p.rect(10, 7 + y, 10, 1, GOLD);
      p.px(14, 3 + y, cl); p.px(15, 5 + y, '#ffffff', 0.5);
      p.rect(9, 9 + y, 3, 5, L.hair);
      // beard
      p.poly([[15, 15 + y], [20, 15 + y], [18, 20 + y]], L.hair);
      break;
    case 'halo':
      p.ellipse(14, 9 + y, 5.6, 3, L.hair);
      p.rect(9, 9 + y, 3, 6, L.hair);
      p.ring(15, 3 + y, 4.5, 1.5, GOLD, 1);
      break;
    case 'crown':
      p.ellipse(14.5, 10 + y, 6.4, 5.2, '#0a3a4a');
      p.rect(8, 10 + y, 5, 8, '#0a3a4a');
      openFace(p, L, y, 15);
      p.rect(10, 5 + y, 10, 2, GOLD);
      p.px(10, 4 + y, GOLD); p.px(15, 3 + y, GOLD); p.px(19, 4 + y, GOLD); p.px(15, 4 + y, '#ff5a8a');
      break;
  }
}

function drawShield32(p: PixelCanvas, L: Look, oy: number, pose: Pose) {
  if (!L.shield) return;
  const s = L.shield;
  const push = pose.phase === 'strike' ? 1 : 0;
  if (s.big) {
    const x = 6 + push, y = 17 + oy;
    p.poly([[x, y], [x + 7, y], [x + 7, y + 8], [x + 3.5, y + 11], [x, y + 8]], s.t);
    p.poly([[x + 1, y + 1], [x + 6, y + 1], [x + 6, y + 8], [x + 3.5, y + 10], [x + 1, y + 8]], s.c);
    p.rect(x + 1, y + 1, 5, 1, shade(s.c, 0.3));
    if (s.emblem) { p.rect(x + 3, y + 2, 1, 6, s.emblem); p.rect(x + 2, y + 4, 3, 1, s.emblem); }
  } else {
    const x = 9 + push, y = 22 + oy;
    p.ellipse(x, y, 3, 3.4, s.t);
    p.ellipse(x, y, 2, 2.4, s.c);
    p.px(x - 1, y - 1, shade(s.c, 0.4));
    if (s.emblem) p.px(x, y, s.emblem);
  }
}

export function drawHumanFrame(cls: ClassId, tier: number, frame: number): PixelCanvas {
  if (cls === 'knight') return drawKnightFrame(tier, frame);
  const L = lookFor(cls, tier);
  const p = new PixelCanvas(HUMAN_W, HUMAN_H);
  const pose = pose32(frame);
  const oy = pose.bob;
  const bulk = L.bulky ? 1 : 0;

  // cape (behind)
  if (L.cape) {
    const sway = frame === 2 || frame === 4 ? -1 : 0;
    p.poly([[11 - bulk, 18 + oy], [17, 18 + oy], [16, 29], [8 + sway - bulk, 29]], L.cape);
    p.poly([[11 - bulk, 18 + oy], [13, 18 + oy], [11, 29], [8 + sway - bulk, 29]], shade(L.cape, -0.25));
  }
  // back arm
  p.rect(10 - bulk, 19 + oy, 2, 4, shade(L.body, -0.3));
  p.px(10 - bulk, 23 + oy, shade(L.skin, -0.15));
  // legs
  if (!L.robe) {
    p.rect(12 + pose.legA, 25, 2, 3, shade(L.legs, -0.2));
    p.rect(11 + pose.legA, 28, 4, 1, L.boots);
    p.rect(16 + pose.legB, 25, 2, 3, L.legs);
    p.rect(16 + pose.legB, 28, 4, 1, L.boots);
  } else {
    p.poly([[11 - bulk, 22 + oy], [19 + bulk, 22 + oy], [20 + (pose.legB > 0 ? 1 : 0), 29], [10 + (pose.legA < 0 ? -1 : 0), 29]], L.body);
    p.rect(10, 28, 11, 1, L.trim);
    p.rect(13, 22 + oy, 1, 7, shade(L.body, -0.15));
    p.rect(12 + pose.legA, 29, 3, 1, L.boots);
    p.rect(17 + pose.legB, 29, 3, 1, L.boots);
  }
  // torso (rounded, chunky)
  p.ellipse(15, 21.5 + oy, 4.6 + bulk, 4, L.body);
  p.rect(11 - bulk, 21 + oy, 9 + bulk * 2, 4, L.body);
  p.rect(12, 18 + oy, 6, 1, shade(L.body, 0.3));
  if (L.tabard) {
    p.rect(14, 19 + oy, 3, 6, L.tabard);
    p.rect(14, 19 + oy, 1, 6, shade(L.tabard, 0.25));
    p.px(15, 21 + oy, GOLD);
  }
  p.rect(11 - bulk, 24 + oy, 9 + bulk * 2, 1, L.trim);
  p.px(15, 24 + oy, GOLD);
  if (!L.robe) {
    // pauldrons
    p.ellipse(11 - bulk, 19 + oy, 1.8, 1.4, shade(L.body, 0.2));
    p.ellipse(19 + bulk, 19 + oy, 1.8, 1.4, shade(L.body, 0.12));
  } else p.rect(15, 18 + oy, 1, 6, L.trim);

  drawFace(p, L, oy);
  drawHelm32(p, L, oy);
  drawShield32(p, L, oy, pose);

  if (L.weapon === 'dual') {
    const back: Pose = { ...pose, ang: pose.phase === 'strike' ? -0.5 : pose.phase === 'wind' ? 0.3 : -1.6 };
    drawWeapon(p, L, back, 10 - bulk, 23 + oy, true);
  }
  const [hx, hy] = pose.hand;
  p.thickLine(19 + bulk, 19 + oy, hx, hy + oy, L.body, 2);
  drawWeapon(p, L, pose, hx, hy + oy);
  p.rect(hx - 1, hy + oy - 1, 2, 2, L.skin);

  p.outline('#140a18');
  if (tier >= 3 && L.glow) {
    p.px(5, 10 + oy, L.glow, 0.9);
    p.px(26, 6 + oy, L.glow, 0.9);
    p.px(27, 20 + oy, L.glow, 0.7);
  }
  return p;
}

function drawKnightFrame(tier: number, frame: number): PixelCanvas {
  const L = lookFor('knight', tier);
  const p = new PixelCanvas(KNIGHT_W, KNIGHT_H);
  p.setOffset(0, 2);
  const pose = poseFor(frame);
  const horse = ['#8a5a3a', '#f0ece4', '#3a2a2a', '#f8f4ec'][tier];
  const mane = ['#4a2a1a', '#c8c0b0', '#1a1010', GOLD][tier];
  const bard = [null, '#3a64d8', '#c82a3a', '#ffd24a'][tier];
  const run = frame === 2 || frame === 3 || frame === 5;
  const g = frame % 2;
  const oy = run ? (g ? 1 : 0) : 0;
  // legs
  const legs = run
    ? (g ? [[8, -2], [12, 2], [22, 2], [26, -2]] : [[8, 2], [12, -2], [22, -2], [26, 2]])
    : [[9, 0], [12, 0], [23, 0], [26, 0]];
  legs.forEach(([x, d], i) => {
    const c = i % 2 === 0 ? shade(horse, -0.25) : horse;
    p.line(x, 21 + oy, x + d, 28, c);
    p.line(x + 1, 21 + oy, x + 1 + d, 28, c);
    p.rect(x + d, 29, 2, 1, '#2a1a14');
  });
  // body
  p.ellipse(17, 18 + oy, 11, 5, horse);
  p.rect(7, 16 + oy, 4, 4, horse);
  // tail
  p.line(6, 15 + oy, 3, 21 + oy, mane); p.line(5, 15 + oy, 2, 20 + oy, mane);
  // neck + head
  p.poly([[24, 17 + oy], [28, 9 + oy], [32, 10 + oy], [29, 19 + oy]], horse);
  p.poly([[29, 8 + oy], [35, 11 + oy], [35, 14 + oy], [30, 13 + oy]], horse);
  p.px(31, 10 + oy, '#1a1010');
  p.px(29, 7 + oy, horse);
  p.line(27, 9 + oy, 25, 15 + oy, mane); p.line(28, 9 + oy, 26, 15 + oy, mane);
  // barding
  if (bard) {
    p.rect(11, 15 + oy, 14, 5, bard);
    p.rect(11, 20 + oy, 14, 1, GOLD);
    p.px(18, 17 + oy, '#ffffff');
  }
  // saddle
  p.rect(14, 13 + oy, 7, 2, '#5a3a2a');
  // rider
  const ry = -8 + oy;
  if (L.cape) p.poly([[13, 12 + ry], [17, 12 + ry], [15, 22 + ry], [9, 21 + ry]], L.cape);
  p.rect(14, 12 + ry, 6, 7, L.body);
  if (L.tabard) p.rect(16, 13 + ry, 2, 6, L.tabard);
  p.rect(15, 18 + ry, 4, 4, L.legs);
  // chibi head
  p.ellipse(17, 7 + ry, 4.6, 4.2, L.skin);
  p.ellipse(16.5, 5 + ry, 5, 3, L.helmColor);
  p.rect(12, 5 + ry, 4, 6, L.helmColor);
  p.rect(16, 6 + ry, 6, 1, shade(L.helmColor, -0.3));
  p.rect(17, 7 + ry, 1, 2, '#1a1020'); p.rect(20, 7 + ry, 1, 2, '#1a1020');
  p.px(17, 7 + ry, '#ffffff', 0.8); p.px(20, 7 + ry, '#ffffff', 0.8);
  p.px(13, 3 + ry, shade(L.helmColor, 0.35));
  if (L.plume) { p.ellipse(14, 1 + ry, 3.4, 1.6, L.plume); p.rect(11, 1 + ry, 3, 4, L.plume); }
  // shield
  if (L.shield) {
    p.ellipse(13, 17 + ry, 2.5, 3.2, L.shield.t);
    p.ellipse(13, 17 + ry, 1.5, 2.2, L.shield.c);
    if (L.shield.emblem) p.px(13, 17 + ry, L.shield.emblem);
  }
  // lance
  drawWeapon(p, L, pose, 20, 15 + ry);
  p.outline('#140a18');
  if (tier >= 3) { p.px(4, 4, GOLD, 0.9); p.px(34, 2, GOLD, 0.9); }
  return p;
}

/** Spectral summon (spirit warrior / spirit archer / golem). */
export function drawSpiritFrame(kind: 'spirit' | 'spiritArcher' | 'golem' | 'spectral', frame: number): PixelCanvas {
  if (kind === 'golem') return drawGolem(frame);
  const cls: ClassId = kind === 'spiritArcher' ? 'archer' : 'militia';
  const base = drawHumanFrame(cls, kind === 'spectral' ? 2 : 1, frame);
  // recolor to ghostly teal/violet
  const tint = kind === 'spectral' ? [190, 140, 255] : [110, 255, 220];
  const d = base.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const l = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) / 255;
    d[i] = tint[0] * (0.35 + l * 0.8);
    d[i + 1] = tint[1] * (0.35 + l * 0.8);
    d[i + 2] = tint[2] * (0.35 + l * 0.8);
    d[i + 3] = 215;
  }
  return base;
}

function drawGolem(frame: number): PixelCanvas {
  const p = new PixelCanvas(36, 36);
  const pose = poseFor(frame);
  const oy = pose.bob;
  const stone = '#7a8a9a', dark = '#4a5a6a', glow = '#5affd0';
  p.rect(12 + pose.legA, 26, 5, 8, dark);
  p.rect(20 + pose.legB, 26, 5, 8, dark);
  p.ellipse(18, 19 + oy, 10, 9, stone);
  p.rect(10, 12 + oy, 16, 6, stone);
  p.ellipse(18, 10 + oy, 5, 4, stone);
  p.rect(16, 9 + oy, 5, 1, glow);
  const armY = pose.phase === 'wind' ? 6 : pose.phase === 'strike' ? 16 : 13;
  p.ellipse(6, 16 + oy, 3, 5, dark);
  p.ellipse(30, armY + oy, 4, 6, stone);
  p.ellipse(31, armY + 5 + oy, 4, 3, dark);
  p.px(14, 20 + oy, glow); p.px(20, 23 + oy, glow); p.px(22, 17 + oy, glow);
  p.autoShade(0.2);
  p.outline('#0e1418');
  return p;
}

export const SPIRIT_W = HUMAN_W;
