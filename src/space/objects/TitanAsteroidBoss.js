import * as THREE from 'three';

/**
 * Procedural Volcanic Basalt & Molten Magma Fissure Texture for Titan Asteroid Colossus
 */
function generateTitanBasaltTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Dark obsidian basalt rock base
  ctx.fillStyle = '#1c141d';
  ctx.fillRect(0, 0, 512, 512);

  // Basalt rock noise & crater stippling
  ctx.fillStyle = '#2d1e2e';
  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = Math.random() * 6 + 1;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Glowing molten lava veins & tectonic fissures
  ctx.strokeStyle = '#ff3300';
  ctx.lineWidth = 3.5;
  ctx.shadowColor = '#ff6600';
  ctx.shadowBlur = 8;
  for (let i = 0; i < 12; i++) {
    ctx.beginPath();
    let cx = Math.random() * 512;
    let cy = Math.random() * 512;
    ctx.moveTo(cx, cy);
    for (let j = 0; j < 5; j++) {
      cx += (Math.random() - 0.5) * 90;
      cy += (Math.random() - 0.5) * 90;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }

  // High-temperature white-hot magma branch cores
  ctx.strokeStyle = '#ffdd44';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    let cx = Math.random() * 512;
    let cy = Math.random() * 512;
    ctx.moveTo(cx, cy);
    for (let j = 0; j < 4; j++) {
      cx += (Math.random() - 0.5) * 70;
      cy += (Math.random() - 0.5) * 70;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }

  return new THREE.CanvasTexture(canvas);
}

// ============================================================
// TITAN ASTEROID COLOSSUS — Ancient Planetoid Fortress
// 80m Massive Volcanic Asteroid with Fracturing Tectonic Armor Plates,
// Cybernetic Mining Gantries & Crater Defense Batteries,
// 4 Molten Magma Eruption Calderas, 12 Orbiting Satellite Debris Boulders,
// Thermal Plasma Geyser Thrusters, and Ancient Superheated Core!
// ============================================================
export class TitanAsteroidBoss {
  constructor(scene, particleManager) {
    this.scene = scene;
    this.particleManager = particleManager;

    this.meshGroup = new THREE.Group();
    this.meshGroup.position.set(0, 4, -130);

    // -- Boss Telemetry & Stats --
    this.coreHp = 4500;
    this.maxCoreHp = 4500;
    this.hitRadius = 45.0;
    this.radius = 45.0;
    this.isDead = false;
    this.scoreValue = 40000;

    this.targetZ = -45;
    this.speed = 9.0;
    this._time = 0;

    // ── Dynamic Planetoid Mass & Rotational Inertia Physics ──
    this.baseMass = 1200000; // 1,200,000 Metric Tons
    this.mass = this.baseMass;
    this.massRatio = 1.0;
    this.baseRotationSpeed = 0.15;
    this.rotationSpeed = this.baseRotationSpeed;

    // ── 1. Four Heavy Tectonic Armor Crust Plates (Protecting the Core) ──
    this.armorPlates = [
      { id: 0, name: 'NORTH DORSAL TECTONIC CRUST',   relPos: new THREE.Vector3(  0,  18,  12), hp: 900, maxHp: 900, isDead: false, mesh: null, reticle: null },
      { id: 1, name: 'SOUTH VENTRAL TECTONIC CRUST',  relPos: new THREE.Vector3(  0, -18,  12), hp: 900, maxHp: 900, isDead: false, mesh: null, reticle: null },
      { id: 2, name: 'PORT FLANK TECTONIC CRUST',     relPos: new THREE.Vector3(-18,   0,  12), hp: 900, maxHp: 900, isDead: false, mesh: null, reticle: null },
      { id: 3, name: 'STARBOARD FLANK TECTONIC CRUST', relPos: new THREE.Vector3( 18,   0,  12), hp: 900, maxHp: 900, isDead: false, mesh: null, reticle: null },
    ];

    // ── 2. Four Ancient Crater Railgun Batteries (Cybernetic Upgrades) ──
    this.turrets = [
      { id: 0, name: 'APEX CRATER RAILGUN',       relPos: new THREE.Vector3(  0,  20, -5), hp: 700, maxHp: 700, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 1, name: 'PORT CRATER RAILGUN',       relPos: new THREE.Vector3(-22,   0, -5), hp: 700, maxHp: 700, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 2, name: 'STARBOARD CRATER RAILGUN',  relPos: new THREE.Vector3( 22,   0, -5), hp: 700, maxHp: 700, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 3, name: 'VENTRAL CRATER RAILGUN',    relPos: new THREE.Vector3(  0, -20, -5), hp: 700, maxHp: 700, isDead: false, mesh: null, barrelGroup: null, reticle: null },
    ];

    // ── 3. Four Volcanic Magma Eruption Calderas ──
    this.calderas = [
      { id: 0, name: 'NORTH-WEST MAGMA CALDERA', relPos: new THREE.Vector3(-12,  12, 16), hp: 800, maxHp: 800, isDead: false, mesh: null, reticle: null },
      { id: 1, name: 'NORTH-EAST MAGMA CALDERA', relPos: new THREE.Vector3( 12,  12, 16), hp: 800, maxHp: 800, isDead: false, mesh: null, reticle: null },
      { id: 2, name: 'SOUTH-WEST MAGMA CALDERA', relPos: new THREE.Vector3(-12, -12, 16), hp: 800, maxHp: 800, isDead: false, mesh: null, reticle: null },
      { id: 3, name: 'SOUTH-EAST MAGMA CALDERA', relPos: new THREE.Vector3( 12, -12, 16), hp: 800, maxHp: 800, isDead: false, mesh: null, reticle: null },
    ];

    this.reticleMeshes = [];
    this.orbitingDebris = [];
    this.coreGyroRings = [];
    this.engineExhaustPlumes = [];
    this.machDiamondRings = [];

    // Combat Timers
    this.fireTimer = 0.9;
    this.magmaEruptTimer = 3.2;
    this.isDying = false;
    this.deathTimer = 0;

    this.buildTitanMesh();
    this.scene.add(this.meshGroup);
  }

