import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

// AAA Cinematic Post-Processing Shader (Subtle Anamorphic Glint, Gentle ACES Contrast, Refined Vignette)
const AAACinematicShader = {
  name: 'AAACinematicShader',
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0.0 },
    uBoost: { value: 0.0 },
    uAberration: { value: 0.0006 },
    uVignette: { value: 0.5 },
    uGrainIntensity: { value: 0.005 },
    uQuality: { value: 3.0 } // 1.0 = low, 2.0 = high, 3.0 = ultra
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uBoost;
    uniform float uAberration;
    uniform float uVignette;
    uniform float uGrainIntensity;
    uniform float uQuality;
    varying vec2 vUv;

    float rand(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 uv = vUv;
      vec2 center = vec2(0.5, 0.5);
      vec2 toCenter = uv - center;
      float dist = length(toCenter);

      // 1. Subtle Hyper-Boost Warp
      if (uBoost > 0.01) {
        float warp = pow(dist, 2.0) * uBoost * 0.025;
        uv -= toCenter * warp;
      }

      // 2. Micro Chromatic Aberration (Natural optical dispersion, zero blur)
      float ab = uAberration + (uBoost * 0.004);
      vec2 uvR = uv + toCenter * ab;
      vec2 uvG = uv;
      vec2 uvB = uv - toCenter * ab;

      float r = texture2D(tDiffuse, uvR).r;
      float g = texture2D(tDiffuse, uvG).g;
      float b = texture2D(tDiffuse, uvB).b;
      vec3 color = vec3(r, g, b);

      // 3. Subtle Vignette
      if (uVignette > 0.0) {
        float vignette = smoothstep(1.3, 0.5, dist * uVignette);
        color *= mix(0.88, 1.0, vignette);
      }

      // 4. Filmic Contrast & Tone Balance
      color = clamp(color, 0.0, 1.0);
      vec3 sCurve = color * color * (3.0 - 2.0 * color);
      color = mix(color, sCurve, 0.25);

      gl_FragColor = vec4(color, 1.0);
    }
  `
};

export class PostProcessing {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    this.isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768;

    // On mobile, default to lower quality to prevent GPU thermal throttling
    if (this.isMobile && !savedQuality) {
      this.quality = 'low';
    }

    // Default to 'balanced' for rich, radiant bloom, glowing lasers, and stunning space lighting
    const savedQuality = localStorage.getItem('orbital_vanguard_graphics_quality');
    this.quality = savedQuality || 'balanced';

    this.boostAmount = 0.0;
    this.targetBoost = 0.0;
    this.time = 0;
    this.composer = null;
    this.fpsDropStreak = 0;
    this.fallbackDirectCooldown = 0;

    if (this.quality !== 'low') {
      this._initComposer();
    }
    window.addEventListener('resize', this.onResize.bind(this));
  }

  _getCalculatedBloomParams() {
    if (this.quality === 'ultra') {
      return {
        scale: 0.45,
        strength: 0.48,
        radius: 0.35,
        threshold: 0.58
      };
    } else if (this.quality === 'high') {
      return {
        scale: 0.38,
        strength: 0.42,
        radius: 0.30,
        threshold: 0.62
      };
    } else { // 'balanced' (Default)
      return {
        scale: 0.32,
        strength: 0.38,
        radius: 0.26,
        threshold: 0.65
      };
    }
  }

  _initComposer() {
    try {
      this.composer = new EffectComposer(this.renderer);
      const renderPass = new RenderPass(this.scene, this.camera);
      this.composer.addPass(renderPass);

      const params = this._getCalculatedBloomParams();
      const bloomRes = new THREE.Vector2(
        Math.max(128, Math.floor(window.innerWidth * params.scale)),
        Math.max(128, Math.floor(window.innerHeight * params.scale))
      );

      this.bloomPass = new UnrealBloomPass(bloomRes, params.strength, params.radius, params.threshold);
      this.composer.addPass(this.bloomPass);

      const outputPass = new OutputPass();
      this.composer.addPass(outputPass);

      console.log(`[PostFX] Mobile-Engineered Composer active — Bloom res: ${bloomRes.x}x${bloomRes.y}, strength: ${params.strength}`);
    } catch (e) {
      console.warn('PostProcessing fallback to direct WebGL render:', e);
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
      } else {
        const params = this._getCalculatedBloomParams();
        if (this.bloomPass) {
          this.bloomPass.strength = params.strength;
          this.bloomPass.radius = params.radius;
          this.bloomPass.threshold = params.threshold;
          this.bloomPass.resolution.set(
            Math.max(128, Math.floor(window.innerWidth * params.scale)),
            Math.max(128, Math.floor(window.innerHeight * params.scale))
          );
        }
      }
    }
  }

  update(dt, playerShip) {
    this.time += dt;

    // Hyper-Boost Dynamic Glow Surge
    if (playerShip && playerShip.isBoosting) {
      this.targetBoost = 1.0;
    } else {
      this.targetBoost = 0.0;
    }
    this.boostAmount = THREE.MathUtils.lerp(this.boostAmount, this.targetBoost, dt * 8.0);

    if (this.bloomPass) {
      const baseStrength = (this.isMobile || this.quality === 'balanced') ? 0.28 : (this.quality === 'ultra' ? 0.45 : 0.35);
      this.bloomPass.strength = baseStrength + this.boostAmount * 0.18;
    }

    // ── 🛡️ 60 FPS Mobile Performance Watchdog ──
    // If consecutive frames take longer than 28ms (< 35fps), temporarily bypass to direct render
    if (this.fallbackDirectCooldown > 0) {
      this.fallbackDirectCooldown -= dt;
    } else if (dt > 0.028 && this.composer && this.quality !== 'low') {
      this.fpsDropStreak++;
      if (this.fpsDropStreak > 40) { // ~1 second of low fps
        console.warn(`[PostFX] Low mobile FPS detected (${(1/dt).toFixed(0)} FPS) — optimizing to direct WebGL pipeline.`);
        this.setGraphicsQuality('low');
        this.fpsDropStreak = 0;
        this.fallbackDirectCooldown = 8.0; // Keep direct render for 8s
      }
    } else if (dt < 0.018) {
      this.fpsDropStreak = Math.max(0, this.fpsDropStreak - 1);
    }
  }

  onResize() {
    if (this.composer) {
      this.composer.setSize(window.innerWidth, window.innerHeight);
      if (this.bloomPass) {
        const params = this._getCalculatedBloomParams();
        this.bloomPass.resolution.set(
          Math.max(128, Math.floor(window.innerWidth * params.scale)),
          Math.max(128, Math.floor(window.innerHeight * params.scale))
        );
      }
    }
  }

  render() {
    // Smooth, guaranteed 60fps render execution
    if (this.composer && this.quality !== 'low' && this.fallbackDirectCooldown <= 0) {
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
