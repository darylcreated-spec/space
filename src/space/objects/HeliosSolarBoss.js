import * as THREE from 'three';

export class HeliosSolarBoss {
  constructor(scene, particleManager) {
    this.scene = scene;
    this.particleManager = particleManager;

    this.meshGroup = new THREE.Group();
    this.meshGroup.position.set(0, 4, -130);

    this.isDead = false;
    this.introFinished = false;
    this.coreHp = 16000;
    this.maxCoreHp = 16000;

    this.solarPetals = [];
    this.arcCannons = [];
    this.rotationAngle = 0;
    this.pulseTimer = 0;

    this.buildBossModel();
    this.scene.add(this.meshGroup);
  }

  buildBossModel() {
    // ── Central Fusion Siphon Core ──
    const coreGeo = new THREE.IcosahedronGeometry(7.5, 3);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xff8800,
      emissive: 0xff4400,
      emissiveIntensity: 0.8,
      roughness: 0.3,
      metalness: 0.7
    });
    this.coreMesh = new THREE.Mesh(coreGeo, coreMat);
    this.meshGroup.add(this.coreMesh);

    // Glowing Inner Plasma Sphere
    const plasmaGeo = new THREE.SphereGeometry(6.2, 16, 16);
    const plasmaMat = new THREE.MeshBasicMaterial({
      color: 0xffea00,
      transparent: true,
      opacity: 0.65
    });
    this.plasmaMesh = new THREE.Mesh(plasmaGeo, plasmaMat);
    this.meshGroup.add(this.plasmaMesh);

    // ── 6 Rotating Dyson Solar Siphon Collector Petals ──
    this.petalGroup = new THREE.Group();
    this.meshGroup.add(this.petalGroup);

    const petalMat = new THREE.MeshStandardMaterial({
      color: 0x1a1208,
      metalness: 0.9,
      roughness: 0.25,
      emissive: 0xff6600,
      emissiveIntensity: 0.2
    });

    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const petalSubGroup = new THREE.Group();
      petalSubGroup.rotation.z = angle;

      const petalGeo = new THREE.BoxGeometry(3.5, 14.0, 1.2);
      const petalMesh = new THREE.Mesh(petalGeo, petalMat);
      petalMesh.position.set(0, 15.0, 0);
      petalSubGroup.add(petalMesh);

      // Gold Solar Grid Overlay
      const gridGeo = new THREE.PlaneGeometry(2.8, 12.0);
      const gridMat = new THREE.MeshBasicMaterial({
        color: 0xffea00,
        wireframe: true,
        transparent: true,
        opacity: 0.5
      });
      const gridMesh = new THREE.Mesh(gridGeo, gridMat);
      gridMesh.position.set(0, 15.0, 0.7);
      petalSubGroup.add(gridMesh);

      this.petalGroup.add(petalSubGroup);
      this.solarPetals.push({
        id: i,
        hp: 1200,
        maxHp: 1200,
        isDead: false,
        mesh: petalMesh,
        group: petalSubGroup
      });
    }

    // ── 4 Solar Arc Discharge Turrets ──
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const cannonSubGroup = new THREE.Group();
      cannonSubGroup.position.set(Math.cos(angle) * 9.5, Math.sin(angle) * 9.5, 2.0);

      const barrelGeo = new THREE.CylinderGeometry(0.6, 0.8, 4.0, 8);
      barrelGeo.rotateX(Math.PI / 2);
      const barrelMat = new THREE.MeshStandardMaterial({
        color: 0x332211,
        metalness: 0.85,
        roughness: 0.3
      });
      const barrelMesh = new THREE.Mesh(barrelGeo, barrelMat);
      cannonSubGroup.add(barrelMesh);

      this.meshGroup.add(cannonSubGroup);
      this.arcCannons.push({
        id: i,
        hp: 950,
        maxHp: 950,
        isDead: false,
        mesh: cannonSubGroup
      });
    }
  }

  update(dt, playerShip, gameManager) {
    if (this.isDead || !this.meshGroup) return;

    // Warp-in approach
    if (!this.introFinished) {
      if (this.meshGroup.position.z < -65) {
        this.meshGroup.position.z += 28 * dt;
      } else {
        this.introFinished = true;
      }
    }

    // Smooth hover & Solar Petal Rotation
    this.rotationAngle += 0.45 * dt;
    if (this.petalGroup) {
      this.petalGroup.rotation.z = this.rotationAngle;
    }
    this.meshGroup.position.y = 4.0 + Math.sin(Date.now() * 0.0015) * 1.5;

    // Pulse core
    if (this.plasmaMesh) {
      this.plasmaMesh.scale.setScalar(1.0 + Math.sin(Date.now() * 0.005) * 0.08);
    }

    // Solar Arc Turret Fire
    this.pulseTimer += dt;
    if (this.pulseTimer >= 1.8 && gameManager && gameManager.state === 'PLAYING') {
      this.pulseTimer = 0;
      this.fireSolarArcs(gameManager);
    }
  }

  fireSolarArcs(gameManager) {
    if (!gameManager || !gameManager.playerShip) return;
    const pPos = gameManager.playerShip.meshGroup.position;

    this.arcCannons.forEach(c => {
      if (c.isDead || !c.mesh) return;
      const muzzle = c.mesh.localToWorld(new THREE.Vector3(0, 0, -2.0));
      const targetDir = new THREE.Vector3().subVectors(pPos, muzzle).normalize();
      gameManager.spawnLaser(muzzle, 0xffaa00, true, targetDir, 42);
    });
  }

  takeDamage(hitPart, amount) {
    this.coreHp = Math.max(0, this.coreHp - amount);
    if (this.coreHp <= 0 && !this.isDead) {
      this.isDead = true;
      this.explode();
      return true;
    }
    return false;
  }

  explode() {
    this.isDead = true;
    if (this.particleManager) {
      for (let i = 0; i < 12; i++) {
        setTimeout(() => {
          if (this.meshGroup) {
            const burstPos = this.meshGroup.position.clone().add(new THREE.Vector3(
              (Math.random() - 0.5) * 16,
              (Math.random() - 0.5) * 16,
              (Math.random() - 0.5) * 8
            ));
            this.particleManager.createExplosion(burstPos, 2.5);
          }
        }, i * 150);
      }
    }

    setTimeout(() => {
      this.destroy();
    }, 2000);
  }

  destroy() {
    this.isDead = true;
    if (this.meshGroup && this.scene) {
      this.scene.remove(this.meshGroup);
    }
  }
}
