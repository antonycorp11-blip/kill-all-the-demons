// DOM UI layer: HUD (reference-style), banners, toasts, modals and out-of-battle screens.
import { G, save, wipeSave, armyXpNeeded, treeLv } from '../core/state';
import { getMods, invalidateMods, essenceForRun, ascensionShardsAvailable, shardMult } from '../core/mods';
import { fmt, fmtInt, fmtTime } from '../core/format';
import { iconImg, iconURL } from '../art/fx';
import { spriteIcon } from '../art/assets';
import { UPGRADES, upgradeCost, UPG_TREE, UPG_BRANCHES, upgNodePos, META_NODES, META_BRANCHES, META_ROOT, metaCost, metaNodePos, TRAITS, SKILLS, skillCost, masteryCost, type MetaNode } from '../data/upgrades';
import { CLASSES, CLASS_ORDER, ROLE_NAMES, TIER_LEVELS, type ClassId, type Role } from '../data/units';
import { ENEMIES, ENEMY_ORDER } from '../data/enemies';
import { BOSSES, BOSS_ORDER } from '../data/bosses';
import { REGIONS, WAVES_PER_REGION, isInfinite, visualRegionForWave } from '../data/regions';
import { recruitCost, pickRecruitClass, mergeTrio, mergeCandidates, applyStats } from '../battle/army';
import { audio } from '../audio/audio';
import { HEROES, HERO_ORDER, MAX_STARS } from '../data/heroes';
import { shuffle } from '../core/util';
import type { BattleScene } from '../scenes/BattleScene';

type Screen = 'title' | 'camp' | null;
type CampTab = 'expedition' | 'tree' | 'codex' | 'ascend' | 'settings';

const $ = (sel: string, root: ParentNode = document) => root.querySelector(sel) as HTMLElement;

class UIManager {
  scene: BattleScene | null = null;
  root!: HTMLElement;
  stage!: HTMLElement;
  hud!: HTMLElement;
  modalEl!: HTMLElement;
  screenEl!: HTMLElement;
  bannerEl!: HTMLElement;
  toastEl!: HTMLElement;
  screen: Screen = 'title';
  campTab: CampTab = 'expedition';
  modal: string | null = null;
  modalArg: any = null;
  codexTab: 'units' | 'enemies' | 'bosses' = 'units';
  blessChoices: string[] = [];
  bannerT = 0;
  buyMax = false;
  hudVisible = false;
  lastLife = -1;
  resultData: { reason: string; essence: number; wave: number; kills: number; bosses: number; time: number; gold: number; lost: number; recruited: number } | null = null;
  tutorialStep = 0;
  els: Record<string, HTMLElement> = {};

  init() {
    this.root = document.getElementById('ui')!;
    this.root.innerHTML = `<div class="stage">
      <div id="wallalert"></div>
      <div id="hud" class="hidden"></div>
      <div id="banner"></div>
      <div id="toasts"></div>
      <div id="screen"></div>
      <div id="modal"></div>
    </div>`;
    this.stage = $('.stage', this.root);
    this.hud = $('#hud', this.root);
    this.bannerEl = $('#banner', this.root);
    this.toastEl = $('#toasts', this.root);
    this.screenEl = $('#screen', this.root);
    this.modalEl = $('#modal', this.root);
    this.buildHud();
    this.fit();
    window.addEventListener('resize', () => this.fit());
    this.root.addEventListener('click', (ev) => this.onClick(ev));
    this.root.addEventListener('input', (ev) => this.onInput(ev));
    this.root.addEventListener('pointerdown', () => audio.init(), { once: false });
    this.showTitle();
    setInterval(() => this.tickBanner(), 100);
  }

  bindScene(s: BattleScene) { this.scene = s; }

  fit() {
    if (!this.stage) return;
    const w = window.innerWidth, h = window.innerHeight;
    if (!(w > 10 && h > 10)) return;
    const s = Math.min(w / 1280, h / 720);
    this.stage.style.width = `${w / s}px`;
    this.stage.style.height = `${h / s}px`;
    this.stage.style.transform = `scale(${s})`;
  }

  isBlocking() { return this.screen !== null || this.modal !== null; }

  // ================================================================ HUD
  private buildHud() {
    this.hud.innerHTML = `
    <div class="tb-left plate">
      <div class="logo mini" data-act="pause"><span class="l1">Kill All the</span><span class="l2">Demons</span></div>
      <div class="res gold" data-act="open:upgrades">${iconImg('coin')}<b id="h-gold">0</b><i class="plus">+</i></div>
      <div class="res gem" data-act="open:traits">${iconImg('gem')}<b id="h-ess">0</b></div>
    </div>
    <div class="lifebox">
      <div class="life-emblem">${iconImg('heart', 'ico heart')}</div>
      <div class="life-main">
        <div class="life-label">Vida do Comandante</div>
        <div class="bar life-bar"><i id="h-life-fill"></i><span id="h-life">0</span></div>
      </div>
    </div>
    <div class="tb-right plate">
      <div class="res units" data-act="open:formation">${iconImg('people')}<b id="h-units">0</b></div>
      <div class="res wave" data-act="open:traits">${iconImg('wave')}<b id="h-wave">1</b><span id="h-inf" class="inf">∞</span></div>
      <div class="res speed" data-act="speed" id="h-speed">1x</div>
      <div class="gearbtn" data-act="pause">${iconImg('gear')}</div>
    </div>
    <div class="ribbon" id="h-region"><span id="h-region-name"></span><div class="wprog"><i id="h-wprog"></i></div></div>
    <div class="bossbar hidden" id="h-boss">
      <div class="bossface"><img id="h-boss-ico"></div>
      <div class="bossmain"><div class="bname"><span id="h-boss-name"></span><em id="h-boss-phase">Fase 1</em></div><div class="bar boss"><i id="h-boss-fill"></i><span id="h-boss-hp"></span></div></div>
    </div>
    <div class="leftdock">
      <div class="evo plate" data-act="open:blessing">
        <div class="evo-top">${iconImg('evo')}<span>Evolução</span><b>Nv <span id="h-alv">1</span></b></div>
        <div class="bar small"><i id="h-axp-fill"></i><span id="h-axp"></span></div>
        <div class="badge hidden" id="h-evo-badge">!</div>
      </div>
      <div class="heroes" id="h-heroes"></div>
      <div class="dockbtns">
        <div class="dbtn" data-act="toggle:autoBless" title="Escolher cartas automaticamente">${iconImg('infinity')}<span>Auto</span><em id="h-auto">OFF</em></div>
        <div class="dbtn" data-act="open:traits">${iconImg('traits')}<span>Legado</span></div>
        <div class="dbtn" data-act="open:codex">${iconImg('book')}<span>Códex</span></div>
      </div>
    </div>
    <div class="statspanel plate" id="h-stats" data-act="statsToggle">
      <div class="sp-title">${iconImg('evo')}<span>Batalha ao vivo</span><i id="h-stats-arrow">▾</i></div>
      <div class="sp-body">
        <div class="sp-row">${iconImg('sword')}<span>DPS</span><b id="h-dps">0</b></div>
        <div class="sp-row">${iconImg('shield')}<span>Tanque</span><b id="h-tank">0</b></div>
        <div class="sp-row">${iconImg('heart')}<span>Cura</span><b id="h-heal">0</b></div>
        <div class="sp-row">${iconImg('star')}<span>Em campo</span><b id="h-ucount">0</b></div>
        <div class="sp-row">${iconImg('skull')}<span>Abates</span><b id="h-kills">0</b></div>
      </div>
    </div>
    <div class="bottombar">
      <div class="summon" data-act="recruit">
        <div class="cardart"><img class="ico big" id="h-rart"></div>
        <div class="st"><div class="t1">Convocar</div><div class="cost">${iconImg('coin', 'ico tiny')}<b id="h-rcost">0</b></div></div>
        <div class="rbar"><i id="h-rtimer"></i></div>
      </div>
      <div class="bbtn" data-act="open:classes">${iconImg('evo', 'ico mid')}<span>Classes</span><div class="badge hidden" id="b-classes">!</div></div>
      <div class="bbtn" data-act="open:upgrades">${iconImg('speed', 'ico mid')}<span>Melhorias</span><div class="badge hidden" id="b-upg">!</div></div>
      <div class="bbtn" data-act="open:formation">${iconImg('people', 'ico mid')}<span>Formação</span></div>
      <div class="bbtn" data-act="open:skills">${iconImg('fire', 'ico mid')}<span>Comandante</span><div class="badge hidden" id="b-skills">!</div></div>
      <div class="skillrow">
        ${SKILLS.map((s, i) => `<div class="skill" data-act="cast:${i}" id="sk-${i}">${iconImg(s.icon, 'ico sk')}<div class="cd" id="skcd-${i}"></div><div class="lock" id="sklock-${i}">🔒</div><span class="key">${i + 1}</span></div>`).join('')}
      </div>
    </div>`;
    this.hud.querySelectorAll('[id]').forEach((el) => { this.els[el.id] = el as HTMLElement; });
  }

  statsCollapsed = false;
  heroKey = '';

