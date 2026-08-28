import * as THREE from 'three';

/**
 * AAA Apex Boss: IGNIS TITAN // SOLAR DEVOURER (Stage 7)
 * Giant plasma harvester featuring 4 articulated thermal radiator wings,
 * a pulsating molten solar core, and sweeping 360-degree solar beam lances.
 */
export class SolarTitan {
  constructor(scene, particleManager) {
    this.scene = scene;
    this.particleManager = particleManager;

    this.meshGroup = new THREE.Group();
    this.meshGroup.position.set(0, 0, -85);

    // Combat Stats
    this.bossName = "IGNIS TITAN // SOLAR DEVOURER";
    this.maxCoreHp = 2400;
    this.coreHp = this.maxCoreHp;
    this.isDead = false;
    this.isVulnerable = false;

    // AI & Heat Cycle State
    this.state = 'HARVESTING'; // 'HARVESTING', 'VENTING_HEAT', 'SOLAR_LANCE'
    this.stateTimer = 0;
    this.ventCycleInterval = 8.0;
    this.wingOpenAngle = 0;
    this.targetWingOpenAngle = 0;

    // Weapon Timers
    this.laserTimer = 0;
    this.solarLanceTimer = 0;
    this.flareBurstTimer = 0;

    this.buildMesh();
    this.scene.add(this.meshGroup);
  }

