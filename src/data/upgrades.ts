// Expedition upgrades (gold), permanent tree (essence), blessings (army levels), commander skills.
import type { ClassId } from './units';

export interface UpgradeDef {
  id: string;
  name: string;
  icon: string;
  base: number;
  growth: number;
  max?: number;
  desc: (lvl: number) => string;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

export const UPGRADES: UpgradeDef[] = [
  { id: 'dmg', name: 'Lâminas Afiadas', icon: 'sword', base: 12, growth: 1.2, desc: (l) => `Dano das tropas x${Math.pow(1.11, l).toFixed(2)}` },
  { id: 'hp', name: 'Armaduras Reforçadas', icon: 'heart', base: 10, growth: 1.2, desc: (l) => `Vida das tropas x${Math.pow(1.1, l).toFixed(2)}` },
  { id: 'atkspd', name: 'Treino de Combate', icon: 'speed', base: 35, growth: 1.3, max: 20, desc: (l) => `Velocidade de ataque +${l * 5}%` },
  { id: 'armor', name: 'Escudos de Ferro', icon: 'shield', base: 25, growth: 1.25, max: 20, desc: (l) => `Armadura +${l * 6} (redução de dano)` },
  { id: 'cap', name: 'Quartéis', icon: 'tent', base: 20, growth: 1.25, desc: (l) => `Capacidade do exército +${l * 3}` },
  { id: 'recruit', name: 'Corneta de Guerra', icon: 'horn', base: 22, growth: 1.3, max: 15, desc: (l) => `Recrutamento ${pct(1 - Math.pow(0.92, l))} mais rápido` },
  { id: 'rcost', name: 'Estandartes', icon: 'flag', base: 30, growth: 1.28, max: 15, desc: (l) => `Custo de recrutas -${pct(1 - Math.pow(0.95, l))}` },
  { id: 'crit', name: 'Golpes Precisos', icon: 'crit', base: 45, growth: 1.3, max: 20, desc: (l) => `Chance crítica +${l * 2}%` },
  { id: 'critdmg', name: 'Execução', icon: 'skull', base: 70, growth: 1.24, desc: (l) => `Dano crítico +${l * 20}%` },
  { id: 'aoe', name: 'Pólvora Arcana', icon: 'boom', base: 60, growth: 1.25, max: 20, desc: (l) => `Dano/raio em área +${l * 10}%` },
  { id: 'regen', name: 'Bandagens', icon: 'cross', base: 40, growth: 1.28, max: 10, desc: (l) => `Tropas regeneram ${(l * 0.2).toFixed(1)}% vida/s` },
  { id: 'xp', name: 'Táticas', icon: 'book', base: 28, growth: 1.25, max: 30, desc: (l) => `Experiência +${l * 12}%` },
  { id: 'gold', name: 'Pilhagem', icon: 'coin', base: 30, growth: 1.3, max: 25, desc: (l) => `Ouro +${l * 8}%` },
  { id: 'fort', name: 'Muralhas', icon: 'castle', base: 20, growth: 1.24, max: 60, desc: (l) => `Vida da fortaleza x${Math.pow(1.12, l).toFixed(2)}` },
  { id: 'fregen', name: 'Pedreiros', icon: 'hammer', base: 50, growth: 1.3, max: 12, desc: (l) => `Fortaleza regenera ${(l * 0.2).toFixed(1)}%/s` },
];

export function upgradeCost(def: UpgradeDef, lvl: number): number {
  return Math.ceil(def.base * Math.pow(def.growth, lvl));
}

// ---------------- Permanent tree ----------------
export interface MetaNode {
  id: string;
  name: string;
  branch: 'ofensiva' | 'defesa' | 'comando' | 'fortuna' | 'arcano' | 'legado';
  icon: string;
  base: number;
  growth: number;
  max: number;
  req?: string[];
  row: number;
  desc: (lvl: number) => string;
  unlockClass?: ClassId;
}

export const META_BRANCHES: { id: MetaNode['branch']; name: string; color: string }[] = [
  { id: 'ofensiva', name: 'Ofensiva', color: '#ff5a4a' },
  { id: 'defesa', name: 'Defesa', color: '#4aa8ff' },
  { id: 'comando', name: 'Comando', color: '#ffd24a' },
  { id: 'fortuna', name: 'Fortuna', color: '#ffb02a' },
  { id: 'arcano', name: 'Arcano', color: '#c06aff' },
  { id: 'legado', name: 'Legado', color: '#5affc0' },
];

export const META_NODES: MetaNode[] = [
  // Ofensiva
  { id: 'm_dmg', name: 'Força Ancestral', branch: 'ofensiva', icon: 'sword', base: 3, growth: 1.42, max: 60, row: 0, desc: (l) => `Dano x${Math.pow(1.2, l).toFixed(2)}` },
  { id: 'm_crit', name: 'Instinto Assassino', branch: 'ofensiva', icon: 'crit', base: 10, growth: 1.6, max: 10, row: 1, req: ['m_dmg'], desc: (l) => `Chance crítica +${l * 2}%` },
  { id: 'm_aoe', name: 'Devastação', branch: 'ofensiva', icon: 'boom', base: 18, growth: 1.6, max: 10, row: 2, req: ['m_crit'], desc: (l) => `Dano em área +${l * 12}%` },
  { id: 'm_boss', name: 'Matador de Chefes', branch: 'ofensiva', icon: 'skull', base: 40, growth: 1.55, max: 20, row: 3, req: ['m_aoe'], desc: (l) => `+${l * 20}% de dano contra chefes` },
  { id: 'u_lancer', name: 'Academia: Lanceiros', branch: 'ofensiva', icon: 'cls_lancer', base: 30, growth: 1, max: 1, row: 4, req: ['m_boss'], unlockClass: 'lancer', desc: () => `Lanceiros desbloqueados em toda expedição` },
  // Defesa
  { id: 'm_hp', name: 'Vigor', branch: 'defesa', icon: 'heart', base: 3, growth: 1.42, max: 60, row: 0, desc: (l) => `Vida das tropas x${Math.pow(1.2, l).toFixed(2)}` },
  { id: 'm_fort', name: 'Muralhas Eternas', branch: 'defesa', icon: 'castle', base: 5, growth: 1.45, max: 40, row: 1, req: ['m_hp'], desc: (l) => `Vida da fortaleza x${Math.pow(1.25, l).toFixed(2)}` },
  { id: 'm_armor', name: 'Couraça', branch: 'defesa', icon: 'shield', base: 14, growth: 1.6, max: 10, row: 2, req: ['m_fort'], desc: (l) => `Armadura +${l * 8}` },
  { id: 'm_fregen', name: 'Fé Inabalável', branch: 'defesa', icon: 'cross', base: 25, growth: 1.6, max: 10, row: 3, req: ['m_armor'], desc: (l) => `Fortaleza recupera +${l * 4}% entre ondas` },
  { id: 'u_guardian', name: 'Academia: Guardiões', branch: 'defesa', icon: 'cls_guardian', base: 20, growth: 1, max: 1, row: 4, req: ['m_fregen'], unlockClass: 'guardian', desc: () => `Guardiões desbloqueados em toda expedição` },
  // Comando
  { id: 'm_start', name: 'Recrutas Iniciais', branch: 'comando', icon: 'cls_militia', base: 4, growth: 1.8, max: 8, row: 0, desc: (l) => `Começa com +${l} soldado(s)` },
  { id: 'm_cap', name: 'Quartel-General', branch: 'comando', icon: 'tent', base: 8, growth: 1.5, max: 30, row: 1, req: ['m_start'], desc: (l) => `Capacidade do exército +${l * 3}` },
  { id: 'm_recruit', name: 'Mobilização', branch: 'comando', icon: 'horn', base: 12, growth: 1.6, max: 10, row: 2, req: ['m_cap'], desc: (l) => `Recrutamento ${l * 6}% mais rápido` },
  { id: 'm_rapid', name: 'Reforços Rápidos', branch: 'comando', icon: 'flag', base: 30, growth: 1.7, max: 5, row: 3, req: ['m_recruit'], desc: (l) => `Ao perder todo o exército, chegam ${l * 3} recrutas` },
  { id: 'm_elite', name: 'Destacamento de Elite', branch: 'comando', icon: 'star', base: 60, growth: 1.7, max: 8, row: 4, req: ['m_rapid'], desc: (l) => `Recrutas chegam com +${l} nível(is)` },
  // Fortuna
  { id: 'm_gold', name: 'Saque', branch: 'fortuna', icon: 'coin', base: 3, growth: 1.42, max: 60, row: 0, desc: (l) => `Ouro x${Math.pow(1.15, l).toFixed(2)}` },
  { id: 'm_startgold', name: 'Tesouro Real', branch: 'fortuna', icon: 'chest', base: 6, growth: 1.5, max: 20, row: 1, req: ['m_gold'], desc: (l) => `Começa com ${Math.floor(40 * Math.pow(1.8, l) - 40)} de ouro` },
  { id: 'm_interest', name: 'Juros de Guerra', branch: 'fortuna', icon: 'bank', base: 15, growth: 1.6, max: 10, row: 2, req: ['m_startgold'], desc: (l) => `Ganha ${l}% do ouro guardado ao fim de cada onda` },
  { id: 'm_essence', name: 'Alquimia Demoníaca', branch: 'fortuna', icon: 'gem', base: 20, growth: 1.55, max: 25, row: 3, req: ['m_interest'], desc: (l) => `Essência x${Math.pow(1.15, l).toFixed(2)}` },
  { id: 'u_knight', name: 'Estábulos Reais', branch: 'fortuna', icon: 'cls_knight', base: 80, growth: 1, max: 1, row: 4, req: ['m_essence'], unlockClass: 'knight', desc: () => `Cavaleiros desbloqueados em toda expedição` },
  // Arcano
  { id: 'm_xp', name: 'Sabedoria', branch: 'arcano', icon: 'book', base: 4, growth: 1.45, max: 30, row: 0, desc: (l) => `Experiência +${l * 15}%` },
  { id: 'm_skill', name: 'Poder do Comandante', branch: 'arcano', icon: 'bolt', base: 8, growth: 1.5, max: 30, row: 1, req: ['m_xp'], desc: (l) => `Habilidades do comandante +${l * 25}% de poder` },
  { id: 'm_skillcd', name: 'Foco', branch: 'arcano', icon: 'speed', base: 16, growth: 1.6, max: 10, row: 2, req: ['m_skill'], desc: (l) => `Recarga das habilidades -${l * 5}%` },
  { id: 'm_bless', name: 'Bênção Extra', branch: 'arcano', icon: 'wing', base: 45, growth: 2.2, max: 2, row: 3, req: ['m_skillcd'], desc: (l) => `+${l} opção(ões) ao escolher bênçãos` },
  { id: 'u_mage', name: 'Torre dos Magos', branch: 'arcano', icon: 'cls_mage', base: 40, growth: 1, max: 1, row: 4, req: ['m_bless'], unlockClass: 'mage', desc: () => `Magos desbloqueados em toda expedição` },
  // Legado
  { id: 'm_legacy', name: 'Memória dos Caídos', branch: 'legado', icon: 'soul', base: 5, growth: 1.5, max: 15, row: 0, desc: (l) => `Legado de Batalha: +${l * 4}% da experiência dos mortos` },
  { id: 'm_vet', name: 'Veteranos', branch: 'legado', icon: 'star', base: 10, growth: 1.55, max: 10, row: 1, req: ['m_legacy'], desc: (l) => `Veteranice concede +${l}% extra por estrela` },
  { id: 'm_mastery', name: 'Tradição', branch: 'legado', icon: 'banner', base: 20, growth: 1.6, max: 10, row: 2, req: ['m_vet'], desc: (l) => `Todas as classes começam com Maestria ${l}` },
  { id: 'u_healer', name: 'Ordem dos Clérigos', branch: 'legado', icon: 'cls_healer', base: 25, growth: 1, max: 1, row: 3, req: ['m_mastery'], unlockClass: 'healer', desc: () => `Curandeiros desbloqueados em toda expedição` },
  { id: 'u_summoner', name: 'Círculo Espiritual', branch: 'legado', icon: 'cls_summoner', base: 70, growth: 1, max: 1, row: 4, req: ['u_healer'], unlockClass: 'summoner', desc: () => `Invocadores desbloqueados em toda expedição` },
];

export function metaCost(n: MetaNode, lvl: number) {
  return Math.ceil(n.base * Math.pow(n.growth, lvl));
}

// ---------------- Blessings (army level ups) ----------------
export interface TraitDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  max: number;
  cls?: ClassId;
}

