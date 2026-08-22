import * as THREE from 'three';

/**
 * Procedural Normal Map for Stealth Composite Armor Plating
 */
function generateStealthNormalMap() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgb(128, 128, 255)';
  ctx.fillRect(0, 0, 128, 128);

  ctx.strokeStyle = 'rgb(90, 90, 220)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 128; i += 16) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 16, 128);
    ctx.stroke();
  }
  return new THREE.CanvasTexture(canvas);
}

export class StealthFighter {
  constructor(scene, particleManager, spawnPos) {
    this.scene = scene;
    this.particleManager = particleManager;

    this.meshGroup = new THREE.Group();
    this.meshGroup.position.copy(spawnPos || new THREE.Vector3((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 8, -90));

    this.hp = 180;
    this.maxHp = 180;
    this.radius = 2.2;
    this.isDead = false;
    this.scoreValue = 350;

    // AI & Cloaking State Machine
    // 'CLOAKED_APPROACH' -> 'UNCLOAK_AMBUSH' -> 'STRAFING_FIRE' -> 'EVASIVE_DASH' -> 'RE_CLOAK'
    this.state = 'CLOAKED_APPROACH';
    this.stateTimer = 2.5;
    this.cloakOpacity = 0.08;
    this.targetCloakOpacity = 0.08;
    this.isCloaked = true;

    this.speed = 28;
    this.fireTimer = 0;
    this.fireInterval = 0.45;
    this.burstCount = 0;
    this.maxBurst = 4;
    this.strafeDirection = Math.random() > 0.5 ? 1 : -1;

    this.empDropTimer = 3.0;

    this.buildMesh();
    this.scene.add(this.meshGroup);
  }

  buildMesh() {
    const normalMap = generateStealthNormalMap();

    // Stealth Obsidian Composite Material with Dynamic Cloaking Transparency
    this.hullMat = new THREE.MeshStandardMaterial({
      color: 0x0a0614,
      metalness: 0.95,
      roughness: 0.15,
      normalMap: normalMap,
      transparent: true,
      opacity: this.cloakOpacity,
      blending: THREE.NormalBlending
    });

    this.accentMat = new THREE.MeshStandardMaterial({
      color: 0x220538,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0xaa00ff,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: this.cloakOpacity
    });

    this.glowMat = new THREE.MeshBasicMaterial({
      color: 0xbf00ff,
      transparent: true,
      opacity: this.cloakOpacity,
      blending: THREE.AdditiveBlending
    });

    // 1. Aerodynamic Needle Fuselage (Forward-Swept Infiltrator Silhouette)
    const bodyGeo = new THREE.ConeGeometry(0.7, 4.2, 5);
    bodyGeo.rotateX(Math.PI / 2);
    bodyGeo.scale(1.2, 0.6, 1.0);
    this.bodyMesh = new THREE.Mesh(bodyGeo, this.hullMat);
    this.meshGroup.add(this.bodyMesh);

    // 2. Forward-Swept Dagger Wings
    const wingGeo = new THREE.BufferGeometry();
    const wingVerts = new Float32Array([
      // Left Wing
      0, 0, 0.5,
      -3.2, 0, 1.8,
      -0.4, 0, -1.8,
      // Right Wing
      0, 0, 0.5,
      0.4, 0, -1.8,
      3.2, 0, 1.8
    ]);
    wingGeo.setAttribute('position', new THREE.BufferAttribute(wingVerts, 3));
    wingGeo.computeVertexNormals();
    this.wingMesh = new THREE.Mesh(wingGeo, this.hullMat);
    this.meshGroup.add(this.wingMesh);

    // 3. Wingtip Energy Razor Edges
    const edgeGeoL = new THREE.CylinderGeometry(0.04, 0.04, 3.0, 4);
    edgeGeoL.rotateZ(Math.PI / 3);
    edgeGeoL.rotateY(-0.3);
    const edgeMeshL = new THREE.Mesh(edgeGeoL, this.glowMat);
    edgeMeshL.position.set(-1.8, 0, 0.8);
    this.meshGroup.add(edgeMeshL);

    const edgeGeoR = new THREE.CylinderGeometry(0.04, 0.04, 3.0, 4);
    edgeGeoR.rotateZ(-Math.PI / 3);
    edgeGeoR.rotateY(0.3);
    const edgeMeshR = new THREE.Mesh(edgeGeoR, this.glowMat);
    edgeMeshR.position.set(1.8, 0, 0.8);
    this.meshGroup.add(edgeMeshR);

    // 4. Twin Cloaked Ion Warp Thrusters
    const thrusterGeo = new THREE.CylinderGeometry(0.2, 0.3, 0.8, 8);
    thrusterGeo.rotateX(Math.PI / 2);
    const thrusterL = new THREE.Mesh(thrusterGeo, this.accentMat);
    thrusterL.position.set(-0.6, 0.1, -1.9);
    const thrusterR = new THREE.Mesh(thrusterGeo, this.accentMat);
    thrusterR.position.set(0.6, 0.1, -1.9);
    this.meshGroup.add(thrusterL);
    this.meshGroup.add(thrusterR);

    // 5. Plasma Dart Muzzle Ports
    const muzzleGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.9, 6);
    muzzleGeo.rotateX(Math.PI / 2);
    const muzzleL = new THREE.Mesh(muzzleGeo, this.accentMat);
    muzzleL.position.set(-1.2, -0.1, 1.2);
    const muzzleR = new THREE.Mesh(muzzleGeo, this.accentMat);
    muzzleR.position.set(1.2, -0.1, 1.2);
    this.meshGroup.add(muzzleL);
    this.meshGroup.add(muzzleR);

    // 6. Refraction Shimmer Shield Lattice
    const shimmerGeo = new THREE.IcosahedronGeometry(2.4, 1);
    this.shimmerMat = new THREE.MeshBasicMaterial({
      color: 0xbf00ff,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending
    });
    this.shimmerMesh = new THREE.Mesh(shimmerGeo, this.shimmerMat);
    this.meshGroup.add(this.shimmerMesh);
  }

