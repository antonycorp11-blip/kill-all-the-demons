// Six hand-built procedural bosses. 4 frames: idle0, idle1, cast (telegraph pose), strike. Facing left.
import { PixelCanvas, shade, mulberry } from './pixel';

export const BOSS_W = 72;
export const BOSS_H = 72;
export const BOSS_FRAMES = 4;

type Drawer = (p: PixelCanvas, f: number) => void;

const mordrak: Drawer = (p, f) => {
  const o = f === 1 ? 1 : 0;
  const cast = f === 2, strike = f === 3;
  const bark = '#5a3a24', barkD = '#3a2416', barkL = '#7a5434', moss = '#4a7a2a', glow = '#ff3a2a';
  const r = mulberry(7);
  // roots
  for (let i = 0; i < 7; i++) {
    const x = 18 + i * 6;
    p.thickLine(x, 56, x + (r() * 10 - 5), 68, barkD, 3);
  }
  // trunk body
  p.poly([[22, 60], [50, 60], [54, 30 + o], [44, 14 + o], [28, 14 + o], [18, 30 + o]], bark);
  for (let i = 0; i < 10; i++) { const y = 20 + i * 4; p.line(24 + (i % 3), y + o, 26 + (i % 3), y + 3 + o, barkD); p.line(44 - (i % 2), y + o, 46 - (i % 2), y + 3 + o, barkD); }
  p.poly([[26, 34 + o], [46, 34 + o], [42, 48 + o], [30, 48 + o]], barkD);
  // demonic face
  p.rect(26, 26 + o, 6, 3, '#1a0808'); p.rect(38, 26 + o, 6, 3, '#1a0808');
  p.rect(27, 27 + o, 4, 1, glow); p.rect(39, 27 + o, 4, 1, glow);
  p.poly([[27, 36 + o], [43, 36 + o], [40, 44 + o], [30, 44 + o]], '#1a0808');
  for (let x = 28; x < 43; x += 3) { p.px(x, 37 + o, '#e8d6b0'); p.px(x + 1, 43 + o, '#e8d6b0'); }
  p.ellipse(35, 40 + o, 3, 1.5, cast ? '#ff7a2a' : '#7a1a0a');
  // branch horns
  p.thickLine(30, 15 + o, 22, 4 + o, barkL, 3); p.thickLine(22, 4 + o, 14, 2 + o, barkL, 2); p.thickLine(24, 7 + o, 20, 0 + o, barkL, 2);
  p.thickLine(42, 15 + o, 50, 4 + o, barkL, 3); p.thickLine(50, 4 + o, 58, 3 + o, barkL, 2); p.thickLine(48, 7 + o, 53, 0 + o, barkL, 2);
  // moss
  for (let i = 0; i < 40; i++) { const x = 20 + r() * 34, y = 14 + r() * 40; if (p.get(Math.round(x), Math.round(y)) > 0) p.px(x, y + o, r() > 0.5 ? moss : shade(moss, 0.2)); }
  // arms (branches) - left one swings
  const ax = strike ? 2 : cast ? 10 : 8, ay = strike ? 52 : cast ? 10 : 42;
  p.thickLine(22, 30 + o, ax, ay, bark, 4);
  p.thickLine(ax, ay, ax - 4, ay + 4, barkL, 2); p.thickLine(ax, ay, ax - 2, ay - 5, barkL, 2); p.thickLine(ax, ay, ax + 3, ay + 6, barkL, 2);
  p.thickLine(50, 30 + o, 62, 44 + o, bark, 4);
  p.thickLine(62, 44 + o, 66, 48 + o, barkL, 2); p.thickLine(62, 44 + o, 66, 40 + o, barkL, 2);
  // glowing cracks
  p.line(34, 50 + o, 36, 58, glow); p.line(30, 20 + o, 32, 24 + o, glow);
  if (cast) for (let i = 0; i < 8; i++) p.px(10 + r() * 52, 4 + r() * 20, '#ff5a3a');
  p.autoShade(0.15);
  p.outline('#0e0606');
};

