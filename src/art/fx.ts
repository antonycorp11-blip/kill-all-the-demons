// FX textures (projectiles, particles) and UI icons, all painted by code.
import { PixelCanvas, shade } from './pixel';

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return { c, ctx: c.getContext('2d')! };
}

export function fxTextures(): Record<string, HTMLCanvasElement> {
  const out: Record<string, HTMLCanvasElement> = {};

  { // soft shadow
    const { c, ctx } = canvas(32, 12);
    const g = ctx.createRadialGradient(16, 6, 1, 16, 6, 16);
    g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(0.6, 'rgba(0,0,0,0.3)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save(); ctx.scale(1, 12 / 32 * 2.6); ctx.fillStyle = g; ctx.fillRect(0, 0, 32, 32); ctx.restore();
    out.shadow = c;
  }
  { // radial glow
    const { c, ctx } = canvas(64, 64);
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
    out.glow = c;
  }
  { // ring
    const { c, ctx } = canvas(128, 128);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(64, 64, 58, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 0.35; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(64, 64, 52, 0, Math.PI * 2); ctx.stroke();
    out.ring = c;
  }
  { const p = new PixelCanvas(4, 4); p.rect(0, 0, 4, 4, '#ffffff'); out.px = p.toCanvas(); }
  { const p = new PixelCanvas(7, 7); p.line(3, 0, 3, 6, '#ffffff'); p.line(0, 3, 6, 3, '#ffffff'); p.px(2, 2, '#ffffff', 0.6); p.px(4, 4, '#ffffff', 0.6); p.px(2, 4, '#ffffff', 0.6); p.px(4, 2, '#ffffff', 0.6); out.spark = p.toCanvas(); }
  { const p = new PixelCanvas(14, 5); p.line(0, 2, 10, 2, '#c8a070'); p.px(0, 1, '#ffffff'); p.px(0, 3, '#ffffff'); p.px(1, 1, '#e8e8e8'); p.px(1, 3, '#e8e8e8'); p.rect(11, 1, 2, 3, '#e8eef8'); p.px(13, 2, '#ffffff'); out.arrow = p.toCanvas(); }
  { const p = new PixelCanvas(12, 8); p.ellipse(8, 4, 3.5, 3, '#ffd23a'); p.ellipse(5, 4, 3, 2, '#ff7a2a'); p.ellipse(2, 4, 2, 1.4, '#c8321a'); p.px(9, 3, '#ffffff'); out.firebolt = p.toCanvas(); }
  { const p = new PixelCanvas(10, 10); p.ellipse(5, 5, 4, 4, '#ffffff', 0.5); p.ellipse(5, 5, 2.6, 2.6, '#ffffff'); out.orb = p.toCanvas(); }
  { const p = new PixelCanvas(9, 9); p.rect(3, 0, 3, 9, '#fff6c0'); p.rect(0, 3, 9, 3, '#fff6c0'); p.rect(4, 1, 1, 7, '#ffffff'); p.rect(1, 4, 7, 1, '#ffffff'); out.holy = p.toCanvas(); }
  { const p = new PixelCanvas(7, 7); p.ellipse(3, 3, 3, 3, '#ffcf3a'); p.ellipse(3, 3, 1.6, 2, '#ffe88a'); p.px(2, 2, '#ffffff'); p.outline('#7a4a0a'); out.coin = p.toCanvas(); }
  { // slash arc
    const { c, ctx } = canvas(48, 48);
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(24, 24, 18, -1.3, 1.3); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.arc(24, 24, 15, -1.0, 1.0); ctx.stroke();
    out.slash = c;
  }
  { const p = new PixelCanvas(14, 14); p.ellipse(7, 7, 5, 5, '#ff7a2a'); p.ellipse(6, 6, 3, 3, '#ffd23a'); p.px(5, 5, '#ffffff'); p.outline('#5a1a0a'); out.meteor = p.toCanvas(); }
  { const p = new PixelCanvas(9, 9); const s = '#ffd24a';
    p.px(4, 0, s); p.rect(3, 1, 3, 2, s); p.rect(0, 3, 9, 2, s); p.rect(1, 5, 7, 1, s); p.rect(2, 6, 5, 1, s); p.px(1, 7, s); p.px(7, 7, s); p.px(2, 7, s); p.px(6, 7, s); p.px(4, 3, '#fff6c0');
    p.outline('#6a3a0a'); out.star = p.toCanvas(); }
  { const p = new PixelCanvas(10, 14); p.line(1, 0, 1, 13, '#5a3a2a'); p.rect(2, 1, 7, 6, '#3a64d8'); p.px(5, 3, '#ffd24a'); p.px(5, 4, '#ffd24a'); p.poly([[2, 7], [5, 9], [9, 7]], '#3a64d8'); p.outline('#140a18'); out.flag = p.toCanvas(); }
  { const p = new PixelCanvas(8, 12); p.ellipse(4, 8, 3, 3.4, '#bff8ff', 0.8); p.ellipse(4, 5, 2, 3, '#bff8ff', 0.6); p.px(4, 1, '#ffffff', 0.5); out.soul = p.toCanvas(); }
  { // celestial blade
    const p = new PixelCanvas(24, 90);
    p.poly([[12, 89], [6, 18], [18, 18]], '#fff6c0');
    p.poly([[12, 89], [10, 18], [14, 18]], '#ffffff');
    p.rect(2, 12, 20, 5, '#ffd24a'); p.rect(10, 0, 4, 12, '#c8a040'); p.ellipse(12, 2, 3, 3, '#ffd24a');
    p.outline('#ffb02a');
    out.blade = p.toCanvas();
  }
  { const p = new PixelCanvas(12, 20); p.poly([[6, 0], [11, 12], [6, 19], [1, 12]], '#bfefff'); p.poly([[6, 0], [6, 19], [1, 12]], '#8ad0ff'); p.line(6, 2, 6, 17, '#ffffff'); p.outline('#2a6a9a'); out.ice = p.toCanvas(); }
  { const p = new PixelCanvas(10, 10); p.ellipse(5, 5, 4, 4, '#7affb0'); p.px(4, 4, '#ffffff'); out.heal = p.toCanvas(); }
  { const p = new PixelCanvas(10, 10); p.ellipse(5, 5, 4, 4, '#b05aff'); p.ellipse(5, 5, 2, 2, '#e8c8ff'); out.darkbolt = p.toCanvas(); }
  { const p = new PixelCanvas(6, 6); p.rect(0, 0, 6, 6, '#ffffff'); out.square = p.toCanvas(); }
  return out;
}

// ------------------- UI icons (16x16 pixel art) -------------------
type IconFn = (p: PixelCanvas) => void;
const ICONS: Record<string, IconFn> = {
  sword: (p) => { p.thickLine(3, 13, 12, 4, '#dfe7f2', 2); p.line(12, 3, 13, 2, '#ffffff'); p.line(2, 10, 6, 14, '#c8a040'); p.px(2, 14, '#6a4a2a'); p.px(1, 15, '#6a4a2a'); },
  heart: (p) => { p.ellipse(5, 6, 3.4, 3.4, '#ff3a5c'); p.ellipse(11, 6, 3.4, 3.4, '#ff3a5c'); p.poly([[2, 7], [14, 7], [8, 14]], '#ff3a5c'); p.px(4, 5, '#ffffff'); p.px(5, 4, '#ffb0c0'); },
  speed: (p) => { p.poly([[9, 1], [3, 9], [8, 9], [6, 15], [13, 6], [8, 6]], '#ffe14a'); p.px(8, 3, '#ffffff'); },
  shield: (p) => { p.poly([[2, 2], [14, 2], [14, 8], [8, 15], [2, 8]], '#4a8aff'); p.poly([[8, 2], [14, 2], [14, 8], [8, 15]], '#2a5ac8'); p.rect(7, 4, 2, 8, '#ffd24a'); p.rect(5, 6, 6, 2, '#ffd24a'); },
  tent: (p) => { p.poly([[1, 14], [8, 2], [15, 14]], '#e8e0d0'); p.poly([[8, 2], [15, 14], [10, 14]], '#b8b0a0'); p.poly([[6, 14], [8, 9], [10, 14]], '#3a2a1a'); p.line(8, 2, 8, 0, '#5a3a2a'); p.rect(9, 0, 3, 2, '#3a64d8'); },
  horn: (p) => { p.poly([[2, 6], [12, 2], [14, 4], [12, 12], [2, 10]], '#c8a040'); p.ellipse(13, 7, 2, 5, '#e8c860'); p.rect(2, 6, 2, 4, '#8a6a2a'); },
  flag: (p) => { p.line(3, 1, 3, 15, '#8a6a3a'); p.rect(4, 2, 10, 7, '#3a64d8'); p.poly([[4, 9], [9, 12], [14, 9]], '#3a64d8'); p.rect(8, 4, 2, 3, '#ffd24a'); },
  crit: (p) => { p.ring(8, 8, 6, 6, '#ff5a4a', 2); p.line(8, 0, 8, 5, '#ff5a4a'); p.line(8, 11, 8, 15, '#ff5a4a'); p.line(0, 8, 5, 8, '#ff5a4a'); p.line(11, 8, 15, 8, '#ff5a4a'); p.px(8, 8, '#ffffff'); },
  skull: (p) => { p.ellipse(8, 7, 6, 5.5, '#e8e0c8'); p.rect(5, 11, 6, 3, '#e8e0c8'); p.ellipse(5.5, 7, 1.6, 1.8, '#1a0a0a'); p.ellipse(10.5, 7, 1.6, 1.8, '#1a0a0a'); p.px(8, 10, '#1a0a0a'); p.px(6, 13, '#8a8070'); p.px(9, 13, '#8a8070'); },
  boom: (p) => { p.poly([[8, 0], [10, 5], [15, 4], [11, 8], [15, 13], [9, 11], [7, 16], [6, 11], [0, 12], [4, 8], [1, 3], [6, 5]], '#ff7a2a'); p.ellipse(8, 8, 3, 3, '#ffd23a'); p.px(8, 8, '#ffffff'); },
  cross: (p) => { p.rect(6, 1, 4, 14, '#7affb0'); p.rect(1, 6, 14, 4, '#7affb0'); p.rect(7, 2, 1, 12, '#ffffff'); },
  heal: (p) => { p.ellipse(8, 8, 6, 6, '#3aaa6a'); p.rect(7, 4, 2, 8, '#ffffff'); p.rect(4, 7, 8, 2, '#ffffff'); },
  book: (p) => { p.rect(2, 2, 12, 12, '#7a3a2a'); p.rect(4, 3, 9, 10, '#f0e8d0'); p.line(5, 5, 11, 5, '#8a8070'); p.line(5, 7, 11, 7, '#8a8070'); p.line(5, 9, 9, 9, '#8a8070'); p.rect(2, 2, 2, 12, '#5a2a1a'); },
  coin: (p) => { p.ellipse(8, 8, 6.5, 6.5, '#e8a020'); p.ellipse(8, 8, 5, 5, '#ffcf3a'); p.rect(7, 4, 2, 8, '#e8a020'); p.px(5, 5, '#ffffff'); },
  castle: (p) => { p.rect(2, 6, 12, 9, '#9a96a0'); p.rect(2, 3, 3, 4, '#9a96a0'); p.rect(11, 3, 3, 4, '#9a96a0'); p.rect(6, 4, 4, 3, '#9a96a0'); p.rect(6, 10, 4, 5, '#3a2418'); p.px(3, 2, '#3a64d8'); p.px(12, 2, '#3a64d8'); },
  hammer: (p) => { p.thickLine(4, 14, 10, 6, '#8a6a3a', 2); p.rect(7, 1, 8, 5, '#9aa4b8'); p.rect(7, 1, 8, 1, '#d0dbee'); },
  star: (p) => { p.poly([[8, 0], [10, 6], [16, 6], [11, 10], [13, 16], [8, 12], [3, 16], [5, 10], [0, 6], [6, 6]], '#ffd24a'); p.px(8, 5, '#ffffff'); },
  chest: (p) => { p.rect(1, 6, 14, 9, '#8a5a2a'); p.rect(1, 3, 14, 4, '#a86a32'); p.rect(1, 7, 14, 1, '#ffd24a'); p.rect(7, 6, 2, 4, '#ffd24a'); p.px(4, 4, '#ffcf3a'); },
  bank: (p) => { p.poly([[1, 6], [8, 1], [15, 6]], '#ffd24a'); for (let x = 2; x < 15; x += 3) p.rect(x, 7, 2, 6, '#e8e0c8'); p.rect(1, 13, 14, 2, '#c8a040'); },
  gem: (p) => { p.poly([[4, 2], [12, 2], [15, 6], [8, 15], [1, 6]], '#b05aff'); p.poly([[4, 2], [8, 2], [8, 15], [1, 6]], '#d08aff'); p.line(1, 6, 15, 6, '#7a2ac8'); p.px(5, 4, '#ffffff'); },
  bolt: (p) => { p.poly([[10, 0], [3, 9], [7, 9], [5, 16], [13, 6], [9, 6]], '#8ad0ff'); p.px(9, 2, '#ffffff'); },
  wing: (p) => { p.poly([[2, 13], [5, 3], [14, 1], [12, 5], [15, 6], [11, 9], [13, 11], [6, 12]], '#fff6d8'); p.line(2, 13, 14, 1, '#ffd24a'); },
  soul: (p) => { p.ellipse(8, 9, 5, 5, '#8affff'); p.poly([[4, 8], [8, 0], [12, 8]], '#8affff'); p.ellipse(8, 10, 3, 3, '#e8ffff'); p.px(6, 9, '#1a3a4a'); p.px(10, 9, '#1a3a4a'); },
  banner: (p) => { p.line(2, 1, 2, 15, '#8a6a3a'); p.line(2, 2, 14, 2, '#8a6a3a'); p.rect(4, 3, 9, 9, '#c82a3a'); p.poly([[4, 12], [8, 15], [13, 12]], '#c82a3a'); p.rect(7, 5, 3, 4, '#ffd24a'); },
  fire: (p) => { p.poly([[8, 0], [13, 8], [12, 14], [4, 14], [3, 8], [6, 6]], '#ff5a1a'); p.poly([[8, 5], [11, 10], [10, 14], [6, 14], [5, 10]], '#ffd23a'); p.px(8, 11, '#ffffff'); },
  people: (p) => { p.ellipse(5, 4, 2.5, 2.5, '#d0dbee'); p.rect(2, 7, 6, 7, '#d0dbee'); p.ellipse(11, 5, 2.5, 2.5, '#9aa4b8'); p.rect(8, 8, 6, 6, '#9aa4b8'); },
  wave: (p) => { p.line(3, 1, 3, 15, '#c8a040'); p.poly([[4, 2], [14, 4], [4, 9]], '#ffd24a'); },
  gear: (p) => { for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; p.rect(8 + Math.cos(a) * 6 - 1.5, 8 + Math.sin(a) * 6 - 1.5, 3, 3, '#c8c0d8'); } p.ellipse(8, 8, 5, 5, '#c8c0d8'); p.ellipse(8, 8, 2, 2, '#2a1a3a'); },
  evo: (p) => { p.poly([[8, 1], [14, 8], [10, 8], [10, 15], [6, 15], [6, 8], [2, 8]], '#ffd24a'); p.px(8, 3, '#ffffff'); },
  infinity: (p) => { p.ring(5, 8, 3.5, 3, '#ffd24a', 1); p.ring(11, 8, 3.5, 3, '#ffd24a', 1); },
  traits: (p) => { p.ellipse(8, 3, 2.5, 2.5, '#8ad0ff'); p.ellipse(3, 12, 2.5, 2.5, '#8ad0ff'); p.ellipse(13, 12, 2.5, 2.5, '#8ad0ff'); p.line(8, 3, 3, 12, '#c8c0d8'); p.line(8, 3, 13, 12, '#c8c0d8'); p.line(3, 12, 13, 12, '#c8c0d8'); },
  pause: (p) => { p.rect(3, 2, 4, 12, '#ffffff'); p.rect(9, 2, 4, 12, '#ffffff'); },
  sk_blade: (p) => { p.poly([[13, 1], [15, 3], [6, 12], [4, 10]], '#fff6c0'); p.line(13, 2, 5, 10, '#ffffff'); p.thickLine(2, 9, 7, 14, '#ffd24a', 2); p.thickLine(1, 15, 4, 12, '#c8a040', 2); },
  sk_frost: (p) => { p.poly([[8, 0], [11, 6], [8, 15], [5, 6]], '#bfefff'); p.poly([[3, 5], [6, 9], [4, 14], [1, 9]], '#8ad0ff'); p.poly([[13, 5], [15, 9], [12, 14], [10, 9]], '#8ad0ff'); p.line(8, 1, 8, 13, '#ffffff'); },
  sk_bless: (p) => { p.ellipse(8, 8, 7, 7, '#ffcf3a', 0.35); p.rect(7, 1, 3, 14, '#fff6c0'); p.rect(3, 5, 11, 3, '#fff6c0'); p.rect(8, 2, 1, 12, '#ffffff'); },
  sk_portal: (p) => { p.ellipse(8, 8, 7, 7, '#7a2ac8'); p.ellipse(8, 8, 5, 5, '#b05aff'); p.ellipse(8, 8, 3, 3, '#e8c8ff'); p.ellipse(8, 8, 1, 1, '#ffffff'); },
};

const iconCache = new Map<string, string>();

export function iconURL(name: string, scale = 3): string {
  const key = name + '@' + scale;
  const c = iconCache.get(key);
  if (c) return c;
  const fn = ICONS[name];
  let url = '';
  if (fn) {
    const p = new PixelCanvas(16, 16);
    fn(p);
    p.outline('#140a18');
    url = p.toCanvas(scale).toDataURL();
  } else if (spriteIconProvider) {
    url = spriteIconProvider(name);
  }
  iconCache.set(key, url);
  return url;
}

let spriteIconProvider: ((name: string) => string) | null = null;
export function setSpriteIconProvider(fn: (name: string) => string) { spriteIconProvider = fn; }

export function iconImg(name: string, cls = 'ico'): string {
  const u = iconURL(name);
  return u ? `<img class="${cls}" src="${u}" alt="" draggable="false">` : '';
}

export { shade };
