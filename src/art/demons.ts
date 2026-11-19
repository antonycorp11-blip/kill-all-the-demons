// Procedural pixel-art demons. Facing LEFT (they march toward the fortress). 6 frames like humans.
import { PixelCanvas, shade } from './pixel';
import type { EnemyId } from '../data/enemies';
import type { DemonPalette } from '../data/regions';

export const DEMON_SIZES: Record<EnemyId, [number, number]> = {
  imp: [24, 24], hound: [30, 22], brute: [40, 40], archer: [28, 28], sorcerer: [28, 30], flyer: [34, 30], bomber: [24, 24],
  shaman: [28, 30], summoner: [30, 32], elite: [36, 38],
};

function pose(frame: number) {
  return {
    bob: frame === 1 || frame === 3 ? 1 : 0,
    legA: frame === 2 ? -1 : frame === 3 ? 1 : 0,
    legB: frame === 2 ? 1 : frame === 3 ? -1 : 0,
    wind: frame === 4,
    strike: frame === 5,
    flap: frame % 2,
  };
}

function horns(p: PixelCanvas, x: number, y: number, c: string, big = false) {
  // facing left: horns curve back (to the right)
  p.px(x, y, c); p.px(x + 1, y - 1, c); p.px(x + 2, y - 2, c);
  if (big) { p.px(x + 3, y - 2, c); p.px(x + 4, y - 1, c); p.px(x + 1, y, c); p.px(x + 2, y - 1, c); }
}

function drawImp(P: DemonPalette, f: number, bomber = false): PixelCanvas {
  const p = new PixelCanvas(24, 24);
  const q = pose(f);
  const o = q.bob;
  // tail
  p.line(15, 16 + o, 19, 14 + o, P.skinDark); p.line(19, 14 + o, 20, 11 + o, P.skinDark); p.px(21, 10 + o, P.skinDark); p.px(20, 10 + o, P.skinDark);
  // legs
  p.rect(9 + q.legA, 17, 2, 4, P.skinDark); p.rect(12 + q.legB, 17, 2, 4, P.skinDark);
  p.rect(8 + q.legA, 21, 3, 1, '#1a0a0a'); p.rect(11 + q.legB, 21, 3, 1, '#1a0a0a');
  // body
  if (bomber) {
    p.ellipse(11, 14 + o, 5, 4.5, P.skin);
    p.ellipse(11, 15 + o, 3, 2.5, '#ffcf3a');
    p.ellipse(11, 15 + o, 1.6, 1.4, '#ffffff');
  } else {
    p.ellipse(11, 14 + o, 3.5, 4, P.skin);
    p.px(10, 13 + o, P.skinLight);
  }
  // head (bigger, facing left)
  p.ellipse(10, 8 + o, 4, 3.6, P.skin);
  p.rect(6, 8 + o, 3, 2, P.skin);
  p.px(7, 7 + o, P.eye); p.px(9, 7 + o, P.eye);
  p.rect(6, 10 + o, 3, 1, '#2a0a0a');
  p.px(7, 11 + o, '#ffffff');
  horns(p, 9, 4 + o, P.horn); horns(p, 12, 4 + o, P.horn);
  // ears
  p.px(14, 7 + o, P.skinDark); p.px(15, 6 + o, P.skinDark);
  // arms / claws
  const ax = q.strike ? 3 : q.wind ? 8 : 6;
  const ay = q.wind ? 9 : 13;
  p.line(9, 12 + o, ax, ay + o, P.skinDark);
  p.px(ax - 1, ay + o, P.horn); p.px(ax - 1, ay - 1 + o, P.horn);
  p.line(13, 12 + o, 15, 15 + o, P.skinDark);
  if (bomber) {
    // lit fuse on head
    p.line(11, 4 + o, 13, 1 + o, '#6a4a2a');
    p.px(13, 0 + o, f % 2 ? '#ffffff' : '#ffaa2a');
  }
  p.autoShade(0.18);
  p.outline('#120608');
  return p;
}

