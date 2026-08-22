import * as THREE from 'three';

/**
 * Procedural Normal Map for Heavy Titanium Battleship Armor
 */
function generateBattleshipNormalMap() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgb(128, 128, 255)';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = 'rgb(70, 70, 200)';
  ctx.lineWidth = 3;
  for (let x = 0; x < 256; x += 32) {
    ctx.strokeRect(x, 0, 32, 256);
  }
  for (let y = 0; y < 256; y += 32) {
    ctx.strokeRect(0, y, 256, 32);
  }
  return new THREE.CanvasTexture(canvas);
}

export class HeavyBattleship {
  constructor(scene, particleManager, spawnZ = -140) {
    this.scene = scene;
    this.particleManager = particleManager;

    this.meshGroup = new THREE.Group();
    this.meshGroup.position.set(0, 3, spawnZ);

    // -- Boss Telemetry & Stats --
    this.coreHp = 4200;
    this.maxCoreHp = 4200;
    this.hitRadius = 26.0;
    this.radius = 26.0;
    this.isDead = false;
    this.scoreValue = 2800;

    // Movement & Combat
    this.targetZ = -82;
    this.speed = 12.0;
    this.strafeTimer = 0;

    // Subsystems: 3 Heavy Triple-Railgun Turrets & 2 Engine Nacelles
    this.turrets = [];
    this.subsystems = [];

    // Weapon Timers
    this.railgunTimer = 3.5;
    this.flakTimer = 2.0;
    this.spinalLanceTimer = 9.0;
    this.isChargingLance = false;
    this.lanceChargeTime = 0;

    // Teardown
    this.deathTimer = 0;
    this.isDying = false;

    this.buildShip();
    this.scene.add(this.meshGroup);
  }

