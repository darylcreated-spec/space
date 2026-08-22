import * as THREE from 'three';

export class BossDreadnought {
  constructor(scene, particleManager) {
    this.scene = scene;
    this.particleManager = particleManager;

    this.meshGroup = new THREE.Group();
    this.meshGroup.position.set(0, 5, -80); // Entrance from deep space

    // Subsystems HP
    this.turretLeftHp = 150;
    this.turretRightHp = 150;
    this.shieldHp = 200;
    this.coreHp = 500;
    this.maxCoreHp = 500;

    this.isDead = false;
    this.fireTimer = 1.0;
    this.scoreValue = 5000;

    this.buildBossMesh();
    this.scene.add(this.meshGroup);

    this.targetZ = -45; // Entrance position
  }

  buildBossMesh() {
    // Heavy Dreadnought Central Hull
    const hullGeo = new THREE.BoxGeometry(16, 4, 12);
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x1a0f2e,
      roughness: 0.2,
      metalness: 0.95
    });
    this.hullMesh = new THREE.Mesh(hullGeo, hullMat);
    this.meshGroup.add(this.hullMesh);

    // Glowing Core Reactor Orb
    const coreGeo = new THREE.SphereGeometry(2.5, 32, 32);
    this.coreMat = new THREE.MeshStandardMaterial({
      color: 0xff0055,
      emissive: 0xff0055,
      emissiveIntensity: 1.2
    });
    this.coreMesh = new THREE.Mesh(coreGeo, this.coreMat);
    this.coreMesh.position.set(0, 0, 2.0);
    this.meshGroup.add(this.coreMesh);

    // Core Deflector Shield Ring
    const ringGeo = new THREE.TorusGeometry(3.6, 0.4, 16, 32);
    this.shieldMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      wireframe: true,
      transparent: true,
      opacity: 0.8
    });
    this.shieldMesh = new THREE.Mesh(ringGeo, this.shieldMat);
    this.shieldMesh.position.set(0, 0, 2.0);
    this.meshGroup.add(this.shieldMesh);

    // Heavy Wing Extensions
    const wingGeo = new THREE.BoxGeometry(12, 1.5, 6);
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x2d174d, metalness: 0.8 });

    const wR = new THREE.Mesh(wingGeo, wingMat);
    wR.position.set(13, 0, -1);
    this.meshGroup.add(wR);

    const wL = new THREE.Mesh(wingGeo, wingMat);
    wL.position.set(-13, 0, -1);
    this.meshGroup.add(wL);

    // Left & Right Subsystem Turrets
    const turretGeo = new THREE.CylinderGeometry(0.8, 1.2, 2.0, 12);
    turretGeo.rotateX(Math.PI / 2);
    const turretMat = new THREE.MeshStandardMaterial({ color: 0xff0055, metalness: 0.9 });

    this.turretLeft = new THREE.Mesh(turretGeo, turretMat);
    this.turretLeft.position.set(-14, 0.8, 2.5);
    this.meshGroup.add(this.turretLeft);

    this.turretRight = new THREE.Mesh(turretGeo, turretMat);
    this.turretRight.position.set(14, 0.8, 2.5);
    this.meshGroup.add(this.turretRight);
  }

  takeDamage(targetSubsystem, amount) {
    if (targetSubsystem === 'turretLeft' && this.turretLeftHp > 0) {
      this.turretLeftHp -= amount;
      if (this.turretLeftHp <= 0) {
        this.particleManager.createExplosion(this.turretLeft.getWorldPosition(new THREE.Vector3()), 0xff0055, 30);
        this.turretLeft.visible = false;
      }
    } else if (targetSubsystem === 'turretRight' && this.turretRightHp > 0) {
      this.turretRightHp -= amount;
      if (this.turretRightHp <= 0) {
        this.particleManager.createExplosion(this.turretRight.getWorldPosition(new THREE.Vector3()), 0xff0055, 30);
        this.turretRight.visible = false;
      }
    } else if (this.shieldHp > 0) {
      this.shieldHp -= amount;
      if (this.shieldHp <= 0) {
        this.particleManager.createExplosion(this.meshGroup.position, 0x00f3ff, 40);
        this.shieldMesh.visible = false;
      }
    } else {
      this.coreHp -= amount;
      if (this.coreHp <= 0) {
        this.isDead = true;
        this.particleManager.createExplosion(this.meshGroup.position, 0xffea00, 100);
      }
    }
    return this.isDead;
  }

  destroy() {
    this.scene.remove(this.meshGroup);
    this.meshGroup.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }

  update(dt, playerPos) {
    // Smooth entrance to targetZ
    if (this.meshGroup.position.z < this.targetZ) {
      this.meshGroup.position.z += 8.0 * dt;
    }

    // Side-to-side strafing oscillation
    this.meshGroup.position.x = Math.sin(performance.now() * 0.001) * 12.0;

    // Shield ring rotation
    if (this.shieldMesh) this.shieldMesh.rotation.z += 1.5 * dt;

    // Fire plasma salvos
    this.fireTimer -= dt;
    let fireSalvo = false;
    if (this.fireTimer <= 0) {
      this.fireTimer = 1.2;
      fireSalvo = true;
    }

    return fireSalvo;
  }
}
