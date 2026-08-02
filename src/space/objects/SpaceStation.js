import * as THREE from 'three';

export class SpaceStation {
  constructor(scene, particleManager) {
    this.scene = scene;
    this.particleManager = particleManager;

    this.meshGroup = new THREE.Group();
    this.meshGroup.position.set(0, 5, -110); // Entrance from deep space

    this.targetZ = -40; // Orbital engagement distance
    this.speed = 6.0;

    this.coreHp = 700;
    this.maxCoreHp = 700;
    this.scoreValue = 25000;
    this.isDead = false;

    this.fireTimer = 1.0;

    // 4 Surface Point-Defense Turrets mounted on the spherical hull
    this.turrets = [
      { id: 0, relPos: new THREE.Vector3(-16, 12, 10), hp: 150, maxHp: 150, isDead: false, mesh: null, barrelGroup: null },
      { id: 1, relPos: new THREE.Vector3(16, 12, 10), hp: 150, maxHp: 150, isDead: false, mesh: null, barrelGroup: null },
      { id: 2, relPos: new THREE.Vector3(-18, -10, 8), hp: 150, maxHp: 150, isDead: false, mesh: null, barrelGroup: null },
      { id: 3, relPos: new THREE.Vector3(18, -10, 8), hp: 150, maxHp: 150, isDead: false, mesh: null, barrelGroup: null }
    ];

    this.buildDeathStarMesh();
    this.scene.add(this.meshGroup);
  }

