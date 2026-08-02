import * as THREE from 'three';

export class LaserBolt {
  constructor(scene, startPos, colorHex = 0x00f3ff, isEnemy = false, targetDir = null) {
    this.scene = scene;
    this.isEnemy = isEnemy;
    this.damage = 15;
    this.speed = isEnemy ? 45 : 90;
    this.radius = 0.8;
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

export class Torpedo {
  constructor(scene, startPos, particleManager) {
    this.scene = scene;
    this.particleManager = particleManager;
    this.damage = 80;
    this.aoeRadius = 10.0;
    this.speed = 40;
    this.radius = 0.8;
    this.isDead = false;
    this.target = null;

    // 3D Homing Missile model
    this.meshGroup = new THREE.Group();
    this.meshGroup.position.copy(startPos);

    const bodyGeo = new THREE.CylinderGeometry(0.18, 0.18, 1.0, 12);
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffea00, metalness: 0.9, roughness: 0.1 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    this.meshGroup.add(body);

    const noseGeo = new THREE.ConeGeometry(0.18, 0.45, 12);
    noseGeo.rotateX(-Math.PI / 2);
    const noseMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.z = -0.7;
    this.meshGroup.add(nose);

    this.scene.add(this.meshGroup);
  }

  setTarget(targetEntity) {
    this.target = targetEntity;
  }

  destroy() {
    this.scene.remove(this.meshGroup);
    this.meshGroup.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }

  update(dt) {
    // Homing trajectory steering toward target
    const currentDir = new THREE.Vector3(0, 0, -1);
    if (this.target && !this.target.isDead && this.target.meshGroup) {
      const targetDir = new THREE.Vector3().subVectors(this.target.meshGroup.position, this.meshGroup.position).normalize();
      currentDir.lerp(targetDir, 0.1);
      this.meshGroup.lookAt(this.target.meshGroup.position);
    }

    this.meshGroup.position.addScaledVector(currentDir, this.speed * dt);

    // Particle smoke trail
    if (Math.random() > 0.2) {
      this.particleManager.spawnEngineParticle(this.meshGroup.position, 0xffea00);
    }

    // Boundary check
    if (this.meshGroup.position.z < -140 || this.meshGroup.position.z > 30) {
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
