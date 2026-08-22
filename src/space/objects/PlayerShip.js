import * as THREE from 'three';

// ── Procedural PBR Hull Texture Generator ──
let cachedHullTexture = null;
function getProceduralHullTexture() {
  if (!cachedHullTexture) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Dark titanium base
    ctx.fillStyle = '#101726';
    ctx.fillRect(0, 0, 512, 512);

    // Carbon weave micro-pattern
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    for (let x = 0; x < 512; x += 8) {
      for (let y = 0; y < 512; y += 8) {
        if ((x + y) % 16 === 0) {
          ctx.fillRect(x, y, 4, 4);
        }
      }
    }

    // Panel lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.lineWidth = 3;
    ctx.strokeRect(32, 32, 216, 216);
    ctx.strokeRect(264, 32, 216, 216);
    ctx.strokeRect(32, 264, 216, 216);
    ctx.strokeRect(264, 264, 216, 216);

    // Panel edge highlights
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(34, 34, 212, 212);
    ctx.strokeRect(266, 34, 212, 212);
    ctx.strokeRect(34, 266, 212, 212);
    ctx.strokeRect(266, 266, 212, 212);

    // Rivet dots
    ctx.fillStyle = 'rgba(200, 220, 255, 0.4)';
    const drawRivets = (rx, ry, rw, rh) => {
      for (let i = rx + 8; i < rx + rw; i += 24) {
        ctx.beginPath(); ctx.arc(i, ry + 4, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(i, ry + rh - 4, 1.5, 0, Math.PI * 2); ctx.fill();
      }
      for (let j = ry + 8; j < ry + rh; j += 24) {
        ctx.beginPath(); ctx.arc(rx + 4, j, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(rx + rw - 4, j, 1.5, 0, Math.PI * 2); ctx.fill();
      }
    };
    drawRivets(32, 32, 216, 216);
    drawRivets(264, 32, 216, 216);
    drawRivets(32, 264, 216, 216);
    drawRivets(264, 264, 216, 216);

    cachedHullTexture = new THREE.CanvasTexture(canvas);
    cachedHullTexture.wrapS = THREE.RepeatWrapping;
    cachedHullTexture.wrapT = THREE.RepeatWrapping;
    cachedHullTexture.repeat.set(2, 2);
  }
  return cachedHullTexture;
}

export class PlayerShip {
  constructor(scene, particleManager) {
    this.scene = scene;
    this.particleManager = particleManager;

    this.meshGroup = new THREE.Group();

    // Default Stats (Interceptor)
    this.shipClass = 'INTERCEPTOR';
    this.maxShield = 90;
    this.shield = 90;
    this.speed = 36;
    this.radius = 1.6;
    this.laserFireDelay = 0.06;

    // Velocity & Banking
    this.velocity = new THREE.Vector3();
    this.targetRoll = 0;
    this.currentRoll = 0;
    this.targetPitch = 0;
    this.currentPitch = 0;
    this.prevInput = { x: 0, y: 0 };

    this.bounds = { minX: -14.0, maxX: 14.0, minY: -7.0, maxY: 8.0 };

    this.laserCooldown = 0;
    this.pulseCooldown = 0;
    this.maxPulseCD = 8.0;
    this.shieldRippleTimer = 0;
    this._thrusterTick = 0;
    this._time = 0;

    // Tactical Abilities & Mobility
    this.dodgeTimer = 0;
    this.dodgeCooldown = 0;
    this.dodgeMaxCooldown = 1.2;
    this.dodgeDirection = null;
    this.isInvulnerable = false;
    this.tractorBeamLevel = 0;
    this.activePerks = new Set();

    // Hyper-Boost & Swarm Missiles
    this.boostEnergy = 100;
    this.maxBoostEnergy = 100;
    this.isBoosting = false;
    this.swarmMissileCooldown = 0;
    this.maxSwarmCD = 3.0;

    // Premium Add-On Feature
    this.hasMiningAddon = false;

    // Mechanical Articulation & Visual FX Arrays
    this.flameMeshes = [];
    this.shockDiamonds = [];
    this.muzzleOffsets = [];
    this.wingtipOffsets = [];
    this.engineTrailOffsets = [];
    this.rcsPorts = [];

    // Articulated Sub-Meshes
    this.canardL = null;
    this.canardR = null;
    this.aileronL = null;
    this.aileronR = null;
    this.flakBarrels = [];
    this.flakRecoil = 0;
    this.coolingFlaps = [];
    this.moltenHeat = 0;
    this.tacticianGimbalInner = null;
    this.tacticianGimbalOuter = null;
    this.reaperWingL = null;
    this.reaperWingR = null;
    this.reaperWingSweep = 0;

    this.rebuildShipMesh(this.shipClass);
    this.meshGroup.position.set(0, 0, 0);
    this.scene.add(this.meshGroup);
  }

  clearShipMesh() {
    while (this.meshGroup.children.length > 0) {
      this.meshGroup.remove(this.meshGroup.children[0]);
    }
    this.flameMeshes = [];
    this.shockDiamonds = [];
    this.muzzleOffsets = [];
    this.wingtipOffsets = [];
    this.engineTrailOffsets = [];
    this.rcsPorts = [];
    this.canardL = null;
    this.canardR = null;
    this.aileronL = null;
    this.aileronR = null;
    this.flakBarrels = [];
    this.coolingFlaps = [];
    this.tacticianGimbalInner = null;
    this.tacticianGimbalOuter = null;
    this.reaperWingL = null;
    this.reaperWingR = null;
  }

  buildCockpitInterior(parentGroup, canopyColorHex = 0x00f3ff) {
    // 1. Pilot Helmet Mesh
    const helmetGeo = new THREE.SphereGeometry(0.18, 12, 12);
    helmetGeo.scale(0.85, 1.0, 0.95);
    const helmetMat = new THREE.MeshStandardMaterial({
      color: 0x182436,
      metalness: 0.9,
      roughness: 0.2
    });
    const helmet = new THREE.Mesh(helmetGeo, helmetMat);
    helmet.position.set(0, 0.24, -0.25);
    parentGroup.add(helmet);

    // Visor Gold Gloss
    const visorGeo = new THREE.SphereGeometry(0.12, 10, 10);
    visorGeo.scale(0.8, 0.5, 0.5);
    const visorMat = new THREE.MeshStandardMaterial({
      color: 0xffb700,
      metalness: 0.98,
      roughness: 0.05,
      emissive: 0xffaa00,
      emissiveIntensity: 0.4
    });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 0.26, -0.36);
    parentGroup.add(visor);

    // 2. Holographic Flight MFD Console
    const consoleGeo = new THREE.BoxGeometry(0.28, 0.06, 0.16);
    const consoleMat = new THREE.MeshBasicMaterial({ color: canopyColorHex });
    const mfd = new THREE.Mesh(consoleGeo, consoleMat);
    mfd.position.set(0, 0.18, -0.55);
    mfd.rotation.x = -0.35;
    parentGroup.add(mfd);
  }

  rebuildShipMesh(className) {
    this.clearShipMesh();
    this.shipClass = className;

    // Hexagonal Shield Dome
    const shieldGeo = new THREE.IcosahedronGeometry(3.3, 2);
    let shieldColor = 0x00f3ff;
    if (className === 'DREADNOUGHT') shieldColor = 0xff0044;
    else if (className === 'TACTICIAN') shieldColor = 0x00ff88;
    else if (className === 'REAPER') shieldColor = 0xaa00ff;

    this.shieldMat = new THREE.MeshBasicMaterial({
      color: shieldColor,
      wireframe: true,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending
    });
    this.shieldMesh = new THREE.Mesh(shieldGeo, this.shieldMat);
    this.meshGroup.add(this.shieldMesh);

    if (className === 'INTERCEPTOR') {
      this.buildInterceptorMesh();
    } else if (className === 'DREADNOUGHT') {
      this.buildDreadnoughtMesh();
    } else if (className === 'TACTICIAN') {
      this.buildTacticianMesh();
    } else if (className === 'REAPER') {
      this.buildReaperMesh();
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 1. ⚡ INTERCEPTOR: "Vanguard Alpha" (Dynamic Canards & Ailerons)
  // ─────────────────────────────────────────────────────────────
  buildInterceptorMesh() {
    this.maxShield = 90;
    this.shield = 90;
    this.speed = 36;
    this.laserFireDelay = 0.06;
    this.dodgeMaxCooldown = 1.2;
    this.maxSwarmCD = 3.0;

    const hullTex = getProceduralHullTexture();

    // Main needle fuselage
    const bodyGeo = new THREE.ConeGeometry(0.85, 5.8, 8);
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({
      map: hullTex,
      color: 0x0e1b30,
      metalness: 0.95,
      roughness: 0.15,
      emissive: 0x002244,
      emissiveIntensity: 0.25,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    this.meshGroup.add(body);

    // Transparent Glass Canopy with Interior
    const canopyGeo = new THREE.SphereGeometry(0.56, 16, 16);
    canopyGeo.scale(0.8, 0.6, 1.5);
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x00f3ff,
      emissive: 0x00aaff,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.75,
      roughness: 0.05,
      metalness: 0.1
    });
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 0.3, -0.4);
    this.meshGroup.add(canopy);
    this.buildCockpitInterior(this.meshGroup, 0x00f3ff);

    // Delta Wings with Articulated Ailerons
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(3.4, -1.8);
    wingShape.lineTo(3.5, -2.8);
    wingShape.lineTo(0.6, -1.4);
    wingShape.closePath();

    const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.1, bevelEnabled: true, bevelSize: 0.03 });
    wingGeo.center();
    wingGeo.rotateX(Math.PI / 2);
    const wingMat = new THREE.MeshStandardMaterial({ map: hullTex, color: 0x162640, metalness: 0.9, roughness: 0.2 });

    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.position.set(1.4, 0, 0.3);
    this.meshGroup.add(rightWing);

    const leftWingGeo = wingGeo.clone();
    leftWingGeo.scale(-1, 1, 1);
    const leftWing = new THREE.Mesh(leftWingGeo, wingMat);
    leftWing.position.set(-1.4, 0, 0.3);
    this.meshGroup.add(leftWing);

    // Articulated Wing Ailerons
    const aileronGeo = new THREE.BoxGeometry(1.2, 0.06, 0.3);
    this.aileronR = new THREE.Mesh(aileronGeo, wingMat);
    this.aileronR.position.set(2.4, 0, 1.4);
    this.meshGroup.add(this.aileronR);

    this.aileronL = new THREE.Mesh(aileronGeo, wingMat);
    this.aileronL.position.set(-2.4, 0, 1.4);
    this.meshGroup.add(this.aileronL);

    // Articulated Forward Canards
    const canardGeo = new THREE.BoxGeometry(1.2, 0.05, 0.5);
    canardGeo.rotateY(0.2);
    this.canardR = new THREE.Mesh(canardGeo, wingMat);
    this.canardR.position.set(0.9, 0.08, -1.2);
    this.meshGroup.add(this.canardR);

    this.canardL = this.canardR.clone();
    this.canardL.position.x = -0.9;
    this.canardL.rotation.y = -0.2;
    this.meshGroup.add(this.canardL);

    // Neon Edge Glow Strips
    const edgeMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
    [-2.2, 2.2].forEach(x => {
      const e = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 2.2), edgeMat);
      e.position.set(x, 0.06, 0.1);
      this.meshGroup.add(e);
    });

    // Triple Laser Muzzles
    this.muzzleOffsets = [
      new THREE.Vector3(-2.6, 0, -0.6),
      new THREE.Vector3(0, -0.15, -2.8),
      new THREE.Vector3(2.6, 0, -0.6)
    ];
    this.muzzleOffsets.forEach(pos => {
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), edgeMat);
      tip.position.copy(pos);
      this.meshGroup.add(tip);
    });

    // Twin High-Thrust Engines with Mach Shock Diamonds
    [-0.65, 0.65].forEach(x => {
      const eng = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.44, 1.1, 12), new THREE.MeshStandardMaterial({ color: 0x08101c, metalness: 0.95 }));
      eng.rotateX(Math.PI / 2);
      eng.position.set(x, -0.08, 2.3);
      this.meshGroup.add(eng);

      // Multi-Stage Flame
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.26, 1.5, 10), new THREE.MeshBasicMaterial({ color: 0x00f3ff }));
      flame.rotation.x = -Math.PI / 2;
      flame.position.set(0, 0, 0.65);
      eng.add(flame);
      this.flameMeshes.push(flame);

      // Mach Shock Diamond Disks
      for (let d = 0; d < 3; d++) {
        const dia = new THREE.Mesh(new THREE.RingGeometry(0.04, 0.18 - d * 0.03, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
        dia.position.set(0, 0, 0.35 + d * 0.35);
        eng.add(dia);
        this.shockDiamonds.push(dia);
      }
    });

    this.wingtipOffsets = [new THREE.Vector3(-3.2, 0, 0.3), new THREE.Vector3(3.2, 0, 0.3)];
    this.engineTrailOffsets = [new THREE.Vector3(-0.65, -0.08, 3.0), new THREE.Vector3(0.65, -0.08, 3.0)];

    // RCS Quad Ports (Nose and Wingtips)
    this.rcsPorts = [
      { pos: new THREE.Vector3(0, 0.3, -2.6), dirY: 1, dirX: 0 },
      { pos: new THREE.Vector3(0, -0.3, -2.6), dirY: -1, dirX: 0 },
      { pos: new THREE.Vector3(-3.0, 0, 0.2), dirY: 0, dirX: -1 },
      { pos: new THREE.Vector3(3.0, 0, 0.2), dirY: 0, dirX: 1 }
    ];

    this.engineLight = new THREE.PointLight(0x00f3ff, 1.6, 9);
    this.engineLight.position.set(0, 0, 2.5);
    this.meshGroup.add(this.engineLight);
  }

  // ─────────────────────────────────────────────────────────────
  // 2. 🛡️ DREADNOUGHT: "Titan Colossus" (Recoil Physics & Radiator Vents)
  // ─────────────────────────────────────────────────────────────
  buildDreadnoughtMesh() {
    this.maxShield = 220;
    this.shield = 220;
    this.speed = 20;
    this.laserFireDelay = 0.22;
    this.dodgeMaxCooldown = 2.4;
    this.maxSwarmCD = 6.0;

    const hullTex = getProceduralHullTexture();

    // Heavy Faceted Chassis
    const hullGeo = new THREE.BoxGeometry(2.4, 1.3, 5.2);
    const hullMat = new THREE.MeshStandardMaterial({
      map: hullTex,
      color: 0x221418,
      metalness: 0.95,
      roughness: 0.3,
      emissive: 0x2a060b,
      emissiveIntensity: 0.3
    });
    this.meshGroup.add(new THREE.Mesh(hullGeo, hullMat));

    // Reinforced Prow Ramming Wedge (with Molten Heat Material)
    const ramGeo = new THREE.ConeGeometry(1.6, 2.0, 4);
    ramGeo.rotateX(Math.PI / 2);
    ramGeo.rotateY(Math.PI / 4);
    this.ramMat = new THREE.MeshStandardMaterial({
      color: 0x440e16,
      metalness: 0.92,
      roughness: 0.2,
      emissive: 0xff3300,
      emissiveIntensity: 0.1
    });
    const ram = new THREE.Mesh(ramGeo, this.ramMat);
    ram.position.set(0, 0, -3.2);
    this.meshGroup.add(ram);

    // Heavy Armored Sloped Wings
    const armGeo = new THREE.BoxGeometry(2.2, 0.3, 3.4);
    const armMat = new THREE.MeshStandardMaterial({ map: hullTex, color: 0x1a0c10, metalness: 0.9, roughness: 0.35 });

    const armR = new THREE.Mesh(armGeo, armMat);
    armR.position.set(2.0, 0, 0.4);
    armR.rotation.z = -0.15;
    this.meshGroup.add(armR);

    const armL = new THREE.Mesh(armGeo, armMat);
    armL.position.set(-2.0, 0, 0.4);
    armL.rotation.z = 0.15;
    this.meshGroup.add(armL);

    // Radiator Cooling Flaps
    [-1.3, 1.3].forEach(x => {
      const flapGeo = new THREE.BoxGeometry(0.08, 0.4, 1.8);
      const flapMat = new THREE.MeshStandardMaterial({ color: 0xff3300, emissive: 0xff2200, emissiveIntensity: 0.3 });
      const flap = new THREE.Mesh(flapGeo, flapMat);
      flap.position.set(x, 0.5, 0.2);
      this.meshGroup.add(flap);
      this.coolingFlaps.push(flap);
    });

    // Pilot armored viewport
    this.buildCockpitInterior(this.meshGroup, 0xff0044);

    // Heavy Artillery Cannons with Spring Recoil Rigging
    const barrelGeo = new THREE.CylinderGeometry(0.24, 0.24, 3.2, 8);
    barrelGeo.rotateX(Math.PI / 2);
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x0c0608, metalness: 0.95 });

    this.flakBarrels = [];
    [-1.6, 1.6].forEach(x => {
      const b = new THREE.Mesh(barrelGeo, barrelMat);
      b.position.set(x, -0.1, -1.6);
      this.meshGroup.add(b);
      this.flakBarrels.push(b);
    });

    this.muzzleOffsets = [
      new THREE.Vector3(-1.6, -0.1, -3.2),
      new THREE.Vector3(1.6, -0.1, -3.2)
    ];

    // Quad Heavy Rocket Thrusters with Mach Shock Diamonds
    const thrusterPositions = [
      [-0.8, 0.35, 2.6],
      [0.8, 0.35, 2.6],
      [-0.8, -0.35, 2.6],
      [0.8, -0.35, 2.6]
    ];
    thrusterPositions.forEach(([x, y, z]) => {
      const eng = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 1.0, 8), new THREE.MeshStandardMaterial({ color: 0x0a0406, metalness: 0.9 }));
      eng.rotateX(Math.PI / 2);
      eng.position.set(x, y, z);
      this.meshGroup.add(eng);

      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.6, 8), new THREE.MeshBasicMaterial({ color: 0xff0044 }));
      flame.rotation.x = -Math.PI / 2;
      flame.position.set(0, 0, 0.6);
      eng.add(flame);
      this.flameMeshes.push(flame);

      const dia = new THREE.Mesh(new THREE.RingGeometry(0.04, 0.16, 8), new THREE.MeshBasicMaterial({ color: 0xffea00, side: THREE.DoubleSide }));
      dia.position.set(0, 0, 0.45);
      eng.add(dia);
      this.shockDiamonds.push(dia);
    });

    this.wingtipOffsets = [new THREE.Vector3(-3.1, 0, 0.4), new THREE.Vector3(3.1, 0, 0.4)];
    this.engineTrailOffsets = [new THREE.Vector3(-0.8, 0, 3.4), new THREE.Vector3(0.8, 0, 3.4)];

    this.rcsPorts = [
      { pos: new THREE.Vector3(0, 0.6, -2.8), dirY: 1, dirX: 0 },
      { pos: new THREE.Vector3(0, -0.6, -2.8), dirY: -1, dirX: 0 },
      { pos: new THREE.Vector3(-2.2, 0, 0.4), dirY: 0, dirX: -1 },
      { pos: new THREE.Vector3(2.2, 0, 0.4), dirY: 0, dirX: 1 }
    ];

    this.engineLight = new THREE.PointLight(0xff0044, 2.2, 10);
    this.engineLight.position.set(0, 0, 2.8);
    this.meshGroup.add(this.engineLight);
  }

  // ─────────────────────────────────────────────────────────────
  // 3. 🌀 TACTICIAN: "Chronos Spec-Ops" (Dual Gyroscopic Gimbal Rings)
  // ─────────────────────────────────────────────────────────────
  buildTacticianMesh() {
    this.maxShield = 110;
    this.shield = 110;
    this.speed = 28;
    this.laserFireDelay = 0.12;
    this.dodgeMaxCooldown = 1.6;
    this.maxSwarmCD = 4.5;

    const hullTex = getProceduralHullTexture();

    // Aerodynamic forward cockpit
    const bodyGeo = new THREE.CylinderGeometry(0.5, 0.9, 5.2, 8);
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({
      map: hullTex,
      color: 0x0a221a,
      metalness: 0.92,
      roughness: 0.2,
      emissive: 0x003318,
      emissiveIntensity: 0.35
    });
    this.meshGroup.add(new THREE.Mesh(bodyGeo, bodyMat));
    this.buildCockpitInterior(this.meshGroup, 0x00ff88);

    // Forward-Swept Gull Wings
    const wingGeo = new THREE.BoxGeometry(2.4, 0.1, 1.6);
    const wingMat = new THREE.MeshStandardMaterial({ map: hullTex, color: 0x103628, metalness: 0.88, roughness: 0.25 });

    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.position.set(1.8, 0, -0.6);
    rightWing.rotation.y = -0.35;
    this.meshGroup.add(rightWing);

    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.position.set(-1.8, 0, -0.6);
    leftWing.rotation.y = 0.35;
    this.meshGroup.add(leftWing);

    // Dual Concentric Gyroscopic Electromagnetic Gimbal Rings
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, wireframe: false });

    // Outer Ring
    this.tacticianGimbalOuter = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.06, 8, 24), ringMat);
    this.tacticianGimbalOuter.position.set(0, 0.3, 0.5);
    this.meshGroup.add(this.tacticianGimbalOuter);

    // Inner Ring
    this.tacticianGimbalInner = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.05, 8, 20), new THREE.MeshBasicMaterial({ color: 0x00f3ff }));
    this.tacticianGimbalOuter.add(this.tacticianGimbalInner);

    // Sensor Radome
    const radomeGeo = new THREE.SphereGeometry(0.4, 12, 12);
    const radomeMat = new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00aa55, emissiveIntensity: 0.7 });
    const radome = new THREE.Mesh(radomeGeo, radomeMat);
    radome.position.set(0, 0.55, -0.8);
    this.meshGroup.add(radome);

    // Twin Homing Arc Emitters
    this.muzzleOffsets = [
      new THREE.Vector3(-2.6, 0, -1.6),
      new THREE.Vector3(2.6, 0, -1.6)
    ];
    this.muzzleOffsets.forEach(pos => {
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), ringMat);
      tip.position.copy(pos);
      this.meshGroup.add(tip);
    });

    // Twin Vector Thrusters with Mach Shock Diamonds
    [-0.7, 0.7].forEach(x => {
      const eng = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 1.1, 8), new THREE.MeshStandardMaterial({ color: 0x06140e, metalness: 0.9 }));
      eng.rotateX(Math.PI / 2);
      eng.position.set(x, -0.05, 2.4);
      this.meshGroup.add(eng);

      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.4, 8), new THREE.MeshBasicMaterial({ color: 0x00ff88 }));
      flame.rotation.x = -Math.PI / 2;
      flame.position.set(0, 0, 0.6);
      eng.add(flame);
      this.flameMeshes.push(flame);

      const dia = new THREE.Mesh(new THREE.RingGeometry(0.04, 0.16, 8), new THREE.MeshBasicMaterial({ color: 0x00ffff, side: THREE.DoubleSide }));
      dia.position.set(0, 0, 0.4);
      eng.add(dia);
      this.shockDiamonds.push(dia);
    });

    this.wingtipOffsets = [new THREE.Vector3(-2.8, 0, -1.4), new THREE.Vector3(2.8, 0, -1.4)];
    this.engineTrailOffsets = [new THREE.Vector3(-0.7, 0, 3.0), new THREE.Vector3(0.7, 0, 3.0)];

    this.rcsPorts = [
      { pos: new THREE.Vector3(0, 0.4, -2.4), dirY: 1, dirX: 0 },
      { pos: new THREE.Vector3(0, -0.4, -2.4), dirY: -1, dirX: 0 },
      { pos: new THREE.Vector3(-2.6, 0, -1.2), dirY: 0, dirX: -1 },
      { pos: new THREE.Vector3(2.6, 0, -1.2), dirY: 0, dirX: 1 }
    ];

    this.engineLight = new THREE.PointLight(0x00ff88, 1.8, 9);
    this.engineLight.position.set(0, 0, 2.6);
    this.meshGroup.add(this.engineLight);
  }

  // ─────────────────────────────────────────────────────────────
  // 4. 💀 REAPER: "Void Phantom" (Variable-Geometry Wing Sweeping)
  // ─────────────────────────────────────────────────────────────
  buildReaperMesh() {
    this.maxShield = 85;
    this.shield = 85;
    this.speed = 32;
    this.laserFireDelay = 0.09;
    this.dodgeMaxCooldown = 1.4;
    this.maxSwarmCD = 4.0;

    const hullTex = getProceduralHullTexture();

    // Stealth Diamond Faceted Fuselage
    const bodyGeo = new THREE.ConeGeometry(1.0, 5.4, 4);
    bodyGeo.rotateX(Math.PI / 2);
    bodyGeo.rotateZ(Math.PI / 4);
    this.reaperBodyMat = new THREE.MeshStandardMaterial({
      map: hullTex,
      color: 0x10081c,
      metalness: 0.98,
      roughness: 0.12,
      emissive: 0x220038,
      emissiveIntensity: 0.45,
      transparent: true,
      opacity: 1.0
    });
    this.meshGroup.add(new THREE.Mesh(bodyGeo, this.reaperBodyMat));
    this.buildCockpitInterior(this.meshGroup, 0xaa00ff);

    // Variable-Geometry Dagger Wings (Pivot Rigging)
    const wingGeo = new THREE.BoxGeometry(1.8, 0.08, 1.6);
    const wingMat = new THREE.MeshStandardMaterial({ map: hullTex, color: 0x180c2a, metalness: 0.95, roughness: 0.1 });

    this.reaperWingR = new THREE.Mesh(wingGeo, wingMat);
    this.reaperWingR.position.set(1.0, 0, 0.4);
    this.meshGroup.add(this.reaperWingR);

    this.reaperWingL = new THREE.Mesh(wingGeo, wingMat);
    this.reaperWingL.position.set(-1.0, 0, 0.4);
    this.meshGroup.add(this.reaperWingL);

    // Glowing Ultraviolet Plasma Blade Edges
    const bladeMat = new THREE.MeshBasicMaterial({ color: 0xaa00ff });
    [-1.8, 1.8].forEach(x => {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 2.4), bladeMat);
      edge.position.set(x, 0.06, 0.2);
      this.meshGroup.add(edge);
    });

    // Quad Needle Laser Cannons (2 Wing + 2 Fuselage)
    this.muzzleOffsets = [
      new THREE.Vector3(-1.8, 0, -0.6),
      new THREE.Vector3(-0.6, -0.1, -2.4),
      new THREE.Vector3(0.6, -0.1, -2.4),
      new THREE.Vector3(1.8, 0, -0.6)
    ];
    this.muzzleOffsets.forEach(pos => {
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), bladeMat);
      tip.position.copy(pos);
      this.meshGroup.add(tip);
    });

    // Central High-Density Plasma Thruster
    const engGeo = new THREE.CylinderGeometry(0.42, 0.52, 1.2, 6);
    engGeo.rotateX(Math.PI / 2);
    const eng = new THREE.Mesh(engGeo, new THREE.MeshStandardMaterial({ color: 0x080310, metalness: 0.95 }));
    eng.position.set(0, 0, 2.4);
    this.meshGroup.add(eng);

    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.8, 6), bladeMat);
    flame.rotation.x = -Math.PI / 2;
    flame.position.set(0, 0, 0.7);
    eng.add(flame);
    this.flameMeshes.push(flame);

    const dia = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.22, 6), new THREE.MeshBasicMaterial({ color: 0xff00ff, side: THREE.DoubleSide }));
    dia.position.set(0, 0, 0.5);
    eng.add(dia);
    this.shockDiamonds.push(dia);

    this.wingtipOffsets = [new THREE.Vector3(-1.8, 0, 0.4), new THREE.Vector3(1.8, 0, 0.4)];
    this.engineTrailOffsets = [new THREE.Vector3(0, 0, 3.2)];

    this.rcsPorts = [
      { pos: new THREE.Vector3(0, 0.3, -2.4), dirY: 1, dirX: 0 },
      { pos: new THREE.Vector3(0, -0.3, -2.4), dirY: -1, dirX: 0 },
      { pos: new THREE.Vector3(-1.6, 0, 0.4), dirY: 0, dirX: -1 },
      { pos: new THREE.Vector3(1.6, 0, 0.4), dirY: 0, dirX: 1 }
    ];

    this.engineLight = new THREE.PointLight(0xaa00ff, 2.0, 9);
    this.engineLight.position.set(0, 0, 2.6);
    this.meshGroup.add(this.engineLight);
  }

  triggerBarrelRecoil() {
    this.flakRecoil = 0.35;
    this.moltenHeat = Math.min(1.0, this.moltenHeat + 0.25);
  }

  takeDamage(amount) {
    if (this.dodgeTimer > 0 || this.isInvulnerable) {
      return false;
    }

    if (this.shipClass === 'REAPER' && this.isBoosting) {
      return false; // Phasing quantum cloak
    }

    let finalAmount = amount;
    if (this.shipClass === 'DREADNOUGHT') {
      finalAmount *= 0.65;
    }

    this.shield = Math.max(0, this.shield - finalAmount);
    this.shieldRippleTimer = 1.0; // Bring up shield display for 1.0 second
    if (this.shieldMat) this.shieldMat.opacity = 1.0;
    if (this.shieldMesh) this.shieldMesh.visible = true;

    if (window.spaceGameManager && window.spaceGameManager.spaceHUD) {
      window.spaceGameManager.spaceHUD.flashShieldImpact();
    }

    const canvasContainer = document.getElementById('canvas-container');
    if (canvasContainer) {
      canvasContainer.classList.add('camera-glitch');
      setTimeout(() => {
        canvasContainer.classList.remove('camera-glitch');
      }, 120);
    }

    return this.shield <= 0;
  }

  setShipClass(className) {
    this.rebuildShipMesh(className);
  }

  healShield(amount) {
    this.shield = Math.min(this.maxShield, this.shield + amount);
    this.shieldRippleTimer = 0.35;
    if (this.shieldMat) this.shieldMat.opacity = 0.7;
  }

  dodgeRoll(direction = 'left') {
    if (this.dodgeCooldown > 0 || this.dodgeTimer > 0) return false;
    this.dodgeDirection = direction;
    this.dodgeTimer = 0.5;
    this.dodgeCooldown = this.dodgeMaxCooldown;

    // Interceptor Sonic Boom shockwave ring
    if (this.shipClass === 'INTERCEPTOR' && this.particleManager) {
      this.particleManager.spawnSonicBoomDisc(this.meshGroup.position, 0x00f3ff);
    }
    return true;
  }

  triggerDodge(direction = 'left') {
    return this.dodgeRoll(direction);
  }

  reset() {
    this.shield = this.maxShield;
    this.velocity.set(0, 0, 0);
    this.meshGroup.position.set(0, 0, 0);
    this.meshGroup.rotation.set(0, 0, 0);
    this.currentRoll = 0;
    this.targetRoll = 0;
    this.currentPitch = 0;
    this.targetPitch = 0;
    this.laserCooldown = 0;
    this.pulseCooldown = 0;
    this.dodgeTimer = 0;
    this.dodgeCooldown = 0;
    this.boostEnergy = this.maxBoostEnergy;
    this.isBoosting = false;
    this.swarmMissileCooldown = 0;
  }

  update(dt, inputDir = { x: 0, y: 0 }) {
    this._time += dt;

    if (this.laserCooldown > 0) this.laserCooldown -= dt;
    if (this.pulseCooldown > 0) this.pulseCooldown -= dt;
    if (this.dodgeCooldown > 0) this.dodgeCooldown -= dt;
    if (this.swarmMissileCooldown > 0) this.swarmMissileCooldown -= dt;
    if (this._dodgeBoostTimer > 0) this._dodgeBoostTimer -= dt;

    // Hyper-Boost Energy Management
    if (this.isBoosting && this.boostEnergy > 0) {
      this.boostEnergy = Math.max(0, this.boostEnergy - dt * 40.0);
      if (this.boostEnergy <= 0) this.isBoosting = false;
    } else if (!this.isBoosting && this.boostEnergy < this.maxBoostEnergy) {
      this.boostEnergy = Math.min(this.maxBoostEnergy, this.boostEnergy + dt * 20.0);
    }

    const currentSpeed = this.speed * (this.isBoosting ? 2.0 : 1.0);

    // Shield Hexagonal Lattice decay (1.0 second display on collision)
    if (this.shieldRippleTimer > 0) {
      this.shieldRippleTimer -= dt;
      if (this.shieldMat) {
        this.shieldMat.opacity = Math.min(1.0, this.shieldRippleTimer / 0.8);
      }
      if (this.shieldMesh) {
        this.shieldMesh.visible = true;
        this.shieldMesh.rotation.z += 4.5 * dt;
        this.shieldMesh.rotation.y += 3.0 * dt;
      }
    } else {
      if (this.shieldMesh) this.shieldMesh.visible = false;
    }

    // ── Mechanical Articulation Updates ──
    // Interceptor Canards & Ailerons
    if (this.canardR && this.canardL) {
      const targetCanardPitch = inputDir.y * 0.45 + (this.isBoosting ? -0.2 : 0);
      this.canardR.rotation.x = targetCanardPitch;
      this.canardL.rotation.x = targetCanardPitch;
    }
    if (this.aileronR && this.aileronL) {
      this.aileronR.rotation.x = -inputDir.x * 0.4;
      this.aileronL.rotation.x = inputDir.x * 0.4;
    }

    // Dreadnought Barrel Recoil Spring Oscillator
    if (this.flakRecoil > 0) {
      this.flakRecoil = Math.max(0, this.flakRecoil - dt * 2.2);
      this.flakBarrels.forEach(b => {
        b.position.z = -1.6 + this.flakRecoil;
      });
    }
    // Dreadnought Radiator Flaps
    if (this.moltenHeat > 0) {
      this.moltenHeat = Math.max(0, this.moltenHeat - dt * 0.35);
      this.coolingFlaps.forEach((f, idx) => {
        f.rotation.z = (idx === 0 ? -1 : 1) * this.moltenHeat * 0.45;
      });
      if (this.ramMat) {
        this.ramMat.emissiveIntensity = 0.1 + this.moltenHeat * 1.5;
      }
    }

    // Tactician Concentric Gyroscopic Gimbal Rings Precession
    if (this.tacticianGimbalOuter && this.tacticianGimbalInner) {
      this.tacticianGimbalOuter.rotation.z += 4.5 * dt;
      this.tacticianGimbalOuter.rotation.x = Math.sin(this._time * 3.0) * 0.35;
      this.tacticianGimbalInner.rotation.y += 6.5 * dt;
      this.tacticianGimbalInner.rotation.x += 3.0 * dt;
    }

    // Reaper Variable-Geometry Dagger Wings Sweeping
    if (this.reaperWingR && this.reaperWingL) {
      const targetSweep = this.isBoosting ? -0.45 : (Math.abs(inputDir.x) > 0.3 ? 0.25 : 0);
      this.reaperWingSweep += (targetSweep - this.reaperWingSweep) * 0.15;
      this.reaperWingR.rotation.y = -this.reaperWingSweep;
      this.reaperWingL.rotation.y = this.reaperWingSweep;

      // Quantum Phasing Cloak Opacity
      if (this.reaperBodyMat) {
        this.reaperBodyMat.opacity = (this.isBoosting ? 0.35 : 1.0) + Math.sin(this._time * 25.0) * 0.05;
      }
    }

    // ── Movement & Bounds ──
    const bossActive = this.gameManager && this.gameManager.activeBoss && !this.gameManager.activeBoss.isDead;
    const minX = bossActive ? -36 : this.bounds.minX;
    const maxX = bossActive ? 36 : this.bounds.maxX;
    const minY = bossActive ? -20 : this.bounds.minY;
    const maxY = bossActive ? 20 : this.bounds.maxY;

    if (this.dodgeTimer > 0) {
      this.dodgeTimer -= dt;
      const dodgeSpeed = 54.0;
      this.meshGroup.position.x += (this.dodgeDirection === 'left' ? -1 : 1) * dodgeSpeed * dt;
      this.meshGroup.position.x = THREE.MathUtils.clamp(this.meshGroup.position.x, minX, maxX);

      const progress = 1.0 - Math.max(0, this.dodgeTimer / 0.5);
      this.meshGroup.rotation.z = (this.dodgeDirection === 'left' ? 1 : -1) * progress * Math.PI * 2;
      this.meshGroup.rotation.x = 0;
    } else {
      this.velocity.x += (inputDir.x * currentSpeed - this.velocity.x) * 0.18;
      this.velocity.y += (inputDir.y * currentSpeed - this.velocity.y) * 0.18;

      this.meshGroup.position.x += this.velocity.x * dt;
      this.meshGroup.position.y += this.velocity.y * dt;

      this.meshGroup.position.x = THREE.MathUtils.clamp(this.meshGroup.position.x, minX, maxX);
      this.meshGroup.position.y = THREE.MathUtils.clamp(this.meshGroup.position.y, minY, maxY);

      this.targetRoll = -inputDir.x * (this.isBoosting ? 0.85 : 0.65);
      this.targetPitch = inputDir.y * 0.28;
      this.currentRoll += (this.targetRoll - this.currentRoll) * 0.18;
      this.currentPitch += (this.targetPitch - this.currentPitch) * 0.18;
      this.meshGroup.rotation.z = this.currentRoll;
      this.meshGroup.rotation.x = this.currentPitch;
    }

    // ── Active RCS Micro-Thruster Bursts ──
    const dX = inputDir.x - this.prevInput.x;
    const dY = inputDir.y - this.prevInput.y;
    this.prevInput.x = inputDir.x;
    this.prevInput.y = inputDir.y;

    if (Math.abs(dX) > 0.15 || Math.abs(dY) > 0.15) {
      let rcsColor = 0x00f3ff;
      if (this.shipClass === 'DREADNOUGHT') rcsColor = 0xff3300;
      else if (this.shipClass === 'TACTICIAN') rcsColor = 0x00ff88;
      else if (this.shipClass === 'REAPER') rcsColor = 0xaa00ff;

      this.rcsPorts.forEach(port => {
        if ((dY > 0.15 && port.dirY > 0) || (dY < -0.15 && port.dirY < 0) ||
            (dX > 0.15 && port.dirX > 0) || (dX < -0.15 && port.dirX < 0)) {
          const worldPos = this.meshGroup.localToWorld(port.pos.clone());
          const worldDir = new THREE.Vector3(port.dirX, port.dirY, 0).applyEuler(this.meshGroup.rotation);
          this.particleManager.spawnRcsJet(worldPos, worldDir, rcsColor);
        }
      });
    }

    // ── Flame & Shock Diamond Dynamics ──
    const flicker = 1.0 + Math.sin(this._time * 24) * 0.15;
    const thrustBoost = (this.isBoosting ? 2.5 : 1.0) * (1.0 + Math.abs(inputDir.x) * 0.3 + Math.abs(inputDir.y) * 0.3);
    this.flameMeshes.forEach(f => {
      f.scale.setScalar(flicker * thrustBoost);
    });

    this.shockDiamonds.forEach((dia, idx) => {
      const s = (1.0 + Math.sin(this._time * 30 + idx) * 0.2) * (this.isBoosting ? 1.4 : 1.0);
      dia.scale.setScalar(s);
    });

    if (this.engineLight) {
      this.engineLight.intensity = (this.isBoosting ? 3.0 : 1.4) + Math.sin(this._time * 14) * 0.25;
    }

    // Wingtip Vapor Contrails
    if (Math.abs(this.currentRoll) > 0.25 || this.isBoosting || this.dodgeTimer > 0) {
      if (Math.random() < 0.65 && this.wingtipOffsets.length >= 2) {
        const leftTip = this.meshGroup.localToWorld(this.wingtipOffsets[0].clone());
        const rightTip = this.meshGroup.localToWorld(this.wingtipOffsets[1].clone());
        let tipColor = 0xe0f7ff;
        if (this.shipClass === 'DREADNOUGHT') tipColor = 0xffa0b0;
        else if (this.shipClass === 'TACTICIAN') tipColor = 0xb0ffda;
        else if (this.shipClass === 'REAPER') tipColor = 0xe8b0ff;
        this.particleManager.spawnEngineParticle(leftTip, tipColor);
        this.particleManager.spawnEngineParticle(rightTip, tipColor);
      }
    }

    // Engine Exhaust Particles
    this._thrusterTick++;
    if (this._thrusterTick % 2 === 0 && this.engineTrailOffsets.length > 0) {
      let pColor = 0x00f3ff;
      if (this.shipClass === 'INTERCEPTOR') pColor = this.isBoosting ? 0xffea00 : 0x00f3ff;
      else if (this.shipClass === 'DREADNOUGHT') pColor = this.isBoosting ? 0xffea00 : 0xff0044;
      else if (this.shipClass === 'TACTICIAN') pColor = this.isBoosting ? 0xffea00 : 0x00ff88;
      else if (this.shipClass === 'REAPER') pColor = this.isBoosting ? 0xff00bb : 0xaa00ff;

      this.engineTrailOffsets.forEach(offset => {
        const worldPos = this.meshGroup.localToWorld(offset.clone());
        this.particleManager.spawnEngineParticle(worldPos, pColor);
      });
    }
  }
}
