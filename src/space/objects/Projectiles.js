import * as THREE from 'three';

export class LaserBolt {
  constructor(scene, startPos, colorHex = 0x00f3ff, isEnemy = false) {
    this.scene = scene;
    this.isEnemy = isEnemy;
    this.damage = 15;
    this.speed = isEnemy ? -45 : 90;
    this.radius = 0.3;
    this.isDead = false;

    // Glowing laser cylinder mesh
    const geo = new THREE.CylinderGeometry(0.06, 0.06, 1.8, 8);
    geo.rotateX(Math.PI / 2);

    const mat = new THREE.MeshBasicMaterial({ color: colorHex });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(startPos);

    // Inner bright white beam core
    const coreGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.8, 8);
    coreGeo.rotateX(Math.PI / 2);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const core = new THREE.Mesh(coreGeo, coreMat);
    this.mesh.add(core);

    this.scene.add(this.mesh);
  }

  destroy() {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }

  update(dt) {
    const dir = this.isEnemy ? 1 : -1;
    this.mesh.position.z += this.speed * dir * dt;

    // Boundary check
    if (this.mesh.position.z < -130 || this.mesh.position.z > 30) {
      this.isDead = true;
    }
  }
}

export class Torpedo {
  constructor(scene, startPos, particleManager) {
    this.scene = scene;
    this.particleManager = particleManager;
    this.damage = 80;
    this.aoeRadius = 8.0;
    this.speed = 35;
    this.radius = 0.5;
    this.isDead = false;
    this.target = null;

    // 3D Homing Missile model
    this.meshGroup = new THREE.Group();
    this.meshGroup.position.copy(startPos);

    const bodyGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.9, 12);
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffea00, metalness: 0.9, roughness: 0.1 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    this.meshGroup.add(body);

    const noseGeo = new THREE.ConeGeometry(0.15, 0.4, 12);
    noseGeo.rotateX(-Math.PI / 2);
    const noseMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.z = -0.65;
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
    if (this.target && !this.target.isDead) {
      const targetDir = new THREE.Vector3().subVectors(this.target.meshGroup.position, this.meshGroup.position).normalize();
      currentDir.lerp(targetDir, 0.08);
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
