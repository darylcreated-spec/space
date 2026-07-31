import './style.css';

import { SpaceScene } from './space/engine/SpaceScene.js';
import { PostProcessing as SpacePostProcessing } from './space/engine/PostProcessing.js';
import { ParticleManager as SpaceParticles } from './space/engine/ParticleManager.js';
import { SpaceAudio } from './space/audio/SpaceAudio.js';
import { ControlsManager as SpaceControls } from './space/ui/ControlsManager.js';
import { GameManager as SpaceGameManager } from './space/game/GameManager.js';
import { SpaceHUD } from './space/ui/SpaceHUD.js';

class OrbitalVanguardApp {
  constructor() {
    this.container = document.getElementById('canvas-container');

    // 1. Initialize Space Engine & Subsystems
    this.spaceScene = new SpaceScene(this.container);
    this.spacePostProcessing = new SpacePostProcessing(
      this.spaceScene.renderer,
      this.spaceScene.scene,
      this.spaceScene.camera
    );
    this.spaceParticles = new SpaceParticles(this.spaceScene.scene);
    this.spaceAudio = new SpaceAudio();
    this.spaceControls = new SpaceControls();

    // 2. Initialize Game Manager & HUD Overlay
    this.spaceGameManager = new SpaceGameManager(
      this.spaceScene,
      this.spacePostProcessing,
      this.spaceParticles,
      this.spaceAudio,
      this.spaceControls
    );

    this.spaceHUD = new SpaceHUD(this.spaceGameManager);
    this.spaceGameManager.setHUD(this.spaceHUD);

    // 3. Robust Animation Loop with timestamp fallback
    this.lastTime = performance.now();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);

    // 4. Register PWA Service Worker
    this.registerServiceWorker();
  }

  animate(timestamp) {
    requestAnimationFrame(this.animate);
    if (!this.lastTime) this.lastTime = timestamp;
    let dt = (timestamp - this.lastTime) / 1000;
    if (isNaN(dt) || dt <= 0 || dt > 0.1) dt = 0.016;
    this.lastTime = timestamp;

    this.spaceGameManager.update(dt);
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => {
          console.log('SW registration error: ', err);
        });
      });
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.orbitalVanguardApp = new OrbitalVanguardApp();
});
