import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import * as THREE from 'three';

export class PostProcessing {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // Balanced Neon Bloom pass with low threshold so standard meshes & glowing beams render brilliantly
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.8,  // bloom strength
      0.4,  // radius
      0.05  // threshold (renders all standard & emissive meshes clearly)
    );
    this.composer.addPass(this.bloomPass);

    window.addEventListener('resize', this.onResize.bind(this));
  }

  onResize() {
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  render() {
    // Render scene via composer or fallback to direct WebGL render
    try {
      this.composer.render();
    } catch (e) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}
