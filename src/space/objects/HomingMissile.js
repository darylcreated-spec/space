import * as THREE from 'three';

export class HomingMissile {
  constructor(scene, startPos, targetPos) {
    this.scene = scene;
    this.meshGroup = new THREE.Group();
    this.meshGroup.position.copy(startPos);

    this.speed = 28.0;
    this.radius = 1.2;
    this.isDead = false;
    this.lockLost = false;
    this.lifeTimer = 6.0;

    // Missile body
    const bodyGeo = new THREE.CylinderGeometry(0.35, 0.45, 2.2, 8);
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x222b3a, metalness: 0.9, roughness: 0.3 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    this.meshGroup.add(body);

    // Glowing warhead tip
    const noseGeo = new THREE.ConeGeometry(0.4, 0.8, 8);
    noseGeo.rotateX(-Math.PI / 2);
    const noseMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.z = -1.3;
    this.meshGroup.add(nose);

    // Thruster engine glow
    this.trailLight = new THREE.PointLight(0xff4400, 3.0, 10);
    this.trailLight.position.z = 1.2;
    this.meshGroup.add(this.trailLight);

    // Initial velocity toward target
    this.velocity = targetPos.clone().sub(startPos).normalize().multiplyScalar(this.speed);
    this.meshGroup.lookAt(startPos.clone().add(this.velocity));

    this.scene.add(this.meshGroup);
  }

  update(dt, playerShip, particleManager) {
    if (this.isDead) return;

    this.lifeTimer -= dt;
    if (this.lifeTimer <= 0) {
      this.destroy();
      return;
    }

    // Check if player is dodging â€” if dodging, missile loses lock!
    if (playerShip && playerShip.isDodging) {
      this.lockLost = true;
    }

    if (!this.lockLost && playerShip && playerShip.meshGroup) {
      // Homing guidance math
      const targetPos = playerShip.meshGroup.position.clone();
      const dirToPlayer = targetPos.sub(this.meshGroup.position).normalize();
      
      // Turn velocity smoothly toward player
      this.velocity.lerp(dirToPlayer.multiplyScalar(this.speed), dt * 3.5);
      this.meshGroup.lookAt(this.meshGroup.position.clone().add(this.velocity));
    }

    // Move missile
    this.meshGroup.position.addScaledVector(this.velocity, dt);

    // Thruster particles
    if (particleManager && Math.random() < 0.6) {
      particleManager.createExplosion(this.meshGroup.position, 0xff4400, 3, 0.4);
    }
  }

  destroy() {
    this.isDead = true;
    if (this.meshGroup) {
      this.scene.remove(this.meshGroup);
      this.meshGroup.traverse(c => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) c.material.dispose();
      });
    }
  }
}
