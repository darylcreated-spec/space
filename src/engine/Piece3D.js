import * as THREE from 'three';

// Color map helper
export const COLOR_HEX_MAP = {
  red: 0xff1144,
  green: 0x00ff66,
  blue: 0x0066ff,
  cyan: 0x00f3ff,
  magenta: 0xff0077,
  yellow: 0xffea00,
  white: 0xffffff
};

export class Piece3D {
  constructor(pieceData, gridWidth, gridHeight) {
    this.id = pieceData.id;
    this.type = pieceData.type; // 'emitter', 'target', 'mirror', 'prism', 'filter', 'splitter'
    this.color = pieceData.color || 'white';
    this.movable = pieceData.movable !== false;
    this.rotatable = pieceData.rotatable !== false;
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;

    // Target grid coordinates
    this.gridX = pieceData.x;
    this.gridZ = pieceData.z;
    this.orientation = pieceData.orientation || 0; // 0: East (+X), 1: South (+Z), 2: West (-X), 3: North (-Z)

    // Smooth Physics Spring Interpolation
    this.targetPos = this.gridToWorld(this.gridX, this.gridZ);
    this.currentPos = this.targetPos.clone();

    this.targetRotY = this.orientationToAngle(this.orientation);
    this.currentRotY = this.targetRotY;

    // State
    this.isCharged = false; // For target cores

    // Main Mesh Group
    this.meshGroup = new THREE.Group();
    this.meshGroup.position.copy(this.currentPos);
    this.meshGroup.rotation.y = this.currentRotY;
    this.meshGroup.userData = { piece3D: this };

    // Build model geometry based on type
    this.buildModel();
  }

  gridToWorld(gx, gz) {
    const offsetX = (this.gridWidth - 1) / 2;
    const offsetZ = (this.gridHeight - 1) / 2;
    return new THREE.Vector3(gx - offsetX, 0.05, gz - offsetZ);
  }

  orientationToAngle(ori) {
    // 0 -> 0 rad (+X), 1 -> -PI/2 (+Z), 2 -> -PI (-X), 3 -> -3PI/2 (-Z)
    return -ori * (Math.PI / 2);
  }

  buildModel() {
    switch (this.type) {
      case 'emitter':
        this.buildEmitter();
        break;
      case 'target':
        this.buildTarget();
        break;
      case 'mirror':
        this.buildMirror();
        break;
      case 'prism':
        this.buildPrism();
        break;
      case 'filter':
        this.buildFilter();
        break;
      case 'splitter':
        this.buildSplitter();
        break;
      default:
        this.buildDefaultBlock();
        break;
    }

    // Add base plate highlight for movable pieces
    if (this.movable) {
      const ringGeo = new THREE.RingGeometry(0.38, 0.42, 32);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x00f3ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = 0.01;
      this.meshGroup.add(ring);
    }
  }