export const TRAITS: TraitDef[] = [
  { id: 't_fury', name: 'Fúria Sanguinária', desc: '+20% de dano para todo o exército.', icon: 'sword', max: 5 },
  { id: 't_iron', name: 'Pele de Ferro', desc: '+20% de vida para todo o exército.', icon: 'heart', max: 5 },
  { id: 't_haste', name: 'Sede de Batalha', desc: '+10% de velocidade de ataque.', icon: 'speed', max: 4 },
  { id: 't_loot', name: 'Saqueadores', desc: '+25% de ouro.', icon: 'coin', max: 4 },
  { id: 't_wall', name: 'Muralha Sagrada', desc: 'Fortaleza: +25% de vida máxima e cura total.', icon: 'castle', max: 3 },
  { id: 't_vets', name: 'Recrutas Veteranos', desc: 'Novos recrutas chegam com +2 níveis.', icon: 'star', max: 3 },
  { id: 't_crit', name: 'Olho do Carrasco', desc: '+6% chance crítica, +30% dano crítico.', icon: 'crit', max: 3 },
  { id: 't_fire', name: 'Flechas Incendiárias', desc: 'Flechas incendeiam: dano extra ao longo do tempo.', icon: 'fire', max: 2, cls: 'archer' },
  { id: 't_storm', name: 'Tempestade Arcana', desc: 'Explosões de magos +40% de raio; corrente +2 saltos.', icon: 'bolt', max: 2, cls: 'mage' },
  { id: 't_chain', name: 'Luz em Corrente', desc: 'Curas saltam +2 alvos e curam +30%.', icon: 'cross', max: 2, cls: 'healer' },
  { id: 't_phalanx', name: 'Falange', desc: 'Linha de frente sofre -15% de dano.', icon: 'shield', max: 3 },
  { id: 't_horde', name: 'Convocação em Massa', desc: '+5 de capacidade e recrutamento 15% mais rápido.', icon: 'horn', max: 4 },
  { id: 't_spirits', name: 'Laços Espirituais', desc: 'Invocadores criam +1 espírito; espíritos duram mais.', icon: 'soul', max: 2, cls: 'summoner' },
  { id: 't_cavalry', name: 'Carga Trovejante', desc: 'Cavaleiros +40% de dano e velocidade.', icon: 'cls_knight', max: 2, cls: 'knight' },
  { id: 't_legacy', name: 'Herança Heroica', desc: 'Legado de Batalha dobra para mortos nesta expedição.', icon: 'banner', max: 1 },
  { id: 't_slayer', name: 'Caçador de Gigantes', desc: '+35% de dano contra grandes e chefes.', icon: 'skull', max: 3 },
  { id: 't_regen', name: 'Sangue Santo', desc: 'Tropas regeneram 0,5%/s de vida.', icon: 'heal', max: 2 },
  { id: 't_blast', name: 'Golpes Sísmicos', desc: 'Corpo a corpo causa 25% do dano em área.', icon: 'boom', max: 2 },
];

