import * as THREE from 'three';

export class SpaceStation {
  constructor(scene, particleManager) {
    this.scene = scene;
    this.particleManager = particleManager;

    this.meshGroup = new THREE.Group();
    this.meshGroup.position.set(0, 5, -95); // Entrance from deep space

    this.targetZ = -45; // Orbital engagement distance
    this.speed = 7.0;

    this.coreHp = 500;
    this.maxCoreHp = 500;
    this.scoreValue = 15000;
    this.isDead = false;

    this.fireTimer = 1.0;

    // 4 Extended Pylon Point-Defense Turrets
    this.turrets = [
      { id: 0, relPos: new THREE.Vector3(-22, 8, 4), hp: 120, maxHp: 120, isDead: false, mesh: null, barrelGroup: null },
      { id: 1, relPos: new THREE.Vector3(22, 8, 4), hp: 120, maxHp: 120, isDead: false, mesh: null, barrelGroup: null },
      { id: 2, relPos: new THREE.Vector3(-22, -8, -2), hp: 120, maxHp: 120, isDead: false, mesh: null, barrelGroup: null },
      { id: 3, relPos: new THREE.Vector3(22, -8, -2), hp: 120, maxHp: 120, isDead: false, mesh: null, barrelGroup: null }
    ];

    this.buildFortressMesh();
    this.scene.add(this.meshGroup);
  }

