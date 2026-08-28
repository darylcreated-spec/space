import * as THREE from 'three';

/**
 * Procedural Obsidian-Crimson Titanium Composite Texture with Smooth Specular Maps
 */
function generateSmoothCrimsonTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Deep obsidian-crimson alloy gradient base
  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, '#1c080e');
  grad.addColorStop(0.5, '#2e0a14');
  grad.addColorStop(1, '#18060a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Carbon-fiber hexagonal nano-mesh in subtle scarlet
  ctx.strokeStyle = '#3d0a16';
  ctx.lineWidth = 1.2;
  const hexRadius = 12;
  const h = hexRadius * Math.sqrt(3);

  for (let y = -h; y < 512 + h; y += h) {
    for (let x = -hexRadius * 3; x < 512 + hexRadius * 3; x += hexRadius * 3) {
      drawHex(ctx, x, y, hexRadius);
      drawHex(ctx, x + hexRadius * 1.5, y + h / 2, hexRadius);
    }
  }

  // Smooth aerodynamic flow lines along fuselage
  ctx.strokeStyle = '#5a1222';
  ctx.lineWidth = 1.8;
  for (let i = 32; i < 512; i += 48) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.bezierCurveTo(170, i - 12, 340, i + 12, 512, i);
    ctx.stroke();
  }

  // Glowing scarlet & magma-orange energy circuit conduits
  ctx.strokeStyle = '#ff1744';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(40, 0); ctx.lineTo(40, 160); ctx.lineTo(140, 240); ctx.lineTo(140, 512);
  ctx.moveTo(472, 0); ctx.lineTo(472, 160); ctx.lineTo(372, 240); ctx.lineTo(372, 512);
  ctx.stroke();

  ctx.strokeStyle = '#ff5500';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, 100); ctx.lineTo(120, 100); ctx.lineTo(240, 220); ctx.lineTo(512, 220);
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

/**
 * Creates a continuous, smooth, sculpted aerodynamic lifting-body fuselage.
 * The nose seamlessly flows into the main hull, dorsal bridge spine, and aft engine housing.
 */
function createSmoothLiftingBodyGeometry() {
  const geom = new THREE.BufferGeometry();
  const zSlices = 36;
  const radSegments = 36;

  const positions = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i <= zSlices; i++) {
    const v = i / zSlices;
    // z ranges from +32.0 (nose tip) down to -32.0 (aft engine deck)
    const z = 32.0 - v * 64.0;

    // Smooth aerodynamic profile curves along length
    let halfWidth, halfHeight, yCenter;

    if (z > 20.0) {
      // 1. Nose prow tapering to smooth rounded tip
      const t = (z - 20.0) / 12.0; // 0 to 1
      halfWidth  = THREE.MathUtils.lerp(7.5, 1.8, Math.pow(t, 0.85));
      halfHeight = THREE.MathUtils.lerp(3.6, 1.4, Math.pow(t, 0.85));
      yCenter    = THREE.MathUtils.lerp(0.5, 0.0, t);
    } else if (z > -10.0) {
      // 2. Forward & Mid Fuselage: Expanding into broad aerodynamic lifting body
      const t = (z - (-10.0)) / 30.0; // 0 to 1
      halfWidth  = THREE.MathUtils.lerp(18.5, 7.5, Math.sin(t * Math.PI * 0.5));
      halfHeight = THREE.MathUtils.lerp(5.5, 3.6, Math.sin(t * Math.PI * 0.5));
      yCenter    = THREE.MathUtils.lerp(1.2, 0.5, t);
    } else {
      // 3. Aft Fuselage & Engine Bay: Streamlined tapering to aft thrusters
      const t = (z - (-32.0)) / 22.0; // 0 to 1
      halfWidth  = THREE.MathUtils.lerp(12.0, 18.5, Math.pow(t, 0.7));
      halfHeight = THREE.MathUtils.lerp(4.2, 5.5, Math.pow(t, 0.7));
      yCenter    = THREE.MathUtils.lerp(0.8, 1.2, t);
    }

    for (let j = 0; j <= radSegments; j++) {
      const u = j / radSegments;
      const theta = u * Math.PI * 2;

      // Sculpted cross-section with dorsal ridge and aerodynamic side chines
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      // Add dorsal spine crest at top and flatter bottom for lifting-body aerodynamics
      const dorsalBoost = (sinT > 0) ? (Math.pow(sinT, 2.5) * 1.5) : 0;
      const chineBoost  = Math.pow(Math.abs(cosT), 3.0) * (z > -15 && z < 18 ? 2.5 : 0.8);

      const x = cosT * (halfWidth + chineBoost);
      const y = yCenter + sinT * (halfHeight + dorsalBoost);

      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }

  // Generate quad indices
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

/**
 * Creates smooth aerodynamic swept delta wings with rounded leading edges.
 */
function createSmoothWingGeometry(side = 1) {
  const shape = new THREE.Shape();

  // Root wing fillet -> Swept leading edge -> Rounded wingtip -> Trailing edge
  shape.moveTo(0, 16);
  shape.bezierCurveTo(side * 8, 12, side * 18, 0, side * 22, -4);
  shape.bezierCurveTo(side * 24, -6, side * 24, -10, side * 21, -12); // Rounded wingtip
  shape.bezierCurveTo(side * 14, -10, side * 6, -14, 0, -18);
  shape.bezierCurveTo(0, -10, 0, 8, 0, 16);

  const extrudeSettings = {
    steps: 2,
    depth: 1.8,
    bevelEnabled: true,
    bevelThickness: 0.8,
    bevelSize: 0.8,
    bevelOffset: 0,
    bevelSegments: 4
  };

  const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geom.rotateX(Math.PI / 2);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Creates smooth rounded vertical stabilizer tail fins.
 */
function createSmoothTailFinGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0.5, 4, 1.2, 9, 2.2, 12);
  shape.bezierCurveTo(3.2, 13, 5.0, 12.5, 5.5, 11);
  shape.bezierCurveTo(4.8, 6, 4.0, 2, 3.2, 0);
  shape.closePath();

  const extrudeSettings = {
    steps: 2,
    depth: 0.9,
    bevelEnabled: true,
    bevelThickness: 0.4,
    bevelSize: 0.4,
    bevelSegments: 3
  };

  const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geom.rotateY(Math.PI / 2);
  geom.computeVertexNormals();
  return geom;
}

