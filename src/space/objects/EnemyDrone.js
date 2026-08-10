import * as THREE from 'three';

export class EnemyDrone {
  constructor(scene, options = {}) {
    this.scene = scene;

    this.radius = 1.8;
    this.hp = 40;
    this.maxHp = 40;
    this.scoreValue = 300;

    this.meshGroup = new THREE.Group();

    const spawnX = options.x !== undefined ? options.x : (Math.random() - 0.5) * 34;
    const spawnY = options.y !== undefined ? options.y : (Math.random() - 0.5) * 20;
    const spawnZ = options.z !== undefined ? options.z : (-72 - Math.random() * 18);

    this.meshGroup.position.set(spawnX, spawnY, spawnZ);
    this.targetPos = new THREE.Vector3(spawnX, spawnY, 0);
    this.velocity = new THREE.Vector3(0, 0, 13 + Math.random() * 7);
    this.fireTimer = 0.5 + Math.random() * 0.8;
    this.isDead = false;
    this._time = Math.random() * 10;
    this._wobbleOffset = Math.random() * Math.PI * 2;

    this.buildDroneMesh();
    this.scene.add(this.meshGroup);
  }

  buildDroneMesh() {
    // ── 1. Main body — aggressive saucer/crescent shape ──
    const bodyGeo = new THREE.CylinderGeometry(1.2, 0.6, 0.6, 8, 1);
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1a0520,
      metalness: 0.92,
      roughness: 0.08,
      emissive: 0x2a0040,
      emissiveIntensity: 0.3,
    });
    this.bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    this.meshGroup.add(this.bodyMesh);

    // ── 2. Forward nose spike ──
    const noseGeo = new THREE.ConeGeometry(0.32, 2.5, 7);
    noseGeo.rotateX(-Math.PI / 2);
    const noseMat = new THREE.MeshStandardMaterial({ color: 0x0e0014, metalness: 0.99, roughness: 0.05 });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.z = -1.5;
    this.meshGroup.add(nose);

    // ── 3. Glowing Red Eye Sensor Array ──
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0033 });
    const eyeGlow = new THREE.MeshBasicMaterial({ color: 0xff0066, transparent: true, opacity: 0.4 });

    // Central large eye
    this.eyeMesh = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 16), eyeMat);
    this.eyeMesh.position.set(0, 0.15, -1.3);
    this.meshGroup.add(this.eyeMesh);

    // 2 flanking smaller eyes
    [-0.6, 0.6].forEach(x => {
      const smallEye = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), eyeMat);
      smallEye.position.set(x, 0.1, -1.1);
      this.meshGroup.add(smallEye);
    });

    // Eye glow halo
    this.eyeHalo = new THREE.Mesh(new THREE.SphereGeometry(0.65, 14, 14), eyeGlow);
    this.eyeHalo.position.set(0, 0.15, -1.3);
    this.meshGroup.add(this.eyeHalo);

    // Eye point light
    this.eyeLight = new THREE.PointLight(0xff0033, 3.0, 12);
    this.eyeLight.position.set(0, 0.1, -1.8);
    this.meshGroup.add(this.eyeLight);

    // ── 4. Swept crescent wings — sharp and aggressive ──
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x280836, metalness: 0.88, roughness: 0.15 });
    const accentMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });

    [1, -1].forEach(side => {
      const wingGeo = new THREE.BoxGeometry(1.8, 0.1, 1.4);
      wingGeo.scale(1, 1, 1);
      const wing = new THREE.Mesh(wingGeo, wingMat);
      wing.position.set(side * 1.8, 0, 0.1);
      wing.rotation.y = -side * 0.25;
      wing.rotation.z = -side * 0.12;
      this.meshGroup.add(wing);

      // Wing trailing edge glow
      const edgeGeo = new THREE.BoxGeometry(0.05, 0.05, 1.35);
      const edge = new THREE.Mesh(edgeGeo, accentMat);
      edge.position.set(side * 2.55, 0, 0.05);
      this.meshGroup.add(edge);

      // Wingtip gun pod
      const gunGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.6, 7);
      gunGeo.rotateX(Math.PI / 2);
      const gun = new THREE.Mesh(gunGeo, new THREE.MeshStandardMaterial({ color: 0x0e0018, metalness: 0.99 }));
      gun.position.set(side * 2.6, 0, -0.6);
      this.meshGroup.add(gun);

      // Gun muzzle glow
      const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), accentMat);
      muzzle.position.set(side * 2.6, 0, -1.35);
      this.meshGroup.add(muzzle);
    });

    // ── 5. Rear thrusters ──
    const thrusterMat = new THREE.MeshBasicMaterial({ color: 0x8800ff });
    [-0.55, 0.55].forEach(x => {
      const tGeo = new THREE.ConeGeometry(0.2, 0.8, 8);
      tGeo.rotateX(Math.PI / 2);
      const t = new THREE.Mesh(tGeo, thrusterMat);
      t.position.set(x, 0, 1.2);
      this.meshGroup.add(t);
    });

    // Rear engine light
    this.thrusterLight = new THREE.PointLight(0x6600cc, 2.0, 10);
    this.thrusterLight.position.set(0, 0, 1.5);
    this.meshGroup.add(this.thrusterLight);
  }

  takeDamage(amount) {
    this.hp -= amount;
    // Flash red on hit
    if (this.bodyMesh && this.bodyMesh.material) {
      this.bodyMesh.material.emissiveIntensity = 3.0;
      setTimeout(() => { if (!this.isDead && this.bodyMesh && this.bodyMesh.material) this.bodyMesh.material.emissiveIntensity = 0.3; }, 80);
    }
    if (this.hp <= 0) this.isDead = true;
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
    this._time += dt;

    // Dogfighting AI — steer toward player with a sinusoidal weave
    const steer = new THREE.Vector3().subVectors(playerPos, this.meshGroup.position);
    steer.z = 0;
    steer.normalize().multiplyScalar(6);

    // Weaving maneuver — makes them harder to hit
    const weave = Math.sin(this._time * 3.5 + this._wobbleOffset) * 3.0;
    steer.x += weave;

    this.velocity.x += (steer.x - this.velocity.x) * 0.07;
    this.velocity.y += (steer.y - this.velocity.y) * 0.07;

    this.meshGroup.position.addScaledVector(this.velocity, dt);

    // Banking with roll and slight pitch
    this.meshGroup.rotation.z = -this.velocity.x * 0.12;
    this.meshGroup.rotation.x = this.velocity.y * 0.05;

    // Eye pulse
    if (this.eyeLight) {
      this.eyeLight.intensity = 2.5 + Math.sin(this._time * 8) * 1.0;
    }
    if (this.eyeHalo) {
      this.eyeHalo.scale.setScalar(1.0 + Math.sin(this._time * 6) * 0.15);
    }

    // Fire
    this.fireTimer -= dt;
    let shouldFirePlasma = false;
    if (this.fireTimer <= 0 && this.meshGroup.position.z < 18) {
      this.fireTimer = 0.55 + Math.random() * 0.5;
      shouldFirePlasma = true;
    }

    if (this.meshGroup.position.z > 18) {
      this.isDead = true;
      this.impactedPlanet = true;
    }

    return shouldFirePlasma;
  }
}
