import * as THREE from 'three';

export class LaserBolt {
  constructor(scene, startPos, colorHex = 0x00f3ff, isEnemy = false, targetDir = null) {
    this.scene = scene;
    this.isEnemy = isEnemy;
    this.damage = 15;
    this.speed = isEnemy ? 52 : 110;
    this.radius = 1.4;
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

    // ── Outer glowing beam — thick and bright ──
    const len = isEnemy ? 2.8 : 3.6;
    const beamGeo = new THREE.CylinderGeometry(isEnemy ? 0.16 : 0.13, isEnemy ? 0.16 : 0.13, len, 8);
    beamGeo.rotateX(Math.PI / 2);
    const beamMat = new THREE.MeshBasicMaterial({ color: colorHex });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    this.meshGroup.add(beam);

    // ── Soft outer glow halo ──
    const glowGeo = new THREE.CylinderGeometry(isEnemy ? 0.42 : 0.32, isEnemy ? 0.42 : 0.32, len * 0.85, 8);
    glowGeo.rotateX(Math.PI / 2);
    const glowMat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.2 });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    this.meshGroup.add(glow);

    // ── Bright white inner core ──
    const coreGeo = new THREE.CylinderGeometry(0.055, 0.055, len * 1.1, 6);
    coreGeo.rotateX(Math.PI / 2);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const core = new THREE.Mesh(coreGeo, coreMat);
    this.meshGroup.add(core);

    // ── Muzzle flash sphere at tip ──
    const muzzleGeo = new THREE.SphereGeometry(isEnemy ? 0.28 : 0.22, 8, 8);
    const muzzleMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const muzzle = new THREE.Mesh(muzzleGeo, muzzleMat);
    muzzle.position.z = -len / 2;
    this.meshGroup.add(muzzle);

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

    if (
      this.meshGroup.position.z < -160 ||
      this.meshGroup.position.z > 45 ||
      Math.abs(this.meshGroup.position.x) > 60 ||
      Math.abs(this.meshGroup.position.y) > 50
    ) {
      this.isDead = true;
    }
  }
}

export class PlasmaPulse {
  constructor(scene, startPos, particleManager) {
    this.scene = scene;
    this.particleManager = particleManager;
    this.damage = 300;
    this.aoeRadius = 20.0;
    this.speed = 62;
    this.radius = 2.2;
    this.isDead = false;
    this._time = 0;

    this.meshGroup = new THREE.Group();
    this.meshGroup.position.copy(startPos);

    // ── 1. Core — large superheated plasma orb ──
    const orbGeo = new THREE.SphereGeometry(1.8, 28, 28);
    this.orbMat = new THREE.MeshStandardMaterial({
      color: 0x00f3ff,
      emissive: 0x00f3ff,
      emissiveIntensity: 4.0,
      roughness: 0.0,
      metalness: 0.0,
    });
    this.orbMesh = new THREE.Mesh(orbGeo, this.orbMat);
    this.meshGroup.add(this.orbMesh);

    // ── 2. Outer glow halo ──
    const haloGeo = new THREE.SphereGeometry(3.2, 20, 20);
    const haloMat = new THREE.MeshBasicMaterial({ color: 0x00aaff, transparent: true, opacity: 0.18 });
    this.meshGroup.add(new THREE.Mesh(haloGeo, haloMat));

    // ── 3. 3 Orbiting energy rings ──
    this.rings = [];
    [[0, 0, 0], [Math.PI / 2, 0, 0], [0, Math.PI / 2, 0]].forEach((rot, i) => {
      const rGeo = new THREE.TorusGeometry(2.6, 0.22, 12, 40);
      const rMat = new THREE.MeshBasicMaterial({ color: i === 0 ? 0xff00cc : i === 1 ? 0x00f3ff : 0x8800ff });
      const ring = new THREE.Mesh(rGeo, rMat);
      ring.rotation.set(...rot);
      this.meshGroup.add(ring);
      this.rings.push(ring);
    });

    // ── 4. Bright white center core ──
    const centerGeo = new THREE.SphereGeometry(0.9, 16, 16);
    this.meshGroup.add(new THREE.Mesh(centerGeo, new THREE.MeshBasicMaterial({ color: 0xffffff })));

    // ── 5. Dynamic point light traveling with bolt ──
    this.light = new THREE.PointLight(0x00f3ff, 8.0, 24);
    this.meshGroup.add(this.light);

    this.scene.add(this.meshGroup);
  }

  destroy() {
    if (this.light) this.scene.remove(this.light);
    this.scene.remove(this.meshGroup);
    this.meshGroup.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }

  update(dt) {
    this._time += dt;
    this.meshGroup.position.z -= this.speed * dt;

    // Rings orbit at different speeds/axes
    if (this.rings[0]) this.rings[0].rotation.z += 6.0 * dt;
    if (this.rings[1]) this.rings[1].rotation.x += 5.0 * dt;
    if (this.rings[2]) this.rings[2].rotation.y += 4.5 * dt;

    // Pulse the orb
    if (this.orbMat) {
      this.orbMat.emissiveIntensity = 3.5 + Math.sin(this._time * 20) * 1.5;
    }
    if (this.orbMesh) {
      const s = 1.0 + Math.sin(this._time * 15) * 0.08;
      this.orbMesh.scale.setScalar(s);
    }

    // Particle trail — dense, vivid
    this.particleManager.spawnEngineParticle(this.meshGroup.position, 0x00f3ff);
    if (Math.random() < 0.5) this.particleManager.spawnEngineParticle(this.meshGroup.position, 0xff00cc);

    if (this.meshGroup.position.z < -160) this.isDead = true;
  }
}
