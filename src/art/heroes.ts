// Procedural chibi heroes (48x48). Frames: 0 idle, 1 idle bob, 2 cast (ability wind-up), 3 strike. Facing right.
import { PixelCanvas, shade } from './pixel';

export const HERO_W = 48;
export const HERO_H = 48;
export const HERO_FRAMES = 4;

type HWeapon = 'hammer' | 'bow' | 'staff' | 'axe' | 'holy' | 'lance';
interface HLook {
  skin: string; hair: string; armor: string; armorD: string; trim: string; cloth: string; cape?: string;
  helm: 'crest' | 'elf' | 'hat' | 'horned' | 'halo' | 'dragon';
  weapon: HWeapon; weaponC: string; glow: string;
  wings?: string; robe?: boolean; beard?: boolean;
}

const LOOKS: Record<string, HLook> = {
  arthon: { skin: '#f2c79a', hair: '#e8c060', armor: '#f4f0e0', armorD: '#b8b0a0', trim: '#ffcf3a', cloth: '#3a64d8', cape: '#2a48c0', helm: 'crest', weapon: 'hammer', weaponC: '#ffd24a', glow: '#fff2a0' },
  lyra: { skin: '#f6d6b8', hair: '#e8f0ff', armor: '#3a8a5a', armorD: '#22583a', trim: '#c8e0ff', cloth: '#5ab07a', cape: '#2a6a4a', helm: 'elf', weapon: 'bow', weaponC: '#c8e0ff', glow: '#8affff' },
  elandra: { skin: '#f6d6b8', hair: '#2a1a3a', armor: '#5a2aa8', armorD: '#341870', trim: '#ffd24a', cloth: '#7a4ae0', cape: '#2a1a6a', helm: 'hat', weapon: 'staff', weaponC: '#c8a050', glow: '#c08aff', robe: true },
  brannoc: { skin: '#e8b08a', hair: '#c8401a', armor: '#7a5a3a', armorD: '#4a3420', trim: '#c8c8d0', cloth: '#8a2a1a', cape: '#5a3a2a', helm: 'horned', weapon: 'axe', weaponC: '#d0d4dc', glow: '#ff6a3a', beard: true },
  seraphiel: { skin: '#fbe6d0', hair: '#ffe8a0', armor: '#ffffff', armorD: '#d0d0e0', trim: '#ffd24a', cloth: '#f0f0ff', wings: '#ffffff', helm: 'halo', weapon: 'holy', weaponC: '#ffd24a', glow: '#ffffff', robe: true },
  kael: { skin: '#e8c09a', hair: '#1a2a2a', armor: '#2a6a6a', armorD: '#164040', trim: '#8affd0', cloth: '#1a4a4a', wings: '#1e5a50', helm: 'dragon', weapon: 'lance', weaponC: '#d0f0e8', glow: '#3affd0' },
};

