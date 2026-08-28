import * as THREE from 'three';

/**
 * Procedural Obsidian-Crimson Titanium Composite Texture for AAA Battle Monster Armor
 */
function generateReddishDreadnoughtTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Dark obsidian-crimson alloy base
  ctx.fillStyle = '#1c0a10';
  ctx.fillRect(0, 0, 512, 512);

  // Carbon-fiber hexagonal nano-mesh in deep scarlet
  ctx.strokeStyle = '#3d0e18';
  ctx.lineWidth = 1.4;
  const hexRadius = 14;
  const h = hexRadius * Math.sqrt(3);

  for (let y = -h; y < 512 + h; y += h) {
    for (let x = -hexRadius * 3; x < 512 + hexRadius * 3; x += hexRadius * 3) {
      drawHex(ctx, x, y, hexRadius);
      drawHex(ctx, x + hexRadius * 1.5, y + h / 2, hexRadius);
    }
  }

  // Heavy reinforcement panel seams in dark metal
  ctx.strokeStyle = '#521422';
  ctx.lineWidth = 2.4;
  for (let i = 0; i < 512; i += 64) {
    ctx.beginPath();
    ctx.moveTo(0, i); ctx.lineTo(512, i);
    ctx.moveTo(i, 0); ctx.lineTo(i, 512);
    ctx.stroke();
  }

  // Glowing scarlet & magma-orange energy circuit conduits
  ctx.strokeStyle = '#ff1744';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(48, 0); ctx.lineTo(48, 180); ctx.lineTo(160, 256); ctx.lineTo(160, 512);
  ctx.moveTo(464, 0); ctx.lineTo(464, 180); ctx.lineTo(352, 256); ctx.lineTo(352, 512);
  ctx.stroke();

  ctx.strokeStyle = '#ff5500';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, 128); ctx.lineTo(128, 128); ctx.lineTo(256, 256); ctx.lineTo(512, 256);
  ctx.stroke();

  return new THREE.CanvasTexture(canvas);
}

function drawHex(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const hx = x + r * Math.cos(angle);
    const hy = y + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(hx, hy);
    else ctx.lineTo(hx, hy);
  }
  ctx.closePath();
  ctx.stroke();
}

