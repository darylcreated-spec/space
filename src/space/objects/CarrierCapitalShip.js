import * as THREE from 'three';
import { HomingMissile } from './HomingMissile.js';

/**
 * High-Resolution 1024x1024 Procedural PBR Diffuse, Normal & Emissive Map Generator
 */
function generateCarrierTextures() {
  const diffCanvas = document.createElement('canvas');
  diffCanvas.width = 1024; diffCanvas.height = 1024;
  const dCtx = diffCanvas.getContext('2d');
  
  dCtx.fillStyle = '#223854';
  dCtx.fillRect(0, 0, 1024, 1024);

  for (let x = 0; x < 1024; x += 128) {
    for (let y = 0; y < 1024; y += 128) {
      const shade = ((x / 128 + y / 128) % 2 === 0) ? '#2b4466' : '#1e324a';
      dCtx.fillStyle = shade;
      dCtx.fillRect(x + 4, y + 4, 120, 120);
      
      dCtx.strokeStyle = '#0f1a26';
      dCtx.lineWidth = 3;
      dCtx.strokeRect(x + 2, y + 2, 124, 124);
    }
  }

  dCtx.fillStyle = '#d8e5f2';
  for (let y = 64; y < 1024; y += 256) {
    dCtx.fillRect(64, y, 160, 80);
    dCtx.fillRect(800, y, 160, 80);
  }

  dCtx.fillStyle = '#162233';
  dCtx.fillRect(360, 0, 304, 1024);

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

  dCtx.fillStyle = '#ffd700';
  dCtx.font = 'bold 36px monospace';
  dCtx.fillText('CV-99 HYPERION', 410, 480);
  dCtx.fillText('FLEET FLAGSHIP', 416, 520);

  const diffuseMap = new THREE.CanvasTexture(diffCanvas);
  diffuseMap.wrapS = diffuseMap.wrapT = THREE.RepeatWrapping;

  const normCanvas = document.createElement('canvas');
  normCanvas.width = 1024; normCanvas.height = 1024;
  const nCtx = normCanvas.getContext('2d');
  nCtx.fillStyle = 'rgb(128, 128, 255)';
  nCtx.fillRect(0, 0, 1024, 1024);

  nCtx.strokeStyle = 'rgb(75, 105, 255)';
  nCtx.lineWidth = 4;
  for (let x = 0; x < 1024; x += 64) {
    nCtx.beginPath(); nCtx.moveTo(x, 0); nCtx.lineTo(x, 1024); nCtx.stroke();
  }
  for (let y = 0; y < 1024; y += 64) {
    nCtx.beginPath(); nCtx.moveTo(0, y); nCtx.lineTo(1024, y); nCtx.stroke();
  }

  nCtx.fillStyle = 'rgb(210, 210, 255)';
  for (let x = 8; x < 1024; x += 32) {
    for (let y = 8; y < 1024; y += 32) {
      nCtx.fillRect(x, y, 5, 5);
    }
  }

  const normalMap = new THREE.CanvasTexture(normCanvas);
  normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;

  const emissCanvas = document.createElement('canvas');
  emissCanvas.width = 1024; emissCanvas.height = 1024;
  const eCtx = emissCanvas.getContext('2d');
  eCtx.fillStyle = '#000000';
  eCtx.fillRect(0, 0, 1024, 1024);

  eCtx.strokeStyle = '#00f3ff';
  eCtx.lineWidth = 8;
  eCtx.beginPath(); eCtx.moveTo(410, 0); eCtx.lineTo(410, 1024); eCtx.stroke();
  eCtx.beginPath(); eCtx.moveTo(614, 0); eCtx.lineTo(614, 1024); eCtx.stroke();

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
    this.hitRadius = 30.0;

    this.meshGroup = new THREE.Group();
    this.meshGroup.position.set(0, 8, -180);

    this.targetZ = -78;
    this.speed = 12.0;
    this._time = Math.random() * 100;

    this.fireTimer = 0.85;
    this.missileTimer = 2.8;
    this.droneLaunchTimer = 3.5;
    this.siegeCannonTimer = 5.5;
    this.siegeCharging = false;

    this.homingMissiles = [];
    this.pendingDroneSpawns = 0;
    this.damagedEmitters = [];
    this.catapultDrones = [];

    this.turrets = [
      { id: 0, name: 'FWD PORT BATTERY', relPos: new THREE.Vector3(-13.5, 5.8, 12.0), hp: 850, maxHp: 850, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 1, name: 'FWD STBD BATTERY', relPos: new THREE.Vector3(13.5, 5.8, 12.0),  hp: 850, maxHp: 850, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 2, name: 'MID PORT BATTERY', relPos: new THREE.Vector3(-15.5, 5.8, -4.0),   hp: 850, maxHp: 850, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 3, name: 'MID STBD BATTERY', relPos: new THREE.Vector3(15.5, 5.8, -4.0),   hp: 850, maxHp: 850, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 4, name: 'AFT PORT BATTERY', relPos: new THREE.Vector3(-13.5, 5.8, -18.0),  hp: 850, maxHp: 850, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 5, name: 'AFT STBD BATTERY', relPos: new THREE.Vector3(13.5, 5.8, -18.0),  hp: 850, maxHp: 850, isDead: false, mesh: null, barrelGroup: null, reticle: null }
    ];

    this.subsystems = [
      { id: 'hangarLeft', name: 'PORT HANGAR BAY', relPos: new THREE.Vector3(-18.5, 0, 2.0), hp: 1200, maxHp: 1200, isDead: false, mesh: null, forcefield: null, reticle: null },
      { id: 'hangarRight', name: 'STARBOARD HANGAR BAY', relPos: new THREE.Vector3(18.5, 0, 2.0), hp: 1200, maxHp: 1200, isDead: false, mesh: null, forcefield: null, reticle: null },
      { id: 'missilePodLeft', name: 'PORT MISSILE POD', relPos: new THREE.Vector3(-8.0, 7.5, 20.0), hp: 950, maxHp: 950, isDead: false, mesh: null, reticle: null },
      { id: 'missilePodRight', name: 'STARBOARD MISSILE POD', relPos: new THREE.Vector3(8.0, 7.5, 20.0), hp: 950, maxHp: 950, isDead: false, mesh: null, reticle: null }
    ];

    this.runwayLights = [];
    this.thrusterPositions = [];
    this.engineFlares = [];
    this.siegeCannons = [];
    this.reticleMeshes = [];
    this.navStrobes = [];
    this.dockedShips = [];

    this._build();
    this.scene.add(this.meshGroup);
  }

  _build() {
    const { diffuseMap, normalMap, emissiveMap } = generateCarrierTextures();

    // ── Primary Steel-Blue Titanium Composite Hull Material ──
    this.hullMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: diffuseMap,
      roughness: 0.28,
      metalness: 0.85,
      normalMap: normalMap,
      emissive: 0x0f2238,
      emissiveIntensity: 0.45
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

    // ── 🪟 High-Clarity Front-Facing Panoramic Armored Glass ──
    this.frontGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x66ddff,
      transparent: true,
      opacity: 0.30,
      roughness: 0.02,
      metalness: 0.90,
      transmission: 0.88,
      ior: 1.5,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    // ── Dedicated Carrier Key & Deck Lights ──
    const keyLight = new THREE.PointLight(0xffffff, 4.5, 90);
    keyLight.position.set(0, 18.0, 20.0);
    this.meshGroup.add(keyLight);

    const deckLight = new THREE.PointLight(0x00f3ff, 3.5, 60);
    deckLight.position.set(0, 12.0, 0);
    this.meshGroup.add(deckLight);

    const bridgeLight = new THREE.PointLight(0x00f3ff, 2.8, 40);
    bridgeLight.position.set(0, 14.0, -4.0);
    this.meshGroup.add(bridgeLight);

    const engineLight = new THREE.PointLight(0x00f3ff, 5.0, 60);
    engineLight.position.set(0, 6.0, -38.0);
    this.meshGroup.add(engineLight);

    // ── 1. MAIN HULL AFT & AMIDSHIPS (Same Body Hull Material) ──
    const mainHullShape = new THREE.Shape();
    mainHullShape.moveTo(0, 12);
    mainHullShape.lineTo(16, 12);
    mainHullShape.lineTo(19, -12);
    mainHullShape.lineTo(17, -34);
    mainHullShape.lineTo(13, -36);
    mainHullShape.lineTo(-13, -36);
    mainHullShape.lineTo(-17, -34);
    mainHullShape.lineTo(-19, -12);
    mainHullShape.lineTo(-16, 12);
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
    mainHullMesh.position.set(0, 0, -12.0);
    this.meshGroup.add(mainHullMesh);

    // Lateral Armor Sponsons (Same Body Material)
    [-18.0, 18.0].forEach(sideX => {
      const sponsonGeo = new THREE.BoxGeometry(4.8, 6.8, 44.0);
      const sponson = new THREE.Mesh(sponsonGeo, this.hullMat);
      sponson.position.set(sideX, 0.2, -10.0);
      sponson.rotation.z = sideX > 0 ? -0.12 : 0.12;
      this.meshGroup.add(sponson);
    });

    // ── 2. 🪟 NOSE OF CARRIER ADJUSTED TO MATCH SAME COLOR AS BODY ──
    const prowGroup = new THREE.Group();
    prowGroup.position.set(0, 0, 24.0);

    // A. Lower Keel Floor (Now matches body hullMat!)
    const keelFloorGeo = new THREE.BoxGeometry(22.0, 2.0, 24.0);
    const keelFloor = new THREE.Mesh(keelFloorGeo, this.hullMat);
    keelFloor.position.set(0, -3.8, 0);
    prowGroup.add(keelFloor);

    // Chamfered Ram Bow Keel Wedge (Matches body hullMat!)
    const ramBowGeo = new THREE.ConeGeometry(11.0, 12.0, 4);
    ramBowGeo.rotateX(Math.PI / 2);
    ramBowGeo.scale(1.0, 0.35, 1.0);
    const ramBow = new THREE.Mesh(ramBowGeo, this.hullMat);
    ramBow.position.set(0, -3.8, 12.0);
    prowGroup.add(ramBow);

    // B. Upper Armored Roof Canopy (Matches body hullMat!)
    const roofGeo = new THREE.BoxGeometry(20.0, 1.8, 20.0);
    const roofMesh = new THREE.Mesh(roofGeo, this.hullMat);
    roofMesh.position.set(0, 4.8, -2.0);
    prowGroup.add(roofMesh);

    // Left & Right Armored Flank Walls (Matches body hullMat!)
    [-10.0, 10.0].forEach(sideX => {
      const wallGeo = new THREE.BoxGeometry(2.0, 7.5, 22.0);
      const wall = new THREE.Mesh(wallGeo, this.hullMat);
      wall.position.set(sideX, 0.5, -1.0);
      prowGroup.add(wall);
    });

    // Interior Back Bulkhead
    const backBulkheadGeo = new THREE.BoxGeometry(18.0, 7.0, 1.5);
    const backBulkhead = new THREE.Mesh(backBulkheadGeo, this.hullMat);
    backBulkhead.position.set(0, 0.5, -11.0);
    prowGroup.add(backBulkhead);

    // Interior Staging Floor Deck
    const intFloorGeo = new THREE.BoxGeometry(18.0, 0.6, 20.0);
    const intFloorMat = new THREE.MeshStandardMaterial({
      color: 0x0a1829,
      metalness: 0.95,
      roughness: 0.2,
      emissive: 0x002d4d,
      emissiveIntensity: 0.8
    });
    const intFloor = new THREE.Mesh(intFloorGeo, intFloorMat);
    intFloor.position.set(0, -2.5, 0);
    prowGroup.add(intFloor);

    // C. Bright Interior Floodlights
    const intCyanLight = new THREE.PointLight(0x00f3ff, 8.0, 35);
    intCyanLight.position.set(0, 3.2, 2.0);
    prowGroup.add(intCyanLight);

    const intAmberLight = new THREE.PointLight(0xffbb00, 5.0, 25);
    intAmberLight.position.set(0, 1.5, -5.0);
    prowGroup.add(intAmberLight);

    // D. 3 Detailed Docked Interceptors Inside Forward Deck
    const dockedConfigs = [
      { pos: new THREE.Vector3(0, -1.6, 4.0), scale: 1.35, rotY: 0 },
      { pos: new THREE.Vector3(-5.0, -1.6, -2.5), scale: 1.1, rotY: 0.12 },
      { pos: new THREE.Vector3(5.0, -1.6, -2.5), scale: 1.1, rotY: -0.12 }
    ];

    dockedConfigs.forEach(dc => {
      const craftGroup = new THREE.Group();
      craftGroup.position.copy(dc.pos);
      craftGroup.scale.setScalar(dc.scale);
      craftGroup.rotation.y = dc.rotY;

      const padGeo = new THREE.CylinderGeometry(2.5, 2.8, 0.35, 16);
      const padMat = new THREE.MeshStandardMaterial({
        color: 0x142438,
        metalness: 0.92,
        roughness: 0.25,
        emissive: 0xffaa00,
        emissiveIntensity: 0.6
      });
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.position.set(0, -0.15, 0);
      craftGroup.add(pad);

      const ringGeo = new THREE.TorusGeometry(2.3, 0.14, 8, 24);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
      const padRing = new THREE.Mesh(ringGeo, ringMat);
      padRing.rotation.x = Math.PI / 2;
      padRing.position.set(0, 0.05, 0);
      craftGroup.add(padRing);

      const fuseGeo = new THREE.ConeGeometry(0.9, 4.2, 6);
      fuseGeo.rotateX(Math.PI / 2);
      fuseGeo.scale(1.25, 0.7, 1.0);
      const fuseMat = new THREE.MeshStandardMaterial({
        color: 0x274366,
        metalness: 0.95,
        roughness: 0.16,
        emissive: 0x0a1e36
      });
      const fuse = new THREE.Mesh(fuseGeo, fuseMat);
      fuse.position.set(0, 0.7, 0);
      craftGroup.add(fuse);

      const wingGeo = new THREE.BoxGeometry(4.8, 0.15, 2.4);
      const wingMat = new THREE.MeshStandardMaterial({ color: 0x182c44, metalness: 0.92, roughness: 0.2 });
      const wing = new THREE.Mesh(wingGeo, wingMat);
      wing.position.set(0, 0.65, -0.5);
      craftGroup.add(wing);

      const canopyGeo = new THREE.BoxGeometry(0.65, 0.5, 1.4);
      const canopyMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
      const canopy = new THREE.Mesh(canopyGeo, canopyMat);
      canopy.position.set(0, 1.05, 0.5);
      craftGroup.add(canopy);

      [-0.52, 0.52].forEach(ex => {
        const engGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.7, 8);
        engGeo.rotateX(Math.PI / 2);
        const engMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
        const eng = new THREE.Mesh(engGeo, engMat);
        eng.position.set(ex, 0.7, -2.1);
        craftGroup.add(eng);
      });

      const gantryGeo = new THREE.BoxGeometry(0.25, 2.2, 0.25);
      const gantryMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.95 });
      const gantry = new THREE.Mesh(gantryGeo, gantryMat);
      gantry.position.set(2.1, 0.8, -0.6);
      craftGroup.add(gantry);

      prowGroup.add(craftGroup);
      this.dockedShips.push(craftGroup);
    });

    // E. MASSIVE FORWARD-FACING PANORAMIC GLASS WINDOW
    const winWidth = 19.0;
    const winHeight = 6.8;
    const frontGlassGeo = new THREE.PlaneGeometry(winWidth, winHeight);
    const frontGlassMesh = new THREE.Mesh(frontGlassGeo, this.frontGlassMat);
    frontGlassMesh.position.set(0, 0.8, 10.0);
    prowGroup.add(frontGlassMesh);

    // F. STRUCTURAL HEAVY TITANIUM WINDOW MULLIONS (Matching body hullMat trim!)
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x06111e,
      metalness: 0.98,
      roughness: 0.15,
      emissive: 0x00f3ff,
      emissiveIntensity: 0.45
    });

    const topBarGeo = new THREE.BoxGeometry(winWidth + 0.8, 0.65, 0.65);
    const topBar = new THREE.Mesh(topBarGeo, frameMat);
    topBar.position.set(0, 4.2, 10.0);
    prowGroup.add(topBar);

    const bottomBarGeo = new THREE.BoxGeometry(winWidth + 0.8, 0.8, 0.8);
    const bottomBar = new THREE.Mesh(bottomBarGeo, frameMat);
    bottomBar.position.set(0, -2.6, 10.0);
    prowGroup.add(bottomBar);

    [-winWidth / 2, winWidth / 2].forEach(px => {
      const postGeo = new THREE.BoxGeometry(0.8, winHeight + 0.6, 0.8);
      const post = new THREE.Mesh(postGeo, frameMat);
      post.position.set(px, 0.8, 10.0);
      prowGroup.add(post);
    });

    [-5.5, 5.5].forEach(vx => {
      const vMullGeo = new THREE.BoxGeometry(0.5, winHeight, 0.5);
      const vMull = new THREE.Mesh(vMullGeo, frameMat);
      vMull.position.set(vx, 0.8, 10.05);
      prowGroup.add(vMull);
    });

    const hMullGeo = new THREE.BoxGeometry(winWidth, 0.5, 0.5);
    const hMull = new THREE.Mesh(hMullGeo, frameMat);
    hMull.position.set(0, 0.8, 10.05);
    prowGroup.add(hMull);

    this.meshGroup.add(prowGroup);

    // ── 3. Dual Recessed Catapult Flight Decks ──
    const flightDeckGeo = new THREE.BoxGeometry(26.0, 1.2, 44.0);
    const flightDeckMesh = new THREE.Mesh(flightDeckGeo, this.runwayMat);
    flightDeckMesh.position.set(0, 5.4, -10.0);
    this.meshGroup.add(flightDeckMesh);

    // Sequenced LED Runway Approach Beacons
    [-8.0, 8.0].forEach(laneX => {
      for (let z = -28; z <= 10; z += 4.8) {
        const lightGeo = new THREE.SphereGeometry(0.28, 8, 8);
        const lightMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
        const light = new THREE.Mesh(lightGeo, lightMat);
        light.position.set(laneX, 6.2, z);
        this.meshGroup.add(light);
        this.runwayLights.push({ mesh: light, baseZ: z, offset: (z + 28) * 0.15 });
      }
    });

    // ── 4. RAISED CENTERLINE COMMAND BRIDGE ──
    const bridgeSpine = new THREE.Group();
    bridgeSpine.position.set(0, 6.2, -6.0);

    const bridgeBaseGeo = new THREE.BoxGeometry(7.0, 5.5, 22.0);
    const bridgeBase = new THREE.Mesh(bridgeBaseGeo, this.hullMat);
    bridgeBase.position.set(0, 1.5, 0);
    bridgeSpine.add(bridgeBase);

    const cupolaGeo = new THREE.BoxGeometry(9.0, 3.2, 10.0);
    const cupolaMat = new THREE.MeshStandardMaterial({
      color: 0x00f3ff,
      emissive: 0x00f3ff,
      emissiveIntensity: 2.5,
      roughness: 0.1,
      metalness: 0.95
    });
    const cupola = new THREE.Mesh(cupolaGeo, cupolaMat);
    cupola.position.set(0, 5.2, 2.0);
    bridgeSpine.add(cupola);

    const upperDeckGeo = new THREE.BoxGeometry(6.5, 2.0, 6.0);
    const upperDeck = new THREE.Mesh(upperDeckGeo, this.trimGoldMat);
    upperDeck.position.set(0, 7.4, 1.0);
    bridgeSpine.add(upperDeck);

    const radomeGeo = new THREE.CylinderGeometry(2.4, 2.4, 0.8, 16);
    const radomeMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.95, roughness: 0.15, emissive: 0x553e00 });
    this.radarDish = new THREE.Mesh(radomeGeo, radomeMat);
    this.radarDish.position.set(0, 9.2, -3.0);
    bridgeSpine.add(this.radarDish);

    const mastGeo = new THREE.CylinderGeometry(0.18, 0.35, 9.0, 6);
    const mast = new THREE.Mesh(mastGeo, this.keelMat);
    mast.position.set(0, 13.0, -3.0);
    bridgeSpine.add(mast);

    this.meshGroup.add(bridgeSpine);

    // ── 5. SWEPT DORSAL VERTICAL TAIL FIN ──
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, 7.0, -26.0);

    const tailShape = new THREE.Shape();
    tailShape.moveTo(0, -12);
    tailShape.lineTo(0, 8);
    tailShape.lineTo(-6, 16);
    tailShape.lineTo(-12, 16);
    tailShape.lineTo(-14, -12);
    tailShape.closePath();

    const tailExtrude = { depth: 1.6, bevelEnabled: true, bevelSize: 0.4, bevelThickness: 0.4 };
    const tailGeo = new THREE.ExtrudeGeometry(tailShape, tailExtrude);
    tailGeo.rotateY(Math.PI / 2);
    tailGeo.center();

    const tailMesh = new THREE.Mesh(tailGeo, this.hullMat);
    tailMesh.position.set(0, 7.0, 0);
    tailGroup.add(tailMesh);

    const tailEdgeGeo = new THREE.BoxGeometry(0.6, 14.0, 1.2);
    tailEdgeGeo.rotateX(-0.4);
    const tailEdgeMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
    const tailEdge = new THREE.Mesh(tailEdgeGeo, tailEdgeMat);
    tailEdge.position.set(0, 8.0, 4.5);
    tailGroup.add(tailEdge);

    const tailStrobeGeo = new THREE.SphereGeometry(0.5, 8, 8);
    const tailStrobeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const tailStrobe = new THREE.Mesh(tailStrobeGeo, tailStrobeMat);
    tailStrobe.position.set(0, 15.0, -2.0);
    tailGroup.add(tailStrobe);
    this.navStrobes.push({ mesh: tailStrobe, color: 0xffffff });

    this.meshGroup.add(tailGroup);

    // ── 6. PROMINENT RAISED OUTBOARD ENGINE NACELLES ──
    const enginePylonPositions = [
      { x: -14.5, y: 5.0, z: -34.0, angle: 0.25 },
      { x: 14.5,  y: 5.0, z: -34.0, angle: -0.25 },
      { x: -12.5, y: -2.0, z: -34.0, angle: 0.15 },
      { x: 12.5,  y: -2.0, z: -34.0, angle: -0.15 }
    ];

    enginePylonPositions.forEach(ep => {
      const nacelleGroup = new THREE.Group();
      nacelleGroup.position.set(ep.x, ep.y, ep.z);

      const pylonGeo = new THREE.BoxGeometry(5.0, 1.8, 14.0);
      const pylon = new THREE.Mesh(pylonGeo, this.hullMat);
      pylon.rotation.z = ep.angle;
      nacelleGroup.add(pylon);

      const nacelleGeo = new THREE.CylinderGeometry(3.6, 4.4, 12.0, 16);
      nacelleGeo.rotateX(Math.PI / 2);
      const nacelle = new THREE.Mesh(nacelleGeo, this.keelMat);
      nacelle.position.set(0, 0, -2.0);
      nacelleGroup.add(nacelle);

      const bellGeo = new THREE.CylinderGeometry(3.2, 4.0, 3.0, 16, 1, true);
      bellGeo.rotateX(Math.PI / 2);
      const bellMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        emissive: 0x00f3ff,
        emissiveIntensity: 3.5,
        roughness: 0.1,
        metalness: 0.95
      });
      const bell = new THREE.Mesh(bellGeo, bellMat);
      bell.position.set(0, 0, -7.5);
      nacelleGroup.add(bell);

      const flareGeo = new THREE.ConeGeometry(2.8, 8.0, 16);
      flareGeo.rotateX(-Math.PI / 2);
      const flareMat = new THREE.MeshBasicMaterial({
        color: 0x00f3ff,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending
      });
      const flare = new THREE.Mesh(flareGeo, flareMat);
      flare.position.set(0, 0, -11.0);
      nacelleGroup.add(flare);
      this.engineFlares.push(flare);

      this.meshGroup.add(nacelleGroup);
      this.thrusterPositions.push(new THREE.Vector3(ep.x, ep.y, ep.z - 11.0));
    });

    // ── 7. Build 6 Articulated Dual-Railgun Turrets ──
    this.turrets.forEach(turretData => {
      const turretGroup = new THREE.Group();
      turretGroup.position.copy(turretData.relPos);

      const barbetteGeo = new THREE.CylinderGeometry(2.4, 2.7, 1.3, 16);
      const barbette = new THREE.Mesh(barbetteGeo, this.trimGoldMat);
      turretGroup.add(barbette);

      const housingGeo = new THREE.BoxGeometry(2.8, 1.8, 3.4);
      const housing = new THREE.Mesh(housingGeo, this.armorPlateMat);
      housing.position.set(0, 1.1, 0);
      turretGroup.add(housing);

      const barrelGroup = new THREE.Group();
      barrelGroup.position.set(0, 1.3, 1.2);

      [-0.8, 0.8].forEach(bx => {
        const barrelGeo = new THREE.CylinderGeometry(0.26, 0.30, 5.5, 8);
        barrelGeo.rotateX(Math.PI / 2);
        const barrel = new THREE.Mesh(barrelGeo, this.keelMat);
        barrel.position.set(bx, 0, 2.4);
        barrelGroup.add(barrel);

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

    // ── 8. Build Subsystems (Side Hangar Tunnels with Launch Gates) ──
    this.subsystems.forEach(sub => {
      const subGroup = new THREE.Group();
      subGroup.position.copy(sub.relPos);

      if (sub.id.includes('hangar')) {
        const bayFrameGeo = new THREE.BoxGeometry(3.6, 4.6, 14.5);
        const bayFrame = new THREE.Mesh(bayFrameGeo, this.keelMat);
        subGroup.add(bayFrame);

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
        const podGeo = new THREE.BoxGeometry(4.4, 2.4, 8.5);
        const podMesh = new THREE.Mesh(podGeo, this.armorPlateMat);
        subGroup.add(podMesh);

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
      { pos: new THREE.Vector3(0, 5.0, 34.0), color: 0xffffff },
      { pos: new THREE.Vector3(-19.0, 2.2, -32.0), color: 0xff0000 },
      { pos: new THREE.Vector3(19.0, 2.2, -32.0), color: 0x00ff00 }
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
    if (this.isDead) return { lasers: false, missiles: false, droneSpawns: 0, droneLaunches: null, siegeLasers: false };

    this._time += dt;
    const playerPos = playerShip && playerShip.meshGroup ? playerShip.meshGroup.position : new THREE.Vector3();

    const arrived = this.meshGroup.position.z >= this.targetZ;
    if (!arrived) {
      this.meshGroup.position.z += this.speed * dt;
    } else {
      this.meshGroup.rotation.x = THREE.MathUtils.lerp(this.meshGroup.rotation.x, 0.20, dt * 2.0);
      this.meshGroup.rotation.y = THREE.MathUtils.lerp(this.meshGroup.rotation.y, Math.sin(this._time * 0.4) * 0.25, dt * 2.0);
      this.meshGroup.rotation.z = THREE.MathUtils.lerp(this.meshGroup.rotation.z, -Math.sin(this._time * 0.4) * 0.08, dt * 2.0);
      this.meshGroup.position.x = Math.sin(this._time * 0.4) * 14.0;
      this.meshGroup.position.y = 8.0 + Math.cos(this._time * 0.3) * 2.5;
    }

    if (this.radarDish) this.radarDish.rotation.y += 2.4 * dt;

    this.reticleMeshes.forEach(r => {
      if (r && r.visible) r.rotation.z += 1.8 * dt;
    });

    this.engineFlares.forEach((fl, idx) => {
      const pulse = 1.0 + Math.sin(this._time * 18.0 + idx * 1.5) * 0.35;
      fl.scale.set(pulse, pulse, 1.0 + pulse * 0.5);
    });

    this.runwayLights.forEach(rl => {
      const phase = (this._time * 3.5 + rl.offset) % 1.0;
      const intensity = phase < 0.35 ? 1.0 : 0.2;
      if (rl.mesh.material) rl.mesh.material.opacity = intensity;
    });

    const strobeOn = (Math.floor(this._time * 3.0) % 2 === 0);
    this.navStrobes.forEach(st => {
      if (st.mesh && st.mesh.material) {
        st.mesh.material.color.setHex(strobeOn ? st.color : 0x050505);
      }
    });

    if (this.particleManager && Math.random() < 0.85) {
      this.thrusterPositions.forEach(relP => {
        const wp = this.meshGroup.localToWorld(relP.clone());
        this.particleManager.spawnEngineParticle(wp, 0x00f3ff);
      });
    }

    this.subsystems.forEach(sub => {
      if (sub.isDead || sub.hp < sub.maxHp * 0.5) {
        if (this.particleManager && Math.random() < 0.4) {
          const wp = this.meshGroup.localToWorld(sub.relPos.clone());
          this.particleManager.createLaserImpact(wp, new THREE.Vector3(0, 1, 0), sub.isDead ? 0x111111 : 0xff4400, 4);
        }
      }
    });

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

    const result = {
      lasers: false,
      missiles: false,
      droneSpawns: 0,
      droneLaunches: null,
      siegeLasers: false
    };

    if (!arrived) return result;

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

    // ── 2. Interceptor Launches Out of the Side Hangar Bays (Port & Starboard Outward Catapult) ──
    const livingHangars = this.subsystems.filter(s => s.id.includes('hangar') && !s.isDead);
    if (livingHangars.length > 0) {
      this.droneLaunchTimer -= dt;
      if (this.droneLaunchTimer <= 0) {
        this.droneLaunchTimer = 3.8;
        const launches = [];
        livingHangars.forEach(h => {
          const wp = this.meshGroup.localToWorld(h.relPos.clone());
          const isRight = h.relPos.x > 0;
          // Spawn at the outer side portal
          wp.x += isRight ? 3.5 : -3.5;
          launches.push({
            pos: wp,
            vx: isRight ? (16.0 + Math.random() * 4.0) : (-16.0 - Math.random() * 4.0), // Eject out the sides
            vy: (Math.random() - 0.5) * 3.0,
            vz: 11.0 + Math.random() * 4.0
          });
          if (this.particleManager) {
            this.particleManager.spawnSonicBoomDisc(wp, 0x00f3ff);
          }
        });
        result.droneLaunches = launches;
      }
    }

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
