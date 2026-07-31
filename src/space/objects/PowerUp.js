import * as THREE from 'three';

export class PowerUp {
  constructor(scene, pos, type = 'OVERCHARGE') {
    this.scene = scene;
    this.type = type; // 'OVERCHARGE', 'REPAIR', 'STASIS', 'NUKE'
    this.radius = 1.2;
    this.isDead = false;

    this.meshGroup = new THREE.Group();
    this.meshGroup.position.copy(pos);

    // Color mapping
    if (this.type === 'OVERCHARGE') this.color = 0xffea00; // Yellow
    else if (this.type === 'REPAIR') this.color = 0x00ff66; // Green
    else if (this.type === 'STASIS') this.color = 0x00f3ff; // Cyan
    else if (this.type === 'NUKE') this.color = 0xff0077; // Magenta

    this.buildMesh();
    this.scene.add(this.meshGroup);

    this.lifetime = 14.0; // 14s before despawning
  }

  buildMesh() {
    // Outer rotating octahedron crystal
    const crystalGeo = new THREE.OctahedronGeometry(0.8, 0);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: this.color,
      emissive: this.color,
      emissiveIntensity: 0.8,
      roughness: 0.1,
      metalness: 0.9,
      wireframe: true
    });
    this.crystalMesh = new THREE.Mesh(crystalGeo, crystalMat);
    this.meshGroup.add(this.crystalMesh);

    // Inner glowing core
    const coreGeo = new THREE.SphereGeometry(0.4, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({ color: this.color });
    const core = new THREE.Mesh(coreGeo, coreMat);
    this.meshGroup.add(core);

    // Glowing light beacon
    const pointLight = new THREE.PointLight(this.color, 2.0, 15);
    this.meshGroup.add(pointLight);
  }

  destroy() {
    this.scene.remove(this.meshGroup);
    this.meshGroup.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }

  update(dt, playerPos) {
    this.lifetime -= dt;
    if (this.lifetime <= 0) {
      this.isDead = true;
      return;
    }

    // Rotation animation
    this.crystalMesh.rotation.y += 2.0 * dt;
    this.crystalMesh.rotation.x += 1.0 * dt;

    // Slow forward motion toward player view
    this.meshGroup.position.z += 6.0 * dt;

    // Magnetic attraction to player ship if close
    if (playerPos) {
      const dist = this.meshGroup.position.distanceTo(playerPos);
      if (dist < 12) {
        this.meshGroup.position.lerp(playerPos, 0.12);
      }
    }

    if (this.meshGroup.position.z > 20) {
      this.isDead = true;
    }
  }
}