// ============================================================
// FINAL APEX BOSS — Leviathan Command Mothership "Battle Monster"
// AAA Reddish Dreadnought Overhaul:
// - Aggressive Swept Delta Wings & Armor Wingtips (48m Wingspan)
// - Twin Canted Dorsal Stabilizer Tails & Ventral Keel Stabilizers
// - Quad Heavy Afterburner Rocket Thruster Bells (Crimson/Gold Plumes)
// - Spinal Prow Nose Mega-Laser Cannon (Fires Heavy Crimson Beams)
// - Dual Port & Starboard Flank Shield Generators
// - 4 Rotating Heavy Homing Missile Turret Pods
// - 6 Heavy Dual-Railgun CIWS Batteries
// - Dual Automated Stealth Fighter Catapult Launch Bays
// ============================================================
export class CommandMothership {
  constructor(scene, particleManager, spawnZ = -140) {
    this.scene = scene;
    this.particleManager = particleManager;

    this.meshGroup = new THREE.Group();
    this.meshGroup.position.set(0, 0, spawnZ);

    // -- Boss Telemetry & Stats --
    this.coreHp = 7500;
    this.maxCoreHp = 7500;
    this.hitRadius = 48.0;
    this.radius = 48.0;
    this.isDead = false;
    this.scoreValue = 100000;
    this.bossTitle = "LEVIATHAN CRIMSON DREADNOUGHT // BATTLE MONSTER";

    this.targetZ = -68;
    this.speed = 10.0;
    this._time = 0;
    this.phase = 1;

    // ── 1. Dual Port & Starboard Flank Shield Generators ──
    this.hasPlasmaShield = true;
    this.shieldGenerators = [
      { id: 0, name: 'PORT WING SHIELD GENERATOR',      relPos: new THREE.Vector3(-22.0, 1.2, 4.0), hp: 1600, maxHp: 1600, isDead: false, mesh: null, ringMesh: null, reticle: null },
      { id: 1, name: 'STARBOARD WING SHIELD GENERATOR', relPos: new THREE.Vector3( 22.0, 1.2, 4.0), hp: 1600, maxHp: 1600, isDead: false, mesh: null, ringMesh: null, reticle: null },
    ];

    // ── 2. 4 Heavy Rotating Homing Missile Turret Pods ──
    this.missilePods = [
      { id: 0, name: 'PORT DORSAL MISSILE POD',     relPos: new THREE.Vector3(-12.0,  6.5, -4.0), hp: 950, maxHp: 950, isDead: false, mesh: null, turretGroup: null, reticle: null },
      { id: 1, name: 'STARBOARD DORSAL MISSILE POD', relPos: new THREE.Vector3( 12.0,  6.5, -4.0), hp: 950, maxHp: 950, isDead: false, mesh: null, turretGroup: null, reticle: null },
      { id: 2, name: 'PORT VENTRAL MISSILE POD',    relPos: new THREE.Vector3(-14.0, -5.5,  8.0), hp: 950, maxHp: 950, isDead: false, mesh: null, turretGroup: null, reticle: null },
      { id: 3, name: 'STARBOARD VENTRAL MISSILE POD',relPos: new THREE.Vector3( 14.0, -5.5,  8.0), hp: 950, maxHp: 950, isDead: false, mesh: null, turretGroup: null, reticle: null },
    ];

    // ── 3. 6 Heavy Dual-Railgun Batteries ──
    this.turrets = [
      { id: 0, name: 'PORT NOSE RAILGUN',       relPos: new THREE.Vector3(-8.0,  2.8,  18.0), hp: 850, maxHp: 850, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 1, name: 'STARBOARD NOSE RAILGUN',  relPos: new THREE.Vector3( 8.0,  2.8,  18.0), hp: 850, maxHp: 850, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 2, name: 'PORT MID WING RAILGUN',   relPos: new THREE.Vector3(-20.0, 1.5,  -6.0), hp: 850, maxHp: 850, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 3, name: 'STARBOARD MID RAILGUN',   relPos: new THREE.Vector3( 20.0, 1.5,  -6.0), hp: 850, maxHp: 850, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 4, name: 'DORSAL CITADEL RAILGUN',  relPos: new THREE.Vector3(-6.0,  8.5, -18.0), hp: 900, maxHp: 900, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 5, name: 'DORSAL CITADEL STARBOARD',relPos: new THREE.Vector3( 6.0,  8.5, -18.0), hp: 900, maxHp: 900, isDead: false, mesh: null, barrelGroup: null, reticle: null },
    ];

    // ── 4. Nose Spinal Mega-Laser & Attack Timers ──
    this.noseLaserChargeTimer = 3.0;
    this.noseLaserActiveTimer = 0;
    this.railgunFireTimer = 1.0;
    this.missileFireTimer = 2.5;
    this.stealthLaunchTimer = 4.0;
    this.flankSwayTimer = 0;

    this.reticleMeshes = [];
    this.engineThrusters = [];

    this._build();
    this.scene.add(this.meshGroup);
  }

