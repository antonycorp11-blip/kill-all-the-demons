import Phaser from 'phaser';
import { registerCoreArt, ensureRegionArt } from '../art/assets';
import { UI } from '../ui/ui';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    // let the loading screen paint before the heavy procedural generation
    setTimeout(() => {
      registerCoreArt(this);
      ensureRegionArt(this, 0);
      UI.init();
      const l = document.getElementById('loading');
      if (l) { l.style.opacity = '0'; setTimeout(() => l.remove(), 500); }
      this.scene.start('Battle');
    }, 30);
  }
}