  private renderHeroes() {
    const run = G.run!;
    const ctl = this.scene!.heroes;
    const key = ctl.list.map((r) => r.id + (run.heroes[r.id] || 0)).join(',') + '/' + getMods().heroSlots;
    const box = this.els['h-heroes'];
    if (key !== this.heroKey) {
      this.heroKey = key;
      const slots = getMods().heroSlots;
      let html = ctl.list.map((rt) => {
        const st = run.heroes[rt.id] || 0;
        const col = '#' + rt.def.aura.toString(16).padStart(6, '0');
        return `<div class="hport" data-act="hero:${rt.id}" style="--hc:${col}">
          <img src="${spriteIcon('hero_' + rt.id)}"><div class="hstars">${'★'.repeat(st)}</div>
          <div class="hhp"><i data-hhp="${rt.id}"></i></div><div class="hcd" data-hcd="${rt.id}"></div><div class="hdead" data-hdead="${rt.id}"></div>
        </div>`;
      }).join('');
      for (let i = ctl.list.length; i < slots; i++) html += `<div class="hport empty" data-act="open:blessing"><span>+</span></div>`;
      box.innerHTML = html;
    }
    for (const rt of ctl.list) {
      const e = rt.e;
      const hp = box.querySelector(`[data-hhp="${rt.id}"]`) as HTMLElement | null;
      const cd = box.querySelector(`[data-hcd="${rt.id}"]`) as HTMLElement | null;
      const dead = box.querySelector(`[data-hdead="${rt.id}"]`) as HTMLElement | null;
      const alive = !!(e && e.alive);
      if (hp) hp.style.width = `${alive ? Math.max(0, e!.hp / e!.maxHp) * 100 : 0}%`;
      if (cd) cd.style.background = alive ? `conic-gradient(transparent ${(1 - ctl.cdFrac(rt)) * 360}deg, rgba(8,4,16,.55) 0deg)` : 'transparent';
      if (dead) { dead.style.display = alive ? 'none' : 'flex'; dead.textContent = alive ? '' : `${Math.ceil(rt.respawn)}s`; }
    }
  }

  showHud() { this.hud.classList.remove('hidden'); this.hudVisible = true; this.hideScreen(); this.heroKey = ''; this.updateHud(); }
  hideHud() { this.hud.classList.add('hidden'); this.hudVisible = false; }

  updateHud() {
    const run = G.run;
    const sc = this.scene;
    if (!run || !sc || !this.hudVisible) return;
    const m = getMods();
    const e = this.els;
    e['h-gold'].textContent = fmt(run.gold);
    e['h-ess'].textContent = fmt(G.meta.essence + essenceForRun(run.wave, run.stats.kills, run.stats.bossKills) + run.essenceEarned);
    const lifePct = Math.max(0, run.fortHp / m.fortMax);
    e['h-life-fill'].style.width = `${lifePct * 100}%`;
    e['h-life'].textContent = `${fmtInt(Math.ceil(run.fortHp))} / ${fmtInt(m.fortMax)}`;
    e['h-life-fill'].parentElement!.classList.toggle('danger', lifePct < 0.3);
    e['h-units'].textContent = `${sc.world.armyCount()}/${m.cap}`;
    e['h-wave'].textContent = `Onda ${run.wave}`;
    e['h-inf'].style.display = isInfinite(run.wave) ? '' : 'none';
    e['h-speed'].textContent = `${G.settings.speed}x`;
    const vr = visualRegionForWave(run.wave);
    const lw = ((run.wave - 1) % WAVES_PER_REGION) + 1;
    e['h-region-name'].textContent = isInfinite(run.wave) ? `Guerra Infinita • ${REGIONS[vr].name}` : `${REGIONS[vr].name} • ${lw}/${WAVES_PER_REGION}`;
    e['h-wprog'].style.width = `${sc.waves.progress() * 100}%`;
    const b = sc.world.bossRef && sc.world.bossRef.alive ? sc.world.bossRef : sc.boss.list.find((c) => c.e.alive)?.e || null;
    if (b) {
      e['h-boss'].classList.remove('hidden');
      e['h-region'].classList.add('hidden');
      const isBoss = b.kind === 'boss';
      const def = isBoss ? BOSSES[b.cls] : null;
      e['h-boss-name'].textContent = def ? `${def.name}, ${def.title}` : `${ENEMIES[b.cls as keyof typeof ENEMIES]?.name || ''} Ancestral`;
      const icoKey = isBoss ? 'boss_' + b.cls : 'enemy_' + b.cls;
      if (e['h-boss-ico'].dataset.k !== icoKey) { (e['h-boss-ico'] as HTMLImageElement).src = spriteIcon(icoKey); e['h-boss-ico'].dataset.k = icoKey; }
      e['h-boss-fill'].style.width = `${Math.max(0, b.hp / b.maxHp) * 100}%`;
      e['h-boss-hp'].textContent = `${fmt(Math.max(0, b.hp))} / ${fmt(b.maxHp)}`;
      const ph = b.hp / b.maxHp < 0.33 ? 3 : b.hp / b.maxHp < 0.66 ? 2 : 1;
      e['h-boss-phase'].textContent = isBoss ? `Fase ${ph}` : 'Miniboss';
    } else { e['h-boss'].classList.add('hidden'); e['h-region'].classList.remove('hidden'); }
    const need = armyXpNeeded(run.armyLevel);
    e['h-alv'].textContent = String(run.armyLevel);
    e['h-axp-fill'].style.width = `${Math.min(1, run.armyXp / need) * 100}%`;
    e['h-axp'].textContent = `${fmt(run.armyXp)} / ${fmt(need)}`;
    e['h-evo-badge'].classList.toggle('hidden', run.pendingBless <= 0);
    e['h-evo-badge'].textContent = run.pendingBless > 1 ? String(run.pendingBless) : '!';
    e['h-auto'].textContent = run.autoBless ? 'ON' : 'OFF';
    e['h-auto'].classList.toggle('on', run.autoBless);
    this.renderHeroes();
    e['h-dps'].textContent = fmt(sc.world.live.dps);
    e['h-tank'].textContent = fmt(sc.world.live.tank);
    e['h-heal'].textContent = fmt(sc.world.live.heal);
    e['h-ucount'].textContent = String(sc.world.allies.length);
    e['h-kills'].textContent = fmt(run.stats.kills);
    const cls = this.nextRecruitPreview();
    const cost = cls ? recruitCost(sc.world, cls) : 0;
    e['h-rcost'].textContent = fmt(cost);
    if (cls && e['h-rart'].dataset.k !== cls) { (e['h-rart'] as HTMLImageElement).src = spriteIcon('cls_' + cls); e['h-rart'].dataset.k = cls; }
    e['h-rcost'].closest('.summon')!.classList.toggle('poor', run.gold < cost || sc.world.armyCount() >= m.cap);
    e['h-rtimer'].style.width = `${run.autoRecruit ? Math.min(1, sc.recruitT / m.recruitInterval) * 100 : 0}%`;
    e['b-upg'].classList.toggle('hidden', !UPGRADES.some((u) => (u.max == null || (run.upgrades[u.id] || 0) < u.max) && upgradeCost(u, run.upgrades[u.id] || 0) <= run.gold));
    e['b-classes'].classList.toggle('hidden', !CLASS_ORDER.some((c) => (!run.unlocked.includes(c) && CLASSES[c].unlockGold * this.unlockScale() <= run.gold) || (run.unlocked.includes(c) && mergeCandidates(sc.world, c) > 0)));
    e['b-skills'].classList.toggle('hidden', !SKILLS.some((s, i) => skillCost(s, run.skillLv[i]) <= run.gold && run.skillLv[i] === 0));
    for (let i = 0; i < 4; i++) {
      const lv = run.skillLv[i];
      const cd = sc.skills.cd[i], max = sc.skills.maxCd(i);
      e[`skcd-${i}`].style.background = lv > 0 && cd > 0 ? `conic-gradient(rgba(10,4,16,.78) ${(cd / max) * 360}deg, transparent 0deg)` : 'transparent';
      e[`sklock-${i}`].style.display = lv > 0 ? 'none' : '';
      e[`sk-${i}`].classList.toggle('ready', lv > 0 && cd <= 0);
    }
  }

  nextPreview: ClassId | null = null;
  private nextRecruitPreview(): ClassId | null {
    if (!this.nextPreview || !G.run!.unlocked.includes(this.nextPreview)) this.nextPreview = pickRecruitClass();
    return this.nextPreview;
  }

  unlockScale() { return Math.pow(1.17, Math.max(0, (G.run?.wave || 1) - 1) * 0.6); }

  wallToastT = 0;
  fortHit(source = 'Demônios') {
    const el = this.els['h-life-fill']?.parentElement;
    if (!el) return;
    el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit');
    const now = performance.now();
    document.getElementById('wallalert')?.classList.add('on');
    clearTimeout((this as any).wallAlertTimer);
    (this as any).wallAlertTimer = setTimeout(() => document.getElementById('wallalert')?.classList.remove('on'), 900);
    if (now - this.wallToastT > 6000) { this.wallToastT = now; this.toast(`⚠ ${source} está atacando a muralha!`); }
  }

  // ================================================================ banners & toasts
  banner(title: string, sub?: string, color = '#ffd24a', dur = 2) {
    this.bannerEl.innerHTML = `<div class="bn"><div class="bt" style="color:${color}">${title}</div>${sub ? `<div class="bs">${sub}</div>` : ''}</div>`;
    this.bannerEl.classList.remove('show'); void this.bannerEl.offsetWidth; this.bannerEl.classList.add('show');
    this.bannerT = dur;
  }
  private tickBanner() {
    if (this.bannerT > 0) { this.bannerT -= 0.1; if (this.bannerT <= 0) this.bannerEl.classList.remove('show'); }
  }
  toast(msg: string) {
    const d = document.createElement('div');
    d.className = 'toast';
    d.textContent = msg;
    this.toastEl.appendChild(d);
    setTimeout(() => d.classList.add('out'), 2200);
    setTimeout(() => d.remove(), 2700);
    while (this.toastEl.children.length > 4) this.toastEl.firstChild?.remove();
  }

