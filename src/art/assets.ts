// Registers all procedurally generated art as Phaser textures (lazy for region-specific content).
import Phaser from 'phaser';
import { PixelCanvas, sheet } from './pixel';
import { drawHumanFrame, drawSpiritFrame, HUMAN_FRAMES } from './humans';
import { drawDemonFrame } from './demons';
import { drawBossFrame, BOSS_FRAMES } from './bosses';
import { drawHeroFrame, HERO_FRAMES } from './heroes';
import { HERO_ORDER } from '../data/heroes';
import { generateTerrain, generateFortress, generatePortal } from './terrain';
import { fxTextures, setSpriteIconProvider } from './fx';
import { CLASS_ORDER, type ClassId } from '../data/units';
import { ENEMY_ORDER, type EnemyId } from '../data/enemies';
import { REGIONS } from '../data/regions';
import { BOSS_ORDER } from '../data/bosses';

function addSheet(scene: Phaser.Scene, key: string, frames: PixelCanvas[]) {
  if (scene.textures.exists(key)) return;
  const c = sheet(frames);
  const tex = scene.textures.addCanvas(key, c)!;
  const fw = frames[0].w, fh = frames[0].h;
  for (let i = 0; i < frames.length; i++) tex.add(i, 0, i * fw, 0, fw, fh);
}

export function registerCoreArt(scene: Phaser.Scene) {
  const fx = fxTextures();
  for (const k of Object.keys(fx)) if (!scene.textures.exists(k)) scene.textures.addCanvas(k, fx[k]);
  for (const cls of CLASS_ORDER) {
    for (let t = 0; t < 4; t++) {
      const frames: PixelCanvas[] = [];
      for (let f = 0; f < HUMAN_FRAMES; f++) frames.push(drawHumanFrame(cls, t, f));
      addSheet(scene, `u_${cls}_${t}`, frames);
    }
  }
  for (const k of ['spirit', 'spiritArcher', 'golem', 'spectral'] as const) {
    const frames: PixelCanvas[] = [];
    for (let f = 0; f < HUMAN_FRAMES; f++) frames.push(drawSpiritFrame(k, f));
    addSheet(scene, `s_${k}`, frames);
  }
  for (const id of BOSS_ORDER) {
    const frames: PixelCanvas[] = [];
    for (let f = 0; f < BOSS_FRAMES; f++) frames.push(drawBossFrame(id, f));
    addSheet(scene, `b_${id}`, frames);
  }
  for (const id of HERO_ORDER) {
    const frames: PixelCanvas[] = [];
    for (let f = 0; f < HERO_FRAMES; f++) frames.push(drawHeroFrame(id, f));
    addSheet(scene, `h_${id}`, frames);
  }
  for (let s = 0; s < 4; s++) if (!scene.textures.exists(`fort_${s}`)) scene.textures.addCanvas(`fort_${s}`, generateFortress(s));
  setSpriteIconProvider(spriteIcon);
}

export function ensureRegionArt(scene: Phaser.Scene, r: number) {
  const R = REGIONS[r];
  for (const id of ENEMY_ORDER) {
    const key = `e_${r}_${id}`;
    if (scene.textures.exists(key)) continue;
    const frames: PixelCanvas[] = [];
    for (let f = 0; f < 6; f++) frames.push(drawDemonFrame(id, R.palette, f));
    addSheet(scene, key, frames);
  }
  if (!scene.textures.exists(`terrain_${r}`)) scene.textures.addCanvas(`terrain_${r}`, generateTerrain(R));
  const pk = `portal_${r}`;
  if (!scene.textures.exists(pk)) {
    const frames = [0, 1, 2, 3].map((f) => generatePortal(f, R.accent));
    const c = document.createElement('canvas');
    c.width = frames[0].width * 4; c.height = frames[0].height;
    const ctx = c.getContext('2d')!;
    frames.forEach((f, i) => ctx.drawImage(f, i * f.width, 0));
    const tex = scene.textures.addCanvas(pk, c)!;
    for (let i = 0; i < 4; i++) tex.add(i, 0, i * frames[0].width, 0, frames[0].width, frames[0].height);
  }
}

// ---------- DOM icons from sprites ----------
const cache = new Map<string, string>();
export function spriteIcon(name: string): string {
  if (cache.has(name)) return cache.get(name)!;
  let url = '';
  if (name.startsWith('cls_')) {
    const cls = name.slice(4) as ClassId;
    url = trimCanvas(drawHumanFrame(cls, 1, 0)).toCanvas(3).toDataURL();
  } else if (name.startsWith('tier_')) {
    const [, cls, t] = name.split('_');
    url = trimCanvas(drawHumanFrame(cls as ClassId, parseInt(t), 0)).toCanvas(3).toDataURL();
  } else if (name.startsWith('enemy_')) {
    const id = name.slice(6) as EnemyId;
    url = trimCanvas(drawDemonFrame(id, REGIONS[0].palette, 0)).toCanvas(3).toDataURL();
  } else if (name.startsWith('hero_')) {
    url = trimCanvas(drawHeroFrame(name.slice(5), 0)).toCanvas(2).toDataURL();
  } else if (name.startsWith('boss_')) {
    url = trimCanvas(drawBossFrame(name.slice(5), 0)).toCanvas(2).toDataURL();
  }
  cache.set(name, url);
  return url;
}

function trimCanvas(p: PixelCanvas): PixelCanvas {
  let x0 = p.w, y0 = p.h, x1 = 0, y1 = 0;
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if (p.get(x, y) > 0) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  if (x1 < x0) return p;
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const s = Math.max(w, h);
  const out = new PixelCanvas(s, s);
  const ox = Math.floor((s - w) / 2), oy = Math.floor((s - h) / 2);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const si = ((y + y0) * p.w + (x + x0)) * 4, di = ((y + oy) * s + (x + ox)) * 4;
    for (let k = 0; k < 4; k++) out.data[di + k] = p.data[si + k];
  }
  return out;
}
