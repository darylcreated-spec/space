import * as THREE from 'three';

/**
 * Procedural Normal/Bump Texture for Enemy Capital Cruiser Armor (Deep Obsidian-Crimson with Gold Accents)
 */
function generateCruiserArmorTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Base metallic deep obsidian-charcoal alloy
  ctx.fillStyle = '#160d20';
  ctx.fillRect(0, 0, 256, 256);

  // Crimson & fiery magma geometric panel seams
  ctx.strokeStyle = '#e61c47';
  ctx.lineWidth = 2.4;
  for (let x = 0; x < 256; x += 32) {
    ctx.strokeRect(x, 0, 32, 256);
  }
  for (let y = 0; y < 256; y += 32) {
    ctx.strokeRect(0, y, 256, 32);
  }

  // Radiant Imperial Gold micro-rivets along armor boundaries
  ctx.fillStyle = '#ffbb00';
  for (let y = 4; y < 256; y += 16) {
    for (let x = 4; x < 256; x += 32) {
      ctx.beginPath();
      ctx.arc(x, y, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Glowing neon magenta and electric purple energized circuit conduits
  ctx.strokeStyle = '#ff0055';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(0, 128); ctx.lineTo(64, 128); ctx.lineTo(96, 96); ctx.lineTo(256, 96);
  ctx.stroke();

  ctx.strokeStyle = '#c800ff';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, 64); ctx.lineTo(128, 64); ctx.lineTo(160, 32); ctx.lineTo(256, 32);
  ctx.stroke();

  return new THREE.CanvasTexture(canvas);
}

export class CapitalShip {
  constructor(scene, particleManager, spawnOffset = null) {
    this.scene = scene;
    this.particleManager = particleManager;

    this.isAllied = false;
    this.isEnemy = true;
    this.radius = 6.0;
    this.hp = 850;
    this.maxHp = 850;
    this.scoreValue = 1800;
    this.isDead = false;

    this.meshGroup = new THREE.Group();

    // Spawn on defensive escort flank near boss or in formation
    this.flankSide = Math.random() > 0.5 ? 1 : -1;
    const spawnX = spawnOffset ? spawnOffset.x : this.flankSide * (18 + Math.random() * 4);
    const spawnY = spawnOffset ? spawnOffset.y : 2 + (Math.random() - 0.5) * 3;
    const spawnZ = spawnOffset ? spawnOffset.z : -85;
    this.meshGroup.position.set(spawnX, spawnY, spawnZ);

    this.targetZ = -15; // Hover and strafe in combat
    this.baseSpeed = 16;
    this.speed = this.baseSpeed;
    this.baseStrafeFreq = 1.1;
    this.strafeFreq = this.baseStrafeFreq;
    this.fireTimer = 1.4;
    this._time = Math.random() * 100;

    // ── Dynamic Mass & Inertia Reduction Physics ──
    this.baseMass = 48000; // 48,000 kg (48 metric tons)
    this.mass = this.baseMass;
    this.massRatio = 1.0;
    this.baseRadius = 6.2;
    this.radius = this.baseRadius;
    this.recoilVelocity = new THREE.Vector3(0, 0, 0);

    this.turrets = [
      { id: 0, relPos: new THREE.Vector3(-3.2, 1.2, -0.5), pedestalH: 1.6, hp: 220, maxHp: 220, isDead: false, mesh: null, barrelGroup: null },
      { id: 1, relPos: new THREE.Vector3( 3.2, 1.2, -0.5), pedestalH: 1.6, hp: 220, maxHp: 220, isDead: false, mesh: null, barrelGroup: null }
    ];
    this.underwingMissiles = [];
    this.missileTimer = 3.0;
    this.thrusters = [];
    this.breakableParts = [];
    this.detachedPartsCount = 0;
    this.breakCooldown = 0; // Paced detachment cooldown (prevents rapid-fire part drop-offs)
    this.activeRuptureSockets = []; // Active exposed damaged hull sockets

    this.buildMesh();
    this.scene.add(this.meshGroup);
  }

  buildMesh() {
    this.armorTexture = generateCruiserArmorTexture();

    // ── Vibrant AAA Sci-Fi Materials (Obsidian, Crimson Magma, Imperial Gold, Radiant Neon) ──
    this.hullMat = new THREE.MeshStandardMaterial({
      color: 0x1f1128,
      bumpMap: this.armorTexture,
      bumpScale: 0.18,
      metalness: 0.94,
      roughness: 0.26,
      emissive: 0x440822,
      emissiveIntensity: 0.38
    });

    this.armorPlatesMat = new THREE.MeshStandardMaterial({
      color: 0xe61c47,
      metalness: 0.88,
      roughness: 0.22,
      bumpMap: this.armorTexture,
      bumpScale: 0.22,
      emissive: 0x880e28,
      emissiveIntensity: 0.75
    });

    this.goldTrimMat = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      metalness: 0.96,
      roughness: 0.12,
      emissive: 0x552a00,
      emissiveIntensity: 0.6
    });

    this.darkAlloyMat = new THREE.MeshStandardMaterial({
      color: 0x181024,
      metalness: 0.95,
      roughness: 0.28,
      emissive: 0x220515,
      emissiveIntensity: 0.35
    });

    // ── Damaged Sub-Structure Materials (Exposed Skeleton, Charred Slag, Sparking Conduits) ──
    this.scorchedSkeletonMat = new THREE.MeshStandardMaterial({
      color: 0x100a18,
      metalness: 0.98,
      roughness: 0.82,
      emissive: 0x330510,
      emissiveIntensity: 0.65
    });

    this.exposedConduitMat = new THREE.MeshStandardMaterial({
      color: 0xff3300,
      emissive: 0xff3300,
      emissiveIntensity: 3.0,
      roughness: 0.0,
      metalness: 0.0,
      toneMapped: false,
      transparent: true,
      opacity: 0.95
    });

    this.exposedSparkMat = new THREE.MeshStandardMaterial({
      color: 0x00f3ff,
      emissive: 0x00f3ff,
      emissiveIntensity: 3.5,
      roughness: 0.0,
      metalness: 0.0,
      toneMapped: false,
      transparent: true,
      opacity: 0.95
    });

    this.glowCrimsonMat = new THREE.MeshBasicMaterial({
      color: 0xff0044,
      transparent: true,
      opacity: 0.98,
      blending: THREE.AdditiveBlending
    });

    this.glowMagmaMat = new THREE.MeshBasicMaterial({
      color: 0xff5500,
      transparent: true,
      opacity: 0.98,
      blending: THREE.AdditiveBlending
    });

    this.glowVioletMat = new THREE.MeshBasicMaterial({
      color: 0xc800ff,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending
    });

    this.glowGoldMat = new THREE.MeshBasicMaterial({
      color: 0xffbb00,
      transparent: true,
      opacity: 0.95
    });

    // ── 1. Central Wedged Dreadnought Hull with Gold Spine ──
    const mainHullGeo = new THREE.BoxGeometry(3.6, 1.4, 8.4);
    const mainHull = new THREE.Mesh(mainHullGeo, this.hullMat);
    mainHull.position.set(0, 0, 0);
    this.meshGroup.add(mainHull);

    // Radiant Gold Keel Spine & Underlying Rupture Socket
    const keelGeo = new THREE.BoxGeometry(0.5, 0.4, 8.6);
    const keel = new THREE.Mesh(keelGeo, this.goldTrimMat);
    keel.position.set(0, -0.75, 0);
    this.meshGroup.add(keel);

    const keelSocket = new THREE.Group();
    keelSocket.position.set(0, -0.65, 0);
    const kSkel = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 8.2), this.scorchedSkeletonMat);
    keelSocket.add(kSkel);
    keelSocket.visible = false;
    this.meshGroup.add(keelSocket);
    this.breakableParts.push({ id: 'keel', mesh: keel, socketMesh: keelSocket, name: 'Gold Keel Spine' });

    // Chisel-head bow prow (Vibrant Magma Crimson) & Underlying Damaged Framework
    const prowGeo = new THREE.ConeGeometry(2.2, 4.2, 4);
    prowGeo.rotateX(Math.PI / 2);
    prowGeo.scale(1.2, 0.45, 1.0);
    const prow = new THREE.Mesh(prowGeo, this.armorPlatesMat);
    prow.position.set(0, 0, 5.2);
    this.meshGroup.add(prow);

    const prowSocket = new THREE.Group();
    prowSocket.position.set(0, 0, 4.2);
    const pSkelGeo = new THREE.CylinderGeometry(0.4, 1.3, 2.4, 4);
    pSkelGeo.rotateX(Math.PI / 2);
    const pSkel = new THREE.Mesh(pSkelGeo, this.scorchedSkeletonMat);
    prowSocket.add(pSkel);
    const pPipe1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2, 6), this.exposedConduitMat);
    pPipe1.rotateX(Math.PI / 2);
    pPipe1.position.set(-0.4, 0.1, 0);
    prowSocket.add(pPipe1);
    const pPipe2 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2, 6), this.exposedConduitMat);
    pPipe2.rotateX(Math.PI / 2);
    pPipe2.position.set(0.4, -0.1, 0);
    prowSocket.add(pPipe2);
    prowSocket.visible = false;
    this.meshGroup.add(prowSocket);
    this.breakableParts.push({ id: 'prow', mesh: prow, socketMesh: prowSocket, name: 'Prow Armor Nose' });

    // Glowing Crimson Energy Ram
    const ramGeo = new THREE.BoxGeometry(0.35, 0.35, 3.8);
    const ram = new THREE.Mesh(ramGeo, this.glowCrimsonMat);
    ram.position.set(0, 0, 5.6);
    this.meshGroup.add(ram);
    this.breakableParts.push({ id: 'ram', mesh: ram, name: 'Crimson Energy Ram' });

    // ── 2. Dorsal Command Bridge Spire & Underlying Damaged Foundation ──
    const bridgeSpireGeo = new THREE.BoxGeometry(1.6, 0.9, 2.6);
    const bridgeSpire = new THREE.Mesh(bridgeSpireGeo, this.armorPlatesMat);
    bridgeSpire.position.set(0, 0.95, -1.2);
    this.meshGroup.add(bridgeSpire);

    // Glowing Crimson Bridge Visor
    const visorGeo = new THREE.BoxGeometry(1.4, 0.25, 0.6);
    const visor = new THREE.Mesh(visorGeo, this.glowCrimsonMat);
    visor.position.set(0, 1.1, -0.4);
    this.meshGroup.add(visor);

    const bridgeSocket = new THREE.Group();
    bridgeSocket.position.set(0, 0.65, -1.2);
    const bSkel = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.35, 2.4), this.scorchedSkeletonMat);
    bridgeSocket.add(bSkel);
    const bWire = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 2.2), this.exposedSparkMat);
    bWire.position.set(0, 0.2, 0);
    bridgeSocket.add(bWire);
    bridgeSocket.visible = false;
    this.meshGroup.add(bridgeSocket);
    this.breakableParts.push({ id: 'bridge', mesh: bridgeSpire, socketMesh: bridgeSocket, name: 'Command Bridge Spire' });

    // ── 3. Port & Starboard Heavy Outrigger Sponsons & Swept Warship Wings ──
    [-1, 1].forEach(side => {
      const sx = side * 3.2;

      // Heavy Inboard Sponson
      const sponsonGeo = new THREE.BoxGeometry(2.4, 0.8, 6.0);
      const sponson = new THREE.Mesh(sponsonGeo, this.hullMat);
      sponson.position.set(sx, 0, -0.2);
      this.meshGroup.add(sponson);

      // Connecting Pylon Strut
      const strutGeo = new THREE.BoxGeometry(1.6, 0.35, 2.2);
      const strut = new THREE.Mesh(strutGeo, this.darkAlloyMat);
      strut.position.set(side * 1.9, 0, -0.5);
      this.meshGroup.add(strut);

      // Sponson Magma Armor Plating & Underlying Rupture Socket
      const pPlateGeo = new THREE.BoxGeometry(2.5, 0.15, 4.0);
      const pPlate = new THREE.Mesh(pPlateGeo, this.armorPlatesMat);
      pPlate.position.set(sx, 0.45, -0.2);
      this.meshGroup.add(pPlate);

      const sponsonSocket = new THREE.Group();
      sponsonSocket.position.set(sx, 0.38, -0.2);
      const sSkel = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.18, 3.8), this.scorchedSkeletonMat);
      sponsonSocket.add(sSkel);
      const sConduit = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 3.4), this.exposedConduitMat);
      sConduit.position.set(0, 0.1, 0);
      sponsonSocket.add(sConduit);
      sponsonSocket.visible = false;
      this.meshGroup.add(sponsonSocket);
      this.breakableParts.push({ id: `sponson_${side}`, mesh: pPlate, socketMesh: sponsonSocket, name: 'Sponson Armor Plating' });

      // Gold Trim Sponson Edge
      const pGoldGeo = new THREE.BoxGeometry(0.2, 0.2, 4.2);
      const pGold = new THREE.Mesh(pGoldGeo, this.goldTrimMat);
      pGold.position.set(sx + side * 1.3, 0.45, -0.2);
      this.meshGroup.add(pGold);

      // ── ✨ SWEPT CAPITAL WARSHIP WING (Extending to 7.2m Span) ──
      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, 1.8);
      wingShape.lineTo(side * 3.8, -0.4);  // Outward swept wingtip leading edge
      wingShape.lineTo(side * 3.6, -2.4);  // Wingtip trailing edge
      wingShape.lineTo(0, -1.8);           // Root trailing edge
      wingShape.closePath();

      const wingExtrude = { depth: 0.22, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.05, bevelThickness: 0.05 };
      const wingGeo = new THREE.ExtrudeGeometry(wingShape, wingExtrude);
      wingGeo.rotateX(-Math.PI / 2);
      const wingMesh = new THREE.Mesh(wingGeo, this.hullMat);
      wingMesh.position.set(sx, 0.05, 0);
      this.meshGroup.add(wingMesh);

      // Titanium Leading Edge Armor Slat (Magma Crimson) & Rupture Socket
      const slatGeo = new THREE.BoxGeometry(0.24, 0.28, 4.2);
      const slatMesh = new THREE.Mesh(slatGeo, this.armorPlatesMat);
      slatMesh.position.set(sx + side * 1.9, 0.1, 0.7);
      slatMesh.rotation.y = -side * 0.45;
      this.meshGroup.add(slatMesh);

      const slatSocket = new THREE.Group();
      slatSocket.position.set(sx + side * 1.85, 0.08, 0.7);
      slatSocket.rotation.y = -side * 0.45;
      const slatSkel = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 4.0), this.scorchedSkeletonMat);
      slatSocket.add(slatSkel);
      slatSocket.visible = false;
      this.meshGroup.add(slatSocket);
      this.breakableParts.push({ id: `slat_${side}`, mesh: slatMesh, socketMesh: slatSocket, name: 'Leading Edge Wing Slat' });

      // Glowing Neon Magma Wing Conduit
      const conduitGeo = new THREE.BoxGeometry(0.12, 0.12, 3.6);
      const conduit = new THREE.Mesh(conduitGeo, this.glowMagmaMat);
      conduit.position.set(sx + side * 1.8, 0.18, 0.6);
      conduit.rotation.y = -side * 0.45;
      this.meshGroup.add(conduit);

      // Vertical Wingtip Winglet Stabilizer (Imperial Gold & Crimson) & Rupture Socket
      const wingletGeo = new THREE.BoxGeometry(0.18, 1.4, 2.2);
      const winglet = new THREE.Mesh(wingletGeo, this.goldTrimMat);
      winglet.position.set(sx + side * 3.7, 0.5, -1.4);
      winglet.rotation.x = -0.15;
      winglet.rotation.z = side * 0.12;
      this.meshGroup.add(winglet);

      const wingletSocket = new THREE.Group();
      wingletSocket.position.set(sx + side * 3.65, 0.35, -1.4);
      const wSkel = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.55, 2.0), this.scorchedSkeletonMat);
      wingletSocket.add(wSkel);
      const wSpark = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 1.2), this.exposedSparkMat);
      wSpark.position.set(0, 0.3, 0);
      wingletSocket.add(wSpark);
      wingletSocket.visible = false;
      this.meshGroup.add(wingletSocket);
      this.breakableParts.push({ id: `winglet_${side}`, mesh: winglet, socketMesh: wingletSocket, name: 'Winglet Stabilizer' });

      // Winglet Crimson Navigation Beacon
      const wBeaconGeo = new THREE.BoxGeometry(0.12, 1.2, 0.15);
      const wBeacon = new THREE.Mesh(wBeaconGeo, this.glowCrimsonMat);
      wBeacon.position.set(sx + side * 3.75, 0.5, -2.4);
      this.meshGroup.add(wBeacon);

      // ── 🚀 UNDERWING HEAVY MISSILE PYLONS & TORPEDO ORDNANCE ──
      const missilePylonGeo = new THREE.BoxGeometry(0.08, 0.32, 1.4);
      const missileBodyGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.8, 8);
      missileBodyGeo.rotateX(Math.PI / 2);
      const warheadGeo = new THREE.ConeGeometry(0.14, 0.45, 8);
      warheadGeo.rotateX(Math.PI / 2);
      const finGeo = new THREE.BoxGeometry(0.5, 0.04, 0.4);

      [
        { id: `${side < 0 ? 'port' : 'starboard'}_inboard`,  x: sx + side * 1.4, y: -0.32, z: 0.2 },
        { id: `${side < 0 ? 'port' : 'starboard'}_outboard`, x: sx + side * 2.6, y: -0.32, z: -0.6 }
      ].forEach(mPos => {
        const mGroup = new THREE.Group();
        mGroup.position.set(mPos.x, mPos.y, mPos.z);

        // Armored Suspension Pylon
        const pylon = new THREE.Mesh(missilePylonGeo, this.darkAlloyMat);
        pylon.position.set(0, 0.16, 0);
        mGroup.add(pylon);

        // Sleek Cylindrical Missile Fuselage (Charcoal Alloy)
        const mBody = new THREE.Mesh(missileBodyGeo, this.darkAlloyMat);
        mGroup.add(mBody);

        // Kinetic Warhead Cone with Magma Seeker Tip
        const warhead = new THREE.Mesh(warheadGeo, this.glowMagmaMat);
        warhead.position.set(0, 0, 1.1);
        mGroup.add(warhead);

        // Seeker Optical Lens (Crimson)
        const seeker = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), this.glowCrimsonMat);
        seeker.position.set(0, 0, 1.35);
        mGroup.add(seeker);

        // Cruciform Tail Stabilizer Fins (Imperial Gold)
        const fin1 = new THREE.Mesh(finGeo, this.goldTrimMat);
        fin1.position.set(0, 0, -0.7);
        mGroup.add(fin1);

        const fin2 = new THREE.Mesh(finGeo, this.goldTrimMat);
        fin2.position.set(0, 0, -0.7);
        fin2.rotation.z = Math.PI / 2;
        mGroup.add(fin2);

        // Glowing Solid Rocket Exhaust Port
        const nozzle = new THREE.Mesh(new THREE.RingGeometry(0.04, 0.1, 8), this.glowMagmaMat);
        nozzle.position.set(0, 0, -0.92);
        mGroup.add(nozzle);

        this.meshGroup.add(mGroup);

        this.underwingMissiles.push({
          id: mPos.id,
          mesh: mGroup,
          relPos: new THREE.Vector3(mPos.x, mPos.y, mPos.z),
          hp: 60,
          isDead: false
        });
      });
    });

    // ── 4. ✨ SWEPT DORSAL EMPENNAGE TAIL FIN ──
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, 1.6, -3.2);

    const tailFinGeo = new THREE.BoxGeometry(0.4, 2.4, 3.8);
    const tailFin = new THREE.Mesh(tailFinGeo, this.hullMat);
    tailFin.position.set(0, 0.9, 0);
    tailFin.rotation.x = -0.3; // Swept backwards
    tailGroup.add(tailFin);

    // Titanium Leading Edge Armor Spine (Gold & Crimson) & Rupture Socket
    const tailSpineGeo = new THREE.BoxGeometry(0.5, 2.6, 0.6);
    const tailSpine = new THREE.Mesh(tailSpineGeo, this.armorPlatesMat);
    tailSpine.position.set(0, 0.9, 1.6);
    tailSpine.rotation.x = -0.3;
    tailGroup.add(tailSpine);

    const tailSocket = new THREE.Group();
    tailSocket.position.set(0, 0.9, 1.4);
    tailSocket.rotation.x = -0.3;
    const tSkel = new THREE.Mesh(new THREE.BoxGeometry(0.36, 2.3, 0.4), this.scorchedSkeletonMat);
    tailSocket.add(tSkel);
    tailSocket.visible = false;
    tailGroup.add(tailSocket);
    this.breakableParts.push({ id: 'tailSpine', mesh: tailSpine, socketMesh: tailSocket, name: 'Dorsal Tail Armor Spine' });

    // Glowing Neon Crimson Trailing Beacon Strip
    const tailBeaconGeo = new THREE.BoxGeometry(0.2, 2.2, 0.2);
    const tailBeacon = new THREE.Mesh(tailBeaconGeo, this.glowCrimsonMat);
    tailBeacon.position.set(0, 0.9, -1.6);
    tailBeacon.rotation.x = -0.3;
    tailGroup.add(tailBeacon);

    // Dorsal Tail Antenna Mast
    const tailAntennaGeo = new THREE.CylinderGeometry(0.04, 0.08, 1.8, 6);
    const tailAntenna = new THREE.Mesh(tailAntennaGeo, this.goldTrimMat);
    tailAntenna.position.set(0, 2.4, -0.6);
    tailGroup.add(tailAntenna);

    this.meshGroup.add(tailGroup);

    // ── 5. Twin Point-Defense Dual-Railgun Turrets (Elevated Superfiring Barbettes!) ──
    const turretBarbetteGeo = new THREE.CylinderGeometry(0.75, 0.95, 0.4, 8);
    const turretHouseGeo = new THREE.BoxGeometry(0.9, 0.5, 1.1);
    const barrelGeo = new THREE.CylinderGeometry(0.08, 0.1, 1.6, 8);
    barrelGeo.rotateX(Math.PI / 2);

    this.turrets.forEach(t => {
      const tGroup = new THREE.Group();
      tGroup.position.copy(t.relPos);

      // Armored Riser Pedestal
      const pedH = t.pedestalH || 1.6;
      const pedGeo = new THREE.CylinderGeometry(0.85, 1.1, pedH, 8);
      const pedMesh = new THREE.Mesh(pedGeo, this.darkAlloyMat);
      pedMesh.position.set(0, -pedH / 2, 0);
      tGroup.add(pedMesh);

      const barbette = new THREE.Mesh(turretBarbetteGeo, this.goldTrimMat);
      tGroup.add(barbette);

      const barrelGroup = new THREE.Group();
      barrelGroup.position.set(0, 0.35, 0);

      const house = new THREE.Mesh(turretHouseGeo, this.armorPlatesMat);
      barrelGroup.add(house);

      [-0.24, 0.24].forEach(bx => {
        const barrel = new THREE.Mesh(barrelGeo, this.darkAlloyMat);
        barrel.position.set(bx, 0.08, 0.7);
        barrelGroup.add(barrel);

        const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.2, 8), this.glowMagmaMat);
        tip.rotateX(Math.PI / 2);
        tip.position.set(bx, 0.08, 1.5);
        barrelGroup.add(tip);
      });

      tGroup.add(barrelGroup);
      this.meshGroup.add(tGroup);

      t.mesh = tGroup;
      t.barrelGroup = barrelGroup;
    });

    // ── 6. Stern Twin Heavy Vectoring Ion Thrusters (Violet Warp Core & Magma Flames) ──
    [-1.1, 1.1].forEach(ex => {
      const engineNacelle = new THREE.Group();
      engineNacelle.position.set(ex, 0, -4.5);

      const cowlGeo = new THREE.BoxGeometry(1.3, 1.1, 2.2);
      const cowlMesh = new THREE.Mesh(cowlGeo, this.darkAlloyMat);
      engineNacelle.add(cowlMesh);

      // Exhaust Nozzle with Gold Ring
      const nozzleGeo = new THREE.CylinderGeometry(0.45, 0.6, 0.8, 10);
      nozzleGeo.rotateX(Math.PI / 2);
      const nozzleMesh = new THREE.Mesh(nozzleGeo, this.goldTrimMat);
      nozzleMesh.position.set(0, 0, -1.2);
      engineNacelle.add(nozzleMesh);

      // Glowing Violet Warp Exhaust Core
      const coreGeo = new THREE.PlaneGeometry(0.8, 0.8);
      coreGeo.rotateY(Math.PI);
      const coreMesh = new THREE.Mesh(coreGeo, this.glowVioletMat);
      coreMesh.position.set(0, 0, -1.62);
      engineNacelle.add(coreMesh);

      // Pulsating Mach Shock Diamond (Molten Magma Orange)
      const shockGeo = new THREE.ConeGeometry(0.35, 1.8, 8);
      shockGeo.rotateX(-Math.PI / 2);
      const shockMesh = new THREE.Mesh(shockGeo, this.glowMagmaMat);
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
    const torpedoCore = new THREE.Mesh(torpedoCoreGeo, this.glowCrimsonMat);
    torpedoCore.position.set(0, -0.65, 4.2);
    this.meshGroup.add(torpedoCore);

    // Dedicated Point Light for Rich Armor Glow
    this.keyLight = new THREE.PointLight(0xff2255, 4.0, 50);
    this.keyLight.position.set(0, 6.0, 3.0);
    this.meshGroup.add(this.keyLight);
  }

  takeTurretDamage(turretId, amount) {
    const t = this.turrets.find(tur => tur.id === turretId);
    if (!t || t.isDead) return false;
    t.hp -= amount;

    if (t.hp <= 0) {
      t.isDead = true;
      if (t.mesh) t.mesh.visible = false;
      const wp = t.mesh.getWorldPosition(new THREE.Vector3());
      if (this.particleManager) {
        this.particleManager.createExplosion(wp, 0x00f3ff, 40, 1.8);
      }
      return true;
    }
    return false;
  }

  takeDamage(amount, hitPos = null) {
    const impactPoint = hitPos ? hitPos.clone() : this.meshGroup.position.clone();

    // Check if hit landed on a turret
    if (hitPos && this.turrets) {
      for (const t of this.turrets) {
        if (!t.isDead && t.mesh) {
          const tPos = t.mesh.getWorldPosition(new THREE.Vector3());
          if (hitPos.distanceTo(tPos) < 2.0) {
            this.takeTurretDamage(t.id, amount * 1.5);
            break;
          }
        }
      }
    }

    // Check if hit landed on an underwing missile
    if (hitPos && this.underwingMissiles) {
      for (const m of this.underwingMissiles) {
        if (!m.isDead && m.mesh) {
          const mPos = m.mesh.getWorldPosition(new THREE.Vector3());
          if (hitPos.distanceTo(mPos) < 1.4) {
            m.hp -= amount * 1.5;
            if (m.hp <= 0) {
              m.isDead = true;
              m.mesh.visible = false;
              if (this.particleManager) {
                this.particleManager.createExplosion(mPos, 0xff7700, 30, 1.4);
                this.particleManager.spawnSparks(mPos, new THREE.Vector3(0, -1, 0), 0xffaa00, 15);
              }
            }
            break;
          }
        }
      }
    }

    this.hp -= amount;

    // ── 💥 1. Spawn Varied High-Velocity Metal Debris & Armor Shards on Every Impact ──
    if (this.particleManager) {
      this.particleManager.createLaserImpact(impactPoint, new THREE.Vector3(0, 0, 1), 0xff0055);
      this.particleManager.spawnSparks(impactPoint, new THREE.Vector3(0, 0, 1), 0xffaa00, 14);
      if (this.particleManager.spawnMetalDebris) {
        // Multi-shaped, multi-colored sci-fi alloy shards (Obsidian, Crimson Magma, Imperial Gold, Slag, Neon)
        this.particleManager.spawnMetalDebris(impactPoint, 3);
      }
    }

    // ── 🔨 2. Phased Physical Component Detachment & Mass Reduction ──
    // Paced over distinct combat damage phases with realistic cooldown interval
    if (this.breakableParts && this.breakableParts.length > 0) {
      const hpRatio = Math.max(0, this.hp / this.maxHp);
      const totalParts = this.breakableParts.length + this.detachedPartsCount;
      const shouldBreakTarget = Math.floor((1.0 - hpRatio) * totalParts);

      // Only drop 1 major component at a time when cooldown allows (smooth, realistic pacing)
      if (this.detachedPartsCount < shouldBreakTarget && this.breakCooldown <= 0 && this.breakableParts.length > 0) {
        this.detachedPartsCount++;
        this.breakCooldown = 1.4; // 1.4s pacing between major plate shear-offs
        const part = this.breakableParts.shift();

        // ⚖️ Dynamically Reduce Vessel Structural Mass & Shrink Armor Hitbox
        const partMassLoss = (this.baseMass * 0.65) / (totalParts || 8);
        this.mass = Math.max(this.baseMass * 0.35, this.mass - partMassLoss);
        this.massRatio = this.mass / this.baseMass;

        // Shrink collision boundary radius as exterior armor is stripped away
        this.radius = this.baseRadius * (0.60 + 0.40 * this.massRatio);

        // Agility and top speed surge due to higher thrust-to-weight ratio!
        this.speed = this.baseSpeed * (1.0 + (1.0 - this.massRatio) * 0.75);
        this.strafeFreq = this.baseStrafeFreq * (1.0 + (1.0 - this.massRatio) * 0.90);

        if (part && part.mesh && part.mesh.parent) {
          const worldPos = new THREE.Vector3();
          const worldQuat = new THREE.Quaternion();
          const worldScale = new THREE.Vector3();
          part.mesh.getWorldPosition(worldPos);
          part.mesh.getWorldQuaternion(worldQuat);
          part.mesh.getWorldScale(worldScale);

          // Detach from cruiser hierarchy and place directly in space scene
          part.mesh.parent.remove(part.mesh);
          part.mesh.position.copy(worldPos);
          part.mesh.quaternion.copy(worldQuat);
          part.mesh.scale.copy(worldScale);
          this.scene.add(part.mesh);

          // 🚨 Activate underlying damaged skeleton socket on the ship (ship permanently changes appearance!)
          if (part.socketMesh) {
            part.socketMesh.visible = true;
            this.activeRuptureSockets.push(part.socketMesh);
          }

          // Realistic physical tumbling velocity
          const spreadX = (Math.random() - 0.5) * 12.0;
          const spreadY = 2.5 + (Math.random() - 0.5) * 6.0;
          const spreadZ = 7.0 + Math.random() * 16.0;

          if (this.particleManager && this.particleManager.metalDebris) {
            this.particleManager.metalDebris.push({
              mesh: part.mesh,
              geo: part.mesh.geometry,
              mat: part.mesh.material,
              vx: spreadX,
              vy: spreadY,
              vz: spreadZ,
              rotSpeedX: (Math.random() - 0.5) * 6.0,
              rotSpeedY: (Math.random() - 0.5) * 6.0,
              rotSpeedZ: (Math.random() - 0.5) * 6.0,
              life: 1.0,
              decay: 0.16 // Tumbles for ~6 seconds
            });

            // Realistic fracture burst at detachment seam with matching varied debris
            this.particleManager.createExplosion(worldPos, 0xff3300, 55, 2.0);
            this.particleManager.spawnSparks(worldPos, new THREE.Vector3(0, 1, 1), 0xffd700, 25);
            this.particleManager.spawnMetalDebris(worldPos, 4);
          }
        }
      }
    }

    // ── 🌀 Kinetic Recoil & Impact Kickback (Higher on lightened hulls) ──
    const kickbackForce = (amount * 0.35) / Math.max(0.35, this.massRatio);
    this.recoilVelocity.z -= kickbackForce * 0.06;
    this.recoilVelocity.x += (Math.random() - 0.5) * kickbackForce * 0.10;

    // Emissive damage flash feedback
    if (this.hullMat) {
      this.hullMat.emissive.setHex(0xff0055);
      this.hullMat.emissiveIntensity = 2.4;
      setTimeout(() => {
        if (this.isDead) return;
        if (this.hullMat) {
          this.hullMat.emissive.setHex(0x440822);
          this.hullMat.emissiveIntensity = 0.38;
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
    this.particleManager.createExplosion(this.meshGroup.position, 0xff0055, 130, 3.5);
    this.particleManager.createExplosion(this.meshGroup.position, 0xffaa00, 90, 2.6);
    this.particleManager.spawnSparks(this.meshGroup.position, new THREE.Vector3(0, 0, 1), 0xffd700, 30);
    this.particleManager.createEmpShockwave(this.meshGroup.position, 45);
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
    if (this.breakCooldown > 0) this.breakCooldown -= dt;
    const gm = window.spaceGameManager;

    // ── Continuous dynamic electrical sparks & smoke from active exposed rupture sockets ──
    if (this.activeRuptureSockets.length > 0 && Math.random() < 0.35 && this.particleManager) {
      const randomSocket = this.activeRuptureSockets[Math.floor(Math.random() * this.activeRuptureSockets.length)];
      if (randomSocket && randomSocket.parent) {
        const socketPos = randomSocket.getWorldPosition(new THREE.Vector3());
        this.particleManager.spawnSparks(socketPos, new THREE.Vector3((Math.random() - 0.5) * 2, 1, 1), 0x00f3ff, 6);
      }
    }

    // ── Dynamic Recoil Physics Impulse & Mass Damping ──
    if (this.recoilVelocity.lengthSq() > 0.001) {
      this.meshGroup.position.addScaledVector(this.recoilVelocity, dt);
      this.recoilVelocity.multiplyScalar(Math.pow(0.06, dt));
    }

    // Pulsing Ion Thruster Shock Diamonds
    if (this.thrusters && this.thrusters.length > 0) {
      const pulse = 0.88 + Math.sin(Date.now() * 0.016) * 0.22;
      this.thrusters.forEach(t => {
        if (t && t.scale) t.scale.set(pulse, pulse, pulse * 1.25);
      });
    }

    // ── Boss Escort & Combat Formation AI (Factoring Reduced Mass Agility) ──
    const asteroidBoss = gm && gm.activeBoss && !gm.activeBoss.isDead && gm.activeBoss.armorPlates ? gm.activeBoss : null;

    if (asteroidBoss && asteroidBoss.meshGroup) {
      // Flank and protect the Titan Asteroid Colossus!
      const bPos = asteroidBoss.meshGroup.position;
      const targetFlankX = bPos.x + this.flankSide * 20;
      const targetFlankY = bPos.y + 1.5 + Math.sin(this._time * this.strafeFreq) * 1.5;
      const targetFlankZ = Math.min(-14, bPos.z + 8);

      const agilityRate = 2.0 + (1.0 - this.massRatio) * 1.5;
      this.meshGroup.position.x += (targetFlankX - this.meshGroup.position.x) * dt * agilityRate;
      this.meshGroup.position.y += (targetFlankY - this.meshGroup.position.y) * dt * agilityRate;
      this.meshGroup.position.z += (targetFlankZ - this.meshGroup.position.z) * dt * agilityRate;
    } else {
      // Standard aggressive battle cruise
      if (this.meshGroup.position.z < this.targetZ) {
        this.meshGroup.position.z += this.speed * dt;
      } else {
        this.meshGroup.position.z += Math.sin(this._time * this.strafeFreq) * 0.8 * dt;
        this.meshGroup.position.x += Math.cos(this._time * (this.strafeFreq * 0.8)) * 1.8 * dt;
      }
    }

    // Turrets aim at Player Starfighter
    this.turrets.forEach(t => {
      if (!t.isDead && t.barrelGroup) {
        const localTarget = this.meshGroup.worldToLocal(playerPos.clone());
        localTarget.y = Math.max(localTarget.y, t.relPos.y + 0.15);
        t.barrelGroup.lookAt(localTarget);
      }
    });

    // ── Underwing Enemy Homing Micro-Missile Salvo ──
    this.missileTimer -= dt;
    if (this.missileTimer <= 0 && this.meshGroup.position.z >= -45 && this.meshGroup.position.z < 25) {
      this.missileTimer = 3.2 + Math.random() * 0.8;
      if (this.underwingMissiles && gm) {
        this.underwingMissiles.forEach(m => {
          if (!m.isDead && m.mesh && Math.random() < 0.7) {
            const mPos = m.mesh.getWorldPosition(new THREE.Vector3());
            if (gm.spawnEnemyMissile) {
              gm.spawnEnemyMissile(mPos, playerPos);
            }
            if (this.particleManager) {
              this.particleManager.spawnSparks(mPos, new THREE.Vector3(0, -1, 1), 0xff5500, 10);
            }
          }
        });
      }
    }

    // Heavy Crimson Plasma Railgun Firing logic
    this.fireTimer -= dt;
    let shouldFire = false;
    const out = [];

    if (this.fireTimer <= 0 && this.meshGroup.position.z >= -45 && this.meshGroup.position.z < 25) {
      this.fireTimer = 1.3 + Math.random() * 0.4;
      this.turrets.forEach(t => {
        if (!t.isDead && t.mesh) {
          out.push(t.mesh.getWorldPosition(new THREE.Vector3()));
        }
      });
      shouldFire = true;
    }

    return shouldFire ? { origins: out, targetPos: playerPos } : false;
  }
}
