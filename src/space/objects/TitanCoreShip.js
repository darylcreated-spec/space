import * as THREE from 'three';

/**
 * Procedural Obsidian-Magma Composite Hull Texture for Titan Core Flagship
 */
function generateTitanCoreHullTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Dark obsidian-magma base gradient
  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, '#1c0a0a');
  grad.addColorStop(0.5, '#120505');
  grad.addColorStop(1, '#240f0f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Faceted armor plate grid
  ctx.strokeStyle = '#3d1616';
  ctx.lineWidth = 3.0;
  for (let x = 0; x < 512; x += 64) ctx.strokeRect(x, 0, 64, 512);
  for (let y = 0; y < 512; y += 64) ctx.strokeRect(0, y, 512, 64);

  // Molten Magma Conduits
  ctx.strokeStyle = '#ff3300';
  ctx.lineWidth = 2.8;
  ctx.shadowColor = '#ff6600';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(0, 128); ctx.lineTo(180, 128); ctx.lineTo(256, 200); ctx.lineTo(512, 200);
  ctx.moveTo(0, 384); ctx.lineTo(180, 384); ctx.lineTo(256, 312); ctx.lineTo(512, 312);
  ctx.stroke();

  // High-temp gold circuit veins
  ctx.strokeStyle = '#ffaa00';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(64, 0); ctx.lineTo(64, 128); ctx.lineTo(128, 256); ctx.lineTo(128, 512);
  ctx.moveTo(448, 0); ctx.lineTo(448, 128); ctx.lineTo(384, 256); ctx.lineTo(384, 512);
  ctx.stroke();

  // Magma micro-rivets
  ctx.fillStyle = '#ff7700';
  for (let y = 16; y < 512; y += 32) {
    for (let x = 16; x < 512; x += 64) {
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return new THREE.CanvasTexture(canvas);
}

// ============================================================
// TITAN CORE FLAGSHIP — Ancient Asteroid Core Alien War Vessel
// Emerges from the shattered center of the Titan Asteroid Colossus!
// 42m High-Speed Volcanic Assault Cruiser with Swept Delta Wings,
// Twin Heavy Plasma Arc Cannons, Dorsal VLS Missile Silos,
// and Glowing Magma Fusion Engine!
// ============================================================
export class TitanCoreShip {
  constructor(scene, particleManager, spawnPosition = null) {
    this.scene = scene;
    this.particleManager = particleManager;

    this.meshGroup = new THREE.Group();
    const initPos = spawnPosition || new THREE.Vector3(0, 2, -50);
    this.meshGroup.position.copy(initPos);

    // -- Telemetry & Boss Stats --
    this.coreHp = 2200;
    this.maxCoreHp = 2200;
    this.hitRadius = 18.0;
    this.radius = 18.0;
    this.isDead = false;
    this.isDying = false;
    this.scoreValue = 50000;

    this.targetZ = -38;
    this.speed = 14.0;
    this._time = 0;
    this.fireTimer = 1.0;
    this.missileTimer = 2.5;
    this.evasionTimer = 0;
    this.rollAngle = 0;
    this.strafeTargetX = 0;

    // -- Subsystem Hardpoints --
    this.leftCannon = { id: 'left_cannon', name: 'PORT PLASMA CANNON', hp: 800, maxHp: 800, isDead: false, mesh: null, reticle: null };
    this.rightCannon = { id: 'right_cannon', name: 'STARBOARD PLASMA CANNON', hp: 800, maxHp: 800, isDead: false, mesh: null, reticle: null };
    this.missileSilo = { id: 'missile_silo', name: 'DORSAL VLS SILO', hp: 800, maxHp: 800, isDead: false, mesh: null, reticle: null };

    this.turrets = []; // For generic collision scanning
    this.machDiamondRings = [];
    this.engineExhaustPlumes = [];
    this.reticleMeshes = [];

    this.buildGeometry();
    this.scene.add(this.meshGroup);
  }

  buildGeometry() {
    const hullTexture = generateTitanCoreHullTexture();
    const hullMat = new THREE.MeshStandardMaterial({
      map: hullTexture,
      roughness: 0.35,
      metalness: 0.85,
      emissive: 0x330800,
      emissiveIntensity: 0.4
    });

    const magmaGlowMat = new THREE.MeshStandardMaterial({
      color: 0xff3300,
      emissive: 0xff5500,
      emissiveIntensity: 2.2,
      roughness: 0.1,
      metalness: 0.9
    });

    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: 0x181216,
      roughness: 0.4,
      metalness: 0.9
    });

    // 1. Central Fuselage Hull (Armored Needle Body)
    const bodyGeo = new THREE.ConeGeometry(4.2, 28, 6);
    const bodyMesh = new THREE.Mesh(bodyGeo, hullMat);
    bodyMesh.rotation.x = Math.PI / 2;
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    this.meshGroup.add(bodyMesh);

    // 2. Command Bridge Cockpit Canopy
    const canopyGeo = new THREE.CylinderGeometry(1.2, 2.2, 8, 5);
    const canopyMesh = new THREE.Mesh(canopyGeo, magmaGlowMat);
    canopyMesh.rotation.x = Math.PI / 2;
    canopyMesh.position.set(0, 1.8, -2);
    this.meshGroup.add(canopyMesh);

    // 3. Swept Forward Delta Wings
    this.wingGroup = new THREE.Group();
    const wingGeo = new THREE.BoxGeometry(32, 0.8, 14);
    const wingMesh = new THREE.Mesh(wingGeo, hullMat);
    wingMesh.position.set(0, 0, 2);
    this.wingGroup.add(wingMesh);

    // Wingtip Armor Fins (Canted Vertical Stabilizers)
    const finGeo = new THREE.BoxGeometry(0.8, 6, 8);
    const leftFin = new THREE.Mesh(finGeo, darkMetalMat);
    leftFin.position.set(-16, 2.5, 4);
    leftFin.rotation.z = -0.2;
    this.wingGroup.add(leftFin);

    const rightFin = new THREE.Mesh(finGeo, darkMetalMat);
    rightFin.position.set(16, 2.5, 4);
    rightFin.rotation.z = 0.2;
    this.wingGroup.add(rightFin);

    this.meshGroup.add(this.wingGroup);

    // 4. Port & Starboard Heavy Plasma Cannons
    const cannonGeo = new THREE.CylinderGeometry(0.8, 1.1, 9, 8);
    const cannonGlowGeo = new THREE.CylinderGeometry(0.9, 0.9, 2, 8);

    const leftCannonMesh = new THREE.Mesh(cannonGeo, darkMetalMat);
    leftCannonMesh.rotation.x = Math.PI / 2;
    leftCannonMesh.position.set(-15, 0, -2);
    const leftCannonGlow = new THREE.Mesh(cannonGlowGeo, magmaGlowMat);
    leftCannonGlow.position.set(0, 3.5, 0);
    leftCannonMesh.add(leftCannonGlow);
    this.meshGroup.add(leftCannonMesh);
    this.leftCannon.mesh = leftCannonMesh;

    const rightCannonMesh = new THREE.Mesh(cannonGeo, darkMetalMat);
    rightCannonMesh.rotation.x = Math.PI / 2;
    rightCannonMesh.position.set(15, 0, -2);
    const rightCannonGlow = new THREE.Mesh(cannonGlowGeo, magmaGlowMat);
    rightCannonGlow.position.set(0, 3.5, 0);
    rightCannonMesh.add(rightCannonGlow);
    this.meshGroup.add(rightCannonMesh);
    this.rightCannon.mesh = rightCannonMesh;

    // 5. Dorsal VLS Missile Silo Pod
    const siloGeo = new THREE.BoxGeometry(5.5, 2.2, 7.0);
    const siloMesh = new THREE.Mesh(siloGeo, darkMetalMat);
    siloMesh.position.set(0, 2.4, 4);

    // 6 Silo Missile Tubes
    for (let row = -1; row <= 1; row++) {
      for (let col = -0.5; col <= 0.5; col += 1.0) {
        const tubeGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.5, 6);
        const tube = new THREE.Mesh(tubeGeo, magmaGlowMat);
        tube.position.set(col * 2.2, 1.15, row * 2.0);
        siloMesh.add(tube);
      }
    }
    this.meshGroup.add(siloMesh);
    this.missileSilo.mesh = siloMesh;

    // 6. Quad Heavy Fusion Engine Thrusters & Plumes
    const engineGeo = new THREE.CylinderGeometry(1.2, 1.8, 4, 8);
    const plumeGeo = new THREE.ConeGeometry(1.4, 10, 8);
    const plumeMat = new THREE.MeshBasicMaterial({
      color: 0xff3300,
      transparent: true,
      opacity: 0.85
    });

    const enginePositions = [
      new THREE.Vector3(-3.2, 0, 14),
      new THREE.Vector3( 3.2, 0, 14),
      new THREE.Vector3(-7.5, -0.5, 12),
      new THREE.Vector3( 7.5, -0.5, 12)
    ];

    enginePositions.forEach(ep => {
      const eng = new THREE.Mesh(engineGeo, darkMetalMat);
      eng.rotation.x = Math.PI / 2;
      eng.position.copy(ep);
      this.meshGroup.add(eng);

      const plume = new THREE.Mesh(plumeGeo, plumeMat);
      plume.rotation.x = -Math.PI / 2;
      plume.position.set(0, -6, 0);
      eng.add(plume);
      this.engineExhaustPlumes.push(plume);
    });

    // 7. Reticles for Subsystems
    const createReticle = (parentMesh, colorHex) => {
      const retGeo = new THREE.RingGeometry(2.4, 2.8, 16);
      const retMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85
      });
      const ret = new THREE.Mesh(retGeo, retMat);
      ret.position.set(0, 0, -1);
      parentMesh.add(ret);
      this.reticleMeshes.push(ret);
      return ret;
    };

    this.leftCannon.reticle = createReticle(leftCannonMesh, 0xff5500);
    this.rightCannon.reticle = createReticle(rightCannonMesh, 0xff5500);
    this.missileSilo.reticle = createReticle(siloMesh, 0xffaa00);

    // Register turrets array for generic collision detectors
    this.turrets = [
      { id: 'left_cannon', hp: 800, maxHp: 800, mesh: leftCannonMesh, isDead: false },
      { id: 'right_cannon', hp: 800, maxHp: 800, mesh: rightCannonMesh, isDead: false },
      { id: 'missile_silo', hp: 800, maxHp: 800, mesh: siloMesh, isDead: false }
    ];
  }

  takeTurretDamage(turretId, amount) {
    let target = null;
    if (turretId === 'left_cannon') target = this.leftCannon;
    else if (turretId === 'right_cannon') target = this.rightCannon;
    else if (turretId === 'missile_silo') target = this.missileSilo;
    else {
      const t = this.turrets.find(tur => tur.id === turretId);
      if (t) target = t;
    }

    if (!target || target.isDead) return false;
    target.hp -= amount;

    if (target.reticle && target.reticle.material) {
      const pct = target.hp / target.maxHp;
      target.reticle.material.color.setHex(pct > 0.5 ? 0xffaa00 : (pct > 0.25 ? 0xff5500 : 0xff0000));
    }

    if (target.hp <= 0) {
      target.isDead = true;
      if (target.mesh) target.mesh.visible = false;
      if (target.reticle) target.reticle.visible = false;

      const wp = target.mesh ? target.mesh.getWorldPosition(new THREE.Vector3()) : this.meshGroup.position;
      this.particleManager.createExplosion(wp, 0xff5500, 90, 3.0);
      this.particleManager.createEmpShockwave(wp, 40);

      window.spaceGameManager?.voiceAnnouncer?.speak(`${target.name || 'Subsystem'} destroyed!`, false);
    }
    return target.isDead;
  }

  takeCoreDamage(amount, isCrit = false) {
    if (this.isDead || this.isDying) return false;
    const finalDmg = isCrit ? amount * 2.5 : amount;
    this.coreHp -= finalDmg;

    if (this.particleManager) {
      this.particleManager.createLaserImpact(this.meshGroup.position, new THREE.Vector3(0, 0, 1), 0xff3300);
    }

    if (this.coreHp <= 0 && !this.isDying) {
      this.triggerDeathSequence();
      return true;
    }
    return false;
  }

  takeDamage(subsystem, amount) {
    return this.takeCoreDamage(amount);
  }

  getHealthRatio() {
    const totalSubHp = (this.leftCannon.isDead ? 0 : this.leftCannon.hp) +
                       (this.rightCannon.isDead ? 0 : this.rightCannon.hp) +
                       (this.missileSilo.isDead ? 0 : this.missileSilo.hp);
    const maxSubHp = this.leftCannon.maxHp + this.rightCannon.maxHp + this.missileSilo.maxHp;
    const current = Math.max(0, this.coreHp) + totalSubHp;
    const max = this.maxCoreHp + maxSubHp;
    return Math.max(0, current / max);
  }

  triggerDeathSequence() {
    this.isDying = true;
    this.deathTimer = 3.5;

    window.spaceGameManager?.voiceAnnouncer?.speak("TITAN CORE FLAGSHIP CRITICAL MELTDOWN! STAGE 1 CLEARED!", true);
    if (window.spaceGameManager?.spaceHUD) {
      window.spaceGameManager.spaceHUD.showRadioTransmission("CORE FLAGSHIP OBLITERATED! Sector Alpha asteroid corridor is completely secure! Outstanding piloting, Commander!", "STARBOUND COMMAND", 8.0);
    }
  }

  update(dt, playerShip, gameManager) {
    if (this.isDead || !this.meshGroup) return false;
    this._time += dt;

    const pos = this.meshGroup.position;
    const playerPos = playerShip && playerShip.meshGroup ? playerShip.meshGroup.position : new THREE.Vector3(0, 0, 0);

    // 1. Advance to battle station
    if (pos.z < this.targetZ) {
      pos.z += this.speed * dt;
    }

    // 2. Tactical Evasive Strafe & Sine Weaving
    this.evasionTimer -= dt;
    if (this.evasionTimer <= 0) {
      this.evasionTimer = 2.5 + Math.random() * 1.5;
      this.strafeTargetX = (Math.random() - 0.5) * 26;
    }

    pos.x += (this.strafeTargetX - pos.x) * 1.8 * dt;
    pos.y = 2.5 + Math.sin(this._time * 2.2) * 2.8;

    // Banking roll
    const targetRoll = -(this.strafeTargetX - pos.x) * 0.04;
    this.meshGroup.rotation.z += (targetRoll - this.meshGroup.rotation.z) * 4.0 * dt;
    this.meshGroup.rotation.y = Math.sin(this._time * 1.5) * 0.08;

    // 3. Thruster shimmer
    const exhaustScale = 1.0 + Math.sin(this._time * 30.0) * 0.15;
    this.engineExhaustPlumes.forEach(p => p.scale.set(exhaustScale, exhaustScale, exhaustScale));

    // 4. Rotate reticles
    this.reticleMeshes.forEach(ret => {
      if (ret && ret.visible) ret.rotation.z += 2.5 * dt;
    });

    // 5. Death Sequence
    if (this.isDying) {
      this.deathTimer -= dt;
      if (Math.random() < 0.8 && this.particleManager) {
        const offset = new THREE.Vector3((Math.random() - 0.5) * 22, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 20);
        this.particleManager.createExplosion(pos.clone().add(offset), 0xff3300, 70, 3.5);
        this.particleManager.createExplosion(pos.clone().add(offset), 0xffffff, 45, 2.0);
      }
      this.meshGroup.rotation.z += 0.8 * dt;
      pos.y -= 1.8 * dt;

      if (this.deathTimer <= 0) {
        this.destroy();
      }
      return false;
    }

    // 6. Twin Plasma Cannon Salvos
    this.fireTimer -= dt;
    const salvoPositions = [];

    if (this.fireTimer <= 0 && pos.z >= this.targetZ - 8) {
      this.fireTimer = 0.85;

      if (!this.leftCannon.isDead && this.leftCannon.mesh) {
        const wp = this.leftCannon.mesh.getWorldPosition(new THREE.Vector3());
        salvoPositions.push(wp);
        if (gameManager && gameManager.spawnEnemyLaser) {
          const dir = new THREE.Vector3().subVectors(playerPos, wp).normalize();
          gameManager.spawnEnemyLaser(wp, dir, 0xff5500, 52);
        }
      }

      if (!this.rightCannon.isDead && this.rightCannon.mesh) {
        const wp = this.rightCannon.mesh.getWorldPosition(new THREE.Vector3());
        salvoPositions.push(wp);
        if (gameManager && gameManager.spawnEnemyLaser) {
          const dir = new THREE.Vector3().subVectors(playerPos, wp).normalize();
          gameManager.spawnEnemyLaser(wp, dir, 0xff5500, 52);
        }
      }
    }

    // 7. Dorsal VLS Homing Missile Salvo
    this.missileTimer -= dt;
    if (this.missileTimer <= 0 && !this.missileSilo.isDead && pos.z >= this.targetZ - 8) {
      this.missileTimer = 3.2;
      const wp = this.missileSilo.mesh.getWorldPosition(new THREE.Vector3());
      if (this.particleManager) {
        this.particleManager.createExplosion(wp, 0xffaa00, 20, 1.0);
      }
      if (gameManager && gameManager.spawnEnemyMissile) {
        gameManager.spawnEnemyMissile(wp, playerPos);
        setTimeout(() => {
          if (!this.isDead && gameManager.spawnEnemyMissile) {
            gameManager.spawnEnemyMissile(wp, playerPos);
          }
        }, 300);
      }
    }

    return salvoPositions.length > 0 ? salvoPositions : false;
  }

  destroy() {
    this.isDead = true;
    if (this.particleManager) {
      this.particleManager.createExplosion(this.meshGroup.position, 0xffffff, 320, 8.5);
      this.particleManager.createExplosion(this.meshGroup.position, 0xff3300, 280, 7.0);
      this.particleManager.createEmpShockwave(this.meshGroup.position, 250);
    }
    if (this.meshGroup && this.meshGroup.parent) {
      this.meshGroup.parent.remove(this.meshGroup);
    }
  }
}
