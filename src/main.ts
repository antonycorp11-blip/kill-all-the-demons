import Phaser from 'phaser';
import './style.css';
import { BootScene } from './scenes/BootScene';
import { BattleScene } from './scenes/BattleScene';
import { load, G, save } from './core/state';
import { UI } from './ui/ui';
import { invalidateMods, getMods } from './core/mods';

load();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#140a18',
  pixelArt: true,
  antialias: false,
  roundPixels: false,
  scale: { mode: Phaser.Scale.NONE, width: window.innerWidth, height: window.innerHeight },
  // ?bg=1 forces a setTimeout loop so automated tests keep running in a hidden tab
  fps: { target: 60, smoothStep: true, forceSetTimeOut: new URLSearchParams(location.search).has('bg') },
  input: { activePointers: 3 },
  render: { powerPreference: 'high-performance', batchSize: 4096 },
  scene: [BootScene, BattleScene],
});

(window as any).__game = game;
if (import.meta.env.DEV) import('./dev').then((m) => m.installDev(game, { G, save, UI, invalidateMods, getMods }));

// One source of truth for the screen size: the canvas parent and the DOM HUD both follow
// window.innerWidth/innerHeight. Mobile browsers (iOS Safari especially) report sizes late or
// differently on rotation / toolbar changes, so we re-sync on every hint and also poll.
const gameEl = document.getElementById('game')!;
let lastW = 0, lastH = 0;
function syncViewport(force = false) {
  const w = Math.round(window.innerWidth), h = Math.round(window.innerHeight);
  if (w < 10 || h < 10) return;
  if (!force && w === lastW && h === lastH && game.scale.width === w && game.scale.height === h) return;
  lastW = w; lastH = h;
  gameEl.style.width = w + 'px';
  gameEl.style.height = h + 'px';
  game.scale.resize(w, h);
  UI.fit();
  const sc = game.scene.getScene('Battle') as BattleScene | null;
  if (sc && sc.sys && sc.sys.isActive()) sc.layout();
}
const burst = () => { syncViewport(true); [80, 250, 600, 1200].forEach((t) => setTimeout(() => syncViewport(true), t)); };
window.addEventListener('resize', burst);
window.addEventListener('orientationchange', burst);
window.visualViewport?.addEventListener('resize', burst);
setInterval(() => syncViewport(), 700);
game.events.once('ready', burst);

// browsers only allow audio after a user gesture: unlock it on the first touch anywhere
import { audio } from './audio/audio';
const unlock = () => audio.init();
document.addEventListener('pointerdown', unlock);
document.addEventListener('keydown', unlock);

// keep save fresh when the tab is hidden / closed
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    const sc = game.scene.getScene('Battle') as BattleScene | null;
    if (sc && sc.world && sc.mode === 'run') sc.world.saveArmyToRun();
  }
});
