import * as THREE from 'three';

// PostProcessing is disabled on mobile (WebGL 1 / limited VRAM)
// Falls back to direct renderer on mobile, bloom on desktop
let EffectComposer, RenderPass, UnrealBloomPass;
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

export class PostProcessing {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.composer = null;
    this.useComposer = false;

    if (!isMobile) {
      try {
        // Dynamically import bloom only on desktop
        import('three/examples/jsm/postprocessing/EffectComposer.js').then(({ EffectComposer: EC }) => {
          import('three/examples/jsm/postprocessing/RenderPass.js').then(({ RenderPass: RP }) => {
            import('three/examples/jsm/postprocessing/UnrealBloomPass.js').then(({ UnrealBloomPass: UBP }) => {
              try {
                this.composer = new EC(this.renderer);
                this.composer.addPass(new RP(this.scene, this.camera));
                this.composer.addPass(new UBP(
                  new THREE.Vector2(window.innerWidth, window.innerHeight),
                  0.7,  // strength
                  0.4,  // radius
                  0.05  // threshold
                ));
                this.useComposer = true;
                window.addEventListener('resize', () => {
                  if (this.composer) this.composer.setSize(window.innerWidth, window.innerHeight);
                });
              } catch (e) {
                console.warn('Bloom composer init failed, using direct render', e);
              }
            });
          });
        });
      } catch (e) {
        console.warn('PostProcessing skipped:', e);
      }
    }
  }

  render() {
    try {
      if (this.useComposer && this.composer) {
        this.composer.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }
    } catch (e) {
      try { this.renderer.render(this.scene, this.camera); } catch (e2) {}
    }
  }
}
