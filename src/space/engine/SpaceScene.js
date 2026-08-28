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
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isMobile ? 1.0 : 1.5));
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

  createPlanetTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Deep sapphire gas giant atmosphere with swirling cloud bands
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0.0, '#041226');
    grad.addColorStop(0.2, '#08284d');
    grad.addColorStop(0.35, '#00e1ff');
    grad.addColorStop(0.48, '#0b3560');
    grad.addColorStop(0.65, '#00a6ff');
    grad.addColorStop(0.82, '#0d4078');
    grad.addColorStop(1.0, '#031022');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    // High-altitude atmospheric wisps & storm vortex
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    for (let y = 30; y < 230; y += 18) {
      ctx.fillRect(0, y, 512, 3 + Math.sin(y * 0.2) * 2);
    }

    // Great atmospheric storm vortex
    ctx.beginPath();
    ctx.ellipse(320, 110, 38, 18, 0.1, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 243, 255, 0.45)';
    ctx.fill();

    return new THREE.CanvasTexture(canvas);
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

    const planetGeo = new THREE.SphereGeometry(85, 32, 32);
    const planetTex = this.createPlanetTexture();
    const planetMat = new THREE.MeshStandardMaterial({
      map: planetTex,
      roughness: 0.85,
      metalness: 0.1,
      emissive: 0x021124,
      emissiveIntensity: 0.3
    });
    const planetMesh = new THREE.Mesh(planetGeo, planetMat);
    this.planetGroup.add(planetMesh);

    // Atmospheric Rayleigh Limb Glow Rim
    const atmosGeo = new THREE.SphereGeometry(88.5, 32, 32);
    const atmosMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    });
    this.planetGroup.add(new THREE.Mesh(atmosGeo, atmosMat));

    // Translucent Ice Ring
    const ringGeo = new THREE.RingGeometry(110, 175, 48);
    ringGeo.rotateX(Math.PI * 0.38);
    ringGeo.rotateZ(Math.PI * 0.12);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x88ccff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending
    });
    this.planetGroup.add(new THREE.Mesh(ringGeo, ringMat));

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

    // 5. Background Deep-Space Capital Fleet Silhouettes
    this.bgFleetGroup = new THREE.Group();
    const fleetMat = new THREE.MeshBasicMaterial({ color: 0x0a1830, transparent: true, opacity: 0.88 });
    const engineGlowMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0.95 });

    for (let f = 0; f < 6; f++) {
      const frigate = new THREE.Group();
      const fx = (f % 2 === 0 ? 1 : -1) * (140 + Math.random() * 120);
      const fy = (Math.random() - 0.5) * 80 + 20;
      const fz = -380 - f * 60;
      frigate.position.set(fx, fy, fz);

      // Frigate Wedge Body
      const fGeo = new THREE.ConeGeometry(8.0, 32.0, 4);
      fGeo.rotateX(Math.PI / 2);
      frigate.add(new THREE.Mesh(fGeo, fleetMat));

      // Engine Thruster Glows
      [-2.5, 2.5].forEach(ex => {
        const eg = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 8), engineGlowMat);
        eg.position.set(ex, 0, 16.0);
        frigate.add(eg);
      });

      this.bgFleetGroup.add(frigate);
    }
    this.scene.add(this.bgFleetGroup);

    this.bgLasers = [];
  }

  triggerHyperspaceWarp(position) {
    const warpGroup = new THREE.Group();
    warpGroup.position.copy(position);

    // Flash sphere
    const flashGeo = new THREE.SphereGeometry(18.0, 16, 16);
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });
    const flash = new THREE.Mesh(flashGeo, flashMat);
    warpGroup.add(flash);

    // Spacetime Refraction Rings
    const ringGeo = new THREE.TorusGeometry(26.0, 0.8, 12, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    warpGroup.add(ring);

    this.scene.add(warpGroup);
    this.addScreenShake(1.4);

    let t = 0;
    const interval = setInterval(() => {
      t += 0.05;
      ring.scale.addScalar(0.18);
      flash.scale.addScalar(0.12);
      flashMat.opacity = Math.max(0, 0.95 - t * 1.5);
      ringMat.opacity = Math.max(0, 0.9 - t * 1.4);
      if (t >= 0.8) {
        clearInterval(interval);
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
      // Normal gameplay: camera smoothly tracks player craft lateral movement
      if (this.cameraMode === 'isometric') {
        this.targetCameraPos.set(pPos.x * 0.55, 14.0 + pPos.y * 0.35, 24.0);
        this.targetLookAt.set(pPos.x * 0.45, -1.0 + pPos.y * 0.35, -15.0);
      } else if (this.cameraMode === 'chase') {
        this.targetCameraPos.set(pPos.x * 0.8, 5.0 + pPos.y * 0.5, pPos.z + 18.0);
        this.targetLookAt.set(pPos.x * 0.7, pPos.y * 0.5, -30.0);
      } else if (this.cameraMode === 'topdown') {
        this.targetCameraPos.set(pPos.x * 0.8, 55.0, -15.0);
        this.targetLookAt.set(pPos.x * 0.8, -5.0, -15.1);
      }
    }

    // Smooth camera position lerp
    const lerpSpeed = bossActive ? 0.12 : 0.08;
    this.camera.position.lerp(this.targetCameraPos, lerpSpeed);

    // Smooth lookAt target lerp
    this.currentCamLookAt.lerp(this.targetLookAt, lerpSpeed);
    this.camera.lookAt(this.currentCamLookAt);

    // Hyper-Boost Camera FOV speed warping
    const targetFov = (playerShip && playerShip.isBoosting) ? 74 : 60;
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, dt * 6.0);
    this.camera.updateProjectionMatrix();

    // Background Fleet ambient laser battle tracers
    if (this.bgFleetGroup && Math.random() < 0.04) {
      const startF = this.bgFleetGroup.children[Math.floor(Math.random() * this.bgFleetGroup.children.length)];
      if (startF) {
        const tracerGeo = new THREE.CylinderGeometry(0.3, 0.3, 25.0, 4);
        tracerGeo.rotateX(Math.PI / 2);
      const tracerColor = Math.random() > 0.5 ? 0x00f3ff : 0xff0055;
      const tracerMat = new THREE.MeshStandardMaterial({ color: tracerColor, emissive: tracerColor, emissiveIntensity: 2.5, toneMapped: false });
        const tracer = new THREE.Mesh(tracerGeo, tracerMat);
        tracer.position.copy(startF.position);
        tracer.velocity = new THREE.Vector3((Math.random() - 0.5) * 35, (Math.random() - 0.5) * 20, -100);
        this.scene.add(tracer);
        this.bgLasers.push({ mesh: tracer, life: 2.5 });
      }
    }
    for (let i = this.bgLasers.length - 1; i >= 0; i--) {
      const l = this.bgLasers[i];
      l.life -= dt;
      l.mesh.position.addScaledVector(l.mesh.velocity, dt);
      if (l.life <= 0) {
        this.scene.remove(l.mesh);
        l.mesh.geometry.dispose();
        l.mesh.material.dispose();
        this.bgLasers.splice(i, 1);
      }
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
}