  update(dt, playerShip, gameManager) {
    if (this.isDead || !this.meshGroup) return;

    this.stateTimer -= dt;

    // Smooth Cloak Opacity Transition
    this.cloakOpacity += (this.targetCloakOpacity - this.cloakOpacity) * 5.0 * dt;
    if (this.hullMat) this.hullMat.opacity = this.cloakOpacity;
    if (this.accentMat) this.accentMat.opacity = this.cloakOpacity;
    if (this.glowMat) this.glowMat.opacity = this.isCloaked ? 0.05 : 0.9;
    if (this.shimmerMesh) {
      this.shimmerMesh.rotation.y += 2.0 * dt;
      this.shimmerMesh.rotation.z += 1.5 * dt;
      this.shimmerMat.opacity = this.isCloaked ? (0.08 + Math.sin(Date.now() * 0.008) * 0.06) : 0.0;
    }

    const pos = this.meshGroup.position;
    const playerPos = playerShip && playerShip.meshGroup ? playerShip.meshGroup.position : new THREE.Vector3(0, 0, 0);

    // -- State Machine Logic --
    switch (this.state) {
      case 'CLOAKED_APPROACH':
        this.isCloaked = true;
        this.targetCloakOpacity = 0.08;
        // Infiltrate along flanks
        pos.z += this.speed * 0.8 * dt;
        pos.x += Math.sin(Date.now() * 0.002) * 12.0 * dt;
        pos.y += Math.cos(Date.now() * 0.002) * 6.0 * dt;

        if (this.stateTimer <= 0 || pos.z > -45) {
          this.state = 'UNCLOAK_AMBUSH';
          this.stateTimer = 0.6;
          this.targetCloakOpacity = 1.0;
          this.isCloaked = false;
          if (this.particleManager) {
            this.particleManager.createExplosion(pos, 0xbf00ff, 18, 0.8);
          }
        }
        break;

      case 'UNCLOAK_AMBUSH':
        this.isCloaked = false;
        this.targetCloakOpacity = 1.0;
        // Look directly at player
        this.meshGroup.lookAt(playerPos.x, playerPos.y, playerPos.z + 10);
        pos.z += this.speed * 0.5 * dt;

        if (this.stateTimer <= 0) {
          this.state = 'STRAFING_FIRE';
          this.stateTimer = 1.8;
          this.burstCount = 0;
          this.fireTimer = 0;
        }
        break;

      case 'STRAFING_FIRE':
        this.isCloaked = false;
        this.targetCloakOpacity = 1.0;
        // High-speed lateral strafing run across player horizon
        pos.x += this.strafeDirection * 22.0 * dt;
        pos.z += this.speed * 0.4 * dt;
        this.meshGroup.rotation.z = -this.strafeDirection * 0.5;

        // Twin Plasma Dart Fire
        this.fireTimer -= dt;
        if (this.fireTimer <= 0 && this.burstCount < this.maxBurst) {
          this.fireTimer = this.fireInterval;
          this.burstCount++;
          this.fireTwinDarts(gameManager, playerPos);
        }

        if (this.stateTimer <= 0 || Math.abs(pos.x) > 18) {
          this.state = 'EVASIVE_DASH';
          this.stateTimer = 1.2;
          this.strafeDirection *= -1; // Reverse for next run
          if (this.particleManager) {
            this.particleManager.spawnSonicBoomDisc(pos, 0xaa00ff);
          }
        }
        break;

      case 'EVASIVE_DASH':
        this.targetCloakOpacity = 0.25;
        // High-G evasive barrel roll diving backward/outward
        pos.z -= 18.0 * dt;
        pos.x += this.strafeDirection * 15.0 * dt;
        this.meshGroup.rotation.z += 6.0 * dt;

        if (this.stateTimer <= 0) {
          this.state = 'CLOAKED_APPROACH';
          this.stateTimer = 3.0;
          this.isCloaked = true;
          this.targetCloakOpacity = 0.08;
        }
        break;
    }

    // Engine Warp Trail Emitter
    if (!this.isCloaked && Math.random() < 0.4 && this.particleManager) {
      const trailPos = pos.clone().add(new THREE.Vector3(0, 0, -1.8));
      this.particleManager.createLaserImpact(trailPos, new THREE.Vector3(0, 0, -1), 0xaa00ff);
    }

    // Wrap around if overshot screen
    if (pos.z > 25) {
      pos.z = -100;
      pos.x = (Math.random() - 0.5) * 26;
      pos.y = (Math.random() - 0.5) * 10;
      this.state = 'CLOAKED_APPROACH';
      this.stateTimer = 2.5;
    }
  }

