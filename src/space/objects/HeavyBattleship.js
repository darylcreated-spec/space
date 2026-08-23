import * as THREE from 'three';

/**
 * Procedural Normal/Bump Texture for Goliath Heavy Battleship Armor Plating (Arctic White Finish)
 */
function generateBattleshipArmorTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Base arctic white ceramic composite
  ctx.fillStyle = '#e8eef6';
  ctx.fillRect(0, 0, 512, 512);

  // Precision titanium armor plate seams
  ctx.strokeStyle = '#8da2be';
  ctx.lineWidth = 2.8;
  for (let x = 0; x < 512; x += 64) {
    ctx.strokeRect(x, 0, 64, 512);
  }
  for (let y = 0; y < 512; y += 64) {
    ctx.strokeRect(0, y, 512, 64);
  }

  // Pure white micro-rivets along armor boundaries
  ctx.fillStyle = '#ffffff';
  for (let y = 8; y < 512; y += 32) {
    for (let x = 8; x < 512; x += 64) {
      ctx.beginPath();
      ctx.arc(x, y, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // High-contrast orange/graphite hazard chevron stripes
  ctx.fillStyle = '#ff6600';
  for (let i = 0; i < 4; i++) {
    const xOff = 384 + i * 28;
    ctx.beginPath();
    ctx.moveTo(xOff, 0);
    ctx.lineTo(xOff + 16, 0);
    ctx.lineTo(xOff - 10, 64);
    ctx.lineTo(xOff - 26, 64);
    ctx.closePath();
    ctx.fill();
  }

  // Neon crimson power conduits
  ctx.strokeStyle = '#ff0044';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, 256); ctx.lineTo(128, 256); ctx.lineTo(192, 192); ctx.lineTo(512, 192);
  ctx.stroke();

  return new THREE.CanvasTexture(canvas);
}

export class HeavyBattleship {
  constructor(scene, particleManager, spawnZ = -140) {
    this.scene = scene;
    this.particleManager = particleManager;

    this.meshGroup = new THREE.Group();
    this.meshGroup.position.set(0, 3, spawnZ);

    // -- Boss Telemetry & Stats --
    this.coreHp = 4600;
    this.maxCoreHp = 4600;
    this.hitRadius = 28.0;
    this.radius = 28.0;
    this.isDead = false;
    this.scoreValue = 3000;

    // Movement & Combat
    this.targetZ = -82;
    this.speed = 12.0;
    this.strafeTimer = 0;

    // Subsystems: 3 Heavy Triple-Railgun Turrets & 2 Engine Outriggers
    this.turrets = [];
    this.subsystems = [];
    this.thrusters = [];

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
    this.armorTexture = generateBattleshipArmorTexture();

    // ── High-Definition Arctic / Pearl White Armor Materials ──
    this.hullMat = new THREE.MeshStandardMaterial({
      color: 0xecf3f9,
      bumpMap: this.armorTexture,
      bumpScale: 0.12,
      metalness: 0.82,
      roughness: 0.18,
      emissive: 0x1c2536,
      emissiveIntensity: 0.2
    });

    this.armorPlatesMat = new THREE.MeshStandardMaterial({
      color: 0xfcfdff,
      metalness: 0.92,
      roughness: 0.12,
      bumpMap: this.armorTexture,
      bumpScale: 0.06
    });

    this.darkAlloyMat = new THREE.MeshStandardMaterial({
      color: 0x3b4759,
      metalness: 0.90,
      roughness: 0.22
    });

    this.glowRedMat = new THREE.MeshBasicMaterial({
      color: 0xff0044,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });

    this.glowOrangeMat = new THREE.MeshBasicMaterial({
      color: 0xff7700,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    // 1. Angular Wedge Dreadnought Prow & Fuselage (48m Length)
    const hullGeo = new THREE.BufferGeometry();
    const hullVerts = new Float32Array([
      // Prow wedge top
      0, 2.8, 26,     10, 2.8, -12,   -10, 2.8, -12,
      // Prow wedge bottom
      0, -2.8, 26,   -10, -2.8, -12,   10, -2.8, -12,
      // Stern block top
      -10, 2.8, -12,  10, 2.8, -26,   -10, 2.8, -26,
      -10, 2.8, -12,  10, 2.8, -12,    10, 2.8, -26,
      // Stern block bottom
      -10, -2.8, -12, -10, -2.8, -26,  10, -2.8, -26,
      -10, -2.8, -12,  10, -2.8, -26,  10, -2.8, -12,
      // Left Flank
      0, 2.8, 26,     -10, 2.8, -12,  -10, -2.8, -12,
      0, 2.8, 26,     -10, -2.8, -12,   0, -2.8, 26,
      -10, 2.8, -12,  -10, 2.8, -26,  -10, -2.8, -12,
      -10, 2.8, -26,  -10, -2.8, -26, -10, -2.8, -12,
      // Right Flank
      0, 2.8, 26,     10, -2.8, -12,   10, 2.8, -12,
      0, 2.8, 26,      0, -2.8, 26,    10, -2.8, -12,
      10, 2.8, -12,   10, -2.8, -12,   10, 2.8, -26,
      10, 2.8, -26,   10, -2.8, -12,   10, -2.8, -26,
      // Stern Aft
      -10, 2.8, -26,  -10, -2.8, -26,  10, -2.8, -26,
      -10, 2.8, -26,   10, -2.8, -26,  10, 2.8, -26
    ]);
    hullGeo.setAttribute('position', new THREE.BufferAttribute(hullVerts, 3));
    hullGeo.computeVertexNormals();
    const mainHull = new THREE.Mesh(hullGeo, this.hullMat);
    this.meshGroup.add(mainHull);

    // 2. Beveled Titanium Chined Sponson Armor Wings
    [-11.5, 11.5].forEach(sx => {
      const sponsonGeo = new THREE.BoxGeometry(3.5, 2.2, 28);
      const sponsonMesh = new THREE.Mesh(sponsonGeo, this.armorPlatesMat);
      sponsonMesh.position.set(sx, 0.4, -4);
      this.meshGroup.add(sponsonMesh);

      // Sponson glowing navigation hazard lights
      const lightGeo = new THREE.BoxGeometry(0.3, 0.25, 24);
      const lightMesh = new THREE.Mesh(lightGeo, this.glowOrangeMat);
      lightMesh.position.set(sx + (sx > 0 ? 1.8 : -1.8), 0.4, -4);
      this.meshGroup.add(lightMesh);
    });

    // 3. Central Raised Dorsal Citadel Armor Spine
    const spineGeo = new THREE.BoxGeometry(8.0, 3.6, 36);
    const spineMesh = new THREE.Mesh(spineGeo, this.armorPlatesMat);
    spineMesh.position.set(0, 3.6, -4);
    this.meshGroup.add(spineMesh);

    // 4. Command Bridge Fortress Citadel
    const bridgeGeo = new THREE.BoxGeometry(7.0, 4.4, 9.0);
    const bridgeMesh = new THREE.Mesh(bridgeGeo, this.darkAlloyMat);
    bridgeMesh.position.set(0, 6.4, -13);
    this.meshGroup.add(bridgeMesh);

    // Illuminated Crimson Command Observation Visor
    const visorGeo = new THREE.BoxGeometry(6.2, 0.7, 0.4);
    const visorMesh = new THREE.Mesh(visorGeo, this.glowRedMat);
    visorMesh.position.set(0, 6.8, -8.3);
    this.meshGroup.add(visorMesh);

    // Communications Sensor Mast
    const mastGeo = new THREE.CylinderGeometry(0.15, 0.25, 4.5, 6);
    const mastMesh = new THREE.Mesh(mastGeo, this.armorPlatesMat);
    mastMesh.position.set(0, 9.4, -14);
    this.meshGroup.add(mastMesh);

    // 5. Three Rotating Heavy Triple-Railgun Turrets (Fore, Mid, Aft)
    const turretZPositions = [13.0, 3.0, -5.0];
    turretZPositions.forEach((zPos, idx) => {
      const turretGroup = new THREE.Group();
      turretGroup.position.set(0, 5.8, zPos);

      // Armored Barbette Base
      const baseGeo = new THREE.CylinderGeometry(2.6, 3.2, 1.4, 14);
      const baseMesh = new THREE.Mesh(baseGeo, this.armorPlatesMat);
      turretGroup.add(baseMesh);

      // Faceted Turret Gunhouse Carapace
      const houseGeo = new THREE.BoxGeometry(3.6, 1.6, 4.2);
      const houseMesh = new THREE.Mesh(houseGeo, this.darkAlloyMat);
      houseMesh.position.set(0, 1.0, 0);
      turretGroup.add(houseMesh);

      // Triple Heavy Railgun Barrels Assembly
      const barrelGroup = new THREE.Group();
      barrelGroup.position.set(0, 1.0, 0);
      [-0.9, 0, 0.9].forEach(bx => {
        const barrelGeo = new THREE.CylinderGeometry(0.24, 0.3, 5.2, 8);
        barrelGeo.rotateX(Math.PI / 2);
        const barrelMesh = new THREE.Mesh(barrelGeo, this.armorPlatesMat);
        barrelMesh.position.set(bx, 0, 2.6);
        barrelGroup.add(barrelMesh);

        // Magnetic Induction Accelerator Coils
        for (let c = 1.0; c <= 4.0; c += 1.2) {
          const coilGeo = new THREE.TorusGeometry(0.32, 0.06, 6, 12);
          const coilMesh = new THREE.Mesh(coilGeo, this.glowOrangeMat);
          coilMesh.position.set(bx, 0, c);
          barrelGroup.add(coilMesh);
        }

        // Muzzle Lens Ring
        const ringGeo = new THREE.TorusGeometry(0.32, 0.07, 6, 14);
        const ringMesh = new THREE.Mesh(ringGeo, this.glowRedMat);
        ringMesh.position.set(bx, 0, 5.2);
        barrelGroup.add(ringMesh);
      });

      turretGroup.add(barrelGroup);
      this.meshGroup.add(turretGroup);

      this.turrets.push({
        id: `battleship_turret_${idx}`,
        mesh: turretGroup,
        barrelGroup: barrelGroup,
        relPos: new THREE.Vector3(0, 5.8, zPos),
        hp: 850,
        maxHp: 850,
        isDead: false
      });
    });

    // 6. Destructible Port & Starboard Heavy Ion Engine Nacelles
    [-13.5, 13.5].forEach((nx, idx) => {
      const nacelleGroup = new THREE.Group();
      nacelleGroup.position.set(nx, 0.2, -19);

      const nacelleBodyGeo = new THREE.BoxGeometry(3.6, 4.2, 16);
      const nacelleMesh = new THREE.Mesh(nacelleBodyGeo, this.darkAlloyMat);
      nacelleGroup.add(nacelleMesh);

      // Nacelle Armor Armor Cowling
      const cowlGeo = new THREE.BoxGeometry(4.2, 4.8, 10);
      const cowlMesh = new THREE.Mesh(cowlGeo, this.armorPlatesMat);
      cowlMesh.position.set(0, 0, 1.0);
      nacelleGroup.add(cowlMesh);

      // Dual Exhaust Nozzles per nacelle (Quad thruster array)
      [-1.0, 1.0].forEach(ex => {
        const bellGeo = new THREE.CylinderGeometry(1.2, 1.6, 2.2, 12);
        bellGeo.rotateX(Math.PI / 2);
        const bellMesh = new THREE.Mesh(bellGeo, this.armorPlatesMat);
        bellMesh.position.set(ex, 0, -8.6);
        nacelleGroup.add(bellMesh);

        // Glowing Ion Core
        const coreGeo = new THREE.PlaneGeometry(1.8, 1.8);
        coreGeo.rotateY(Math.PI);
        const coreMesh = new THREE.Mesh(coreGeo, this.glowOrangeMat);
        coreMesh.position.set(ex, 0, -9.6);
        nacelleGroup.add(coreMesh);

        // Mach Shock Diamond
        const shockGeo = new THREE.ConeGeometry(0.9, 3.5, 8);
        shockGeo.rotateX(-Math.PI / 2);
        const shockMesh = new THREE.Mesh(shockGeo, this.glowOrangeMat);
        shockMesh.position.set(ex, 0, -11.5);
        nacelleGroup.add(shockMesh);
        this.thrusters.push(shockMesh);
      });

      this.meshGroup.add(nacelleGroup);

      this.subsystems.push({
        id: `battleship_engine_${idx === 0 ? 'port' : 'starboard'}`,
        mesh: nacelleGroup,
        relPos: new THREE.Vector3(nx, 0.2, -19),
        hp: 750,
        maxHp: 750,
        isDead: false
      });
    });

    // 7. Central Prow Spinal Magnetic Lance Cannon Trench
    const prowLanceGeo = new THREE.BoxGeometry(2.8, 2.4, 10.0);
    const prowLanceMesh = new THREE.Mesh(prowLanceGeo, this.darkAlloyMat);
    prowLanceMesh.position.set(0, 0, 22);
    this.meshGroup.add(prowLanceMesh);

    const prowCoreGeo = new THREE.SphereGeometry(1.5, 16, 16);
    this.lanceCoreMesh = new THREE.Mesh(prowCoreGeo, this.glowRedMat);
    this.lanceCoreMesh.position.set(0, 0, 27);
    this.meshGroup.add(this.lanceCoreMesh);

    // Dedicated Specular Spotlight for High-Definition Hull Illumination
    this.keyLight = new THREE.PointLight(0xb8dcff, 1.2, 60);
    this.keyLight.position.set(0, 18, 5);
    this.meshGroup.add(this.keyLight);
  }

  update(dt, playerShip, gameManager) {
    if (this.isDead || !this.meshGroup) return;

    if (this.isDying) {
      this.updateDeathSequence(dt);
      return;
    }

    // Pulsing Thruster Shock Diamonds
    if (this.thrusters && this.thrusters.length > 0) {
      const pulse = 0.9 + Math.sin(Date.now() * 0.015) * 0.2;
      this.thrusters.forEach(t => {
        if (t && t.scale) t.scale.set(pulse, pulse, pulse * 1.3);
      });
    }

    const pos = this.meshGroup.position;
    const playerPos = playerShip && playerShip.meshGroup ? playerShip.meshGroup.position : new THREE.Vector3(0, 0, 0);

    // 1. Advance to battle station
    if (pos.z < this.targetZ) {
      pos.z += this.speed * dt;
    } else {
      // Slow tactical dreadnought strafe
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
        const scale = 1.0 + (2.5 - this.lanceChargeTime) * 1.8;
        this.lanceCoreMesh.scale.set(scale, scale, scale);
        if (Math.random() < 0.6 && this.particleManager) {
          this.particleManager.createLaserImpact(this.lanceCoreMesh.getWorldPosition(new THREE.Vector3()), new THREE.Vector3(0, 0, 1), 0xff0044);
          this.particleManager.spawnSparks(this.lanceCoreMesh.getWorldPosition(new THREE.Vector3()), new THREE.Vector3(0, 0, 1), 0xff7700, 10);
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
    const lanceOrigin = this.meshGroup.position.clone().add(new THREE.Vector3(0, 0, 27));
    const dir = new THREE.Vector3(0, 0, 1);

    if (this.particleManager) {
      this.particleManager.spawnSonicBoomDisc(lanceOrigin, 0xff0044);
      this.particleManager.createExplosion(lanceOrigin, 0xff0044, 45, 2.2);
    }

    // Heavy Beam Rapid Pulse Stream
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        if (this.isDead || !gameManager) return;
        if (gameManager.spawnEnemyLaser) {
          gameManager.spawnEnemyLaser(lanceOrigin, dir, 0xff0022, 68);
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
        this.particleManager.spawnSparks(turret.mesh.getWorldPosition(new THREE.Vector3()), new THREE.Vector3(0, 1, 0), 0xffaa00, 18);
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
        this.particleManager.spawnSparks(sub.mesh.getWorldPosition(new THREE.Vector3()), new THREE.Vector3(0, 1, 0), 0xffaa00, 20);
      }
      if (sub.mesh) sub.mesh.visible = false;
    }
  }

  takeDamage(amount) {
    if (this.isDead) return false;

    this.coreHp -= amount;
    if (this.particleManager) {
      this.particleManager.createLaserImpact(this.meshGroup.position, new THREE.Vector3(0, 0, 1), 0xff7700);
      this.particleManager.spawnSparks(this.meshGroup.position, new THREE.Vector3(0, 0, 1), 0xffaa00, 12);
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
      const offset = new THREE.Vector3((Math.random() - 0.5) * 22, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 36);
      this.particleManager.createExplosion(pos.clone().add(offset), 0xff5500, 28, 1.2);
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
      this.particleManager.createExplosion(this.meshGroup.position, 0xff0044, 80, 4.0);
      this.particleManager.spawnSparks(this.meshGroup.position, new THREE.Vector3(0, 0, 1), 0xffaa00, 35);
      this.particleManager.createEmpShockwave(this.meshGroup.position, 60);
    }
    if (this.meshGroup && this.meshGroup.parent) {
      this.meshGroup.parent.remove(this.meshGroup);
    }
  }
}
