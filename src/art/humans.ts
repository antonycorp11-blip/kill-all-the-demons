// Procedural pixel-art for the human army. 6 frames: idle0, idle1, walk0, walk1, attackWindup, attackStrike.
import { PixelCanvas, shade } from './pixel';
import type { ClassId } from '../data/units';

export const HUMAN_FRAMES = 6;
export const HUMAN_W = 28;
export const HUMAN_H = 28;
export const KNIGHT_W = 38;
export const KNIGHT_H = 32;

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

function drawHelm(p: PixelCanvas, L: Look, oy: number) {
  const c = L.helmColor;
  const hx = 10, hy = 6 + oy; // head box 7x7 at (10..16, 6..12)
  switch (L.helm) {
    case 'none':
      p.rect(hx, hy - 1, 7, 3, L.hair);
      p.rect(hx, hy + 2, 2, 2, L.hair);
      break;
    case 'cap':
      p.rect(hx - 1, hy - 1, 8, 3, c);
      p.rect(hx + 5, hy + 1, 3, 1, shade(c, -0.25));
      p.rect(hx, hy + 2, 2, 2, L.hair);
      break;
    case 'helm':
    case 'plume':
    case 'crest':
      p.rect(hx - 1, hy - 1, 8, 4, c);
      p.rect(hx - 1, hy + 3, 3, 4, c); // back/neck guard
      p.rect(hx + 2, hy + 3, 1, 1, shade(c, -0.3));
      p.rect(hx - 1, hy + 2, 8, 1, shade(c, -0.2));
      p.px(hx + 3, hy - 1, shade(c, 0.4));
      if (L.helm === 'plume' && L.plume) {
        p.rect(hx + 1, hy - 3, 4, 2, L.plume);
        p.rect(hx - 1, hy - 2, 2, 2, L.plume);
      }
      if (L.helm === 'crest') {
        p.rect(hx + 2, hy - 3, 3, 2, c);
        if (L.plume) { p.rect(hx - 1, hy - 4, 5, 2, L.plume); p.rect(hx - 3, hy - 3, 2, 3, L.plume); }
        p.px(hx + 6, hy + 1, '#ffffff');
      }
      break;
    case 'hood':
      p.rect(hx - 1, hy - 1, 8, 4, c);
      p.rect(hx - 1, hy + 3, 3, 5, c);
      p.rect(hx + 5, hy, 2, 1, shade(c, 0.2));
      p.px(hx + 7, hy + 1, c);
      break;
    case 'hat':
      p.rect(hx - 2, hy + 1, 11, 1, shade(c, -0.15));
      p.poly([[hx, hy + 1], [hx + 7, hy + 1], [hx + 3, hy - 6], [hx + 1, hy - 7]], c);
      p.px(hx + 1, hy - 7, c);
      p.rect(hx, hy, 7, 1, GOLD);
      p.rect(hx, hy + 2, 2, 3, L.hair);
      p.rect(hx + 2, hy + 6, 4, 2, L.hair); // beard
      break;
    case 'halo':
      p.rect(hx, hy - 1, 7, 3, L.hair);
      p.ring(hx + 3, hy - 3, 4, 1.4, GOLD, 1);
      break;
    case 'crown':
      p.rect(hx - 1, hy - 1, 8, 4, '#0a3a4a');
      p.rect(hx - 1, hy + 3, 3, 5, '#0a3a4a');
      p.rect(hx, hy - 2, 7, 1, GOLD);
      p.px(hx, hy - 3, GOLD); p.px(hx + 3, hy - 3, GOLD); p.px(hx + 6, hy - 3, GOLD);
      break;
  }
}

function drawShield(p: PixelCanvas, L: Look, oy: number, pose: Pose) {
  if (!L.shield) return;
  const s = L.shield;
  const push = pose.phase === 'strike' ? 1 : 0;
  if (s.big) {
    const x = 6 + push, y = 12 + oy;
    p.rect(x, y, 6, 10, s.t);
    p.rect(x + 1, y + 1, 4, 8, s.c);
    p.rect(x + 1, y + 9, 4, 1, s.t);
    p.px(x + 2, y + 10, s.t); p.px(x + 3, y + 10, s.t);
    if (s.emblem) { p.rect(x + 2, y + 3, 2, 4, s.emblem); p.rect(x + 1, y + 4, 4, 1, s.emblem); }
  } else {
    const x = 7 + push, y = 14 + oy;
    p.ellipse(x + 2, y + 2.5, 2.6, 3, s.t);
    p.ellipse(x + 2, y + 2.5, 1.6, 2, s.c);
    if (s.emblem) p.px(x + 2, y + 2, s.emblem);
  }
}

