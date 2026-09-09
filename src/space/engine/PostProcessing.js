import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

// AAA Cinematic Post-Processing Shader (Graviton Lensing, Cavity Ambient Occlusion, Optical Dispersion, Filmic Contrast)
const AAACinematicShader = {
  name: 'AAACinematicShader',
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0.0 },
    uBoost: { value: 0.0 },
    uAberration: { value: 0.0006 },
    uVignette: { value: 0.5 },
    uGrainIntensity: { value: 0.005 },
    uQuality: { value: 3.0 }, // 1.0 = low, 2.0 = high, 3.0 = ultra
    uResolution: { value: new THREE.Vector2(1920, 1080) },
    uGravitonActive: { value: 0.0 },
    uGravitonCenter: { value: new THREE.Vector2(0.5, 0.5) },
    uGravitonRadius: { value: 0.22 },
    uGravitonStrength: { value: 0.08 },
    uCavityOcclusion: { value: 0.35 }
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
    uniform vec2 uResolution;
    uniform float uGravitonActive;
    uniform vec2 uGravitonCenter;
    uniform float uGravitonRadius;
    uniform float uGravitonStrength;
    uniform float uCavityOcclusion;
    varying vec2 vUv;

    void main() {
      vec2 uv = vUv;
      float aspect = uResolution.x / max(1.0, uResolution.y);

      // 0. Graviton Lensing / Schwarzschild Spacetime Deflection
      float eventHorizon = 0.0;
      if (uGravitonActive > 0.01) {
        vec2 gDelta = uv - uGravitonCenter;
        gDelta.x *= aspect;
        float gDist = length(gDelta);
        float rMax = uGravitonRadius * 2.6;
        if (gDist < rMax && gDist > 0.002) {
          float re = uGravitonRadius * 0.7;
          float deflection = (re * re) / (gDist + 0.015) * uGravitonStrength;
          float fade = smoothstep(rMax, re * 0.5, gDist);
          vec2 normDelta = normalize(gDelta);
          normDelta.x /= aspect;
          uv -= normDelta * deflection * fade;

          // Black hole event horizon core
          if (gDist < re * 0.38) {
            eventHorizon = 1.0 - smoothstep(re * 0.15, re * 0.38, gDist);
          }
        }
      }

      vec2 center = vec2(0.5, 0.5);
      vec2 toCenter = uv - center;
      float dist = length(toCenter);

      // 1. Subtle Hyper-Boost Warp
      if (uBoost > 0.01) {
        float warp = pow(dist, 2.0) * uBoost * 0.025;
        uv -= toCenter * warp;
      }

      // 2. Micro Chromatic Aberration & Graviton Prismatic Dispersion
      float ab = uAberration + (uBoost * 0.004);
      if (uGravitonActive > 0.01) {
        ab += 0.0018;
      }
      vec2 uvR = uv + toCenter * ab;
      vec2 uvG = uv;
      vec2 uvB = uv - toCenter * ab;

      float r = texture2D(tDiffuse, uvR).r;
      float g = texture2D(tDiffuse, uvG).g;
      float b = texture2D(tDiffuse, uvB).b;
      vec3 color = vec3(r, g, b);

      // 3. Deep Geometric Cavity & Crevice Ambient Occlusion (Micro-contrast)
      if (uCavityOcclusion > 0.01 && uQuality >= 2.0) {
        vec2 texel = 1.0 / uResolution;
        vec3 cN = texture2D(tDiffuse, uv + vec2(0.0, texel.y * 1.8)).rgb;
        vec3 cS = texture2D(tDiffuse, uv - vec2(0.0, texel.y * 1.8)).rgb;
        vec3 cE = texture2D(tDiffuse, uv + vec2(texel.x * 1.8, 0.0)).rgb;
        vec3 cW = texture2D(tDiffuse, uv - vec2(texel.x * 1.8, 0.0)).rgb;

        const vec3 luma = vec3(0.299, 0.587, 0.114);
        float lumC = dot(color, luma);
        float lumN = (dot(cN, luma) + dot(cS, luma) + dot(cE, luma) + dot(cW, luma)) * 0.25;

        float cavity = clamp((lumN - lumC) * 3.2, 0.0, 1.0);
        color *= (1.0 - cavity * uCavityOcclusion);
      }

      // 4. Subtle Vignette
      if (uVignette > 0.0) {
        float vignette = smoothstep(1.3, 0.5, dist * uVignette);
        color *= mix(0.88, 1.0, vignette);
      }

      // 5. Filmic Contrast & Tone Balance
      color = clamp(color, 0.0, 1.0);
      vec3 sCurve = color * color * (3.0 - 2.0 * color);
      color = mix(color, sCurve, 0.22);

      // 6. Singularity Event Horizon Absorption
      if (eventHorizon > 0.001) {
        color = mix(color, vec3(0.0, 0.005, 0.015), eventHorizon * 0.95);
      }

      gl_FragColor = vec4(color, 1.0);
    }
  `
};

import { deviceManager } from './DeviceManager.js';

export class PostProcessing {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    this.deviceManager = deviceManager;
    const profile = deviceManager.getProfile();
    this.isMobile = profile.isMobile;

    const savedQuality = localStorage.getItem('orbital_vanguard_graphics_quality');
    this.quality = savedQuality || deviceManager.getRecommendedQuality();

    this.boostAmount = 0.0;
    this.targetBoost = 0.0;
    this.time = 0;
    this.composer = null;
    this.cinematicPass = null;
    this.fpsDropStreak = 0;
    this.fallbackDirectCooldown = 0;

    // Graviton Lensing Spacetime Distortion Parameters
    this.gravitonActive = false;
    this.gravitonCenter = new THREE.Vector2(0.5, 0.5);
    this.gravitonRadius = 0.22;
    this.gravitonStrength = 0.08;

    if (this.quality !== 'low') {
      this._initComposer();
    }

    // Subscribe to dynamic adaptive scaling
    deviceManager.adaptiveScaler.onQualityChange((newQuality) => {
      this.setGraphicsQuality(newQuality);
    });

    window.addEventListener('resize', this.onResize.bind(this));
  }

  setGravitonLens(screenUV = null, radius = 0.22, strength = 0.08) {
    if (screenUV) {
      this.gravitonActive = true;
      this.gravitonCenter.set(screenUV.x, screenUV.y);
      this.gravitonRadius = radius;
      this.gravitonStrength = strength;
    } else {
      this.gravitonActive = false;
    }
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

      this.cinematicPass = new ShaderPass(AAACinematicShader);
      this.composer.addPass(this.cinematicPass);

      const outputPass = new OutputPass();
      this.composer.addPass(outputPass);

      console.log(`[PostFX] AAA Cinematic Composer active — Bloom res: ${bloomRes.x}x${bloomRes.y}, strength: ${params.strength}`);
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

  update(dt, playerShip, rawDt = dt) {
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

    if (this.cinematicPass && this.cinematicPass.uniforms) {
      const u = this.cinematicPass.uniforms;
      u.uTime.value = this.time;
      u.uBoost.value = this.boostAmount;
      u.uResolution.value.set(window.innerWidth, window.innerHeight);
      u.uQuality.value = this.quality === 'ultra' ? 3.0 : (this.quality === 'high' ? 2.0 : 1.0);
      u.uCavityOcclusion.value = this.quality === 'ultra' ? 0.45 : (this.quality === 'high' ? 0.35 : 0.0);
      u.uGravitonActive.value = this.gravitonActive ? 1.0 : 0.0;
      u.uGravitonCenter.value.copy(this.gravitonCenter);
      u.uGravitonRadius.value = this.gravitonRadius;
      u.uGravitonStrength.value = this.gravitonStrength;
    }

    // ── 🛡️ 60 FPS Mobile Performance Watchdog ──
    // If consecutive frames take longer than 28ms (< 35fps), temporarily bypass to direct render
    const checkDt = (rawDt && !isNaN(rawDt) && rawDt > 0) ? rawDt : dt;
    if (this.fallbackDirectCooldown > 0) {
      this.fallbackDirectCooldown -= dt;
    } else if (checkDt > 0.028 && this.composer && this.quality !== 'low') {
      this.fpsDropStreak++;
      if (this.fpsDropStreak > 15) { // ~0.5s of low FPS or hitch
        console.warn(`[PostFX] Low mobile FPS detected (${(1/checkDt).toFixed(0)} FPS) — optimizing to direct WebGL pipeline.`);
        this.setGraphicsQuality('low');
        this.fpsDropStreak = 0;
        this.fallbackDirectCooldown = 8.0; // Keep direct render for 8s
      }
    } else if (checkDt < 0.018) {
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
      if (this.cinematicPass && this.cinematicPass.uniforms) {
        this.cinematicPass.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
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
