// Tiny pixel-art painter: draws into an RGBA buffer at native grid resolution,
// supports primitive shapes, auto-outline and shading. Everything in the game is painted with this.

const colorCache = new Map<string, [number, number, number, number]>();

export function parseColor(c: string): [number, number, number, number] {
  let v = colorCache.get(c);
  if (v) return v;
  let r = 0, g = 0, b = 0, a = 255;
  if (c.startsWith('#')) {
    const h = c.slice(1);
    if (h.length === 3) {
      r = parseInt(h[0] + h[0], 16); g = parseInt(h[1] + h[1], 16); b = parseInt(h[2] + h[2], 16);
    } else {
      r = parseInt(h.slice(0, 2), 16); g = parseInt(h.slice(2, 4), 16); b = parseInt(h.slice(4, 6), 16);
      if (h.length === 8) a = parseInt(h.slice(6, 8), 16);
    }
  }
  v = [r, g, b, a];
  colorCache.set(c, v);
  return v;
}

export function hex(r: number, g: number, b: number) {
  const f = (x: number) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0');
  return '#' + f(r) + f(g) + f(b);
}

export function shade(c: string, amt: number): string {
  const [r, g, b] = parseColor(c);
  if (amt >= 0) return hex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
  return hex(r * (1 + amt), g * (1 + amt), b * (1 + amt));
}

export function mix(a: string, b: string, t: number): string {
  const A = parseColor(a), B = parseColor(b);
  return hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}

export class PixelCanvas {
  readonly w: number;
  readonly h: number;
  readonly data: Uint8ClampedArray;
  /** marks pixels that are outline so shading passes can skip them */
  ox = 0;
  oy = 0;

  constructor(w: number, h: number) {
    this.w = Math.max(1, Math.round(w)); this.h = Math.max(1, Math.round(h));
    this.data = new Uint8ClampedArray(this.w * this.h * 4);
  }

  setOffset(x: number, y: number) { this.ox = x; this.oy = y; return this; }

  px(x: number, y: number, c: string, alpha = 1) {
    x = Math.round(x + this.ox); y = Math.round(y + this.oy);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const [r, g, b, a] = parseColor(c);
    const i = (y * this.w + x) * 4;
    const al = (a / 255) * alpha;
    if (al >= 0.999) {
      this.data[i] = r; this.data[i + 1] = g; this.data[i + 2] = b; this.data[i + 3] = 255;
    } else {
      const da = this.data[i + 3] / 255;
      const oa = al + da * (1 - al);
      if (oa <= 0) return;
      this.data[i] = (r * al + this.data[i] * da * (1 - al)) / oa;
      this.data[i + 1] = (g * al + this.data[i + 1] * da * (1 - al)) / oa;
      this.data[i + 2] = (b * al + this.data[i + 2] * da * (1 - al)) / oa;
      this.data[i + 3] = oa * 255;
    }
  }

  get(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.data[(y * this.w + x) * 4 + 3];
  }

