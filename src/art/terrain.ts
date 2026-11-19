// Procedural battlefield backgrounds (one per region) + fortress + portal art.
import { PixelCanvas, shade, mix, mulberry, parseColor } from './pixel';
import type { RegionDef } from '../data/regions';

export const TERRAIN_SCALE = 2;
export const TW = 1000; // half-res width  -> 2000 world px
export const TH = 450; // half-res height -> 900 world px (extra room so the camera can zoom out for huge battles)

// ---------- noise ----------
function makeNoise(seed: number) {
  const perm = new Uint8Array(512);
  const r = mulberry(seed);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const grad = (h: number) => (h & 255) / 255;
  const fade = (t: number) => t * t * (3 - 2 * t);
  const v = (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const a = grad(perm[(perm[xi & 255] + yi) & 511]);
    const b = grad(perm[(perm[(xi + 1) & 255] + yi) & 511]);
    const c = grad(perm[(perm[xi & 255] + yi + 1) & 511]);
    const d = grad(perm[(perm[(xi + 1) & 255] + yi + 1) & 511]);
    const u = fade(xf), w = fade(yf);
    return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
  };
  return (x: number, y: number, oct = 3) => {
    let s = 0, amp = 1, f = 1, tot = 0;
    for (let i = 0; i < oct; i++) { s += v(x * f, y * f) * amp; tot += amp; amp *= 0.5; f *= 2; }
    return s / tot;
  };
}

function stamp(dst: PixelCanvas, src: PixelCanvas, x: number, y: number) {
  x = Math.round(x); y = Math.round(y);
  for (let j = 0; j < src.h; j++) {
    const dy = y + j;
    if (dy < 0 || dy >= dst.h) continue;
    for (let i = 0; i < src.w; i++) {
      const dx = x + i;
      if (dx < 0 || dx >= dst.w) continue;
      const si = (j * src.w + i) * 4;
      const a = src.data[si + 3];
      if (a === 0) continue;
      const di = (dy * dst.w + dx) * 4;
      const al = a / 255;
      dst.data[di] = src.data[si] * al + dst.data[di] * (1 - al);
      dst.data[di + 1] = src.data[si + 1] * al + dst.data[di + 1] * (1 - al);
      dst.data[di + 2] = src.data[si + 2] * al + dst.data[di + 2] * (1 - al);
      dst.data[di + 3] = 255;
    }
  }
}

// ---------- decor sprites ----------
function tree(r: () => number, size: number, leaf: string, trunk: string, corrupt = 0): PixelCanvas {
  const w = Math.round(size * 2.4), h = Math.round(size * 3);
  const p = new PixelCanvas(w, h);
  const cx = w / 2;
  p.rect(cx - size * 0.18, h - size * 1.2, size * 0.36, size * 1.15, trunk);
  p.rect(cx - size * 0.18, h - size * 1.2, size * 0.12, size * 1.15, shade(trunk, 0.2));
  // roots
  p.line(cx - size * 0.18, h - 2, cx - size * 0.5, h - 1, trunk);
  p.line(cx + size * 0.18, h - 2, cx + size * 0.5, h - 1, trunk);
  const L = corrupt > 0.5 ? mix(leaf, '#6a2a6a', 0.7) : leaf;
  const blobs = 6 + Math.floor(r() * 4);
  for (let i = 0; i < blobs; i++) {
    const a = r() * Math.PI * 2;
    const d = r() * size * 0.45;
    p.ellipse(cx + Math.cos(a) * d, h - size * 1.8 + Math.sin(a) * d * 0.7, size * (0.45 + r() * 0.25), size * (0.4 + r() * 0.2), shade(L, -0.15));
  }
  for (let i = 0; i < blobs; i++) {
    const a = r() * Math.PI * 2;
    const d = r() * size * 0.35;
    p.ellipse(cx + Math.cos(a) * d - size * 0.1, h - size * 1.95 + Math.sin(a) * d * 0.6, size * (0.3 + r() * 0.2), size * (0.28 + r() * 0.15), L);
  }
  for (let i = 0; i < size * 1.5; i++) {
    const x = cx + (r() - 0.6) * size * 1.2, y = h - size * 2.2 + (r() - 0.5) * size * 0.9;
    if (p.get(Math.round(x), Math.round(y)) > 0) p.px(x, y, shade(L, 0.25));
  }
  p.outline(shade(L, -0.7));
  return p;
}

