import * as THREE from 'three';
import { HomingMissile } from './HomingMissile.js';

/**
 * High-Resolution 1024x1024 Procedural PBR Diffuse, Normal & Emissive Map Generator
 */
function generateCarrierTextures() {
  // 1. Diffuse / Albedo Map (Steel-Blue Alloy Armor with White Ceramic Insets & Hazard Markings)
  const diffCanvas = document.createElement('canvas');
  diffCanvas.width = 1024; diffCanvas.height = 1024;
  const dCtx = diffCanvas.getContext('2d');
  
  // Base Steel-Blue Titanium Composite
  dCtx.fillStyle = '#223854';
  dCtx.fillRect(0, 0, 1024, 1024);

  // Armored Plating Modular Tiles (Varied lightness for high visual fidelity)
  for (let x = 0; x < 1024; x += 128) {
    for (let y = 0; y < 1024; y += 128) {
      const shade = ((x / 128 + y / 128) % 2 === 0) ? '#2b4466' : '#1e324a';
      dCtx.fillStyle = shade;
      dCtx.fillRect(x + 4, y + 4, 120, 120);
      
      // Fine panel border
      dCtx.strokeStyle = '#0f1a26';
      dCtx.lineWidth = 3;
      dCtx.strokeRect(x + 2, y + 2, 124, 124);
    }
  }

  // High-Contrast White Ceramic Armor Insets
  dCtx.fillStyle = '#d8e5f2';
  for (let y = 64; y < 1024; y += 256) {
    dCtx.fillRect(64, y, 160, 80);
    dCtx.fillRect(800, y, 160, 80);
  }

  // Flight Deck Runway & Catapult Markings (Yellow & White Striping)
  dCtx.fillStyle = '#162233';
  dCtx.fillRect(360, 0, 304, 1024); // Central flight strip

  // Yellow Hazard Chevrons
  dCtx.fillStyle = '#ffd000';
  for (let i = 0; i < 20; i++) {
    const cy = i * 52;
    dCtx.beginPath();
    dCtx.moveTo(380, cy);
    dCtx.lineTo(440, cy + 24);
    dCtx.lineTo(440, cy + 40);
    dCtx.lineTo(380, cy + 16);
    dCtx.fill();

    dCtx.beginPath();
    dCtx.moveTo(584, cy);
    dCtx.lineTo(644, cy + 24);
    dCtx.lineTo(644, cy + 40);
    dCtx.lineTo(584, cy + 16);
    dCtx.fill();
  }

  // Gold Fleet Insignia & Registry Stencils
  dCtx.fillStyle = '#ffd700';
  dCtx.font = 'bold 36px monospace';
  dCtx.fillText('CV-99 HYPERION', 410, 480);
  dCtx.fillText('FLEET FLAGSHIP', 416, 520);

  const diffuseMap = new THREE.CanvasTexture(diffCanvas);
  diffuseMap.wrapS = diffuseMap.wrapT = THREE.RepeatWrapping;

  // 2. Normal Map (1024x1024)
  const normCanvas = document.createElement('canvas');
  normCanvas.width = 1024; normCanvas.height = 1024;
  const nCtx = normCanvas.getContext('2d');
  nCtx.fillStyle = 'rgb(128, 128, 255)';
  nCtx.fillRect(0, 0, 1024, 1024);

  // Seams
  nCtx.strokeStyle = 'rgb(75, 105, 255)';
  nCtx.lineWidth = 4;
  for (let x = 0; x < 1024; x += 64) {
    nCtx.beginPath(); nCtx.moveTo(x, 0); nCtx.lineTo(x, 1024); nCtx.stroke();
  }
  for (let y = 0; y < 1024; y += 64) {
    nCtx.beginPath(); nCtx.moveTo(0, y); nCtx.lineTo(1024, y); nCtx.stroke();
  }

  // Bolt Studs
  nCtx.fillStyle = 'rgb(210, 210, 255)';
  for (let x = 8; x < 1024; x += 32) {
    for (let y = 8; y < 1024; y += 32) {
      nCtx.fillRect(x, y, 5, 5);
    }
  }

  const normalMap = new THREE.CanvasTexture(normCanvas);
  normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;

  // 3. Emissive Map (Runway Lights, Core Conduits, Bridge Glow)
  const emissCanvas = document.createElement('canvas');
  emissCanvas.width = 1024; emissCanvas.height = 1024;
  const eCtx = emissCanvas.getContext('2d');
  eCtx.fillStyle = '#000000';
  eCtx.fillRect(0, 0, 1024, 1024);

  // Cyan Magnetic Guide Rails
  eCtx.strokeStyle = '#00f3ff';
  eCtx.lineWidth = 8;
  eCtx.beginPath(); eCtx.moveTo(410, 0); eCtx.lineTo(410, 1024); eCtx.stroke();
  eCtx.beginPath(); eCtx.moveTo(614, 0); eCtx.lineTo(614, 1024); eCtx.stroke();

  // Orange Thermal Conduits
  eCtx.strokeStyle = '#ff6600';
  eCtx.lineWidth = 6;
  for (let i = 0; i < 4; i++) {
    const py = 200 + i * 180;
    eCtx.beginPath(); eCtx.moveTo(80, py); eCtx.lineTo(280, py); eCtx.stroke();
    eCtx.beginPath(); eCtx.moveTo(744, py); eCtx.lineTo(944, py); eCtx.stroke();
  }

  const emissiveMap = new THREE.CanvasTexture(emissCanvas);
  emissiveMap.wrapS = emissiveMap.wrapT = THREE.RepeatWrapping;

  return { diffuseMap, normalMap, emissiveMap };
}

