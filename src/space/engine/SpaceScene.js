import * as THREE from 'three';

export class SpaceScene {
  constructor(container) {
    this.container = typeof container === 'string' ? document.getElementById(container) : container;
    if (!this.container) {
      this.container = document.getElementById('canvas-container') || document.body;
    }

    this.isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768;

    // 3D Deep Space Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x03050a); // Deep obsidian space void
    this.scene.fog = new THREE.FogExp2(0x03050a, 0.003);

    // Perspective Camera
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);

    this.cameraMode = 'isometric';
    this.targetCameraPos = new THREE.Vector3();
    this.targetLookAt = new THREE.Vector3();
    this.currentCamLookAt = new THREE.Vector3(0, -1, -15);
    this.bossIntroTimer = 0;
    this.setCameraMode('isometric');
    this.camera.position.copy(this.targetCameraPos);
    this.camera.lookAt(this.targetLookAt);

    // WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isMobile,
      alpha: false,
      precision: this.isMobile ? 'mediump' : 'highp',
      stencil: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.top = '0';
    this.renderer.domElement.style.left = '0';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.zIndex = '1';
    this.renderer.domElement.style.touchAction = 'none';

    this.container.appendChild(this.renderer.domElement);

    // WebGL Context Recovery
    this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      console.warn('WebGL context lost — preserving game state for auto-recovery...');
    }, false);

    this.renderer.domElement.addEventListener('webglcontextrestored', () => {
      console.log('WebGL context restored — re-initializing environment...');
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isMobile ? 1.0 : 1.5));
      this.starTexture = this.createGlowingStarTexture();
      if (this.starField && this.starField.material) {
        this.starField.material.map = this.starTexture;
        this.starField.material.needsUpdate = true;
      }
    }, false);

    // Procedural Radial Glow Star Texture
    this.starTexture = this.createGlowingStarTexture();

    // Lighting setup
    this.setupLighting();

    // Build Deep Space Environment (No grid, no planet)
    this.buildDeepSpaceEnvironment();

    // Entity groups
    this.entitiesGroup = new THREE.Group();
    this.scene.add(this.entitiesGroup);

    this.projectilesGroup = new THREE.Group();
    this.scene.add(this.projectilesGroup);

    this.shakeIntensity = 0;
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  createGlowingStarTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.25, 'rgba(255, 255, 255, 0.85)');
    grad.addColorStop(0.55, 'rgba(0, 243, 255, 0.35)');
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    return new THREE.CanvasTexture(canvas);
  }

  setupLighting() {
    const ambient = new THREE.AmbientLight(0x223355, 0.85);
    this.scene.add(ambient);

    // Primary High-Dynamic-Range Sun Key Light
    this.sunLight = new THREE.DirectionalLight(0xffffff, 2.8);
    this.sunLight.position.set(45, 60, 50);
    this.scene.add(this.sunLight);

    // Secondary Cool Celestial Rim Light
    this.cyanRimLight = new THREE.DirectionalLight(0x00f3ff, 1.4);
    this.cyanRimLight.position.set(-50, -20, -30);
    this.scene.add(this.cyanRimLight);

    // Warm Plasma Engine Back-Scatter Light
    this.warmBackLight = new THREE.DirectionalLight(0xff0066, 0.9);
    this.warmBackLight.position.set(20, -30, 40);
    this.scene.add(this.warmBackLight);

    // Dynamic Flash Point Light for laser salvos and explosions
    this.dynamicFlashLight = new THREE.PointLight(0x00f3ff, 0, 50);
    this.dynamicFlashLight.position.set(0, 0, 10);
    this.scene.add(this.dynamicFlashLight);

    // ── 🌌 High-Fidelity HDR Environment Map for Mirror Metallic Reflections ──
    try {
      const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
      pmremGenerator.compileEquirectangularShader();

      const envCanvas = document.createElement('canvas');
      envCanvas.width = 512;
      envCanvas.height = 256;
      const envCtx = envCanvas.getContext('2d');

      const envGrad = envCtx.createLinearGradient(0, 0, 512, 256);
      envGrad.addColorStop(0.0, '#040b18');
      envGrad.addColorStop(0.3, '#10254c');
      envGrad.addColorStop(0.6, '#381044');
      envGrad.addColorStop(0.85, '#0a2238');
      envGrad.addColorStop(1.0, '#030610');
      envCtx.fillStyle = envGrad;
      envCtx.fillRect(0, 0, 512, 256);

      // Specular Star Clusters & Glistening Nebula Points
      for (let i = 0; i < 70; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 256;
        const r = 1.0 + Math.random() * 2.5;
        envCtx.beginPath();
        envCtx.arc(x, y, r, 0, Math.PI * 2);
        envCtx.fillStyle = Math.random() < 0.5 ? '#00f3ff' : (Math.random() < 0.75 ? '#ffffff' : '#ff0077');
        envCtx.shadowColor = envCtx.fillStyle;
        envCtx.shadowBlur = 6;
        envCtx.fill();
      }

      const envTexture = new THREE.CanvasTexture(envCanvas);
      envTexture.mapping = THREE.EquirectangularReflectionMapping;
      const envMap = pmremGenerator.fromEquirectangular(envTexture).texture;
      this.scene.environment = envMap;
      pmremGenerator.dispose();
    } catch(e) {
      console.warn('Could not generate PMREM envMap:', e);
    }
  }

  triggerDynamicLightFlash(pos, colorHex = 0x00f3ff, intensity = 4.5, duration = 0.12) {
    if (!this.dynamicFlashLight) return;
    this.dynamicFlashLight.color.setHex(colorHex);
    this.dynamicFlashLight.position.copy(pos);
    this.dynamicFlashLight.intensity = intensity;

    if (this._flashTimer) clearTimeout(this._flashTimer);
    this._flashTimer = setTimeout(() => {
      if (this.dynamicFlashLight) this.dynamicFlashLight.intensity = 0;
    }, duration * 1000);
  }

  createNebulaTexture(colorCenter, colorMid, colorEdge) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0.0, colorCenter);
    grad.addColorStop(0.35, colorMid);
    grad.addColorStop(0.7, colorEdge);
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    return new THREE.CanvasTexture(canvas);
  }

  createGasGiantTexture(stops, stormHex = 'rgba(0, 243, 255, 0.45)') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    stops.forEach(([pos, color]) => grad.addColorStop(pos, color));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    for (let y = 20; y < 240; y += 16) {
      ctx.fillRect(0, y, 512, 2 + Math.sin(y * 0.25) * 2);
    }

    ctx.beginPath();
    ctx.ellipse(320, 110, 42, 18, 0.1, 0, Math.PI * 2);
    ctx.fillStyle = stormHex;
    ctx.fill();

    return new THREE.CanvasTexture(canvas);
  }

  createOceanicWorldTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Deep Oceanic Blue Gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0.0, '#03142e');
    grad.addColorStop(0.5, '#063970');
    grad.addColorStop(1.0, '#021024');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    // Continents & Archipelago Landmasses
    ctx.fillStyle = '#1e7b4c';
    const landBlobs = [
      [120, 90, 55, 35], [160, 120, 45, 28], [280, 80, 65, 40],
      [320, 130, 50, 30], [420, 100, 40, 25], [60, 150, 35, 20]
    ];
    landBlobs.forEach(([x, y, rx, ry]) => {
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0.2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Mountainous Terrain Ridges
    ctx.fillStyle = '#856138';
    landBlobs.forEach(([x, y, rx, ry]) => {
      ctx.beginPath();
      ctx.ellipse(x, y, rx * 0.45, ry * 0.45, 0.2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Swirling Cloud Vortices & Fronts
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.arc(60 + i * 55, 70 + Math.sin(i * 1.5) * 45, 22 + Math.cos(i) * 10, 0, Math.PI * 2);
      ctx.fill();
    }

    return new THREE.CanvasTexture(canvas);
  }

  createLunarMoonTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Regolith Lunar Basalt
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0.0, '#101216');
    grad.addColorStop(0.5, '#2c3038');
    grad.addColorStop(1.0, '#0d0f12');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    // Impact Craters
    for (let c = 0; c < 35; c++) {
      const cx = (c * 79) % 512;
      const cy = (c * 53) % 256;
      const cr = 6 + (c % 5) * 5;

      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.fillStyle = '#181a20';
      ctx.fill();
      ctx.strokeStyle = '#484d5a';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Crater Central Peak
      ctx.beginPath();
      ctx.arc(cx, cy, cr * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = '#656c7d';
      ctx.fill();
    }

    // Glowing Geothermal Energy Fissures
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(80, 50); ctx.lineTo(160, 110); ctx.lineTo(240, 95); ctx.lineTo(340, 160);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(200, 180); ctx.lineTo(290, 140); ctx.lineTo(410, 210);
    ctx.stroke();

    return new THREE.CanvasTexture(canvas);
  }

  createVolcanicTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Obsidian Crust
    ctx.fillStyle = '#0c0406';
    ctx.fillRect(0, 0, 512, 256);

    // Magma Seas & Rivers
    ctx.strokeStyle = '#ff3300';
    ctx.lineWidth = 6;
    for (let m = 0; m < 6; m++) {
      ctx.beginPath();
      ctx.moveTo(0, 40 + m * 38);
      ctx.bezierCurveTo(150, 20 + m * 40, 320, 80 + m * 35, 512, 50 + m * 38);
      ctx.stroke();
    }

    // Molten Lava Hotspots
    ctx.fillStyle = '#ffaa00';
    for (let h = 0; h < 12; h++) {
      const hx = (h * 93) % 512;
      const hy = (h * 67) % 256;
      ctx.beginPath();
      ctx.arc(hx, hy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(hx, hy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffaa00';
    }

    return new THREE.CanvasTexture(canvas);
  }

  createSolarStarTexture(primaryHex = '#ff8800', flareHex = '#ffffff') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(256, 128, 10, 256, 128, 240);
    grad.addColorStop(0.0, flareHex);
    grad.addColorStop(0.25, '#ffea00');
    grad.addColorStop(0.6, primaryHex);
    grad.addColorStop(0.85, '#cc2200');
    grad.addColorStop(1.0, '#550500');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    // Solar Convection Granules
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    for (let g = 0; g < 40; g++) {
      const gx = (g * 73) % 512;
      const gy = (g * 47) % 256;
      ctx.beginPath();
      ctx.arc(gx, gy, 8 + (g % 4) * 4, 0, Math.PI * 2);
      ctx.fill();
    }

    return new THREE.CanvasTexture(canvas);
  }

  createBlackHoleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Pitch Black Center
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 512, 256);

    // Swirling Relativistic Doppler Accretion Disk Bands
    const grad = ctx.createLinearGradient(0, 0, 512, 0);
    grad.addColorStop(0.0, '#ff2200'); // Redshifted port side
    grad.addColorStop(0.35, '#ff9900');
    grad.addColorStop(0.5, '#ffffff');  // Core photon ring
    grad.addColorStop(0.7, '#00e5ff');  // Blueshifted starboard side
    grad.addColorStop(1.0, '#9900ff');
    ctx.fillStyle = grad;

    for (let b = 0; b < 12; b++) {
      const y = 80 + b * 8;
      ctx.fillRect(0, y, 512, 4);
    }

    return new THREE.CanvasTexture(canvas);
  }

  createIceGiantTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0.0, '#041f2e');
    grad.addColorStop(0.2, '#0c4a6e');
    grad.addColorStop(0.4, '#00e5ff');
    grad.addColorStop(0.65, '#e0f7fa');
    grad.addColorStop(0.85, '#0284c7');
    grad.addColorStop(1.0, '#031724');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    // Diamond Ice Ridge Filaments
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    for (let y = 15; y < 245; y += 14) {
      ctx.fillRect(0, y, 512, 2.5 + Math.cos(y * 0.3) * 2);
    }

    return new THREE.CanvasTexture(canvas);
  }

  createCyberWorldTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Dark Carbon Alloy Base
    ctx.fillStyle = '#050b14';
    ctx.fillRect(0, 0, 512, 256);

    // Cyber Geometric Circuit Grid Lines
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 1.5;
    for (let x = 0; x < 512; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0); ctx.lineTo(x, 256);
      ctx.stroke();
    }
    for (let y = 0; y < 256; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y); ctx.lineTo(512, y);
      ctx.stroke();
    }

    // Glowing Golden Server City Core Hubs
    ctx.fillStyle = '#ffaa00';
    for (let x = 16; x < 512; x += 64) {
      for (let y = 12; y < 256; y += 48) {
        ctx.fillRect(x - 3, y - 3, 6, 6);
      }
    }

    return new THREE.CanvasTexture(canvas);
  }

  createQuantumVortexTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(256, 128, 5, 256, 128, 220);
    grad.addColorStop(0.0, '#ffffff');
    grad.addColorStop(0.2, '#00f3ff');
    grad.addColorStop(0.4, '#aa00ff');
    grad.addColorStop(0.65, '#ff0077');
    grad.addColorStop(0.85, '#ffb700');
    grad.addColorStop(1.0, '#000000');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    return new THREE.CanvasTexture(canvas);
  }

  createPlanetaryRingTexture(primaryHex = 'rgba(170, 220, 255, 0.75)', innerHex = 'rgba(60, 130, 210, 0.25)') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');

    // Cassini Division, Encke Gap, and Multi-Ringlet Transparency Gradients
    const grad = ctx.createLinearGradient(0, 0, 512, 0);
    grad.addColorStop(0.0, 'rgba(0, 0, 0, 0.0)');
    grad.addColorStop(0.12, innerHex); // C-Ring (Crepe Ring)
    grad.addColorStop(0.28, primaryHex); // B-Ring dense inner edge
    grad.addColorStop(0.58, primaryHex); // B-Ring outer edge
    grad.addColorStop(0.60, 'rgba(0, 0, 0, 0.0)'); // Cassini Division Gap
    grad.addColorStop(0.66, 'rgba(0, 0, 0, 0.0)');
    grad.addColorStop(0.68, primaryHex); // A-Ring inner
    grad.addColorStop(0.85, 'rgba(0, 0, 0, 0.0)'); // Encke Gap
    grad.addColorStop(0.88, primaryHex); // A-Ring outer
    grad.addColorStop(0.96, 'rgba(0, 0, 0, 0.0)'); // F-Ring diffuse boundary
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 32);

    // Fine ringlet micro-banding
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    for (let x = 60; x < 480; x += 6) {
      if (x > 300 && x < 340) continue; // Skip Cassini gap
      ctx.fillRect(x, 0, 2, 32);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  createShootingStarTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    const cy = 32;
    // Ultra-fine exponential plasma streak
    for (let x = 0; x < 512; x++) {
      const t = x / 512;
      const alphaT = Math.pow(1.0 - t, 2.8);
      const halfH = Math.max(1, Math.round(18 * (1.0 - t * 0.85)));

      const grad = ctx.createLinearGradient(x, cy - halfH, x, cy + halfH);
      grad.addColorStop(0.0, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(0.3, `rgba(0, 200, 255, ${0.4 * alphaT})`);
      grad.addColorStop(0.5, t < 0.06 ? `rgba(255, 255, 255, ${alphaT})` : `rgba(140, 230, 255, ${0.85 * alphaT})`);
      grad.addColorStop(0.7, `rgba(0, 200, 255, ${0.4 * alphaT})`);
      grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.fillRect(x, cy - halfH, 1, halfH * 2);
    }

    // Brilliant pinpoint incandescent nucleus
    const headGrad = ctx.createRadialGradient(12, cy, 0, 12, cy, 22);
    headGrad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    headGrad.addColorStop(0.2, 'rgba(200, 245, 255, 0.95)');
    headGrad.addColorStop(0.5, 'rgba(0, 220, 255, 0.45)');
    headGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(12, cy, 22, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  createPlanetTexture() {
    return this.createGasGiantTexture([
      [0.0, '#041226'], [0.2, '#08284d'], [0.35, '#00e1ff'],
      [0.48, '#0b3560'], [0.65, '#00a6ff'], [0.82, '#0d4078'], [1.0, '#031022']
    ]);
  }

  buildDeepSpaceEnvironment() {
    // 1. Realistic Spherical Starfield (Smooth Circular Radial Glow, No Cubes)
    const starCount = this.isMobile ? 1000 : 2200;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const r = 550 + Math.random() * 450;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2.0 * Math.random() - 1.0);

      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);

      const colorType = Math.random();
      if (colorType > 0.75) {
        starColors[i * 3] = 0.0; starColors[i * 3 + 1] = 0.95; starColors[i * 3 + 2] = 1.0;
      } else if (colorType > 0.5) {
        starColors[i * 3] = 1.0; starColors[i * 3 + 1] = 0.2; starColors[i * 3 + 2] = 0.7;
      } else if (colorType > 0.3) {
        starColors[i * 3] = 1.0; starColors[i * 3 + 1] = 0.85; starColors[i * 3 + 2] = 0.4;
      } else {
        starColors[i * 3] = 1.0; starColors[i * 3 + 1] = 1.0; starColors[i * 3 + 2] = 1.0;
      }
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: this.isMobile ? 1.8 : 2.5,
      map: this.starTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      alphaTest: 0.01,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.starField = new THREE.Points(starGeo, starMat);
    this.scene.add(this.starField);

    // 2. AAA Volumetric Deep-Space Nebula Cloud Layers
    this.nebulaGroup = new THREE.Group();
    const nebulaConfigs = [
      // Cyan Orion Filament
      { colorCenter: 'rgba(0, 243, 255, 0.45)', colorMid: 'rgba(0, 120, 255, 0.22)', colorEdge: 'rgba(0, 40, 180, 0.08)', pos: new THREE.Vector3(-180, 70, -420), scale: 260 },
      // Magenta / Violet Carina Filament
      { colorCenter: 'rgba(255, 0, 150, 0.42)', colorMid: 'rgba(170, 0, 255, 0.2)', colorEdge: 'rgba(70, 0, 140, 0.06)', pos: new THREE.Vector3(200, -60, -460), scale: 280 },
      // Electric Gold Solar Filament
      { colorCenter: 'rgba(255, 170, 0, 0.35)', colorMid: 'rgba(255, 80, 0, 0.16)', colorEdge: 'rgba(120, 30, 0, 0.04)', pos: new THREE.Vector3(0, 140, -490), scale: 320 }
    ];

    nebulaConfigs.forEach(cfg => {
      const tex = this.createNebulaTexture(cfg.colorCenter, cfg.colorMid, cfg.colorEdge);
      const nebMat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const sprite = new THREE.Sprite(nebMat);
      sprite.position.copy(cfg.pos);
      sprite.scale.set(cfg.scale, cfg.scale * 0.7, 1);
      this.nebulaGroup.add(sprite);
    });
    this.scene.add(this.nebulaGroup);

    // 3. AAA Distant Majestic Celestial Gas Giant & Equatorial Rings
    this.planetGroup = new THREE.Group();
    this.planetGroup.position.set(240, 85, -580);
    this.scene.add(this.planetGroup);

    // 4. Floating Interstellar Dust Particles (Realistic Round Glow)
    const dustCount = this.isMobile ? 250 : 600;
    const dustGeo = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustCount * 3);

    for (let i = 0; i < dustCount; i++) {
      dustPositions[i * 3] = (Math.random() - 0.5) * 140;
      dustPositions[i * 3 + 1] = (Math.random() - 0.5) * 90;
      dustPositions[i * 3 + 2] = -Math.random() * 200;
    }

    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));

    const dustMat = new THREE.PointsMaterial({
      color: 0x00f3ff,
      size: 0.65,
      map: this.starTexture,
      transparent: true,
      opacity: 0.75,
      alphaTest: 0.01,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.dustPoints = new THREE.Points(dustGeo, dustMat);
    this.scene.add(this.dustPoints);

    // 5. Periodic Deep-Space Comets & Shooting Stars
    this.comets = [];
    this.cometGroup = new THREE.Group();
    this.scene.add(this.cometGroup);
    this.cometSpawnTimer = 3.0;
  }

  triggerHyperspaceWarp(position) {
    const warpGroup = new THREE.Group();
    warpGroup.position.copy(position);

    // Flash sphere
    const flashGeo = new THREE.SphereGeometry(22.0, 16, 16);
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.98,
      blending: THREE.AdditiveBlending
    });
    const flash = new THREE.Mesh(flashGeo, flashMat);
    warpGroup.add(flash);

    // Spacetime Refraction Rings
    const ringGeo = new THREE.TorusGeometry(32.0, 1.2, 12, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    warpGroup.add(ring);

    // Radial Hyperspace Speed Streak Lines
    const streaks = [];
    for (let s = 0; s < 18; s++) {
      const angle = (s / 18) * Math.PI * 2;
      const streakGeo = new THREE.CylinderGeometry(0.08, 0.35, 30.0, 4);
      streakGeo.rotateX(Math.PI / 2);
      const streakMat = new THREE.MeshBasicMaterial({
        color: s % 2 === 0 ? 0x00f3ff : 0xffffff,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending
      });
      const streak = new THREE.Mesh(streakGeo, streakMat);
      streak.position.set(Math.cos(angle) * 12, Math.sin(angle) * 12, -10);
      streak.rotation.z = angle;
      warpGroup.add(streak);
      streaks.push({ mesh: streak, mat: streakMat });
    }

    this.scene.add(warpGroup);
    this.addScreenShake(1.6);

    // Cinematic Camera FOV Punch
    const originalFov = this.camera.fov;
    this.camera.fov = Math.min(90, originalFov + 18);
    this.camera.updateProjectionMatrix();

    let t = 0;
    const interval = setInterval(() => {
      t += 0.04;
      ring.scale.addScalar(0.24);
      flash.scale.addScalar(0.18);
      flashMat.opacity = Math.max(0, 0.98 - t * 1.6);
      ringMat.opacity = Math.max(0, 0.95 - t * 1.4);

      streaks.forEach(st => {
        st.mesh.scale.z += 0.35;
        st.mat.opacity = Math.max(0, 0.85 - t * 1.5);
      });

      // Smoothly recover camera FOV
      this.camera.fov += (originalFov - this.camera.fov) * 0.15;
      this.camera.updateProjectionMatrix();

      if (t >= 0.9) {
        clearInterval(interval);
        this.camera.fov = originalFov;
        this.camera.updateProjectionMatrix();
        this.scene.remove(warpGroup);
        flashGeo.dispose();
        flashMat.dispose();
        ringGeo.dispose();
        ringMat.dispose();
      }
    }, 20);
  }

  triggerBossIntroCamera(duration = 2.2) {
    this.bossIntroTimer = duration;
    this.bossIntroDuration = duration;
  }

  triggerKillCam(targetPos, duration = 2.4) {
    this.killCamTimer = duration;
    this.killCamDuration = duration;
    if (targetPos) this.killCamTarget.copy(targetPos);
    this.addScreenShake(1.2);
  }

  setCameraMode(mode) {
    this.cameraMode = mode;
    if (mode === 'isometric') {
      this.targetCameraPos.set(0, 14, 24);
      this.targetLookAt.set(0, -1, -15);
    } else if (mode === 'chase') {
      this.targetCameraPos.set(0, 5, 18);
      this.targetLookAt.set(0, 0, -30);
    } else if (mode === 'topdown') {
      this.targetCameraPos.set(0, 55, -15);
      this.targetLookAt.set(0, -5, -15.1);
    }
  }

  toggleCameraMode() {
    if (this.cameraMode === 'isometric') this.setCameraMode('chase');
    else if (this.cameraMode === 'chase') this.setCameraMode('topdown');
    else this.setCameraMode('isometric');
  }

  addScreenShake(amount = 0.8) {
    this.shakeIntensity = Math.min(1.5, this.shakeIntensity + amount);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isMobile ? 1.0 : 1.5));
  }

  update(dt, playerShip = null, activeBoss = null) {
    if (this.starField) this.starField.rotation.y += 0.0002;
    if (this.nebula1) this.nebula1.rotation.y += 0.0001;
    if (this.nebula2) this.nebula2.rotation.y -= 0.0001;

    if (this.dustPoints) {
      const positions = this.dustPoints.geometry.attributes.position.array;
      for (let i = 0; i < positions.length / 3; i++) {
        positions[i * 3 + 2] += 0.6;
        if (positions[i * 3 + 2] > 30) {
          positions[i * 3 + 2] = -160;
        }
      }
      this.dustPoints.geometry.attributes.position.needsUpdate = true;
    }

    const pPos = (playerShip && playerShip.meshGroup) ? playerShip.meshGroup.position : null;
    const pVel = playerShip ? (playerShip.velocity || { x: 0, y: 0 }) : { x: 0, y: 0 };
    const bossActive = activeBoss && !activeBoss.isDead && activeBoss.meshGroup;

    if (this.bossIntroTimer > 0) {
      this.bossIntroTimer -= dt;
    }

    if (bossActive && pPos) {
      const bPos = activeBoss.meshGroup.position;

      if (this.bossIntroTimer > 0) {
        const totalDuration = this.bossIntroDuration || 2.2;
        const progress = 1.0 - (this.bossIntroTimer / totalDuration);

        if (activeBoss.constructor && activeBoss.constructor.name === 'CommandMothership') {
          // ── 👑 Grand Cinematic Scale Approach for Leviathan Command Mothership ──
          if (progress < 0.45) {
            // High Orbital Vantage: Show massive silhouette towering over the small player starfighter
            const p1 = progress / 0.45;
            this.targetCameraPos.set(
              pPos.x * 0.3 + Math.sin(p1 * Math.PI) * 14.0,
              42.0 - p1 * 16.0,
              38.0 - p1 * 8.0
            );
            this.targetLookAt.set(
              bPos.x * 0.4,
              bPos.y * 0.4 + 4.0,
              bPos.z * 0.7
            );
          } else if (progress < 0.85) {
            // Low Bow Prow Flyby: Sweeping across the armored trench entrance and shield pylons
            const p2 = (progress - 0.45) / 0.40;
            this.targetCameraPos.set(
              pPos.x * 0.4 + (1.0 - p2) * 10.0,
              16.0 - p2 * 6.0,
              28.0 - p2 * 4.0
            );
            this.targetLookAt.set(
              bPos.x * 0.5,
              bPos.y * 0.4,
              bPos.z * 0.8 + 15.0
            );
          } else {
            // Smooth hand-off back to player combat chase
            this.targetCameraPos.set(
              pPos.x * 0.48,
              18.0 + pPos.y * 0.35,
              pPos.z + 32.0
            );
            this.targetLookAt.set(
              pPos.x * 0.4 + bPos.x * 0.35,
              pPos.y * 0.35 + bPos.y * 0.3,
              bPos.z * 0.45
            );
          }
        } else {
          // Standard Dramatic Intro Zoom for other bosses
          this.targetCameraPos.set(
            pPos.x * 0.4,
            10.0 + (1.0 - progress) * 8.0,
            pPos.z + 24.0 - (1.0 - progress) * 10.0
          );
          this.targetLookAt.set(
            bPos.x * 0.6,
            bPos.y * 0.6,
            bPos.z * 0.8
          );
        }
      } else {
        // Dynamic Cinematic Boss Duel Tracking Mode:
        // Wide-angle majestic third-person framing that keeps both the capital boss and dogfight sector in full view
        this.targetCameraPos.set(
          pPos.x * 0.48,
          18.0 + pPos.y * 0.35,
          pPos.z + 32.0
        );

        // Weighted lookAt target (40% player craft, 60% boss core)
        this.targetLookAt.set(
          pPos.x * 0.4 + bPos.x * 0.35,
          pPos.y * 0.35 + bPos.y * 0.3,
          bPos.z * 0.45
        );
      }
    } else if (pPos) {
      // Normal gameplay: dynamic adaptive framing tracking 3D open flight and wide flanking sweeps
      if (this.cameraMode === 'isometric') {
        const flankDistance = Math.hypot(pPos.x, pPos.y);
        const depthLag = Math.min(18.0, (pPos.z < 0 ? -pPos.z * 0.45 : 0));
        const camHeight = 14.0 + pPos.y * 0.4 + flankDistance * 0.12;
        const camDistZ = 24.0 + depthLag + (pPos.z > 0 ? pPos.z * 0.6 : pPos.z * 0.85);

        this.targetCameraPos.set(pPos.x * 0.68, camHeight, camDistZ);
        this.targetLookAt.set(pPos.x * 0.55, -1.0 + pPos.y * 0.4, pPos.z - 18.0);
      } else if (this.cameraMode === 'chase') {
        this.targetCameraPos.set(pPos.x * 0.85, 5.0 + pPos.y * 0.5, pPos.z + 18.0);
        this.targetLookAt.set(pPos.x * 0.75, pPos.y * 0.5, pPos.z - 35.0);
      } else if (this.cameraMode === 'topdown') {
        this.targetCameraPos.set(pPos.x * 0.85, 60.0, pPos.z - 10.0);
        this.targetLookAt.set(pPos.x * 0.85, -5.0, pPos.z - 10.1);
      }
    }

    // Frame-Rate Independent Exponential Camera Smoothing
    const camAlpha = 1.0 - Math.exp((bossActive ? -14.0 : -9.0) * dt);
    this.camera.position.lerp(this.targetCameraPos, camAlpha);

    // Smooth lookAt target lerp
    this.currentCamLookAt.lerp(this.targetLookAt, camAlpha);
    this.camera.lookAt(this.currentCamLookAt);

    // Subtle Aerodynamic Banking
    if (playerShip && playerShip.currentRoll !== undefined) {
      this.camera.rotation.z -= playerShip.currentRoll * 0.05;
    }

    // Hyper-Boost Camera FOV speed warping
    const targetFov = (playerShip && playerShip.isBoosting) ? 74 : 60;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, dt * 6.0);
      this.camera.updateProjectionMatrix();
    }

    // Atmosphere & Planet Slow Rotation
    if (this.planetGroup) {
      this.planetGroup.rotation.y += dt * 0.012;
    }
    if (this.nebulaGroup) {
      this.nebulaGroup.rotation.z += dt * 0.002;
    }
    if (this.dustPoints) {
      this.dustPoints.position.z += dt * (playerShip && playerShip.isBoosting ? 28.0 : 8.0);
      if (this.dustPoints.position.z > 80) this.dustPoints.position.z = -100;
    }

    // Deep-Space Shooting Star & Meteor Streak Spawning & Updates
    if (this.cometSpawnTimer !== undefined) {
      this.cometSpawnTimer -= dt;
      if (this.cometSpawnTimer <= 0) {
        this.spawnShootingStar();
        this.cometSpawnTimer = 5.0 + Math.random() * 7.0;
      }
    }

    if (this.comets && this.comets.length > 0) {
      for (let i = this.comets.length - 1; i >= 0; i--) {
        const c = this.comets[i];
        c.progress += dt / c.duration;
        if (c.progress >= 1.0) {
          this.cometGroup.remove(c.mesh);
          if (c.mesh.geometry) c.mesh.geometry.dispose();
          if (c.mesh.material) c.mesh.material.dispose();
          this.comets.splice(i, 1);
        } else {
          c.mesh.position.lerpVectors(c.start, c.end, c.progress);
          // Realistic shooting star flash curve: quick incandescence, peak, smooth trailing burn-out
          const p = c.progress;
          const alpha = p < 0.25 ? (p / 0.25) : Math.pow(1.0 - (p - 0.25) / 0.75, 2.2);
          c.mesh.material.opacity = alpha * 0.95;
        }
      }
    }

    // Dynamic camera roll/tilt when banking during dogfights
    if (this.cameraMode !== 'topdown') {
      const targetRoll = -pVel.x * (bossActive ? 0.035 : 0.02);
      this.camera.rotation.z += (targetRoll - this.camera.rotation.z) * 0.12;
    }

    // Screen Shake processing
    if (this.shakeIntensity > 0.01) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity *= 0.88;
    }
  }

  spawnShootingStar() {
    if (!this.cometGroup) return;

    if (!this.shootingStarTexture) {
      this.shootingStarTexture = this.createShootingStarTexture();
    }

    const startX = (Math.random() - 0.5) * 360 + (Math.random() > 0.5 ? 180 : -180);
    const startY = 80 + Math.random() * 80;
    const startZ = -340 - Math.random() * 120;

    const streakLen = 48 + Math.random() * 28;
    const streakWidth = 2.2;

    const travelDistX = (startX > 0 ? -1 : 1) * (220 + Math.random() * 140);
    const travelDistY = -90 - Math.random() * 70;
    const travelDistZ = -20 - Math.random() * 40;

    const endPos = new THREE.Vector3(startX + travelDistX, startY + travelDistY, startZ + travelDistZ);
    const dir = new THREE.Vector3(travelDistX, travelDistY, travelDistZ).normalize();

    // 2D Camera-Facing Billboard Ribbon
    const geo = new THREE.PlaneGeometry(streakLen, streakWidth);
    geo.translate(streakLen * 0.5, 0, 0); // Origin at front head

    const mat = new THREE.MeshBasicMaterial({
      map: this.shootingStarTexture,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(startX, startY, startZ);

    // Orient ribbon along flight trajectory
    const angle = Math.atan2(dir.y, dir.x);
    mesh.rotation.z = angle;

    this.cometGroup.add(mesh);

    this.comets.push({
      mesh: mesh,
      start: new THREE.Vector3(startX, startY, startZ),
      end: endPos,
      progress: 0.0,
      duration: 1.1 + Math.random() * 0.6 // Fast 1.1s - 1.7s flash
    });
  }

  setSectorEnvironment(sectorId = 'SECTOR_ALPHA') {
    if (sectorId === 'SOLAR_HELIOS') this.setStageEnvironment(7);
    else if (sectorId === 'SINGULARITY') this.setStageEnvironment(8);
    else if (sectorId === 'CRYO_BOREAS') this.setStageEnvironment(9);
    else if (sectorId === 'NULL_VOID') this.setStageEnvironment(10);
    else if (sectorId === 'DYSON_NEXUS') this.setStageEnvironment(11);
    else if (sectorId === 'STARGATE_APEX') this.setStageEnvironment(12);
    else this.setStageEnvironment(1);
  }

  setStageEnvironment(stageNum = 1) {
    this.currentStageNum = stageNum;

    // 1. Cleanly Dispose & Rebuild Planet Group (Celestial Body / Megastructure)
    if (this.planetGroup) {
      while (this.planetGroup.children.length > 0) {
        const child = this.planetGroup.children[0];
        this.planetGroup.remove(child);
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (child.material.map) child.material.map.dispose();
          child.material.dispose();
        }
      }
    }

    // 2. Cleanly Dispose & Rebuild Nebula Cloud Sprites
    if (this.nebulaGroup) {
      while (this.nebulaGroup.children.length > 0) {
        const child = this.nebulaGroup.children[0];
        this.nebulaGroup.remove(child);
        if (child.material) {
          if (child.material.map) child.material.map.dispose();
          child.material.dispose();
        }
      }
    }

    // ── 🎨 STAGE-SPECIFIC CELESTIAL BACKDROPS & LIGHTING ──
    let nebConfigs = [];
    let dustColor = 0x00f3ff;

    if (stageNum === 1) {
      // 🪐 STAGE 1: Orbital Corridor IV // Sapphire Gas Giant & Ring
      const planetGeo = new THREE.SphereGeometry(85, 32, 32);
      const planetTex = this.createGasGiantTexture([
        [0.0, '#041226'], [0.2, '#08284d'], [0.35, '#00e1ff'],
        [0.48, '#0b3560'], [0.65, '#00a6ff'], [0.82, '#0d4078'], [1.0, '#031022']
      ]);
      const planetMat = new THREE.MeshStandardMaterial({ map: planetTex, roughness: 0.85, metalness: 0.1 });
      this.planetGroup.add(new THREE.Mesh(planetGeo, planetMat));

      const ringGeo = new THREE.RingGeometry(110, 185, 64);
      ringGeo.rotateX(Math.PI * 0.38); ringGeo.rotateZ(Math.PI * 0.12);
      const ringTex = this.createPlanetaryRingTexture('rgba(140, 210, 255, 0.8)', 'rgba(30, 90, 180, 0.25)');
      const ringMat = new THREE.MeshBasicMaterial({ map: ringTex, side: THREE.DoubleSide, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending });
      this.planetGroup.add(new THREE.Mesh(ringGeo, ringMat));

      this.planetGroup.position.set(240, 85, -580);
      nebConfigs = [
        { colorCenter: 'rgba(0, 243, 255, 0.45)', colorMid: 'rgba(0, 120, 255, 0.22)', colorEdge: 'rgba(0, 40, 180, 0.08)', pos: new THREE.Vector3(-180, 70, -420), scale: 260 },
        { colorCenter: 'rgba(255, 0, 150, 0.42)', colorMid: 'rgba(170, 0, 255, 0.2)', colorEdge: 'rgba(70, 0, 140, 0.06)', pos: new THREE.Vector3(200, -60, -460), scale: 280 },
        { colorCenter: 'rgba(255, 170, 0, 0.35)', colorMid: 'rgba(255, 80, 0, 0.16)', colorEdge: 'rgba(120, 30, 0, 0.04)', pos: new THREE.Vector3(0, 140, -490), scale: 320 }
      ];
      if (this.sunLight) this.sunLight.color.setHex(0xffffff);
      if (this.cyanRimLight) this.cyanRimLight.color.setHex(0x00f3ff);
      if (this.warmBackLight) this.warmBackLight.color.setHex(0xff0066);
    } else if (stageNum === 2) {
      // 🌍 STAGE 2: Ring of Light // Terraformed Oceanic World & Distant Halo Ring Arc
      const planetGeo = new THREE.SphereGeometry(75, 32, 32);
      const planetTex = this.createOceanicWorldTexture();
      const planetMat = new THREE.MeshStandardMaterial({ map: planetTex, roughness: 0.75, metalness: 0.15 });
      this.planetGroup.add(new THREE.Mesh(planetGeo, planetMat));

      // Atmospheric Rayleigh Limb Glow Rim
      const atmosGeo = new THREE.SphereGeometry(78.5, 32, 32);
      const atmosMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, side: THREE.BackSide });
      this.planetGroup.add(new THREE.Mesh(atmosGeo, atmosMat));

      // Distant Orbiting Halo Megastructure Arc
      const haloGeo = new THREE.TorusGeometry(190, 4.5, 12, 64, Math.PI * 0.85);
      haloGeo.rotateX(Math.PI * 0.42); haloGeo.rotateZ(Math.PI * 0.25);
      const haloMat = new THREE.MeshStandardMaterial({ color: 0xd0e8ff, emissive: 0x00f3ff, emissiveIntensity: 0.8, metalness: 0.9, roughness: 0.2 });
      this.planetGroup.add(new THREE.Mesh(haloGeo, haloMat));

      this.planetGroup.position.set(-220, 95, -540);
      dustColor = 0x00ffcc;
      nebConfigs = [
        { colorCenter: 'rgba(0, 255, 180, 0.45)', colorMid: 'rgba(0, 180, 220, 0.2)', colorEdge: 'rgba(0, 80, 150, 0.05)', pos: new THREE.Vector3(-140, 80, -420), scale: 280 },
        { colorCenter: 'rgba(255, 215, 0, 0.35)', colorMid: 'rgba(255, 140, 0, 0.15)', colorEdge: 'rgba(100, 40, 0, 0.04)', pos: new THREE.Vector3(180, -50, -450), scale: 260 },
        { colorCenter: 'rgba(0, 150, 255, 0.4)', colorMid: 'rgba(0, 70, 200, 0.18)', colorEdge: 'rgba(0, 20, 100, 0.05)', pos: new THREE.Vector3(20, 130, -480), scale: 310 }
      ];
      if (this.sunLight) this.sunLight.color.setHex(0xfffae6);
      if (this.cyanRimLight) this.cyanRimLight.color.setHex(0x00ffaa);
      if (this.warmBackLight) this.warmBackLight.color.setHex(0xffaa00);
    } else if (stageNum === 3) {
      // 🌑 STAGE 3: Selene Shield // Cratered Lunar Moon with Geothermal Fissures
      const moonGeo = new THREE.SphereGeometry(70, 32, 32);
      const moonTex = this.createLunarMoonTexture();
      const moonMat = new THREE.MeshStandardMaterial({ map: moonTex, roughness: 0.92, metalness: 0.25 });
      this.planetGroup.add(new THREE.Mesh(moonGeo, moonMat));

      // Orbital Defense Satellite Relay Rings
      const ringGeo = new THREE.TorusGeometry(95, 0.8, 8, 48);
      ringGeo.rotateX(Math.PI * 0.3);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending });
      this.planetGroup.add(new THREE.Mesh(ringGeo, ringMat));

      this.planetGroup.position.set(200, -70, -520);
      dustColor = 0xddeeff;
      nebConfigs = [
        { colorCenter: 'rgba(80, 100, 140, 0.4)', colorMid: 'rgba(40, 50, 80, 0.2)', colorEdge: 'rgba(15, 20, 40, 0.05)', pos: new THREE.Vector3(-160, 60, -430), scale: 250 },
        { colorCenter: 'rgba(0, 180, 255, 0.4)', colorMid: 'rgba(0, 80, 200, 0.15)', colorEdge: 'rgba(0, 30, 100, 0.04)', pos: new THREE.Vector3(160, 80, -450), scale: 290 },
        { colorCenter: 'rgba(160, 180, 220, 0.3)', colorMid: 'rgba(80, 90, 120, 0.12)', colorEdge: 'rgba(30, 40, 60, 0.03)', pos: new THREE.Vector3(0, -90, -470), scale: 300 }
      ];
      if (this.sunLight) this.sunLight.color.setHex(0xeeffff);
      if (this.cyanRimLight) this.cyanRimLight.color.setHex(0x3366ff);
      if (this.warmBackLight) this.warmBackLight.color.setHex(0x00ffff);
    } else if (stageNum === 4) {
      // 🏙️ STAGE 4: Sanctuary Station // O'Neill Cylinder Habitat & Earth-Twin World
      const planetGeo = new THREE.SphereGeometry(80, 32, 32);
      const planetTex = this.createOceanicWorldTexture();
      const planetMat = new THREE.MeshStandardMaterial({ map: planetTex, roughness: 0.8, metalness: 0.1 });
      this.planetGroup.add(new THREE.Mesh(planetGeo, planetMat));

      // Distant Rotating O'Neill Cylinder Superstructure
      const cylGroup = new THREE.Group();
      cylGroup.position.set(-140, 60, 80);
      const cylBody = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 70, 16), new THREE.MeshStandardMaterial({ color: 0x223344, metalness: 0.9, roughness: 0.2 }));
      cylBody.rotateZ(Math.PI * 0.35); cylGroup.add(cylBody);
      [-1, 1].forEach(side => {
        const mirror = new THREE.Mesh(new THREE.BoxGeometry(22, 1.2, 50), new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.7 }));
        mirror.position.set(side * 20, 0, 0); mirror.rotateZ(Math.PI * 0.35); cylGroup.add(mirror);
      });
      this.planetGroup.add(cylGroup);

      this.planetGroup.position.set(-190, 80, -560);
      dustColor = 0xffaacc;
      nebConfigs = [
        { colorCenter: 'rgba(180, 40, 220, 0.4)', colorMid: 'rgba(100, 20, 160, 0.18)', colorEdge: 'rgba(40, 0, 80, 0.05)', pos: new THREE.Vector3(-150, 70, -420), scale: 270 },
        { colorCenter: 'rgba(255, 80, 140, 0.38)', colorMid: 'rgba(180, 30, 90, 0.15)', colorEdge: 'rgba(80, 0, 40, 0.04)', pos: new THREE.Vector3(170, -50, -450), scale: 280 },
        { colorCenter: 'rgba(255, 170, 60, 0.32)', colorMid: 'rgba(160, 80, 20, 0.12)', colorEdge: 'rgba(70, 20, 0, 0.03)', pos: new THREE.Vector3(20, 120, -480), scale: 310 }
      ];
      if (this.sunLight) this.sunLight.color.setHex(0xffd180);
      if (this.cyanRimLight) this.cyanRimLight.color.setHex(0xcc66ff);
      if (this.warmBackLight) this.warmBackLight.color.setHex(0xff007f);
    } else if (stageNum === 5) {
      // 🔥 STAGE 5: Extinction Protocol // Volcanic Lava World & Armada Formation
      const planetGeo = new THREE.SphereGeometry(82, 32, 32);
      const planetTex = this.createVolcanicTexture();
      const planetMat = new THREE.MeshStandardMaterial({ map: planetTex, roughness: 0.9, metalness: 0.3, emissive: 0x330500, emissiveIntensity: 0.6 });
      this.planetGroup.add(new THREE.Mesh(planetGeo, planetMat));

      const magmaAtmos = new THREE.Mesh(new THREE.SphereGeometry(85.5, 32, 32), new THREE.MeshBasicMaterial({ color: 0xff3300, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, side: THREE.BackSide }));
      this.planetGroup.add(magmaAtmos);

      this.planetGroup.position.set(220, -60, -560);
      dustColor = 0xff3300;
      nebConfigs = [
        { colorCenter: 'rgba(255, 0, 30, 0.5)', colorMid: 'rgba(160, 0, 20, 0.22)', colorEdge: 'rgba(60, 0, 10, 0.06)', pos: new THREE.Vector3(-170, 60, -420), scale: 290 },
        { colorCenter: 'rgba(255, 80, 0, 0.42)', colorMid: 'rgba(170, 40, 0, 0.18)', colorEdge: 'rgba(70, 10, 0, 0.04)', pos: new THREE.Vector3(190, 80, -450), scale: 280 },
        { colorCenter: 'rgba(80, 0, 15, 0.4)', colorMid: 'rgba(40, 0, 10, 0.15)', colorEdge: 'rgba(10, 0, 5, 0.03)', pos: new THREE.Vector3(0, -100, -480), scale: 320 }
      ];
      if (this.sunLight) this.sunLight.color.setHex(0xff2200);
      if (this.cyanRimLight) this.cyanRimLight.color.setHex(0xff0055);
      if (this.warmBackLight) this.warmBackLight.color.setHex(0xff7700);
    } else if (stageNum === 6 || stageNum === 7) {
      // ☀️ STAGE 6/7: Dyson Swarm Forge // Supergiant Yellow Sun & Solar Collectors
      const sunGeo = new THREE.SphereGeometry(110, 32, 32);
      const sunTex = this.createSolarStarTexture(stageNum === 7 ? '#d35400' : '#ff8800', '#ffffff');
      const sunMat = new THREE.MeshBasicMaterial({ map: sunTex });
      this.planetGroup.add(new THREE.Mesh(sunGeo, sunMat));

      const coronaHalo = new THREE.Mesh(new THREE.SphereGeometry(125, 32, 32), new THREE.MeshBasicMaterial({ color: stageNum === 7 ? 0xff4400 : 0xffaa00, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, side: THREE.BackSide }));
      this.planetGroup.add(coronaHalo);

      // Dyson Collector Array Sails
      for (let s = 0; s < 12; s++) {
        const sailAngle = (s / 12) * Math.PI * 2;
        const sail = new THREE.Mesh(new THREE.BoxGeometry(16, 12, 1.0), new THREE.MeshBasicMaterial({ color: 0xffea00, transparent: true, opacity: 0.8 }));
        sail.position.set(Math.cos(sailAngle) * 165, Math.sin(sailAngle) * 165, (Math.random() - 0.5) * 40);
        sail.lookAt(new THREE.Vector3(0, 0, 0));
        this.planetGroup.add(sail);
      }

      this.planetGroup.position.set(0, 140, -560);
      dustColor = 0xffea00;
      nebConfigs = [
        { colorCenter: 'rgba(255, 200, 0, 0.45)', colorMid: 'rgba(255, 120, 0, 0.2)', colorEdge: 'rgba(120, 40, 0, 0.05)', pos: new THREE.Vector3(-140, 80, -420), scale: 300 },
        { colorCenter: 'rgba(255, 80, 0, 0.4)', colorMid: 'rgba(180, 30, 0, 0.16)', colorEdge: 'rgba(80, 10, 0, 0.04)', pos: new THREE.Vector3(160, 60, -440), scale: 280 },
        { colorCenter: 'rgba(255, 235, 120, 0.35)', colorMid: 'rgba(200, 160, 40, 0.14)', colorEdge: 'rgba(90, 60, 0, 0.03)', pos: new THREE.Vector3(0, -90, -480), scale: 330 }
      ];
      if (this.sunLight) this.sunLight.color.setHex(stageNum === 7 ? 0xff8822 : 0xfff5cc);
      if (this.cyanRimLight) this.cyanRimLight.color.setHex(stageNum === 7 ? 0xff3300 : 0xffaa00);
      if (this.warmBackLight) this.warmBackLight.color.setHex(0xffbb00);
    } else if (stageNum === 8) {
      // 🌌 STAGE 8: Event Horizon // Gravitational Singularity Black Hole & Accretion Disk
      const bhGeo = new THREE.SphereGeometry(55, 32, 32);
      const bhMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
      this.planetGroup.add(new THREE.Mesh(bhGeo, bhMat));

      // Photon Sphere Glowing Ring
      const photonGeo = new THREE.SphereGeometry(58, 32, 32);
      const photonMat = new THREE.MeshBasicMaterial({ color: 0xff00aa, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, side: THREE.BackSide });
      this.planetGroup.add(new THREE.Mesh(photonGeo, photonMat));

      // Relativistic Accretion Disk
      const diskGeo = new THREE.RingGeometry(68, 195, 64);
      diskGeo.rotateX(Math.PI * 0.4); diskGeo.rotateZ(Math.PI * 0.15);
      const diskTex = this.createBlackHoleTexture();
      const diskMat = new THREE.MeshBasicMaterial({ map: diskTex, side: THREE.DoubleSide, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending });
      this.planetGroup.add(new THREE.Mesh(diskGeo, diskMat));

      this.planetGroup.position.set(0, 60, -520);
      dustColor = 0xdd00ff;
      nebConfigs = [
        { colorCenter: 'rgba(150, 0, 255, 0.45)', colorMid: 'rgba(80, 0, 180, 0.22)', colorEdge: 'rgba(30, 0, 90, 0.06)', pos: new THREE.Vector3(-160, 60, -420), scale: 290 },
        { colorCenter: 'rgba(255, 0, 120, 0.4)', colorMid: 'rgba(150, 0, 80, 0.18)', colorEdge: 'rgba(60, 0, 30, 0.04)', pos: new THREE.Vector3(170, -60, -450), scale: 280 },
        { colorCenter: 'rgba(0, 200, 255, 0.35)', colorMid: 'rgba(0, 100, 180, 0.15)', colorEdge: 'rgba(0, 30, 90, 0.03)', pos: new THREE.Vector3(0, 130, -480), scale: 320 }
      ];
      if (this.sunLight) this.sunLight.color.setHex(0x9933ff);
      if (this.cyanRimLight) this.cyanRimLight.color.setHex(0x00f3ff);
      if (this.warmBackLight) this.warmBackLight.color.setHex(0xff00aa);
    } else if (stageNum === 9) {
      // ❄️ STAGE 9: Cryo Abyss // Glacial Ice Giant & Razor Crystal Rings
      const planetGeo = new THREE.SphereGeometry(80, 32, 32);
      const planetTex = this.createIceGiantTexture();
      const planetMat = new THREE.MeshStandardMaterial({ map: planetTex, roughness: 0.65, metalness: 0.4 });
      this.planetGroup.add(new THREE.Mesh(planetGeo, planetMat));

      const ringGeo = new THREE.RingGeometry(105, 185, 48);
      ringGeo.rotateX(Math.PI * 0.45); ringGeo.rotateZ(-Math.PI * 0.2);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xccffff, side: THREE.DoubleSide, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending });
      this.planetGroup.add(new THREE.Mesh(ringGeo, ringMat));

      this.planetGroup.position.set(-210, -70, -560);
      dustColor = 0x88ffff;
      nebConfigs = [
        { colorCenter: 'rgba(0, 240, 255, 0.45)', colorMid: 'rgba(0, 160, 200, 0.2)', colorEdge: 'rgba(0, 60, 120, 0.05)', pos: new THREE.Vector3(-140, 70, -420), scale: 280 },
        { colorCenter: 'rgba(180, 240, 255, 0.38)', colorMid: 'rgba(90, 180, 220, 0.16)', colorEdge: 'rgba(30, 80, 120, 0.04)', pos: new THREE.Vector3(180, 50, -450), scale: 270 },
        { colorCenter: 'rgba(0, 255, 200, 0.35)', colorMid: 'rgba(0, 160, 140, 0.15)', colorEdge: 'rgba(0, 70, 70, 0.03)', pos: new THREE.Vector3(0, -90, -480), scale: 310 }
      ];
      if (this.sunLight) this.sunLight.color.setHex(0x99ffff);
      if (this.cyanRimLight) this.cyanRimLight.color.setHex(0x00ffcc);
      if (this.warmBackLight) this.warmBackLight.color.setHex(0x0066ff);
    } else if (stageNum === 10) {
      // 🔮 STAGE 10: Null Sector // Dark Eclipse Silhouette & Ghost Lightning Nebula
      const planetGeo = new THREE.SphereGeometry(82, 32, 32);
      const planetMat = new THREE.MeshBasicMaterial({ color: 0x050408 });
      this.planetGroup.add(new THREE.Mesh(planetGeo, planetMat));

      const coronalRayHalo = new THREE.Mesh(new THREE.SphereGeometry(96, 32, 32), new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, side: THREE.BackSide }));
      this.planetGroup.add(coronalRayHalo);

      this.planetGroup.position.set(180, 70, -540);
      dustColor = 0x00ff88;
      nebConfigs = [
        { colorCenter: 'rgba(120, 0, 220, 0.45)', colorMid: 'rgba(60, 0, 140, 0.2)', colorEdge: 'rgba(20, 0, 60, 0.05)', pos: new THREE.Vector3(-160, 70, -420), scale: 290 },
        { colorCenter: 'rgba(0, 255, 120, 0.42)', colorMid: 'rgba(0, 160, 70, 0.18)', colorEdge: 'rgba(0, 60, 30, 0.04)', pos: new THREE.Vector3(170, -60, -450), scale: 280 },
        { colorCenter: 'rgba(0, 220, 255, 0.35)', colorMid: 'rgba(0, 120, 180, 0.15)', colorEdge: 'rgba(0, 40, 80, 0.03)', pos: new THREE.Vector3(10, 120, -480), scale: 320 }
      ];
      if (this.sunLight) this.sunLight.color.setHex(0x6600cc);
      if (this.cyanRimLight) this.cyanRimLight.color.setHex(0x00ff66);
      if (this.warmBackLight) this.warmBackLight.color.setHex(0x00e5ff);
    } else if (stageNum === 11) {
      // 💠 STAGE 11: Dyson Nexus // Cybernetic World & Megastructure Trench Rib Arches
      const planetGeo = new THREE.SphereGeometry(78, 32, 32);
      const planetTex = this.createCyberWorldTexture();
      const planetMat = new THREE.MeshStandardMaterial({ map: planetTex, roughness: 0.5, metalness: 0.85, emissive: 0x002233, emissiveIntensity: 0.5 });
      this.planetGroup.add(new THREE.Mesh(planetGeo, planetMat));

      // Colossal Dyson Trench Rib Arches
      [-60, 0, 60].forEach((zOff, idx) => {
        const archGeo = new THREE.TorusGeometry(160 + idx * 25, 4.0, 8, 48, Math.PI);
        archGeo.rotateX(Math.PI * 0.5);
        const archMat = new THREE.MeshStandardMaterial({ color: 0x0a1c30, emissive: idx === 1 ? 0xffb700 : 0x00f3ff, emissiveIntensity: 0.9, metalness: 0.95 });
        const arch = new THREE.Mesh(archGeo, archMat);
        arch.position.set(0, 0, zOff);
        this.planetGroup.add(arch);
      });

      this.planetGroup.position.set(0, -40, -560);
      dustColor = 0x00f3ff;
      nebConfigs = [
        { colorCenter: 'rgba(0, 180, 255, 0.45)', colorMid: 'rgba(0, 80, 160, 0.2)', colorEdge: 'rgba(0, 30, 80, 0.05)', pos: new THREE.Vector3(-150, 80, -420), scale: 280 },
        { colorCenter: 'rgba(255, 180, 0, 0.38)', colorMid: 'rgba(160, 100, 0, 0.16)', colorEdge: 'rgba(70, 40, 0, 0.04)', pos: new THREE.Vector3(160, 60, -450), scale: 270 },
        { colorCenter: 'rgba(0, 100, 255, 0.35)', colorMid: 'rgba(0, 40, 150, 0.15)', colorEdge: 'rgba(0, 15, 60, 0.03)', pos: new THREE.Vector3(0, -90, -480), scale: 310 }
      ];
      if (this.sunLight) this.sunLight.color.setHex(0x00f3ff);
      if (this.cyanRimLight) this.cyanRimLight.color.setHex(0xffb700);
      if (this.warmBackLight) this.warmBackLight.color.setHex(0x0066ff);
    } else {
      // 🌈 STAGE 12: Hyper-Gateway Finale // Colossal Ancient Stargate Portal & Quantum Vortex
      const gateGeo = new THREE.TorusGeometry(120, 12, 16, 64);
      gateGeo.rotateX(Math.PI * 0.15);
      const gateMat = new THREE.MeshStandardMaterial({ color: 0x141020, emissive: 0xffb700, emissiveIntensity: 0.8, metalness: 0.95, roughness: 0.15 });
      this.planetGroup.add(new THREE.Mesh(gateGeo, gateMat));

      // Quantum Singularity Vortex Event Horizon Plane
      const vortexGeo = new THREE.CircleGeometry(116, 48);
      vortexGeo.rotateX(Math.PI * 0.15);
      const vortexTex = this.createQuantumVortexTexture();
      const vortexMat = new THREE.MeshBasicMaterial({ map: vortexTex, side: THREE.DoubleSide, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending });
      this.planetGroup.add(new THREE.Mesh(vortexGeo, vortexMat));

      this.planetGroup.position.set(0, 45, -530);
      dustColor = 0xffffff;
      nebConfigs = [
        { colorCenter: 'rgba(255, 0, 150, 0.45)', colorMid: 'rgba(150, 0, 220, 0.22)', colorEdge: 'rgba(60, 0, 100, 0.06)', pos: new THREE.Vector3(-160, 70, -420), scale: 300 },
        { colorCenter: 'rgba(0, 240, 255, 0.42)', colorMid: 'rgba(0, 150, 220, 0.18)', colorEdge: 'rgba(0, 50, 120, 0.04)', pos: new THREE.Vector3(170, -50, -450), scale: 290 },
        { colorCenter: 'rgba(255, 200, 0, 0.38)', colorMid: 'rgba(200, 100, 0, 0.15)', colorEdge: 'rgba(90, 30, 0, 0.03)', pos: new THREE.Vector3(0, 130, -480), scale: 330 }
      ];
      if (this.sunLight) this.sunLight.color.setHex(0xffffff);
      if (this.cyanRimLight) this.cyanRimLight.color.setHex(0x00f3ff);
      if (this.warmBackLight) this.warmBackLight.color.setHex(0xff00cc);
    }

    // Rebuild Nebula Sprites
    nebConfigs.forEach(cfg => {
      const tex = this.createNebulaTexture(cfg.colorCenter, cfg.colorMid, cfg.colorEdge);
      const nebMat = new THREE.SpriteMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
      const sprite = new THREE.Sprite(nebMat);
      sprite.position.copy(cfg.pos);
      sprite.scale.set(cfg.scale, cfg.scale * 0.7, 1);
      this.nebulaGroup.add(sprite);
    });

    // Update Dust Particles Material Color
    if (this.dustPoints && this.dustPoints.material) {
      this.dustPoints.material.color.setHex(dustColor);
    }
  }
}