  // ================================================================ screens
  showTitle() {
    this.screen = 'title';
    const has = !!(G.run && G.run.active && !G.run.demo);
    this.screenEl.innerHTML = `<div class="title-screen">
      <div class="title-logo"><div class="tl1">Kill All the</div><div class="tl2">Demons</div><div class="tl3">A última fortaleza da humanidade</div></div>
      <div class="title-btns">
        ${has ? `<button class="btn big gold" data-act="continue">Continuar Expedição <small>Onda ${G.run!.wave}</small></button>` : ''}
        <button class="btn big ${has ? '' : 'gold'}" data-act="camp">${has ? 'Acampamento' : 'Começar'}</button>
      </div>
      <div class="title-foot">Toque com dois dedos ou ESC para pausar • Melhor onda: ${G.meta.bestWave}</div>
    </div>`;
    this.screenEl.classList.add('show');
  }

  showCamp(tab: CampTab = this.campTab) {
    this.screen = 'camp';
    this.campTab = tab;
    this.hideHud();
    const tabs: [CampTab, string, string][] = [['expedition', 'Expedição', 'flag'], ['tree', 'Árvore Eterna', 'gem'], ['codex', 'Códex', 'book'], ['ascend', 'Ascensão', 'wing'], ['settings', 'Ajustes', 'gear']];
    this.screenEl.innerHTML = `<div class="camp">
      <div class="camp-head">
        <div class="logo small"><span class="l1">Kill All the</span><span class="l2">Demons</span></div>
        <div class="camp-title">Acampamento</div>
        <div class="pill gem big">${iconImg('gem')}<b>${fmt(G.meta.essence)}</b><small>Essência Demoníaca</small></div>
        ${G.meta.shards ? `<div class="pill wing">${iconImg('wing')}<b>${G.meta.shards}</b><small>Fragmentos</small></div>` : ''}
      </div>
      <div class="camp-body">
        <div class="camp-nav">${tabs.map(([id, n, ic]) => `<div class="navbtn ${id === tab ? 'on' : ''}" data-act="camptab:${id}">${iconImg(ic)}<span>${n}</span></div>`).join('')}
          <div class="camp-stats">
            <div>Melhor onda: <b>${G.meta.bestWave}</b></div>
            <div>Expedições: <b>${G.meta.runs}</b></div>
            <div>Demônios mortos: <b>${fmt(G.meta.totalKills)}</b></div>
            <div>Essência total: <b>${fmt(G.meta.essenceTotal)}</b></div>
          </div>
        </div>
        <div class="camp-main ${tab === 'tree' ? 'full' : ''}">${this.campContent(tab)}</div>
      </div>
    </div>`;
    this.screenEl.classList.add('show');
    if (tab === 'tree') this.bindTree();
  }

  private campContent(tab: CampTab): string {
    switch (tab) {
      case 'expedition': return this.regionSelect();
      case 'tree': return this.treeView();
      case 'codex': return `<div class="panel-in">${this.codexView()}</div>`;
      case 'ascend': return this.ascendView();
      case 'settings': return `<div class="panel-in">${this.settingsView(false)}</div>`;
    }
  }

  private regionSelect(): string {
    const max = G.meta.maxRegion;
    const has = !!(G.run && G.run.active && !G.run.demo);
    const cards = REGIONS.map((R, i) => {
      const locked = i > max;
      const g = `linear-gradient(135deg, ${R.ground[0]}, ${R.corruption})`;
      return `<div class="region ${locked ? 'locked' : ''}" ${locked ? '' : `data-act="start:${i}"`} style="--rg:${g}; --ac:${R.accent}">
        <div class="rnum">${i + 1}</div>
        <img class="rboss" src="${spriteIcon('boss_' + R.boss)}">
        <div class="rname">${R.name}</div>
        <div class="rsub">${locked ? '🔒 Derrote o chefe anterior' : `Ondas ${i * 10 + 1}–${i * 10 + 10} • Chefe: ${BOSSES[R.boss].name}`}</div>
        ${!locked && i > 0 ? (G.meta.checkpoints?.[String(i)] ? `<div class="rbonus cp">✔ Checkpoint: ${G.meta.checkpoints[String(i)].army.reduce((s, u) => s + u.stack, 0)} tropas, ${Object.values(G.meta.checkpoints[String(i)].upgrades).reduce((a, b) => a + b, 0)} melhorias, ${Object.keys(G.meta.checkpoints[String(i)].heroes).length} herói(s)</div>` : `<div class="rbonus">Sem checkpoint: começa só com ouro e veteranos</div>`) : ''}
      </div>`;
    }).join('');
    const infLocked = max < REGIONS.length;
    return `<div class="expedition">
      ${has ? `<div class="resume">Há uma expedição em andamento (Onda ${G.run!.wave}). <button class="btn gold" data-act="continue">Continuar</button></div>` : ''}
      <div class="regions">${cards}
        <div class="region infinite ${infLocked ? 'locked' : ''}" ${infLocked ? '' : 'data-act="start:6"'}>
          <div class="rnum">∞</div><div class="rname">Guerra Infinita</div>
          <div class="rsub">${infLocked ? '🔒 Liberte o Trono Infernal' : 'Escalonamento procedural, modificadores e chefes cada vez maiores'}</div>
        </div>
      </div>
      <div class="hint">Cada expedição começa com poucos soldados. Ao cair, a fortaleza converte suas conquistas em <b>Essência Demoníaca</b> para a Árvore Eterna.</div>
    </div>`;
  }

  // ------------------------------------------------------------ Árvore Eterna (pannable node graph)
  treeCam = { x: 0, y: 0, z: 0.85, init: false };
  treeSel: string = 'root';

  private nodeState(n: MetaNode) {
    const lv = treeLv(n.id);
    const reqOk = !n.req || n.req.every((r) => treeLv(r) > 0);
    const maxed = lv >= n.max;
    const cost = metaCost(n, lv);
    return { lv, reqOk, maxed, cost, can: reqOk && !maxed && G.meta.essence >= cost };
  }

  private treeView(): string {
    const OFF = 1300; // canvas origin offset (root sits at OFF,OFF)
    const color = (b: string) => META_BRANCHES.find((q) => q.id === b)!.color;
    const lines: string[] = [];
    for (const n of META_NODES) {
      const p = metaNodePos(n);
      const parents = n.req && n.req.length ? n.req.map((r) => META_NODES.find((q) => q.id === r)!).filter(Boolean) : [null];
      for (const par of parents) {
        const q = par ? metaNodePos(par) : { x: 0, y: 0 };
        const lit = treeLv(n.id) > 0;
        const avail = !n.req || n.req.every((r) => treeLv(r) > 0);
        lines.push(`<line x1="${q.x + OFF}" y1="${q.y + OFF}" x2="${p.x + OFF}" y2="${p.y + OFF}" stroke="${lit ? color(n.branch) : avail ? '#7a6a9a' : '#3a2e4e'}" stroke-width="${lit ? 6 : 4}" stroke-linecap="round" ${lit ? 'class="lit"' : ''}/>`);
      }
    }
    const labels = META_BRANCHES.map((b) => {
      const a = (b.angle * Math.PI) / 180;
      const far = Math.max(...META_NODES.filter((n) => n.branch === b.id).map((n) => n.depth)) * 150 + 130;
      return `<div class="tbranch" style="left:${Math.cos(a) * far + OFF}px;top:${Math.sin(a) * far + OFF}px;color:${b.color}">${b.name}</div>`;
    }).join('');
    const nodes = META_NODES.map((n) => {
      const p = metaNodePos(n);
      const st = this.nodeState(n);
      const ico = n.icon.startsWith('cls_') ? `<img class="ico" src="${spriteIcon(n.icon)}">` : iconImg(n.icon);
      const cls = [st.reqOk ? '' : 'locked', st.maxed ? 'maxed' : '', st.can ? 'can' : '', st.lv > 0 ? 'owned' : '', this.treeSel === n.id ? 'sel' : '', n.max === 1 ? 'key' : ''].join(' ');
      return `<div class="gnode ${cls}" data-node="${n.id}" style="left:${p.x + OFF}px;top:${p.y + OFF}px;--bc:${color(n.branch)}">${ico}<span class="glv">${st.lv}/${n.max}</span></div>`;
    }).join('');
    const root = `<div class="gnode root ${this.treeSel === 'root' ? 'sel' : ''}" data-node="root" style="left:${OFF}px;top:${OFF}px">${iconImg('castle', 'ico big')}</div>`;
    return `<div class="treewrap">
      <div class="treeview" id="treeview">
        <div class="tcanvas" id="tcanvas" style="transform:translate(${this.treeCam.x}px,${this.treeCam.y}px) scale(${this.treeCam.z})">
          <svg width="2600" height="2600" class="tlines">${lines.join('')}</svg>
          ${labels}${root}${nodes}
        </div>
      </div>
      <div class="tzoom"><span data-act="tz:in">+</span><span data-act="tz:out">−</span><span data-act="tz:home">⌂</span></div>
      <div class="tinfo" id="tinfo">${this.treeInfo()}</div>
    </div>`;
  }