function deadTree(r: () => number, size: number, c: string): PixelCanvas {
  const w = Math.round(size * 2.4), h = Math.round(size * 2.8);
  const p = new PixelCanvas(w, h);
  const cx = w / 2;
  p.thickLine(cx, h - 1, cx + (r() - 0.5) * 4, h - size * 1.6, c, Math.max(2, Math.round(size * 0.25)));
  const branch = (x: number, y: number, a: number, len: number, d: number) => {
    if (d <= 0 || len < 2) return;
    const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
    p.thickLine(x, y, x2, y2, c, Math.max(1, d - 1));
    branch(x2, y2, a - 0.5 - r() * 0.3, len * 0.7, d - 1);
    branch(x2, y2, a + 0.5 + r() * 0.3, len * 0.65, d - 1);
  };
  branch(cx, h - size * 1.5, -Math.PI / 2 - 0.4, size * 0.7, 3);
  branch(cx, h - size * 1.5, -Math.PI / 2 + 0.4, size * 0.7, 3);
  p.outline(shade(c, -0.6));
  return p;
}

function rock(r: () => number, size: number, c: string): PixelCanvas {
  const p = new PixelCanvas(Math.round(size * 2.2), Math.round(size * 1.6));
  p.ellipse(size * 1.1, size * 0.9, size, size * 0.65, c);
  p.ellipse(size * 0.85, size * 0.7, size * 0.55, size * 0.35, shade(c, 0.2));
  p.px(size * 0.6, size * 0.55, shade(c, 0.4));
  p.outline(shade(c, -0.6));
  return p;
}

function ruinWall(r: () => number, w: number, h: number, c: string): PixelCanvas {
  const p = new PixelCanvas(w + 2, h + 6);
  for (let x = 0; x < w; x++) {
    const top = Math.round(h * 0.2 + Math.abs(Math.sin(x * 0.35 + r())) * h * 0.4 * (x % 7 < 3 ? 1 : 0.4));
    for (let y = top; y < h; y++) p.px(x + 1, y + 1, ((Math.floor(y / 3) + Math.floor((x + (Math.floor(y / 3) % 2) * 2) / 4)) % 5 === 0) ? shade(c, -0.2) : c);
  }
  for (let y = 4; y < h; y += 3) p.line(1, y, w, y, shade(c, -0.15), 0.6);
  p.rect(1, h, w, 3, shade(c, -0.35));
  p.outline(shade(c, -0.65));
  return p;
}

function house(r: () => number, w: number, burnt: boolean): PixelCanvas {
  const h = Math.round(w * 1.05);
  const p = new PixelCanvas(w + 4, h + 4);
  const wall = burnt ? '#6a5a4a' : '#c8b08a';
  const roof = burnt ? '#3a2a22' : '#8a3a2a';
  p.rect(2, Math.round(h * 0.45), w, Math.round(h * 0.55), wall);
  for (let x = 2; x < w + 2; x += 5) p.line(x, Math.round(h * 0.45), x, h, shade(wall, -0.2));
  // broken roof
  p.poly([[0, h * 0.48], [w / 2 + 2, 2], [w + 4, h * 0.48]], roof);
  if (burnt) { p.poly([[w * 0.5, h * 0.1], [w * 0.8, h * 0.3], [w * 0.55, h * 0.48]], wall); for (let i = 0; i < 6; i++) p.px(w * 0.4 + r() * w * 0.4, h * 0.2 + r() * h * 0.2, '#ff8a2a'); }
  for (let y = 6; y < h * 0.48; y += 3) p.line(w / 2 + 2 - y * 0.95, y, w / 2 + 2 + y * 0.95, y, shade(roof, -0.15), 0.7);
  p.rect(w / 2 - 1, h - Math.round(h * 0.28), 5, Math.round(h * 0.28), '#3a2418');
  p.rect(6, Math.round(h * 0.6), 4, 4, burnt ? '#ff7a2a' : '#4a6a8a');
  p.outline('#1e140e');
  return p;
}