function drawHound(P: DemonPalette, f: number): PixelCanvas {
  const p = new PixelCanvas(30, 22);
  const run = f !== 0 && f !== 1;
  const g = f % 2;
  const o = run ? g : 0;
  const L = run ? (g ? [[7, -3], [10, 3], [19, 3], [22, -3]] : [[7, 3], [10, -3], [19, -3], [22, 3]]) : [[8, 0], [10, 0], [19, 0], [21, 0]];
  L.forEach(([x, d], i) => {
    const c = i % 2 ? P.skinDark : shade(P.skinDark, -0.2);
    p.line(x, 13 + o, x + d * 0.6, 19, c); p.line(x + 1, 13 + o, x + 1 + d * 0.6, 19, c);
  });
  p.ellipse(15, 11 + o, 9, 4, P.skin);
  // spine flames
  for (let x = 10; x < 22; x += 3) p.px(x, 6 + o - ((x / 3) % 2), P.glow);
  // head facing left
  p.ellipse(6, 9 + o, 4, 3, P.skin);
  p.rect(1, 9 + o, 4, 3, P.skin);
  p.px(4, 8 + o, P.eye);
  p.rect(1, 11 + o, 4, 1, '#2a0a0a');
  p.px(2, 12 + o, '#ffffff'); p.px(4, 12 + o, '#ffffff');
  horns(p, 7, 6 + o, P.horn);
  // tail
  p.line(24, 10 + o, 28, 6 + o, P.skinDark); p.px(28, 5 + o, P.glow);
  p.autoShade(0.18);
  p.outline('#120608');
  return p;
}

function drawBrute(P: DemonPalette, f: number, elite = false): PixelCanvas {
  const [W, H] = elite ? [36, 38] : [40, 40];
  const p = new PixelCanvas(W, H);
  const q = pose(f);
  const o = q.bob;
  const cx = elite ? 18 : 20;
  // legs
  p.rect(cx - 6 + q.legA, 27, 5, 8, P.skinDark);
  p.rect(cx + 2 + q.legB, 27, 5, 8, shade(P.skinDark, -0.15));
  p.rect(cx - 7 + q.legA, 35, 6, 2, '#1a0a0a'); p.rect(cx + 1 + q.legB, 35, 6, 2, '#1a0a0a');
  if (elite) {
    p.rect(cx - 6 + q.legA, 27, 5, 6, P.armor); p.rect(cx + 2 + q.legB, 27, 5, 6, P.armorDark);
  }
  // torso
  p.ellipse(cx, 20 + o, 10, 9, P.skin);
  p.ellipse(cx - 2, 18 + o, 5, 4, P.skinLight);
  p.rect(cx - 9, 25 + o, 18, 3, elite ? P.armorDark : '#3a2418');
  p.px(cx, 26 + o, '#c8a040');
  if (elite) {
    p.ellipse(cx, 18 + o, 9, 7, P.armor);
    p.rect(cx - 8, 13 + o, 16, 2, shade(P.armor, 0.3));
    p.px(cx - 3, 18 + o, P.glow); p.px(cx + 3, 18 + o, P.glow);
  }
  // head
  p.ellipse(cx - 3, 9 + o, 5, 4.5, P.skin);
  p.rect(cx - 9, 9 + o, 5, 3, P.skin);
  p.px(cx - 7, 8 + o, P.eye); p.px(cx - 4, 8 + o, P.eye);
  p.rect(cx - 9, 12 + o, 5, 1, '#2a0a0a');
  p.px(cx - 8, 11 + o, '#ffffff'); p.px(cx - 6, 11 + o, '#ffffff');
  if (elite) { p.rect(cx - 7, 4 + o, 9, 4, P.armor); p.rect(cx - 9, 7 + o, 2, 3, P.armor); }
  // horns big
  p.line(cx - 4, 5 + o, cx - 1, 1 + o, P.horn); p.line(cx - 1, 1 + o, cx + 3, 0 + o, P.horn);
  p.line(cx, 6 + o, cx + 4, 3 + o, P.horn); p.line(cx + 4, 3 + o, cx + 7, 4 + o, P.horn);
  // arms
  const fx = q.strike ? cx - 16 : q.wind ? cx - 6 : cx - 12;
  const fy = q.wind ? 6 : q.strike ? 22 : 20;
  p.thickLine(cx - 7, 15 + o, fx, fy + o, P.skin, 4);
  p.ellipse(fx, fy + o + 1, 3, 3, P.skinDark);
  p.thickLine(cx + 8, 15 + o, cx + 11, 24 + o, P.skinDark, 4);
  // weapon
  if (elite) {
    // big dark blade
    const tipx = q.strike ? fx - 10 : q.wind ? fx + 4 : fx - 3;
    const tipy = q.strike ? fy + 10 : q.wind ? fy - 12 : fy - 14;
    p.thickLine(fx, fy + o, tipx, tipy + o, P.armorDark, 3);
    p.line(fx, fy + o, tipx, tipy + o, P.glow);
  } else {
    // club
    const tipx = q.strike ? fx - 9 : q.wind ? fx + 5 : fx - 2;
    const tipy = q.strike ? fy + 8 : q.wind ? fy - 11 : fy - 12;
    p.thickLine(fx, fy + o, tipx, tipy + o, '#6a4a2a', 3);
    p.ellipse(tipx, tipy + o, 3, 3, '#7a5a3a');
    p.px(tipx - 2, tipy - 2 + o, '#c8c8c8'); p.px(tipx + 2, tipy - 1 + o, '#c8c8c8');
  }
  p.autoShade(0.2);
  p.outline('#120608');
  return p;
}

