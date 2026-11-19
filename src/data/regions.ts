import type { EnemyId } from './enemies';

export interface DemonPalette {
  skin: string; skinDark: string; skinLight: string; horn: string; eye: string; glow: string; armor: string; armorDark: string; cloth: string;
}

export interface RegionDef {
  id: number;
  name: string;
  subtitle: string;
  ground: [string, string, string]; // base, dark, light
  corruption: string;
  accent: string;
  decor: 'forest' | 'village' | 'swamp' | 'fortress' | 'abyss' | 'throne';
  ambient: 'fireflies' | 'embers' | 'wisps' | 'ash' | 'sparks';
  pool: { id: EnemyId; w: number; from: number }[]; // from = local wave (1..10) where it starts appearing
  miniboss: EnemyId;
  boss: string;
  palette: DemonPalette;
  music: number; // root note offset
}

export const WAVES_PER_REGION = 10;

export const REGIONS: RegionDef[] = [
  {
    id: 0, name: 'Floresta Corrompida', subtitle: 'Onde a fenda se abriu', ground: ['#4f8a2f', '#3a6b22', '#6aa83c'], corruption: '#5a1f4a', accent: '#ff3b5c',
    decor: 'forest', ambient: 'fireflies', miniboss: 'brute', boss: 'mordrak', music: 0,
    pool: [{ id: 'imp', w: 10, from: 1 }, { id: 'archer', w: 3, from: 3 }, { id: 'hound', w: 3.5, from: 4 }, { id: 'brute', w: 1.5, from: 5 }],
    palette: { skin: '#c8323c', skinDark: '#7a1624', skinLight: '#ff6a5e', horn: '#e8d6b0', eye: '#ffe14a', glow: '#ff7a2a', armor: '#3b2a3f', armorDark: '#22152a', cloth: '#5b1f3a' },
  },
  {
    id: 1, name: 'Vilarejo em Ruínas', subtitle: 'Cinzas do que fomos', ground: ['#7d8a3a', '#5f6a2a', '#9aa650'], corruption: '#5a2a1a', accent: '#ff8a2a',
    decor: 'village', ambient: 'embers', miniboss: 'elite', boss: 'vulgrath', music: 3,
    pool: [{ id: 'imp', w: 8, from: 1 }, { id: 'archer', w: 4, from: 1 }, { id: 'hound', w: 3, from: 2 }, { id: 'bomber', w: 3, from: 3 }, { id: 'brute', w: 2, from: 4 }, { id: 'flyer', w: 2, from: 6 }],
    palette: { skin: '#d8552a', skinDark: '#8a2a12', skinLight: '#ff8a4a', horn: '#2a1a12', eye: '#fff07a', glow: '#ffa23a', armor: '#4a3a2a', armorDark: '#2a1e14', cloth: '#7a3a1a' },
  },
  {
    id: 2, name: 'Pântano das Almas', subtitle: 'Os mortos não descansam', ground: ['#4a6a4a', '#33503a', '#62845a'], corruption: '#1f4a3a', accent: '#5affb0',
    decor: 'swamp', ambient: 'wisps', miniboss: 'brute', boss: 'ssaelith', music: 5,
    pool: [{ id: 'imp', w: 7, from: 1 }, { id: 'shaman', w: 2.5, from: 1 }, { id: 'flyer', w: 3, from: 2 }, { id: 'bomber', w: 3, from: 2 }, { id: 'sorcerer', w: 2.5, from: 3 }, { id: 'brute', w: 2, from: 4 }, { id: 'summoner', w: 1.2, from: 6 }],
    palette: { skin: '#5a9a5a', skinDark: '#2a5a3a', skinLight: '#8ad08a', horn: '#d0e0a0', eye: '#ff3a6a', glow: '#5affb0', armor: '#2a3a3a', armorDark: '#16201f', cloth: '#2a4a3a' },
  },
  {
    id: 3, name: 'Fortaleza Profanada', subtitle: 'Muralhas que já foram nossas', ground: ['#6a6a78', '#4e4e5c', '#868696'], corruption: '#3a1a5a', accent: '#b05aff',
    decor: 'fortress', ambient: 'sparks', miniboss: 'elite', boss: 'kaedros', music: 7,
    pool: [{ id: 'imp', w: 6, from: 1 }, { id: 'elite', w: 1.2, from: 1 }, { id: 'archer', w: 4, from: 1 }, { id: 'sorcerer', w: 3, from: 2 }, { id: 'hound', w: 3, from: 2 }, { id: 'shaman', w: 2, from: 3 }, { id: 'brute', w: 2.5, from: 3 }, { id: 'summoner', w: 1.5, from: 5 }],
    palette: { skin: '#8a3ac8', skinDark: '#4a1a7a', skinLight: '#b87aff', horn: '#e0d0ff', eye: '#7affff', glow: '#b05aff', armor: '#2a2a3a', armorDark: '#141420', cloth: '#4a1a5a' },
  },
  {
    id: 4, name: 'Abismo de Cinzas', subtitle: 'O chão arde sob os pés', ground: ['#5a5050', '#3e3636', '#766a66'], corruption: '#5a1a0a', accent: '#ff5a1a',
    decor: 'abyss', ambient: 'ash', miniboss: 'brute', boss: 'ignar', music: 2,
    pool: [{ id: 'imp', w: 6, from: 1 }, { id: 'bomber', w: 4, from: 1 }, { id: 'flyer', w: 4, from: 1 }, { id: 'brute', w: 3, from: 2 }, { id: 'sorcerer', w: 3, from: 2 }, { id: 'hound', w: 3, from: 3 }, { id: 'elite', w: 1.5, from: 4 }, { id: 'summoner', w: 1.5, from: 5 }],
    palette: { skin: '#3a3030', skinDark: '#1a1414', skinLight: '#6a5a50', horn: '#ff9a3a', eye: '#ffef6a', glow: '#ff5a1a', armor: '#2a1a14', armorDark: '#140c08', cloth: '#5a1a0a' },
  },
  {
    id: 5, name: 'Trono Infernal', subtitle: 'O coração do abismo', ground: ['#4a2a3a', '#331a28', '#6a3a4e'], corruption: '#6a0a1a', accent: '#ff2a4a',
    decor: 'throne', ambient: 'embers', miniboss: 'elite', boss: 'azhgore', music: 10,
    pool: [{ id: 'imp', w: 5, from: 1 }, { id: 'elite', w: 2, from: 1 }, { id: 'sorcerer', w: 3, from: 1 }, { id: 'flyer', w: 3, from: 1 }, { id: 'shaman', w: 2, from: 2 }, { id: 'bomber', w: 3, from: 2 }, { id: 'hound', w: 3, from: 2 }, { id: 'brute', w: 3, from: 3 }, { id: 'summoner', w: 2, from: 4 }, { id: 'archer', w: 3, from: 1 }],
    palette: { skin: '#a01a2a', skinDark: '#500a14', skinLight: '#e04a4a', horn: '#f0e0c0', eye: '#ffd23a', glow: '#ff2a4a', armor: '#3a1a1a', armorDark: '#1a0a0a', cloth: '#6a0a1a' },
  },
];

