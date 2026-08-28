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
    // ── Golden Courier Pod: Smooth Aerodynamic Lifting Torpedo ──
    const coreGeo = new THREE.CapsuleGeometry(0.75, 1.8, 12, 24);
    coreGeo.rotateX(Math.PI / 2);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xffea00,
      metalness: 0.96,
      roughness: 0.12,
      emissive: 0xffaa00,
      emissiveIntensity: 0.6
    });
    this.coreMesh = new THREE.Mesh(coreGeo, coreMat);
    this.meshGroup.add(this.coreMesh);

    // Rounded Aerodynamic Lateral Fins
    [-1, 1].forEach(side => {
      const finShape = new THREE.Shape();
      finShape.moveTo(0, 0.4);
      finShape.bezierCurveTo(side * 0.4, 0.2, side * 0.9, -0.2, side * 1.1, -0.4);
      finShape.bezierCurveTo(side * 1.15, -0.55, side * 0.9, -0.6, side * 0.7, -0.5);
      finShape.bezierCurveTo(side * 0.3, -0.3, 0, -0.4, 0, -0.4);
      finShape.closePath();

      const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.08, bevelEnabled: true, bevelSize: 0.03, bevelSegments: 2 });
      finGeo.rotateX(-Math.PI / 2);
      const fin = new THREE.Mesh(finGeo, coreMat);
      this.meshGroup.add(fin);
    });

    // Glowing Data Gyro-Rings
    const ringGeo = new THREE.TorusGeometry(1.5, 0.06, 12, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffea00, transparent: true, opacity: 0.85 });
    this.ring1 = new THREE.Mesh(ringGeo, ringMat);
    this.ring2 = new THREE.Mesh(ringGeo, ringMat);
    this.ring2.rotation.x = Math.PI / 2;
    this.meshGroup.add(this.ring1);
    this.meshGroup.add(this.ring2);

    // Glowing Data Core Apex Sphere
    const apexGeo = new THREE.SphereGeometry(0.35, 16, 16);
    const apexMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const apex = new THREE.Mesh(apexGeo, apexMat);
    apex.position.set(0, 0, -1.3);
    this.meshGroup.add(apex);
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
        this.particleManager.createExplosion(this.meshGroup.position, 0xffea00, 100, 3.0);
        this.particleManager.createEmpShockwave(this.meshGroup.position, 40);
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
