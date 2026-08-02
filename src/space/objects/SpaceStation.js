import * as THREE from 'three';

export class SpaceStation {
  constructor(scene, particleManager) {
    this.scene = scene;
    this.particleManager = particleManager;

    this.meshGroup = new THREE.Group();
    this.meshGroup.position.set(0, 4, -90); // Spawns in deep space backdrop

    this.targetZ = -40; // Entrance position
    this.speed = 6.0;

    this.coreHp = 400;
    this.maxCoreHp = 400;
    this.scoreValue = 10000;
    this.isDead = false;

    this.fireTimer = 1.2;

    // 4 Point-Defense Hull Turrets
    this.turrets = [
      { id: 0, relPos: new THREE.Vector3(-12, 5, 2), hp: 100, maxHp: 100, isDead: false, mesh: null },
      { id: 1, relPos: new THREE.Vector3(12, 5, 2), hp: 100, maxHp: 100, isDead: false, mesh: null },
      { id: 2, relPos: new THREE.Vector3(-14, -4, -2), hp: 100, maxHp: 100, isDead: false, mesh: null },
      { id: 3, relPos: new THREE.Vector3(14, -4, -2), hp: 100, maxHp: 100, isDead: false, mesh: null }
    ];

    this.buildStationMesh();
    this.scene.add(this.meshGroup);
  }

  buildStationMesh() {
    // 1. Central Core Habitat Cylinder
    const coreGeo = new THREE.CylinderGeometry(8, 8, 14, 24);
    coreGeo.rotateX(Math.PI / 2);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x162238,
      roughness: 0.2,
      metalness: 0.85
    });
    this.coreMesh = new THREE.Mesh(coreGeo, coreMat);
    this.meshGroup.add(this.coreMesh);

    // 2. Glowing Habitat Ring
    const ringGeo = new THREE.TorusGeometry(18, 1.8, 16, 32);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x00f3ff,
      emissive: 0x00a2ff,
      emissiveIntensity: 0.6,
      roughness: 0.3,
      metalness: 0.7
    });
    this.habitatRing = new THREE.Mesh(ringGeo, ringMat);
    this.meshGroup.add(this.habitatRing);

    // 3. Cyan Docking Bay Lights
    const bayGeo = new THREE.BoxGeometry(6, 4, 12);
    const bayMat = new THREE.MeshStandardMaterial({
      color: 0x00f3ff,
      emissive: 0x00f3ff,
      emissiveIntensity: 1.2
    });
    const bay = new THREE.Mesh(bayGeo, bayMat);
    bay.position.set(0, 0, 4);
    this.meshGroup.add(bay);

    // 4. Solar Array Wings
    const solarGeo = new THREE.BoxGeometry(22, 0.4, 6);
    const solarMat = new THREE.MeshStandardMaterial({
      color: 0x064379,
      roughness: 0.1,
      metalness: 0.9
    });

    const wingL = new THREE.Mesh(solarGeo, solarMat);
    wingL.position.set(-24, 0, 0);
    this.meshGroup.add(wingL);

    const wingR = new THREE.Mesh(solarGeo, solarMat);
    wingR.position.set(24, 0, 0);
    this.meshGroup.add(wingR);

    // 5. Point-Defense Gun Turrets
    const turretGeo = new THREE.CylinderGeometry(1.0, 1.5, 2.5, 12);
    turretGeo.rotateX(Math.PI / 2);
    const turretMat = new THREE.MeshStandardMaterial({
      color: 0xff0055,
      metalness: 0.9,
      roughness: 0.2
    });

    this.turrets.forEach(t => {
      const tMesh = new THREE.Mesh(turretGeo, turretMat.clone());
      tMesh.position.copy(t.relPos);
      this.meshGroup.add(tMesh);
      t.mesh = tMesh;
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
      this.particleManager.createExplosion(worldPos, 0xff0055, 30, 1.5);
    }
    return turret.isDead;
  }

  takeCoreDamage(amount) {
    this.coreHp -= amount;

    if (this.coreHp <= 0 && !this.isDead) {
      this.isDead = true;
      this.triggerSupernovaExplosion();
    }

    return this.isDead;
  }

  triggerSupernovaExplosion() {
    this.particleManager.createExplosion(this.meshGroup.position, 0x00f3ff, 120, 3.0);
    this.particleManager.createExplosion(this.meshGroup.position, 0xffea00, 90, 2.5);
    this.particleManager.createEmpShockwave(this.meshGroup.position, 60);

    const flash = new THREE.PointLight(0xffffff, 40.0, 400);
    flash.position.copy(this.meshGroup.position);
    this.scene.add(flash);

    let intensity = 40.0;
    const fade = setInterval(() => {
      intensity -= 2.5;
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

  update(dt, _playerPos) {
    // Slow entrance to targetZ
    if (this.meshGroup.position.z < this.targetZ) {
      this.meshGroup.position.z += this.speed * dt;
    }

    // Slow rotation of outer habitat ring
    if (this.habitatRing) this.habitatRing.rotation.z += 0.4 * dt;

    // Fire point-defense plasma bursts from active turrets
    this.fireTimer -= dt;
    let fireSalvo = false;
    if (this.fireTimer <= 0) {
      this.fireTimer = 1.4;
      fireSalvo = this.turrets.some(t => !t.isDead);
    }

    return fireSalvo;
  }
}