  buildDeathStarMesh() {
    // 1. Massive Imperial Spherical Armor Hull
    const mainRadius = 22.0;
    const sphereGeo = new THREE.SphereGeometry(mainRadius, 36, 36);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0x0c1017,
      roughness: 0.35,
      metalness: 0.9,
      flatShading: true
    });
    this.spireMesh = new THREE.Mesh(sphereGeo, sphereMat);
    this.meshGroup.add(this.spireMesh);

    // 2. Equatorial Trench Band around equator
    const trenchGeo = new THREE.TorusGeometry(mainRadius + 0.1, 0.9, 16, 64);
    const trenchMat = new THREE.MeshStandardMaterial({
      color: 0x05070a,
      roughness: 0.5,
      metalness: 0.95
    });
    this.equatorialTrench = new THREE.Mesh(trenchGeo, trenchMat);
    this.meshGroup.add(this.equatorialTrench);

    // Glowing Trench Hangar Bays & Energy Conduits
    const trenchLightGeo = new THREE.TorusGeometry(mainRadius + 0.15, 0.2, 8, 64);
    const trenchLightMat = new THREE.MeshStandardMaterial({
      color: 0x00ff66,
      emissive: 0x00ff66,
      emissiveIntensity: 1.2
    });
    const trenchLight = new THREE.Mesh(trenchLightGeo, trenchLightMat);
    this.meshGroup.add(trenchLight);

    // 3. Iconic Parabolic Superlaser Lens Dish (Northern Hemisphere)
    const dishGroup = new THREE.Group();
    dishGroup.position.set(-6.5, 7.5, mainRadius - 1.2);
    dishGroup.rotation.y = -Math.PI / 12;
    dishGroup.rotation.x = Math.PI / 14;

    // Recessed Concave Parabolic Dish Rim
    const dishRimGeo = new THREE.CylinderGeometry(5.5, 5.0, 1.2, 24);
    dishRimGeo.rotateX(Math.PI / 2);
    const dishRimMat = new THREE.MeshStandardMaterial({
      color: 0x121722,
      metalness: 0.95,
      roughness: 0.2,
      flatShading: true
    });
    const dishRim = new THREE.Mesh(dishRimGeo, dishRimMat);
    dishGroup.add(dishRim);

    // Superlaser Glowing Emerald Core Focus Orb
    const laserCoreGeo = new THREE.SphereGeometry(1.6, 24, 24);
    this.coreMat = new THREE.MeshStandardMaterial({
      color: 0x00ff66,
      emissive: 0x00ff66,
      emissiveIntensity: 3.5,
      roughness: 0.1
    });
    this.coreMesh = new THREE.Mesh(laserCoreGeo, this.coreMat);
    this.coreMesh.position.z = -0.4;
    dishGroup.add(this.coreMesh);

    // 8 Converging Superlaser Emitter Beams
    const beamGeo = new THREE.CylinderGeometry(0.08, 0.08, 5.0, 8);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0x00ff66 });

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set(Math.cos(angle) * 4.2, Math.sin(angle) * 4.2, 0.5);
      beam.rotation.z = angle + Math.PI / 2;
      beam.rotation.x = Math.PI / 6;
      dishGroup.add(beam);
    }

    this.meshGroup.add(dishGroup);

    // 4. Rotating Energy Shield Ring
    const shieldGeo = new THREE.IcosahedronGeometry(mainRadius + 3.0, 2);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x00ff66,
      wireframe: true,
      transparent: true,
      opacity: 0.35
    });
    this.shieldRing = new THREE.Mesh(shieldGeo, shieldMat);
    this.meshGroup.add(this.shieldRing);

    // 5. Heavy Surface Point-Defense Dual Gun Turrets
    const turretBaseGeo = new THREE.CylinderGeometry(1.8, 2.4, 1.8, 12);
    const turretBaseMat = new THREE.MeshStandardMaterial({ color: 0x161b22, metalness: 0.95 });

    const barrelGeo = new THREE.CylinderGeometry(0.22, 0.22, 2.6, 8);
    barrelGeo.rotateX(Math.PI / 2);
    const barrelMat = new THREE.MeshBasicMaterial({ color: 0x00ff66 });

    this.turrets.forEach(t => {
      const tGroup = new THREE.Group();
      tGroup.position.copy(t.relPos);

      const base = new THREE.Mesh(turretBaseGeo, turretBaseMat);
      tGroup.add(base);

      const bGroup = new THREE.Group();
      const b1 = new THREE.Mesh(barrelGeo, barrelMat);
      b1.position.set(0.65, 0.5, 1.0);
      bGroup.add(b1);

      const b2 = new THREE.Mesh(barrelGeo, barrelMat);
      b2.position.set(-0.65, 0.5, 1.0);
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
      this.particleManager.createExplosion(worldPos, 0x00ff66, 40, 2.0);
    }
    return turret.isDead;
  }

  takeCoreDamage(amount) {
    this.coreHp -= amount;

    if (this.coreMat) {
      this.coreMat.emissiveIntensity = 5.0;
      setTimeout(() => {
        if (this.coreMat) this.coreMat.emissiveIntensity = 3.5;
      }, 100);
    }

    if (this.coreHp <= 0 && !this.isDead) {
      this.isDead = true;
      this.triggerSupernovaExplosion();
    }

    return this.isDead;
  }

  triggerSupernovaExplosion() {
    this.particleManager.createExplosion(this.meshGroup.position, 0x00ff66, 200, 4.5);
    this.particleManager.createExplosion(this.meshGroup.position, 0xffea00, 160, 3.5);
    this.particleManager.createEmpShockwave(this.meshGroup.position, 90);

    const flash = new THREE.PointLight(0xffffff, 55.0, 700);
    flash.position.copy(this.meshGroup.position);
    this.scene.add(flash);

    let intensity = 55.0;
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

    // Slow orbital axial rotation around Y-axis
    this.meshGroup.rotation.y += 0.08 * dt;

    if (this.shieldRing) {
      this.shieldRing.rotation.z += 1.5 * dt;
      this.shieldRing.rotation.x += 0.8 * dt;
    }

    // Aim active surface turrets toward player position
    this.turrets.forEach(t => {
      if (!t.isDead && t.mesh) {
        t.mesh.lookAt(playerPos);
      }
    });

    // Fire emerald plasma bursts from active turrets directly at player
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
