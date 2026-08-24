import * as THREE from 'three';

/**
 * Procedural Texture for Forerunner Outer Armor Shell
 */
function generateHaloArmorTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Base metallic titanium-silver
  ctx.fillStyle = '#4b5b70';
  ctx.fillRect(0, 0, 512, 512);

  // Precision panel seams
  ctx.strokeStyle = '#2d3b4e';
  ctx.lineWidth = 3;
  for (let x = 0; x < 512; x += 64) {
    ctx.strokeRect(x, 0, 64, 512);
  }
  for (let y = 0; y < 512; y += 64) {
    ctx.strokeRect(0, y, 512, 64);
  }

  // Specular rivets
  ctx.fillStyle = '#b0c4de';
  for (let y = 8; y < 512; y += 32) {
    for (let x = 8; x < 512; x += 64) {
      ctx.beginPath();
      ctx.arc(x, y, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Glowing cyan Forerunner glyph conduits
  ctx.strokeStyle = '#00f3ff';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, 128); ctx.lineTo(128, 128); ctx.lineTo(192, 192); ctx.lineTo(512, 192);
  ctx.moveTo(0, 384); ctx.lineTo(256, 384); ctx.lineTo(320, 320); ctx.lineTo(512, 320);
  ctx.stroke();

  return new THREE.CanvasTexture(canvas);
}

/**
 * Procedural Texture for Inward Terraformed Biosphere Ribbon
 */
function generateHaloBiosphereTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Deep azure ocean backdrop
  ctx.fillStyle = '#06182c';
  ctx.fillRect(0, 0, 1024, 256);

  // Archipelago landmasses & continents
  ctx.fillStyle = '#1e4d2b';
  for (let i = 0; i < 24; i++) {
    const cx = (i * 45) + Math.random() * 10;
    const cy = 60 + Math.random() * 136;
    const rw = 25 + Math.random() * 35;
    const rh = 20 + Math.random() * 30;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rw, rh, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mountain ridges and highlands
  ctx.fillStyle = '#6b7a82';
  for (let i = 0; i < 18; i++) {
    const cx = (i * 58) + 15;
    const cy = 80 + Math.random() * 96;
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.fill();
  }

  // Atmospheric cloud bands
  ctx.fillStyle = 'rgba(230, 245, 255, 0.45)';
  for (let i = 0; i < 30; i++) {
    const cx = Math.random() * 1024;
    const cy = Math.random() * 256;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 30 + Math.random() * 40, 6 + Math.random() * 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.repeat.set(4, 1);
  return texture;
}

// ============================================================
// WAVE 2 BOSS — Halo Megastructure Ring
// Full AAA Overhaul: 50m diameter open ring, Forerunner architecture,
// inward terraformed biosphere, 12 structural truss spokes,
// gyroscopic Index control citadel, 6 defined railgun defense batteries
// ============================================================
export class HaloRingBoss {
  constructor(scene, particleManager) {
    this.scene = scene;
    this.particleManager = particleManager;

    this.meshGroup = new THREE.Group();
    this.meshGroup.position.set(0, 0, -130);
    this.meshGroup.rotation.x = Math.PI / 5.5; // dramatic tilt to show ring face

    this.targetZ = -88;
    this.speed = 7.5;

    this.coreHp = 4200;
    this.maxCoreHp = 4200;
    this.scoreValue = 45000;
    this.isDead = false;
    this.hitRadius = 52;

    this.fireTimer = 0.8;
    this.phase = 1;
    this.gravWaveTimer = 0;
    this._time = 0;
    this.phaseShieldTimer = 0;
    this.justPhaseTransitioned = false;

    this.turrets = [
      { id: 0, relPos: new THREE.Vector3(0,  46, 0), hp: 850, maxHp: 850, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 1, relPos: new THREE.Vector3(0, -46, 0), hp: 850, maxHp: 850, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 2, relPos: new THREE.Vector3(46,  0, 0), hp: 850, maxHp: 850, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 3, relPos: new THREE.Vector3(-46, 0, 0), hp: 850, maxHp: 850, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 4, relPos: new THREE.Vector3(32.5, 32.5, 0),  hp: 750, maxHp: 750, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 5, relPos: new THREE.Vector3(-32.5,-32.5, 0), hp: 750, maxHp: 750, isDead: false, mesh: null, barrelGroup: null, reticle: null },
    ];

    this.reticleMeshes = [];
    this._build();
    this.scene.add(this.meshGroup);
  }

  _build() {
    const ringR  = 46.0;  // large outer ring radius
    const tubeR  = 4.0;   // tube cross-section

    const armorTex = generateHaloArmorTexture();
    const bioTex = generateHaloBiosphereTexture();

    // ── 1. Outer Forerunner Pewter-Silver Structural Shell ──
    const outerGeo = new THREE.TorusGeometry(ringR, tubeR, 24, 100);
    const shellMat = new THREE.MeshStandardMaterial({
      color: 0x788c9f,
      bumpMap: armorTex,
      bumpScale: 0.14,
      metalness: 0.94,
      roughness: 0.16,
      emissive: 0x141f2d,
      emissiveIntensity: 0.35
    });
    this.ringMesh = new THREE.Mesh(outerGeo, shellMat);
    this.meshGroup.add(this.ringMesh);

    // ── 2. Inward Terraformed Biosphere Band ──
    const innerGeo = new THREE.TorusGeometry(ringR - 0.8, tubeR - 1.2, 20, 100);
    const bioMat = new THREE.MeshStandardMaterial({
      color: 0xd8e8f5,
      map: bioTex,
      roughness: 0.3,
      metalness: 0.5,
      emissive: 0x004488,
      emissiveIntensity: 0.25
    });
    this.meshGroup.add(new THREE.Mesh(innerGeo, bioMat));

    // ── 3. Dual Titanium Retaining Wall Rims with Cyan Lighting ──
    [-tubeR * 0.9, tubeR * 0.9].forEach(zOff => {
      const rimGeo = new THREE.TorusGeometry(ringR + 0.6, 0.7, 10, 80);
      const rimMat = new THREE.MeshStandardMaterial({ color: 0x243244, metalness: 0.95, roughness: 0.2 });
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.position.z = zOff;
      this.meshGroup.add(rim);

      const conduitGeo = new THREE.TorusGeometry(ringR + 0.9, 0.2, 8, 80);
      const conduitMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
      const conduit = new THREE.Mesh(conduitGeo, conduitMat);
      conduit.position.z = zOff;
      this.meshGroup.add(conduit);
    });

    // ── 4. 12 Triangular Structural Truss Spoke Struts ──
    const spokeMat = new THREE.MeshStandardMaterial({
      color: 0x36485e,
      metalness: 0.95,
      roughness: 0.22,
      emissive: 0x0e1824,
      emissiveIntensity: 0.2
    });
    const conduitMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });

    this.hubGroup = new THREE.Group();

    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const spokeLen = ringR - 7.5;

      const spokeGroup = new THREE.Group();
      spokeGroup.position.set(Math.cos(a) * spokeLen * 0.5, Math.sin(a) * spokeLen * 0.5, 0);
      spokeGroup.rotation.z = -a;

      // Main structural beam
      const spokeGeo = new THREE.BoxGeometry(1.2, spokeLen, 1.4);
      const spoke = new THREE.Mesh(spokeGeo, spokeMat);
      spokeGroup.add(spoke);

      // Embedded energized plasma conduit line
      const condGeo = new THREE.CylinderGeometry(0.18, 0.18, spokeLen * 0.95, 6);
      const cond = new THREE.Mesh(condGeo, conduitMat);
      cond.position.z = 0.85;
      spokeGroup.add(cond);

      this.meshGroup.add(spokeGroup);
    }

    // ── 5. Central Control Citadel (Index Spire Core) ──
    const hubGeo = new THREE.DodecahedronGeometry(9.0, 1);
    this.coreMat = new THREE.MeshStandardMaterial({
      color: 0x0b1c2e,
      emissive: 0x00f3ff,
      emissiveIntensity: 3.5,
      roughness: 0.1,
      metalness: 0.8,
    });
    this.coreMesh = new THREE.Mesh(hubGeo, this.coreMat);
    this.hubGroup.add(this.coreMesh);

    // Decorative Forerunner Pylons at Core
    for (let p = 0; p < 6; p++) {
      const pAng = (p / 6) * Math.PI * 2;
      const pylonGeo = new THREE.ConeGeometry(1.2, 5.5, 5);
      pylonGeo.rotateZ(pAng);
      const pylon = new THREE.Mesh(pylonGeo, spokeMat);
      pylon.position.set(Math.cos(pAng) * 9.5, Math.sin(pAng) * 9.5, 0);
      this.hubGroup.add(pylon);
    }

    this.meshGroup.add(this.hubGroup);

    // Central Index Core Point Lights
    this.hubLight = new THREE.PointLight(0x00f3ff, 14.0, 130);
    this.meshGroup.add(this.hubLight);

    this.ringLight = new THREE.PointLight(0x0088ff, 6.0, 90);
    this.ringLight.position.set(ringR * 0.5, 0, 10);
    this.meshGroup.add(this.ringLight);

    // ── 6. 3 Gyroscopic Counter-Rotating Containment Rings ──
    const ringAngles = [0, Math.PI / 3, Math.PI * 2 / 3];
    this.shieldRings = [];
    ringAngles.forEach((ra, idx) => {
      const sGeo = new THREE.TorusGeometry(12.5 + idx * 1.5, 0.45, 10, 48);
      const sMat = new THREE.MeshBasicMaterial({
        color: idx === 0 ? 0x00f3ff : (idx === 1 ? 0x00aaff : 0x0066ff),
        transparent: true,
        opacity: 0.85,
      });
      const sRing = new THREE.Mesh(sGeo, sMat);
      sRing.rotation.set(ra, ra * 0.5, ra * 0.3);
      this.hubGroup.add(sRing);
      this.shieldRings.push({ mesh: sRing, dir: idx % 2 === 0 ? 1 : -1, speed: 2.0 + idx * 0.5 });
    });

    // ── 7. 6 Ultra-Defined Magnetic Railgun Defense Batteries ──
    const barbetteGeo = new THREE.CylinderGeometry(2.4, 3.0, 1.2, 6);
    const barbetteMat = new THREE.MeshStandardMaterial({ color: 0x223247, metalness: 0.94, roughness: 0.2 });
    const houseGeo = new THREE.BoxGeometry(2.6, 1.4, 3.0);
    const houseMat = new THREE.MeshStandardMaterial({ color: 0x3b4e68, metalness: 0.96, roughness: 0.18 });

    const barrelGeo = new THREE.CylinderGeometry(0.24, 0.3, 5.0, 8);
    barrelGeo.rotateX(Math.PI / 2);
    this.barrelMat = new THREE.MeshStandardMaterial({ color: 0x8aa2bf, metalness: 0.95, roughness: 0.15 });

    const coilGeo = new THREE.TorusGeometry(0.36, 0.08, 6, 14);
    const glowCyanMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
    const visorMat = new THREE.MeshBasicMaterial({ color: 0x00ffaa });

    this.turrets.forEach(t => {
      const tGroup = new THREE.Group();
      tGroup.position.copy(t.relPos);

      // Barbette base
      const barbette = new THREE.Mesh(barbetteGeo, barbetteMat);
      barbette.rotation.x = Math.PI / 2;
      tGroup.add(barbette);

      // Gunhouse & Barrels
      const bGroup = new THREE.Group();
      bGroup.position.set(0, 0, 0.8);

      const house = new THREE.Mesh(houseGeo, houseMat);
      house.position.set(0, 0.2, 0);
      bGroup.add(house);

      // Sensor visor
      const visor = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.35, 0.4), visorMat);
      visor.position.set(0, 0.8, 1.2);
      bGroup.add(visor);

      // Twin railgun barrels
      [-0.8, 0.8].forEach(xOff => {
        const barrel = new THREE.Mesh(barrelGeo, this.barrelMat);
        barrel.position.set(xOff, 0.2, 2.5);
        bGroup.add(barrel);

        // Magnetic induction acceleration coils
        [1.0, 2.2, 3.4].forEach(zC => {
          const coil = new THREE.Mesh(coilGeo, glowCyanMat);
          coil.position.set(xOff, 0.2, zC);
          bGroup.add(coil);
        });

        // Muzzle ring
        const muzzle = new THREE.Mesh(coilGeo, glowCyanMat);
        muzzle.position.set(xOff, 0.2, 5.0);
        bGroup.add(muzzle);
      });

      tGroup.add(bGroup);

      // 3D Target Reticle
      const reticleGeo = new THREE.RingGeometry(1.8, 2.2, 16);
      const reticleMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
      const reticle = new THREE.Mesh(reticleGeo, reticleMat);
      reticle.position.set(0, 0, 3.5);
      tGroup.add(reticle);

      this.meshGroup.add(tGroup);
      t.mesh = tGroup;
      t.barrelGroup = bGroup;
      t.reticle = reticle;
      this.reticleMeshes.push(reticle);
    });
  }

  takeTurretDamage(turretId, amount) {
    const t = this.turrets.find(t => t.id === turretId);
    if (!t || t.isDead) return false;
    t.hp -= amount;

    if (t.reticle && t.reticle.material) {
      const pct = t.hp / t.maxHp;
      t.reticle.material.color.setHex(pct > 0.5 ? 0x00f3ff : (pct > 0.25 ? 0xffaa00 : 0xff0044));
    }

    if (t.hp <= 0) {
      t.isDead = true;
      t.mesh.visible = false;
      if (t.reticle) t.reticle.visible = false;
      const wp = t.mesh.getWorldPosition(new THREE.Vector3());
      this.particleManager.createExplosion(wp, 0x00f3ff, 120, 3.5);
    }
    return t.isDead;
  }

  takeCoreDamage(amount) {
    if (this.phaseShieldTimer > 0) return false;

    const prevPhase = this.phase;
    this.coreHp -= amount;
    if (this.coreMat) {
      this.coreMat.emissiveIntensity = 10.0;
      if (this.hubLight) this.hubLight.intensity = 28.0;
      setTimeout(() => {
        if (this.coreMat) this.coreMat.emissiveIntensity = 3.5;
        if (this.hubLight) this.hubLight.intensity = 14.0;
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
    this.particleManager.createExplosion(this.meshGroup.position, 0x00f3ff, 350, 7.0);
    this.particleManager.createExplosion(this.meshGroup.position, 0x0088ff, 250, 5.5);
    this.particleManager.createExplosion(this.meshGroup.position, 0xffffff, 150, 4.0);
    this.particleManager.createEmpShockwave(this.meshGroup.position, 160);
    this.particleManager.createEmpShockwave(this.meshGroup.position, 240);
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

    // Ring spins on Z axis
    const spinSpeed = 0.20 + this.phase * 0.10;
    this.meshGroup.rotation.z += spinSpeed * dt;

    // Hub counter-rotates
    if (this.hubGroup) this.hubGroup.rotation.z -= (0.8 + this.phase * 0.25) * dt;

    // Gyro containment rings multi-axis rotation
    if (this.shieldRings) {
      this.shieldRings.forEach((sr, idx) => {
        if (idx === 0) sr.mesh.rotation.z += sr.dir * sr.speed * dt;
        else if (idx === 1) sr.mesh.rotation.x += sr.dir * sr.speed * dt;
        else sr.mesh.rotation.y += sr.dir * sr.speed * dt;
      });
    }

    // 3D Target Reticles Rotation
    if (this.reticleMeshes) {
      this.reticleMeshes.forEach(r => {
        if (r && r.visible) r.rotation.z += 2.0 * dt;
      });
    }

    // Hub pulse animation
    if (this.phaseShieldTimer > 0) {
      this.phaseShieldTimer -= dt;
      if (this.hubLight) this.hubLight.intensity = 35.0 + Math.sin(this._time * 35) * 15.0;
      if (this.coreMat) this.coreMat.emissiveIntensity = 18.0 + Math.sin(this._time * 30) * 8.0;
    } else {
      if (this.hubLight) {
        this.hubLight.intensity = 12.0 + Math.sin(this._time * 6) * 3.0 + this.phase * 2.0;
      }
      if (this.coreMat) {
        this.coreMat.emissiveIntensity = 3.5 + Math.sin(this._time * 8) * 0.8;
      }
    }

    // Dynamic Turret 3D Aim Tracking towards Player
    if (arrived && playerPos) {
      this.turrets.forEach(t => {
        if (!t.isDead && t.barrelGroup) {
          t.barrelGroup.lookAt(playerPos);
        }
      });
    }

    // Gravity shockwave in phase 2+
    if (this.phase >= 2 && arrived) {
      this.gravWaveTimer += dt;
      if (this.gravWaveTimer > (this.phase === 2 ? 6.0 : 3.5)) {
        this.gravWaveTimer = 0;
        this.particleManager.createEmpShockwave(this.meshGroup.position, 60);
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