function drawRobed(P: DemonPalette, f: number, kind: 'archer' | 'sorcerer' | 'shaman' | 'summoner'): PixelCanvas {
  const [W, H] = DEMON_SIZES[kind];
  const p = new PixelCanvas(W, H);
  const q = pose(f);
  const o = q.bob;
  const cx = 14;
  const robe = kind === 'archer' ? P.armor : kind === 'shaman' ? '#3a4a2a' : kind === 'summoner' ? P.armorDark : P.cloth;
  const base = H - 4;
  // tail
  p.line(cx + 4, base - 4, cx + 9, base - 7, P.skinDark); p.px(cx + 10, base - 8, P.skinDark);
  if (kind === 'archer') {
    p.rect(cx - 3 + q.legA, base - 6, 2, 5, P.skinDark);
    p.rect(cx + 1 + q.legB, base - 6, 2, 5, P.skinDark);
    p.rect(cx - 4, base - 15 + o, 8, 10, robe);
    p.rect(cx - 4, base - 7 + o, 8, 1, '#5a3a2a');
  } else {
    p.poly([[cx - 4, base - 15 + o], [cx + 4, base - 15 + o], [cx + 6 + q.legB, base], [cx - 6 + q.legA, base]], robe);
    p.rect(cx - 6, base - 1, 12, 1, shade(robe, -0.3));
    p.line(cx, base - 14 + o, cx, base - 1, shade(robe, 0.25));
  }
  // head
  const hy = base - 20 + o;
  p.ellipse(cx - 1, hy, 3.5, 3.5, P.skin);
  p.rect(cx - 5, hy, 3, 2, P.skin);
  p.px(cx - 4, hy - 1, P.eye); p.px(cx - 2, hy - 1, P.eye);
  if (kind === 'sorcerer' || kind === 'summoner') {
    p.poly([[cx - 4, hy - 2], [cx + 4, hy - 4], [cx + 5, hy + 3], [cx + 1, hy + 3]], robe);
    p.poly([[cx - 1, hy - 4], [cx + 4, hy - 4], [cx + 6, hy - 9]], robe);
  }
  horns(p, cx - 1, hy - 4, P.horn, kind === 'summoner'); horns(p, cx + 2, hy - 4, P.horn, kind === 'summoner');
  if (kind === 'shaman') {
    // skull mask
    p.rect(cx - 5, hy - 2, 4, 4, '#e8e0c8'); p.px(cx - 4, hy - 1, '#1a0a0a'); p.px(cx - 2, hy - 1, '#1a0a0a');
    p.px(cx + 1, hy - 5, '#e8e0c8'); p.px(cx + 3, hy - 6, '#e8e0c8');
  }
  // arms/weapons
  const handX = q.strike ? cx - 9 : q.wind ? cx - 4 : cx - 6;
  const handY = q.wind ? base - 18 + o : base - 12 + o;
  p.line(cx - 2, base - 14 + o, handX, handY, P.skinDark);
  if (kind === 'archer') {
    // bow facing left
    const bx = handX - 1, top = handY - 6, bot = handY + 5;
    for (let y = top; y <= bot; y++) { const t = (y - top) / (bot - top); p.px(bx - Math.round(Math.sin(t * Math.PI) * 3), y, '#3a2a1a'); }
    const sx = q.wind ? bx + 4 : bx;
    p.line(bx, top, sx, handY, '#c8a0a0'); p.line(sx, handY, bx, bot, '#c8a0a0');
    if (!q.strike) { p.line(sx, handY, bx - 5, handY, '#3a2a1a'); p.px(bx - 6, handY, P.glow); }
  } else {
    const glow = kind === 'shaman' ? '#7aff5a' : P.glow;
    // staff
    p.line(handX + 1, handY - 8, handX + 1, base, kind === 'shaman' ? '#a08a5a' : '#2a1a1a');
    if (kind === 'shaman') { p.rect(handX, handY - 11, 3, 3, '#e8e0c8'); p.px(handX + 1, handY - 10, glow); }
    else p.ellipse(handX + 1, handY - 9, q.strike ? 2.4 : 1.6, q.strike ? 2.4 : 1.6, glow);
    if (q.strike || q.wind) { p.px(handX - 2, handY - 12, glow); p.px(handX + 4, handY - 11, glow); }
    if (kind === 'summoner') { p.px(cx + 6, base - 2, '#ffd24a'); p.px(cx + 6, base - 3, '#ff7a2a'); }
  }
  p.autoShade(0.18);
  p.outline('#120608');
  return p;
}

