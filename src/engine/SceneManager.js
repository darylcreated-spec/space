import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export class SceneManager {
  constructor(container) {
    this.container = container;
    
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x06080e);
    this.scene.fog = new THREE.FogExp2(0x06080e, 0.025);

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.setCameraView('isometric');

    // WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // Orbit Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05; // Don't go below ground
    this.controls.minDistance = 6;
    this.controls.maxDistance = 30;

    // Post-processing pipeline (EffectComposer + UnrealBloomPass)
    this.setupPostProcessing();

    // Lighting setup
    this.setupLighting();

    // Grid Container Group
    this.gridGroup = new THREE.Group();
    this.scene.add(this.gridGroup);

    // Pieces Group
    this.piecesGroup = new THREE.Group();
    this.scene.add(this.piecesGroup);

    // Laser Beams Group
    this.beamsGroup = new THREE.Group();
    this.scene.add(this.beamsGroup);

    // Tile meshes cache map: key `${x},${z}` -> mesh
    this.tileMeshes = new Map();
    this.highlightMesh = null;

    // Event listeners
    window.addEventListener('resize', this.onWindowResize.bind(this));

    // Render loop
    this.renderCallbacks = [];
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  setupPostProcessing() {
    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // Soft neon bloom pass
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.2,  // strength
      0.4,  // radius
      0.85  // threshold (bloom only bright lasers and glowing cores)
    );
    this.composer.addPass(this.bloomPass);
  }

  setupLighting() {
    const ambient = new THREE.AmbientLight(0x1a2238, 1.5);
    this.scene.add(ambient);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight1.position.set(10, 20, 15);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 2048;
    dirLight1.shadow.mapSize.height = 2048;
    dirLight1.shadow.bias = -0.0001;
    this.scene.add(dirLight1);

    const cyanPoint = new THREE.PointLight(0x00f3ff, 1.5, 20);
    cyanPoint.position.set(-10, 8, -10);
    this.scene.add(cyanPoint);

    const magentaPoint = new THREE.PointLight(0xff0077, 1.2, 20);
    magentaPoint.position.set(10, 6, 10);
    this.scene.add(magentaPoint);
  }

  setCameraView(type) {
    if (type === 'isometric') {
      this.camera.position.set(12, 14, 14);
      this.camera.lookAt(0, 0, 0);
    } else if (type === 'topdown') {
      this.camera.position.set(0, 20, 0.01);
      this.camera.lookAt(0, 0, 0);
    }
  }

  toggleCameraView() {
    const isIso = Math.abs(this.camera.position.x) > 2;
    if (isIso) {
      this.setCameraView('topdown');
    } else {
      this.setCameraView('isometric');
    }
  }

  buildGrid(width, height) {
    // Clear old grid tiles
    while (this.gridGroup.children.length > 0) {
      const child = this.gridGroup.children[0];
      if (child.geometry) child.geometry.dispose();
      this.gridGroup.remove(child);
    }
    this.tileMeshes.clear();

    const offsetX = (width - 1) / 2;
    const offsetZ = (height - 1) / 2;

    const tileGeo = new THREE.BoxGeometry(0.94, 0.15, 0.94);
    
    // Metallic dark obsidian material
    const tileMat = new THREE.MeshStandardMaterial({
      color: 0x0f1523,
      roughness: 0.2,
      metalness: 0.8,
    });

    const borderGeo = new THREE.EdgesGeometry(tileGeo);
    const borderMat = new THREE.LineBasicMaterial({
      color: 0x1f2d48,
      transparent: true,
      opacity: 0.6
    });

    for (let x = 0; x < width; x++) {
      for (let z = 0; z < height; z++) {
        const posX = x - offsetX;
        const posZ = z - offsetZ;

        const tileMesh = new THREE.Mesh(tileGeo, tileMat);
        tileMesh.position.set(posX, -0.075, posZ);
        tileMesh.receiveShadow = true;
        tileMesh.userData = { gridX: x, gridZ: z };

        const borderLines = new THREE.LineSegments(borderGeo, borderMat);
        tileMesh.add(borderLines);

        this.gridGroup.add(tileMesh);
        this.tileMeshes.set(`${x},${z}`, tileMesh);
      }
    }

    // Ground platform base below grid
    const platformGeo = new THREE.BoxGeometry(width + 0.6, 0.2, height + 0.6);
    const platformMat = new THREE.MeshStandardMaterial({
      color: 0x080b12,
      roughness: 0.1,
      metalness: 0.9,
    });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.set(0, -0.25, 0);
    platform.receiveShadow = true;
    this.gridGroup.add(platform);

    // Glowing border frame
    const frameGeo = new THREE.BoxGeometry(width + 0.8, 0.05, height + 0.8);
    const frameMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      wireframe: true,
      transparent: true,
      opacity: 0.2
    });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(0, -0.14, 0);
    this.gridGroup.add(frame);

    // Hover Highlight mesh
    if (!this.highlightMesh) {
      const hlGeo = new THREE.BoxGeometry(0.96, 0.18, 0.96);
      const hlMat = new THREE.MeshBasicMaterial({
        color: 0x00f3ff,
        wireframe: true,
        transparent: true,
        opacity: 0.8
      });
      this.highlightMesh = new THREE.Mesh(hlGeo, hlMat);
      this.highlightMesh.visible = false;
      this.scene.add(this.highlightMesh);
    }

    // Center camera orbit target
    this.controls.target.set(0, 0, 0);
  }

  showTileHighlight(x, z, width, height) {
    if (x === null || z === null) {
      if (this.highlightMesh) this.highlightMesh.visible = false;
      return;
    }
    const offsetX = (width - 1) / 2;
    const offsetZ = (height - 1) / 2;
    this.highlightMesh.position.set(x - offsetX, -0.06, z - offsetZ);
    this.highlightMesh.visible = true;
  }

  addRenderCallback(cb) {
    this.renderCallbacks.push(cb);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  animate(timestamp) {
    requestAnimationFrame(this.animate);
    this.controls.update();

    for (const cb of this.renderCallbacks) {
      cb(timestamp);
    }

    this.composer.render();
  }
}