function pillar(c: string, h: number, glow: string, skull: boolean): PixelCanvas {
  const p = new PixelCanvas(16, h + 4);
  p.rect(3, 6, 10, h - 6, c);
  p.rect(3, 6, 3, h - 6, shade(c, 0.2));
  p.rect(1, 2, 14, 5, shade(c, 0.1));
  p.rect(1, h - 2, 14, 4, shade(c, -0.2));
  if (skull) { p.ellipse(8, 14, 3, 3, '#e8e0c8'); p.px(7, 14, '#1a0a0a'); p.px(9, 14, '#1a0a0a'); }
  p.rect(7, 22, 2, h - 30, glow);
  p.outline(shade(c, -0.7));
  return p;
}

function portalArch(r: () => number, stone: string): PixelCanvas {
  const p = new PixelCanvas(50, 54);
  for (let a = 0; a <= Math.PI; a += 0.05) {
    const x = 25 + Math.cos(a) * 20, y = 30 - Math.sin(a) * 24;
    p.rect(x - 3, y - 3, 6, 6, (Math.floor(a * 6) % 2) ? stone : shade(stone, -0.15));
  }
  p.rect(2, 28, 7, 24, stone); p.rect(41, 28, 7, 24, shade(stone, -0.1));
  for (let i = 0; i < 20; i++) p.px(4 + r() * 42, 6 + r() * 44, '#4a7a2a');
  p.outline(shade(stone, -0.6));
  return p;
}