const vulgrath: Drawer = (p, f) => {
  const o = f === 1 ? 1 : 0;
  const cast = f === 2, strike = f === 3;
  const skin = '#d8552a', skinD = '#8a2a12', skinL = '#ff8a4a', hood = '#1e1416', iron = '#5a5a66';
  // legs
  p.rect(26, 50, 8, 16, skinD); p.rect(40, 50, 8, 16, shade(skinD, -0.15));
  p.rect(24, 64, 11, 4, '#1a0a0a'); p.rect(39, 64, 11, 4, '#1a0a0a');
  // loincloth/belt
  p.rect(22, 46 + o, 30, 6, '#3a2418'); p.rect(30, 50 + o, 12, 10, '#2a1a12');
  p.rect(34, 47 + o, 4, 3, '#c8a040');
  // torso massive
  p.ellipse(37, 34 + o, 17, 15, skin);
  p.ellipse(33, 30 + o, 8, 6, skinL);
  p.line(37, 26 + o, 37, 44 + o, skinD);
  // chains
  for (let i = 0; i < 9; i++) p.px(24 + i * 3, 22 + i * 2 + o, iron);
  // head with executioner hood
  p.ellipse(30, 15 + o, 8, 8, hood);
  p.poly([[24, 8 + o], [38, 8 + o], [42, 1 + o]], hood);
  p.rect(23, 13 + o, 10, 3, '#0a0606');
  p.px(25, 14 + o, '#fff07a'); p.px(29, 14 + o, '#fff07a');
  p.rect(22, 18 + o, 8, 3, skin); p.px(23, 20 + o, '#ffffff'); p.px(27, 20 + o, '#ffffff');
  // horns through hood
  p.thickLine(34, 9 + o, 42, 3 + o, '#2a1a12', 2); p.thickLine(42, 3 + o, 47, 6 + o, '#2a1a12', 2);
  // right arm (back)
  p.thickLine(52, 28 + o, 58, 44 + o, skinD, 6);
  // axe arm
  const hx = strike ? 12 : cast ? 26 : 14, hy = strike ? 44 : cast ? 20 : 34;
  p.thickLine(24, 26 + o, hx, hy, skin, 6);
  p.ellipse(hx, hy, 3.5, 3.5, skinD);
  // giant axe
  const ang = strike ? 2.0 : cast ? -1.75 : -1.2;
  const dx = Math.cos(ang), dy = Math.sin(ang);
  const L = strike ? 18 : cast ? 17 : 26;
  p.thickLine(hx - dx * 6, hy - dy * 6, hx + dx * L, hy + dy * L, '#5a3a22', 3);
  const tx = hx + dx * L, ty = hy + dy * L;
  const nx = -dy, ny = dx;
  p.poly([[tx, ty], [tx - dx * 8, ty - dy * 8], [tx - dx * 10 + nx * -10, ty - dy * 10 + ny * -10], [tx + dx * 3 + nx * -12, ty + dy * 3 + ny * -12]], iron);
  p.line(tx + dx * 3 + nx * -12, ty + dy * 3 + ny * -12, tx - dx * 10 + nx * -10, ty - dy * 10 + ny * -10, '#e8e8f0');
  if (cast) { p.px(tx + nx * -6, ty + ny * -6, '#ffa23a'); p.px(tx + nx * -8 - dx * 4, ty + ny * -8 - dy * 4, '#ffa23a'); }
  p.autoShade(0.16);
  p.outline('#0e0606');
};