function drawFlyer(P: DemonPalette, f: number): PixelCanvas {
  const p = new PixelCanvas(34, 30);
  const q = pose(f);
  const up = f % 2 === 0;
  const o = up ? 0 : 2;
  const wing = shade(P.skinDark, -0.1);
  // wings (membrane)
  if (up) {
    p.poly([[16, 12], [28, 1], [33, 6], [30, 9], [26, 9], [22, 14]], wing);
    p.poly([[14, 12], [6, 2], [2, 7], [5, 10], [9, 10], [12, 15]], shade(wing, -0.2));
    p.line(16, 12, 28, 1, P.horn); p.line(14, 12, 6, 2, P.horn);
  } else {
    p.poly([[16, 13], [30, 18], [32, 22], [27, 21], [23, 23], [19, 17]], wing);
    p.poly([[14, 13], [3, 18], [2, 22], [6, 21], [10, 23], [13, 17]], shade(wing, -0.2));
  }
  // body
  p.ellipse(15, 15 + o, 4, 5, P.skin);
  p.ellipse(11, 10 + o, 3.5, 3.2, P.skin);
  p.rect(7, 10 + o, 3, 2, P.skin);
  p.px(8, 9 + o, P.eye); p.px(10, 9 + o, P.eye);
  horns(p, 11, 7 + o, P.horn); horns(p, 13, 7 + o, P.horn);
  // legs / talons
  p.line(13, 19 + o, 12, 23 + o, P.skinDark); p.line(17, 19 + o, 17, 23 + o, P.skinDark);
  p.px(11, 24 + o, P.horn); p.px(16, 24 + o, P.horn);
  // tail
  p.line(19, 18 + o, 23, 23 + o, P.skinDark); p.px(24, 24 + o, P.glow);
  if (q.strike) { p.line(8, 14 + o, 4, 17 + o, P.skinDark); p.px(3, 17 + o, P.horn); }
  p.autoShade(0.18);
  p.outline('#120608');
  return p;
}

export function drawDemonFrame(id: EnemyId, P: DemonPalette, frame: number): PixelCanvas {
  switch (id) {
    case 'imp': return drawImp(P, frame);
    case 'bomber': return drawImp(P, frame, true);
    case 'hound': return drawHound(P, frame);
    case 'brute': return drawBrute(P, frame);
    case 'elite': return drawBrute(P, frame, true);
    case 'archer': return drawRobed(P, frame, 'archer');
    case 'sorcerer': return drawRobed(P, frame, 'sorcerer');
    case 'shaman': return drawRobed(P, frame, 'shaman');
    case 'summoner': return drawRobed(P, frame, 'summoner');
    case 'flyer': return drawFlyer(P, frame);
  }
}
