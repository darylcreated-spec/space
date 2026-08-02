import * as THREE from 'three';

// ============================================================
// WAVE 1 BOSS — Star Wars Death Star Imperial Superweapon
// Silhouette: Massive dark grey sphere, northern superlaser
// Color Identity: Deep slate hull (#0c1017) + EMERALD green (#00ff44)
// Motion: Slow Y-axis rotation
// ============================================================
export class SpaceStation {
  constructor(scene, particleManager) {
    this.scene = scene;
    this.particleManager = particleManager;

    this.meshGroup = new THREE.Group();
    this.meshGroup.position.set(0, 5, -110);

    this.targetZ = -40;
    this.speed = 6.0;

    this.coreHp = 700;
    this.maxCoreHp = 700;
    this.scoreValue = 25000;
    this.isDead = false;

    this.fireTimer = 1.2;

    // IMPERIAL point-defense gun turrets — emerald barrel emissives
    this.turrets = [
      { id: 0, relPos: new THREE.Vector3(-18, 10, 14), hp: 150, maxHp: 150, isDead: false, mesh: null },
      { id: 1, relPos: new THREE.Vector3(18, 10, 14), hp: 150, maxHp: 150, isDead: false, mesh: null },
      { id: 2, relPos: new THREE.Vector3(-18, -10, 14), hp: 150, maxHp: 150, isDead: false, mesh: null },
      { id: 3, relPos: new THREE.Vector3(18, -10, 14), hp: 150, maxHp: 150, isDead: false, mesh: null },
    ];

    this._build();
    this.scene.add(this.meshGroup);
  }

