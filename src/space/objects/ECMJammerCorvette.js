import * as THREE from 'three';

/**
 * ECM Jammer Corvette — High-Threat Electronic Warfare Escort
 * Emits an electromagnetic distortion field that scrambles HUD targeting reticles
 * and radar until precision-destroyed.
 */
export class ECMJammerCorvette {
  constructor(scene, particleManager, spawnPos = null) {
    this.scene = scene;
    this.particleManager = particleManager;

    this.meshGroup = new THREE.Group();
    const spawnX = spawnPos ? spawnPos.x : (Math.random() > 0.5 ? -24 : 24);
    const spawnY = spawnPos ? spawnPos.y : 3.0 + (Math.random() - 0.5) * 4.0;
    const spawnZ = spawnPos ? spawnPos.z : -85;
    this.meshGroup.position.set(spawnX, spawnY, spawnZ);

    this.hp = 320;
    this.maxHp = 320;
    this.radius = 4.2;
    this.isDead = false;
    this.scoreValue = 950;

    this.targetZ = -38;
    this.speed = 20.0;
    this.jamRadius = 60.0;
    this._time = Math.random() * 10;
    this.jamPulseTimer = 0;
    this.fireTimer = 1.2;

    this.buildMesh();
    this.scene.add(this.meshGroup);
  }

  buildMesh() {
    // ── High-Tech Obsidian-Amethyst Electronic Warfare Composite ──
    this.hullMat = new THREE.MeshStandardMaterial({
      color: 0x180a22,
      metalness: 0.94,
      roughness: 0.18,
      emissive: 0x2c0840,
      emissiveIntensity: 0.5
    });

    this.trimMat = new THREE.MeshStandardMaterial({
      color: 0xaa22ff,
      metalness: 0.96,
      roughness: 0.12,
      emissive: 0x6600aa,
      emissiveIntensity: 0.8
    });

    this.glowMat = new THREE.MeshBasicMaterial({
      color: 0xd946ef,
      transparent: true,
      opacity: 0.95
    });

    // ── 1. Smooth Sculpted Hydrodynamic EW Fuselage ──
    const bodyGeo = new THREE.CapsuleGeometry(1.4, 4.2, 10, 20);
    bodyGeo.rotateX(Math.PI / 2);
    this.bodyMesh = new THREE.Mesh(bodyGeo, this.hullMat);
    this.meshGroup.add(this.bodyMesh);

    // ── 2. Rotating Triple Holographic Jamming Arrays ──
    this.jammingRings = [];
    [2.2, 2.8, 3.4].forEach((radius, idx) => {
      const ringGeo = new THREE.TorusGeometry(radius, 0.08, 8, 32);
      const ring = new THREE.Mesh(ringGeo, this.glowMat);
      ring.position.set(0, 0.2, (idx - 1) * 1.4);
      this.meshGroup.add(ring);
      this.jammingRings.push({ mesh: ring, speed: (idx % 2 === 0 ? 1 : -1) * (2.5 + idx * 0.8) });
    });

    // ── 3. Pulsing Jammer Core Emitter Dome ──
    const domeGeo = new THREE.SphereGeometry(0.85, 16, 16);
    this.domeMesh = new THREE.Mesh(domeGeo, this.glowMat);
    this.domeMesh.position.set(0, 1.2, 0);
    this.meshGroup.add(this.domeMesh);

    // ── 4. Swept Antenna Spines ──
    [-1, 1].forEach(side => {
      const finGeo = new THREE.BoxGeometry(0.12, 1.6, 2.8);
      const fin = new THREE.Mesh(finGeo, this.trimMat);
      fin.position.set(side * 2.2, 0.4, -0.6);
      fin.rotation.z = side * 0.35;
      this.meshGroup.add(fin);
    });

    // ── 5. Twin EMP Arc Emitters ──
    [-1.2, 1.2].forEach(x => {
      const tipGeo = new THREE.SphereGeometry(0.2, 8, 8);
      const tip = new THREE.Mesh(tipGeo, this.glowMat);
      tip.position.set(x, 0, 2.6);
      this.meshGroup.add(tip);
    });
  }

  update(dt, playerPos, gameManager) {
    if (this.isDead || !this.meshGroup) return false;
    this._time += dt;

    // Movement to position
    if (this.meshGroup.position.z < this.targetZ) {
      this.meshGroup.position.z += this.speed * dt;
    } else {
      this.meshGroup.position.x += Math.sin(this._time * 1.8) * 10.0 * dt;
      this.meshGroup.position.y = 3.0 + Math.cos(this._time * 1.4) * 2.5;
    }

    // Animate Jammer Rings
    this.jammingRings.forEach(r => {
      r.mesh.rotation.z += r.speed * dt;
      r.mesh.rotation.x += r.speed * 0.4 * dt;
    });

    // Pulse Jammer Core Dome
    const pulse = 1.0 + Math.sin(this._time * 8.0) * 0.25;
    if (this.domeMesh) this.domeMesh.scale.set(pulse, pulse, pulse);

    // ECM Field Jamming Effect on HUD
    this.jamPulseTimer += dt;
    if (this.jamPulseTimer >= 2.4 && playerPos) {
      this.jamPulseTimer = 0;
      const dist = this.meshGroup.position.distanceTo(playerPos);
      if (dist < this.jamRadius && gameManager && gameManager.spaceHUD) {
        gameManager.spaceHUD.flashShieldImpact();
        if (gameManager.particleManager) {
          gameManager.particleManager.createEmpShockwave(this.meshGroup.position, 30);
        }
      }
    }

    // Weapon Fire: Disruptor Plasma Bolts
    this.fireTimer -= dt;
    if (this.fireTimer <= 0 && playerPos && this.meshGroup.position.z >= this.targetZ - 15) {
      this.fireTimer = 1.6 + Math.random() * 0.6;
      const p = this.meshGroup.position;
      return [
        new THREE.Vector3(p.x - 1.2, p.y, p.z + 2.4),
        new THREE.Vector3(p.x + 1.2, p.y, p.z + 2.4)
      ];
    }

    return false;
  }

  takeDamage(amount) {
    if (this.isDead) return;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.isDead = true;
      if (this.particleManager) {
        this.particleManager.createExplosion(this.meshGroup.position, 0xaa22ff, 140, 4.0);
        this.particleManager.createEmpShockwave(this.meshGroup.position, 50);
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
