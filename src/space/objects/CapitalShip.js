import * as THREE from 'three';

/**
 * Procedural Normal/Bump Texture for Valiant Capital Cruiser Armor (Silver Platinum Finish)
 */
function generateCruiserArmorTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Base metallic brushed silver alloy
  ctx.fillStyle = '#ccd6e0';
  ctx.fillRect(0, 0, 256, 256);

  // Geometric silver panel seams
  ctx.strokeStyle = '#8092a6';
  ctx.lineWidth = 2.2;
  for (let x = 0; x < 256; x += 32) {
    ctx.strokeRect(x, 0, 32, 256);
  }
  for (let y = 0; y < 256; y += 32) {
    ctx.strokeRect(0, y, 256, 32);
  }

  // Micro-rivets along armor boundaries
  ctx.fillStyle = '#f4f8fc';
  for (let y = 4; y < 256; y += 16) {
    for (let x = 4; x < 256; x += 32) {
      ctx.beginPath();
      ctx.arc(x, y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Cyan energized circuit conduits
  ctx.strokeStyle = '#00f3ff';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(0, 128); ctx.lineTo(64, 128); ctx.lineTo(96, 96); ctx.lineTo(256, 96);
  ctx.stroke();

  return new THREE.CanvasTexture(canvas);
}

export class CapitalShip {
  constructor(scene, particleManager) {
    this.scene = scene;
    this.particleManager = particleManager;

    this.radius = 4.5;
    this.hp = 350;
    this.maxHp = 350;
    this.scoreValue = 1200;
    this.isDead = false;

    this.meshGroup = new THREE.Group();

    // Spawn far away and drift in slowly
    const spawnX = (Math.random() - 0.5) * 24;
    const spawnY = (Math.random() - 0.5) * 12;
    const spawnZ = -100 - Math.random() * 20;
    this.meshGroup.position.set(spawnX, spawnY, spawnZ);

    this.targetZ = 12; // slow down and hover in front of the screen
    this.speed = 14;
    this.fireTimer = 1.5;
    this._time = Math.random() * 100;

    this.turrets = [
      { relPos: new THREE.Vector3(-3.2, 0.4, -0.5), mesh: null, barrelGroup: null },
      { relPos: new THREE.Vector3(3.2, 0.4, -0.5), mesh: null, barrelGroup: null }
    ];
    this.thrusters = [];

    this.buildMesh();
    this.scene.add(this.meshGroup);
  }

  buildMesh() {
    this.armorTexture = generateCruiserArmorTexture();

    // ── High-Definition Sleek Silver / Platinum Materials ──
    this.hullMat = new THREE.MeshStandardMaterial({
      color: 0xc8d6e5,
      bumpMap: this.armorTexture,
      bumpScale: 0.12,
      metalness: 0.95,
      roughness: 0.16,
      emissive: 0x182230,
      emissiveIntensity: 0.25
    });

    this.armorPlatesMat = new THREE.MeshStandardMaterial({
      color: 0xf0f5fb,
      metalness: 0.98,
      roughness: 0.10,
      bumpMap: this.armorTexture,
      bumpScale: 0.06
    });

    this.darkAlloyMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.92,
      roughness: 0.20
    });

    this.glowCyanMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });

    this.glowBlueMat = new THREE.MeshBasicMaterial({
      color: 0x0088ff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    // ── 1. Faceted Arrowhead Cruiser Hull (12m Length) ──
    const hullGeo = new THREE.BufferGeometry();
    const hullVerts = new Float32Array([
      // Prow Wedge Top (Facing +Z forward)
      0, 0.55, 6.0,    3.0, 0.4, -1.0,   -3.0, 0.4, -1.0,
      // Prow Wedge Bottom
      0, -0.6, 6.0,   -3.0, -0.4, -1.0,   3.0, -0.4, -1.0,
      // Stern Block Top
      -3.0, 0.4, -1.0,  3.0, 0.4, -4.5,   -3.0, 0.4, -4.5,
      -3.0, 0.4, -1.0,  3.0, 0.4, -1.0,    3.0, 0.4, -4.5,
      // Stern Block Bottom
      -3.0, -0.4, -1.0, -3.0, -0.4, -4.5,  3.0, -0.4, -4.5,
      -3.0, -0.4, -1.0,  3.0, -0.4, -4.5,  3.0, -0.4, -1.0,
      // Left Flank
      0, 0.55, 6.0,   -3.0, 0.4, -1.0,   -3.0, -0.4, -1.0,
      0, 0.55, 6.0,   -3.0, -0.4, -1.0,    0, -0.6, 6.0,
      -3.0, 0.4, -1.0, -3.0, 0.4, -4.5,  -3.0, -0.4, -1.0,
      -3.0, 0.4, -4.5, -3.0, -0.4, -4.5, -3.0, -0.4, -1.0,
      // Right Flank
      0, 0.55, 6.0,    3.0, -0.4, -1.0,   3.0, 0.4, -1.0,
      0, 0.55, 6.0,    0, -0.6, 6.0,      3.0, -0.4, -1.0,
      3.0, 0.4, -1.0,  3.0, -0.4, -1.0,   3.0, 0.4, -4.5,
      3.0, 0.4, -4.5,  3.0, -0.4, -1.0,   3.0, -0.4, -4.5,
      // Stern Aft
      -3.0, 0.4, -4.5, -3.0, -0.4, -4.5,  3.0, -0.4, -4.5,
      -3.0, 0.4, -4.5,  3.0, -0.4, -4.5,  3.0, 0.4, -4.5
    ]);
    hullGeo.setAttribute('position', new THREE.BufferAttribute(hullVerts, 3));
    hullGeo.computeVertexNormals();
    const mainHull = new THREE.Mesh(hullGeo, this.hullMat);
    this.meshGroup.add(mainHull);

    // ── 2. Dorsal Citadel Armor Spine ──
    const spineGeo = new THREE.BoxGeometry(1.8, 0.7, 8.0);
    const spineMesh = new THREE.Mesh(spineGeo, this.armorPlatesMat);
    spineMesh.position.set(0, 0.65, -0.5);
    this.meshGroup.add(spineMesh);

    // ── 3. Elevated Command Bridge Fortress ──
    const bridgeGeo = new THREE.BoxGeometry(1.6, 0.85, 2.6);
    const bridgeMesh = new THREE.Mesh(bridgeGeo, this.darkAlloyMat);
    bridgeMesh.position.set(0, 1.15, -1.4);
    this.meshGroup.add(bridgeMesh);

    // Illuminated Panoramic Cyan Command Visor
    const visorGeo = new THREE.BoxGeometry(1.4, 0.2, 0.15);
    const visorMesh = new THREE.Mesh(visorGeo, this.glowCyanMat);
    visorMesh.position.set(0, 1.25, -0.05);
    this.meshGroup.add(visorMesh);

    // Sensor & Communications Mast
    const mastGeo = new THREE.CylinderGeometry(0.04, 0.08, 1.6, 6);
    const mastMesh = new THREE.Mesh(mastGeo, this.armorPlatesMat);
    mastMesh.position.set(0, 2.1, -1.6);
    this.meshGroup.add(mastMesh);

    // ── 4. Flank Armor Sponsons & Winglets ──
    [-3.2, 3.2].forEach(sx => {
      const sponsonGeo = new THREE.BoxGeometry(0.9, 0.4, 5.0);
      const sponsonMesh = new THREE.Mesh(sponsonGeo, this.armorPlatesMat);
      sponsonMesh.position.set(sx, 0.1, -1.2);
      this.meshGroup.add(sponsonMesh);

      // Sponson Cyan Navigation Light Strip
      const lightGeo = new THREE.BoxGeometry(0.12, 0.1, 4.4);
      const lightMesh = new THREE.Mesh(lightGeo, this.glowCyanMat);
      lightMesh.position.set(sx + (sx > 0 ? 0.45 : -0.45), 0.1, -1.2);
      this.meshGroup.add(lightMesh);
    });

    // ── 5. Twin Heavy Rotating Flank Turrets ──
    const turretBaseGeo = new THREE.CylinderGeometry(0.55, 0.7, 0.35, 10);
    const houseGeo = new THREE.BoxGeometry(0.8, 0.4, 0.9);

    this.turrets.forEach(t => {
      const tGroup = new THREE.Group();
      tGroup.position.copy(t.relPos);

      // Armored Barbette Base
      const base = new THREE.Mesh(turretBaseGeo, this.armorPlatesMat);
      tGroup.add(base);

      // Gunhouse Carapace
      const house = new THREE.Mesh(houseGeo, this.darkAlloyMat);
      house.position.set(0, 0.25, 0);
      tGroup.add(house);

      // Twin Plasma Cannon Barrels
      const barrelGroup = new THREE.Group();
      barrelGroup.position.set(0, 0.25, 0);

      [-0.2, 0.2].forEach(bx => {
        const barrelGeo = new THREE.CylinderGeometry(0.08, 0.1, 1.6, 8);
        barrelGeo.rotateX(Math.PI / 2);
        const barrelMesh = new THREE.Mesh(barrelGeo, this.armorPlatesMat);
        barrelMesh.position.set(bx, 0, 0.8);
        barrelGroup.add(barrelMesh);

        // Muzzle Ring
        const ringGeo = new THREE.TorusGeometry(0.1, 0.03, 6, 12);
        const ringMesh = new THREE.Mesh(ringGeo, this.glowCyanMat);
        ringMesh.position.set(bx, 0, 1.6);
        barrelGroup.add(ringMesh);
      });

      tGroup.add(barrelGroup);
      this.meshGroup.add(tGroup);

      t.mesh = tGroup;
      t.barrelGroup = barrelGroup;
    });

    // ── 6. Stern Twin Heavy Vectoring Ion Thrusters ──
    [-1.1, 1.1].forEach(ex => {
      const engineNacelle = new THREE.Group();
      engineNacelle.position.set(ex, 0, -4.5);

      const cowlGeo = new THREE.BoxGeometry(1.3, 1.1, 2.2);
      const cowlMesh = new THREE.Mesh(cowlGeo, this.darkAlloyMat);
      engineNacelle.add(cowlMesh);

      // Exhaust Nozzle
      const nozzleGeo = new THREE.CylinderGeometry(0.45, 0.6, 0.8, 10);
      nozzleGeo.rotateX(Math.PI / 2);
      const nozzleMesh = new THREE.Mesh(nozzleGeo, this.armorPlatesMat);
      nozzleMesh.position.set(0, 0, -1.2);
      engineNacelle.add(nozzleMesh);

      // Glowing Ion Exhaust Core
      const coreGeo = new THREE.PlaneGeometry(0.8, 0.8);
      coreGeo.rotateY(Math.PI);
      const coreMesh = new THREE.Mesh(coreGeo, this.glowCyanMat);
      coreMesh.position.set(0, 0, -1.62);
      engineNacelle.add(coreMesh);

      // Pulsating Mach Shock Diamond
      const shockGeo = new THREE.ConeGeometry(0.35, 1.8, 8);
      shockGeo.rotateX(-Math.PI / 2);
      const shockMesh = new THREE.Mesh(shockGeo, this.glowCyanMat);
      shockMesh.position.set(0, 0, -2.4);
      engineNacelle.add(shockMesh);
      this.thrusters.push(shockMesh);

      this.meshGroup.add(engineNacelle);
    });

    // ── 7. Ventral Keel Torpedo Bay ──
    const torpedoBayGeo = new THREE.BoxGeometry(0.6, 0.4, 2.0);
    const torpedoBayMesh = new THREE.Mesh(torpedoBayGeo, this.darkAlloyMat);
    torpedoBayMesh.position.set(0, -0.65, 3.2);
    this.meshGroup.add(torpedoBayMesh);

    const torpedoCoreGeo = new THREE.SphereGeometry(0.25, 8, 8);
    const torpedoCore = new THREE.Mesh(torpedoCoreGeo, this.glowCyanMat);
    torpedoCore.position.set(0, -0.65, 4.2);
    this.meshGroup.add(torpedoCore);

    // Dedicated Specular Light for Hull Definition
    this.keyLight = new THREE.PointLight(0xd8e8ff, 3.5, 45);
    this.keyLight.position.set(0, 7.0, 4.0);
    this.meshGroup.add(this.keyLight);
  }

  takeDamage(amount) {
    this.hp -= amount;

    if (this.particleManager) {
      this.particleManager.createLaserImpact(this.meshGroup.position, new THREE.Vector3(0, 0, 1), 0x00f3ff);
      this.particleManager.spawnSparks(this.meshGroup.position, new THREE.Vector3(0, 0, 1), 0x00d4ff, 8);
    }

    // Emissive flash feedback
    if (this.hullMat) {
      this.hullMat.emissive.setHex(0xff0055);
      this.hullMat.emissiveIntensity = 2.2;
      setTimeout(() => {
        if (this.isDead) return;
        if (this.hullMat) {
          this.hullMat.emissive.setHex(0x111c2e);
          this.hullMat.emissiveIntensity = 0.35;
        }
      }, 100);
    }

    if (this.hp <= 0 && !this.isDead) {
      this.isDead = true;
      this._explode();
    }
    return this.isDead;
  }

  _explode() {
    this.particleManager.createExplosion(this.meshGroup.position, 0x00aaff, 120, 3.2);
    this.particleManager.createExplosion(this.meshGroup.position, 0xffea00, 80, 2.5);
    this.particleManager.spawnSparks(this.meshGroup.position, new THREE.Vector3(0, 0, 1), 0x00ffff, 25);
    this.particleManager.createEmpShockwave(this.meshGroup.position, 40);
  }

  destroy() {
    this.scene.remove(this.meshGroup);
    this.meshGroup.traverse(c => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    });
  }

  update(dt, playerPos) {
    this._time += dt;

    // Pulsing Ion Thruster Shock Diamonds
    if (this.thrusters && this.thrusters.length > 0) {
      const pulse = 0.88 + Math.sin(Date.now() * 0.016) * 0.22;
      this.thrusters.forEach(t => {
        if (t && t.scale) t.scale.set(pulse, pulse, pulse * 1.25);
      });
    }

    // Move forward from deep space and hover
    if (this.meshGroup.position.z < this.targetZ) {
      this.meshGroup.position.z += this.speed * dt;
    } else {
      // Tactical hover weave movement
      this.meshGroup.position.z += Math.sin(this._time * 1.5) * 0.8 * dt;
      this.meshGroup.position.x += Math.cos(this._time * 1.0) * 1.2 * dt;
    }

    // Turrets aim at player in world coordinates
    this.turrets.forEach(t => {
      if (t.mesh) {
        const turretWorldPos = t.mesh.getWorldPosition(new THREE.Vector3());
        const dir = new THREE.Vector3().subVectors(playerPos, turretWorldPos);
        t.mesh.rotation.y = Math.atan2(-dir.x, dir.z);
      }
    });

    // Firing logic
    this.fireTimer -= dt;
    let shouldFire = false;
    const out = [];

    // Firing starts once cruiser is near the player space
    if (this.fireTimer <= 0 && this.meshGroup.position.z < 25) {
      this.fireTimer = 1.4 + Math.random() * 0.4;
      this.turrets.forEach(t => {
        if (t.mesh) {
          out.push(t.mesh.getWorldPosition(new THREE.Vector3()));
        }
      });
      shouldFire = true;
    }

    // Check if passed player and impacted home planet at Z > 18
    if (this.meshGroup.position.z > 18) {
      this.isDead = true;
      this.impactedPlanet = true;
    }

    return shouldFire ? out : false;
  }
}
