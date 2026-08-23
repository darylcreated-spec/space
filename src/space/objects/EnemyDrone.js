import * as THREE from 'three';

// Procedural normal map generator for high-definition armor plating & rivet seams
function generateDroneArmorTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 256);

  // Geometric panel seams
  ctx.strokeStyle = '#303030';
  ctx.lineWidth = 3;
  ctx.strokeRect(16, 16, 224, 224);
  ctx.strokeRect(48, 48, 160, 160);

  // Diagonal tech lines
  ctx.beginPath();
  ctx.moveTo(16, 16); ctx.lineTo(80, 80);
  ctx.moveTo(240, 16); ctx.lineTo(176, 80);
  ctx.moveTo(16, 240); ctx.lineTo(80, 176);
  ctx.moveTo(240, 240); ctx.lineTo(176, 176);
  ctx.stroke();

  // Rivet details
  ctx.fillStyle = '#d0d0d0';
  for (let x = 24; x < 240; x += 32) {
    ctx.fillRect(x, 20, 3, 3);
    ctx.fillRect(x, 234, 3, 3);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export class EnemyDrone {
  constructor(scene, options = {}) {
    this.scene = scene;

    this.radius = 2.4;
    this.hp = 65;
    this.maxHp = 65;
    this.scoreValue = 350;

    this.meshGroup = new THREE.Group();

    const spawnX = options.x !== undefined ? options.x : (Math.random() - 0.5) * 36;
    const spawnY = options.y !== undefined ? options.y : (Math.random() - 0.5) * 20;
    const spawnZ = options.z !== undefined ? options.z : (-75 - Math.random() * 20);

    this.meshGroup.position.set(spawnX, spawnY, spawnZ);
    this.targetPos = new THREE.Vector3(spawnX, spawnY, 0);
    this.velocity = new THREE.Vector3(
      options.vx !== undefined ? options.vx : 0,
      options.vy !== undefined ? options.vy : 0,
      options.vz !== undefined ? options.vz : (14 + Math.random() * 6)
    );
    this.fireTimer = 0.5 + Math.random() * 0.8;
    this.isDead = false;
    this._time = Math.random() * 10;
    this._wobbleOffset = Math.random() * Math.PI * 2;

    this.thrusterMeshes = [];
    this.glowMaterials = [];

    this.buildDroneMesh();
    this.scene.add(this.meshGroup);
  }

  buildDroneMesh() {
    const armorTex = generateDroneArmorTexture();

    // ── High-Definition High-Contrast Alloy Materials ──
    this.hullMat = new THREE.MeshStandardMaterial({
      color: 0x6a7b99,
      metalness: 0.85,
      roughness: 0.2,
      bumpMap: armorTex,
      bumpScale: 0.12,
      emissive: 0x1f2438,
      emissiveIntensity: 0.4
    });

    this.armorPlateMat = new THREE.MeshStandardMaterial({
      color: 0xb8cbdf,
      metalness: 0.95,
      roughness: 0.12,
      bumpMap: armorTex,
      bumpScale: 0.15,
      emissive: 0x303b54,
      emissiveIntensity: 0.3
    });

    this.trimMat = new THREE.MeshStandardMaterial({
      color: 0xff4466,
      metalness: 0.75,
      roughness: 0.18,
      emissive: 0x880022,
      emissiveIntensity: 0.5
    });

    this.titaniumTrimMat = new THREE.MeshStandardMaterial({
      color: 0xeef4fc,
      metalness: 0.98,
      roughness: 0.05,
      emissive: 0x445577,
      emissiveIntensity: 0.25
    });

    this.redGlowMat = new THREE.MeshBasicMaterial({
      color: 0xff0044,
      transparent: true,
      opacity: 1.0
    });
    this.glowMaterials.push(this.redGlowMat);

    this.accentGlowMat = new THREE.MeshBasicMaterial({
      color: 0xff2266,
      transparent: true,
      opacity: 0.95
    });
    this.glowMaterials.push(this.accentGlowMat);

    this.thrusterGlowMat = new THREE.MeshBasicMaterial({
      color: 0xc844ff,
      transparent: true,
      opacity: 0.95
    });
    this.glowMaterials.push(this.thrusterGlowMat);

    // Dedicated Key Spotlight on drone for dramatic specular reflections
    this.droneKeyLight = new THREE.PointLight(0xaad4ff, 4.0, 22);
    this.droneKeyLight.position.set(0, 4.0, 5.0);
    this.meshGroup.add(this.droneKeyLight);

    // ── 1. Central Diamond / Hexagonal Core Fuselage (Facing Forward +Z) ──
    const coreGeo = new THREE.CylinderGeometry(1.25, 2.0, 4.4, 6, 1);
    coreGeo.rotateX(Math.PI / 2);
    coreGeo.scale(1.35, 0.7, 1.0);
    this.coreMesh = new THREE.Mesh(coreGeo, this.hullMat);
    this.coreMesh.position.set(0, 0, 0);
    this.meshGroup.add(this.coreMesh);

    // ── 2. Beveled Dorsal Armor Spine & Cockpit Ridge ──
    const spineGeo = new THREE.ConeGeometry(1.0, 4.0, 5);
    spineGeo.rotateX(Math.PI / 2);
    spineGeo.scale(1.15, 0.5, 1.0);
    const spineMesh = new THREE.Mesh(spineGeo, this.armorPlateMat);
    spineMesh.position.set(0, 0.44, 0.35);
    this.meshGroup.add(spineMesh);

    // Ventral Armor Keel
    const keelGeo = new THREE.ConeGeometry(0.75, 3.4, 4);
    keelGeo.rotateX(Math.PI / 2);
    keelGeo.scale(1.0, 0.4, 1.0);
    const keelMesh = new THREE.Mesh(keelGeo, this.titaniumTrimMat);
    keelMesh.position.set(0, -0.42, -0.1);
    this.meshGroup.add(keelMesh);

    // Forward Canard Airfoils / Prow Blades
    [1, -1].forEach(side => {
      const canardGeo = new THREE.BoxGeometry(1.2, 0.08, 0.9);
      const canard = new THREE.Mesh(canardGeo, this.trimMat);
      canard.position.set(side * 1.1, 0.05, 1.4);
      canard.rotation.y = -side * 0.4;
      canard.rotation.z = side * 0.15;
      this.meshGroup.add(canard);
    });

    // ── 3. High-Definition Predator Sensor Oculus (Forward Prow +Z) ──
    // Sensor Housing Brow
    const browGeo = new THREE.BoxGeometry(1.2, 0.35, 0.8);
    const browMesh = new THREE.Mesh(browGeo, this.armorPlateMat);
    browMesh.position.set(0, 0.15, 1.5);
    this.meshGroup.add(browMesh);

    // Central Oculus Slit Lens
    const eyeGeo = new THREE.BoxGeometry(0.9, 0.16, 0.2);
    this.eyeMesh = new THREE.Mesh(eyeGeo, this.redGlowMat);
    this.eyeMesh.position.set(0, 0.15, 1.92);
    this.meshGroup.add(this.eyeMesh);

    // Optical Focusing Spherical Core
    const oculusCoreGeo = new THREE.SphereGeometry(0.24, 16, 16);
    const oculusCore = new THREE.Mesh(oculusCoreGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    oculusCore.position.set(0, 0.15, 1.88);
    this.meshGroup.add(oculusCore);

    // Secondary Cheek Targeting Sensors
    [-0.55, 0.55].forEach(x => {
      const cheekGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.4, 6);
      cheekGeo.rotateX(Math.PI / 2);
      const cheekMesh = new THREE.Mesh(cheekGeo, this.trimMat);
      cheekMesh.position.set(x, 0.05, 1.7);
      this.meshGroup.add(cheekMesh);

      const cheekLens = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), this.accentGlowMat);
      cheekLens.position.set(x, 0.05, 1.9);
      this.meshGroup.add(cheekLens);
    });

    // Oculus Halo & Light
    this.eyeHalo = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 14, 14),
      new THREE.MeshBasicMaterial({ color: 0xff0044, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending })
    );
    this.eyeHalo.position.set(0, 0.15, 1.9);
    this.meshGroup.add(this.eyeHalo);

    this.eyeLight = new THREE.PointLight(0xff0044, 3.5, 14);
    this.eyeLight.position.set(0, 0.15, 2.2);
    this.meshGroup.add(this.eyeLight);

    // ── 4. Swept-Forward Multi-Faceted Razor Delta Wings ──
    [1, -1].forEach(side => {
      // Main Wing Plate (Swept forward with aggressive attack angle)
      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, -0.4);
      wingShape.lineTo(side * 3.6, -1.0); // Wingtip out and swept back
      wingShape.lineTo(side * 3.4, 1.2);  // Forward razor leading edge
      wingShape.lineTo(side * 1.2, 2.2);  // Prow root blend
      wingShape.lineTo(0, 1.4);
      wingShape.closePath();

      const extrudeSettings = {
        depth: 0.16,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.06,
        bevelThickness: 0.06
      };
      const wingGeo = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);
      wingGeo.rotateX(-Math.PI / 2);
      const wingMesh = new THREE.Mesh(wingGeo, this.hullMat);
      wingMesh.position.set(0, 0, 0);
      this.meshGroup.add(wingMesh);

      // Upper Armor Layer / Sponson Plate
      const upperPlateGeo = new THREE.BoxGeometry(2.2, 0.18, 1.6);
      const upperPlate = new THREE.Mesh(upperPlateGeo, this.armorPlateMat);
      upperPlate.position.set(side * 1.8, 0.14, 0.4);
      upperPlate.rotation.y = side * 0.22;
      this.meshGroup.add(upperPlate);

      // Titanium Leading Edge Armor Slat
      const slatGeo = new THREE.BoxGeometry(0.18, 0.22, 2.8);
      const slatMesh = new THREE.Mesh(slatGeo, this.trimMat);
      slatMesh.position.set(side * 2.5, 0.08, 1.3);
      slatMesh.rotation.y = -side * 0.65;
      this.meshGroup.add(slatMesh);

      // Glowing Neon Crimson Energy Inset Channel
      const conduitGeo = new THREE.BoxGeometry(0.1, 0.1, 2.4);
      const conduit = new THREE.Mesh(conduitGeo, this.accentGlowMat);
      conduit.position.set(side * 2.4, 0.16, 0.2);
      conduit.rotation.y = -side * 0.38;
      this.meshGroup.add(conduit);

      // Vertical Wingtip Stabilizer Winglet
      const wingletGeo = new THREE.BoxGeometry(0.14, 1.2, 1.6);
      const winglet = new THREE.Mesh(wingletGeo, this.trimMat);
      winglet.position.set(side * 3.5, 0.35, 0.1);
      winglet.rotation.x = -0.15;
      winglet.rotation.z = side * 0.1;
      this.meshGroup.add(winglet);

      const wingletGlow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.0, 0.08), this.redGlowMat);
      wingletGlow.position.set(side * 3.52, 0.35, -0.6);
      this.meshGroup.add(wingletGlow);

      // Heavy Forward Plasma Cannon Pod
      const cannonHousing = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.38, 2.2),
        this.armorPlateMat
      );
      cannonHousing.position.set(side * 2.4, -0.16, 1.2);
      this.meshGroup.add(cannonHousing);

      const barrelGeo = new THREE.CylinderGeometry(0.12, 0.15, 2.4, 8);
      barrelGeo.rotateX(Math.PI / 2);
      const barrel = new THREE.Mesh(barrelGeo, this.trimMat);
      barrel.position.set(side * 2.4, -0.16, 2.4);
      this.meshGroup.add(barrel);

      // Glowing Plasma Muzzle Emitter & Heat Shroud
      const muzzleGlow = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.16, 0.35, 8),
        this.redGlowMat
      );
      muzzleGlow.rotateX(Math.PI / 2);
      muzzleGlow.position.set(side * 2.4, -0.16, 3.5);
      this.meshGroup.add(muzzleGlow);
    });

    // ── 5. Stern Dual Heavy Vector Ion Thrusters (-Z) ──
    const thrusterBellMat = new THREE.MeshStandardMaterial({
      color: 0x181c28,
      metalness: 0.95,
      roughness: 0.1
    });

    [-0.65, 0.65].forEach(x => {
      // Cylindrical Engine Nacelle Housing
      const nacelleGeo = new THREE.CylinderGeometry(0.38, 0.44, 1.4, 8);
      nacelleGeo.rotateX(Math.PI / 2);
      const nacelle = new THREE.Mesh(nacelleGeo, this.armorPlateMat);
      nacelle.position.set(x, 0.05, -1.3);
      this.meshGroup.add(nacelle);

      // Exhaust Nozzle Bell
      const nozzleGeo = new THREE.CylinderGeometry(0.34, 0.26, 0.6, 8);
      nozzleGeo.rotateX(Math.PI / 2);
      const nozzle = new THREE.Mesh(nozzleGeo, thrusterBellMat);
      nozzle.position.set(x, 0.05, -1.9);
      this.meshGroup.add(nozzle);

      // Pulsing Interior Ion Shock Diamond
      const flameGeo = new THREE.ConeGeometry(0.24, 1.4, 8);
      flameGeo.rotateX(-Math.PI / 2);
      const flame = new THREE.Mesh(flameGeo, this.thrusterGlowMat);
      flame.position.set(x, 0.05, -2.4);
      this.meshGroup.add(flame);
      this.thrusterMeshes.push(flame);
    });

    // Stern Engine Light
    this.thrusterLight = new THREE.PointLight(0x8800ff, 2.5, 10);
    this.thrusterLight.position.set(0, 0.05, -2.5);
    this.meshGroup.add(this.thrusterLight);
  }

  takeDamage(amount) {
    this.hp -= amount;
    // Flash red / white on hit
    if (this.coreMesh && this.coreMesh.material) {
      this.coreMesh.material.emissive.setHex(0xff0044);
      this.coreMesh.material.emissiveIntensity = 3.5;
      setTimeout(() => {
        if (!this.isDead && this.coreMesh && this.coreMesh.material) {
          this.coreMesh.material.emissive.setHex(0x1a0826);
          this.coreMesh.material.emissiveIntensity = 0.2;
        }
      }, 80);
    }
    if (this.hp <= 0) this.isDead = true;
    return this.isDead;
  }

  destroy() {
    this.scene.remove(this.meshGroup);
    this.meshGroup.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    });
  }

  update(dt, playerPos) {
    this._time += dt;

    // Dogfighting AI — steer toward player with a sinusoidal weave
    const steer = new THREE.Vector3().subVectors(playerPos, this.meshGroup.position);
    steer.z = 0;
    steer.normalize().multiplyScalar(6.5);

    // Dynamic weaving maneuver
    const weave = Math.sin(this._time * 4.0 + this._wobbleOffset) * 3.5;
    steer.x += weave;

    this.velocity.x += (steer.x - this.velocity.x) * 0.08;
    this.velocity.y += (steer.y - this.velocity.y) * 0.08;

    this.meshGroup.position.addScaledVector(this.velocity, dt);

    // Dynamic banking and pitch based on velocity
    this.meshGroup.rotation.z = -this.velocity.x * 0.08;
    this.meshGroup.rotation.x = this.velocity.y * 0.04;

    // Pulsing Eye and Engine Glow Animations
    const pulse = Math.sin(this._time * 8.0);
    if (this.eyeLight) {
      this.eyeLight.intensity = 3.0 + pulse * 1.2;
    }
    if (this.eyeHalo) {
      this.eyeHalo.scale.setScalar(1.0 + pulse * 0.2);
    }

    // Engine flame pulsation
    const flameScale = 1.0 + Math.sin(this._time * 18.0) * 0.25;
    this.thrusterMeshes.forEach(flame => {
      flame.scale.set(flameScale, flameScale, flameScale * 1.2);
    });

    // Weapon firing
    this.fireTimer -= dt;
    let shouldFirePlasma = false;
    if (this.fireTimer <= 0 && this.meshGroup.position.z < 18) {
      this.fireTimer = 0.5 + Math.random() * 0.45;
      shouldFirePlasma = true;
    }

    if (this.meshGroup.position.z > 18) {
      this.isDead = true;
      this.impactedPlanet = true;
    }

    return shouldFirePlasma;
  }
}
