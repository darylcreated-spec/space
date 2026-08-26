import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

// AAA Cinematic Post-Processing Shader (Anamorphic Flares, Chromatic Aberration, 35mm Film Grain, ACES S-Curve, Hyper-Boost Warp)
const AAACinematicShader = {
  name: 'AAACinematicShader',
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0.0 },
    uBoost: { value: 0.0 },
    uAberration: { value: 0.0035 },
    uVignette: { value: 0.85 },
    uGrainIntensity: { value: 0.028 },
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

    // High-frequency pseudo-random noise for 35mm film grain
    float rand(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 uv = vUv;
      vec2 center = vec2(0.5, 0.5);
      vec2 toCenter = uv - center;
      float dist = length(toCenter);

      // 1. Hyper-Boost Radial Warp Tunnel
      if (uBoost > 0.01) {
        float warp = pow(dist, 2.2) * uBoost * 0.055;
        uv -= toCenter * warp;
      }

      // 2. High-Precision Chromatic Aberration
      float ab = uAberration + (uBoost * 0.018);
      vec2 uvR = uv + toCenter * ab;
      vec2 uvG = uv;
      vec2 uvB = uv - toCenter * ab;

      float r = texture2D(tDiffuse, uvR).r;
      float g = texture2D(tDiffuse, uvG).g;
      float b = texture2D(tDiffuse, uvB).b;
      vec3 color = vec3(r, g, b);

      // 3. Anamorphic Horizontal Optical Streaks (High-Quality Ultra Mode)
      if (uQuality >= 2.0) {
        vec3 flare = vec3(0.0);
        for (float i = 1.0; i <= 5.0; i++) {
          float offset = i * 0.0035;
          vec3 s1 = texture2D(tDiffuse, vec2(uv.x + offset, uv.y)).rgb;
          vec3 s2 = texture2D(tDiffuse, vec2(uv.x - offset, uv.y)).rgb;
          vec3 l1 = max(vec3(0.0), s1 - 0.72);
          vec3 l2 = max(vec3(0.0), s2 - 0.72);
          flare += (l1 + l2) * (1.0 / i);
        }
        // Subtle optical tint: cyan-blue anamorphic flare
        color += flare * vec3(0.2, 0.65, 1.0) * 0.38;
      }

      // 4. Cinematic Vignette
      float vignette = smoothstep(1.15, 0.35, dist * uVignette);
      color *= mix(0.72, 1.0, vignette);

      // 5. 35mm Organic Film Grain
      if (uGrainIntensity > 0.0) {
        float grain = (rand(uv + fract(uTime * 19.3)) - 0.5) * uGrainIntensity;
        color += grain;
      }

      // 6. Contrast S-Curve Tone Mapping
      color = clamp(color, 0.0, 1.0);
      color = color * color * (3.0 - 2.0 * color);

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

    const savedQuality = localStorage.getItem('orbital_vanguard_graphics_quality');
    // Default mobile to 'high' (optimized half-res bloom) or 'ultra' on desktop
    this.quality = savedQuality || (this.isMobile ? 'high' : 'ultra');

    this.boostAmount = 0.0;
    this.targetBoost = 0.0;
    this.time = 0;

    // Dynamic FPS Auto-Scaler to prevent frame sticking on budget devices
    this.perfDropCount = 0;
    this.autoScaleCooldown = 0;

    this._initComposer();
    window.addEventListener('resize', this.onResize.bind(this));
  }

  _getBloomScale() {
    if (this.isMobile) return 0.5; // 50% resolution bloom on mobile = 4x less GPU fillrate with identical glow
    if (this.quality === 'ultra') return 0.75;
    if (this.quality === 'high') return 0.5;
    return 0.35;
  }

  _initComposer() {
    try {
      this.composer = new EffectComposer(this.renderer);
      const renderPass = new RenderPass(this.scene, this.camera);
      this.composer.addPass(renderPass);

      const bloomScale = this._getBloomScale();
      const bloomRes = new THREE.Vector2(
        Math.max(256, Math.floor(window.innerWidth * bloomScale)),
        Math.max(256, Math.floor(window.innerHeight * bloomScale))
      );

      // UnrealBloomPass: Half-resolution buffer cuts fill-rate by 75% while keeping smooth optical glow
      const bloomStrength  = this.quality === 'ultra' ? 1.2  : (this.quality === 'high' ? 0.95 : 0.6);
      const bloomRadius    = this.quality === 'ultra' ? 0.85 : (this.quality === 'high' ? 0.75 : 0.55);
      const bloomThreshold = this.quality === 'ultra' ? 0.18 : (this.quality === 'high' ? 0.20 : 0.28);

      this.bloomPass = new UnrealBloomPass(bloomRes, bloomStrength, bloomRadius, bloomThreshold);
      this.composer.addPass(this.bloomPass);

      // AAA Cinematic Shader Pass: chromatic aberration, anamorphic flares, film grain, vignette, boost warp
      this.cinemaPass = new ShaderPass(AAACinematicShader);
      const shaderQuality = this.isMobile ? 1.0 : (this.quality === 'ultra' ? 3.0 : (this.quality === 'high' ? 2.0 : 1.0));
      this.cinemaPass.uniforms.uQuality.value = shaderQuality;
      this.cinemaPass.uniforms.uGrainIntensity.value = (this.isMobile || this.quality === 'low') ? 0.0 : (this.quality === 'ultra' ? 0.022 : 0.012);
      this.cinemaPass.uniforms.uVignette.value = 0.92;
      this.cinemaPass.uniforms.uAberration.value = this.isMobile ? 0.0015 : 0.0028;
      this.composer.addPass(this.cinemaPass);

      // Output Tone Mapping Pass
      const outputPass = new OutputPass();
      this.composer.addPass(outputPass);

      console.log(`[PostFX] EffectComposer initialized — Bloom res: ${bloomRes.x}x${bloomRes.y} (scale: ${bloomScale}), quality: ${this.quality}, mobile: ${this.isMobile}`);
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
      } else {
        const bloomScale = this._getBloomScale();
        if (this.bloomPass) {
          this.bloomPass.resolution.set(
            Math.max(256, Math.floor(window.innerWidth * bloomScale)),
            Math.max(256, Math.floor(window.innerHeight * bloomScale))
          );
          this.bloomPass.strength  = level === 'ultra' ? 1.2  : (level === 'high' ? 0.95 : 0.6);
          this.bloomPass.radius    = level === 'ultra' ? 0.85 : (level === 'high' ? 0.75 : 0.55);
          this.bloomPass.threshold = level === 'ultra' ? 0.18 : (level === 'high' ? 0.20 : 0.28);
        }
        if (this.cinemaPass) {
          const shaderQuality = this.isMobile ? 1.0 : (level === 'ultra' ? 3.0 : (level === 'high' ? 2.0 : 1.0));
          this.cinemaPass.uniforms.uQuality.value = shaderQuality;
          this.cinemaPass.uniforms.uGrainIntensity.value = (this.isMobile || level === 'low') ? 0.0 : (level === 'ultra' ? 0.022 : 0.012);
        }
      }
    }
  }

  update(dt, playerShip) {
    this.time += dt;

    if (playerShip && playerShip.isBoosting) {
      this.targetBoost = 1.0;
    } else {
      this.targetBoost = 0.0;
    }

    this.boostAmount = THREE.MathUtils.lerp(this.boostAmount, this.targetBoost, dt * 8.0);

    if (this.cinemaPass && this.cinemaPass.uniforms) {
      this.cinemaPass.uniforms.uTime.value = this.time;
      this.cinemaPass.uniforms.uBoost.value = this.boostAmount;
    }

    // Dynamic FPS Stutter Guard: If frame time exceeds 38ms (~26 FPS) consecutively, dynamically adapt
    if (this.autoScaleCooldown > 0) {
      this.autoScaleCooldown -= dt;
    } else if (dt > 0.038 && this.composer && this.quality !== 'low') {
      this.perfDropCount++;
      if (this.perfDropCount > 60) { // ~2 seconds of low framerate
        console.warn(`[PostFX] Low FPS detected (${(1/dt).toFixed(0)} FPS) — auto-adapting graphics quality for smooth frame pacing.`);
        if (this.quality === 'ultra') this.setGraphicsQuality('high');
        else if (this.quality === 'high') this.setGraphicsQuality('medium');
        else this.setGraphicsQuality('low');
        this.perfDropCount = 0;
        this.autoScaleCooldown = 10.0; // Don't scale down again for 10s
      }
    } else if (dt < 0.020) {
      this.perfDropCount = Math.max(0, this.perfDropCount - 1);
    }
  }

  onResize() {
    if (this.composer) {
      this.composer.setSize(window.innerWidth, window.innerHeight);
      if (this.bloomPass) {
        const bloomScale = this._getBloomScale();
        this.bloomPass.resolution.set(
          Math.max(256, Math.floor(window.innerWidth * bloomScale)),
          Math.max(256, Math.floor(window.innerHeight * bloomScale))
        );
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