  private treeInfo(): string {
    if (this.treeSel === 'root') return `<div class="ti-head">${iconImg('castle', 'ico big')}<div><div class="ti-name">${META_ROOT.name}</div><div class="ti-branch">Raiz</div></div></div>
      <div class="ti-desc">${META_ROOT.desc}</div><div class="ti-hint">Arraste para mover • role ou use +/− para zoom • toque num nó para ver detalhes</div>
      <div class="ti-ess">${iconImg('gem')} <b>${fmt(G.meta.essence)}</b> Essência</div>`;
    const n = META_NODES.find((q) => q.id === this.treeSel)!;
    const st = this.nodeState(n);
    const b = META_BRANCHES.find((q) => q.id === n.branch)!;
    const ico = n.icon.startsWith('cls_') ? `<img class="ico big" src="${spriteIcon(n.icon)}">` : iconImg(n.icon, 'ico big');
    const reqNames = (n.req || []).map((r) => META_NODES.find((q) => q.id === r)!.name).join(', ');
    return `<div class="ti-head">${ico}<div><div class="ti-name">${n.name}</div><div class="ti-branch" style="color:${b.color}">${b.name} • Nível ${st.lv}/${n.max}</div></div></div>
      <div class="ti-desc">${st.lv > 0 ? `Atual: <b>${n.desc(st.lv)}</b><br>` : ''}${st.maxed ? '<b>Nível máximo</b>' : `Próximo: <b class="g">${n.desc(st.lv + 1)}</b>`}</div>
      ${!st.reqOk ? `<div class="ti-req">🔒 Requer: ${reqNames}</div>` : ''}
      ${st.maxed ? '' : `<button class="btn ${st.can ? 'gold' : 'disabled'}" data-act="meta:${n.id}">Evoluir • ${iconImg('gem', 'ico tiny')} ${fmt(st.cost)}</button>`}
      <div class="ti-ess">${iconImg('gem')} <b>${fmt(G.meta.essence)}</b> Essência</div>`;
  }

  private bindTree() {
    this.bindGraph('treeview', 'tcanvas', this.treeCam, (id) => { this.treeSel = id; document.getElementById('tinfo')!.innerHTML = this.treeInfo(); });
  }

