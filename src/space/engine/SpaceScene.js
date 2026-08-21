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
    this.killCamTimer = 0;
    this.killCamDuration = 2.4;
    this.killCamTarget = new THREE.Vector3();
    this.planetCinematicTimer = 0;
    this.planetCinematicDuration = 5.4;
    this.setCameraMode('isometric');
    this.camera.position.copy(this.targetCameraPos);
    this.camera.lookAt(this.targetLookAt);

    // WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isMobile,
      alpha: false,
      precision: this.isMobile ? 'mediump' : 'highp',
      stencil: false
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isMobile ? 1.0 : 1.5));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

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
    const ambient = new THREE.AmbientLight(0x1e2c44, 0.75);
    this.scene.add(ambient);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.2);
    sunLight.position.set(30, 50, 40);
    this.scene.add(sunLight);

    const cyanLight = new THREE.PointLight(0x00f3ff, 1.2, 80);
    cyanLight.position.set(-15, 20, 0);
    this.scene.add(cyanLight);

    const magentaLight = new THREE.PointLight(0xff0077, 0.9, 80);
    magentaLight.position.set(15, 15, -30);
    this.scene.add(magentaLight);
  }

  buildDeepSpaceEnvironment() {
    // 1. Realistic Spherical Starfield (Smooth Circular Radial Glow, No Cubes)
    const starCount = this.isMobile ? 900 : 1800;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const r = 500 + Math.random() * 500;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2.0 * Math.random() - 1.0);

      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);

      const colorType = Math.random();
      if (colorType > 0.7) {
        starColors[i * 3] = 0.0; starColors[i * 3 + 1] = 0.95; starColors[i * 3 + 2] = 1.0;
      } else if (colorType > 0.4) {
        starColors[i * 3] = 1.0; starColors[i * 3 + 1] = 0.0; starColors[i * 3 + 2] = 0.6;
      } else {
        starColors[i * 3] = 1.0; starColors[i * 3 + 1] = 1.0; starColors[i * 3 + 2] = 1.0;
      }
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: this.isMobile ? 1.6 : 2.2,
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

    // 3. Floating Interstellar Dust Particles (Realistic Round Glow)
    const dustCount = this.isMobile ? 250 : 500;
    const dustGeo = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustCount * 3);

    for (let i = 0; i < dustCount; i++) {
      dustPositions[i * 3] = (Math.random() - 0.5) * 120;
      dustPositions[i * 3 + 1] = (Math.random() - 0.5) * 80;
      dustPositions[i * 3 + 2] = -Math.random() * 180;
    }

    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));

    const dustMat = new THREE.PointsMaterial({
      color: 0x00f3ff,
      size: 0.6,
      map: this.starTexture,
      transparent: true,
      opacity: 0.75,
      alphaTest: 0.01,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.dustPoints = new THREE.Points(dustGeo, dustMat);
    this.scene.add(this.dustPoints);

    // Build Distant Target Planet for Mission 1 Superlaser Cutscene
    this.buildTargetPlanet();
  }

  createProceduralPlanetTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // 1. Deep Ocean Surface with Bi-directional Continental Shelves
    const oceanGrad = ctx.createLinearGradient(0, 0, 0, 512);
    oceanGrad.addColorStop(0.0, '#040d1a');
    oceanGrad.addColorStop(0.2, '#0a2244');
    oceanGrad.addColorStop(0.5, '#0e3a70');
    oceanGrad.addColorStop(0.8, '#0a2244');
    oceanGrad.addColorStop(1.0, '#040d1a');
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, 1024, 512);

    // Coastal Shallow Waters
    ctx.fillStyle = 'rgba(0, 200, 255, 0.25)';
    const continents = [
      { x: 240, y: 180, r: 120 },
      { x: 310, y: 240, r: 90 },
      { x: 680, y: 280, r: 140 },
      { x: 760, y: 230, r: 110 },
      { x: 880, y: 170, r: 85 },
      { x: 120, y: 340, r: 80 },
      { x: 520, y: 150, r: 95 }
    ];
    continents.forEach(c => {
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r * 1.25, 0, Math.PI * 2);
      ctx.fill();
    });

    // 2. High-Definition Landmass Continents with Fractal Coastlines
    ctx.fillStyle = '#1e7a48';
    continents.forEach(c => {
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fill();
      // Sub-islands and peninsulas
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        const dist = c.r * (0.7 + Math.sin(i * 3.5) * 0.35);
        ctx.beginPath();
        ctx.arc(c.x + Math.cos(ang) * dist, c.y + Math.sin(ang) * dist, c.r * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // 3. Mountain Ranges & High Elevation Ridges
    ctx.fillStyle = '#6b9c56';
    continents.forEach(c => {
      ctx.beginPath();
      ctx.arc(c.x + 10, c.y - 10, c.r * 0.55, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = '#c49a6c';
    continents.forEach(c => {
      ctx.beginPath();
      ctx.arc(c.x + 15, c.y - 12, c.r * 0.28, 0, Math.PI * 2);
      ctx.fill();
    });

    // 4. Glowing Night-Side Urban Megacity Matrices (Gold/Cyan)
    ctx.fillStyle = 'rgba(255, 230, 100, 0.75)';
    for (let n = 0; n < 400; n++) {
      const rx = Math.random() * 1024;
      const ry = Math.random() * 512;
      ctx.fillRect(rx, ry, Math.random() > 0.8 ? 2 : 1, Math.random() > 0.8 ? 2 : 1);
    }

    // 5. Swirling Dynamic Storm Cloud Belts & Fronts
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    for (let cl = 0; cl < 12; cl++) {
      const cx = (cl * 90) % 1024;
      const cy = 100 + Math.sin(cl * 1.5) * 160;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 140, 24, Math.sin(cl) * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. Polar Glaciers & Ice Caps
    const iceGrad = ctx.createLinearGradient(0, 0, 0, 45);
    iceGrad.addColorStop(0, '#ffffff');
    iceGrad.addColorStop(1, 'rgba(230, 245, 255, 0.0)');
    ctx.fillStyle = iceGrad;
    ctx.fillRect(0, 0, 1024, 45);

    const southIceGrad = ctx.createLinearGradient(0, 512, 0, 467);
    southIceGrad.addColorStop(0, '#ffffff');
    southIceGrad.addColorStop(1, 'rgba(230, 245, 255, 0.0)');
    ctx.fillStyle = southIceGrad;
    ctx.fillRect(0, 467, 1024, 45);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }

  buildTargetPlanet() {
    const planetGeo = new THREE.SphereGeometry(32, 48, 48);
    const planetTex = this.createProceduralPlanetTexture();
    const planetMat = new THREE.MeshStandardMaterial({
      map: planetTex,
      color: 0xffffff,
      roughness: 0.45,
      metalness: 0.15,
      emissive: 0x041224,
      emissiveIntensity: 0.3
    });
    this.targetPlanet = new THREE.Mesh(planetGeo, planetMat);
    this.targetPlanet.position.set(50, 30, -320);

    // Glowing Atmospheric Rim Halo
    const atmosGeo = new THREE.SphereGeometry(34.5, 48, 48);
    const atmosMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.35,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending
    });
    this.planetAtmosphere = new THREE.Mesh(atmosGeo, atmosMat);
    this.targetPlanet.add(this.planetAtmosphere);

    this.scene.add(this.targetPlanet);
  }

  triggerPlanetVaporization(moonBasePos, particleManager) {
    if (!this.targetPlanet) return;
    this.planetCinematicTimer = 5.2;
    this.planetCinematicDuration = 5.2;

    // Trigger HUD Cinematic Banner & Letterbox
    if (window.spaceGameManager && window.spaceGameManager.spaceHUD) {
      window.spaceGameManager.spaceHUD.showKillCam("CATACLYSM: PLANET ANNIHILATION", "ALPHA IV OBLITERATED BY SUPERLASER", 5.0);
    }

    // Trigger mobile haptic vibration charge pattern
    if (window.spaceGameManager && window.spaceGameManager.spaceAudio) {
      window.spaceGameManager.spaceAudio.vibrateSuperlaserCharge();
    }

    const startPos = moonBasePos ? moonBasePos.clone() : new THREE.Vector3(0, 0, -55);
    const endPos = this.targetPlanet.position.clone();
    const distance = startPos.distanceTo(endPos);

    // Initial Superlaser charging beam
    const beamGeo = new THREE.CylinderGeometry(3.5, 5.0, distance, 16);
    beamGeo.rotateX(Math.PI / 2);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x00ff66,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });
    const superBeam = new THREE.Mesh(beamGeo, beamMat);
    superBeam.position.copy(startPos).lerp(endPos, 0.5);
    superBeam.lookAt(endPos);
    this.scene.add(superBeam);

    this.addScreenShake(1.8);

    // Planet impact & mantle rupture phase (at 1.4s)
    setTimeout(() => {
      if (window.spaceGameManager && window.spaceGameManager.spaceAudio) {
        window.spaceGameManager.spaceAudio.vibrateSuperlaserImpact();
        window.spaceGameManager.spaceAudio.playExplosion();
      }

      if (this.targetPlanet) {
        // Red glowing magma rupture across continents
        if (this.targetPlanet.material) {
          this.targetPlanet.material.emissive.setHex(0xff3300);
          this.targetPlanet.material.emissiveIntensity = 3.0;
        }
        this.addScreenShake(4.5);
        if (particleManager) {
          particleManager.createExplosion(endPos, 0x00ff66, 250, 5.0);
          particleManager.createExplosion(endPos, 0xff0044, 220, 4.0);
          particleManager.createExplosion(endPos, 0xffea00, 180, 3.5);
          particleManager.createEmpShockwave(endPos, 160);
        }
      }
    }, 1400);

    // Planet disintegration into burning asteroid shrapnel (at 2.2s)
    setTimeout(() => {
      if (superBeam) this.scene.remove(superBeam);

      if (this.targetPlanet) {
        this.targetPlanet.visible = false;

        const debrisGroup = new THREE.Group();
        const debrisGeo = new THREE.DodecahedronGeometry(4.5, 1);
        const debrisMat = new THREE.MeshStandardMaterial({
          color: 0xff3300,
          emissive: 0xff2200,
          emissiveIntensity: 0.8,
          roughness: 0.7,
          metalness: 0.5
        });

        for (let i = 0; i < 28; i++) {
          const chunk = new THREE.Mesh(debrisGeo, debrisMat);
          chunk.position.copy(endPos).add(new THREE.Vector3(
            (Math.random() - 0.5) * 100,
            (Math.random() - 0.5) * 70,
            (Math.random() - 0.5) * 100
          ));
          chunk.scale.setScalar(0.6 + Math.random() * 1.8);
          debrisGroup.add(chunk);
        }
        this.scene.add(debrisGroup);

        let t = 0;
        const interval = setInterval(() => {
          t += 0.05;
          debrisGroup.position.z += 2.4;
          debrisGroup.rotation.y += 0.025;
          if (t >= 6.0) {
            clearInterval(interval);
            this.scene.remove(debrisGroup);
          }
        }, 30);
      }
    }, 2200);
  }

  triggerBossIntroCamera() {
    this.bossIntroTimer = 2.2;
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
    if (this.cameraMode === 'isometric') {
      this.setCameraMode('chase');
    } else if (this.cameraMode === 'chase') {
      this.setCameraMode('topdown');
    } else {
      this.setCameraMode('isometric');
    }
    return this.cameraMode;
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

    if (this.planetCinematicTimer > 0) {
      this.planetCinematicTimer -= dt;
      const progress = Math.max(0, 1.0 - (this.planetCinematicTimer / this.planetCinematicDuration));

      if (progress < 0.28) {
        // Stage 1: Extreme dramatic close-up on the Moon Base Superlaser Dish as energy charges
        const p1 = progress / 0.28;
        this.targetCameraPos.set(-18 + p1 * 3, 14, -30 + p1 * 5);
        this.targetLookAt.set(-5.25, 7.5, -55);
      } else if (progress < 0.60) {
        // Stage 2: Lateral tracking shot along the cosmic emerald beam path
        const p2 = (progress - 0.28) / 0.32;
        this.targetCameraPos.set(
          THREE.MathUtils.lerp(-15, 28, p2),
          THREE.MathUtils.lerp(14, 38, p2),
          THREE.MathUtils.lerp(-25, -180, p2)
        );
        this.targetLookAt.set(
          THREE.MathUtils.lerp(-5.25, 50, p2),
          THREE.MathUtils.lerp(7.5, 30, p2),
          THREE.MathUtils.lerp(-55, -320, p2)
        );
      } else if (progress < 0.88) {
        // Stage 3: Direct framing of Planet Alpha IV cracking and detonating into burning shrapnel
        const p3 = (progress - 0.60) / 0.28;
        const camAngle = p3 * Math.PI * 0.25;
        this.targetCameraPos.set(
          50 + Math.sin(camAngle) * 65,
          30 + 15 + Math.cos(camAngle) * 10,
          -320 + 85
        );
        this.targetLookAt.set(50, 30, -320);
      } else {
        // Stage 4: Smooth swoop back to behind player craft
        const p4 = (progress - 0.88) / 0.12;
        const targetP = pPos ? new THREE.Vector3(pPos.x * 0.65, 13.0 + pPos.y * 0.45, pPos.z + 24.0) : new THREE.Vector3(0, 14, 24);
        const targetL = pPos ? new THREE.Vector3(pPos.x * 0.55, -1.0 + pPos.y * 0.35, -15.0) : new THREE.Vector3(0, -1, -15);
        this.targetCameraPos.lerp(targetP, p4);
        this.targetLookAt.lerp(targetL, p4);
      }
    } else if (this.killCamTimer > 0) {
      this.killCamTimer -= dt;
      // Cinematic Kill-Cam: Slow orbital sweep around the exploding boss wreck
      const progress = Math.max(0, 1.0 - (this.killCamTimer / this.killCamDuration));
      const orbitAngle = progress * Math.PI * 0.45;
      const orbitDist = 26.0 - progress * 5.0;

      this.targetCameraPos.set(
        this.killCamTarget.x + Math.sin(orbitAngle) * orbitDist,
        this.killCamTarget.y + 6.0 + Math.sin(progress * Math.PI) * 4.0,
        this.killCamTarget.z + Math.cos(orbitAngle) * orbitDist + 8.0
      );
      this.targetLookAt.copy(this.killCamTarget);
    } else if (bossActive && pPos) {
      const bPos = activeBoss.meshGroup.position;

      if (this.bossIntroTimer > 0) {
        // Dramatic Intro Zoom: Low behind player ship pointing at boss core
        const progress = 1.0 - (this.bossIntroTimer / 2.2);
        this.targetCameraPos.set(
          pPos.x * 0.4,
          8.0 + (1.0 - progress) * 6.0,
          pPos.z + 18.0 - (1.0 - progress) * 8.0
        );
        this.targetLookAt.set(
          bPos.x * 0.8,
          bPos.y * 0.8,
          bPos.z * 0.9
        );
      } else {
        // Dynamic Cinematic Boss Duel Tracking Mode:
        // Camera smoothly follows player craft X/Y/Z while framing the boss core
        this.targetCameraPos.set(
          pPos.x * 0.65,
          13.0 + pPos.y * 0.45,
          pPos.z + 24.0
        );

        // Weighted lookAt target (55% player craft, 45% boss core)
        this.targetLookAt.set(
          pPos.x * 0.55 + bPos.x * 0.45,
          pPos.y * 0.45 + bPos.y * 0.55,
          pPos.z * 0.25 + bPos.z * 0.75
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
    const lerpSpeed = (this.planetCinematicTimer > 0) ? 0.16 : ((this.killCamTimer > 0) ? 0.14 : (bossActive ? 0.12 : 0.08));
    this.camera.position.lerp(this.targetCameraPos, lerpSpeed);

    // Smooth lookAt target lerp
    this.currentCamLookAt.lerp(this.targetLookAt, lerpSpeed);
    this.camera.lookAt(this.currentCamLookAt);

    // Dynamic camera roll/tilt when banking during dogfights
    if (this.cameraMode !== 'topdown' && this.killCamTimer <= 0 && this.planetCinematicTimer <= 0) {
      const targetRoll = -pVel.x * (bossActive ? 0.035 : 0.02);
      this.camera.rotation.z += (targetRoll - this.camera.rotation.z) * 0.12;
    } else if (this.planetCinematicTimer > 0) {
      const progress = 1.0 - (this.planetCinematicTimer / this.planetCinematicDuration);
      this.camera.rotation.z = Math.sin(progress * Math.PI * 2.0) * 0.05;
    } else if (this.killCamTimer > 0) {
      const progress = 1.0 - (this.killCamTimer / this.killCamDuration);
      this.camera.rotation.z = Math.sin(progress * Math.PI) * 0.08;
    }

    // Screen Shake processing
    if (this.shakeIntensity > 0.01) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity *= 0.88;
    }
  }
}