// ============================================================
// FINAL APEX BOSS — Leviathan Command Mothership "Battle Monster"
// AAA Reddish Sculpted Dreadnought:
// - Seamless Sculpted Aerodynamic Lifting-Body Hull (Continuous Flowing Nose Prow)
// - Smooth Swept Delta Wings with Rounded Leading Edges & Wing Fillets
// - Integrated Nose Mega-Laser Emitter Lens & Magnetic Induction Shroud
// - Twin Rounded Canted Stabilizer Tails & Ventral Keel Sponsons
// - Quad Streamlined Rocket Thrusters with Burning Red/Gold Afterburner Cones
// ============================================================
export class CommandMothership {
  constructor(scene, particleManager, spawnZ = -140) {
    this.scene = scene;
    this.particleManager = particleManager;

    this.meshGroup = new THREE.Group();
    this.meshGroup.position.set(0, 0, spawnZ);

    // -- Boss Telemetry & Stats --
    this.coreHp = 7500;
    this.maxCoreHp = 7500;
    this.hitRadius = 48.0;
    this.radius = 48.0;
    this.isDead = false;
    this.scoreValue = 100000;
    this.bossTitle = "LEVIATHAN CRIMSON DREADNOUGHT // BATTLE MONSTER";

    this.targetZ = -68;
    this.speed = 10.0;
    this._time = 0;
    this.phase = 1;

    // ── 1. Dual Port & Starboard Flank Shield Generators ──
    this.hasPlasmaShield = true;
    this.shieldGenerators = [
      { id: 0, name: 'PORT WING SHIELD GENERATOR',      relPos: new THREE.Vector3(-21.0, 1.2, 2.0), hp: 1600, maxHp: 1600, isDead: false, mesh: null, ringMesh: null, reticle: null },
      { id: 1, name: 'STARBOARD WING SHIELD GENERATOR', relPos: new THREE.Vector3( 21.0, 1.2, 2.0), hp: 1600, maxHp: 1600, isDead: false, mesh: null, ringMesh: null, reticle: null },
    ];

    // ── 2. 4 Heavy Rotating Homing Missile Turret Pods ──
    this.missilePods = [
      { id: 0, name: 'PORT DORSAL MISSILE POD',     relPos: new THREE.Vector3(-11.0,  5.8, -4.0), hp: 950, maxHp: 950, isDead: false, mesh: null, turretGroup: null, reticle: null },
      { id: 1, name: 'STARBOARD DORSAL MISSILE POD', relPos: new THREE.Vector3( 11.0,  5.8, -4.0), hp: 950, maxHp: 950, isDead: false, mesh: null, turretGroup: null, reticle: null },
      { id: 2, name: 'PORT VENTRAL MISSILE POD',    relPos: new THREE.Vector3(-12.0, -4.5,  6.0), hp: 950, maxHp: 950, isDead: false, mesh: null, turretGroup: null, reticle: null },
      { id: 3, name: 'STARBOARD VENTRAL MISSILE POD',relPos: new THREE.Vector3( 12.0, -4.5,  6.0), hp: 950, maxHp: 950, isDead: false, mesh: null, turretGroup: null, reticle: null },
    ];

    // ── 3. 6 Heavy Dual-Railgun Batteries ──
    this.turrets = [
      { id: 0, name: 'PORT NOSE RAILGUN',       relPos: new THREE.Vector3(-6.5,  2.5,  16.0), hp: 850, maxHp: 850, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 1, name: 'STARBOARD NOSE RAILGUN',  relPos: new THREE.Vector3( 6.5,  2.5,  16.0), hp: 850, maxHp: 850, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 2, name: 'PORT MID WING RAILGUN',   relPos: new THREE.Vector3(-18.0, 1.5,  -6.0), hp: 850, maxHp: 850, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 3, name: 'STARBOARD MID RAILGUN',   relPos: new THREE.Vector3( 18.0, 1.5,  -6.0), hp: 850, maxHp: 850, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 4, name: 'DORSAL CITADEL RAILGUN',  relPos: new THREE.Vector3(-5.5,  7.2, -16.0), hp: 900, maxHp: 900, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 5, name: 'DORSAL CITADEL STARBOARD',relPos: new THREE.Vector3( 5.5,  7.2, -16.0), hp: 900, maxHp: 900, isDead: false, mesh: null, barrelGroup: null, reticle: null },
    ];

    // ── 4. Timers for Attacks ──
    this.noseLaserChargeTimer = 3.0;
    this.railgunFireTimer = 1.0;
    this.missileFireTimer = 2.5;
    this.stealthLaunchTimer = 4.0;
    this.flankSwayTimer = 0;

    this.reticleMeshes = [];
    this.engineThrusters = [];

    this._build();
    this.scene.add(this.meshGroup);
  }

