import * as THREE from 'three';

/**
 * Procedural Radar-Absorbent Material (RAM) Composite Texture for Stealth Armor
 */
function generateStealthArmorTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Rich metallic obsidian-crimson base
  ctx.fillStyle = '#1c0c10';
  ctx.fillRect(0, 0, 256, 256);

  // Carbon-fiber hexagonal nano-mesh in deep crimson
  ctx.strokeStyle = '#801424';
  ctx.lineWidth = 1.4;
  const hexRadius = 14;
  const h = hexRadius * Math.sqrt(3);

  for (let y = -h; y < 256 + h; y += h) {
    for (let x = -hexRadius * 3; x < 256 + hexRadius * 3; x += hexRadius * 3) {
      drawHex(ctx, x, y, hexRadius);
      drawHex(ctx, x + hexRadius * 1.5, y + h / 2, hexRadius);
    }
  }

  // Angled stealth panel facet seams in scarlet
  ctx.strokeStyle = '#e61c32';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(0, 40); ctx.lineTo(256, 120);
  ctx.moveTo(0, 180); ctx.lineTo(256, 220);
  ctx.moveTo(80, 0); ctx.lineTo(140, 256);
  ctx.stroke();

  // Magma-orange circuit conduits
  ctx.strokeStyle = '#ff4400';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(30, 0); ctx.lineTo(30, 80); ctx.lineTo(90, 140);
  ctx.moveTo(226, 0); ctx.lineTo(226, 80); ctx.lineTo(166, 140);
  ctx.stroke();

  return new THREE.CanvasTexture(canvas);
}

function drawHex(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const hx = x + r * Math.cos(angle);
    const hy = y + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(hx, hy);
    else ctx.lineTo(hx, hy);
  }
  ctx.closePath();
  ctx.stroke();
}

export class StealthFighter {
  constructor(scene, particleManager, spawnPos) {
    this.scene = scene;
    this.particleManager = particleManager;

    this.meshGroup = new THREE.Group();
    this.meshGroup.position.copy(spawnPos || new THREE.Vector3((Math.random() - 0.5) * 22, (Math.random() - 0.5) * 8, -90));

    this.hp = 220;
    this.maxHp = 220;
    this.radius = 2.4;
    this.isDead = false;
    this.scoreValue = 400;

    // AI & Cloaking State Machine
    // 'CLOAKED_APPROACH' -> 'UNCLOAK_AMBUSH' -> 'STRAFING_FIRE' -> 'EVASIVE_DASH' -> 'RE_CLOAK'
    this.state = 'CLOAKED_APPROACH';
    this.stateTimer = 2.5;
    this.cloakOpacity = 0.08;
    this.targetCloakOpacity = 0.08;
    this.isCloaked = true;

    this.speed = 30;
    this.fireTimer = 0;
    this.fireInterval = 0.38;
    this.burstCount = 0;
    this.maxBurst = 4;
    this.strafeDirection = Math.random() > 0.5 ? 1 : -1;
    this.thrusters = [];

    this.buildMesh();
    this.scene.add(this.meshGroup);
  }

