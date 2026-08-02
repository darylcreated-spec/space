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
    this.setCameraMode('isometric');
    this.camera.position.copy(this.targetCameraPos);
    this.camera.lookAt(this.targetLookAt);

    // WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isMobile,
      powerPreference: 'high-performance',
      alpha: false
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isMobile ? 1.0 : 1.5));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.5;

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
      console.warn('WebGL context lost — recovering...');
    }, false);

    this.renderer.domElement.addEventListener('webglcontextrestored', () => {
      console.log('WebGL context restored.');
      this.renderer.setSize(window.innerWidth, window.innerHeight);
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
    const ambient = new THREE.AmbientLight(0x4a6fa5, 2.5);
    this.scene.add(ambient);

    const sunLight = new THREE.DirectionalLight(0xffffff, 3.5);
    sunLight.position.set(30, 50, 40);
    this.scene.add(sunLight);

    const cyanLight = new THREE.PointLight(0x00f3ff, 4.0, 100);
    cyanLight.position.set(-15, 20, 0);
    this.scene.add(cyanLight);

    const magentaLight = new THREE.PointLight(0xff0077, 3.5, 100);
    magentaLight.position.set(15, 15, -30);
    this.scene.add(magentaLight);
  }

  buildDeepSpaceEnvironment() {
    // 1. Distant Volumetric Nebula Background Orbs
    const neb1Geo = new THREE.SphereGeometry(250, 16, 16);
    const neb1Mat = new THREE.MeshBasicMaterial({
      color: 0x00a2ff,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.15
    });
    this.nebula1 = new THREE.Mesh(neb1Geo, neb1Mat);
    this.nebula1.position.set(-80, 50, -400);
    this.scene.add(this.nebula1);

    const neb2Geo = new THREE.SphereGeometry(300, 16, 16);
    const neb2Mat = new THREE.MeshBasicMaterial({
      color: 0xaa00ff,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.12
    });
    this.nebula2 = new THREE.Mesh(neb2Geo, neb2Mat);
    this.nebula2.position.set(100, -30, -500);
    this.scene.add(this.nebula2);

    // 2. Realistic Spherical Starfield (Smooth Circular Radial Glow, No Cubes)
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

  update(dt, playerVelocity = { x: 0, y: 0 }) {
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

    this.camera.position.lerp(this.targetCameraPos, 0.1);
    this.camera.lookAt(this.targetLookAt);

    if (this.cameraMode === 'chase') {
      const targetRoll = -playerVelocity.x * 0.15;
      this.camera.rotation.z += (targetRoll - this.camera.rotation.z) * 0.1;
    }

    if (this.shakeIntensity > 0.01) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity *= 0.88;
    }
  }
}
