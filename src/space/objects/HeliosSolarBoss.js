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

  update(dt, playerPos, gameManager) {
    if (this.isDead || !this.meshGroup) return;

    if (this.isDying) {
      this.deathTimer -= dt;
      if (Math.random() < 0.92 && this.particleManager) {
        const offset = new THREE.Vector3((Math.random() - 0.5) * 25, (Math.random() - 0.5) * 25, (Math.random() - 0.5) * 20);
        this.particleManager.createExplosion(this.meshGroup.position.clone().add(offset), 0xffaa00, 80, 4.0);
        this.particleManager.createExplosion(this.meshGroup.position.clone().add(offset), 0xff3300, 60, 3.0);
        this.particleManager.spawnSparks(this.meshGroup.position.clone().add(offset), new THREE.Vector3(0, 1, 0), 0xffd700, 20);
      }
      this.meshGroup.rotation.z += 0.5 * dt;
      this.meshGroup.rotation.x += 0.25 * dt;
      this.meshGroup.position.y -= 2.0 * dt;
      if (this.deathTimer <= 0) {
        this.isDead = true;
        this.destroy();
      }
      return;
    }

    // Progressive hull damage smoke
    if (this.coreHp < this.maxCoreHp * 0.5 && Math.random() < 0.35 && this.particleManager) {
      const offset = new THREE.Vector3((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, 0);
      this.particleManager.spawnEngineParticle(this.meshGroup.position.clone().add(offset), 0x222222);
      this.particleManager.spawnSparks(this.meshGroup.position.clone().add(offset), new THREE.Vector3(0, 1, 0), 0xffaa00, 8);
    }

    const gm = gameManager || window.spaceGameManager;

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
    if (this.pulseTimer >= 1.8 && gm && gm.state === 'PLAYING') {
      this.pulseTimer = 0;
      this.fireSolarArcs(gm);
    }
  }

  fireSolarArcs(gameManager) {
    if (!gameManager || !gameManager.playerShip) return;
    const pPos = gameManager.playerShip.meshGroup.position;

    this.arcCannons.forEach(c => {
      if (c.isDead || !c.mesh) return;
      const muzzle = c.mesh.localToWorld(new THREE.Vector3(0, 0, -2.0));
      const targetDir = new THREE.Vector3().subVectors(pPos, muzzle).normalize();
      if (gameManager.spawnEnemyLaser) {
        gameManager.spawnEnemyLaser(muzzle, targetDir, 0xffaa00, 48);
      } else {
        gameManager.spawnLaser(muzzle, 0xffaa00, true, targetDir);
      }
    });
  }

  takeDamage(hitPart, amount) {
    if (this.isDead || this.isDying) return false;
    this.coreHp = Math.max(0, this.coreHp - amount);
    if (this.coreHp <= 0 && !this.isDying) {
      this.isDying = true;
      this.deathTimer = 4.0;
      this.arcCannons.forEach(c => c.isDead = true);
      window.spaceGameManager?.voiceAnnouncer?.speak("Helios Solar Siphon Containment Failure! Solar Eruption!", true);
      return true;
    }
    return false;
  }

  destroy() {
    this.isDead = true;
    if (this.particleManager && this.meshGroup) {
      this.particleManager.createExplosion(this.meshGroup.position, 0xffaa00, 400, 8.0);
      this.particleManager.createExplosion(this.meshGroup.position, 0xffffff, 200, 6.0);
      this.particleManager.createEmpShockwave(this.meshGroup.position, 250);
    }
    if (this.meshGroup && this.scene) {
      this.scene.remove(this.meshGroup);
    }
  }
}
