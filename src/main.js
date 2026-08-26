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
    window.spaceGameManager = this.spaceGameManager;
    window.gameManager = this.spaceGameManager;

    // 3. Robust Animation Loop with timestamp fallback
    this.lastTime = performance.now();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);

    // 4. Run High-Tech Boot Sequence & Pilot Clearance Loader
    this.runBootSequence();

    // 5. Register PWA Service Worker
    this.registerServiceWorker();
  }

  runBootSequence() {
    const loadingScreen = document.getElementById('game-loading-screen');
    if (!loadingScreen) return;

    const gaugeBar = document.getElementById('loading-gauge-bar');
    const percentNum = document.getElementById('loading-percent-num');
    const statusTag = document.getElementById('loading-status-tag');
    const logText = document.getElementById('loading-log-text');
    const linearFill = document.getElementById('loading-linear-fill');
    const hashVal = document.getElementById('loading-hash-val');

    const totalCircumference = 515; // 2 * PI * 82
    let progress = 0;

    const stages = [
      { at: 15, log: 'SYNCHRONIZING ORBITAL TELEMETRY...', status: 'CONNECTING', tagColor: '#00f3ff' },
      { at: 35, log: 'INITIALIZING THREE.JS WEBGL RENDER CORES...', status: 'RENDERING', tagColor: '#00f3ff' },
      { at: 60, log: 'CALIBRATING UNREALBLOOM & HDR SHADERS...', status: 'CALIBRATING', tagColor: '#ffaa00' },
      { at: 85, log: 'AUTHENTICATING PILOT CLEARANCE: daryl.created@gmail.com...', status: 'VERIFYING', tagColor: '#00ff88' },
      { at: 100, log: 'SYSTEMS 100% OPERATIONAL // FLIGHT CLEARANCE GRANTED', status: 'READY', tagColor: '#00ff88' }
    ];

    const generateHash = () => {
      const chars = '0123456789ABCDEF';
      let h = '0x';
      for (let i = 0; i < 4; i++) h += chars[Math.floor(Math.random() * chars.length)];
      return h + '-OMEGA-99';
    };

    const interval = setInterval(() => {
      // Advance progress
      progress += Math.floor(Math.random() * 8) + 4;
      if (progress > 100) progress = 100;

      // Update Gauge Bar (stroke-dashoffset from 515 to 0)
      if (gaugeBar) {
        const offset = totalCircumference - (totalCircumference * (progress / 100));
        gaugeBar.style.strokeDashoffset = offset;
      }

      if (percentNum) percentNum.textContent = `${progress}%`;
      if (linearFill) linearFill.style.width = `${progress}%`;
      if (hashVal && progress % 10 === 0) hashVal.textContent = generateHash();

      // Update current stage log & status
      for (let i = stages.length - 1; i >= 0; i--) {
        if (progress >= stages[i].at) {
          if (logText) logText.textContent = stages[i].log;
          if (statusTag) {
            statusTag.textContent = stages[i].status;
            statusTag.style.color = stages[i].tagColor;
            statusTag.style.borderColor = stages[i].tagColor;
          }
          break;
        }
      }

      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          loadingScreen.classList.add('fade-out');
          if (this.spaceAudio && this.spaceAudio.vibrate) {
            this.spaceAudio.vibrate(20);
          }
          setTimeout(() => {
            loadingScreen.style.display = 'none';
          }, 650);
        }, 350);
      }
    }, 45);
  }

  animate(timestamp) {
    requestAnimationFrame(this.animate);
    if (!this.lastTime) this.lastTime = timestamp;
    let dt = (timestamp - this.lastTime) / 1000;
    if (isNaN(dt) || dt <= 0 || dt > 0.1) dt = 0.016;
    this.lastTime = timestamp;

    try {
      this.spaceGameManager.update(dt);
    } catch (err) {
      console.error('Game update error (frame survived):', err);
    }
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

window.orbitalVanguardApp = new OrbitalVanguardApp();

