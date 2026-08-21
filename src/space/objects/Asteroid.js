import * as THREE from 'three';

export class Asteroid {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.isComet = options.isComet || false;
    this.particleManager = options.particleManager || null;
    this._wobbleOffset = Math.random() * Math.PI * 2;
    this._cometTick = 0;

    if (this.isComet) {
      this.sizeCategory = 'medium';
      this.radius = 2.0;
      this.hp = 25;
      this.scoreValue = 150;
    } else {
      this.sizeCategory = options.sizeCategory || 'large';
      if (this.sizeCategory === 'large') {
        this.radius = 3.8;
        this.hp = 60;
        this.scoreValue = 100;
      } else if (this.sizeCategory === 'medium') {
        this.radius = 2.4;
        this.hp = 30;
        this.scoreValue = 50;
      } else {
        this.radius = 1.4;
        this.hp = 12;
        this.scoreValue = 25;
      }
    }

    this.meshGroup = new THREE.Group();
    
    let spawnX, spawnY, spawnZ;
    if (this.isComet) {
      // Spawn comets from screen edges so they cross diagonally
      spawnX = options.x !== undefined ? options.x : (Math.random() > 0.5 ? -18 : 18);
      spawnY = options.y !== undefined ? options.y : (Math.random() - 0.5) * 12;
      spawnZ = options.z !== undefined ? options.z : (-75 - Math.random() * 20);
    } else {
      spawnX = options.x !== undefined ? options.x : (Math.random() - 0.5) * 36;
      spawnY = options.y !== undefined ? options.y : (Math.random() - 0.5) * 22;
      spawnZ = options.z !== undefined ? options.z : (-72 - Math.random() * 22);
    }

    this.meshGroup.position.set(spawnX, spawnY, spawnZ);

    if (this.isComet) {
      // Velocity is highly diagonal
      const vx = options.vx !== undefined ? options.vx : (spawnX < 0 ? (6 + Math.random() * 4) : (-6 - Math.random() * 4));
      const vy = options.vy !== undefined ? options.vy : (Math.random() - 0.5) * 3.0;
      const vz = options.vz !== undefined ? options.vz : (13 + Math.random() * 6);
      this.velocity = new THREE.Vector3(vx, vy, vz);
    } else {
      this.velocity = new THREE.Vector3(
        options.vx !== undefined ? options.vx : (Math.random() - 0.5) * 2.4,
        options.vy !== undefined ? options.vy : (Math.random() - 0.5) * 2.4,
        options.vz !== undefined ? options.vz : (17 + Math.random() * 11)
      );
    }

    this.rotVelocity = new THREE.Vector3(
      (Math.random() - 0.5) * 2.2,
      (Math.random() - 0.5) * 2.2,
      (Math.random() - 0.5) * 2.2
    );

    this.isDead = false;

    // Type 3 represents comet
    this._type = this.isComet ? 3 : Math.floor(Math.random() * 3); // 0=rocky, 1=crystalline, 2=molten, 3=comet

