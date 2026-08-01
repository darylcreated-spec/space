import * as THREE from 'three';

export class TitanAsteroidBoss {
  constructor(scene, particleManager) {
    this.scene = scene;
    this.particleManager = particleManager;

    this.radius = 7.5; // Colossal size
    this.coreHp = 300;
    this.maxCoreHp = 300;
    this.scoreValue = 3000;
    this.isDead = false;

    this.meshGroup = new THREE.Group();
    this.meshGroup.position.set(0, 3, -85); // Spawns in deep space

    this.targetZ = -32; // Slow-moving entrance position
    this.speed = 5.0;   // Imposing slow-moving velocity

    this.buildTitanMesh();
    this.scene.add(this.meshGroup);
  }

  buildTitanMesh() {
    // 1. Colossal Displaced Rock Body
    const geo = new THREE.DodecahedronGeometry(this.radius, 2);
    const posAttr = geo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      const vz = posAttr.getZ(i);
      const noise = 1.0 + (Math.random() - 0.5) * 0.4;
      posAttr.setXYZ(i, vx * noise, vy * noise, vz * noise);
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: 0x3d2742,
      roughness: 0.7,
      metalness: 0.5,
      flatShading: true
    });
    this.rockMesh = new THREE.Mesh(geo, mat);
    this.meshGroup.add(this.rockMesh);

    // 2. Glowing Magma Vein Lines
    const wireGeo = new THREE.EdgesGeometry(geo);
    const wireMat = new THREE.LineBasicMaterial({
      color: 0xff0055,
      transparent: true,
      opacity: 0.8
    });
    this.wireMesh = new THREE.LineSegments(wireGeo, wireMat);
    this.meshGroup.add(this.wireMesh);

    // 3. Glowing Central Reactor Core
    const coreGeo = new THREE.SphereGeometry(3.0, 24, 24);
    this.coreMat = new THREE.MeshStandardMaterial({
      color: 0x00f3ff,
      emissive: 0x00f3ff,
      emissiveIntensity: 1.5,
      roughness: 0.1,
      metalness: 0.2
    });
    this.coreMesh = new THREE.Mesh(coreGeo, this.coreMat);
    this.meshGroup.add(this.coreMesh);

    // 4. Rotating Energy Shield Rings
    const ringGeo = new THREE.TorusGeometry(8.5, 0.4, 16, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      wireframe: true,
      transparent: true,
      opacity: 0.7
    });
    this.shieldRing = new THREE.Mesh(ringGeo, ringMat);
    this.meshGroup.add(this.shieldRing);
  }

  takeDamage(targetSubsystem, amount) {
    this.coreHp -= amount;

    // Pulse core glow on hit
    if (this.coreMat) {
      this.coreMat.emissiveIntensity = 3.0;
      setTimeout(() => {
        if (this.coreMat) this.coreMat.emissiveIntensity = 1.5;
      }, 100);
    }

    if (this.coreHp <= 0) {
      this.isDead = true;
      this.triggerBrilliantLightExplosion();
    }

    return this.isDead;
  }

  triggerBrilliantLightExplosion() {
    // 1. Spawns 100 explosion particles + EMP Shockwave
    this.particleManager.createExplosion(this.meshGroup.position, 0x00f3ff, 100, 2.5);
    this.particleManager.createExplosion(this.meshGroup.position, 0xffea00, 80, 2.0);
    this.particleManager.createEmpShockwave(this.meshGroup.position, 50);

    // 2. Creates a brilliant flash of radiant white light in the scene
    const flashLight = new THREE.PointLight(0xffffff, 30.0, 300);
    flashLight.position.copy(this.meshGroup.position);
    this.scene.add(flashLight);

    // Fade out brilliant light over 1 second
    let intensity = 30.0;
    const fadeInterval = setInterval(() => {
      intensity -= 2.0;
      if (intensity <= 0) {
        clearInterval(fadeInterval);
        this.scene.remove(flashLight);
      } else {
        flashLight.intensity = intensity;
      }
    }, 50);
  }

  destroy() {
    this.scene.remove(this.meshGroup);
    this.meshGroup.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }

  update(dt, _playerPos) {
    // Slow-moving entrance from deep space to targetZ
    if (this.meshGroup.position.z < this.targetZ) {
      this.meshGroup.position.z += this.speed * dt;
    }

    // Slow tumbling rotation
    this.rockMesh.rotation.x += 0.2 * dt;
    this.rockMesh.rotation.y += 0.3 * dt;
    if (this.shieldRing) this.shieldRing.rotation.z += 1.2 * dt;

    // Slow side-to-side drift
    this.meshGroup.position.x = Math.sin(performance.now() * 0.0008) * 8.0;

    return false; // Does not fire lasers, relies on massive HP collision threat & size
  }
}
