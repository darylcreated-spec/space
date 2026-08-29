import * as THREE from 'three';

// ============================================================
// WAVE 1 BOSS â€” Star Wars Death Star Imperial Superweapon
// Full AAA overhaul: 30m sphere, superlaser beam, dramatic lighting,
// animated trench glow, multi-phase attack patterns
// ============================================================

// â”€â”€ Canvas Texture Generators â”€â”€
function generateHullNormalMap() {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgb(128, 128, 255)';
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = 'rgb(90, 120, 255)';
  ctx.lineWidth = 2;
  for (let x = 0; x < 512; x += 24) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke(); }
  for (let y = 0; y < 512; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke(); }
  ctx.fillStyle = 'rgb(180, 180, 255)';
  for (let i = 0; i < 600; i++) {
    const rx = Math.floor(Math.random() * 21) * 24 + 2;
    const ry = Math.floor(Math.random() * 21) * 24 + 2;
    ctx.fillRect(rx, ry, 5, 5);
  }
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(5, 3);
  return t;
}

// â”€â”€ Shader definitions â”€â”€
const PlasmaOrbShader = {
  uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0x00ff44) } },
  vertexShader: `varying vec3 vNormal; varying vec2 vUv; varying vec3 vPosition;
    void main() { vNormal = normalize(normalMatrix * normal); vUv = uv; vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform float uTime; uniform vec3 uColor;
    varying vec3 vNormal; varying vec2 vUv; varying vec3 vPosition;
    float noise(vec3 p) { return sin(p.x*5.0+uTime*3.0)*cos(p.y*5.0+uTime*2.5)*sin(p.z*5.0+uTime*3.5); }
    void main() {
      float n = noise(vPosition * 1.8);
      float turb = sin(vUv.y * 28.0 + uTime * 8.0 + n * 5.0) * 0.5 + 0.5;
      vec3 col = mix(uColor, vec3(0.9), turb * 0.5);
      float rim = 1.0 - max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
      col += vec3(0.1, 0.9, 0.3) * pow(rim, 2.5);
      gl_FragColor = vec4(col * 1.15, 1.0); }`
};

