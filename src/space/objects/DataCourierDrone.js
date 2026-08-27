import * as THREE from 'three';

export class DataCourierDrone {
  constructor(scene, particleManager) {
    this.scene = scene;
    this.particleManager = particleManager;

    this.meshGroup = new THREE.Group();
    // Fast evasive traverse across the screen
    const startX = Math.random() > 0.5 ? -28 : 28;
    this.meshGroup.position.set(startX, (Math.random() - 0.5) * 8 + 2, -45);
    this.vx = startX < 0 ? (12 + Math.random() * 6) : -(12 + Math.random() * 6);
    this.vy = (Math.random() - 0.5) * 4;

    this.hp = 180;
    this.maxHp = 180;
    this.isDead = false;

    this.buildMesh();
    this.scene.add(this.meshGroup);
  }

  buildMesh() {
    // Golden Courier Pod Model
    const coreGeo = new THREE.OctahedronGeometry(1.1, 1);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xffea00,
      metalness: 0.95,
      roughness: 0.15,
      emissive: 0xffaa00,
      emissiveIntensity: 0.6
    });
    this.coreMesh = new THREE.Mesh(coreGeo, coreMat);
    this.meshGroup.add(this.coreMesh);

    // Glowing Data Rings
    const ringGeo = new THREE.TorusGeometry(1.6, 0.08, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffea00, wireframe: true });
    this.ring1 = new THREE.Mesh(ringGeo, ringMat);
    this.ring2 = new THREE.Mesh(ringGeo, ringMat);
    this.ring2.rotation.x = Math.PI / 2;
    this.meshGroup.add(this.ring1);
    this.meshGroup.add(this.ring2);
  }

  update(dt, playerShip, gameManager) {
    if (this.isDead || !this.meshGroup) return;

    this.meshGroup.position.x += this.vx * dt;
    this.meshGroup.position.y += this.vy * dt;
    this.meshGroup.position.z += 8 * dt; // Drifts toward player

    if (this.ring1) this.ring1.rotation.y += 3.0 * dt;
    if (this.ring2) this.ring2.rotation.z += 2.5 * dt;

    if (this.meshGroup.position.z > 20 || Math.abs(this.meshGroup.position.x) > 36) {
      this.destroy();
    }
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0 && !this.isDead) {
      this.isDead = true;
      if (this.particleManager) {
        this.particleManager.createExplosion(this.meshGroup.position, 1.8);
        this.particleManager.spawnSonicBoomDisc(this.meshGroup.position, 0xffea00);
      }
      this.destroy();
      return true;
    }
    return false;
  }

  destroy() {
    this.isDead = true;
    if (this.meshGroup && this.scene) {
      this.scene.remove(this.meshGroup);
    }
  }
}