// ---------- terrain ----------
export function generateTerrain(R: RegionDef, seed = 1): HTMLCanvasElement {
  const p = new PixelCanvas(TW, TH);
  const r = mulberry(seed * 977 + R.id * 131);
  const n = makeNoise(seed + R.id * 17);
  const n2 = makeNoise(seed + R.id * 31 + 5);
  const [g0, gD, gL] = R.ground;
  const C0 = parseColor(g0), CD = parseColor(gD), CL = parseColor(gL), CC = parseColor(R.corruption);
  const tiles = R.decor === 'fortress' || R.decor === 'throne';
  const pathY = TH * 0.52;

  // base ground with dithered noise
  for (let y = 0; y < TH; y++) {
    for (let x = 0; x < TW; x++) {
      let v = n(x / 60, y / 40, 4);
      const v2 = n2(x / 14, y / 10, 2);
      const dither = ((x + y) & 1) * 0.04 + ((x * 3 + y * 7) % 5) * 0.006;
      v = v * 0.75 + v2 * 0.25 + dither;
      let c: number[];
      if (v < 0.37) c = CD as any; else if (v > 0.66) c = CL as any; else c = C0 as any;
      let rr = c[0], gg = c[1], bb = c[2];
      // dirt path band (subtle)
      const py = pathY + Math.sin(x / 90) * 22 + Math.sin(x / 37) * 6;
      const pd = Math.abs(y - py);
      if (pd < 20 && !tiles) {
        const t = Math.max(0, 1 - pd / 20) * 0.45 * (0.6 + n2(x / 8, y / 8) * 0.6);
        rr = rr + (130 - rr) * t; gg = gg + (105 - gg) * t; bb = bb + (70 - bb) * t;
      }
      // corruption toward the right side
      const cx = x / TW;
      const ct = Math.max(0, (cx - 0.52) * 2.2) + (n(x / 30 + 9, y / 30) - 0.5) * 0.6;
      if (ct > 0.15) {
        const t = Math.min(0.85, (ct - 0.15) * 0.9);
        rr = rr + (CC[0] - rr) * t; gg = gg + (CC[1] - gg) * t; bb = bb + (CC[2] - bb) * t;
      }
      // vignette top/bottom darkening
      const ed = Math.min(y, TH - y) / 40;
      if (ed < 1) { const k = 0.65 + 0.35 * ed; rr *= k; gg *= k; bb *= k; }
      const i = (y * TW + x) * 4;
      p.data[i] = rr; p.data[i + 1] = gg; p.data[i + 2] = bb; p.data[i + 3] = 255;
    }
  }

  // floor tiles for constructed regions
  if (tiles) {
    const lineC = R.decor === 'throne' ? '#200a14' : '#3a3a48';
    for (let y = 0; y < TH; y += 14) p.line(0, y, TW, y, lineC, 0.45);
    for (let y = 0; y < TH; y += 14) for (let x = (y / 14) % 2 ? 0 : 12; x < TW; x += 24) p.line(x, y, x, y + 14, lineC, 0.45);
    if (R.decor === 'throne') {
      // red carpet toward the right
      for (let x = 0; x < TW; x++) for (let y = pathY - 14; y < pathY + 14; y++) {
        const c = (y < pathY - 11 || y > pathY + 10) ? '#c8a040' : '#7a0a1a';
        p.px(x, y, c, 0.55);
      }
    }
  }

  // ground details: grass tufts / pebbles / bones
  const tuft = R.decor === 'abyss' ? '#7a6a62' : R.decor === 'throne' ? '#5a2a3a' : shade(gL, 0.15);
  for (let i = 0; i < 2600; i++) {
    const x = r() * TW, y = r() * TH;
    const right = x / TW > 0.6;
    if (R.decor === 'forest' || R.decor === 'village' || R.decor === 'swamp') {
      const c = right ? mix(tuft, R.corruption, 0.6) : tuft;
      p.px(x, y, c); p.px(x + 1, y - 1, c); p.px(x - 1, y - 1, shade(c, -0.1));
    } else {
      p.px(x, y, r() > 0.5 ? shade(g0, 0.18) : shade(g0, -0.22));
    }
  }
  // flowers
  if (R.decor === 'forest' || R.decor === 'village') {
    const fl = ['#ffe14a', '#ff7aa8', '#ffffff', '#8ad0ff'];
    for (let i = 0; i < 260; i++) { const x = r() * TW * 0.55, y = r() * TH; p.px(x, y, fl[i % 4]); }
  }

  // lava / corruption cracks on the right
  const lavaAmt = { forest: 14, village: 16, swamp: 8, fortress: 18, abyss: 45, throne: 40 }[R.decor];
  for (let i = 0; i < lavaAmt; i++) {
    let x = TW * (0.58 + r() * 0.42), y = r() * TH;
    let a = r() * Math.PI * 2;
    const len = 18 + r() * 50;
    const glow = R.decor === 'swamp' ? '#3affb0' : '#ff3a1a';
    const core = R.decor === 'swamp' ? '#c8ffe8' : '#ffd23a';
    for (let k = 0; k < len; k++) {
      p.px(x, y, glow); p.px(x + 1, y, glow, 0.5); p.px(x, y + 1, '#1a0a0a', 0.7);
      if (k % 3 === 0) p.px(x, y, core);
      a += (r() - 0.5) * 0.8;
      x += Math.cos(a); y += Math.sin(a) * 0.6;
      if (r() < 0.05) { const bx = x, by = y; let ba = a + 1.2; for (let j = 0; j < 8; j++) { p.px(bx + Math.cos(ba) * j, by + Math.sin(ba) * j * 0.6, glow); } }
    }
  }

  // region-specific decor
  const leaf = R.decor === 'swamp' ? '#3a5a3a' : '#3a8a2a';
  const trunk = '#5a3a24';
  const edgeTopY = 46, edgeBotY = TH - 50;
  const place = (src: PixelCanvas, x: number, baseY: number) => stamp(p, src, x - src.w / 2, baseY - src.h);

  switch (R.decor) {
    case 'forest': {
      // ruins + portal arch top center-left like an ancient gate
      place(ruinWall(r, 60, 22, '#8a8a7a'), 300, 70);
      place(portalArch(r, '#8a8a7a'), 380, 80);
      place(ruinWall(r, 40, 16, '#8a8a7a'), 455, 66);
      for (let x = 0; x < TW; x += 26 + r() * 18) {
        const corrupt = x / TW > 0.62 ? 1 : 0;
        const t = corrupt ? deadTree(r, 14 + r() * 8, '#4a2a3a') : tree(r, 13 + r() * 8, leaf, trunk);
        place(t, x, edgeTopY + 50 + r() * 22);
      }
      for (let x = 10; x < TW; x += 30 + r() * 20) {
        const corrupt = x / TW > 0.62 ? 1 : 0;
        const t = corrupt ? deadTree(r, 12 + r() * 8, '#4a2a3a') : tree(r, 12 + r() * 7, shade(leaf, 0.1), trunk);
        place(t, x, TH + 8 + r() * 10);
      }
      for (let i = 0; i < 18; i++) place(rock(r, 3 + r() * 4, '#7a7a6a'), r() * TW, 90 + r() * (TH - 150));
      break;
    }
    case 'village': {
      for (let x = 30; x < TW; x += 70 + r() * 50) {
        place(house(r, 34 + Math.floor(r() * 14), x / TW > 0.35 || r() > 0.5), x, edgeTopY + 64 + r() * 14);
        if (r() > 0.4) place(ruinWall(r, 30 + r() * 30, 12, '#9a8a7a'), x + 40, edgeTopY + 82);
      }
      for (let x = 20; x < TW; x += 60 + r() * 50) {
        r() > 0.5 ? place(house(r, 30 + Math.floor(r() * 12), true), x, TH + 12) : place(tree(r, 12, leaf, trunk), x, TH + 6);
      }
      // fences
      for (let i = 0; i < 6; i++) {
        const fx = r() * TW * 0.8, fy = 100 + r() * 180;
        for (let k = 0; k < 6; k++) { p.rect(fx + k * 5, fy - 6, 1, 6, '#6a4a2a'); }
        p.line(fx, fy - 4, fx + 26, fy - 4, '#8a6a3a');
      }
      break;
    }
    case 'swamp': {
      for (let i = 0; i < 22; i++) {
        const x = r() * TW, y = 70 + r() * (TH - 130), rx = 12 + r() * 30, ry = 5 + r() * 10;
        p.ellipse(x, y, rx + 2, ry + 2, '#2a3a2a');
        p.ellipse(x, y, rx, ry, x / TW > 0.6 ? '#1a3a3a' : '#2a4a4a');
        p.line(x - rx * 0.5, y - ry * 0.3, x + rx * 0.2, y - ry * 0.3, '#5a8a8a');
        if (r() > 0.5) p.ellipse(x + rx * 0.3, y + 1, 2, 1, '#4a8a3a');
      }
      for (let x = 0; x < TW; x += 24 + r() * 20) place(r() > 0.4 ? deadTree(r, 13 + r() * 6, '#3a3a2a') : tree(r, 12, '#2a4a2a', '#3a2a1a'), x, edgeTopY + 54 + r() * 20);
      for (let x = 10; x < TW; x += 28 + r() * 20) place(deadTree(r, 11 + r() * 6, '#3a3a2a'), x, TH + 8);
      // reeds
      for (let i = 0; i < 160; i++) { const x = r() * TW, y = 70 + r() * (TH - 120); p.line(x, y, x + (r() - 0.5) * 2, y - 4 - r() * 4, '#6a7a3a'); }
      break;
    }
    case 'fortress': {
      for (let x = 0; x < TW; x += 64) {
        place(ruinWall(r, 50 + r() * 14, 34, '#7a7a88'), x + 30, edgeTopY + 66);
        place(pillar('#6a6a7a', 46, '#b05aff', false), x + 8, edgeTopY + 70);
      }
      for (let x = 20; x < TW; x += 90 + r() * 40) place(ruinWall(r, 40 + r() * 20, 22, '#6a6a7a'), x, TH + 6);
      // runes
      for (let i = 0; i < 10; i++) {
        const x = TW * (0.35 + r() * 0.6), y = 90 + r() * 180;
        p.ring(x, y, 10, 6, '#b05aff', 1, 0.6);
        p.line(x - 6, y, x + 6, y, '#b05aff', 0.5);
      }
      for (let i = 0; i < 14; i++) place(rock(r, 3 + r() * 3, '#8a8a98'), r() * TW, 90 + r() * (TH - 150));
      break;
    }
    case 'abyss': {
      // lava rivers
      for (let k = 0; k < 2; k++) {
        const yb = k === 0 ? 40 + r() * 20 : TH - 40 - r() * 20;
        for (let x = 0; x < TW; x++) {
          const y = yb + Math.sin(x / 40 + k) * 8;
          const w = 5 + Math.sin(x / 13) * 2;
          for (let j = -w; j <= w; j++) p.px(x, y + j, Math.abs(j) < w * 0.4 ? '#ffd23a' : '#ff5a1a');
          p.px(x, y - w - 1, '#2a1410'); p.px(x, y + w + 1, '#2a1410');
        }
      }
      for (let i = 0; i < 26; i++) {
        const sp = new PixelCanvas(14, 30);
        sp.poly([[2, 29], [7, 0], [12, 29]], '#1e1a22'); sp.line(7, 2, 5, 28, '#4a3a4a'); sp.outline('#0a0606');
        place(sp, r() * TW, r() > 0.5 ? edgeTopY + 30 + r() * 30 : TH - r() * 20);
      }
      for (let i = 0; i < 30; i++) place(rock(r, 3 + r() * 5, '#4a4040'), r() * TW, 80 + r() * (TH - 130));
      break;
    }
    case 'throne': {
      for (let x = 0; x < TW; x += 56) place(pillar('#2a1a22', 64, '#ff2a4a', true), x + 20, edgeTopY + 78);
      for (let x = 30; x < TW; x += 70) place(pillar('#2a1a22', 50, '#ff2a4a', true), x, TH + 4);
      // lava channels
      for (let x = 0; x < TW; x++) { const y = 92 + Math.sin(x / 50) * 3; p.px(x, y, '#ff3a1a'); p.px(x, y + 1, '#ffd23a'); p.px(x, y + 2, '#ff3a1a'); }
      for (let x = 0; x < TW; x++) { const y = TH - 70 + Math.sin(x / 45) * 3; p.px(x, y, '#ff3a1a'); p.px(x, y + 1, '#ffd23a'); p.px(x, y + 2, '#ff3a1a'); }
      // skulls scatter
      for (let i = 0; i < 40; i++) { const x = r() * TW, y = 100 + r() * 160; p.rect(x, y, 2, 2, '#c8c0a8'); p.px(x, y, '#1a0a0a'); }
      break;
    }
  }

  return p.toCanvas(TERRAIN_SCALE);
}

