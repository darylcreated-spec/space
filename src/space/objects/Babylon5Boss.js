import * as THREE from 'three';

/**
 * Procedural Armor Texture for Industrial Cylinder Citadel Hull
 */
function generateCylinderHullTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Base industrial gunmetal slate
  ctx.fillStyle = '#1e2838';
  ctx.fillRect(0, 0, 512, 512);

  // Heavy steel structural girders & seams
  ctx.strokeStyle = '#3d4f68';
  ctx.lineWidth = 3;
  for (let x = 0; x < 512; x += 64) {
    ctx.strokeRect(x, 0, 64, 512);
  }
  for (let y = 0; y < 512; y += 64) {
    ctx.strokeRect(0, y, 512, 64);
  }

  // Micro-rivets along plating edges
  ctx.fillStyle = '#8ea4c2';
  for (let y = 8; y < 512; y += 32) {
    for (let x = 8; x < 512; x += 64) {
      ctx.beginPath();
      ctx.arc(x, y, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Hazard warning chevron stripes
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

  // Glowing orange conduit energy tracks
  ctx.strokeStyle = '#ff7700';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, 256); ctx.lineTo(160, 256); ctx.lineTo(224, 192); ctx.lineTo(512, 192);
  ctx.stroke();

  return new THREE.CanvasTexture(canvas);
}

// ============================================================
// WAVE 3 FINAL BOSS — Babylon 5 Industrial Rotating Cylinder Citadel
// AAA Overhaul: 80m faceted O'Neill cylinder, 3 contra-rotating
// habitat centrifuge rings, forward fusion reactor lance,
// 8 ultra-defined triple-railgun batteries, vectoring thrusters
// ============================================================
export class Babylon5Boss {
  constructor(scene, particleManager) {
    this.scene = scene;
    this.particleManager = particleManager;

    this.meshGroup = new THREE.Group();
    this.meshGroup.position.set(0, 0, -135);

    this.targetZ = -92;
    this.speed = 6.5;

    this.coreHp = 6000;
    this.maxCoreHp = 6000;
    this.scoreValue = 60000;
    this.isDead = false;
    this.hitRadius = 40;

    this.fireTimer = 0.7;
    this.phase = 1;
    this.plasmaCannonTimer = 0;
    this._time = 0;
    this.phaseShieldTimer = 0;
    this.justPhaseTransitioned = false;

    // 8 Heavy Defense Batteries mounted across the cylinder quadrants
    this.turrets = [
      { id: 0, name: 'FORWARD DORSAL TURRET',  relPos: new THREE.Vector3(0,  15.5,  26), hp: 900, maxHp: 900, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 1, name: 'FORWARD VENTRAL TURRET', relPos: new THREE.Vector3(0, -15.5,  26), hp: 900, maxHp: 900, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 2, name: 'MID PORT TURRET',        relPos: new THREE.Vector3( 15.5, 0,  10), hp: 900, maxHp: 900, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 3, name: 'MID STARBOARD TURRET',   relPos: new THREE.Vector3(-15.5, 0,  10), hp: 900, maxHp: 900, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 4, name: 'AFT PORT TURRET',        relPos: new THREE.Vector3( 15.5, 0, -12), hp: 900, maxHp: 900, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 5, name: 'AFT STARBOARD TURRET',   relPos: new THREE.Vector3(-15.5, 0, -12), hp: 900, maxHp: 900, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 6, name: 'AFT DORSAL TURRET',      relPos: new THREE.Vector3(0,  15.5, -28), hp: 800, maxHp: 800, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 7, name: 'AFT VENTRAL TURRET',     relPos: new THREE.Vector3(0, -15.5, -28), hp: 800, maxHp: 800, isDead: false, mesh: null, barrelGroup: null, reticle: null },
    ];

    this.reticleMeshes = [];
    this.habitatRings = [];
    this._build();
    this.scene.add(this.meshGroup);
  }

  _build() {
    const len = 76.0;
    const cR  = 12.5;
    const armorTex = generateCylinderHullTexture();

    // ── 1. Main Faceted Fuselage Cylinder ──
    const hullGeo = new THREE.CylinderGeometry(cR, cR + 2.0, len, 16, 1);
    hullGeo.rotateX(Math.PI / 2);
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x334458,
      bumpMap: armorTex,
      bumpScale: 0.12,
      roughness: 0.22,
      metalness: 0.92,
      emissive: 0x101a26,
      emissiveIntensity: 0.35,
      flatShading: true,
    });
    this.spireMesh = new THREE.Mesh(hullGeo, hullMat);
    this.meshGroup.add(this.spireMesh);

    // ── 2. Heavy Titanium Reinforcing Armor Ribs ──
    const ribMat = new THREE.MeshStandardMaterial({ color: 0x1a2636, metalness: 0.95, roughness: 0.2 });
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });

    [-30, -15, 0, 15, 30].forEach(zOff => {
      const ribGeo = new THREE.TorusGeometry(cR + 2.4, 0.9, 10, 36);
      const rib = new THREE.Mesh(ribGeo, ribMat);
      rib.position.z = zOff;
      this.meshGroup.add(rib);

      const sGeo = new THREE.TorusGeometry(cR + 2.6, 0.25, 8, 36);
      const s = new THREE.Mesh(sGeo, stripeMat);
      s.position.z = zOff;
      this.meshGroup.add(s);
    });

    // ── 3. 3 MASSIVE Contra-Rotating Centrifuge Habitat Rings ──
    const ringPositions = [-18, 2, 22];
    const ringSpeeds    = [0.9, -1.2, 1.0];
    const ringRadii     = [cR + 10.0, cR + 11.5, cR + 9.5];

    const spokeMat = new THREE.MeshStandardMaterial({ color: 0x223044, metalness: 0.95, roughness: 0.2 });
    const windowMat = new THREE.MeshBasicMaterial({ color: 0xffdd88 });

    ringPositions.forEach((zOff, idx) => {
      const rGroup = new THREE.Group();
      rGroup.position.z = zOff;

      // Outer Structural Ring Torus
      const rGeo = new THREE.TorusGeometry(ringRadii[idx], 2.2, 16, 50);
      const rMat = new THREE.MeshStandardMaterial({
        color: 0x3d4f68,
        metalness: 0.94,
        roughness: 0.18,
        emissive: idx === 1 ? 0xff4400 : 0xff7700,
        emissiveIntensity: 0.55
      });
      const ring = new THREE.Mesh(rGeo, rMat);
      rGroup.add(ring);

      // Inset Illuminated Habitat Observation Windows
      const winGeo = new THREE.TorusGeometry(ringRadii[idx] + 0.2, 0.45, 8, 50);
      const winMesh = new THREE.Mesh(winGeo, windowMat);
      rGroup.add(winMesh);

      // 6 Radial Structural Spoke Struts
      for (let s = 0; s < 6; s++) {
        const sAng = (s / 6) * Math.PI * 2;
        const spkGeo = new THREE.BoxGeometry(0.9, ringRadii[idx], 1.2);
        const spoke = new THREE.Mesh(spkGeo, spokeMat);
        spoke.position.set(Math.cos(sAng) * ringRadii[idx] * 0.5, Math.sin(sAng) * ringRadii[idx] * 0.5, 0);
        spoke.rotation.z = sAng + Math.PI / 2;
        rGroup.add(spoke);

        // Flashing Warning Strobe
        const strobeGeo = new THREE.SphereGeometry(0.4, 8, 8);
        const strobeMat = new THREE.MeshBasicMaterial({ color: s % 2 === 0 ? 0xff6600 : 0x00f3ff });
        const strobe = new THREE.Mesh(strobeGeo, strobeMat);
        strobe.position.set(Math.cos(sAng) * (ringRadii[idx] + 2.2), Math.sin(sAng) * (ringRadii[idx] + 2.2), 0);
        rGroup.add(strobe);
      }

      this.meshGroup.add(rGroup);
      this.habitatRings.push({ group: rGroup, speedZ: ringSpeeds[idx], mat: rMat });

      // Centrifuge Glow Light
      const rLight = new THREE.PointLight(idx === 1 ? 0xff4400 : 0xff8800, 6.0, 75);
      rLight.position.set(0, 0, zOff);
      this.meshGroup.add(rLight);
    });

    // ── 4. Forward Fusion Reactor Lance Bay ──
    const bayGeo = new THREE.CylinderGeometry(11.5, 9.0, 8.0, 20);
    bayGeo.rotateX(Math.PI / 2);
    this.coreMat = new THREE.MeshStandardMaterial({
      color: 0x2b1005,
      emissive: 0xff3300,
      emissiveIntensity: 4.5,
      roughness: 0.1,
      metalness: 0.9,
    });
    this.coreMesh = new THREE.Mesh(bayGeo, this.coreMat);
    this.coreMesh.position.z = len / 2 + 4.0;
    this.meshGroup.add(this.coreMesh);

    // Flared Mantlet Armor Rings
    const bayRimGeo = new THREE.TorusGeometry(12.5, 1.8, 12, 36);
    const bayRimMat = new THREE.MeshStandardMaterial({ color: 0x223044, metalness: 0.98, roughness: 0.2 });
    const bayRim = new THREE.Mesh(bayRimGeo, bayRimMat);
    bayRim.position.z = len / 2 + 1.0;
    this.meshGroup.add(bayRim);

    // Churning Core Plasma Sphere
    const orbGeo = new THREE.SphereGeometry(6.0, 24, 24);
    const orbMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const orb = new THREE.Mesh(orbGeo, orbMat);
    orb.position.z = len / 2 + 2.0;
    this.meshGroup.add(orb);

    // Intense Forward Reactor Core Light
    this.coreLight = new THREE.PointLight(0xff4400, 16.0, 130);
    this.coreLight.position.z = len / 2 + 8.0;
    this.meshGroup.add(this.coreLight);

    // Plasma Accelerator Ring
    const cannonRingGeo = new THREE.TorusGeometry(9.5, 0.9, 10, 28);
    this.cannonRingMat = new THREE.MeshStandardMaterial({ color: 0x1f2e42, emissive: 0xff6600, emissiveIntensity: 1.8 });
    const cannonRing = new THREE.Mesh(cannonRingGeo, this.cannonRingMat);
    cannonRing.position.z = len / 2 + 2.5;
    this.meshGroup.add(cannonRing);

    // ── 5. Rear Vectoring Fusion Engine Array & Shock Diamonds ──
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x111c28, metalness: 0.98, roughness: 0.2 });
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff7700 });
    const machDiamondMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    [[-8, 8], [-8, -8], [8, 8], [8, -8], [0, 0]].forEach(([x, y], i) => {
      const isCenter = i === 4;
      const nozzleGeo = new THREE.CylinderGeometry(isCenter ? 3.8 : 2.2, isCenter ? 2.8 : 1.6, 5.0, 12);
      nozzleGeo.rotateX(Math.PI / 2);
      const nozzle = new THREE.Mesh(nozzleGeo, darkMat);
      nozzle.position.set(x, y, -len / 2 - 2.0);
      this.meshGroup.add(nozzle);

      // Plasma Thrust Plume
      const flameGeo = new THREE.ConeGeometry(isCenter ? 3.0 : 1.8, isCenter ? 6.5 : 4.5, 10);
      flameGeo.rotateX(Math.PI / 2);
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.set(x, y, -len / 2 - 5.0);
      this.meshGroup.add(flame);

      // Mach Shock Diamond
      const diamondGeo = new THREE.OctahedronGeometry(isCenter ? 1.0 : 0.6, 0);
      const diamond = new THREE.Mesh(diamondGeo, machDiamondMat);
      diamond.position.set(x, y, -len / 2 - 4.2);
      this.meshGroup.add(diamond);
    });

    const rearLight = new THREE.PointLight(0xff6600, 8.0, 90);
    rearLight.position.z = -len / 2 - 10.0;
    this.meshGroup.add(rearLight);

    // ── 6. 8 Ultra-Defined Triple-Railgun Heavy Batteries ──
    const barbetteGeo = new THREE.CylinderGeometry(3.0, 3.8, 1.4, 8);
    barbetteGeo.rotateX(Math.PI / 2);
    const barbetteMat = new THREE.MeshStandardMaterial({ color: 0x1c283c, metalness: 0.94, roughness: 0.2 });
    const houseGeo = new THREE.BoxGeometry(3.2, 1.6, 3.4);
    const houseMat = new THREE.MeshStandardMaterial({ color: 0x36485e, metalness: 0.96, roughness: 0.18 });

    const barrelGeo = new THREE.CylinderGeometry(0.24, 0.32, 5.2, 8);
    barrelGeo.rotateX(Math.PI / 2);
    this.barrelMat = new THREE.MeshStandardMaterial({ color: 0x7c94b2, metalness: 0.95, roughness: 0.15 });

    const coilGeo = new THREE.TorusGeometry(0.36, 0.08, 6, 12);
    const glowOrangeMat = new THREE.MeshBasicMaterial({ color: 0xff7700 });
    const visorMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });

    this.turrets.forEach(t => {
      const tGroup = new THREE.Group();
      tGroup.position.copy(t.relPos);

      // Barbette foundation
      const barbette = new THREE.Mesh(barbetteGeo, barbetteMat);
      tGroup.add(barbette);

      // Gunhouse Carapace (Tracks Player)
      const bGroup = new THREE.Group();
      bGroup.position.set(0, 0, 1.0);

      const house = new THREE.Mesh(houseGeo, houseMat);
      house.position.set(0, 0.2, 0);
      bGroup.add(house);

      // Optical Targeting Visor
      const visor = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.35, 0.4), visorMat);
      visor.position.set(0, 0.8, 1.4);
      bGroup.add(visor);

      // Triple Railgun Barrels
      [-1.1, 0, 1.1].forEach(xOff => {
        const barrel = new THREE.Mesh(barrelGeo, this.barrelMat);
        barrel.position.set(xOff, 0.2, 2.6);
        bGroup.add(barrel);

        // Magnetic induction coils
        [1.0, 2.4, 3.8].forEach(zC => {
          const coil = new THREE.Mesh(coilGeo, glowOrangeMat);
          coil.position.set(xOff, 0.2, zC);
          bGroup.add(coil);
        });

        // Muzzle ring
        const muzzle = new THREE.Mesh(coilGeo, glowOrangeMat);
        muzzle.position.set(xOff, 0.2, 5.2);
        bGroup.add(muzzle);
      });

      tGroup.add(bGroup);

      // 3D Target Reticle
      const reticleGeo = new THREE.RingGeometry(2.0, 2.4, 16);
      const reticleMat = new THREE.MeshBasicMaterial({ color: 0xff7700, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
      const reticle = new THREE.Mesh(reticleGeo, reticleMat);
      reticle.position.set(0, 0, 3.8);
      tGroup.add(reticle);

      this.meshGroup.add(tGroup);
      t.mesh = tGroup;
      t.barrelGroup = bGroup;
      t.reticle = reticle;
      this.reticleMeshes.push(reticle);
    });
  }

  takeTurretDamage(turretId, amount) {
    const t = this.turrets.find(tur => tur.id === turretId);
    if (!t || t.isDead) return false;
    t.hp -= amount;

    if (t.reticle && t.reticle.material) {
      const pct = t.hp / t.maxHp;
      t.reticle.material.color.setHex(pct > 0.5 ? 0xff7700 : (pct > 0.25 ? 0xffaa00 : 0xff0044));
    }

    if (t.hp <= 0) {
      t.isDead = true;
      t.mesh.visible = false;
      if (t.reticle) t.reticle.visible = false;
      const wp = t.mesh.getWorldPosition(new THREE.Vector3());
      this.particleManager.createExplosion(wp, 0xff7700, 100, 3.5);
    }
    return t.isDead;
  }

  takeCoreDamage(amount) {
    if (this.phaseShieldTimer > 0) return false;

    const prevPhase = this.phase;
    this.coreHp -= amount;

    if (this.coreMat) {
      this.coreMat.emissiveIntensity = 12.0;
      if (this.coreLight) this.coreLight.intensity = 35.0;
      setTimeout(() => {
        if (this.coreMat) this.coreMat.emissiveIntensity = 4.5 + this.phase;
        if (this.coreLight) this.coreLight.intensity = 14.0 + this.phase * 2;
      }, 130);
    }

    const hpRatio = this.coreHp / this.maxCoreHp;
    if (hpRatio < 0.5 && this.phase === 1) { this.phase = 2; }
    if (hpRatio < 0.25 && this.phase === 2) { this.phase = 3; }

    if (this.phase > prevPhase) {
      this.phaseShieldTimer = 3.0; // 3 seconds phase protection
      this.justPhaseTransitioned = true;
    }

    if (this.coreHp <= 0 && !this.isDead) {
      this.isDead = true;
      this._explode();
    }
    return this.isDead;
  }

  _explode() {
    this.particleManager.createExplosion(this.meshGroup.position, 0xff4400, 400, 7.5);
    this.particleManager.createExplosion(this.meshGroup.position, 0xffaa00, 300, 6.0);
    this.particleManager.createExplosion(this.meshGroup.position, 0xff0000, 200, 4.5);
    this.particleManager.createEmpShockwave(this.meshGroup.position, 180);
  }

  destroy() {
    this.scene.remove(this.meshGroup);
    this.meshGroup.traverse(c => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    });
  }

  update(dt, playerPos) {
    this._time += dt;
    const arrived = this.meshGroup.position.z >= this.targetZ;
    if (!arrived) this.meshGroup.position.z += this.speed * dt;

    // 1. Fuselage Axial Rotation
    if (this.spireMesh) {
      this.spireMesh.rotation.z += (0.08 + this.phase * 0.03) * dt;
    }

    // 2. 3 Contra-Rotating Habitat Centrifuge Rings
    if (this.habitatRings) {
      this.habitatRings.forEach(r => {
        r.group.rotation.z += r.speedZ * (1.0 + this.phase * 0.2) * dt;
        r.mat.emissiveIntensity = 0.25 + Math.sin(this._time * 4.0) * 0.1;
      });
    }

    // 3. 3D Target Reticles Rotation
    if (this.reticleMeshes) {
      this.reticleMeshes.forEach(ret => {
        if (ret && ret.visible) ret.rotation.z += 2.0 * dt;
      });
    }

    // 4. Forward Fusion Core Breathing Light
    if (this.phaseShieldTimer > 0) {
      this.phaseShieldTimer -= dt;
      if (this.coreMat) this.coreMat.emissiveIntensity = 25.0 + Math.sin(this._time * 35) * 10.0;
      if (this.coreLight) this.coreLight.intensity = 50.0 + Math.sin(this._time * 30) * 10.0;
    } else {
      if (this.coreMesh && this.coreMat) {
        const pulse = 4.5 + Math.sin(this._time * (3 + this.phase * 2)) * 1.5;
        this.coreMat.emissiveIntensity = pulse;
        if (this.coreLight) this.coreLight.intensity = 14.0 + pulse;
      }
    }

    // 5. Plasma Cannon Ring Arc Charging
    if (this.cannonRingMat) {
      this.cannonRingMat.emissiveIntensity = 1.4 + Math.sin(this._time * 8.0) * 0.8;
    }

    // 6. Turrets Dynamic 3D Tracking
    if (arrived && playerPos) {
      this.turrets.forEach(t => {
        if (!t.isDead && t.barrelGroup) {
          t.barrelGroup.lookAt(playerPos);
        }
      });
    }

    // 7. Weapon Firing Loop
    this.fireTimer -= dt;
    const out = [];
    if (this.fireTimer <= 0 && arrived) {
      this.fireTimer = 0.65 / this.phase;
      this.turrets.forEach(t => {
        if (!t.isDead && t.mesh) out.push(t.mesh.getWorldPosition(new THREE.Vector3()));
      });
    }
    return out.length > 0 ? out : false;
  }
}
