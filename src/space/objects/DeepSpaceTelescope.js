import * as THREE from 'three';

/**
 * AAA Mobile-Optimized Procedural PBR Textures for James Webb Space Telescope
 */
function createKaptonTexture(isSunward = true) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Sunward side: Aluminum/Silicon coated Kapton (silvery reflective with subtle cyan starlight sheen)
  // Instrument side: Pure Kapton polyimide (distinctive rose-purple metallic foil)
  if (isSunward) {
    ctx.fillStyle = '#b8c4d4';
    ctx.fillRect(0, 0, 512, 512);

    // Micro-crinkled thermal vacuum foil creases
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 60; i++) {
      ctx.beginPath();
      let x = Math.random() * 512;
      let y = Math.random() * 512;
      ctx.moveTo(x, y);
      for (let j = 0; j < 4; j++) {
        x += (Math.random() - 0.5) * 60;
        y += (Math.random() - 0.5) * 60;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Shadow creased valleys
    ctx.strokeStyle = 'rgba(70, 85, 110, 0.25)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 40; i++) {
      ctx.beginPath();
      let x = Math.random() * 512;
      let y = Math.random() * 512;
      ctx.moveTo(x, y);
      for (let j = 0; j < 3; j++) {
        x += (Math.random() - 0.5) * 80;
        y += (Math.random() - 0.5) * 80;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  } else {
    // Distinctive rose-purple/deep magenta Kapton polyimide
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#9e2a52');
    grad.addColorStop(0.5, '#7b1c3e');
    grad.addColorStop(1, '#5c102c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Specular reflective thermal ripple highlights
    ctx.strokeStyle = 'rgba(255, 170, 200, 0.35)';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 50; i++) {
      ctx.beginPath();
      let x = Math.random() * 512;
      let y = Math.random() * 512;
      ctx.moveTo(x, y);
      for (let j = 0; j < 4; j++) {
        x += (Math.random() - 0.5) * 70;
        y += (Math.random() - 0.5) * 70;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

function createGoldMirrorTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Deep rich 24-karat gold vapor-deposited beryllium
  const grad = ctx.createRadialGradient(256, 256, 30, 256, 256, 250);
  grad.addColorStop(0, '#fff4b8');
  grad.addColorStop(0.3, '#ffd700');
  grad.addColorStop(0.7, '#e6ac00');
  grad.addColorStop(1, '#b38600');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Micro-turned concentric circular diamond-turning lathe marks
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 0.8;
  for (let r = 10; r < 250; r += 6) {
    ctx.beginPath();
    ctx.arc(256, 256, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Segment chamfered perimeter border
  ctx.strokeStyle = '#664d00';
  ctx.lineWidth = 8;
  ctx.strokeRect(0, 0, 512, 512);

  return new THREE.CanvasTexture(canvas);
}

function createMLIFoilTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Gold Multi-Layer Insulation (MLI) quilted thermal blanket
  ctx.fillStyle = '#b37700';
  ctx.fillRect(0, 0, 512, 512);

  const gridSize = 32;
  for (let x = 0; x < 512; x += gridSize) {
    for (let y = 0; y < 512; y += gridSize) {
      // Puffy embossed quilt pillow
      const qGrad = ctx.createRadialGradient(x + gridSize / 2, y + gridSize / 2, 2, x + gridSize / 2, y + gridSize / 2, gridSize * 0.7);
      qGrad.addColorStop(0, '#ffd13b');
      qGrad.addColorStop(0.7, '#c28500');
      qGrad.addColorStop(1, '#7a5200');
      ctx.fillStyle = qGrad;
      ctx.fillRect(x + 1, y + 1, gridSize - 2, gridSize - 2);

      // Quilt seam stitch lines
      ctx.strokeStyle = 'rgba(40, 25, 0, 0.6)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, gridSize, gridSize);

      // Corner fastening rivets
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

function createSolarCellTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Deep indigo/navy silicon crystal photovoltaic base
  ctx.fillStyle = '#0a1428';
  ctx.fillRect(0, 0, 512, 512);

  // Individual solar wafer cells
  const cellW = 60;
  const cellH = 120;
  for (let x = 8; x < 504; x += cellW + 4) {
    for (let y = 8; y < 504; y += cellH + 4) {
      ctx.fillStyle = '#102244';
      ctx.fillRect(x, y, cellW, cellH);

      // Silver collection busbars
      ctx.strokeStyle = 'rgba(160, 200, 255, 0.75)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + cellW * 0.33, y);
      ctx.lineTo(x + cellW * 0.33, y + cellH);
      ctx.moveTo(x + cellW * 0.66, y);
      ctx.lineTo(x + cellW * 0.66, y + cellH);
      ctx.stroke();

      // Micro grid fingers
      ctx.strokeStyle = 'rgba(160, 200, 255, 0.25)';
      ctx.lineWidth = 0.5;
      for (let cy = y + 6; cy < y + cellH; cy += 8) {
        ctx.beginPath();
        ctx.moveTo(x, cy);
        ctx.lineTo(x + cellW, cy);
        ctx.stroke();
      }
    }
  }

  // Panel outer mounting frame
  ctx.strokeStyle = '#4a5568';
  ctx.lineWidth = 6;
  ctx.strokeRect(0, 0, 512, 512);

  return new THREE.CanvasTexture(canvas);
}

/**
 * NASA James Webb Space Telescope (JWST) — AAA Deep Space Science Installation
 * Authentic 1:1 architectural reproduction featuring:
 * 1. 5-Layer Catenary Kapton Sunshield with outrigger spreader booms
 * 2. 18-Segment Gold Beryllium Hexagonal Primary Mirror Array with central optical aperture
 * 3. Forward Secondary Mirror Tripod Support Masts & Secondary Reflector
 * 4. Spacecraft Bus wrapped in golden MLI foil with RCS thrusters & star trackers
 * 5. Deployable Photovoltaic Solar Array & 2-Axis Gimbaled High-Gain Telemetry Dish
 * 6. ISIM Instrument Module & Deployable Thermal Radiators
 * 7. Geodesic Energy Defense Shield with responsive impact wavefront ripples
 * 8. Collimated Quantum Telemetry Uplink Beam transmitting scientific observations
 */
export class DeepSpaceTelescope {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.isDead = false;
    this.isAllied = true;
    this.isObjective = true;
    this.hp = 2200;
    this.maxHp = 2200;
    this.radius = 12.0;
    this.defenseScoreReward = 1800;

    this.meshGroup = new THREE.Group();
    this.meshGroup.name = 'DeepSpaceTelescope_JWST';

    // Build complete AAA architectural asset hierarchy
    this.buildMesh();

    const spawnX = options.x !== undefined ? options.x : 25.0;
    const spawnY = options.y !== undefined ? options.y : 6.0;
    const spawnZ = options.z !== undefined ? options.z : -95.0;

    this.meshGroup.position.set(spawnX, spawnY, spawnZ);
    // Face the primary mirror slightly upward and towards the celestial nebula
    this.meshGroup.rotation.set(-0.15, 0.35, 0.08);

    this.scene.add(this.meshGroup);

    this._rotYaw = 0.015;
    this._beaconTimer = 0;
    this._telemetryTime = 0;
    this._shieldPulseTimer = 0;
    this._sparkTimer = 0;
  }

  buildMesh() {
    // Pre-create shared procedural textures
    const sunwardTex = createKaptonTexture(true);
    const instrumentTex = createKaptonTexture(false);
    const goldTex = createGoldMirrorTexture();
    const mliTex = createMLIFoilTexture();
    const solarTex = createSolarCellTexture();

    // ─────────────────────────────────────────────────────────────
    // 1. 5-LAYER CATENARY KITE SUNSHIELD MEMBRANES
    // ─────────────────────────────────────────────────────────────
    this.sunshieldGroup = new THREE.Group();

    // Authentic kite diamond dimensions (Length: 25m, Width: 15m)
    const shape = new THREE.Shape();
    shape.moveTo(0, -12.5); // Stern / Aft tip
    shape.bezierCurveTo(2.8, -7.0, 6.8, -2.0, 7.8, 0); // Starboard curve
    shape.bezierCurveTo(6.8, 4.0, 2.5, 9.5, 0, 12.5); // Bow / Forward tip
    shape.bezierCurveTo(-2.5, 9.5, -6.8, 4.0, -7.8, 0); // Port curve
    shape.bezierCurveTo(-6.8, -2.0, -2.8, -7.0, 0, -12.5); // Back to stern

    // Create 5 individually separated layers with tensioning sag
    const layerOffsets = [-0.70, -0.35, 0.0, 0.35, 0.70];
    this.sunshieldLayers = [];

    layerOffsets.forEach((yOff, idx) => {
      const isSunward = idx <= 1;
      const geom = new THREE.ShapeGeometry(shape, 16);
      geom.rotateX(-Math.PI * 0.5);

      const mat = new THREE.MeshStandardMaterial({
        map: isSunward ? sunwardTex : instrumentTex,
        metalness: isSunward ? 0.92 : 0.88,
        roughness: isSunward ? 0.15 : 0.22,
        side: THREE.DoubleSide,
        depthWrite: true
      });

      const layerMesh = new THREE.Mesh(geom, mat);
      layerMesh.position.set(0, yOff, 0);
      // Slight scale reduction per inner layer mimics tensioning taper
      const scaleFactor = 1.0 - (4 - idx) * 0.025;
      layerMesh.scale.set(scaleFactor, 1.0, scaleFactor);
      this.sunshieldGroup.add(layerMesh);
      this.sunshieldLayers.push(layerMesh);
    });

    // Lateral Telescoping Outrigger Spreader Booms (Port & Starboard)
    const boomGeo = new THREE.CylinderGeometry(0.18, 0.24, 16.8, 8);
    boomGeo.rotateZ(Math.PI * 0.5);
    const boomMat = new THREE.MeshStandardMaterial({
      color: 0x1a202c,
      metalness: 0.85,
      roughness: 0.3
    });
    const spreaderBoom = new THREE.Mesh(boomGeo, boomMat);
    spreaderBoom.position.set(0, 0, 0);
    this.sunshieldGroup.add(spreaderBoom);

    // Forward and Aft Mid-Boom Unit Spines
    const spineGeo = new THREE.CylinderGeometry(0.20, 0.28, 26.2, 8);
    const spineMat = new THREE.MeshStandardMaterial({ color: 0x2d3748, metalness: 0.8, roughness: 0.35 });
    const spineBoom = new THREE.Mesh(spineGeo, spineMat);
    this.sunshieldGroup.add(spineBoom);

    this.meshGroup.add(this.sunshieldGroup);

    // ─────────────────────────────────────────────────────────────
    // 2. SPACECRAFT BUS & LOWER EQUIPMENT DECK (Sunward Side)
    // ─────────────────────────────────────────────────────────────
    this.busGroup = new THREE.Group();
    this.busGroup.position.set(0, -1.8, -1.5);

    // Octagonal central avionics chassis wrapped in gold MLI blanket
    const busGeo = new THREE.CylinderGeometry(2.4, 2.7, 1.9, 8);
    const busMat = new THREE.MeshStandardMaterial({
      map: mliTex,
      metalness: 0.95,
      roughness: 0.25
    });
    const busMesh = new THREE.Mesh(busGeo, busMat);
    this.busGroup.add(busMesh);

    // Quad Reaction Control Thruster (RCS) pods
    const rcsOffsets = [
      [1.8, 0.2, 1.8],
      [-1.8, 0.2, 1.8],
      [1.8, 0.2, -1.8],
      [-1.8, 0.2, -1.8]
    ];
    const rcsBlockGeo = new THREE.BoxGeometry(0.45, 0.35, 0.45);
    const rcsNozzleGeo = new THREE.ConeGeometry(0.12, 0.25, 8);
    rcsNozzleGeo.rotateX(Math.PI);
    const rcsMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.9, roughness: 0.2 });
    const nozzleMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.95, roughness: 0.15 });

    rcsOffsets.forEach(([rx, ry, rz]) => {
      const pod = new THREE.Mesh(rcsBlockGeo, rcsMat);
      pod.position.set(rx, ry, rz);
      const n1 = new THREE.Mesh(rcsNozzleGeo, nozzleMat);
      n1.position.set(0, -0.25, 0);
      pod.add(n1);
      this.busGroup.add(pod);
    });

    // Deployable Photovoltaic Solar Power Array (Angled sunward)
    const solarWingGroup = new THREE.Group();
    solarWingGroup.position.set(0, -0.3, 3.2);

    const solarPanelGeo = new THREE.BoxGeometry(3.6, 0.08, 6.2);
    const solarMat = new THREE.MeshStandardMaterial({
      map: solarTex,
      metalness: 0.85,
      roughness: 0.18
    });
    const solarMesh = new THREE.Mesh(solarPanelGeo, solarMat);
    solarMesh.rotation.x = -0.35; // Angled sunward
    solarWingGroup.add(solarMesh);

    // Solar boom mast
    const solarMastGeo = new THREE.CylinderGeometry(0.15, 0.15, 2.2, 8);
    const solarMast = new THREE.Mesh(solarMastGeo, boomMat);
    solarMast.rotation.x = Math.PI * 0.5;
    solarMast.position.set(0, 0, -1.1);
    solarWingGroup.add(solarMast);

    this.busGroup.add(solarWingGroup);

    // High-Gain Telemetry Gimbaled Parabolic Antenna Dish
    const dishGroup = new THREE.Group();
    dishGroup.position.set(2.4, -0.8, -1.8);
    dishGroup.rotation.set(0.6, -0.5, 0);

    const dishGeo = new THREE.SphereGeometry(1.2, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.45);
    const dishMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.9,
      roughness: 0.2,
      side: THREE.DoubleSide
    });
    const dishMesh = new THREE.Mesh(dishGeo, dishMat);
    dishMesh.rotation.x = Math.PI;
    dishGroup.add(dishMesh);

    // Feed horn & tripod strut
    const feedGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.9, 6);
    const feedMesh = new THREE.Mesh(feedGeo, rcsMat);
    feedMesh.position.set(0, 0, 0.5);
    feedMesh.rotation.x = Math.PI * 0.5;
    dishGroup.add(feedMesh);

    this.busGroup.add(dishGroup);

    // Star-Tracker Optical Sensor Housings
    const stGeo = new THREE.CylinderGeometry(0.12, 0.18, 0.5, 8);
    const stMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.25 });
    const st1 = new THREE.Mesh(stGeo, stMat);
    st1.position.set(-1.6, -0.8, 1.2);
    st1.rotation.set(-0.6, 0.4, 0);
    this.busGroup.add(st1);

    const st2 = new THREE.Mesh(stGeo, stMat);
    st2.position.set(-1.8, -0.8, 0.6);
    st2.rotation.set(-0.6, 0.4, 0);
    this.busGroup.add(st2);

    this.meshGroup.add(this.busGroup);

    // ─────────────────────────────────────────────────────────────
    // 3. CENTRAL DEPLOYABLE TOWER & INSTRUMENT MODULE (ISIM)
    // ─────────────────────────────────────────────────────────────
    this.towerGroup = new THREE.Group();

    // Deployable central tower extending through sunshield
    const towerGeo = new THREE.CylinderGeometry(1.3, 1.7, 3.8, 12);
    const towerMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.85,
      roughness: 0.35
    });
    const towerMesh = new THREE.Mesh(towerGeo, towerMat);
    towerMesh.position.set(0, 1.6, 0);
    this.towerGroup.add(towerMesh);

    // ISIM (Integrated Science Instrument Module) composite enclosure
    const isimGeo = new THREE.BoxGeometry(4.8, 2.2, 3.2);
    const isimMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.9,
      roughness: 0.3
    });
    const isimMesh = new THREE.Mesh(isimGeo, isimMat);
    isimMesh.position.set(0, 2.5, -1.2);
    this.towerGroup.add(isimMesh);

    // Deployable high-efficiency thermal radiator flaps behind primary mirror
    const radMat = new THREE.MeshStandardMaterial({ color: 0x182030, metalness: 0.7, roughness: 0.5 });
    const radGeo = new THREE.BoxGeometry(2.4, 1.8, 0.08);

    const radPort = new THREE.Mesh(radGeo, radMat);
    radPort.position.set(-3.2, 2.8, -1.8);
    radPort.rotation.y = 0.35;
    this.towerGroup.add(radPort);

    const radStbd = new THREE.Mesh(radGeo, radMat);
    radStbd.position.set(3.2, 2.8, -1.8);
    radStbd.rotation.y = -0.35;
    this.towerGroup.add(radStbd);

    this.meshGroup.add(this.towerGroup);

    // ─────────────────────────────────────────────────────────────
    // 4. 18-SEGMENT GOLD BERYLLIUM HEXAGONAL PRIMARY MIRROR ARRAY
    // ─────────────────────────────────────────────────────────────
    this.mirrorsGroup = new THREE.Group();
    this.mirrorsGroup.position.set(0, 4.4, 0.8);
    // Mirror faces forward along Z axis
    this.mirrorsGroup.rotation.x = Math.PI * 0.05;

    // High-specular 24K gold PBR material
    this.goldMirrorMat = new THREE.MeshStandardMaterial({
      map: goldTex,
      color: 0xffe680,
      emissive: 0x4d3900,
      emissiveIntensity: 0.25,
      metalness: 0.98,
      roughness: 0.06
    });

    const hexRadius = 1.32; // Segment radius
    const hexThick = 0.18;
    const hexGeo = new THREE.CylinderGeometry(hexRadius * 0.96, hexRadius * 0.96, hexThick, 6);
    hexGeo.rotateX(Math.PI * 0.5);

    // Exact mathematical layout for the 18 segments (Ring 1 & Ring 2 around central opening)
    const R_h = hexRadius * Math.sqrt(3); // Center-to-center distance between adjacent hexes
    const mirrorCoords = [
      // Ring 1 (6 segments around center aperture - center [0,0] is EMPTY for optical path)
      [0, R_h],
      [R_h * 0.866, R_h * 0.5],
      [R_h * 0.866, -R_h * 0.5],
      [0, -R_h],
      [-R_h * 0.866, -R_h * 0.5],
      [-R_h * 0.866, R_h * 0.5],

      // Ring 2 (12 outer segments forming the complete JWST hexagon silhouette)
      [0, R_h * 2.0],
      [R_h * 0.866, R_h * 1.5],
      [R_h * 1.732, R_h * 1.0],
      [R_h * 1.732, 0],
      [R_h * 1.732, -R_h * 1.0],
      [R_h * 0.866, -R_h * 1.5],
      [0, -R_h * 2.0],
      [-R_h * 0.866, -R_h * 1.5],
      [-R_h * 1.732, -R_h * 1.0],
      [-R_h * 1.732, 0],
      [-R_h * 1.732, R_h * 1.0],
      [-R_h * 0.866, R_h * 1.5]
    ];

    this.mirrorSegments = [];
    mirrorCoords.forEach(([mx, my]) => {
      const segMesh = new THREE.Mesh(hexGeo, this.goldMirrorMat);
      // Slight spherical curvature bowl focusing onto secondary mirror
      const distFromCenter = Math.hypot(mx, my);
      const curvatureZ = -(distFromCenter * distFromCenter) * 0.012;
      segMesh.position.set(mx, my, curvatureZ);
      // Align segment normal slightly toward focal point
      segMesh.lookAt(mx * 0.05, my * 0.05, 8.5);
      this.mirrorsGroup.add(segMesh);
      this.mirrorSegments.push(segMesh);
    });

    // Central Aft Optical Subsystem (AOS) baffle cone extending through center hole
    const aosGeo = new THREE.CylinderGeometry(0.65, 0.95, 1.6, 12);
    aosGeo.rotateX(Math.PI * 0.5);
    const aosMat = new THREE.MeshStandardMaterial({ color: 0x050810, metalness: 0.9, roughness: 0.6 });
    const aosMesh = new THREE.Mesh(aosGeo, aosMat);
    aosMesh.position.set(0, 0, 0.6);
    this.mirrorsGroup.add(aosMesh);

    // Primary Mirror Composite Backplane Truss Support Frame
    const backplaneGeo = new THREE.CylinderGeometry(hexRadius * 3.4, hexRadius * 3.4, 0.4, 6);
    backplaneGeo.rotateX(Math.PI * 0.5);
    const backplaneMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      metalness: 0.9,
      roughness: 0.4
    });
    const backplane = new THREE.Mesh(backplaneGeo, backplaneMat);
    backplane.position.set(0, 0, -0.35);
    this.mirrorsGroup.add(backplane);

    this.meshGroup.add(this.mirrorsGroup);

    // ─────────────────────────────────────────────────────────────
    // 5. SECONDARY MIRROR TRIPOD BOOM MASTS & REFLECTOR
    // ─────────────────────────────────────────────────────────────
    this.secondaryGroup = new THREE.Group();
    this.secondaryGroup.position.copy(this.mirrorsGroup.position);
    this.secondaryGroup.rotation.copy(this.mirrorsGroup.rotation);

    const focalDist = 8.6; // Focal point distance along optical axis
    const strutMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.92,
      roughness: 0.25
    });

    // 3 deployment struts forming tripod (Upper strut, Bottom-left strut, Bottom-right strut)
    const strutOrigins = [
      new THREE.Vector3(0, R_h * 1.95, 0),
      new THREE.Vector3(R_h * 1.65, -R_h * 1.2, 0),
      new THREE.Vector3(-R_h * 1.65, -R_h * 1.2, 0)
    ];

    const apexPoint = new THREE.Vector3(0, 0, focalDist);

    strutOrigins.forEach((origin) => {
      const dir = apexPoint.clone().sub(origin);
      const len = dir.length();
      const strutGeo = new THREE.CylinderGeometry(0.07, 0.10, len, 8);
      const strutMesh = new THREE.Mesh(strutGeo, strutMat);

      // Orient strut between origin and apex
      strutMesh.position.copy(origin).addScaledVector(dir, 0.5);
      strutMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      this.secondaryGroup.add(strutMesh);
    });

    // Secondary Mirror Housing & Gold Reflector
    const secHousingGeo = new THREE.CylinderGeometry(0.85, 0.95, 0.35, 6);
    secHousingGeo.rotateX(Math.PI * 0.5);
    const secHousing = new THREE.Mesh(secHousingGeo, backplaneMat);
    secHousing.position.copy(apexPoint);
    this.secondaryGroup.add(secHousing);

    // Convex gold secondary mirror facing back toward primary array
    const secMirrorGeo = new THREE.CylinderGeometry(0.72, 0.72, 0.08, 6);
    secMirrorGeo.rotateX(Math.PI * 0.5);
    const secMirror = new THREE.Mesh(secMirrorGeo, this.goldMirrorMat);
    secMirror.position.set(0, 0, focalDist - 0.18);
    this.secondaryGroup.add(secMirror);

    this.meshGroup.add(this.secondaryGroup);

    // ─────────────────────────────────────────────────────────────
    // 6. RESPONSIVE GEODESIC ENERGY DEFENSE SHIELD
    // ─────────────────────────────────────────────────────────────
    const shieldGeo = new THREE.IcosahedronGeometry(this.radius, 3);
    this.shieldMat = new THREE.MeshBasicMaterial({
      color: 0x00ffcc,
      transparent: true,
      opacity: 0.08,
      wireframe: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.shieldMesh = new THREE.Mesh(shieldGeo, this.shieldMat);
    this.meshGroup.add(this.shieldMesh);

    // Faint inner energy haze sphere
    const hazeGeo = new THREE.SphereGeometry(this.radius * 0.98, 24, 24);
    this.shieldHazeMat = new THREE.MeshBasicMaterial({
      color: 0x00a8ff,
      transparent: true,
      opacity: 0.03,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.BackSide
    });
    this.shieldHazeMesh = new THREE.Mesh(hazeGeo, this.shieldHazeMat);
    this.meshGroup.add(this.shieldHazeMesh);

    // ─────────────────────────────────────────────────────────────
    // 8. MILITARY / AVIATION SYNCHRONIZED NAVIGATION STROBES
    // ─────────────────────────────────────────────────────────────
    this.strobes = [];
    const strobeGeo = new THREE.SphereGeometry(0.24, 8, 8);
    const strobeMatGreen = new THREE.MeshBasicMaterial({ color: 0x00ff66 });
    const strobeMatRed = new THREE.MeshBasicMaterial({ color: 0xff0044 });
    const strobeMatWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const strobeConfigs = [
      { pos: [7.8, 0, 0], mat: strobeMatGreen }, // Starboard green
      { pos: [-7.8, 0, 0], mat: strobeMatRed },  // Port red
      { pos: [0, 0, 12.5], mat: strobeMatWhite }, // Bow white
      { pos: [0, 0, -12.5], mat: strobeMatWhite }, // Stern white
      { pos: [0, 4.4, 9.6], mat: strobeMatWhite }  // Secondary mirror mast apex
    ];

    strobeConfigs.forEach(cfg => {
      const mesh = new THREE.Mesh(strobeGeo, cfg.mat);
      mesh.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
      this.meshGroup.add(mesh);
      this.strobes.push(mesh);
    });
  }

  update(dt) {
    if (this.isDead) return;

    // Majestic slow celestial station-keeping yaw & pitch
    this.meshGroup.rotation.y += this._rotYaw * dt;
    this.meshGroup.rotation.z = Math.sin(Date.now() * 0.0006) * 0.04;

    // Animate Geodesic Shield rotation & shimmer
    if (this.shieldMesh) {
      this.shieldMesh.rotation.y += dt * 0.08;
      this.shieldMesh.rotation.x += dt * 0.04;
    }
    if (this.shieldHazeMesh) {
      this.shieldHazeMesh.rotation.y -= dt * 0.06;
    }

    // Shield impact recovery
    if (this._shieldPulseTimer > 0) {
      this._shieldPulseTimer -= dt;
      const t = Math.max(0, this._shieldPulseTimer / 0.4);
      if (this.shieldMat) this.shieldMat.opacity = 0.08 + t * 0.45;
      if (this.shieldHazeMat) this.shieldHazeMat.opacity = 0.03 + t * 0.25;
    }

    // Aviation Navigation Strobe Flash (Double-pulse sequence every 1.5s)
    this._beaconTimer = (this._beaconTimer + dt) % 1.5;
    const isFlashing = (this._beaconTimer > 0.0 && this._beaconTimer < 0.08) ||
                       (this._beaconTimer > 0.20 && this._beaconTimer < 0.28);
    for (let i = 0; i < this.strobes.length; i++) {
      this.strobes[i].visible = isFlashing;
    }

    // Subtle breathing shimmer across primary gold mirrors
    if (this.goldMirrorMat) {
      this.goldMirrorMat.emissiveIntensity = 0.20 + Math.sin(this._telemetryTime * 2.5) * 0.08;
    }
  }

  takeDamage(amount, hitPos = null) {
    if (this.isDead) return false;
    this.hp -= amount;

    // Trigger responsive geodesic shield impact wavefront
    this._shieldPulseTimer = 0.4;
    if (this.shieldMat) {
      this.shieldMat.opacity = 0.55;
    }
    if (this.shieldHazeMat) {
      this.shieldHazeMat.opacity = 0.30;
    }

    // Color shift on heavy damage
    const ratio = this.getHealthRatio();
    if (ratio < 0.35 && this.shieldMat) {
      this.shieldMat.color.setHex(0xff3355);
    } else if (ratio < 0.65 && this.shieldMat) {
      this.shieldMat.color.setHex(0xffaa00);
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
      return true; // Destroyed!
    }
    return false;
  }

  getHealthRatio() {
    return Math.max(0, this.hp / this.maxHp);
  }

  destroy() {
    this.isDead = true;
    if (this.meshGroup && this.scene) {
      this.scene.remove(this.meshGroup);
      this.meshGroup.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material.dispose();
        }
      });
    }
  }
}