  buildMesh() {
    this.armorTexture = generateStealthArmorTexture();

    // 1. Primary Stealth RAM Composite (Metallic Crimson-Obsidian)
    this.hullMat = new THREE.MeshStandardMaterial({
      color: 0x481820,
      map: this.armorTexture,
      metalness: 0.88,
      roughness: 0.22,
      transparent: true,
      opacity: this.cloakOpacity,
      blending: THREE.NormalBlending
    });

    // 2. Secondary Titanium-Tungsten Edge Armor (Specular High-Contrast Crimson)
    this.titaniumMat = new THREE.MeshStandardMaterial({
      color: 0xa83848,
      metalness: 0.94,
      roughness: 0.15,
      transparent: true,
      opacity: this.cloakOpacity
    });

    // 3. Magma Plasma Conduit Emissive Material
    this.conduitMat = new THREE.MeshStandardMaterial({
      color: 0x8c1822,
      emissive: 0xff2200,
      emissiveIntensity: 2.2,
      metalness: 0.85,
      roughness: 0.2,
      transparent: true,
      opacity: this.cloakOpacity
    });

    // 4. Optical Predator Oculus Material (Ruby Red)
    this.oculusMat = new THREE.MeshBasicMaterial({
      color: 0xff1133,
      transparent: true,
      opacity: this.cloakOpacity
    });

    // 5. Thruster Plasma Glow Material (Magma Orange)
    this.glowMat = new THREE.MeshBasicMaterial({
      color: 0xff4400,
      transparent: true,
      opacity: this.cloakOpacity,
      blending: THREE.AdditiveBlending
    });

    // --- MAIN FUSELAGE: Faceted Diamond Stealth Lifting Body ---
    const fuselageGeo = new THREE.BufferGeometry();
    const fVerts = new Float32Array([
      // Prow Nose (Facing +Z forward)
      0.0, 0.0, 2.6,     0.0, 0.55, 0.4,  -0.8, 0.25, 0.4,  // Top Left Front
      0.0, 0.0, 2.6,     0.8, 0.25, 0.4,   0.0, 0.55, 0.4,  // Top Right Front
      0.0, 0.0, 2.6,    -0.8, -0.15, 0.4,  0.0, -0.45, 0.4, // Bottom Left Front
      0.0, 0.0, 2.6,     0.0, -0.45, 0.4,  0.8, -0.15, 0.4, // Bottom Right Front

      // Mid Dorsal Carapace
      0.0, 0.55, 0.4,   -1.2, 0.15, -1.8, -0.8, 0.25, 0.4,
      0.0, 0.55, 0.4,    0.0, 0.45, -2.0, -1.2, 0.15, -1.8,
      0.0, 0.55, 0.4,    1.2, 0.15, -1.8,  0.0, 0.45, -2.0,
      0.0, 0.55, 0.4,    0.8, 0.25, 0.4,   1.2, 0.15, -1.8,

      // Mid Ventral Keel
      0.0, -0.45, 0.4,  -0.8, -0.15, 0.4, -1.2, -0.1, -1.8,
      0.0, -0.45, 0.4,  -1.2, -0.1, -1.8,  0.0, -0.35, -2.0,
      0.0, -0.45, 0.4,   0.0, -0.35, -2.0,  1.2, -0.1, -1.8,
      0.0, -0.45, 0.4,   1.2, -0.1, -1.8,  0.8, -0.15, 0.4,

      // Stern Transom Backplate
      0.0, 0.45, -2.0,  -1.2, -0.1, -1.8, -1.2, 0.15, -1.8,
      0.0, 0.45, -2.0,   0.0, -0.35, -2.0, -1.2, -0.1, -1.8,
      0.0, 0.45, -2.0,   1.2, -0.1, -1.8,  0.0, -0.35, -2.0,
      0.0, 0.45, -2.0,   1.2, 0.15, -1.8,  1.2, -0.1, -1.8
    ]);
    fuselageGeo.setAttribute('position', new THREE.BufferAttribute(fVerts, 3));
    fuselageGeo.computeVertexNormals();
    this.fuselageMesh = new THREE.Mesh(fuselageGeo, this.hullMat);
    this.meshGroup.add(this.fuselageMesh);

    // Dorsal Stealth Spine Armor
    const spineGeo = new THREE.BoxGeometry(0.35, 0.25, 3.2);
    const spineMesh = new THREE.Mesh(spineGeo, this.titaniumMat);
    spineMesh.position.set(0, 0.38, -0.4);
    this.meshGroup.add(spineMesh);

    // --- FORWARD ATTACK CANARDS ---
    const canardGeoL = new THREE.BufferGeometry();
    const canardVertsL = new Float32Array([
      -0.4, 0.1, 1.6,   -0.6, 0.1, 0.6,   -1.4, 0.05, 0.8,
      -1.4, 0.05, 0.8,  -0.6, 0.1, 0.6,   -0.4, 0.1, 1.6
    ]);
    canardGeoL.setAttribute('position', new THREE.BufferAttribute(canardVertsL, 3));
    canardGeoL.computeVertexNormals();
    this.meshGroup.add(new THREE.Mesh(canardGeoL, this.titaniumMat));

    const canardGeoR = new THREE.BufferGeometry();
    const canardVertsR = new Float32Array([
      0.4, 0.1, 1.6,    1.4, 0.05, 0.8,    0.6, 0.1, 0.6,
      0.6, 0.1, 0.6,    1.4, 0.05, 0.8,    0.4, 0.1, 1.6
    ]);
    canardGeoR.setAttribute('position', new THREE.BufferAttribute(canardVertsR, 3));
    canardGeoR.computeVertexNormals();
    this.meshGroup.add(new THREE.Mesh(canardGeoR, this.titaniumMat));

    // --- FORWARD-SWEPT DAGGER WINGS ---
    const wingGeo = new THREE.BufferGeometry();
    const wingVerts = new Float32Array([
      // Left Wing Upper
      -0.6, 0.15, 0.2,  -1.0, 0.1, -1.8,  -3.6, -0.1, 1.6,
      -0.6, 0.15, 0.2,  -3.6, -0.1, 1.6,  -3.4, -0.05, 2.0,
      // Left Wing Lower
      -0.6, -0.1, 0.2,  -3.6, -0.1, 1.6,  -1.0, -0.1, -1.8,

      // Right Wing Upper
      0.6, 0.15, 0.2,    3.6, -0.1, 1.6,   1.0, 0.1, -1.8,
      0.6, 0.15, 0.2,    3.4, -0.05, 2.0,  3.6, -0.1, 1.6,
      // Right Wing Lower
      0.6, -0.1, 0.2,    1.0, -0.1, -1.8,  3.6, -0.1, 1.6
    ]);
    wingGeo.setAttribute('position', new THREE.BufferAttribute(wingVerts, 3));
    wingGeo.computeVertexNormals();
    this.wingMesh = new THREE.Mesh(wingGeo, this.hullMat);
    this.meshGroup.add(this.wingMesh);

    // Titanium Leading Edge Slats
    const edgeGeoL = new THREE.CylinderGeometry(0.05, 0.05, 3.8, 4);
    edgeGeoL.rotateZ(Math.PI * 0.38);
    const edgeMeshL = new THREE.Mesh(edgeGeoL, this.titaniumMat);
    edgeMeshL.position.set(-2.0, 0.02, 0.95);
    this.meshGroup.add(edgeMeshL);

    const edgeGeoR = new THREE.CylinderGeometry(0.05, 0.05, 3.8, 4);
    edgeGeoR.rotateZ(-Math.PI * 0.38);
    const edgeMeshR = new THREE.Mesh(edgeGeoR, this.titaniumMat);
    edgeMeshR.position.set(2.0, 0.02, 0.95);
    this.meshGroup.add(edgeMeshR);

    // Wing Inset Plasma Conduit Filaments (Glowing Violet)
    const conduitGeoL = new THREE.BoxGeometry(0.08, 0.04, 2.6);
    conduitGeoL.rotateY(-0.4);
    const conduitMeshL = new THREE.Mesh(conduitGeoL, this.conduitMat);
    conduitMeshL.position.set(-1.8, 0.12, 0.4);
    this.meshGroup.add(conduitMeshL);

    const conduitGeoR = new THREE.BoxGeometry(0.08, 0.04, 2.6);
    conduitGeoR.rotateY(0.4);
    const conduitMeshR = new THREE.Mesh(conduitGeoR, this.conduitMat);
    conduitMeshR.position.set(1.8, 0.12, 0.4);
    this.meshGroup.add(conduitMeshR);

    // --- CANTED V-TAIL STABILIZERS ---
    const vTailGeoL = new THREE.BoxGeometry(0.08, 1.1, 1.2);
    vTailGeoL.rotateZ(-0.45);
    const vTailMeshL = new THREE.Mesh(vTailGeoL, this.titaniumMat);
    vTailMeshL.position.set(-0.95, 0.65, -1.6);
    this.meshGroup.add(vTailMeshL);

    const vTailGeoR = new THREE.BoxGeometry(0.08, 1.1, 1.2);
    vTailGeoR.rotateZ(0.45);
    const vTailMeshR = new THREE.Mesh(vTailGeoR, this.titaniumMat);
    vTailMeshR.position.set(0.95, 0.65, -1.6);
    this.meshGroup.add(vTailMeshR);

    // V-Tail Violet Navigation Markers
    const navLightGeo = new THREE.SphereGeometry(0.07, 8, 8);
    const navL = new THREE.Mesh(navLightGeo, this.glowMat);
    navL.position.set(-1.3, 1.1, -1.6);
    this.meshGroup.add(navL);

    const navR = new THREE.Mesh(navLightGeo, this.glowMat);
    navR.position.set(1.3, 1.1, -1.6);
    this.meshGroup.add(navR);

    // --- TWIN PLASMA SIPHON AUTOCANNONS (Destructible!) ---
    this.cannons = [];
    [-1.5, 1.5].forEach((x, idx) => {
      const sideName = x < 0 ? 'left' : 'right';
      const gunPod = new THREE.Group();
      gunPod.position.set(x, -0.15, 0.6);

      // Heavy Gun Shroud
      const shroudGeo = new THREE.CylinderGeometry(0.12, 0.14, 1.6, 6);
      shroudGeo.rotateX(Math.PI / 2);
      gunPod.add(new THREE.Mesh(shroudGeo, this.titaniumMat));

      // Gun Barrel Core
      const barrelGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.9, 6);
      barrelGeo.rotateX(Math.PI / 2);
      barrelGeo.translate(0, 0, 0.3);
      const barrel = new THREE.Mesh(barrelGeo, this.conduitMat);
      gunPod.add(barrel);

      // Muzzle Lens Ring
      const muzzleLens = new THREE.Mesh(new THREE.RingGeometry(0.04, 0.09, 8), this.oculusMat);
      muzzleLens.position.set(0, 0, 1.25);
      gunPod.add(muzzleLens);

      this.meshGroup.add(gunPod);

      this.cannons.push({
        id: sideName,
        hp: 50,
        maxHp: 50,
        isDead: false,
        mesh: gunPod,
        muzzle: muzzleLens
      });
    });

