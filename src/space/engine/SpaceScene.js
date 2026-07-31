import * as THREE from 'three';

export class SpaceScene {
  constructor(container) {
    this.container = typeof container === 'string' ? document.getElementById(container) : container;
    if (!this.container) {
      this.container = document.getElementById('canvas-container') || document.body;
    }
    
    // 3D Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060a14);
    this.scene.fog = new THREE.FogExp2(0x060a14, 0.005);

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );

    // Camera Modes: 'isometric', 'chase', 'topdown'
    this.cameraMode = 'isometric'; 
    this.targetCameraPos = new THREE.Vector3();
    this.targetLookAt = new THREE.Vector3();
    this.setCameraMode('isometric');

    // Immediately snap camera position
    this.camera.position.copy(this.targetCameraPos);
    this.camera.lookAt(this.targetLookAt);

    // WebGL Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.6;

    // Force append WebGL canvas to container
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.top = '0';
    this.renderer.domElement.style.left = '0';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.zIndex = '1';

    this.container.appendChild(this.renderer.domElement);

    // High Brightness Lighting setup
    this.setupLighting();

    // Environment: Lumina Obsidian Grid Platform, Home Planet, Atmosphere, Starfield, Space Dust
    this.buildEnvironment();

    // Dynamic Entity Groups
    this.entitiesGroup = new THREE.Group();
    this.scene.add(this.entitiesGroup);

    this.projectilesGroup = new THREE.Group();
    this.scene.add(this.projectilesGroup);

    // Screen Shake Intensity
    this.shakeIntensity = 0;

    // Event listeners
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  setupLighting() {
    const ambient = new THREE.AmbientLight(0x4a6fa5, 2.5);
    this.scene.add(ambient);

    // Main Sun light
    const sunLight = new THREE.DirectionalLight(0xffffff, 3.5);
    sunLight.position.set(30, 50, 40);
    this.scene.add(sunLight);

    // Lumina Cyan Point Light
    const cyanLight = new THREE.PointLight(0x00f3ff, 4.0, 100);
    cyanLight.position.set(-15, 20, 0);
    this.scene.add(cyanLight);

    // Lumina Magenta Point Light
    const magentaLight = new THREE.PointLight(0xff0077, 3.5, 100);
    magentaLight.position.set(15, 15, -30);
    this.scene.add(magentaLight);
  }

