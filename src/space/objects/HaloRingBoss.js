import * as THREE from 'three';

// ============================================================
// WAVE 2 BOSS — Halo Megastructure Ring
// AAA Overhaul: 50m diameter open ring, dramatic spoke struts,
// inner terrain glow, 2-phase attack, gravity shockwave ability
// ============================================================
export class HaloRingBoss {
  constructor(scene, particleManager) {
    this.scene = scene;
    this.particleManager = particleManager;

    this.meshGroup = new THREE.Group();
    this.meshGroup.position.set(0, 0, -130);
    this.meshGroup.rotation.x = Math.PI / 5.5; // tilt to show ring face

    this.targetZ = -46;
    this.speed = 6.5;

    this.coreHp = 3500;
    this.maxCoreHp = 3500;
    this.scoreValue = 35000;
    this.isDead = false;
    this.hitRadius = 52;

    this.fireTimer = 0.8;
    this.phase = 1;
    this.gravWaveTimer = 0;
    this._time = 0;
    this.phaseShieldTimer = 0;
    this.justPhaseTransitioned = false;

    this.turrets = [
      { id: 0, relPos: new THREE.Vector3(0,  48, 0), hp: 700, maxHp: 700, isDead: false, mesh: null, light: null },
      { id: 1, relPos: new THREE.Vector3(0, -48, 0), hp: 700, maxHp: 700, isDead: false, mesh: null, light: null },
      { id: 2, relPos: new THREE.Vector3(48,  0, 0), hp: 700, maxHp: 700, isDead: false, mesh: null, light: null },
      { id: 3, relPos: new THREE.Vector3(-48, 0, 0), hp: 700, maxHp: 700, isDead: false, mesh: null, light: null },
      { id: 4, relPos: new THREE.Vector3(34, 34, 0),  hp: 600, maxHp: 600, isDead: false, mesh: null, light: null },
      { id: 5, relPos: new THREE.Vector3(-34,-34, 0), hp: 600, maxHp: 600, isDead: false, mesh: null, light: null },
    ];

    this._build();
    this.scene.add(this.meshGroup);
  }

