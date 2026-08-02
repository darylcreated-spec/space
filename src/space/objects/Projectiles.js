import * as THREE from 'three';

export class LaserBolt {
  constructor(scene, startPos, colorHex = 0x00f3ff, isEnemy = false, targetDir = null) {
    this.scene = scene;
    this.isEnemy = isEnemy;
    this.damage = 15;
    this.speed = isEnemy ? 45 : 90;
    this.radius = 1.2; // Generous hit radius so every asteroid takes damage cleanly!
    this.isDead = false;

    this.meshGroup = new THREE.Group();
    this.meshGroup.position.copy(startPos);

    if (targetDir) {
      this.direction = targetDir.clone().normalize();
      this.meshGroup.lookAt(new THREE.Vector3().addVectors(startPos, this.direction));
    } else {
      this.direction = new THREE.Vector3(0, 0, isEnemy ? 1 : -1);
      if (isEnemy) this.meshGroup.rotation.y = Math.PI;
    }

    // Outer glowing laser beam cylinder
    const geo = new THREE.CylinderGeometry(0.09, 0.09, 2.2, 8);
    geo.rotateX(Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: colorHex });
    const beam = new THREE.Mesh(geo, mat);
    this.meshGroup.add(beam);

    // Inner bright white core
    const coreGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.2, 8);
    coreGeo.rotateX(Math.PI / 2);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const core = new THREE.Mesh(coreGeo, coreMat);
    this.meshGroup.add(core);

    this.scene.add(this.meshGroup);
  }

  destroy() {
    this.scene.remove(this.meshGroup);
    this.meshGroup.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }

  update(dt) {
    this.meshGroup.position.addScaledVector(this.direction, this.speed * dt);

    // Boundary check
    if (
      this.meshGroup.position.z < -140 ||
      this.meshGroup.position.z > 40 ||
      Math.abs(this.meshGroup.position.x) > 50 ||
      Math.abs(this.meshGroup.position.y) > 40
    ) {
      this.isDead = true;
    }
  }
}



export class PlasmaPulse {
  constructor(scene, startPos, particleManager) {
    this.scene = scene;
    this.particleManager = particleManager;
    this.damage = 250;
    this.aoeRadius = 16.0;
    this.speed = 55;
    this.radius = 1.8;
    this.isDead = false;

    this.meshGroup = new THREE.Group();
    this.meshGroup.position.copy(startPos);

    // 1. Core Glowing Superheated Plasma Orb
    const orbGeo = new THREE.SphereGeometry(1.4, 24, 24);
    this.orbMat = new THREE.MeshStandardMaterial({
      color: 0x00f3ff,
      emissive: 0x00f3ff,
      emissiveIntensity: 2.0,
      roughness: 0.1,
      metalness: 0.2
    });
    this.orbMesh = new THREE.Mesh(orbGeo, this.orbMat);
    this.meshGroup.add(this.orbMesh);

    // 2. Orbiting Energy Plasma Shield Ring
    const ringGeo = new THREE.TorusGeometry(2.0, 0.2, 16, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff00aa,
      wireframe: true,
      transparent: true,
      opacity: 0.8
    });
    this.plasmaRing = new THREE.Mesh(ringGeo, ringMat);
    this.meshGroup.add(this.plasmaRing);

    // 3. Bright White Core Center
    const centerGeo = new THREE.SphereGeometry(0.7, 16, 16);
    const centerMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const centerMesh = new THREE.Mesh(centerGeo, centerMat);
    this.meshGroup.add(centerMesh);

    this.scene.add(this.meshGroup);
  }

  destroy() {
    this.scene.remove(this.meshGroup);
    this.meshGroup.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }

  update(dt) {
    // Travel forward into deep space
    this.meshGroup.position.z -= this.speed * dt;

    // Pulsing energy ring rotation
    if (this.plasmaRing) {
      this.plasmaRing.rotation.z += 5.0 * dt;
      this.plasmaRing.rotation.x += 3.0 * dt;
    }

    // Particle trail
    this.particleManager.spawnEngineParticle(this.meshGroup.position, 0x00f3ff);

    // Boundary check
    if (this.meshGroup.position.z < -140) {
      this.isDead = true;
    }
  }
}