const TrenchShader = {
  uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0x00ff44) } },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform float uTime; uniform vec3 uColor; varying vec2 vUv;
    void main() {
      float pulse = sin(vUv.x * 100.0 - uTime * 12.0) * 0.5 + 0.5;
      pulse = pow(pulse, 3.0);
      float secondary = sin(vUv.x * 40.0 + uTime * 5.0) * 0.3 + 0.7;
      gl_FragColor = vec4(uColor * (0.85 + pulse * 0.9) * secondary, 1.0); }`
};

const ShieldShader = {
  uniforms: { uTime: { value: 0 }, uHitTime: { value: 0 }, uColor: { value: new THREE.Color(0x00f3ff) }, uHp: { value: 1.0 } },
  vertexShader: `varying vec3 vNormal; varying vec3 vViewPosition;
    void main() { vNormal = normalize(normalMatrix * normal);
      vec4 mvPos = modelViewMatrix * vec4(position, 1.0); vViewPosition = -mvPos.xyz;
      gl_Position = projectionMatrix * mvPos; }`,
  fragmentShader: `uniform float uTime; uniform float uHitTime; uniform vec3 uColor; uniform float uHp;
    varying vec3 vNormal; varying vec3 vViewPosition;
    void main() {
      vec3 n = normalize(vNormal); vec3 v = normalize(vViewPosition);
      float fresnel = pow(1.0 - max(0.0, dot(n, v)), 3.5);
      float pulse = sin(uTime * 3.0) * 0.15 + 0.85;
      float hexPattern = step(0.75, fract(dot(n, vec3(6.0, 8.0, 6.0)) + uTime * 0.3));
      vec3 edgeCol = mix(uColor, vec3(1.0), uHitTime * 0.6);
      float alpha = clamp(fresnel * 0.35 + hexPattern * 0.08 + uHitTime * 0.35, 0.0, 0.45) * pulse;
      gl_FragColor = vec4(edgeCol, alpha); }`
};

export class MoonBase {
  constructor(scene, particleManager) {
    this.scene = scene;
    this.particleManager = particleManager;

    this.meshGroup = new THREE.Group();
    this.meshGroup.position.set(0, 0, -160);

    this.targetZ = -92;
    this.speed = 8.5;

    // Colossal scale & doubled health
    this.coreHp = 9000;
    this.maxCoreHp = 9000;
    this.scoreValue = 120000;
    this.isDead = false;
    this.isDying = false;
    this.deathTimer = 4.5;
    this.hitRadius = 48.0;

    // Phase system â€” changes attack pattern as HP drops
    this.phase = 1;
    this.fireTimer = 0.55;
    this.superlasertimer = 0;
    this.superlaserfiring = false;
    this.phaseShieldTimer = 0;
    this.justPhaseTransitioned = false;
    this.droneSpawnTimer = 5.0;

    // Deflector shield state & generator configuration
    this.hasShield = true;

    // â”€â”€ Targetable Equatorial Shield Generator Hubs (Must destroy both to drop shields) â”€â”€
    this.generators = [
      { id: 0, name: 'PORT SHIELD HUB', relPos: new THREE.Vector3(-30.0, 0, 16.0), hp: 1500, maxHp: 1500, isDead: false, mesh: null, coil: null, reticle: null },
      { id: 1, name: 'STBD SHIELD HUB', relPos: new THREE.Vector3(30.0, 0, 16.0), hp: 1500, maxHp: 1500, isDead: false, mesh: null, coil: null, reticle: null }
    ];

    // â”€â”€ 6 Targetable Heavy Defense CIWS Batteries â”€â”€
    this.turrets = [
      { id: 0, name: 'NORTH-WEST BATTERY', relPos: new THREE.Vector3(-24.0, 14.0, 18.0), hp: 1200, maxHp: 1200, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 1, name: 'NORTH-EAST BATTERY', relPos: new THREE.Vector3(24.0, 14.0, 18.0),  hp: 1200, maxHp: 1200, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 2, name: 'EQUATORIAL PORT BATTERY', relPos: new THREE.Vector3(-32.0, -4.0, 14.0), hp: 1200, maxHp: 1200, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 3, name: 'EQUATORIAL STBD BATTERY', relPos: new THREE.Vector3(32.0, -4.0, 14.0),  hp: 1200, maxHp: 1200, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 4, name: 'SOUTH-WEST BATTERY', relPos: new THREE.Vector3(-18.0, -18.0, 16.0), hp: 1200, maxHp: 1200, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 5, name: 'SOUTH-EAST BATTERY', relPos: new THREE.Vector3(18.0, -18.0, 16.0),  hp: 1200, maxHp: 1200, isDead: false, mesh: null, barrelGroup: null, reticle: null }
    ];

    this.reticleMeshes = [];
    this.shaderMaterials = [];
    this.activeIntervals = [];
    this.activeTimeouts = [];
    this._build();
    this.scene.add(this.meshGroup);
  }

  _build() {
    const R = 36.0;
    const normalMap = generateHullNormalMap();

    // ── 2. Main PBR Cratered Lunar Sphere Hull ──
    const hullGeo = new THREE.SphereGeometry(R, 48, 40);
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x161e2a,
      roughness: 0.52,
      metalness: 0.88,
      emissive: 0x080f18,
      emissiveIntensity: 0.2,
      normalMap,
      normalScale: new THREE.Vector2(1.4, 1.4),
      flatShading: true,
    });
    this.spireMesh = new THREE.Mesh(hullGeo, hullMat);
    this.meshGroup.add(this.spireMesh);

    // â”€â”€ 3. Geodesic Bio-Dome Habitation Colonies with Internal Glowing Spire Cities â”€â”€
    const domePositions = [
      new THREE.Vector3(-10, 14, 11),
      new THREE.Vector3(10, 14, 11),
      new THREE.Vector3(-8, -14, 13),
      new THREE.Vector3(8, -14, 13)
    ];
    domePositions.forEach(dPos => {
      const domeGroup = new THREE.Group();
      domeGroup.position.copy(dPos);
      domeGroup.lookAt(dPos.clone().multiplyScalar(2));

      // Outer Crystalline Protective Dome
      const dGeo = new THREE.SphereGeometry(3.2, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
      const dMat = new THREE.MeshStandardMaterial({
        color: 0x002844,
        emissive: 0x00f3ff,
        emissiveIntensity: 0.25,
        roughness: 0.1,
        metalness: 0.95,
        transparent: true,
        opacity: 0.55
      });
      const dome = new THREE.Mesh(dGeo, dMat);
      domeGroup.add(dome);

      // Inner Geodesic Structural Lattice
      const wireMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, wireframe: true });
      const wireDome = new THREE.Mesh(dGeo, wireMat);
      domeGroup.add(wireDome);

      // Interior Glowing Miniature Megacity Spires
      const cityPillars = [
        { x: -0.8, y: 0.8, h: 2.2, col: 0x00f3ff },
        { x: 0.8, y: 0.8, h: 2.5, col: 0x00ff88 },
        { x: -0.6, y: -0.6, h: 1.8, col: 0xffea00 },
        { x: 0.6, y: -0.6, h: 2.0, col: 0x00f3ff },
        { x: 0.0, y: 0.0, h: 2.8, col: 0xffffff }
      ];
      cityPillars.forEach(cp => {
        const pGeo = new THREE.BoxGeometry(0.4, 0.4, cp.h);
        const pMat = new THREE.MeshBasicMaterial({ color: cp.col });
        const p = new THREE.Mesh(pGeo, pMat);
        p.position.set(cp.x, cp.y, cp.h * 0.5);
        domeGroup.add(p);
      });

      this.meshGroup.add(domeGroup);
    });

    // â”€â”€ 3B. 3D Procedural Lunar Craters on Surface â”€â”€
    const craterCoords = [
      new THREE.Vector3(-14, 2, 16),
      new THREE.Vector3(12, -4, 17),
      new THREE.Vector3(-6, -16, 12),
      new THREE.Vector3(14, 12, 10),
      new THREE.Vector3(-16, -10, 10)
    ];
    craterCoords.forEach((cPos, idx) => {
      const cGeo = new THREE.TorusGeometry(1.8 + (idx % 3) * 0.6, 0.45, 8, 20);
      const cMat = new THREE.MeshStandardMaterial({ color: 0x0a101a, roughness: 0.85, metalness: 0.8 });
      const crater = new THREE.Mesh(cGeo, cMat);
      crater.position.copy(cPos);
      crater.lookAt(cPos.clone().multiplyScalar(2));
      this.meshGroup.add(crater);
    });

    // â”€â”€ 4. Equatorial Industrial Trench & Power Conduit â”€â”€
    const trenchGeo = new THREE.TorusGeometry(R + 0.3, 2.25, 12, 100);
    const trenchMat = new THREE.MeshStandardMaterial({
      color: 0x060c14, roughness: 0.9, metalness: 1.0, normalMap,
    });
    this.meshGroup.add(new THREE.Mesh(trenchGeo, trenchMat));

    // Scrolling conduit light in trench
    const conduitGeo = new THREE.TorusGeometry(R + 0.38, 0.45, 10, 100);
    this.conduitMat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(TrenchShader.uniforms),
      vertexShader: TrenchShader.vertexShader,
      fragmentShader: TrenchShader.fragmentShader,
    });
    this.shaderMaterials.push(this.conduitMat);
    this.meshGroup.add(new THREE.Mesh(conduitGeo, this.conduitMat));

    // Orbiting Superconducting Mag-Lev Energy Nodes
    this.magLevNodes = [];
    for (let i = 0; i < 6; i++) {
      const nodeGeo = new THREE.SphereGeometry(0.75, 12, 12);
      const nodeMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
      const node = new THREE.Mesh(nodeGeo, nodeMat);
      this.meshGroup.add(node);
      this.magLevNodes.push({ mesh: node, baseAngle: (i / 6) * Math.PI * 2, radius: R + 1.2 });
    }

    // â”€â”€ 5. Northern Superlaser Megastructure Cannon â”€â”€
    const dishGroup = new THREE.Group();
    dishGroup.position.set(-8.5, 12.0, R - 2.5);
    dishGroup.rotation.y = -Math.PI / 10;
    dishGroup.rotation.x = Math.PI / 12;
    this.dishGroup = dishGroup;

    // Heavy Dish Rim & Armor Mantlet
    this.meshGroup.add(new THREE.Mesh(new THREE.TorusGeometry(10.5, 1.8, 16, 40), new THREE.MeshStandardMaterial({ color: 0x0a1420, roughness: 0.3, metalness: 1.0 })));

    // Dish Face
    const dishFaceGeo = new THREE.CylinderGeometry(9.8, 7.2, 2.5, 32);
    dishFaceGeo.rotateX(Math.PI / 2);
    dishGroup.add(new THREE.Mesh(dishFaceGeo, new THREE.MeshStandardMaterial({ color: 0x08101a, roughness: 0.2, metalness: 0.98 })));

    // 8 Converging Superlaser Emitter Pylons & Energy Needles
    this.convergeBeams = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const pylonGeo = new THREE.BoxGeometry(0.8, 0.8, 3.5);
      const pylonMat = new THREE.MeshStandardMaterial({ color: 0x142233, metalness: 0.95 });
      const pylon = new THREE.Mesh(pylonGeo, pylonMat);
      pylon.position.set(Math.cos(a) * 7.5, Math.sin(a) * 7.5, 0.8);
      pylon.rotation.z = a;
      dishGroup.add(pylon);

      // Focus Convergence Beam Line
      const beamGeo = new THREE.CylinderGeometry(0.18, 0.18, 7.2, 8);
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0x00ff66,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set(Math.cos(a) * 3.8, Math.sin(a) * 3.8, 0.6);
      beam.rotation.z = a + Math.PI / 2;
      beam.rotation.x = Math.PI / 4.5;
      dishGroup.add(beam);
      this.convergeBeams.push({ mesh: beam, mat: beamMat, baseAngle: a });
    }

    // Central Churning Plasma Fusion Orb
    const orbGeo = new THREE.SphereGeometry(3.2, 32, 32);
    this.plasmaShaderMat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(PlasmaOrbShader.uniforms),
      vertexShader: PlasmaOrbShader.vertexShader,
      fragmentShader: PlasmaOrbShader.fragmentShader,
    });
    this.shaderMaterials.push(this.plasmaShaderMat);
    this.coreMesh = new THREE.Mesh(orbGeo, this.plasmaShaderMat);
    this.coreMesh.position.z = -0.4;
    dishGroup.add(this.coreMesh);

    // 3 Concentric Superlaser Energy Focusing Rings
    this.focusRings = [];
    const ringRadii = [7.2, 5.0, 3.2];
    const ringDistances = [3.5, 7.0, 10.5];
    for (let i = 0; i < 3; i++) {
      const rGeo = new THREE.TorusGeometry(ringRadii[i], 0.3, 10, 36);
      const rMat = new THREE.MeshBasicMaterial({
        color: 0x00ff66,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending
      });
      const rMesh = new THREE.Mesh(rGeo, rMat);
      rMesh.position.set(0, 0, ringDistances[i]);
      dishGroup.add(rMesh);
      this.focusRings.push({
        mesh: rMesh,
        mat: rMat,
        baseZ: ringDistances[i],
        baseRadius: ringRadii[i],
        speed: (i % 2 === 0 ? 1 : -1) * (1.5 + i * 0.6)
      });
    }

    // Direct Targeting Red Aiming Sight Beam
    const aimGeo = new THREE.CylinderGeometry(0.12, 0.12, 160, 6);
    aimGeo.rotateX(Math.PI / 2);
    this.aimSightMat = new THREE.MeshBasicMaterial({
      color: 0xff0044,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending
    });
    this.aimSightBeam = new THREE.Mesh(aimGeo, this.aimSightMat);
    this.aimSightBeam.position.set(0, 0, 80);
    dishGroup.add(this.aimSightBeam);

    this.meshGroup.add(dishGroup);

    // Superlaser Point Light
    this.superlightBoss = new THREE.PointLight(0x00ff44, 2.0, 60);
    this.superlightBoss.position.set(-8.5, 12.0, R + 2.0);
    this.meshGroup.add(this.superlightBoss);

    // Superlaser Main Discharge Beams
    const laserBeamGeo = new THREE.CylinderGeometry(0.7, 0.7, 90, 12);
    laserBeamGeo.rotateX(Math.PI / 2);
    this.laserBeamMat = new THREE.MeshBasicMaterial({ color: 0x00ff66, transparent: true, opacity: 0.0 });
    this.laserBeam = new THREE.Mesh(laserBeamGeo, this.laserBeamMat);
    this.laserBeam.position.set(-8.5, 12.0, R + 42.5);
    this.meshGroup.add(this.laserBeam);

    const outerBeamGeo = new THREE.CylinderGeometry(1.6, 1.6, 90, 12);
    outerBeamGeo.rotateX(Math.PI / 2);
    this.outerBeamMat = new THREE.MeshBasicMaterial({ color: 0x88ffaa, transparent: true, opacity: 0.0 });
    this.outerBeam = new THREE.Mesh(outerBeamGeo, this.outerBeamMat);
    this.outerBeam.position.copy(this.laserBeam.position);
    this.meshGroup.add(this.outerBeam);

    // â”€â”€ 6. Outer Rotating Habitat Ring with Solar Pylons & Docking Struts â”€â”€
    const habRingGroup = new THREE.Group();
    const habRingGeo = new THREE.TorusGeometry(R + 12.0, 1.3, 14, 80);
    const habRingMat = new THREE.MeshStandardMaterial({ color: 0x0c1626, roughness: 0.4, metalness: 0.95 });
    const habRingMesh = new THREE.Mesh(habRingGeo, habRingMat);
    habRingGroup.add(habRingMesh);

    // 8 Industrial Docking Struts connecting Sphere to Habitat Ring
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const strutGeo = new THREE.CylinderGeometry(0.45, 0.45, 12.0, 8);
      const strutMat = new THREE.MeshStandardMaterial({ color: 0x08101a, metalness: 0.9 });
      const strut = new THREE.Mesh(strutGeo, strutMat);
      strut.position.set(Math.cos(ang) * (R + 6.0), Math.sin(ang) * (R + 6.0), 0);
      strut.rotation.z = ang + Math.PI / 2;
      this.meshGroup.add(strut);
    }

    // 6 Photovoltaic Solar Array Wings (Gold Metallic Panels)
    for (let s = 0; s < 6; s++) {
      const sAng = (s / 6) * Math.PI * 2;
      const wingGeo = new THREE.BoxGeometry(11.0, 0.25, 5.0);
      const wingMat = new THREE.MeshStandardMaterial({
        color: 0x0a1c36,
        roughness: 0.15,
        metalness: 0.95,
        emissive: 0x004488,
        emissiveIntensity: 0.35
      });
      const wing = new THREE.Mesh(wingGeo, wingMat);
      wing.position.set(Math.cos(sAng) * (R + 17.5), Math.sin(sAng) * (R + 17.5), 0);
      wing.rotation.z = sAng;
      habRingGroup.add(wing);
    }

    this.beaconLights = [];
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      // Habitat Pod Module
      const podGeo = new THREE.BoxGeometry(2.6, 1.8, 3.8);
      const podMat = new THREE.MeshStandardMaterial({ color: 0x142032, metalness: 0.9, roughness: 0.3 });
      const pod = new THREE.Mesh(podGeo, podMat);
      pod.position.set(Math.cos(ang) * (R + 8.0), Math.sin(ang) * (R + 8.0), 0);
      pod.rotation.z = ang;
      habRingGroup.add(pod);

      // Flashing Navigation Beacon
      const strobeGeo = new THREE.SphereGeometry(0.35, 8, 8);
      const strobeMat = new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0xff0044 : 0x00ff66 });
      const strobe = new THREE.Mesh(strobeGeo, strobeMat);
      strobe.position.set(Math.cos(ang) * (R + 9.6), Math.sin(ang) * (R + 9.6), 0);
      habRingGroup.add(strobe);
      this.beaconLights.push({ mesh: strobe, mat: strobeMat, phase: i * 0.75 });
    }
    this.habRingGroup = habRingGroup;
    this.meshGroup.add(habRingGroup);

    // ── 7. Targetable Equatorial Shield Generator Hubs (Port & Starboard) ──
    const genBaseGeo = new THREE.CylinderGeometry(2.4, 3.2, 3.0, 8);
    const genBaseMat = new THREE.MeshStandardMaterial({ color: 0x182436, metalness: 0.94, roughness: 0.2 });
    const outerCoilGeo = new THREE.TorusGeometry(2.2, 0.32, 10, 24);
    const innerCoilGeo = new THREE.TorusGeometry(1.4, 0.22, 8, 20);
    const coilMat1 = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
    const coilMat2 = new THREE.MeshBasicMaterial({ color: 0x0088ff });
    const coreSphereGeo = new THREE.SphereGeometry(1.0, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });

    this.generators.forEach(gen => {
      const gGroup = new THREE.Group();
      gGroup.position.copy(gen.relPos);

      // Armored Tripod Pylon Base
      const base = new THREE.Mesh(genBaseGeo, genBaseMat);
      base.rotation.x = Math.PI / 2;
      gGroup.add(base);

      // Dual Concentric Superconducting Coils
      const outerCoil = new THREE.Mesh(outerCoilGeo, coilMat1);
      outerCoil.position.set(0, 0, 1.8);
      gGroup.add(outerCoil);

      const innerCoil = new THREE.Mesh(innerCoilGeo, coilMat2);
      innerCoil.position.set(0, 0, 1.8);
      gGroup.add(innerCoil);

      // Central Ionization Reactor Core
      const ionCore = new THREE.Mesh(coreSphereGeo, coreMat);
      ionCore.position.set(0, 0, 1.8);
      gGroup.add(ionCore);

      // 3D Target Reticle for Shield Generator Hub
      const reticleGeo = new THREE.RingGeometry(2.2, 2.6, 20);
      const reticleMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
      const reticle = new THREE.Mesh(reticleGeo, reticleMat);
      reticle.position.set(0, 0, 2.8);
      gGroup.add(reticle);

      this.meshGroup.add(gGroup);
      gen.mesh = gGroup;
      gen.coil = outerCoil;
      gen.innerCoil = innerCoil;
      gen.reticle = reticle;
      this.reticleMeshes.push(reticle);
    });

    // ── 8. Hexagonal Deflector Shield Lattice ──
    const shieldGeo = new THREE.IcosahedronGeometry(R + 4.0, 3);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending
    });
    this.shieldRing = new THREE.Mesh(shieldGeo, shieldMat);
    this.meshGroup.add(this.shieldRing);

    // ── 9. Thermal Exhaust Reactor Core (Exposed on shield collapse) ──
    const vulnGeo = new THREE.SphereGeometry(2.2, 16, 16);
    this.vulnMat = new THREE.MeshBasicMaterial({ color: 0xff3300, transparent: true, opacity: 0.9 });
    this.vulnMesh = new THREE.Mesh(vulnGeo, this.vulnMat);
    this.vulnRelPos = new THREE.Vector3(12, -8, R - 1.5);
    this.vulnMesh.position.copy(this.vulnRelPos);
    this.meshGroup.add(this.vulnMesh);

    const ringGeo = new THREE.TorusGeometry(3.2, 0.28, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    this.vulnRing = new THREE.Mesh(ringGeo, ringMat);
    this.vulnRing.position.copy(this.vulnRelPos);
    this.vulnRing.lookAt(new THREE.Vector3(0, 0, 1).add(this.vulnRelPos));
    this.meshGroup.add(this.vulnRing);

    // ── 10. 6 Ultra-Defined Heavy Defense CIWS Batteries ──
    const barbetteGeo = new THREE.CylinderGeometry(2.2, 2.8, 1.0, 6);
    const barbetteMat = new THREE.MeshStandardMaterial({ color: 0x1c283c, metalness: 0.92, roughness: 0.22 });
    const turntableGeo = new THREE.CylinderGeometry(1.8, 1.9, 0.35, 14);
    const houseGeo = new THREE.BoxGeometry(2.4, 1.3, 2.8);
    const houseMat = new THREE.MeshStandardMaterial({ color: 0x303f56, metalness: 0.95, roughness: 0.18 });

    const barrelGeo = new THREE.CylinderGeometry(0.2, 0.28, 4.2, 8);
    barrelGeo.rotateX(Math.PI / 2);
    this.barrelMat = new THREE.MeshStandardMaterial({
      color: 0x6a82a4,
      metalness: 0.95,
      roughness: 0.15
    });

    const coilGeo = new THREE.TorusGeometry(0.32, 0.06, 6, 12);
    const muzzleGeo = new THREE.TorusGeometry(0.32, 0.08, 6, 14);
    const glowGreenMat = new THREE.MeshBasicMaterial({ color: 0x00ff66 });
    const opticMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });

    this.turrets.forEach(t => {
      const tGroup = new THREE.Group();
      tGroup.position.copy(t.relPos);

      // Hexagonal Foundation Barbette
      const barbette = new THREE.Mesh(barbetteGeo, barbetteMat);
      barbette.rotation.x = Math.PI / 2;
      tGroup.add(barbette);

      // Rotating Azimuth Turntable
      const turntable = new THREE.Mesh(turntableGeo, houseMat);
      turntable.position.set(0, 0, 0.6);
      tGroup.add(turntable);

      // Gunhouse Carapace Group (Tracks Player)
      const bGroup = new THREE.Group();
      bGroup.position.set(0, 0, 0.8);

      // Sloped Armor Chassis
      const house = new THREE.Mesh(houseGeo, houseMat);
      house.position.set(0, 0.2, 0);
      bGroup.add(house);

      // Optical Targeting Sensor Lens
      const optic = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), opticMat);
      optic.position.set(0, 0.9, 0.8);
      bGroup.add(optic);

      // Twin Heavy Laser Autocannons
      [-0.7, 0.7].forEach(xOff => {
        const barrel = new THREE.Mesh(barrelGeo, this.barrelMat);
        barrel.position.set(xOff, 0.2, 2.1);
        bGroup.add(barrel);

        // Magnetic Induction Acceleration Rings
        [0.8, 1.8, 2.8].forEach(zRing => {
          const coil = new THREE.Mesh(coilGeo, glowGreenMat);
          coil.position.set(xOff, 0.2, zRing);
          bGroup.add(coil);
        });

        // Muzzle Brake Collimator Ring
        const muzzle = new THREE.Mesh(muzzleGeo, glowGreenMat);
        muzzle.position.set(xOff, 0.2, 4.2);
        bGroup.add(muzzle);
      });

      tGroup.add(bGroup);

      // 3D Target Reticle for Turret
      const reticleGeo = new THREE.RingGeometry(1.8, 2.2, 16);
      const reticleMat = new THREE.MeshBasicMaterial({ color: 0x00ff44, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
      const reticle = new THREE.Mesh(reticleGeo, reticleMat);
      reticle.position.set(0, 0, 3.5);
      tGroup.add(reticle);

      this.meshGroup.add(tGroup);
      t.mesh = tGroup;
      t.barrelGroup = bGroup;
      t.reticle = reticle;
      this.reticleMeshes.push(reticle);
    });
  }

  takeGeneratorDamage(genId, amount) {
    const gen = this.generators.find(g => g.id === genId);
    if (!gen || gen.isDead) return false;

    gen.hp -= amount;
    if (gen.mesh) {
      gen.mesh.traverse(c => {
        if (c.material && c.material.color) {
          c.material.color.setHex(0xff0044);
          setTimeout(() => {
            if (c && c.material && c.material.color) {
              c.material.color.setHex(gen.isDead ? 0x111111 : 0x0e1828);
            }
          }, 100);
        }
      });
    }

    if (gen.reticle && gen.reticle.material) {
      const pct = gen.hp / gen.maxHp;
      gen.reticle.material.color.setHex(pct > 0.5 ? 0x00f3ff : (pct > 0.25 ? 0xffaa00 : 0xff0044));
    }

    if (gen.hp <= 0) {
      gen.isDead = true;
      if (gen.reticle) gen.reticle.visible = false;
      const wp = this.meshGroup.position.clone().add(gen.relPos);
      this.particleManager.createExplosion(wp, 0x00f3ff, 90, 3.5);
      this.particleManager.createEmpShockwave(wp, 45);
      if (navigator.vibrate) navigator.vibrate([80, 40, 80]);

      const allGensDead = this.generators.every(g => g.isDead);
      if (allGensDead) {
        this.hasShield = false;
        if (this.shieldRing) this.shieldRing.visible = false;
        this.particleManager.createEmpShockwave(this.meshGroup.position, 120);

        if (window.spaceGameManager && window.spaceGameManager.spaceHUD) {
          window.spaceGameManager.spaceHUD.showRadioTransmission("ALL SHIELD GENERATORS DESTROYED! DEFLECTORS DOWN! TARGET THERMAL CORE!", "STARBOUND COMMAND", 5.5);
        }
        if (window.spaceGameManager && window.spaceGameManager.voiceAnnouncer) {
          window.spaceGameManager.voiceAnnouncer.speak("Deflector shields collapsed! Target the thermal core!", true);
        }
      } else {
        if (window.spaceGameManager && window.spaceGameManager.spaceHUD) {
          window.spaceGameManager.spaceHUD.showRadioTransmission(`${gen.name} DESTROYED! SHIELD STABILITY DROPPING!`, "STARBOUND COMMAND", 3.5);
        }
      }
    }
    return gen.isDead;
  }

  takeTurretDamage(turretId, amount) {
    const t = this.turrets.find(item => item.id === turretId);
    if (!t || t.isDead) return false;

    t.hp -= amount;
    if (t.mesh) {
      t.mesh.traverse(c => {
        if (c.material && c.material.color) {
          c.material.color.setHex(0xff0044);
          setTimeout(() => {
            if (c && c.material && c.material.color) {
              c.material.color.setHex(t.isDead ? 0x111111 : 0x0c1828);
            }
          }, 100);
        }
      });
    }

    if (t.reticle && t.reticle.material) {
      const pct = t.hp / t.maxHp;
      t.reticle.material.color.setHex(pct > 0.5 ? 0x00ff44 : (pct > 0.25 ? 0xffaa00 : 0xff0044));
    }

    if (t.hp <= 0) {
      t.isDead = true;
      if (t.reticle) t.reticle.visible = false;
      const wp = this.meshGroup.position.clone().add(t.relPos);
      this.particleManager.createExplosion(wp, 0x00ff44, 70, 2.5);
      this.particleManager.createEmpShockwave(wp, 30);
      if (window.spaceGameManager && window.spaceGameManager.spaceHUD) {
        window.spaceGameManager.spaceHUD.showRadioTransmission(`DEFENSE BATTERY SILENCED! (${t.name})`, "STARBOUND COMMAND", 3.0);
      }
      if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
    }
    return t.isDead;
  }

  takeCoreDamage(amount, isThermalVent = false) {
    if (this.hasShield) {
      if (this.shieldShaderMat) this.shieldShaderMat.uniforms.uHitTime.value = 1.4;
      return false;
    }
    if (this.phaseShieldTimer > 0) return false;

    const actualDamage = isThermalVent ? amount * 2.5 : amount;
    const prevPhase = this.phase;
    this.coreHp -= actualDamage;

    if (this.shieldShaderMat) this.shieldShaderMat.uniforms.uHitTime.value = 1.0;

    // Phase transitions
    const hpRatio = this.coreHp / this.maxCoreHp;
    if (hpRatio < 0.66 && this.phase === 1) {
      this.phase = 2;
      this.fireTimer *= 0.75;
      if (window.spaceGameManager && window.spaceGameManager.spaceHUD) {
        window.spaceGameManager.spaceHUD.showRadioTransmission("WARNING: ORBITAL ALPHA ENTERING OVERDRIVE! ESCORT FIGHTERS LAUNCHING!", "STARBOUND COMMAND", 5.0);
      }
    }
    if (hpRatio < 0.33 && this.phase === 2) {
      this.phase = 3;
      this.fireTimer *= 0.7;
      if (window.spaceGameManager && window.spaceGameManager.spaceHUD) {
        window.spaceGameManager.spaceHUD.showRadioTransmission("CRITICAL: MOON BASE THERMAL CORE OVERHEATING! FINISH IT NOW!", "STARBOUND COMMAND", 5.0);
      }
    }

    if (this.phase > prevPhase) {
      this.phaseShieldTimer = 2.5;
      this.justPhaseTransitioned = true;
    }

    if (this.coreHp <= 0 && !this.isDying && !this.isDead) {
      this.isDying = true;
      this.deathTimer = 4.5;
      this.turrets.forEach(t => t.isDead = true);
      this.generators.forEach(g => g.isDead = true);
      window.spaceGameManager?.voiceAnnouncer?.speak("Orbital Alpha Selene Moon Base Catastrophic Core Implosion!", true);
      return true;
    }
    return false;
  }

  takeDamage(targetType, amount) {
    return targetType === 'core' ? this.takeCoreDamage(amount) : false;
  }

  _explode() {
    // Multi-phase planetary supernova chain reactions
    this.particleManager.createExplosion(this.meshGroup.position, 0x00ff44, 550, 10.0);
    this.particleManager.createExplosion(this.meshGroup.position, 0xffea00, 400, 8.5);
    this.particleManager.createExplosion(this.meshGroup.position, 0x00f3ff, 350, 7.5);
    this.particleManager.createEmpShockwave(this.meshGroup.position, 250);
    this.particleManager.createEmpShockwave(this.meshGroup.position, 360);
    this.particleManager.spawnSparks(this.meshGroup.position, new THREE.Vector3(0, 1, 0), 0x00ff88, 80);
  }

  clearAllTimers() {
    this.activeIntervals.forEach(id => clearInterval(id));
    this.activeTimeouts.forEach(id => clearTimeout(id));
    this.activeIntervals = [];
    this.activeTimeouts = [];
  }

  destroy() {
    this.isDead = true; // Ensure isDead is set before clearing timers
    this.superlaserfiring = false;
    this.clearAllTimers();
    this.scene.remove(this.meshGroup);
    this.meshGroup.traverse(c => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    });
    // Null out material references so async callbacks can detect disposal
    this.laserBeamMat = null;
    this.outerBeamMat = null;
    this.shieldShaderMat = null;
    this.plasmaShaderMat = null;
    this.conduitMat = null;
    this.vulnMat = null;
    this.barrelMat = null;
  }

  update(dt, playerPos) {
    if (this.isDead || !this.meshGroup) return [];

    if (this.isDying) {
      this.deathTimer -= dt;
      if (Math.random() < 0.94 && this.particleManager) {
        const offset = new THREE.Vector3((Math.random() - 0.5) * 65, (Math.random() - 0.5) * 65, (Math.random() - 0.5) * 45);
        this.particleManager.createExplosion(this.meshGroup.position.clone().add(offset), 0x00ff44, 90, 5.0);
        this.particleManager.createExplosion(this.meshGroup.position.clone().add(offset), 0xffaa00, 70, 4.0);
        this.particleManager.spawnSparks(this.meshGroup.position.clone().add(offset), new THREE.Vector3(0, 1, 0), 0x00ffff, 25);
      }
      this.meshGroup.rotation.z += 0.08 * dt;
      this.meshGroup.rotation.x += 0.04 * dt;
      this.meshGroup.position.y -= 1.5 * dt;
      if (this.deathTimer <= 0) {
        this.isDead = true;
        this._explode();
        this.destroy();
      }
      return [];
    }

    // Progressive hull damage smoke & sparks
    if (this.coreHp < this.maxCoreHp * 0.5 && Math.random() < 0.35 && this.particleManager) {
      const offset = new THREE.Vector3((Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40, 0);
      this.particleManager.spawnEngineParticle(this.meshGroup.position.clone().add(offset), 0x222222);
      this.particleManager.spawnSparks(this.meshGroup.position.clone().add(offset), new THREE.Vector3(0, 1, 0), 0x00ff44, 8);
    }

    const arrived = this.meshGroup.position.z >= this.targetZ;
    if (!arrived) this.meshGroup.position.z += this.speed * dt;

    const time = performance.now() * 0.001;

    this.shaderMaterials.forEach(mat => {
      if (mat.uniforms?.uTime) mat.uniforms.uTime.value = time;
    });

    if (this.phaseShieldTimer > 0) {
      this.phaseShieldTimer -= dt;
      if (this.shieldShaderMat) {
        this.shieldShaderMat.uniforms.uHitTime.value = 1.8;
      }
    } else {
      if (this.shieldShaderMat?.uniforms.uHitTime.value > 0) {
        this.shieldShaderMat.uniforms.uHitTime.value = Math.max(0, this.shieldShaderMat.uniforms.uHitTime.value - dt * 3.5);
      }
    }

    if (this.shieldShaderMat) {
      this.shieldShaderMat.uniforms.uHp.value = this.coreHp / this.maxCoreHp;
    }

    // 1. Majestic slow station rotation & Outer Habitat Ring Counter-Rotation
    this.meshGroup.rotation.y += 0.05 * dt;

    if (this.habRingGroup) {
      this.habRingGroup.rotation.z -= 0.12 * dt;
    }

    // Generator Coils Rotation
    if (this.generators) {
      this.generators.forEach(gen => {
        if (gen.coil && !gen.isDead) gen.coil.rotation.z += 3.2 * dt;
      });
    }

    // Orbiting Mag-Lev Energy Nodes Animation
    if (this.magLevNodes) {
      this.magLevNodes.forEach(node => {
        const curAng = node.baseAngle + time * 1.6;
        node.mesh.position.set(
          Math.cos(curAng) * node.radius,
          Math.sin(curAng) * node.radius,
          0
        );
      });
    }

    // 3D Target Reticles Rotation
    if (this.reticleMeshes) {
      this.reticleMeshes.forEach(r => {
        if (r && r.visible) r.rotation.z += 1.8 * dt;
      });
    }

    // 2. Flashing Navigation Strobe Beacons
    if (this.beaconLights) {
      this.beaconLights.forEach(b => {
        const flash = Math.sin(time * 8.0 + b.phase) > 0.6;
        b.mesh.visible = flash;
      });
    }

    // 3. Superlaser Focus Rings Animation (Spin + Contract during charge)
    if (this.focusRings && this.dishGroup) {
      this.focusRings.forEach(ring => {
        ring.mesh.rotation.z += ring.speed * (this.superlaserfiring ? 7.0 : 1.0) * dt;
        const targetZ = this.superlaserfiring ? (ring.baseZ * 0.4 + 1.2) : ring.baseZ;
        ring.mesh.position.z = THREE.MathUtils.lerp(ring.mesh.position.z, targetZ, dt * 6.0);
        if (ring.mat) {
          ring.mat.opacity = this.superlaserfiring ? (0.9 + Math.sin(time * 20.0) * 0.1) : 0.6;
        }
      });
    }

    // 4. Shield & Vulnerable Point indicator animation
    if (this.shieldRing) {
      this.shieldRing.visible = this.hasShield;
      if (this.hasShield) {
        this.shieldRing.rotation.z += 0.55 * dt;
        this.shieldRing.rotation.x += 0.32 * dt;
      }
    }

    // 4B. Dynamic CIWS Defense Batteries Swivel Tracking towards Player
    if (this.turrets && arrived && playerPos) {
      this.turrets.forEach(t => {
        if (t.barrelGroup && !t.isDead) {
          const worldPos = this.meshGroup.localToWorld(t.relPos.clone());
          t.barrelGroup.lookAt(playerPos);
        }
      });
    }

    // 4C. 8 Superlaser Converging Focus Beams Animation
    if (this.convergeBeams) {
      this.convergeBeams.forEach((beam, idx) => {
        if (this.superlaserfiring) {
          beam.mat.opacity = 0.85 + Math.sin(time * 25.0 + idx) * 0.15;
          beam.mesh.scale.set(1.5, 1.0, 1.5);
        } else {
          beam.mat.opacity = 0.25 + Math.sin(time * 4.0 + idx) * 0.15;
          beam.mesh.scale.set(1.0, 1.0, 1.0);
        }
      });
    }

    if (this.vulnRing && this.vulnMesh && this.vulnMesh.visible) {
      this.vulnRing.rotation.z += 1.8 * dt;
      if (this.vulnMat) {
        this.vulnMat.opacity = 0.5 + Math.sin(time * 8.0) * 0.4;
      }
    }

    // 5. Superlaser dish aim toward player & Direct Targeting Red Aiming Sight
    if (this.dishGroup && arrived) {
      const localTarget = this.meshGroup.worldToLocal(playerPos.clone());
      this.dishGroup.lookAt(localTarget);

      if (this.aimSightMat) {
        if (this.superlaserfiring) {
          this.aimSightMat.opacity = 0.85 + Math.sin(time * 24.0) * 0.15;
        } else if (this.phase >= 2) {
          // Faint pre-targeting laser in Phase 2 & 3
          this.aimSightMat.opacity = 0.25 + Math.sin(time * 6.0) * 0.15;
        } else {
          this.aimSightMat.opacity = 0.0;
        }
      }
    }

    // 6. Phase 3 Meltdown Overdrive Effects (<25% HP)
    if (this.phase === 3 && Math.random() < 0.35) {
      const sparkPos = this.meshGroup.position.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 40
      ));
      this.particleManager.spawnEngineParticle(sparkPos, Math.random() < 0.5 ? 0xff3300 : 0x00ff66);
    }

    // Plasma orb intensity ramps up gently with phase
    if (this.superlightBoss) {
      this.superlightBoss.intensity = 1.0 + Math.sin(time * 4) * 0.25 + this.phase * 0.2;
    }

    // â”€â”€ Superlaser beam attack (every 8s in phase 1, 5s in phase 2, 3.2s in phase 3) â”€â”€
    const laserInterval = this.phase === 1 ? 8 : this.phase === 2 ? 5 : 3.2;
    this.superlasertimer += dt;
    if (this.superlasertimer >= laserInterval && arrived && !this.superlaserfiring) {
      this.superlasertimer = 0;
      this.superlaserfiring = true;
      this._fireSuperLaser();
    }

    // 7. Turret tracking & firing
    if (arrived) {
      this.turrets.forEach(t => {
        if (!t.isDead && t.mesh) {
          const localTarget = this.meshGroup.worldToLocal(playerPos.clone());
          t.mesh.lookAt(localTarget);
        }
      });
    }

    // Turret charge lights (emissive animation)
    this.fireTimer -= dt;
    const chargeRatio = Math.max(0, 1.0 - this.fireTimer / (0.6 / this.phase));
    if (this.barrelMat) {
      this.barrelMat.emissiveIntensity = 0.2 + chargeRatio * 0.6;
    }

    const out = [];
    if (this.fireTimer <= 0 && arrived) {
      this.fireTimer = 0.55 / this.phase;
      this.turrets.forEach(t => {
        if (!t.isDead && t.mesh) {
          out.push(t.mesh.getWorldPosition(new THREE.Vector3()));
        }
      });
    }

    return out.length > 0 ? out : false;
  }

  _fireSuperLaser() {
    if (!this.laserBeamMat || !this.outerBeamMat) return;
    
    // Trigger HUD warning, audio alarm & ramping mobile haptics for incoming superlaser beam
    if (window.spaceGameManager && window.spaceGameManager.spaceHUD) {
      window.spaceGameManager.spaceHUD.showLockOnWarning(true, 'âš ï¸ SUPERLASER TARGETING YOU! DODGE NOW!');
      if (window.spaceGameManager.spaceAudio) window.spaceGameManager.spaceAudio.playLockOnAlarm();
    }
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 200, 50, 400]);
    }

    let alpha = 0;
    const chargeUp = setInterval(() => {
      // Guard: stop if boss was destroyed while this interval was in flight
      if (this.isDead || !this.laserBeamMat || !this.outerBeamMat) {
        clearInterval(chargeUp);
        this.superlaserfiring = false;
        if (window.spaceGameManager && window.spaceGameManager.spaceHUD) {
          window.spaceGameManager.spaceHUD.showLockOnWarning(false);
        }
        return;
      }
      alpha += 0.08;
      this.laserBeamMat.opacity = Math.min(alpha, 0.95);
      this.outerBeamMat.opacity = Math.min(alpha * 0.5, 0.4);
      if (alpha >= 1.0) {
        clearInterval(chargeUp);
        const idx = this.activeIntervals.indexOf(chargeUp);
        if (idx > -1) this.activeIntervals.splice(idx, 1);
        this.superlaserActive = true;

        const timeoutId = setTimeout(() => {
          this.superlaserActive = false;
          // Guard: stop if boss was destroyed during the hold phase
          if (this.isDead || !this.laserBeamMat || !this.outerBeamMat) {
            this.superlaserfiring = false;
            return;
          }
          const tIdx = this.activeTimeouts.indexOf(timeoutId);
          if (tIdx > -1) this.activeTimeouts.splice(tIdx, 1);

          const fadeOut = setInterval(() => {
            // Guard: stop if boss was destroyed during fade-out
            if (this.isDead || !this.laserBeamMat || !this.outerBeamMat) {
              clearInterval(fadeOut);
              this.superlaserfiring = false;
              this.superlaserActive = false;
              return;
            }
            alpha -= 0.04;
            this.laserBeamMat.opacity = Math.max(0, alpha);
            this.outerBeamMat.opacity = Math.max(0, alpha * 0.4);
            if (alpha <= 0) {
              clearInterval(fadeOut);
              const fIdx = this.activeIntervals.indexOf(fadeOut);
              if (fIdx > -1) this.activeIntervals.splice(fIdx, 1);
              this.superlaserfiring = false;
              this.superlaserActive = false;
              if (window.spaceGameManager && window.spaceGameManager.spaceHUD) {
                window.spaceGameManager.spaceHUD.showLockOnWarning(false);
              }
            }
          }, 30);
          this.activeIntervals.push(fadeOut);
        }, 700);
        this.activeTimeouts.push(timeoutId);
      }
    }, 40);
    this.activeIntervals.push(chargeUp);
  }
}