  _build() {
    const hullTex = generateSmoothCrimsonTexture();

    // ── AAA Smooth PBR Materials Palette ──
    const smoothCrimsonMat = new THREE.MeshStandardMaterial({
      color: 0x3d0e18,
      map: hullTex,
      roughness: 0.18,
      metalness: 0.95,
      emissive: 0x1a060a,
      emissiveIntensity: 0.45
    });

    const darkAlloyMat = new THREE.MeshStandardMaterial({
      color: 0x14060a,
      roughness: 0.28,
      metalness: 0.94
    });

    const glowScarletMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });
    const glowMagmaMat = new THREE.MeshBasicMaterial({ color: 0xff5500 });

    // ── 1. Seamless Continuous Sculpted Lifting-Body Fuselage ──
    const hullGeo = createSmoothLiftingBodyGeometry();
    this.hullMesh = new THREE.Mesh(hullGeo, smoothCrimsonMat);
    this.meshGroup.add(this.hullMesh);

    // ── 2. Integrated Nose Mega-Laser Aperture (Smoothly carved into nose prow) ──
    const noseLensGeo = new THREE.SphereGeometry(1.6, 24, 24);
    this.noseLensMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });
    this.noseLensMesh = new THREE.Mesh(noseLensGeo, this.noseLensMat);
    this.noseLensMesh.position.set(0, 0.3, 31.5);
    this.meshGroup.add(this.noseLensMesh);

    // Magnetic Shroud Ring around Nose Lens
    const noseRingGeo = new THREE.TorusGeometry(2.1, 0.35, 12, 32);
    this.noseFocusRing = new THREE.Mesh(noseRingGeo, glowMagmaMat);
    this.noseFocusRing.position.set(0, 0.3, 30.5);
    this.meshGroup.add(this.noseFocusRing);

    // ── 3. Smooth Swept Delta Wings (Blended directly into lateral chines) ──
    [-1, 1].forEach(side => {
      const wingGeo = createSmoothWingGeometry(side);
      const wing = new THREE.Mesh(wingGeo, smoothCrimsonMat);
      wing.position.set(side * 14.0, 0.2, 0);
      this.meshGroup.add(wing);

      // Smooth Rounded Wingtip Pod
      const tipGeo = new THREE.CapsuleGeometry(1.2, 14, 8, 16);
      tipGeo.rotateX(Math.PI / 2);
      const wingTip = new THREE.Mesh(tipGeo, darkAlloyMat);
      wingTip.position.set(side * 28.5, 0.4, -4);
      this.meshGroup.add(wingTip);

      // Glowing Leading-Edge Scarlet Energy Conduit
      const edgeGeo = new THREE.CylinderGeometry(0.22, 0.22, 28, 8);
      edgeGeo.rotateZ(Math.PI / 2);
      edgeGeo.rotateY(side * 0.45);
      const edge = new THREE.Mesh(edgeGeo, glowScarletMat);
      edge.position.set(side * 20.0, 0.6, 2.0);
      this.meshGroup.add(edge);

      // Catapult Launch Rails for Stealth Fighters
      const railGeo = new THREE.BoxGeometry(2.0, 0.8, 18);
      const rail = new THREE.Mesh(railGeo, darkAlloyMat);
      rail.position.set(side * 12.5, 2.2, 4);
      this.meshGroup.add(rail);

      const railGlow = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 16), glowMagmaMat);
      railGlow.position.set(side * 12.5, 2.7, 4);
      this.meshGroup.add(railGlow);
    });

    // ── 4. Twin Smooth Rounded Canted Dorsal Stabilizer Tails ──
    [-1, 1].forEach(side => {
      const tailGeo = createSmoothTailFinGeometry();
      const tail = new THREE.Mesh(tailGeo, smoothCrimsonMat);
      tail.position.set(side * 6.5, 3.5, -16.0);
      tail.rotation.z = -side * 0.26; // Canted outward
      tail.rotation.x = -0.15;        // Swept back
      this.meshGroup.add(tail);

      // Glowing Trailing Edge Strip
      const tailGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 11, 8), glowScarletMat);
      tailGlow.position.set(side * 7.8, 8.5, -24.0);
      tailGlow.rotation.z = -side * 0.26;
      this.meshGroup.add(tailGlow);

      // Smooth Rounded Ventral Keel Sponson
      const keelGeo = new THREE.CapsuleGeometry(0.8, 12, 8, 16);
      keelGeo.rotateX(Math.PI / 2);
      const keel = new THREE.Mesh(keelGeo, darkAlloyMat);
      keel.position.set(side * 4.5, -4.8, -12.0);
      this.meshGroup.add(keel);
    });

    // ── 5. Dorsal Command Bridge Canopy (Sculpted into Upper Spine) ──
    const canopyGeo = new THREE.CapsuleGeometry(2.8, 10.0, 12, 24);
    canopyGeo.rotateX(Math.PI / 2);
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x120306,
      roughness: 0.1,
      metalness: 0.98,
      emissive: 0x440812,
      emissiveIntensity: 0.4
    });
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 6.2, -10.0);
    this.meshGroup.add(canopy);

    const visorGeo = new THREE.BoxGeometry(5.0, 0.9, 0.5);
    const visor = new THREE.Mesh(visorGeo, glowScarletMat);
    visor.position.set(0, 6.8, -5.2);
    this.meshGroup.add(visor);

    // ── 6. Exposed Dorsal Fusion Core Reactor ──
    const coreCasingGeo = new THREE.CylinderGeometry(4.2, 4.8, 3.2, 24);
    const coreCasingMat = new THREE.MeshStandardMaterial({ color: 0x140508, metalness: 0.95 });
    const coreCasing = new THREE.Mesh(coreCasingGeo, coreCasingMat);
    coreCasing.position.set(0, 4.5, 6.0);
    this.meshGroup.add(coreCasing);

    const coreGeo = new THREE.SphereGeometry(3.4, 24, 24);
    this.coreMat = new THREE.MeshStandardMaterial({
      color: 0xff0044,
      emissive: 0xff0044,
      emissiveIntensity: 4.0,
      roughness: 0.1,
      metalness: 0.2
    });
    this.coreMesh = new THREE.Mesh(coreGeo, this.coreMat);
    this.coreMesh.position.set(0, 5.2, 6.0);
    this.meshGroup.add(this.coreMesh);

    // Core Containment Ring
    const coreRingGeo = new THREE.TorusGeometry(4.0, 0.4, 12, 32);
    this.coreRingMesh = new THREE.Mesh(coreRingGeo, glowMagmaMat);
    this.coreRingMesh.rotation.x = Math.PI / 2;
    this.coreRingMesh.position.set(0, 5.4, 6.0);
    this.meshGroup.add(this.coreRingMesh);

    // Core 3D Diamond Target Lock Reticle
    const coreReticleGeo = new THREE.RingGeometry(4.5, 5.6, 4);
    const coreReticleMat = new THREE.MeshBasicMaterial({ color: 0xff0044, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    this.coreReticle = new THREE.Mesh(coreReticleGeo, coreReticleMat);
    this.coreReticle.rotation.x = -Math.PI / 2;
    this.coreReticle.rotation.z = Math.PI / 4;
    this.coreReticle.position.set(0, 8.8, 6.0);
    this.coreReticle.visible = false;
    this.meshGroup.add(this.coreReticle);
    this.reticleMeshes.push(this.coreReticle);

    // ── 7. Omni-Plasma Deflector Shield Bubble ──
    const shieldGeo = new THREE.SphereGeometry(34, 24, 16);
    this.plasmaShieldMat = new THREE.MeshBasicMaterial({
      color: 0xff0055,
      transparent: true,
      opacity: 0.26,
      wireframe: true
    });
    this.plasmaShieldMesh = new THREE.Mesh(shieldGeo, this.plasmaShieldMat);
    this.plasmaShieldMesh.scale.set(1.15, 0.5, 1.25);
    this.plasmaShieldMesh.position.set(0, 0, 4);
    this.meshGroup.add(this.plasmaShieldMesh);

    // ── 8. Port & Starboard Flank Shield Generators (Smooth Aerodynamic Pylons) ──
    const pylonGeo = new THREE.CapsuleGeometry(1.5, 4.0, 8, 16);
    const pylonMat = new THREE.MeshStandardMaterial({ color: 0x1f080e, metalness: 0.94 });
    const emitterGeo = new THREE.SphereGeometry(1.4, 16, 16);
    const ringGeo = new THREE.TorusGeometry(2.2, 0.22, 8, 24);

    this.shieldGenerators.forEach(gen => {
      const gGroup = new THREE.Group();
      gGroup.position.copy(gen.relPos);

      const pylon = new THREE.Mesh(pylonGeo, pylonMat);
      gGroup.add(pylon);

      const emitter = new THREE.Mesh(emitterGeo, glowScarletMat);
      emitter.position.set(0, 2.5, 0);
      gGroup.add(emitter);

      const sRing = new THREE.Mesh(ringGeo, glowScarletMat);
      sRing.rotation.x = Math.PI / 2;
      sRing.position.set(0, 2.5, 0);
      gGroup.add(sRing);

      // 3D Diamond Target Reticle
      const rGeo = new THREE.RingGeometry(3.0, 3.8, 4);
      const rMat = new THREE.MeshBasicMaterial({ color: 0xff0044, side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
      const ret = new THREE.Mesh(rGeo, rMat);
      ret.rotation.z = Math.PI / 4;
      ret.position.set(0, 3.6, 0);
      gGroup.add(ret);

      this.meshGroup.add(gGroup);
      gen.mesh = gGroup;
      gen.ringMesh = sRing;
      gen.reticle = ret;
      this.reticleMeshes.push(ret);
    });

    // ── 9. Build 4 Heavy Rotating Homing Missile Turret Pods (Aerodynamic Blisters) ──
    const podBaseGeo = new THREE.CylinderGeometry(1.8, 2.2, 1.2, 16);
    const podBoxGeo = new THREE.CapsuleGeometry(1.6, 2.6, 8, 16);
    podBoxGeo.rotateX(Math.PI / 2);
    const podBoxMat = new THREE.MeshStandardMaterial({ color: 0x2e0c15, metalness: 0.92, roughness: 0.2 });

    this.missilePods.forEach(pod => {
      const pGroup = new THREE.Group();
      pGroup.position.copy(pod.relPos);

      const base = new THREE.Mesh(podBaseGeo, pylonMat);
      pGroup.add(base);

      const box = new THREE.Mesh(podBoxGeo, podBoxMat);
      box.position.set(0, 1.2, 0);
      pGroup.add(box);

      // 6 recessed missile launch tubes
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 3; c++) {
          const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.5, 8), glowMagmaMat);
          tube.rotateX(Math.PI / 2);
          tube.position.set((c - 1) * 0.9, 0.9 + r * 0.65, 1.8);
          pGroup.add(tube);
        }
      }

      const retGeo = new THREE.RingGeometry(1.8, 2.4, 16);
      const retMat = new THREE.MeshBasicMaterial({ color: 0xff5500, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
      const ret = new THREE.Mesh(retGeo, retMat);
      ret.position.set(0, 1.8, 2.2);
      pGroup.add(ret);

      this.meshGroup.add(pGroup);
      pod.mesh = pGroup;
      pod.turretGroup = box;
      pod.reticle = ret;
      this.reticleMeshes.push(ret);
    });

    // ── 10. Build 6 Heavy Dual-Railgun Batteries (Sculpted Barbettes) ──
    const barbGeo = new THREE.CylinderGeometry(1.5, 1.9, 1.0, 16);
    const gunhouseGeo = new THREE.CapsuleGeometry(1.1, 1.8, 8, 16);
    gunhouseGeo.rotateX(Math.PI / 2);
    const gunhouseMat = new THREE.MeshStandardMaterial({ color: 0x270b12, metalness: 0.94 });
    const barrelGeo = new THREE.CylinderGeometry(0.18, 0.24, 4.4, 8);
    barrelGeo.rotateX(Math.PI / 2);
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x0f0406, metalness: 0.96 });

    this.turrets.forEach(turret => {
      const tGroup = new THREE.Group();
      tGroup.position.copy(turret.relPos);

      const barb = new THREE.Mesh(barbGeo, pylonMat);
      tGroup.add(barb);

      const bGroup = new THREE.Group();
      bGroup.position.set(0, 0.7, 0);

      const house = new THREE.Mesh(gunhouseGeo, gunhouseMat);
      bGroup.add(house);

      [-0.55, 0.55].forEach(xOff => {
        const bar = new THREE.Mesh(barrelGeo, barrelMat);
        bar.position.set(xOff, 0.1, 2.2);
        bGroup.add(bar);

        const muzz = new THREE.Mesh(new THREE.RingGeometry(0.24, 0.4, 8), glowScarletMat);
        muzz.position.set(xOff, 0.1, 4.4);
        bGroup.add(muzz);
      });

      tGroup.add(bGroup);

      const retGeo = new THREE.RingGeometry(1.6, 2.1, 16);
      const retMat = new THREE.MeshBasicMaterial({ color: 0xff0044, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
      const ret = new THREE.Mesh(retGeo, retMat);
      ret.position.set(0, 1.3, 2.5);
      tGroup.add(ret);

      this.meshGroup.add(tGroup);
      turret.mesh = tGroup;
      turret.barrelGroup = bGroup;
      turret.reticle = ret;
      this.reticleMeshes.push(ret);
    });

    // ── 11. Quad Streamlined Rocket Thruster Bells (Smooth Engine Deck) ──
    const thrusterGeo = new THREE.CylinderGeometry(2.2, 2.8, 5.0, 20);
    thrusterGeo.rotateX(Math.PI / 2);
    const thrusterMat = new THREE.MeshStandardMaterial({ color: 0x140407, metalness: 0.96 });

    const flameGeo = new THREE.ConeGeometry(2.4, 9.5, 20);
    flameGeo.rotateX(-Math.PI / 2);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff2200, transparent: true, opacity: 0.9 });

    [
      { x: -5.0, y:  1.8, z: -30.0 },
      { x:  5.0, y:  1.8, z: -30.0 },
      { x: -5.0, y: -1.8, z: -30.0 },
      { x:  5.0, y: -1.8, z: -30.0 },
    ].forEach(tPos => {
      const bell = new THREE.Mesh(thrusterGeo, thrusterMat);
      bell.position.set(tPos.x, tPos.y, tPos.z);
      this.meshGroup.add(bell);

      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.set(tPos.x, tPos.y, tPos.z - 4.5);
      this.meshGroup.add(flame);
      this.engineThrusters.push(flame);
    });
  }

  takeShieldGenDamage(generatorId, amount) {
    const gen = this.shieldGenerators.find(g => g.id === generatorId);
    if (!gen || gen.isDead) return false;

    gen.hp -= amount;
    if (gen.reticle && gen.reticle.material) {
      const pct = gen.hp / gen.maxHp;
      gen.reticle.material.color.setHex(pct > 0.5 ? 0xff0044 : (pct > 0.25 ? 0xff5500 : 0x555555));
    }

    if (gen.hp <= 0 && !gen.isDead) {
      gen.isDead = true;
      if (gen.mesh) gen.mesh.visible = false;
      if (gen.reticle) gen.reticle.visible = false;

      const wp = gen.mesh ? gen.mesh.getWorldPosition(new THREE.Vector3()) : this.meshGroup.position;
      this.particleManager.createExplosion(wp, 0xff0044, 200, 5.0);
      this.particleManager.createExplosion(wp, 0xff5500, 150, 4.0);
      this.particleManager.createEmpShockwave(wp, 80);

      const remainingShields = this.shieldGenerators.filter(g => !g.isDead).length;
      if (remainingShields === 0) {
        this.hasPlasmaShield = false;
        if (this.plasmaShieldMesh) this.plasmaShieldMesh.visible = false;
        if (this.coreReticle) this.coreReticle.visible = true;

        if (this.particleManager) {
          this.particleManager.createEmpShockwave(this.meshGroup.position, 160);
          this.particleManager.createExplosion(this.meshGroup.position, 0xff0055, 300, 6.5);
        }

        window.spaceGameManager?.voiceAnnouncer?.speak("Mothership Shields Collapsed! Target the exposed Dorsal Fusion Core!", true);
        if (window.spaceGameManager?.spaceHUD) {
          window.spaceGameManager.spaceHUD.showWaveBanner("SHIELDS DESTROYED", "TARGET DORSAL FUSION CORE");
          window.spaceGameManager.spaceHUD.showRadioTransmission("TACTICAL ALERT: Crimson Dreadnought shields collapsed! All wings focus fire on the Dorsal Fusion Core!", "STARBOUND COMMAND", 6.0);
        }
      } else {
        window.spaceGameManager?.voiceAnnouncer?.speak("Flank shield generator destroyed! 1 generator remains!", true);
      }
    }
    return gen.isDead;
  }

  takeMissilePodDamage(podId, amount) {
    const pod = this.missilePods.find(p => p.id === podId);
    if (!pod || pod.isDead) return false;

    pod.hp -= amount;
    if (pod.reticle && pod.reticle.material) {
      const pct = pod.hp / pod.maxHp;
      pod.reticle.material.color.setHex(pct > 0.5 ? 0xff5500 : (pct > 0.25 ? 0xff0044 : 0x555555));
    }

    if (pod.hp <= 0 && !pod.isDead) {
      pod.isDead = true;
      if (pod.mesh) pod.mesh.visible = false;
      if (pod.reticle) pod.reticle.visible = false;

      const wp = pod.mesh ? pod.mesh.getWorldPosition(new THREE.Vector3()) : this.meshGroup.position;
      this.particleManager.createExplosion(wp, 0xff5500, 150, 4.2);
    }
    return pod.isDead;
  }

  takeRailgunDamage(turretId, amount) {
    const t = this.turrets.find(tur => tur.id === turretId);
    if (!t || t.isDead) return false;

    t.hp -= amount;
    if (t.reticle && t.reticle.material) {
      const pct = t.hp / t.maxHp;
      t.reticle.material.color.setHex(pct > 0.5 ? 0xff0044 : (pct > 0.25 ? 0xff5500 : 0x555555));
    }

    if (t.hp <= 0 && !t.isDead) {
      t.isDead = true;
      if (t.mesh) t.mesh.visible = false;
      if (t.reticle) t.reticle.visible = false;

      const wp = t.mesh ? t.mesh.getWorldPosition(new THREE.Vector3()) : this.meshGroup.position;
      this.particleManager.createExplosion(wp, 0xff0044, 140, 3.8);
    }
    return t.isDead;
  }

  takeCoreDamage(amount) {
    if (this.isDead) return false;

    // If flank shields are still active, deflect 70% damage with visual shield flare
    let effectiveDmg = amount;
    if (this.hasPlasmaShield) {
      effectiveDmg *= 0.3;
      if (this.particleManager && this.meshGroup) {
        this.particleManager.createExplosion(this.meshGroup.position, 0xff0044, 10, 1.4);
      }
    }

    this.coreHp = Math.max(0, this.coreHp - effectiveDmg);

    if (this.coreMat) {
      this.coreMat.emissiveIntensity = 14.0;
      setTimeout(() => {
        if (this.coreMat) this.coreMat.emissiveIntensity = 4.0 + this.phase;
      }, 100);
    }

    const hpRatio = this.coreHp / this.maxCoreHp;
    if (hpRatio < 0.6 && this.phase === 1) {
      this.phase = 2;
      window.spaceGameManager?.voiceAnnouncer?.speak("Warning! Crimson Dreadnought entering Phase 2: Stealth Swarm Inbound!", true);
    }
    if (hpRatio < 0.3 && this.phase === 2) {
      this.phase = 3;
      window.spaceGameManager?.voiceAnnouncer?.speak("Critical alert! Dreadnought reactor critical overcharge!", true);
    }

    if (this.coreHp <= 0 && !this.isDead) {
      this.isDead = true;
      this._explode();
    }
    return this.isDead;
  }

  takeCouplingDamage(couplingId, amount) {
    return this.takeCoreDamage(amount);
  }

  takeInternalTurretDamage(id, amount) {
    return this.takeRailgunDamage(id, amount);
  }

  takeExternalTurretDamage(id, amount) {
    return this.takeRailgunDamage(id, amount);
  }

  takeDamage(type, amount) {
    return this.takeCoreDamage(amount);
  }

  _explode() {
    const p = this.meshGroup.position;
    this.particleManager.createExplosion(p, 0xff0044, 450, 9.0);
    this.particleManager.createExplosion(p, 0xff5500, 350, 7.5);
    this.particleManager.createExplosion(p, 0xffaa00, 300, 6.0);
    this.particleManager.createExplosion(p, 0xffffff, 200, 5.0);
    this.particleManager.createEmpShockwave(p, 250);
    this.particleManager.createEmpShockwave(p, 350);
  }

  destroy() {
    this.isDead = true;
    const gm = window.spaceGameManager;
    if (gm && gm.achievementSystem) {
      if (typeof gm.achievementSystem.recordBossKilled === 'function') {
        gm.achievementSystem.recordBossKilled();
      } else if (typeof gm.achievementSystem.recordBossKill === 'function') {
        gm.achievementSystem.recordBossKill();
      }
    }
    if (this.particleManager && this.meshGroup) {
      this.particleManager.createExplosion(this.meshGroup.position, 0xffaa00, 300, 8.0);
      this.particleManager.createExplosion(this.meshGroup.position, 0xffffff, 200, 6.0);
      this.particleManager.createEmpShockwave(this.meshGroup.position, 280);
    }
    if (this.scene && this.meshGroup) {
      this.scene.remove(this.meshGroup);
    }
    this.meshGroup.traverse(c => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    });
  }

  update(dt, playerPos) {
    if (this.isDead) return false;
    this._time += dt;

    // 1. Forward Advance to Target Battle Station
    const arrived = this.meshGroup.position.z >= this.targetZ;
    if (!arrived) {
      this.meshGroup.position.z += this.speed * dt;
    } else {
      // Tactical Flank Swaying to encourage player strafing
      this.flankSwayTimer += dt * 0.6;
      this.meshGroup.position.x = Math.sin(this.flankSwayTimer) * 12.0;
      this.meshGroup.position.y = Math.cos(this.flankSwayTimer * 0.8) * 3.5;
      this.meshGroup.rotation.z = -Math.cos(this.flankSwayTimer) * 0.08;
      this.meshGroup.rotation.y = Math.sin(this.flankSwayTimer) * 0.05;
    }

    // 2. Animate Target Reticles & Core Containment Ring
    if (this.reticleMeshes) {
      this.reticleMeshes.forEach(ret => {
        if (ret && ret.visible) ret.rotation.z += 2.2 * dt;
      });
    }

    if (this.coreRingMesh) {
      this.coreRingMesh.rotation.z += (1.5 + this.phase * 0.5) * dt;
    }

    // 3. Animate Shield Generators Induction Rings
    if (this.shieldGenerators) {
      this.shieldGenerators.forEach(g => {
        if (!g.isDead && g.ringMesh) {
          g.ringMesh.rotation.z += 3.5 * dt;
        }
      });
    }

    // 4. Plasma Deflector Shimmering Pulse
    if (this.hasPlasmaShield && this.plasmaShieldMat) {
      this.plasmaShieldMat.opacity = 0.22 + Math.sin(this._time * 6.0) * 0.08;
    }

    // 5. Engine Thruster Plume Breathing (Burning Red & Orange)
    if (this.engineThrusters) {
      this.engineThrusters.forEach((th, i) => {
        const s = 1.0 + Math.sin(this._time * 18.0 + i) * 0.2;
        th.scale.set(s, s, s * (arrived ? 1.0 : 1.6));
      });
    }

    // 6. Turrets Dynamic 3D Tracking
    if (arrived && playerPos) {
      this.turrets.forEach(t => {
        if (!t.isDead && t.barrelGroup) {
          t.barrelGroup.lookAt(playerPos);
        }
      });

      this.missilePods.forEach(p => {
        if (!p.isDead && p.turretGroup) {
          p.turretGroup.lookAt(playerPos);
        }
      });
    }

    // ── 7. Combat Attack Salvo Generator ──
    this.railgunFireTimer -= dt;
    this.missileFireTimer -= dt;
    this.stealthLaunchTimer -= dt;
    this.noseLaserChargeTimer -= dt;

    const outLasers = [];
    const outMissiles = [];
    const outStealthSpawns = [];
    let noseLaserFired = false;

    if (arrived) {
      // A. Nose Mega-Laser Cannon Firing (Spinal Heavy Beam)
      if (this.noseFocusRing && this.noseLensMat) {
        if (this.noseLaserChargeTimer <= 1.0) {
          const chargePulse = Math.sin(this._time * 30.0);
          this.noseLensMat.color.setHex(chargePulse > 0 ? 0xffffff : 0xff0044);
          this.noseFocusRing.rotation.z += 12.0 * dt;
        } else {
          this.noseLensMat.color.setHex(0xff0044);
          this.noseFocusRing.rotation.z += 2.0 * dt;
        }
      }

      if (this.noseLaserChargeTimer <= 0) {
        this.noseLaserChargeTimer = Math.max(3.5, 6.0 - this.phase * 0.8);
        noseLaserFired = true;
        const noseWorldPos = new THREE.Vector3(0, 0.3, 31.5).applyMatrix4(this.meshGroup.matrixWorld);
        
        // Spawn 3 rapid heavy spinal beam bolts in a tight piercing column
        [-1.2, 0, 1.2].forEach(xOff => {
          outLasers.push(new THREE.Vector3(noseWorldPos.x + xOff, noseWorldPos.y, noseWorldPos.z));
        });

        this.particleManager.createExplosion(noseWorldPos, 0xff0044, 40, 3.0);
      }

      // B. Heavy Railgun Volleys (Crimson Bolts)
      if (this.railgunFireTimer <= 0) {
        this.railgunFireTimer = 0.75 / (1.0 + this.phase * 0.3);
        const livingTurrets = this.turrets.filter(t => !t.isDead && t.mesh);
        livingTurrets.forEach(t => {
          outLasers.push(t.mesh.getWorldPosition(new THREE.Vector3()));
        });
      }

      // C. Homing Missile Pod Volleys (Swarm Tracking)
      if (this.missileFireTimer <= 0) {
        this.missileFireTimer = Math.max(1.8, 3.8 - this.phase * 0.7);
        const livingPods = this.missilePods.filter(p => !p.isDead && p.mesh);
        livingPods.forEach(p => {
          const wp = p.mesh.getWorldPosition(new THREE.Vector3());
          outMissiles.push({
            pos: wp,
            targetPos: playerPos ? playerPos.clone() : new THREE.Vector3(0, 0, 0)
          });
        });
      }

      // D. Stealth Fighter Catapult Deployments (Active Cloaking Escorts)
      if (this.stealthLaunchTimer <= 0) {
        this.stealthLaunchTimer = Math.max(6.0, 11.0 - this.phase * 2.0);
        [-1, 1].forEach(side => {
          const launchPos = new THREE.Vector3(side * 12.5, 2.2, 4).applyMatrix4(this.meshGroup.matrixWorld);
          outStealthSpawns.push({
            x: launchPos.x,
            y: launchPos.y,
            z: launchPos.z,
            side
          });
          this.particleManager.createExplosion(launchPos, 0xff2200, 30, 2.0);
        });
      }
    }

    return {
      lasers: outLasers,
      homingMissiles: outMissiles,
      stealthSpawns: outStealthSpawns,
      noseLaserFired
    };
  }
}