function drawHeroWeapon(p: PixelCanvas, L: HLook, hx: number, hy: number, frame: number) {
  const cast = frame === 2, strike = frame === 3;
  const wc = L.weaponC;
  switch (L.weapon) {
    case 'hammer': {
      const a = strike ? 0.4 : cast ? -2.2 : -1.2;
      const dx = Math.cos(a), dy = Math.sin(a);
      p.thickLine(hx - dx * 3, hy - dy * 3, hx + dx * 16, hy + dy * 16, '#8a6a3a', 2);
      const tx = hx + dx * 16, ty = hy + dy * 16;
      p.poly([[tx - dy * 6 - dx * 3, ty + dx * 6 - dy * 3], [tx + dy * 6 - dx * 3, ty - dx * 6 - dy * 3], [tx + dy * 6 + dx * 4, ty - dx * 6 + dy * 4], [tx - dy * 6 + dx * 4, ty + dx * 6 + dy * 4]], wc);
      p.px(tx, ty, '#ffffff');
      if (cast) p.ring(tx, ty, 8, 8, L.glow, 1, 0.8);
      break;
    }
    case 'axe': {
      const a = strike ? 0.5 : cast ? -2.4 : -1.3;
      const dx = Math.cos(a), dy = Math.sin(a);
      p.thickLine(hx - dx * 4, hy - dy * 4, hx + dx * 18, hy + dy * 18, '#6a4a2a', 2);
      const tx = hx + dx * 15, ty = hy + dy * 15;
      const nx = -dy, ny = dx;
      p.poly([[tx, ty], [tx + dx * 6, ty + dy * 6], [tx + dx * 9 + nx * 9, ty + dy * 9 + ny * 9], [tx - dx * 3 + nx * 10, ty - dy * 3 + ny * 10]], wc);
      p.poly([[tx, ty], [tx + dx * 6, ty + dy * 6], [tx + dx * 8 - nx * 6, ty + dy * 8 - ny * 6], [tx - dx * 2 - nx * 6, ty - dy * 2 - ny * 6]], shade(wc, -0.15));
      p.line(tx + dx * 9 + nx * 9, ty + dy * 9 + ny * 9, tx - dx * 3 + nx * 10, ty - dy * 3 + ny * 10, '#ffffff');
      break;
    }
    case 'lance': {
      const a = strike ? 0.05 : cast ? -0.9 : -0.35;
      const dx = Math.cos(a), dy = Math.sin(a);
      p.thickLine(hx - dx * 8, hy - dy * 8, hx + dx * 24, hy + dy * 24, wc, 2);
      const tx = hx + dx * 24, ty = hy + dy * 24;
      p.poly([[tx, ty - 3 * dx], [tx + dx * 8, ty + dy * 8], [tx, ty + 3 * dx]], '#ffffff');
      p.poly([[hx + dx * 2 - dy * 4, hy + dy * 2 + dx * 4], [hx + dx * 2 + dy * 4, hy + dy * 2 - dx * 4], [hx + dx * 6, hy + dy * 6]], L.trim);
      if (cast) p.px(tx + dx * 9, ty + dy * 9, L.glow);
      break;
    }
    case 'bow': {
      const bx = hx + 2, top = hy - 12, bot = hy + 11;
      for (let y = top; y <= bot; y++) {
        const t = (y - top) / (bot - top);
        const x = bx + Math.round(Math.sin(t * Math.PI) * 5);
        p.rect(x, y, 2, 1, wc);
      }
      p.px(bx, top, L.glow); p.px(bx, bot, L.glow);
      const sx = cast ? bx - 7 : bx;
      p.line(bx, top, sx, hy, '#ffffff'); p.line(sx, hy, bx, bot, '#ffffff');
      if (!strike) { p.line(sx, hy, bx + 10, hy, '#c8a070'); p.rect(bx + 10, hy - 1, 2, 3, L.glow); }
      break;
    }
    case 'staff':
    case 'holy': {
      const a = cast ? -1.9 : strike ? -0.6 : -1.45;
      const dx = Math.cos(a), dy = Math.sin(a);
      p.thickLine(hx - dx * 9, hy - dy * 9, hx + dx * 18, hy + dy * 18, wc, 2);
      const tx = hx + dx * 20, ty = hy + dy * 20;
      if (L.weapon === 'holy') {
        p.ring(tx, ty, 4, 4, '#ffd24a', 1);
        p.rect(tx - 1, ty - 6, 2, 12, '#fff6c0'); p.rect(tx - 4, ty - 1, 8, 2, '#fff6c0');
        p.px(tx, ty, '#ffffff');
      } else {
        p.ellipse(tx, ty, cast ? 4 : 3, cast ? 4 : 3, L.glow);
        p.ellipse(tx - 1, ty - 1, 1.4, 1.4, '#ffffff');
      }
      if (cast || strike) p.ring(tx, ty, 7, 7, L.glow, 1, 0.7);
      break;
    }
  }
}

