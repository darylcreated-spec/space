import * as THREE from 'three';

export class Babylon5Boss {
  constructor(scene, particleManager) {
    this.scene = scene;
    this.particleManager = particleManager;

    this.meshGroup = new THREE.Group();
    this.meshGroup.position.set(0, 5, -120); // Entrance from deep space

    this.targetZ = -45; // Engagement distance
    this.speed = 6.0;

    this.coreHp = 1200;
    this.maxCoreHp = 1200;
    this.scoreValue = 50000;
    this.isDead = false;

    this.fireTimer = 1.0;

    // 6 Heavy Point-Defense Gun Turrets along the Babylon 5 Industrial Cylinder Hull
    this.turrets = [
      { id: 0, relPos: new THREE.Vector3(-14, 10, 15), hp: 200, maxHp: 200, isDead: false, mesh: null },
      { id: 1, relPos: new THREE.Vector3(14, 10, 15), hp: 200, maxHp: 200, isDead: false, mesh: null },
      { id: 2, relPos: new THREE.Vector3(-14, -10, 5), hp: 200, maxHp: 200, isDead: false, mesh: null },
      { id: 3, relPos: new THREE.Vector3(14, -10, 5), hp: 200, maxHp: 200, isDead: false, mesh: null },
      { id: 4, relPos: new THREE.Vector3(-14, 10, -15), hp: 200, maxHp: 200, isDead: false, mesh: null },
      { id: 5, relPos: new THREE.Vector3(14, 10, -15), hp: 200, maxHp: 200, isDead: false, mesh: null }
    ];

    this.buildBabylon5Mesh();
    this.scene.add(this.meshGroup);
  }

  buildBabylon5Mesh() {
    // 1. Central Babylon 5 Rotating Industrial Cylinder Hull
    const mainLength = 50.0;
    const mainRadius = 12.0;

    const cylGeo = new THREE.CylinderGeometry(mainRadius, mainRadius + 1.5, mainLength, 16);
    cylGeo.rotateX(Math.PI / 2);
    const cylMat = new THREE.MeshStandardMaterial({
      color: 0x0a0f18,
      roughness: 0.25,
      metalness: 0.95,
      flatShading: true
    });
    this.spireMesh = new THREE.Mesh(cylGeo, cylMat);
    this.meshGroup.add(this.spireMesh);

    // 2. 3 Contra-Rotating Mechanical Habitat Drums along Cylinder Body
    this.habitatDrums = [];
    const drumGeo = new THREE.CylinderGeometry(mainRadius + 2.5, mainRadius + 2.5, 8.0, 16);
    drumGeo.rotateX(Math.PI / 2);
    const drumMat = new THREE.MeshStandardMaterial({
      color: 0x161b22,
      emissive: 0xffaa00,
      emissiveIntensity: 0.4,
      roughness: 0.3,
      metalness: 0.9
    });

    const offsets = [-15, 0, 15];
    offsets.forEach((zOff, idx) => {
      const drum = new THREE.Mesh(drumGeo, drumMat);
      drum.position.z = zOff;
      this.meshGroup.add(drum);
      this.habitatDrums.push({ mesh: drum, speed: idx % 2 === 0 ? 0.5 : -0.4 });
    });

    // 3. Front Concave Tactical Hangar Bay (Glowing Gold Reactor Core)
    const hangarGeo = new THREE.CylinderGeometry(7.0, 8.5, 4.0, 16);
    hangarGeo.rotateX(Math.PI / 2);
    this.coreMat = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      emissive: 0xffaa00,
      emissiveIntensity: 2.8,
      roughness: 0.1
    });
    this.coreMesh = new THREE.Mesh(hangarGeo, this.coreMat);
    this.coreMesh.position.z = mainLength / 2 + 1.0;
    this.meshGroup.add(this.coreMesh);

    // Rotating Energy Shield Ring
    const shieldGeo = new THREE.TorusGeometry(mainRadius + 4.0, 0.5, 16, 32);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      wireframe: true,
      transparent: true,
      opacity: 0.6
    });
    this.shieldRing = new THREE.Mesh(shieldGeo, shieldMat);
    this.meshGroup.add(this.shieldRing);

    // 4. 6 Heavy Point-Defense Gun Turrets
    const turretBaseGeo = new THREE.CylinderGeometry(2.0, 2.6, 2.2, 12);
    const turretBaseMat = new THREE.MeshStandardMaterial({ color: 0x161b22, metalness: 0.95 });

    const barrelGeo = new THREE.CylinderGeometry(0.24, 0.24, 3.0, 8);
    barrelGeo.rotateX(Math.PI / 2);
    const barrelMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });

    this.turrets.forEach(t => {
      const tGroup = new THREE.Group();
      tGroup.position.copy(t.relPos);

      const base = new THREE.Mesh(turretBaseGeo, turretBaseMat);
      tGroup.add(base);

      const bGroup = new THREE.Group();
      const b1 = new THREE.Mesh(barrelGeo, barrelMat);
      b1.position.set(0.7, 0.5, 1.2);
      bGroup.add(b1);

      const b2 = new THREE.Mesh(barrelGeo, barrelMat);
      b2.position.set(-0.7, 0.5, 1.2);
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
      this.particleManager.createExplosion(worldPos, 0xffaa00, 45, 2.2);
    }
    return turret.isDead;
  }

  takeCoreDamage(amount) {
    this.coreHp -= amount;

    if (this.coreMat) {
      this.coreMat.emissiveIntensity = 5.0;
      setTimeout(() => {
        if (this.coreMat) this.coreMat.emissiveIntensity = 2.8;
      }, 100);
    }

    if (this.coreHp <= 0 && !this.isDead) {
      this.isDead = true;
      this.triggerSupernovaExplosion();
    }

    return this.isDead;
  }

  triggerSupernovaExplosion() {
    this.particleManager.createExplosion(this.meshGroup.position, 0xffaa00, 250, 5.0);
    this.particleManager.createExplosion(this.meshGroup.position, 0x00f3ff, 180, 4.0);
    this.particleManager.createEmpShockwave(this.meshGroup.position, 100);

    const flash = new THREE.PointLight(0xffffff, 60.0, 800);
    flash.position.copy(this.meshGroup.position);
    this.scene.add(flash);

    let intensity = 60.0;
    const fade = setInterval(() => {
      intensity -= 4.0;
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

    // Babylon 5 Contra-Rotating Industrial Habitat Drums
    this.habitatDrums.forEach(d => {
      d.mesh.rotation.z += d.speed * dt;
    });

    if (this.shieldRing) {
      this.shieldRing.rotation.z += 2.0 * dt;
      this.shieldRing.rotation.x += 1.2 * dt;
    }

    this.turrets.forEach(t => {
      if (!t.isDead && t.mesh) {
        t.mesh.lookAt(playerPos);
      }
    });

    this.fireTimer -= dt;
    const activeTurretPositions = [];
    if (this.fireTimer <= 0) {
      this.fireTimer = 0.75;
      this.turrets.forEach(t => {
        if (!t.isDead && t.mesh) {
          activeTurretPositions.push(t.mesh.getWorldPosition(new THREE.Vector3()));
        }
      });
    }

    return activeTurretPositions.length > 0 ? activeTurretPositions : false;
  }
}