  buildFortressMesh() {
    // 1. Central Hexagonal Command Spire
    const spireGeo = new THREE.CylinderGeometry(6, 7, 30, 6);
    spireGeo.rotateX(Math.PI / 2);
    const spireMat = new THREE.MeshStandardMaterial({
      color: 0x0c1626,
      roughness: 0.2,
      metalness: 0.9,
      flatShading: true
    });
    this.spireMesh = new THREE.Mesh(spireGeo, spireMat);
    this.meshGroup.add(this.spireMesh);

    // Glowing Cyan Power Conduits down spire
    const lineGeo = new THREE.CylinderGeometry(0.2, 0.2, 30.5, 6);
    lineGeo.rotateX(Math.PI / 2);
    const lineMat = new THREE.MeshStandardMaterial({
      color: 0x00f3ff,
      emissive: 0x00f3ff,
      emissiveIntensity: 1.5
    });
    const conduit = new THREE.Mesh(lineGeo, lineMat);
    this.meshGroup.add(conduit);

    // 2. Upper Rotating Habitat Ring (Inner)
    const ring1Geo = new THREE.TorusGeometry(16, 1.8, 16, 32);
    const ring1Mat = new THREE.MeshStandardMaterial({
      color: 0x182c48,
      emissive: 0x00a2ff,
      emissiveIntensity: 0.5,
      roughness: 0.3,
      metalness: 0.8
    });
    this.habitatRingUpper = new THREE.Mesh(ring1Geo, ring1Mat);
    this.habitatRingUpper.position.set(0, 0, 4);
    this.meshGroup.add(this.habitatRingUpper);

    // 3. Lower Contra-Rotating Habitat Ring (Outer)
    const ring2Geo = new THREE.TorusGeometry(25, 2.2, 16, 32);
    const ring2Mat = new THREE.MeshStandardMaterial({
      color: 0x221238,
      emissive: 0xff00aa,
      emissiveIntensity: 0.4,
      roughness: 0.3,
      metalness: 0.8
    });
    this.habitatRingLower = new THREE.Mesh(ring2Geo, ring2Mat);
    this.habitatRingLower.position.set(0, 0, -4);
    this.meshGroup.add(this.habitatRingLower);

    // 4. Central Glowing Core Reactor Orb
    const coreGeo = new THREE.SphereGeometry(4.5, 32, 32);
    this.coreMat = new THREE.MeshStandardMaterial({
      color: 0x00f3ff,
      emissive: 0x00f3ff,
      emissiveIntensity: 2.0,
      roughness: 0.1,
      metalness: 0.2
    });
    this.coreMesh = new THREE.Mesh(coreGeo, this.coreMat);
    this.meshGroup.add(this.coreMesh);

    // Rotating Energy Shield Ring
    const shieldGeo = new THREE.TorusGeometry(6.5, 0.4, 16, 32);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      wireframe: true,
      transparent: true,
      opacity: 0.7
    });
    this.shieldRing = new THREE.Mesh(shieldGeo, shieldMat);
    this.meshGroup.add(this.shieldRing);

    // 5. Heavy Structural Arm Pylons
    const pylonGeo = new THREE.BoxGeometry(46, 1.2, 3);
    const pylonMat = new THREE.MeshStandardMaterial({ color: 0x151e2e, metalness: 0.9, roughness: 0.2 });
    const pylons = new THREE.Mesh(pylonGeo, pylonMat);
    this.meshGroup.add(pylons);

    // 6. Dual-Barrel Point-Defense Gun Turrets
    const turretBaseGeo = new THREE.CylinderGeometry(1.5, 2.0, 2.0, 12);
    const turretBaseMat = new THREE.MeshStandardMaterial({ color: 0x2d174d, metalness: 0.9 });

    const barrelGeo = new THREE.CylinderGeometry(0.18, 0.18, 2.5, 8);
    barrelGeo.rotateX(Math.PI / 2);
    const barrelMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });

    this.turrets.forEach(t => {
      const tGroup = new THREE.Group();
      tGroup.position.copy(t.relPos);

      const base = new THREE.Mesh(turretBaseGeo, turretBaseMat);
      tGroup.add(base);

      const bGroup = new THREE.Group();
      const b1 = new THREE.Mesh(barrelGeo, barrelMat);
      b1.position.set(0.6, 0.5, 1.0);
      bGroup.add(b1);

      const b2 = new THREE.Mesh(barrelGeo, barrelMat);
      b2.position.set(-0.6, 0.5, 1.0);
      bGroup.add(b2);

      tGroup.add(bGroup);
      this.meshGroup.add(tGroup);

      t.mesh = tGroup;
      t.barrelGroup = bGroup;
    });
  }

  takeTurretDamage(turretId, amount) {
    const turret = this.turrets.find(t => t.id === turretId);
    if (!turret || turret.isDead) return false;

    turret.hp -= amount;
    if (turret.hp <= 0) {
      turret.isDead = true;
      turret.mesh.visible = false;
      const worldPos = turret.mesh.getWorldPosition(new THREE.Vector3());
      this.particleManager.createExplosion(worldPos, 0xff0055, 35, 1.8);
    }
    return turret.isDead;
  }

  takeCoreDamage(amount) {
    this.coreHp -= amount;

    if (this.coreMat) {
      this.coreMat.emissiveIntensity = 4.0;
      setTimeout(() => {
        if (this.coreMat) this.coreMat.emissiveIntensity = 2.0;
      }, 100);
    }

    if (this.coreHp <= 0 && !this.isDead) {
      this.isDead = true;
      this.triggerSupernovaExplosion();
    }

    return this.isDead;
  }

  triggerSupernovaExplosion() {
    this.particleManager.createExplosion(this.meshGroup.position, 0x00f3ff, 150, 3.5);
    this.particleManager.createExplosion(this.meshGroup.position, 0xffea00, 110, 3.0);
    this.particleManager.createEmpShockwave(this.meshGroup.position, 70);

    const flash = new THREE.PointLight(0xffffff, 45.0, 500);
    flash.position.copy(this.meshGroup.position);
    this.scene.add(flash);

    let intensity = 45.0;
    const fade = setInterval(() => {
      intensity -= 3.0;
      if (intensity <= 0) {
        clearInterval(fade);
        this.scene.remove(flash);
      } else {
        flash.intensity = intensity;
      }
    }, 50);
  }

  destroy() {
    this.scene.remove(this.meshGroup);
    this.meshGroup.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }

  update(dt, playerPos) {
    // Slow entrance to targetZ engagement distance
    if (this.meshGroup.position.z < this.targetZ) {
      this.meshGroup.position.z += this.speed * dt;
    }

    // Contra-rotating habitat rings
    if (this.habitatRingUpper) this.habitatRingUpper.rotation.z += 0.3 * dt;
    if (this.habitatRingLower) this.habitatRingLower.rotation.z -= 0.2 * dt;
    if (this.shieldRing) this.shieldRing.rotation.z += 1.5 * dt;

    // Aim active turrets toward player position
    this.turrets.forEach(t => {
      if (!t.isDead && t.mesh) {
        const worldPos = t.mesh.getWorldPosition(new THREE.Vector3());
        t.mesh.lookAt(playerPos);
      }
    });

    // Fire plasma bursts from active turrets directly at player
    this.fireTimer -= dt;
    const activeTurretPositions = [];
    if (this.fireTimer <= 0) {
      this.fireTimer = 0.8; // High-intensity turret plasma fire
      this.turrets.forEach(t => {
        if (!t.isDead && t.mesh) {
          activeTurretPositions.push(t.mesh.getWorldPosition(new THREE.Vector3()));
        }
      });
    }

    return activeTurretPositions.length > 0 ? activeTurretPositions : false;
  }
}