const ssaelith: Drawer = (p, f) => {
  const o = f === 1 ? 1 : 0;
  const cast = f === 2, strike = f === 3;
  const sc = '#4a9a6a', scD = '#2a5a3a', scL = '#8ad0a0', belly = '#c8e0a0', glow = '#5affb0';
  // coiled serpent tail
  p.ellipse(42, 58, 20, 8, scD);
  p.ellipse(42, 56, 18, 6, sc);
  p.ellipse(34, 52 + o, 12, 6, scD);
  p.ellipse(34, 50 + o, 10, 4.5, sc);
  for (let x = 26; x < 60; x += 4) p.px(x, 56 - ((x / 4) % 2), scL);
  p.thickLine(60, 58, 68, 50, sc, 3); p.px(69, 48, scL);
  // upper body
  p.poly([[28, 50 + o], [42, 50 + o], [40, 26 + o], [30, 26 + o]], sc);
  p.poly([[31, 48 + o], [39, 48 + o], [37, 30 + o], [33, 30 + o]], belly);
  for (let y = 32; y < 48; y += 3) p.line(32, y + o, 38, y + o, shade(belly, -0.15));
  // head
  p.ellipse(34, 18 + o, 6, 7, sc);
  p.rect(27, 18 + o, 5, 3, sc);
  p.px(29, 17 + o, '#ff3a6a'); p.px(33, 17 + o, '#ff3a6a');
  p.line(27, 21 + o, 31, 21 + o, '#1a0a10'); p.px(28, 22 + o, '#ffffff');
  // hood/frill
  p.poly([[36, 10 + o], [46, 14 + o], [44, 28 + o], [38, 24 + o]], scD);
  p.poly([[34, 8 + o], [42, 4 + o], [40, 12 + o]], scD);
  // crown of bones
  for (let i = 0; i < 5; i++) p.line(30 + i * 2, 11 + o, 29 + i * 2, 7 + o - (i % 2) * 2, '#e8e0c8');
  // arms + staff
  const hx = strike ? 14 : cast ? 22 : 22, hy = strike ? 34 : cast ? 18 : 34;
  p.thickLine(30, 30 + o, hx, hy, sc, 3);
  p.thickLine(hx, hy - 20, hx, hy + 20, '#3a2a1a', 2);
  p.ellipse(hx, hy - 22, cast ? 4 : 3, cast ? 4 : 3, glow);
  p.px(hx - 1, hy - 23, '#ffffff');
  p.thickLine(40, 30 + o, 48, 40 + o, scD, 3);
  if (cast) { p.ring(hx, hy - 22, 6, 6, glow, 1, 0.7); p.px(hx - 8, hy - 26, glow); p.px(hx + 7, hy - 30, glow); }
  p.autoShade(0.16);
  p.outline('#061008');
};

const kaedros: Drawer = (p, f) => {
  const o = f === 1 ? 1 : 0;
  const cast = f === 2, strike = f === 3;
  const arm = '#2a2a3a', armD = '#141420', armL = '#4a4a62', glow = '#b05aff', cape = '#4a1a5a';
  // tattered cape
  p.poly([[34, 18 + o], [52, 18 + o], [60, 64], [52, 60], [48, 66], [42, 61], [36, 66]], cape);
  p.poly([[44, 22 + o], [52, 22 + o], [58, 62], [50, 58]], shade(cape, -0.3));
  // legs
  p.rect(28, 46, 7, 18, armD); p.rect(39, 46, 7, 18, arm);
  p.rect(26, 62, 10, 4, armD); p.rect(38, 62, 10, 4, armD);
  p.rect(28, 50, 7, 2, armL); p.rect(39, 50, 7, 2, armL);
  // torso armor
  p.poly([[24, 22 + o], [48, 22 + o], [46, 46 + o], [26, 46 + o]], arm);
  p.rect(26, 24 + o, 20, 3, armL);
  p.poly([[32, 28 + o], [40, 28 + o], [36, 40 + o]], glow);
  p.px(36, 32 + o, '#ffffff');
  p.rect(24, 44 + o, 24, 3, armD);
  // pauldrons with spikes
  p.ellipse(24, 23 + o, 6, 4, armL); p.ellipse(48, 23 + o, 6, 4, arm);
  p.line(20, 20 + o, 17, 15 + o, '#e0d0ff'); p.line(50, 20 + o, 54, 15 + o, '#e0d0ff');
  // helm
  p.rect(28, 8 + o, 14, 13, arm);
  p.rect(28, 13 + o, 14, 2, armD);
  p.rect(29, 13 + o, 4, 1, glow); p.rect(35, 13 + o, 4, 1, glow);
  p.rect(30, 17 + o, 1, 3, armD); p.rect(33, 17 + o, 1, 3, armD); p.rect(36, 17 + o, 1, 3, armD);
  p.thickLine(30, 9 + o, 24, 1 + o, '#e0d0ff', 2); p.thickLine(40, 9 + o, 46, 1 + o, '#e0d0ff', 2);
  // greatsword
  const hx = strike ? 12 : cast ? 24 : 18, hy = strike ? 44 : cast ? 26 : 36;
  p.thickLine(26, 26 + o, hx, hy, arm, 5);
  p.ellipse(hx, hy, 3, 3, armL);
  const ang = strike ? 2.6 : cast ? -1.4 : -1.25;
  const dx = Math.cos(ang), dy = Math.sin(ang);
  p.thickLine(hx - dy * 5, hy + dx * 5, hx + dy * 5, hy - dx * 5, '#c8a040', 2);
  const SL = cast ? 23 : 30;
  p.thickLine(hx + dx * 2, hy + dy * 2, hx + dx * SL, hy + dy * SL, '#3a3a4e', 4);
  p.line(hx + dx * 2, hy + dy * 2, hx + dx * SL, hy + dy * SL, glow);
  p.thickLine(48, 26 + o, 54, 40 + o, arm, 4);
  if (cast) for (let i = 0; i < 6; i++) p.px(hx + dx * (6 + i * 4) + (i % 2 ? 3 : -3), hy + dy * (6 + i * 4), '#e0b0ff');
  p.autoShade(0.14);
  p.outline('#08060e');
};