  buildEmitter() {
    // High-tech sleek laser canon
    const baseGeo = new THREE.CylinderGeometry(0.35, 0.4, 0.2, 16);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x151a28, metalness: 0.9, roughness: 0.2 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.1;
    this.meshGroup.add(base);

    // Barrel pointing forward (+X)
    const barrelGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.4, 16);
    barrelGeo.rotateZ(-Math.PI / 2);
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x222a3d, metalness: 0.9, roughness: 0.1 });
    const barrel = new THREE.Mesh(barrelGeo, barrelMat);
    barrel.position.set(0.15, 0.25, 0);
    this.meshGroup.add(barrel);

    // Glowing emitter lens core
    const lensGeo = new THREE.SphereGeometry(0.1, 16, 16);
    const hexColor = COLOR_HEX_MAP[this.color] || 0xffffff;
    this.lensMat = new THREE.MeshBasicMaterial({ color: hexColor });
    const lens = new THREE.Mesh(lensGeo, this.lensMat);
    lens.position.set(0.32, 0.25, 0);
    this.meshGroup.add(lens);

    // Glowing point light
    this.emitterLight = new THREE.PointLight(hexColor, 1.5, 3);
    this.emitterLight.position.set(0.35, 0.25, 0);
    this.meshGroup.add(this.emitterLight);
  }

  buildTarget() {
    // Energy receptor core ring
    const baseGeo = new THREE.CylinderGeometry(0.38, 0.42, 0.15, 24);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x121622, metalness: 0.8, roughness: 0.3 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.075;
    this.meshGroup.add(base);

    // Outer receptor cage pillars
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const pGeo = new THREE.BoxGeometry(0.06, 0.4, 0.06);
      const pMat = new THREE.MeshStandardMaterial({ color: 0x2a354d, metalness: 0.9, roughness: 0.1 });
      const p = new THREE.Mesh(pGeo, pMat);
      p.position.set(Math.cos(angle) * 0.3, 0.25, Math.sin(angle) * 0.3);
      this.meshGroup.add(p);
    }

    // Inner target floating crystal sphere
    const sphereGeo = new THREE.IcosahedronGeometry(0.2, 2);
    const hexColor = COLOR_HEX_MAP[this.color] || 0x00f3ff;
    
    this.targetCoreMat = new THREE.MeshStandardMaterial({
      color: hexColor,
      emissive: 0x000000,
      roughness: 0.1,
      metalness: 0.5,
      transparent: true,
      opacity: 0.85
    });
    this.targetCore = new THREE.Mesh(sphereGeo, this.targetCoreMat);
    this.targetCore.position.y = 0.25;
    this.meshGroup.add(this.targetCore);

    // Target aura ring
    const auraGeo = new THREE.TorusGeometry(0.32, 0.02, 16, 32);
    auraGeo.rotateX(Math.PI / 2);
    this.targetAuraMat = new THREE.MeshBasicMaterial({ color: hexColor, transparent: true, opacity: 0.3 });
    const aura = new THREE.Mesh(auraGeo, this.targetAuraMat);
    aura.position.y = 0.25;
    this.meshGroup.add(aura);

    this.targetLight = new THREE.PointLight(hexColor, 0, 4);
    this.targetLight.position.y = 0.25;
    this.meshGroup.add(this.targetLight);
  }

  buildMirror() {
    // Base platform
    const baseGeo = new THREE.CylinderGeometry(0.38, 0.4, 0.1, 16);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x182032, metalness: 0.8, roughness: 0.2 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.05;
    this.meshGroup.add(base);

    // Mirror block angled at 45 degrees relative to orientation
    const mirrorFrameGeo = new THREE.BoxGeometry(0.1, 0.5, 0.65);
    mirrorFrameGeo.rotateY(Math.PI / 4); // 45 degree diagonal mirror surface
    const mirrorFrameMat = new THREE.MeshStandardMaterial({ color: 0x0b0e17, metalness: 0.9, roughness: 0.1 });
    const frame = new THREE.Mesh(mirrorFrameGeo, mirrorFrameMat);
    frame.position.y = 0.3;
    this.meshGroup.add(frame);

    // Reflective Mirror Glass Pane
    const paneGeo = new THREE.BoxGeometry(0.02, 0.44, 0.58);
    paneGeo.rotateY(Math.PI / 4);
    const paneMat = new THREE.MeshPhysicalMaterial({
      color: 0xe0f7fc,
      metalness: 1.0,
      roughness: 0.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.0,
      reflectivity: 1.0
    });
    const pane = new THREE.Mesh(paneGeo, paneMat);
    pane.position.y = 0.3;
    this.meshGroup.add(pane);

    // Mirror edge neon trim
    const trimGeo = new THREE.EdgesGeometry(paneGeo);
    const trimMat = new THREE.LineBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0.7 });
    const trim = new THREE.LineSegments(trimGeo, trimMat);
    trim.position.y = 0.3;
    this.meshGroup.add(trim);
  }

  buildPrism() {
    // Triangular prism glass block
    const shape = new THREE.Shape();
    shape.moveTo(-0.3, -0.3);
    shape.lineTo(0.3, -0.3);
    shape.lineTo(0, 0.3);
    shape.closePath();

    const extrudeSettings = { depth: 0.5, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.02, bevelThickness: 0.02 };
    const prismGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    prismGeo.center();
    prismGeo.rotateX(Math.PI / 2);

    const prismMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.95,
      opacity: 1.0,
      transparent: true,
      roughness: 0.05,
      ior: 1.8,
      thickness: 0.5,
      specularIntensity: 1.0,
      clearcoat: 1.0
    });

    const prismMesh = new THREE.Mesh(prismGeo, prismMat);
    prismMesh.position.y = 0.3;
    this.meshGroup.add(prismMesh);

    // Wireframe neon accents
    const edgeGeo = new THREE.EdgesGeometry(prismGeo);
    const edgeMat = new THREE.LineBasicMaterial({ color: 0xff0077, transparent: true, opacity: 0.8 });
    const edges = new THREE.LineSegments(edgeGeo, edgeMat);
    edges.position.y = 0.3;
    this.meshGroup.add(edges);
  }

  buildFilter() {
    // Filter frame
    const frameGeo = new THREE.BoxGeometry(0.12, 0.55, 0.7);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x182030, metalness: 0.8, roughness: 0.2 });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.y = 0.3;
    this.meshGroup.add(frame);

    // Filter Tinted Glass Pane
    const paneGeo = new THREE.BoxGeometry(0.04, 0.48, 0.6);
    const hexColor = COLOR_HEX_MAP[this.color] || 0xff0077;
    const paneMat = new THREE.MeshPhysicalMaterial({
      color: hexColor,
      transmission: 0.8,
      transparent: true,
      opacity: 0.9,
      roughness: 0.1,
      ior: 1.5
    });
    const pane = new THREE.Mesh(paneGeo, paneMat);
    pane.position.y = 0.3;
    this.meshGroup.add(pane);

    // Glowing border outline
    const glowGeo = new THREE.EdgesGeometry(paneGeo);
    const glowMat = new THREE.LineBasicMaterial({ color: hexColor });
    const glow = new THREE.LineSegments(glowGeo, glowMat);
    glow.position.y = 0.3;
    this.meshGroup.add(glow);
  }

  buildSplitter() {
    // Cube beam splitter block
    const boxGeo = new THREE.BoxGeometry(0.55, 0.55, 0.55);
    const boxMat = new THREE.MeshPhysicalMaterial({
      color: 0x00f3ff,
      transmission: 0.85,
      transparent: true,
      opacity: 0.9,
      roughness: 0.05,
      ior: 1.6
    });
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.position.y = 0.3;
    this.meshGroup.add(box);

    // Diagonal internal splitting plane
    const diagGeo = new THREE.PlaneGeometry(0.7, 0.5);
    diagGeo.rotateY(Math.PI / 4);
    const diagMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
    const diag = new THREE.Mesh(diagGeo, diagMat);
    diag.position.y = 0.3;
    this.meshGroup.add(diag);
  }

  buildDefaultBlock() {
    const geo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const mat = new THREE.MeshStandardMaterial({ color: 0x444444 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.3;
    this.meshGroup.add(mesh);
  }

  setCharged(charged, incomingColor = null) {
    this.isCharged = charged;
    if (this.type === 'target') {
      if (charged) {
        const hexColor = COLOR_HEX_MAP[incomingColor || this.color] || 0x00f3ff;
        this.targetCoreMat.emissive.setHex(hexColor);
        this.targetCoreMat.emissiveIntensity = 2.0;
        this.targetLight.color.setHex(hexColor);
        this.targetLight.intensity = 3.0;
        this.targetAuraMat.opacity = 0.9;
      } else {
        this.targetCoreMat.emissive.setHex(0x000000);
        this.targetLight.intensity = 0;
        this.targetAuraMat.opacity = 0.3;
      }
    }
  }

  rotate90() {
    if (!this.rotatable) return false;
    this.orientation = (this.orientation + 1) % 4;
    this.targetRotY = this.orientationToAngle(this.orientation);
    return true;
  }

  moveTo(gx, gz) {
    if (!this.movable) return false;
    this.gridX = gx;
    this.gridZ = gz;
    this.targetPos = this.gridToWorld(gx, gz);
    return true;
  }

  update(dt) {
    // Spring / Damped interpolation for position
    this.currentPos.lerp(this.targetPos, 0.25);
    this.meshGroup.position.copy(this.currentPos);

    // Angle interpolation handling wrap-around
    let diffRot = this.targetRotY - this.currentRotY;
    this.currentRotY += diffRot * 0.3;
    this.meshGroup.rotation.y = this.currentRotY;

    // Idle floating / pulsing animation
    if (this.type === 'target' && this.targetCore) {
      const time = performance.now() * 0.003;
      this.targetCore.position.y = 0.25 + Math.sin(time) * 0.03;
      this.targetCore.rotation.y += 0.01;
    }
  }
}
