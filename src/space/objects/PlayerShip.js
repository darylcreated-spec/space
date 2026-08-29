import * as THREE from 'three';
import { getPBRMaterialSet } from '../engine/PBRTextureGenerator.js';

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

    // Modular Components & Livery Customization
    this.currentLivery = 'DEFAULT';
    this.reactorCore = 'DEFAULT';        // 'DEFAULT', 'OVERCLOCKED_PLASMA', 'TITANIUM_AEGIS'
    this.thrusterManifold = 'DEFAULT';    // 'DEFAULT', 'AFTERBURNER', 'VECTOR_RCS'
    this.avionicsSuite = 'DEFAULT';       // 'DEFAULT', 'AUTO_AIM', 'SCRAP_MAGNET'

    // Superweapons & Advanced Weaponry States
    this.railgunCharge = 0;
    this.isChargingRailgun = false;
    this.tachyonBeamActive = false;
    this.nukeCooldown = 0;
    this.maxNukeCD = 24.0;
    this.nukeCharges = 1;

    // Premium Add-On Feature
    this.hasMiningAddon = false;

    // Mechanical Articulation & Visual FX Arrays
    this.flameMeshes = [];
    this.shockDiamonds = [];
    this.muzzleOffsets = [];
    this.wingtipOffsets = [];
    this.wingtipLights = [];
    this.wingtipBeacons = [];
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
    this.sentinelDrone = null;

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
    this.wingtipLights = [];
    this.wingtipBeacons = [];
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
    this.sentinelDrone = null;
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
    this.shipClass = className || 'INTERCEPTOR';

    // Hexagonal Shield Dome
    const shieldGeo = new THREE.IcosahedronGeometry(3.3, 2);
    let shieldColor = 0x00f3ff;
    if (this.shipClass === 'DREADNOUGHT') shieldColor = 0xff0044;
    else if (this.shipClass === 'TACTICIAN') shieldColor = 0x00ff88;
    else if (this.shipClass === 'REAPER') shieldColor = 0xaa00ff;
    else if (this.shipClass === 'SENTINEL') shieldColor = 0x00e5ff;

    this.shieldMat = new THREE.MeshBasicMaterial({
      color: shieldColor,
      wireframe: true,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending
    });
    this.shieldMesh = new THREE.Mesh(shieldGeo, this.shieldMat);
    this.meshGroup.add(this.shieldMesh);

    if (this.shipClass === 'INTERCEPTOR') {
      this.buildInterceptorMesh();
    } else if (this.shipClass === 'DREADNOUGHT') {
      this.buildDreadnoughtMesh();
    } else if (this.shipClass === 'TACTICIAN') {
      this.buildTacticianMesh();
    } else if (this.shipClass === 'REAPER') {
      this.buildReaperMesh();
    } else if (this.shipClass === 'SENTINEL') {
      this.buildSentinelMesh();
    } else {
      this.buildInterceptorMesh();
    }
  }

  // ────────────────────────────────────────────────────────────
  // 1. ⚡ INTERCEPTOR: "Vanguard Alpha" (Twin V-Tail, Canards, Ailerons & Underwing Missiles)
  // ────────────────────────────────────────────────────────────
  buildInterceptorMesh() {
    this.maxShield = 90;
    this.shield = 90;
    this.speed = 36;
    this.laserFireDelay = 0.06;
    this.dodgeMaxCooldown = 1.2;
    this.maxSwarmCD = 3.0;

    const pbr = getPBRMaterialSet('INTERCEPTOR');

    // ── High-Tech Materials ──
    const bodyMat = new THREE.MeshStandardMaterial({
      map: pbr.map,
      bumpMap: pbr.bumpMap,
      bumpScale: pbr.bumpScale,
      roughnessMap: pbr.roughnessMap,
      emissiveMap: pbr.emissiveMap,
      color: 0x0e1c34,
      metalness: pbr.metalness,
      roughness: pbr.roughness,
      emissive: pbr.emissive,
      emissiveIntensity: pbr.emissiveIntensity
    });

    const armorTrussMat = new THREE.MeshStandardMaterial({
      color: 0x1a3356,
      metalness: 0.98,
      roughness: 0.12
    });

    const darkAlloyMat = new THREE.MeshStandardMaterial({
      color: 0x070e1a,
      metalness: 0.96,
      roughness: 0.22
    });

    const edgeMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
    const glowAmberMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });

    // ── 1. Main Needle Fuselage (Nose at -Z, Stern at +Z) ──
    const bodyGeo = new THREE.ConeGeometry(0.82, 5.6, 8);
    bodyGeo.rotateX(-Math.PI / 2); // Apex points forward at -Z!
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 0, -0.2);
    this.meshGroup.add(body);

    // Titanium Pitot Airspeed Needle at Nose Apex
    const needleGeo = new THREE.CylinderGeometry(0.02, 0.06, 1.4, 8);
    needleGeo.rotateX(Math.PI / 2);
    const needle = new THREE.Mesh(needleGeo, armorTrussMat);
    needle.position.set(0, 0, -3.6);
    this.meshGroup.add(needle);

    const apexLens = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), edgeMat);
    apexLens.position.set(0, 0, -4.3);
    this.meshGroup.add(apexLens);

    // ── 2. Transparent Glass Canopy with Cockpit Interior ──
    const canopyGeo = new THREE.SphereGeometry(0.52, 16, 16);
    canopyGeo.scale(0.8, 0.6, 1.5);
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x00f3ff,
      emissive: 0x00aaff,
      emissiveIntensity: 0.55,
      transparent: true,
      opacity: 0.75,
      roughness: 0.05,
      metalness: 0.1
    });
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 0.32, -0.4);
    this.meshGroup.add(canopy);
    this.buildCockpitInterior(this.meshGroup, 0x00f3ff);

    // ── 3. Swept Delta Wings (Port & Starboard Symmetrical) ──
    const wingMat = new THREE.MeshStandardMaterial({ map: pbr.map, color: 0x14243d, metalness: 0.92, roughness: 0.18 });

    // Right Wing Base Shape (Counter-Clockwise)
    const rightWingShape = new THREE.Shape();
    rightWingShape.moveTo(0.25, 0.7);       // Root leading edge (forward)
    rightWingShape.lineTo(3.4, -1.2);      // Wingtip leading edge (swept back)
    rightWingShape.lineTo(3.2, -2.1);      // Wingtip trailing edge
    rightWingShape.lineTo(0.25, -1.7);     // Root trailing edge
    rightWingShape.closePath();

    const wingExtrude = { depth: 0.12, bevelEnabled: true, bevelSize: 0.03 };
    const baseWingGeo = new THREE.ExtrudeGeometry(rightWingShape, wingExtrude);
    baseWingGeo.rotateX(-Math.PI / 2); // Rotate flat in XZ plane with top facing +Y

    const rightWing = new THREE.Mesh(baseWingGeo, wingMat);
    rightWing.position.set(0, 0.02, 0);
    this.meshGroup.add(rightWing);

    const leftWingGeo = baseWingGeo.clone();
    leftWingGeo.scale(-1, 1, 1);
    const leftWing = new THREE.Mesh(leftWingGeo, wingMat);
    leftWing.position.set(0, 0.02, 0);
    this.meshGroup.add(leftWing);

    // Wingtip Winglets & Flashing Navigation Strobe Lights
    [-1, 1].forEach(side => {
      const wingletGeo = new THREE.BoxGeometry(0.12, 0.9, 1.3);
      const winglet = new THREE.Mesh(wingletGeo, armorTrussMat);
      winglet.position.set(side * 3.3, 0.38, 1.65);
      winglet.rotation.x = -0.15;
      winglet.rotation.z = -side * 0.18;
      this.meshGroup.add(winglet);

      const beaconMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0.9 });
      const beacon = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.65, 0.1), beaconMat);
      beacon.position.set(side * 3.35, 0.38, 2.2);
      this.meshGroup.add(beacon);
      this.wingtipBeacons.push(beacon);

      const tipLight = new THREE.PointLight(0x00f3ff, 2.8, 8);
      tipLight.position.set(side * 3.35, 0.38, 2.2);
      this.meshGroup.add(tipLight);
      this.wingtipLights.push(tipLight);

      const conduitGeo = new THREE.BoxGeometry(0.08, 0.08, 2.6);
      const conduit = new THREE.Mesh(conduitGeo, edgeMat);
      conduit.position.set(side * 1.8, 0.08, 0.2);
      conduit.rotation.y = -side * 0.58;
      this.meshGroup.add(conduit);
    });

    // ── 4. ✨ TWIN CANTED V-TAIL STABILIZERS (Articulated Rudders) ──
    const tailFinGeo = new THREE.BoxGeometry(0.1, 1.6, 1.8);
    const rudderGeo = new THREE.BoxGeometry(0.08, 1.3, 0.4);

    [-0.75, 0.75].forEach((tx, idx) => {
      const side = idx === 0 ? -1 : 1;
      const tailGroup = new THREE.Group();
      tailGroup.position.set(tx, 0.42, 1.6);
      tailGroup.rotation.z = -side * 0.35; // Canted outward
      tailGroup.rotation.x = -0.28;       // Swept backwards

      const finMesh = new THREE.Mesh(tailFinGeo, wingMat);
      finMesh.position.set(0, 0.7, 0);
      tailGroup.add(finMesh);

      // Titanium Leading Edge Armor Slat
      const slatMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.6, 0.25), armorTrussMat);
      slatMesh.position.set(0, 0.7, -0.85);
      tailGroup.add(slatMesh);

      // Luminous Neon Cyan Trailing Beacon Strip
      const beaconMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.4, 0.08), edgeMat);
      beaconMesh.position.set(0, 0.7, 0.85);
      tailGroup.add(beaconMesh);

      // Articulated Dynamic Rudder Surface
      const rudder = new THREE.Mesh(rudderGeo, darkAlloyMat);
      rudder.position.set(0, 0.7, 0.65);
      tailGroup.add(rudder);

      if (idx === 0) this.rudderL = rudder;
      else this.rudderR = rudder;

      this.meshGroup.add(tailGroup);
    });

    // ── 5. Articulated Wing Ailerons & Forward Canards ──
    const aileronGeo = new THREE.BoxGeometry(1.2, 0.06, 0.35);
    this.aileronR = new THREE.Mesh(aileronGeo, wingMat);
    this.aileronR.position.set(2.2, 0.04, 1.9);
    this.meshGroup.add(this.aileronR);

    this.aileronL = new THREE.Mesh(aileronGeo, wingMat);
    this.aileronL.position.set(-2.2, 0.04, 1.9);
    this.meshGroup.add(this.aileronL);

    const canardGeo = new THREE.BoxGeometry(1.0, 0.05, 0.45);
    this.canardR = new THREE.Mesh(canardGeo, wingMat);
    this.canardR.position.set(0.9, 0.08, -1.2);
    this.canardR.rotation.y = 0.2;
    this.meshGroup.add(this.canardR);

    this.canardL = new THREE.Mesh(canardGeo, wingMat);
    this.canardL.position.set(-0.9, 0.08, -1.2);
    this.canardL.rotation.y = -0.2;
    this.meshGroup.add(this.canardL);

    // ── 6. 🚀 UNDERWING HEAVY MISSILE PYLONS & SWARM ORDNANCE ──
    const mPylonGeo = new THREE.BoxGeometry(0.06, 0.2, 1.0);
    const mBodyGeo = new THREE.CylinderGeometry(0.07, 0.07, 1.1, 8);
    mBodyGeo.rotateX(Math.PI / 2);
    const mHeadGeo = new THREE.ConeGeometry(0.08, 0.3, 8);
    mHeadGeo.rotateX(-Math.PI / 2); // Warhead points forward at -Z!

    [-1.9, 1.9].forEach(mx => {
      const pylonGroup = new THREE.Group();
      pylonGroup.position.set(mx, -0.2, 0.4);

      const pylon = new THREE.Mesh(mPylonGeo, darkAlloyMat);
      pylon.position.set(0, 0.1, 0);
      pylonGroup.add(pylon);

      // Micro Kinetic Swarm Missiles
      [-0.14, 0.14].forEach(ox => {
        const missile = new THREE.Group();
        missile.position.set(ox, -0.08, 0);

        const mBody = new THREE.Mesh(mBodyGeo, armorTrussMat);
        missile.add(mBody);

        const mHead = new THREE.Mesh(mHeadGeo, glowAmberMat);
        mHead.position.set(0, 0, -0.65);
        missile.add(mHead);

        const mLens = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), edgeMat);
        mLens.position.set(0, 0, -0.8);
        missile.add(mLens);

        pylonGroup.add(missile);
      });

      this.meshGroup.add(pylonGroup);
    });

    // ── 7. Triple Rapid-Pulse Laser Muzzles (Focused Precision Hardpoints) ──
    this.muzzleOffsets = [
      new THREE.Vector3(-1.3, 0, -1.0),
      new THREE.Vector3(0, -0.15, -3.2),
      new THREE.Vector3(1.3, 0, -1.0)
    ];
    this.muzzleOffsets.forEach(pos => {
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), edgeMat);
      tip.position.copy(pos);
      this.meshGroup.add(tip);
    });

    // ── 8. Twin High-Thrust Afterburning Engines (Firing Directly Backwards +Z) ──
    const engGeo = new THREE.CylinderGeometry(0.3, 0.42, 1.1, 12);
    engGeo.rotateX(Math.PI / 2);
    const engMat = new THREE.MeshStandardMaterial({ color: 0x08101c, metalness: 0.95, roughness: 0.2 });

    const flameGeo = new THREE.ConeGeometry(0.24, 1.5, 10);
    flameGeo.rotateX(Math.PI / 2); // Base at nozzle, apex pointing backward (+Z)
    const flameMat = new THREE.MeshStandardMaterial({ color: 0x00f3ff, emissive: 0x00f3ff, emissiveIntensity: 3.5, transparent: true, opacity: 0.9, roughness: 0.0, metalness: 0.0, toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false });

    [-0.6, 0.6].forEach(x => {
      const eng = new THREE.Mesh(engGeo, engMat);
      eng.position.set(x, -0.06, 2.1);
      this.meshGroup.add(eng);

      // Exhaust Flame firing directly out the back (+Z)
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.set(x, -0.06, 3.2);
      this.meshGroup.add(flame);
      this.flameMeshes.push(flame);

      // Mach Shock Diamond Disks
      for (let d = 0; d < 3; d++) {
        const dia = new THREE.Mesh(new THREE.RingGeometry(0.04, 0.16 - d * 0.03, 12), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
        dia.position.set(x, -0.06, 2.5 + d * 0.35);
        this.meshGroup.add(dia);
        this.shockDiamonds.push(dia);
      }
    });

    this.wingtipOffsets = [new THREE.Vector3(-3.4, 0, 1.7), new THREE.Vector3(3.4, 0, 1.7)];
    this.engineTrailOffsets = [new THREE.Vector3(-0.6, -0.06, 2.8), new THREE.Vector3(0.6, -0.06, 2.8)];

    // RCS Quad Ports (Nose and Wingtips)
    this.rcsPorts = [
      { pos: new THREE.Vector3(0, 0.3, -2.6), dirY: 1, dirX: 0 },
      { pos: new THREE.Vector3(0, -0.3, -2.6), dirY: -1, dirX: 0 },
      { pos: new THREE.Vector3(-3.2, 0, 1.5), dirY: 0, dirX: -1 },
      { pos: new THREE.Vector3(3.2, 0, 1.5), dirY: 0, dirX: 1 }
    ];

    this.engineLight = new THREE.PointLight(0x00f3ff, 1.8, 10);
    this.engineLight.position.set(0, 0, 2.5);
    this.meshGroup.add(this.engineLight);
  }

  // ────────────────────────────────────────────────────────────
  // 2. 🛡️ DREADNOUGHT: "Titan Colossus" (Dual VLS Rocket Pods, Ram Prow & Quad Thrusters)
  // ────────────────────────────────────────────────────────────
  buildDreadnoughtMesh() {
    this.maxShield = 220;
    this.shield = 220;
    this.speed = 22;
    this.laserFireDelay = 0.16;
    this.dodgeMaxCooldown = 2.4;
    this.maxSwarmCD = 5.0;

    const pbr = getPBRMaterialSet('DREADNOUGHT');

    // ── High-Tech Heavy Armor Materials ──
    const hullMat = new THREE.MeshStandardMaterial({
      map: pbr.map,
      bumpMap: pbr.bumpMap,
      bumpScale: pbr.bumpScale,
      roughnessMap: pbr.roughnessMap,
      emissiveMap: pbr.emissiveMap,
      color: 0x221218,
      metalness: pbr.metalness,
      roughness: pbr.roughness,
      emissive: pbr.emissive,
      emissiveIntensity: pbr.emissiveIntensity
    });

    const armorTrussMat = new THREE.MeshStandardMaterial({
      color: 0x2a1a1f,
      metalness: 0.98,
      roughness: 0.15
    });

    const darkAlloyMat = new THREE.MeshStandardMaterial({
      color: 0x0c0608,
      metalness: 0.96,
      roughness: 0.22
    });

    const crimsonEdgeMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });
    const glowAmberMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });

    // ── 1. Main Heavy Faceted Hull Chassis ──
    const hullGeo = new THREE.BoxGeometry(2.6, 1.4, 5.4);
    const hull = new THREE.Mesh(hullGeo, hullMat);
    hull.position.set(0, 0, -0.2);
    this.meshGroup.add(hull);

    // Armored Dorsal Spine Slat
    const spineGeo = new THREE.BoxGeometry(0.8, 0.45, 4.8);
    const spine = new THREE.Mesh(spineGeo, armorTrussMat);
    spine.position.set(0, 0.8, -0.1);
    this.meshGroup.add(spine);

    // ── 2. Reinforced Tungsten-Titanium Heavy Ramming Prow ──
    const ramGeo = new THREE.ConeGeometry(1.65, 2.4, 4);
    ramGeo.rotateX(-Math.PI / 2); // Apex points forward along -Z!
    ramGeo.rotateZ(Math.PI / 4);  // Diamond facet profile
    this.ramMat = new THREE.MeshStandardMaterial({
      color: 0x3d0d14,
      metalness: 0.94,
      roughness: 0.18,
      emissive: 0xff3300,
      emissiveIntensity: 0.2
    });
    const ram = new THREE.Mesh(ramGeo, this.ramMat);
    ram.position.set(0, -0.05, -3.8);
    this.meshGroup.add(ram);

    // Prow Hazard Edge Lights
    [-0.8, 0.8].forEach(px => {
      const pEdge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 2.2), crimsonEdgeMat);
      pEdge.position.set(px, 0.1, -3.5);
      pEdge.rotation.y = px < 0 ? 0.35 : -0.35;
      this.meshGroup.add(pEdge);
    });

    // ── 3. 🚀 DUAL SHOULDER-MOUNTED ARMORED VLS MISSILE BATTERY PODS ──
    this.flakBarrels = [];

    [-1.85, 1.85].forEach((mx, podIdx) => {
      const podGroup = new THREE.Group();
      podGroup.position.set(mx, 0.45, -0.8);

      // Armored Pod Housing
      const podGeo = new THREE.BoxGeometry(1.2, 0.85, 2.8);
      const podMesh = new THREE.Mesh(podGeo, armorTrussMat);
      podGroup.add(podMesh);

      // 6-Cell Hexagonal VLS Launch Tubes per pod
      const tubeGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.4, 8);
      tubeGeo.rotateX(Math.PI / 2);
      const tubeMat = new THREE.MeshStandardMaterial({ color: 0x080406, metalness: 0.98, roughness: 0.1 });

      const cellOffsets = [
        [-0.32, 0.2], [0, 0.2], [0.32, 0.2],
        [-0.32, -0.2], [0, -0.2], [0.32, -0.2]
      ];

      cellOffsets.forEach(([cx, cy], cellIdx) => {
        const tube = new THREE.Mesh(tubeGeo, tubeMat);
        tube.position.set(cx, cy, -0.8);
        podGroup.add(tube);

        // Visible Ready Missile Warhead inside cell
        const mHead = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.35, 8), glowAmberMat);
        mHead.rotateX(-Math.PI / 2);
        mHead.position.set(cx, cy, -1.35);
        podGroup.add(mHead);
      });

      // Blast Shield Baffle
      const baffleGeo = new THREE.BoxGeometry(1.3, 0.15, 0.6);
      const baffle = new THREE.Mesh(baffleGeo, darkAlloyMat);
      baffle.position.set(0, 0.5, -1.2);
      podGroup.add(baffle);

      // Articulated Recoil Piston Cylinder
      const pistonGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.6, 8);
      pistonGeo.rotateX(Math.PI / 2);
      const piston = new THREE.Mesh(pistonGeo, darkAlloyMat);
      piston.position.set(0, -0.35, -0.6);
      podGroup.add(piston);
      this.flakBarrels.push(piston);

      this.meshGroup.add(podGroup);
    });

    // Dual Forward Lower Heavy Torpedo Launcher Tubes
    [-0.75, 0.75].forEach(tx => {
      const tGeo = new THREE.CylinderGeometry(0.2, 0.22, 2.2, 8);
      tGeo.rotateX(Math.PI / 2);
      const tMesh = new THREE.Mesh(tGeo, darkAlloyMat);
      tMesh.position.set(tx, -0.3, -2.4);
      this.meshGroup.add(tMesh);
    });

    // ── 4. Heavy Armored Sloped Wings with Wingtip Bulkheads ──
    const armGeo = new THREE.BoxGeometry(2.4, 0.35, 3.6);
    const armMat = new THREE.MeshStandardMaterial({ map: pbr.map, color: 0x160c10, metalness: 0.92, roughness: 0.3 });

    const armR = new THREE.Mesh(armGeo, armMat);
    armR.position.set(2.4, -0.05, 0.4);
    armR.rotation.z = -0.12;
    this.meshGroup.add(armR);

    const armL = new THREE.Mesh(armGeo, armMat);
    armL.position.set(-2.4, -0.05, 0.4);
    armL.rotation.z = 0.12;
    this.meshGroup.add(armL);

    // Wingtip Armor Bulkheads & Flashing Navigation Strobe Lights
    [-3.7, 3.7].forEach(wx => {
      const bhGeo = new THREE.BoxGeometry(0.18, 0.8, 2.4);
      const bh = new THREE.Mesh(bhGeo, armorTrussMat);
      bh.position.set(wx, 0.15, 0.4);
      this.meshGroup.add(bh);

      const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff0044, transparent: true, opacity: 0.9 });
      const beacon = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.65, 0.12), beaconMat);
      beacon.position.set(wx + (wx < 0 ? -0.05 : 0.05), 0.15, 1.4);
      this.meshGroup.add(beacon);
      this.wingtipBeacons.push(beacon);

      const tipLight = new THREE.PointLight(0xff0044, 2.8, 8);
      tipLight.position.set(wx, 0.15, 1.4);
      this.meshGroup.add(tipLight);
      this.wingtipLights.push(tipLight);
    });

    // ── 5. Armored Command Citadel & Radiator Cooling Flaps ──
    const citadelGeo = new THREE.BoxGeometry(1.2, 0.65, 1.8);
    const citadel = new THREE.Mesh(citadelGeo, armorTrussMat);
    citadel.position.set(0, 0.95, -0.6);
    this.meshGroup.add(citadel);

    // Ruby Blast Viewport
    const visorGeo = new THREE.BoxGeometry(0.9, 0.15, 0.1);
    const visor = new THREE.Mesh(visorGeo, crimsonEdgeMat);
    visor.position.set(0, 1.05, -1.52);
    this.meshGroup.add(visor);

    this.buildCockpitInterior(this.meshGroup, 0xff0044);

    // Radiator Cooling Flaps
    [-1.45, 1.45].forEach(x => {
      const flapGeo = new THREE.BoxGeometry(0.1, 0.45, 2.2);
      const flapMat = new THREE.MeshStandardMaterial({ color: 0xff3300, emissive: 0xff2200, emissiveIntensity: 0.35 });
      const flap = new THREE.Mesh(flapGeo, flapMat);
      flap.position.set(x, 0.6, 0.4);
      this.meshGroup.add(flap);
      this.coolingFlaps.push(flap);
    });

    // ── 6. 🚀 Heavy Missile Muzzle Offsets (Shoulder Pods + Torpedo Tubes) ──
    this.muzzleOffsets = [
      new THREE.Vector3(-1.2, 0.4, -2.3),
      new THREE.Vector3(1.2, 0.4, -2.3),
      new THREE.Vector3(-0.5, -0.2, -3.4),
      new THREE.Vector3(0.5, -0.2, -3.4)
    ];

    // ── 7. 🔥 QUAD HEAVY PROPULSION THRUSTERS (Firing Straight Backwards +Z) ──
    const thrusterGeo = new THREE.CylinderGeometry(0.3, 0.42, 1.2, 10);
    thrusterGeo.rotateX(Math.PI / 2);
    const thrusterMat = new THREE.MeshStandardMaterial({ color: 0x080406, metalness: 0.95, roughness: 0.2 });

    const flameGeo = new THREE.ConeGeometry(0.24, 1.6, 8);
    flameGeo.rotateX(Math.PI / 2); // Base at nozzle, apex pointing backward (+Z)
    const flameMat = new THREE.MeshStandardMaterial({ color: 0xff0044, emissive: 0xff0044, emissiveIntensity: 3.5, transparent: true, opacity: 0.9, roughness: 0.0, metalness: 0.0, toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false });

    const thrusterPositions = [
      [-0.8, 0.38, 2.5],
      [0.8, 0.38, 2.5],
      [-0.8, -0.38, 2.5],
      [0.8, -0.38, 2.5]
    ];

    thrusterPositions.forEach(([x, y, z]) => {
      const eng = new THREE.Mesh(thrusterGeo, thrusterMat);
      eng.position.set(x, y, z);
      this.meshGroup.add(eng);

      // Rocket flame firing straight backward (+Z)
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.set(x, y, z + 1.2);
      this.meshGroup.add(flame);
      this.flameMeshes.push(flame);

      // Mach shock diamond
      const dia = new THREE.Mesh(new THREE.RingGeometry(0.04, 0.18, 10), new THREE.MeshBasicMaterial({ color: 0xffea00, side: THREE.DoubleSide }));
      dia.position.set(x, y, z + 0.6);
      this.meshGroup.add(dia);
      this.shockDiamonds.push(dia);
    });

    this.wingtipOffsets = [new THREE.Vector3(-3.7, 0, 0.4), new THREE.Vector3(3.7, 0, 0.4)];
    this.engineTrailOffsets = [
      new THREE.Vector3(-0.8, 0.38, 3.2),
      new THREE.Vector3(0.8, 0.38, 3.2),
      new THREE.Vector3(-0.8, -0.38, 3.2),
      new THREE.Vector3(0.8, -0.38, 3.2)
    ];

    this.rcsPorts = [
      { pos: new THREE.Vector3(0, 0.8, -3.0), dirY: 1, dirX: 0 },
      { pos: new THREE.Vector3(0, -0.8, -3.0), dirY: -1, dirX: 0 },
      { pos: new THREE.Vector3(-3.2, 0, 0.4), dirY: 0, dirX: -1 },
      { pos: new THREE.Vector3(3.2, 0, 0.4), dirY: 0, dirX: 1 }
    ];

    this.engineLight = new THREE.PointLight(0xff0044, 2.2, 12);
    this.engineLight.position.set(0, 0, 2.8);
    this.meshGroup.add(this.engineLight);
  }

  // ────────────────────────────────────────────────────────────
  // 3. 🌀 TACTICIAN: "Chronos Command" (Dual Quantum Arc Cannons & Gyroscopic Gimbal Rings)
  // ────────────────────────────────────────────────────────────
  buildTacticianMesh() {
    this.maxShield = 110;
    this.shield = 110;
    this.speed = 28;
    this.laserFireDelay = 0.12;
    this.dodgeMaxCooldown = 1.6;
    this.maxSwarmCD = 4.5;

    const pbr = getPBRMaterialSet('TACTICIAN');

    // ── High-Tech Materials ──
    const hullMat = new THREE.MeshStandardMaterial({
      map: pbr.map,
      bumpMap: pbr.bumpMap,
      bumpScale: pbr.bumpScale,
      roughnessMap: pbr.roughnessMap,
      emissiveMap: pbr.emissiveMap,
      color: 0x0c281e,
      metalness: pbr.metalness,
      roughness: pbr.roughness,
      emissive: pbr.emissive,
      emissiveIntensity: pbr.emissiveIntensity
    });

    const armorTrussMat = new THREE.MeshStandardMaterial({
      color: 0x143324,
      metalness: 0.96,
      roughness: 0.18
    });

    const darkAlloyMat = new THREE.MeshStandardMaterial({
      color: 0x06120c,
      metalness: 0.98,
      roughness: 0.15
    });

    const emeraldGlowMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
    const cyanGlowMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });

    // ── 1. Chiseled Forward Command Fuselage ──
    const bodyGeo = new THREE.BoxGeometry(1.6, 0.9, 4.8);
    const body = new THREE.Mesh(bodyGeo, hullMat);
    body.position.set(0, 0, -0.1);
    this.meshGroup.add(body);

    // Forward Sensor Nose Cone
    const noseGeo = new THREE.ConeGeometry(0.85, 1.8, 6);
    noseGeo.rotateX(-Math.PI / 2); // Points forward along -Z!
    const nose = new THREE.Mesh(noseGeo, armorTrussMat);
    nose.position.set(0, -0.05, -3.2);
    this.meshGroup.add(nose);

    this.buildCockpitInterior(this.meshGroup, 0x00ff88);

    // ── 2. ✨ Forward-Swept Gull Wings (Mirrored Math) ──
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0.8, -0.6);
    wingShape.lineTo(2.8, -1.8);
    wingShape.lineTo(3.1, -1.2);
    wingShape.lineTo(1.6, 1.2);
    wingShape.lineTo(0.8, 1.0);
    wingShape.closePath();

    const wingExtrudeSettings = { depth: 0.12, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.03, bevelThickness: 0.03 };
    const baseWingGeo = new THREE.ExtrudeGeometry(wingShape, wingExtrudeSettings);
    baseWingGeo.rotateX(Math.PI / 2);

    const rightWing = new THREE.Mesh(baseWingGeo, hullMat);
    rightWing.position.set(0, 0, 0);
    this.meshGroup.add(rightWing);

    const leftWingGeo = baseWingGeo.clone();
    leftWingGeo.scale(-1, 1, 1);
    const leftWing = new THREE.Mesh(leftWingGeo, hullMat);
    leftWing.position.set(0, 0, 0);
    this.meshGroup.add(leftWing);

    // Wing Leading Edge Titanium Slats
    [-1, 1].forEach(side => {
      const slatGeo = new THREE.BoxGeometry(0.08, 0.08, 2.4);
      const slat = new THREE.Mesh(slatGeo, cyanGlowMat);
      slat.position.set(side * 1.9, 0.06, -1.1);
      slat.rotation.y = side * 0.42;
      this.meshGroup.add(slat);
    });

    // ── 3. ⚡ Dual Heavy Quantum Arc Induction Cannons ──
    [-2.2, 2.2].forEach(cx => {
      const cannonGroup = new THREE.Group();
      cannonGroup.position.set(cx, -0.15, -0.8);

      // Heavy Pylon Housing
      const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 2.2), darkAlloyMat);
      cannonGroup.add(pylon);

      // Primary Induction Barrel
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 2.6, 8), darkAlloyMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, -0.1, -0.8);
      cannonGroup.add(barrel);

      // 3 Concentric Electromagnetic Accelerator Coils
      [-0.4, 0, 0.4].forEach(cz => {
        const coil = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.03, 6, 16), emeraldGlowMat);
        coil.position.set(0, -0.1, cz - 0.8);
        cannonGroup.add(coil);
      });

      // Arc Pulse Focus Emitter Lens
      const focusLens = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), cyanGlowMat);
      focusLens.position.set(0, -0.1, -2.15);
      cannonGroup.add(focusLens);

      this.meshGroup.add(cannonGroup);
    });

    // Twin Ventral Tachyon Micro-Torpedo Tubes
    [-0.5, 0.5].forEach(tx => {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.16, 1.8, 8), darkAlloyMat);
      tube.rotation.x = Math.PI / 2;
      tube.position.set(tx, -0.3, -2.2);
      this.meshGroup.add(tube);
    });

    // ── 4. 🌀 Concentric Gyroscopic Chrono Gimbal Rings ──
    const gimbalCenter = new THREE.Group();
    gimbalCenter.position.set(0, 0.42, 0.4);

    // Outer Emerald Gimbal Ring
    this.tacticianGimbalOuter = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.07, 8, 32), emeraldGlowMat);
    gimbalCenter.add(this.tacticianGimbalOuter);

    // Inner Cyan Gimbal Ring
    this.tacticianGimbalInner = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.055, 8, 28), cyanGlowMat);
    this.tacticianGimbalOuter.add(this.tacticianGimbalInner);

    // Tachyon Sensory Core Sphere
    const coreOrb = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 0.9 })
    );
    this.tacticianGimbalInner.add(coreOrb);

    this.meshGroup.add(gimbalCenter);

    // ── 5. 💡 Wingtip Electronic Warfare Pods & Flashing Strobe Lights ──
    [-3.1, 3.1].forEach((wx, i) => {
      const podGeo = new THREE.BoxGeometry(0.2, 0.35, 1.6);
      const pod = new THREE.Mesh(podGeo, armorTrussMat);
      pod.position.set(wx, 0.1, -1.4);
      this.meshGroup.add(pod);

      const beaconMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.9 });
      const beacon = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 0.08), beaconMat);
      beacon.position.set(wx, 0.25, -1.2);
      this.meshGroup.add(beacon);
      this.wingtipBeacons.push(beacon);

      const tipLight = new THREE.PointLight(0x00ff88, 2.6, 8);
      tipLight.position.set(wx, 0.25, -1.2);
      this.meshGroup.add(tipLight);
      this.wingtipLights.push(tipLight);
    });

    // ── 6. 🚀 Weapon Muzzle Offsets (Quantum Cannons + Torpedo Tubes) ──
    this.muzzleOffsets = [
      new THREE.Vector3(-1.3, -0.2, -3.0),
      new THREE.Vector3(1.3, -0.2, -3.0),
      new THREE.Vector3(-0.45, -0.2, -3.2),
      new THREE.Vector3(0.45, -0.2, -3.2)
    ];

    // ── 7. 🔥 TWIN VECTOR PROPULSION THRUSTERS (Straight +Z) ──
    const thrusterGeo = new THREE.CylinderGeometry(0.28, 0.38, 1.2, 10);
    thrusterGeo.rotateX(Math.PI / 2);
    const thrusterMat = new THREE.MeshStandardMaterial({ color: 0x06120c, metalness: 0.95, roughness: 0.2 });

    const flameGeo = new THREE.ConeGeometry(0.22, 1.6, 8);
    flameGeo.rotateX(Math.PI / 2); // Apex points backward +Z
    const flameMat = new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 3.5, transparent: true, opacity: 0.9, roughness: 0.0, metalness: 0.0, toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false });

    [-0.7, 0.7].forEach(x => {
      const eng = new THREE.Mesh(thrusterGeo, thrusterMat);
      eng.position.set(x, -0.05, 2.3);
      this.meshGroup.add(eng);

      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.set(x, -0.05, 3.4);
      this.meshGroup.add(flame);
      this.flameMeshes.push(flame);

      const dia = new THREE.Mesh(new THREE.RingGeometry(0.04, 0.16, 10), new THREE.MeshBasicMaterial({ color: 0x00f3ff, side: THREE.DoubleSide }));
      dia.position.set(x, -0.05, 2.9);
      this.meshGroup.add(dia);
      this.shockDiamonds.push(dia);
    });

    this.wingtipOffsets = [new THREE.Vector3(-3.1, 0, -1.4), new THREE.Vector3(3.1, 0, -1.4)];
    this.engineTrailOffsets = [new THREE.Vector3(-0.7, -0.05, 3.0), new THREE.Vector3(0.7, -0.05, 3.0)];

    this.rcsPorts = [
      { pos: new THREE.Vector3(0, 0.4, -2.8), dirY: 1, dirX: 0 },
      { pos: new THREE.Vector3(0, -0.4, -2.8), dirY: -1, dirX: 0 },
      { pos: new THREE.Vector3(-3.0, 0, -1.4), dirY: 0, dirX: -1 },
      { pos: new THREE.Vector3(3.0, 0, -1.4), dirY: 0, dirX: 1 }
    ];

    this.engineLight = new THREE.PointLight(0x00ff88, 2.2, 10);
    this.engineLight.position.set(0, 0, 2.6);
    this.meshGroup.add(this.engineLight);
  }

  // ────────────────────────────────────────────────────────────
  // 4. 💀 REAPER: "Void Phantom" (Variable-Geometry Dagger Wings & Quad Tachyon Needles)
  // ────────────────────────────────────────────────────────────
  buildReaperMesh() {
    this.maxShield = 85;
    this.shield = 85;
    this.speed = 32;
    this.laserFireDelay = 0.09;
    this.dodgeMaxCooldown = 1.4;
    this.maxSwarmCD = 4.0;

    const pbr = getPBRMaterialSet('REAPER');

    // ── High-Tech Stealth Materials ──
    this.reaperBodyMat = new THREE.MeshStandardMaterial({
      map: pbr.map,
      bumpMap: pbr.bumpMap,
      bumpScale: pbr.bumpScale,
      roughnessMap: pbr.roughnessMap,
      emissiveMap: pbr.emissiveMap,
      color: 0x1e0b2e,
      metalness: pbr.metalness,
      roughness: pbr.roughness,
      emissive: pbr.emissive,
      emissiveIntensity: pbr.emissiveIntensity,
      transparent: true,
      opacity: 1.0
    });

    const armorTrussMat = new THREE.MeshStandardMaterial({
      color: 0x241038,
      metalness: 0.96,
      roughness: 0.18
    });

    const darkAlloyMat = new THREE.MeshStandardMaterial({
      color: 0x08030e,
      metalness: 0.98,
      roughness: 0.12
    });

    const violetGlowMat = new THREE.MeshBasicMaterial({ color: 0xcc00ff });
    const cyanGlowMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });

    // ── 1. Stealth Diamond Faceted Fuselage ──
    const bodyGeo = new THREE.ConeGeometry(1.2, 5.2, 4);
    bodyGeo.rotateX(-Math.PI / 2); // Apex points forward along -Z!
    bodyGeo.rotateZ(Math.PI / 4);  // Diamond facet profile
    const body = new THREE.Mesh(bodyGeo, this.reaperBodyMat);
    body.position.set(0, 0, -0.4);
    this.meshGroup.add(body);

    // Dorsal Stealth Spine Slat
    const spineGeo = new THREE.BoxGeometry(0.3, 0.25, 3.6);
    const spine = new THREE.Mesh(spineGeo, armorTrussMat);
    spine.position.set(0, 0.45, -0.2);
    this.meshGroup.add(spine);

    this.buildCockpitInterior(this.meshGroup, 0xaa00ff);

    // ── 2. ✨ Variable-Geometry Dagger Swing-Wings (Pivot Rigging) ──
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, -0.4);
    wingShape.lineTo(2.4, 0.8);
    wingShape.lineTo(2.2, 1.4);
    wingShape.lineTo(0, 0.6);
    wingShape.closePath();

    const wingExtrudeSettings = { depth: 0.08, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.02, bevelThickness: 0.02 };
    const baseWingGeo = new THREE.ExtrudeGeometry(wingShape, wingExtrudeSettings);
    baseWingGeo.rotateX(Math.PI / 2);

    // Right Dagger Wing Pivot
    this.reaperWingR = new THREE.Group();
    this.reaperWingR.position.set(0.9, 0.02, 0.2);
    const rWingMesh = new THREE.Mesh(baseWingGeo, this.reaperBodyMat);
    this.reaperWingR.add(rWingMesh);
    this.meshGroup.add(this.reaperWingR);

    // Left Dagger Wing Pivot (Mirrored Math)
    this.reaperWingL = new THREE.Group();
    this.reaperWingL.position.set(-0.9, 0.02, 0.2);
    const leftWingGeo = baseWingGeo.clone();
    leftWingGeo.scale(-1, 1, 1);
    const lWingMesh = new THREE.Mesh(leftWingGeo, this.reaperBodyMat);
    this.reaperWingL.add(lWingMesh);
    this.meshGroup.add(this.reaperWingL);
    // Glowing Ultraviolet Plasma Blade Leading Edges
    [-1, 1].forEach(side => {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 2.6), violetGlowMat);
      blade.position.set(side * 2.0, 0.06, 0.6);
      blade.rotation.y = side * 0.45;
      this.meshGroup.add(blade);
    });

    // ── 3. 🔪 Twin Canted Dagger V-Tails ──
    const vTailGeo = new THREE.BoxGeometry(0.08, 1.4, 1.6);
    [-0.7, 0.7].forEach(tx => {
      const vTail = new THREE.Mesh(vTailGeo, armorTrussMat);
      vTail.position.set(tx, 0.65, 1.2);
      vTail.rotation.z = tx < 0 ? 0.45 : -0.45;
      this.meshGroup.add(vTail);

      const vEdge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.2, 0.06), violetGlowMat);
      vEdge.position.set(tx + (tx < 0 ? -0.35 : 0.35), 0.8, 1.8);
      this.meshGroup.add(vEdge);
    });

    // ── 4. ⚡ Quad Precision Tachyon Needle Cannons ──
    // 2 Wingtip Needle Emitters
    [-2.4, 2.4].forEach(wx => {
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.8, 6), darkAlloyMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(wx, -0.05, 0.2);
      this.meshGroup.add(barrel);

      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), violetGlowMat);
      tip.position.set(wx, -0.05, -1.2);
      this.meshGroup.add(tip);
    });

    // 2 Fuselage High-Velocity Chin Needle Barrels
    [-0.55, 0.55].forEach(cx => {
      const chinBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.6, 6), darkAlloyMat);
      chinBarrel.rotation.x = Math.PI / 2;
      chinBarrel.position.set(cx, -0.2, -2.0);
      this.meshGroup.add(chinBarrel);

      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), cyanGlowMat);
      tip.position.set(cx, -0.2, -3.3);
      this.meshGroup.add(tip);
    });

    this.muzzleOffsets = [
      new THREE.Vector3(-1.2, -0.05, -1.3),
      new THREE.Vector3(1.2, -0.05, -1.3),
      new THREE.Vector3(-0.4, -0.2, -3.4),
      new THREE.Vector3(0.4, -0.2, -3.4)
    ];

    // ── 5. 💡 Wingtip Optical Camo Pods & Flashing Strobe Lights ──
    [-3.2, 3.2].forEach(wx => {
      const podGeo = new THREE.BoxGeometry(0.18, 0.25, 1.4);
      const pod = new THREE.Mesh(podGeo, armorTrussMat);
      pod.position.set(wx, 0.1, 0.6);
      this.meshGroup.add(pod);

      const beaconMat = new THREE.MeshBasicMaterial({ color: 0xcc00ff, transparent: true, opacity: 0.9 });
      const beacon = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 0.08), beaconMat);
      beacon.position.set(wx, 0.2, 0.8);
      this.meshGroup.add(beacon);
      this.wingtipBeacons.push(beacon);

      const tipLight = new THREE.PointLight(0xcc00ff, 2.6, 8);
      tipLight.position.set(wx, 0.2, 0.8);
      this.meshGroup.add(tipLight);
      this.wingtipLights.push(tipLight);
    });

    // ── 6. 🔥 TWIN STEALTH VECTOR PULSE THRUSTERS (Straight +Z) ──
    const thrusterGeo = new THREE.CylinderGeometry(0.24, 0.32, 1.2, 8);
    thrusterGeo.rotateX(Math.PI / 2);
    const thrusterMat = new THREE.MeshStandardMaterial({ color: 0x08030e, metalness: 0.95, roughness: 0.2 });

    const flameGeo = new THREE.ConeGeometry(0.2, 1.8, 8);
    flameGeo.rotateX(Math.PI / 2); // Apex points backward +Z
    const flameMat = new THREE.MeshStandardMaterial({ color: 0xaa00ff, emissive: 0xaa00ff, emissiveIntensity: 3.5, transparent: true, opacity: 0.9, roughness: 0.0, metalness: 0.0, toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false });

    [-0.65, 0.65].forEach(x => {
      const eng = new THREE.Mesh(thrusterGeo, thrusterMat);
      eng.position.set(x, -0.05, 2.3);
      this.meshGroup.add(eng);

      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.set(x, -0.05, 3.4);
      this.meshGroup.add(flame);
      this.flameMeshes.push(flame);

      const dia = new THREE.Mesh(new THREE.RingGeometry(0.04, 0.16, 8), new THREE.MeshBasicMaterial({ color: 0x00f3ff, side: THREE.DoubleSide }));
      dia.position.set(x, -0.05, 2.9);
      this.meshGroup.add(dia);
      this.shockDiamonds.push(dia);
    });

    this.wingtipOffsets = [new THREE.Vector3(-3.2, 0, 0.6), new THREE.Vector3(3.2, 0, 0.6)];
    this.engineTrailOffsets = [new THREE.Vector3(-0.65, -0.05, 3.0), new THREE.Vector3(0.65, -0.05, 3.0)];

    this.rcsPorts = [
      { pos: new THREE.Vector3(0, 0.4, -2.6), dirY: 1, dirX: 0 },
      { pos: new THREE.Vector3(0, -0.4, -2.6), dirY: -1, dirX: 0 },
      { pos: new THREE.Vector3(-2.8, 0, 0.6), dirY: 0, dirX: -1 },
      { pos: new THREE.Vector3(2.8, 0, 0.6), dirY: 0, dirX: 1 }
    ];

    this.engineLight = new THREE.PointLight(0xaa00ff, 2.2, 10);
    this.engineLight.position.set(0, 0, 2.6);
    this.meshGroup.add(this.engineLight);
  }

  // ────────────────────────────────────────────────────────────
  // 5. 🛡️ SENTINEL: "Aegis Warden" (Dual Tuning Emitters & Autonomous Escort Drone)
  // ────────────────────────────────────────────────────────────
  // ────────────────────────────────────────────────────────────
  // 5. 🛡️ SENTINEL: "Aegis Bastion" (Dual Hardlight Tuning Emitters & Autonomous Escort Drone)
  // ────────────────────────────────────────────────────────────
  buildSentinelMesh() {
    this.maxShield = 130;
    this.shield = 130;
    this.speed = 30;
    this.laserFireDelay = 0.08;
    this.dodgeMaxCooldown = 1.4;
    this.maxSwarmCD = 3.5;

    const pbr = getPBRMaterialSet('SENTINEL');

    // ── High-Tech Materials ──
    const hullMat = new THREE.MeshStandardMaterial({
      map: pbr.map,
      bumpMap: pbr.bumpMap,
      bumpScale: pbr.bumpScale,
      roughnessMap: pbr.roughnessMap,
      emissiveMap: pbr.emissiveMap,
      color: 0x2c2612,
      metalness: pbr.metalness,
      roughness: pbr.roughness,
      emissive: pbr.emissive,
      emissiveIntensity: pbr.emissiveIntensity
    });

    const armorTrussMat = new THREE.MeshStandardMaterial({
      color: 0x142c44,
      metalness: 0.96,
      roughness: 0.15
    });

    const darkAlloyMat = new THREE.MeshStandardMaterial({
      color: 0x06101c,
      metalness: 0.98,
      roughness: 0.12
    });

    const cyanGlowMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    const hardlightMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0.85 });

    // ── 1. Heavy Bastion Armored Chassis ──
    const bodyGeo = new THREE.BoxGeometry(1.8, 1.1, 5.0);
    const body = new THREE.Mesh(bodyGeo, hullMat);
    body.position.set(0, 0, -0.2);
    this.meshGroup.add(body);

    // Armored Dorsal Spine Slat
    const spineGeo = new THREE.BoxGeometry(0.6, 0.35, 4.2);
    const spine = new THREE.Mesh(spineGeo, armorTrussMat);
    spine.position.set(0, 0.65, -0.1);
    this.meshGroup.add(spine);

    this.buildCockpitInterior(this.meshGroup, 0x00e5ff);

    // ── 2. ⚡ Dual Forward Hardlight Tuning Fork Emitter Prongs ──
    [-1.0, 1.0].forEach(px => {
      const prongGeo = new THREE.BoxGeometry(0.25, 0.28, 3.4);
      const prong = new THREE.Mesh(prongGeo, darkAlloyMat);
      prong.position.set(px, 0, -2.6);
      this.meshGroup.add(prong);

      // 3 Concentric Resonance Accelerator Rings per prong
      [-0.6, 0, 0.6].forEach(rz => {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 6, 16), hardlightMat);
        ring.position.set(px, 0, rz - 2.6);
        this.meshGroup.add(ring);
      });

      // Pulse Focus Emitter Lens Tip
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), cyanGlowMat);
      tip.position.set(px, 0, -4.3);
      this.meshGroup.add(tip);
    });

    // ── 3. ✨ Heavy Reinforced Swept Wings (Mirrored Math) ──
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0.9, -0.8);
    wingShape.lineTo(3.2, 0.4);
    wingShape.lineTo(3.0, 1.4);
    wingShape.lineTo(0.9, 1.2);
    wingShape.closePath();

    const wingExtrudeSettings = { depth: 0.12, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.03, bevelThickness: 0.03 };
    const baseWingGeo = new THREE.ExtrudeGeometry(wingShape, wingExtrudeSettings);
    baseWingGeo.rotateX(Math.PI / 2);

    const rightWing = new THREE.Mesh(baseWingGeo, hullMat);
    rightWing.position.set(0, 0, 0);
    this.meshGroup.add(rightWing);

    const leftWingGeo = baseWingGeo.clone();
    leftWingGeo.scale(-1, 1, 1);
    const leftWing = new THREE.Mesh(leftWingGeo, hullMat);
    leftWing.position.set(0, 0, 0);
    this.meshGroup.add(leftWing);

    // Wing Leading Edge Titanium Slats
    [-1, 1].forEach(side => {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 2.6), cyanGlowMat);
      slat.position.set(side * 2.1, 0.08, 0.3);
      slat.rotation.y = -side * 0.48;
      this.meshGroup.add(slat);
    });

    // ── 4. 🛸 Autonomous Orbiting Hardlight Escort Defense Drone ──
    this.sentinelDrone = new THREE.Group();
    const droneBody = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.2, 4), armorTrussMat);
    droneBody.rotateX(-Math.PI / 2);
    this.sentinelDrone.add(droneBody);

    const droneHalo = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.04, 6, 20), hardlightMat);
    this.sentinelDrone.add(droneHalo);

    const droneBlaster = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 6), darkAlloyMat);
    droneBlaster.rotateX(Math.PI / 2);
    droneBlaster.position.set(0, -0.1, -0.6);
    this.sentinelDrone.add(droneBlaster);

    this.meshGroup.add(this.sentinelDrone);

    // ── 5. 💡 Wingtip Barrier Projectors & Flashing Strobe Lights ──
    [-3.2, 3.2].forEach(wx => {
      const nodeGeo = new THREE.BoxGeometry(0.2, 0.32, 1.4);
      const node = new THREE.Mesh(nodeGeo, armorTrussMat);
      node.position.set(wx, 0.1, 0.6);
      this.meshGroup.add(node);

      const beaconMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.9 });
      const beacon = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 0.08), beaconMat);
      beacon.position.set(wx, 0.22, 0.8);
      this.meshGroup.add(beacon);
      this.wingtipBeacons.push(beacon);

      const tipLight = new THREE.PointLight(0x00e5ff, 2.6, 8);
      tipLight.position.set(wx, 0.22, 0.8);
      this.meshGroup.add(tipLight);
      this.wingtipLights.push(tipLight);
    });

    // ── 6. 🚀 Weapon Muzzle Offsets (Tuning Prongs + Wingtip Hardpoints) ──
    this.muzzleOffsets = [
      new THREE.Vector3(-0.75, 0, -4.3),
      new THREE.Vector3(0.75, 0, -4.3),
      new THREE.Vector3(-1.35, -0.1, -1.6),
      new THREE.Vector3(1.35, -0.1, -1.6)
    ];

    // ── 7. 🔥 TWIN HEAVY ION PULSE THRUSTERS (Straight +Z) ──
    const thrusterGeo = new THREE.CylinderGeometry(0.26, 0.36, 1.2, 10);
    thrusterGeo.rotateX(Math.PI / 2);
    const thrusterMat = new THREE.MeshStandardMaterial({ color: 0x06101c, metalness: 0.95, roughness: 0.2 });

    const flameGeo = new THREE.ConeGeometry(0.22, 1.6, 8);
    flameGeo.rotateX(Math.PI / 2); // Apex points backward +Z
    const flameMat = new THREE.MeshStandardMaterial({ color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 3.5, transparent: true, opacity: 0.9, roughness: 0.0, metalness: 0.0, toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false });

    [-0.7, 0.7].forEach(x => {
      const eng = new THREE.Mesh(thrusterGeo, thrusterMat);
      eng.position.set(x, -0.05, 2.3);
      this.meshGroup.add(eng);

      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.set(x, -0.05, 3.4);
      this.meshGroup.add(flame);
      this.flameMeshes.push(flame);

      const dia = new THREE.Mesh(new THREE.RingGeometry(0.04, 0.16, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
      dia.position.set(x, -0.05, 2.9);
      this.meshGroup.add(dia);
      this.shockDiamonds.push(dia);
    });

    this.wingtipOffsets = [new THREE.Vector3(-3.2, 0, 0.6), new THREE.Vector3(3.2, 0, 0.6)];
    this.engineTrailOffsets = [new THREE.Vector3(-0.7, -0.05, 3.0), new THREE.Vector3(0.7, -0.05, 3.0)];

    this.rcsPorts = [
      { pos: new THREE.Vector3(0, 0.4, -2.8), dirY: 1, dirX: 0 },
      { pos: new THREE.Vector3(0, -0.4, -2.8), dirY: -1, dirX: 0 },
      { pos: new THREE.Vector3(-3.0, 0, 0.6), dirY: 0, dirX: -1 },
      { pos: new THREE.Vector3(3.0, 0, 0.6), dirY: 0, dirX: 1 }
    ];

    this.engineLight = new THREE.PointLight(0x00e5ff, 2.2, 10);
    this.engineLight.position.set(0, 0, 2.6);
    this.meshGroup.add(this.engineLight);
  }

  triggerBarrelRecoil() {
    this.flakRecoil = 0.35;
    this.moltenHeat = Math.min(1.0, this.moltenHeat + 0.25);
  }

  takeDamage(amount) {
    if (this.dodgeTimer > 0 || this.isInvulnerable || (this.gameManager && this.gameManager.isGodMode) || (window.spaceGameManager && window.spaceGameManager.isGodMode)) {
      return false; // God Mode: Shield takes zero damage
    }

    if (this.shipClass === 'REAPER' && this.isBoosting) {
      return false; // Phasing quantum cloak
    }

    let finalAmount = amount;
    if (this.shipClass === 'DREADNOUGHT') {
      finalAmount *= 0.65;
    }
    if (this.shieldLevel && this.shieldLevel >= 2) {
      finalAmount *= Math.max(0.70, 1.0 - this.shieldLevel * 0.05); // Up to 25% progressive kinetic damage mitigation!
    }

    this.shield = Math.max(0, this.shield - finalAmount);
    this.shieldRippleTimer = 1.0; // Bring up shield display for 1.0 second
    if (this.shieldMat) this.shieldMat.opacity = 1.0;
    if (this.shieldMesh) this.shieldMesh.visible = true;

    // ── 🛡️ Level 5 Apex: Emergency Aegis Shield Reboot ──
    if (this.shield <= 0 && this.hasEmergencyAegisReboot && !this._aegisUsed) {
      this._aegisUsed = true;
      this.shield = this.maxShield * 0.55;
      this.triggerInvulnerability(2.5);
      if (this.particleManager) {
        this.particleManager.createEmpShockwave(this.meshGroup.position, 50);
      }
      window.spaceGameManager?.voiceAnnouncer?.speak("EMERGENCY AEGIS SHIELD REBOOT TRIGGERED!", true);
      if (window.spaceGameManager?.spaceHUD) {
        window.spaceGameManager.spaceHUD.showRadioTransmission("AEGIS PROTOCOL: Emergency shield rebooted at 55% power! 2.5s invulnerability active!", "SHIP COMPUTER", 4.0);
      }
      return false;
    }

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

  onKillHeal() {
    if (this.activePerks && this.activePerks.has('siphon')) {
      this.healShield(5);
    } else if (this.shipClass === 'REAPER') {
      this.healShield(3);
    }
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
    this.isInspectingSolo = false;
    this.meshGroup.scale.set(1, 1, 1);
  }

  update(dt, inputDir = { x: 0, y: 0 }) {
    this._time += dt;

    if (this.laserCooldown > 0) this.laserCooldown -= dt;
    if (this.pulseCooldown > 0) this.pulseCooldown -= dt;
    if (this.dodgeCooldown > 0) this.dodgeCooldown -= dt;
    if (this.swarmMissileCooldown > 0) this.swarmMissileCooldown -= dt;
    if (this._dodgeBoostTimer > 0) this._dodgeBoostTimer -= dt;

    // Hyper-Boost Energy Management
    const rechargeRate = this.boostRechargeRate || 20.0;
    if (this.isBoosting && this.boostEnergy > 0) {
      this.boostEnergy = Math.max(0, this.boostEnergy - dt * 40.0);
      if (this.boostEnergy <= 0) this.isBoosting = false;
    } else if (!this.isBoosting && this.boostEnergy < this.maxBoostEnergy) {
      this.boostEnergy = Math.min(this.maxBoostEnergy, this.boostEnergy + dt * rechargeRate);
    }

    // ── 🛡️ Progressive Passive Shield Auto-Regeneration ──
    if (this.shieldRegenRate && this.shieldRegenRate > 0 && this.shield < this.maxShield) {
      this.shield = Math.min(this.maxShield, this.shield + this.shieldRegenRate * dt);
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
    // Interceptor Canards, Ailerons & Twin V-Tail Rudders
    if (this.canardR && this.canardL) {
      const targetCanardPitch = inputDir.y * 0.45 + (this.isBoosting ? -0.2 : 0);
      this.canardR.rotation.x = targetCanardPitch;
      this.canardL.rotation.x = targetCanardPitch;
    }
    if (this.aileronR && this.aileronL) {
      this.aileronR.rotation.x = -inputDir.x * 0.4;
      this.aileronL.rotation.x = inputDir.x * 0.4;
    }
    if (this.rudderR && this.rudderL) {
      this.rudderR.rotation.y = inputDir.x * 0.35;
      this.rudderL.rotation.y = inputDir.x * 0.35;
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

    // Sentinel Autonomous Escort Defense Drone Orbit Dynamics
    if (this.sentinelDrone) {
      const droneAngle = this._time * 2.8;
      const droneRadius = 3.6;
      this.sentinelDrone.position.set(
        Math.cos(droneAngle) * droneRadius,
        Math.sin(this._time * 4.0) * 0.4 + 0.35,
        Math.sin(droneAngle) * (droneRadius * 0.7)
      );
      this.sentinelDrone.rotation.y = -droneAngle + Math.PI / 2;
    }

    // ── Movement & Bounds ──
    const bossActive = this.gameManager && (
      (this.gameManager.activeBoss && !this.gameManager.activeBoss.isDead) ||
      (this.gameManager.carrierBoss && !this.gameManager.carrierBoss.isDead) ||
      (this.gameManager.heavyBattleships && this.gameManager.heavyBattleships.some(b => !b.isDead))
    );
    const minX = bossActive ? -44 : this.bounds.minX;
    const maxX = bossActive ? 44 : this.bounds.maxX;
    const minY = bossActive ? -25 : this.bounds.minY;
    const maxY = bossActive ? 25 : this.bounds.maxY;

    if (this.isInspectingSolo) {
      this.meshGroup.position.set(0, 0.4, 2.5);
      this.meshGroup.rotation.y += 0.75 * dt;
      this.meshGroup.rotation.x = 0.28 + Math.sin(this._time * 1.5) * 0.06;
      this.meshGroup.rotation.z = Math.sin(this._time * 1.2) * 0.05;
    } else if (this.dodgeTimer > 0) {
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
      this.targetYaw = -inputDir.x * 0.12;
      this.currentRoll += (this.targetRoll - this.currentRoll) * 0.18;
      this.currentPitch += (this.targetPitch - this.currentPitch) * 0.18;
      this.currentYaw = (this.currentYaw || 0) + (this.targetYaw - (this.currentYaw || 0)) * 0.18;
      this.meshGroup.rotation.z = this.currentRoll;
      this.meshGroup.rotation.x = this.currentPitch;
      this.meshGroup.rotation.y = this.currentYaw;
    }

    // â”€â”€ Active RCS Micro-Thruster Bursts â”€â”€
    const dX = inputDir.x - this.prevInput.x;
    const dY = inputDir.y - this.prevInput.y;
    this.prevInput.x = inputDir.x;
    this.prevInput.y = inputDir.y;

    if (Math.abs(dX) > 0.15 || Math.abs(dY) > 0.15) {
      let rcsColor = 0x00f3ff;
      if (this.shipClass === 'DREADNOUGHT') rcsColor = 0xff3300;
      else if (this.shipClass === 'TACTICIAN') rcsColor = 0x00ff88;
      else if (this.shipClass === 'REAPER') rcsColor = 0xaa00ff;
      else if (this.shipClass === 'SENTINEL') rcsColor = 0x00e5ff;

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

    // ── Dynamic Wingtip Aviation & Combat Strobe Flashing ──
    const strobeCycle = this._time % 1.0;
    // Aviation Double-Flash Strobe Rhythm: Flash at 0.00-0.09s and 0.17-0.26s, off otherwise
    const isStrobeOn = (strobeCycle < 0.09) || (strobeCycle > 0.17 && strobeCycle < 0.26);
    const strobeIntensity = isStrobeOn ? 3.8 : 0.15;
    const strobeScale = isStrobeOn ? 1.35 : 1.0;

    this.wingtipLights.forEach(light => {
      light.intensity = strobeIntensity;
    });
    this.wingtipBeacons.forEach(b => {
      if (b.material) b.material.opacity = isStrobeOn ? 1.0 : 0.3;
      b.scale.setScalar(strobeScale);
    });

    // Wingtip Vapor Contrails
    if (Math.abs(this.currentRoll) > 0.25 || this.isBoosting || this.dodgeTimer > 0) {
      if (Math.random() < 0.65 && this.wingtipOffsets.length >= 2) {
        const leftTip = this.meshGroup.localToWorld(this.wingtipOffsets[0].clone());
        const rightTip = this.meshGroup.localToWorld(this.wingtipOffsets[1].clone());
        let tipColor = 0xe0f7ff;
        if (this.shipClass === 'DREADNOUGHT') tipColor = 0xffa0b0;
        else if (this.shipClass === 'TACTICIAN') tipColor = 0xb0ffda;
        else if (this.shipClass === 'REAPER') tipColor = 0xe8b0ff;
        else if (this.shipClass === 'SENTINEL') tipColor = 0x80f0ff;
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
      else if (this.shipClass === 'SENTINEL') pColor = this.isBoosting ? 0xffea00 : 0x00e5ff;

      this.engineTrailOffsets.forEach(offset => {
        const worldPos = this.meshGroup.localToWorld(offset.clone());
        this.particleManager.spawnEngineParticle(worldPos, pColor);
      });
    }

    // Cooldown updates for Superweapons
    if (this.nukeCooldown > 0) {
      this.nukeCooldown = Math.max(0, this.nukeCooldown - dt);
    }
  }

  setLivery(liveryTheme) {
    this.currentLivery = liveryTheme || 'DEFAULT';
    const themeKey = liveryTheme === 'DEFAULT' ? this.shipClass : liveryTheme;
    const matSet = getPBRMaterialSet(themeKey);

    this.meshGroup.traverse(child => {
      if (child.isMesh && child.material && !child.material.wireframe) {
        if (child.material.map || child.material.roughnessMap) {
          child.material.map = matSet.albedo;
          child.material.bumpMap = matSet.bump;
          child.material.roughnessMap = matSet.roughness;
          child.material.emissiveMap = matSet.emissive;
          child.material.needsUpdate = true;
        }
      }
    });
  }

  setEquipment(slot, itemKey) {
    if (slot === 'reactor') {
      this.reactorCore = itemKey;
      if (itemKey === 'OVERCLOCKED_PLASMA') {
        this.laserFireDelay = 0.045; // Rapid fire
        this.maxShield = 80;
      } else if (itemKey === 'TITANIUM_AEGIS') {
        this.maxShield = 140;
        this.laserFireDelay = 0.075;
      } else {
        this.maxShield = 90;
        this.laserFireDelay = 0.06;
      }
      this.shield = Math.min(this.shield, this.maxShield);
    } else if (slot === 'thruster') {
      this.thrusterManifold = itemKey;
      if (itemKey === 'AFTERBURNER') {
        this.speed = 46;
        this.dodgeMaxCooldown = 1.1;
      } else if (itemKey === 'VECTOR_RCS') {
        this.speed = 38;
        this.dodgeMaxCooldown = 0.75; // Fast tactical dodge recovery
      } else {
        this.speed = 36;
        this.dodgeMaxCooldown = 1.2;
      }
    } else if (slot === 'avionics') {
      this.avionicsSuite = itemKey;
    }
  }
}