  /** Generic pan / pinch / wheel / tap handling for node-graph screens. */
  private bindGraph(viewId: string, canvasId: string, cam: { x: number; y: number; z: number; init: boolean }, onSelect: (id: string) => void, span = 900) {
    const view = document.getElementById(viewId);
    const canvas = document.getElementById(canvasId);
    if (!view || !canvas) return;
    const apply = () => { canvas.style.transform = `translate(${cam.x}px,${cam.y}px) scale(${cam.z})`; };
    if (!cam.init) { cam.init = true; const r = view.getBoundingClientRect(); const s = this.stageScale(); cam.z = Math.max(0.45, Math.min(1.1, (r.height / s) / span)); cam.x = r.width / s / 2 - 1300 * cam.z; cam.y = r.height / s / 2 - 1300 * cam.z; }
    apply();
    const pts = new Map<number, { x: number; y: number }>();
    let moved = 0, pinch0 = 0, z0 = cam.z;
    view.onpointerdown = (e) => { view.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); z0 = cam.z; } };
    view.onpointermove = (e) => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      const s = this.stageScale();
      if (pts.size === 1) { cam.x += (e.clientX - p.x) / s; cam.y += (e.clientY - p.y) / s; moved += Math.abs(e.clientX - p.x) + Math.abs(e.clientY - p.y); }
      p.x = e.clientX; p.y = e.clientY;
      if (pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); this.zoomGraph(viewId, canvasId, cam, z0 * (d / pinch0) / cam.z); moved = 99; }
      apply();
    };
    const up = (e: PointerEvent) => {
      pts.delete(e.pointerId);
      if (moved < 8 && pts.size === 0) {
        const el = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement)?.closest('[data-node]') as HTMLElement | null;
        if (el && view.contains(el)) {
          view.querySelectorAll('.gnode.sel').forEach((q) => q.classList.remove('sel'));
          el.classList.add('sel');
          onSelect(el.dataset.node!);
          audio.play('click');
        }
      }
    };
    view.onpointerup = up; view.onpointercancel = up;
    view.onwheel = (e) => { e.preventDefault(); this.zoomGraph(viewId, canvasId, cam, e.deltaY < 0 ? 1.12 : 1 / 1.12); };
  }

  private stageScale() { const t = this.stage.style.transform.match(/scale\(([\d.]+)\)/); return t ? parseFloat(t[1]) : 1; }

  private zoomTree(f: number) { this.zoomGraph('treeview', 'tcanvas', this.treeCam, f); }

  private zoomGraph(viewId: string, canvasId: string, cam: { x: number; y: number; z: number }, f: number) {
    const view = document.getElementById(viewId);
    if (!view) return;
    const r = view.getBoundingClientRect();
    const s = this.stageScale();
    const cx = r.width / s / 2, cy = r.height / s / 2;
    const nz = Math.max(0.35, Math.min(1.6, cam.z * f));
    cam.x = cx - ((cx - cam.x) * nz) / cam.z;
    cam.y = cy - ((cy - cam.y) * nz) / cam.z;
    cam.z = nz;
    const c = document.getElementById(canvasId);
    if (c) c.style.transform = `translate(${cam.x}px,${cam.y}px) scale(${cam.z})`;
  }

  private ascendView(): string {
    const avail = ascensionShardsAvailable();
    const ok = G.meta.bestWave >= 30 && avail > 0;
    return `<div class="panel-in ascend">
      <h2>${iconImg('wing')} Ascensão</h2>
      <p>Renuncie a toda a Essência e à Árvore Eterna em troca de <b>Fragmentos de Ascensão</b>. Cada fragmento concede <b>+10%</b> de dano, vida, ouro e essência — para sempre.</p>
      <div class="asc-box">
        <div>Fragmentos atuais: <b>${G.meta.shards}</b> (bônus atual ×${shardMult().toFixed(2)})</div>
        <div>Melhor onda: <b>${G.meta.bestWave}</b> — Requer onda 30+</div>
        <div class="asc-gain">Ganho ao ascender: <b>+${avail}</b> fragmento(s)</div>
      </div>
      <button class="btn big ${ok ? 'gold' : 'disabled'}" data-act="${ok ? 'ascend' : ''}">Ascender</button>
      <p class="muted">Regiões desbloqueadas, códex e recordes são mantidos.</p>
    </div>`;
  }

  hideScreen() { this.screen = null; this.screenEl.classList.remove('show'); this.screenEl.innerHTML = ''; }

  // ================================================================ modals
  openModal(id: string, arg?: any) {
    if (!G.run || (G.run.demo && !['codex', 'settings'].includes(id))) return;
    this.modal = id; this.modalArg = arg;
    this.renderModal();
    audio.play('click');
  }
  closeModal() {
    this.modal = null;
    this.modalEl.classList.remove('show');
    this.modalEl.innerHTML = '';
    this.nextPreview = null;
  }

  renderModal() {
    if (!this.modal) return;
    const titles: Record<string, [string, string]> = {
      upgrades: ['Árvore de Melhorias', 'speed'], classes: ['Classes & Evolução', 'evo'], formation: ['Formação & Recrutamento', 'people'],
      skills: ['Habilidades do Comandante', 'fire'], blessing: ['Cartas de Herói', 'wing'], traits: ['Bênçãos & Legado', 'traits'],
      codex: ['Códex', 'book'], hero: ['Herói', 'star'], meta: ['Árvore Eterna', 'gem'], pause: ['Pausado', 'pause'], result: ['Fim da Expedição', 'skull'], tutorial: ['Como jogar', 'book'], confirm: ['Confirmar', 'skull'],
    };
    const [title, ico] = titles[this.modal] || ['', 'book'];
    let body = '';
    switch (this.modal) {
      case 'upgrades': body = this.upgradesView(); break;
      case 'classes': body = this.classesView(); break;
      case 'formation': body = this.formationView(); break;
      case 'skills': body = this.skillsView(); break;
      case 'blessing': body = this.blessingView(); break;
      case 'traits': body = this.traitsView(); break;
      case 'codex': body = this.codexView(); break;
      case 'hero': body = this.heroView(this.modalArg); break;
      case 'meta': body = this.treeView().replace('class="treewrap"', 'class="treewrap inmodal"'); break;
      case 'pause': body = this.pauseView(); break;
      case 'result': body = this.resultView(); break;
      case 'tutorial': body = this.tutorialView(); break;
      case 'confirm': body = this.confirmView(); break;
    }
    const closable = !['result', 'blessing', 'tutorial', 'confirm'].includes(this.modal);
    const gold = G.run && !G.run.demo ? `<div class="pill gold">${iconImg('coin')}<b>${fmt(G.run.gold)}</b></div>` : '';
    this.modalEl.innerHTML = `<div class="backdrop" ${closable ? 'data-act="close"' : ''}></div>
      <div class="mframe m-${this.modal}">
        <div class="mhead">${iconImg(ico)}<span>${title}</span>${this.modal !== 'result' && this.modal !== 'tutorial' ? gold : ''}${closable ? '<div class="x" data-act="close">✕</div>' : ''}</div>
        <div class="mbody">${body}</div>
      </div>`;
    this.modalEl.classList.add('show');
    if (this.modal === 'upgrades') this.bindGraph('uview', 'ucanvas', this.upgCam, (id) => { this.upgSel = id; document.getElementById('uinfo')!.innerHTML = this.upgInfo(); }, 600);
    if (this.modal === 'meta') this.bindTree();
  }

  upgCam = { x: 0, y: 0, z: 0.8, init: false };
  upgSel = 'dmg';

  private upgState(id: string) {
    const run = G.run!;
    const u = UPGRADES.find((q) => q.id === id)!;
    const lv = run.upgrades[id] || 0;
    const t = UPG_TREE[id];
    const reqOk = !t.req || (run.upgrades[t.req] || 0) > 0;
    const maxed = u.max != null && lv >= u.max;
    const cost = upgradeCost(u, lv);
    return { u, lv, reqOk, maxed, cost, can: reqOk && !maxed && run.gold >= cost };
  }

  private upgradesView(): string {
    const OFF = 1300;
    const color = (b: string) => UPG_BRANCHES.find((q) => q.id === b)!.color;
    const lines: string[] = [];
    for (const id of Object.keys(UPG_TREE)) {
      const t = UPG_TREE[id];
      const p = upgNodePos(id);
      const q = t.req ? upgNodePos(t.req) : { x: 0, y: 0 };
      const st = this.upgState(id);
      lines.push(`<line x1="${q.x + OFF}" y1="${q.y + OFF}" x2="${p.x + OFF}" y2="${p.y + OFF}" stroke="${st.lv > 0 ? color(t.branch) : st.reqOk ? '#7a6a9a' : '#3a2e4e'}" stroke-width="${st.lv > 0 ? 6 : 4}" stroke-linecap="round" ${st.lv > 0 ? 'class="lit"' : ''}/>`);
    }
    const labels = UPG_BRANCHES.map((b) => {
      const a = (b.angle * Math.PI) / 180;
      const far = 3 * 150 + 120;
      return `<div class="tbranch" style="left:${Math.cos(a) * far + OFF}px;top:${Math.sin(a) * far + OFF}px;color:${b.color}">${b.name}</div>`;
    }).join('');
    const nodes = Object.keys(UPG_TREE).map((id) => {
      const p = upgNodePos(id);
      const st = this.upgState(id);
      const cls = [st.reqOk ? '' : 'locked', st.maxed ? 'maxed' : '', st.can ? 'can' : '', st.lv > 0 ? 'owned' : '', this.upgSel === id ? 'sel' : ''].join(' ');
      return `<div class="gnode ${cls}" data-node="${id}" style="left:${p.x + OFF}px;top:${p.y + OFF}px;--bc:${color(UPG_TREE[id].branch)}">${iconImg(st.u.icon)}<span class="glv">${st.lv}${st.u.max ? '/' + st.u.max : ''}</span>${st.can ? '<i class="gbuy">●</i>' : ''}</div>`;
    }).join('');
    const root = `<div class="gnode root" data-node="root" style="left:${OFF}px;top:${OFF}px">${iconImg('people', 'ico big')}</div>`;
    return `<div class="treewrap inmodal">
      <div class="treeview" id="uview">
        <div class="tcanvas" id="ucanvas" style="transform:translate(${this.upgCam.x}px,${this.upgCam.y}px) scale(${this.upgCam.z})">
          <svg width="2600" height="2600" class="tlines">${lines.join('')}</svg>${labels}${root}${nodes}
        </div>
      </div>
      <div class="tzoom"><span data-act="uz:in">+</span><span data-act="uz:out">−</span><span data-act="uz:home">⌂</span></div>
      <div class="tinfo" id="uinfo">${this.upgInfo()}</div>
    </div>`;
  }

  private upgInfo(): string {
    const run = G.run!;
    if (this.upgSel === 'root' || !UPG_TREE[this.upgSel]) {
      return `<div class="ti-head">${iconImg('people', 'ico big')}<div><div class="ti-name">Melhorias da Expedição</div><div class="ti-branch">Ouro: ${fmt(run.gold)}</div></div></div>
        <div class="ti-desc">Cada nó melhora o exército nesta expedição. Compre um nó para liberar os próximos do mesmo ramo.</div>
        <div class="ti-hint">Arraste para mover • pinça ou +/− para zoom • toque num nó</div>`;
    }
    const st = this.upgState(this.upgSel);
    const t = UPG_TREE[this.upgSel];
    const b = UPG_BRANCHES.find((q) => q.id === t.branch)!;
    const reqName = t.req ? UPGRADES.find((q) => q.id === t.req)!.name : '';
    return `<div class="ti-head">${iconImg(st.u.icon, 'ico big')}<div><div class="ti-name">${st.u.name}</div><div class="ti-branch" style="color:${b.color}">${b.name} • Nível ${st.lv}${st.u.max ? '/' + st.u.max : ''}</div></div></div>
      <div class="ti-desc">Atual: <b>${st.u.desc(st.lv)}</b><br>${st.maxed ? '<b>Nível máximo</b>' : `Próximo: <b class="g">${st.u.desc(st.lv + 1)}</b>`}</div>
      ${!st.reqOk ? `<div class="ti-req">🔒 Requer: ${reqName}</div>` : ''}
      ${st.maxed ? '' : `<div class="ti-row"><button class="btn ${st.can ? 'gold' : 'disabled'}" data-act="upg:${this.upgSel}">Comprar • ${iconImg('coin', 'ico tiny')} ${fmt(st.cost)}</button>
        <button class="btn sm ${st.can ? '' : 'disabled'}" data-act="upgmax:${this.upgSel}">Máx</button></div>`}
      <div class="ti-ess">${iconImg('coin')} <b>${fmt(run.gold)}</b> ouro</div>`;
  }

  private classesView(): string {
    const run = G.run!;
    const w = this.scene!.world;
    const counts: Record<string, number[]> = {};
    for (const a of w.allies) if (a.alive && a.kind === 'ally') { (counts[a.cls] ||= [0, 0, 0, 0])[a.tier] += a.stack; }
    return `<div class="muted pad">Tropas ganham experiência lutando e <b>evoluem sozinhas</b> nos níveis ${TIER_LEVELS.slice(1).join(', ')} — cada evolução muda o visual e o comportamento. Funda 3 tropas iguais para promover na hora.</div>
    <div class="classes">${CLASS_ORDER.map((c) => {
      const d = CLASSES[c];
      const un = run.unlocked.includes(c);
      const cnt = counts[c] || [0, 0, 0, 0];
      const total = cnt.reduce((a, b) => a + b, 0);
      const mast = run.mastery[c] || 0;
      const mc = masteryCost(mast, d.cost);
      const uc = Math.ceil(d.unlockGold * this.unlockScale());
      const merges = un ? mergeCandidates(w, c) : 0;
      return `<div class="clcard ${un ? '' : 'locked'}">
        <div class="cltiers">${[0, 1, 2, 3].map((t) => `<div class="tier ${cnt[t] ? 'has' : ''}" title="${d.tiers[t].name}: ${d.tiers[t].desc}"><img src="${spriteIcon(`tier_${c}_${t}`)}"><span>${cnt[t] || ''}</span></div>`).join('')}</div>
        <div class="clinfo"><div class="cln">${d.name} <small>${ROLE_NAMES[d.role]}</small></div>
          <div class="cld">${d.desc}</div>
          <div class="cltierdesc">${d.tiers.map((t, i) => `<span class="${cnt[i] ? 'on' : ''}"><b>${t.name}</b> (Nv ${TIER_LEVELS[i]}): ${t.desc}</span>`).join('')}</div>
        </div>
        <div class="clact">
          ${un ? `<div class="clc">No exército: <b>${total}</b></div>
            <button class="btn sm ${run.gold >= mc ? 'gold' : 'disabled'}" data-act="mastery:${c}">Maestria ${mast} → ${mast + 1}<br><small>+12% atributos • ${fmt(mc)} ouro</small></button>
            <button class="btn sm ${merges ? '' : 'disabled'}" data-act="merge:${c}">Fundir 3 → 1<br><small>${merges ? merges + ' possível(is)' : 'Precisa de 3 iguais'}</small></button>`
            : `<button class="btn sm ${run.gold >= uc ? 'gold' : 'disabled'}" data-act="unlock:${c}">Desbloquear<br><small>${fmt(uc)} ouro</small></button>`}
        </div>
      </div>`;
    }).join('')}</div>`;
  }

  private formationView(): string {
    const run = G.run!;
    const roles: Role[] = ['front', 'ranged', 'support', 'special'];
    const total = roles.reduce((s, r) => s + run.weights[r], 0) || 1;
    return `<div class="form">
      <div class="fsec"><h3>Postura do exército</h3><div class="seg big">
        <span data-act="stance:def" class="${run.stance === 'def' ? 'on' : ''}">🛡 Defensiva<small>Linha colada à muralha</small></span>
        <span data-act="stance:bal" class="${run.stance === 'bal' ? 'on' : ''}">⚔ Equilibrada<small>Meio do campo</small></span>
        <span data-act="stance:off" class="${run.stance === 'off' ? 'on' : ''}">🔥 Ofensiva<small>Avança, mas deixa brechas</small></span>
      </div></div>
      <div class="fsec"><h3>Prioridade de recrutamento</h3>
        ${roles.map((r) => `<div class="slider"><label>${ROLE_NAMES[r]}</label><input type="range" min="0" max="100" value="${run.weights[r]}" data-in="w:${r}"><b>${Math.round((run.weights[r] / total) * 100)}%</b></div>`).join('')}
      </div>
      <div class="fsec"><h3>Classes no recrutamento automático</h3><div class="ctoggles">
        ${CLASS_ORDER.filter((c) => run.unlocked.includes(c)).map((c) => `<div class="ctog ${run.classEnabled[c] !== false ? 'on' : ''}" data-act="cls:${c}"><img src="${spriteIcon('cls_' + c)}"><span>${CLASSES[c].name}</span></div>`).join('')}
      </div></div>
      <div class="fsec row"><div class="tog ${run.autoRecruit ? 'on' : ''}" data-act="toggle:autoRecruit">Recrutamento automático: <b>${run.autoRecruit ? 'LIGADO' : 'DESLIGADO'}</b></div>
      <div class="muted">Intervalo: ${getMods().recruitInterval.toFixed(1)}s • Capacidade: ${getMods().cap}</div></div>
    </div>`;
  }

  private skillsView(): string {
    const run = G.run!;
    return `<div class="toolbar"><div class="tog ${run.autoSkills ? 'on' : ''}" data-act="toggle:autoSkills">Lançamento automático: <b>${run.autoSkills ? 'LIGADO' : 'DESLIGADO'}</b></div><span class="muted">Teclas 1–4 ou toque nos ícones da barra.</span></div>
    <div class="grid sk">${SKILLS.map((s, i) => {
      const lv = run.skillLv[i];
      const cost = skillCost(s, lv);
      const can = run.gold >= cost;
      return `<div class="skcard ${can ? 'can' : ''}">
        <div class="skico">${iconImg(s.icon, 'ico big')}</div>
        <div class="skn">${s.name} <span>${lv ? 'Nv ' + lv : 'Bloqueada'}</span></div>
        <div class="skd">${s.desc(Math.max(1, lv))}</div>
        <div class="skm">Recarga: ${Math.round(s.cd * getMods().skillCd)}s</div>
        <button class="btn sm ${can ? 'gold' : 'disabled'}" data-act="skill:${i}">${lv ? 'Melhorar' : 'Aprender'} • ${fmt(cost)} ouro</button>
      </div>`;
    }).join('')}</div>`;
  }

  /** Level-up cards are now Hero cards: recruit a hero or add a star. Generic blessings only fill empty slots. */
  private rollBlessings() {
    const run = G.run!;
    const m = getMods();
    const owned = HERO_ORDER.filter((h) => (run.heroes[h] || 0) > 0);
    const heroOpts: string[] = [];
    if (owned.length < m.heroSlots) for (const h of HERO_ORDER) if (!run.heroes[h]) heroOpts.push('hr-' + h);
    for (const h of owned) if (run.heroes[h] < MAX_STARS) heroOpts.push('hp-' + h);
    const picks = shuffle(heroOpts).slice(0, m.blessChoices);
    if (picks.length < m.blessChoices) {
      const pool = TRAITS.filter((t) => (run.traits[t.id] || 0) < t.max && (!t.cls || run.unlocked.includes(t.cls)));
      picks.push(...shuffle(pool.slice()).slice(0, m.blessChoices - picks.length).map((t) => t.id));
    }
    this.blessChoices = picks;
  }

  private cardHtml(id: string): string {
    const run = G.run!;
    if (id.startsWith('hr-') || id.startsWith('hp-')) {
      const h = HEROES[id.slice(3)];
      const st = run.heroes[h.id] || 0;
      const recruit = id.startsWith('hr-');
      const next = recruit ? 1 : st + 1;
      const unlock = h.abilities.find((ab) => ab.star === next);
      const stars = '★'.repeat(next) + '<i>' + '★'.repeat(MAX_STARS - next) + '</i>';
      return `<div class="bcard hero ${recruit ? 'new' : ''}" data-act="bless:${id}" style="--hc:#${h.aura.toString(16).padStart(6, '0')}">
        <div class="hc-tag">${recruit ? 'Novo herói' : 'Promoção'}</div>
        <img class="hc-art" src="${spriteIcon('hero_' + h.id)}">
        <div class="bn2">${h.name}</div><div class="hc-title">${h.title}</div>
        <div class="hc-stars">${stars}</div>
        <div class="bd">${recruit ? h.desc : `Atributos ×1,45`}${unlock ? `<br><b>Desbloqueia:</b> ${unlock.name}` : ''}</div>
      </div>`;
    }
    const t = TRAITS.find((q) => q.id === id)!;
    const lv = run.traits[id] || 0;
    const ico = t.icon.startsWith('cls_') ? `<img class="ico big" src="${spriteIcon(t.icon)}">` : iconImg(t.icon, 'ico big');
    return `<div class="bcard" data-act="bless:${id}">${ico}<div class="bn2">${t.name}</div><div class="bl">${lv ? `Nível ${lv} → ${lv + 1}` : 'Bênção'}</div><div class="bd">${t.desc}</div></div>`;
  }

  private blessingView(): string {
    const run = G.run!;
    if (!this.blessChoices.length) this.rollBlessings();
    const owned = HERO_ORDER.filter((h) => (run.heroes[h] || 0) > 0).length;
    return `<div class="muted pad">O exército chegou ao <b>nível ${run.armyLevel}</b>. Escolha uma carta (${run.pendingBless} pendente${run.pendingBless > 1 ? 's' : ''}) • Heróis: ${owned}/${getMods().heroSlots}</div>
    <div class="bless">${this.blessChoices.map((id) => this.cardHtml(id)).join('')}</div>
    <div class="center"><button class="btn sm" data-act="bless:later">Decidir depois</button></div>`;
  }

  private traitsView(): string {
    const run = G.run!;
    const owned = TRAITS.filter((t) => run.traits[t.id]);
    const leg = CLASS_ORDER.filter((c) => (run.legacy[c] || 0) > 1);
    const m = getMods();
    return `<div class="tv">
      <div class="tvsec"><h3>Bênçãos ativas</h3>${owned.length ? `<div class="tlist">${owned.map((t) => `<div class="titem">${t.icon.startsWith('cls_') ? `<img class="ico" src="${spriteIcon(t.icon)}">` : iconImg(t.icon)}<b>${t.name}</b> <span>Nv ${run.traits[t.id]}</span><small>${t.desc}</small></div>`).join('')}</div>` : '<div class="muted">Nenhuma ainda. Abata demônios para evoluir o exército.</div>'}
        ${run.pendingBless ? `<button class="btn gold" data-act="open:blessing">Escolher bênção (${run.pendingBless})</button>` : ''}</div>
      <div class="tvsec"><h3>${iconImg('soul')} Legado de Batalha</h3>
        <div class="muted">Soldados caídos deixam <b>${Math.round(m.legacy * 100)}%</b> da experiência para futuros recrutas da mesma classe. Sobreviventes ganham <b>veteranice</b> (+${Math.round(m.vetBonus * 100)}% por onda, até 10★).</div>
        <div class="tlist">${leg.length ? leg.map((c) => `<div class="titem"><img class="ico" src="${spriteIcon('cls_' + c)}"><b>${CLASSES[c].name}</b><span>${fmt(run.legacy[c])} XP herdável</span></div>`).join('') : '<div class="muted">Nenhum legado acumulado ainda.</div>'}</div>
      </div>
      <div class="tvsec"><h3>Expedição</h3><div class="kv">
        <div>Onda atual</div><b>${run.wave}</b><div>Abates</div><b>${fmt(run.stats.kills)}</b><div>Chefes</div><b>${run.stats.bossKills}</b>
        <div>Ouro obtido</div><b>${fmt(run.stats.gold)}</b><div>Tropas perdidas</div><b>${fmt(run.stats.lost)}</b><div>Recrutadas</div><b>${fmt(run.stats.recruited)}</b>
        <div>Essência ao terminar</div><b>${fmt(essenceForRun(run.wave, run.stats.kills, run.stats.bossKills) + run.essenceEarned)}</b><div>Tempo</div><b>${fmtTime(run.stats.time)}</b>
      </div></div>
    </div>`;
  }

  private heroView(id: string): string {
    const run = G.run!;
    const h = HEROES[id];
    const st = run.heroes[id] || 0;
    const rt = this.scene!.heroes.list.find((r) => r.id === id);
    const stats = rt ? this.scene!.heroes.stats(rt) : null;
    const col = '#' + h.aura.toString(16).padStart(6, '0');
    return `<div class="herov" style="--hc:${col}">
      <div class="hv-art"><img src="${spriteIcon('hero_' + id)}"><div class="hc-stars">${'★'.repeat(st)}<i>${'★'.repeat(MAX_STARS - st)}</i></div></div>
      <div class="hv-info">
        <div class="hv-name">${h.name} <small>${h.title}</small></div>
        <div class="hv-role">${h.role}</div>
        <div class="hv-desc">${h.desc}</div>
        ${stats ? `<div class="kv"><div>Vida</div><b>${fmt(stats.hp)}</b><div>Dano</div><b>${fmt(stats.dmg)}</b><div>Armadura</div><b>${Math.round(stats.armor)}</b><div>Renasce em</div><b>${Math.round(getMods().heroRespawn)}s</b></div>` : ''}
        <div class="hv-abs">${h.abilities.map((ab) => `<div class="hv-ab ${ab.star <= st ? 'on' : ''}"><b>${ab.name}</b> <span>${'★'.repeat(ab.star)}</span><div>${ab.desc}</div></div>`).join('')}</div>
        <div class="muted">Promova heróis escolhendo suas cartas quando o exército sobe de nível.</div>
      </div>
    </div>`;
  }

  private codexView(): string {
    const tabs = `<div class="seg"><span data-act="codex:units" class="${this.codexTab === 'units' ? 'on' : ''}">Unidades</span><span data-act="codex:enemies" class="${this.codexTab === 'enemies' ? 'on' : ''}">Demônios</span><span data-act="codex:bosses" class="${this.codexTab === 'bosses' ? 'on' : ''}">Chefes</span></div>`;
    let list = '';
    if (this.codexTab === 'units') {
      list = CLASS_ORDER.map((c) => {
        const d = CLASSES[c];
        return `<div class="cx"><div class="cxi multi">${[0, 1, 2, 3].map((t) => `<img src="${spriteIcon(`tier_${c}_${t}`)}">`).join('')}</div><div class="cxt"><b>${d.name}</b> <small>${ROLE_NAMES[d.role]}</small><div>${d.desc}</div>
        <div class="cxs">Vida ${d.hp} • Dano ${d.dmg} • Alcance ${d.range} • Armadura ${d.armor}</div><div class="cxs">${d.tiers.map((t) => t.name).join(' → ')}</div></div></div>`;
      }).join('');
    } else if (this.codexTab === 'enemies') {
      list = ENEMY_ORDER.map((id) => {
        const seen = G.meta.seenEnemies.includes(id);
        const d = ENEMIES[id];
        return `<div class="cx ${seen ? '' : 'unseen'}"><div class="cxi"><img src="${spriteIcon('enemy_' + id)}"></div><div class="cxt"><b>${seen ? d.name : '???'}</b><div>${seen ? d.desc : 'Ainda não encontrado.'}</div>${seen ? `<div class="cxs">Vida ${d.hp} • Dano ${d.dmg} • Velocidade ${d.speed}${d.flying ? ' • Voador' : ''}${d.large ? ' • Grande' : ''}</div>` : ''}</div></div>`;
      }).join('');
    } else {
      list = BOSS_ORDER.map((id, i) => {
        const seen = G.meta.seenBosses.includes(id);
        const b = BOSSES[id];
        return `<div class="cx boss ${seen ? '' : 'unseen'}"><div class="cxi"><img src="${spriteIcon('boss_' + id)}"></div><div class="cxt"><b>${seen ? `${b.name}, ${b.title}` : '???'}</b> <small>${REGIONS[i].name}</small><div>${seen ? b.desc : 'Aguarda no fim da região.'}</div>
          ${seen ? `<div class="cxs">${b.abilities.map((a) => `${a.wipe ? '☠ ' : ''}${a.name}`).join(' • ')}</div>` : ''}</div></div>`;
      }).join('');
    }
    return `${tabs}<div class="codex">${list}</div>`;
  }

  private settingsView(inRun: boolean): string {
    const s = G.settings;
    return `<div class="settings">
      <div class="srow"><label>Velocidade do jogo</label><div class="seg">${[1, 2, 3].map((v) => `<span data-act="set:speed:${v}" class="${s.speed === v ? 'on' : ''}">${v}x</span>`).join('')}</div></div>
      <div class="srow"><label>Música</label><div class="tog ${s.music ? 'on' : ''}" data-act="set:music">${s.music ? 'ON' : 'OFF'}</div><input type="range" min="0" max="100" value="${Math.round(s.musicVol * 100)}" data-in="musicVol"></div>
      <div class="srow"><label>Efeitos sonoros</label><div class="tog ${s.sfx ? 'on' : ''}" data-act="set:sfx">${s.sfx ? 'ON' : 'OFF'}</div><input type="range" min="0" max="100" value="${Math.round(s.sfxVol * 100)}" data-in="sfxVol"></div>
      <div class="srow"><label>Números de dano</label><div class="tog ${s.dmgNumbers ? 'on' : ''}" data-act="set:dmgNumbers">${s.dmgNumbers ? 'ON' : 'OFF'}</div></div>
      <div class="srow"><label>Tremor de tela</label><div class="tog ${s.shake ? 'on' : ''}" data-act="set:shake">${s.shake ? 'ON' : 'OFF'}</div></div>
      <div class="srow"><label>Qualidade (partículas / tropas visíveis)</label><div class="seg">${(['low', 'med', 'high'] as const).map((q) => `<span data-act="set:quality:${q}" class="${s.quality === q ? 'on' : ''}">${{ low: 'Baixa', med: 'Média', high: 'Alta' }[q]}</span>`).join('')}</div></div>
      <div class="srow"><label>Tela cheia</label><button class="btn sm" data-act="fullscreen">Alternar</button></div>
      ${inRun ? '' : `<div class="srow danger"><label>Apagar todo o progresso</label><button class="btn sm red" data-act="askwipe">Apagar save</button></div>`}
    </div>`;
  }

  private pauseView(): string {
    const run = G.run!;
    return `<div class="pause">
      <div class="pbtns">
        <button class="btn big gold" data-act="close">▶ Continuar</button>
        <button class="btn" data-act="open:meta">Árvore Eterna</button>
        <button class="btn" data-act="open:tutorial">Como jogar</button>
        <button class="btn red" data-act="askretreat">Recuar (encerrar expedição)</button>
      </div>
      <div class="muted">Recuar agora rende ${fmt(Math.floor((essenceForRun(run.wave, run.stats.kills, run.stats.bossKills) + run.essenceEarned) * 0.9))} de Essência (90%).</div>
      ${this.settingsView(true)}
    </div>`;
  }

  confirmAction: string = '';
  private confirmView(): string {
    const msg = this.confirmAction === 'wipe' ? 'Apagar TODO o progresso? Isso não pode ser desfeito.' : 'Encerrar a expedição e voltar ao acampamento?';
    return `<div class="confirm"><p>${msg}</p><div class="pbtns"><button class="btn red" data-act="confirm:yes">Sim</button><button class="btn" data-act="confirm:no">Não</button></div></div>`;
  }

  private resultView(): string {
    const r = this.resultData!;
    const title = r.reason === 'defeat' ? 'A fortaleza caiu' : 'Retirada estratégica';
    return `<div class="result">
      <div class="rtitle">${title}</div>
      <div class="kv big"><div>Onda alcançada</div><b>${r.wave}</b><div>Demônios abatidos</div><b>${fmt(r.kills)}</b><div>Chefes derrotados</div><b>${r.bosses}</b>
        <div>Ouro saqueado</div><b>${fmt(r.gold)}</b><div>Tropas recrutadas</div><b>${fmt(r.recruited)}</b><div>Tropas caídas</div><b>${fmt(r.lost)}</b><div>Duração</div><b>${fmtTime(r.time)}</b></div>
      <div class="ess">${iconImg('gem', 'ico big')}<div><div class="eg">+${fmt(r.essence)}</div><div>Essência Demoníaca</div></div></div>
      <div class="muted">Invista na Árvore Eterna e volte mais forte.</div>
      <button class="btn big gold" data-act="tocamp">Voltar ao acampamento</button>
    </div>`;
  }

  private tutorialView(): string {
    const steps = [
      ['Defenda a fortaleza', 'Você é o comandante da última fortaleza da humanidade. Demônios saem dos portais à direita. Os que alcançarem a muralha ferem a <b>Vida do Comandante</b>. Se ela zerar, a expedição termina.', 'castle'],
      ['O exército luta sozinho', 'Tropas buscam alvos, lutam, curam e usam habilidades por conta própria. Novos recrutas chegam automaticamente enquanto houver <b>ouro</b> e espaço no exército.', 'people'],
      ['Evolução em combate', 'Cada soldado ganha experiência e <b>evolui no meio da luta</b> (miliciano → soldado → veterano → campeão), mudando visual e ataques. Caídos deixam <b>Legado</b> para os próximos.', 'evo'],
      ['Chefes devastadores', 'Chefes marcam o chão antes de atacar. Alguns golpes podem aniquilar o exército inteiro: use a <b>Bênção Sagrada</b>, Guardiões e vida extra para sobreviver.', 'skull'],
      ['Fique mais forte', 'Use <b>Melhorias</b>, <b>Classes</b> e <b>Formação</b> na barra inferior. Ao cair, ganhe <b>Essência Demoníaca</b> para a Árvore Eterna. Dois dedos ou ESC pausam.', 'gem'],
    ];
    const [t, d, ic] = steps[this.tutorialStep];
    return `<div class="tut">${iconImg(ic, 'ico huge')}<h2>${t}</h2><p>${d}</p>
      <div class="dots">${steps.map((_, i) => `<i class="${i === this.tutorialStep ? 'on' : ''}"></i>`).join('')}</div>
      <div class="pbtns">${this.tutorialStep > 0 ? '<button class="btn" data-act="tut:prev">Voltar</button>' : ''}<button class="btn gold" data-act="tut:next">${this.tutorialStep < steps.length - 1 ? 'Próximo' : 'Lutar!'}</button></div></div>`;
  }

  // ================================================================ public hooks
  openPause() { if (!this.modal && G.run && !G.run.demo) this.openModal('pause'); }
  togglePause() { if (this.modal === 'pause') this.closeModal(); else if (!this.modal) this.openPause(); else if (this.modal && !['result', 'blessing', 'tutorial', 'confirm'].includes(this.modal)) this.closeModal(); }
  openBlessing() { if (G.run && G.run.pendingBless > 0 && !this.modal) { this.blessChoices = []; this.openModal('blessing'); } }
  flagBlessing() { this.toast('O exército evoluiu! Escolha uma carta de herói.'); }
  autoPickBlessing() {
    const run = G.run!;
    while (run.pendingBless > 0) {
      this.rollBlessings();
      const id = this.blessChoices[0];
      if (!id) { run.pendingBless = 0; break; }
      this.applyBlessing(id, true);
    }
    this.blessChoices = [];
  }

  private applyBlessing(id: string, auto = false) {
    const run = G.run!;
    if (id.startsWith('hr-') || id.startsWith('hp-')) {
      const hid = id.slice(3);
      run.heroes[hid] = Math.min(MAX_STARS, (run.heroes[hid] || 0) + 1);
      run.pendingBless = Math.max(0, run.pendingBless - 1);
      this.scene?.heroes.sync();
      if (!run.demo) {
        const h = HEROES[hid];
        const col = '#' + h.aura.toString(16).padStart(6, '0');
        if (id.startsWith('hr-')) this.banner(`${h.name} entrou na batalha!`, h.title, col, 2.4);
        else this.banner(`${h.name} ${'★'.repeat(run.heroes[hid])}`, 'Herói promovido', col, 2);
      }
      return;
    }
    if (!TRAITS.find((q) => q.id === id)) { run.pendingBless = Math.max(0, run.pendingBless - 1); return; }
    run.traits[id] = (run.traits[id] || 0) + 1;
    run.pendingBless = Math.max(0, run.pendingBless - 1);
    invalidateMods();
    const t = TRAITS.find((q) => q.id === id)!;
    if (id === 't_wall') run.fortHp = getMods().fortMax;
    this.refreshArmyStats();
    if (!run.demo) this.toast(`${auto ? 'Auto-bênção: ' : 'Bênção: '}${t.name}`);
  }

  refreshArmyStats() {
    const w = this.scene?.world;
    if (!w) return;
    invalidateMods();
    for (const a of w.allies) if (a.alive && a.kind === 'ally') applyStats(w, a);
    this.scene?.heroes.sync();
  }

  showResult(reason: 'defeat' | 'retreat') {
    const run = G.run!;
    const data = { reason, essence: 0, wave: run.wave, kills: run.stats.kills, bosses: run.stats.bossKills, time: run.stats.time, gold: run.stats.gold, lost: run.stats.lost, recruited: run.stats.recruited };
    data.essence = this.scene!.endExpedition(reason);
    this.resultData = data;
    this.modal = 'result';
    this.renderModal();
  }

  // ================================================================ events
  private onInput(ev: Event) {
    const el = ev.target as HTMLInputElement;
    const key = el.dataset.in;
    if (!key) return;
    const v = parseInt(el.value);
    if (key.startsWith('w:') && G.run) {
      G.run.weights[key.slice(2) as Role] = v;
      const total = Object.values(G.run.weights).reduce((a, b) => a + b, 0) || 1;
      this.modalEl.querySelectorAll('.slider').forEach((row) => {
        const inp = row.querySelector('input') as HTMLInputElement;
        const r = inp.dataset.in!.slice(2) as Role;
        (row.querySelector('b') as HTMLElement).textContent = `${Math.round((G.run!.weights[r] / total) * 100)}%`;
      });
      this.nextPreview = null;
    } else if (key === 'musicVol') { G.settings.musicVol = v / 100; audio.applyVolumes(); }
    else if (key === 'sfxVol') { G.settings.sfxVol = v / 100; audio.applyVolumes(); }
    save();
  }

  private onClick(ev: MouseEvent) {
    const el = (ev.target as HTMLElement).closest('[data-act]') as HTMLElement | null;
    if (!el) return;
    audio.init();
    const act = el.dataset.act || '';
    if (!act) return;
    const [cmd, a1, a2] = act.split(':');
    const run = G.run;
    const sc = this.scene!;
    switch (cmd) {
      case 'camp': this.showCamp('expedition'); audio.play('click'); break;
      case 'continue':
        audio.play('click');
        if (G.run && G.run.active && !G.run.demo) { this.hideScreen(); this.showHud(); }
        break;
      case 'camptab': this.showCamp(a1 as CampTab); audio.play('click'); break;
      case 'start': {
        const r = parseInt(a1);
        if (G.run && G.run.active && !G.run.demo) { const got = sc.endExpedition('retreat'); this.toast(`Expedição anterior encerrada: +${fmt(got)} Essência`); }
        sc.newExpedition(Math.min(r, REGIONS.length));
        this.hideScreen();
        this.showHud();
        if (!G.meta.tutorialDone) { this.tutorialStep = 0; this.openModal('tutorial'); }
        audio.play('wave');
        break;
      }
      case 'close': this.closeModal(); break;
      case 'open': this.openModal(a1); if (a1 === 'blessing' && run && run.pendingBless <= 0) { this.closeModal(); this.toast('Nenhuma bênção pendente. Abata demônios para evoluir.'); } break;
      case 'pause': this.openPause(); break;
      case 'speed': G.settings.speed = G.settings.speed >= 3 ? 1 : G.settings.speed + 1; save(); this.updateHud(); audio.play('click'); break;
      case 'recruit': if (sc.manualRecruit()) this.nextPreview = null; break;
      case 'cast': if (run && run.skillLv[+a1] === 0) this.openModal('skills'); else sc.castSkill(+a1); break;
      case 'toggle':
        if (run) { (run as any)[a1] = !(run as any)[a1]; if (a1 === 'autoBless' && run.autoBless && run.pendingBless) this.autoPickBlessing(); }
        audio.play('click'); this.renderModal(); this.updateHud(); save();
        break;
      case 'buymax': this.buyMax = a1 === '1'; this.renderModal(); break;
      case 'upg': this.buyUpgrade(a1, false); break;
      case 'upgmax': this.buyUpgrade(a1, true); break;
      case 'uz': if (a1 === 'home') { this.upgCam.init = false; this.renderModal(); } else this.zoomGraph('uview', 'ucanvas', this.upgCam, a1 === 'in' ? 1.2 : 1 / 1.2); break;
      case 'unlock': {
        const c = a1 as ClassId;
        const cost = Math.ceil(CLASSES[c].unlockGold * this.unlockScale());
        if (run && run.gold >= cost && !run.unlocked.includes(c)) { run.gold -= cost; run.unlocked.push(c); run.classEnabled[c] = true; audio.play('buy'); this.toast(`${CLASSES[c].name} desbloqueado!`); this.nextPreview = null; }
        this.renderModal(); break;
      }
      case 'mastery': {
        const c = a1 as ClassId;
        const cost = masteryCost(run!.mastery[c] || 0, CLASSES[c].cost);
        if (run && run.gold >= cost) { run.gold -= cost; run.mastery[c] = (run.mastery[c] || 0) + 1; this.refreshArmyStats(); audio.play('buy'); }
        this.renderModal(); break;
      }
      case 'merge': if (mergeTrio(sc.world, a1 as ClassId)) audio.play('promote'); this.renderModal(); break;
      case 'stance': if (run) { run.stance = a1 as any; sc.world.markFormation(); } this.renderModal(); audio.play('click'); break;
      case 'cls': if (run) { run.classEnabled[a1] = run.classEnabled[a1] === false; this.nextPreview = null; } this.renderModal(); break;
      case 'skill': {
        const i = +a1;
        const cost = skillCost(SKILLS[i], run!.skillLv[i]);
        if (run && run.gold >= cost) { run.gold -= cost; run.skillLv[i]++; audio.play('buy'); }
        this.renderModal(); break;
      }
      case 'bless':
        if (a1 === 'later') { this.blessChoices = []; this.closeModal(); break; }
        this.applyBlessing(a1);
        audio.play('level');
        this.blessChoices = [];
        if (run && run.pendingBless > 0) this.renderModal(); else this.closeModal();
        break;
      case 'codex': this.codexTab = a1 as any; if (this.screen === 'camp') this.showCamp('codex'); else this.renderModal(); break;
      case 'meta': this.buyMeta(a1); break;
      case 'hero': this.openModal('hero', a1); break;
      case 'statsToggle': this.statsCollapsed = !this.statsCollapsed; this.els['h-stats'].classList.toggle('collapsed', this.statsCollapsed); break;
      case 'tz': if (a1 === 'home') { this.treeCam.init = false; this.bindTree(); } else this.zoomTree(a1 === 'in' ? 1.2 : 1 / 1.2); break;
      case 'ascend': {
        const gain = ascensionShardsAvailable();
        if (gain > 0) {
          G.meta.shards += gain; G.meta.shardsTotal += gain; G.meta.ascensions++;
          G.meta.essence = 0; G.meta.tree = {};
          invalidateMods(); save(); audio.play('promote');
          this.toast(`Ascensão! +${gain} fragmentos`);
          this.showCamp('ascend');
        }
        break;
      }
      case 'set': {
        const s = G.settings as any;
        if (a1 === 'speed') s.speed = +a2;
        else if (a1 === 'quality') { s.quality = a2; sc.world.fx.applyQuality(); }
        else s[a1] = !s[a1];
        audio.applyVolumes(); save();
        if (this.screen === 'camp') this.showCamp('settings'); else this.renderModal();
        this.updateHud();
        break;
      }
      case 'fullscreen': {
        const d = document as any;
        if (!document.fullscreenElement) { document.documentElement.requestFullscreen?.().then(() => (screen.orientation as any)?.lock?.('landscape').catch(() => {})).catch(() => {}); }
        else d.exitFullscreen?.();
        break;
      }
      case 'askretreat': this.confirmAction = 'retreat'; this.modal = 'confirm'; this.renderModal(); break;
      case 'askwipe': this.confirmAction = 'wipe'; this.modal = 'confirm'; this.renderModal(); break;
      case 'confirm':
        if (a1 === 'yes') {
          if (this.confirmAction === 'retreat') { this.showResult('retreat'); }
          else if (this.confirmAction === 'wipe') { wipeSave(); location.reload(); }
        } else { this.closeModal(); if (this.confirmAction === 'retreat') this.openPause(); }
        break;
      case 'tocamp': this.closeModal(); sc.startDemo(); this.showCamp('tree'); break;
      case 'tut':
        if (a1 === 'next') { if (this.tutorialStep >= 4) { G.meta.tutorialDone = true; save(); this.closeModal(); } else { this.tutorialStep++; this.renderModal(); } }
        else { this.tutorialStep = Math.max(0, this.tutorialStep - 1); this.renderModal(); }
        break;
    }
  }

  private buyUpgrade(id: string, max = false) {
    const run = G.run!;
    const u = UPGRADES.find((q) => q.id === id)!;
    if (UPG_TREE[id]?.req && !(run.upgrades[UPG_TREE[id].req!] || 0)) { this.toast('Compre o nó anterior primeiro'); return; }
    let bought = 0;
    do {
      const lv = run.upgrades[id] || 0;
      if (u.max != null && lv >= u.max) break;
      const cost = upgradeCost(u, lv);
      if (run.gold < cost) break;
      run.gold -= cost;
      run.upgrades[id] = lv + 1;
      bought++;
    } while (max && bought < 500);
    if (bought) {
      audio.play('buy');
      const prevMax = getMods().fortMax;
      invalidateMods();
      if (id === 'fort') run.fortHp += getMods().fortMax - prevMax;
      if (id === 'cap' || id === 'recruit') this.nextPreview = null;
      this.refreshArmyStats();
    }
    this.renderModal();
  }

  private buyMeta(id: string) {
    const n = META_NODES.find((q) => q.id === id)!;
    const lv = treeLv(id);
    if (lv >= n.max) return;
    if (n.req && !n.req.every((r) => treeLv(r) > 0)) { this.toast('Requer o nó anterior do ramo.'); return; }
    const cost = metaCost(n, lv);
    if (G.meta.essence < cost) { this.toast('Essência insuficiente'); return; }
    G.meta.essence -= cost;
    G.meta.tree[id] = lv + 1;
    invalidateMods();
    save();
    audio.play('buy');
    this.treeSel = id;
    if (this.modal === 'meta') this.renderModal(); else this.showCamp('tree');
  }
}

export const UI = new UIManager();
export { iconURL };