  buildEnvironment() {
    // 1. Lumina Dark Obsidian Tactical Defense Grid Platform
    this.gridGroup = new THREE.Group();
    const gridWidth = 50;
    const gridDepth = 80;
    
    // Base Obsidian Platform
    const platGeo = new THREE.BoxGeometry(gridWidth, 0.5, gridDepth);
    const platMat = new THREE.MeshStandardMaterial({
      color: 0x121a2c,
      roughness: 0.2,
      metalness: 0.8
    });
    const platform = new THREE.Mesh(platGeo, platMat);
    platform.position.set(0, -6, -20);
    this.gridGroup.add(platform);

    // Glowing Grid Wireframe Lines
    const gridHelper = new THREE.GridHelper(gridWidth, 25, 0x00f3ff, 0x334466);
    gridHelper.position.set(0, -5.74, -20);
    this.gridGroup.add(gridHelper);

    // Glowing Neon Border Frame around Defense Platform
    const borderGeo = new THREE.BoxGeometry(gridWidth + 0.8, 0.2, gridDepth + 0.8);
    const borderMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      wireframe: true,
      transparent: true,
      opacity: 0.6
    });
    const borderFrame = new THREE.Mesh(borderGeo, borderMat);
    borderFrame.position.set(0, -5.72, -20);
    this.gridGroup.add(borderFrame);

    this.scene.add(this.gridGroup);

    // 2. Home Planet (Positioned below/behind the tactical grid)
    const planetGeo = new THREE.SphereGeometry(40, 64, 64);
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

    // Planet Atmosphere Ring
    const atmoGeo = new THREE.SphereGeometry(43, 64, 64);
    const atmoMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      wireframe: true,
      transparent: true,
      opacity: 0.25
    });
    this.atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
    this.atmoMesh.position.copy(this.planetMesh.position);
    this.scene.add(this.atmoMesh);

    // 3. Lumina Ambient Void Starfield Backdrop
    const starCount = 1500;
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

      const colorType = Math.random();
      if (colorType > 0.7) {
        starColors[i * 3] = 0.0; starColors[i * 3 + 1] = 0.95; starColors[i * 3 + 2] = 1.0; // Cyan
      } else if (colorType > 0.4) {
        starColors[i * 3] = 1.0; starColors[i * 3 + 1] = 0.0; starColors[i * 3 + 2] = 0.5; // Magenta
      } else {
        starColors[i * 3] = 1.0; starColors[i * 3 + 1] = 1.0; starColors[i * 3 + 2] = 1.0;
      }
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 3.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.9
    });

    this.starField = new THREE.Points(starGeo, starMat);
    this.scene.add(this.starField);

    // 4. Floating Space Dust Particles
    const dustCount = 500;
    const dustGeo = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustCount * 3);

    for (let i = 0; i < dustCount; i++) {
      dustPositions[i * 3] = (Math.random() - 0.5) * 100;
      dustPositions[i * 3 + 1] = (Math.random() - 0.5) * 70;
      dustPositions[i * 3 + 2] = -Math.random() * 160;
    }

    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));

    const dustMat = new THREE.PointsMaterial({
      color: 0x00f3ff,
      size: 0.5,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });

    this.dustPoints = new THREE.Points(dustGeo, dustMat);
    this.scene.add(this.dustPoints);
  }

  setCameraMode(mode) {
    this.cameraMode = mode;
    if (mode === 'isometric') {
      // Direct overview framing ship at (0, 0, 0) and grid platform at (0, -6, -20)
      this.targetCameraPos.set(0, 14, 24);
      this.targetLookAt.set(0, -1, -15);
    } else if (mode === 'chase') {
      // Dynamic rear fighter chase camera
      this.targetCameraPos.set(0, 5, 18);
      this.targetLookAt.set(0, 0, -30);
    } else if (mode === 'topdown') {
      // Overhead tactical command view
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
    this.shakeIntensity = Math.min(2.5, this.shakeIntensity + amount);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  update(dt, playerVelocity = { x: 0, y: 0 }) {
    // Planet & Starfield slow rotation
    if (this.planetMesh) this.planetMesh.rotation.y += 0.001;
    if (this.atmoMesh) this.atmoMesh.rotation.y -= 0.0015;
    if (this.starField) this.starField.rotation.y += 0.0002;

    // Space dust floating movement
    if (this.dustPoints) {
      const positions = this.dustPoints.geometry.attributes.position.array;
      for (let i = 0; i < positions.length / 3; i++) {
        positions[i * 3 + 2] += 0.5;
        if (positions[i * 3 + 2] > 30) {
          positions[i * 3 + 2] = -140;
        }
      }
      this.dustPoints.geometry.attributes.position.needsUpdate = true;
    }

    // Smooth camera transition toward targetCameraPos and targetLookAt
    this.camera.position.lerp(this.targetCameraPos, 0.1);
    this.camera.lookAt(this.targetLookAt);

    // Roll banking in chase mode
    if (this.cameraMode === 'chase') {
      const targetRoll = -playerVelocity.x * 0.15;
      this.camera.rotation.z += (targetRoll - this.camera.rotation.z) * 0.1;
    }

    // Screen Shake decay
    if (this.shakeIntensity > 0.01) {
      const rx = (Math.random() - 0.5) * this.shakeIntensity;
      const ry = (Math.random() - 0.5) * this.shakeIntensity;
      this.camera.position.x += rx;
      this.camera.position.y += ry;
      this.shakeIntensity *= 0.9;
    }
  }
}