    this.buildRockMesh();
    this.scene.add(this.meshGroup);
  }

  buildRockMesh() {
    const R = this.radius;

    // ── Base geometry — more distorted for a jagged look ──
    const geo = new THREE.IcosahedronGeometry(R, 2);
    const posAttr = geo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const noise = 1.0 + (Math.random() - 0.5) * 0.55;
      posAttr.setXYZ(i, posAttr.getX(i) * noise, posAttr.getY(i) * noise, posAttr.getZ(i) * noise);
    }
    geo.computeVertexNormals();

    // Visual type variants
    let baseColor, emissiveColor, emissiveIntensity, wireColor;
    if (this._type === 0) {
      // Rocky slate — dark metallic
      baseColor = 0x4a5568;
      emissiveColor = 0x000000;
      emissiveIntensity = 0.0;
      wireColor = 0xff2244;
    } else if (this._type === 1) {
      // Crystalline blue — alien mineral
      baseColor = 0x1a2a4a;
      emissiveColor = 0x0044aa;
      emissiveIntensity = 0.35;
      wireColor = 0x00aaff;
    } else if (this._type === 2) {
      // Molten orange — volcanic/unstable
      baseColor = 0x2a1008;
      emissiveColor = 0xff3300;
      emissiveIntensity = 0.5;
      wireColor = 0xff6600;
    } else {
      // Comet — frost white / cyan trail
      baseColor = 0xd0f5ff;
      emissiveColor = 0x0088ff;
      emissiveIntensity = 1.5;
      wireColor = 0x00ddff;
    }

    this.rockMat = new THREE.MeshStandardMaterial({
      color: baseColor,
      emissive: emissiveColor,
      emissiveIntensity: emissiveIntensity,
      roughness: 0.88,
      metalness: this._type === 0 ? 0.35 : 0.15,
      flatShading: true,
    });

    this.rockMesh = new THREE.Mesh(geo, this.rockMat);
    this.meshGroup.add(this.rockMesh);

    // ── Edge glow lines — ore veins ──
    const wireGeo = new THREE.EdgesGeometry(geo);
    this.wireMat = new THREE.LineBasicMaterial({
      color: wireColor,
      transparent: true,
      opacity: this._type === 0 ? 0.35 : 0.65,
    });
    this.wire = new THREE.LineSegments(wireGeo, this.wireMat);
    this.meshGroup.add(this.wire);

    // ── Glow point light for emissive asteroids ──
    if (this._type === 2) {
      this.glowLight = new THREE.PointLight(0xff4400, 1.5 * R, R * 6);
      this.meshGroup.add(this.glowLight);
    } else if (this._type === 1) {
      this.glowLight = new THREE.PointLight(0x0066ff, 1.2 * R, R * 5);
      this.meshGroup.add(this.glowLight);
    } else if (this._type === 3) {
      this.glowLight = new THREE.PointLight(0x00bbff, 2.0 * R, R * 8);
      this.meshGroup.add(this.glowLight);
    }

    // ── Small surface detail bumps for large asteroids ──
    if (this.sizeCategory === 'large') {
      const craterMat = new THREE.MeshStandardMaterial({ color: 0x1a1f28, roughness: 0.99, flatShading: true });
      for (let i = 0; i < 5; i++) {
        const cr = new THREE.SphereGeometry(R * 0.2, 5, 5);
        const crMesh = new THREE.Mesh(cr, craterMat);
        const a = Math.random() * Math.PI * 2;
        const b = Math.random() * Math.PI;
        crMesh.position.set(
          Math.cos(a) * Math.sin(b) * R * 0.85,
          Math.sin(a) * Math.sin(b) * R * 0.85,
          Math.cos(b) * R * 0.85
        );
        this.meshGroup.add(crMesh);
      }
    }
  }

  takeDamage(amount) {
    this.hp -= amount;

    if (this.rockMat) {
      this.rockMat.emissive.setHex(0xff2200);
      this.rockMat.emissiveIntensity = 3.5;
      if (this.wireMat) { this.wireMat.opacity = 1.0; }
      setTimeout(() => {
        if (this.isDead) return;
        if (this.rockMat) {
          const baseEm = this._type === 2 ? 0xff3300 : this._type === 1 ? 0x0044aa : 0x000000;
          const baseInt = this._type === 0 ? 0.0 : this._type === 1 ? 0.35 : 0.5;
          this.rockMat.emissive.setHex(baseEm);
          this.rockMat.emissiveIntensity = baseInt;
          if (this.wireMat) this.wireMat.opacity = this._type === 0 ? 0.35 : 0.65;
        }
      }, 100);
    }

    if (this.hp <= 0) this.isDead = true;
    return this.isDead;
  }

  getSplitFragments(hasMiningAddon = false) {
    if (!hasMiningAddon) return [];
    
    if (this.sizeCategory === 'large') {
      return [
        { sizeCategory: 'medium', x: this.meshGroup.position.x - 1.4, y: this.meshGroup.position.y + 0.6, z: this.meshGroup.position.z, vx: -6, vy: 2.0, vz: this.velocity.z },
        { sizeCategory: 'medium', x: this.meshGroup.position.x + 1.4, y: this.meshGroup.position.y - 0.6, z: this.meshGroup.position.z, vx: 6, vy: -2.0, vz: this.velocity.z },
        { sizeCategory: 'small',  x: this.meshGroup.position.x,       y: this.meshGroup.position.y + 1.2, z: this.meshGroup.position.z, vx: 0, vy: 4.0,  vz: this.velocity.z }
      ];
    } else if (this.sizeCategory === 'medium') {
      return [
        { sizeCategory: 'small', x: this.meshGroup.position.x - 0.8, y: this.meshGroup.position.y + 0.4, z: this.meshGroup.position.z, vx: -7, vy: 3.0, vz: this.velocity.z },
        { sizeCategory: 'small', x: this.meshGroup.position.x + 0.8, y: this.meshGroup.position.y - 0.4, z: this.meshGroup.position.z, vx: 7, vy: -3.0, vz: this.velocity.z }
      ];
    }
    return [];
  }

  destroy() {
    this.scene.remove(this.meshGroup);
    this.meshGroup.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }

  update(dt) {
    this.meshGroup.position.x += this.velocity.x * dt;
    this.meshGroup.position.y += this.velocity.y * dt;
    this.meshGroup.position.z += this.velocity.z * dt;

    this.meshGroup.rotation.x += this.rotVelocity.x * dt;
    this.meshGroup.rotation.y += this.rotVelocity.y * dt;
    this.meshGroup.rotation.z += this.rotVelocity.z * dt;

    // Molten or Comet asteroids pulse their glow
    if (this._type === 2 && this.glowLight) {
      this.glowLight.intensity = 1.5 * this.radius + Math.sin(Date.now() * 0.004 + this._wobbleOffset) * 0.5;
    } else if (this._type === 3 && this.glowLight) {
      this.glowLight.intensity = 2.0 * this.radius + Math.sin(Date.now() * 0.006 + this._wobbleOffset) * 0.8;
      
      // Spawn comet trail particles
      if (this.particleManager) {
        this._cometTick++;
        if (this._cometTick % 2 === 0) {
          this.particleManager.spawnEngineParticle(this.meshGroup.position, 0x00bbff);
        }
      }
    }

    if (this.meshGroup.position.z > 18) {
      this.isDead = true;
      this.impactedPlanet = true;
    }
  }
}