const ignar: Drawer = (p, f) => {
  const o = f === 1 ? 1 : 0;
  const cast = f === 2, strike = f === 3;
  const sc = '#3a3434', scD = '#1e1a1a', scL = '#6a5a52', lava = '#ff5a1a', bright = '#ffd23a';
  const up = f !== 1;
  // wings
  if (up) {
    p.poly([[40, 26], [56, 2], [70, 4], [66, 14], [70, 22], [60, 24], [62, 32], [50, 34]], scD);
    p.line(40, 26, 56, 2, scL); p.line(56, 2, 66, 14, scL); p.line(56, 2, 60, 24, scL);
  } else {
    p.poly([[40, 26], [62, 20], [71, 30], [64, 34], [68, 42], [56, 40], [52, 46], [46, 36]], scD);
    p.line(40, 26, 62, 20, scL); p.line(62, 20, 64, 34, scL);
  }
  // tail
  p.thickLine(48, 50, 62, 58, sc, 4); p.thickLine(62, 58, 70, 54, sc, 2); p.px(70, 52, lava);
  // body
  p.ellipse(42, 44 + o, 13, 10, sc);
  p.ellipse(40, 47 + o, 8, 5, scL);
  for (let i = 0; i < 6; i++) p.line(34 + i * 3, 42 + o, 35 + i * 3, 48 + o, lava);
  // legs
  p.thickLine(34, 50 + o, 30, 64, scD, 5); p.thickLine(48, 50 + o, 50, 64, sc, 5);
  p.rect(27, 63, 6, 3, '#0a0606'); p.rect(48, 63, 6, 3, '#0a0606');
  p.px(27, 66, bright); p.px(48, 66, bright);
  // neck
  const nx = cast ? 26 : strike ? 18 : 24, ny = cast ? 10 : strike ? 30 : 16;
  p.thickLine(34, 38 + o, nx + 4, ny + 6, sc, 6);
  for (let i = 0; i < 4; i++) p.px(32 - i * 1.5 + (nx - 24) * 0.3, 32 - i * 4 + (ny - 16) * 0.5, lava);
  // head
  p.ellipse(nx, ny, 7, 5, sc);
  p.poly([[nx - 6, ny - 2], [nx - 16, ny + 1], [nx - 15, ny + 4], [nx - 5, ny + 4]], sc);
  p.px(nx - 4, ny - 2, bright); p.px(nx - 3, ny - 2, bright);
  p.line(nx - 15, ny + 3, nx - 6, ny + 3, '#1a0a0a');
  // horns
  p.thickLine(nx + 2, ny - 4, nx + 10, ny - 10, '#ff9a3a', 2); p.thickLine(nx + 5, ny - 2, nx + 13, ny - 5, '#ff9a3a', 2);
  if (cast || strike) {
    p.ellipse(nx - 17, ny + 2, 3, 2, bright);
    p.px(nx - 21, ny + 1, lava); p.px(nx - 20, ny + 4, lava);
  }
  p.autoShade(0.14);
  p.outline('#0a0404');
};

