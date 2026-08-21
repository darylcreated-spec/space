import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export class PostProcessing {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    const savedQuality = localStorage.getItem('orbital_vanguard_graphics_quality');
    this.quality = savedQuality || 'high';

    this._initComposer();
    window.addEventListener('resize', this.onResize.bind(this));
  }

  _initComposer() {
    try {
      this.composer = new EffectComposer(this.renderer);
      const renderPass = new RenderPass(this.scene, this.camera);
      this.composer.addPass(renderPass);

      // UnrealBloomPass: Subtle, crisp glow ONLY for intense energy cores and explosions (zero blinding washout)
      const res = new THREE.Vector2(window.innerWidth, window.innerHeight);
      this.bloomPass = new UnrealBloomPass(
        res,
        0.45, // Subtle, crisp bloom strength
        0.25, // Tight radius
        0.85  // High luminance threshold so ship hulls, planet, and space remain crystal clear
      );
      this.composer.addPass(this.bloomPass);

      const outputPass = new OutputPass();
      this.composer.addPass(outputPass);
    } catch (e) {
      console.warn('EffectComposer init fallback to direct WebGL render:', e);
      this.composer = null;
    }
  }

  setGraphicsQuality(level) {
    this.quality = level;
    if (level === 'low') {
      this.composer = null;
    } else {
      if (!this.composer) {
        this._initComposer();
      }
    }
  }

  onResize() {
    if (this.composer) {
      this.composer.setSize(window.innerWidth, window.innerHeight);
      if (this.bloomPass) {
        this.bloomPass.resolution.set(window.innerWidth, window.innerHeight);
      }
    }
  }

  render() {
    if (this.composer && this.quality !== 'low') {
      try {
        this.composer.render();
      } catch (e) {
        this.composer = null;
        this.renderer.render(this.scene, this.camera);
      }
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }
}
