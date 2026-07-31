import * as THREE from 'three';

export class SpaceScene {
  constructor(container) {
    this.container = typeof container === 'string' ? document.getElementById(container) : container;
    if (!this.container) {
      this.container = document.getElementById('canvas-container') || document.body;
    }

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060a14);
    this.scene.fog = new THREE.FogExp2(0x060a14, 0.005);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);

    this.cameraMode = 'isometric';
    this.targetCameraPos = new THREE.Vector3();
    this.targetLookAt = new THREE.Vector3();
    this.setCameraMode('isometric');
    this.camera.position.copy(this.targetCameraPos);
    this.camera.lookAt(this.targetLookAt);

    // Mobile: disable antialias on high-DPI, cap pixel ratio to 1.5
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    this.renderer = new THREE.WebGLRenderer({
      antialias: !isMobile,
      powerPreference: 'high-performance',
      alpha: false
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.0 : 1.5));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.4;

    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.top = '0';
    this.renderer.domElement.style.left = '0';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.zIndex = '1';
    this.container.appendChild(this.renderer.domElement);

    // WebGL Context Loss recovery
    this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      console.warn('WebGL context lost — waiting to restore...');
    }, false);
    this.renderer.domElement.addEventListener('webglcontextrestored', () => {
      console.log('WebGL context restored.');
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    }, false);

    this.setupLighting();
    this.buildEnvironment();

    this.entitiesGroup = new THREE.Group();
    this.scene.add(this.entitiesGroup);

    this.shakeIntensity = 0;
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  setupLighting() {
    this.scene.add(new THREE.AmbientLight(0x4a6fa5, 2.5));

    const sunLight = new THREE.DirectionalLight(0xffffff, 3.5);
    sunLight.position.set(30, 50, 40);
    this.scene.add(sunLight);

    const cyanLight = new THREE.PointLight(0x00f3ff, 3.5, 100);
    cyanLight.position.set(-15, 20, 0);
    this.scene.add(cyanLight);

    const magentaLight = new THREE.PointLight(0xff0077, 3.0, 100);
    magentaLight.position.set(15, 15, -30);
    this.scene.add(magentaLight);
  }

  buildEnvironment() {
    // Defense Grid Platform
    const platGeo = new THREE.BoxGeometry(50, 0.5, 80);
    const platMat = new THREE.MeshStandardMaterial({ color: 0x121a2c, roughness: 0.3, metalness: 0.7 });
    const platform = new THREE.Mesh(platGeo, platMat);
    platform.position.set(0, -6, -20);
    this.scene.add(platform);

    const gridHelper = new THREE.GridHelper(50, 20, 0x00f3ff, 0x334466);
    gridHelper.position.set(0, -5.74, -20);
    this.scene.add(gridHelper);

    // Home Planet — reduced poly count for mobile
    const planetGeo = new THREE.SphereGeometry(35, 24, 24);
    const planetMat = new THREE.MeshStandardMaterial({
      color: 0x0e4b75,
      roughness: 0.3,
      metalness: 0.3,
      emissive: 0x002b55,
      emissiveIntensity: 0.6
    });
    this.planetMesh = new THREE.Mesh(planetGeo, planetMat);
    this.planetMesh.position.set(0, -55, -120);
    this.scene.add(this.planetMesh);

    const atmoGeo = new THREE.SphereGeometry(37, 20, 20);
    const atmoMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, wireframe: true, transparent: true, opacity: 0.2 });
    this.atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
    this.atmoMesh.position.copy(this.planetMesh.position);
    this.scene.add(this.atmoMesh);

    // Starfield — 600 stars (mobile safe)
    const starCount = 600;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const r = 600 + Math.random() * 400;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2.0 * Math.random() - 1.0);
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);
      const ct = Math.random();
      if (ct > 0.7) { starColors[i * 3] = 0; starColors[i * 3 + 1] = 0.95; starColors[i * 3 + 2] = 1.0; }
      else if (ct > 0.4) { starColors[i * 3] = 1; starColors[i * 3 + 1] = 0; starColors[i * 3 + 2] = 0.5; }
      else { starColors[i * 3] = 1; starColors[i * 3 + 1] = 1; starColors[i * 3 + 2] = 1; }
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    this.starField = new THREE.Points(starGeo, new THREE.PointsMaterial({ size: 2.5, vertexColors: true, transparent: true, opacity: 0.9 }));
    this.scene.add(this.starField);
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
    return this.cameraMode;
  }

  addScreenShake(amount = 0.8) {
    this.shakeIntensity = Math.min(1.5, this.shakeIntensity + amount);
  }

  onWindowResize() {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.0 : 1.5));
  }

  update(dt, playerVelocity = { x: 0, y: 0 }) {
    if (this.planetMesh) this.planetMesh.rotation.y += 0.001;
    if (this.atmoMesh) this.atmoMesh.rotation.y -= 0.0015;
    if (this.starField) this.starField.rotation.y += 0.0002;

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