  fireTwinDarts(gameManager, playerPos) {
    if (!gameManager) return;
    const pos = this.meshGroup.position;
    const dir = new THREE.Vector3().subVectors(playerPos, pos).normalize();

    // Offset left and right darts
    const offsetL = new THREE.Vector3(-1.2, -0.1, 1.2);
    const offsetR = new THREE.Vector3(1.2, -0.1, 1.2);

    [offsetL, offsetR].forEach(offset => {
      const spawnWorld = pos.clone().add(offset);
      if (gameManager.spawnEnemyLaser) {
        gameManager.spawnEnemyLaser(spawnWorld, dir, 0xbf00ff, 42);
      }
    });

    if (gameManager.spaceAudio) {
      gameManager.spaceAudio.playEnemyLaser();
    }
  }

  takeDamage(amount) {
    if (this.isDead) return false;

    // Cloaked stealth gives 30% evasion/damage deflection
    const actualDmg = this.isCloaked ? amount * 0.7 : amount;
    this.hp -= actualDmg;

    // Disrupt cloak on hit
    this.isCloaked = false;
    this.targetCloakOpacity = 1.0;
    this.cloakOpacity = 1.0;

    if (this.particleManager) {
      this.particleManager.createLaserImpact(this.meshGroup.position, new THREE.Vector3(0, 0, 1), 0xbf00ff);
    }

    if (this.hp <= 0) {
      this.isDead = true;
      this.destroy();
      return true;
    }
    return false;
  }

  destroy() {
    this.isDead = true;
    if (this.particleManager) {
      this.particleManager.createExplosion(this.meshGroup.position, 0xbf00ff, 35, 1.5);
      this.particleManager.createEmpShockwave(this.meshGroup.position, 25);
    }
    if (this.meshGroup && this.meshGroup.parent) {
      this.meshGroup.parent.remove(this.meshGroup);
    }
  }
}