  buildTitanMesh() {
    const basaltTex = generateTitanBasaltTexture();

    const basaltMat = new THREE.MeshStandardMaterial({
      color: 0x221626,
      bumpMap: basaltTex,
      bumpScale: 0.22,
      roughness: 0.75,
      metalness: 0.35,
      flatShading: true
    });

    const cyberArmorMat = new THREE.MeshStandardMaterial({
      color: 0x1f2e3d,
      metalness: 0.95,
      roughness: 0.2,
      emissive: 0x091420,
      emissiveIntensity: 0.3
    });

    const moltenCoreMat = new THREE.MeshStandardMaterial({
      color: 0x4a1804,
      emissive: 0xff5500,
      emissiveIntensity: 6.0,
      metalness: 0.6,
      roughness: 0.15
    });

    const glowCyanMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
    const glowAmberMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    const glowMagmaMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });

    // ── 1. Colossal Deformed Asteroid Core Body (80m Diameter) ──
    const asteroidGeo = new THREE.DodecahedronGeometry(22.0, 3);
    const posAttr = asteroidGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      const vz = posAttr.getZ(i);
      const noise = 1.0 + (Math.sin(vx * 0.2) + Math.cos(vy * 0.2) + Math.sin(vz * 0.2)) * 0.18;
      posAttr.setXYZ(i, vx * noise, vy * noise, vz * noise);
    }
    asteroidGeo.computeVertexNormals();

    this.rockBodyMesh = new THREE.Mesh(asteroidGeo, basaltMat);
    this.meshGroup.add(this.rockBodyMesh);

    // Glowing Lava Fissure Wireframe Lines
    const wireGeo = new THREE.EdgesGeometry(asteroidGeo);
    const wireMat = new THREE.LineBasicMaterial({ color: 0xff3300, transparent: true, opacity: 0.65 });
    const wireMesh = new THREE.LineSegments(wireGeo, wireMat);
    this.meshGroup.add(wireMesh);

    // ── 2. Ancient Molten Core & Containment Gyro Rings ──
    this.coreHousingGroup = new THREE.Group();
    this.coreHousingGroup.position.set(0, 0, 0);

    const coreGeo = new THREE.SphereGeometry(6.5, 24, 24);
    this.coreMesh = new THREE.Mesh(coreGeo, moltenCoreMat);
    this.coreHousingGroup.add(this.coreMesh);

    // Rotating Core Gyroscopic Energy Rings
    [8.5, 10.5].forEach((rRad, idx) => {
      const ringGeo = new THREE.TorusGeometry(rRad, 0.4, 8, 32);
      const rMat = new THREE.MeshBasicMaterial({ color: idx === 0 ? 0xffaa00 : 0x00f3ff, transparent: true, opacity: 0.85 });
      const ring = new THREE.Mesh(ringGeo, rMat);
      this.coreHousingGroup.add(ring);
      this.coreGyroRings.push({ mesh: ring, speed: idx === 0 ? 2.0 : -1.6 });
    });

    this.coreLight = new THREE.PointLight(0xff5500, 20.0, 90);
    this.coreHousingGroup.add(this.coreLight);
    this.meshGroup.add(this.coreHousingGroup);

    // ── 3. Four Fracturing Tectonic Armor Crust Plates ──
    const plateGeo = new THREE.BoxGeometry(14, 14, 4.5);
    this.armorPlates.forEach(ap => {
      const pGroup = new THREE.Group();
      pGroup.position.copy(ap.relPos);

      const plate = new THREE.Mesh(plateGeo, cyberArmorMat);
      pGroup.add(plate);

      // Coolant pipes on plate
      const pipeGeo = new THREE.CylinderGeometry(0.35, 0.35, 13, 6);
      pipeGeo.rotateZ(Math.PI / 2);
      const pipe = new THREE.Mesh(pipeGeo, glowCyanMat);
      pipe.position.set(0, 0, 2.4);
      pGroup.add(pipe);

      // Target reticle
      const reticleGeo = new THREE.RingGeometry(2.4, 3.0, 16);
      const reticleMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
      const reticle = new THREE.Mesh(reticleGeo, reticleMat);
      reticle.position.set(0, 0, 3.5);
      pGroup.add(reticle);

      this.meshGroup.add(pGroup);
      ap.mesh = pGroup;
      ap.reticle = reticle;
      this.reticleMeshes.push(reticle);
    });

    // ── 4. Four Ancient Cybernetic Crater Railgun Batteries ──
    const barbetteGeo = new THREE.CylinderGeometry(2.4, 3.2, 1.4, 8);
    const houseGeo = new THREE.BoxGeometry(3.2, 1.8, 4.0);
    const barrelGeo = new THREE.CylinderGeometry(0.24, 0.32, 6.0, 8);
    barrelGeo.rotateX(Math.PI / 2);
    const coilGeo = new THREE.TorusGeometry(0.4, 0.1, 6, 12);

    this.turrets.forEach(t => {
      const tGroup = new THREE.Group();
      tGroup.position.copy(t.relPos);

      const barbette = new THREE.Mesh(barbetteGeo, cyberArmorMat);
      tGroup.add(barbette);

      const bGroup = new THREE.Group();
      bGroup.position.set(0, 0.9, 0);

      const house = new THREE.Mesh(houseGeo, cyberArmorMat);
      bGroup.add(house);

      [-0.9, 0.9].forEach(xOff => {
        const barrel = new THREE.Mesh(barrelGeo, cyberArmorMat);
        barrel.position.set(xOff, 0.2, 2.5);
        bGroup.add(barrel);

        [1.2, 2.6, 4.0].forEach(zC => {
          const coil = new THREE.Mesh(coilGeo, glowAmberMat);
          coil.position.set(xOff, 0.2, zC);
          bGroup.add(coil);
        });
      });

      tGroup.add(bGroup);

      const reticleGeo = new THREE.RingGeometry(2.0, 2.5, 16);
      const reticleMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
      const reticle = new THREE.Mesh(reticleGeo, reticleMat);
      reticle.position.set(0, 1.2, 3.8);
      tGroup.add(reticle);

      this.meshGroup.add(tGroup);
      t.mesh = tGroup;
      t.barrelGroup = bGroup;
      t.reticle = reticle;
      this.reticleMeshes.push(reticle);
    });

    // ── 5. Four Volcanic Magma Eruption Calderas ──
    const calderaConeGeo = new THREE.CylinderGeometry(3.5, 4.8, 2.2, 12);
    this.calderas.forEach(c => {
      const cGroup = new THREE.Group();
      cGroup.position.copy(c.relPos);

      const cone = new THREE.Mesh(calderaConeGeo, basaltMat);
      cGroup.add(cone);

      const magmaVat = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.0, 1.5, 10), moltenCoreMat);
      magmaVat.position.set(0, 0.8, 0);
      cGroup.add(magmaVat);

      const reticleGeo = new THREE.RingGeometry(1.8, 2.3, 16);
      const reticleMat = new THREE.MeshBasicMaterial({ color: 0xff3300, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
      const reticle = new THREE.Mesh(reticleGeo, reticleMat);
      reticle.position.set(0, 1.6, 1.8);
      cGroup.add(reticle);

      this.meshGroup.add(cGroup);
      c.mesh = cGroup;
      c.reticle = reticle;
      this.reticleMeshes.push(reticle);
    });

    // ── 6. Twelve Orbiting Satellite Debris Boulders (Shield Ring Cloud) ──
    for (let i = 0; i < 12; i++) {
      const debGeo = new THREE.DodecahedronGeometry(1.8 + Math.random() * 1.5, 1);
      const debMesh = new THREE.Mesh(debGeo, basaltMat);
      const dist = 32.0 + (i % 3) * 6.0;
      const angle = (i / 12) * Math.PI * 2;
      debMesh.position.set(Math.cos(angle) * dist, Math.sin(angle) * dist, (Math.random() - 0.5) * 12);
      this.meshGroup.add(debMesh);
      this.orbitingDebris.push({ mesh: debMesh, dist: dist, angle: angle, speed: 0.4 + (i % 2 === 0 ? 0.3 : -0.3) });
    }

    // ── 7. Four Thermal Plasma Geyser Rock Thrusters with Mach Shock Diamonds ──
    const shockMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending });
    const coreFlameMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 });

    [[-14, -14, -22], [14, -14, -22], [-14, 14, -22], [14, 14, -22]].forEach(([gx, gy, gz]) => {
      const ventGeo = new THREE.CylinderGeometry(3.0, 4.2, 3.5, 10);
      ventGeo.rotateX(Math.PI / 2);
      const vent = new THREE.Mesh(ventGeo, cyberArmorMat);
      vent.position.set(gx, gy, gz);
      this.meshGroup.add(vent);

      // Outer Flame Plume
      const plumeGeo = new THREE.ConeGeometry(2.6, 12.0, 10);
      plumeGeo.rotateX(-Math.PI / 2);
      const plume = new THREE.Mesh(plumeGeo, glowMagmaMat);
      plume.position.set(gx, gy, gz - 9.0);
      this.meshGroup.add(plume);
      this.engineExhaustPlumes.push(plume);

      // Inner White Core
      const innerCoreGeo = new THREE.ConeGeometry(1.4, 9.5, 8);
      innerCoreGeo.rotateX(-Math.PI / 2);
      const innerCore = new THREE.Mesh(innerCoreGeo, coreFlameMat);
      innerCore.position.set(gx, gy, gz - 7.5);
      this.meshGroup.add(innerCore);

      // Mach Shock Diamonds
      [-4.0, -7.5].forEach((zD, sIdx) => {
        const diamondGeo = new THREE.TorusGeometry(1.5 - sIdx * 0.35, 0.18, 6, 16);
        const diamond = new THREE.Mesh(diamondGeo, shockMat);
        diamond.position.set(gx, gy, gz + zD);
        this.meshGroup.add(diamond);
        this.machDiamondRings.push({ mesh: diamond, baseScale: 1.0 - sIdx * 0.2 });
      });

      const gLight = new THREE.PointLight(0xff5500, 8.0, 50);
      gLight.position.set(gx, gy, gz - 3.0);
      this.meshGroup.add(gLight);
    });
  }

  takeArmorPlateDamage(plateId, amount) {
    const ap = this.armorPlates.find(p => p.id === plateId);
    if (!ap || ap.isDead) return false;
    ap.hp -= amount;

    if (ap.reticle && ap.reticle.material) {
      const pct = ap.hp / ap.maxHp;
      ap.reticle.material.color.setHex(pct > 0.5 ? 0x00f3ff : (pct > 0.25 ? 0xffaa00 : 0xff0044));
    }

    if (ap.hp <= 0) {
      ap.isDead = true;
      if (ap.reticle) ap.reticle.visible = false;

      // ⚖️ Dynamically Reduce Asteroid Planetoid Mass as Crust Plates Shatter!
      this.mass = Math.max(this.baseMass * 0.35, this.mass - 200000);
      this.massRatio = this.mass / this.baseMass;
      this.rotationSpeed = this.baseRotationSpeed * (1.0 + (1.0 - this.massRatio) * 1.6);

      const wp = new THREE.Vector3();
      if (ap.mesh && ap.mesh.parent) {
        ap.mesh.getWorldPosition(wp);
        const wq = new THREE.Quaternion();
        const ws = new THREE.Vector3();
        ap.mesh.getWorldQuaternion(wq);
        ap.mesh.getWorldScale(ws);

        // Detach plate and tumble through 3D space
        ap.mesh.parent.remove(ap.mesh);
        ap.mesh.position.copy(wp);
        ap.mesh.quaternion.copy(wq);
        ap.mesh.scale.copy(ws);
        this.scene.add(ap.mesh);

        if (this.particleManager && this.particleManager.metalDebris) {
          this.particleManager.metalDebris.push({
            mesh: ap.mesh,
            geo: ap.mesh.geometry,
            mat: ap.mesh.material,
            vx: (Math.random() - 0.5) * 16.0,
            vy: 4.0 + (Math.random() - 0.5) * 10.0,
            vz: 10.0 + Math.random() * 20.0,
            rotSpeedX: (Math.random() - 0.5) * 6.0,
            rotSpeedY: (Math.random() - 0.5) * 6.0,
            rotSpeedZ: (Math.random() - 0.5) * 6.0,
            life: 1.0,
            decay: 0.16
          });
        }
      }

      this.particleManager.createExplosion(wp, 0x00f3ff, 140, 4.0);
      this.particleManager.createExplosion(wp, 0xff5500, 100, 3.0);
      this.particleManager.createEmpShockwave(wp, 50);

      const alivePlates = this.armorPlates.filter(p => !p.isDead).length;
      if (alivePlates > 0) {
        window.spaceGameManager?.voiceAnnouncer?.speak(`Tectonic Armor Crust fractured! ${alivePlates} crust plates remain!`, true);
      } else {
        window.spaceGameManager?.voiceAnnouncer?.speak("ALL TECTONIC ARMOR FRACTURED! TITAN ASTEROID CORE EXPOSED!", true);
        if (window.spaceGameManager?.spaceHUD) {
          window.spaceGameManager.spaceHUD.showRadioTransmission("CORE EXPOSED! All ships concentrate fire on the Molten Magma Core!", "STARBOUND COMMAND", 7.0);
        }
      }
    }
    return ap.isDead;
  }

  takeTurretDamage(turretId, amount) {
    const t = this.turrets.find(tur => tur.id === turretId);
    if (!t || t.isDead) return false;
    t.hp -= amount;

    if (t.reticle && t.reticle.material) {
      const pct = t.hp / t.maxHp;
      t.reticle.material.color.setHex(pct > 0.5 ? 0xffaa00 : (pct > 0.25 ? 0xff5500 : 0xff0000));
    }

    if (t.hp <= 0) {
      t.isDead = true;
      t.mesh.visible = false;
      if (t.reticle) t.reticle.visible = false;
      const wp = t.mesh.getWorldPosition(new THREE.Vector3());
      this.particleManager.createExplosion(wp, 0xffaa00, 100, 3.2);
      this.particleManager.createEmpShockwave(wp, 35);
    }
    return t.isDead;
  }

  takeCalderaDamage(calderaId, amount) {
    const c = this.calderas.find(cal => cal.id === calderaId);
    if (!c || c.isDead) return false;
    c.hp -= amount;

    if (c.reticle && c.reticle.material) {
      const pct = c.hp / c.maxHp;
      c.reticle.material.color.setHex(pct > 0.5 ? 0xff3300 : (pct > 0.25 ? 0xffaa00 : 0xff0000));
    }

    if (c.hp <= 0) {
      c.isDead = true;
      c.mesh.visible = false;
      if (c.reticle) c.reticle.visible = false;
      const wp = c.mesh.getWorldPosition(new THREE.Vector3());
      this.particleManager.createExplosion(wp, 0xff5500, 120, 3.8);
      this.particleManager.createExplosion(wp, 0xffaa00, 80, 2.5);
    }
    return c.isDead;
  }

  takeCoreDamage(amount, isCrit = false) {
    if (this.isDead) return false;

    let finalDmg = isCrit ? amount * 2.5 : amount;

    // Check if any tectonic armor plates are alive
    const alivePlates = this.armorPlates.filter(p => !p.isDead);
    if (alivePlates.length > 0) {
      // Direct damage to the first living tectonic armor plate so player shots always wear down the armor!
      const targetPlate = alivePlates[0];
      this.takeArmorPlateDamage(targetPlate.id, finalDmg);
      // Also apply 25% bleedthrough damage to the core
      this.coreHp = Math.max(1, this.coreHp - finalDmg * 0.25);
    } else {
      // Armor broken! Full direct core damage
      this.coreHp -= finalDmg;
    }

    if (this.particleManager) {
      this.particleManager.createLaserImpact(this.meshGroup.position, new THREE.Vector3(0, 0, 1), 0xff5500);
    }

    if (this.coreHp <= 0 && !this.isDying) {
      this.triggerDeathSequence();
      return true;
    }
    return false;
  }

  takeDamage(targetSubsystem, amount) {
    if (this.isDead) return false;
    return this.takeCoreDamage(amount, false);
  }

  getHealthRatio() {
    const totalPlatesHp = this.armorPlates ? this.armorPlates.reduce((acc, p) => acc + (p.isDead ? 0 : p.hp), 0) : 0;
    const maxPlatesHp = this.armorPlates ? this.armorPlates.reduce((acc, p) => acc + p.maxHp, 0) : 0;
    const currentTotal = Math.max(0, this.coreHp) + totalPlatesHp;
    const maxTotal = this.maxCoreHp + maxPlatesHp;
    return Math.max(0, currentTotal / maxTotal);
  }

  triggerDeathSequence() {
    this.isDying = true;
    this.deathTimer = 3.2;

    window.spaceGameManager?.voiceAnnouncer?.speak("PLANETOID SHELL FRACTURING! CRUST COLLAPSING!", true, "STARBOUND COMMAND");
    if (window.spaceGameManager?.spaceHUD) {
      window.spaceGameManager.spaceHUD.showRadioTransmission("PLANETOID BREACHED! Outer tectonic shell is detonating! Prepare for emergency core emergence!", "STARBOUND COMMAND", 5.0);
    }
  }

  update(dt, playerShip, gameManager) {
    if (this.isDead || !this.meshGroup) return;
    this._time += dt;

    const pos = this.meshGroup.position;
    const playerPos = playerShip && playerShip.meshGroup ? playerShip.meshGroup.position : new THREE.Vector3(0, 0, 0);

    // 1. Advance to battle station
    if (pos.z < this.targetZ) {
      pos.z += this.speed * dt;
    }

    // 2. Planetoid tumbling rotation (accelerates as mass sheds)
    if (this.rockBodyMesh) {
      this.rockBodyMesh.rotation.y += this.rotationSpeed * dt;
      this.rockBodyMesh.rotation.x += (this.rotationSpeed * 0.55) * dt;
    }

    // 3. Orbiting Satellite Debris Boulders
    if (this.orbitingDebris) {
      this.orbitingDebris.forEach(deb => {
        deb.angle += deb.speed * dt;
        deb.mesh.position.x = Math.cos(deb.angle) * deb.dist;
        deb.mesh.position.y = Math.sin(deb.angle) * deb.dist;
        deb.mesh.rotation.x += 0.5 * dt;
        deb.mesh.rotation.y += 0.7 * dt;
      });
    }

    // 4. AAA Plasma Geyser Thruster Shimmer & Mach Shock Diamonds
    const exhaustShudder = 1.0 + Math.sin(this._time * 28.0) * 0.14;
    if (this.engineExhaustPlumes) {
      this.engineExhaustPlumes.forEach(p => {
        p.scale.set(exhaustShudder, exhaustShudder, 1.0 + Math.sin(this._time * 32.0) * 0.18);
      });
    }
    if (this.machDiamondRings) {
      this.machDiamondRings.forEach(d => {
        const sc = d.baseScale * (1.0 + Math.sin(this._time * 24.0) * 0.16);
        d.mesh.scale.set(sc, sc, sc);
      });
    }

    // 5. Rotate Core Gyro-Rings
    if (this.coreGyroRings) {
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

    // 7. Death Sequence & Cascading Planetoid Detonations
    if (this.isDying) {
      this.deathTimer -= dt;

      if (Math.random() < 0.9 && this.particleManager) {
        const offset = new THREE.Vector3((Math.random() - 0.5) * 45, (Math.random() - 0.5) * 45, (Math.random() - 0.5) * 45);
        this.particleManager.createExplosion(pos.clone().add(offset), 0xff5500, 60, 3.2);
        this.particleManager.createExplosion(pos.clone().add(offset), 0xffffff, 45, 2.5);
      }

      this.meshGroup.rotation.z += 0.2 * dt;
      this.meshGroup.rotation.y += 0.3 * dt;
      pos.y -= 1.2 * dt;

      if (this.deathTimer <= 0) {
        this.destroy();
      }
      return;
    }

    // 8. Cybernetic Crater Railguns Aiming & Attack Loop
    this.fireTimer -= dt;
    const out = [];

    if (this.turrets) {
      this.turrets.forEach(t => {
        if (!t.isDead && t.barrelGroup) {
          t.barrelGroup.lookAt(playerPos);
        }
      });
    }

    if (this.fireTimer <= 0 && pos.z >= this.targetZ - 10) {
      this.fireTimer = 0.9;
      this.turrets.forEach(t => {
        if (!t.isDead && t.mesh && Math.random() < 0.8) {
          const wp = t.mesh.getWorldPosition(new THREE.Vector3());
          out.push(wp);
          if (gameManager && gameManager.spawnEnemyLaser) {
            const dir = new THREE.Vector3().subVectors(playerPos, wp).normalize();
            gameManager.spawnEnemyLaser(wp, dir, 0xffaa00, 48);
          }
        }
      });
    }

    // 9. Volcanic Caldera Magma Bomb Salvo Loop
    this.magmaEruptTimer -= dt;
    if (this.magmaEruptTimer <= 0 && pos.z >= this.targetZ - 10) {
      this.magmaEruptTimer = 3.5;
      this.calderas.forEach(c => {
        if (!c.isDead && c.mesh) {
          const wp = c.mesh.getWorldPosition(new THREE.Vector3());
          if (this.particleManager) {
            this.particleManager.createExplosion(wp, 0xff5500, 25, 1.2);
          }
          if (gameManager && gameManager.spawnEnemyMissile) {
            gameManager.spawnEnemyMissile(wp, playerPos);
          } else if (gameManager && gameManager.spawnEnemyLaser) {
            const dir = new THREE.Vector3().subVectors(playerPos, wp).normalize();
            gameManager.spawnEnemyLaser(wp, dir, 0xff3300, 40);
          }
        }
      });
    }

    return out.length > 0 ? out : false;
  }

  destroy() {
    this.isDead = true;
    const pos = this.meshGroup ? this.meshGroup.position.clone() : new THREE.Vector3(0, 0, -45);
    
    if (this.particleManager) {
      this.particleManager.createExplosion(pos, 0xffffff, 350, 9.0);
      this.particleManager.createExplosion(pos, 0xff5500, 300, 7.5);
      this.particleManager.createEmpShockwave(pos, 250);
      if (this.particleManager.spawnSonicBoomDisc) {
        this.particleManager.spawnSonicBoomDisc(pos, 0xff3300);
      }
    }
    if (this.meshGroup && this.meshGroup.parent) {
      this.meshGroup.parent.remove(this.meshGroup);
    }

    // 🚀 SPAWN THE INNER SHIP: Titan Core Flagship emerging from the fractured asteroid!
    if (window.spaceGameManager && window.spaceGameManager.spawnAsteroidCoreFlagship) {
      window.spaceGameManager.spawnAsteroidCoreFlagship(pos);
    }
  }
}