  _build() {
    const ringR  = 46.0;  // large outer ring radius
    const tubeR  = 3.8;   // tube cross-section

    // ── 1. Outer Bronze Structural Ring — thick and imposing ──
    const outerGeo = new THREE.TorusGeometry(ringR, tubeR, 22, 100);
    const bronzeMat = new THREE.MeshStandardMaterial({
      color: 0x8c5a12,
      emissive: 0x3d1e00,
      emissiveIntensity: 0.5,
      roughness: 0.42,
      metalness: 0.88,
    });
    this.ringMesh = new THREE.Mesh(outerGeo, bronzeMat);
    this.meshGroup.add(this.ringMesh);

    // ── 2. Inner Terrain Habitat Band — glowing ice blue ──
    const innerGeo = new THREE.TorusGeometry(ringR - 1.0, tubeR - 1.4, 18, 100);
    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0xb87a22,
      emissive: 0x00ddff,
      emissiveIntensity: 1.8,
      roughness: 0.25,
      metalness: 0.6,
    });
    this.meshGroup.add(new THREE.Mesh(innerGeo, terrainMat));

    // ── 3. Secondary inner ring — accent band ──
    const accent = new THREE.TorusGeometry(ringR - 5.0, 0.9, 8, 80);
    const accentMat = new THREE.MeshBasicMaterial({ color: 0x00aaff });
    this.meshGroup.add(new THREE.Mesh(accent, accentMat));

    // ── 4. 12 Structural Spoke Struts — the iconic Halo silhouette ──
    const spokeMat = new THREE.MeshStandardMaterial({
      color: 0x5c3608,
      emissive: 0x001a33,
      emissiveIntensity: 0.3,
      roughness: 0.55,
      metalness: 0.92,
    });
    this.hubGroup = new THREE.Group();

    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const spokeLen = ringR - 8;
      const spokeGeo = new THREE.CylinderGeometry(0.7, 0.7, spokeLen, 7);
      const spoke = new THREE.Mesh(spokeGeo, spokeMat);
      spoke.position.set(Math.cos(a) * spokeLen * 0.5, Math.sin(a) * spokeLen * 0.5, 0);
      spoke.rotation.z = -a;
      this.meshGroup.add(spoke);

      // Glowing conduit strip along each spoke
      const condGeo = new THREE.CylinderGeometry(0.12, 0.12, spokeLen * 0.9, 5);
      const condMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
      const cond = new THREE.Mesh(condGeo, condMat);
      cond.position.set(Math.cos(a) * spokeLen * 0.5, Math.sin(a) * spokeLen * 0.5, 0.8);
      cond.rotation.z = -a;
      this.meshGroup.add(cond);
    }

    // ── 5. Central Control Hub — large glowing dodecahedron ──
    const hubGeo = new THREE.DodecahedronGeometry(10.0, 1);
    this.coreMat = new THREE.MeshStandardMaterial({
      color: 0x001a33,
      emissive: 0x00ddff,
      emissiveIntensity: 4.5,
      roughness: 0.08,
      metalness: 0.15,
    });
    this.coreMesh = new THREE.Mesh(hubGeo, this.coreMat);
    this.hubGroup.add(this.coreMesh);
    this.meshGroup.add(this.hubGroup);

    // Hub bright glow light
    this.hubLight = new THREE.PointLight(0x00e5ff, 12.0, 120);
    this.hubLight.position.set(0, 0, 0);
    this.meshGroup.add(this.hubLight);

    // Secondary ring light that illuminates the whole ring from inside
    this.ringLight = new THREE.PointLight(0x00aaff, 5.0, 80);
    this.ringLight.position.set(ringR * 0.6, 0, 0);
    this.meshGroup.add(this.ringLight);

    // ── 6. 3 Gyro Shield Rings at hub ──
    const ringAngles = [0, Math.PI / 3, Math.PI * 2 / 3];
    this.shieldRings = [];
    ringAngles.forEach((ra, idx) => {
      const sGeo = new THREE.TorusGeometry(13, 0.38, 10, 40);
      const sMat = new THREE.MeshBasicMaterial({
        color: idx === 0 ? 0x00e5ff : idx === 1 ? 0x00aaff : 0x0066ff,
        transparent: true, opacity: 0.8,
      });
      const sRing = new THREE.Mesh(sGeo, sMat);
      sRing.rotation.set(ra, ra * 0.5, ra * 0.3);
      this.hubGroup.add(sRing);
      this.shieldRings.push({ mesh: sRing, dir: idx % 2 === 0 ? 1 : -1 });
    });

    // ── 7. Rail-cannon turrets — long single barrel + coil ──
    const baseMat   = new THREE.MeshStandardMaterial({ color: 0x3d1f00, metalness: 0.99, roughness: 0.18 });
    const railMat   = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    this.chargeMat = new THREE.MeshStandardMaterial({ color: 0x001833, emissive: 0x00e5ff, emissiveIntensity: 2.0 });

    this.turrets.forEach(t => {
      const tGroup = new THREE.Group();
      tGroup.position.copy(t.relPos);

      tGroup.add(new THREE.Mesh(new THREE.OctahedronGeometry(3.2, 0), baseMat));

      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 8.0, 7), railMat);
      rail.rotation.x = Math.PI / 2; rail.position.z = 3.5;
      tGroup.add(rail);

      const coil = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.0, 1.5), this.chargeMat);
      coil.position.set(0, 1.2, 2.0);
      tGroup.add(coil);

      this.meshGroup.add(tGroup);
      t.mesh = tGroup;
    });
  }

  takeTurretDamage(turretId, amount) {
    const t = this.turrets.find(t => t.id === turretId);
    if (!t || t.isDead) return false;
    t.hp -= amount;
    if (t.hp <= 0) {
      t.isDead = true;
      t.mesh.visible = false;
      const wp = t.mesh.getWorldPosition(new THREE.Vector3());
      this.particleManager.createExplosion(wp, 0x00e5ff, 60, 2.5);
    }
    return t.isDead;
  }

  takeCoreDamage(amount) {
    if (this.phaseShieldTimer > 0) return false;

    const prevPhase = this.phase;
    this.coreHp -= amount;
    if (this.coreMat) {
      this.coreMat.emissiveIntensity = 10.0;
      if (this.hubLight) this.hubLight.intensity = 25.0;
      setTimeout(() => {
        if (this.coreMat) this.coreMat.emissiveIntensity = 4.5;
        if (this.hubLight) this.hubLight.intensity = 12.0;
      }, 120);
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
    this.particleManager.createExplosion(this.meshGroup.position, 0x00e5ff, 280, 6.0);
    this.particleManager.createExplosion(this.meshGroup.position, 0xb87333, 200, 4.5);
    this.particleManager.createExplosion(this.meshGroup.position, 0xffffff, 100, 3.5);
    this.particleManager.createEmpShockwave(this.meshGroup.position, 120);
  }

  destroy() {
    this.scene.remove(this.meshGroup);
    this.meshGroup.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); });
  }

  update(dt, playerPos) {
    this._time += dt;
    const arrived = this.meshGroup.position.z >= this.targetZ;
    if (!arrived) this.meshGroup.position.z += this.speed * dt;

    // Ring spins on Z — clearly a spinning ring
    const spinSpeed = 0.25 + this.phase * 0.12;
    this.meshGroup.rotation.z += spinSpeed * dt;

    // Hub counter-rotates
    if (this.hubGroup) this.hubGroup.rotation.z -= (1.2 + this.phase * 0.3) * dt;

    // Gyro rings each rotate on different axes
    this.shieldRings.forEach((sr, idx) => {
      if (idx === 0) sr.mesh.rotation.z += sr.dir * 2.5 * dt;
      else if (idx === 1) sr.mesh.rotation.x += sr.dir * 2.2 * dt;
      else sr.mesh.rotation.y += sr.dir * 2.0 * dt;
    });

    // Hub pulse
    if (this.phaseShieldTimer > 0) {
      this.phaseShieldTimer -= dt;
      if (this.hubLight) this.hubLight.intensity = 35.0 + Math.sin(this._time * 35) * 15.0;
      if (this.coreMat) this.coreMat.emissiveIntensity = 20.0 + Math.sin(this._time * 30) * 8.0;
    } else {
      if (this.hubLight) {
        this.hubLight.intensity = 10.0 + Math.sin(this._time * 6) * 3.0 + this.phase * 2.0;
      }
      if (this.coreMat) {
        this.coreMat.emissiveIntensity = 4.0 + Math.sin(this._time * 8) * 0.8;
      }
    }

    // Turret charge lights (emissive animation)
    const chargeRatio = Math.max(0, 1.0 - this.fireTimer / (0.7 / this.phase));
    if (this.chargeMat) {
      this.chargeMat.emissiveIntensity = 2.0 + chargeRatio * 10.0 + Math.sin(this._time * 10) * 0.8;
    }

    // Turret tracking
    if (arrived) {
      this.turrets.forEach(t => {
        if (!t.isDead && t.mesh) {
          const localTarget = this.meshGroup.worldToLocal(playerPos.clone());
          t.mesh.lookAt(localTarget);
        }
      });
    }

    // Gravity shockwave in phase 2+
    if (this.phase >= 2 && arrived) {
      this.gravWaveTimer += dt;
      if (this.gravWaveTimer > (this.phase === 2 ? 6 : 3.5)) {
        this.gravWaveTimer = 0;
        this.particleManager.createEmpShockwave(this.meshGroup.position, 30);
      }
    }

    this.fireTimer -= dt;
    const out = [];
    if (this.fireTimer <= 0 && arrived) {
      this.fireTimer = 0.7 / this.phase;
      this.turrets.forEach(t => {
        if (!t.isDead && t.mesh) out.push(t.mesh.getWorldPosition(new THREE.Vector3()));
      });
    }
    return out.length > 0 ? out : false;
  }
}
