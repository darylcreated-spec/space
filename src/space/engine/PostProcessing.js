import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export class PostProcessing {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    // Detect mobile device (phones, tablets, touch devices)
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 1024 || ('ontouchstart' in window && window.innerWidth < 1024);

    const savedQuality = localStorage.getItem('orbital_vanguard_graphics_quality');
    // NEVER enable bloom on mobile devices by default — UnrealBloomPass causes black canvas on mobile WebGL GPUs
    const useBloom = !this.isMobile && (savedQuality ? savedQuality === 'high' : true);

    if (useBloom) {
      this._initComposer();
    } else {
      this.composer = null;
    }

    window.addEventListener('resize', this.onResize.bind(this));
  }

  _initComposer() {
    if (this.isMobile) {
      this.composer = null;
      return;
    }
    try {
      this.composer = new EffectComposer(this.renderer);
      const renderPass = new RenderPass(this.scene, this.camera);
      this.composer.addPass(renderPass);

      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.7,  // bloom strength
        0.4,  // radius
        0.05  // threshold
      );
      this.composer.addPass(this.bloomPass);
    } catch (e) {
      console.warn('EffectComposer init fallback to direct WebGL render:', e);
      this.composer = null;
    }
  }

  setGraphicsQuality(level) {
    if (level === 'low' || this.isMobile) {
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
    }
  }

  render() {
    if (this.composer && !this.isMobile) {
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
