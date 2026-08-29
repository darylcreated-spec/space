import * as THREE from 'three';
import { HomingMissile } from './HomingMissile.js';

/**
 * High-Resolution 1024x1024 Procedural PBR Diffuse, Normal & Emissive Map Generator
 * (Vorn Vanguard Reddish/Crimson-Obsidian Heavy Fleet Palette)
 */
function generateCarrierTextures() {
  const diffCanvas = document.createElement('canvas');
  diffCanvas.width = 1024; diffCanvas.height = 1024;
  const dCtx = diffCanvas.getContext('2d');
  
  // Dark charred obsidian base
  dCtx.fillStyle = '#1c0d10';
  dCtx.fillRect(0, 0, 1024, 1024);

  // Checkerboard armored crimson plates
  for (let x = 0; x < 1024; x += 128) {
    for (let y = 0; y < 1024; y += 128) {
      const shade = ((x / 128 + y / 128) % 2 === 0) ? '#2e1116' : '#220b0e';
      dCtx.fillStyle = shade;
      dCtx.fillRect(x + 4, y + 4, 120, 120);
      
      dCtx.strokeStyle = '#100406';
      dCtx.lineWidth = 3;
      dCtx.strokeRect(x + 2, y + 2, 124, 124);
    }
  }

  // Heavy scarlet armor slab insets
  dCtx.fillStyle = '#6e1925';
  for (let y = 64; y < 1024; y += 256) {
    dCtx.fillRect(64, y, 160, 80);
    dCtx.fillRect(800, y, 160, 80);
  }

  // Central runway dark charcoal deck
  dCtx.fillStyle = '#14080a';
  dCtx.fillRect(360, 0, 304, 1024);

  // Magma-orange landing approach chevrons
  dCtx.fillStyle = '#ff4400';
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

  // Bold Crimson Fleet Decal
  dCtx.fillStyle = '#ff2244';
  dCtx.font = 'bold 36px monospace';
  dCtx.fillText('GORGON CV-01', 416, 480);
  dCtx.fillText('HEAVY CARRIER', 412, 520);

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

  // Emissive Map for Magma-Red Runway Guidance Lines
  const emissCanvas = document.createElement('canvas');
  emissCanvas.width = 1024; emissCanvas.height = 1024;
  const eCtx = emissCanvas.getContext('2d');
  eCtx.fillStyle = '#000000';
  eCtx.fillRect(0, 0, 1024, 1024);

  eCtx.strokeStyle = '#ff2200';
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

    this.radius = 38.0;
    this.coreHp = 7500;
    this.maxCoreHp = 7500;
    this.shieldHp = 2500;
    this.maxShieldHp = 2500;
    this.hasShield = false;
    this.hasShieldTriggered = false;
    this.scoreValue = 95000;
    this.isDead = false;
    this.isDying = false;
    this.deathTimer = 3.8;
    this.hitRadius = 32.0;

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

    // ── 🛡️ Raised Outboard Sponson Superfiring Turret Mounts ──
    this.turrets = [
      { id: 0, name: 'FWD PORT BATTERY', relPos: new THREE.Vector3(-17.5, 6.8, 14.0), hp: 850, maxHp: 850, isDead: false, mesh: null, barrelGroup: null, barrelTips: [], reticle: null },
      { id: 1, name: 'FWD STBD BATTERY', relPos: new THREE.Vector3(17.5, 6.8, 14.0),  hp: 850, maxHp: 850, isDead: false, mesh: null, barrelGroup: null, barrelTips: [], reticle: null },
      { id: 2, name: 'MID PORT BATTERY', relPos: new THREE.Vector3(-19.0, 7.6, -4.0),   hp: 850, maxHp: 850, isDead: false, mesh: null, barrelGroup: null, barrelTips: [], reticle: null },
      { id: 3, name: 'MID STBD BATTERY', relPos: new THREE.Vector3(19.0, 7.6, -4.0),   hp: 850, maxHp: 850, isDead: false, mesh: null, barrelGroup: null, barrelTips: [], reticle: null },
      { id: 4, name: 'AFT PORT BATTERY', relPos: new THREE.Vector3(-17.5, 8.5, -18.0),  hp: 850, maxHp: 850, isDead: false, mesh: null, barrelGroup: null, barrelTips: [], reticle: null },
      { id: 5, name: 'AFT STBD BATTERY', relPos: new THREE.Vector3(17.5, 8.5, -18.0),  hp: 850, maxHp: 850, isDead: false, mesh: null, barrelGroup: null, barrelTips: [], reticle: null }
    ];

    this.subsystems = [
      { id: 'hangarLeft', name: 'PORT HANGAR BAY', relPos: new THREE.Vector3(-19.5, 0, 2.0), hp: 1200, maxHp: 1200, isDead: false, mesh: null, forcefield: null, reticle: null },
      { id: 'hangarRight', name: 'STARBOARD HANGAR BAY', relPos: new THREE.Vector3(19.5, 0, 2.0), hp: 1200, maxHp: 1200, isDead: false, mesh: null, forcefield: null, reticle: null },
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

    // ── 🔴 Unified Wave 1 Crimson-Obsidian Composite Hull Material ──
    this.hullMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: diffuseMap,
      roughness: 0.28,
      metalness: 0.85,
      normalMap: normalMap,
      emissive: 0x330810,
      emissiveIntensity: 0.45
    });

    this.armorPlateMat = new THREE.MeshStandardMaterial({
      color: 0x7e1c28,
      roughness: 0.22,
      metalness: 0.90,
      emissive: 0x24060c,
      emissiveIntensity: 0.35,
      normalMap: normalMap
    });

    this.keelMat = new THREE.MeshStandardMaterial({
      color: 0x180b0f,
      roughness: 0.35,
      metalness: 0.92,
      normalMap: normalMap
    });

    this.trimGoldMat = new THREE.MeshStandardMaterial({
      color: 0xff2244,
      metalness: 0.96,
      roughness: 0.15,
      emissive: 0x660814,
      emissiveIntensity: 0.6
    });

    this.runwayMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: diffuseMap,
      roughness: 0.32,
      metalness: 0.82,
      emissiveMap: emissiveMap,
      emissive: 0xff2200,
      emissiveIntensity: 0.85,
      normalMap: normalMap
    });

    // ── 🪟 Smoked Ruby/Obsidian Armored Glass ──
    this.glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xff1133,
      transparent: true,
      opacity: 0.35,
      roughness: 0.02,
      metalness: 0.92,
      transmission: 0.90,
      ior: 1.5,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    // ── Structural Charred Titanium Framing Beams ──
    this.titaniumBeamMat = new THREE.MeshStandardMaterial({
      color: 0x14060a,
      metalness: 0.98,
      roughness: 0.12,
      emissive: 0xff2200,
      emissiveIntensity: 0.65
    });

    // ── Dedicated Carrier Red/Magma Deck & Key Lights ──
    const keyLight = new THREE.PointLight(0xffe0e0, 1.8, 90);
    keyLight.position.set(0, 28.0, 5.0);
    this.meshGroup.add(keyLight);

    const deckLight = new THREE.PointLight(0xff3300, 3.5, 60);
    deckLight.position.set(0, 12.0, 0);
    this.meshGroup.add(deckLight);

    const bridgeLight = new THREE.PointLight(0xff1133, 2.8, 40);
    bridgeLight.position.set(0, 14.0, -4.0);
    this.meshGroup.add(bridgeLight);

    const engineLight = new THREE.PointLight(0xff4400, 5.0, 60);
    engineLight.position.set(0, 6.0, -38.0);
    this.meshGroup.add(engineLight);

    // ── 1. CONTINUOUS FULL LOWER KEEL (From Aft to Tapered Prow Apex) ──
    const keelShape = new THREE.Shape();
    keelShape.moveTo(0, 38);          // Tapered prow apex
    keelShape.lineTo(6, 32);          // Forward bow chine
    keelShape.lineTo(16, 14);         // Forward shoulder
    keelShape.lineTo(19, -12);        // Amidships
    keelShape.lineTo(17, -34);        // Aft quarter
    keelShape.lineTo(13, -36);        // Keel corner
    keelShape.lineTo(-13, -36);
    keelShape.lineTo(-17, -34);
    keelShape.lineTo(-19, -12);
    keelShape.lineTo(-16, 14);
    keelShape.lineTo(-6, 32);
    keelShape.closePath();

    const keelExtrude = { depth: 4.0, bevelEnabled: true, bevelSize: 1.2, bevelThickness: 1.2 };
    const keelGeo = new THREE.ExtrudeGeometry(keelShape, keelExtrude);
    keelGeo.rotateX(-Math.PI / 2);
    keelGeo.center();
    const keelMesh = new THREE.Mesh(keelGeo, this.hullMat);
    keelMesh.position.set(0, -3.0, 0);
    this.meshGroup.add(keelMesh);

    // ── 2. AFT & AMIDSHIPS UPPER HULL & FLIGHT DECK (z = -36 to +12) ──
    const midHullShape = new THREE.Shape();
    midHullShape.moveTo(0, 12);
    midHullShape.lineTo(16, 12);
    midHullShape.lineTo(19, -12);
    midHullShape.lineTo(17, -34);
    midHullShape.lineTo(13, -36);
    midHullShape.lineTo(-13, -36);
    midHullShape.lineTo(-17, -34);
    midHullShape.lineTo(-19, -12);
    midHullShape.lineTo(-16, 12);
    midHullShape.closePath();

    const midHullExtrude = { depth: 5.5, bevelEnabled: true, bevelSize: 1.5, bevelThickness: 1.5 };
    const midHullGeo = new THREE.ExtrudeGeometry(midHullShape, midHullExtrude);
    midHullGeo.rotateX(-Math.PI / 2);
    midHullGeo.center();
    const midHullMesh = new THREE.Mesh(midHullGeo, this.hullMat);
    midHullMesh.position.set(0, 2.5, -12.0);
    this.meshGroup.add(midHullMesh);

    // Smooth Sculpted Lateral Catamaran Armor Sponsons
    [-18.0, 18.0].forEach(sideX => {
      const spShape = new THREE.Shape();
      spShape.moveTo(0, 24);
      spShape.bezierCurveTo(2.4, 20, 2.4, -20, 0, -24);
      spShape.lineTo(-2.4, -22);
      spShape.bezierCurveTo(-2.4, -20, -2.4, 20, -2.4, 22);
      spShape.closePath();

      const spExtrude = { depth: 6.5, bevelEnabled: true, bevelSize: 0.9, bevelThickness: 0.9, bevelSegments: 3 };
      const sponsonGeo = new THREE.ExtrudeGeometry(spShape, spExtrude);
      sponsonGeo.rotateY(Math.PI / 2);
      sponsonGeo.center();
      sponsonGeo.computeVertexNormals();

      const sponson = new THREE.Mesh(sponsonGeo, this.hullMat);
      sponson.position.set(sideX, 0.2, -6.0);
      sponson.rotation.z = sideX > 0 ? -0.12 : 0.12;
      this.meshGroup.add(sponson);
    });

    // ── 3. 🪟 ENCOMPASSING NOSE SECTION WITH EMBEDDED PANORAMIC WINDOW & TITANIUM BEAMS ──
    const noseGroup = new THREE.Group();
    noseGroup.position.set(0, 0, 24.0);

    // A. Sweeping Armored Roof Canopy Over the Nose
    const noseRoofShape = new THREE.Shape();
    noseRoofShape.moveTo(0, 11);          // Prow apex roof tip
    noseRoofShape.lineTo(6, 7);           // Tapered roof brow
    noseRoofShape.lineTo(15, -11);        // Aft roof shoulder
    noseRoofShape.lineTo(-15, -11);
    noseRoofShape.lineTo(-6, 7);
    noseRoofShape.closePath();

    const noseRoofExtrude = { depth: 1.6, bevelEnabled: true, bevelSize: 0.8, bevelThickness: 0.8, bevelSegments: 3 };
    const noseRoofGeo = new THREE.ExtrudeGeometry(noseRoofShape, noseRoofExtrude);
    noseRoofGeo.rotateX(-Math.PI / 2);
    noseRoofGeo.center();
    noseRoofGeo.computeVertexNormals();
    const noseRoofMesh = new THREE.Mesh(noseRoofGeo, this.hullMat);
    noseRoofMesh.position.set(0, 5.2, 0);
    noseGroup.add(noseRoofMesh);

    // B. Sweeping Armored Flank Chines (Port & Starboard Outer Hull)
    [-1, 1].forEach(side => {
      const chineGeo = new THREE.CapsuleGeometry(1.2, 19.0, 8, 16);
      chineGeo.rotateX(Math.PI / 2);
      chineGeo.scale(1.0, 3.0, 1.0);
      chineGeo.computeVertexNormals();
      const chine = new THREE.Mesh(chineGeo, this.hullMat);
      chine.position.set(side * 11.5, 1.2, 0);
      chine.rotation.y = side * -0.22;
      noseGroup.add(chine);
    });

    // C. Interior Staging Deck Floor Inside the Nose
    const interiorFloorGeo = new THREE.BoxGeometry(18.0, 0.6, 20.0);
    const interiorFloorMat = new THREE.MeshStandardMaterial({
      color: 0x140609,
      metalness: 0.95,
      roughness: 0.2,
      emissive: 0x33060c,
      emissiveIntensity: 0.9
    });
    const interiorFloor = new THREE.Mesh(interiorFloorGeo, interiorFloorMat);
    interiorFloor.position.set(0, -1.2, 0);
    noseGroup.add(interiorFloor);

    // D. Bright Interior Red-Alert Spotlights
    const intCyanLight = new THREE.PointLight(0xff2200, 8.0, 36);
    intCyanLight.position.set(0, 3.5, 2.0);
    noseGroup.add(intCyanLight);

    const intAmberLight = new THREE.PointLight(0xff4400, 5.0, 25);
    intAmberLight.position.set(0, 1.5, -4.0);
    noseGroup.add(intAmberLight);

    // E. 3 Detailed Docked Interceptors Inside the Nose Bay
    const dockedConfigs = [
      { pos: new THREE.Vector3(0, -0.4, 3.5), scale: 1.3, rotY: 0 },
      { pos: new THREE.Vector3(-4.6, -0.4, -2.8), scale: 1.05, rotY: 0.15 },
      { pos: new THREE.Vector3(4.6, -0.4, -2.8), scale: 1.05, rotY: -0.15 }
    ];

    dockedConfigs.forEach(dc => {
      const craftGroup = new THREE.Group();
      craftGroup.position.copy(dc.pos);
      craftGroup.scale.setScalar(dc.scale);
      craftGroup.rotation.y = dc.rotY;

      const padGeo = new THREE.CylinderGeometry(2.4, 2.7, 0.35, 16);
      const padMat = new THREE.MeshStandardMaterial({
        color: 0x220c12,
        metalness: 0.92,
        roughness: 0.25,
        emissive: 0xff3300,
        emissiveIntensity: 0.6
      });
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.position.set(0, -0.15, 0);
      craftGroup.add(pad);

      const ringGeo = new THREE.TorusGeometry(2.2, 0.14, 8, 24);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xff2244 });
      const padRing = new THREE.Mesh(ringGeo, ringMat);
      padRing.rotation.x = Math.PI / 2;
      padRing.position.set(0, 0.05, 0);
      craftGroup.add(padRing);

      const fuseGeo = new THREE.ConeGeometry(0.85, 4.0, 6);
      fuseGeo.rotateX(Math.PI / 2);
      fuseGeo.scale(1.25, 0.7, 1.0);
      const fuseMat = new THREE.MeshStandardMaterial({
        color: 0x6e1925,
        metalness: 0.95,
        roughness: 0.16,
        emissive: 0x24060c
      });
      const fuse = new THREE.Mesh(fuseGeo, fuseMat);
      fuse.position.set(0, 0.65, 0);
      craftGroup.add(fuse);

      const wingGeo = new THREE.BoxGeometry(4.6, 0.14, 2.2);
      const wingMat = new THREE.MeshStandardMaterial({ color: 0x3d0c14, metalness: 0.92, roughness: 0.2 });
      const wing = new THREE.Mesh(wingGeo, wingMat);
      wing.position.set(0, 0.6, -0.4);
      craftGroup.add(wing);

      const canopyGeo = new THREE.BoxGeometry(0.65, 0.5, 1.4);
      const canopyMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });
      const canopy = new THREE.Mesh(canopyGeo, canopyMat);
      canopy.position.set(0, 1.0, 0.5);
      craftGroup.add(canopy);

      [-0.5, 0.5].forEach(ex => {
        const engGeo = new THREE.CylinderGeometry(0.22, 0.26, 0.65, 8);
        engGeo.rotateX(Math.PI / 2);
        const engMat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
        const eng = new THREE.Mesh(engGeo, engMat);
        eng.position.set(ex, 0.65, -2.0);
        craftGroup.add(eng);
      });

      const gantryGeo = new THREE.BoxGeometry(0.22, 2.0, 0.22);
      const gantryMat = new THREE.MeshStandardMaterial({ color: 0xff2244, metalness: 0.95 });
      const gantry = new THREE.Mesh(gantryGeo, gantryMat);
      gantry.position.set(2.0, 0.75, -0.6);
      craftGroup.add(gantry);

      noseGroup.add(craftGroup);
      this.dockedShips.push(craftGroup);
    });

    // F. SCULPTED PANORAMIC GLASS WINDOW DISPLAY (Encompassing front bow)
    const winWidth = 19.0;
    const winHeight = 6.4;
    const frontGlassGeo = new THREE.PlaneGeometry(winWidth, winHeight);
    const frontGlassMesh = new THREE.Mesh(frontGlassGeo, this.glassMat);
    frontGlassMesh.position.set(0, 1.8, 10.5);
    frontGlassMesh.rotation.x = -0.15;
    noseGroup.add(frontGlassMesh);

    // G. BOLD TITANIUM BEAMS OUTLINING THE NOSE WINDOW DISPLAY
    const topBrowBeamGeo = new THREE.BoxGeometry(winWidth + 1.2, 0.8, 0.8);
    const topBrowBeam = new THREE.Mesh(topBrowBeamGeo, this.titaniumBeamMat);
    topBrowBeam.position.set(0, 4.8, 10.0);
    noseGroup.add(topBrowBeam);

    const botSillBeamGeo = new THREE.BoxGeometry(winWidth + 1.2, 0.9, 0.9);
    const botSillBeam = new THREE.Mesh(botSillBeamGeo, this.titaniumBeamMat);
    botSillBeam.position.set(0, -1.2, 10.8);
    noseGroup.add(botSillBeam);

    [-winWidth / 2, winWidth / 2].forEach(pX => {
      const pGeo = new THREE.BoxGeometry(0.9, winHeight, 0.9);
      const pMesh = new THREE.Mesh(pGeo, this.titaniumBeamMat);
      pMesh.position.set(pX, 1.8, 10.5);
      pMesh.rotation.x = -0.15;
      noseGroup.add(pMesh);
    });

    [-5.8, 0, 5.8].forEach(mX => {
      const mGeo = new THREE.BoxGeometry(0.7, winHeight, 0.7);
      const mMesh = new THREE.Mesh(mGeo, this.titaniumBeamMat);
      mMesh.position.set(mX, 1.8, 10.5);
      mMesh.rotation.x = -0.15;
      noseGroup.add(mMesh);
    });

    const hMullGeo = new THREE.BoxGeometry(winWidth, 0.55, 0.55);
    const hMull = new THREE.Mesh(hMullGeo, this.titaniumBeamMat);
    hMull.position.set(0, 1.8, 10.55);
    hMull.rotation.x = -0.15;
    noseGroup.add(hMull);

    this.meshGroup.add(noseGroup);

    // ── 4. Dual Recessed Catapult Flight Decks ──
    const flightDeckGeo = new THREE.BoxGeometry(26.0, 1.2, 44.0);
    const flightDeckMesh = new THREE.Mesh(flightDeckGeo, this.runwayMat);
    flightDeckMesh.position.set(0, 5.4, -10.0);
    this.meshGroup.add(flightDeckMesh);

    // Sequenced LED Runway Approach Beacons (Magma Amber & Flame Red)
    [-8.0, 8.0].forEach(laneX => {
      for (let z = -28; z <= 10; z += 4.8) {
        const lightGeo = new THREE.SphereGeometry(0.28, 8, 8);
        const lightMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });
        const light = new THREE.Mesh(lightGeo, lightMat);
        light.position.set(laneX, 6.2, z);
        this.meshGroup.add(light);
        this.runwayLights.push({ mesh: light, baseZ: z, offset: (z + 28) * 0.15 });
      }
    });

    // ── 5. RAISED CENTERLINE COMMAND BRIDGE ──
    const bridgeSpine = new THREE.Group();
    bridgeSpine.position.set(0, 6.2, -6.0);

    const bridgeBaseGeo = new THREE.BoxGeometry(7.0, 5.5, 22.0);
    const bridgeBase = new THREE.Mesh(bridgeBaseGeo, this.hullMat);
    bridgeBase.position.set(0, 1.5, 0);
    bridgeSpine.add(bridgeBase);

    const cupolaGeo = new THREE.BoxGeometry(9.0, 3.2, 10.0);
    const cupolaMat = new THREE.MeshStandardMaterial({
      color: 0xff1133,
      emissive: 0xff2244,
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
    const radomeMat = new THREE.MeshStandardMaterial({ color: 0xff2244, metalness: 0.95, roughness: 0.15, emissive: 0x660814 });
    this.radarDish = new THREE.Mesh(radomeGeo, radomeMat);
    this.radarDish.position.set(0, 9.2, -3.0);
    bridgeSpine.add(this.radarDish);

    const mastGeo = new THREE.CylinderGeometry(0.18, 0.35, 9.0, 6);
    const mast = new THREE.Mesh(mastGeo, this.keelMat);
    mast.position.set(0, 13.0, -3.0);
    bridgeSpine.add(mast);

    this.meshGroup.add(bridgeSpine);

    // ── 6. SWEPT DORSAL VERTICAL TAIL FIN ──
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
    const tailEdgeMat = new THREE.MeshBasicMaterial({ color: 0xff2244 });
    const tailEdge = new THREE.Mesh(tailEdgeGeo, tailEdgeMat);
    tailEdge.position.set(0, 8.0, 4.5);
    tailGroup.add(tailEdge);

    const tailStrobeGeo = new THREE.SphereGeometry(0.5, 8, 8);
    const tailStrobeMat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
    const tailStrobe = new THREE.Mesh(tailStrobeGeo, tailStrobeMat);
    tailStrobe.position.set(0, 15.0, -2.0);
    tailGroup.add(tailStrobe);
    this.navStrobes.push({ mesh: tailStrobe, color: 0xff4400 });

    this.meshGroup.add(tailGroup);

    // ── 7. PROMINENT RAISED OUTBOARD ENGINE NACELLES ──
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
        color: 0xff2244,
        emissive: 0xff4400,
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
        color: 0xff3300,
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

    // ── 8. Build 6 Articulated Dual-Railgun Turrets with Sponson Pedestals & Exact Muzzle Tips ──
    this.turrets.forEach(turretData => {
      const turretGroup = new THREE.Group();
      turretGroup.position.copy(turretData.relPos);

      // Raised Sponson Barbette Pedestal
      const barbettePedGeo = new THREE.CylinderGeometry(2.7, 3.2, 2.2, 16);
      const barbettePed = new THREE.Mesh(barbettePedGeo, this.hullMat);
      barbettePed.position.set(0, -0.6, 0);
      turretGroup.add(barbettePed);

      // Crimson Turret Ring Barbette
      const barbetteGeo = new THREE.CylinderGeometry(2.4, 2.7, 0.8, 16);
      const barbette = new THREE.Mesh(barbetteGeo, this.trimGoldMat);
      barbette.position.set(0, 0.6, 0);
      turretGroup.add(barbette);

      const housingGeo = new THREE.BoxGeometry(2.8, 1.8, 3.4);
      const housing = new THREE.Mesh(housingGeo, this.armorPlateMat);
      housing.position.set(0, 1.6, 0);
      turretGroup.add(housing);

      const barrelGroup = new THREE.Group();
      barrelGroup.position.set(0, 1.8, 1.4);

      const tips = [];
      [-0.8, 0.8].forEach(bx => {
        const barrelGeo = new THREE.CylinderGeometry(0.26, 0.30, 6.5, 8);
        barrelGeo.rotateX(Math.PI / 2);
        const barrel = new THREE.Mesh(barrelGeo, this.keelMat);
        barrel.position.set(bx, 0, 3.2);
        barrelGroup.add(barrel);

        const tipGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.8, 8);
        tipGeo.rotateX(Math.PI / 2);
        const tipMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });
        const tip = new THREE.Mesh(tipGeo, tipMat);
        tip.position.set(bx, 0, 6.6);
        barrelGroup.add(tip);
        tips.push(tip);
      });

      turretGroup.add(barrelGroup);
      this.meshGroup.add(turretGroup);

      turretData.mesh = turretGroup;
      turretData.barrelGroup = barrelGroup;
      turretData.barrelTips = tips;

      const reticleGeo = new THREE.RingGeometry(3.0, 3.5, 16);
      const reticleMat = new THREE.MeshBasicMaterial({
        color: 0xff2244,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85
      });
      const reticle = new THREE.Mesh(reticleGeo, reticleMat);
      reticle.position.set(0, 2.8, 0);
      reticle.rotation.x = -Math.PI / 2;
      turretGroup.add(reticle);
      turretData.reticle = reticle;
      this.reticleMeshes.push(reticle);
    });

    // ── 9. Build Subsystems (Side Hangar Tunnels with Launch Gates) ──
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
          color: 0xff1144,
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
        color: 0xff2244,
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

    // ── 10. Flashing Navigation Strobe Lights ──
    const strobeConfigs = [
      { pos: new THREE.Vector3(0, 5.8, 34.0), color: 0xffffff },    // Prow Apex White Strobe
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
    if (this.isDead || !this.meshGroup) return { lasers: false, missiles: false, droneSpawns: 0, droneLaunches: null, siegeLasers: false };

    if (this.isDying) {
      this.deathTimer -= dt;
      if (Math.random() < 0.9 && this.particleManager) {
        const offset = new THREE.Vector3((Math.random() - 0.5) * 45, (Math.random() - 0.5) * 18, (Math.random() - 0.5) * 65);
        this.particleManager.createExplosion(this.meshGroup.position.clone().add(offset), 0xff2244, 80, 4.5);
        this.particleManager.createExplosion(this.meshGroup.position.clone().add(offset), 0xff6600, 60, 3.5);
        this.particleManager.spawnSparks(this.meshGroup.position.clone().add(offset), new THREE.Vector3(0, 1, 0), 0xffd700, 20);
      }
      this.meshGroup.rotation.z += 0.12 * dt;
      this.meshGroup.rotation.x += 0.06 * dt;
      this.meshGroup.position.y -= 2.0 * dt;
      if (this.deathTimer <= 0) {
        this.isDead = true;
        this._explode();
        this.destroy();
      }
      return { lasers: false, missiles: false, droneSpawns: 0, droneLaunches: null, siegeLasers: false };
    }

    // Progressive hull damage smoke
    if (this.coreHp < this.maxCoreHp * 0.5 && Math.random() < 0.4 && this.particleManager) {
      const offset = new THREE.Vector3((Math.random() - 0.5) * 25, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 35);
      this.particleManager.spawnEngineParticle(this.meshGroup.position.clone().add(offset), 0x222222);
      this.particleManager.spawnSparks(this.meshGroup.position.clone().add(offset), new THREE.Vector3(0, 1, 0), 0xff4400, 8);
    }

    this._time += dt;
    const playerPos = playerShip && playerShip.meshGroup ? playerShip.meshGroup.position : new THREE.Vector3();

    const arrived = this.meshGroup.position.z >= this.targetZ;
    if (!arrived) {
      this.meshGroup.position.z += this.speed * dt;
    } else {
      // ── ⚡ Carrier Tactical Micro-Warp Relocation & Combat Surge Maneuvers ──
      this.warpTimer = (this.warpTimer || 9.0) - dt;
      if (this.warpTimer <= 0) {
        this.warpTimer = 11.0 + Math.random() * 4.0;
        // Tactical Micro-Warp Ambush
        if (this.particleManager) {
          this.particleManager.createEmpShockwave(this.meshGroup.position, 70);
          this.particleManager.createExplosion(this.meshGroup.position, 0xff0055, 60, 3.0);
        }
        this.meshGroup.position.x = -this.meshGroup.position.x; // Invert flank!
        this.meshGroup.position.y = 9.0 + (Math.random() - 0.5) * 4.0;
        this.droneLaunchTimer = 0.1; // Instant scramble!
      }

      this.surgeTimer = (this.surgeTimer || 6.0) - dt;
      if (this.surgeTimer <= 0) {
        this.surgeTimer = 8.0 + Math.random() * 3.0;
        this.isSurging = true;
        this.surgeProgress = 0;
      }

      if (this.isSurging) {
        this.surgeProgress += dt * 1.5;
        this.meshGroup.position.z = this.targetZ + Math.sin(this.surgeProgress * Math.PI) * 22.0;
        this.meshGroup.rotation.x = 0.22 + Math.sin(this.surgeProgress * Math.PI) * 0.25;
        if (this.particleManager && Math.random() < 0.6) {
          this.particleManager.spawnSonicBoomDisc(this.meshGroup.position, 0xff3300);
        }
        if (this.surgeProgress >= 1.0) {
          this.isSurging = false;
          this.meshGroup.position.z = this.targetZ;
        }
      } else {
        this.meshGroup.rotation.x = THREE.MathUtils.lerp(this.meshGroup.rotation.x, 0.22, dt * 2.0);
        this.meshGroup.rotation.y = THREE.MathUtils.lerp(this.meshGroup.rotation.y, Math.sin(this._time * 0.4) * 0.25, dt * 2.0);
        this.meshGroup.rotation.z = THREE.MathUtils.lerp(this.meshGroup.rotation.z, -Math.sin(this._time * 0.4) * 0.08, dt * 2.0);
        this.meshGroup.position.x = Math.sin(this._time * 0.4) * 14.0;
        this.meshGroup.position.y = 8.0 + Math.cos(this._time * 0.3) * 2.5;
      }
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
        this.particleManager.spawnEngineParticle(wp, 0xff3300);
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

    // ── 🎯 Smart Aiming with Clear Firing Arcs (Never Shoot Through the Ship) ──
    if (arrived) {
      this.turrets.forEach(t => {
        if (!t.isDead && t.mesh && t.barrelGroup) {
          const localPlayer = this.meshGroup.worldToLocal(playerPos.clone());
          
          // Constrain aiming angles to outward arcs so turrets never aim across/through the carrier's forward hull
          let targetX = localPlayer.x;
          const isLeftTurret = t.relPos.x < 0;
          if (isLeftTurret && targetX > -2.0) {
            targetX = -2.0; // Left turrets don't cross into right hull
          } else if (!isLeftTurret && targetX < 2.0) {
            targetX = 2.0;  // Right turrets don't cross into left hull
          }

          const targetAngleY = Math.atan2(targetX - t.relPos.x, localPlayer.z - t.relPos.z);
          t.mesh.rotation.y = THREE.MathUtils.lerp(t.mesh.rotation.y, targetAngleY, dt * 3.5);

          const distHoriz = Math.hypot(targetX - t.relPos.x, localPlayer.z - t.relPos.z);
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

    // ── 🔫 Firing From Actual Physical Gun Muzzle Tips ──
    this.fireTimer -= dt;
    if (this.fireTimer <= 0) {
      this.fireTimer = 0.85;
      const fireOrigins = [];
      this.turrets.forEach(t => {
        if (!t.isDead && t.barrelTips && t.barrelTips.length > 0) {
          // Fire from each physical barrel tip extended outside the hull
          t.barrelTips.forEach(tip => {
            const muzzleWorldPos = tip.getWorldPosition(new THREE.Vector3());
            fireOrigins.push(muzzleWorldPos);
          });
        }
      });
      if (fireOrigins.length > 0) {
        result.lasers = fireOrigins;
      }
    }

    // ── 2. Interceptor Launches Out of the Side Hangar Bays (Port & Starboard) ──
    const livingHangars = this.subsystems.filter(s => s.id.includes('hangar') && !s.isDead);
    if (livingHangars.length > 0) {
      this.droneLaunchTimer -= dt;
      if (this.droneLaunchTimer <= 0) {
        this.droneLaunchTimer = 3.8;
        const launches = [];
        livingHangars.forEach(h => {
          const wp = this.meshGroup.localToWorld(h.relPos.clone());
          const isRight = h.relPos.x > 0;
          wp.x += isRight ? 3.5 : -3.5;
          launches.push({
            pos: wp,
            vx: isRight ? (16.0 + Math.random() * 4.0) : (-16.0 - Math.random() * 4.0),
            vy: (Math.random() - 0.5) * 3.0,
            vz: 11.0 + Math.random() * 4.0
          });
          if (this.particleManager) {
            this.particleManager.spawnSonicBoomDisc(wp, 0xff2244);
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
      if (t.mesh && t.mesh.parent) {
        const wp = new THREE.Vector3();
        const wq = new THREE.Quaternion();
        const ws = new THREE.Vector3();
        t.mesh.getWorldPosition(wp);
        t.mesh.getWorldQuaternion(wq);
        t.mesh.getWorldScale(ws);

        t.mesh.parent.remove(t.mesh);
        t.mesh.position.copy(wp);
        t.mesh.quaternion.copy(wq);
        t.mesh.scale.copy(ws);
        this.scene.add(t.mesh);

        // Leave charred scorched barbette stump on carrier
        const stumpGeo = new THREE.CylinderGeometry(1.6, 2.0, 0.6, 8);
        const stumpMat = new THREE.MeshStandardMaterial({ color: 0x100a18, metalness: 0.98, roughness: 0.85, emissive: 0x330011, emissiveIntensity: 0.7 });
        const stump = new THREE.Mesh(stumpGeo, stumpMat);
        stump.position.copy(t.relPos);
        this.meshGroup.add(stump);

        if (this.particleManager && this.particleManager.metalDebris) {
          this.particleManager.metalDebris.push({
            mesh: t.mesh,
            geo: t.mesh.geometry,
            mat: t.mesh.material,
            vx: (Math.random() - 0.5) * 12.0,
            vy: 3.0 + (Math.random() - 0.5) * 5.0,
            vz: 7.0 + Math.random() * 14.0,
            rotSpeedX: (Math.random() - 0.5) * 6.0,
            rotSpeedY: (Math.random() - 0.5) * 6.0,
            rotSpeedZ: (Math.random() - 0.5) * 6.0,
            life: 1.0,
            decay: 0.16
          });
        }

        if (this.particleManager) {
          this.particleManager.createExplosion(wp, 0xff2244, 50, 3.0);
          this.particleManager.createEmpShockwave(wp, 20);
          this.particleManager.spawnMetalDebris(wp, 4, 0xff3300);
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
      if (sub.mesh && sub.mesh.parent) {
        const wp = new THREE.Vector3();
        const wq = new THREE.Quaternion();
        const ws = new THREE.Vector3();
        sub.mesh.getWorldPosition(wp);
        sub.mesh.getWorldQuaternion(wq);
        sub.mesh.getWorldScale(ws);

        sub.mesh.parent.remove(sub.mesh);
        sub.mesh.position.copy(wp);
        sub.mesh.quaternion.copy(wq);
        sub.mesh.scale.copy(ws);
        this.scene.add(sub.mesh);

        // Leave scorched crater
        const craterGeo = new THREE.BoxGeometry(4.0, 0.4, 4.0);
        const craterMat = new THREE.MeshStandardMaterial({ color: 0x100a18, metalness: 0.98, roughness: 0.85, emissive: 0x330011, emissiveIntensity: 0.6 });
        const crater = new THREE.Mesh(craterGeo, craterMat);
        crater.position.copy(sub.relPos);
        this.meshGroup.add(crater);

        if (this.particleManager && this.particleManager.metalDebris) {
          this.particleManager.metalDebris.push({
            mesh: sub.mesh,
            geo: sub.mesh.geometry,
            mat: sub.mesh.material,
            vx: (Math.random() - 0.5) * 12.0,
            vy: 2.5 + (Math.random() - 0.5) * 5.0,
            vz: 7.0 + Math.random() * 15.0,
            rotSpeedX: (Math.random() - 0.5) * 6.0,
            rotSpeedY: (Math.random() - 0.5) * 6.0,
            rotSpeedZ: (Math.random() - 0.5) * 6.0,
            life: 1.0,
            decay: 0.16
          });
        }

        if (this.particleManager) {
          this.particleManager.createExplosion(wp, 0xff0044, 75, 4.0);
          this.particleManager.createEmpShockwave(wp, 25);
          this.particleManager.spawnMetalDebris(wp, 4, 0xff0055);
        }
      }
    }
    return sub.isDead;
  }

  takeDamage(amount) {
    if (this.isDead || this.isDying) return false;
    this.coreHp -= amount;
    if (this.coreHp <= 0 && !this.isDying) {
      this.isDying = true;
      this.deathTimer = 3.8;
      this.turrets.forEach(t => t.isDead = true);
      this.subsystems.forEach(s => s.isDead = true);
      window.spaceGameManager?.voiceAnnouncer?.speak("Gorgon Supercarrier Flight Deck Shattered! Critical Core Overload!", true);
      return true;
    }
    return false;
  }

  _explode() {
    const pos = this.meshGroup.position;
    if (this.particleManager) {
      this.particleManager.createExplosion(pos, 0xff2244, 450, 9.0);
      this.particleManager.createExplosion(pos, 0xff6600, 350, 8.0);
      this.particleManager.createExplosion(pos, 0xffffff, 250, 6.0);
      this.particleManager.createEmpShockwave(pos, 180);
      this.particleManager.createEmpShockwave(pos, 280);
      this.particleManager.spawnSparks(pos, new THREE.Vector3(0, 1, 0), 0xffaa00, 60);
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
