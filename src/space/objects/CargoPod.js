import * as THREE from 'three';

/**
 * Derelict Cargo Pod & Space Salvage Container
 * Tumbles through debris corridors and asteroid belts. Blasting or collecting
 * drops immediate tactical powerups (Nanite Repair, Overclock Fire, Scrap Cache).
 */
export class CargoPod {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.isDead = false;
    this.hp = 35;
    this.maxHp = 35;
    this.radius = 2.4;

    const types = ['NANITE_REPAIR', 'OVERCLOCK', 'SCRAP_CACHE'];
    this.cargoType = options.type || types[Math.floor(Math.random() * types.length)];

    this.meshGroup = new THREE.Group();
    this.buildMesh();

    const spawnX = options.x !== undefined ? options.x : (Math.random() * 70 - 35);
    const spawnY = options.y !== undefined ? options.y : (Math.random() * 20 - 10);
    const spawnZ = options.z !== undefined ? options.z : -160;

    this.meshGroup.position.set(spawnX, spawnY, spawnZ);

    this.velocity = new THREE.Vector3(
      options.vx !== undefined ? options.vx : (Math.random() * 2 - 1) * 2.5,
      options.vy !== undefined ? options.vy : (Math.random() * 2 - 1) * 1.5,
      options.vz !== undefined ? options.vz : 18 + Math.random() * 12 // Drift forward past player
    );

    this.rotSpeed = new THREE.Vector3(
      (Math.random() - 0.5) * 1.2,
      (Math.random() - 0.5) * 1.6,
      (Math.random() - 0.5) * 0.9
    );

    this.scene.add(this.meshGroup);
  }

  buildMesh() {
    // 1. Heavy Armored Octagonal Cargo Container
    const boxGeo = new THREE.BoxGeometry(3.2, 1.8, 4.4);
    const boxMat = new THREE.MeshStandardMaterial({
      color: 0x222b35,
      metalness: 0.85,
      roughness: 0.25
    });
    const mainBox = new THREE.Mesh(boxGeo, boxMat);
    this.meshGroup.add(mainBox);

    // 2. Glowing Cargo Type Trim Bands
    const bandGeo = new THREE.BoxGeometry(3.3, 1.9, 0.8);
    const glowColor = this.cargoType === 'NANITE_REPAIR' 
      ? 0x00ff88 
      : (this.cargoType === 'OVERCLOCK' ? 0xffea00 : 0x00f3ff);

    const bandMat = new THREE.MeshStandardMaterial({
      color: glowColor,
      emissive: glowColor,
      emissiveIntensity: 1.4,
      metalness: 0.2,
      roughness: 0.3
    });
    const bandMesh = new THREE.Mesh(bandGeo, bandMat);
    this.meshGroup.add(bandMesh);

    // 3. Holographic Beacon Ring
    const ringGeo = new THREE.TorusGeometry(2.4, 0.08, 12, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: glowColor,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });
    this.beaconRing = new THREE.Mesh(ringGeo, ringMat);
    this.beaconRing.rotation.x = Math.PI * 0.5;
    this.meshGroup.add(this.beaconRing);

    // 4. Blinking Magnetic Transponder Light
    const beaconGeo = new THREE.SphereGeometry(0.3, 12, 12);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.transponder = new THREE.Mesh(beaconGeo, beaconMat);
    this.transponder.position.set(0, 1.1, 0);
    this.meshGroup.add(this.transponder);
  }

  update(dt) {
    if (this.isDead) return;

    this.meshGroup.position.addScaledVector(this.velocity, dt);

    this.meshGroup.rotation.x += this.rotSpeed.x * dt;
    this.meshGroup.rotation.y += this.rotSpeed.y * dt;
    this.meshGroup.rotation.z += this.rotSpeed.z * dt;

    if (this.beaconRing) {
      this.beaconRing.rotation.z += dt * 2.0;
    }

    // Despawn if drifted behind player
    if (this.meshGroup.position.z > 35) {
      this.destroy();
    }
  }

  takeDamage(amount) {
    if (this.isDead) return false;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.isDead = true;
      return true; // Destroyed! Drop loot!
    }
    return false;
  }

  destroy() {
    this.isDead = true;
    if (this.meshGroup && this.scene) {
      this.scene.remove(this.meshGroup);
      this.meshGroup.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material.dispose();
        }
      });
    }
  }
}