const azhgore: Drawer = (p, f) => {
  const o = f === 1 ? 1 : 0;
  const cast = f === 2, strike = f === 3;
  const skin = '#5a2a6a', skinD = '#33163e', skinL = '#8a4a9a', gold = '#e8b03a', lava = '#ff3a2a', bright = '#ffd23a', wing = '#6a1a2a';
  const flap = f === 1 ? 3 : 0;
  // wings both sides
  p.poly([[44, 22], [60, 4 + flap], [71, 8 + flap], [66, 18], [70, 28], [62, 28], [64, 38], [52, 34]], wing);
  p.line(44, 22, 60, 4 + flap, '#c86a5a'); p.line(60, 4 + flap, 66, 18, '#c86a5a'); p.line(60, 4 + flap, 62, 28, '#c86a5a');
  p.poly([[26, 22], [12, 4 + flap], [1, 8 + flap], [6, 18], [2, 28], [10, 28], [8, 38], [20, 34]], shade(wing, -0.2));
  p.line(26, 22, 12, 4 + flap, '#a85a4a'); p.line(12, 4 + flap, 6, 18, '#a85a4a');
  // legs
  p.thickLine(30, 50, 26, 64, skinD, 7); p.thickLine(44, 50, 46, 64, skin, 7);
  p.rect(22, 63, 9, 4, '#120608'); p.rect(43, 63, 9, 4, '#120608');
  p.px(22, 66, gold); p.px(43, 66, gold);
  // torso
  p.ellipse(36, 38 + o, 16, 14, skin);
  p.ellipse(33, 34 + o, 8, 6, skinL);
  // lava veins
  p.line(30, 40 + o, 34, 50 + o, lava); p.line(40, 30 + o, 44, 44 + o, lava); p.line(36, 36 + o, 38, 48 + o, lava);
  // gold armor plates
  p.rect(22, 46 + o, 28, 4, gold); p.rect(34, 46 + o, 4, 4, lava);
  p.ellipse(22, 26 + o, 6, 4, gold); p.ellipse(50, 26 + o, 6, 4, shade(gold, -0.2));
  p.line(18, 24 + o, 15, 19 + o, '#f0e0c0'); p.line(52, 24 + o, 56, 19 + o, '#f0e0c0');
  // head
  p.ellipse(34, 16 + o, 8, 8, skin);
  p.rect(26, 17 + o, 6, 4, skin);
  p.rect(27, 14 + o, 3, 2, bright); p.rect(33, 14 + o, 3, 2, bright);
  p.rect(26, 20 + o, 9, 2, '#1a0a10');
  p.px(27, 20 + o, '#ffffff'); p.px(30, 20 + o, '#ffffff'); p.px(33, 20 + o, '#ffffff');
  p.px(27, 22 + o, '#ffffff'); p.px(32, 22 + o, '#ffffff');
  // crown horns (big curved)
  p.thickLine(30, 10 + o, 22, 4 + o, '#f0e0c0', 3); p.thickLine(22, 4 + o, 20, 10 + o, '#f0e0c0', 2);
  p.thickLine(38, 10 + o, 46, 2 + o, '#f0e0c0', 3); p.thickLine(46, 2 + o, 50, 6 + o, '#f0e0c0', 2);
  p.rect(30, 8 + o, 8, 2, gold); p.px(34, 7 + o, lava);
  // arms with claws
  const hx = strike ? 6 : cast ? 16 : 14, hy = strike ? 50 : cast ? 10 : 40;
  p.thickLine(24, 28 + o, hx, hy, skin, 6);
  p.ellipse(hx, hy, 4, 4, skinD);
  p.line(hx - 4, hy, hx - 7, hy + 3, '#f0e0c0'); p.line(hx - 3, hy + 3, hx - 5, hy + 6, '#f0e0c0'); p.line(hx - 1, hy - 3, hx - 4, hy - 6, '#f0e0c0');
  p.thickLine(48, 28 + o, 56, 44 + o, skinD, 6);
  p.line(56, 46 + o, 58, 50 + o, '#f0e0c0'); p.line(54, 47 + o, 54, 51 + o, '#f0e0c0');
  if (cast) { p.ellipse(hx, hy - 7, 4, 4, lava); p.ellipse(hx, hy - 7, 2, 2, bright); p.ring(hx, hy - 7, 7, 7, lava, 1, 0.6); }
  p.autoShade(0.14);
  p.outline('#0a0408');
};

const DRAWERS: Record<string, Drawer> = { mordrak, vulgrath, ssaelith, kaedros, ignar, azhgore };

export function drawBossFrame(id: string, frame: number): PixelCanvas {
  const p = new PixelCanvas(BOSS_W, BOSS_H);
  (DRAWERS[id] || azhgore)(p, frame);
  return p;
}
