// Robust number formatting for incremental-scale values (handles up to ~1e308 and beyond safely).
const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'UDc', 'DDc', 'TDc', 'QaDc', 'QiDc', 'SxDc', 'SpDc', 'OcDc', 'NoDc', 'Vg'];

export const MAX_SAFE = 1e300;

export function clampBig(n: number): number {
  if (!isFinite(n)) return n > 0 ? MAX_SAFE : -MAX_SAFE;
  if (n > MAX_SAFE) return MAX_SAFE;
  if (n < -MAX_SAFE) return -MAX_SAFE;
  return n;
}

export function fmt(n: number, decimals = 2): string {
  if (n === undefined || n === null || isNaN(n)) return '0';
  n = clampBig(n);
  const neg = n < 0;
  const a = Math.abs(n);
  let out: string;
  if (a < 1000) {
    out = a < 10 && a % 1 !== 0 ? a.toFixed(1).replace(/\.0$/, '') : Math.floor(a).toString();
  } else {
    const tier = Math.floor(Math.log10(a) / 3);
    if (tier < SUFFIXES.length) {
      const scaled = a / Math.pow(10, tier * 3);
      const d = scaled >= 100 ? Math.max(0, decimals - 2) : scaled >= 10 ? Math.max(0, decimals - 1) : decimals;
      out = trimZeros(scaled.toFixed(d)) + SUFFIXES[tier];
    } else {
      const exp = Math.floor(Math.log10(a));
      out = (a / Math.pow(10, exp)).toFixed(2) + 'e' + exp;
    }
  }
  return neg ? '-' + out : out;
}

function trimZeros(s: string) {
  if (s.indexOf('.') < 0) return s;
  return s.replace(/0+$/, '').replace(/\.$/, '');
}

export function fmtInt(n: number): string {
  if (Math.abs(n) < 100000) return Math.floor(n).toLocaleString('pt-BR');
  return fmt(n);
}

export function fmtPct(n: number): string {
  return (n * 100).toFixed(n < 0.1 ? 1 : 0) + '%';
}

export function fmtTime(sec: number): string {
  sec = Math.max(0, Math.floor(sec));
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
