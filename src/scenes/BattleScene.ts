import Phaser from 'phaser';
import { World } from '../battle/world';
import { BossCtl } from '../battle/boss';
import { WaveDirector } from '../battle/waves';
import { Skills } from '../battle/skills';
import { HeroCtl } from '../battle/heroes';
import { spawnRecruit, tryRecruit, computeFormation, applyStats, giveXp, serializeArmy } from '../battle/army';
import { ensureRegionArt } from '../art/assets';
import { G, newRun, save, type RunState } from '../core/state';
import { getMods, invalidateMods, essenceForRun } from '../core/mods';
import { REGIONS, WAVES_PER_REGION, isInfinite, regionForWave, visualRegionForWave } from '../data/regions';
import { CLASSES, type ClassId } from '../data/units';
import { rand } from '../core/util';
import { audio } from '../audio/audio';
import { UI } from '../ui/ui';

export const WORLD_H = 720;
const CAM_CY = 360;

export class BattleScene extends Phaser.Scene {
  world!: World;
  boss!: BossCtl;
  waves!: WaveDirector;
  skills!: Skills;
  heroes!: HeroCtl;
  bg!: Phaser.GameObjects.Image;
  bgNext: Phaser.GameObjects.Image | null = null;
  fort!: Phaser.GameObjects.Image;
  portals: Phaser.GameObjects.Sprite[] = [];
  portalGlows: Phaser.GameObjects.Image[] = [];
  fortFires: { x: number; y: number; t: number }[] = [];
  fortState = -1;
  recruitT = 0;
  draftT = 0;
  hudT = 0;
  saveT = 0;
  ambientT = 0;
  mode: 'demo' | 'run' | 'over' = 'demo';
  regionShown = -1;
  wipedNotified = false;
  overT = 0;
  lastAllyCount = 0;
  viewOffset = 150;
  layoutW = 0;
  layoutH = 0;
  camCenterX = 640;

  constructor() { super('Battle'); }

