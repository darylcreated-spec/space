import * as THREE from 'three';

/**
 * Procedural Normal/Bump Texture for Goliath Heavy Battleship Armor Plating (Arctic White Finish)
 */
function generateBattleshipArmorTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Base arctic white ceramic composite
  ctx.fillStyle = '#e8eef6';
  ctx.fillRect(0, 0, 512, 512);

  // Precision titanium armor plate seams
  ctx.strokeStyle = '#8da2be';
  ctx.lineWidth = 2.8;
  for (let x = 0; x < 512; x += 64) {
    ctx.strokeRect(x, 0, 64, 512);
  }
  for (let y = 0; y < 512; y += 64) {
    ctx.strokeRect(0, y, 512, 64);
  }

  // Pure white micro-rivets along armor boundaries
  ctx.fillStyle = '#ffffff';
  for (let y = 8; y < 512; y += 32) {
    for (let x = 8; x < 512; x += 64) {
      ctx.beginPath();
      ctx.arc(x, y, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // High-contrast orange/graphite hazard chevron stripes
  ctx.fillStyle = '#ff6600';
  for (let i = 0; i < 4; i++) {
    const xOff = 384 + i * 28;
    ctx.beginPath();
    ctx.moveTo(xOff, 0);
    ctx.lineTo(xOff + 16, 0);
    ctx.lineTo(xOff - 10, 64);
    ctx.lineTo(xOff - 26, 64);
    ctx.closePath();
    ctx.fill();
  }

  // Neon crimson power conduits
  ctx.strokeStyle = '#ff0044';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, 256); ctx.lineTo(128, 256); ctx.lineTo(192, 192); ctx.lineTo(512, 192);
  ctx.stroke();

  return new THREE.CanvasTexture(canvas);
}

// ============================================================
// GOLIATH HEAVY BATTLESHIP — Dreadnought Command Fortress
// 110m Colossal Super-Battleship with Twin Double Tail Stabilizers,
// 8 Heavy Triple-Railgun Batteries, 4 Heavy Missile Silo Pods,
// Dual Deflector Shield Generators, Spinal Wave-Motion Lance Cannon,
// and Sextuple Heavy Fusion Thrusters with Mach Shock Diamonds!
// ============================================================
export class HeavyBattleship {
  constructor(scene, particleManager, spawnZ = -150) {
    this.scene = scene;
    this.particleManager = particleManager;

    this.meshGroup = new THREE.Group();
    this.meshGroup.position.set(0, 4, spawnZ);

    // -- Boss Telemetry & Stats --
    this.coreHp = 5800;
    this.maxCoreHp = 5800;
    this.hitRadius = 48.0;
    this.radius = 48.0;
    this.isDead = false;
    this.scoreValue = 45000;

    // Movement & Combat
    this.targetZ = -65;
    this.speed = 10.0;
    this.strafeTimer = 0;
    this._time = 0;

    // ── 1. Dual Deflector Shield Generator Pylons ──
    this.hasShield = true;
    this.shieldGenerators = [
      { id: 0, name: 'PORT DEFLECTOR GENERATOR',      relPos: new THREE.Vector3(-18.0, 4.5, 10), hp: 900, maxHp: 900, isDead: false, mesh: null, ringMesh: null, reticle: null },
      { id: 1, name: 'STARBOARD DEFLECTOR GENERATOR', relPos: new THREE.Vector3( 18.0, 4.5, 10), hp: 900, maxHp: 900, isDead: false, mesh: null, ringMesh: null, reticle: null },
    ];

    // ── 2. Eight Heavy Triple-Railgun Batteries (Raised Superfiring Arrangement!) ──
    this.turrets = [
      { id: 0, name: 'DORSAL BOW SUPERFIRING BATTERY',      relPos: new THREE.Vector3(  0,  9.2,  34), pedestalH: 4.2, hp: 750, maxHp: 750, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 1, name: 'DORSAL MID-FORE APEX BATTERY',         relPos: new THREE.Vector3(  0, 12.0,  16), pedestalH: 7.0, hp: 750, maxHp: 750, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 2, name: 'DORSAL MID-AFT APEX BATTERY',          relPos: new THREE.Vector3(  0, 12.0,  -8), pedestalH: 7.0, hp: 750, maxHp: 750, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 3, name: 'DORSAL STERN SUPERFIRING BATTERY',     relPos: new THREE.Vector3(  0,  9.2, -26), pedestalH: 4.2, hp: 750, maxHp: 750, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 4, name: 'PORT FLANK OUTRIGGER BATTERY',        relPos: new THREE.Vector3(-24,  4.5,   4), pedestalH: 4.0, hp: 750, maxHp: 750, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 5, name: 'STARBOARD FLANK OUTRIGGER BATTERY',   relPos: new THREE.Vector3( 24,  4.5,   4), pedestalH: 4.0, hp: 750, maxHp: 750, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 6, name: 'VENTRAL FORE KEEL BATTERY',            relPos: new THREE.Vector3(  0, -8.0,  22), pedestalH: 3.5, hp: 750, maxHp: 750, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 7, name: 'VENTRAL AFT KEEL BATTERY',             relPos: new THREE.Vector3(  0, -8.0, -14), pedestalH: 3.5, hp: 750, maxHp: 750, isDead: false, mesh: null, barrelGroup: null, reticle: null },
    ];

    // ── 3. Four Heavy Vertical-Launch Missile Silo Pods ──
    this.missilePods = [
      { id: 0, name: 'PORT FORE MISSILE POD',      relPos: new THREE.Vector3(-15, 3.8,  22), hp: 650, maxHp: 650, isDead: false, mesh: null, reticle: null },
      { id: 1, name: 'STARBOARD FORE MISSILE POD', relPos: new THREE.Vector3( 15, 3.8,  22), hp: 650, maxHp: 650, isDead: false, mesh: null, reticle: null },
      { id: 2, name: 'PORT AFT MISSILE POD',       relPos: new THREE.Vector3(-15, 3.8, -16), hp: 650, maxHp: 650, isDead: false, mesh: null, reticle: null },
      { id: 3, name: 'STARBOARD AFT MISSILE POD',   relPos: new THREE.Vector3( 15, 3.8, -16), hp: 650, maxHp: 650, isDead: false, mesh: null, reticle: null },
    ];

    this.reticleMeshes = [];
    this.thrusters = [];
    this.engineExhaustPlumes = [];
    this.machDiamondRings = [];

    // Weapon Timers
    this.railgunTimer = 2.8;
    this.missileTimer = 3.5;
    this.flakTimer = 1.8;
    this.apexLaserTimer = 2.0;
    this.spinalLanceTimer = 9.0;
    this.isChargingLance = false;
    this.lanceChargeTime = 0;

    // Teardown
    this.deathTimer = 0;
    this.isDying = false;

    this.buildShip();
    this.scene.add(this.meshGroup);
  }

  buildShip() {
    this.armorTexture = generateBattleshipArmorTexture();

    // ── High-Definition Arctic / Pearl White Armor Materials ──
    this.hullMat = new THREE.MeshStandardMaterial({
      color: 0xecf3f9,
      bumpMap: this.armorTexture,
      bumpScale: 0.14,
      metalness: 0.85,
      roughness: 0.18,
      emissive: 0x1c2536,
      emissiveIntensity: 0.25
    });

    this.armorPlatesMat = new THREE.MeshStandardMaterial({
      color: 0xfcfdff,
      metalness: 0.94,
      roughness: 0.10,
      bumpMap: this.armorTexture,
      bumpScale: 0.08
    });

    this.darkAlloyMat = new THREE.MeshStandardMaterial({
      color: 0x2e3848,
      metalness: 0.92,
      roughness: 0.20
    });

    this.glowRedMat = new THREE.MeshBasicMaterial({
      color: 0xff0044,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });

    this.glowOrangeMat = new THREE.MeshBasicMaterial({
      color: 0xff7700,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    this.glowCyanMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    // ── 1. Colossal 110m Angular Dreadnought Hull Prow & Fuselage ──
    const mainHullGeo = new THREE.BoxGeometry(26, 9.0, 72);
    const mainHull = new THREE.Mesh(mainHullGeo, this.hullMat);
    mainHull.position.set(0, 0, -4);
    this.meshGroup.add(mainHull);

    // Chisel-head kinetic ram prow
    const prowGeo = new THREE.ConeGeometry(16, 36, 4);
    prowGeo.rotateX(Math.PI / 2);
    prowGeo.scale(1.2, 0.45, 1.0);
    const prow = new THREE.Mesh(prowGeo, this.armorPlatesMat);
    prow.position.set(0, 0, 44);
    this.meshGroup.add(prow);

    // ── 2. Beveled Titanium Chined Sponson Armor Wings (Beam: 48m) ──
    [-19, 19].forEach(sx => {
      const sponsonGeo = new THREE.BoxGeometry(12, 4.5, 58);
      const sponsonMesh = new THREE.Mesh(sponsonGeo, this.armorPlatesMat);
      sponsonMesh.position.set(sx, 0.5, -4);
      this.meshGroup.add(sponsonMesh);

      // Sponson glowing navigation hazard lights
      const lightGeo = new THREE.BoxGeometry(0.4, 0.35, 54);
      const lightMesh = new THREE.Mesh(lightGeo, this.glowOrangeMat);
      lightMesh.position.set(sx + (sx > 0 ? 6.1 : -6.1), 0.5, -4);
      this.meshGroup.add(lightMesh);
    });

    // ── 3. Central Raised Dorsal Citadel Armor Spine ──
    const spineGeo = new THREE.BoxGeometry(12.0, 5.5, 78);
    const spineMesh = new THREE.Mesh(spineGeo, this.armorPlatesMat);
    spineMesh.position.set(0, 5.2, -4);
    this.meshGroup.add(spineMesh);

    // ── 4. Multi-Tier Command Bridge Fortress Citadel ──
    const bridgeGeo = new THREE.BoxGeometry(11.0, 7.0, 16.0);
    const bridgeMesh = new THREE.Mesh(bridgeGeo, this.darkAlloyMat);
    bridgeMesh.position.set(0, 9.5, -18);
    this.meshGroup.add(bridgeMesh);

    // Illuminated Crimson Command Observation Visor
    const visorGeo = new THREE.BoxGeometry(9.8, 1.2, 0.5);
    const visorMesh = new THREE.Mesh(visorGeo, this.glowRedMat);
    visorMesh.position.set(0, 10.5, -9.8);
    this.meshGroup.add(visorMesh);

    // Communications Sensor Mast
    const mastGeo = new THREE.CylinderGeometry(0.2, 0.4, 7.5, 6);
    const mastMesh = new THREE.Mesh(mastGeo, this.armorPlatesMat);
    mastMesh.position.set(0, 15.0, -20);
    this.meshGroup.add(mastMesh);

    // ── 5. ✨ DOUBLE TAIL (Twin Angled Empennage Stabilizer Fins & Twin Engine Booms) ──
    [-14, 14].forEach((tx, idx) => {
      const isRight = tx > 0;
      const cantAngle = isRight ? 0.38 : -0.38;

      // Vertical Tail Fin Sponson Mast
      const finGroup = new THREE.Group();
      finGroup.position.set(tx, 7.0, -36);
      finGroup.rotation.z = cantAngle;

      const finGeo = new THREE.BoxGeometry(1.2, 14.0, 18.0);
      const finMesh = new THREE.Mesh(finGeo, this.armorPlatesMat);
      finGroup.add(finMesh);

      // Leading Edge Titanium Slat
      const edgeGeo = new THREE.BoxGeometry(1.6, 14.5, 2.0);
      const edgeMesh = new THREE.Mesh(edgeGeo, this.darkAlloyMat);
      edgeMesh.position.set(0, 0, 8.5);
      finGroup.add(edgeMesh);

      // Neon Vermilion Fin Tip Beacon
      const tipGeo = new THREE.BoxGeometry(1.8, 1.0, 16.0);
      const tipMesh = new THREE.Mesh(tipGeo, this.glowRedMat);
      tipMesh.position.set(0, 7.2, 0);
      finGroup.add(tipMesh);

      // Auxiliary Tail Antenna Mast
      const antGeo = new THREE.CylinderGeometry(0.12, 0.2, 5.0, 6);
      const antMesh = new THREE.Mesh(antGeo, this.armorPlatesMat);
      antMesh.position.set(0, 9.5, -6);
      finGroup.add(antMesh);

      this.meshGroup.add(finGroup);
    });

    // ── 6. Sextuple Heavy Fusion Thrusters on Twin Tail Booms with Mach Shock Diamonds ──
    const shockMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending });
    const coreFlameMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 });

    [-14, 14].forEach(boomX => {
      [-2.8, 0, 2.8].forEach(xOff => {
        const nx = boomX + xOff;
        const ny = 0.5;
        const nz = -42;

        const bellGeo = new THREE.CylinderGeometry(1.6, 2.2, 3.4, 10);
        bellGeo.rotateX(Math.PI / 2);
        const bellMesh = new THREE.Mesh(bellGeo, this.darkAlloyMat);
        bellMesh.position.set(nx, ny, nz);
        this.meshGroup.add(bellMesh);

        // Outer Flame Plume
        const plumeGeo = new THREE.ConeGeometry(2.0, 10.0, 10);
        plumeGeo.rotateX(-Math.PI / 2);
        const plume = new THREE.Mesh(plumeGeo, this.glowOrangeMat);
        plume.position.set(nx, ny, nz - 7.5);
        this.meshGroup.add(plume);
        this.engineExhaustPlumes.push(plume);

        // Inner White Flame Core
        const innerCoreGeo = new THREE.ConeGeometry(1.0, 8.0, 8);
        innerCoreGeo.rotateX(-Math.PI / 2);
        const innerCore = new THREE.Mesh(innerCoreGeo, coreFlameMat);
        innerCore.position.set(nx, ny, nz - 6.0);
        this.meshGroup.add(innerCore);

        // Mach Shock Diamonds
        [-3.2, -6.2].forEach((zD, sIdx) => {
          const diamondGeo = new THREE.TorusGeometry(1.2 - sIdx * 0.3, 0.15, 6, 16);
          const diamond = new THREE.Mesh(diamondGeo, shockMat);
          diamond.position.set(nx, ny, nz + zD);
          this.meshGroup.add(diamond);
          this.machDiamondRings.push({ mesh: diamond, baseScale: 1.0 - sIdx * 0.2 });
        });
      });

      const eLight = new THREE.PointLight(0xff7700, 10.0, 65);
      eLight.position.set(boomX, 0.5, -44);
      this.meshGroup.add(eLight);
    });

    // ── 7. Dual Deflector Shield Generator Pylons ──
    const genPylonGeo = new THREE.CylinderGeometry(1.6, 2.4, 8.0, 8);
    const genRingGeo = new THREE.TorusGeometry(2.8, 0.4, 8, 20);

    this.shieldGenerators.forEach(g => {
      const gGroup = new THREE.Group();
      gGroup.position.copy(g.relPos);

      const pylon = new THREE.Mesh(genPylonGeo, this.darkAlloyMat);
      gGroup.add(pylon);

      const ring = new THREE.Mesh(genRingGeo, this.glowCyanMat);
      ring.position.set(0, 2.5, 0);
      ring.rotation.x = Math.PI / 2;
      gGroup.add(ring);

      const reticleGeo = new THREE.RingGeometry(2.2, 2.8, 16);
      const reticleMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
      const reticle = new THREE.Mesh(reticleGeo, reticleMat);
      reticle.position.set(0, 2.5, 3.2);
      gGroup.add(reticle);

      this.meshGroup.add(gGroup);
      g.mesh = gGroup;
      g.ringMesh = ring;
      g.reticle = reticle;
      this.reticleMeshes.push(reticle);
    });

    // ── 8. Eight Rotating Heavy Triple-Railgun Turrets ──
    const barbetteGeo = new THREE.CylinderGeometry(3.0, 3.8, 1.5, 12);
    const houseGeo = new THREE.BoxGeometry(4.2, 2.0, 5.0);
    const barrelGeo = new THREE.CylinderGeometry(0.26, 0.34, 6.5, 8);
    barrelGeo.rotateX(Math.PI / 2);
    const coilGeo = new THREE.TorusGeometry(0.42, 0.08, 6, 12);

    this.turrets.forEach(t => {
      const tGroup = new THREE.Group();
      tGroup.position.copy(t.relPos);

      // Armored Riser Barbette Pedestal
      const pedH = t.pedestalH || 3.0;
      const pedestalGeo = new THREE.CylinderGeometry(3.6, 4.4, pedH, 12);
      const pedestalMesh = new THREE.Mesh(pedestalGeo, this.darkAlloyMat);
      pedestalMesh.position.set(0, -pedH / 2, 0);
      tGroup.add(pedestalMesh);

      const barbette = new THREE.Mesh(barbetteGeo, this.armorPlatesMat);
      tGroup.add(barbette);

      const barrelGroup = new THREE.Group();
      barrelGroup.position.set(0, 1.2, 0);

      const house = new THREE.Mesh(houseGeo, this.darkAlloyMat);
      barrelGroup.add(house);

      [-1.1, 0, 1.1].forEach(bx => {
        const barrel = new THREE.Mesh(barrelGeo, this.armorPlatesMat);
        barrel.position.set(bx, 0.2, 3.2);
        barrelGroup.add(barrel);

        [1.5, 3.0, 4.5].forEach(zC => {
          const coil = new THREE.Mesh(coilGeo, this.glowOrangeMat);
          coil.position.set(bx, 0.2, zC);
          barrelGroup.add(coil);
        });

        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.08, 6, 14), this.glowRedMat);
        ring.position.set(bx, 0.2, 6.5);
        barrelGroup.add(ring);
      });

      tGroup.add(barrelGroup);

      const reticleGeo = new THREE.RingGeometry(2.4, 3.0, 16);
      const reticleMat = new THREE.MeshBasicMaterial({ color: 0xff7700, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
      const reticle = new THREE.Mesh(reticleGeo, reticleMat);
      reticle.position.set(0, 1.5, 4.5);
      tGroup.add(reticle);

      this.meshGroup.add(tGroup);
      t.mesh = tGroup;
      t.barrelGroup = barrelGroup;
      t.reticle = reticle;
      this.reticleMeshes.push(reticle);
    });

    // ── 9. Four Heavy Vertical-Launch Missile Silo Pods ──
    const podGeo = new THREE.BoxGeometry(4.5, 2.2, 6.8);
    this.missilePods.forEach(p => {
      const pGroup = new THREE.Group();
      pGroup.position.copy(p.relPos);

      const housing = new THREE.Mesh(podGeo, this.darkAlloyMat);
      pGroup.add(housing);

      [-1.2, 0, 1.2].forEach(xOff => {
        [-1.6, 1.6].forEach(zOff => {
          const tubeGeo = new THREE.CylinderGeometry(0.42, 0.42, 1.0, 8);
          const tube = new THREE.Mesh(tubeGeo, this.glowOrangeMat);
          tube.position.set(xOff, 1.1, zOff);
          pGroup.add(tube);
        });
      });

      const reticleGeo = new THREE.RingGeometry(2.0, 2.6, 16);
      const reticleMat = new THREE.MeshBasicMaterial({ color: 0xff0044, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
      const reticle = new THREE.Mesh(reticleGeo, reticleMat);
      reticle.position.set(0, 2.0, 0);
      reticle.rotation.x = Math.PI / 2;
      pGroup.add(reticle);

      this.meshGroup.add(pGroup);
      p.mesh = pGroup;
      p.reticle = reticle;
      this.reticleMeshes.push(reticle);
    });

    // ── 10. Central Spinal Wave-Motion Lance Cannon Trench ──
    const prowLanceGeo = new THREE.BoxGeometry(3.6, 3.2, 16.0);
    const prowLanceMesh = new THREE.Mesh(prowLanceGeo, this.darkAlloyMat);
    prowLanceMesh.position.set(0, 0, 36);
    this.meshGroup.add(prowLanceMesh);

    const prowCoreGeo = new THREE.SphereGeometry(2.4, 20, 20);
    this.lanceCoreMesh = new THREE.Mesh(prowCoreGeo, this.glowRedMat);
    this.lanceCoreMesh.position.set(0, 0, 44);
    this.meshGroup.add(this.lanceCoreMesh);

    // ── 11. 💥 FRONT TRIANGULAR APEX SUPER-LASER EMITTER (At Tip Z: 62.6) ──
    const apexGroup = new THREE.Group();
    apexGroup.position.set(0, 0, 62.0);

    // Armored Focus Shroud
    const apexShroudGeo = new THREE.CylinderGeometry(1.6, 2.6, 3.6, 8);
    apexShroudGeo.rotateX(Math.PI / 2);
    const apexShroud = new THREE.Mesh(apexShroudGeo, this.darkAlloyMat);
    apexGroup.add(apexShroud);

    // Superconducting Magnetic Lens Ring
    const apexRingGeo = new THREE.TorusGeometry(1.8, 0.28, 8, 20);
    const apexRing = new THREE.Mesh(apexRingGeo, this.glowOrangeMat);
    apexRing.position.set(0, 0, 1.4);
    apexGroup.add(apexRing);

    // Hyper-Luminous Plasma Focus Crystal
    const apexCrystalGeo = new THREE.SphereGeometry(1.5, 16, 16);
    this.apexCrystalMesh = new THREE.Mesh(apexCrystalGeo, this.glowRedMat);
    this.apexCrystalMesh.position.set(0, 0, 1.8);
    apexGroup.add(this.apexCrystalMesh);

    // Blinding Apex Point Light
    this.apexLight = new THREE.PointLight(0xff0044, 8.0, 50);
    this.apexLight.position.set(0, 0, 3.0);
    apexGroup.add(this.apexLight);

    this.meshGroup.add(apexGroup);

    // Dedicated Specular Spotlight for High-Definition Hull Illumination
    this.keyLight = new THREE.PointLight(0xd8ecff, 3.8, 90);
    this.keyLight.position.set(0, 24, 10);
    this.meshGroup.add(this.keyLight);
  }

  takeShieldGenDamage(genId, amount) {
    const g = this.shieldGenerators.find(gen => gen.id === genId);
    if (!g || g.isDead) return false;
    g.hp -= amount;

    if (g.reticle && g.reticle.material) {
      const pct = g.hp / g.maxHp;
      g.reticle.material.color.setHex(pct > 0.5 ? 0x00f3ff : (pct > 0.25 ? 0xffaa00 : 0xff0044));
    }

    if (g.hp <= 0) {
      g.isDead = true;
      if (g.reticle) g.reticle.visible = false;
      const wp = new THREE.Vector3();

      if (g.mesh && g.mesh.parent) {
        g.mesh.getWorldPosition(wp);
        const wq = new THREE.Quaternion();
        const ws = new THREE.Vector3();
        g.mesh.getWorldQuaternion(wq);
        g.mesh.getWorldScale(ws);

        g.mesh.parent.remove(g.mesh);
        g.mesh.position.copy(wp);
        g.mesh.quaternion.copy(wq);
        g.mesh.scale.copy(ws);
        this.scene.add(g.mesh);

        // Leave charred scorched mounting ring on battleship
        const scorchGeo = new THREE.CylinderGeometry(2.2, 2.5, 0.4, 8);
        const scorchMat = new THREE.MeshStandardMaterial({ color: 0x100a18, metalness: 0.98, roughness: 0.85, emissive: 0x330011, emissiveIntensity: 0.6 });
        const scorch = new THREE.Mesh(scorchGeo, scorchMat);
        scorch.position.copy(g.relPos);
        this.meshGroup.add(scorch);

        if (this.particleManager && this.particleManager.metalDebris) {
          this.particleManager.metalDebris.push({
            mesh: g.mesh,
            geo: g.mesh.geometry,
            mat: g.mesh.material,
            vx: (Math.random() - 0.5) * 14.0,
            vy: 3.0 + (Math.random() - 0.5) * 6.0,
            vz: 8.0 + Math.random() * 16.0,
            rotSpeedX: (Math.random() - 0.5) * 6.0,
            rotSpeedY: (Math.random() - 0.5) * 6.0,
            rotSpeedZ: (Math.random() - 0.5) * 6.0,
            life: 1.0,
            decay: 0.16
          });
        }
      }

      this.particleManager.createExplosion(wp, 0x00f3ff, 140, 4.0);
      this.particleManager.createEmpShockwave(wp, 50);
      this.particleManager.spawnMetalDebris(wp, 4, 0xe8eef6);

      const aliveGens = this.shieldGenerators.filter(gen => !gen.isDead);
      if (aliveGens.length === 0 && this.hasShield) {
        this.hasShield = false;
        this.particleManager.createEmpShockwave(this.meshGroup.position, 90);
        window.spaceGameManager?.voiceAnnouncer?.speak("Battleship Deflector Shield Collapsed! Strike the Heavy Armor Core!", true);
        if (window.spaceGameManager?.spaceHUD) {
          window.spaceGameManager.spaceHUD.showRadioTransmission("BATTLESHIP SHIELD COLLAPSED! Concentrate all firepower!", "STARBOUND COMMAND", 6.0);
        }
      }
    }
    return g.isDead;
  }

  takeTurretDamage(turretId, amount) {
    const t = this.turrets.find(tur => tur.id === turretId || tur.id === `battleship_turret_${turretId}`);
    if (!t || t.isDead) return false;
    t.hp -= amount;

    if (t.reticle && t.reticle.material) {
      const pct = t.hp / t.maxHp;
      t.reticle.material.color.setHex(pct > 0.5 ? 0xff7700 : (pct > 0.25 ? 0xffaa00 : 0xff0000));
    }

    if (t.hp <= 0) {
      t.isDead = true;
      if (t.reticle) t.reticle.visible = false;
      const wp = new THREE.Vector3();

      if (t.mesh && t.mesh.parent) {
        t.mesh.getWorldPosition(wp);
        const wq = new THREE.Quaternion();
        const ws = new THREE.Vector3();
        t.mesh.getWorldQuaternion(wq);
        t.mesh.getWorldScale(ws);

        t.mesh.parent.remove(t.mesh);
        t.mesh.position.copy(wp);
        t.mesh.quaternion.copy(wq);
        t.mesh.scale.copy(ws);
        this.scene.add(t.mesh);

        // Leave charred scorched barbette stump with exposed glowing conduits
        const stumpGeo = new THREE.CylinderGeometry(2.0, 2.4, 1.2, 8);
        const stumpMat = new THREE.MeshStandardMaterial({ color: 0x120c1a, metalness: 0.98, roughness: 0.85, emissive: 0x441100, emissiveIntensity: 0.8 });
        const stump = new THREE.Mesh(stumpGeo, stumpMat);
        stump.position.copy(t.relPos);
        this.meshGroup.add(stump);

        if (this.particleManager && this.particleManager.metalDebris) {
          this.particleManager.metalDebris.push({
            mesh: t.mesh,
            geo: t.mesh.geometry,
            mat: t.mesh.material,
            vx: (Math.random() - 0.5) * 12.0,
            vy: 3.5 + (Math.random() - 0.5) * 6.0,
            vz: 7.0 + Math.random() * 14.0,
            rotSpeedX: (Math.random() - 0.5) * 6.0,
            rotSpeedY: (Math.random() - 0.5) * 6.0,
            rotSpeedZ: (Math.random() - 0.5) * 6.0,
            life: 1.0,
            decay: 0.16
          });
        }
      }

      this.particleManager.createExplosion(wp, 0xff7700, 110, 3.5);
      this.particleManager.createEmpShockwave(wp, 40);
      this.particleManager.spawnMetalDebris(wp, 4, 0xe8eef6);
    }
    return t.isDead;
  }

  takeMissilePodDamage(podId, amount) {
    const p = this.missilePods.find(pod => pod.id === podId);
    if (!p || p.isDead) return false;
    p.hp -= amount;

    if (p.reticle && p.reticle.material) {
      const pct = p.hp / p.maxHp;
      p.reticle.material.color.setHex(pct > 0.5 ? 0xff0044 : (pct > 0.25 ? 0xffaa00 : 0xff0000));
    }

    if (p.hp <= 0) {
      p.isDead = true;
      if (p.reticle) p.reticle.visible = false;
      const wp = new THREE.Vector3();

      if (p.mesh && p.mesh.parent) {
        p.mesh.getWorldPosition(wp);
        const wq = new THREE.Quaternion();
        const ws = new THREE.Vector3();
        p.mesh.getWorldQuaternion(wq);
        p.mesh.getWorldScale(ws);

        p.mesh.parent.remove(p.mesh);
        p.mesh.position.copy(wp);
        p.mesh.quaternion.copy(wq);
        p.mesh.scale.copy(ws);
        this.scene.add(p.mesh);

        // Leave scorched missile silo crater
        const craterGeo = new THREE.BoxGeometry(4.2, 0.4, 7.2);
        const craterMat = new THREE.MeshStandardMaterial({ color: 0x100a18, metalness: 0.98, roughness: 0.85, emissive: 0x330005, emissiveIntensity: 0.5 });
        const crater = new THREE.Mesh(craterGeo, craterMat);
        crater.position.copy(p.relPos);
        this.meshGroup.add(crater);

        if (this.particleManager && this.particleManager.metalDebris) {
          this.particleManager.metalDebris.push({
            mesh: p.mesh,
            geo: p.mesh.geometry,
            mat: p.mesh.material,
            vx: (Math.random() - 0.5) * 12.0,
            vy: 2.5 + (Math.random() - 0.5) * 5.0,
            vz: 7.0 + Math.random() * 15.0,
            rotSpeedX: (Math.random() - 0.5) * 6.0,
            rotSpeedY: (Math.random() - 0.5) * 6.0,
            rotSpeedZ: (Math.random() - 0.5) * 6.0,
            life: 1.0,
            decay: 0.16
          });
        }
      }

      this.particleManager.createExplosion(wp, 0xff0044, 120, 3.8);
      this.particleManager.spawnMetalDebris(wp, 4, 0xff6600);
    }
    return p.isDead;
  }

  takeDamage(targetSubsystem, amount) {
    if (this.isDead) return false;

    if (this.hasShield) {
      if (this.particleManager) {
        this.particleManager.createLaserImpact(this.meshGroup.position, new THREE.Vector3(0, 0, 1), 0x00f3ff);
      }
      return false;
    }

    this.coreHp -= amount;
    if (this.particleManager) {
      this.particleManager.createLaserImpact(this.meshGroup.position, new THREE.Vector3(0, 0, 1), 0xff0044);
    }

    if (this.coreHp <= 0 && !this.isDying) {
      this.isDying = true;
      this.deathTimer = 4.5;
      window.spaceGameManager?.voiceAnnouncer?.speak("Goliath Heavy Battleship Destroyed! Sector Clear!", true);
      return true;
    }
    return false;
  }

  update(dt, playerShip, gameManager) {
    if (this.isDead || !this.meshGroup) return;
    this._time += dt;

    if (this.isDying) {
      this.deathTimer -= dt;
      if (Math.random() < 0.85 && this.particleManager) {
        const offset = new THREE.Vector3((Math.random() - 0.5) * 45, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 60);
        this.particleManager.createExplosion(this.meshGroup.position.clone().add(offset), 0xff7700, 60, 3.0);
        this.particleManager.createExplosion(this.meshGroup.position.clone().add(offset), 0x00f3ff, 40, 2.0);
      }
      this.meshGroup.rotation.z += 0.15 * dt;
      this.meshGroup.rotation.x += 0.08 * dt;
      if (this.deathTimer <= 0) {
        this.destroy();
      }
      return;
    }

    // AAA Engine Exhaust Plume Shimmer & Mach Shock Diamonds
    const exhaustShudder = 1.0 + Math.sin(this._time * 28.0) * 0.12;
    if (this.engineExhaustPlumes) {
      this.engineExhaustPlumes.forEach(p => {
        p.scale.set(exhaustShudder, exhaustShudder, 1.0 + Math.sin(this._time * 30.0) * 0.15);
      });
    }
    if (this.machDiamondRings) {
      this.machDiamondRings.forEach(d => {
        const sc = d.baseScale * (1.0 + Math.sin(this._time * 24.0) * 0.15);
        d.mesh.scale.set(sc, sc, sc);
      });
    }

    // Rotate Shield Generator Rings
    if (this.shieldGenerators) {
      this.shieldGenerators.forEach(g => {
        if (!g.isDead && g.ringMesh) {
          g.ringMesh.rotation.z += 4.0 * dt;
        }
      });
    }

    // Rotate Reticles
    if (this.reticleMeshes) {
      this.reticleMeshes.forEach(ret => {
        if (ret && ret.visible) ret.rotation.z += 2.2 * dt;
      });
    }

    const pos = this.meshGroup.position;
    const playerPos = playerShip && playerShip.meshGroup ? playerShip.meshGroup.position : new THREE.Vector3(0, 0, 0);

    // 1. Advance to battle station
    if (pos.z < this.targetZ) {
      pos.z += this.speed * dt;
    } else {
      // Slow tactical dreadnought strafe
      this.strafeTimer += dt * 0.4;
      pos.x = Math.sin(this.strafeTimer) * 16.0;
      pos.y = 4.0 + Math.cos(this.strafeTimer * 0.8) * 3.5;
    }

    // 2. Heavy Triple-Railgun Tracking
    this.turrets.forEach(turret => {
      if (!turret.isDead && turret.barrelGroup) {
        const localTarget = this.meshGroup.worldToLocal(playerPos.clone());
        turret.barrelGroup.lookAt(localTarget);
      }
    });

    // 3. Railgun Salvo Fire Cycle
    this.railgunTimer -= dt;
    if (this.railgunTimer <= 0 && pos.z >= this.targetZ - 10) {
      this.railgunTimer = 2.8;
      this.turrets.forEach(turret => {
        if (!turret.isDead && turret.mesh && Math.random() < 0.75) {
          const origin = turret.mesh.getWorldPosition(new THREE.Vector3());
          const dir = new THREE.Vector3().subVectors(playerPos, origin).normalize();
          if (gameManager && gameManager.spawnEnemyLaser) {
            gameManager.spawnEnemyLaser(origin, dir, 0xff7700, 52);
          }
        }
      });
    }

    // 4. Missile Silo Pods Salvo Cycle
    this.missileTimer -= dt;
    if (this.missileTimer <= 0 && pos.z >= this.targetZ - 10) {
      this.missileTimer = 3.5;
      this.missilePods.forEach(p => {
        if (!p.isDead && p.mesh) {
          const origin = p.mesh.getWorldPosition(new THREE.Vector3());
          if (gameManager && gameManager.spawnEnemyMissile) {
            gameManager.spawnEnemyMissile(origin, playerPos);
          } else if (gameManager && gameManager.spawnEnemyLaser) {
            const dir = new THREE.Vector3().subVectors(playerPos, origin).normalize();
            gameManager.spawnEnemyLaser(origin, dir, 0xff0044, 40);
          }
        }
      });
    }

    // 5. Spinal Lance Cannon Charging & Firing
    this.spinalLanceTimer -= dt;
    if (this.spinalLanceTimer <= 2.5 && !this.isChargingLance) {
      this.isChargingLance = true;
      this.lanceChargeTime = 2.5;
      if (gameManager && gameManager.spaceHUD) {
        gameManager.spaceHUD.showRadioTransmission("WARNING: Heavy Battleship charging Spinal Kinetic Lance!", "STARBOUND COMMAND", 3.0);
      }
    }

    if (this.isChargingLance) {
      this.lanceChargeTime -= dt;
      if (this.lanceCoreMesh) {
        const scale = 1.0 + (2.5 - this.lanceChargeTime) * 1.8;
        this.lanceCoreMesh.scale.set(scale, scale, scale);
        if (Math.random() < 0.6 && this.particleManager) {
          this.particleManager.createLaserImpact(this.lanceCoreMesh.getWorldPosition(new THREE.Vector3()), new THREE.Vector3(0, 0, 1), 0xff0044);
          this.particleManager.spawnSparks(this.lanceCoreMesh.getWorldPosition(new THREE.Vector3()), new THREE.Vector3(0, 0, 1), 0xff7700, 10);
        }
      }

      if (this.lanceChargeTime <= 0) {
        this.isChargingLance = false;
        this.spinalLanceTimer = 11.0;
        const lanceOrigin = this.meshGroup.position.clone().add(new THREE.Vector3(0, 0, 44));
        const dir = new THREE.Vector3(0, 0, 1);
        if (this.particleManager) {
          this.particleManager.spawnSonicBoomDisc(lanceOrigin, 0xff0044);
          this.particleManager.createExplosion(lanceOrigin, 0xff7700, 90, 3.5);
        }
        if (gameManager && gameManager.spawnEnemyLaser) {
          [-2, 0, 2].forEach(offsetY => {
            gameManager.spawnEnemyLaser(lanceOrigin.clone().add(new THREE.Vector3(0, offsetY, 0)), dir, 0xff0044, 75);
          });
        }
        if (this.lanceCoreMesh) this.lanceCoreMesh.scale.set(1, 1, 1);
      }
    }

    // 6. 💥 Front Triangular Apex Super-Laser Salvo Cycle
    this.apexLaserTimer -= dt;
    if (this.apexCrystalMesh) {
      const pulse = 1.0 + Math.sin(this._time * 12.0) * 0.25;
      this.apexCrystalMesh.scale.set(pulse, pulse, pulse);
    }
    if (this.apexLight) {
      this.apexLight.intensity = 6.0 + Math.sin(this._time * 16.0) * 3.0;
    }

    if (this.apexLaserTimer <= 0 && pos.z >= this.targetZ - 15) {
      this.apexLaserTimer = 2.6 + Math.random() * 0.8;
      const apexOrigin = this.meshGroup.position.clone().add(new THREE.Vector3(0, 0, 63.8));
      const dir = new THREE.Vector3().subVectors(playerPos, apexOrigin).normalize();

      if (this.particleManager) {
        this.particleManager.spawnSonicBoomDisc(apexOrigin, 0xff0044);
        this.particleManager.spawnSparks(apexOrigin, dir, 0xff0055, 20);
      }

      if (gameManager && gameManager.spawnEnemyLaser) {
        [-0.6, 0.6].forEach(offsetSide => {
          const spawnPt = apexOrigin.clone().add(new THREE.Vector3(offsetSide, 0, 0));
          gameManager.spawnEnemyLaser(spawnPt, dir, 0xff0044, 58);
        });
      }
      if (gameManager && gameManager.spaceAudio && gameManager.spaceAudio.playEnemyLaser) {
        gameManager.spaceAudio.playEnemyLaser();
      }
    }
  }

  destroy() {
    this.isDead = true;
    if (this.particleManager) {
      this.particleManager.createExplosion(this.meshGroup.position, 0xff7700, 250, 7.0);
      this.particleManager.createExplosion(this.meshGroup.position, 0xffffff, 180, 5.0);
      this.particleManager.createEmpShockwave(this.meshGroup.position, 160);
    }
    if (this.meshGroup && this.meshGroup.parent) {
      this.meshGroup.parent.remove(this.meshGroup);
    }
  }
}
