// Dev-only balance bot: fast-forwards the simulation with a simple purchasing policy.
// Usage in console (npm run dev): __bot(600) or __bot(600, { region: 0, meta: { m_dmg: 5 } })
import type Phaser from 'phaser';
import { UPGRADES, upgradeCost, SKILLS, skillCost } from './data/upgrades';
import { CLASSES, type ClassId } from './data/units';
import type { BattleScene } from './scenes/BattleScene';
import { tryRecruit } from './battle/army';

// Stateful modules are passed in from main.ts so HMR can't hand us duplicate instances.
export function installDev(game: Phaser.Game, deps: { G: any; save: () => void; UI: any; invalidateMods: () => void; getMods: () => any }) {
  const { G, save, UI, invalidateMods, getMods } = deps;
  Object.assign(window as any, { __G: G, __UI: UI, __getMods: getMods });
  (window as any).__bot = (simSeconds: number, opts: { region?: number; meta?: Record<string, number>; fresh?: boolean; passive?: boolean } = {}) => {
    const sc = game.scene.getScene('Battle') as BattleScene;
    if (opts.meta) { G.meta.tree = { ...opts.meta }; invalidateMods(); }
    if (opts.fresh !== false) { UI.hideScreen(); sc.newExpedition(opts.region ?? 0); }
    const run = G.run!;
    run.autoBless = true;
    if (opts.passive) run.autoSkills = false;
    const log: string[] = [];
    let t = 0, nextBuy = 0, nextLog = 30;
    const step = (sc as any).step.bind(sc);
    while (t < simSeconds && sc.mode === 'run') {
      step(1 / 30); t += 1 / 30;
      if (sc.waves.state === 'cleared' && sc.waves.clearT <= 0) sc.waves.start(run.wave);
      if (t >= nextBuy && !opts.passive) {
        nextBuy = t + 3;
        // an attentive player keeps pressing Convocar while there is room and gold
        let k = 0; while (k++ < 20 && tryRecruit(sc.world, false)) { /* recruit */ }
        for (const c of ['swordsman', 'guardian', 'healer', 'lancer', 'mage', 'summoner', 'knight'] as ClassId[]) {
          const cost = Math.ceil(CLASSES[c].unlockGold * UI.unlockScale());
          if (!run.unlocked.includes(c) && run.gold > cost * 1.5) { run.gold -= cost; run.unlocked.push(c); }
        }
        for (let i = 0; i < 4; i++) { const c = skillCost(SKILLS[i], run.skillLv[i]); if (run.skillLv[i] < 4 && run.gold > c * 2) { run.gold -= c; run.skillLv[i]++; } }
        let guard = 0;
        while (guard++ < 80) {
          const opts2 = UPGRADES.filter((u) => ['dmg', 'hp', 'cap', 'recruit', 'atkspd', 'armor', 'fort', 'gold', 'crit', 'regen'].includes(u.id) && (u.max == null || (run.upgrades[u.id] || 0) < u.max));
          opts2.sort((a, b) => upgradeCost(a, run.upgrades[a.id] || 0) - upgradeCost(b, run.upgrades[b.id] || 0));
          const u = opts2[0]; const c = upgradeCost(u, run.upgrades[u.id] || 0);
          if (run.gold < c * 1.3) break;
          run.gold -= c; run.upgrades[u.id] = (run.upgrades[u.id] || 0) + 1; invalidateMods(); UI.refreshArmyStats();
        }
      }
      if (t >= nextLog) {
        nextLog += 30;
        const b = sc.world.bossRef;
        log.push(`t=${Math.floor(t)} w=${run.wave} army=${sc.world.armyCount()}/${getMods().cap} fort=${Math.round(run.fortHp)}/${Math.round(getMods().fortMax)} gold=${Math.round(run.gold)} en=${sc.world.enemies.length} lv=${sc.world.avgArmyLevel().toFixed(1)} dps=${Math.round(sc.world.live.dps)}${b ? ` boss=${Math.round((b.hp / b.maxHp) * 100)}%` : ''}`);
      }
    }
    log.push(`END t=${Math.floor(t)} mode=${sc.mode} wave=${run.wave} kills=${run.stats.kills} lost=${run.stats.lost}`);
    save();
    return log;
  };
}