  _build() {
    const R = 22.0;

    // ── 1. Imperial Spherical Armor Hull — dark slate, hard flat faces ──
    const hullGeo = new THREE.SphereGeometry(R, 28, 22);
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x1a2030,      // dark slate blue-grey — NOT pure black
      roughness: 0.6,
      metalness: 0.85,
      flatShading: true,    // KEY: gives the iconic faceted military look
    });
    this.spireMesh = new THREE.Mesh(hullGeo, hullMat);
    this.meshGroup.add(this.spireMesh);

    // ── 2. Deep Wide Equatorial Trench Band — the Death Star's most iconic feature ──
    const trenchGeo = new THREE.TorusGeometry(R + 0.3, 2.2, 8, 72);
    const trenchMat = new THREE.MeshStandardMaterial({
      color: 0x090d12,      // nearly black recessed channel
      roughness: 0.8,
      metalness: 1.0,
    });
    this.equatorialTrench = new THREE.Mesh(trenchGeo, trenchMat);
    this.meshGroup.add(this.equatorialTrench);

    // ── Trench inner glowing conduit light strip ──
    const conduitGeo = new THREE.TorusGeometry(R + 0.25, 0.35, 6, 72);
    const conduitMat = new THREE.MeshBasicMaterial({ color: 0x00ff44 });
    const conduit = new THREE.Mesh(conduitGeo, conduitMat);
    this.meshGroup.add(conduit);

    // ── A second sub-trench 60° north ──
    const subTrenchGeo = new THREE.TorusGeometry(R * 0.87 + 0.2, 0.9, 6, 64);
    const subTrenchMat = new THREE.MeshStandardMaterial({ color: 0x0a1018, roughness: 1.0, metalness: 0.9 });
    const subTrench = new THREE.Mesh(subTrenchGeo, subTrenchMat);
    subTrench.rotation.x = Math.PI / 3.5;
    this.meshGroup.add(subTrench);

    // ── 3. Iconic Superlaser Dish — northern hemisphere, offset, concave ──
    const dishGroup = new THREE.Group();
    dishGroup.position.set(-5.5, 8, R - 1.5);
    dishGroup.rotation.y = -Math.PI / 12;
    dishGroup.rotation.x = Math.PI / 14;

    // Outer dish rim ring — thick, beveled
    const rimGeo = new THREE.TorusGeometry(6.0, 1.1, 12, 28);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x111820, roughness: 0.4, metalness: 1.0 });
    dishGroup.add(new THREE.Mesh(rimGeo, rimMat));

    // Concave dish face
    const dishFaceGeo = new THREE.CylinderGeometry(5.5, 4.0, 1.5, 24);
    dishFaceGeo.rotateX(Math.PI / 2);
    const dishFaceMat = new THREE.MeshStandardMaterial({ color: 0x0a1218, roughness: 0.3, metalness: 0.95 });
    dishGroup.add(new THREE.Mesh(dishFaceGeo, dishFaceMat));

    // 8 converging emitter beams — bright emerald
    const beamGeo = new THREE.CylinderGeometry(0.1, 0.1, 5.2, 6);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0x00ff44 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set(Math.cos(a) * 4.0, Math.sin(a) * 4.0, 0.3);
      beam.rotation.z = a + Math.PI / 2;
      beam.rotation.x = Math.PI / 5.5;
      dishGroup.add(beam);
    }

    // Central superlaser plasma orb — intense emerald
    const orbGeo = new THREE.SphereGeometry(1.8, 16, 16);
    this.coreMat = new THREE.MeshStandardMaterial({
      color: 0x00ff44,
      emissive: 0x00ff44,
      emissiveIntensity: 4.5,
      roughness: 0.0,
    });
    this.coreMesh = new THREE.Mesh(orbGeo, this.coreMat);
    this.coreMesh.position.z = -0.5;
    dishGroup.add(this.coreMesh);

    this.meshGroup.add(dishGroup);

    // ── 4. Emerald point light — give the whole hull a green glow ──
    this.superlightBoss = new THREE.PointLight(0x00ff44, 3.5, 65);
    this.superlightBoss.position.set(-5.5, 8, R - 1.5);
    this.meshGroup.add(this.superlightBoss);

    // ── 5. Rotating icosahedron shield shell — EMERALD wireframe ──
    const shieldGeo = new THREE.IcosahedronGeometry(R + 3.5, 2);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x00ff44,
      wireframe: true,
      transparent: true,
      opacity: 0.18,
    });
    this.shieldRing = new THREE.Mesh(shieldGeo, shieldMat);
    this.meshGroup.add(this.shieldRing);

    // ── 6. Surface gun turrets — blocky imperial design, EMERALD barrels ──
    const baseGeo = new THREE.BoxGeometry(3.2, 1.4, 3.2);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x0d1520, metalness: 0.98, roughness: 0.3 });

    const barrelGeo = new THREE.CylinderGeometry(0.28, 0.38, 3.4, 6);
    barrelGeo.rotateX(Math.PI / 2);
    const barrelMat = new THREE.MeshBasicMaterial({ color: 0x00ff44 });

    this.turrets.forEach(t => {
      const tGroup = new THREE.Group();
      tGroup.position.copy(t.relPos);

      // Wide flat base plate
      tGroup.add(new THREE.Mesh(baseGeo, baseMat));

      // TWO fat emerald barrels side by side
      const bGroup = new THREE.Group();
      const b1 = new THREE.Mesh(barrelGeo, barrelMat);
      b1.position.set(0.7, 0.6, 1.2);
      bGroup.add(b1);
      const b2 = new THREE.Mesh(barrelGeo, barrelMat);
      b2.position.set(-0.7, 0.6, 1.2);
      bGroup.add(b2);

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
      this.particleManager.createExplosion(wp, 0x00ff44, 42, 2.0);
    }
    return turret.isDead;
  }

  takeCoreDamage(amount) {
    this.coreHp -= amount;
    if (this.coreMat) {
      this.coreMat.emissiveIntensity = 8.0;
      setTimeout(() => { if (this.coreMat) this.coreMat.emissiveIntensity = 4.5; }, 100);
    }
    if (this.coreHp <= 0 && !this.isDead) {
      this.isDead = true;
      this._explode();
    }
    return this.isDead;
  }

  _explode() {
    this.particleManager.createExplosion(this.meshGroup.position, 0x00ff44, 200, 4.5);
    this.particleManager.createExplosion(this.meshGroup.position, 0xffff00, 140, 3.2);
    this.particleManager.createEmpShockwave(this.meshGroup.position, 90);
    const flash = new THREE.PointLight(0xffffff, 60, 700);
    flash.position.copy(this.meshGroup.position);
    this.scene.add(flash);
    let i = 60;
    const fade = setInterval(() => {
      i -= 4; if (i <= 0) { clearInterval(fade); this.scene.remove(flash); } else { flash.intensity = i; }
    }, 50);
  }

  destroy() {
    this.scene.remove(this.meshGroup);
    this.meshGroup.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); });
  }

  update(dt, playerPos) {
    if (this.meshGroup.position.z < this.targetZ) this.meshGroup.position.z += this.speed * dt;

    // Slow majestic Y-axis rotation — the Death Star hovering in orbit
    this.meshGroup.rotation.y += 0.06 * dt;

    if (this.shieldRing) {
      this.shieldRing.rotation.z += 0.6 * dt;
      this.shieldRing.rotation.x += 0.35 * dt;
    }

    this.turrets.forEach(t => { if (!t.isDead && t.mesh) t.mesh.lookAt(playerPos); });

    this.fireTimer -= dt;
    const out = [];
    if (this.fireTimer <= 0) {
      this.fireTimer = 0.9;
      this.turrets.forEach(t => {
        if (!t.isDead && t.mesh) out.push(t.mesh.getWorldPosition(new THREE.Vector3()));
      });
    }
    return out.length > 0 ? out : false;
  }
}