export function drawHeroFrame(id: string, frame: number): PixelCanvas {
  const L = LOOKS[id] || LOOKS.arthon;
  const p = new PixelCanvas(HERO_W, HERO_H);
  const oy = frame === 1 ? 1 : 0;
  const cast = frame === 2;
  // wings (behind everything)
  if (L.wings) {
    const flap = frame === 1 ? 2 : cast ? -3 : 0;
    const wd = shade(L.wings, -0.2);
    p.poly([[18, 24 + oy], [4, 8 + flap], [1, 16 + flap], [5, 22], [2, 28], [8, 30], [14, 32]], wd);
    p.poly([[26, 24 + oy], [40, 6 + flap], [46, 12 + flap], [42, 20], [46, 26], [38, 30], [30, 32]], L.wings);
    for (let i = 0; i < 4; i++) { p.line(26, 24 + oy, 40 - i * 2, 8 + flap + i * 6, shade(L.wings, -0.12)); p.line(18, 24 + oy, 5 + i * 2, 10 + flap + i * 6, shade(wd, -0.12)); }
  }
  // cape
  if (L.cape) {
    p.poly([[16, 26 + oy], [27, 26 + oy], [29, 45], [11, 45]], L.cape);
    p.poly([[16, 26 + oy], [20, 26 + oy], [16, 45], [11, 45]], shade(L.cape, -0.25));
  }
  // legs / robe
  if (L.robe) {
    p.poly([[14, 33 + oy], [30, 33 + oy], [33, 45], [11, 45]], L.cloth);
    p.rect(11, 44, 23, 1, L.trim);
    p.rect(21, 33 + oy, 2, 12, L.trim);
    p.rect(14, 45, 5, 2, shade(L.armorD, -0.3)); p.rect(25, 45, 5, 2, shade(L.armorD, -0.3));
  } else {
    p.rect(16, 38, 4, 6, shade(L.armorD, -0.1));
    p.rect(24, 38, 4, 6, L.armorD);
    p.rect(15, 44, 6, 2, '#2a1e1a'); p.rect(24, 44, 6, 2, '#2a1e1a');
    p.rect(24, 39, 4, 1, L.trim);
  }
  // torso
  p.ellipse(22, 32 + oy, 8, 6.5, L.armor);
  p.ellipse(20, 30 + oy, 4, 3, shade(L.armor, 0.25));
  p.rect(14, 36 + oy, 16, 2, L.trim);
  p.rect(20, 36 + oy, 4, 2, shade(L.trim, 0.3));
  if (!L.robe) { p.rect(20, 27 + oy, 4, 9, L.cloth); p.px(21, 30 + oy, L.trim); p.px(22, 31 + oy, L.trim); }
  // pauldrons
  p.ellipse(14, 27 + oy, 3.4, 2.6, shade(L.armor, 0.1));
  p.ellipse(30, 27 + oy, 3.4, 2.6, L.armorD);
  p.px(13, 26 + oy, L.trim); p.px(31, 26 + oy, L.trim);
  // back arm
  p.thickLine(14, 28 + oy, 12, 34 + oy, L.armorD, 3);
  // head
  p.ellipse(22, 17 + oy, 9, 8.2, L.skin);
  p.rect(16, 24 + oy, 12, 1, shade(L.skin, -0.18));
  // hair / helm
  const c = L.armor;
  switch (L.helm) {
    case 'crest':
      p.ellipse(21, 13 + oy, 9.6, 6.4, c);
      p.rect(12, 13 + oy, 7, 10, c);
      p.rect(19, 15 + oy, 12, 2, L.trim);
      p.poly([[19, 7 + oy], [23, 7 + oy], [22, 1 + oy], [20, 1 + oy]], L.trim);
      p.ellipse(14, 4 + oy, 6, 2.5, L.cloth); p.rect(8, 4 + oy, 3, 6, L.cloth);
      break;
    case 'elf':
      p.ellipse(21, 12 + oy, 9.6, 6, L.hair);
      p.rect(12, 12 + oy, 6, 16, L.hair);
      p.rect(13, 27 + oy, 4, 6, L.hair);
      p.poly([[28, 16 + oy], [34, 12 + oy], [29, 19 + oy]], L.skin); // elf ear
      p.rect(19, 10 + oy, 11, 1, L.trim);
      break;
    case 'hat':
      p.ellipse(22, 12 + oy, 13, 2.6, shade(L.armor, -0.2));
      p.poly([[13, 12 + oy], [31, 12 + oy], [24, -2 + oy], [17, -4 + oy]], L.armor);
      p.px(16, -4 + oy, L.armor); p.px(15, -3 + oy, L.armor);
      p.rect(14, 9 + oy, 16, 2, L.trim);
      p.px(22, 3 + oy, '#ffffff'); p.px(19, 6 + oy, L.trim);
      p.rect(13, 12 + oy, 5, 12, L.hair);
      break;
    case 'horned':
      p.ellipse(21, 12 + oy, 9.4, 5.6, '#8a8a96');
      p.rect(13, 12 + oy, 5, 8, L.hair);
      p.rect(18, 15 + oy, 13, 1, '#5a5a66');
      p.poly([[14, 10 + oy], [6, 2 + oy], [9, 9 + oy], [12, 13 + oy]], '#f0e8d0');
      p.poly([[28, 10 + oy], [36, 2 + oy], [33, 9 + oy], [30, 13 + oy]], '#f0e8d0');
      break;
    case 'halo':
      p.ellipse(21, 12 + oy, 9.4, 5.6, L.hair);
      p.rect(12, 12 + oy, 6, 14, L.hair);
      p.ring(22, 3 + oy, 8, 2.4, '#ffd24a', 1);
      break;
    case 'dragon':
      p.ellipse(21, 13 + oy, 9.6, 6.4, c);
      p.rect(12, 13 + oy, 7, 10, c);
      p.rect(19, 15 + oy, 12, 2, shade(c, -0.3));
      p.poly([[15, 9 + oy], [8, 0 + oy], [13, 2 + oy], [18, 7 + oy]], L.trim);
      p.poly([[26, 8 + oy], [32, 0 + oy], [30, 5 + oy], [28, 10 + oy]], L.trim);
      p.px(29, 14 + oy, L.glow);
      break;
  }
  // face (eyes 3px tall)
  p.rect(24, 17 + oy, 2, 3, '#1a1020');
  p.rect(29, 17 + oy, 2, 3, '#1a1020');
  p.px(24, 17 + oy, '#ffffff'); p.px(29, 17 + oy, '#ffffff');
  p.rect(23, 21 + oy, 2, 1, '#ff9a8a', 0.7); p.rect(30, 21 + oy, 1, 1, '#ff9a8a', 0.7);
  p.rect(27, 22 + oy, 2, 1, shade(L.skin, -0.35));
  if (L.beard) p.poly([[21, 21 + oy], [31, 21 + oy], [29, 28 + oy], [24, 29 + oy]], L.hair);
  // front arm + weapon
  const hand: [number, number] = frame === 3 ? [34, 31] : cast ? [30, 22] : [32, 32];
  p.thickLine(29, 28 + oy, hand[0], hand[1] + oy, L.armor, 3);
  drawHeroWeapon(p, L, hand[0], hand[1] + oy, frame);
  p.ellipse(hand[0], hand[1] + oy, 1.6, 1.6, L.skin);
  p.autoShade(0.12);
  p.outline('#120a18');
  if (cast) { p.px(6, 18, L.glow, 0.9); p.px(42, 10, L.glow, 0.9); p.px(40, 36, L.glow, 0.8); }
  return p;
}