export interface InfiniteModifier { id: string; name: string; desc: string }
export const INFINITE_MODS: InfiniteModifier[] = [
  { id: 'fury', name: 'Fúria', desc: 'Demônios causam +40% de dano.' },
  { id: 'armored', name: 'Blindados', desc: 'Demônios têm +60% de vida.' },
  { id: 'swarm', name: 'Enxame', desc: '+50% de inimigos, mais fracos.' },
  { id: 'swift', name: 'Velozes', desc: 'Demônios são 30% mais rápidos.' },
  { id: 'skies', name: 'Céus Negros', desc: 'Muitos voadores.' },
  { id: 'siege', name: 'Cerco', desc: 'Dano à fortaleza dobrado, ouro +50%.' },
  { id: 'elite', name: 'Legião de Elite', desc: 'Elites e brutos dominam a onda.' },
];

export function regionForWave(wave: number): number {
  return Math.min(REGIONS.length - 1, Math.floor((wave - 1) / WAVES_PER_REGION));
}
export function isInfinite(wave: number) {
  return wave > REGIONS.length * WAVES_PER_REGION;
}
/** Region whose visuals to use (cycles in infinite war). */
export function visualRegionForWave(wave: number): number {
  const r = Math.floor((wave - 1) / WAVES_PER_REGION);
  return r % REGIONS.length;
}
