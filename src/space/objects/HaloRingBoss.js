import * as THREE from 'three';

// ============================================================
// WAVE 2 BOSS — Halo Megastructure Ring
// Silhouette: Enormous open bronze ring TILTED 30° — clearly a ring shape,
//             NOT a torus blob. Massive spoke struts from rim to central hub.
// Color Identity: Ancient bronze/copper (#b87333) + ICE BLUE (#00e5ff)
// Motion: Ring face-on to player, spins FAST on its own ring axis (Z)
//         The central hub spins opposite direction
// ============================================================
export class HaloRingBoss {
  constructor(scene, particleManager) {
    this.scene = scene;
    this.particleManager = particleManager;

    this.meshGroup = new THREE.Group();
    this.meshGroup.position.set(0, 0, -115);

    // Tilt the whole ring 30° so player sees it as an OPEN RING not a flat donut
    this.meshGroup.rotation.x = Math.PI / 6;

    this.targetZ = -45;
    this.speed = 6.5;

    this.coreHp = 800;
    this.maxCoreHp = 800;
    this.scoreValue = 30000;
    this.isDead = false;
    this.hitRadius = 38; // Halo ring outer radius collision

    this.fireTimer = 0.9;

    // 4 Turrets mounted at cardinal ring positions — rail cannon style
    this.turrets = [
      { id: 0, relPos: new THREE.Vector3(0, 32, 0), hp: 160, maxHp: 160, isDead: false, mesh: null },
      { id: 1, relPos: new THREE.Vector3(0, -32, 0), hp: 160, maxHp: 160, isDead: false, mesh: null },
      { id: 2, relPos: new THREE.Vector3(32, 0, 0), hp: 160, maxHp: 160, isDead: false, mesh: null },
      { id: 3, relPos: new THREE.Vector3(-32, 0, 0), hp: 160, maxHp: 160, isDead: false, mesh: null },
    ];

    this._build();
    this.scene.add(this.meshGroup);
  }

  _build() {
    const ringR = 30.0;   // ring centerline radius
    const tubeR = 2.8;    // ring tube cross-section — visible and substantial

    // ── 1. Outer structural ring — BRONZE colored, very visible ──
    const outerGeo = new THREE.TorusGeometry(ringR, tubeR, 20, 80);
    const bronzeMat = new THREE.MeshStandardMaterial({
      color: 0x8c5a1a,      // rich dark bronze
      emissive: 0x3d1f00,
      emissiveIntensity: 0.4,
      roughness: 0.45,
      metalness: 0.85,
      flatShading: false,
    });
    this.ringMesh = new THREE.Mesh(outerGeo, bronzeMat);
    this.meshGroup.add(this.ringMesh);

    // ── 2. Inner terrain/habitat band — COPPER colored glow ──
    const innerGeo = new THREE.TorusGeometry(ringR - 0.5, tubeR - 1.2, 16, 80);
    const copperMat = new THREE.MeshStandardMaterial({
      color: 0xb87333,      // copper — stands out vs bronze outer ring
      emissive: 0x00e5ff,   // ICE BLUE emissive from inside
      emissiveIntensity: 1.0,
      roughness: 0.3,
      metalness: 0.7,
    });
    this.meshGroup.add(new THREE.Mesh(innerGeo, copperMat));

    // ── 3. 8 Structural spoke struts from ring rim to center hub ──
    //    These create the DISTINCTIVE open spoked ring silhouette
    this.hubGroup = new THREE.Group(); // hub counter-rotates

    const spokeMat = new THREE.MeshStandardMaterial({
      color: 0x6b3d0d,
      emissive: 0x00e5ff,
      emissiveIntensity: 0.25,
      roughness: 0.5,
      metalness: 0.9,
    });

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const spokeGeo = new THREE.CylinderGeometry(0.55, 0.55, ringR, 6);
      const spoke = new THREE.Mesh(spokeGeo, spokeMat);
      // Position spoke midpoint between ring center and rim
      spoke.position.set(Math.cos(a) * ringR * 0.5, Math.sin(a) * ringR * 0.5, 0);
      spoke.rotation.z = -a;
      this.meshGroup.add(spoke);
    }

    // ── 4. Central control hub — LARGE, glowing ice blue ──
    const hubGeo = new THREE.DodecahedronGeometry(7.0, 1);
    this.coreMat = new THREE.MeshStandardMaterial({
      color: 0x002244,
      emissive: 0x00e5ff,
      emissiveIntensity: 3.0,
      roughness: 0.1,
      metalness: 0.2,
    });
    this.coreMesh = new THREE.Mesh(hubGeo, this.coreMat);
    this.hubGroup.add(this.coreMesh);
    this.meshGroup.add(this.hubGroup);

    // Hub glow light — makes the ring interior visibly illuminated
    const hubLight = new THREE.PointLight(0x00e5ff, 5.0, 80);
    hubLight.position.set(0, 0, 0);
    this.meshGroup.add(hubLight);

