import * as THREE from 'three';

/**
 * Procedural Normal Map for Leviathan Command Citadel
 */
function generateCitadelNormalMap() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgb(128, 128, 255)';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = 'rgb(60, 60, 180)';
  ctx.lineWidth = 4;
  for (let i = 0; i < 256; i += 32) {
    ctx.strokeRect(i, 0, 32, 256);
    ctx.strokeRect(0, i, 256, 32);
  }
  return new THREE.CanvasTexture(canvas);
}

export class CommandMothership {
  constructor(scene, particleManager, spawnZ = -160) {
    this.scene = scene;
    this.particleManager = particleManager;

    this.meshGroup = new THREE.Group();
    this.meshGroup.position.set(0, 4, spawnZ);

    // -- Boss Telemetry & Stats --
    this.coreHp = 10000;
    this.maxCoreHp = 10000;
    this.hitRadius = 55.0;
    this.radius = 55.0;
    this.isDead = false;
    this.scoreValue = 8500;

    // Tethered Invulnerability Shield (Protected by 4 Aegis Escort Frigates)
    this.hasShield = true;
    this.aegisFrigates = [];
    this.tetherLines = [];

    // 8 Automated CIWS Point-Defense Turrets
    this.ciwsTurrets = [];

    // Launch Catapults & Combat Cycles
    this.targetZ = -105;
    this.speed = 10.0;
    this.droneLaunchTimer = 5.0;
    this.stealthLaunchTimer = 12.0;
    this.ciwsFireTimer = 0.8;
    this.annihilatorBeamTimer = 14.0;
    this.isFiringAnnihilator = false;
    this.annihilatorChargeTimer = 0;

    // Death sequence
    this.isDying = false;
    this.deathTimer = 0;

    this.buildMothership();
    this.buildAegisFrigates();
    this.scene.add(this.meshGroup);
  }