    // --- PREDATOR SENSOR OCULUS (Front Brow Slit) ---
    const oculusGeo = new THREE.BoxGeometry(0.42, 0.1, 0.15);
    const oculus = new THREE.Mesh(oculusGeo, this.oculusMat);
    oculus.position.set(0, 0.18, 1.8);
    this.meshGroup.add(oculus);

    // --- TWIN 2D VECTORING STEALTH ION ENGINES ---
    this.thrusters = [];
    [-0.55, 0.55].forEach(x => {
      const nacelle = new THREE.Group();
      nacelle.position.set(x, 0.05, -1.9);

      // Rectangular Stealth Nozzle Box
      const nozzleGeo = new THREE.BoxGeometry(0.5, 0.35, 0.6);
      nacelle.add(new THREE.Mesh(nozzleGeo, this.titaniumMat));

      // Glowing Ion Core
      const coreGeo = new THREE.PlaneGeometry(0.38, 0.25);
      coreGeo.rotateY(Math.PI);
      const coreMesh = new THREE.Mesh(coreGeo, this.glowMat);
      coreMesh.position.set(0, 0, -0.32);
      nacelle.add(coreMesh);

      // Mach Shock Diamond
      const coneGeo = new THREE.ConeGeometry(0.18, 0.8, 6);
      coneGeo.rotateX(-Math.PI / 2);
      const shockDiamond = new THREE.Mesh(coneGeo, this.glowMat);
      shockDiamond.position.set(0, 0, -0.7);
      nacelle.add(shockDiamond);
      this.thrusters.push(shockDiamond);

      this.meshGroup.add(nacelle);
    });

