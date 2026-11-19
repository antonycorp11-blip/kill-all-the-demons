// Uniform spatial hash for fast neighbour queries (rebuilt each frame).
import type { Ent } from './types';

export class Grid {
  cell: number;
  cols = 1;
  rows = 1;
  buckets: Ent[][] = [];

  constructor(cell = 48) { this.cell = cell; }

  reset(w: number, h: number) {
    this.cols = Math.ceil(w / this.cell) + 2;
    this.rows = Math.ceil(h / this.cell) + 2;
    const n = this.cols * this.rows;
    if (this.buckets.length !== n) this.buckets = Array.from({ length: n }, () => []);
    else for (const b of this.buckets) b.length = 0;
  }

  private idx(x: number, y: number) {
    let cx = Math.floor(x / this.cell) + 1, cy = Math.floor(y / this.cell) + 1;
    if (cx < 0) cx = 0; else if (cx >= this.cols) cx = this.cols - 1;
    if (cy < 0) cy = 0; else if (cy >= this.rows) cy = this.rows - 1;
    return cy * this.cols + cx;
  }

  insert(e: Ent) {
    if (!Number.isFinite(e.x) || !Number.isFinite(e.y)) { e.x = 400; e.y = 400; }
    this.buckets[this.idx(e.x, e.y)].push(e);
  }

  /** Calls fn for each entity within radius of (x,y). Return true from fn to stop. */
  query(x: number, y: number, r: number, fn: (e: Ent, d2: number) => boolean | void) {
    const c = this.cell;
    const x0 = Math.max(0, Math.floor((x - r) / c) + 1), x1 = Math.min(this.cols - 1, Math.floor((x + r) / c) + 1);
    const y0 = Math.max(0, Math.floor((y - r) / c) + 1), y1 = Math.min(this.rows - 1, Math.floor((y + r) / c) + 1);
    const r2 = r * r;
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const b = this.buckets[cy * this.cols + cx];
        for (let i = 0; i < b.length; i++) {
          const e = b[i];
          if (!e.alive) continue;
          const dx = e.x - x, dy = e.y - y;
          const d2 = dx * dx + dy * dy;
          if (d2 <= r2 && fn(e, d2)) return;
        }
      }
    }
  }

  nearest(x: number, y: number, r: number, filter?: (e: Ent) => boolean): Ent | null {
    let best: Ent | null = null, bd = Infinity;
    this.query(x, y, r, (e, d2) => {
      if (d2 < bd && (!filter || filter(e))) { bd = d2; best = e; }
    });
    return best;
  }

  count(x: number, y: number, r: number): number {
    let n = 0;
    this.query(x, y, r, () => { n++; });
    return n;
  }
}
