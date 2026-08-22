import * as THREE from 'three';

export class PlayerSwarmMissile {
  constructor(scene, startPos, target, particleManager) {
    this.scene = scene;
    this.particleManager = particleManager;
    this.target = target;
    this.isDead = false;
    this.damage = 180;
    this.speed = 48.0;
    this.life = 3.5;
    this._time = 0;

    this.meshGroup = new THREE.Group();
    this.meshGroup.position.copy(startPos);

    // Initial outward arc impulse
    const arcX = (Math.random() - 0.5) * 18.0;
    const arcY = (Math.random() - 0.2) * 14.0;
    this.velocity = new THREE.Vector3(arcX, arcY, -25.0);

    // Missile Body
    const bodyGeo = new THREE.CylinderGeometry(0.18, 0.22, 1.8, 8);
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x00f3ff,
      emissive: 0x0088ff,
      emissiveIntensity: 0.8,
      metalness: 0.9,
      roughness: 0.2
    });
    this.mesh = new THREE.Mesh(bodyGeo, bodyMat);
    this.meshGroup.add(this.mesh);

    // Exhaust Flare
    const flareGeo = new THREE.ConeGeometry(0.24, 0.9, 8);
    flareGeo.rotateX(-Math.PI / 2);
    const flareMat = new THREE.MeshBasicMaterial({ color: 0x00ffea });
    const flare = new THREE.Mesh(flareGeo, flareMat);
    flare.position.set(0, 0, 0.9);
    this.meshGroup.add(flare);

    this.scene.add(this.meshGroup);
  }

  getTargetPosition() {
    if (!this.target) return null;
    if (this.target.isDead) return null;

    if (this.target.meshGroup) return this.target.meshGroup.position;
    if (this.target.mesh) {
      const p = new THREE.Vector3();
      this.target.mesh.getWorldPosition(p);
      return p;
    }
    if (this.target.position) return this.target.position;
    return null;
  }

  update(dt) {
    if (this.isDead) return;
    this._time += dt;
    this.life -= dt;
    if (this.life <= 0) {
      this.destroy();
      return;
    }

    const tPos = this.getTargetPosition();
    const curPos = this.meshGroup.position;

    if (tPos && this._time > 0.15) {
      const desiredDir = new THREE.Vector3().subVectors(tPos, curPos).normalize();
      const steerSpeed = Math.min(12.0, 4.0 + this._time * 8.0);
      this.velocity.lerp(desiredDir.multiplyScalar(this.speed), steerSpeed * dt);
    }

    curPos.addScaledVector(this.velocity, dt);

    if (this.velocity.lengthSq() > 0.01) {
      const lookTarget = curPos.clone().add(this.velocity);
      this.meshGroup.lookAt(lookTarget);
    }

    if (this.particleManager && Math.random() < 0.75) {
      this.particleManager.spawnEngineParticle(curPos, 0x00f3ff);
    }
  }

  explode() {
    if (this.particleManager) {
      this.particleManager.createExplosion(this.meshGroup.position, 0x00f3ff, 45, 1.8);
      this.particleManager.createEmpShockwave(this.meshGroup.position, 15);
    }
    this.destroy();
  }

  destroy() {
    this.isDead = true;
    this.scene.remove(this.meshGroup);
    this.meshGroup.traverse(c => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    });
  }
}
