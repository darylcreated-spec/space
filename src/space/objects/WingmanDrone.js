import * as THREE from 'three';

export class WingmanDrone {
  constructor(scene, particleManager, slot = 'LEFT') {
    this.scene = scene;
    this.particleManager = particleManager;
    this.slot = slot; // 'LEFT' or 'RIGHT'

    this.meshGroup = new THREE.Group();
    this.targetOffset = new THREE.Vector3(slot === 'LEFT' ? -3.4 : 3.4, 0.5, 1.2);
    this.currentPos = new THREE.Vector3();
    this.fireTimer = 0;
    this.fireInterval = 0.18;
    this.shieldHp = 50;
    this.maxShieldHp = 50;
    this.isDead = false;

    this.buildMesh();
    this.scene.add(this.meshGroup);
  }

  buildMesh() {
    // ── Allied Wingman Support Drone Model ──
    const bodyGeo = new THREE.ConeGeometry(0.55, 1.6, 6);
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1a2638,
      metalness: 0.85,
      roughness: 0.25,
      emissive: 0x003344,
      emissiveIntensity: 0.3
    });
    this.bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    this.meshGroup.add(this.bodyMesh);

    // Twin Forward Weapon Sponsons
    const gunGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.8, 8);
    gunGeo.rotateX(Math.PI / 2);
    const gunMat = new THREE.MeshStandardMaterial({
      color: 0x050c18,
      metalness: 0.9,
      roughness: 0.2
    });

    const leftGun = new THREE.Mesh(gunGeo, gunMat);
    leftGun.position.set(-0.35, 0, -0.3);
    this.meshGroup.add(leftGun);

    const rightGun = new THREE.Mesh(gunGeo, gunMat);
    rightGun.position.set(0.35, 0, -0.3);
    this.meshGroup.add(rightGun);

    // Glowing Ion Thruster
    const engineGeo = new THREE.SphereGeometry(0.18, 8, 8);
    const engineMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
    this.engineMesh = new THREE.Mesh(engineGeo, engineMat);
    this.engineMesh.position.set(0, 0, 0.75);
    this.meshGroup.add(this.engineMesh);

    // Mini Shield Bubble
    const shieldGeo = new THREE.IcosahedronGeometry(0.95, 1);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      wireframe: true,
      transparent: true,
      opacity: 0.25
    });
    this.shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    this.meshGroup.add(this.shieldMesh);
  }

  update(dt, playerShip, gameManager) {
    if (this.isDead || !playerShip || !playerShip.meshGroup) return;

    // Smooth spring interpolation to follow player wing position
    const idealPos = playerShip.meshGroup.position.clone().add(this.targetOffset);
    idealPos.y += Math.sin(Date.now() * 0.004 + (this.slot === 'LEFT' ? 0 : Math.PI)) * 0.25;

    this.meshGroup.position.lerp(idealPos, 12.0 * dt);
    this.meshGroup.rotation.z = playerShip.meshGroup.rotation.z * 0.8;
    this.meshGroup.rotation.x = playerShip.meshGroup.rotation.x * 0.8;

    // Engine particle trail
    if (this.particleManager && Math.random() < 0.35) {
      const engineWorld = this.meshGroup.localToWorld(new THREE.Vector3(0, 0, 0.8));
      this.particleManager.spawnEngineParticle(engineWorld, 0x00f3ff);
    }

    // Auto-Targeting & Synchronized Support Fire
    this.fireTimer += dt;
    if (this.fireTimer >= this.fireInterval && gameManager.state === 'PLAYING') {
      this.fireTimer = 0;
      this.fireSupportBlaster(gameManager);
    }
  }

  fireSupportBlaster(gameManager) {
    if (!gameManager) return;
    const muzzleL = this.meshGroup.localToWorld(new THREE.Vector3(-0.35, 0, -0.8));
    const muzzleR = this.meshGroup.localToWorld(new THREE.Vector3(0.35, 0, -0.8));

    gameManager.spawnLaser(muzzleL, 0x00f3ff, false, null, false, 'STANDARD');
    gameManager.spawnLaser(muzzleR, 0x00f3ff, false, null, false, 'STANDARD');
  }

  destroy() {
    this.isDead = true;
    if (this.meshGroup && this.scene) {
      this.scene.remove(this.meshGroup);
    }
  }
}