export function drawHumanFrame(cls: ClassId, tier: number, frame: number): PixelCanvas {
  if (cls === 'knight') return drawKnightFrame(tier, frame);
  const L = lookFor(cls, tier);
  const p = new PixelCanvas(HUMAN_W, HUMAN_H);
  const pose = poseFor(frame);
  const oy = pose.bob;
  const bulk = L.bulky ? 1 : 0;

  // cape (behind)
  if (L.cape) {
    const sway = frame === 2 || frame === 4 ? -1 : 0;
    p.poly([[9 - bulk, 13 + oy], [14, 13 + oy], [13, 24], [6 + sway - bulk, 24]], L.cape);
    p.rect(7 + sway - bulk, 23, 6, 1, shade(L.cape, -0.3));
  }

  // back arm
  p.rect(9 - bulk, 13 + oy, 2, 5, shade(L.body, -0.25));
  p.px(9 - bulk, 18 + oy, shade(L.skin, -0.15));

  // legs
  if (!L.robe) {
    p.rect(11 + pose.legA, 19, 2, 5, shade(L.legs, -0.15));
    p.rect(11 + pose.legA, 24, 3, 1, L.boots);
    p.rect(14 + pose.legB, 19, 2, 5, L.legs);
    p.rect(14 + pose.legB, 24, 3, 1, L.boots);
  } else {
    p.poly([[10 - bulk, 17 + oy], [17, 17 + oy], [18 + (pose.legB > 0 ? 1 : 0), 25], [9 + (pose.legA < 0 ? -1 : 0), 25]], L.body);
    p.rect(9, 24, 10, 1, L.trim);
    p.rect(11 + pose.legA, 25, 2, 1, L.boots);
    p.rect(15 + pose.legB, 25, 2, 1, L.boots);
  }

  // torso
  p.rect(10 - bulk, 12 + oy, 7 + bulk * 2, 7, L.body);
  p.rect(10 - bulk, 12 + oy, 7 + bulk * 2, 1, shade(L.body, 0.25));
  if (L.tabard) {
    p.rect(12, 13 + oy, 3, 7, L.tabard);
    p.px(13, 14 + oy, shade(L.tabard, 0.35));
  }
  p.rect(10 - bulk, 18 + oy, 7 + bulk * 2, 1, L.trim);
  if (L.robe) p.rect(13, 12 + oy, 1, 7, L.trim);
  // shoulder pads
  if (!L.robe) { p.rect(9 - bulk, 12 + oy, 2, 2, shade(L.body, 0.15)); p.rect(16 + bulk, 12 + oy, 2, 2, shade(L.body, 0.15)); }

  // head
  p.rect(10, 6 + oy, 7, 7, L.skin);
  p.rect(10, 11 + oy, 7, 1, shade(L.skin, -0.12));
  p.px(15, 9 + oy, '#1a1020');
  p.px(13, 9 + oy, '#1a1020');
  p.px(16, 10 + oy, shade(L.skin, -0.2));
  drawHelm(p, L, oy);

  // shield behind front arm (left side)
  drawShield(p, L, oy, pose);

  // dual blade (back hand)
  if (L.weapon === 'dual') {
    const back: Pose = { ...pose, ang: pose.phase === 'strike' ? -0.5 : pose.phase === 'wind' ? 0.3 : -1.6 };
    drawWeapon(p, L, back, 9 - bulk, 18 + oy, true);
  }

  // front arm + weapon
  const [hx, hy] = pose.hand;
  p.line(17 + bulk, 13 + oy, hx, hy + oy, shade(L.body, -0.05));
  p.line(16 + bulk, 13 + oy, hx - 1, hy + oy, L.body);
  drawWeapon(p, L, pose, hx, hy + oy);
  p.px(hx, hy + oy, L.skin);

  p.outline('#140a18');
  // glow sparkle for top tier (after outline so it stays bright)
  if (tier >= 3 && L.glow) {
    p.px(5, 8 + oy, L.glow, 0.9);
    p.px(21, 5 + oy, L.glow, 0.9);
  }
  return p;
}

function drawKnightFrame(tier: number, frame: number): PixelCanvas {
  const L = lookFor('knight', tier);
  const p = new PixelCanvas(KNIGHT_W, KNIGHT_H);
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
  // head
  p.rect(14, 6 + ry, 6, 6, L.skin);
  p.px(18, 8 + ry, '#1a1020');
  p.rect(13, 5 + ry, 8, 4, L.helmColor);
  p.rect(13, 9 + ry, 2, 3, L.helmColor);
  if (L.plume) { p.rect(14, 3 + ry, 5, 2, L.plume); p.rect(12, 4 + ry, 2, 3, L.plume); }
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
