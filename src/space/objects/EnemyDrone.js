import * as THREE from 'three';

export class EnemyDrone {
  constructor(scene, options = {}) {
    this.scene = scene;

    this.radius = 1.5;
    this.hp = 35;
    this.maxHp = 35;
    this.scoreValue = 250;

    this.meshGroup = new THREE.Group();

    const spawnX = options.x !== undefined ? options.x : (Math.random() - 0.5) * 32;
    const spawnY = options.y !== undefined ? options.y : (Math.random() - 0.5) * 18;
    const spawnZ = options.z !== undefined ? options.z : (-70 - Math.random() * 15);

    this.meshGroup.position.set(spawnX, spawnY, spawnZ);

    this.targetPos = new THREE.Vector3(spawnX, spawnY, 0);
    this.velocity = new THREE.Vector3(0, 0, 14 + Math.random() * 6);
    this.fireTimer = 0.4 + Math.random() * 1.0; // Fires faster
    this.isDead = false;

    // Build Alien Fighter Mesh
    this.buildDroneMesh();

    this.scene.add(this.meshGroup);
  }

  buildDroneMesh() {
    // Sleek alien drone body
    const bodyGeo = new THREE.ConeGeometry(1.0, 3.0, 6);
    bodyGeo.rotateX(-Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x2d0c33,
      metalness: 0.9,
      roughness: 0.1
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    this.meshGroup.add(body);

    // Glowing Red Eye Visor
    const eyeGeo = new THREE.SphereGeometry(0.45, 16, 16);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(0, 0.1, -1.0);
    this.meshGroup.add(eye);

    // Forward Swept Wings
    const wingGeo = new THREE.BoxGeometry(2.8, 0.1, 1.0);
    wingGeo.rotateY(Math.PI / 6);
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x4a1254, metalness: 0.8, roughness: 0.2 });
    const wings = new THREE.Mesh(wingGeo, wingMat);
    wings.position.set(0, 0, 0.2);
    this.meshGroup.add(wings);

    // Wingtip Plasma Cannons
    const cannonGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.0, 8);
    cannonGeo.rotateX(Math.PI / 2);
    const cannonMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });

    const c1 = new THREE.Mesh(cannonGeo, cannonMat);
    c1.position.set(1.4, 0, -0.7);
    this.meshGroup.add(c1);

    const c2 = new THREE.Mesh(cannonGeo, cannonMat);
    c2.position.set(-1.4, 0, -0.7);
    this.meshGroup.add(c2);
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.isDead = true;
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
    // AI Dogfighting behavior: Smoothly adjust trajectory toward player position
    const steer = new THREE.Vector3().subVectors(playerPos, this.meshGroup.position);
    steer.z = 0;
    steer.normalize().multiplyScalar(5);

    this.velocity.x += (steer.x - this.velocity.x) * 0.06;
    this.velocity.y += (steer.y - this.velocity.y) * 0.06;

    this.meshGroup.position.addScaledVector(this.velocity, dt);

    // Roll banking towards steering direction
    this.meshGroup.rotation.z = -this.velocity.x * 0.1;

    // Fire timer update
    this.fireTimer -= dt;
    let shouldFirePlasma = false;
    if (this.fireTimer <= 0 && this.meshGroup.position.z < 15) {
      this.fireTimer = 1.4 + Math.random() * 1.2;
      shouldFirePlasma = true;
    }

    // Check if passed player and impacted home planet at Z > 18
    if (this.meshGroup.position.z > 18) {
      this.isDead = true;
      this.impactedPlanet = true;
    }

    return shouldFirePlasma;
  }
}
