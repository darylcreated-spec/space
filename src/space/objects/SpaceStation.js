import * as THREE from 'three';

export class SpaceStation {
  constructor(scene, particleManager) {
    this.scene = scene;
    this.particleManager = particleManager;

    this.meshGroup = new THREE.Group();
    this.meshGroup.position.set(0, 5, -100); // Entrance from deep space

    this.targetZ = -45; // Engagement distance
    this.speed = 7.0;

    this.coreHp = 600;
    this.maxCoreHp = 600;
    this.scoreValue = 20000;
    this.isDead = false;

    this.fireTimer = 1.0;

    // 4 Extended Heavy Gun Turrets
    this.turrets = [
      { id: 0, relPos: new THREE.Vector3(-24, 9, 4), hp: 140, maxHp: 140, isDead: false, mesh: null, barrelGroup: null },
      { id: 1, relPos: new THREE.Vector3(24, 9, 4), hp: 140, maxHp: 140, isDead: false, mesh: null, barrelGroup: null },
      { id: 2, relPos: new THREE.Vector3(-24, -9, -2), hp: 140, maxHp: 140, isDead: false, mesh: null, barrelGroup: null },
      { id: 3, relPos: new THREE.Vector3(24, -9, -2), hp: 140, maxHp: 140, isDead: false, mesh: null, barrelGroup: null }
    ];

    this.buildCitadelMesh();
    this.scene.add(this.meshGroup);
  }

  buildCitadelMesh() {
    // 1. Central Octagonal Command Spire (Gritty Heavy Tungsten & Carbon Steel)
    const spireGeo = new THREE.CylinderGeometry(6.0, 7.5, 38.0, 8);
    spireGeo.rotateX(Math.PI / 2);
    const spireMat = new THREE.MeshStandardMaterial({
      color: 0x0d1117,
      roughness: 0.25,
      metalness: 0.95,
      flatShading: true
    });
    this.spireMesh = new THREE.Mesh(spireGeo, spireMat);
    this.meshGroup.add(this.spireMesh);

    // Dark Armor Plating Ribs along Spire
    const ribGeo = new THREE.BoxGeometry(15.5, 1.2, 34.0);
    const ribMat = new THREE.MeshStandardMaterial({
      color: 0x161b22,
      roughness: 0.3,
      metalness: 0.9,
      flatShading: true
    });
    const ribs1 = new THREE.Mesh(ribGeo, ribMat);
    this.meshGroup.add(ribs1);

    const ribs2 = ribs1.clone();
    ribs2.rotation.z = Math.PI / 4;
    this.meshGroup.add(ribs2);

    // Tactical Conduit Lines (Subtle Cyan Glow)
    const lineGeo = new THREE.CylinderGeometry(0.18, 0.18, 38.5, 8);
    lineGeo.rotateX(Math.PI / 2);
    const lineMat = new THREE.MeshStandardMaterial({
      color: 0x00f3ff,
      emissive: 0x00f3ff,
      emissiveIntensity: 0.8
    });
    const conduit = new THREE.Mesh(lineGeo, lineMat);
    this.meshGroup.add(conduit);

    // 2. Inner Heavy Industrial Ring (Rotating - Gunmetal with Slit Windows)
    const ring1Geo = new THREE.TorusGeometry(18.0, 1.6, 16, 48);
    const ring1Mat = new THREE.MeshStandardMaterial({
      color: 0x161b22,
      roughness: 0.3,
      metalness: 0.9
    });
    this.habitatRingUpper = new THREE.Mesh(ring1Geo, ring1Mat);
    this.habitatRingUpper.position.set(0, 0, 5);

    // 8 Low-Profile Industrial Observation Modules
    const moduleGeo = new THREE.BoxGeometry(2.0, 1.2, 4.0);
    const moduleMat = new THREE.MeshStandardMaterial({
      color: 0x0d1117,
      emissive: 0x00a2ff,
      emissiveIntensity: 0.5,
      metalness: 0.9,
      roughness: 0.2
    });

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const mod = new THREE.Mesh(moduleGeo, moduleMat);
      mod.position.set(Math.cos(angle) * 18.0, Math.sin(angle) * 18.0, 0);
      mod.rotation.z = angle;
      this.habitatRingUpper.add(mod);
    }
    this.meshGroup.add(this.habitatRingUpper);

    // 3. Outer Perimeter Defense Ring (Contra-Rotating - Carbon Steel Truss)
    const ring2Geo = new THREE.TorusGeometry(28.0, 2.0, 16, 64);
    const ring2Mat = new THREE.MeshStandardMaterial({
      color: 0x0d1117,
      roughness: 0.2,
      metalness: 0.95
    });
    this.habitatRingLower = new THREE.Mesh(ring2Geo, ring2Mat);
    this.habitatRingLower.position.set(0, 0, -5);