    // ── 5. 3 Counter-rotating energy shield rings at hub ──
    const ringAngles = [0, Math.PI / 4, Math.PI / 2];
    this.shieldRings = [];
    ringAngles.forEach((ra, idx) => {
      const sGeo = new THREE.TorusGeometry(10, 0.28, 8, 32);
      const sMat = new THREE.MeshBasicMaterial({
        color: 0x00e5ff,
        transparent: true,
        opacity: 0.7,
      });
      const sRing = new THREE.Mesh(sGeo, sMat);
      sRing.rotation.y = ra;
      this.hubGroup.add(sRing);
      this.shieldRings.push({ mesh: sRing, dir: idx % 2 === 0 ? 1 : -1 });
    });

    // ── 6. Rail-cannon turrets — LONG single barrel, distinctly different from Death Star ──
    const baseGeo = new THREE.OctahedronGeometry(2.4, 0); // OCTAHEDRON base — sci-fi look
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x3d1f00, metalness: 0.98, roughness: 0.2 });

    // Long single rail barrel — NOT twin cylinders like Death Star
    const railGeo = new THREE.CylinderGeometry(0.3, 0.5, 6.0, 6);
    railGeo.rotateX(Math.PI / 2);
    const railMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });

    // Rail charge housing
    const chargeGeo = new THREE.BoxGeometry(2.4, 0.8, 1.2);
    const chargeMat = new THREE.MeshStandardMaterial({ color: 0x001833, emissive: 0x00e5ff, emissiveIntensity: 1.2 });

    this.turrets.forEach(t => {
      const tGroup = new THREE.Group();
      tGroup.position.copy(t.relPos);

      // Octahedron mount
      tGroup.add(new THREE.Mesh(baseGeo, baseMat));

      // Single long rail barrel
      const bGroup = new THREE.Group();
      const rail = new THREE.Mesh(railGeo, railMat);
      rail.position.set(0, 0, 2.5);
      bGroup.add(rail);

      // Charge coil housing alongside barrel
      const charge = new THREE.Mesh(chargeGeo, chargeMat);
      charge.position.set(0, 0.9, 1.5);
      bGroup.add(charge);

      tGroup.add(bGroup);
      this.meshGroup.add(tGroup);
      t.mesh = tGroup;
    });
  }

  takeTurretDamage(turretId, amount) {
    const turret = this.turrets.find(t => t.id === turretId);
    if (!turret || turret.isDead) return false;
    turret.hp -= amount;
    if (turret.hp <= 0) {
      turret.isDead = true;
      turret.mesh.visible = false;
      const wp = turret.mesh.getWorldPosition(new THREE.Vector3());
      this.particleManager.createExplosion(wp, 0x00e5ff, 48, 2.2);
    }
    return turret.isDead;
  }

  takeCoreDamage(amount) {
    this.coreHp -= amount;
    if (this.coreMat) {
      this.coreMat.emissiveIntensity = 7.0;
      setTimeout(() => { if (this.coreMat) this.coreMat.emissiveIntensity = 3.0; }, 100);
    }
    if (this.coreHp <= 0 && !this.isDead) {
      this.isDead = true;
      this._explode();
    }
    return this.isDead;
  }

  _explode() {
    this.particleManager.createExplosion(this.meshGroup.position, 0x00e5ff, 220, 5.0);
    this.particleManager.createExplosion(this.meshGroup.position, 0xb87333, 160, 3.8);
    this.particleManager.createEmpShockwave(this.meshGroup.position, 95);
    const flash = new THREE.PointLight(0x00e5ff, 65, 750);
    flash.position.copy(this.meshGroup.position);
    this.scene.add(flash);
    let i = 65;
    const fade = setInterval(() => {
      i -= 4.5; if (i <= 0) { clearInterval(fade); this.scene.remove(flash); } else { flash.intensity = i; }
    }, 50);
  }

  destroy() {
    this.scene.remove(this.meshGroup);
    this.meshGroup.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); });
  }

  update(dt, playerPos) {
    if (this.meshGroup.position.z < this.targetZ) this.meshGroup.position.z += this.speed * dt;

    // The entire ring spins on Z-axis (ring face) — CLEARLY a spinning ring
    this.meshGroup.rotation.z += 0.32 * dt;

    // Hub counter-rotates — central node spins opposite the ring
    if (this.hubGroup) this.hubGroup.rotation.z -= 1.4 * dt;

    // Shield rings at hub each rotate on different axes
    this.shieldRings.forEach((sr, idx) => {
      if (idx === 0) sr.mesh.rotation.z += sr.dir * 2.2 * dt;
      else if (idx === 1) sr.mesh.rotation.x += sr.dir * 2.0 * dt;
      else sr.mesh.rotation.y += sr.dir * 1.8 * dt;
    });

    this.turrets.forEach(t => {
      if (!t.isDead && t.mesh) {
        const localTarget = this.meshGroup.worldToLocal(playerPos.clone());
        t.mesh.lookAt(localTarget);
      }
    });

    this.fireTimer -= dt;
    const out = [];
    if (this.fireTimer <= 0) {
      this.fireTimer = 0.85;
      this.turrets.forEach(t => {
        if (!t.isDead && t.mesh) out.push(t.mesh.getWorldPosition(new THREE.Vector3()));
      });
    }
    return out.length > 0 ? out : false;
  }
}
