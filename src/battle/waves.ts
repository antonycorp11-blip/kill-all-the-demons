// Wave director: composition per region, spawn pacing, minibosses (wave 5) and bosses (wave 10), infinite war.
import { REGIONS, WAVES_PER_REGION, INFINITE_MODS, isInfinite, regionForWave } from '../data/regions';
import { BOSS_ORDER } from '../data/bosses';
import type { EnemyId } from '../data/enemies';
import { G } from '../core/state';
import { weightedPick, rand, pick } from '../core/util';
import type { World } from './world';
import type { BossCtl } from './boss';

export type WaveState = 'spawning' | 'fighting' | 'cleared' | 'idle';

export class WaveDirector {
  w: World;
  boss: BossCtl;
  state: WaveState = 'idle';
  queue: { id: EnemyId; hpMul: number }[] = [];
  spawnT = 0;
  spawnGap = 1;
  clearT = 0;
  isBossWave = false;
  isMiniWave = false;
  bossSpawned = false;
  miniAt = 0;
  spawnedCount = 0;
  trickleT = 3;
  totalCount = 0;
  portals: { x: number; y: number }[] = [];
  onCleared: () => void = () => {};
  onStart: (wave: number) => void = () => {};

  constructor(w: World, boss: BossCtl) { this.w = w; this.boss = boss; }

  localWave(wave = this.w.wave) { return ((wave - 1) % WAVES_PER_REGION) + 1; }

  start(wave: number) {
    const w = this.w;
    w.wave = wave;
    const lw = this.localWave(wave);
    const inf = isInfinite(wave);
    const run = G.run!;
    // infinite war modifiers rotate every 5 waves
    if (inf) {
      if (lw === 1 || lw === 6 || !run.modifier) run.modifier = pick(INFINITE_MODS).id;
    } else run.modifier = null;
    const region = inf ? Math.floor(Math.random() * REGIONS.length) : regionForWave(wave);
    const R = REGIONS[inf ? w.region : region];
    this.isBossWave = lw === WAVES_PER_REGION;
    this.isMiniWave = lw === 5;
    this.bossSpawned = false;
    let count = Math.floor(2 + wave * 2.5 + lw * 1.0);
    let hpMul = 1;
    if (run.modifier === 'swarm') { count = Math.floor(count * 1.5); hpMul = 0.7; }
    if (this.isBossWave) count = Math.floor(count * 0.45);
    const MAX = 130;
    if (count > MAX) { hpMul *= count / MAX; count = MAX; }
    const pool = R.pool.filter((p) => inf || p.from <= lw);
    this.queue = [];
    for (let i = 0; i < count; i++) {
      let id: EnemyId;
      if (run.modifier === 'skies' && Math.random() < 0.4) id = 'flyer';
      else if (run.modifier === 'elite' && Math.random() < 0.35) id = Math.random() < 0.5 ? 'elite' : 'brute';
      else id = weightedPick(pool, (p) => p.w)!.id;
      this.queue.push({ id, hpMul });
    }
    // groups of imps at start for readability
    this.spawnedCount = 0;
    this.totalCount = this.queue.length;
    this.spawnGap = Math.max(0.08, 0.5 - wave * 0.01);
    this.spawnT = 0.6;
    this.miniAt = Math.floor(count * 0.5);
    this.state = 'spawning';
    this.onStart(wave);
  }

  /** While a boss/miniboss is alive, small groups keep coming so the economy never stalls. */
  private trickle(dt: number) {
    const w = this.w;
    if (!this.boss.list.some((c) => c.e.alive)) { this.trickleT = 3; return; }
    this.trickleT -= dt;
    if (this.trickleT > 0 || w.enemyCount() > w.enemyCap() * 0.5) return;
    this.trickleT = rand(3.5, 5.5);
    const lw = this.localWave();
    const inf = isInfinite(w.wave);
    const pool = REGIONS[w.region].pool.filter((p) => inf || p.from <= lw);
    const n = 2 + Math.floor(Math.random() * 3) + Math.floor(w.wave / 15);
    const portal = this.portals.length ? pick(this.portals) : { x: w.W + 20, y: (w.fieldTop + w.fieldBot) / 2 };
    for (let i = 0; i < n; i++) {
      const id = weightedPick(pool, (p) => p.w)!.id;
      w.spawnEnemy(id, portal.x + rand(-6, 10), Math.max(w.fieldTop, Math.min(w.fieldBot, portal.y + rand(-40, 40))), { hpMul: 0.75 });
    }
    w.fx.glow(portal.x, portal.y, 0xff3a5c, 1.2, 0.35);
  }

  update(dt: number) {
    const w = this.w;
    if (this.state === 'spawning' || this.state === 'fighting') this.trickle(dt);
    if (this.state === 'spawning') {
      if (this.isBossWave && !this.bossSpawned) {
        const inf = isInfinite(w.wave);
        const id = inf ? BOSS_ORDER[Math.floor((w.wave - 1) / WAVES_PER_REGION) % BOSS_ORDER.length] : REGIONS[regionForWave(w.wave)].boss;
        this.boss.spawnBoss(id);
        this.bossSpawned = true;
      }
      if (this.isMiniWave && (this.spawnedCount >= this.miniAt || !this.queue.length) && !this.bossSpawned) {
        this.boss.spawnMini(REGIONS[w.region].miniboss);
        this.bossSpawned = true;
      }
      this.spawnT -= dt;
      if (this.spawnT <= 0 && this.queue.length) {
        if (w.enemyCount() >= w.enemyCap()) { this.spawnT = 0.3; return; }
        const group = Math.min(this.queue.length, 2 + Math.floor(Math.random() * Math.min(9, 2 + w.wave / 3)));
        const portal = this.portals.length ? pick(this.portals) : { x: w.W + 20, y: (w.fieldTop + w.fieldBot) / 2 };
        for (let i = 0; i < group; i++) {
          const q = this.queue.shift()!;
          const y = Math.max(w.fieldTop, Math.min(w.fieldBot, portal.y + rand(-40, 40)));
          const e = w.spawnEnemy(q.id, portal.x + rand(-6, 10), y, { hpMul: q.hpMul, laneY: undefined });
          if (!e.flying && q.id !== 'hound') e.laneY = Math.max(w.fieldTop + 10, Math.min(w.fieldBot - 10, y + rand(-120, 120)));
          w.fx.glow(portal.x, portal.y, 0xff3a5c, 1.2, 0.35);
          this.spawnedCount++;
        }
        this.spawnT = this.spawnGap * rand(0.7, 1.3) * Math.sqrt(group) * (this.isBossWave ? 2.2 : 1);
      }
      if (!this.queue.length && (!this.isMiniWave || this.bossSpawned)) this.state = 'fighting';
    } else if (this.state === 'fighting') {
      if (w.enemyCount() === 0 && !this.boss.list.length) {
        this.state = 'cleared';
        this.clearT = 2.6;
        this.onCleared();
      }
    } else if (this.state === 'cleared') {
      this.clearT -= dt;
    }
  }

  progress(): number {
    if (this.state === 'cleared') return 1;
    const alive = this.w.enemyCount();
    const done = this.spawnedCount - alive;
    return Math.max(0, Math.min(1, done / Math.max(1, this.totalCount)));
  }
}
