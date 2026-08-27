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
      { id: 0, name: 'PORT SHIELD GENERATOR',      relPos: new THREE.Vector3(-28.0, 0, 48), hp: 1400, maxHp: 1400, isDead: false, mesh: null, ringMesh: null, reticle: null },
      { id: 1, name: 'STARBOARD SHIELD GENERATOR', relPos: new THREE.Vector3( 28.0, 0, 48), hp: 1400, maxHp: 1400, isDead: false, mesh: null, ringMesh: null, reticle: null },
    ];

    // ── 2. 4 Magnetic Suspension Couplings (Holding the Power Core in Place) ──
    this.coreCouplings = [
      { id: 0, name: 'NORTH-WEST MAGNETIC COUPLING', relPos: new THREE.Vector3(-14.0,  9.0, -110.0), hp: 1800, maxHp: 1800, isDead: false, mesh: null, clampArm: null, reticle: null },
      { id: 1, name: 'NORTH-EAST MAGNETIC COUPLING', relPos: new THREE.Vector3( 14.0,  9.0, -110.0), hp: 1800, maxHp: 1800, isDead: false, mesh: null, clampArm: null, reticle: null },
      { id: 2, name: 'SOUTH-WEST MAGNETIC COUPLING', relPos: new THREE.Vector3(-14.0, -8.5, -110.0), hp: 1800, maxHp: 1800, isDead: false, mesh: null, clampArm: null, reticle: null },
      { id: 3, name: 'SOUTH-EAST MAGNETIC COUPLING', relPos: new THREE.Vector3( 14.0, -8.5, -110.0), hp: 1800, maxHp: 1800, isDead: false, mesh: null, clampArm: null, reticle: null },
    ];

    // ── 3. Eight Internal CIWS Point-Defense Laser Turrets ──
    this.internalTurrets = [
      { id: 0, name: 'TRENCH CEILING ENTRY TURRET',  relPos: new THREE.Vector3(-14, 11.5,   20), hp: 750, maxHp: 750, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 1, name: 'TRENCH FLOOR ENTRY TURRET',    relPos: new THREE.Vector3( 14,-10.5,   20), hp: 750, maxHp: 750, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 2, name: 'TRENCH MID CEILING PORT',      relPos: new THREE.Vector3(-16, 11.5,  -25), hp: 750, maxHp: 750, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 3, name: 'TRENCH MID FLOOR STARBOARD',   relPos: new THREE.Vector3( 16,-10.5,  -25), hp: 750, maxHp: 750, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 4, name: 'TRENCH DEEP CEILING STARBOARD', relPos: new THREE.Vector3( 16, 11.5,  -70), hp: 800, maxHp: 800, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 5, name: 'TRENCH DEEP FLOOR PORT',       relPos: new THREE.Vector3(-16,-10.5,  -70), hp: 800, maxHp: 800, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 6, name: 'CORE CHAMBER CEILING APEX',    relPos: new THREE.Vector3(  0, 12.0, -125), hp: 900, maxHp: 900, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 7, name: 'CORE CHAMBER FLOOR APEX',      relPos: new THREE.Vector3(  0,-11.0, -125), hp: 900, maxHp: 900, isDead: false, mesh: null, barrelGroup: null, reticle: null },
    ];

    // ── 4. Large Spread External Heavy Dual-Railgun Turrets ──
    this.externalTurrets = [
      { id: 0, name: 'PORT OUTRIGGER TURRET',      relPos: new THREE.Vector3(-54,  2, -45), hp: 950, maxHp: 950, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 1, name: 'STARBOARD OUTRIGGER TURRET', relPos: new THREE.Vector3( 54,  2, -45), hp: 950, maxHp: 950, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 2, name: 'DORSAL SPINE FORWARD TURRET', relPos: new THREE.Vector3(  0, 24,  -5), hp: 950, maxHp: 950, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 3, name: 'DORSAL SPINE AFT TURRET',     relPos: new THREE.Vector3(  0, 32, -60), hp: 950, maxHp: 950, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 4, name: 'PORT FORWARD SPONSON',       relPos: new THREE.Vector3(-38, -6,  25), hp: 950, maxHp: 950, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 5, name: 'STARBOARD FORWARD SPONSON',  relPos: new THREE.Vector3( 38, -6,  25), hp: 950, maxHp: 950, isDead: false, mesh: null, barrelGroup: null, reticle: null },
    ];

    // ── 5. Large Spread External Heavy Missile Silo Pods ──
    this.missilePods = [
      { id: 0, name: 'PORT FORWARD MISSILE POD',     relPos: new THREE.Vector3(-34, 14,  15), hp: 850, maxHp: 850, isDead: false, mesh: null, reticle: null },
      { id: 1, name: 'STARBOARD FORWARD MISSILE POD', relPos: new THREE.Vector3( 34, 14,  15), hp: 850, maxHp: 850, isDead: false, mesh: null, reticle: null },
      { id: 2, name: 'PORT AFT MISSILE POD',         relPos: new THREE.Vector3(-34, 14, -45), hp: 850, maxHp: 850, isDead: false, mesh: null, reticle: null },
      { id: 3, name: 'STARBOARD AFT MISSILE POD',     relPos: new THREE.Vector3( 34, 14, -45), hp: 850, maxHp: 850, isDead: false, mesh: null, reticle: null },
    ];

    // ── 6. Automated Element Manufacturing & Drone Foundry Bays (Targetable!) ──
    this.foundryBays = [
      { id: 0, name: 'PORT FORWARD FOUNDRY FORGE',     relPos: new THREE.Vector3(-50, 6,   0), hp: 1100, maxHp: 1100, isDead: false, mesh: null, vatMesh: null, reticle: null },
      { id: 1, name: 'STARBOARD FORWARD FOUNDRY FORGE', relPos: new THREE.Vector3( 50, 6,   0), hp: 1100, maxHp: 1100, isDead: false, mesh: null, vatMesh: null, reticle: null },
      { id: 2, name: 'PORT AFT FOUNDRY FORGE',         relPos: new THREE.Vector3(-50, 6, -50), hp: 1100, maxHp: 1100, isDead: false, mesh: null, vatMesh: null, reticle: null },
      { id: 3, name: 'STARBOARD AFT FOUNDRY FORGE',     relPos: new THREE.Vector3( 50, 6, -50), hp: 1100, maxHp: 1100, isDead: false, mesh: null, vatMesh: null, reticle: null },
    ];

    // ── 7. Internal Obstacles & Security Systems (All Targetable & Destructible!) ──
    // Animated Laser Tripwire Barrier Grids
    this.laserTripwires = [
      { id: 0, name: 'ENTRY LASER GRID TRIPWIRE', z: 0.0,   axis: 'y', range: 10, speed: 2.0, hp: 550, maxHp: 550, isDead: false, mesh: null, reticle: null },
      { id: 1, name: 'MID TRENCH LASER TRIPWIRE', z: -48.0, axis: 'x', range: 18, speed: 2.5, hp: 550, maxHp: 550, isDead: false, mesh: null, reticle: null },
      { id: 2, name: 'VAULT LASER GRID TRIPWIRE', z: -88.0, axis: 'y', range: 10, speed: 3.0, hp: 550, maxHp: 550, isDead: false, mesh: null, reticle: null },
    ];

    // Hydraulic Compression Blast Bulkheads (Opening and Closing)
    this.bulkheads = [
      { id: 0, name: 'FORWARD COMPRESSION BULKHEAD', z: -10.0, leftDoor: null, rightDoor: null, openState: 0.8, openDir: -1, timer: 3.0, hp: 750, maxHp: 750, isDead: false, overrideBox: null, reticle: null },
      { id: 1, name: 'MID TRENCH BLAST BULKHEAD',    z: -60.0, leftDoor: null, rightDoor: null, openState: 0.2, openDir:  1, timer: 2.5, hp: 750, maxHp: 750, isDead: false, overrideBox: null, reticle: null },
    ];

    // 6 Internal Ceiling Ventilation Turbines
    this.turbines = [
      { id: 0, name: 'TURBINE 1', z: -115, cowlMesh: null, fanGroup: null, hp: 600, maxHp: 600, isDead: false, reticle: null },
      { id: 1, name: 'TURBINE 2', z: -85,  cowlMesh: null, fanGroup: null, hp: 600, maxHp: 600, isDead: false, reticle: null },
      { id: 2, name: 'TURBINE 3', z: -55,  cowlMesh: null, fanGroup: null, hp: 600, maxHp: 600, isDead: false, reticle: null },
      { id: 3, name: 'TURBINE 4', z: -25,  cowlMesh: null, fanGroup: null, hp: 600, maxHp: 600, isDead: false, reticle: null },
      { id: 4, name: 'TURBINE 5', z: 5,    cowlMesh: null, fanGroup: null, hp: 600, maxHp: 600, isDead: false, reticle: null },
      { id: 5, name: 'TURBINE 6', z: 35,   cowlMesh: null, fanGroup: null, hp: 600, maxHp: 600, isDead: false, reticle: null },
    ];

    this.reticleMeshes = [];
    this.turbineFans = [];
    this.coreGyroRings = [];
    this.engineExhaustPlumes = [];
    this.machDiamondRings = [];

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
    const glowRedMat = new THREE.MeshBasicMaterial({ color: 0xff2200, transparent: true, opacity: 0.9 });
    const glowMagentaMat = new THREE.MeshBasicMaterial({ color: 0xff00bb, transparent: true, opacity: 0.85 });

    // ── 1. Colossal 220m Outer Dreadnought Hull Spire & Flank Sponsons ──
    // Port Outer Flank
    const portFlankGeo = new THREE.BoxGeometry(20, 32, 200);
    const portFlank = new THREE.Mesh(portFlankGeo, hullMat);
    portFlank.position.set(-38, 0, -40);
    this.meshGroup.add(portFlank);

    // Starboard Outer Flank
    const stbFlankGeo = new THREE.BoxGeometry(20, 32, 200);
    const stbFlank = new THREE.Mesh(stbFlankGeo, hullMat);
    stbFlank.position.set(38, 0, -40);
    this.meshGroup.add(stbFlank);

    // Command Spire Bridge Tower (Dorsal Aft)
    const spireBridgeGeo = new THREE.BoxGeometry(32, 16, 65);
    const spireBridge = new THREE.Mesh(spireBridgeGeo, hullMat);
    spireBridge.position.set(0, 22, -60);
    this.meshGroup.add(spireBridge);

    // Bridge Observation Deck Visor
    const bridgeVisor = new THREE.Mesh(new THREE.BoxGeometry(24, 3.2, 8), glowAmberMat);
    bridgeVisor.position.set(0, 26, -40);
    this.meshGroup.add(bridgeVisor);

    // ── 1B. Automated Manufacturing & Element Fabrication Super-Foundries (Targetable!) ──
    const foundryVatMat = new THREE.MeshStandardMaterial({ color: 0x3d1a04, emissive: 0xff6600, emissiveIntensity: 4.5, metalness: 0.8, roughness: 0.2 });

    this.foundryBays.forEach(fb => {
      const fbGroup = new THREE.Group();
      fbGroup.position.copy(fb.relPos);

      const forgeBayGeo = new THREE.BoxGeometry(10, 8, 28);
      const forgeBay = new THREE.Mesh(forgeBayGeo, mechanicalTrussMat);
      fbGroup.add(forgeBay);

      // Molten element smelting vat
      const vatGeo = new THREE.CylinderGeometry(3.5, 2.8, 3.0, 10);
      const vat = new THREE.Mesh(vatGeo, foundryVatMat);
      vat.position.set(0, 3.2, 0);
      fbGroup.add(vat);

      // Nanite assembly crane
      const craneGeo = new THREE.BoxGeometry(1.5, 6.0, 1.5);
      const crane = new THREE.Mesh(craneGeo, mechanicalTrussMat);
      crane.position.set(fb.relPos.x < 0 ? 4.5 : -4.5, 5.5, 0);
      fbGroup.add(crane);

      // 3D Target Reticle
      const reticleGeo = new THREE.RingGeometry(2.4, 3.0, 16);
      const reticleMat = new THREE.MeshBasicMaterial({ color: 0xff6600, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
      const reticle = new THREE.Mesh(reticleGeo, reticleMat);
      reticle.position.set(0, 4.0, 4.0);
      fbGroup.add(reticle);

      this.meshGroup.add(fbGroup);
      fb.mesh = fbGroup;
      fb.vatMesh = vat;
      fb.reticle = reticle;
      this.reticleMeshes.push(reticle);
    });

    // ── 1C. 3 Giant Outrigger Pylon Arms with Heavy Engine Nacelles at the Ends ──
    const armMat = new THREE.MeshStandardMaterial({ color: 0x1f2e42, metalness: 0.95, roughness: 0.18 });
    const darkEngineMat = new THREE.MeshStandardMaterial({ color: 0x111c28, metalness: 0.98, roughness: 0.2 });

    // 1. Port Outrigger Arm & Heavy Nacelle
    const portArmGeo = new THREE.BoxGeometry(34, 6.0, 9.0);
    const portArm = new THREE.Mesh(portArmGeo, armMat);
    portArm.position.set(-52, -2, -60);
    portArm.rotation.y = 0.25;
    this.meshGroup.add(portArm);

    const portEnginePod = new THREE.Mesh(new THREE.BoxGeometry(14, 14, 38), hullMat);
    portEnginePod.position.set(-68, -2, -80);
    this.meshGroup.add(portEnginePod);

    // 2. Starboard Outrigger Arm & Heavy Nacelle
    const stbArmGeo = new THREE.BoxGeometry(34, 6.0, 9.0);
    const stbArm = new THREE.Mesh(stbArmGeo, armMat);
    stbArm.position.set(52, -2, -60);
    stbArm.rotation.y = -0.25;
    this.meshGroup.add(stbArm);

    const stbEnginePod = new THREE.Mesh(new THREE.BoxGeometry(14, 14, 38), hullMat);
    stbEnginePod.position.set(68, -2, -80);
    this.meshGroup.add(stbEnginePod);

    // 3. Dorsal Top Outrigger Arm & Heavy Nacelle
    const dorsalArmGeo = new THREE.BoxGeometry(8.5, 28, 9.0);
    const dorsalArm = new THREE.Mesh(dorsalArmGeo, armMat);
    dorsalArm.position.set(0, 32, -60);
    dorsalArm.rotation.x = -0.3;
    this.meshGroup.add(dorsalArm);

    const dorsalEnginePod = new THREE.Mesh(new THREE.BoxGeometry(16, 14, 38), hullMat);
    dorsalEnginePod.position.set(0, 42, -80);
    this.meshGroup.add(dorsalEnginePod);

    // ── AAA Multi-Layer Engine Exhaust Thruster Plumes with Mach Shock Diamonds ──
    const shockMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending });
    const coreFlameMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 });

    [[-68, -2, -98], [68, -2, -98], [0, 42, -98]].forEach(([ex, ey, ez]) => {
      [-3.5, 3.5].forEach(xOff => {
        const nozGeo = new THREE.CylinderGeometry(3.4, 2.2, 7.0, 12);
        nozGeo.rotateX(Math.PI / 2);
        const noz = new THREE.Mesh(nozGeo, darkEngineMat);
        noz.position.set(ex + xOff, ey, ez);
        this.meshGroup.add(noz);

        // 1. Outer Atmospheric Expansion Flame Cone
        const outerPlumeGeo = new THREE.ConeGeometry(3.2, 12.0, 12);
        outerPlumeGeo.rotateX(-Math.PI / 2);
        const outerPlume = new THREE.Mesh(outerPlumeGeo, glowAmberMat);
        outerPlume.position.set(ex + xOff, ey, ez - 8.5);
        this.meshGroup.add(outerPlume);
        this.engineExhaustPlumes.push(outerPlume);

        // 2. Inner Hyper-Luminous Plasma Core
        const innerCoreGeo = new THREE.ConeGeometry(1.6, 10.0, 10);
        innerCoreGeo.rotateX(-Math.PI / 2);
        const innerCore = new THREE.Mesh(innerCoreGeo, coreFlameMat);
        innerCore.position.set(ex + xOff, ey, ez - 7.0);
        this.meshGroup.add(innerCore);

        // 3. Pulsating Mach Shock Diamond Rings
        [-4.5, -8.0, -11.5].forEach((zD, sIdx) => {
          const diamondGeo = new THREE.TorusGeometry(1.8 - sIdx * 0.4, 0.2, 6, 16);
          const diamond = new THREE.Mesh(diamondGeo, shockMat);
          diamond.position.set(ex + xOff, ey, ez + zD);
          this.meshGroup.add(diamond);
          this.machDiamondRings.push({ mesh: diamond, baseScale: 1.0 - sIdx * 0.15 });
        });
      });

      const engineLight = new THREE.PointLight(0xffaa00, 12.0, 80);
      engineLight.position.set(ex, ey, ez - 4.0);
      this.meshGroup.add(engineLight);
    });

    // ── 1D. 6 Large Spread External Heavy Dual-Railgun Turrets ──
    const extTurretBarbetteGeo = new THREE.CylinderGeometry(3.2, 4.2, 1.6, 8);
    const extTurretHouseGeo = new THREE.BoxGeometry(3.6, 2.0, 4.2);
    const extBarrelGeo = new THREE.CylinderGeometry(0.28, 0.36, 6.5, 8);
    extBarrelGeo.rotateX(Math.PI / 2);
    const extCoilGeo = new THREE.TorusGeometry(0.44, 0.1, 6, 12);

    this.externalTurrets.forEach(t => {
      const tGroup = new THREE.Group();
      tGroup.position.copy(t.relPos);

      const barbette = new THREE.Mesh(extTurretBarbetteGeo, mechanicalTrussMat);
      tGroup.add(barbette);

      const bGroup = new THREE.Group();
      bGroup.position.set(0, 1.0, 0);

      const house = new THREE.Mesh(extTurretHouseGeo, hullMat);
      bGroup.add(house);

      [-1.1, 1.1].forEach(xOff => {
        const barrel = new THREE.Mesh(extBarrelGeo, mechanicalTrussMat);
        barrel.position.set(xOff, 0.3, 3.0);
        bGroup.add(barrel);

        [1.5, 3.0, 4.5].forEach(zC => {
          const coil = new THREE.Mesh(extCoilGeo, glowAmberMat);
          coil.position.set(xOff, 0.3, zC);
          bGroup.add(coil);
        });
      });

      tGroup.add(bGroup);

      const reticleGeo = new THREE.RingGeometry(2.4, 3.0, 16);
      const reticleMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
      const reticle = new THREE.Mesh(reticleGeo, reticleMat);
      reticle.position.set(0, 1.5, 4.2);
      tGroup.add(reticle);

      this.meshGroup.add(tGroup);
      t.mesh = tGroup;
      t.barrelGroup = bGroup;
      t.reticle = reticle;
      this.reticleMeshes.push(reticle);
    });

    // ── 1E. 4 Large Spread External Heavy Missile Silo Pods ──
    const podHousingGeo = new THREE.BoxGeometry(4.8, 2.5, 6.5);
    this.missilePods.forEach(p => {
      const pGroup = new THREE.Group();
      pGroup.position.copy(p.relPos);

      const housing = new THREE.Mesh(podHousingGeo, mechanicalTrussMat);
      pGroup.add(housing);

      [-1.4, 0, 1.4].forEach(xOff => {
        [-1.6, 1.6].forEach(zOff => {
          const tubeGeo = new THREE.CylinderGeometry(0.45, 0.45, 1.0, 8);
          const tube = new THREE.Mesh(tubeGeo, glowAmberMat);
          tube.position.set(xOff, 1.2, zOff);
          pGroup.add(tube);
        });
      });

      const reticleGeo = new THREE.RingGeometry(2.0, 2.6, 16);
      const reticleMat = new THREE.MeshBasicMaterial({ color: 0xff3300, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
      const reticle = new THREE.Mesh(reticleGeo, reticleMat);
      reticle.position.set(0, 2.2, 0);
      reticle.rotation.x = Math.PI / 2;
      pGroup.add(reticle);

      this.meshGroup.add(pGroup);
      p.mesh = pGroup;
      p.reticle = reticle;
      this.reticleMeshes.push(reticle);
    });

    // ── 2. Mechanical Interior Trench Floor (Bottom) — 56m Wide, 200m Long ──
    const floorGeo = new THREE.BoxGeometry(56, 4.0, 200);
    const floorMesh = new THREE.Mesh(floorGeo, floorGrateMat);
    floorMesh.position.set(0, -14.0, -40);
    this.meshGroup.add(floorMesh);

    // Hydraulic Floor Expansion Ribs & Power Conduit Tracks
    for (let z = -135; z <= 50; z += 18) {
      const ribGeo = new THREE.BoxGeometry(55.5, 1.5, 3.2);
      const rib = new THREE.Mesh(ribGeo, mechanicalTrussMat);
      rib.position.set(0, -11.5, z);
      this.meshGroup.add(rib);

      // Embedded Glowing Coolant Conduit
      const condGeo = new THREE.CylinderGeometry(0.4, 0.4, 54, 6);
      condGeo.rotateZ(Math.PI / 2);
      const cond = new THREE.Mesh(condGeo, glowCyanMat);
      cond.position.set(0, -10.6, z);
      this.meshGroup.add(cond);
    }

    // ── 3. Open-Top Trench Canyon Lateral Catwalks (Crystal-Clear Unobstructed View) ──
    [-28, 28].forEach(cx => {
      const catwalkGeo = new THREE.BoxGeometry(6.0, 1.8, 200);
      const catwalk = new THREE.Mesh(catwalkGeo, mechanicalTrussMat);
      catwalk.position.set(cx, 8.0, -40);
      this.meshGroup.add(catwalk);

      const edgeRailGeo = new THREE.CylinderGeometry(0.3, 0.3, 200, 6);
      edgeRailGeo.rotateX(Math.PI / 2);
      const edgeRail = new THREE.Mesh(edgeRailGeo, glowAmberMat);
      edgeRail.position.set(cx < 0 ? cx + 2.8 : cx - 2.8, 9.2, -40);
      this.meshGroup.add(edgeRail);
    });

    // ── 3B. Internal Obstacle: Laser Tripwire Barrier Grids (Targetable Hubs!) ──
    const tripwireLaserMat = new THREE.MeshBasicMaterial({ color: 0xff0044, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending });
    this.laserTripwires.forEach(lw => {
      const wireGroup = new THREE.Group();
      wireGroup.position.set(0, 0, lw.z);

      const beamGeo = new THREE.CylinderGeometry(0.2, 0.2, 54, 6);
      beamGeo.rotateZ(Math.PI / 2);
      const beam = new THREE.Mesh(beamGeo, tripwireLaserMat);
      wireGroup.add(beam);

      [-27, 27].forEach(px => {
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 1.4, 8), mechanicalTrussMat);
        hub.position.set(px, 0, 0);
        hub.rotation.z = px < 0 ? -Math.PI / 2 : Math.PI / 2;
        wireGroup.add(hub);
      });

      // Target reticle on tripwire emitter
      const reticleGeo = new THREE.RingGeometry(1.6, 2.0, 16);
      const reticleMat = new THREE.MeshBasicMaterial({ color: 0xff0044, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
      const reticle = new THREE.Mesh(reticleGeo, reticleMat);
      reticle.position.set(0, 0, 1.5);
      wireGroup.add(reticle);

      this.meshGroup.add(wireGroup);
      lw.mesh = wireGroup;
      lw.reticle = reticle;
      this.reticleMeshes.push(reticle);
    });

    // ── 3C. Internal Obstacle: Hydraulic Compression Blast Bulkheads (Targetable Override Boxes!) ──
    this.bulkheads.forEach(b => {
      const bGroup = new THREE.Group();
      bGroup.position.set(0, 0, b.z);

      const doorGeo = new THREE.BoxGeometry(26, 26, 2.5);
      const leftDoor = new THREE.Mesh(doorGeo, mechanicalTrussMat);
      leftDoor.position.set(-16, 0, 0);
      bGroup.add(leftDoor);

      const rightDoor = new THREE.Mesh(doorGeo, mechanicalTrussMat);
      rightDoor.position.set(16, 0, 0);
      bGroup.add(rightDoor);

      const archGeo = new THREE.BoxGeometry(56, 28, 3.5);
      const archMesh = new THREE.Mesh(archGeo, hullMat);
      bGroup.add(archMesh);

      // Hydraulic Override Box (Shoot to disable door closing!)
      const boxGeo = new THREE.BoxGeometry(3.0, 3.0, 1.8);
      const overrideBox = new THREE.Mesh(boxGeo, mechanicalTrussMat);
      overrideBox.position.set(0, 10, 2.5);
      bGroup.add(overrideBox);

      const reticleGeo = new THREE.RingGeometry(1.5, 1.9, 16);
      const reticleMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
      const reticle = new THREE.Mesh(reticleGeo, reticleMat);
      reticle.position.set(0, 10, 3.8);
      bGroup.add(reticle);

      const cLight = new THREE.PointLight(0xffaa00, 3.0, 25);
      cLight.position.set(0, 11, 2);
      bGroup.add(cLight);

      this.meshGroup.add(bGroup);
      b.leftDoor = leftDoor;
      b.rightDoor = rightDoor;
      b.overrideBox = overrideBox;
      b.reticle = reticle;
      this.reticleMeshes.push(reticle);
    });

    // ── 4. Dual Superconducting Shield Generator Hubs (Hangar Entrance) ──
    const genPylonGeo = new THREE.CylinderGeometry(2.4, 3.8, 16.0, 8);
    const genRingGeo = new THREE.TorusGeometry(4.2, 0.6, 10, 24);

    this.shieldGenerators.forEach(g => {
      const gGroup = new THREE.Group();
      gGroup.position.copy(g.relPos);

      const pylon = new THREE.Mesh(genPylonGeo, mechanicalTrussMat);
      gGroup.add(pylon);

      const ring = new THREE.Mesh(genRingGeo, glowCyanMat);
      ring.position.set(0, 3.5, 0);
      ring.rotation.x = Math.PI / 2;
      gGroup.add(ring);

      const crystalGeo = new THREE.OctahedronGeometry(2.2, 0);
      const crystal = new THREE.Mesh(crystalGeo, glowMagentaMat);
      crystal.position.set(0, 3.5, 0);
      gGroup.add(crystal);

      const reticleGeo = new THREE.RingGeometry(3.2, 4.0, 16);
      const reticleMat = new THREE.MeshBasicMaterial({ color: 0xff00bb, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
      const reticle = new THREE.Mesh(reticleGeo, reticleMat);
      reticle.position.set(0, 3.5, 4.0);
      gGroup.add(reticle);

      this.meshGroup.add(gGroup);
      g.mesh = gGroup;
      g.ringMesh = ring;
      g.reticle = reticle;
      this.reticleMeshes.push(reticle);
    });

    // ── 5. Shimmering Plasma Forcefield Shield Barrier Grid ──
    const shieldGridGeo = new THREE.PlaneGeometry(55.0, 26.0, 16, 10);
    this.plasmaShieldMat = new THREE.MeshBasicMaterial({
      color: 0xff00bb,
      wireframe: true,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    this.plasmaShieldMesh = new THREE.Mesh(shieldGridGeo, this.plasmaShieldMat);
    this.plasmaShieldMesh.position.set(0, 0, 46.0);
    this.meshGroup.add(this.plasmaShieldMesh);

    // ── 5B. Trench & Entrance Interior Illumination ──
    this.trenchLight = new THREE.PointLight(0x00f3ff, 12.0, 120);
    this.trenchLight.position.set(0, 0, -20);
    this.meshGroup.add(this.trenchLight);

    this.shieldEntranceLight = new THREE.PointLight(0xff00bb, 10.0, 80);
    this.shieldEntranceLight.position.set(0, 0, 48);
    this.meshGroup.add(this.shieldEntranceLight);

    // ── 6. 8 Internal CIWS Point-Defense Laser Turrets ──
    const turretBaseGeo = new THREE.CylinderGeometry(2.4, 3.2, 1.2, 8);
    const barrelGeo = new THREE.CylinderGeometry(0.22, 0.3, 5.0, 6);
    barrelGeo.rotateX(Math.PI / 2);

    this.internalTurrets.forEach(t => {
      const tGroup = new THREE.Group();
      tGroup.position.copy(t.relPos);

      const base = new THREE.Mesh(turretBaseGeo, mechanicalTrussMat);
      tGroup.add(base);

      const bGroup = new THREE.Group();
      bGroup.position.set(0, 0, 0.8);

      [-0.9, 0.9].forEach(xOff => {
        const b = new THREE.Mesh(barrelGeo, mechanicalTrussMat);
        b.position.set(xOff, 0, 2.4);
        bGroup.add(b);

        const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.32, 6, 6), glowAmberMat);
        muzzle.position.set(xOff, 0, 5.0);
        bGroup.add(muzzle);
      });

      tGroup.add(bGroup);

      const reticleGeo = new THREE.RingGeometry(2.0, 2.5, 16);
      const reticleMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
      const reticle = new THREE.Mesh(reticleGeo, reticleMat);
      reticle.position.set(0, 0, 3.4);
      tGroup.add(reticle);

      this.meshGroup.add(tGroup);
      t.mesh = tGroup;
      t.barrelGroup = bGroup;
      t.reticle = reticle;
      this.reticleMeshes.push(reticle);
    });

    // ── 7. The Suspended Central Power Core & 4 Magnetic Couplings (Reactor Vault at z = -110) ──
    this.coreHousingGroup = new THREE.Group();
    this.coreHousingGroup.position.set(0, 0, -110.0);

    // Glowing Power Core Sphere (12m Diameter)
    const powerCoreGeo = new THREE.SphereGeometry(6.0, 24, 24);
    this.powerCoreMat = new THREE.MeshStandardMaterial({
      color: 0x3a1200,
      emissive: 0xff5500,
      emissiveIntensity: 7.0,
      roughness: 0.05,
      metalness: 0.8
    });
    this.powerCoreMesh = new THREE.Mesh(powerCoreGeo, this.powerCoreMat);
    this.coreHousingGroup.add(this.powerCoreMesh);

    // Counter-Rotating Gyroscopic Containment Rings
    [8.2, 9.8].forEach((rRad, idx) => {
      const gGeo = new THREE.TorusGeometry(rRad, 0.5, 8, 36);
      const gMat = new THREE.MeshBasicMaterial({ color: idx === 0 ? 0x00f3ff : 0xffaa00, transparent: true, opacity: 0.85 });
      const gRing = new THREE.Mesh(gGeo, gMat);
      this.coreHousingGroup.add(gRing);
      this.coreGyroRings.push({ mesh: gRing, speed: idx === 0 ? 1.8 : -1.4 });
    });

    // Core Illumination Point Light
    this.coreLight = new THREE.PointLight(0xff6600, 25.0, 110);
    this.coreHousingGroup.add(this.coreLight);

    this.meshGroup.add(this.coreHousingGroup);

    // ── 8. 4 Heavy Magnetic Suspension Couplings / Clamp Pylons ──
    const clampArmGeo = new THREE.BoxGeometry(3.6, 3.6, 9.0);
    const clampLockGeo = new THREE.CylinderGeometry(2.4, 3.0, 4.0, 8);
    clampLockGeo.rotateX(Math.PI / 2);

    this.coreCouplings.forEach((c, idx) => {
      const cGroup = new THREE.Group();
      cGroup.position.copy(c.relPos);

      const arm = new THREE.Mesh(clampArmGeo, mechanicalTrussMat);
      cGroup.add(arm);

      const lockHub = new THREE.Mesh(clampLockGeo, mechanicalTrussMat);
      lockHub.position.set(0, 0, 3.2);
      cGroup.add(lockHub);

      const lockRing = new THREE.Mesh(new THREE.TorusGeometry(3.0, 0.45, 8, 24), glowCyanMat);
      lockRing.position.set(0, 0, 4.5);
      cGroup.add(lockRing);

      // High-Visibility Primary Targeting Ring
      const reticleGeo = new THREE.RingGeometry(3.6, 4.6, 24);
      const reticleMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
      const reticle = new THREE.Mesh(reticleGeo, reticleMat);
      reticle.position.set(0, 0, 5.5);
      cGroup.add(reticle);

      // Holographic Diamond Target Brackets
      const diamondGeo = new THREE.RingGeometry(5.2, 5.8, 4);
      diamondGeo.rotateZ(Math.PI / 4);
      const diamondMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
      const diamond = new THREE.Mesh(diamondGeo, diamondMat);
      diamond.position.set(0, 0, 5.6);
      cGroup.add(diamond);

      this.meshGroup.add(cGroup);
      c.mesh = cGroup;
      c.clampArm = arm;
      c.reticle = reticle;
      c.diamond = diamond;
      this.reticleMeshes.push(reticle);
      this.reticleMeshes.push(diamond);
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

  takeFoundryBayDamage(foundryId, amount) {
    const fb = this.foundryBays.find(f => f.id === foundryId);
    if (!fb || fb.isDead) return false;
    fb.hp -= amount;

    if (fb.reticle && fb.reticle.material) {
      const pct = fb.hp / fb.maxHp;
      fb.reticle.material.color.setHex(pct > 0.5 ? 0xff6600 : (pct > 0.25 ? 0xffaa00 : 0xff0044));
    }

    if (fb.hp <= 0) {
      fb.isDead = true;
      if (fb.vatMesh) fb.vatMesh.visible = false;
      if (fb.reticle) fb.reticle.visible = false;
      const wp = fb.mesh.getWorldPosition(new THREE.Vector3());
      this.particleManager.createExplosion(wp, 0xff5500, 160, 4.5);
      this.particleManager.createExplosion(wp, 0xffffff, 80, 2.5);
      this.particleManager.createEmpShockwave(wp, 60);

      window.spaceGameManager?.voiceAnnouncer?.speak(`Manufacturing Foundry Forge destroyed!`, false);
    }
    return fb.isDead;
  }

  takeLaserTripwireDamage(tripwireId, amount) {
    const lw = this.laserTripwires.find(l => l.id === tripwireId);
    if (!lw || lw.isDead) return false;
    lw.hp -= amount;

    if (lw.reticle && lw.reticle.material) {
      const pct = lw.hp / lw.maxHp;
      lw.reticle.material.color.setHex(pct > 0.5 ? 0xff0044 : (pct > 0.25 ? 0xffaa00 : 0xff0000));
    }

    if (lw.hp <= 0) {
      lw.isDead = true;
      if (lw.mesh) lw.mesh.visible = false;
      if (lw.reticle) lw.reticle.visible = false;
      const wp = lw.mesh.getWorldPosition(new THREE.Vector3());
      this.particleManager.createExplosion(wp, 0xff0044, 80, 2.5);
      this.particleManager.createEmpShockwave(wp, 35);
    }
    return lw.isDead;
  }

  takeBulkheadDamage(bulkheadId, amount) {
    const b = this.bulkheads.find(bk => bk.id === bulkheadId);
    if (!b || b.isDead) return false;
    b.hp -= amount;

    if (b.reticle && b.reticle.material) {
      const pct = b.hp / b.maxHp;
      b.reticle.material.color.setHex(pct > 0.5 ? 0xffaa00 : (pct > 0.25 ? 0xff5500 : 0xff0044));
    }

    if (b.hp <= 0) {
      b.isDead = true;
      b.openState = 0.98; // blast doors forced wide open permanently!
      if (b.leftDoor && b.rightDoor) {
        b.leftDoor.position.x = -32.0;
        b.rightDoor.position.x = 32.0;
      }
      if (b.overrideBox) b.overrideBox.visible = false;
      if (b.reticle) b.reticle.visible = false;
      const wp = b.overrideBox ? b.overrideBox.getWorldPosition(new THREE.Vector3()) : b.leftDoor.getWorldPosition(new THREE.Vector3());
      this.particleManager.createExplosion(wp, 0xffaa00, 110, 3.2);
      this.particleManager.createEmpShockwave(wp, 45);
    }
    return b.isDead;
  }

  takeTurbineDamage(turbineId, amount) {
    const t = this.turbines.find(tb => tb.id === turbineId);
    if (!t || t.isDead) return false;
    t.hp -= amount;

    if (t.reticle && t.reticle.material) {
      const pct = t.hp / t.maxHp;
      t.reticle.material.color.setHex(pct > 0.5 ? 0xff5500 : (pct > 0.25 ? 0xffaa00 : 0xff0044));
    }

    if (t.hp <= 0) {
      t.isDead = true;
      if (t.reticle) t.reticle.visible = false;
      const wp = t.cowlMesh.getWorldPosition(new THREE.Vector3());
      this.particleManager.createExplosion(wp, 0xff5500, 90, 2.8);
      this.particleManager.createEmpShockwave(wp, 35);
    }
    return t.isDead;
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

    // 1. Advance Mothership (Advances deeper to allow full interior infiltration once shield is down)
    const effectiveTargetZ = this.hasPlasmaShield ? this.targetZ : 25.0;
    if (pos.z < effectiveTargetZ) {
      pos.z += this.speed * dt;
    }

    // 2. AAA Engine Exhaust Shimmer & Mach Shock Diamond Pulsation
    const exhaustShudder = 1.0 + Math.sin(this._time * 28.0) * 0.12 + Math.cos(this._time * 44.0) * 0.08;
    if (this.engineExhaustPlumes) {
      this.engineExhaustPlumes.forEach(p => {
        p.scale.set(exhaustShudder, exhaustShudder, 1.0 + Math.sin(this._time * 30.0) * 0.18);
      });
    }
    if (this.machDiamondRings) {
      this.machDiamondRings.forEach(d => {
        const sc = d.baseScale * (1.0 + Math.sin(this._time * 24.0) * 0.15);
        d.mesh.scale.set(sc, sc, sc);
      });
    }

    // 2B. Rotate Ceiling Ventilation Turbines
    if (this.turbines) {
      this.turbines.forEach(tb => {
        if (!tb.isDead && tb.fanGroup) {
          tb.fanGroup.rotation.z += 8.0 * dt;
        }
      });
    }

    // 2C. Animate Laser Tripwire Grids
    if (this.laserTripwires) {
      this.laserTripwires.forEach((lw, idx) => {
        if (!lw.isDead && lw.mesh) {
          if (lw.axis === 'y') {
            lw.mesh.position.y = Math.sin(this._time * lw.speed + idx) * lw.range;
          } else {
            lw.mesh.position.x = Math.sin(this._time * lw.speed + idx) * lw.range;
          }
        }
      });
    }

    // 2D. Animate Hydraulic Compression Blast Bulkheads
    if (this.bulkheads) {
      this.bulkheads.forEach(b => {
        if (!b.isDead) {
          b.timer -= dt;
          if (b.timer <= 0) {
            b.timer = 3.0;
            b.openDir *= -1;
          }
          b.openState = THREE.MathUtils.clamp(b.openState + b.openDir * 0.8 * dt, 0.1, 0.95);
          if (b.leftDoor && b.rightDoor) {
            const doorOffset = 14.0 + b.openState * 18.0;
            b.leftDoor.position.x = -doorOffset;
            b.rightDoor.position.x = doorOffset;
          }
        }
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
      this.coreDropVelocity += 16.0 * dt;
      this.coreDropY -= this.coreDropVelocity * dt;

      if (this.coreHousingGroup) {
        this.coreHousingGroup.position.y = this.coreDropY;
      }

      if (this.coreDropY <= -8.5) {
        this.isCoreRuptured = true;
        this.isDying = true;
        this.deathTimer = 5.0;

        const coreWorldPos = this.coreHousingGroup ? this.coreHousingGroup.getWorldPosition(new THREE.Vector3()) : pos;
        this.particleManager.createExplosion(coreWorldPos, 0xffffff, 500, 10.0);
        this.particleManager.createExplosion(coreWorldPos, 0xff5500, 400, 8.5);
        this.particleManager.createEmpShockwave(coreWorldPos, 300);
        this.particleManager.createEmpShockwave(coreWorldPos, 450);

        if (this.powerCoreMesh) this.powerCoreMesh.visible = false;
        if (this.coreLight) this.coreLight.intensity = 60.0;
      }
    }

    // 8. Death Sequence & Cascading Internal Detonations
    if (this.isDying) {
      this.deathTimer -= dt;

      if (Math.random() < 0.9 && this.particleManager) {
        const offset = new THREE.Vector3((Math.random() - 0.5) * 65, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 120);
        this.particleManager.createExplosion(pos.clone().add(offset), 0xffaa00, 60, 3.0);
        this.particleManager.createExplosion(pos.clone().add(offset), 0x00f3ff, 45, 2.2);
      }

      if (this.meshGroup) {
        this.meshGroup.rotation.z += 0.12 * dt;
        this.meshGroup.rotation.x += 0.06 * dt;
      }

      if (this.deathTimer <= 0) {
        this.destroy();
        return false;
      }
      return false;
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

    // 12. Foundry Element Manufacturing Drone Spawns (Only if alive foundry bays exist!)
    this.droneLaunchTimer -= dt;
    if (this.droneLaunchTimer <= 0 && pos.z >= this.targetZ - 10) {
      this.droneLaunchTimer = 5.5;
      const aliveFoundries = this.foundryBays.filter(fb => !fb.isDead);
      if (aliveFoundries.length > 0 && gameManager && gameManager.spawnDrone) {
        const randomFoundry = aliveFoundries[Math.floor(Math.random() * aliveFoundries.length)];
        const launchPos = randomFoundry.mesh.getWorldPosition(new THREE.Vector3());
        gameManager.spawnDrone(launchPos);
      }
    }

    return out.length > 0 ? out : false;
  }

  destroy() {
    this.isDead = true;
    const gm = window.spaceGameManager;
    if (gm && gm.achievementSystem) {
      if (typeof gm.achievementSystem.recordBossKilled === 'function') {
        gm.achievementSystem.recordBossKilled();
      } else if (typeof gm.achievementSystem.recordBossKill === 'function') {
        gm.achievementSystem.recordBossKill();
      }
    }
    if (this.particleManager && this.meshGroup) {
      this.particleManager.createExplosion(this.meshGroup.position, 0xffaa00, 300, 8.0);
      this.particleManager.createExplosion(this.meshGroup.position, 0xffffff, 200, 6.0);
      this.particleManager.createEmpShockwave(this.meshGroup.position, 280);
    }
    if (this.meshGroup && this.meshGroup.parent) {
      this.meshGroup.parent.remove(this.meshGroup);
    }
  }
}