  create() {
    this.cameras.main.setBackgroundColor('#140a18');
    this.world = new World(this, {
      toast: (m) => UI.toast(m),
      banner: (t, s, c, d) => UI.banner(t, s, c, d),
      fortHit: (_a, src) => UI.fortHit(src),
      defeat: () => this.onDefeat(),
      armyLevelUp: () => this.onArmyLevel(),
    });
    this.boss = new BossCtl(this.world);
    this.waves = new WaveDirector(this.world, this.boss);
    this.skills = new Skills(this.world, this.boss);
    this.heroes = new HeroCtl(this.world);
    this.world.onHeroDeathCb = (e) => this.heroes.onDeath(e);
    this.boss.onPhase = (name, p) => UI.banner(`${name} enfurece!`, `Fase ${p + 1} — novos ataques devastadores`, '#ff5a4a');
    this.boss.onTelegraph = (ab) => { if (ab.wipe) UI.banner(`⚠ ${ab.name} ⚠`, 'Ataque devastador a caminho!', '#ff3a3a', 1.6); };
    this.waves.onCleared = () => this.onWaveCleared();
    this.waves.onStart = (w) => this.onWaveStart(w);
    this.world.onKillCb = (e) => { if (e.kind === 'boss') this.onBossKilled(e.cls); };

    this.bg = this.add.image(0, 0, '__WHITE').setOrigin(0).setDepth(0);
    this.fort = this.add.image(-20, 0, 'fort_0').setOrigin(0).setDepth(6);
    for (let i = 0; i < 3; i++) {
      const g = this.add.image(0, 0, 'glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(7).setAlpha(0.55);
      const p = this.add.sprite(0, 0, 'portal_0', 0).setDepth(8).setScale(2.2);
      this.portalGlows.push(g); this.portals.push(p);
    }
    this.layout();
    this.scale.on('resize', () => this.layout());

    // two-finger tap opens pause; keyboard shortcuts
    this.input.addPointer(2);
    this.input.on('pointerdown', () => {
      const ps = this.input.manager.pointers.filter((p) => p.isDown);
      if (ps.length >= 2 && this.mode === 'run') UI.openPause();
    });
    this.input.keyboard?.on('keydown-ESC', () => { if (this.mode === 'run') UI.togglePause(); });
    this.input.keyboard?.on('keydown-P', () => { if (this.mode === 'run') UI.togglePause(); });
    for (let i = 1; i <= 4; i++) this.input.keyboard?.on(`keydown-${i}`, () => this.castSkill(i - 1));
    this.input.keyboard?.on('keydown-SPACE', () => this.manualRecruit());

    UI.bindScene(this);
    if (G.run && G.run.active) { this.resumeRun(); UI.showTitle(); }
    else this.startDemo();
  }

  // --------------------------------------------------------------- layout
  /** World-space height the camera shows; grows (zooms out) as the battle gets more crowded. */
  viewH = 720;
  viewTarget = 720;
  layoutViewH = 720;

  layout() {
    const w = this.scale.width, h = this.scale.height;
    if (!(w > 10 && h > 10)) return; // hidden tab / mid-resize: keep last valid layout
    const viewH = this.viewH;
    const zoom = h / viewH;
    const uiScale = Math.min(w / 1280, h / 720); // same formula the DOM HUD uses
    const toWorld = uiScale / zoom;
    const visW = w / zoom;
    // the left HUD dock covers ~145 design px: shift the camera so the wall stays visible beside it
    this.viewOffset = 145 * toWorld;
    const W = Math.max(640, visW - this.viewOffset);
    const cam = this.cameras.main;
    cam.setViewport(0, 0, w, h);
    cam.setZoom(zoom);
    this.layoutW = w; this.layoutH = h; this.layoutViewH = viewH;
    this.camCenterX = visW / 2 - this.viewOffset;
    cam.centerOn(this.camCenterX, CAM_CY);
    const f = this.world;
    const viewTop = CAM_CY - viewH / 2, viewBot = CAM_CY + viewH / 2;
    f.fieldTop = viewTop + 100 * toWorld + 38;
    f.fieldBot = viewBot - 90 * toWorld - 6;
    f.gateY = (f.fieldTop + f.fieldBot) / 2;
    this.world.setSize(W);
    const FH = f.fieldBot - f.fieldTop;
    const ys = [f.fieldTop + FH * 0.4, f.fieldTop + FH * 0.66, f.fieldBot - 22];
    this.waves.portals = ys.map((y) => ({ x: W - 50, y }));
    this.portals.forEach((p, i) => p.setPosition(W - 46, ys[i] - 30));
    this.portalGlows.forEach((g, i) => g.setPosition(W - 46, ys[i] - 30).setScale(2.4));
    this.bg.setPosition(-this.viewOffset - 60, CAM_CY - 450).setDisplaySize(Math.max(2000, W + this.viewOffset + 60), 900);
    this.fort.setPosition(-20, f.gateY - 450);
  }

  /** Smoothly zoom the camera out when lots of units are on the field. */
  private updateZoom(dt: number) {
    const n = this.world.allies.length + this.world.enemies.length;
    this.viewTarget = 720 + Math.max(0, Math.min(170, (n - 70) * 0.85));
    this.viewH += (this.viewTarget - this.viewH) * Math.min(1, dt * 0.6);
    if (Math.abs(this.viewH - this.layoutViewH) > 3) this.layout();
  }

  setRegionVisual(r: number, instant = false) {
    ensureRegionArt(this, r);
    this.world.region = r;
    const R = REGIONS[r];
    audio.setRoot(R.music);
    const tint = parseInt(R.accent.slice(1), 16);
    this.portals.forEach((p) => p.setTexture(`portal_${r}`, 0));
    this.portalGlows.forEach((g) => g.setTint(tint));
    if (this.regionShown === r) return;
    this.regionShown = r;
    if (instant || !this.bg.texture || this.bg.texture.key === '__WHITE') {
      this.bg.setTexture(`terrain_${r}`);
      this.layout();
      return;
    }
    const nb = this.add.image(-this.viewOffset - 60, 0, `terrain_${r}`).setOrigin(0).setDepth(0.5).setAlpha(0);
    nb.setPosition(-this.viewOffset - 60, CAM_CY - 450).setDisplaySize(Math.max(2000, this.world.W + this.viewOffset + 60), 900);
    this.tweens.add({ targets: nb, alpha: 1, duration: 1200, onComplete: () => { this.bg.setTexture(`terrain_${r}`); nb.destroy(); this.layout(); } });
  }

  // --------------------------------------------------------------- run lifecycle
  startDemo() {
    this.mode = 'demo';
    this.world.clearAll(); this.boss.clear(); this.heroes.clear();
    const run = newRun(0) as RunState & { demo?: boolean };
    run.demo = true;
    run.unlocked = ['militia', 'archer', 'swordsman', 'guardian', 'healer', 'mage', 'knight', 'lancer', 'summoner'];
    run.upgrades = { dmg: 6, hp: 8, cap: 10 };
    run.gold = 0; run.autoRecruit = false; run.autoSkills = false;
    run.wave = 3;
    run.heroes = { arthon: 3, elandra: 3, seraphiel: 2 };
    G.run = run;
    invalidateMods();
    this.setRegionVisual(0, true);
    const f = this.world;
    const comp: [ClassId, number][] = [['militia', 9], ['swordsman', 6], ['guardian', 4], ['lancer', 4], ['archer', 9], ['mage', 4], ['healer', 3], ['knight', 3], ['summoner', 2]];
    for (const [c, n] of comp) for (let i = 0; i < n; i++) {
      const e = f.spawnAlly(c, 1 + Math.floor(Math.random() * 14), 0, f.fortX + 100 + Math.random() * 200, f.fieldTop + Math.random() * (f.fieldBot - f.fieldTop));
      if (e) applyStats(f, e, false);
    }
    f.wave = 3;
    this.heroes.sync();
    this.waves.start(3);
    UI.hideHud();
  }

  newExpedition(startRegion: number) {
    this.world.clearAll(); this.boss.clear(); this.heroes.clear();
    G.run = newRun(startRegion);
    G.meta.runs++;
    invalidateMods();
    const run = G.run;
    run.fortHp = getMods().fortMax;
    this.mode = 'run';
    this.wipedNotified = false;
    this.skills.cd = [0, 0, 0, 0];
    this.setRegionVisual(visualRegionForWave(run.wave), true);
    if (run.army.length) {
      // checkpoint: bring back the army that entered this region
      for (const u of run.army) spawnRecruit(this.world, u.cls, { level: u.level, vet: u.vet, xp: 0, stack: u.stack, x: this.world.fortX + 40 + Math.random() * 160 });
      UI.toast('Exército do checkpoint restaurado');
    } else {
      const startUnits = 2 + Math.floor(G.meta.tree['m_start'] || 0);
      for (let i = 0; i < startUnits; i++) spawnRecruit(this.world, i % 3 === 2 ? 'archer' : 'militia', { y: this.world.gateY + rand(-60, 60) });
      if (startRegion > 0) for (let i = 0; i < 4; i++) spawnRecruit(this.world, i % 2 ? 'archer' : 'militia', { level: 6 + startRegion * 3 });
    }
    this.fortState = -1;
    this.world.fortLog.clear();
    this.heroes.sync();
    this.waves.start(run.wave);
    UI.showHud();
    save();
  }

  resumeRun() {
    const run = G.run!;
    this.mode = 'run';
    this.world.clearAll(); this.boss.clear(); this.heroes.clear();
    invalidateMods();
    if (run.fortHp < 0) run.fortHp = getMods().fortMax;
    this.setRegionVisual(visualRegionForWave(run.wave), true);
    for (const u of run.army) spawnRecruit(this.world, u.cls, { level: u.level, vet: u.vet, xp: 0, stack: u.stack, x: this.world.fortX + 60 + Math.random() * 120 });
    if (!run.army.length) spawnRecruit(this.world, 'militia');
    this.heroes.sync();
    this.waves.start(run.wave);
    UI.showHud();
  }

  onWaveStart(w: number) {
    const run = G.run!;
    run.wave = w;
    if (this.mode !== 'run') return;
    const inf = isInfinite(w);
    const vr = visualRegionForWave(w);
    if (vr !== this.regionShown) this.setRegionVisual(vr);
    const lw = this.waves.localWave(w);
    const R = REGIONS[vr];
    if (lw === 1 && w > 1 && !inf) this.saveCheckpoint(regionForWave(w));
    // warm up the next region's procedural art during a calm moment to avoid a hitch later
    if (lw === 7) setTimeout(() => ensureRegionArt(this, visualRegionForWave(w + 10)), 500);
    if (lw === WAVES_PER_REGION) UI.banner(inf ? 'Guerra Infinita — Chefe!' : `Chefe: ${R.name}`, 'Prepare-se. Ele pode destruir o exército inteiro.', '#ff4a5a', 2.6);
    else if (lw === 1) UI.banner(inf ? `Guerra Infinita — Onda ${w}` : R.name, inf ? modName() : R.subtitle, '#ffd24a', 2.4);
    else if (lw === 5) UI.banner(`Onda ${w}`, 'Um miniboss se aproxima...', '#ff9a4a');
    else UI.banner(`Onda ${w}`, inf && run.modifier ? modName() : undefined, '#ffffff', 1.2);
    audio.play('wave');
    if (G.meta.bestWave < w) G.meta.bestWave = w;
  }

  /** Remember the army/upgrades when entering a region so later expeditions can start there at full strength. */
  saveCheckpoint(region: number) {
    const run = G.run!;
    const prev = G.meta.checkpoints[String(region)];
    const total = (u: Record<string, number>) => Object.values(u).reduce((a, b) => a + b, 0);
    if (prev && total(prev.upgrades) > total(run.upgrades) + 3) return; // keep a clearly stronger snapshot
    G.meta.checkpoints[String(region)] = {
      wave: run.wave, upgrades: { ...run.upgrades }, mastery: { ...run.mastery }, unlocked: [...run.unlocked], heroes: { ...run.heroes },
      skillLv: [...run.skillLv], traits: { ...run.traits }, army: serializeArmy(this.world), armyLevel: run.armyLevel, gold: Math.floor(run.gold), savedAt: Date.now(),
    };
    UI.toast(`Checkpoint salvo: ${REGIONS[region].name}`);
    save();
  }

  onWaveCleared() {
    if (this.mode !== 'run') return;
    const run = G.run!;
    const m = getMods();
    // fortress repair, gold interest, veteranice for survivors
    run.fortHp = Math.min(m.fortMax, run.fortHp + m.fortMax * m.fortBetween);
    if (m.interest > 0) { const g = Math.min(run.gold * m.interest, 50 * Math.pow(1.17, run.wave)); run.gold += g; }
    let vets = 0;
    const surviveXp = 4 * (1 + run.wave * 0.1);
    for (const a of this.world.allies) {
      if (!a.alive || a.kind !== 'ally') continue;
      giveXp(this.world, a, surviveXp);
      if (a.vet < 10) { a.vet++; applyStats(this.world, a); vets++; }
    }
    if (vets && this.waves.localWave() % 3 === 0) UI.toast(`${vets} tropas ganharam veteranice ★`);
    run.wave++;
    this.world.saveArmyToRun();
    this.time.delayedCall(400, () => { if (run.pendingBless > 0 && !run.autoBless) UI.openBlessing(); });
  }

  onBossKilled(id: string) {
    const run = G.run!;
    if (this.mode !== 'run') return;
    run.stats.bossKills++;
    const inf = isInfinite(run.wave);
    const r = regionForWave(run.wave);
    const bonus = Math.floor(essenceForRun(run.wave, 0, 0) * 0.5) + 5;
    run.essenceEarned += bonus;
    if (!inf) {
      run.stats.regionsCleared++;
      const next = r + 1;
      if (next > G.meta.maxRegion) G.meta.maxRegion = Math.min(REGIONS.length, next);
      const name = next < REGIONS.length ? REGIONS[next].name : 'Guerra Infinita';
      UI.banner(`${REGIONS[r].name} libertada!`, `+${bonus} Essência • Desbloqueado: ${name}`, '#7affb0', 3.2);
    } else UI.banner('Chefe derrotado!', `+${bonus} Essência Demoníaca`, '#7affb0', 2.6);
    audio.play('victory');
    save();
  }

  onArmyLevel() {
    const run = G.run!;
    audio.play('level');
    if (run.autoBless || this.mode !== 'run') { UI.autoPickBlessing(); }
    else UI.flagBlessing();
  }

  onDefeat() {
    if (this.mode !== 'run') return;
    this.mode = 'over';
    this.overT = 0;
    this.world.fx.shake(14, 1.2);
    this.world.fx.flash(0xff2a2a, 0.6, 1.2);
    audio.play('defeat');
    const log = [...this.world.fortLog.entries()].sort((a, b) => b[1] - a[1]);
    const total = log.reduce((s, [, v]) => s + v, 0) || 1;
    const who = log.slice(0, 2).map(([k, v]) => `${k} (${Math.round((v / total) * 100)}%)`).join(', ');
    UI.banner('A fortaleza caiu!', who ? `Derrubada por: ${who}` : 'A expedição terminou.', '#ff3a3a', 3.2);
    this.time.delayedCall(2600, () => UI.showResult('defeat'));
  }

  endExpedition(reason: 'defeat' | 'retreat'): number {
    const run = G.run!;
    const essence = essenceForRun(run.wave, run.stats.kills, run.stats.bossKills) + run.essenceEarned;
    const final = Math.floor(reason === 'retreat' ? essence * 0.9 : essence);
    G.meta.essence += final;
    G.meta.essenceTotal += final;
    run.active = false;
    G.run = null;
    save();
    return final;
  }

  // --------------------------------------------------------------- actions
  manualRecruit() {
    if (this.mode !== 'run') return false;
    // with a big army one tap calls a whole squad (each recruit still costs gold)
    const batch = Math.max(1, Math.min(12, Math.floor(getMods().cap / 15)));
    let n = 0;
    if (tryRecruit(this.world, true)) n++;
    while (n > 0 && n < batch && tryRecruit(this.world, false)) n++;
    if (n) { audio.play('buy'); if (n > 1) UI.toast(`+${n} tropas convocadas`); }
    return n > 0;
  }

  castSkill(i: number) {
    if (this.mode !== 'run') return false;
    if (!this.skills.ready(i)) return false;
    return this.skills.cast(i);
  }

  // --------------------------------------------------------------- loop
  update(_t: number, deltaMs: number) {
    const paused = UI.isBlocking();
    // portals & ambient animate even when paused for the title backdrop
    const realDt = Math.min(0.05, deltaMs / 1000);
    if (this.scale.width !== this.layoutW || this.scale.height !== this.layoutH) this.layout();
    this.animatePortals(realDt);
    if (paused && this.mode !== 'demo') return;
    const speed = this.mode === 'run' ? G.settings.speed : 1;
    let dt = realDt * speed;
    const steps = Math.ceil(dt / (1 / 30));
    const sdt = dt / steps;
    for (let i = 0; i < steps; i++) this.step(sdt);
    // camera shake
    const [sx, sy] = this.world.fx.cameraShakeOffset(realDt);
    const cam = this.cameras.main;
    cam.centerOn(this.camCenterX + sx, CAM_CY + sy);
    this.updateZoom(realDt);
    this.ambient(realDt);
    this.updateFortVisual(realDt);
    this.hudT -= realDt;
    if (this.hudT <= 0 && this.mode !== 'demo') { this.hudT = 0.1; UI.updateHud(); }
    if (this.mode === 'run') {
      this.saveT -= realDt;
      if (this.saveT <= 0) { this.saveT = 15; this.world.saveArmyToRun(); }
      audio.setIntensity(Math.min(1, this.world.enemyCount() / 60 + (this.world.bossRef ? 0.5 : 0)));
    }
  }

  private step(dt: number) {
    const run = G.run!;
    this.waves.update(dt);
    if (this.waves.state === 'cleared' && this.waves.clearT <= 0) {
      if (!UI.isBlocking()) this.waves.start(run.wave);
    }
    this.boss.update(dt);
    this.heroes.update(dt);
    if (this.mode === 'run') {
      run.stats.time += dt;
      this.skills.update(dt);
      this.recruitTick(dt);
      // fortress regen
      const m = getMods();
      if (m.fortRegen > 0 && run.fortHp > 0) run.fortHp = Math.min(m.fortMax, run.fortHp + m.fortMax * m.fortRegen * dt);
    } else if (this.mode === 'demo') {
      // demo keeps the battle alive
      if (this.world.allyEntCount() < 30) {
        const cls = (['militia', 'archer', 'swordsman', 'guardian', 'mage', 'knight', 'healer'] as ClassId[])[Math.floor(Math.random() * 7)];
        spawnRecruit(this.world, cls, { level: 1 + Math.floor(Math.random() * 16) });
      }
      if (run.fortHp < 50) run.fortHp = 9999;
    }
    if (this.mode !== 'over') this.world.update(dt);
    else this.world.fx.update(dt);
  }

  private recruitTick(dt: number) {
    const run = G.run!;
    const m = getMods();
    const w = this.world;
    const count = w.armyCount();
    if (count !== this.lastAllyCount) {
      if (count === 0 && this.lastAllyCount > 3 && !this.wipedNotified) {
        this.wipedNotified = true;
        UI.banner('O exército foi aniquilado!', 'Reforços estão sendo convocados...', '#ff7a5a', 2.2);
        const rapid = (G.meta.tree['m_rapid'] || 0) * 3;
        for (let i = 0; i < rapid; i++) spawnRecruit(w, i % 2 ? 'archer' : 'militia');
      }
      if (count > 3) this.wipedNotified = false;
      this.lastAllyCount = count;
    }
    if (run.autoRecruit) {
      this.recruitT += dt;
      // rebuild faster when the army is small
      const interval = m.recruitInterval * (count < 3 ? 0.5 : 1);
      if (this.recruitT >= interval) {
        this.recruitT = 0;
        tryRecruit(w, false);
      }
    }
    // free militia draft so the player is never stuck with no army
    this.draftT += dt;
    if (count < 2 && this.draftT > m.recruitInterval * 1.5) {
      this.draftT = 0;
      spawnRecruit(w, 'militia');
    }
  }

  private animatePortals(dt: number) {
    const t = this.time.now / 1000;
    this.portals.forEach((p, i) => {
      p.setFrame(Math.floor(t * 8 + i) % 4);
      p.setScale(2.2 + Math.sin(t * 2 + i) * 0.05);
    });
    this.portalGlows.forEach((g, i) => g.setAlpha(0.4 + Math.sin(t * 3 + i * 2) * 0.15));
  }

  private ambient(dt: number) {
    const w = this.world;
    const R = REGIONS[w.region];
    this.ambientT -= dt;
    if (this.ambientT > 0 || G.settings.quality === 'low') return;
    this.ambientT = G.settings.quality === 'high' ? 0.08 : 0.2;
    const x = rand(0, w.W), y = rand(w.fieldTop - 60, w.fieldBot + 60);
    switch (R.ambient) {
      case 'fireflies': if (x < w.W * 0.6) w.fx.particle({ tex: 'px', x, y, z: rand(10, 40), vx: rand(-10, 10), vy: rand(-8, 8), vz: rand(-5, 5), life: 2.5, s0: 0.6, s1: 0.2, color: 0xeaff8a, add: true, depth: 4900 });
        else w.fx.particle({ tex: 'px', x, y, z: 0, vz: rand(20, 40), g: -5, life: 2, s0: 0.8, s1: 0, color: 0xff5a3a, add: true }); break;
      case 'embers': w.fx.particle({ tex: 'px', x, y, z: 0, vx: rand(-10, 10), vz: rand(25, 50), g: -8, life: 2.4, s0: 0.8, s1: 0, color: Math.random() < 0.5 ? 0xff8a2a : 0xffd23a, add: true }); break;
      case 'wisps': w.fx.particle({ tex: 'glow', x, y, z: rand(10, 30), vx: rand(-12, 12), vy: rand(-5, 5), life: 3, s0: 0.12, s1: 0.2, color: 0x5affb0, add: true, a0: 0.6 }); break;
      case 'ash': w.fx.particle({ tex: 'px', x, y: y - 200, z: 0, vx: rand(10, 30), vy: rand(20, 40), life: 4, s0: 0.7, s1: 0.4, color: 0xaaa0a0, a0: 0.7 }); if (Math.random() < 0.3) w.fx.particle({ tex: 'px', x, y, z: 0, vz: 30, g: -10, life: 2, s0: 0.8, s1: 0, color: 0xff6a1a, add: true }); break;
      case 'sparks': w.fx.particle({ tex: 'px', x, y, z: rand(0, 20), vz: rand(10, 30), g: -5, life: 2.2, s0: 0.7, s1: 0, color: 0xc08aff, add: true }); break;
    }
  }

  private updateFortVisual(dt: number) {
    const run = G.run;
    if (!run) return;
    const m = getMods();
    const pct = run.fortHp / m.fortMax;
    const st = this.mode === 'demo' ? 0 : pct > 0.75 ? 0 : pct > 0.5 ? 1 : pct > 0.25 ? 2 : 3;
    if (st !== this.fortState) {
      this.fortState = st;
      this.fort.setTexture(`fort_${st}`);
      this.fortFires = [];
      const n = st === 0 ? 0 : st === 1 ? 1 : st === 2 ? 3 : 6;
      for (let i = 0; i < n; i++) this.fortFires.push({ x: rand(50, 92), y: rand(this.world.fieldTop - 40, this.world.fieldBot + 20), t: 0 });
    }
    for (const f of this.fortFires) {
      f.t -= dt;
      if (f.t <= 0) {
        f.t = 0.07;
        this.world.fx.particle({ tex: 'px', x: f.x + rand(-6, 6), y: f.y, z: 0, vz: rand(30, 60), vx: rand(-5, 5), g: -20, life: 0.8, s0: 2, s1: 0.2, color: Math.random() < 0.5 ? 0xff7a2a : 0xffd23a, add: true, depth: 7 + f.y });
        if (Math.random() < 0.3) this.world.fx.particle({ tex: 'glow', x: f.x, y: f.y - 30, vz: 20, life: 1.6, s0: 0.3, s1: 0.8, color: 0x2a2228, a0: 0.4 });
      }
    }
  }
}

function modName() {
  const id = G.run?.modifier;
  const map: Record<string, string> = { fury: 'Modificador: Fúria (+40% dano)', armored: 'Modificador: Blindados (+60% vida)', swarm: 'Modificador: Enxame', swift: 'Modificador: Velozes', skies: 'Modificador: Céus Negros', siege: 'Modificador: Cerco (ouro +50%)', elite: 'Modificador: Legião de Elite' };
  return id ? map[id] : '';
}

export { CLASSES };
