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
    // 1. Central Hexagonal Command Spire (Metallic Titanium Navy with Gold Accent Panels)
    const spireGeo = new THREE.CylinderGeometry(6, 7.5, 32, 6);
    spireGeo.rotateX(Math.PI / 2);
    const spireMat = new THREE.MeshStandardMaterial({
      color: 0x0b182b,
      roughness: 0.15,
      metalness: 0.95,
      flatShading: true
    });
    this.spireMesh = new THREE.Mesh(spireGeo, spireMat);
    this.meshGroup.add(this.spireMesh);

    // Gold Structural Accent Armor Rings
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xe6a100,
      metalness: 0.95,
      roughness: 0.1
    });
    const armorRingGeo = new THREE.CylinderGeometry(6.6, 6.6, 2.5, 6);
    armorRingGeo.rotateX(Math.PI / 2);
    const armor1 = new THREE.Mesh(armorRingGeo, goldMat);
    armor1.position.set(0, 0, 10);
    this.meshGroup.add(armor1);

    const armor2 = new THREE.Mesh(armorRingGeo, goldMat);
    armor2.position.set(0, 0, -10);
    this.meshGroup.add(armor2);

    // Glowing Cyan Power Conduits down spire
    const lineGeo = new THREE.CylinderGeometry(0.25, 0.25, 32.5, 6);
    lineGeo.rotateX(Math.PI / 2);
    const lineMat = new THREE.MeshStandardMaterial({
      color: 0x00f3ff,
      emissive: 0x00f3ff,
      emissiveIntensity: 2.0
    });
    const conduit = new THREE.Mesh(lineGeo, lineMat);
    this.meshGroup.add(conduit);

    // 2. Upper Rotating Habitat Ring (Cobalt Blue with Glowing Cyan Pods)
    const ring1Geo = new THREE.TorusGeometry(16, 1.8, 16, 32);
    const ring1Mat = new THREE.MeshStandardMaterial({
      color: 0x122b52,
      emissive: 0x0088ff,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.9
    });
    this.habitatRingUpper = new THREE.Mesh(ring1Geo, ring1Mat);
    this.habitatRingUpper.position.set(0, 0, 4);

    // 6 Glowing Cyan Habitat Pods around Upper Ring
    const podGeo = new THREE.BoxGeometry(2.5, 2.5, 3.5);
    const podMat = new THREE.MeshStandardMaterial({
      color: 0x00f3ff,
      emissive: 0x00f3ff,
      emissiveIntensity: 1.5,
      metalness: 0.8
    });

    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const pod = new THREE.Mesh(podGeo, podMat);
      pod.position.set(Math.cos(angle) * 16, Math.sin(angle) * 16, 0);
      pod.rotation.z = angle;
      this.habitatRingUpper.add(pod);
    }
    this.meshGroup.add(this.habitatRingUpper);

    // 3. Lower Contra-Rotating Habitat Ring (Imperial Purple with Glowing Neon Magenta Pods)
    const ring2Geo = new THREE.TorusGeometry(25, 2.2, 16, 32);
    const ring2Mat = new THREE.MeshStandardMaterial({
      color: 0x2a0a3b,
      emissive: 0xff00aa,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.9
    });
    this.habitatRingLower = new THREE.Mesh(ring2Geo, ring2Mat);
    this.habitatRingLower.position.set(0, 0, -4);

    // 8 Glowing Neon Magenta Observation Pods around Lower Ring
    const pod2Mat = new THREE.MeshStandardMaterial({
      color: 0xff00aa,
      emissive: 0xff00aa,
      emissiveIntensity: 1.5,
      metalness: 0.8
    });

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const pod = new THREE.Mesh(podGeo, pod2Mat);
      pod.position.set(Math.cos(angle) * 25, Math.sin(angle) * 25, 0);
      pod.rotation.z = angle;
      this.habitatRingLower.add(pod);
    }
    this.meshGroup.add(this.habitatRingLower);

    // 4. Central Glowing Core Reactor Orb
    const coreGeo = new THREE.SphereGeometry(4.5, 32, 32);
    this.coreMat = new THREE.MeshStandardMaterial({
      color: 0x00f3ff,
      emissive: 0x00f3ff,
      emissiveIntensity: 2.2,
      roughness: 0.1,
      metalness: 0.2
    });
    this.coreMesh = new THREE.Mesh(coreGeo, this.coreMat);
    this.meshGroup.add(this.coreMesh);

    // Rotating Energy Shield Ring
    const shieldGeo = new THREE.TorusGeometry(6.8, 0.4, 16, 32);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      wireframe: true,
      transparent: true,
      opacity: 0.8
    });
    this.shieldRing = new THREE.Mesh(shieldGeo, shieldMat);
    this.meshGroup.add(this.shieldRing);

    // 5. Heavy Structural Arm Pylons & Glowing Solar Arrays
    const pylonGeo = new THREE.BoxGeometry(46, 1.4, 3);
    const pylonMat = new THREE.MeshStandardMaterial({ color: 0x1b2433, metalness: 0.9, roughness: 0.2 });
    const pylons = new THREE.Mesh(pylonGeo, pylonMat);
    this.meshGroup.add(pylons);

    // Attached Solar Array Wings
    const solarGeo = new THREE.BoxGeometry(10, 0.1, 6);
    const solarMat = new THREE.MeshStandardMaterial({
      color: 0x0044bb,
      emissive: 0x002288,
      emissiveIntensity: 0.8,
      metalness: 0.9,
      roughness: 0.1
    });
    const solarLeft = new THREE.Mesh(solarGeo, solarMat);
    solarLeft.position.set(-15, 0, 0);
    this.meshGroup.add(solarLeft);

    const solarRight = new THREE.Mesh(solarGeo, solarMat);
    solarRight.position.set(15, 0, 0);
    this.meshGroup.add(solarRight);

    // 6. Dual-Barrel Point-Defense Gun Turrets (Charcoal Steel with Crimson Barrels)
    const turretBaseGeo = new THREE.CylinderGeometry(1.6, 2.2, 2.0, 12);
    const turretBaseMat = new THREE.MeshStandardMaterial({ color: 0x1b2433, metalness: 0.95 });

    const barrelGeo = new THREE.CylinderGeometry(0.2, 0.2, 2.6, 8);
    barrelGeo.rotateX(Math.PI / 2);
    const barrelMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });

    this.turrets.forEach(t => {
      const tGroup = new THREE.Group();
      tGroup.position.copy(t.relPos);

      const base = new THREE.Mesh(turretBaseGeo, turretBaseMat);
      tGroup.add(base);

      // Gold targeting sensor ring on socket
      const sensorGeo = new THREE.TorusGeometry(1.4, 0.15, 8, 16);
      sensorGeo.rotateX(Math.PI / 2);
      const sensorMat = new THREE.MeshStandardMaterial({ color: 0xe6a100, emissive: 0xe6a100, emissiveIntensity: 1.0 });
      const sensor = new THREE.Mesh(sensorGeo, sensorMat);
      sensor.position.y = 1.0;
      tGroup.add(sensor);

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
        if (this.coreMat) this.coreMat.emissiveIntensity = 2.2;
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

    // Active contra-rotating habitat rings with glowing pods
    if (this.habitatRingUpper) this.habitatRingUpper.rotation.z += 0.6 * dt;  // Clockwise
    if (this.habitatRingLower) this.habitatRingLower.rotation.z -= 0.4 * dt;  // Counter-clockwise
    if (this.shieldRing) {
      this.shieldRing.rotation.z += 2.0 * dt;
      this.shieldRing.rotation.y += 1.0 * dt;
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
