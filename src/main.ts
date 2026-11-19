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
  scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
  // ?bg=1 forces a setTimeout loop so automated tests keep running in a hidden tab
  fps: { target: 60, smoothStep: true, forceSetTimeOut: new URLSearchParams(location.search).has('bg') },
  input: { activePointers: 3 },
  render: { powerPreference: 'high-performance', batchSize: 4096 },
  scene: [BootScene, BattleScene],
});

(window as any).__game = game;
if (import.meta.env.DEV) import('./dev').then((m) => m.installDev(game, { G, save, UI, invalidateMods, getMods }));

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