  _build() {
    const hullTex = generateReddishDreadnoughtTexture();

    // ── AAA Reddish Materials Palette ──
    const crimsonHullMat = new THREE.MeshStandardMaterial({
      color: 0x3d0e18,
      bumpMap: hullTex,
      bumpScale: 0.18,
      roughness: 0.22,
      metalness: 0.94,
      emissive: 0x1a060a,
      emissiveIntensity: 0.45
    });

    const darkAlloyMat = new THREE.MeshStandardMaterial({
      color: 0x18080c,
      roughness: 0.35,
      metalness: 0.92
    });

    const glowScarletMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });
    const glowMagmaMat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
    const glowGoldMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });

    // ── 1. Central Aerodynamic Fuselage (65m Length) ──
    const centerHullGeo = new THREE.BoxGeometry(15, 8.5, 58);
    const centerHull = new THREE.Mesh(centerHullGeo, crimsonHullMat);
    this.meshGroup.add(centerHull);

    // ── 2. Nose Prow & Spinal Mega-Laser Aperture ──
    const prowGeo = new THREE.ConeGeometry(9.5, 26, 4);
    prowGeo.rotateX(-Math.PI / 2);
    prowGeo.rotateZ(Math.PI / 4);
    const prow = new THREE.Mesh(prowGeo, crimsonHullMat);
    prow.position.set(0, 0, 34);
    prow.scale.set(1.4, 0.75, 1.0);
    this.meshGroup.add(prow);

    // Nose Mega-Laser Emitter Barrel
    const noseBarrelGeo = new THREE.CylinderGeometry(1.6, 2.2, 6.0, 16);
    noseBarrelGeo.rotateX(Math.PI / 2);
    const noseBarrelMat = new THREE.MeshStandardMaterial({ color: 0x0d0305, metalness: 0.96 });
    const noseBarrel = new THREE.Mesh(noseBarrelGeo, noseBarrelMat);
    noseBarrel.position.set(0, 0.2, 44);
    this.meshGroup.add(noseBarrel);

    // Nose Mega-Laser Radiant Lens
    const noseLensGeo = new THREE.SphereGeometry(1.4, 16, 16);
    this.noseLensMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });
    this.noseLensMesh = new THREE.Mesh(noseLensGeo, this.noseLensMat);
    this.noseLensMesh.position.set(0, 0.2, 47);
    this.meshGroup.add(this.noseLensMesh);

    // Nose Mega-Laser Magnetic Focus Ring
    const noseRingGeo = new THREE.TorusGeometry(2.4, 0.35, 8, 24);
    this.noseFocusRing = new THREE.Mesh(noseRingGeo, glowMagmaMat);
    this.noseFocusRing.position.set(0, 0.2, 45.5);
    this.meshGroup.add(this.noseFocusRing);

    // ── 3. Swept Delta Wings (48m Wingspan) ──
    [-1, 1].forEach(side => {
      // Main Wing Blade
      const wingGeo = new THREE.BoxGeometry(18, 2.8, 38);
      const wing = new THREE.Mesh(wingGeo, crimsonHullMat);
      wing.position.set(side * 19, 0, -2);
      wing.rotation.y = side * 0.14; // Swept back
      wing.rotation.z = side * 0.05; // Slight dihedral
      this.meshGroup.add(wing);

      // Wingtip Outrigger Armor Fin
      const tipGeo = new THREE.ConeGeometry(4.5, 20, 4);
      tipGeo.rotateX(-Math.PI / 2);
      tipGeo.rotateZ(Math.PI / 4);
      const wingTip = new THREE.Mesh(tipGeo, darkAlloyMat);
      wingTip.position.set(side * 28, 0.4, 6);
      wingTip.scale.set(0.9, 0.45, 1.0);
      this.meshGroup.add(wingTip);

      // Glowing Leading-Edge Scarlet Energy Conduit
      const edgeGeo = new THREE.BoxGeometry(0.5, 0.5, 34);
      const edge = new THREE.Mesh(edgeGeo, glowScarletMat);
      edge.position.set(side * 27.5, 0.6, -2);
      edge.rotation.y = side * 0.14;
      this.meshGroup.add(edge);

      // Catapult Launch Rails for Stealth Fighters
      const railGeo = new THREE.BoxGeometry(2.2, 1.0, 20);
      const rail = new THREE.Mesh(railGeo, darkAlloyMat);
      rail.position.set(side * 14, 2.6, 6);
      this.meshGroup.add(rail);

      const railGlow = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 18), glowMagmaMat);
      railGlow.position.set(side * 14, 3.2, 6);
      this.meshGroup.add(railGlow);
    });

    // ── 4. Twin Canted Dorsal Stabilizer Tails & Ventral Keel Fins ──
    [-1, 1].forEach(side => {
      // Dorsal Vertical Tail Fin (Angled out at 20 degrees)
      const tailGeo = new THREE.BoxGeometry(1.2, 11, 22);
      const tail = new THREE.Mesh(tailGeo, crimsonHullMat);
      tail.position.set(side * 6.5, 10.0, -18.0);
      tail.rotation.z = -side * 0.28; // Canted outward
      tail.rotation.x = -0.18;        // Swept back
      this.meshGroup.add(tail);

      // Glowing Tail Fin Trailing Edge
      const tailGlow = new THREE.Mesh(new THREE.BoxGeometry(0.4, 10, 0.5), glowScarletMat);
      tailGlow.position.set(side * 8.2, 10.5, -28.0);
      tailGlow.rotation.z = -side * 0.28;
      this.meshGroup.add(tailGlow);

      // Ventral Keel Stabilizer Fin
      const keelGeo = new THREE.BoxGeometry(1.0, 6.5, 16);
      const keel = new THREE.Mesh(keelGeo, darkAlloyMat);
      keel.position.set(side * 4.5, -6.5, -14.0);
      keel.rotation.z = side * 0.22;
      this.meshGroup.add(keel);
    });

    // ── 5. Dorsal Command Bridge Citadel ──
    const bridgeBaseGeo = new THREE.BoxGeometry(10, 5.5, 24);
    const bridgeBase = new THREE.Mesh(bridgeBaseGeo, darkAlloyMat);
    bridgeBase.position.set(0, 6.0, -10);
    this.meshGroup.add(bridgeBase);

    // Armored Bridge Tower with Glowing Crimson Visor
    const towerGeo = new THREE.BoxGeometry(6.5, 3.2, 10);
    const tower = new THREE.Mesh(towerGeo, crimsonHullMat);
    tower.position.set(0, 9.5, -12);
    this.meshGroup.add(tower);

    const visorGeo = new THREE.BoxGeometry(5.8, 1.1, 0.6);
    const visor = new THREE.Mesh(visorGeo, glowScarletMat);
    visor.position.set(0, 10.2, -6.8);
    this.meshGroup.add(visor);

    // ── 6. Exposed Dorsal Fusion Core Reactor (Vulnerable when shields drop) ──
    const coreCasingGeo = new THREE.CylinderGeometry(4.5, 5.2, 3.8, 16);
    const coreCasingMat = new THREE.MeshStandardMaterial({ color: 0x140508, metalness: 0.95 });
    const coreCasing = new THREE.Mesh(coreCasingGeo, coreCasingMat);
    coreCasing.position.set(0, 4.8, 6.0);
    this.meshGroup.add(coreCasing);

    const coreGeo = new THREE.SphereGeometry(3.5, 20, 20);
    this.coreMat = new THREE.MeshStandardMaterial({
      color: 0xff0044,
      emissive: 0xff0044,
      emissiveIntensity: 4.0,
      roughness: 0.1,
      metalness: 0.2
    });
    this.coreMesh = new THREE.Mesh(coreGeo, this.coreMat);
    this.coreMesh.position.set(0, 5.5, 6.0);
    this.meshGroup.add(this.coreMesh);

    // Core Containment Ring
    const coreRingGeo = new THREE.TorusGeometry(4.2, 0.45, 12, 24);
    this.coreRingMesh = new THREE.Mesh(coreRingGeo, glowMagmaMat);
    this.coreRingMesh.rotation.x = Math.PI / 2;
    this.coreRingMesh.position.set(0, 5.6, 6.0);
    this.meshGroup.add(this.coreRingMesh);

    // Core 3D Diamond Target Lock Reticle
    const coreReticleGeo = new THREE.RingGeometry(4.5, 5.6, 4);
    const coreReticleMat = new THREE.MeshBasicMaterial({ color: 0xff0044, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    this.coreReticle = new THREE.Mesh(coreReticleGeo, coreReticleMat);
    this.coreReticle.rotation.x = -Math.PI / 2;
    this.coreReticle.rotation.z = Math.PI / 4;
    this.coreReticle.position.set(0, 9.2, 6.0);
    this.coreReticle.visible = false;
    this.meshGroup.add(this.coreReticle);
    this.reticleMeshes.push(this.coreReticle);

    // ── 7. Omni-Plasma Deflector Shield Bubble ──
    const shieldGeo = new THREE.SphereGeometry(34, 24, 16);
    this.plasmaShieldMat = new THREE.MeshBasicMaterial({
      color: 0xff0055,
      transparent: true,
      opacity: 0.26,
      wireframe: true
    });
    this.plasmaShieldMesh = new THREE.Mesh(shieldGeo, this.plasmaShieldMat);
    this.plasmaShieldMesh.scale.set(1.15, 0.5, 1.25);
    this.plasmaShieldMesh.position.set(0, 0, 4);
    this.meshGroup.add(this.plasmaShieldMesh);

    // ── 8. Port & Starboard Flank Shield Generators ──
    const pylonGeo = new THREE.CylinderGeometry(1.6, 2.2, 5.5, 12);
    const pylonMat = new THREE.MeshStandardMaterial({ color: 0x1f080e, metalness: 0.94 });
    const emitterGeo = new THREE.SphereGeometry(1.5, 16, 16);
    const emitterMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });
    const ringGeo = new THREE.TorusGeometry(2.4, 0.25, 8, 20);

    this.shieldGenerators.forEach(gen => {
      const gGroup = new THREE.Group();
      gGroup.position.copy(gen.relPos);

      const pylon = new THREE.Mesh(pylonGeo, pylonMat);
      gGroup.add(pylon);

      const emitter = new THREE.Mesh(emitterGeo, emitterMat);
      emitter.position.set(0, 3.0, 0);
      gGroup.add(emitter);

      const sRing = new THREE.Mesh(ringGeo, glowScarletMat);
      sRing.rotation.x = Math.PI / 2;
      sRing.position.set(0, 3.0, 0);
      gGroup.add(sRing);

      // 3D Diamond Target Reticle
      const rGeo = new THREE.RingGeometry(3.2, 4.0, 4);
      const rMat = new THREE.MeshBasicMaterial({ color: 0xff0044, side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
      const ret = new THREE.Mesh(rGeo, rMat);
      ret.rotation.z = Math.PI / 4;
      ret.position.set(0, 4.2, 0);
      gGroup.add(ret);

      this.meshGroup.add(gGroup);
      gen.mesh = gGroup;
      gen.ringMesh = sRing;
      gen.reticle = ret;
      this.reticleMeshes.push(ret);
    });

    // ── 9. Build 4 Heavy Rotating Homing Missile Turret Pods ──
    const podBaseGeo = new THREE.CylinderGeometry(2.0, 2.5, 1.6, 12);
    const podBoxGeo = new THREE.BoxGeometry(3.5, 2.2, 4.0);
    const podBoxMat = new THREE.MeshStandardMaterial({ color: 0x2e0c15, metalness: 0.92, roughness: 0.2 });

    this.missilePods.forEach(pod => {
      const pGroup = new THREE.Group();
      pGroup.position.copy(pod.relPos);

      const base = new THREE.Mesh(podBaseGeo, pylonMat);
      pGroup.add(base);

      const box = new THREE.Mesh(podBoxGeo, podBoxMat);
      box.position.set(0, 1.5, 0);
      pGroup.add(box);

      // 6 missile launch tubes
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 3; c++) {
          const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.6, 8), glowMagmaMat);
          tube.rotateX(Math.PI / 2);
          tube.position.set((c - 1) * 1.0, 1.1 + r * 0.75, 2.0);
          pGroup.add(tube);
        }
      }

      const retGeo = new THREE.RingGeometry(2.0, 2.6, 16);
      const retMat = new THREE.MeshBasicMaterial({ color: 0xff5500, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
      const ret = new THREE.Mesh(retGeo, retMat);
      ret.position.set(0, 2.0, 2.4);
      pGroup.add(ret);

      this.meshGroup.add(pGroup);
      pod.mesh = pGroup;
      pod.turretGroup = box;
      pod.reticle = ret;
      this.reticleMeshes.push(ret);
    });

    // ── 10. Build 6 Heavy Dual-Railgun Batteries ──
    const barbGeo = new THREE.CylinderGeometry(1.7, 2.1, 1.3, 12);
    const gunhouseGeo = new THREE.BoxGeometry(2.2, 1.3, 3.0);
    const gunhouseMat = new THREE.MeshStandardMaterial({ color: 0x270b12, metalness: 0.94 });
    const barrelGeo = new THREE.CylinderGeometry(0.22, 0.28, 4.6, 8);
    barrelGeo.rotateX(Math.PI / 2);
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x0f0406, metalness: 0.96 });

    this.turrets.forEach(turret => {
      const tGroup = new THREE.Group();
      tGroup.position.copy(turret.relPos);

      const barb = new THREE.Mesh(barbGeo, pylonMat);
      tGroup.add(barb);

      const bGroup = new THREE.Group();
      bGroup.position.set(0, 0.8, 0);

      const house = new THREE.Mesh(gunhouseGeo, gunhouseMat);
      bGroup.add(house);

      [-0.65, 0.65].forEach(xOff => {
        const bar = new THREE.Mesh(barrelGeo, barrelMat);
        bar.position.set(xOff, 0.1, 2.3);
        bGroup.add(bar);

        const muzz = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.45, 8), glowScarletMat);
        muzz.position.set(xOff, 0.1, 4.6);
        bGroup.add(muzz);
      });

      tGroup.add(bGroup);

      const retGeo = new THREE.RingGeometry(1.8, 2.3, 16);
      const retMat = new THREE.MeshBasicMaterial({ color: 0xff0044, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
      const ret = new THREE.Mesh(retGeo, retMat);
      ret.position.set(0, 1.5, 2.8);
      tGroup.add(ret);

      this.meshGroup.add(tGroup);
      turret.mesh = tGroup;
      turret.barrelGroup = bGroup;
      turret.reticle = ret;
      this.reticleMeshes.push(ret);
    });

    // ── 11. Quad Heavy Afterburner Engine Thruster Array (Tail Engines) ──
    const thrusterGeo = new THREE.CylinderGeometry(2.4, 3.2, 5.5, 16);
    thrusterGeo.rotateX(Math.PI / 2);
    const thrusterMat = new THREE.MeshStandardMaterial({ color: 0x140407, metalness: 0.96 });

    const flameGeo = new THREE.ConeGeometry(2.6, 10.0, 16);
    flameGeo.rotateX(-Math.PI / 2);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff2200, transparent: true, opacity: 0.9 });

    [
      { x: -5.5, y:  2.0, z: -30.0 },
      { x:  5.5, y:  2.0, z: -30.0 },
      { x: -5.5, y: -2.0, z: -30.0 },
      { x:  5.5, y: -2.0, z: -30.0 },
    ].forEach(tPos => {
      const bell = new THREE.Mesh(thrusterGeo, thrusterMat);
      bell.position.set(tPos.x, tPos.y, tPos.z);
      this.meshGroup.add(bell);

      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.set(tPos.x, tPos.y, tPos.z - 5.0);
      this.meshGroup.add(flame);
      this.engineThrusters.push(flame);
    });
  }

  takeShieldGenDamage(generatorId, amount) {
    const gen = this.shieldGenerators.find(g => g.id === generatorId);
    if (!gen || gen.isDead) return false;

    gen.hp -= amount;
    if (gen.reticle && gen.reticle.material) {
      const pct = gen.hp / gen.maxHp;
      gen.reticle.material.color.setHex(pct > 0.5 ? 0xff0044 : (pct > 0.25 ? 0xff5500 : 0x555555));
    }

    if (gen.hp <= 0 && !gen.isDead) {
      gen.isDead = true;
      if (gen.mesh) gen.mesh.visible = false;
      if (gen.reticle) gen.reticle.visible = false;

      const wp = gen.mesh ? gen.mesh.getWorldPosition(new THREE.Vector3()) : this.meshGroup.position;
      this.particleManager.createExplosion(wp, 0xff0044, 200, 5.0);
      this.particleManager.createExplosion(wp, 0xff5500, 150, 4.0);
      this.particleManager.createEmpShockwave(wp, 80);

      const remainingShields = this.shieldGenerators.filter(g => !g.isDead).length;
      if (remainingShields === 0) {
        this.hasPlasmaShield = false;
        if (this.plasmaShieldMesh) this.plasmaShieldMesh.visible = false;
        if (this.coreReticle) this.coreReticle.visible = true;

        if (this.particleManager) {
          this.particleManager.createEmpShockwave(this.meshGroup.position, 160);
          this.particleManager.createExplosion(this.meshGroup.position, 0xff0055, 300, 6.5);
        }

        window.spaceGameManager?.voiceAnnouncer?.speak("Mothership Shields Collapsed! Target the exposed Dorsal Fusion Core!", true);
        if (window.spaceGameManager?.spaceHUD) {
          window.spaceGameManager.spaceHUD.showWaveBanner("SHIELDS DESTROYED", "TARGET DORSAL FUSION CORE");
          window.spaceGameManager.spaceHUD.showRadioTransmission("TACTICAL ALERT: Crimson Dreadnought shields collapsed! All wings focus fire on the Dorsal Fusion Core!", "STARBOUND COMMAND", 6.0);
        }
      } else {
        window.spaceGameManager?.voiceAnnouncer?.speak("Flank shield generator destroyed! 1 generator remains!", true);
      }
    }
    return gen.isDead;
  }

  takeMissilePodDamage(podId, amount) {
    const pod = this.missilePods.find(p => p.id === podId);
    if (!pod || pod.isDead) return false;

    pod.hp -= amount;
    if (pod.reticle && pod.reticle.material) {
      const pct = pod.hp / pod.maxHp;
      pod.reticle.material.color.setHex(pct > 0.5 ? 0xff5500 : (pct > 0.25 ? 0xff0044 : 0x555555));
    }

    if (pod.hp <= 0 && !pod.isDead) {
      pod.isDead = true;
      if (pod.mesh) pod.mesh.visible = false;
      if (pod.reticle) pod.reticle.visible = false;

      const wp = pod.mesh ? pod.mesh.getWorldPosition(new THREE.Vector3()) : this.meshGroup.position;
      this.particleManager.createExplosion(wp, 0xff5500, 150, 4.2);
    }
    return pod.isDead;
  }

  takeRailgunDamage(turretId, amount) {
    const t = this.turrets.find(tur => tur.id === turretId);
    if (!t || t.isDead) return false;

    t.hp -= amount;
    if (t.reticle && t.reticle.material) {
      const pct = t.hp / t.maxHp;
      t.reticle.material.color.setHex(pct > 0.5 ? 0xff0044 : (pct > 0.25 ? 0xff5500 : 0x555555));
    }

    if (t.hp <= 0 && !t.isDead) {
      t.isDead = true;
      if (t.mesh) t.mesh.visible = false;
      if (t.reticle) t.reticle.visible = false;

      const wp = t.mesh ? t.mesh.getWorldPosition(new THREE.Vector3()) : this.meshGroup.position;
      this.particleManager.createExplosion(wp, 0xff0044, 140, 3.8);
    }
    return t.isDead;
  }

  takeCoreDamage(amount) {
    if (this.isDead) return false;

    // If flank shields are still active, deflect 70% damage with visual shield flare
    let effectiveDmg = amount;
    if (this.hasPlasmaShield) {
      effectiveDmg *= 0.3;
      if (this.particleManager && this.meshGroup) {
        this.particleManager.createExplosion(this.meshGroup.position, 0xff0044, 10, 1.4);
      }
    }

    this.coreHp = Math.max(0, this.coreHp - effectiveDmg);

    if (this.coreMat) {
      this.coreMat.emissiveIntensity = 14.0;
      setTimeout(() => {
        if (this.coreMat) this.coreMat.emissiveIntensity = 4.0 + this.phase;
      }, 100);
    }

    const hpRatio = this.coreHp / this.maxCoreHp;
    if (hpRatio < 0.6 && this.phase === 1) {
      this.phase = 2;
      window.spaceGameManager?.voiceAnnouncer?.speak("Warning! Crimson Dreadnought entering Phase 2: Stealth Swarm Inbound!", true);
    }
    if (hpRatio < 0.3 && this.phase === 2) {
      this.phase = 3;
      window.spaceGameManager?.voiceAnnouncer?.speak("Critical alert! Dreadnought reactor critical overcharge!", true);
    }

    if (this.coreHp <= 0 && !this.isDead) {
      this.isDead = true;
      this._explode();
    }
    return this.isDead;
  }

  takeCouplingDamage(couplingId, amount) {
    return this.takeCoreDamage(amount);
  }

  takeInternalTurretDamage(id, amount) {
    return this.takeRailgunDamage(id, amount);
  }

  takeExternalTurretDamage(id, amount) {
    return this.takeRailgunDamage(id, amount);
  }

  takeDamage(type, amount) {
    return this.takeCoreDamage(amount);
  }

  _explode() {
    const p = this.meshGroup.position;
    this.particleManager.createExplosion(p, 0xff0044, 450, 9.0);
    this.particleManager.createExplosion(p, 0xff5500, 350, 7.5);
    this.particleManager.createExplosion(p, 0xffaa00, 300, 6.0);
    this.particleManager.createExplosion(p, 0xffffff, 200, 5.0);
    this.particleManager.createEmpShockwave(p, 250);
    this.particleManager.createEmpShockwave(p, 350);
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
    if (this.scene && this.meshGroup) {
      this.scene.remove(this.meshGroup);
    }
    this.meshGroup.traverse(c => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    });
  }

  update(dt, playerPos) {
    if (this.isDead) return false;
    this._time += dt;

    // 1. Forward Advance to Target Battle Station
    const arrived = this.meshGroup.position.z >= this.targetZ;
    if (!arrived) {
      this.meshGroup.position.z += this.speed * dt;
    } else {
      // Tactical Flank Swaying to encourage player strafing
      this.flankSwayTimer += dt * 0.6;
      this.meshGroup.position.x = Math.sin(this.flankSwayTimer) * 12.0;
      this.meshGroup.position.y = Math.cos(this.flankSwayTimer * 0.8) * 3.5;
      this.meshGroup.rotation.z = -Math.cos(this.flankSwayTimer) * 0.08;
      this.meshGroup.rotation.y = Math.sin(this.flankSwayTimer) * 0.05;
    }

    // 2. Animate Target Reticles & Core Containment Ring
    if (this.reticleMeshes) {
      this.reticleMeshes.forEach(ret => {
        if (ret && ret.visible) ret.rotation.z += 2.2 * dt;
      });
    }

    if (this.coreRingMesh) {
      this.coreRingMesh.rotation.z += (1.5 + this.phase * 0.5) * dt;
    }

    // 3. Animate Shield Generators Induction Rings
    if (this.shieldGenerators) {
      this.shieldGenerators.forEach(g => {
        if (!g.isDead && g.ringMesh) {
          g.ringMesh.rotation.z += 3.5 * dt;
        }
      });
    }

    // 4. Plasma Deflector Shimmering Pulse
    if (this.hasPlasmaShield && this.plasmaShieldMat) {
      this.plasmaShieldMat.opacity = 0.22 + Math.sin(this._time * 6.0) * 0.08;
    }

    // 5. Engine Thruster Plume Breathing (Burning Red & Orange)
    if (this.engineThrusters) {
      this.engineThrusters.forEach((th, i) => {
        const s = 1.0 + Math.sin(this._time * 18.0 + i) * 0.2;
        th.scale.set(s, s, s * (arrived ? 1.0 : 1.6));
      });
    }

    // 6. Turrets Dynamic 3D Tracking
    if (arrived && playerPos) {
      this.turrets.forEach(t => {
        if (!t.isDead && t.barrelGroup) {
          t.barrelGroup.lookAt(playerPos);
        }
      });

      this.missilePods.forEach(p => {
        if (!p.isDead && p.turretGroup) {
          p.turretGroup.lookAt(playerPos);
        }
      });
    }

    // ── 7. Combat Attack Salvo Generator ──
    this.railgunFireTimer -= dt;
    this.missileFireTimer -= dt;
    this.stealthLaunchTimer -= dt;
    this.noseLaserChargeTimer -= dt;

    const outLasers = [];
    const outMissiles = [];
    const outStealthSpawns = [];
    let noseLaserFired = false;

    if (arrived) {
      // A. Nose Mega-Laser Cannon Firing (Spinal Heavy Beam)
      if (this.noseFocusRing && this.noseLensMat) {
        if (this.noseLaserChargeTimer <= 1.0) {
          // Charge up with pulsing white-scarlet lens flare
          const chargePulse = Math.sin(this._time * 30.0);
          this.noseLensMat.color.setHex(chargePulse > 0 ? 0xffffff : 0xff0044);
          this.noseFocusRing.rotation.z += 12.0 * dt;
        } else {
          this.noseLensMat.color.setHex(0xff0044);
          this.noseFocusRing.rotation.z += 2.0 * dt;
        }
      }

      if (this.noseLaserChargeTimer <= 0) {
        this.noseLaserChargeTimer = Math.max(3.5, 6.0 - this.phase * 0.8);
        noseLaserFired = true;
        const noseWorldPos = new THREE.Vector3(0, 0.2, 47).applyMatrix4(this.meshGroup.matrixWorld);
        
        // Spawn 3 rapid heavy spinal beam bolts in a tight piercing column
        [-1.2, 0, 1.2].forEach(xOff => {
          outLasers.push(new THREE.Vector3(noseWorldPos.x + xOff, noseWorldPos.y, noseWorldPos.z));
        });

        this.particleManager.createExplosion(noseWorldPos, 0xff0044, 40, 3.0);
      }

      // B. Heavy Railgun Volleys (Crimson Bolts)
      if (this.railgunFireTimer <= 0) {
        this.railgunFireTimer = 0.75 / (1.0 + this.phase * 0.3);
        const livingTurrets = this.turrets.filter(t => !t.isDead && t.mesh);
        livingTurrets.forEach(t => {
          outLasers.push(t.mesh.getWorldPosition(new THREE.Vector3()));
        });
      }

      // C. Homing Missile Pod Volleys (Swarm Tracking)
      if (this.missileFireTimer <= 0) {
        this.missileFireTimer = Math.max(1.8, 3.8 - this.phase * 0.7);
        const livingPods = this.missilePods.filter(p => !p.isDead && p.mesh);
        livingPods.forEach(p => {
          const wp = p.mesh.getWorldPosition(new THREE.Vector3());
          outMissiles.push({
            pos: wp,
            targetPos: playerPos ? playerPos.clone() : new THREE.Vector3(0, 0, 0)
          });
        });
      }

      // D. Stealth Fighter Catapult Deployments (Active Cloaking Escorts)
      if (this.stealthLaunchTimer <= 0) {
        this.stealthLaunchTimer = Math.max(6.0, 11.0 - this.phase * 2.0);
        [-1, 1].forEach(side => {
          const launchPos = new THREE.Vector3(side * 14, 2.6, 6).applyMatrix4(this.meshGroup.matrixWorld);
          outStealthSpawns.push({
            x: launchPos.x,
            y: launchPos.y,
            z: launchPos.z,
            side
          });
          this.particleManager.createExplosion(launchPos, 0xff2200, 30, 2.0);
        });
      }
    }

    return {
      lasers: outLasers,
      homingMissiles: outMissiles,
      stealthSpawns: outStealthSpawns,
      noseLaserFired
    };
  }
}