    // --- ACTIVE OPTICAL CAMOUFLAGE SHIMMER LATTICE & CLOAK GENERATOR ---
    const shimmerGeo = new THREE.IcosahedronGeometry(2.8, 1);
    this.shimmerMat = new THREE.MeshBasicMaterial({
      color: 0xbf00ff,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.shimmerMesh = new THREE.Mesh(shimmerGeo, this.shimmerMat);
    this.meshGroup.add(this.shimmerMesh);

    // Dorsal Cloak Generator Module
    const cloakModGeo = new THREE.BoxGeometry(0.6, 0.25, 0.9);
    this.cloakModMesh = new THREE.Mesh(cloakModGeo, this.titaniumMat);
    this.cloakModMesh.position.set(0, 0.45, -0.5);
    this.meshGroup.add(this.cloakModMesh);

    this.cloakGenerator = {
      hp: 60,
      maxHp: 60,
      isDead: false,
      mesh: this.cloakModMesh
    };

    // --- DEDICATED SPECULAR KEY LIGHT ---
    this.keyLight = new THREE.PointLight(0xd8b4fe, 2.2, 12);
    this.keyLight.position.set(0, 2.5, 1.0);
    this.meshGroup.add(this.keyLight);
  }

  takeCannonDamage(sideName, amount) {
    const cannon = this.cannons.find(c => c.id === sideName);
    if (!cannon || cannon.isDead) return false;
    cannon.hp -= amount;

    if (cannon.muzzle && cannon.muzzle.material) {
      const pct = cannon.hp / cannon.maxHp;
      if (pct <= 0.5) {
        cannon.muzzle.material = new THREE.MeshBasicMaterial({ color: 0xff5500 });
      }
    }

    if (cannon.hp <= 0) {
      cannon.isDead = true;
      if (cannon.mesh) cannon.mesh.visible = false;
      const wp = cannon.mesh.getWorldPosition(new THREE.Vector3());
      if (this.particleManager) {
        this.particleManager.createExplosion(wp, 0xdf44ff, 25, 1.2);
      }
      return true;
    }
    return false;
  }

  update(dt, playerShip, gameManager) {
    if (this.isDead || !this.meshGroup) return;

    this.stateTimer -= dt;

    // Pulsing Ion Thruster Shock Diamonds
    if (this.thrusters && this.thrusters.length > 0) {
      const pulse = 0.85 + Math.sin(Date.now() * 0.02) * 0.25;
      this.thrusters.forEach(t => {
        if (t && t.scale) t.scale.set(pulse, pulse, pulse * 1.2);
      });
    }

    // Smooth Cloak Opacity Transition
    this.cloakOpacity += (this.targetCloakOpacity - this.cloakOpacity) * 5.0 * dt;
    if (this.hullMat) this.hullMat.opacity = this.cloakOpacity;
    if (this.titaniumMat) this.titaniumMat.opacity = this.cloakOpacity;
    if (this.conduitMat) this.conduitMat.opacity = this.cloakOpacity;
    if (this.oculusMat) this.oculusMat.opacity = this.isCloaked ? 0.05 : 0.95;
    if (this.glowMat) this.glowMat.opacity = this.isCloaked ? 0.05 : 0.9;
    if (this.keyLight) this.keyLight.intensity = this.isCloaked ? 0.2 : 2.2;

    if (this.shimmerMesh) {
      this.shimmerMesh.visible = this.isCloaked;
      if (this.isCloaked) {
        this.shimmerMesh.rotation.y += 2.0 * dt;
        this.shimmerMesh.rotation.z += 1.5 * dt;
        this.shimmerMat.opacity = 0.08 + Math.sin(Date.now() * 0.008) * 0.06;
      }
    }

    const pos = this.meshGroup.position;
    const playerPos = playerShip && playerShip.meshGroup ? playerShip.meshGroup.position : new THREE.Vector3(0, 0, 0);

    // -- State Machine Logic --
    switch (this.state) {
      case 'CLOAKED_APPROACH':
        this.isCloaked = true;
        this.targetCloakOpacity = 0.08;
        // Infiltrate along flanks with sinus weaving
        pos.z += this.speed * 0.8 * dt;
        pos.x += Math.sin(Date.now() * 0.002) * 12.0 * dt;
        pos.y += Math.cos(Date.now() * 0.002) * 6.0 * dt;

        if (this.stateTimer <= 0 || pos.z > -45) {
          this.state = 'UNCLOAK_AMBUSH';
          this.stateTimer = 0.6;
          this.targetCloakOpacity = 1.0;
          this.isCloaked = false;
          if (this.particleManager) {
            this.particleManager.createExplosion(pos, 0xbf00ff, 20, 0.9);
            this.particleManager.spawnSparks(pos, new THREE.Vector3(0, 0, 1), 0xdf44ff, 16);
          }
        }
        break;

      case 'UNCLOAK_AMBUSH':
        this.isCloaked = false;
        this.targetCloakOpacity = 1.0;
        // Look directly at player with menacing pitch
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
            this.particleManager.spawnSonicBoomDisc(pos, 0xbf00ff);
            this.particleManager.spawnSparks(pos, new THREE.Vector3(this.strafeDirection, 0, 0), 0xff00bb, 14);
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
    if (!this.isCloaked && Math.random() < 0.45 && this.particleManager) {
      const trailPos = pos.clone().add(new THREE.Vector3(0, 0, -1.9));
      this.particleManager.createLaserImpact(trailPos, new THREE.Vector3(0, 0, -1), 0xbf00ff);
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

    if (this.cannons) {
      this.cannons.forEach(c => {
        if (!c.isDead && c.mesh) {
          const spawnWorld = c.mesh.getWorldPosition(new THREE.Vector3());
          if (gameManager.spawnEnemyLaser) {
            gameManager.spawnEnemyLaser(spawnWorld, dir, 0xbf00ff, 44);
          }
        }
      });
    }

    if (gameManager.spaceAudio && gameManager.spaceAudio.playEnemyLaser) {
      gameManager.spaceAudio.playEnemyLaser();
    }
  }

  takeDamage(amount, hitPos = null) {
    if (this.isDead) return false;

    // Check localized weapon hits
    if (hitPos && this.cannons) {
      for (const cannon of this.cannons) {
        if (!cannon.isDead && cannon.mesh) {
          const cPos = cannon.mesh.getWorldPosition(new THREE.Vector3());
          if (hitPos.distanceTo(cPos) < 1.4) {
            this.takeCannonDamage(cannon.id, amount * 1.5);
            break;
          }
        }
      }
    }

    // Cloaked stealth gives 30% evasion/damage deflection
    const actualDmg = this.isCloaked ? amount * 0.7 : amount;
    this.hp -= actualDmg;

    // Disrupt cloak on hit
    this.isCloaked = false;
    this.targetCloakOpacity = 1.0;
    this.cloakOpacity = 1.0;

    if (this.particleManager) {
      this.particleManager.createLaserImpact(this.meshGroup.position, new THREE.Vector3(0, 0, 1), 0xbf00ff);
      this.particleManager.spawnSparks(this.meshGroup.position, new THREE.Vector3(0, 0, 1), 0xdf44ff, 12);
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
      this.particleManager.createExplosion(this.meshGroup.position, 0xbf00ff, 40, 1.8);
      this.particleManager.spawnSparks(this.meshGroup.position, new THREE.Vector3(0, 0, 1), 0xff00bb, 22);
      this.particleManager.createEmpShockwave(this.meshGroup.position, 28);
    }
    if (this.meshGroup && this.meshGroup.parent) {
      this.meshGroup.parent.remove(this.meshGroup);
    }
  }
}

