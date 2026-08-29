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

  // Smooth flow lines
  ctx.beginPath();
  ctx.moveTo(16, 16); ctx.bezierCurveTo(64, 48, 192, 48, 240, 16);
  ctx.moveTo(16, 240); ctx.bezierCurveTo(64, 208, 192, 208, 240, 240);
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

/**
 * Creates a continuous, smooth, sculpted aerodynamic lifting-body fuselage for drones.
 */
function createSmoothDroneFuselageGeo() {
  const geom = new THREE.BufferGeometry();
  const zSlices = 20;
  const radSegments = 24;

  const positions = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i <= zSlices; i++) {
    const v = i / zSlices;
    // z ranges from +2.4 (nose oculus) to -2.4 (aft engine)
    const z = 2.4 - v * 4.8;

    let halfWidth, halfHeight, yCenter;
    if (z > 0.8) {
      const t = (z - 0.8) / 1.6;
      halfWidth = THREE.MathUtils.lerp(1.8, 0.45, Math.pow(t, 0.8));
      halfHeight = THREE.MathUtils.lerp(0.9, 0.35, Math.pow(t, 0.8));
      yCenter = THREE.MathUtils.lerp(0.1, 0.05, t);
    } else if (z > -1.0) {
      const t = (z - (-1.0)) / 1.8;
      halfWidth = THREE.MathUtils.lerp(2.2, 1.8, Math.sin(t * Math.PI * 0.5));
      halfHeight = THREE.MathUtils.lerp(1.1, 0.9, Math.sin(t * Math.PI * 0.5));
      yCenter = 0.1;
    } else {
      const t = (z - (-2.4)) / 1.4;
      halfWidth = THREE.MathUtils.lerp(1.4, 2.2, Math.pow(t, 0.7));
      halfHeight = THREE.MathUtils.lerp(0.7, 1.1, Math.pow(t, 0.7));
      yCenter = THREE.MathUtils.lerp(0.0, 0.1, t);
    }

    for (let j = 0; j <= radSegments; j++) {
      const u = j / radSegments;
      const theta = u * Math.PI * 2;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      const chine = Math.pow(Math.abs(cosT), 2.5) * 0.4;
      const x = cosT * (halfWidth + chine);
      const y = yCenter + sinT * halfHeight;

      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }

  for (let i = 0; i < zSlices; i++) {
    for (let j = 0; j < radSegments; j++) {
      const a = i * (radSegments + 1) + j;
      const b = (i + 1) * (radSegments + 1) + j;
      const c = (i + 1) * (radSegments + 1) + (j + 1);
      const d = i * (radSegments + 1) + (j + 1);

      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();

  return geom;
}

export class EnemyDrone {
  constructor(scene, options = {}) {
    this.scene = scene;
    const opt = options || {};

    this.radius = 2.4;
    this.hp = 65;
    this.maxHp = 65;
    this.scoreValue = 350;

    this.meshGroup = new THREE.Group();

    const spawnX = opt.x !== undefined ? opt.x : (Math.random() - 0.5) * 36;
    const spawnY = opt.y !== undefined ? opt.y : (Math.random() - 0.5) * 20;
    const spawnZ = opt.z !== undefined ? opt.z : (-75 - Math.random() * 20);

    this.meshGroup.position.set(spawnX, spawnY, spawnZ);
    this.targetPos = new THREE.Vector3(spawnX, spawnY, 0);
    this.velocity = new THREE.Vector3(
      opt.vx !== undefined ? opt.vx : 0,
      opt.vy !== undefined ? opt.vy : 0,
      opt.vz !== undefined ? opt.vz : (14 + Math.random() * 6)
    );
    this.fireTimer = 1.8 + Math.random() * 1.5;
    this.isDead = false;
    this._time = Math.random() * 10;
    this._wobbleOffset = Math.random() * Math.PI * 2;

    // ── 🧠 Reactive Evasive Dogfighting AI & Flanking Maneuvers ──
    this.aiState = 'CRUISE'; // 'CRUISE', 'EVADING', 'FLANKING_PURSUIT', 'ATTACK_RUN'
    this.evadeTimer = 0;
    this.evadeDirection = new THREE.Vector3();
    this.evadeRollRate = 0;
    this.isEvading = false;
    this.flankAngle = Math.random() * Math.PI * 2;
    this.flankRadius = 22.0 + Math.random() * 14.0;
    this.orbitSpeed = (Math.random() > 0.5 ? 1 : -1) * (1.2 + Math.random() * 0.8);

    this.thrusterMeshes = [];
    this.glowMaterials = [];

    this.buildDroneMesh();
    this.scene.add(this.meshGroup);
  }

  buildDroneMesh() {
    const armorTex = generateDroneArmorTexture();

    // ── High-Definition Smooth PBR Materials (Stage 1 Crimson Magma Fleet) ──
    this.hullMat = new THREE.MeshStandardMaterial({
      color: 0x220c12,
      metalness: 0.9,
      roughness: 0.18,
      bumpMap: armorTex,
      bumpScale: 0.14,
      emissive: 0x3d0810,
      emissiveIntensity: 0.4
    });

    this.armorPlateMat = new THREE.MeshStandardMaterial({
      color: 0x941c28,
      metalness: 0.94,
      roughness: 0.14,
      bumpMap: armorTex,
      bumpScale: 0.16,
      emissive: 0x600a14,
      emissiveIntensity: 0.5
    });

    this.trimMat = new THREE.MeshStandardMaterial({
      color: 0xff4400,
      metalness: 0.88,
      roughness: 0.12,
      emissive: 0x992200,
      emissiveIntensity: 0.6
    });

    this.titaniumTrimMat = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      metalness: 0.98,
      roughness: 0.08,
      emissive: 0x552200,
      emissiveIntensity: 0.35
    });

    this.redGlowMat = new THREE.MeshBasicMaterial({
      color: 0xff0033,
      transparent: true,
      opacity: 1.0
    });
    this.glowMaterials.push(this.redGlowMat);

    this.accentGlowMat = new THREE.MeshBasicMaterial({
      color: 0xff5500,
      transparent: true,
      opacity: 0.95
    });
    this.glowMaterials.push(this.accentGlowMat);

    this.thrusterGlowMat = new THREE.MeshBasicMaterial({
      color: 0xff3300,
      transparent: true,
      opacity: 0.95
    });
    this.glowMaterials.push(this.thrusterGlowMat);

    // Dedicated Key Spotlight
    this.droneKeyLight = new THREE.PointLight(0xaad4ff, 3.5, 20);
    this.droneKeyLight.position.set(0, 3.0, 4.0);
    this.meshGroup.add(this.droneKeyLight);

    // ── 1. Smooth Continuous Lifting-Body Core Fuselage ──
    const coreGeo = createSmoothDroneFuselageGeo();
    this.coreMesh = new THREE.Mesh(coreGeo, this.hullMat);
    this.meshGroup.add(this.coreMesh);

    // ── 2. Integrated Predator Sensor Oculus (Smoothly embedded at nose) ──
    const oculusHousingGeo = new THREE.CapsuleGeometry(0.35, 0.8, 8, 16);
    oculusHousingGeo.rotateZ(Math.PI / 2);
    const oculusHousing = new THREE.Mesh(oculusHousingGeo, this.armorPlateMat);
    oculusHousing.position.set(0, 0.15, 2.0);
    this.meshGroup.add(oculusHousing);

    const eyeGeo = new THREE.CapsuleGeometry(0.18, 0.6, 6, 12);
    eyeGeo.rotateZ(Math.PI / 2);
    this.eyeMesh = new THREE.Mesh(eyeGeo, this.redGlowMat);
    this.eyeMesh.position.set(0, 0.15, 2.3);
    this.meshGroup.add(this.eyeMesh);

    this.eyeLight = new THREE.PointLight(0xff0044, 3.0, 12);
    this.eyeLight.position.set(0, 0.15, 2.5);
    this.meshGroup.add(this.eyeLight);

    // ── 3. Smooth Swept Delta Wings with Rounded Leading Edges ──
    this.cannons = [];

    [1, -1].forEach((side) => {
      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, 0.8);
      wingShape.bezierCurveTo(side * 1.5, 0.6, side * 3.0, -0.2, side * 3.4, -0.8);
      wingShape.bezierCurveTo(side * 3.5, -1.1, side * 3.2, -1.3, side * 2.8, -1.2);
      wingShape.bezierCurveTo(side * 1.8, -0.8, side * 0.8, -0.6, 0, -0.8);
      wingShape.closePath();

      const extrudeSettings = {
        depth: 0.18,
        bevelEnabled: true,
        bevelSegments: 3,
        steps: 1,
        bevelSize: 0.08,
        bevelThickness: 0.08
      };
      const wingGeo = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);
      wingGeo.rotateX(-Math.PI / 2);
      const wingMesh = new THREE.Mesh(wingGeo, this.hullMat);
      wingMesh.position.set(0, 0.05, 0);
      this.meshGroup.add(wingMesh);

      // Smooth Rounded Winglet
      const wingletGeo = new THREE.CapsuleGeometry(0.12, 1.2, 6, 12);
      wingletGeo.rotateX(Math.PI / 2);
      const winglet = new THREE.Mesh(wingletGeo, this.trimMat);
      winglet.position.set(side * 3.3, 0.25, -0.8);
      winglet.rotation.z = side * 0.15;
      this.meshGroup.add(winglet);

      // Destructible Plasma Cannon Pod (Rounded Capsule Housing)
      const gunPodGroup = new THREE.Group();
      gunPodGroup.position.set(side * 2.2, -0.15, 0.8);

      const cannonHousing = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.24, 1.6, 6, 12),
        this.armorPlateMat
      );
      cannonHousing.rotation.x = Math.PI / 2;
      gunPodGroup.add(cannonHousing);

      const barrelGeo = new THREE.CylinderGeometry(0.09, 0.12, 1.8, 8);
      barrelGeo.rotateX(Math.PI / 2);
      const barrel = new THREE.Mesh(barrelGeo, this.trimMat);
      barrel.position.set(0, 0, 0.9);
      gunPodGroup.add(barrel);

      const muzzleGlow = new THREE.Mesh(
        new THREE.RingGeometry(0.1, 0.2, 8),
        this.redGlowMat
      );
      muzzleGlow.position.set(0, 0, 1.85);
      gunPodGroup.add(muzzleGlow);

      this.meshGroup.add(gunPodGroup);
      this.cannons.push({
        id: side,
        side: side === 1 ? 'right' : 'left',
        mesh: gunPodGroup,
        hp: 30,
        maxHp: 30,
        isDead: false
      });
    });

    // ── 4. Smooth Rounded Twin Exhaust Thruster Bells ──
    [-0.65, 0.65].forEach(x => {
      const bellGeo = new THREE.CylinderGeometry(0.35, 0.5, 0.9, 16);
      bellGeo.rotateX(Math.PI / 2);
      const bell = new THREE.Mesh(bellGeo, this.trimMat);
      bell.position.set(x, 0.05, -2.4);
      this.meshGroup.add(bell);

      const flameGeo = new THREE.ConeGeometry(0.4, 2.0, 16);
      flameGeo.rotateX(-Math.PI / 2);
      const flame = new THREE.Mesh(flameGeo, this.thrusterGlowMat);
      flame.position.set(x, 0.05, -3.3);
      this.meshGroup.add(flame);
      this.thrusterMeshes.push(flame);
    });
  }

  takeDamage(amount) {
    if (this.isDead) return true;
    this.hp -= amount;
    const ratio = Math.max(0.0, Math.min(1.0, 1.0 - (this.hp / (this.maxHp || 40))));
    this.meshGroup.traverse((child) => {
      if (child.isMesh && child.material && child.material.userData && child.material.userData.uDamageRatio) {
        child.material.userData.uDamageRatio.value = ratio;
      }
    });
    if (this.hp <= 0) {
      this.isDead = true;
      return true;
    }
    return false;
  }

  destroy() {
    this.isDead = true;
    if (this.meshGroup && this.meshGroup.parent) {
      this.meshGroup.parent.remove(this.meshGroup);
    }
    this.meshGroup.traverse(c => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    });
  }

  update(dt, playerPos) {
    if (this.isDead) return false;
    this._time += dt;

    const pPos = playerPos || new THREE.Vector3(0, 0, 0);
    const toPlayer = pPos.clone().sub(this.meshGroup.position);
    const distToPlayer = toPlayer.length();

    // ── 1. Reactive Threat Detection & Evasive Trigger ──
    if (distToPlayer < 75.0 && this.aiState === 'CRUISE') {
      // Check if player is pointing weapons directly at this drone (threat lock)
      const lateralDist = Math.hypot(pPos.x - this.meshGroup.position.x, pPos.y - this.meshGroup.position.y);
      if (lateralDist < 8.0 && Math.random() < 0.08) {
        // Break lock! Trigger evasive high-G barrel roll
        this.aiState = 'EVADING';
        this.evadeTimer = 0.75 + Math.random() * 0.45;
        this.evadeRollRate = (Math.random() > 0.5 ? 1 : -1) * (Math.PI * 3.2);
        const breakDir = Math.random() > 0.5 ? 1 : -1;
        this.evadeDirection.set(
          breakDir * (25.0 + Math.random() * 15.0),
          (Math.random() - 0.5) * 20.0,
          (Math.random() - 0.5) * 10.0
        );
        this.isEvading = true;
      } else if (distToPlayer < 45.0 && Math.random() < 0.04) {
        // Switch to Flanking Pursuit dogfight circle
        this.aiState = 'FLANKING_PURSUIT';
      }
    }

    // ── 2. AI State Execution ──
    if (this.aiState === 'EVADING') {
      this.evadeTimer -= dt;
      this.meshGroup.position.addScaledVector(this.evadeDirection, dt);
      this.meshGroup.position.z += this.velocity.z * 0.5 * dt;
      this.meshGroup.rotation.z += this.evadeRollRate * dt;
      this.meshGroup.rotation.x = THREE.MathUtils.lerp(this.meshGroup.rotation.x, (this.evadeDirection.y > 0 ? 0.35 : -0.35), dt * 4.0);

      if (this.evadeTimer <= 0) {
        this.isEvading = false;
        this.aiState = Math.random() < 0.6 ? 'FLANKING_PURSUIT' : 'CRUISE';
      }
    } else if (this.aiState === 'FLANKING_PURSUIT') {
      // Flanking Dogfight: Circling around the player's lateral flank and matching Z-depth
      this.flankAngle += this.orbitSpeed * dt;
      const targetX = pPos.x + Math.cos(this.flankAngle) * this.flankRadius;
      const targetY = pPos.y + Math.sin(this.flankAngle) * (this.flankRadius * 0.65);
      const targetZ = pPos.z - 15.0 + Math.sin(this.flankAngle * 1.5) * 8.0;

      this.meshGroup.position.x = THREE.MathUtils.lerp(this.meshGroup.position.x, targetX, dt * 2.2);
      this.meshGroup.position.y = THREE.MathUtils.lerp(this.meshGroup.position.y, targetY, dt * 2.2);
      this.meshGroup.position.z = THREE.MathUtils.lerp(this.meshGroup.position.z, targetZ, dt * 1.8);

      // Aim nose toward player
      const aimDir = pPos.clone().sub(this.meshGroup.position).normalize();
      const targetYaw = Math.atan2(aimDir.x, aimDir.z) + Math.PI;
      const targetPitch = Math.asin(Math.max(-1, Math.min(1, aimDir.y)));
      this.meshGroup.rotation.y = THREE.MathUtils.lerp(this.meshGroup.rotation.y, targetYaw, dt * 3.5);
      this.meshGroup.rotation.x = THREE.MathUtils.lerp(this.meshGroup.rotation.x, -targetPitch, dt * 3.5);
      this.meshGroup.rotation.z = THREE.MathUtils.lerp(this.meshGroup.rotation.z, -aimDir.x * 0.45, dt * 3.0);
    } else {
      // Standard dynamic cruising movement
      this.meshGroup.position.addScaledVector(this.velocity, dt);
      this.meshGroup.position.x += Math.sin(this._time * 2.5 + this._wobbleOffset) * 2.5 * dt;
      this.meshGroup.rotation.z = Math.sin(this._time * 2.5 + this._wobbleOffset) * 0.2;
      this.meshGroup.rotation.x = THREE.MathUtils.lerp(this.meshGroup.rotation.x, 0, dt * 2.0);
      this.meshGroup.rotation.y = THREE.MathUtils.lerp(this.meshGroup.rotation.y, 0, dt * 2.0);
    }

    // Pulse Thruster Flames
    this.thrusterMeshes.forEach((flame, idx) => {
      const s = 1.0 + Math.sin(this._time * 20.0 + idx) * 0.25;
      flame.scale.set(s, s, s * (this.isEvading ? 1.8 : 1.2));
    });

    // Firing Loop
    this.fireTimer -= dt;
    if (this.fireTimer <= 0 && playerPos) {
      this.fireTimer = (this.aiState === 'FLANKING_PURSUIT' ? 0.9 : 1.2) + Math.random() * 0.7;
      const activeCannons = this.cannons.filter(c => !c.isDead);
      const outLasers = [];
      activeCannons.forEach(c => {
        outLasers.push(c.mesh.getWorldPosition(new THREE.Vector3()));
      });
      return outLasers.length > 0 ? outLasers : [this.meshGroup.position.clone()];
    }

    return false;
  }
}
