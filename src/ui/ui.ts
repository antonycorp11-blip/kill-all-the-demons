// DOM UI layer: HUD (reference-style), banners, toasts, modals and out-of-battle screens.
import { G, save, wipeSave, armyXpNeeded, treeLv } from '../core/state';
import { getMods, invalidateMods, essenceForRun, ascensionShardsAvailable, shardMult } from '../core/mods';
import { fmt, fmtInt, fmtTime } from '../core/format';
import { iconImg, iconURL } from '../art/fx';
import { spriteIcon } from '../art/assets';
import { UPGRADES, upgradeCost, META_NODES, META_BRANCHES, metaCost, TRAITS, SKILLS, skillCost, masteryCost } from '../data/upgrades';
import { CLASSES, CLASS_ORDER, ROLE_NAMES, TIER_LEVELS, type ClassId, type Role } from '../data/units';
import { ENEMIES, ENEMY_ORDER } from '../data/enemies';
import { BOSSES, BOSS_ORDER } from '../data/bosses';
import { REGIONS, WAVES_PER_REGION, isInfinite, visualRegionForWave } from '../data/regions';
import { recruitCost, pickRecruitClass, mergeTrio, mergeCandidates, applyStats } from '../battle/army';
import { audio } from '../audio/audio';
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
    <div class="topbar">
      <div class="logo" data-act="pause"><span class="l1">Kill All the</span><span class="l2">Demons</span></div>
      <div class="pill gold" data-act="open:upgrades">${iconImg('coin')}<b id="h-gold">0</b><i class="plus">+</i></div>
      <div class="pill gem" data-act="open:traits">${iconImg('gem')}<b id="h-ess">0</b></div>
      <div class="life">
        <div class="wing l"></div><div class="wing r"></div>
        <div class="life-label">Vida do Comandante</div>
        <div class="life-row">${iconImg('heart', 'ico heart')}<div class="bar life-bar"><i id="h-life-fill"></i><span id="h-life">0</span></div></div>
      </div>
      <div class="pill units" data-act="open:formation">${iconImg('people')}<b id="h-units">0</b></div>
      <div class="pill wave" data-act="open:traits">${iconImg('wave')}<span>Onda</span><b id="h-wave">1</b><span id="h-inf" class="inf">∞</span></div>
      <div class="pill speed" data-act="speed" id="h-speed">1x</div>
      <div class="gearbtn" data-act="pause">${iconImg('gear')}</div>
    </div>
    <div class="bossbar hidden" id="h-boss">
      <div class="bossface"><img id="h-boss-ico"></div>
      <div class="bossmain"><div class="bname" id="h-boss-name"></div><div class="bar boss"><i id="h-boss-fill"></i><span id="h-boss-hp"></span></div></div>
      <div class="bphase" id="h-boss-phase">×1</div>
    </div>
    <div class="regionline" id="h-region"><span id="h-region-name"></span><div class="wprog"><i id="h-wprog"></i></div></div>
    <div class="leftcol">
      <div class="card evo" data-act="open:blessing">
        ${iconImg('evo')}<div class="ct">Progresso de Evolução</div>
        <div class="lv">Nv. <b id="h-alv">1</b></div>
        <div class="bar small"><i id="h-axp-fill"></i><span id="h-axp"></span></div>
        <div class="badge hidden" id="h-evo-badge">!</div>
      </div>
      <div class="card auto" data-act="toggle:autoBless">${iconImg('infinity')}<div class="ct">Auto<br>Bênção</div><div class="sw" id="h-auto">OFF</div></div>
      <div class="card small" data-act="open:traits">${iconImg('traits')}<span>Bênçãos</span></div>
      <div class="card small" data-act="open:codex">${iconImg('book')}<span>Códex</span></div>
    </div>
    <div class="statspanel">
      <div class="sp-title">${iconImg('evo')}<span>Batalha (Ao vivo)</span></div>
      <div class="sp-row">${iconImg('sword')}<span>DPS</span><b id="h-dps">0</b></div>
      <div class="sp-row">${iconImg('shield')}<span>Tanque</span><b id="h-tank">0</b></div>
      <div class="sp-row">${iconImg('heart')}<span>Cura</span><b id="h-heal">0</b></div>
      <div class="sp-row">${iconImg('star')}<span>Tropas</span><b id="h-ucount">0</b></div>
      <div class="sp-row">${iconImg('skull')}<span>Abates</span><b id="h-kills">0</b></div>
    </div>
    <div class="bottombar">
      <div class="summon" data-act="recruit">
        <div class="cardart">${iconImg('cls_militia', 'ico big')}</div>
        <div class="st"><div class="t1">Convocar Tropa</div><div class="cost">${iconImg('coin')}<b id="h-rcost">0</b></div></div>
        <div class="rbar"><i id="h-rtimer"></i></div>
      </div>
      <div class="bbtn" data-act="open:classes">${iconImg('evo', 'ico mid')}<span>Classes /<br>Evoluir</span><div class="badge hidden" id="b-classes">!</div></div>
      <div class="bbtn" data-act="open:upgrades">${iconImg('speed', 'ico mid')}<span>Melhorias</span><div class="badge hidden" id="b-upg">!</div></div>
      <div class="bbtn" data-act="open:formation">${iconImg('people', 'ico mid')}<span>Formação</span></div>
      <div class="bbtn" data-act="open:skills">${iconImg('fire', 'ico mid')}<span>Habilidades<br>do Comandante</span><div class="badge hidden" id="b-skills">!</div></div>
      <div class="skillrow">
        ${SKILLS.map((s, i) => `<div class="skill" data-act="cast:${i}" id="sk-${i}">${iconImg(s.icon, 'ico sk')}<div class="cd" id="skcd-${i}"></div><div class="lock" id="sklock-${i}">${iconImg('pause', 'ico tiny')}</div><span class="key">${i + 1}</span></div>`).join('')}
      </div>
    </div>`;
    this.hud.querySelectorAll('[id]').forEach((el) => { this.els[el.id] = el as HTMLElement; });
    // lock icons: draw padlock-ish with css instead of pause icon
    this.hud.querySelectorAll('.lock').forEach((el) => { el.innerHTML = '🔒'; });
  }

  showHud() { this.hud.classList.remove('hidden'); this.hudVisible = true; this.hideScreen(); this.updateHud(); }
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
    e['h-units'].textContent = `${sc.world.armyCount()} / ${m.cap}`;
    e['h-wave'].textContent = String(run.wave);
    e['h-inf'].style.display = isInfinite(run.wave) ? '' : 'none';
    e['h-speed'].textContent = `${G.settings.speed}x`;
    // region / wave progress
    const vr = visualRegionForWave(run.wave);
    const lw = ((run.wave - 1) % WAVES_PER_REGION) + 1;
    e['h-region-name'].textContent = isInfinite(run.wave) ? `Guerra Infinita • ${REGIONS[vr].name}` : `${REGIONS[vr].name} • ${lw}/${WAVES_PER_REGION}`;
    e['h-wprog'].style.width = `${sc.waves.progress() * 100}%`;
    // boss bar
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
      e['h-boss-phase'].textContent = `Fase ${ph}`;
    } else { e['h-boss'].classList.add('hidden'); e['h-region'].classList.remove('hidden'); }
    // evolution
    const need = armyXpNeeded(run.armyLevel);
    e['h-alv'].textContent = String(run.armyLevel);
    e['h-axp-fill'].style.width = `${Math.min(1, run.armyXp / need) * 100}%`;
    e['h-axp'].textContent = `${fmt(run.armyXp)} / ${fmt(need)}`;
    e['h-evo-badge'].classList.toggle('hidden', run.pendingBless <= 0);
    e['h-auto'].textContent = run.autoBless ? 'ON' : 'OFF';
    e['h-auto'].classList.toggle('on', run.autoBless);
    // stats
    e['h-dps'].textContent = fmt(sc.world.live.dps);
    e['h-tank'].textContent = fmt(sc.world.live.tank);
    e['h-heal'].textContent = fmt(sc.world.live.heal);
    e['h-ucount'].textContent = String(sc.world.armyCount() + sc.world.summonCount());
    e['h-kills'].textContent = fmt(run.stats.kills);
    // recruit
    const cls = this.nextRecruitPreview();
    const cost = cls ? recruitCost(sc.world, cls) : 0;
    e['h-rcost'].textContent = fmt(cost);
    e['h-rcost'].parentElement!.parentElement!.parentElement!.classList.toggle('poor', run.gold < cost || sc.world.armyCount() >= m.cap);
    e['h-rtimer'].style.width = `${run.autoRecruit ? Math.min(1, sc.recruitT / m.recruitInterval) * 100 : 0}%`;
    // badges
    e['b-upg'].classList.toggle('hidden', !UPGRADES.some((u) => (u.max == null || (run.upgrades[u.id] || 0) < u.max) && upgradeCost(u, run.upgrades[u.id] || 0) <= run.gold));
    e['b-classes'].classList.toggle('hidden', !CLASS_ORDER.some((c) => (!run.unlocked.includes(c) && CLASSES[c].unlockGold * this.unlockScale() <= run.gold) || (run.unlocked.includes(c) && mergeCandidates(sc.world, c) > 0)));
    e['b-skills'].classList.toggle('hidden', !SKILLS.some((s, i) => skillCost(s, run.skillLv[i]) <= run.gold && run.skillLv[i] === 0));
    // skills
    for (let i = 0; i < 4; i++) {
      const lv = run.skillLv[i];
      const cd = sc.skills.cd[i], max = sc.skills.maxCd(i);
      e[`skcd-${i}`].style.background = lv > 0 && cd > 0 ? `conic-gradient(rgba(10,4,16,.75) ${(cd / max) * 360}deg, transparent 0deg)` : 'transparent';
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

  fortHit() {
    const el = this.els['h-life-fill']?.parentElement;
    if (!el) return;
    el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit');
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
        <div class="camp-main">${this.campContent(tab)}</div>
      </div>
    </div>`;
    this.screenEl.classList.add('show');
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
        ${!locked && i > 0 ? `<div class="rbonus">Começa com ouro e veteranos extras</div>` : ''}
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

  private treeView(): string {
    const cols = META_BRANCHES.map((b) => {
      const nodes = META_NODES.filter((n) => n.branch === b.id).sort((a, c) => a.row - c.row);
      return `<div class="tcol" style="--bc:${b.color}"><div class="thead">${b.name}</div>${nodes.map((n) => {
        const lv = treeLv(n.id);
        const reqOk = !n.req || n.req.every((r) => treeLv(r) > 0);
        const maxed = lv >= n.max;
        const cost = metaCost(n, lv);
        const can = reqOk && !maxed && G.meta.essence >= cost;
        const ico = n.icon.startsWith('cls_') ? `<img class="ico" src="${spriteIcon(n.icon)}">` : iconImg(n.icon);
        return `<div class="tnode ${reqOk ? '' : 'locked'} ${maxed ? 'maxed' : ''} ${can ? 'can' : ''} ${lv > 0 ? 'owned' : ''}" data-act="meta:${n.id}" title="${n.desc(lv + 1)}">
          ${ico}<div class="tn">${n.name}</div><div class="tl">${lv}/${n.max}</div>
          <div class="td">${n.desc(Math.max(1, lv))}</div>
          <div class="tc">${maxed ? 'MÁX' : `${iconImg('gem', 'ico tiny')}${fmt(cost)}`}</div>
        </div>`;
      }).join('<div class="tlink"></div>')}</div>`;
    }).join('');
    return `<div class="tree"><div class="tree-hint">Essência Demoníaca: <b>${fmt(G.meta.essence)}</b> • Toque num nó para evoluir. Nós exigem o anterior do mesmo ramo.</div><div class="tcols">${cols}</div></div>`;
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
      upgrades: ['Melhorias da Expedição', 'speed'], classes: ['Classes & Evolução', 'evo'], formation: ['Formação & Recrutamento', 'people'],
      skills: ['Habilidades do Comandante', 'fire'], blessing: ['Escolha uma Bênção', 'wing'], traits: ['Bênçãos & Legado', 'traits'],
      codex: ['Códex', 'book'], pause: ['Pausado', 'pause'], result: ['Fim da Expedição', 'skull'], tutorial: ['Como jogar', 'book'], confirm: ['Confirmar', 'skull'],
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
  }

  private upgradesView(): string {
    const run = G.run!;
    return `<div class="toolbar"><div class="seg"><span data-act="buymax:0" class="${this.buyMax ? '' : 'on'}">x1</span><span data-act="buymax:1" class="${this.buyMax ? 'on' : ''}">Máx</span></div><span class="muted">Ouro vem de cada demônio abatido. Recrutas também custam ouro.</span></div>
    <div class="grid upg">${UPGRADES.map((u) => {
      const lv = run.upgrades[u.id] || 0;
      const maxed = u.max != null && lv >= u.max;
      const cost = upgradeCost(u, lv);
      const can = !maxed && run.gold >= cost;
      return `<div class="ucard ${can ? 'can' : ''} ${maxed ? 'maxed' : ''}" data-act="${maxed ? '' : 'upg:' + u.id}">
        ${iconImg(u.icon, 'ico mid')}<div class="un">${u.name}<span class="ul">Nv ${lv}${u.max ? '/' + u.max : ''}</span></div>
        <div class="ud">${u.desc(lv)}${maxed ? '' : `<span class="next"> → ${u.desc(lv + 1).replace(/^.*?(x[\d.]+|[+\-]?[\d.]+%?)/, '$1')}</span>`}</div>
        <div class="uc">${maxed ? 'MÁX' : `${iconImg('coin', 'ico tiny')}${fmt(cost)}`}</div>
      </div>`;
    }).join('')}</div>`;
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

  private rollBlessings() {
    const run = G.run!;
    const pool = TRAITS.filter((t) => (run.traits[t.id] || 0) < t.max && (!t.cls || run.unlocked.includes(t.cls)));
    this.blessChoices = shuffle(pool.slice()).slice(0, getMods().blessChoices).map((t) => t.id);
  }

  private blessingView(): string {
    const run = G.run!;
    if (!this.blessChoices.length) this.rollBlessings();
    return `<div class="muted pad">Seu exército alcançou o <b>nível ${run.armyLevel}</b> de evolução. Escolha uma bênção (${run.pendingBless} pendente${run.pendingBless > 1 ? 's' : ''}).</div>
    <div class="bless">${this.blessChoices.map((id) => {
      const t = TRAITS.find((q) => q.id === id)!;
      const lv = run.traits[id] || 0;
      const ico = t.icon.startsWith('cls_') ? `<img class="ico big" src="${spriteIcon(t.icon)}">` : iconImg(t.icon, 'ico big');
      return `<div class="bcard" data-act="bless:${id}">${ico}<div class="bn2">${t.name}</div><div class="bl">${lv ? `Nível ${lv} → ${lv + 1}` : 'Nova'}</div><div class="bd">${t.desc}</div></div>`;
    }).join('')}</div>
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
  flagBlessing() { this.toast('O exército evoluiu! Escolha uma bênção.'); }
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
      case 'upg': this.buyUpgrade(a1); break;
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

  private buyUpgrade(id: string) {
    const run = G.run!;
    const u = UPGRADES.find((q) => q.id === id)!;
    let bought = 0;
    do {
      const lv = run.upgrades[id] || 0;
      if (u.max != null && lv >= u.max) break;
      const cost = upgradeCost(u, lv);
      if (run.gold < cost) break;
      run.gold -= cost;
      run.upgrades[id] = lv + 1;
      bought++;
    } while (this.buyMax && bought < 500);
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
    this.showCamp('tree');
  }
}

export const UI = new UIManager();
export { iconURL };