// ---------- fortress (4 damage states) ----------
export const FORT_W = 80; // half-res
export function generateFortress(state: number): HTMLCanvasElement {
  const p = new PixelCanvas(FORT_W, TH);
  const r = mulberry(42 + state * 3);
  const stone = '#9a96a0', stoneD = '#6a6672', stoneL = '#c4c0c8';
  // camp behind wall (tents on the left)
  const tents = [[12, TH * 0.2], [8, TH * 0.42], [14, TH * 0.62], [6, TH * 0.84]];
  for (const [tx, ty] of tents) {
    p.poly([[tx - 10, ty + 8], [tx, ty - 8], [tx + 10, ty + 8]], state >= 3 ? '#6a6a6a' : '#e8e0d0');
    p.poly([[tx, ty - 8], [tx + 10, ty + 8], [tx + 4, ty + 8]], state >= 3 ? '#4a4a4a' : '#b8b0a0');
    p.rect(tx - 1, ty + 2, 3, 6, '#3a2a1a');
  }
  // crates
  for (let i = 0; i < 6; i++) { const x = 4 + r() * 18, y = 110 + r() * 160; p.rect(x, y, 6, 5, '#8a6a3a'); p.line(x, y, x + 5, y + 4, '#5a3a1a'); }
  // main wall (vertical), top-down inclined: top walkway + front face to the right
  const wx = 34, ww = 16;
  for (let y = 0; y < TH; y++) {
    for (let x = wx; x < wx + ww; x++) {
      const brick = ((Math.floor(y / 4) + Math.floor((x + (Math.floor(y / 4) % 2) * 3) / 6)) % 7 === 0);
      p.px(x, y, x < wx + 3 ? stoneL : brick ? stoneD : stone);
    }
    if (y % 4 === 0) p.line(wx + 3, y, wx + ww - 1, y, stoneD, 0.5);
    // crenellations on the right edge
    if (Math.floor(y / 5) % 2 === 0) p.rect(wx + ww, y, 4, 1, stone);
  }
  p.line(wx + ww + 4, 0, wx + ww + 4, TH, stoneD);
  // towers
  const towers = [TH * 0.12, TH * 0.32, TH * 0.68, TH * 0.88].map(Math.round);
  for (const ty of towers) {
    p.ellipse(wx + 8, ty, 15, 12, stoneD);
    p.ellipse(wx + 8, ty - 1, 13, 10, stone);
    p.ring(wx + 8, ty - 1, 13, 10, stoneL, 1);
    // conical blue roof
    p.poly([[wx - 4, ty], [wx + 8, ty - 26], [wx + 20, ty]], '#2a48b0');
    p.poly([[wx + 8, ty - 26], [wx + 20, ty], [wx + 12, ty]], '#1a3080');
    p.ellipse(wx + 8, ty, 12, 3, '#3a5ac8');
    // banner
    if (state < 3 || ty !== towers[1]) {
      p.line(wx + 8, ty - 26, wx + 8, ty - 36, '#5a3a2a');
      p.poly([[wx + 8, ty - 36], [wx + 20, ty - 34], [wx + 8, ty - 30]], state >= 2 && ty === towers[2] ? '#3a3a3a' : '#3a64d8');
      p.px(wx + 12, ty - 34, '#ffd24a');
    }
  }
  // gate
  const gy = Math.round(TH / 2);
  p.rect(wx + 2, gy - 22, ww + 6, 44, stoneD);
  p.rect(wx + 6, gy - 16, ww - 2, 32, '#3a2418');
  for (let y = gy - 14; y < gy + 16; y += 4) p.line(wx + 6, y, wx + ww + 3, y, '#5a3a24');
  p.rect(wx + 4, gy - 26, ww + 2, 6, stone);
  // big banner flanking gate
  p.rect(wx + ww + 2, gy - 40, 8, 18, state >= 3 ? '#4a2a2a' : '#3a64d8');
  p.px(wx + ww + 5, gy - 34, '#ffd24a'); p.px(wx + ww + 6, gy - 34, '#ffd24a'); p.px(wx + ww + 5, gy - 33, '#ffd24a');
  p.poly([[wx + ww + 2, gy - 22], [wx + ww + 6, gy - 18], [wx + ww + 10, gy - 22]], state >= 3 ? '#4a2a2a' : '#3a64d8');
  // torches
  for (const ty of [TH * 0.22, TH * 0.42, TH * 0.58, TH * 0.78].map(Math.round)) { p.rect(wx + ww + 6, ty, 2, 5, '#5a3a2a'); p.px(wx + ww + 6, ty - 1, '#ffd23a'); p.px(wx + ww + 7, ty - 2, '#ff7a2a'); }

  // damage
  if (state >= 1) {
    for (let i = 0; i < 10 * state; i++) {
      let x = wx + 2 + r() * (ww - 2), y = r() * TH;
      for (let k = 0; k < 6 + r() * 8; k++) { p.px(x, y, '#2a2630'); x += r() - 0.5; y += 1; }
    }
  }
  if (state >= 2) {
    for (let i = 0; i < 14; i++) { const x = wx + r() * (ww + 6), y = r() * TH; p.ellipse(x, y, 4 + r() * 4, 3 + r() * 3, '#1a1418', 0.55); }
    for (let i = 0; i < 8; i++) { const y = r() * TH; p.rect(wx + ww, y, 4, 6, '#3a3640', 0.9); }
  }
  if (state >= 3) {
    for (let i = 0; i < 4; i++) {
      const y = 40 + r() * (TH - 80);
      p.rect(wx + 4 + r() * 4, y, ww, 10 + r() * 8, '#2a2228');
      for (let k = 0; k < 8; k++) p.rect(wx + ww + 4 + r() * 10, y + r() * 14, 3, 2, stoneD);
    }
  }
  p.outline('#1a141c');
  return p.toCanvas(TERRAIN_SCALE);
}

export function generatePortal(frame: number, color: string): HTMLCanvasElement {
  const p = new PixelCanvas(40, 52);
  const r = mulberry(5);
  // stone ring
  const stone = '#4a3a4a';
  p.ellipse(20, 26, 18, 24, stone);
  p.ellipse(20, 26, 13, 19, '#1a0a14');
  // swirl
  const c1 = color, c2 = shade(color, 0.45), c3 = shade(color, -0.4);
  for (let i = 0; i < 260; i++) {
    const t = i / 260;
    const a = t * Math.PI * 6 + frame * 0.8;
    const d = (1 - t) * 12;
    p.px(20 + Math.cos(a) * d, 26 + Math.sin(a) * d * 1.45, i % 3 === 0 ? c2 : i % 3 === 1 ? c1 : c3);
  }
  p.ellipse(20, 26, 3, 4, '#ffffff', 0.8);
  for (let i = 0; i < 12; i++) { const a = r() * Math.PI * 2; p.px(20 + Math.cos(a) * 16, 26 + Math.sin(a) * 22, shade(stone, 0.25)); }
  p.outline('#0a0408');
  return p.toCanvas(1);
}
