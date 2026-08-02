import * as THREE from 'three';

export class Asteroid {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.sizeCategory = options.sizeCategory || 'large'; // 'large', 'medium', 'small'
    
    // Radii & HP mapping (Generous radii for guaranteed laser collision hits!)
    if (this.sizeCategory === 'large') {
      this.radius = 3.2;
      this.hp = 50;
      this.scoreValue = 100;
    } else if (this.sizeCategory === 'medium') {
      this.radius = 2.0;
      this.hp = 25;
      this.scoreValue = 50;
    } else {
      this.radius = 1.2;
      this.hp = 10;
      this.scoreValue = 25;
    }

    // Position & Velocity
    this.meshGroup = new THREE.Group();
    const spawnX = options.x !== undefined ? options.x : (Math.random() - 0.5) * 36;
    const spawnY = options.y !== undefined ? options.y : (Math.random() - 0.5) * 22;
    const spawnZ = options.z !== undefined ? options.z : (-70 - Math.random() * 20);

    this.meshGroup.position.set(spawnX, spawnY, spawnZ);

    this.velocity = new THREE.Vector3(
      options.vx !== undefined ? options.vx : (Math.random() - 0.5) * 2,
      options.vy !== undefined ? options.vy : (Math.random() - 0.5) * 2,
      options.vz !== undefined ? options.vz : (16 + Math.random() * 10)
    );

    // Tumbling rotational speed
    this.rotVelocity = new THREE.Vector3(
      (Math.random() - 0.5) * 2.0,
      (Math.random() - 0.5) * 2.0,
      (Math.random() - 0.5) * 2.0
    );

    this.isDead = false;

    // Generate Procedural Rock Geometry
    this.buildRockMesh();

    this.scene.add(this.meshGroup);
  }

  buildRockMesh() {
    const geo = new THREE.DodecahedronGeometry(this.radius, 1);
    
    const posAttr = geo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      const vz = posAttr.getZ(i);

      const noise = 1.0 + (Math.random() - 0.5) * 0.35;
      posAttr.setXYZ(i, vx * noise, vy * noise, vz * noise);
    }
    geo.computeVertexNormals();

    this.rockMat = new THREE.MeshStandardMaterial({
      color: 0x6e788c,
      emissive: 0x000000,
      emissiveIntensity: 0.0,
      roughness: 0.8,
      metalness: 0.3,
      flatShading: true
    });

    this.rockMesh = new THREE.Mesh(geo, this.rockMat);
    this.meshGroup.add(this.rockMesh);

    // Glowing red ore vein edges
    const wireGeo = new THREE.EdgesGeometry(geo);
    const wireMat = new THREE.LineBasicMaterial({
      color: 0xff0055,
      transparent: true,
      opacity: 0.6
    });
    const wire = new THREE.LineSegments(wireGeo, wireMat);
    this.meshGroup.add(wire);
  }

  takeDamage(amount) {
    this.hp -= amount;

    // Emissive hit flash feedback
    if (this.rockMat) {
      this.rockMat.emissive.setHex(0xff0055);
      this.rockMat.emissiveIntensity = 2.0;
      setTimeout(() => {
        if (this.rockMat) {
          this.rockMat.emissive.setHex(0x000000);
          this.rockMat.emissiveIntensity = 0.0;
        }
      }, 90);
    }

    if (this.hp <= 0) {
      this.isDead = true;
    }
    return this.isDead;
  }

  getSplitFragments() {
    if (this.sizeCategory === 'large') {
      return [
        { sizeCategory: 'medium', x: this.meshGroup.position.x - 1.0, y: this.meshGroup.position.y, z: this.meshGroup.position.z, vx: -4, vy: 1, vz: this.velocity.z },
        { sizeCategory: 'medium', x: this.meshGroup.position.x + 1.0, y: this.meshGroup.position.y, z: this.meshGroup.position.z, vx: 4, vy: -1, vz: this.velocity.z }
      ];
    } else if (this.sizeCategory === 'medium') {
      return [
        { sizeCategory: 'small', x: this.meshGroup.position.x - 0.6, y: this.meshGroup.position.y, z: this.meshGroup.position.z, vx: -5, vy: 2, vz: this.velocity.z },
        { sizeCategory: 'small', x: this.meshGroup.position.x + 0.6, y: this.meshGroup.position.y, z: this.meshGroup.position.z, vx: 5, vy: -2, vz: this.velocity.z }
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
    // Position movement
    this.meshGroup.position.x += this.velocity.x * dt;
    this.meshGroup.position.y += this.velocity.y * dt;
    this.meshGroup.position.z += this.velocity.z * dt;

    // Tumbling rotation
    this.meshGroup.rotation.x += this.rotVelocity.x * dt;
    this.meshGroup.rotation.y += this.rotVelocity.y * dt;
    this.meshGroup.rotation.z += this.rotVelocity.z * dt;

    // Check if passed player and impacted home planet at Z > 18
    if (this.meshGroup.position.z > 18) {
      this.isDead = true;
      this.impactedPlanet = true;
    }
  }
}