  rect(x: number, y: number, w: number, h: number, c: string, alpha = 1) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c, alpha);
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, c: string, alpha = 1) {
    const x0 = Math.floor(cx - rx - 1), x1 = Math.ceil(cx + rx + 1);
    const y0 = Math.floor(cy - ry - 1), y1 = Math.ceil(cy + ry + 1);
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const dx = (x - cx) / (rx + 0.35), dy = (y - cy) / (ry + 0.35);
        if (dx * dx + dy * dy <= 1) this.px(x, y, c, alpha);
      }
  }

  ring(cx: number, cy: number, rx: number, ry: number, c: string, thick = 1, alpha = 1) {
    const x0 = Math.floor(cx - rx - 1), x1 = Math.ceil(cx + rx + 1);
    const y0 = Math.floor(cy - ry - 1), y1 = Math.ceil(cy + ry + 1);
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const dx = (x - cx) / (rx + 0.35), dy = (y - cy) / (ry + 0.35);
        const d = Math.sqrt(dx * dx + dy * dy);
        const inner = 1 - thick / Math.max(1, Math.min(rx, ry));
        if (d <= 1 && d >= inner) this.px(x, y, c, alpha);
      }
  }

  line(x0: number, y0: number, x1: number, y1: number, c: string, alpha = 1) {
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const steps = Math.max(dx, dy, 1);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      this.px(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), c, alpha);
    }
  }

  thickLine(x0: number, y0: number, x1: number, y1: number, c: string, t = 2) {
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const steps = Math.max(dx, dy, 1);
    for (let i = 0; i <= steps; i++) {
      const k = i / steps;
      const x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k;
      this.rect(Math.round(x - t / 2), Math.round(y - t / 2), t, t, c);
    }
  }

  poly(pts: number[][], c: string, alpha = 1) {
    let minY = Infinity, maxY = -Infinity;
    for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const xs: number[] = [];
      const sy = y + 0.5;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= sy && b[1] > sy) || (b[1] <= sy && a[1] > sy)) {
          xs.push(a[0] + ((sy - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
        }
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.px(x, y, c, alpha);
      }
    }
  }

  /** Dark outline around every opaque pixel (4-neighbourhood). */
  outline(c = '#1a0f1f', diag = false) {
    const w = this.w, h = this.h;
    const src = new Uint8ClampedArray(this.data);
    const [r, g, b] = parseColor(c);
    const op = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && src[(y * w + x) * 4 + 3] > 100;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (src[i + 3] > 100) continue;
        if (op(x - 1, y) || op(x + 1, y) || op(x, y - 1) || op(x, y + 1) || (diag && (op(x - 1, y - 1) || op(x + 1, y - 1) || op(x - 1, y + 1) || op(x + 1, y + 1)))) {
          this.data[i] = r; this.data[i + 1] = g; this.data[i + 2] = b; this.data[i + 3] = 255;
        }
      }
    return this;
  }

  /** Shade bottom/right edges of shapes darker and top/left lighter for a chunky lit look. */
  autoShade(strength = 0.22) {
    const w = this.w, h = this.h;
    const src = new Uint8ClampedArray(this.data);
    const op = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && src[(y * w + x) * 4 + 3] > 100;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (src[i + 3] <= 100) continue;
        let f = 0;
        if (!op(x, y + 1)) f -= strength;
        if (!op(x + 1, y)) f -= strength * 0.5;
        if (!op(x, y - 1)) f += strength * 0.8;
        if (f === 0) continue;
        for (let k = 0; k < 3; k++) {
          const v = src[i + k];
          this.data[i + k] = f > 0 ? v + (255 - v) * f : v * (1 + f);
        }
      }
    return this;
  }

  /** Apply crisp alpha (no semi-transparent edges) */
  crisp(threshold = 110) {
    for (let i = 3; i < this.data.length; i += 4) this.data[i] = this.data[i] > threshold ? 255 : 0;
    return this;
  }

  toCanvas(scale = 1): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = this.w; c.height = this.h;
    const ctx = c.getContext('2d')!;
    const img = ctx.createImageData(this.w, this.h);
    img.data.set(this.data);
    ctx.putImageData(img, 0, 0);
    if (scale === 1) return c;
    const s = document.createElement('canvas');
    s.width = this.w * scale; s.height = this.h * scale;
    const sc = s.getContext('2d')!;
    sc.imageSmoothingEnabled = false;
    sc.drawImage(c, 0, 0, s.width, s.height);
    return s;
  }

  drawTo(ctx: CanvasRenderingContext2D, x: number, y: number, flip = false) {
    const c = this.toCanvas();
    if (flip) {
      ctx.save(); ctx.translate(x + this.w, y); ctx.scale(-1, 1); ctx.drawImage(c, 0, 0); ctx.restore();
    } else ctx.drawImage(c, x, y);
  }
}

/** Builds a horizontal sprite sheet canvas out of frames. */
export function sheet(frames: PixelCanvas[]): HTMLCanvasElement {
  const fw = frames[0].w, fh = frames[0].h;
  const c = document.createElement('canvas');
  c.width = fw * frames.length; c.height = fh;
  const ctx = c.getContext('2d')!;
  frames.forEach((f, i) => ctx.drawImage(f.toCanvas(), i * fw, 0));
  return c;
}

/** Deterministic PRNG for reproducible procedural art. */
export function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