// ---------------- Commander skills ----------------
export interface SkillDef {
  id: string;
  name: string;
  icon: string;
  cd: number;
  desc: (lvl: number) => string;
  base: number;
  growth: number;
}

export const SKILLS: SkillDef[] = [
  { id: 'blade', name: 'Lâmina Celestial', icon: 'sk_blade', cd: 22, base: 40, growth: 1.35, desc: (l) => `Espada de luz no maior grupo de demônios: ${Math.round(40 * (1 + l * 0.6))}x o dano médio de uma tropa.` },
  { id: 'frost', name: 'Prisão de Gelo', icon: 'sk_frost', cd: 30, base: 60, growth: 1.38, desc: (l) => `Congela os demônios em uma grande área por ${(2.5 + l * 0.25).toFixed(1)}s.` },
  { id: 'bless', name: 'Bênção Sagrada', icon: 'sk_bless', cd: 40, base: 80, growth: 1.4, desc: (l) => `Cura total + escudo de ${Math.round(40 + l * 12)}% da vida por 6s. Ideal contra ataques de chefes.` },
  { id: 'portal', name: 'Portal Arcano', icon: 'sk_portal', cd: 45, base: 100, growth: 1.42, desc: (l) => `Convoca ${4 + l} guerreiros espectrais por 15s.` },
];

export function skillCost(s: SkillDef, lvl: number) {
  return Math.ceil(s.base * Math.pow(s.growth, lvl));
}

export const CLASS_MASTERY_BASE = 40;
export function masteryCost(lvl: number, clsCost: number) {
  return Math.ceil(CLASS_MASTERY_BASE * clsCost * Math.pow(1.35, lvl));
}
