import * as THREE from 'three';

export class HaloRingBoss {
  constructor(scene, particleManager) {
    this.scene = scene;
    this.particleManager = particleManager;

    this.meshGroup = new THREE.Group();
    this.meshGroup.position.set(0, 5, -115); // Entrance from deep space

    this.targetZ = -45; // Engagement distance
    this.speed = 6.5;

    this.coreHp = 800;
    this.maxCoreHp = 800;
    this.scoreValue = 30000;
    this.isDead = false;

    this.fireTimer = 1.0;

    // 4 Heavy Point-Defense Turrets mounted on the Halo Ring perimeter
    this.turrets = [
      { id: 0, relPos: new THREE.Vector3(-32, 0, 0), hp: 160, maxHp: 160, isDead: false, mesh: null },
      { id: 1, relPos: new THREE.Vector3(32, 0, 0), hp: 160, maxHp: 160, isDead: false, mesh: null },
      { id: 2, relPos: new THREE.Vector3(0, 32, 0), hp: 160, maxHp: 160, isDead: false, mesh: null },
      { id: 3, relPos: new THREE.Vector3(0, -32, 0), hp: 160, maxHp: 160, isDead: false, mesh: null }
    ];

    this.buildHaloRingMesh();
    this.scene.add(this.meshGroup);
  }

  buildHaloRingMesh() {
    const ringRadius = 32.0;

    // 1. Outer Reinforced Carbon Steel Structure Ring
    const outerGeo = new THREE.TorusGeometry(ringRadius, 3.2, 16, 64);
    const outerMat = new THREE.MeshStandardMaterial({
      color: 0x0c1017,
      roughness: 0.3,
      metalness: 0.95,
      flatShading: true
    });
    this.spireMesh = new THREE.Mesh(outerGeo, outerMat);
    this.meshGroup.add(this.spireMesh);

    // 2. Inner Glowing Habitual Terrain Ring Band
    const innerGeo = new THREE.TorusGeometry(ringRadius - 0.2, 2.6, 16, 64);
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0x002244,
      emissive: 0x00f3ff,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.8
    });
    this.innerRing = new THREE.Mesh(innerGeo, innerMat);
    this.meshGroup.add(this.innerRing);

    // 3. Central Control Core Matrix Orb
    const coreGeo = new THREE.IcosahedronGeometry(5.5, 2);
    this.coreMat = new THREE.MeshStandardMaterial({
      color: 0x00f3ff,
      emissive: 0x00f3ff,
      emissiveIntensity: 2.5,
      roughness: 0.1
    });
    this.coreMesh = new THREE.Mesh(coreGeo, this.coreMat);
    this.meshGroup.add(this.coreMesh);

    // Rotating Core Shield Ring
    const shieldGeo = new THREE.TorusGeometry(8.5, 0.4, 16, 32);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      wireframe: true,
      transparent: true,
      opacity: 0.5
    });
    this.shieldRing = new THREE.Mesh(shieldGeo, shieldMat);
    this.meshGroup.add(this.shieldRing);

    // 4. 4 Heavy Perimeter Gun Turrets
    const turretBaseGeo = new THREE.CylinderGeometry(1.8, 2.4, 2.0, 12);
    const turretBaseMat = new THREE.MeshStandardMaterial({ color: 0x161b22, metalness: 0.95 });

    const barrelGeo = new THREE.CylinderGeometry(0.22, 0.22, 2.8, 8);
    barrelGeo.rotateX(Math.PI / 2);
    const barrelMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });

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
      this.particleManager.createExplosion(worldPos, 0x00f3ff, 40, 2.0);
    }
    return turret.isDead;
  }

  takeCoreDamage(amount) {
    this.coreHp -= amount;

    if (this.coreMat) {
      this.coreMat.emissiveIntensity = 4.5;
      setTimeout(() => {
        if (this.coreMat) this.coreMat.emissiveIntensity = 2.5;
      }, 100);
    }

    if (this.coreHp <= 0 && !this.isDead) {
      this.isDead = true;
      this.triggerSupernovaExplosion();
    }

    return this.isDead;
  }

  triggerSupernovaExplosion() {
    this.particleManager.createExplosion(this.meshGroup.position, 0x00f3ff, 220, 4.5);
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
    if (this.meshGroup.position.z < this.targetZ) {
      this.meshGroup.position.z += this.speed * dt;
    }

    // Halo Megastructure axial rotation around Z-axis
    this.meshGroup.rotation.z += 0.25 * dt;

    if (this.shieldRing) {
      this.shieldRing.rotation.z += 1.8 * dt;
      this.shieldRing.rotation.x += 1.0 * dt;
    }

    this.turrets.forEach(t => {
      if (!t.isDead && t.mesh) {
        t.mesh.lookAt(playerPos);
      }
    });

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