  buildShip() {
    const normalMap = generateBattleshipNormalMap();

    // Heavy Plating Materials
    this.hullMat = new THREE.MeshStandardMaterial({
      color: 0x1a2230,
      metalness: 0.9,
      roughness: 0.3,
      normalMap: normalMap
    });

    this.armorPlatesMat = new THREE.MeshStandardMaterial({
      color: 0x2b384e,
      metalness: 0.95,
      roughness: 0.25,
      normalMap: normalMap
    });

    this.glowRedMat = new THREE.MeshBasicMaterial({
      color: 0xff0044,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    this.glowOrangeMat = new THREE.MeshBasicMaterial({
      color: 0xff7700,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });

    // 1. Angular Wedge-Shaped Battleship Hull (48m Length)
    const hullGeo = new THREE.BufferGeometry();
    const hullVerts = new Float32Array([
      // Prow wedge top
      0, 2.5, 24,   -9, 2.5, -12,   9, 2.5, -12,
      // Prow wedge bottom
      0, -2.5, 24,   9, -2.5, -12,  -9, -2.5, -12,
      // Stern block top
      -9, 2.5, -12,  -9, 2.5, -24,   9, 2.5, -24,
      -9, 2.5, -12,   9, 2.5, -24,   9, 2.5, -12,
      // Stern block bottom
      -9, -2.5, -12,  9, -2.5, -24, -9, -2.5, -24,
      -9, -2.5, -12,  9, -2.5, -12,  9, -2.5, -24,
      // Left Flank
      0, 2.5, 24,   0, -2.5, 24,   -9, -2.5, -12,
      0, 2.5, 24,  -9, -2.5, -12,  -9, 2.5, -12,
      -9, 2.5, -12, -9, -2.5, -12,  -9, -2.5, -24,
      -9, 2.5, -12, -9, -2.5, -24,  -9, 2.5, -24,
      // Right Flank
      0, 2.5, 24,    9, -2.5, -12,  0, -2.5, 24,
      0, 2.5, 24,    9, 2.5, -12,   9, -2.5, -12,
      9, 2.5, -12,   9, -2.5, -24,  9, -2.5, -12,
      9, 2.5, -12,   9, 2.5, -24,   9, -2.5, -24,
      // Stern Aft
      -9, 2.5, -24, -9, -2.5, -24,  9, -2.5, -24,
      -9, 2.5, -24,  9, -2.5, -24,  9, 2.5, -24
    ]);
    hullGeo.setAttribute('position', new THREE.BufferAttribute(hullVerts, 3));
    hullGeo.computeVertexNormals();
    const mainHull = new THREE.Mesh(hullGeo, this.hullMat);
    this.meshGroup.add(mainHull);

    // 2. Central Raised Dorsal Citadel Spine
    const spineGeo = new THREE.BoxGeometry(7.0, 3.2, 34);
    const spineMesh = new THREE.Mesh(spineGeo, this.armorPlatesMat);
    spineMesh.position.set(0, 3.2, -4);
    this.meshGroup.add(spineMesh);

    // 3. Command Bridge Fortress Citadel
    const bridgeGeo = new THREE.BoxGeometry(6.0, 4.0, 8.0);
    const bridgeMesh = new THREE.Mesh(bridgeGeo, this.hullMat);
    bridgeMesh.position.set(0, 5.8, -12);
    this.meshGroup.add(bridgeMesh);

    const visorGeo = new THREE.BoxGeometry(5.2, 0.6, 0.4);
    const visorMesh = new THREE.Mesh(visorGeo, this.glowRedMat);
    visorMesh.position.set(0, 6.2, -7.8);
    this.meshGroup.add(visorMesh);

    // 4. Three Rotating Heavy Triple-Railgun Turrets
    const turretZPositions = [12.0, 2.0, -6.0];
    turretZPositions.forEach((zPos, idx) => {
      const turretGroup = new THREE.Group();
      turretGroup.position.set(0, 5.0, zPos);

      // Base Dome
      const baseGeo = new THREE.CylinderGeometry(2.2, 2.6, 1.2, 12);
      const baseMesh = new THREE.Mesh(baseGeo, this.armorPlatesMat);
      turretGroup.add(baseMesh);

      // Triple Barrel Assembly
      const barrelGroup = new THREE.Group();
      barrelGroup.position.set(0, 0.5, 0);
      [-0.7, 0, 0.7].forEach(bx => {
        const barrelGeo = new THREE.CylinderGeometry(0.2, 0.25, 4.5, 8);
        barrelGeo.rotateX(Math.PI / 2);
        const barrelMesh = new THREE.Mesh(barrelGeo, this.hullMat);
        barrelMesh.position.set(bx, 0, 2.2);
        barrelGroup.add(barrelMesh);

        // Muzzle Ring
        const ringGeo = new THREE.TorusGeometry(0.26, 0.05, 6, 12);
        const ringMesh = new THREE.Mesh(ringGeo, this.glowOrangeMat);
        ringMesh.position.set(bx, 0, 4.2);
        barrelGroup.add(ringMesh);
      });

      turretGroup.add(barrelGroup);
      this.meshGroup.add(turretGroup);

      this.turrets.push({
        id: `battleship_turret_${idx}`,
        mesh: turretGroup,
        barrelGroup: barrelGroup,
        relPos: new THREE.Vector3(0, 5.0, zPos),
        hp: 700,
        maxHp: 700,
        isDead: false
      });
    });

    // 5. Destructible Port & Starboard Engine Nacelles
    [-11.0, 11.0].forEach((nx, idx) => {
      const nacelleGroup = new THREE.Group();
      nacelleGroup.position.set(nx, 0, -18);

      const nacelleBodyGeo = new THREE.CylinderGeometry(2.4, 2.8, 14, 10);
      nacelleBodyGeo.rotateX(Math.PI / 2);
      const nacelleMesh = new THREE.Mesh(nacelleBodyGeo, this.armorPlatesMat);
      nacelleGroup.add(nacelleMesh);

      // Thruster Flare Core
      const flareGeo = new THREE.CylinderGeometry(1.8, 1.2, 1.5, 12);
      flareGeo.rotateX(Math.PI / 2);
      const flareMesh = new THREE.Mesh(flareGeo, this.glowOrangeMat);
      flareMesh.position.set(0, 0, -7.2);
      nacelleGroup.add(flareMesh);

      this.meshGroup.add(nacelleGroup);

      this.subsystems.push({
        id: `battleship_engine_${idx === 0 ? 'port' : 'starboard'}`,
        mesh: nacelleGroup,
        relPos: new THREE.Vector3(nx, 0, -18),
        hp: 600,
        maxHp: 600,
        isDead: false
      });
    });

    // 6. Central Prow Spinal Magnetic Lance Cannon
    const prowLanceGeo = new THREE.BoxGeometry(2.0, 1.8, 8.0);
    const prowLanceMesh = new THREE.Mesh(prowLanceGeo, this.armorPlatesMat);
    prowLanceMesh.position.set(0, 0, 20);
    this.meshGroup.add(prowLanceMesh);

    const prowCoreGeo = new THREE.SphereGeometry(1.2, 12, 12);
    this.lanceCoreMesh = new THREE.Mesh(prowCoreGeo, this.glowRedMat);
    this.lanceCoreMesh.position.set(0, 0, 24);
    this.meshGroup.add(this.lanceCoreMesh);
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
    } else {
      // Slow tactical strafe
      this.strafeTimer += dt * 0.4;
      pos.x = Math.sin(this.strafeTimer) * 14.0;
      pos.y = 3.0 + Math.cos(this.strafeTimer * 0.8) * 3.0;
    }

    // 2. Heavy Triple-Railgun Tracking
    this.turrets.forEach(turret => {
      if (!turret.isDead && turret.mesh) {
        const turretWorldPos = turret.mesh.getWorldPosition(new THREE.Vector3());
        const dir = new THREE.Vector3().subVectors(playerPos, turretWorldPos);
        turret.mesh.rotation.y = Math.atan2(-dir.x, dir.z);
      }
    });

    // 3. Railgun Salvo Fire Cycle
    this.railgunTimer -= dt;
    if (this.railgunTimer <= 0 && pos.z >= this.targetZ - 10) {
      this.railgunTimer = 3.2;
      this.fireRailgunSalvo(gameManager, playerPos);
    }

    // 4. Flak Cannons Burst Cycle
    this.flakTimer -= dt;
    if (this.flakTimer <= 0 && pos.z >= this.targetZ - 10) {
      this.flakTimer = 2.4;
      this.fireFlakBurst(gameManager, playerPos);
    }

    // 5. Spinal Lance Cannon Charging & Firing
    this.spinalLanceTimer -= dt;
    if (this.spinalLanceTimer <= 2.5 && !this.isChargingLance) {
      this.isChargingLance = true;
      this.lanceChargeTime = 2.5;
      if (gameManager && gameManager.spaceHUD) {
        gameManager.spaceHUD.showRadioTransmission("WARNING: Heavy Battleship charging Spinal Kinetic Lance! EVADE!", "STARBOUND COMMAND", 3.0);
      }
    }

    if (this.isChargingLance) {
      this.lanceChargeTime -= dt;
      if (this.lanceCoreMesh) {
        const scale = 1.0 + (2.5 - this.lanceChargeTime) * 1.5;
        this.lanceCoreMesh.scale.set(scale, scale, scale);
        if (Math.random() < 0.6 && this.particleManager) {
          this.particleManager.createLaserImpact(this.lanceCoreMesh.getWorldPosition(new THREE.Vector3()), new THREE.Vector3(0, 0, 1), 0xff0044);
        }
      }

      if (this.lanceChargeTime <= 0) {
        this.isChargingLance = false;
        this.spinalLanceTimer = 11.0;
        this.fireSpinalLanceBeam(gameManager, playerPos);
        if (this.lanceCoreMesh) this.lanceCoreMesh.scale.set(1, 1, 1);
      }
    }
  }

  fireRailgunSalvo(gameManager, playerPos) {
    if (!gameManager) return;
    this.turrets.forEach(turret => {
      if (turret.isDead || !turret.mesh) return;
      const origin = turret.mesh.getWorldPosition(new THREE.Vector3());
      const dir = new THREE.Vector3().subVectors(playerPos, origin).normalize();
      if (gameManager.spawnEnemyLaser) {
        gameManager.spawnEnemyLaser(origin, dir, 0xff7700, 48);
      }
    });
    if (gameManager.spaceAudio && gameManager.spaceAudio.playEnemyLaser) {
      gameManager.spaceAudio.playEnemyLaser();
    }
  }

  fireFlakBurst(gameManager, playerPos) {
    if (!gameManager) return;
    const pos = this.meshGroup.position;
    // Launch flak canister toward predicted player zone
    const targetZone = playerPos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 4, 0));
    const dir = new THREE.Vector3().subVectors(targetZone, pos).normalize();