    // 12 Tactical Defense Pods with Red Warning Lights
    const podMat = new THREE.MeshStandardMaterial({
      color: 0x21262d,
      emissive: 0xff0033,
      emissiveIntensity: 0.8,
      metalness: 0.9
    });

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const pod = new THREE.Mesh(moduleGeo, podMat);
      pod.position.set(Math.cos(angle) * 28.0, Math.sin(angle) * 28.0, 0);
      pod.rotation.z = angle;
      this.habitatRingLower.add(pod);
    }
    this.meshGroup.add(this.habitatRingLower);

    // 4. Central Hardened Core Reactor & Wireframe Defense Field
    const coreGeo = new THREE.SphereGeometry(4.8, 32, 32);
    this.coreMat = new THREE.MeshStandardMaterial({
      color: 0x00f3ff,
      emissive: 0x00f3ff,
      emissiveIntensity: 1.5,
      roughness: 0.1,
      metalness: 0.2
    });
    this.coreMesh = new THREE.Mesh(coreGeo, this.coreMat);
    this.meshGroup.add(this.coreMesh);

    // Heavy Wireframe Deflector Shield Field
    const shieldGeo = new THREE.IcosahedronGeometry(7.2, 2);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      wireframe: true,
      transparent: true,
      opacity: 0.4
    });
    this.shieldRing = new THREE.Mesh(shieldGeo, shieldMat);
    this.meshGroup.add(this.shieldRing);

    // 5. Heavy Structural Arm Pylons & Industrial Solar Arrays
    const pylonGeo = new THREE.BoxGeometry(52.0, 1.8, 3.5);
    const pylonMat = new THREE.MeshStandardMaterial({ color: 0x161b22, metalness: 0.95, roughness: 0.2 });
    const pylons = new THREE.Mesh(pylonGeo, pylonMat);
    this.meshGroup.add(pylons);

    // Dark Industrial Solar Array Panels
    const solarGeo = new THREE.BoxGeometry(12.0, 0.15, 7.0);
    const solarMat = new THREE.MeshStandardMaterial({
      color: 0x0a192f,
      emissive: 0x002244,
      emissiveIntensity: 0.4,
      metalness: 0.95,
      roughness: 0.1
    });

    const solarLeft = new THREE.Mesh(solarGeo, solarMat);
    solarLeft.position.set(-17.0, 0, 0);
    this.meshGroup.add(solarLeft);

    const solarRight = new THREE.Mesh(solarGeo, solarMat);
    solarRight.position.set(17.0, 0, 0);
    this.meshGroup.add(solarRight);

    // 6. Faceted Heavy Point-Defense Gun Turrets (Dark Tungsten & Crimson Laser Barrel Optics)
    const turretBaseGeo = new THREE.CylinderGeometry(1.8, 2.4, 2.2, 12);
    const turretBaseMat = new THREE.MeshStandardMaterial({ color: 0x161b22, metalness: 0.95, roughness: 0.2 });

    const barrelGeo = new THREE.CylinderGeometry(0.22, 0.22, 2.8, 8);
    barrelGeo.rotateX(Math.PI / 2);
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x0d1117, metalness: 0.9, roughness: 0.1 });

    const tipGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.5, 8);
    tipGeo.rotateX(Math.PI / 2);
    const tipMat = new THREE.MeshBasicMaterial({ color: 0xff0033 });

    this.turrets.forEach(t => {
      const tGroup = new THREE.Group();
      tGroup.position.copy(t.relPos);

      const base = new THREE.Mesh(turretBaseGeo, turretBaseMat);
      tGroup.add(base);

      const bGroup = new THREE.Group();
      const b1 = new THREE.Mesh(barrelGeo, barrelMat);
      b1.position.set(0.65, 0.5, 1.2);
      const tip1 = new THREE.Mesh(tipGeo, tipMat);
      tip1.position.z = 1.3;
      b1.add(tip1);
      bGroup.add(b1);

      const b2 = new THREE.Mesh(barrelGeo, barrelMat);
      b2.position.set(-0.65, 0.5, 1.2);
      const tip2 = new THREE.Mesh(tipGeo, tipMat);
      tip2.position.z = 1.3;
      b2.add(tip2);
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
      this.particleManager.createExplosion(worldPos, 0xff0033, 40, 2.0);
    }
    return turret.isDead;
  }

  takeCoreDamage(amount) {
    this.coreHp -= amount;

    if (this.coreMat) {
      this.coreMat.emissiveIntensity = 3.5;
      setTimeout(() => {
        if (this.coreMat) this.coreMat.emissiveIntensity = 1.5;
      }, 100);
    }

    if (this.coreHp <= 0 && !this.isDead) {
      this.isDead = true;
      this.triggerSupernovaExplosion();
    }

    return this.isDead;
  }

  triggerSupernovaExplosion() {
    this.particleManager.createExplosion(this.meshGroup.position, 0x00f3ff, 180, 4.0);
    this.particleManager.createExplosion(this.meshGroup.position, 0xffea00, 140, 3.2);
    this.particleManager.createEmpShockwave(this.meshGroup.position, 80);

    const flash = new THREE.PointLight(0xffffff, 50.0, 600);
    flash.position.copy(this.meshGroup.position);
    this.scene.add(flash);

    let intensity = 50.0;
    const fade = setInterval(() => {
      intensity -= 3.5;
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
    // Entrance to targetZ engagement distance
    if (this.meshGroup.position.z < this.targetZ) {
      this.meshGroup.position.z += this.speed * dt;
    }

    // Heavy industrial contra-rotating rings
    if (this.habitatRingUpper) this.habitatRingUpper.rotation.z += 0.4 * dt;
    if (this.habitatRingLower) this.habitatRingLower.rotation.z -= 0.25 * dt;
    if (this.shieldRing) {
      this.shieldRing.rotation.z += 1.5 * dt;
      this.shieldRing.rotation.y += 0.8 * dt;
    }

    // Aim active turrets toward player position
    this.turrets.forEach(t => {
      if (!t.isDead && t.mesh) {
        t.mesh.lookAt(playerPos);
      }
    });

    // Fire plasma bursts from active turrets directly at player
    this.fireTimer -= dt;
    const activeTurretPositions = [];
    if (this.fireTimer <= 0) {
      this.fireTimer = 0.8;
      this.turrets.forEach(t => {
        if (!t.isDead && t.mesh) {
          activeTurretPositions.push(t.mesh.getWorldPosition(new THREE.Vector3()));
        }
      });
    }

    return activeTurretPositions.length > 0 ? activeTurretPositions : false;
  }
}
