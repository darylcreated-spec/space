import * as THREE from 'three';

/**
 * Procedural Obsidian-Carbon Composite Hull Texture for Boss Dreadnought Flagship
 * Enhanced with Rich Royal Obsidian Violet, Luminous Gold Insets, and Neon Magenta/Cyan Circuitry
 */
function generateDreadnoughtHullTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Rich royal obsidian-violet composite base gradient
  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, '#220e3d');
  grad.addColorStop(0.5, '#160829');
  grad.addColorStop(1, '#2c124e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Heavy faceted armor plate seam lines
  ctx.strokeStyle = '#4a247c';
  ctx.lineWidth = 3.5;
  for (let x = 0; x < 512; x += 64) {
    ctx.strokeRect(x, 0, 64, 512);
  }
  for (let y = 0; y < 512; y += 64) {
    ctx.strokeRect(0, y, 512, 64);
  }

  // Micro-rivets along plating boundaries
  ctx.fillStyle = '#a865f5';
  for (let y = 8; y < 512; y += 32) {
    for (let x = 8; x < 512; x += 64) {
      ctx.beginPath();
      ctx.arc(x, y, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Luminous Gold & Amber Chevron Stripes
  ctx.strokeStyle = '#ffb700';
  ctx.lineWidth = 3.0;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(64 + i * 40, 20);
    ctx.lineTo(84 + i * 40, 48);
    ctx.lineTo(64 + i * 40, 76);
    ctx.stroke();
  }

  // Neon Magenta & Electric Cyan fiber-optic data conduits
  ctx.strokeStyle = '#ff007f';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(0, 128); ctx.lineTo(160, 128); ctx.lineTo(256, 192); ctx.lineTo(512, 192);
  ctx.moveTo(0, 384); ctx.lineTo(200, 384); ctx.lineTo(256, 320); ctx.lineTo(512, 320);
  ctx.stroke();

  ctx.strokeStyle = '#00f3ff';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(0, 200); ctx.lineTo(120, 200); ctx.lineTo(180, 260); ctx.lineTo(512, 260);
  ctx.stroke();

  return new THREE.CanvasTexture(canvas);
}

// ============================================================
// BOSS DREADNOUGHT FLAGSHIP — Void Reaver Heavy Assault Flagship
// 68m Heavy Assault Warship with Armored Kinetic Ram Prow,
// Swept Empennage Dorsal Tail Fin & Multi-Tier Command Citadel,
// Quad Fusion Engine Nacelles with Mach Shock Diamond Plumes,
// 4 Heavy Dual-Railgun Artillery Batteries, 2 Torpedo Pods,
// Dual Shield Generator Pylons, and Suspended Antimatter Core!
// ============================================================
export class BossDreadnought {
  constructor(scene, particleManager) {
    this.scene = scene;
    this.particleManager = particleManager;

    this.meshGroup = new THREE.Group();
    this.meshGroup.position.set(0, 4, -120);

    // -- Telemetry & Subsystems HP --
    this.coreHp = 2500;
    this.maxCoreHp = 2500;
    this.hitRadius = 38.0;
    this.radius = 38.0;
    this.isDead = false;
    this.scoreValue = 35000;

    this.targetZ = -45;
    this.speed = 12.0;
    this._time = 0;

    // ── 1. Dual Deflector Shield Generator Pylons ──
    this.hasShield = true;
    this.shieldGenerators = [
      { id: 0, name: 'PORT DEFLECTOR GENERATOR',      relPos: new THREE.Vector3(-14.0, 3.5, 2), hp: 750, maxHp: 750, isDead: false, mesh: null, ringMesh: null, reticle: null },
      { id: 1, name: 'STARBOARD DEFLECTOR GENERATOR', relPos: new THREE.Vector3( 14.0, 3.5, 2), hp: 750, maxHp: 750, isDead: false, mesh: null, ringMesh: null, reticle: null },
    ];

    // ── 2. Four Heavy Dual-Railgun Artillery Batteries (Elevated Superfiring Hardpoints!) ──
    this.turrets = [
      { id: 0, name: 'PORT FORWARD HEAVY BATTERY',      relPos: new THREE.Vector3(-18.0, 4.8,   8.0), pedestalH: 3.8, hp: 650, maxHp: 650, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 1, name: 'STARBOARD FORWARD HEAVY BATTERY', relPos: new THREE.Vector3( 18.0, 4.8,   8.0), pedestalH: 3.8, hp: 650, maxHp: 650, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 2, name: 'PORT AFT HEAVY BATTERY',          relPos: new THREE.Vector3(-19.5, 4.8, -14.0), pedestalH: 3.8, hp: 650, maxHp: 650, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 3, name: 'STARBOARD AFT HEAVY BATTERY',      relPos: new THREE.Vector3( 19.5, 4.8, -14.0), pedestalH: 3.8, hp: 650, maxHp: 650, isDead: false, mesh: null, barrelGroup: null, reticle: null },
    ];

    // ── 3. Two Heavy Vertical-Launch Torpedo Pods ──
    this.torpedoPods = [
      { id: 0, name: 'PORT TORPEDO POD',      relPos: new THREE.Vector3(-10.0, 4.0, -4.0), hp: 600, maxHp: 600, isDead: false, mesh: null, reticle: null },
      { id: 1, name: 'STARBOARD TORPEDO POD', relPos: new THREE.Vector3( 10.0, 4.0, -4.0), hp: 600, maxHp: 600, isDead: false, mesh: null, reticle: null },
    ];

    this.reticleMeshes = [];
    this.coreGyroRings = [];
    this.engineExhaustPlumes = [];
    this.machDiamondRings = [];

    // Combat Timers
    this.fireTimer = 0.85;
    this.torpedoFireTimer = 3.5;
    this.strafeAngle = 0;
    this.isDying = false;
    this.deathTimer = 0;

    this.buildBossMesh();
    this.scene.add(this.meshGroup);
  }

  buildBossMesh() {
    const hullTex = generateDreadnoughtHullTexture();

    // Vibrant Obsidian Violet / Royal Indigo Hull with High Specular Sheen
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x2b134d,
      bumpMap: hullTex,
      bumpScale: 0.18,
      metalness: 0.95,
      roughness: 0.18,
      emissive: 0x15072b,
      emissiveIntensity: 0.45
    });

    const armorTrussMat = new THREE.MeshStandardMaterial({
      color: 0x421d74,
      metalness: 0.98,
      roughness: 0.14
    });

    const goldAccentMat = new THREE.MeshStandardMaterial({
      color: 0xffb700,
      metalness: 0.95,
      roughness: 0.22,
      emissive: 0x3d2800,
      emissiveIntensity: 0.35
    });

    const darkTrimMat = new THREE.MeshStandardMaterial({
      color: 0x120822,
      metalness: 0.98,
      roughness: 0.2
    });

    const glowCrimsonMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
    const glowMagentaMat = new THREE.MeshBasicMaterial({ color: 0xff007f });
    const glowCyanMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
    const glowAmberMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });

    // ── 1. Faceted Central Warship Hull (48m length, 24m width, 8m height) ──
    const hullGeo = new THREE.BoxGeometry(22, 7, 44);
    const mainHull = new THREE.Mesh(hullGeo, hullMat);
    this.meshGroup.add(mainHull);

    // Kinetic Ram Prow (Chisel-head wedge at prow)
    const prowGeo = new THREE.ConeGeometry(12, 18, 4);
    prowGeo.rotateX(Math.PI / 2);
    prowGeo.scale(1.0, 0.4, 1.0);
    const prow = new THREE.Mesh(prowGeo, armorTrussMat);
    prow.position.set(0, 0, 28);
    this.meshGroup.add(prow);

    // Heavy Titanium Ramming Blade Edge with Radiant Gold Trim
    const bladeGeo = new THREE.BoxGeometry(1.2, 8.0, 22);
    const blade = new THREE.Mesh(bladeGeo, darkTrimMat);
    blade.position.set(0, 0, 26);
    this.meshGroup.add(blade);

    const bladeGoldTrim = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.2, 20), goldAccentMat);
    bladeGoldTrim.position.set(0, 3.8, 26);
    this.meshGroup.add(bladeGoldTrim);

    const prowEnergyStrip = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 18), glowMagentaMat);
    prowEnergyStrip.position.set(0, 0, 27);
    this.meshGroup.add(prowEnergyStrip);

    // ── 2. Multi-Tier Command Citadel Bridge Spire Tower (Dorsal Aft) ──
    const bridgeSpireGeo = new THREE.BoxGeometry(12, 6.5, 20);
    const bridgeSpire = new THREE.Mesh(bridgeSpireGeo, hullMat);
    bridgeSpire.position.set(0, 6.0, -8);
    this.meshGroup.add(bridgeSpire);

    // Bridge Golden Crown Battlements
    const bridgeCrownGeo = new THREE.BoxGeometry(12.6, 1.0, 20.6);
    const bridgeCrown = new THREE.Mesh(bridgeCrownGeo, goldAccentMat);
    bridgeCrown.position.set(0, 9.3, -8);
    this.meshGroup.add(bridgeCrown);

    // Command Bridge Crimson & Magenta Visor
    const visorGeo = new THREE.BoxGeometry(10, 1.6, 4.0);
    const visor = new THREE.Mesh(visorGeo, glowCrimsonMat);
    visor.position.set(0, 8.0, -2);
    this.meshGroup.add(visor);

    // ── ✨ 3. DREADNOUGHT EMPENNAGE DORSAL TAIL FIN & STABILIZERS ──
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, 9.0, -14);

    // Swept Vertical Dorsal Fin
    const tailFinGeo = new THREE.BoxGeometry(1.4, 9.5, 16);
    const tailFin = new THREE.Mesh(tailFinGeo, hullMat);
    tailFin.position.set(0, 3.8, 0);
    tailFin.rotation.x = -0.32; // Swept backwards aggressively
    tailGroup.add(tailFin);

    // Heavy Titanium & Gold Leading Edge Fin Armor Spine
    const tailSpineGeo = new THREE.BoxGeometry(1.8, 10.2, 2.8);
    const tailSpine = new THREE.Mesh(tailSpineGeo, goldAccentMat);
    tailSpine.position.set(0, 4.0, 6.8);
    tailSpine.rotation.x = -0.32;
    tailGroup.add(tailSpine);

    // Luminous Neon Magenta Trailing Edge Beacon Channel
    const tailBeaconGeo = new THREE.BoxGeometry(0.8, 9.0, 0.9);
    const tailBeacon = new THREE.Mesh(tailBeaconGeo, glowMagentaMat);
    tailBeacon.position.set(0, 3.8, -7.0);
    tailBeacon.rotation.x = -0.32;
    tailGroup.add(tailBeacon);

    // Cyan High-Intensity Empennage Mast Antenna Spire
    const tailMastGeo = new THREE.CylinderGeometry(0.18, 0.35, 6.0, 8);
    const tailMast = new THREE.Mesh(tailMastGeo, darkTrimMat);
    tailMast.position.set(0, 9.5, -2.5);
    tailGroup.add(tailMast);

    const mastBeaconGeo = new THREE.SphereGeometry(0.4, 8, 8);
    const mastBeacon = new THREE.Mesh(mastBeaconGeo, glowCyanMat);
    mastBeacon.position.set(0, 12.5, -2.5);
    tailGroup.add(mastBeacon);

    this.meshGroup.add(tailGroup);

    // Twin Cantilevered Ventral Tail Stabilizers (Keel Skegs)
    [-7.5, 7.5].forEach(skx => {
      const skegGeo = new THREE.BoxGeometry(0.9, 4.2, 10.0);
      const skeg = new THREE.Mesh(skegGeo, armorTrussMat);
      skeg.position.set(skx, -4.8, -16);
      skeg.rotation.x = 0.28;
      skeg.rotation.z = (skx < 0 ? -1 : 1) * 0.15;
      this.meshGroup.add(skeg);

      const skegBeacon = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.8, 0.4), glowCyanMat);
      skegBeacon.position.set(skx, -4.8, -20.5);
      skegBeacon.rotation.x = 0.28;
      this.meshGroup.add(skegBeacon);
    });

    // ── 4. Port & Starboard Heavy Armor Wing Sponsons with Radiant Decals ──
    [-18, 18].forEach(wx => {
      const wingGeo = new THREE.BoxGeometry(14, 4.0, 34);
      const wing = new THREE.Mesh(wingGeo, hullMat);
      wing.position.set(wx, 0, -2);
      this.meshGroup.add(wing);

      // Gold Trim Armor Plates along Sponson Outer Ridge
      const wGoldTrim = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 30), goldAccentMat);
      wGoldTrim.position.set(wx < 0 ? wx - 6.5 : wx + 6.5, 1.8, -2);
      this.meshGroup.add(wGoldTrim);

      // Heat Dissipation Radiator Grilles
      const radGeo = new THREE.PlaneGeometry(12, 2.5);
      const rad = new THREE.Mesh(radGeo, glowCrimsonMat);
      rad.position.set(wx, 2.1, -2);
      rad.rotation.x = -Math.PI / 2;
      this.meshGroup.add(rad);

      // Luminous Neon Cyan Lateral Strobe Strips
      const strobeGeo = new THREE.BoxGeometry(0.3, 0.3, 26);
      const strobe = new THREE.Mesh(strobeGeo, glowCyanMat);
      strobe.position.set(wx < 0 ? wx - 7.0 : wx + 7.0, 0, -2);
      this.meshGroup.add(strobe);
    });

    // ── 4. Central Antimatter Plasma Reactor Core & Containment Gyro-Rings ──
    this.coreHousingGroup = new THREE.Group();
    this.coreHousingGroup.position.set(0, 0, 4.0);

    const coreGeo = new THREE.SphereGeometry(3.6, 24, 24);
    this.coreMat = new THREE.MeshStandardMaterial({
      color: 0x3d0016,
      emissive: 0xff0055,
      emissiveIntensity: 5.5,
      metalness: 0.8,
      roughness: 0.1
    });
    this.coreMesh = new THREE.Mesh(coreGeo, this.coreMat);
    this.coreHousingGroup.add(this.coreMesh);

    // Counter-Rotating Gyroscopic Rings
    [4.8, 5.8].forEach((rRad, idx) => {
      const ringGeo = new THREE.TorusGeometry(rRad, 0.35, 8, 32);
      const rMat = new THREE.MeshBasicMaterial({ color: idx === 0 ? 0x00f3ff : 0xff0055, transparent: true, opacity: 0.85 });
      const ring = new THREE.Mesh(ringGeo, rMat);
      this.coreHousingGroup.add(ring);
      this.coreGyroRings.push({ mesh: ring, speed: idx === 0 ? 2.2 : -1.8 });
    });

    this.coreLight = new THREE.PointLight(0xff0055, 15.0, 75);
    this.coreHousingGroup.add(this.coreLight);
    this.meshGroup.add(this.coreHousingGroup);

    // ── 5. Deflector Forcefield Shield Bubble ──
    const shieldGeo = new THREE.IcosahedronGeometry(26.0, 2);
    this.shieldMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending
    });
    this.shieldMesh = new THREE.Mesh(shieldGeo, this.shieldMat);
    this.shieldMesh.position.set(0, 0, 4.0);
    this.meshGroup.add(this.shieldMesh);

    // ── 6. Dual Deflector Shield Generator Pylons ──
    const genPylonGeo = new THREE.CylinderGeometry(1.4, 2.0, 7.0, 8);
    const genRingGeo = new THREE.TorusGeometry(2.4, 0.35, 8, 20);

    this.shieldGenerators.forEach(g => {
      const gGroup = new THREE.Group();
      gGroup.position.copy(g.relPos);

      const pylon = new THREE.Mesh(genPylonGeo, armorTrussMat);
      gGroup.add(pylon);

      const ring = new THREE.Mesh(genRingGeo, glowCyanMat);
      ring.position.set(0, 2.0, 0);
      ring.rotation.x = Math.PI / 2;
      gGroup.add(ring);

      const reticleGeo = new THREE.RingGeometry(2.0, 2.5, 16);
      const reticleMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
      const reticle = new THREE.Mesh(reticleGeo, reticleMat);
      reticle.position.set(0, 2.0, 2.8);
      gGroup.add(reticle);

      this.meshGroup.add(gGroup);
      g.mesh = gGroup;
      g.ringMesh = ring;
      g.reticle = reticle;
      this.reticleMeshes.push(reticle);
    });

    // ── 7. Four Heavy Dual-Railgun Artillery Batteries ──
    const turretBarbetteGeo = new THREE.CylinderGeometry(2.0, 2.6, 1.0, 8);
    const turretHouseGeo = new THREE.BoxGeometry(2.6, 1.4, 3.2);
    const barrelGeo = new THREE.CylinderGeometry(0.2, 0.26, 4.8, 8);
    barrelGeo.rotateX(Math.PI / 2);
    const coilGeo = new THREE.TorusGeometry(0.32, 0.08, 6, 12);

    this.turrets.forEach(t => {
      const tGroup = new THREE.Group();
      tGroup.position.copy(t.relPos);

      // Armored Riser Pedestal
      const pedH = t.pedestalH || 3.0;
      const pedGeo = new THREE.CylinderGeometry(2.4, 3.2, pedH, 8);
      const pedMesh = new THREE.Mesh(pedGeo, armorTrussMat);
      pedMesh.position.set(0, -pedH / 2, 0);
      tGroup.add(pedMesh);

      const barbette = new THREE.Mesh(turretBarbetteGeo, armorTrussMat);
      tGroup.add(barbette);

      const bGroup = new THREE.Group();
      bGroup.position.set(0, 0.7, 0);

      const house = new THREE.Mesh(turretHouseGeo, hullMat);
      bGroup.add(house);

      [-0.7, 0.7].forEach(xOff => {
        const barrel = new THREE.Mesh(barrelGeo, armorTrussMat);
        barrel.position.set(xOff, 0.2, 2.0);
        bGroup.add(barrel);

        [1.0, 2.2, 3.4].forEach(zC => {
          const coil = new THREE.Mesh(coilGeo, glowCrimsonMat);
          coil.position.set(xOff, 0.2, zC);
          bGroup.add(coil);
        });
      });

      tGroup.add(bGroup);

      const reticleGeo = new THREE.RingGeometry(1.8, 2.3, 16);
      const reticleMat = new THREE.MeshBasicMaterial({ color: 0xff0055, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
      const reticle = new THREE.Mesh(reticleGeo, reticleMat);
      reticle.position.set(0, 1.0, 3.0);
      tGroup.add(reticle);

      this.meshGroup.add(tGroup);
      t.mesh = tGroup;
      t.barrelGroup = bGroup;
      t.reticle = reticle;
      this.reticleMeshes.push(reticle);
    });

    // ── 8. Two Heavy Vertical-Launch Torpedo Pods ──
    const podGeo = new THREE.BoxGeometry(3.6, 2.0, 5.0);
    this.torpedoPods.forEach(p => {
      const pGroup = new THREE.Group();
      pGroup.position.copy(p.relPos);

      const housing = new THREE.Mesh(podGeo, armorTrussMat);
      pGroup.add(housing);

      [-1.0, 0, 1.0].forEach(xOff => {
        [-1.2, 1.2].forEach(zOff => {
          const tubeGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.8, 8);
          const tube = new THREE.Mesh(tubeGeo, glowAmberMat);
          tube.position.set(xOff, 1.0, zOff);
          pGroup.add(tube);
        });
      });

      const reticleGeo = new THREE.RingGeometry(1.6, 2.1, 16);
      const reticleMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
      const reticle = new THREE.Mesh(reticleGeo, reticleMat);
      reticle.position.set(0, 1.8, 0);
      reticle.rotation.x = Math.PI / 2;
      pGroup.add(reticle);

      this.meshGroup.add(pGroup);
      p.mesh = pGroup;
      p.reticle = reticle;
      this.reticleMeshes.push(reticle);
    });

    // ── 9. Quad Heavy Fusion Engine Nacelles with AAA Mach Shock Diamond Plumes ──
    const shockMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending });
    const coreFlameMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 });

    [[-8, 0], [8, 0], [-18, 0], [18, 0]].forEach(([nx, ny]) => {
      const nacelleGeo = new THREE.CylinderGeometry(2.8, 1.8, 6.0, 10);
      nacelleGeo.rotateX(Math.PI / 2);
      const nacelle = new THREE.Mesh(nacelleGeo, darkTrimMat);
      nacelle.position.set(nx, ny, -24);
      this.meshGroup.add(nacelle);

      // Outer Crimson Flame Cone
      const outerPlumeGeo = new THREE.ConeGeometry(2.4, 9.0, 10);
      outerPlumeGeo.rotateX(-Math.PI / 2);
      const outerPlume = new THREE.Mesh(outerPlumeGeo, glowCrimsonMat);
      outerPlume.position.set(nx, ny, -30);
      this.meshGroup.add(outerPlume);
      this.engineExhaustPlumes.push(outerPlume);

      // Inner Core Flame
      const innerCoreGeo = new THREE.ConeGeometry(1.2, 7.0, 8);
      innerCoreGeo.rotateX(-Math.PI / 2);
      const innerCore = new THREE.Mesh(innerCoreGeo, coreFlameMat);
      innerCore.position.set(nx, ny, -28.5);
      this.meshGroup.add(innerCore);

      // Mach Shock Diamond Rings
      [-3.5, -6.5].forEach((zD, sIdx) => {
        const diamondGeo = new THREE.TorusGeometry(1.4 - sIdx * 0.3, 0.15, 6, 16);
        const diamond = new THREE.Mesh(diamondGeo, shockMat);
        diamond.position.set(nx, ny, -24 + zD);
        this.meshGroup.add(diamond);
        this.machDiamondRings.push({ mesh: diamond, baseScale: 1.0 - sIdx * 0.15 });
      });

      const eLight = new THREE.PointLight(0xff0055, 6.0, 45);
      eLight.position.set(nx, ny, -26);
      this.meshGroup.add(eLight);
    });
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

        // Leave charred scorched mounting ring on dreadnought
        const scorchGeo = new THREE.CylinderGeometry(2.4, 2.8, 0.4, 8);
        const scorchMat = new THREE.MeshStandardMaterial({ color: 0x100a18, metalness: 0.98, roughness: 0.85, emissive: 0x002233, emissiveIntensity: 0.8 });
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

      this.particleManager.createExplosion(wp, 0x00f3ff, 120, 3.5);
      this.particleManager.createEmpShockwave(wp, 45);
      this.particleManager.spawnMetalDebris(wp, 4, 0x1f1128);

      const aliveGens = this.shieldGenerators.filter(gen => !gen.isDead);
      if (aliveGens.length === 0 && this.hasShield) {
        this.hasShield = false;
        if (this.shieldMesh) this.shieldMesh.visible = false;
        this.particleManager.createEmpShockwave(this.meshGroup.position, 80);
        window.spaceGameManager?.voiceAnnouncer?.speak("Dreadnought Deflector Shield Collapsed! Strike the Antimatter Reactor Core!", true);
        if (window.spaceGameManager?.spaceHUD) {
          window.spaceGameManager.spaceHUD.showRadioTransmission("SHIELD COLLAPSED! All squadrons focus fire on the Dreadnought's Antimatter Core!", "STARBOUND COMMAND", 6.0);
        }
      }
    }
    return g.isDead;
  }

  takeTurretDamage(turretId, amount) {
    const t = this.turrets.find(tur => tur.id === turretId);
    if (!t || t.isDead) return false;
    t.hp -= amount;

    if (t.reticle && t.reticle.material) {
      const pct = t.hp / t.maxHp;
      t.reticle.material.color.setHex(pct > 0.5 ? 0xff0055 : (pct > 0.25 ? 0xffaa00 : 0xff0000));
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

        // Leave charred scorched barbette stump with glowing conduits
        const stumpGeo = new THREE.CylinderGeometry(2.0, 2.6, 1.0, 8);
        const stumpMat = new THREE.MeshStandardMaterial({ color: 0x120a16, metalness: 0.98, roughness: 0.85, emissive: 0x330011, emissiveIntensity: 0.8 });
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

      this.particleManager.createExplosion(wp, 0xff0055, 90, 2.8);
      this.particleManager.createEmpShockwave(wp, 35);
      this.particleManager.spawnMetalDebris(wp, 4, 0xff0055);
    }
    return t.isDead;
  }

  takeTorpedoPodDamage(podId, amount) {
    const p = this.torpedoPods.find(pod => pod.id === podId);
    if (!p || p.isDead) return false;
    p.hp -= amount;

    if (p.reticle && p.reticle.material) {
      const pct = p.hp / p.maxHp;
      p.reticle.material.color.setHex(pct > 0.5 ? 0xffaa00 : (pct > 0.25 ? 0xff5500 : 0xff0000));
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

        // Leave scorched torpedo silo crater
        const craterGeo = new THREE.BoxGeometry(2.4, 0.4, 4.4);
        const craterMat = new THREE.MeshStandardMaterial({ color: 0x100a18, metalness: 0.98, roughness: 0.85, emissive: 0x331100, emissiveIntensity: 0.6 });
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

      this.particleManager.createExplosion(wp, 0xffaa00, 100, 3.2);
      this.particleManager.spawnMetalDebris(wp, 4, 0xffaa00);
    }
    return p.isDead;
  }

  takeDamage(targetSubsystem, amount) {
    if (this.isDead) return false;

    // Direct core damage only allowed once shield is down
    if (this.hasShield) {
      if (this.particleManager) {
        this.particleManager.createLaserImpact(this.meshGroup.position, new THREE.Vector3(0, 0, 1), 0x00f3ff);
      }
      return false;
    }

    this.coreHp -= amount;
    if (this.particleManager) {
      this.particleManager.createLaserImpact(this.meshGroup.position, new THREE.Vector3(0, 0, 1), 0xff0055);
    }

    if (this.coreHp <= 0 && !this.isDying) {
      this.triggerDeathSequence();
      return true;
    }
    return false;
  }

  triggerDeathSequence() {
    this.isDying = true;
    this.deathTimer = 4.0;

    window.spaceGameManager?.voiceAnnouncer?.speak("Dreadnought Flagship Destroyed! Sector Clear!", true);
    if (window.spaceGameManager?.spaceHUD) {
      window.spaceGameManager.spaceHUD.showRadioTransmission("DREADNOUGHT FLAGSHIP CRITICAL MELTDOWN! OUTSTANDING WORK PILOT!", "STARBOUND COMMAND", 7.0);
    }
  }

  update(dt, playerShip, gameManager) {
    if (this.isDead || !this.meshGroup) return;

    if (this.isDying) {
      this.deathTimer -= dt;
      if (Math.random() < 0.9 && this.particleManager) {
        const offset = new THREE.Vector3((Math.random() - 0.5) * 45, (Math.random() - 0.5) * 16, (Math.random() - 0.5) * 65);
        this.particleManager.createExplosion(this.meshGroup.position.clone().add(offset), 0xff0044, 75, 4.5);
        this.particleManager.createExplosion(this.meshGroup.position.clone().add(offset), 0xffaa00, 55, 3.5);
        this.particleManager.spawnSparks(this.meshGroup.position.clone().add(offset), new THREE.Vector3(0, 1, 0), 0xffffff, 20);
      }
      this.meshGroup.rotation.z += 0.14 * dt;
      this.meshGroup.rotation.x += 0.07 * dt;
      this.meshGroup.position.y -= 2.2 * dt;
      if (this.deathTimer <= 0) {
        this.destroy();
      }
      return false;
    }

    // Progressive hull damage smoke
    if (this.coreHp < this.maxCoreHp * 0.5 && Math.random() < 0.35 && this.particleManager) {
      const offset = new THREE.Vector3((Math.random() - 0.5) * 25, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 35);
      this.particleManager.spawnEngineParticle(this.meshGroup.position.clone().add(offset), 0x222222);
      this.particleManager.spawnSparks(this.meshGroup.position.clone().add(offset), new THREE.Vector3(0, 1, 0), 0xff0044, 8);
    }

    this._time += dt;

    const pos = this.meshGroup.position;
    const playerPos = playerShip && playerShip.meshGroup ? playerShip.meshGroup.position : new THREE.Vector3(0, 0, 0);

    // 1. Advance to battle station
    if (pos.z < this.targetZ) {
      pos.z += this.speed * dt;
    }

    // 2. Side-to-side strafing oscillation
    this.strafeAngle += dt * 0.8;
    pos.x = Math.sin(this.strafeAngle) * 14.0;

    // 3. AAA Engine Exhaust Shimmer & Mach Shock Diamond Pulsation
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

    // 4. Rotate Shield Generator Rings & Core Gyro-Rings
    if (this.shieldGenerators) {
      this.shieldGenerators.forEach(g => {
        if (!g.isDead && g.ringMesh) {
          g.ringMesh.rotation.z += 4.0 * dt;
        }
      });
    }
    if (this.coreGyroRings) {
      this.coreGyroRings.forEach(cg => {
        cg.mesh.rotation.x += cg.speed * dt;
        cg.mesh.rotation.y += cg.speed * 0.7 * dt;
      });
    }

    // 5. Shield Bubble Animation
    if (this.shieldMesh && this.hasShield) {
      this.shieldMesh.rotation.y += 0.4 * dt;
      this.shieldMesh.rotation.z += 0.2 * dt;
      if (this.shieldMat) {
        this.shieldMat.opacity = 0.4 + Math.sin(this._time * 6.0) * 0.15;
      }
    }

    // 6. Reticles Rotation
    if (this.reticleMeshes) {
      this.reticleMeshes.forEach(ret => {
        if (ret && ret.visible) ret.rotation.z += 2.2 * dt;
      });
    }

    // 7. Death Sequence & Cascading Detonations
    if (this.isDying) {
      this.deathTimer -= dt;

      if (Math.random() < 0.85 && this.particleManager) {
        const offset = new THREE.Vector3((Math.random() - 0.5) * 35, (Math.random() - 0.5) * 15, (Math.random() - 0.5) * 45);
        this.particleManager.createExplosion(pos.clone().add(offset), 0xff0055, 45, 2.2);
        this.particleManager.createExplosion(pos.clone().add(offset), 0x00f3ff, 30, 1.6);
      }

      this.meshGroup.rotation.z += 0.25 * dt;
      this.meshGroup.rotation.x += 0.12 * dt;
      pos.y -= 1.5 * dt;

      if (this.deathTimer <= 0) {
        this.destroy();
      }
      return;
    }

    // 8. Heavy Railgun Turrets Aiming & Attack Loop
    this.fireTimer -= dt;
    const out = [];

    if (this.turrets) {
      this.turrets.forEach(t => {
        if (!t.isDead && t.barrelGroup) {
          const localTarget = this.meshGroup.worldToLocal(playerPos.clone());
          localTarget.y = Math.max(localTarget.y, t.relPos.y + 0.2);
          t.barrelGroup.lookAt(this.meshGroup.localToWorld(localTarget));
        }
      });
    }

    if (this.fireTimer <= 0 && pos.z >= this.targetZ - 10) {
      this.fireTimer = 0.85;
      this.turrets.forEach(t => {
        if (!t.isDead && t.mesh && Math.random() < 0.8) {
          const wp = t.mesh.getWorldPosition(new THREE.Vector3());
          out.push(wp);
          if (gameManager && gameManager.spawnEnemyLaser) {
            const dir = new THREE.Vector3().subVectors(playerPos, wp).normalize();
            gameManager.spawnEnemyLaser(wp, dir, 0xff0055, 50);
          }
        }
      });
    }

    // 9. Torpedo Pod Salvo Loop
    this.torpedoFireTimer -= dt;
    if (this.torpedoFireTimer <= 0 && pos.z >= this.targetZ - 10) {
      this.torpedoFireTimer = 3.8;
      this.torpedoPods.forEach(p => {
        if (!p.isDead && p.mesh) {
          const wp = p.mesh.getWorldPosition(new THREE.Vector3());
          if (this.particleManager) {
            this.particleManager.createExplosion(wp, 0xffaa00, 15, 0.6);
          }
          if (gameManager && gameManager.spawnEnemyMissile) {
            gameManager.spawnEnemyMissile(wp, playerPos);
          } else if (gameManager && gameManager.spawnEnemyLaser) {
            const dir = new THREE.Vector3().subVectors(playerPos, wp).normalize();
            gameManager.spawnEnemyLaser(wp, dir, 0xffaa00, 42);
          }
        }
      });
    }

    return out.length > 0 ? out : false;
  }

  destroy() {
    this.isDead = true;
    if (this.particleManager && this.meshGroup && this.meshGroup.position) {
      this.particleManager.createExplosion(this.meshGroup.position, 0xff0055, 200, 6.0);
      this.particleManager.createExplosion(this.meshGroup.position, 0xffffff, 150, 4.5);
      this.particleManager.createEmpShockwave(this.meshGroup.position, 180);
    }
    if (this.meshGroup && this.meshGroup.parent) {
      this.meshGroup.parent.remove(this.meshGroup);
    }
  }
}