    if (gameManager.spawnEnemyLaser) {
      gameManager.spawnEnemyLaser(pos.clone().add(new THREE.Vector3(0, 2, 10)), dir, 0xff0055, 36);
    }
  }

  fireSpinalLanceBeam(gameManager, playerPos) {
    if (!gameManager) return;
    const lanceOrigin = this.meshGroup.position.clone().add(new THREE.Vector3(0, 0, 24));
    const dir = new THREE.Vector3(0, 0, 1);

    if (this.particleManager) {
      this.particleManager.spawnSonicBoomDisc(lanceOrigin, 0xff0044);
      this.particleManager.createExplosion(lanceOrigin, 0xff0044, 40, 2.0);
    }

    // Heavy Beam Rapid Pulse Stream
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        if (this.isDead || !gameManager) return;
        if (gameManager.spawnEnemyLaser) {
          gameManager.spawnEnemyLaser(lanceOrigin, dir, 0xff0022, 65);
        }
      }, i * 60);
    }

    if (gameManager.spaceAudio) {
      gameManager.spaceAudio.playExplosion();
    }
  }

  takeTurretDamage(turretId, amount) {
    const turret = this.turrets.find(t => t.id === turretId);
    if (!turret || turret.isDead) return;

    turret.hp -= amount;
    if (turret.hp <= 0) {
      turret.isDead = true;
      if (this.particleManager && turret.mesh) {
        this.particleManager.createExplosion(turret.mesh.getWorldPosition(new THREE.Vector3()), 0xff5500, 30, 1.2);
      }
      if (turret.mesh) turret.mesh.visible = false;
    }
  }

  takeSubsystemDamage(subId, amount) {
    const sub = this.subsystems.find(s => s.id === subId);
    if (!sub || sub.isDead) return;

    sub.hp -= amount;
    if (sub.hp <= 0) {
      sub.isDead = true;
      if (this.particleManager && sub.mesh) {
        this.particleManager.createExplosion(sub.mesh.getWorldPosition(new THREE.Vector3()), 0xff3300, 35, 1.5);
      }
      if (sub.mesh) sub.mesh.visible = false;
    }
  }

  takeDamage(amount) {
    if (this.isDead) return false;

    this.coreHp -= amount;
    if (this.particleManager) {
      this.particleManager.createLaserImpact(this.meshGroup.position, new THREE.Vector3(0, 0, 1), 0xff7700);
    }

    if (this.coreHp <= 0 && !this.isDying) {
      this.triggerDeathSequence();
      return true;
    }
    return false;
  }

  triggerDeathSequence() {
    this.isDying = true;
    this.deathTimer = 2.5;

    if (window.spaceGameManager && window.spaceGameManager.spaceHUD) {
      window.spaceGameManager.spaceHUD.showRadioTransmission("GOLIATH HEAVY BATTLESHIP DESTROYED! CAPITAL DREADNOUGHT CRACKED!", "STARBOUND COMMAND", 5.0);
    }
  }

  updateDeathSequence(dt) {
    this.deathTimer -= dt;
    const pos = this.meshGroup.position;

    // Cascading Hull Secondary Explosions
    if (Math.random() < 0.7 && this.particleManager) {
      const offset = new THREE.Vector3((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 35);
      this.particleManager.createExplosion(pos.clone().add(offset), 0xff5500, 25, 1.0);
    }

    this.meshGroup.rotation.z += 0.8 * dt;
    this.meshGroup.rotation.x += 0.4 * dt;
    pos.y -= 3.0 * dt;

    if (this.deathTimer <= 0) {
      this.destroy();
    }
  }

  destroy() {
    this.isDead = true;
    if (this.particleManager) {
      this.particleManager.createExplosion(this.meshGroup.position, 0xff0044, 70, 3.5);
      this.particleManager.createEmpShockwave(this.meshGroup.position, 55);
    }
    if (this.meshGroup && this.meshGroup.parent) {
      this.meshGroup.parent.remove(this.meshGroup);
    }
  }
}