export class CarrierCapitalShip {
  constructor(scene, particleManager) {
    this.scene = scene;
    this.particleManager = particleManager;

    this.radius = 36.0;
    this.coreHp = 7500;
    this.maxCoreHp = 7500;
    this.shieldHp = 2500;
    this.maxShieldHp = 2500;
    this.hasShield = false;
    this.hasShieldTriggered = false;
    this.scoreValue = 95000;
    this.isDead = false;
    this.hitRadius = 26.0;

    this.meshGroup = new THREE.Group();
    this.meshGroup.position.set(0, 8, -180);

    // Standoff depth
    this.targetZ = -78;
    this.speed = 12.0;
    this._time = Math.random() * 100;

    this.fireTimer = 0.85;
    this.missileTimer = 2.8;
    this.droneLaunchTimer = 3.8;
    this.siegeCannonTimer = 5.5;
    this.siegeCharging = false;

    this.homingMissiles = [];
    this.pendingDroneSpawns = 0;
    this.damagedEmitters = [];
    this.catapultDrones = [];

    // ── 6 Articulated Heavy Dual-Railgun Turrets ──
    this.turrets = [
      { id: 0, name: 'FWD PORT BATTERY', relPos: new THREE.Vector3(-14.0, 5.8, -18.0), hp: 850, maxHp: 850, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 1, name: 'FWD STBD BATTERY', relPos: new THREE.Vector3(14.0, 5.8, -18.0),  hp: 850, maxHp: 850, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 2, name: 'MID PORT BATTERY', relPos: new THREE.Vector3(-16.5, 5.8, 0.0),    hp: 850, maxHp: 850, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 3, name: 'MID STBD BATTERY', relPos: new THREE.Vector3(16.5, 5.8, 0.0),    hp: 850, maxHp: 850, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 4, name: 'AFT PORT BATTERY', relPos: new THREE.Vector3(-14.0, 5.8, 18.0),   hp: 850, maxHp: 850, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 5, name: 'AFT STBD BATTERY', relPos: new THREE.Vector3(14.0, 5.8, 18.0),   hp: 850, maxHp: 850, isDead: false, mesh: null, barrelGroup: null, reticle: null }
    ];

    // ── Targetable Subsystems (Hangars & Missile Pods) ──
    this.subsystems = [
      { id: 'hangarLeft', name: 'PORT HANGAR BAY', relPos: new THREE.Vector3(-19.0, 0, 4.0), hp: 1200, maxHp: 1200, isDead: false, mesh: null, forcefield: null, reticle: null },
      { id: 'hangarRight', name: 'STARBOARD HANGAR BAY', relPos: new THREE.Vector3(19.0, 0, 4.0), hp: 1200, maxHp: 1200, isDead: false, mesh: null, forcefield: null, reticle: null },
      { id: 'missilePodLeft', name: 'PORT MISSILE POD', relPos: new THREE.Vector3(-13.5, 7.5, -6.0), hp: 950, maxHp: 950, isDead: false, mesh: null, reticle: null },
      { id: 'missilePodRight', name: 'STARBOARD MISSILE POD', relPos: new THREE.Vector3(13.5, 7.5, -6.0), hp: 950, maxHp: 950, isDead: false, mesh: null, reticle: null }
    ];

    this.runwayLights = [];
    this.thrusterPositions = [];
    this.siegeCannons = [];
    this.reticleMeshes = [];
    this.navStrobes = [];

    this._build();
    this.scene.add(this.meshGroup);
  }

