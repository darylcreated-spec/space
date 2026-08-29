import * as THREE from 'three';

// Procedural normal map generator for radar-absorbent stealth RAM plating
function generateStealthArmorTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1c0a10';
  ctx.fillRect(0, 0, 512, 512);

  // Carbon hex micro-weave
  ctx.strokeStyle = '#3d0c16';
  ctx.lineWidth = 1.0;
  for (let x = 0; x < 512; x += 16) {
    for (let y = 0; y < 512; y += 16) {
      ctx.strokeRect(x, y, 14, 14);
    }
  }

  // Smooth flow lines
  ctx.strokeStyle = '#5a1222';
  ctx.lineWidth = 1.8;
  for (let y = 32; y < 512; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(170, y - 10, 340, y + 10, 512, y);
    ctx.stroke();
  }

  // Magma circuit conduits
  ctx.strokeStyle = '#ff2200';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(64, 0); ctx.lineTo(64, 200); ctx.lineTo(180, 256); ctx.lineTo(180, 512);
  ctx.moveTo(448, 0); ctx.lineTo(448, 200); ctx.lineTo(332, 256); ctx.lineTo(332, 512);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * Continuous Smooth Aerodynamic Lifting-Body for Phantom Stealth Fighter
 */
function createSmoothStealthFuselageGeo() {
  const geom = new THREE.BufferGeometry();
  const zSlices = 24;
  const radSegments = 28;

  const positions = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i <= zSlices; i++) {
    const v = i / zSlices;
    // z ranges from +3.2 (nose prow) to -2.8 (aft engine)
    const z = 3.2 - v * 6.0;

    let halfWidth, halfHeight, yCenter;
    if (z > 1.2) {
      const t = (z - 1.2) / 2.0;
      halfWidth = THREE.MathUtils.lerp(1.6, 0.35, Math.pow(t, 0.85));
      halfHeight = THREE.MathUtils.lerp(0.85, 0.25, Math.pow(t, 0.85));
      yCenter = THREE.MathUtils.lerp(0.12, 0.04, t);
    } else if (z > -1.2) {
      const t = (z - (-1.2)) / 2.4;
      halfWidth = THREE.MathUtils.lerp(2.2, 1.6, Math.sin(t * Math.PI * 0.5));
      halfHeight = THREE.MathUtils.lerp(0.95, 0.85, Math.sin(t * Math.PI * 0.5));
      yCenter = 0.12;
    } else {
      const t = (z - (-2.8)) / 1.6;
      halfWidth = THREE.MathUtils.lerp(1.5, 2.2, Math.pow(t, 0.7));
      halfHeight = THREE.MathUtils.lerp(0.65, 0.95, Math.pow(t, 0.7));
      yCenter = THREE.MathUtils.lerp(0.04, 0.12, t);
    }

    for (let j = 0; j <= radSegments; j++) {
      const u = j / radSegments;
      const theta = u * Math.PI * 2;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      const chine = Math.pow(Math.abs(cosT), 2.5) * 0.5;
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
    this.state = 'CLOAKED_APPROACH';
    this.stateTimer = 2.5;
    this.cloakOpacity = 0.12;
    this.targetCloakOpacity = 0.12;
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

    // 1. Primary Stealth RAM Composite
    this.hullMat = new THREE.MeshStandardMaterial({
      color: 0x481820,
      map: this.armorTexture,
      metalness: 0.92,
      roughness: 0.18,
      transparent: true,
      opacity: this.cloakOpacity,
      blending: THREE.NormalBlending
    });

    // 2. Secondary Titanium Edge Armor
    this.titaniumMat = new THREE.MeshStandardMaterial({
      color: 0xa83848,
      metalness: 0.96,
      roughness: 0.12,
      transparent: true,
      opacity: this.cloakOpacity
    });

    // 3. Magma Plasma Conduit
    this.conduitMat = new THREE.MeshStandardMaterial({
      color: 0x8c1822,
      emissive: 0xff2200,
      emissiveIntensity: 2.2,
      metalness: 0.85,
      roughness: 0.2,
      transparent: true,
      opacity: this.cloakOpacity
    });

    // 4. Optical Oculus Material
    this.oculusMat = new THREE.MeshBasicMaterial({
      color: 0xff1133,
      transparent: true,
      opacity: this.cloakOpacity
    });

    // 5. Thruster Plasma Glow
    this.glowMat = new THREE.MeshBasicMaterial({
      color: 0xff4400,
      transparent: true,
      opacity: this.cloakOpacity,
      blending: THREE.AdditiveBlending
    });

    // ── 1. Smooth Continuous Lifting-Body Fuselage ──
    const fuselageGeo = createSmoothStealthFuselageGeo();
    this.fuselageMesh = new THREE.Mesh(fuselageGeo, this.hullMat);
    this.meshGroup.add(this.fuselageMesh);

    // ── 2. Smooth Curved Cockpit Canopy ──
    const canopyGeo = new THREE.CapsuleGeometry(0.35, 1.4, 8, 16);
    canopyGeo.rotateX(Math.PI / 2);
    const canopy = new THREE.Mesh(canopyGeo, this.titaniumMat);
    canopy.position.set(0, 0.45, 0.2);
    this.meshGroup.add(canopy);

    // ── 3. Smooth Swept Delta Wings with Rounded Leading Edges ──
    [-1, 1].forEach(side => {
      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, 0.4);
      wingShape.bezierCurveTo(side * 1.6, 0.2, side * 3.2, 1.2, side * 3.6, 0.8);
      wingShape.bezierCurveTo(side * 3.8, 0.5, side * 3.5, 0.1, side * 3.2, -0.2);
      wingShape.bezierCurveTo(side * 2.0, -0.8, side * 0.8, -1.4, 0, -1.8);
      wingShape.closePath();

      const extrudeSettings = {
        depth: 0.14,
        bevelEnabled: true,
        bevelSegments: 3,
        steps: 1,
        bevelSize: 0.06,
        bevelThickness: 0.06
      };
      const wingGeo = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);
      wingGeo.rotateX(-Math.PI / 2);
      const wing = new THREE.Mesh(wingGeo, this.hullMat);
      wing.position.set(0, 0.05, 0);
      this.meshGroup.add(wing);

      // Glowing Wing Edge Conduit
      const edgeGeo = new THREE.CylinderGeometry(0.06, 0.06, 3.2, 8);
      edgeGeo.rotateZ(Math.PI / 2);
      edgeGeo.rotateY(side * -0.35);
      const edge = new THREE.Mesh(edgeGeo, this.conduitMat);
      edge.position.set(side * 2.0, 0.12, 0.3);
      this.meshGroup.add(edge);
    });

    // ── 4. Smooth Rounded Twin Thruster Bells ──
    [-0.55, 0.55].forEach(x => {
      const bellGeo = new THREE.CylinderGeometry(0.32, 0.44, 0.8, 16);
      bellGeo.rotateX(Math.PI / 2);
      const bell = new THREE.Mesh(bellGeo, this.titaniumMat);
      bell.position.set(x, 0.08, -2.8);
      this.meshGroup.add(bell);

      const flameGeo = new THREE.ConeGeometry(0.36, 1.8, 16);
      flameGeo.rotateX(-Math.PI / 2);
      const flame = new THREE.Mesh(flameGeo, this.glowMat);
      flame.position.set(x, 0.08, -3.6);
      this.meshGroup.add(flame);
      this.thrusters.push(flame);
    });

    // Integrated Nose Oculus Lens
    const oculusGeo = new THREE.SphereGeometry(0.22, 16, 16);
    const oculus = new THREE.Mesh(oculusGeo, this.oculusMat);
    oculus.position.set(0, 0.12, 3.1);
    this.meshGroup.add(oculus);
  }

  takeDamage(amount) {
    if (this.isDead) return;
    this.hp -= amount;

    // Disrupt cloak on hit
    if (this.isCloaked) {
      this.isCloaked = false;
      this.state = 'UNCLOAK_AMBUSH';
      this.stateTimer = 3.0;
      this.targetCloakOpacity = 1.0;
    }

    if (this.hp <= 0) {
      this.isDead = true;
      if (this.particleManager) {
        this.particleManager.createExplosion(this.meshGroup.position, 0xff0055, 120, 3.5);
      }
    }
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

    // Smooth Cloak Transition
    this.cloakOpacity = THREE.MathUtils.lerp(this.cloakOpacity, this.targetCloakOpacity, dt * 5.0);
    [this.hullMat, this.titaniumMat, this.conduitMat, this.oculusMat, this.glowMat].forEach(m => {
      if (m) m.opacity = this.cloakOpacity;
    });

    // Pulse Thruster Flames
    this.thrusters.forEach((th, i) => {
      const s = (0.8 + Math.sin(Date.now() * 0.015 + i) * 0.2) * (this.isCloaked ? 0.3 : 1.0);
      th.scale.set(s, s, s);
    });

    // AI Flight State Machine
    this.stateTimer -= dt;

    if (this.state === 'CLOAKED_APPROACH') {
      this.targetCloakOpacity = 0.12;
      this.meshGroup.position.z += this.speed * dt;
      if (playerPos) {
        this.meshGroup.position.x += Math.sin(Date.now() * 0.003) * 8.0 * dt;
      }
      if (this.stateTimer <= 0 || this.meshGroup.position.z >= -35) {
        this.state = 'UNCLOAK_AMBUSH';
        this.stateTimer = 2.8;
        this.targetCloakOpacity = 1.0;
        this.isCloaked = false;
        if (this.particleManager) {
          this.particleManager.createExplosion(this.meshGroup.position, 0xff0055, 30, 2.0);
        }
      }
    } else if (this.state === 'UNCLOAK_AMBUSH') {
      this.targetCloakOpacity = 1.0;
      this.meshGroup.position.z += this.speed * 0.6 * dt;

      // Ambush firing
      this.fireTimer -= dt;
      if (this.fireTimer <= 0 && this.burstCount < this.maxBurst) {
        this.fireTimer = this.fireInterval;
        this.burstCount++;
        const p = this.meshGroup.position.clone();
        return [
          new THREE.Vector3(p.x - 1.2, p.y, p.z + 1.0),
          new THREE.Vector3(p.x + 1.2, p.y, p.z + 1.0)
        ];
      }

      if (this.stateTimer <= 0) {
        this.state = 'EVASIVE_DASH';
        this.stateTimer = 2.0;
        this.burstCount = 0;
      }
    } else if (this.state === 'EVASIVE_DASH') {
      this.meshGroup.position.x += this.strafeDirection * 22.0 * dt;
      this.meshGroup.rotation.z = this.strafeDirection * -0.45;
      this.meshGroup.position.z += this.speed * 0.8 * dt;

      if (this.stateTimer <= 0) {
        this.state = 'RE_CLOAK';
        this.stateTimer = 3.0;
        this.targetCloakOpacity = 0.12;
        this.isCloaked = true;
        this.strafeDirection *= -1;
      }
    } else if (this.state === 'RE_CLOAK') {
      this.meshGroup.rotation.z = THREE.MathUtils.lerp(this.meshGroup.rotation.z, 0, dt * 3.0);
      this.meshGroup.position.z += this.speed * dt;
      if (this.stateTimer <= 0) {
        this.state = 'CLOAKED_APPROACH';
        this.stateTimer = 3.5;
      }
    }

    // Boundary Check: If stealth fighter flies past player (+Z), warp re-enter from deep space flank
    if (this.meshGroup.position.z > 26) {
      this.meshGroup.position.z = -80 - Math.random() * 15;
      this.meshGroup.position.x = (Math.random() - 0.5) * 32;
      this.state = 'CLOAKED_APPROACH';
      this.stateTimer = 3.0;
      this.isCloaked = true;
      this.targetCloakOpacity = 0.12;
    }

    return false;
  }
}