  buildMothership() {
    const normalMap = generateCitadelNormalMap();

    this.citadelMat = new THREE.MeshStandardMaterial({
      color: 0x101622,
      metalness: 0.95,
      roughness: 0.25,
      normalMap: normalMap
    });

    this.platingMat = new THREE.MeshStandardMaterial({
      color: 0x1f2c42,
      metalness: 0.9,
      roughness: 0.3,
      normalMap: normalMap
    });

    this.glowGoldMat = new THREE.MeshBasicMaterial({
      color: 0xffb700,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    this.glowCyanMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });

    // 1. Massive Diamond-Spire Citadel Hull (85m Span)
    const hullGeo = new THREE.CylinderGeometry(18.0, 36.0, 22.0, 8);
    hullGeo.rotateX(Math.PI / 2);
    hullGeo.scale(1.2, 0.5, 1.4);
    const hullMesh = new THREE.Mesh(hullGeo, this.citadelMat);
    this.meshGroup.add(hullMesh);

    // 2. Multi-Tier Command Bridge Spire Tower
    const spireGeo = new THREE.CylinderGeometry(4.0, 10.0, 16.0, 8);
    const spireMesh = new THREE.Mesh(spireGeo, this.platingMat);
    spireMesh.position.set(0, 12.0, -8.0);
    this.meshGroup.add(spireMesh);

    const bridgeWindowGeo = new THREE.CylinderGeometry(4.2, 8.2, 2.0, 8);
    const bridgeWindowMesh = new THREE.Mesh(bridgeWindowGeo, this.glowGoldMat);
    bridgeWindowMesh.position.set(0, 14.0, -8.0);
    this.meshGroup.add(bridgeWindowMesh);

    // 3. Dual Rotating Catapult Flight Decks (Port & Starboard)
    [-24.0, 24.0].forEach((hx, idx) => {
      const hangarGroup = new THREE.Group();
      hangarGroup.position.set(hx, 0, 0);

      const hangarGeo = new THREE.BoxGeometry(14.0, 7.0, 38.0);
      const hangarMesh = new THREE.Mesh(hangarGeo, this.platingMat);
      hangarGroup.add(hangarMesh);

      // Forcefield Launch Bay Maw
      const bayMawGeo = new THREE.PlaneGeometry(10.0, 4.5);
      const bayMawMesh = new THREE.Mesh(bayMawGeo, this.glowCyanMat);
      bayMawMesh.position.set(0, 0, 19.1);
      hangarGroup.add(bayMawMesh);

      this.meshGroup.add(hangarGroup);
    });

    // 4. Eight Automated CIWS Point-Defense Turrets
    const ciwsOffsets = [
      new THREE.Vector3(-18, 6, 16),
      new THREE.Vector3(18, 6, 16),
      new THREE.Vector3(-22, 6, -12),
      new THREE.Vector3(22, 6, -12),
      new THREE.Vector3(-14, -5, 14),
      new THREE.Vector3(14, -5, 14),
      new THREE.Vector3(-8, 9, 4),
      new THREE.Vector3(8, 9, 4)
    ];

    ciwsOffsets.forEach((off, idx) => {
      const turretGroup = new THREE.Group();
      turretGroup.position.copy(off);

      const baseGeo = new THREE.CylinderGeometry(1.4, 1.8, 0.8, 8);
      const baseMesh = new THREE.Mesh(baseGeo, this.citadelMat);
      turretGroup.add(baseMesh);

      const barrelGeo = new THREE.CylinderGeometry(0.12, 0.15, 2.8, 6);
      barrelGeo.rotateX(Math.PI / 2);
      const barrelMesh = new THREE.Mesh(barrelGeo, this.glowGoldMat);
      barrelMesh.position.set(0, 0.4, 1.4);
      turretGroup.add(barrelMesh);

      this.meshGroup.add(turretGroup);

      this.ciwsTurrets.push({
        id: `mothership_ciws_${idx}`,
        mesh: turretGroup,
        barrelMesh: barrelMesh,
        relPos: off.clone(),
        hp: 550,
        maxHp: 550,
        isDead: false
      });
    });

    // 5. Central Annihilator Lance Core (Prow)
    const coreGeo = new THREE.SphereGeometry(3.5, 16, 16);
    this.coreMesh = new THREE.Mesh(coreGeo, this.glowGoldMat);
    this.coreMesh.position.set(0, 0, 24.0);
    this.meshGroup.add(this.coreMesh);

    // 6. Colossal Hexagonal Invulnerability Shield Bubble
    const shieldGeo = new THREE.IcosahedronGeometry(42.0, 2);
    this.shieldMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      wireframe: true,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending
    });
    this.shieldMesh = new THREE.Mesh(shieldGeo, this.shieldMat);
    this.meshGroup.add(this.shieldMesh);
  }

  buildAegisFrigates() {
    // 4 Aegis Escort Frigates in Diamond Formation
    const frigateAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
    frigateAngles.forEach((angle, idx) => {
      const frigateGroup = new THREE.Group();
      const dist = 48.0;
      const fx = Math.cos(angle) * dist;
      const fy = Math.sin(angle) * (dist * 0.45);
      frigateGroup.position.set(fx, fy, -10.0);

      // Frigate Hull
      const fGeo = new THREE.ConeGeometry(2.5, 8.0, 5);
      fGeo.rotateX(Math.PI / 2);
      const fMesh = new THREE.Mesh(fGeo, this.platingMat);
      frigateGroup.add(fMesh);

      // Energy Shield Emitter Core
      const eGeo = new THREE.SphereGeometry(1.2, 10, 10);
      const eMesh = new THREE.Mesh(eGeo, this.glowCyanMat);
      eMesh.position.set(0, 0, 2.0);
      frigateGroup.add(eMesh);

      this.meshGroup.add(frigateGroup);

      // Visual Energy Tether Line to Mothership Core
      const tetherGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(fx, fy, -10.0),
        new THREE.Vector3(0, 0, 0)
      ]);
      const tetherMat = new THREE.LineBasicMaterial({
        color: 0x00f3ff,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending
      });
      const tetherLine = new THREE.Line(tetherGeo, tetherMat);
      this.meshGroup.add(tetherLine);

      this.aegisFrigates.push({
        id: `aegis_frigate_${idx}`,
        mesh: frigateGroup,
        tetherLine: tetherLine,
        angle: angle,
        orbitRadius: dist,
        hp: 850,
        maxHp: 850,
        isDead: false
      });
    });
  }

  update(dt, playerShip, gameManager) {
    if (this.isDead || !this.meshGroup) return;

    if (this.isDying) {
      this.updateDeathSequence(dt);
      return;
    }

    const pos = this.meshGroup.position;
    const playerPos = playerShip && playerShip.meshGroup ? playerShip.meshGroup.position : new THREE.Vector3(0, 0, 0);

    // 1. Advance to battle station
    if (pos.z < this.targetZ) {
      pos.z += this.speed * dt;
    }

    // 2. Update Aegis Escort Frigate Orbits & Tethers
    let livingFrigates = 0;
    this.aegisFrigates.forEach(frigate => {
      if (!frigate.isDead && frigate.mesh) {
        livingFrigates++;
        frigate.angle += dt * 0.25;
        const fx = Math.cos(frigate.angle) * frigate.orbitRadius;
        const fy = Math.sin(frigate.angle) * (frigate.orbitRadius * 0.45);
        frigate.mesh.position.set(fx, fy, -10.0);

        // Update Tether Line Geometry
        if (frigate.tetherLine) {
          const positions = frigate.tetherLine.geometry.attributes.position.array;
          positions[0] = fx;
          positions[1] = fy;
          positions[2] = -10.0;
          positions[3] = 0;
          positions[4] = 0;
          positions[5] = 0;
          frigate.tetherLine.geometry.attributes.position.needsUpdate = true;
        }
      } else if (frigate.tetherLine) {
        frigate.tetherLine.visible = false;
      }
    });

    // Shield status
    if (livingFrigates === 0 && this.hasShield) {
      this.hasShield = false;
      if (this.shieldMesh) this.shieldMesh.visible = false;
      if (this.particleManager) {
        this.particleManager.createEmpShockwave(pos, 60);
      }
      if (gameManager && gameManager.spaceHUD) {
        gameManager.spaceHUD.showRadioTransmission("MOTHERSHIP AEGIS SHIELD SHATTERED! ALL POINT DEFENSES EXPOSED!", "STARBOUND COMMAND", 5.5);
      }
    }

    if (this.shieldMesh && this.hasShield) {
      this.shieldMesh.rotation.y += 0.3 * dt;
      this.shieldMesh.rotation.z += 0.2 * dt;
    }

    // 3. Automated 360° CIWS Laser Batteries
    this.ciwsFireTimer -= dt;
    this.ciwsTurrets.forEach(turret => {
      if (!turret.isDead && turret.mesh) {
        const turretWorldPos = turret.mesh.getWorldPosition(new THREE.Vector3());
        const dir = new THREE.Vector3().subVectors(playerPos, turretWorldPos);
        turret.mesh.rotation.y = Math.atan2(-dir.x, dir.z);

        if (this.ciwsFireTimer <= 0 && pos.z >= this.targetZ - 10) {
          if (Math.random() < 0.4 && gameManager && gameManager.spawnEnemyLaser) {
            gameManager.spawnEnemyLaser(turretWorldPos, dir.normalize(), 0xffb700, 44);
          }
        }
      }
    });

    if (this.ciwsFireTimer <= 0) {
      this.ciwsFireTimer = 0.75;
    }

    // 4. Catapult Hangar Launches (Stingers & Shadow-Wraiths)
    this.droneLaunchTimer -= dt;
    if (this.droneLaunchTimer <= 0 && pos.z >= this.targetZ - 10) {
      this.droneLaunchTimer = 6.0;
      this.launchDroneWing(gameManager);
    }

    this.stealthLaunchTimer -= dt;
    if (this.stealthLaunchTimer <= 0 && pos.z >= this.targetZ - 10) {
      this.stealthLaunchTimer = 14.0;
      this.launchStealthFighter(gameManager);
    }

    // 5. Annihilator Beam Firing Cycle
    this.annihilatorBeamTimer -= dt;
    if (this.annihilatorBeamTimer <= 3.0 && !this.isFiringAnnihilator) {
      this.isFiringAnnihilator = true;
      this.annihilatorChargeTimer = 3.0;
      if (gameManager && gameManager.spaceHUD) {
        gameManager.spaceHUD.showRadioTransmission("WARNING: Leviathan charging Orbital Annihilator Cannon! CLEAR FIRE LINE!", "STARBOUND COMMAND", 3.5);
      }
    }

    if (this.isFiringAnnihilator) {
      this.annihilatorChargeTimer -= dt;
      if (this.coreMesh) {
        const scale = 1.0 + (3.0 - this.annihilatorChargeTimer) * 2.0;
        this.coreMesh.scale.set(scale, scale, scale);
      }

      if (this.annihilatorChargeTimer <= 0) {
        this.isFiringAnnihilator = false;
        this.annihilatorBeamTimer = 16.0;
        this.fireAnnihilatorStream(gameManager);
        if (this.coreMesh) this.coreMesh.scale.set(1, 1, 1);
      }
    }
  }

  launchDroneWing(gameManager) {
    if (!gameManager || !gameManager.spawnDrone) return;
    const pos = this.meshGroup.position;
    [-24, 24].forEach(hx => {
      const launchPos = pos.clone().add(new THREE.Vector3(hx, 0, 18));
      if (this.particleManager) {
        this.particleManager.spawnSonicBoomDisc(launchPos, 0x00f3ff);
      }
      gameManager.spawnDrone(launchPos);
    });
  }

  launchStealthFighter(gameManager) {
    if (!gameManager || !gameManager.spawnStealthFighter) return;
    const pos = this.meshGroup.position;
    const launchPos = pos.clone().add(new THREE.Vector3(0, -6, 20));
    if (this.particleManager) {
      this.particleManager.createExplosion(launchPos, 0xaa00ff, 25, 1.2);
    }
    gameManager.spawnStealthFighter(launchPos);
  }

  fireAnnihilatorStream(gameManager) {
    if (!gameManager) return;
    const origin = this.meshGroup.position.clone().add(new THREE.Vector3(0, 0, 24));
    const dir = new THREE.Vector3(0, 0, 1);

    if (this.particleManager) {
      this.particleManager.spawnSonicBoomDisc(origin, 0xffb700);
      this.particleManager.createExplosion(origin, 0xffb700, 50, 2.5);
    }

    for (let i = 0; i < 7; i++) {
      setTimeout(() => {
        if (this.isDead || !gameManager) return;
        if (gameManager.spawnEnemyLaser) {
          gameManager.spawnEnemyLaser(origin, dir, 0xff9900, 68);
        }
      }, i * 50);
    }

    if (gameManager.spaceAudio) {
      gameManager.spaceAudio.playExplosion();
    }
  }

  takeAegisFrigateDamage(frigateId, amount) {
    const frigate = this.aegisFrigates.find(f => f.id === frigateId);
    if (!frigate || frigate.isDead) return;

    frigate.hp -= amount;
    if (frigate.hp <= 0) {
      frigate.isDead = true;
      if (this.particleManager && frigate.mesh) {
        this.particleManager.createExplosion(frigate.mesh.getWorldPosition(new THREE.Vector3()), 0x00f3ff, 35, 1.5);
        this.particleManager.createEmpShockwave(frigate.mesh.getWorldPosition(new THREE.Vector3()), 30);
      }
      if (frigate.mesh) frigate.mesh.visible = false;
      if (frigate.tetherLine) frigate.tetherLine.visible = false;
    }
  }

  takeCiwsDamage(turretId, amount) {
    const turret = this.ciwsTurrets.find(t => t.id === turretId);
    if (!turret || turret.isDead) return;

    turret.hp -= amount;
    if (turret.hp <= 0) {
      turret.isDead = true;
      if (this.particleManager && turret.mesh) {
        this.particleManager.createExplosion(turret.mesh.getWorldPosition(new THREE.Vector3()), 0xffb700, 25, 1.0);
      }
      if (turret.mesh) turret.mesh.visible = false;
    }
  }

  takeDamage(subsystem, amount) {
    if (this.isDead) return false;

    // Invulnerable while Aegis Frigates live
    if (this.hasShield) {
      if (this.particleManager) {
        this.particleManager.createLaserImpact(this.meshGroup.position, new THREE.Vector3(0, 0, 1), 0x00f3ff);
      }
      return false;
    }

    this.coreHp -= amount;
    if (this.particleManager) {
      this.particleManager.createLaserImpact(this.meshGroup.position, new THREE.Vector3(0, 0, 1), 0xffb700);
    }

    if (this.coreHp <= 0 && !this.isDying) {
      this.triggerDeathSequence();
      return true;
    }
    return false;
  }

  triggerDeathSequence() {
    this.isDying = true;
    this.deathTimer = 3.5;

    if (window.spaceGameManager && window.spaceGameManager.spaceHUD) {
      window.spaceGameManager.spaceHUD.showRadioTransmission("LEVIATHAN COMMAND MOTHERSHIP CRITICAL FAILURE! SECTOR VICTORY ACHIEVED!", "STARBOUND COMMAND", 7.0);
    }
  }

  updateDeathSequence(dt) {
    this.deathTimer -= dt;
    const pos = this.meshGroup.position;

    // Multi-Sector Cascading Superstructure Detonations
    if (Math.random() < 0.8 && this.particleManager) {
      const offset = new THREE.Vector3((Math.random() - 0.5) * 45, (Math.random() - 0.5) * 15, (Math.random() - 0.5) * 45);
      this.particleManager.createExplosion(pos.clone().add(offset), 0xffb700, 35, 1.8);
    }

    this.meshGroup.rotation.z += 0.4 * dt;
    this.meshGroup.rotation.x += 0.2 * dt;
    pos.y -= 2.0 * dt;

    if (this.deathTimer <= 0) {
      this.destroy();
    }
  }

  destroy() {
    this.isDead = true;
    if (this.particleManager) {
      this.particleManager.createExplosion(this.meshGroup.position, 0xffb700, 100, 5.0);
      this.particleManager.createEmpShockwave(this.meshGroup.position, 80);
    }
    if (this.meshGroup && this.meshGroup.parent) {
      this.meshGroup.parent.remove(this.meshGroup);
    }
  }
}
