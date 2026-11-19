import { drawHumanFrame } from './art/humans';
import { drawDemonFrame } from './art/demons';
import { drawBossFrame } from './art/bosses';
import { generateTerrain, generateFortress } from './art/terrain';
import { CLASS_ORDER } from './data/units';
import { ENEMY_ORDER } from './data/enemies';
import { REGIONS } from './data/regions';
import { BOSS_ORDER } from './data/bosses';
import { iconURL } from './art/fx';
const out = document.getElementById('out')!;
const row = () => { const d = document.createElement('div'); d.className = 'row'; out.appendChild(d); return d; };
const mode = new URLSearchParams(location.search).get('m') || 'units';
if (mode === 'units') {
  for (const c of CLASS_ORDER) { const r = row(); for (let t = 0; t < 4; t++) for (let f = 0; f < 6; f++) { const cv = drawHumanFrame(c, t, f).toCanvas(3); r.appendChild(cv); } }
} else if (mode === 'demons') {
  for (const id of ENEMY_ORDER) { const r = row(); for (const R of [REGIONS[0], REGIONS[2], REGIONS[4]]) for (let f = 0; f < 6; f++) r.appendChild(drawDemonFrame(id, R.palette, f).toCanvas(3)); }
} else if (mode === 'bosses') {
  for (const id of BOSS_ORDER) { const r = row(); for (let f = 0; f < 4; f++) r.appendChild(drawBossFrame(id, f).toCanvas(3)); }
} else if (mode.startsWith('terrain')) {
  const i = parseInt(mode.slice(7) || '0');
  const c = generateTerrain(REGIONS[i]); c.style.width = '1000px'; out.appendChild(c);
  const f = generateFortress(2); f.style.height = '360px'; out.appendChild(f);
} else if (mode === 'icons') {
  const r = row(); for (const n of ['sword','heart','speed','shield','tent','horn','flag','crit','skull','boom','cross','heal','book','coin','castle','hammer','star','chest','bank','gem','bolt','wing','soul','banner','fire','people','wave','gear','evo','infinity','traits','sk_blade','sk_frost','sk_bless','sk_portal']) { const im = new Image(); im.src = iconURL(n); r.appendChild(im); }
}
