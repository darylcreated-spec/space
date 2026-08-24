import * as THREE from 'three';

// â”€â”€ Procedural PBR Hull Texture Generator â”€â”€
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

    const hullTex = getProceduralHullTexture();

    // ── High-Tech Materials ──
    const bodyMat = new THREE.MeshStandardMaterial({
      map: hullTex,
      color: 0x0c182c,
      metalness: 0.95,
      roughness: 0.14,
      emissive: 0x002244,
      emissiveIntensity: 0.35,
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

    // ── 3. Swept Delta Wings (Port & Starboard) ──
    const wingMat = new THREE.MeshStandardMaterial({ map: hullTex, color: 0x14243d, metalness: 0.92, roughness: 0.18 });

    [-1, 1].forEach(side => {
      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, 0.8);              // Wing root leading edge (forward)
      wingShape.lineTo(side * 3.4, -1.2);   // Wingtip leading edge (swept back)
      wingShape.lineTo(side * 3.2, -2.2);   // Wingtip trailing edge
      wingShape.lineTo(0.3 * side, -1.8);   // Wing root trailing edge
      wingShape.closePath();

      const wingExtrude = { depth: 0.12, bevelEnabled: true, bevelSize: 0.04 };
      const wingGeo = new THREE.ExtrudeGeometry(wingShape, wingExtrude);
      wingGeo.rotateX(-Math.PI / 2); // Rotate flat in XZ plane with top facing +Y

      const wingMesh = new THREE.Mesh(wingGeo, wingMat);
      wingMesh.position.set(0, 0.02, 0);
      this.meshGroup.add(wingMesh);

      // Vertical Wingtip Winglet
      const wingletGeo = new THREE.BoxGeometry(0.12, 0.9, 1.3);
      const winglet = new THREE.Mesh(wingletGeo, armorTrussMat);
      winglet.position.set(side * 3.3, 0.38, 1.7);
      winglet.rotation.x = -0.15;
      winglet.rotation.z = -side * 0.18;
      this.meshGroup.add(winglet);

      // Winglet Navigation Strobe Beacon
      const beacon = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.08), edgeMat);
      beacon.position.set(side * 3.35, 0.38, 2.25);
      this.meshGroup.add(beacon);

      // Neon Cyan Leading Edge Conduit
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

    // ── 7. Triple Rapid-Pulse Laser Muzzles ──
    this.muzzleOffsets = [
      new THREE.Vector3(-2.6, 0, 0.0),
      new THREE.Vector3(0, -0.15, -3.2),
      new THREE.Vector3(2.6, 0, 0.0)
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
    const flameMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending });

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
  // 2. ðŸ›¡ï¸ DREADNOUGHT: "Titan Colossus" (Recoil Physics & Radiator Vents)
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // 3. ðŸŒ€ TACTICIAN: "Chronos Spec-Ops" (Dual Gyroscopic Gimbal Rings)
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // 4. ðŸ’€ REAPER: "Void Phantom" (Variable-Geometry Wing Sweeping)
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // ────────────────────────────────────────────────────────────
  // 5. 🛡️ SENTINEL: "Aegis Warden" (Dual Tuning Emitters & Autonomous Escort Drone)
  // ────────────────────────────────────────────────────────────
  buildSentinelMesh() {
    this.maxShield = 130;
    this.shield = 130;
    this.speed = 30;
    this.laserFireDelay = 0.08;
    this.dodgeMaxCooldown = 1.4;
    this.maxSwarmCD = 3.5;

    const hullTex = getProceduralHullTexture();

    // Sleek Forward Command Chassis
    const bodyGeo = new THREE.CylinderGeometry(0.7, 0.95, 5.0, 8);
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({
      map: hullTex,
      color: 0x0f2238,
      metalness: 0.95,
      roughness: 0.18,
      emissive: 0x003b5c,
      emissiveIntensity: 0.35
    });
    this.meshGroup.add(new THREE.Mesh(bodyGeo, bodyMat));

    // Dual Forward Energy Emitter Prongs (Aegis Tuning Forks)
    [-0.9, 0.9].forEach(px => {
      const prongGeo = new THREE.BoxGeometry(0.24, 0.24, 3.2);
      const prongMat = new THREE.MeshStandardMaterial({ color: 0x14324f, metalness: 0.92, roughness: 0.15 });
      const prong = new THREE.Mesh(prongGeo, prongMat);
      prong.position.set(px, 0, -2.4);
      this.meshGroup.add(prong);

      const tipGeo = new THREE.SphereGeometry(0.18, 8, 8);
      const tipMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
      const tip = new THREE.Mesh(tipGeo, tipMat);
      tip.position.set(px, 0, -4.0);
      this.meshGroup.add(tip);
    });

    // High-Clarity Cyan Glass Canopy
    this.buildCockpitInterior(this.meshGroup, 0x00e5ff);

    // Forward Swept Wing Blades
    const wingGeo = new THREE.BoxGeometry(2.2, 0.12, 1.8);
    const wingMat = new THREE.MeshStandardMaterial({ map: hullTex, color: 0x1b3857, metalness: 0.9, roughness: 0.2 });

    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.position.set(1.8, 0, -0.4);
    rightWing.rotation.y = -0.25;
    this.meshGroup.add(rightWing);

    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.position.set(-1.8, 0, -0.4);
    leftWing.rotation.y = 0.25;
    this.meshGroup.add(leftWing);

    // Dual Twin Pulse Cannons
    this.muzzleOffsets = [
      new THREE.Vector3(-0.9, 0, -3.8),
      new THREE.Vector3(0.9, 0, -3.8),
      new THREE.Vector3(-2.6, 0, -1.2),
      new THREE.Vector3(2.6, 0, -1.2)
    ];

    // High Output Ion Thrusters
    [-0.65, 0.65].forEach(x => {
      const eng = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.34, 1.1, 8), new THREE.MeshStandardMaterial({ color: 0x061424, metalness: 0.92 }));
      eng.rotateX(Math.PI / 2);
      eng.position.set(x, -0.05, 2.3);
      this.meshGroup.add(eng);

      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.5, 8), new THREE.MeshBasicMaterial({ color: 0x00e5ff }));
      flame.rotation.x = -Math.PI / 2;
      flame.position.set(0, 0, 0.6);
      eng.add(flame);
      this.flameMeshes.push(flame);

      const dia = new THREE.Mesh(new THREE.RingGeometry(0.04, 0.16, 8), new THREE.MeshBasicMaterial({ color: 0x00ffff, side: THREE.DoubleSide }));
      dia.position.set(0, 0, 0.4);
      eng.add(dia);
      this.shockDiamonds.push(dia);
    });

    this.wingtipOffsets = [new THREE.Vector3(-2.8, 0, -1.0), new THREE.Vector3(2.8, 0, -1.0)];
    this.engineTrailOffsets = [new THREE.Vector3(-0.65, 0, 2.8), new THREE.Vector3(0.65, 0, 2.8)];

    this.rcsPorts = [
      { pos: new THREE.Vector3(0, 0.4, -2.4), dirY: 1, dirX: 0 },
      { pos: new THREE.Vector3(0, -0.4, -2.4), dirY: -1, dirX: 0 },
      { pos: new THREE.Vector3(-2.6, 0, -1.0), dirY: 0, dirX: -1 },
      { pos: new THREE.Vector3(2.6, 0, -1.0), dirY: 0, dirX: 1 }
    ];

    this.engineLight = new THREE.PointLight(0x00e5ff, 2.0, 9);
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
  }
}
