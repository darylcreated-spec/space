import * as THREE from 'three';

/**
 * Phase Shift Interceptor — Swift Delta Phantom that micro-warps in 15m jumps,
 * leaving behind holographic decoy silhouettes and executing unexpected flanking strikes.
 */
export class PhaseShiftInterceptor {
  constructor(scene, particleManager, spawnPos = null) {
    this.scene = scene;
    this.particleManager = particleManager;

    this.meshGroup = new THREE.Group();
    const spawnX = spawnPos ? spawnPos.x : (Math.random() - 0.5) * 32;
    const spawnY = spawnPos ? spawnPos.y : 2.0 + (Math.random() - 0.5) * 4.0;
    const spawnZ = spawnPos ? spawnPos.z : -90;
    this.meshGroup.position.set(spawnX, spawnY, spawnZ);

    this.hp = 140;
    this.maxHp = 140;
    this.radius = 2.6;
    this.isDead = false;
    this.scoreValue = 600;

    this.speed = 34.0;
    this.phaseCooldown = 2.2 + Math.random() * 0.8;
    this.phaseTimer = this.phaseCooldown;
    this.fireTimer = 0.8;
    this._time = Math.random() * 10;
    this.decoys = [];

    this.buildMesh();
    this.scene.add(this.meshGroup);
  }

  buildMesh() {
    // ── High-Tech Cyan-Obsidian Phase Shifting Composite ──
    this.hullMat = new THREE.MeshStandardMaterial({
      color: 0x0a1c24,
      metalness: 0.95,
      roughness: 0.14,
      emissive: 0x003344,
      emissiveIntensity: 0.6
    });

    this.glowMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.95
    });

    // ── 1. Smooth Sculpted Needle Delta Fuselage ──
    const bodyGeo = new THREE.ConeGeometry(0.85, 3.8, 12);
    bodyGeo.rotateX(Math.PI / 2); // Apex points forward at +Z
    this.bodyMesh = new THREE.Mesh(bodyGeo, this.hullMat);
    this.meshGroup.add(this.bodyMesh);

    // ── 2. Swept Aerodynamic Dagger Wings ──
    [-1, 1].forEach(side => {
      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, 0.6);
      wingShape.bezierCurveTo(side * 1.2, 0.4, side * 2.8, -0.4, side * 3.2, -1.0);
      wingShape.bezierCurveTo(side * 3.3, -1.2, side * 3.0, -1.3, side * 2.5, -1.1);
      wingShape.bezierCurveTo(side * 1.4, -0.7, 0, -0.8, 0, -0.8);
      wingShape.closePath();

      const wingExtrude = { depth: 0.1, bevelEnabled: true, bevelSize: 0.04, bevelSegments: 2 };
      const wingGeo = new THREE.ExtrudeGeometry(wingShape, wingExtrude);
      wingGeo.rotateX(-Math.PI / 2);
      const wing = new THREE.Mesh(wingGeo, this.hullMat);
      this.meshGroup.add(wing);

      const conduit = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 2.2), this.glowMat);
      conduit.position.set(side * 1.6, 0.08, -0.2);
      conduit.rotation.y = -side * 0.45;
      this.meshGroup.add(conduit);
    });

    // ── 3. Glowing Phase Drive Core ──
    const coreGeo = new THREE.SphereGeometry(0.32, 12, 12);
    this.coreMesh = new THREE.Mesh(coreGeo, this.glowMat);
    this.coreMesh.position.set(0, 0.15, -0.5);
    this.meshGroup.add(this.coreMesh);
  }

  performMicroWarp() {
    if (this.isDead || !this.meshGroup) return;

    const oldPos = this.meshGroup.position.clone();
    if (this.particleManager) {
      this.particleManager.createExplosion(oldPos, 0x00f3ff, 40, 1.8);
      this.particleManager.spawnSonicBoomDisc(oldPos, 0x00f3ff);
    }

    // Micro-warp 12-16m laterally and forward
    const warpX = (Math.random() - 0.5) * 24.0;
    const warpY = 2.0 + (Math.random() - 0.5) * 4.0;
    const warpZ = Math.min(10, this.meshGroup.position.z + 12.0);

    this.meshGroup.position.set(warpX, warpY, warpZ);

    if (this.particleManager) {
      this.particleManager.createExplosion(this.meshGroup.position, 0x00f3ff, 50, 2.0);
    }
  }

  update(dt, playerPos, gameManager) {
    if (this.isDead || !this.meshGroup) return false;
    this._time += dt;

    // Movement forward
    this.meshGroup.position.z += this.speed * dt;

    // Micro-warp trigger
    this.phaseTimer -= dt;
    if (this.phaseTimer <= 0 && this.meshGroup.position.z < 5) {
      this.phaseTimer = this.phaseCooldown;
      this.performMicroWarp();
    }

    // Weapon Fire: High-Frequency Phase Beams
    this.fireTimer -= dt;
    if (this.fireTimer <= 0 && playerPos && this.meshGroup.position.z >= -65) {
      this.fireTimer = 1.1 + Math.random() * 0.5;
      const p = this.meshGroup.position;
      return [
        new THREE.Vector3(p.x - 1.2, p.y, p.z + 1.6),
        new THREE.Vector3(p.x + 1.2, p.y, p.z + 1.6)
      ];
    }

    // Boundary Check: Micro-warp re-entry if flying past player
    if (this.meshGroup.position.z > 26) {
      this.meshGroup.position.z = -75 - Math.random() * 15;
      this.meshGroup.position.x = (Math.random() - 0.5) * 30;
      if (this.particleManager) {
        this.particleManager.createEmpShockwave(this.meshGroup.position, 20);
      }
    }

    return false;
  }

  takeDamage(amount) {
    if (this.isDead) return;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.isDead = true;
      if (this.particleManager) {
        this.particleManager.createExplosion(this.meshGroup.position, 0x00f3ff, 90, 3.2);
        this.particleManager.createEmpShockwave(this.meshGroup.position, 35);
      }
      this.destroy();
    }
  }

  destroy() {
    this.isDead = true;
    if (this.meshGroup && this.meshGroup.parent) {
      this.meshGroup.parent.remove(this.meshGroup);
    }
    this.meshGroup.traverse(c => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    });
  }
}
