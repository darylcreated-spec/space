import * as THREE from 'three';

/**
 * Procedural Hull Texture for Leviathan Mothership Outer Armor
 */
function generateMothershipHullTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Base dark industrial carbon-titanium
  ctx.fillStyle = '#121a26';
  ctx.fillRect(0, 0, 512, 512);

  // Heavy steel armor plate seams
  ctx.strokeStyle = '#27384e';
  ctx.lineWidth = 3;
  for (let x = 0; x < 512; x += 64) {
    ctx.strokeRect(x, 0, 64, 512);
  }
  for (let y = 0; y < 512; y += 64) {
    ctx.strokeRect(0, y, 512, 64);
  }

  // Micro-rivets along plating boundaries
  ctx.fillStyle = '#6580a3';
  for (let y = 8; y < 512; y += 32) {
    for (let x = 8; x < 512; x += 64) {
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Neon gold/cyan circuit conduits
  ctx.strokeStyle = '#ffaa00';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(0, 128); ctx.lineTo(192, 128); ctx.lineTo(256, 192); ctx.lineTo(512, 192);
  ctx.stroke();

  return new THREE.CanvasTexture(canvas);
}

/**
 * Procedural Texture for Mechanical Floor Grating & Warning Chevrons
 */
function generateInteriorGrateTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Steel grating floor base
  ctx.fillStyle = '#101620';
  ctx.fillRect(0, 0, 512, 512);

  // Diamond grating mesh
  ctx.strokeStyle = '#263447';
  ctx.lineWidth = 1.5;
  for (let i = -512; i < 1024; i += 16) {
    ctx.beginPath();
    ctx.moveTo(i, 0); ctx.lineTo(i + 512, 512);
    ctx.moveTo(i, 512); ctx.lineTo(i + 512, 0);
    ctx.stroke();
  }

  // Amber hazard stripes along walkways
  ctx.fillStyle = '#ffaa00';
  for (let i = 0; i < 8; i++) {
    const xOff = 32 + i * 56;
    ctx.beginPath();
    ctx.moveTo(xOff, 0);
    ctx.lineTo(xOff + 20, 0);
    ctx.lineTo(xOff - 10, 48);
    ctx.lineTo(xOff - 30, 48);
    ctx.closePath();
    ctx.fill();
  }

  return new THREE.CanvasTexture(canvas);
}

// ============================================================
// FINAL APEX BOSS — Leviathan Command Mothership
// Enormous Superstructure with Fly-in Trench / Hangar Maw,
// Heavily Detailed Mechanical Top & Bottom (Trusses, Rotating Fans, Grating),
// Dual Superconducting Shield Generators & Plasma Forcefield Barrier,
// Internal CIWS Laser Turrets, and Suspended Power Core with
// 4 Magnetic Couplings that drop and rupture upon destruction!
// ============================================================
export class CommandMothership {
  constructor(scene, particleManager, spawnZ = -160) {
    this.scene = scene;
    this.particleManager = particleManager;

    this.meshGroup = new THREE.Group();
    this.meshGroup.position.set(0, 2, spawnZ);

    // -- Boss Telemetry & Stats --
    this.coreHp = 6000;
    this.maxCoreHp = 6000;
    this.hitRadius = 60.0;
    this.radius = 60.0;
    this.isDead = false;
    this.scoreValue = 100000;

    this.targetZ = -78;
    this.speed = 8.5;
    this._time = 0;

    // ── 1. Dual Superconducting Shield Generators (Protecting the Plasma Shield) ──
    this.hasPlasmaShield = true;
    this.shieldGenerators = [
      { id: 0, name: 'PORT SHIELD GENERATOR',      relPos: new THREE.Vector3(-18.5, 0, 26), hp: 1100, maxHp: 1100, isDead: false, mesh: null, ringMesh: null, reticle: null },
      { id: 1, name: 'STARBOARD SHIELD GENERATOR', relPos: new THREE.Vector3( 18.5, 0, 26), hp: 1100, maxHp: 1100, isDead: false, mesh: null, ringMesh: null, reticle: null },
    ];

    // ── 2. 4 Magnetic Suspension Couplings (Holding the Power Core in Place) ──
    this.coreCouplings = [
      { id: 0, name: 'NORTH-WEST MAGNETIC COUPLING', relPos: new THREE.Vector3(-8.5,  6.0, -18.0), hp: 1500, maxHp: 1500, isDead: false, mesh: null, clampArm: null, reticle: null },
      { id: 1, name: 'NORTH-EAST MAGNETIC COUPLING', relPos: new THREE.Vector3( 8.5,  6.0, -18.0), hp: 1500, maxHp: 1500, isDead: false, mesh: null, clampArm: null, reticle: null },
      { id: 2, name: 'SOUTH-WEST MAGNETIC COUPLING', relPos: new THREE.Vector3(-8.5, -5.5, -18.0), hp: 1500, maxHp: 1500, isDead: false, mesh: null, clampArm: null, reticle: null },
      { id: 3, name: 'SOUTH-EAST MAGNETIC COUPLING', relPos: new THREE.Vector3( 8.5, -5.5, -18.0), hp: 1500, maxHp: 1500, isDead: false, mesh: null, clampArm: null, reticle: null },
    ];

    // ── 3. Internal CIWS Point-Defense Laser Turrets ──
    this.internalTurrets = [
      { id: 0, name: 'CEILING FORWARD TURRET', relPos: new THREE.Vector3(-7,  7.2,  12), hp: 650, maxHp: 650, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 1, name: 'CEILING MID TURRET',     relPos: new THREE.Vector3( 7,  7.2,  12), hp: 650, maxHp: 650, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 2, name: 'FLOOR PORT TURRET',      relPos: new THREE.Vector3(-8, -6.2,  -2), hp: 650, maxHp: 650, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 3, name: 'FLOOR STARBOARD TURRET', relPos: new THREE.Vector3( 8, -6.2,  -2), hp: 650, maxHp: 650, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 4, name: 'CORE CHAMBER CEILING',   relPos: new THREE.Vector3( 0,  7.4, -26), hp: 750, maxHp: 750, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 5, name: 'CORE CHAMBER FLOOR',     relPos: new THREE.Vector3( 0, -6.4, -26), hp: 750, maxHp: 750, isDead: false, mesh: null, barrelGroup: null, reticle: null },
    ];

    // ── 4. Large Spread External Heavy Dual-Railgun Turrets ──
    this.externalTurrets = [
      { id: 0, name: 'PORT OUTRIGGER TURRET',     relPos: new THREE.Vector3(-44,  2, -30), hp: 850, maxHp: 850, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 1, name: 'STARBOARD OUTRIGGER TURRET', relPos: new THREE.Vector3( 44,  2, -30), hp: 850, maxHp: 850, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 2, name: 'DORSAL SPINE FORWARD TURRET', relPos: new THREE.Vector3(  0, 20, -10), hp: 850, maxHp: 850, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 3, name: 'DORSAL SPINE AFT TURRET',     relPos: new THREE.Vector3(  0, 26, -38), hp: 850, maxHp: 850, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 4, name: 'PORT FORWARD SPONSON',       relPos: new THREE.Vector3(-30, -5,  18), hp: 850, maxHp: 850, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 5, name: 'STARBOARD FORWARD SPONSON',  relPos: new THREE.Vector3( 30, -5,  18), hp: 850, maxHp: 850, isDead: false, mesh: null, barrelGroup: null, reticle: null },
    ];

    // ── 5. Large Spread External Heavy Missile Silo Pods ──
    this.missilePods = [
      { id: 0, name: 'PORT FORWARD MISSILE POD',     relPos: new THREE.Vector3(-28, 12,  10), hp: 800, maxHp: 800, isDead: false, mesh: null, reticle: null },
      { id: 1, name: 'STARBOARD FORWARD MISSILE POD', relPos: new THREE.Vector3( 28, 12,  10), hp: 800, maxHp: 800, isDead: false, mesh: null, reticle: null },
      { id: 2, name: 'PORT AFT MISSILE POD',         relPos: new THREE.Vector3(-28, 12, -28), hp: 800, maxHp: 800, isDead: false, mesh: null, reticle: null },
      { id: 3, name: 'STARBOARD AFT MISSILE POD',     relPos: new THREE.Vector3( 28, 12, -28), hp: 800, maxHp: 800, isDead: false, mesh: null, reticle: null },
    ];

    this.reticleMeshes = [];
    this.turbineFans = [];
    this.coreGyroRings = [];

    // Core Drop & Rupture Physics State
    this.isCoreDropping = false;
    this.isCoreRuptured = false;
    this.coreDropY = 0.5;
    this.coreDropVelocity = 0;
    this.isDying = false;
    this.deathTimer = 0;

    this.fireTimer = 0.8;
    this.externalFireTimer = 1.0;
    this.missileFireTimer = 3.5;
    this.droneLaunchTimer = 5.0;

    this._buildMothership();
    this.scene.add(this.meshGroup);
  }

