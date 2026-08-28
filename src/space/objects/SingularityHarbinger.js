import * as THREE from 'three';

/**
 * AAA Apex Boss: OBLIVION HARBINGER // SINGULARITY CRADLE (Stage 8)
 * Dark-matter capital ship carrying a miniature black hole singularity core
 * that emits graviton shockwaves and exerts gravitational pull on player navigation.
 */
export class SingularityHarbinger {
  constructor(scene, particleManager) {
    this.scene = scene;
    this.particleManager = particleManager;

    this.meshGroup = new THREE.Group();
    this.meshGroup.position.set(0, 0, -90);

    // Combat Stats
    this.bossName = "OBLIVION HARBINGER // SINGULARITY CRADLE";
    this.maxCoreHp = 2800;
    this.coreHp = this.maxCoreHp;
    this.isDead = false;

    // AI & Singularity Pulse State
    this.gravitonPulseTimer = 0;
    this.laserTimer = 0;
    this.vortexTimer = 0;

    this.buildMesh();
    this.scene.add(this.meshGroup);
  }

  buildMesh() {
    // 1. Dark Matter Composite Hull Material
    const darkMatterMat = new THREE.MeshStandardMaterial({
      color: 0x09050e,
      metalness: 0.98,
      roughness: 0.15,
      emissive: 0x1a0033,
      emissiveIntensity: 0.5
    });

    const violetTrimMat = new THREE.MeshBasicMaterial({
      color: 0xaa00ff
    });

    // 2. Twin Crescent Stasis Claws (Pincers enclosing the Singularity)
    const clawShape = new THREE.Shape();
    clawShape.moveTo(0, 4.0);
    clawShape.bezierCurveTo(7.0, 3.5, 9.0, -1.0, 7.0, -5.0);
    clawShape.bezierCurveTo(4.0, -3.0, 2.0, 0.0, 0, 0.0);
    clawShape.closePath();

    const extrudeSettings = { depth: 1.8, bevelEnabled: true, bevelSize: 0.2 };
    const clawGeo = new THREE.ExtrudeGeometry(clawShape, extrudeSettings);

    const rightClaw = new THREE.Mesh(clawGeo, darkMatterMat);
    rightClaw.position.set(2.0, 0, -4.0);
    this.meshGroup.add(rightClaw);

    const leftClaw = new THREE.Mesh(clawGeo, darkMatterMat);
    leftClaw.scale.set(-1, 1, 1);
    leftClaw.position.set(-2.0, 0, -4.0);
    this.meshGroup.add(leftClaw);

    // 3. Central Miniature Black Hole Singularity Core
    // Event Horizon (Absolute Black Sphere)
    const eventHorizonGeo = new THREE.SphereGeometry(2.4, 32, 32);
    const eventHorizonMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    this.singularityCore = new THREE.Mesh(eventHorizonGeo, eventHorizonMat);
    this.singularityCore.position.set(0, 0, -1.0);
    this.meshGroup.add(this.singularityCore);

    // Relativistic Lensing Photon Ring
    const photonRingGeo = new THREE.RingGeometry(2.5, 4.2, 48);
    photonRingGeo.rotateX(Math.PI * 0.4);
    const photonRingMat = new THREE.MeshBasicMaterial({
      color: 0xaa00ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
    this.photonRing = new THREE.Mesh(photonRingGeo, photonRingMat);
    this.photonRing.position.set(0, 0, -1.0);
    this.meshGroup.add(this.photonRing);

    // Outer Accretion Glow Disk
    const outerDiskGeo = new THREE.RingGeometry(4.0, 7.5, 48);
    outerDiskGeo.rotateX(Math.PI * 0.4);
    const outerDiskMat = new THREE.MeshBasicMaterial({
      color: 0xff0066,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending
    });
    this.outerDisk = new THREE.Mesh(outerDiskGeo, outerDiskMat);
    this.outerDisk.position.set(0, 0, -1.0);
    this.meshGroup.add(this.outerDisk);

    // 4. Void Warp Conduit Stabilizers (4 Ring Nodes)
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const nodeGeo = new THREE.TorusGeometry(1.0, 0.25, 12, 24);
      const node = new THREE.Mesh(nodeGeo, violetTrimMat);
      node.position.set(Math.cos(angle) * 7.5, Math.sin(angle) * 7.5, -2.0);
      this.meshGroup.add(node);
    }
  }

  update(dt, playerShip, gameManager) {
    if (this.isDead) return null;

    this.gravitonPulseTimer += dt;
    this.laserTimer += dt;
    this.vortexTimer += dt;

    // Spin photon ring and accretion disk in counter-rotation
    if (this.photonRing) this.photonRing.rotation.z += dt * 3.5;
    if (this.outerDisk) this.outerDisk.rotation.z -= dt * 1.8;

    // Subtle breathing pulse on the singularity event horizon
    const corePulse = 1.0 + Math.sin(this.vortexTimer * 5.0) * 0.06;
    this.singularityCore.scale.set(corePulse, corePulse, corePulse);

    // Environmental Mechanic: Gravitational Tug on Player
    if (playerShip && playerShip.meshGroup) {
      const pPos = playerShip.meshGroup.position;
      const toBoss = this.meshGroup.position.clone().sub(pPos);
      const dist = toBoss.length();

      if (dist < 120.0) {
        // Exert gentle gravitational well pull toward the singularity
        const pullStrength = Math.min(6.5, (120.0 - dist) * 0.08);
        pPos.x += (toBoss.x / dist) * pullStrength * dt;
        pPos.y += (toBoss.y / dist) * pullStrength * dt;
      }
    }

    const fireData = { lasers: [], gravitonWaves: [] };

    // Primary Tachyon Lance Salvo (Every 0.9s)
    if (this.laserTimer >= 0.9) {
      this.laserTimer = 0;
      const leftTip = this.meshGroup.localToWorld(new THREE.Vector3(-6.5, 0, -5.0));
      const rightTip = this.meshGroup.localToWorld(new THREE.Vector3(6.5, 0, -5.0));
      fireData.lasers.push(leftTip, rightTip);
    }

    // Graviton Spacetime Collapse Wave (Every 3.2s)
    if (this.gravitonPulseTimer >= 3.2) {
      this.gravitonPulseTimer = 0;
      const corePos = this.meshGroup.localToWorld(new THREE.Vector3(0, 0, -1.0));
      fireData.gravitonWaves.push(corePos);

      if (this.particleManager) {
        this.particleManager.createShockwave(corePos, 0xaa00ff, 25.0, 0.6);
        this.particleManager.createShockwave(corePos, 0xff0066, 18.0, 0.4);
      }
      gameManager?.spaceHUD?.showRadioTransmission("WARNING: Graviton Spacetime Collapse Wave detected! Perform lateral evasion!", "COMMAND", 3.5);
    }

    return fireData;
  }

  takeDamage(amount) {
    if (this.isDead) return;

    this.coreHp -= amount;
    if (this.particleManager && this.particleManager.spawnSparks) {
      this.particleManager.spawnSparks(this.meshGroup.position, new THREE.Vector3(0, 0, 1), 0xaa00ff, 14);
    }

    if (this.coreHp <= 0) {
      this.coreHp = 0;
      this.isDead = true;
      if (this.particleManager) {
        this.particleManager.createExplosion(this.meshGroup.position, 0xaa00ff, 140, 7.0);
        this.particleManager.createShockwave(this.meshGroup.position, 0xffffff, 45.0, 1.0);
      }
      this.destroy();
    }
  }

  destroy() {
    this.isDead = true;
    if (this.meshGroup && this.meshGroup.parent) {
      this.meshGroup.parent.remove(this.meshGroup);
    }
    if (this.meshGroup) {
      this.meshGroup.traverse(c => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) c.material.dispose();
      });
    }
  }
}