  _build() {
    const { diffuseMap, normalMap, emissiveMap } = generateCarrierTextures();

    // ── AAA PBR Materials ──
    this.hullMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: diffuseMap,
      roughness: 0.28,
      metalness: 0.85,
      normalMap: normalMap,
      emissive: 0x0f2238,
      emissiveIntensity: 0.4
    });

    this.armorPlateMat = new THREE.MeshStandardMaterial({
      color: 0x3d5a80,
      roughness: 0.22,
      metalness: 0.90,
      normalMap: normalMap
    });

    this.keelMat = new THREE.MeshStandardMaterial({
      color: 0x1b2838,
      roughness: 0.35,
      metalness: 0.92,
      normalMap: normalMap
    });

    this.trimGoldMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.95,
      roughness: 0.15,
      emissive: 0x553e00,
      emissiveIntensity: 0.6
    });

    this.runwayMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: diffuseMap,
      roughness: 0.32,
      metalness: 0.82,
      emissiveMap: emissiveMap,
      emissive: 0x00f3ff,
      emissiveIntensity: 0.65,
      normalMap: normalMap
    });

    // ── Dedicated Carrier Key & Deck Lights ──
    const keyLight = new THREE.PointLight(0xffffff, 4.5, 90);
    keyLight.position.set(0, 18.0, 20.0);
    this.meshGroup.add(keyLight);

    const deckLight = new THREE.PointLight(0x00f3ff, 3.0, 50);
    deckLight.position.set(0, 10.0, 0);
    this.meshGroup.add(deckLight);

    const bridgeLight = new THREE.PointLight(0x00f3ff, 2.2, 35);
    bridgeLight.position.set(9.5, 9.0, -6.0);
    this.meshGroup.add(bridgeLight);

    const prowLight = new THREE.PointLight(0xffbb00, 3.0, 40);
    prowLight.position.set(0, 4.0, 28.0);
    this.meshGroup.add(prowLight);

    const engineLight = new THREE.PointLight(0x00f3ff, 4.0, 45);
    engineLight.position.set(0, 0, -36.0);
    this.meshGroup.add(engineLight);

    // ── 1. Sculpted Multi-Chine Hull (Aerodynamic Angular Supercarrier) ──
    const mainHullShape = new THREE.Shape();
    mainHullShape.moveTo(0, 36);          // Prow tip (facing forward)
    mainHullShape.lineTo(15, 24);         // Forward chine
    mainHullShape.lineTo(19, -12);        // Amidships flight deck sponson
    mainHullShape.lineTo(17, -34);        // Aft quarter
    mainHullShape.lineTo(13, -36);        // Engine cowl corner
    mainHullShape.lineTo(-13, -36);
    mainHullShape.lineTo(-17, -34);
    mainHullShape.lineTo(-19, -12);
    mainHullShape.lineTo(-15, 24);
    mainHullShape.closePath();

    const extrudeSettings = {
      depth: 9.5,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 2,
      bevelSize: 1.8,
      bevelThickness: 1.8
    };

    const mainHullGeo = new THREE.ExtrudeGeometry(mainHullShape, extrudeSettings);
    mainHullGeo.rotateX(-Math.PI / 2);
    mainHullGeo.center();

    const mainHullMesh = new THREE.Mesh(mainHullGeo, this.hullMat);
    this.meshGroup.add(mainHullMesh);

    // ── 2. Forward Ram Bow & Trench Sponson Plating ──
    const prowBevelGeo = new THREE.ConeGeometry(8.5, 22.0, 4);
    prowBevelGeo.rotateX(Math.PI / 2);
    prowBevelGeo.scale(1.7, 0.7, 1.0);
    const prowMesh = new THREE.Mesh(prowBevelGeo, this.armorPlateMat);
    prowMesh.position.set(0, 0.5, 24);
    this.meshGroup.add(prowMesh);

    // Lateral Armor Sponsons (Port & Starboard Chamfered Wings)
    [-18.0, 18.0].forEach(sideX => {
      const sponsonGeo = new THREE.BoxGeometry(4.8, 6.8, 50.0);
      const sponson = new THREE.Mesh(sponsonGeo, this.armorPlateMat);
      sponson.position.set(sideX, 0.2, 0);
      sponson.rotation.z = sideX > 0 ? -0.12 : 0.12;
      this.meshGroup.add(sponson);
    });

    // ── 3. Dual Recessed Catapult Flight Decks (Top Surface) ──
    const flightDeckGeo = new THREE.BoxGeometry(26.0, 1.2, 56.0);
    const flightDeckMesh = new THREE.Mesh(flightDeckGeo, this.runwayMat);
    flightDeckMesh.position.set(0, 5.4, -1);
    this.meshGroup.add(flightDeckMesh);

    // Sequenced LED Runway Approach Beacons (Port & Starboard Track)
    [-8.0, 8.0].forEach(laneX => {
      for (let z = -24; z <= 24; z += 4.8) {
        const lightGeo = new THREE.SphereGeometry(0.28, 8, 8);
        const lightMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
        const light = new THREE.Mesh(lightGeo, lightMat);
        light.position.set(laneX, 6.2, z);
        this.meshGroup.add(light);
        this.runwayLights.push({ mesh: light, baseZ: z, offset: (z + 24) * 0.15 });
      }
    });

    // ── 4. Stepped Command Island & Phased Radar Citadel ──
    const islandGroup = new THREE.Group();
    islandGroup.position.set(9.5, 6.4, -6.0); // Offset to starboard

    const islandBaseGeo = new THREE.BoxGeometry(5.2, 4.8, 16.0);
    const islandBase = new THREE.Mesh(islandBaseGeo, this.armorPlateMat);
    islandGroup.add(islandBase);

    // Multi-tier Observation Bridge Cupola
    const bridgeGeo = new THREE.BoxGeometry(6.4, 2.4, 8.0);
    const bridgeMat = new THREE.MeshStandardMaterial({
      color: 0x00f3ff,
      emissive: 0x00f3ff,
      emissiveIntensity: 2.2,
      roughness: 0.1,
      metalness: 0.9
    });
    const bridgeMesh = new THREE.Mesh(bridgeGeo, bridgeMat);
    bridgeMesh.position.set(0, 2.8, 2.0);
    islandGroup.add(bridgeMesh);

    // Rotating 3D Phased-Array Radome
    const radomeGeo = new THREE.CylinderGeometry(1.8, 1.8, 0.7, 16);
    const radomeMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.95, roughness: 0.15, emissive: 0x442c00 });
    this.radarDish = new THREE.Mesh(radomeGeo, radomeMat);
    this.radarDish.position.set(0, 5.0, -4.0);
    islandGroup.add(this.radarDish);

    // Communications Spire Mast
    const mastGeo = new THREE.CylinderGeometry(0.14, 0.28, 6.5, 6);
    const mast = new THREE.Mesh(mastGeo, this.keelMat);
    mast.position.set(0, 7.0, -4.0);
    islandGroup.add(mast);

    this.meshGroup.add(islandGroup);

    // ── 5. Armored Ventral Keel Spine & Heat Radiators ──
    const keelGeo = new THREE.BoxGeometry(16.5, 6.8, 54.0);
    const keelMesh = new THREE.Mesh(keelGeo, this.keelMat);
    keelMesh.position.set(0, -6.5, -2.0);
    this.meshGroup.add(keelMesh);

    // Ventral Trench Conduits (Molten Orange Heat Glow)
    const conduitGeo = new THREE.BoxGeometry(2.2, 1.2, 38.0);
    const conduitMat = new THREE.MeshBasicMaterial({ color: 0xff5500 });
    [-5.5, 5.5].forEach(cx => {
      const cond = new THREE.Mesh(conduitGeo, conduitMat);
      cond.position.set(cx, -9.6, -2.0);
      this.meshGroup.add(cond);
    });

    // ── 6. Quad Ion Fusion Thruster Array ──
    const engineBlockPositions = [
      new THREE.Vector3(-9.0, 1.5, -34.5),
      new THREE.Vector3(9.0, 1.5, -34.5),
      new THREE.Vector3(-9.0, -3.5, -34.5),
      new THREE.Vector3(9.0, -3.5, -34.5)
    ];

    engineBlockPositions.forEach(ep => {
      const nacelleGeo = new THREE.CylinderGeometry(2.6, 3.0, 7.0, 12);
      nacelleGeo.rotateX(Math.PI / 2);
      const nacelle = new THREE.Mesh(nacelleGeo, this.keelMat);
      nacelle.position.copy(ep);
      this.meshGroup.add(nacelle);

      // Glowing Turbine Core Ring
      const ringGeo = new THREE.TorusGeometry(2.2, 0.45, 8, 16);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(ep.x, ep.y, ep.z - 3.4);
      this.meshGroup.add(ring);

      this.thrusterPositions.push(new THREE.Vector3(ep.x, ep.y, ep.z - 4.0));
    });

    // ── 7. Build 6 Articulated Dual-Railgun Turrets ──
    this.turrets.forEach(turretData => {
      const turretGroup = new THREE.Group();
      turretGroup.position.copy(turretData.relPos);

      // Circular Barbette Turret Base
      const barbetteGeo = new THREE.CylinderGeometry(2.4, 2.7, 1.3, 16);
      const barbette = new THREE.Mesh(barbetteGeo, this.trimGoldMat);
      turretGroup.add(barbette);

      // Rotating Armor Cupola Housing
      const housingGeo = new THREE.BoxGeometry(2.8, 1.8, 3.4);
      const housing = new THREE.Mesh(housingGeo, this.armorPlateMat);
      housing.position.set(0, 1.1, 0);
      turretGroup.add(housing);

      // Pitching Dual Barrels Group
      const barrelGroup = new THREE.Group();
      barrelGroup.position.set(0, 1.3, 1.2);

      [-0.8, 0.8].forEach(bx => {
        const barrelGeo = new THREE.CylinderGeometry(0.26, 0.30, 5.5, 8);
        barrelGeo.rotateX(Math.PI / 2);
        const barrel = new THREE.Mesh(barrelGeo, this.keelMat);
        barrel.position.set(bx, 0, 2.4);
        barrelGroup.add(barrel);

        // Muzzle Glow Tip
        const tipGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.6, 8);
        tipGeo.rotateX(Math.PI / 2);
        const tipMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
        const tip = new THREE.Mesh(tipGeo, tipMat);
        tip.position.set(bx, 0, 5.0);
        barrelGroup.add(tip);
      });

      turretGroup.add(barrelGroup);
      this.meshGroup.add(turretGroup);

      turretData.mesh = turretGroup;
      turretData.barrelGroup = barrelGroup;

      // 3D Targeting Reticle
      const reticleGeo = new THREE.RingGeometry(3.0, 3.5, 16);
      const reticleMat = new THREE.MeshBasicMaterial({
        color: 0x00ff66,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85
      });
      const reticle = new THREE.Mesh(reticleGeo, reticleMat);
      reticle.position.set(0, 2.2, 0);
      reticle.rotation.x = -Math.PI / 2;
      turretGroup.add(reticle);
      turretData.reticle = reticle;
      this.reticleMeshes.push(reticle);
    });

    // ── 8. Build Subsystems (Hangars & Missile Pods) ──
    this.subsystems.forEach(sub => {
      const subGroup = new THREE.Group();
      subGroup.position.copy(sub.relPos);

      if (sub.id.includes('hangar')) {
        // Recessed Hangar Tunnel Gate
        const bayFrameGeo = new THREE.BoxGeometry(3.6, 4.6, 14.5);
        const bayFrame = new THREE.Mesh(bayFrameGeo, this.keelMat);
        subGroup.add(bayFrame);

        // Cyan Plasma Containment Forcefield Curtain
        const ffGeo = new THREE.PlaneGeometry(13.5, 4.0);
        if (sub.relPos.x > 0) ffGeo.rotateY(-Math.PI / 2);
        else ffGeo.rotateY(Math.PI / 2);

        const ffMat = new THREE.MeshBasicMaterial({
          color: 0x00f3ff,
          transparent: true,
          opacity: 0.65,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending
        });
        const ffMesh = new THREE.Mesh(ffGeo, ffMat);
        ffMesh.position.set(sub.relPos.x > 0 ? 1.9 : -1.9, 0, 0);
        subGroup.add(ffMesh);
        sub.forcefield = ffMesh;
      } else {
        // Heavy Vertical Missile Pod Silo
        const podGeo = new THREE.BoxGeometry(4.4, 2.4, 8.5);
        const podMesh = new THREE.Mesh(podGeo, this.armorPlateMat);
        subGroup.add(podMesh);

        // 8x Armored Silo Hatches
        for (let r = 0; r < 4; r++) {
          [-1.3, 1.3].forEach(hx => {
            const hatchGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.45, 8);
            const hatchMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });
            const hatch = new THREE.Mesh(hatchGeo, hatchMat);
            hatch.position.set(hx, 1.3, -3.2 + r * 2.1);
            subGroup.add(hatch);
          });
        }
      }

      this.meshGroup.add(subGroup);
      sub.mesh = subGroup;

      // Subsystem Target Reticle
      const sRetGeo = new THREE.RingGeometry(3.4, 3.9, 16);
      const sRetMat = new THREE.MeshBasicMaterial({
        color: sub.id.includes('hangar') ? 0x00f3ff : 0xff0044,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.88
      });
      const sRet = new THREE.Mesh(sRetGeo, sRetMat);
      sRet.position.set(0, 3.2, 0);
      sRet.rotation.x = -Math.PI / 2;
      subGroup.add(sRet);
      sub.reticle = sRet;
      this.reticleMeshes.push(sRet);
    });

    // ── 9. Flashing Navigation Strobe Lights ──
    const strobeConfigs = [
      { pos: new THREE.Vector3(0, 3.0, 36.0), color: 0xffffff },    // Prow White Strobe
      { pos: new THREE.Vector3(-19.0, 2.2, -32.0), color: 0xff0000 }, // Port Red Strobe
      { pos: new THREE.Vector3(19.0, 2.2, -32.0), color: 0x00ff00 }   // Starboard Green Strobe
    ];
    strobeConfigs.forEach(sc => {
      const sGeo = new THREE.SphereGeometry(0.48, 8, 8);
      const sMat = new THREE.MeshBasicMaterial({ color: sc.color });
      const sm = new THREE.Mesh(sGeo, sMat);
      sm.position.copy(sc.pos);
      this.meshGroup.add(sm);
      this.navStrobes.push({ mesh: sm, color: sc.color });
    });
  }

  update(dt, playerShip) {
    if (this.isDead) return { lasers: false, missiles: false, droneSpawns: 0, siegeLasers: false };

    this._time += dt;
    const playerPos = playerShip && playerShip.meshGroup ? playerShip.meshGroup.position : new THREE.Vector3();

    // Advance from deep space into battle standoff position
    const arrived = this.meshGroup.position.z >= this.targetZ;
    if (!arrived) {
      this.meshGroup.position.z += this.speed * dt;
    } else {
      // Authoritative Capital Warship Forward Combat Stance:
      // Tilted slightly down towards player with gentle banking and lateral tracking
      this.meshGroup.rotation.x = THREE.MathUtils.lerp(this.meshGroup.rotation.x, 0.28, dt * 2.0);
      this.meshGroup.rotation.y = THREE.MathUtils.lerp(this.meshGroup.rotation.y, Math.sin(this._time * 0.4) * 0.28, dt * 2.0);
      this.meshGroup.rotation.z = THREE.MathUtils.lerp(this.meshGroup.rotation.z, -Math.sin(this._time * 0.4) * 0.08, dt * 2.0);
      // Majestic capital ship hover weave
      this.meshGroup.position.x = Math.sin(this._time * 0.4) * 14.0;
      this.meshGroup.position.y = 8.0 + Math.cos(this._time * 0.3) * 2.5;
    }

    // Active Radar Dome Rotation
    if (this.radarDish) this.radarDish.rotation.y += 2.4 * dt;

    // Reticle Rotations
    this.reticleMeshes.forEach(r => {
      if (r && r.visible) r.rotation.z += 1.8 * dt;
    });

    // Sequenced Runway Approach Lights Animation (Wave flow along deck)
    this.runwayLights.forEach(rl => {
      const phase = (this._time * 3.5 + rl.offset) % 1.0;
      const intensity = phase < 0.35 ? 1.0 : 0.2;
      if (rl.mesh.material) rl.mesh.material.opacity = intensity;
    });

    // Navigation Strobes
    const strobeOn = (Math.floor(this._time * 3.0) % 2 === 0);
    this.navStrobes.forEach(st => {
      if (st.mesh && st.mesh.material) {
        st.mesh.material.color.setHex(strobeOn ? st.color : 0x050505);
      }
    });

    // Ion Thruster Plumes
    if (this.particleManager && Math.random() < 0.85) {
      this.thrusterPositions.forEach(relP => {
        const wp = this.meshGroup.localToWorld(relP.clone());
        this.particleManager.spawnEngineParticle(wp, 0x00f3ff);
      });
    }

    // Subsystem Damage Smoke & Fire Emitters
    this.subsystems.forEach(sub => {
      if (sub.isDead || sub.hp < sub.maxHp * 0.5) {
        if (this.particleManager && Math.random() < 0.4) {
          const wp = this.meshGroup.localToWorld(sub.relPos.clone());
          this.particleManager.createLaserImpact(wp, new THREE.Vector3(0, 1, 0), sub.isDead ? 0x111111 : 0xff4400, 4);
        }
      }
    });

    // Turret Tracking: Rotate barbettes on Y and pitch barrels on X toward player
    if (arrived) {
      this.turrets.forEach(t => {
        if (!t.isDead && t.mesh && t.barrelGroup) {
          const localPlayer = this.meshGroup.worldToLocal(playerPos.clone());
          const targetAngleY = Math.atan2(localPlayer.x - t.relPos.x, localPlayer.z - t.relPos.z);
          t.mesh.rotation.y = THREE.MathUtils.lerp(t.mesh.rotation.y, targetAngleY, dt * 3.5);

          const distHoriz = Math.hypot(localPlayer.x - t.relPos.x, localPlayer.z - t.relPos.z);
          const targetPitch = Math.atan2(localPlayer.y - t.relPos.y, distHoriz);
          t.barrelGroup.rotation.x = THREE.MathUtils.lerp(t.barrelGroup.rotation.x, targetPitch, dt * 3.5);
        }
      });
    }

    // ── Weapon Systems Execution ──
    const result = {
      lasers: false,
      missiles: false,
      droneSpawns: 0,
      siegeLasers: false
    };

    if (!arrived) return result;

    // 1. Plasma Battery Volleys
    this.fireTimer -= dt;
    if (this.fireTimer <= 0) {
      this.fireTimer = 0.85;
      const fireOrigins = [];
      this.turrets.forEach(t => {
        if (!t.isDead && t.mesh) {
          const origin = t.mesh.getWorldPosition(new THREE.Vector3());
          origin.y += 1.5;
          fireOrigins.push(origin);
        }
      });
      if (fireOrigins.length > 0) {
        result.lasers = fireOrigins;
      }
    }

    // 2. Drone Catapult Launches from Hangars
    const livingHangars = this.subsystems.filter(s => s.id.includes('hangar') && !s.isDead);
    if (livingHangars.length > 0) {
      this.droneLaunchTimer -= dt;
      if (this.droneLaunchTimer <= 0) {
        this.droneLaunchTimer = 4.0;
        result.droneSpawns = livingHangars.length * 2;
        livingHangars.forEach(h => {
          const wp = this.meshGroup.localToWorld(h.relPos.clone());
          if (this.particleManager) {
            this.particleManager.spawnSonicBoomDisc(wp, 0x00f3ff);
          }
        });
      }
    }

    // 3. Heavy Missile Silo Launches
    const livingPods = this.subsystems.filter(s => s.id.includes('missilePod') && !s.isDead);
    if (livingPods.length > 0) {
      this.missileTimer -= dt;
      if (this.missileTimer <= 0) {
        this.missileTimer = 3.5;
        result.missiles = true;
        livingPods.forEach(p => {
          const wp = this.meshGroup.localToWorld(p.relPos.clone());
          if (this.particleManager) {
            this.particleManager.createExplosion(wp, 0xff0044, 20, 1.5);
          }
        });
      }
    }

    return result;
  }

  takeTurretDamage(turretId, amount) {
    const t = this.turrets.find(item => item.id === turretId);
    if (!t || t.isDead) return false;
    t.hp -= amount;
    if (t.hp <= 0) {
      t.isDead = true;
      if (t.reticle) t.reticle.visible = false;
      if (t.mesh) {
        const wp = t.mesh.getWorldPosition(new THREE.Vector3());
        if (this.particleManager) {
          this.particleManager.createExplosion(wp, 0x00ff88, 50, 3.0);
          this.particleManager.createEmpShockwave(wp, 20);
        }
      }
    }
    return t.isDead;
  }

  takeSubsystemDamage(subId, amount) {
    const sub = this.subsystems.find(item => item.id === subId);
    if (!sub || sub.isDead) return false;
    sub.hp -= amount;
    if (sub.hp <= 0) {
      sub.isDead = true;
      if (sub.reticle) sub.reticle.visible = false;
      if (sub.forcefield) sub.forcefield.visible = false;
      if (sub.mesh) {
        const wp = sub.mesh.getWorldPosition(new THREE.Vector3());
        if (this.particleManager) {
          this.particleManager.createExplosion(wp, 0xff0044, 75, 4.0);
          this.particleManager.createEmpShockwave(wp, 25);
        }
      }
    }
    return sub.isDead;
  }

  takeDamage(amount) {
    if (this.isDead) return false;
    this.coreHp -= amount;
    if (this.coreHp <= 0) {
      this.isDead = true;
      this._explode();
    }
    return this.isDead;
  }

  _explode() {
    const pos = this.meshGroup.position;
    if (this.particleManager) {
      this.particleManager.createExplosion(pos, 0x00f3ff, 400, 8.0);
      this.particleManager.createExplosion(pos, 0xff6600, 300, 7.0);
      this.particleManager.createEmpShockwave(pos, 150);
      this.particleManager.createEmpShockwave(pos, 220);

      // Cascading secondary explosions along length of carrier hull
      for (let i = 0; i < 8; i++) {
        setTimeout(() => {
          if (!this.meshGroup) return;
          const offset = new THREE.Vector3((Math.random() - 0.5) * 35, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 55);
          this.particleManager.createExplosion(this.meshGroup.position.clone().add(offset), 0xff3300, 180, 4.0);
        }, i * 160);
      }
    }
  }

  destroy() {
    this.isDead = true;
    this.scene.remove(this.meshGroup);
    this.meshGroup.traverse(c => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) {
        if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
        else c.material.dispose();
      }
    });
  }
}