  _buildMothership() {
    const hullTex = generateMothershipHullTexture();
    const grateTex = generateInteriorGrateTexture();

    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x223246,
      bumpMap: hullTex,
      bumpScale: 0.14,
      metalness: 0.95,
      roughness: 0.2,
      emissive: 0x0c1622,
      emissiveIntensity: 0.3
    });

    const floorGrateMat = new THREE.MeshStandardMaterial({
      color: 0x1a2636,
      map: grateTex,
      metalness: 0.92,
      roughness: 0.25,
      emissive: 0x141005,
      emissiveIntensity: 0.2
    });

    const mechanicalTrussMat = new THREE.MeshStandardMaterial({
      color: 0x2f4157,
      metalness: 0.96,
      roughness: 0.18
    });

    const glowCyanMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
    const glowAmberMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    const glowMagentaMat = new THREE.MeshBasicMaterial({ color: 0xff00bb, transparent: true, opacity: 0.85 });

    // ── 1. Colossal Outer Dreadnought Hull Spire (140m length, 56m width, 28m height) ──
    // Port Outer Flank
    const portFlankGeo = new THREE.BoxGeometry(16, 26, 120);
    const portFlank = new THREE.Mesh(portFlankGeo, hullMat);
    portFlank.position.set(-26, 0, -10);
    this.meshGroup.add(portFlank);

    // Starboard Outer Flank
    const stbFlankGeo = new THREE.BoxGeometry(16, 26, 120);
    const stbFlank = new THREE.Mesh(stbFlankGeo, hullMat);
    stbFlank.position.set(26, 0, -10);
    this.meshGroup.add(stbFlank);

    // Command Spire Bridge Tower (Dorsal Aft)
    const spireBridgeGeo = new THREE.BoxGeometry(24, 12, 45);
    const spireBridge = new THREE.Mesh(spireBridgeGeo, hullMat);
    spireBridge.position.set(0, 16, -30);
    this.meshGroup.add(spireBridge);

    // Bridge Observation Deck Visor
    const bridgeVisor = new THREE.Mesh(new THREE.BoxGeometry(18, 2.5, 6), glowAmberMat);
    bridgeVisor.position.set(0, 19, -15);
    this.meshGroup.add(bridgeVisor);

    // ── 1B. Automated Manufacturing & Element Fabrication Super-Foundries ──
    // 4 Industrial ship component manufacturing bays with molten smelting vats
    [[-34, 4, 10], [34, 4, 10], [-34, 4, -20], [34, 4, -20]].forEach(([fx, fy, fz]) => {
      const forgeBayGeo = new THREE.BoxGeometry(8, 6, 20);
      const forgeBay = new THREE.Mesh(forgeBayGeo, mechanicalTrussMat);
      forgeBay.position.set(fx, fy, fz);
      this.meshGroup.add(forgeBay);

      // Molten element smelting vat
      const vatGeo = new THREE.CylinderGeometry(2.5, 2.0, 2.2, 10);
      const vatMat = new THREE.MeshStandardMaterial({ color: 0x3d1a04, emissive: 0xff6600, emissiveIntensity: 3.5 });
      const vat = new THREE.Mesh(vatGeo, vatMat);
      vat.position.set(fx, fy + 2.5, fz);
      this.meshGroup.add(vat);

      // Nanite assembly fabrication crane
      const craneGeo = new THREE.BoxGeometry(1.2, 4.5, 1.2);
      const crane = new THREE.Mesh(craneGeo, mechanicalTrussMat);
      crane.position.set(fx + (fx < 0 ? 3.5 : -3.5), fy + 4.0, fz);
      this.meshGroup.add(crane);
    });

    // ── 1C. 3 Giant Outrigger Pylon Arms with Heavy Engine Nacelles at the Ends ──
    const armMat = new THREE.MeshStandardMaterial({ color: 0x1f2e42, metalness: 0.95, roughness: 0.18 });
    const darkEngineMat = new THREE.MeshStandardMaterial({ color: 0x111c28, metalness: 0.98, roughness: 0.2 });

    // 1. Port Outrigger Arm & Engine Nacelle
    const portArmGeo = new THREE.BoxGeometry(26, 4.5, 6.5);
    const portArm = new THREE.Mesh(portArmGeo, armMat);
    portArm.position.set(-36, -2, -35);
    portArm.rotation.y = 0.25;
    this.meshGroup.add(portArm);

    const portEnginePod = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 26), hullMat);
    portEnginePod.position.set(-48, -2, -48);
    this.meshGroup.add(portEnginePod);

    // 2. Starboard Outrigger Arm & Engine Nacelle
    const stbArmGeo = new THREE.BoxGeometry(26, 4.5, 6.5);
    const stbArm = new THREE.Mesh(stbArmGeo, armMat);
    stbArm.position.set(36, -2, -35);
    stbArm.rotation.y = -0.25;
    this.meshGroup.add(stbArm);

    const stbEnginePod = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 26), hullMat);
    stbEnginePod.position.set(48, -2, -48);
    this.meshGroup.add(stbEnginePod);

    // 3. Dorsal Top Outrigger Arm & Engine Nacelle
    const dorsalArmGeo = new THREE.BoxGeometry(6.5, 20, 6.5);
    const dorsalArm = new THREE.Mesh(dorsalArmGeo, armMat);
    dorsalArm.position.set(0, 24, -35);
    dorsalArm.rotation.x = -0.3;
    this.meshGroup.add(dorsalArm);

    const dorsalEnginePod = new THREE.Mesh(new THREE.BoxGeometry(12, 10, 26), hullMat);
    dorsalEnginePod.position.set(0, 30, -48);
    this.meshGroup.add(dorsalEnginePod);

    // Heavy Thruster Nozzles at the Ends of the 3 Outrigger Arms
    const outriggerEngineLocs = [
      [-48, -2, -62], [48, -2, -62], [0, 30, -62]
    ];
    outriggerEngineLocs.forEach(([ex, ey, ez]) => {
      [-2.5, 2.5].forEach(xOff => {
        const nozGeo = new THREE.CylinderGeometry(2.4, 1.6, 5.0, 10);
        nozGeo.rotateX(Math.PI / 2);
        const noz = new THREE.Mesh(nozGeo, darkEngineMat);
        noz.position.set(ex + xOff, ey, ez);
        this.meshGroup.add(noz);

        // Pulsating Plasma Thrust Plume
        const plumeGeo = new THREE.ConeGeometry(2.2, 7.5, 10);
        plumeGeo.rotateX(-Math.PI / 2);
        const plume = new THREE.Mesh(plumeGeo, glowAmberMat);
        plume.position.set(ex + xOff, ey, ez - 5.5);
        this.meshGroup.add(plume);
      });

      // Nacelle Illumination Light
      const engineLight = new THREE.PointLight(0xffaa00, 6.0, 50);
      engineLight.position.set(ex, ey, ez);
      this.meshGroup.add(engineLight);
    });

    // ── 1D. 6 Large Spread External Heavy Dual-Railgun Turrets ──
    const extTurretBarbetteGeo = new THREE.CylinderGeometry(2.4, 3.2, 1.2, 8);
    const extTurretHouseGeo = new THREE.BoxGeometry(2.8, 1.5, 3.2);
    const extBarrelGeo = new THREE.CylinderGeometry(0.22, 0.28, 4.8, 8);
    extBarrelGeo.rotateX(Math.PI / 2);
    const extCoilGeo = new THREE.TorusGeometry(0.34, 0.08, 6, 12);

    this.externalTurrets.forEach(t => {
      const tGroup = new THREE.Group();
      tGroup.position.copy(t.relPos);

      // Barbette base
      const barbette = new THREE.Mesh(extTurretBarbetteGeo, mechanicalTrussMat);
      tGroup.add(barbette);

      // Gunhouse Carapace
      const bGroup = new THREE.Group();
      bGroup.position.set(0, 0.8, 0);

      const house = new THREE.Mesh(extTurretHouseGeo, hullMat);
      bGroup.add(house);

      // Dual Railgun Barrels
      [-0.8, 0.8].forEach(xOff => {
        const barrel = new THREE.Mesh(extBarrelGeo, mechanicalTrussMat);
        barrel.position.set(xOff, 0.2, 2.2);
        bGroup.add(barrel);

        [1.0, 2.2, 3.4].forEach(zC => {
          const coil = new THREE.Mesh(extCoilGeo, glowAmberMat);
          coil.position.set(xOff, 0.2, zC);
          bGroup.add(coil);
        });
      });

      tGroup.add(bGroup);

      // 3D Target Reticle
      const reticleGeo = new THREE.RingGeometry(1.8, 2.3, 16);
      const reticleMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
      const reticle = new THREE.Mesh(reticleGeo, reticleMat);
      reticle.position.set(0, 1.2, 3.2);
      tGroup.add(reticle);

      this.meshGroup.add(tGroup);
      t.mesh = tGroup;
      t.barrelGroup = bGroup;
      t.reticle = reticle;
      this.reticleMeshes.push(reticle);
    });

    // ── 1E. 4 Large Spread External Heavy Missile Silo Pods ──
    const podHousingGeo = new THREE.BoxGeometry(3.6, 2.0, 5.0);

    this.missilePods.forEach(p => {
      const pGroup = new THREE.Group();
      pGroup.position.copy(p.relPos);

      const housing = new THREE.Mesh(podHousingGeo, mechanicalTrussMat);
      pGroup.add(housing);

      // 6 Missile Launch Cells
      [-1.0, 0, 1.0].forEach(xOff => {
        [-1.2, 1.2].forEach(zOff => {
          const tubeGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.8, 8);
          const tube = new THREE.Mesh(tubeGeo, glowAmberMat);
          tube.position.set(xOff, 1.0, zOff);
          pGroup.add(tube);
        });
      });

      // 3D Target Reticle
      const reticleGeo = new THREE.RingGeometry(1.6, 2.1, 16);
      const reticleMat = new THREE.MeshBasicMaterial({ color: 0xff3300, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
      const reticle = new THREE.Mesh(reticleGeo, reticleMat);
      reticle.position.set(0, 1.8, 0);
      reticle.rotation.x = Math.PI / 2;
      pGroup.add(reticle);

      this.meshGroup.add(pGroup);
      p.mesh = pGroup;
      p.reticle = reticle;
      this.reticleMeshes.push(reticle);
    });

    // ── 2. Mechanical Interior Trench Floor (Bottom) ──
    const floorGeo = new THREE.BoxGeometry(36, 3.5, 110);
    const floorMesh = new THREE.Mesh(floorGeo, floorGrateMat);
    floorMesh.position.set(0, -9.5, -10);
    this.meshGroup.add(floorMesh);

    // Hydraulic Floor Expansion Ribs & Power Conduit Tracks
    for (let z = -60; z <= 35; z += 15) {
      const ribGeo = new THREE.BoxGeometry(35.5, 1.2, 2.4);
      const rib = new THREE.Mesh(ribGeo, mechanicalTrussMat);
      rib.position.set(0, -7.5, z);
      this.meshGroup.add(rib);

      // Embedded Glowing Coolant Conduit
      const condGeo = new THREE.CylinderGeometry(0.3, 0.3, 34, 6);
      condGeo.rotateZ(Math.PI / 2);
      const cond = new THREE.Mesh(condGeo, glowCyanMat);
      cond.position.set(0, -6.8, z);
      this.meshGroup.add(cond);
    }

    // ── 3. Mechanical Interior Trench Ceiling (Top) ──
    const roofGeo = new THREE.BoxGeometry(36, 3.5, 110);
    const roofMesh = new THREE.Mesh(roofGeo, hullMat);
    roofMesh.position.set(0, 9.5, -10);
    this.meshGroup.add(roofMesh);

    // Overhead Structural Steel Trusses & Girders
    for (let z = -60; z <= 35; z += 15) {
      const trussGroup = new THREE.Group();
      trussGroup.position.set(0, 7.5, z);

      const tBeamGeo = new THREE.BoxGeometry(35.5, 1.6, 2.0);
      const tBeam = new THREE.Mesh(tBeamGeo, mechanicalTrussMat);
      trussGroup.add(tBeam);

      // Dangling Conduit Cables
      const cableGeo = new THREE.CylinderGeometry(0.2, 0.2, 34, 6);
      cableGeo.rotateZ(Math.PI / 2);
      const cable = new THREE.Mesh(cableGeo, glowAmberMat);
      cable.position.set(0, -0.9, 0);
      trussGroup.add(cable);

      this.meshGroup.add(trussGroup);
    }

    // 4 Animated Rotating Ventilation / Exhaust Turbines in Ceiling
    [-45, -25, -5, 15].forEach(zPos => {
      const turbineCowlGeo = new THREE.CylinderGeometry(4.2, 4.2, 2.0, 16);
      turbineCowlGeo.rotateX(Math.PI / 2);
      const turbineCowl = new THREE.Mesh(turbineCowlGeo, mechanicalTrussMat);
      turbineCowl.position.set(0, 8.0, zPos);
      this.meshGroup.add(turbineCowl);

      // Rotating Fan Blades
      const fanGroup = new THREE.Group();
      fanGroup.position.set(0, 7.8, zPos);
      for (let f = 0; f < 6; f++) {
        const fAng = (f / 6) * Math.PI * 2;
        const bladeGeo = new THREE.BoxGeometry(0.4, 3.6, 0.2);
        const blade = new THREE.Mesh(bladeGeo, mechanicalTrussMat);
        blade.position.set(Math.cos(fAng) * 1.8, Math.sin(fAng) * 1.8, 0);
        blade.rotation.z = fAng + 0.3;
        fanGroup.add(blade);
      }
      this.meshGroup.add(fanGroup);
      this.turbineFans.push(fanGroup);

      // Turbine Interior Warning Light
      const tLight = new THREE.PointLight(0xff5500, 3.5, 30);
      tLight.position.set(0, 7.0, zPos);
      this.meshGroup.add(tLight);
    });

    // ── 4. Dual Superconducting Shield Generator Hubs ──
    const genPylonGeo = new THREE.CylinderGeometry(1.8, 2.8, 12.0, 8);
    const genRingGeo = new THREE.TorusGeometry(3.2, 0.45, 10, 24);

    this.shieldGenerators.forEach(g => {
      const gGroup = new THREE.Group();
      gGroup.position.copy(g.relPos);

      // Support Pylon
      const pylon = new THREE.Mesh(genPylonGeo, mechanicalTrussMat);
      gGroup.add(pylon);

      // Superconducting Coil Ring
      const ring = new THREE.Mesh(genRingGeo, glowCyanMat);
      ring.position.set(0, 2.5, 0);
      ring.rotation.x = Math.PI / 2;
      gGroup.add(ring);

      // Power Core Crystal
      const crystalGeo = new THREE.OctahedronGeometry(1.6, 0);
      const crystal = new THREE.Mesh(crystalGeo, glowMagentaMat);
      crystal.position.set(0, 2.5, 0);
      gGroup.add(crystal);

      // 3D Target Reticle
      const reticleGeo = new THREE.RingGeometry(2.4, 3.0, 16);
      const reticleMat = new THREE.MeshBasicMaterial({ color: 0xff00bb, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
      const reticle = new THREE.Mesh(reticleGeo, reticleMat);
      reticle.position.set(0, 2.5, 3.0);
      gGroup.add(reticle);

      this.meshGroup.add(gGroup);
      g.mesh = gGroup;
      g.ringMesh = ring;
      g.reticle = reticle;
      this.reticleMeshes.push(reticle);
    });

    // ── 5. Shimmering Plasma Forcefield Shield Barrier Grid ──
    const shieldGridGeo = new THREE.PlaneGeometry(35.0, 16.0, 12, 8);
    this.plasmaShieldMat = new THREE.MeshBasicMaterial({
      color: 0xff00bb,
      wireframe: true,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    this.plasmaShieldMesh = new THREE.Mesh(shieldGridGeo, this.plasmaShieldMat);
    this.plasmaShieldMesh.position.set(0, 0, 18.0);
    this.meshGroup.add(this.plasmaShieldMesh);

    // ── 5B. Trench & Entrance Interior Illumination ──
    this.trenchLight = new THREE.PointLight(0x00f3ff, 10.0, 90);
    this.trenchLight.position.set(0, 0, 5);
    this.meshGroup.add(this.trenchLight);

    this.shieldEntranceLight = new THREE.PointLight(0xff00bb, 8.0, 60);
    this.shieldEntranceLight.position.set(0, 0, 26);
    this.meshGroup.add(this.shieldEntranceLight);

    // ── 6. Internal CIWS Point-Defense Laser Turrets ──
    const turretBaseGeo = new THREE.CylinderGeometry(2.0, 2.6, 1.0, 8);
    const barrelGeo = new THREE.CylinderGeometry(0.18, 0.24, 4.2, 6);
    barrelGeo.rotateX(Math.PI / 2);

    this.internalTurrets.forEach(t => {
      const tGroup = new THREE.Group();
      tGroup.position.copy(t.relPos);

      const base = new THREE.Mesh(turretBaseGeo, mechanicalTrussMat);
      tGroup.add(base);

      const bGroup = new THREE.Group();
      bGroup.position.set(0, 0, 0.6);

      [-0.7, 0.7].forEach(xOff => {
        const b = new THREE.Mesh(barrelGeo, mechanicalTrussMat);
        b.position.set(xOff, 0, 2.0);
        bGroup.add(b);

        const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.26, 6, 6), glowAmberMat);
        muzzle.position.set(xOff, 0, 4.0);
        bGroup.add(muzzle);
      });

      tGroup.add(bGroup);

      const reticleGeo = new THREE.RingGeometry(1.6, 2.0, 16);
      const reticleMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
      const reticle = new THREE.Mesh(reticleGeo, reticleMat);
      reticle.position.set(0, 0, 2.8);
      tGroup.add(reticle);

      this.meshGroup.add(tGroup);
      t.mesh = tGroup;
      t.barrelGroup = bGroup;
      t.reticle = reticle;
      this.reticleMeshes.push(reticle);
    });

    // ── 7. The Suspended Central Power Core & 4 Magnetic Couplings ──
    this.coreHousingGroup = new THREE.Group();
    this.coreHousingGroup.position.set(0, 0, -18.0);

    // Glowing Power Core Sphere (10m Diameter)
    const powerCoreGeo = new THREE.SphereGeometry(5.0, 24, 24);
    this.powerCoreMat = new THREE.MeshStandardMaterial({
      color: 0x3a1200,
      emissive: 0xff5500,
      emissiveIntensity: 6.0,
      roughness: 0.05,
      metalness: 0.8
    });
    this.powerCoreMesh = new THREE.Mesh(powerCoreGeo, this.powerCoreMat);
    this.coreHousingGroup.add(this.powerCoreMesh);

    // Counter-Rotating Gyroscopic Containment Rings
    [6.8, 8.2].forEach((rRad, idx) => {
      const gGeo = new THREE.TorusGeometry(rRad, 0.4, 8, 36);
      const gMat = new THREE.MeshBasicMaterial({ color: idx === 0 ? 0x00f3ff : 0xffaa00, transparent: true, opacity: 0.85 });
      const gRing = new THREE.Mesh(gGeo, gMat);
      this.coreHousingGroup.add(gRing);
      this.coreGyroRings.push({ mesh: gRing, speed: idx === 0 ? 1.8 : -1.4 });
    });

    // Core Illumination Point Light
    this.coreLight = new THREE.PointLight(0xff6600, 18.0, 85);
    this.coreHousingGroup.add(this.coreLight);

    this.meshGroup.add(this.coreHousingGroup);

    // ── 8. 4 Heavy Magnetic Suspension Couplings / Clamp Pylons ──
    const clampArmGeo = new THREE.BoxGeometry(2.4, 2.4, 6.0);
    const clampLockGeo = new THREE.CylinderGeometry(1.6, 2.0, 2.8, 8);
    clampLockGeo.rotateX(Math.PI / 2);

    this.coreCouplings.forEach(c => {
      const cGroup = new THREE.Group();
      cGroup.position.copy(c.relPos);

      // Hydraulic Mounting Arm
      const arm = new THREE.Mesh(clampArmGeo, mechanicalTrussMat);
      cGroup.add(arm);

      // Magnetic Lock Hub
      const lockHub = new THREE.Mesh(clampLockGeo, mechanicalTrussMat);
      lockHub.position.set(0, 0, 2.5);
      cGroup.add(lockHub);

      // Glowing Magnetic Lock Ring
      const lockRing = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.25, 6, 18), glowCyanMat);
      lockRing.position.set(0, 0, 3.5);
      cGroup.add(lockRing);

      // 3D Target Reticle for Coupling
      const reticleGeo = new THREE.RingGeometry(2.2, 2.7, 16);
      const reticleMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
      const reticle = new THREE.Mesh(reticleGeo, reticleMat);
      reticle.position.set(0, 0, 4.2);
      cGroup.add(reticle);

      this.meshGroup.add(cGroup);
      c.mesh = cGroup;
      c.clampArm = arm;
      c.reticle = reticle;
      this.reticleMeshes.push(reticle);
    });

    // ── 9. Rear Fusion Thrust Array ──
    const nozzleGeo = new THREE.CylinderGeometry(3.5, 2.2, 6.0, 10);
    nozzleGeo.rotateX(Math.PI / 2);
    [[-18, 0], [18, 0], [0, 8], [0, -4]].forEach(([nx, ny]) => {
      const nozzle = new THREE.Mesh(nozzleGeo, mechanicalTrussMat);
      nozzle.position.set(nx, ny, -68);
      this.meshGroup.add(nozzle);

      const flame = new THREE.Mesh(new THREE.ConeGeometry(2.8, 7.0, 8), glowAmberMat);
      flame.rotation.x = -Math.PI / 2;
      flame.position.set(nx, ny, -72);
      this.meshGroup.add(flame);
    });
  }

  takeShieldGenDamage(genId, amount) {
    const g = this.shieldGenerators.find(gen => gen.id === genId);
    if (!g || g.isDead) return false;
    g.hp -= amount;

    if (g.reticle && g.reticle.material) {
      const pct = g.hp / g.maxHp;
      g.reticle.material.color.setHex(pct > 0.5 ? 0xff00bb : (pct > 0.25 ? 0xffaa00 : 0xff0044));
    }

    if (g.hp <= 0) {
      g.isDead = true;
      if (g.reticle) g.reticle.visible = false;
      const wp = g.mesh.getWorldPosition(new THREE.Vector3());
      this.particleManager.createExplosion(wp, 0xff00bb, 140, 4.0);
      this.particleManager.createEmpShockwave(wp, 60);

      // Check if all shield generators are destroyed
      const remainingGens = this.shieldGenerators.filter(gen => !gen.isDead);
      if (remainingGens.length === 0 && this.hasPlasmaShield) {
        this.hasPlasmaShield = false;
        if (this.plasmaShieldMesh) this.plasmaShieldMesh.visible = false;
        this.particleManager.createEmpShockwave(this.meshGroup.position.clone().add(new THREE.Vector3(0, 0, 18)), 120);

        window.spaceGameManager?.voiceAnnouncer?.speak("Mothership Plasma Shield Shattered! Trench Corridor Exposed! Destroy the 4 Core Magnetic Couplings!", true);
        if (window.spaceGameManager?.spaceHUD) {
          window.spaceGameManager.spaceHUD.showRadioTransmission("PLASMA SHIELD BREACHED! Fly into the trench and destroy the 4 Magnetic Couplings to drop the Power Core!", "STARBOUND COMMAND", 7.0);
        }
      }
    }
    return g.isDead;
  }

  takeCouplingDamage(couplingId, amount) {
    // If plasma shield is still active, couplings cannot be damaged
    if (this.hasPlasmaShield) {
      if (this.plasmaShieldMat) {
        this.plasmaShieldMat.opacity = 1.0;
        setTimeout(() => { if (this.plasmaShieldMat) this.plasmaShieldMat.opacity = 0.65; }, 80);
      }
      return false;
    }

    const c = this.coreCouplings.find(coup => coup.id === couplingId);
    if (!c || c.isDead) return false;

    c.hp -= amount;

    // Recalculate remaining core hp
    const totalCouplingHp = this.coreCouplings.reduce((acc, coup) => acc + (coup.isDead ? 0 : Math.max(0, coup.hp)), 0);
    this.coreHp = totalCouplingHp;

    if (c.reticle && c.reticle.material) {
      const pct = c.hp / c.maxHp;
      c.reticle.material.color.setHex(pct > 0.5 ? 0x00f3ff : (pct > 0.25 ? 0xffaa00 : 0xff0044));
    }

    if (c.hp <= 0 && !c.isDead) {
      c.isDead = true;
      if (c.reticle) c.reticle.visible = false;
      const wp = c.mesh.getWorldPosition(new THREE.Vector3());
      this.particleManager.createExplosion(wp, 0x00f3ff, 180, 4.5);
      this.particleManager.createExplosion(wp, 0xffaa00, 120, 3.5);
      this.particleManager.createEmpShockwave(wp, 60);

      const aliveCount = this.coreCouplings.filter(coup => !coup.isDead).length;
      if (aliveCount > 0) {
        window.spaceGameManager?.voiceAnnouncer?.speak(`Magnetic Coupling severed! ${aliveCount} couplings remain!`, true);
      } else {
        // ALL 4 COUPLINGS DESTROYED -> TRIGGER POWER CORE DROP & RUPTURE DETONATION!
        this.triggerCoreDropAndRupture();
      }
    }
    return c.isDead;
  }

  takeInternalTurretDamage(turretId, amount) {
    const t = this.internalTurrets.find(tur => tur.id === turretId);
    if (!t || t.isDead) return false;
    t.hp -= amount;

    if (t.reticle && t.reticle.material) {
      const pct = t.hp / t.maxHp;
      t.reticle.material.color.setHex(pct > 0.5 ? 0xffaa00 : (pct > 0.25 ? 0xff5500 : 0xff0044));
    }

    if (t.hp <= 0) {
      t.isDead = true;
      t.mesh.visible = false;
      if (t.reticle) t.reticle.visible = false;
      const wp = t.mesh.getWorldPosition(new THREE.Vector3());
      this.particleManager.createExplosion(wp, 0xffaa00, 90, 3.0);
    }
    return t.isDead;
  }

  takeExternalTurretDamage(turretId, amount) {
    const t = this.externalTurrets.find(tur => tur.id === turretId);
    if (!t || t.isDead) return false;
    t.hp -= amount;

    if (t.reticle && t.reticle.material) {
      const pct = t.hp / t.maxHp;
      t.reticle.material.color.setHex(pct > 0.5 ? 0xffaa00 : (pct > 0.25 ? 0xff5500 : 0xff0044));
    }

    if (t.hp <= 0) {
      t.isDead = true;
      t.mesh.visible = false;
      if (t.reticle) t.reticle.visible = false;
      const wp = t.mesh.getWorldPosition(new THREE.Vector3());
      this.particleManager.createExplosion(wp, 0xffaa00, 110, 3.5);
      this.particleManager.createEmpShockwave(wp, 45);
    }
    return t.isDead;
  }

  takeMissilePodDamage(podId, amount) {
    const p = this.missilePods.find(pod => pod.id === podId);
    if (!p || p.isDead) return false;
    p.hp -= amount;

    if (p.reticle && p.reticle.material) {
      const pct = p.hp / p.maxHp;
      p.reticle.material.color.setHex(pct > 0.5 ? 0xff3300 : (pct > 0.25 ? 0xffaa00 : 0xff0044));
    }

    if (p.hp <= 0) {
      p.isDead = true;
      p.mesh.visible = false;
      if (p.reticle) p.reticle.visible = false;
      const wp = p.mesh.getWorldPosition(new THREE.Vector3());
      this.particleManager.createExplosion(wp, 0xff2200, 130, 4.0);
      this.particleManager.createExplosion(wp, 0xffaa00, 80, 2.5);
    }
    return p.isDead;
  }

  takeDamage(subsystem, amount) {
    if (this.isDead) return false;
    return false; // Direct hull damage deflected; player must destroy the couplings to drop the core!
  }

  triggerCoreDropAndRupture() {
    this.isCoreDropping = true;
    this.coreDropVelocity = 0;

    window.spaceGameManager?.voiceAnnouncer?.speak("ALL MAGNETIC COUPLINGS SEVERED! THE POWER CORE IS DROPPING!", true);
    if (window.spaceGameManager?.spaceHUD) {
      window.spaceGameManager.spaceHUD.showRadioTransmission("CORE SUSPENSION SEVERED! THE POWER CORE IS DROPPING! SHE'S DETONATING FROM THE INSIDE!", "STARBOUND COMMAND", 8.0);
    }
  }

  update(dt, playerShip, gameManager) {
    if (this.isDead || !this.meshGroup) return;
    this._time += dt;

    const pos = this.meshGroup.position;
    const playerPos = playerShip && playerShip.meshGroup ? playerShip.meshGroup.position : new THREE.Vector3(0, 0, 0);

    // 1. Advance Mothership
    if (pos.z < this.targetZ) {
      pos.z += this.speed * dt;
    }

    // 2. Rotate Ceiling Ventilation Turbines
    if (this.turbineFans) {
      this.turbineFans.forEach(fan => {
        fan.rotation.z += 8.0 * dt;
      });
    }

    // 3. Rotate Superconducting Shield Generator Rings
    if (this.shieldGenerators) {
      this.shieldGenerators.forEach(g => {
        if (!g.isDead && g.ringMesh) {
          g.ringMesh.rotation.z += 4.0 * dt;
        }
      });
    }

    // 4. Shimmer Plasma Forcefield Shield Barrier
    if (this.hasPlasmaShield && this.plasmaShieldMat) {
      this.plasmaShieldMat.opacity = 0.5 + Math.sin(this._time * 8.0) * 0.2;
    }

    // 5. Rotate Core Gyroscopic Containment Rings
    if (this.coreGyroRings && !this.isCoreRuptured) {
      this.coreGyroRings.forEach(cg => {
        cg.mesh.rotation.x += cg.speed * dt;
        cg.mesh.rotation.y += cg.speed * 0.7 * dt;
      });
    }

    // 6. 3D Reticles Rotation
    if (this.reticleMeshes) {
      this.reticleMeshes.forEach(ret => {
        if (ret && ret.visible) ret.rotation.z += 2.2 * dt;
      });
    }

    // 7. Core Drop & Rupture Physics
    if (this.isCoreDropping && !this.isCoreRuptured) {
      this.coreDropVelocity += 14.0 * dt; // gravity acceleration downward
      this.coreDropY -= this.coreDropVelocity * dt;

      if (this.coreHousingGroup) {
        this.coreHousingGroup.position.y = this.coreDropY;
      }

      // Core impacts floor reactor pit
      if (this.coreDropY <= -6.0) {
        this.isCoreRuptured = true;
        this.isDying = true;
        this.deathTimer = 4.5;

        // Cataclysmic Core Rupture Supernova Detonation
        const coreWorldPos = this.coreHousingGroup ? this.coreHousingGroup.getWorldPosition(new THREE.Vector3()) : pos;
        this.particleManager.createExplosion(coreWorldPos, 0xffffff, 450, 9.0);
        this.particleManager.createExplosion(coreWorldPos, 0xff5500, 350, 7.5);
        this.particleManager.createEmpShockwave(coreWorldPos, 250);
        this.particleManager.createEmpShockwave(coreWorldPos, 350);

        if (this.powerCoreMesh) this.powerCoreMesh.visible = false;
        if (this.coreLight) this.coreLight.intensity = 50.0;
      }
    }

    // 8. Death Sequence & Cascading Internal Detonations
    if (this.isDying) {
      this.deathTimer -= dt;

      if (Math.random() < 0.9 && this.particleManager) {
        const offset = new THREE.Vector3((Math.random() - 0.5) * 50, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 80);
        this.particleManager.createExplosion(pos.clone().add(offset), 0xffaa00, 50, 2.5);
        this.particleManager.createExplosion(pos.clone().add(offset), 0x00f3ff, 35, 1.8);
      }

      this.meshGroup.rotation.z += 0.15 * dt;
      this.meshGroup.rotation.x += 0.08 * dt;

      if (this.deathTimer <= 0) {
        this.destroy();
      }
      return;
    }

    // 9. Internal Turrets Aiming & Attack Loop
    this.fireTimer -= dt;
    const out = [];

    if (this.internalTurrets) {
      this.internalTurrets.forEach(t => {
        if (!t.isDead && t.barrelGroup) {
          t.barrelGroup.lookAt(playerPos);
        }
      });
    }

    if (this.fireTimer <= 0 && pos.z >= this.targetZ - 10) {
      this.fireTimer = 0.75;
      this.internalTurrets.forEach(t => {
        if (!t.isDead && t.mesh) {
          const wp = t.mesh.getWorldPosition(new THREE.Vector3());
          out.push(wp);
          if (gameManager && gameManager.spawnEnemyLaser) {
            const dir = new THREE.Vector3().subVectors(playerPos, wp).normalize();
            gameManager.spawnEnemyLaser(wp, dir, 0xff3300, 48);
          }
        }
      });
    }

    // 10. External Spread Heavy Railgun Turrets Aiming & Attack Loop
    this.externalFireTimer -= dt;
    if (this.externalTurrets) {
      this.externalTurrets.forEach(t => {
        if (!t.isDead && t.barrelGroup) {
          t.barrelGroup.lookAt(playerPos);
        }
      });
    }

    if (this.externalFireTimer <= 0 && pos.z >= this.targetZ - 15) {
      this.externalFireTimer = 0.95;
      this.externalTurrets.forEach(t => {
        if (!t.isDead && t.mesh && Math.random() < 0.75) {
          const wp = t.mesh.getWorldPosition(new THREE.Vector3());
          out.push(wp);
          if (gameManager && gameManager.spawnEnemyLaser) {
            const dir = new THREE.Vector3().subVectors(playerPos, wp).normalize();
            gameManager.spawnEnemyLaser(wp, dir, 0xffaa00, 52);
          }
        }
      });
    }

    // 11. External Missile Silo Pods Salvo Loop
    this.missileFireTimer -= dt;
    if (this.missileFireTimer <= 0 && pos.z >= this.targetZ - 15) {
      this.missileFireTimer = 3.2;
      this.missilePods.forEach(p => {
        if (!p.isDead && p.mesh) {
          const wp = p.mesh.getWorldPosition(new THREE.Vector3());
          if (this.particleManager) {
            this.particleManager.createExplosion(wp, 0xff5500, 20, 0.8);
          }
          if (gameManager && gameManager.spawnEnemyMissile) {
            gameManager.spawnEnemyMissile(wp, playerPos);
          } else if (gameManager && gameManager.spawnEnemyLaser) {
            const dir = new THREE.Vector3().subVectors(playerPos, wp).normalize();
            gameManager.spawnEnemyLaser(wp, dir, 0xff2200, 40);
          }
        }
      });
    }

    // 12. Foundry Element Manufacturing Drone Spawns
    this.droneLaunchTimer -= dt;
    if (this.droneLaunchTimer <= 0 && pos.z >= this.targetZ - 10) {
      this.droneLaunchTimer = 5.5;
      if (gameManager && gameManager.spawnDrone) {
        const p1 = pos.clone().add(new THREE.Vector3(-34, 4, 10));
        const p2 = pos.clone().add(new THREE.Vector3(34, 4, 10));
        gameManager.spawnDrone(p1);
        gameManager.spawnDrone(p2);
      }
    }

    return out.length > 0 ? out : false;
  }

  destroy() {
    this.isDead = true;
    if (this.particleManager) {
      this.particleManager.createExplosion(this.meshGroup.position, 0xffaa00, 300, 8.0);
      this.particleManager.createExplosion(this.meshGroup.position, 0xffffff, 200, 6.0);
      this.particleManager.createEmpShockwave(this.meshGroup.position, 280);
    }
    if (this.meshGroup && this.meshGroup.parent) {
      this.meshGroup.parent.remove(this.meshGroup);
    }
  }
}