  buildMesh() {
    // 1. High-Tech Obsidian-Gold Heat Shielding Materials
    const armorMat = new THREE.MeshStandardMaterial({
      color: 0x1a1208,
      metalness: 0.95,
      roughness: 0.22,
      emissive: 0x331a00,
      emissiveIntensity: 0.3
    });

    const goldPlatingMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.98,
      roughness: 0.12,
      emissive: 0x4a3c10,
      emissiveIntensity: 0.4
    });

    // 2. Central Fortress Chassis
    const chassisGeo = new THREE.CylinderGeometry(4.5, 6.2, 7.0, 8);
    chassisGeo.rotateX(Math.PI / 2);
    const chassis = new THREE.Mesh(chassisGeo, armorMat);
    this.meshGroup.add(chassis);

    // 3. Molten Solar Plasma Core (Protected during HARVESTING, Exposed during VENTING)
    const coreGeo = new THREE.SphereGeometry(3.2, 24, 24);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      wireframe: false
    });
    this.coreMesh = new THREE.Mesh(coreGeo, coreMat);
    this.coreMesh.position.set(0, 0, 0);
    this.meshGroup.add(this.coreMesh);

    // Inner Core Flare Glow
    const glowGeo = new THREE.SphereGeometry(3.6, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xff3300,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending
    });
    this.coreGlow = new THREE.Mesh(glowGeo, glowMat);
    this.meshGroup.add(this.coreGlow);

    // 4. 4 Articulated Thermal Radiator Wings
    this.wings = [];
    const wingGeo = new THREE.BoxGeometry(6.5, 0.4, 14.0);
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x24180c,
      metalness: 0.92,
      roughness: 0.25,
      emissive: 0xff5500,
      emissiveIntensity: 0.6
    });

    const wingConfigs = [
      { x: 5.5, y: 3.5, z: 0, rotZ: 0.35, id: 'TOP_RIGHT' },
      { x: -5.5, y: 3.5, z: 0, rotZ: -0.35, id: 'TOP_LEFT' },
      { x: 5.5, y: -3.5, z: 0, rotZ: -0.35, id: 'BOTTOM_RIGHT' },
      { x: -5.5, y: -3.5, z: 0, rotZ: 0.35, id: 'BOTTOM_LEFT' }
    ];

    wingConfigs.forEach(cfg => {
      const pivot = new THREE.Group();
      pivot.position.set(cfg.x, cfg.y, cfg.z);

      const wingMesh = new THREE.Mesh(wingGeo, wingMat);
      wingMesh.position.set(cfg.x > 0 ? 3.2 : -3.2, 0, 0);
      pivot.add(wingMesh);

      // Gold Edge Armor Trim
      const trimGeo = new THREE.BoxGeometry(0.5, 0.6, 14.2);
      const trimMesh = new THREE.Mesh(trimGeo, goldPlatingMat);
      trimMesh.position.set(cfg.x > 0 ? 6.5 : -6.5, 0, 0);
      pivot.add(trimMesh);

      this.meshGroup.add(pivot);
      this.wings.push({ pivot, config: cfg });
    });

    // 5. Heavy Quad Solar Lance Emitters
    this.emitters = [];
    const emitterGeo = new THREE.CylinderGeometry(0.6, 0.9, 3.5, 8);
    emitterGeo.rotateX(Math.PI / 2);
    const emitterMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.95, roughness: 0.1 });

    const emitterOffsets = [
      new THREE.Vector3(-3.5, 2.0, -4.5),
      new THREE.Vector3(3.5, 2.0, -4.5),
      new THREE.Vector3(-3.5, -2.0, -4.5),
      new THREE.Vector3(3.5, -2.0, -4.5)
    ];

    emitterOffsets.forEach(pos => {
      const em = new THREE.Mesh(emitterGeo, emitterMat);
      em.position.copy(pos);
      this.meshGroup.add(em);
      this.emitters.push(em);
    });
  }

  update(dt, playerShip, gameManager) {
    if (this.isDead) return null;

    this.stateTimer += dt;
    this.laserTimer += dt;
    this.flareBurstTimer += dt;

    // Pulse core scale and emissive
    const pulse = 1.0 + Math.sin(this.stateTimer * 4.0) * 0.08;
    this.coreMesh.scale.set(pulse, pulse, pulse);
    this.coreGlow.scale.set(pulse * 1.15, pulse * 1.15, pulse * 1.15);

    // State Machine: Cycling between HARVESTING (Shielded) and VENTING_HEAT (Exposed Core)
    if (this.state === 'HARVESTING') {
      this.targetWingOpenAngle = 0.0;
      this.isVulnerable = false;

      if (this.stateTimer >= this.ventCycleInterval) {
        this.state = 'VENTING_HEAT';
        this.stateTimer = 0;
        this.isVulnerable = true;
        gameManager?.spaceHUD?.showRadioTransmission("WARNING: Solar Devourer thermal radiators deploying! Target the exposed Molten Core!", "COMMAND", 4.5);
      }
    } else if (this.state === 'VENTING_HEAT') {
      this.targetWingOpenAngle = 0.65;
      this.isVulnerable = true;

      // In venting mode, fire sweeping solar lance waves
      if (this.stateTimer >= 5.5) {
        this.state = 'HARVESTING';
        this.stateTimer = 0;
        this.isVulnerable = false;
        gameManager?.spaceHUD?.showRadioTransmission("ALERT: Solar Core heat venting complete — Radiators sealing!", "COMMAND", 3.5);
      }
    }

    // Smoothly animate wing articulation
    this.wingOpenAngle = THREE.MathUtils.lerp(this.wingOpenAngle, this.targetWingOpenAngle, dt * 3.0);
    this.wings.forEach(w => {
      const dir = w.config.x > 0 ? 1 : -1;
      w.pivot.rotation.y = this.wingOpenAngle * dir;
      w.pivot.rotation.z = w.config.rotZ + (this.wingOpenAngle * 0.2 * (w.config.y > 0 ? 1 : -1));
    });

    // Weapon Fire Dispatch
    const fireData = { lasers: [], solarLances: [] };

    // Standard Dual Heavy Turret Salvos
    if (this.laserTimer >= 0.85) {
      this.laserTimer = 0;
      this.emitters.forEach(em => {
        const origin = this.meshGroup.localToWorld(em.position.clone());
        fireData.lasers.push(origin);
      });
    }

    // Venting Solar Prominence Wave
    if (this.isVulnerable && this.flareBurstTimer >= 1.4) {
      this.flareBurstTimer = 0;
      const coreOrigin = this.meshGroup.position.clone();
      fireData.solarLances.push(coreOrigin);
      this.particleManager?.createShockwave(coreOrigin, 0xff7700, 16.0, 0.4);
    }

    return fireData;
  }

  takeDamage(amount) {
    if (this.isDead) return;

    // Takes 100% damage when radiators are venting, 25% glancing damage when shielded
    const effectiveDamage = this.isVulnerable ? amount * 1.5 : amount * 0.25;
    this.coreHp -= effectiveDamage;

    if (this.particleManager && this.particleManager.spawnSparks) {
      this.particleManager.spawnSparks(this.meshGroup.position, new THREE.Vector3(0, 0, 1), this.isVulnerable ? 0xffea00 : 0x884400, 12);
    }

    if (this.coreHp <= 0) {
      this.coreHp = 0;
      this.isDead = true;
      if (this.particleManager) {
        this.particleManager.createExplosion(this.meshGroup.position, 0xff5500, 120, 6.0);
        this.particleManager.createShockwave(this.meshGroup.position, 0xffea00, 35.0, 0.8);
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
