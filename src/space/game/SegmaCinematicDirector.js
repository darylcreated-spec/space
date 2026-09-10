import * as THREE from 'three';
import { assetManager } from '../engine/AssetManager.js';
import { getPBRMaterialSet } from '../engine/PBRTextureGenerator.js';
import { EnemyDrone } from '../objects/EnemyDrone.js';
import { StealthFighter } from '../objects/StealthFighter.js';
import { ECMJammerCorvette } from '../objects/ECMJammerCorvette.js';

/**
 * Procedural Triplanar UV & Tangent Generator
 * Eliminates polygon stretching and ensures textures and normal maps wrap accurately
 * across complex hard-surface space fleet models.
 */
function applyTriplanarUVs(geometry, repeatScale = 2.0) {
  if (!geometry || !geometry.attributes.position) return;

  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox;
  const size = new THREE.Vector3();
  bbox.getSize(size);
  const min = bbox.min;

  const pos = geometry.attributes.position;
  const count = pos.count;
  const uvs = new Float32Array(count * 2);

  if (!geometry.attributes.normal) {
    geometry.computeVertexNormals();
  }
  const normAttr = geometry.attributes.normal;
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    p.fromBufferAttribute(pos, i);
    n.fromBufferAttribute(normAttr, i);

    const nx = Math.abs(n.x);
    const ny = Math.abs(n.y);
    const nz = Math.abs(n.z);

    let u, v;
    if (ny >= nx && ny >= nz) {
      // Top/bottom facing: map X and Z
      u = (p.x - min.x) / (size.x || 1);
      v = (p.z - min.z) / (size.z || 1);
    } else if (nx >= ny && nx >= nz) {
      // Side facing: map Z and Y
      u = (p.z - min.z) / (size.z || 1);
      v = (p.y - min.y) / (size.y || 1);
    } else {
      // Front/rear facing: map X and Y
      u = (p.x - min.x) / (size.x || 1);
      v = (p.y - min.y) / (size.y || 1);
    }

    uvs[i * 2] = u * repeatScale;
    uvs[i * 2 + 1] = v * repeatScale;
  }

  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.uvsNeedUpdate = true;
  geometry.computeVertexNormals();

  try {
    geometry.computeTangents();
  } catch (e) {
    // Tangents fallback handled by standard Three.js shader pipeline
  }
}

/**
 * Procedural Photovoltaic Silicon Texture Generator
 * Generates an authentic ultra-high detail solar cell texture with dark blue/indigo silicon wafers,
 * silver conductive micro-traces, and gold collector busbars.
 */
function generatePhotovoltaicTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Background deep space-grade antireflective coating (silicon blue)
  const grad = ctx.createLinearGradient(0, 0, 512, 1024);
  grad.addColorStop(0, '#06132b');
  grad.addColorStop(0.5, '#0b2447');
  grad.addColorStop(1, '#081736');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 1024);

  // Individual photovoltaic silicon wafer cells (4 cols x 8 rows)
  const cols = 4;
  const rows = 8;
  const cellW = 512 / cols;
  const cellH = 1024 / rows;
  const margin = 4;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cellW + margin;
      const y = r * cellH + margin;
      const w = cellW - margin * 2;
      const h = cellH - margin * 2;

      // Silicon substrate
      ctx.fillStyle = '#0a2a5e';
      ctx.fillRect(x, y, w, h);

      // Fine horizontal collector grid lines (silver micro-traces)
      ctx.fillStyle = 'rgba(180, 220, 255, 0.4)';
      for (let gy = y + 4; gy < y + h; gy += 6) {
        ctx.fillRect(x, gy, w, 1);
      }

      // Vertical copper/silver grid lines
      for (let gx = x + 8; gx < x + w; gx += 16) {
        ctx.fillRect(gx, y, 1, h);
      }

      // Wafer border bevel
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);
    }
  }

  // Central Gold Busbars running down each column
  for (let c = 0; c < cols; c++) {
    const cx = c * cellW + cellW / 2;
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(cx - 2, 0, 4, 1024);

    // Lateral gold contact pads
    ctx.fillStyle = 'rgba(255, 215, 0, 0.7)';
    for (let r = 0; r < rows; r++) {
      const cy = r * cellH + cellH / 2;
      ctx.fillRect(cx - 8, cy - 2, 16, 4);
    }
  }

  // Heavy structural outer frame and cell isolation borders
  ctx.strokeStyle = '#223048';
  ctx.lineWidth = 4;
  for (let r = 0; r <= rows; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * cellH);
    ctx.lineTo(512, r * cellH);
    ctx.stroke();
  }
  for (let c = 0; c <= cols; c++) {
    ctx.beginPath();
    ctx.moveTo(c * cellW, 0);
    ctx.lineTo(c * cellW, 1024);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * SegmaCinematicDirector
 * Manages the interactive 3D opening cinematic sequence: "The Call of the Fleet Armada to Planet Segma"
 * Features:
 * - Space Station Citadel already stationed in orbit at Planet Segma
 * - Hyperspace warp-in arrival of the Allied Armada (Flagship, Escort Frigate, Destroyer Aegis)
 * - Interactive defensive positioning & formation assignment (Aegis Wedge, Citadel Guard, Flank Screen, free drag)
 * - Hyperspace portal warp-in of hostile invasion fleet (Space Carrier & Heavy Battleship)
 * - Smooth transition into active combat
 */
export class SegmaCinematicDirector {
  constructor(gameManager) {
    this.gameManager = gameManager;
    this.scene = gameManager.spaceScene.scene;
    this.camera = gameManager.spaceScene.camera;
    this.spaceAudio = gameManager.spaceAudio;
    this.particleManager = gameManager.particleManager;
    this.controlsManager = gameManager.controlsManager;

    this.isActive = false;
    this.elapsedTime = 0;
    this.onCompleteCallback = null;

    // Camera Modes: 'DIRECTOR', 'PANORAMA', 'CHASE', 'COCKPIT'
    this.cameraMode = 'DIRECTOR';
    this.cameraModes = ['DIRECTOR', 'PANORAMA', 'CHASE', 'COCKPIT'];
    this.cameraModeIndex = 0;

    // Timeline Pause & Free Camera State
    this.isPaused = false;

    // Interactive Camera Zoom & Orbit Angle Controls (Zoom in/out, pitch, yaw)
    this.cameraZoomFactor = 1.0;     // 0.4 (close) to 3.0 (ultra wide zoom out)
    this.cameraOrbitAngleX = 0;      // Yaw rotation offset (-Math.PI to Math.PI)
    this.cameraOrbitAngleY = 0;      // Pitch elevation offset (-0.6 to 1.0)
    this.isOrbitDragging = false;
    this.orbitPointerStart = { x: 0, y: 0 };
    this.orbitStartAngles = { x: 0, y: 0 };

    // Controllable Player Ship Options: 'FRIGATE', 'DESTROYER', 'INTERCEPTOR'
    this.playerVesselOptions = ['FRIGATE', 'DESTROYER', 'INTERCEPTOR'];
    this.currentVesselIndex = 0;
    this.selectedShipClass = 'INTERCEPTOR';

    // Cinematic Entities
    this.cinematicGroup = new THREE.Group();
    this.alliedStation = null;
    this.stationRing = null;
    this.alliedEscort = null;
    this.alliedDestroyer = null;
    this.enemyCarrier = null;
    this.enemyBattleship = null;
    this.warpPortalCarrier = null;
    this.warpPortalBattleship = null;
    this.deployedDrones = [];
    this.waveEnemyDrones = [];
    this.waveStealthFighters = [];
    this.waveEcmCorvette = null;
    this.escapingStealthFighter = null;
    this.stealthFighterFX = null;
    this.stealthEscapeActive = false;
    this.shot4LaunchAudioTriggered = false;

    // Cinematic Battle Eruption & Annihilation State
    this.battlePhase = 'RECALL'; // 'RECALL', 'WARP_IN', 'TACTICAL_DEFENSE', 'BATTLE_ERUPTS', 'STEALTH_ESCAPE', 'FINISHED'
    this.battleTimer = 0;
    this.alliedBroadsideFired = false;
    this.carrierDestroyed = false;
    this.battleshipDestroyed = false;
    this.stealthEscaped = false;
    this.battleExplosions = [];
    this.alliedSalvoTimer = 0;

    // Allied Armada Warp Portals
    this.alliedPortals = [];
    this.alliedWarpProgress = 0;
    this.alliedWarpCompleted = false;

    // Tactical Defensive Positioning State
    this.isTacticalMode = false;
    this.selectedShipKey = 'PLAYER'; // 'PLAYER', 'FRIGATE', 'DESTROYER'
    this.tacticalShips = {}; // { 'PLAYER': { mesh, targetPos, label, baseScale }, ... }
    this.currentFormation = 'AEGIS'; // 'AEGIS', 'CITADEL', 'SCREEN'
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.isDraggingShip = false;
    this.defensePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -4); // Horizontal plane at Y=4
    this.selectionRings = {}; // Visual 3D selection rings for each selectable ship

    // Thruster & VFX Arrays
    this.engineFXList = [];
    this.cinematicProjectiles = [];
    this.cinematicBeams = [];
    this.cinematicTorpedoes = [];
    this.stationSolarArrays = [];
    this.destroyerRecoil = 0;
    this.battleshipShudder = 0;
    this.carrierShudder = 0;
    this.stationCIWSTimer = 0;

    // Warp Sequence States
    this.warpTriggered = false;
    this.warpCompleted = false;
    this.warpProgress = 0;

    // Input & Flight
    this.playerPos = new THREE.Vector3(0, 4, -20);
    this.playerRot = new THREE.Euler(0, 0, 0, 'YXZ');
    this.playerMesh = null;
    this.playerBaseScale = 2.0;
    this.fireTimer = 0;

    // Camera Lerp Cache
    this.camTargetPos = new THREE.Vector3();
    this.camLookAt = new THREE.Vector3();
    this.camCurrentLookAt = new THREE.Vector3(16.0, 2.0, -85.0);

    // Camera Micro-Shake & Trauma System
    this.camTrauma = 0;

    // Midground Orbital Space Debris Field
    this.debrisField = [];

    // Multi-Stage Hull Breaches State
    this.battleshipBreachTimer = 0;
    this.carrierBreachTimer = 0;

    // Audio & Voice Timeline Triggers
    this.shot1VoiceTriggered = false;
    this.shot2WarpAudioTriggered = false;
    this.shot2ImperialVoiceTriggered = false;
    this.shot3ViperVoiceTriggered = false;
    this.shot4FlybyAudioTriggered = false;
    this.shot5BoostPromptActive = false;
    this.shot5AutoTimer = 3.8;
    this.boostEngaging = false;

    // PBR Material Cache
    this.pbrMaterials = {};

    // ── High-Performance Reusable Vectors & Matrices (Zero GC per frame) ──
    this._vForward = new THREE.Vector3();
    this._vRight = new THREE.Vector3();
    this._vUp = new THREE.Vector3();
    this._camOffset = new THREE.Vector3();
    this._camRightAxis = new THREE.Vector3();
    this._yAxis = new THREE.Vector3(0, 1, 0);
    this._chaseOffset = new THREE.Vector3();
    this._lookOffset = new THREE.Vector3();
    this._cockpitOffset = new THREE.Vector3();
    this._cockpitLookOffset = new THREE.Vector3();
    this._targetDestPos = new THREE.Vector3(-36, 1, -82);
    this._targetFrigatePos = new THREE.Vector3(28, 12, -78);
    this._torpCurPos = new THREE.Vector3();
    this._stealthP0 = new THREE.Vector3(18, 6, -135);
    this._stealthP1 = new THREE.Vector3(0, 4, -40);
    this._stealthP2 = new THREE.Vector3(-25, 15, -280);
    this._stealthCurPos = new THREE.Vector3();
    this._stealthNextPos = new THREE.Vector3();
    this._stealthMaterials = [];
    this._tempV1 = new THREE.Vector3();
    this._tempV2 = new THREE.Vector3();
    this._tempV3 = new THREE.Vector3();
    this._offsetDestroyerMuzzle = new THREE.Vector3(0, 0, -26);

    // ── Shared Geometries & Materials for Zero-Allocation Projectiles ──
    this._sharedBoltGeo = new THREE.CylinderGeometry(0.14, 0.14, 4.2, 8);
    this._sharedBoltGeo.rotateX(Math.PI / 2);
    this._sharedEnemyBoltGeo = new THREE.CylinderGeometry(0.32, 0.32, 6.0, 6);
    this._sharedEnemyBoltGeo.rotateX(Math.PI / 2);
    this._sharedTorpGeo = new THREE.ConeGeometry(0.75, 2.2, 8);
    this._sharedTorpGeo.rotateX(Math.PI / 2);
    this._sharedUnitCylinderGeo = new THREE.CylinderGeometry(1, 1, 1, 6);
    this._sharedUnitCylinderGeo.rotateX(Math.PI / 2);

    this._sharedPlayerLaserMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });
    this._sharedEnemyLaserMat = new THREE.MeshBasicMaterial({
      color: 0xff0033,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });
    this._sharedTorpedoMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });
    this._sharedRailgunCoreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending
    });
    this._sharedRailgunGlowMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });

    this._beamPool = [];
    this._torpPool = [];
    this._enemyBoltPool = [];
    this._playerBoltPool = [];

    this.createDomOverlay();
  }

  getRailgunBeam(hasSlug) {
    let beam = this._beamPool.pop();
    if (!beam) {
      const outerMesh = new THREE.Mesh(this._sharedUnitCylinderGeo, this._sharedRailgunGlowMat.clone());
      const coreMesh = new THREE.Mesh(this._sharedUnitCylinderGeo, this._sharedRailgunCoreMat);
      coreMesh.name = 'slugCore';
      outerMesh.add(coreMesh);
      beam = outerMesh;
    }
    const core = beam.getObjectByName('slugCore');
    if (core) core.visible = !!hasSlug;
    beam.visible = true;
    return beam;
  }

  recycleRailgunBeam(mesh) {
    if (!mesh) return;
    this.cinematicGroup.remove(mesh);
    if (this._beamPool.length < 16) {
      this._beamPool.push(mesh);
    }
  }

  getTorpedoMesh() {
    let torp = this._torpPool.pop();
    if (!torp) {
      torp = new THREE.Mesh(this._sharedTorpGeo, this._sharedTorpedoMat);
    }
    torp.visible = true;
    return torp;
  }

  recycleTorpedo(mesh) {
    if (!mesh) return;
    this.cinematicGroup.remove(mesh);
    if (this._torpPool.length < 16) {
      this._torpPool.push(mesh);
    }
  }

  getEnemyBolt() {
    let bolt = this._enemyBoltPool.pop();
    if (!bolt) {
      bolt = new THREE.Mesh(this._sharedEnemyBoltGeo, this._sharedEnemyLaserMat);
    }
    bolt.visible = true;
    return bolt;
  }

  recycleEnemyBolt(mesh) {
    if (!mesh) return;
    this.cinematicGroup.remove(mesh);
    if (this._enemyBoltPool.length < 32) {
      this._enemyBoltPool.push(mesh);
    }
  }

  getPlayerBolt() {
    let bolt = this._playerBoltPool.pop();
    if (!bolt) {
      bolt = new THREE.Mesh(this._sharedBoltGeo, this._sharedPlayerLaserMat);
    }
    bolt.visible = true;
    return bolt;
  }

  recyclePlayerBolt(mesh) {
    if (!mesh) return;
    this.cinematicGroup.remove(mesh);
    if (this._playerBoltPool.length < 32) {
      this._playerBoltPool.push(mesh);
    }
  }


  createDomOverlay() {
    let container = document.getElementById('segma-cinematic-hud');
    if (!container) {
      container = document.createElement('div');
      container.id = 'segma-cinematic-hud';
      container.className = 'segma-cinematic-hud hidden';
      container.innerHTML = `
        <div class="segma-letterbox top">
          <div class="segma-telemetry-left">
            <span class="telemetry-bracket">[</span>
            <span id="segma-status-tag" class="telemetry-text">SECTOR SEGMA // ORBITAL DEFENSE PATROL</span>
            <span class="telemetry-bracket">]</span>
          </div>
          <div class="segma-telemetry-right">
            <div class="segma-zoom-controls">
              <button id="btn-segma-zoom-out" class="segma-btn-icon" title="Zoom Out to View All Assets (-)">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
              </button>
              <span id="segma-zoom-level" class="segma-zoom-label" title="Camera Zoom Factor">100%</span>
              <button id="btn-segma-zoom-in" class="segma-btn-icon" title="Zoom In (+)">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  <line x1="11" y1="8" x2="11" y2="14"></line>
                  <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
              </button>
              <button id="btn-segma-overview" class="segma-btn-pill" title="Toggle Fleet Overview Angle (O)">
                <span class="pill-dot"></span>
                <span>OVERVIEW (ALL ASSETS)</span>
              </button>
            </div>
            <button id="btn-segma-pause" class="segma-btn-pill" title="Pause / Resume Cinematic Timeline (P)">
              <span class="pill-dot"></span>
              <span id="segma-pause-label">PAUSE (P)</span>
            </button>
            <button id="btn-segma-camera" class="segma-btn-pill" title="Toggle Camera Perspective (C)">
              <span class="pill-dot"></span>
              <span id="segma-cam-label">CAM: DIRECTOR</span>
            </button>
            <button id="btn-segma-engage" class="segma-btn-engage" title="Skip Cinematic Movie to Wave 1 (Space)">
              <span>SKIP MOVIE (SPACE)</span>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- 🚀 Interactive Hand-Off Boost Prompt (Shot 5) -->
        <div id="segma-interactive-prompt" class="segma-interactive-prompt hidden">
          <button id="btn-segma-boost-engage" class="segma-interactive-btn">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            <span>ENGAGE SUBSPACE BOOST</span>
            <span class="segma-key-badge">SPACE / TAP</span>
          </button>
          <div id="segma-auto-timer" class="segma-auto-timer">AUTO-ENGAGING IN 3.8s...</div>
        </div>

        <div class="segma-letterbox bottom">
          <div class="segma-comms-panel">
            <div class="segma-speaker-bar">
              <span id="segma-speaker-name" class="segma-speaker-name">HIGH COMMAND</span>
              <span class="segma-comm-badge">PRIORITY COMM // ORBITAL DEFENSE</span>
            </div>
            <div id="segma-dialogue-text" class="segma-dialogue-text">
              Emergency alert: Hostile fleet entering Sector Segma. All units, engage defense perimeter!
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(container);
    }

    this.hudElem = container;
    this.camLabel = document.getElementById('segma-cam-label');
    this.shipLabel = document.getElementById('segma-ship-label');
    this.dialogueText = document.getElementById('segma-dialogue-text');
    this.speakerName = document.getElementById('segma-speaker-name');
    this.statusTag = document.getElementById('segma-status-tag');
    this.zoomLevelLabel = document.getElementById('segma-zoom-level');
    this.interactivePrompt = document.getElementById('segma-interactive-prompt');
    this.autoTimerElem = document.getElementById('segma-auto-timer');

    document.getElementById('btn-segma-zoom-out')?.addEventListener('click', () => this.adjustCameraZoom(0.25));
    document.getElementById('btn-segma-zoom-in')?.addEventListener('click', () => this.adjustCameraZoom(-0.25));
    document.getElementById('btn-segma-overview')?.addEventListener('click', () => this.toggleOverviewCamera());
    document.getElementById('btn-segma-pause')?.addEventListener('click', () => this.togglePause());

    document.getElementById('btn-segma-camera')?.addEventListener('click', () => this.cycleCameraMode());
    document.getElementById('btn-segma-engage')?.addEventListener('click', () => this.endCinematic());
    document.getElementById('btn-segma-boost-engage')?.addEventListener('click', () => this.triggerInteractiveBoost());

    // Mouse / Touch interaction for selecting & dragging ships in 3D + free orbit camera control
    window.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    window.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerup', () => this.onPointerUp());

    // Mouse wheel zoom in/out
    window.addEventListener('wheel', (e) => {
      if (!this.isActive) return;
      // If pointer is over HUD buttons, let standard scroll happen
      if (e.target.closest('#segma-tactical-dock') || e.target.closest('.segma-letterbox')) return;
      e.preventDefault();
      const zoomDelta = e.deltaY > 0 ? 0.15 : -0.15;
      this.adjustCameraZoom(zoomDelta);
    }, { passive: false });

    // Keyboard bindings for cinematic
    window.addEventListener('keydown', (e) => {
      if (!this.isActive) return;
      if (e.code === 'KeyP') {
        e.preventDefault();
        this.togglePause();
      } else if (e.code === 'KeyC') {
        e.preventDefault();
        this.cycleCameraMode();
      } else if (e.code === 'KeyO') {
        e.preventDefault();
        this.toggleOverviewCamera();
      } else if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
        e.preventDefault();
        this.adjustCameraZoom(0.2);
      } else if (e.code === 'Equal' || e.code === 'NumpadAdd') {
        e.preventDefault();
        this.adjustCameraZoom(-0.2);
      } else if (e.code === 'Digit0' || e.code === 'Numpad0') {
        e.preventDefault();
        this.resetCameraAngleAndZoom();
      } else if (e.code === 'KeyV') {
        e.preventDefault();
        this.cycleVesselControl();
      } else if (e.code === 'Space') {
        e.preventDefault();
        if (this.shot5BoostPromptActive && !this.boostEngaging) {
          this.triggerInteractiveBoost();
        } else {
          this.endCinematic();
        }
      } else if (e.code === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        this.endCinematic();
      }
    });
  }

  async preloadAndWarmup() {
    if (this.isPreloaded) return;
    if (this._preloadPromise) return this._preloadPromise;

    this._preloadPromise = (async () => {
      const yieldFrame = () => new Promise(resolve => requestAnimationFrame(resolve));

      // 1. Ensure Fleet Assets are loaded
      await assetManager.loadFleetAssets();
      await yieldFrame();

      // 2. Clear previous entities
      if (!this.scene.children.includes(this.cinematicGroup)) {
        this.scene.add(this.cinematicGroup);
      }
      while (this.cinematicGroup.children.length > 0) {
        this.cinematicGroup.remove(this.cinematicGroup.children[0]);
      }
      this.cinematicProjectiles = [];
      this.cinematicBeams = [];
      this.cinematicTorpedoes = [];
      this.engineFXList = [];
      this.alliedPortals = [];
      this.stationSolarArrays = [];

      // 3. Build fleet and midground elements across separate animation frames
      this.buildAlliedArmada();
      this.createOrbitalDebrisField();
      await yieldFrame();

      this.mountPlayerVessel('INTERCEPTOR');
      this.registerTacticalFleet();
      this.prepareEnemyInvasionFleet();
      await yieldFrame();

      // 4. Cache escaping stealth materials for zero-traversal updates
      this._stealthMaterials = [];
      if (this.escapingStealthFighter) {
        this.escapingStealthFighter.traverse(child => {
          if (child.isMesh && child.material) {
            this._stealthMaterials.push(child.material);
          }
        });
      }

      // 5. Pre-compile GPU shaders ahead of time
      if (this.gameManager?.spaceScene?.renderer) {
        try {
          this.gameManager.spaceScene.renderer.compile(this.cinematicGroup, this.camera);
        } catch (compileErr) {
          // Graceful fallback
        }
      }
      await yieldFrame();

      this.isPreloaded = true;
    })();

    return this._preloadPromise;
  }

  resetCinematicScene(selectedShipClass = 'INTERCEPTOR') {
    this.selectedShipClass = selectedShipClass || 'INTERCEPTOR';
    this.elapsedTime = 0;
    this.isPaused = false;
    this.warpTriggered = false;
    this.warpCompleted = false;
    this.warpProgress = 0;
    this.alliedWarpProgress = 0;
    this.alliedWarpCompleted = false;
    this.isTacticalMode = false;
    this.cameraMode = 'DIRECTOR';
    this.currentVesselIndex = 0;

    // Reset Camera in Shot 1 grand establishing perspective (open center screen)
    this.camTargetPos.set(-18.0, 38.0, 85.0);
    this.camLookAt.set(0.0, 2.0, -75.0);
    this.camCurrentLookAt.set(0.0, 2.0, -75.0);
    this.camera.position.set(-18.0, 38.0, 85.0);
    this.camera.lookAt(this.camCurrentLookAt);
    this.cameraZoomFactor = 1.0;
    this.cameraOrbitAngleX = 0;
    this.cameraOrbitAngleY = 0;

    // Reset Cinematic Battle & Stealth Escape State
    this.battlePhase = 'RECALL';
    this.battleTimer = 0;
    this.alliedBroadsideFired = false;
    this.carrierDestroyed = false;
    this.battleshipDestroyed = false;
    this.stealthEscaped = false;
    this.dronesFirstWaveDestroyed = false;
    this.dronesSecondWaveDestroyed = false;
    this.ecmCorvetteDestroyed = false;
    this.battleExplosions = [];
    this.alliedSalvoTimer = 0;
    this.stealthEscapeActive = false;
    this.stealthEscapeProgress = 0;
    this.stealthCloakTriggered = false;

    // Reset Director Micro-Shake, Debris, Audio & Interactive Boost Triggers
    this.camTrauma = 0;
    this.battleshipBreachTimer = 0;
    this.carrierBreachTimer = 0;
    this.shot1VoiceTriggered = false;
    this.shot2WarpAudioTriggered = false;
    this.shot2ImperialVoiceTriggered = false;
    this.shot3ViperVoiceTriggered = false;
    this.shot4LaunchAudioTriggered = false;
    this.shot4FlybyAudioTriggered = false;
    this.shot5BoostPromptActive = false;
    this.shot5AutoTimer = 3.8;
    this.boostEngaging = false;

    // Clear active projectiles & beams
    for (let i = this.cinematicBeams.length - 1; i >= 0; i--) {
      this.recycleRailgunBeam(this.cinematicBeams[i].mesh);
    }
    this.cinematicBeams = [];

    for (let i = this.cinematicTorpedoes.length - 1; i >= 0; i--) {
      this.recycleTorpedo(this.cinematicTorpedoes[i].mesh);
    }
    this.cinematicTorpedoes = [];

    for (let i = this.cinematicProjectiles.length - 1; i >= 0; i--) {
      const p = this.cinematicProjectiles[i];
      if (p.isPlayer) this.recyclePlayerBolt(p.mesh);
      else this.recycleEnemyBolt(p.mesh);
    }
    this.cinematicProjectiles = [];

    // Reset Space Station
    if (this.alliedStation) {
      this.alliedStation.visible = true;
      this.alliedStation.position.set(115, this.alliedStationBaseY || 24, -200);
      this.alliedStation.rotation.set(0.12, -0.42, 0.06);
    }

    // Reset Allied Ships
    if (this.alliedEscort) {
      this.alliedEscort.visible = false;
      this.alliedEscort.scale.set(0.001, 0.001, 0.001);
      this.alliedEscort.position.set(32, 4, -80);
      this.alliedEscort.rotation.set(0, 0, 0);
    }
    if (this.alliedDestroyer) {
      this.alliedDestroyer.visible = false;
      this.alliedDestroyer.scale.set(0.001, 0.001, 0.001);
      this.alliedDestroyer.position.set(-32, 4, -80);
      this.alliedDestroyer.rotation.set(0, 0, 0);
    }
    this.alliedPortals.forEach(entry => {
      if (entry.portal) {
        entry.portal.visible = true;
        entry.portal.scale.set(1, 1, 1);
      }
    });

    // Reset Enemy Ships
    if (this.enemyCarrier) {
      this.enemyCarrier.visible = false;
      this.enemyCarrier.scale.set(0.001, 0.001, 0.001);
      this.enemyCarrier.position.set(0, 12, -155);
      this.enemyCarrier.rotation.set(0, 0, 0);
    }
    if (this.enemyBattleship) {
      this.enemyBattleship.visible = false;
      this.enemyBattleship.scale.set(0.001, 0.001, 0.001);
      this.enemyBattleship.position.set(-28, 6, -145);
      this.enemyBattleship.rotation.set(0, 0, 0);
    }
    if (this.warpPortalCarrier) {
      this.warpPortalCarrier.visible = false;
      this.warpPortalCarrier.scale.set(0.001, 0.001, 0.001);
    }
    if (this.warpPortalBattleship) {
      this.warpPortalBattleship.visible = false;
      this.warpPortalBattleship.scale.set(0.001, 0.001, 0.001);
    }
    if (this.warpPortalEscort) {
      this.warpPortalEscort.visible = false;
      this.warpPortalEscort.scale.set(0.001, 0.001, 0.001);
    }

    // Reset Enemy Drones
    if (this.waveEnemyDrones) {
      this.waveEnemyDrones.forEach(d => {
        d.isDestroyed = false;
        if (d.mesh) {
          d.mesh.visible = false;
          d.mesh.scale.set(0.001, 0.001, 0.001);
          d.mesh.position.copy(d.basePos);
          d.mesh.rotation.set(0, Math.PI, 0);
        }
      });
    }

    // Reset Stealth Fighters
    if (this.waveStealthFighters) {
      this.waveStealthFighters.forEach(sf => {
        sf.isDestroyed = false;
        if (sf.mesh) {
          sf.mesh.visible = false;
          sf.mesh.scale.set(0.001, 0.001, 0.001);
          sf.mesh.position.copy(sf.basePos);
          sf.mesh.rotation.set(0, Math.PI, 0);
        }
      });
    }

    // Reset ECM Corvette
    if (this.waveEcmCorvette && this.waveEcmCorvette.mesh) {
      this.waveEcmCorvette.isDestroyed = false;
      this.waveEcmCorvette.mesh.visible = false;
      this.waveEcmCorvette.mesh.scale.set(0.001, 0.001, 0.001);
      this.waveEcmCorvette.mesh.position.set(18, 2, -130);
      this.waveEcmCorvette.mesh.rotation.set(0, Math.PI, 0);
    }

    // Reset Escaping Stealth Prototype
    if (this.escapingStealthFighter) {
      this.escapingStealthFighter.position.copy(this._stealthP0);
      this.escapingStealthFighter.scale.set(0.001, 0.001, 0.001);
      this.escapingStealthFighter.visible = false;
    }
    if (this._stealthMaterials) {
      for (let i = 0; i < this._stealthMaterials.length; i++) {
        this._stealthMaterials[i].opacity = 1.0;
      }
    }

    // Mount player ship
    this.mountPlayerVessel(this.selectedShipClass);

    // Make sure cinematicGroup is in scene
    if (!this.scene.children.includes(this.cinematicGroup)) {
      this.scene.add(this.cinematicGroup);
    }
  }

  async start(onCompleteCallback = null, selectedShipClass = 'INTERCEPTOR') {
    this.isActive = false;
    this.onCompleteCallback = onCompleteCallback;
    this.selectedShipClass = selectedShipClass || 'INTERCEPTOR';

    const pauseLabel = document.getElementById('segma-pause-label');
    if (pauseLabel) pauseLabel.textContent = 'PAUSE (P)';
    const pauseBtn = document.getElementById('btn-segma-pause');
    if (pauseBtn) pauseBtn.classList.remove('active');
    const overviewBtn = document.getElementById('btn-segma-overview');
    if (overviewBtn) overviewBtn.classList.remove('active-overview');

    if (this.interactivePrompt) {
      this.interactivePrompt.classList.add('hidden');
      this.interactivePrompt.innerHTML = `
        <button id="btn-segma-boost-engage" class="segma-interactive-btn">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          <span>ENGAGE SUBSPACE BOOST</span>
          <span class="segma-key-badge">SPACE / TAP</span>
        </button>
        <div id="segma-auto-timer" class="segma-auto-timer">AUTO-ENGAGING IN 3.8s...</div>
      `;
      document.getElementById('btn-segma-boost-engage')?.addEventListener('click', () => this.triggerInteractiveBoost());
    }

    document.body.classList.add('cinematic-active');
    if (this.gameManager.playerShip && this.gameManager.playerShip.mesh) {
      this.gameManager.playerShip.mesh.visible = false;
    }

    // Hide tactical formation dock on start
    if (this.tacticalDock) {
      this.tacticalDock.classList.add('hidden');
    }

    // Dismiss any start / pilot registration / menu modals that could obstruct the viewport
    if (this.gameManager.spaceHUD && this.gameManager.spaceHUD.hideAllModals) {
      this.gameManager.spaceHUD.hideAllModals();
    }
    const modalsToHide = ['modal-pilot-registration', 'space-modal-start', 'modal-registration', 'modal-start-menu', 'modal-pause'];
    modalsToHide.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.add('hidden');
        el.style.display = 'none';
      }
    });
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.classList.add('hidden');
      overlay.style.display = 'none';
    });

    // 1. Setup Planet Segma celestial environment (framed bottom-right)
    this.gameManager.spaceScene.setupPlanetSegma();

    // Hide in-game ISS station model so only the grand Allied Space Station Citadel stands guard over Planet Segma
    if (this.gameManager.spaceScene && this.gameManager.spaceScene.orbitalStationGroup) {
      this.gameManager.spaceScene.orbitalStationGroup.visible = false;
    }
    if (this.gameManager.spaceHUD && this.gameManager.spaceHUD.hideBoundaryWarning) {
      this.gameManager.spaceHUD.hideBoundaryWarning();
    }

    // 2. Preload & warm up if not already done
    if (!this.isPreloaded) {
      await this.preloadAndWarmup();
    }

    // 3. Instant reset of scene entities (<0.1ms)
    this.resetCinematicScene(this.selectedShipClass);

    // 4. Activate playback
    this.elapsedTime = 0;
    this.isActive = true;

    // 5. Show Cinematic HUD
    if (this.hudElem) {
      this.hudElem.classList.remove('hidden');
    }


    // Initial audio greeting: Urgent armada recall at Planet Segma
    if (this.spaceAudio && this.spaceAudio.playRadioSquelch) {
      this.spaceAudio.playRadioSquelch();
    }
    if (this.speakerName) {
      this.speakerName.textContent = 'HIGH COMMAND';
    }
    if (this.statusTag) {
      this.statusTag.textContent = 'DEFENSE ALERT // SECTOR SEGMA';
      this.statusTag.style.color = '#00f3ff';
    }
    if (this.dialogueText) {
      this.dialogueText.textContent =
        'Emergency alert: Hostile fleet entering Sector Segma. All units, engage defense perimeter!';
    }
    if (this.flightHint) {
      this.flightHint.innerHTML = 'DEFEND PLANET SEGMA // HOSTILE INCURSION DETECTED';
    }
    if (this.gameManager.voiceAnnouncer) {
      this.gameManager.voiceAnnouncer.speak(
        'Emergency alert. Hostile fleet entering Sector Segma. All units, engage!',
        true,
        'COMMAND'
      );
    }
  }

  /**
   * Builds faction-specific AAA PBR materials
   */
  getFactionPBRMaterials(faction = 'ALLIED') {
    if (this.pbrMaterials[faction]) {
      return this.pbrMaterials[faction];
    }

    const envMap = this.scene.environment;
    const isAllied = faction === 'ALLIED';
    const themeKey = isAllied ? 'ALLIED_ARMADA' : 'HOSTILE_ARMADA';
    const pbr = getPBRMaterialSet(themeKey);

    // 1. Primary Hull Armor
    const hullMat = new THREE.MeshStandardMaterial({
      map: pbr.map,
      normalMap: pbr.normalMap,
      normalScale: isAllied ? new THREE.Vector2(1.2, 1.2) : new THREE.Vector2(1.5, 1.5),
      roughnessMap: pbr.roughnessMap,
      emissiveMap: pbr.emissiveMap,
      color: isAllied ? 0x142236 : 0x0c090e,
      metalness: isAllied ? 0.90 : 0.92,
      roughness: isAllied ? 0.35 : 0.30,
      emissive: isAllied ? 0x002b44 : 0x330008,
      emissiveIntensity: isAllied ? 0.15 : 0.25,
      envMap: envMap,
      envMapIntensity: isAllied ? 1.4 : 1.2
    });

    // 2. Anodized Accent Plating
    const accentMat = new THREE.MeshStandardMaterial({
      map: pbr.map,
      normalMap: pbr.normalMap,
      normalScale: new THREE.Vector2(1.2, 1.2),
      roughnessMap: pbr.roughnessMap,
      color: isAllied ? 0x1d4678 : 0xb00c18,
      metalness: isAllied ? 0.92 : 0.88,
      roughness: isAllied ? 0.25 : 0.22,
      envMap: envMap,
      envMapIntensity: isAllied ? 1.5 : 1.4
    });

    // 3. High-Intensity Emissive (Avionics / Conduits)
    const emissiveMat = new THREE.MeshStandardMaterial({
      color: isAllied ? 0x00f3ff : 0xff1133,
      emissive: isAllied ? 0x00f3ff : 0xff1133,
      emissiveIntensity: isAllied ? 1.2 : 1.6,
      roughness: 0.2,
      metalness: 0.1,
      toneMapped: true
    });

    // 4. Exposed Tungsten Hardpoints & Machinery
    const machineryMat = new THREE.MeshStandardMaterial({
      normalMap: pbr.normalMap,
      normalScale: new THREE.Vector2(1.2, 1.2),
      color: isAllied ? 0x181e26 : 0x161318,
      metalness: 0.96,
      roughness: 0.35,
      envMap: envMap,
      envMapIntensity: 1.2
    });

    // 5. Polarized Cockpit Glass / Visors
    const glassMat = new THREE.MeshStandardMaterial({
      color: isAllied ? 0x040e18 : 0x0a0406,
      emissive: isAllied ? 0x00d0ff : 0xff0044,
      emissiveIntensity: isAllied ? 0.9 : 1.2,
      metalness: 0.98,
      roughness: 0.04,
      envMap: envMap,
      envMapIntensity: 2.8
    });

    const set = { hullMat, accentMat, emissiveMat, machineryMat, glassMat };
    this.pbrMaterials[faction] = set;
    return set;
  }

  /**
   * Applies UV unwrap and AAA PBR materials to an imported GLTF object hierarchy
   */
  applyAAAFactionMaterials(obj, faction = 'ALLIED', repeatScale = 3.0) {
    if (!obj) return;
    const mats = this.getFactionPBRMaterials(faction);

    obj.traverse((child) => {
      if (child.isMesh) {
        // 1. Generate triplanar UVs and normals
        applyTriplanarUVs(child.geometry, repeatScale);

        // 2. Assign high-tech PBR material based on component name
        const childName = (child.name || '').toLowerCase();
        const matName = (child.material && child.material.name ? child.material.name : '').toLowerCase();

        if (childName.includes('accent') || matName.includes('accent')) {
          child.material = mats.accentMat;
        } else if (childName.includes('emissive') || matName.includes('emissive') || childName.includes('glow')) {
          child.material = mats.emissiveMat;
        } else if (childName.includes('machinery') || matName.includes('machinery') || childName.includes('gun') || childName.includes('rail')) {
          child.material = mats.machineryMat;
        } else if (childName.includes('glass') || matName.includes('glass') || childName.includes('canopy') || childName.includes('cockpit')) {
          child.material = mats.glassMat;
        } else {
          child.material = mats.hullMat;
        }

        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  /**
   * Attaches dynamic afterburning engine plumes, shock diamonds, and real-time point lights
   */
  attachEngineThrusters(shipGroup, nozzlePositions, faction = 'ALLIED', baseRadius = 1.0, baseLength = 4.0) {
    const isAllied = faction === 'ALLIED';
    const flameColorHex = isAllied ? 0x00f3ff : 0xff3300;
    const coreColorHex = 0xffffff;

    // Outer plasma shroud cone
    const flameGeo = new THREE.ConeGeometry(baseRadius, baseLength, 12);
    flameGeo.rotateX(Math.PI / 2); // Base at nozzle, apex pointing backward (+Z)

    const flameMat = new THREE.MeshStandardMaterial({
      color: flameColorHex,
      emissive: flameColorHex,
      emissiveIntensity: isAllied ? 4.5 : 5.5,
      transparent: true,
      opacity: 0.92,
      roughness: 0.0,
      metalness: 0.0,
      toneMapped: false,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    // Inner white-hot core cone
    const coreGeo = new THREE.ConeGeometry(baseRadius * 0.45, baseLength * 0.7, 10);
    coreGeo.rotateX(Math.PI / 2);
    const coreMat = new THREE.MeshBasicMaterial({
      color: coreColorHex,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });

    const flames = [];
    const shockDiamonds = [];
    const lights = [];

    nozzlePositions.forEach((pos) => {
      const nozzleGroup = new THREE.Group();
      nozzleGroup.position.set(pos.x, pos.y, pos.z);

      // Outer plasma flame
      const outerFlame = new THREE.Mesh(flameGeo, flameMat);
      outerFlame.position.set(0, 0, baseLength * 0.5);
      nozzleGroup.add(outerFlame);
      flames.push(outerFlame);

      // Inner white-hot core
      const innerCore = new THREE.Mesh(coreGeo, coreMat);
      innerCore.position.set(0, 0, baseLength * 0.35);
      nozzleGroup.add(innerCore);
      flames.push(innerCore);

      // Mach shock diamond rings
      for (let d = 0; d < 3; d++) {
        const ringGeo = new THREE.RingGeometry(baseRadius * 0.15, baseRadius * (0.65 - d * 0.12), 12);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85,
          blending: THREE.AdditiveBlending
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.set(0, 0, baseLength * (0.28 + d * 0.22));
        nozzleGroup.add(ring);
        shockDiamonds.push(ring);
      }

      shipGroup.add(nozzleGroup);
    });

    // Consolidated single point light per ship group to prevent WebGL forward light shader penalty
    if (nozzlePositions.length > 0) {
      let avgX = 0, avgY = 0, avgZ = 0;
      nozzlePositions.forEach((pos) => {
        avgX += pos.x;
        avgY += pos.y;
        avgZ += pos.z;
      });
      avgX /= nozzlePositions.length;
      avgY /= nozzlePositions.length;
      avgZ /= nozzlePositions.length;

      const pLight = new THREE.PointLight(flameColorHex, isAllied ? 3.5 : 5.0, baseLength * 8.0);
      pLight.position.set(avgX, avgY, avgZ + baseLength * 0.35);
      pLight.castShadow = false;
      shipGroup.add(pLight);
      lights.push(pLight);
    }

    const entry = {
      group: shipGroup,
      flames,
      shockDiamonds,
      lights,
      baseLength,
      faction,
      isPlayer: false
    };
    this.engineFXList.push(entry);
    return entry;
  }

  /**
   * Applies dedicated AAA aerospace PBR materials to the Space Station Citadel
   * Features:
   * - Off-white titanium/ceramic thermal tile hull armor with crisp panel lines
   * - Deep cobalt naval accent plating
   * - Cyan-illuminated panoramic habitat viewports and observation decks
   * - Tungsten structural machinery and docking collars
   * - Polarized sapphire viewport glass
   */
  applySpaceStationCitadelMaterials(stationGroup) {
    if (!stationGroup) return;
    const pbr = getPBRMaterialSet('ALLIED_ARMADA');
    const envMap = this.scene.environment;

    // 1. Ceramic Thermal Tile Hull Armor (Crisp clean aerospace off-white)
    const hullMat = new THREE.MeshStandardMaterial({
      map: pbr.map,
      normalMap: pbr.normalMap,
      normalScale: new THREE.Vector2(1.0, 1.0),
      roughnessMap: pbr.roughnessMap,
      color: 0xdde6f0,
      metalness: 0.72,
      roughness: 0.28,
      envMap: envMap,
      envMapIntensity: 1.3
    });

    // 2. Naval Citadel Cobalt Accent Plating
    const accentMat = new THREE.MeshStandardMaterial({
      map: pbr.map,
      normalMap: pbr.normalMap,
      normalScale: new THREE.Vector2(1.1, 1.1),
      roughnessMap: pbr.roughnessMap,
      color: 0x1b3b68,
      metalness: 0.88,
      roughness: 0.24,
      envMap: envMap,
      envMapIntensity: 1.4
    });

    // 3. Balanced Habitation Windows & Habitat Ring Observation Deck
    const habitatWindowMat = new THREE.MeshStandardMaterial({
      color: 0x66ddff,
      emissive: new THREE.Color(0x0099cc),
      emissiveIntensity: 0.85,
      roughness: 0.15,
      metalness: 0.3,
      toneMapped: true
    });

    // 4. Citadel Antenna & Telemetry Panels (Titanium reflector finish, subtle edge glow)
    const antennaPanelMat = new THREE.MeshStandardMaterial({
      color: 0x3a5068,
      metalness: 0.92,
      roughness: 0.22,
      emissive: new THREE.Color(0x001a33),
      emissiveIntensity: 0.25,
      toneMapped: true
    });

    // 5. Heavy Machinery, Girders & Docking Collars
    const machineryMat = new THREE.MeshStandardMaterial({
      normalMap: pbr.normalMap,
      normalScale: new THREE.Vector2(1.2, 1.2),
      color: 0x222a36,
      metalness: 0.94,
      roughness: 0.35,
      envMap: envMap,
      envMapIntensity: 1.2
    });

    // 6. Polarized Viewport Glass & Domes
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x0a1c2e,
      emissive: new THREE.Color(0x003b5c),
      emissiveIntensity: 0.45,
      metalness: 0.98,
      roughness: 0.05,
      toneMapped: true,
      envMap: envMap,
      envMapIntensity: 2.8
    });

    stationGroup.traverse((child) => {
      if (child.isMesh) {
        applyTriplanarUVs(child.geometry, 3.5);

        const childName = (child.name || '').toLowerCase();
        const matName = (child.material && child.material.name ? child.material.name : '').toLowerCase();

        // Check index suffixes from GLTF multi-materials:
        // _1: Accent, _2: Antenna / Emissive, _3: Machinery, _4: Glass
        if (childName.includes('habitat_ring_1') || (childName.includes('ring') && childName.includes('emissive'))) {
          child.material = habitatWindowMat;
        } else if (childName.includes('_2') || childName.includes('emissive') || matName.includes('emissive')) {
          child.material = antennaPanelMat;
        } else if (childName.includes('_4') || childName.includes('glass') || matName.includes('glass') || childName.includes('view') || childName.includes('window')) {
          child.material = glassMat;
        } else if (childName.includes('_3') || childName.includes('machinery') || matName.includes('machinery') || childName.includes('socket') || childName.includes('gun')) {
          child.material = machineryMat;
        } else if (childName.includes('_1') || childName.includes('accent') || matName.includes('accent')) {
          child.material = accentMat;
        } else {
          child.material = hullMat;
        }

        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  /**
   * Builds realistic high-detail solar panel arrays on either side of the Space Station Citadel.
   * Features:
   * - Open triangular titanium lattice truss outrigger booms extending from lateral hardpoints
   * - High-precision Solar Alpha Rotary Joints (SARJ) with gold encoder telemetry rings
   * - Authentic photovoltaic solar blanket wings with high-efficiency silicon wafer microgrid
   * - Space-grade gold multilayer insulation (MLI) Kapton backing
   * - Longitudinal tension cables, micro-meteoroid perimeter frames
   * - Red (port) and Green (starboard) aviation navigation strobes
   * - Dual-barrel point-defense CIWS emplacements on SARJ nodes
   */
  buildSpaceStationSolarArrays(stationGroup) {
    const photoTex = generatePhotovoltaicTexture();
    photoTex.repeat.set(1, 2);

    // Deep space-grade photovoltaic silicon cells with crisp metallic specular sheen
    const solarFrontMat = new THREE.MeshStandardMaterial({
      map: photoTex,
      bumpMap: photoTex,
      bumpScale: 0.04,
      color: 0x071120,
      metalness: 0.94,
      roughness: 0.16,
      emissive: new THREE.Color(0x000814),
      emissiveIntensity: 0.05
    });

    // Space-grade gold kapton multilayer insulation (MLI) thermal foil backing
    const goldKaptonMat = new THREE.MeshStandardMaterial({
      color: 0xe09b00,
      metalness: 0.95,
      roughness: 0.28,
      emissive: new THREE.Color(0x221200),
      emissiveIntensity: 0.1
    });

    // Open structural truss frame material (aerospace titanium alloy)
    const trussMat = new THREE.MeshStandardMaterial({
      color: 0x425468,
      metalness: 0.88,
      roughness: 0.32
    });

    // CIWS and weapon mount material
    const weaponMat = new THREE.MeshStandardMaterial({
      color: 0x1a2430,
      metalness: 0.94,
      roughness: 0.30
    });

    // Gold telemetry and avionics ring material
    const goldAvionicsMat = new THREE.MeshStandardMaterial({
      color: 0xffb81c,
      metalness: 0.96,
      roughness: 0.2
    });

    // Thin, sleek aerodynamic solar wing panel: width 5.8m, ultra-thin 0.06m profile, length 26m
    const panelGeo = new THREE.BoxGeometry(5.8, 0.06, 26);
    const pMaterials = [
      trussMat,       // right (+x)
      trussMat,       // left (-x)
      solarFrontMat,  // top (+y) - photovoltaic active side
      goldKaptonMat,  // bottom (-y) - gold thermal kapton
      trussMat,       // front (+z)
      trussMat        // back (-z)
    ];

    // Station core has lateral radius ~46 at habitat ring and ~56 at beam sockets.
    // We attach outrigger booms from side * 48 extending outward.
    [-1, 1].forEach((side) => {
      const arrayBoomGroup = new THREE.Group();
      arrayBoomGroup.position.set(side * 48, 12, 0);

      // 1. Structural Open Triangular Lattice Truss Outrigger
      const boomLength = 32;
      const trussGroup = new THREE.Group();

      // 3 longitudinal titanium chord tubes forming a triangular prism truss
      const chordRadius = 0.24;
      const prismRadius = 1.6;
      const angles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];

      angles.forEach((ang) => {
        const cy = Math.sin(ang) * prismRadius;
        const cz = Math.cos(ang) * prismRadius;

        const chordGeo = new THREE.CylinderGeometry(chordRadius, chordRadius, boomLength, 8);
        chordGeo.rotateZ(side * Math.PI / 2);
        const chordMesh = new THREE.Mesh(chordGeo, trussMat);
        chordMesh.position.set(side * (boomLength / 2), cy, cz);
        trussGroup.add(chordMesh);
      });

      // Internal cross-battens and diagonal lacing struts along the truss
      const numBays = 5;
      const bayStep = boomLength / numBays;
      for (let b = 1; b <= numBays; b++) {
        const bx = side * (b * bayStep);

        // Triangular diaphragm frame at each bay
        for (let i = 0; i < 3; i++) {
          const a1 = angles[i];
          const a2 = angles[(i + 1) % 3];
          const p1 = new THREE.Vector3(bx, Math.sin(a1) * prismRadius, Math.cos(a1) * prismRadius);
          const p2 = new THREE.Vector3(bx, Math.sin(a2) * prismRadius, Math.cos(a2) * prismRadius);

          const strutDist = p1.distanceTo(p2);
          const strutGeo = new THREE.CylinderGeometry(0.12, 0.12, strutDist, 6);
          strutGeo.rotateZ(Math.PI / 2);
          const strutMesh = new THREE.Mesh(strutGeo, trussMat);
          strutMesh.position.copy(p1).lerp(p2, 0.5);
          strutMesh.lookAt(p2);
          trussGroup.add(strutMesh);
        }

        // Diagonal tension brace along side faces
        const prevBx = side * ((b - 1) * bayStep);
        for (let i = 0; i < 3; i++) {
          const a1 = angles[i];
          const a2 = angles[(i + 1) % 3];
          const pStart = new THREE.Vector3(prevBx, Math.sin(a1) * prismRadius, Math.cos(a1) * prismRadius);
          const pEnd = new THREE.Vector3(bx, Math.sin(a2) * prismRadius, Math.cos(a2) * prismRadius);

          const diagDist = pStart.distanceTo(pEnd);
          const diagGeo = new THREE.CylinderGeometry(0.08, 0.08, diagDist, 4);
          diagGeo.rotateZ(Math.PI / 2);
          const diagMesh = new THREE.Mesh(diagGeo, trussMat);
          diagMesh.position.copy(pStart).lerp(pEnd, 0.5);
          diagMesh.lookAt(pEnd);
          trussGroup.add(diagMesh);
        }
      }
      arrayBoomGroup.add(trussGroup);

      // 2. Solar Alpha Rotary Joint (SARJ) - Gimbals & Telemetry Collar
      const sarjX = side * (boomLength + 2);
      const sarjHousingGeo = new THREE.CylinderGeometry(2.4, 2.4, 3.2, 16);
      sarjHousingGeo.rotateZ(Math.PI / 2);
      const sarjMesh = new THREE.Mesh(sarjHousingGeo, trussMat);
      sarjMesh.position.set(sarjX, 0, 0);
      arrayBoomGroup.add(sarjMesh);

      // Gold encoder telemetry collar ring
      const goldRingGeo = new THREE.TorusGeometry(2.55, 0.16, 8, 24);
      goldRingGeo.rotateY(Math.PI / 2);
      const goldRingMesh = new THREE.Mesh(goldRingGeo, goldAvionicsMat);
      goldRingMesh.position.set(sarjX, 0, 0);
      arrayBoomGroup.add(goldRingMesh);

      // 3. Rotating Solar Wing Assembly (gimballed for star-tracking)
      const rotatingWingGroup = new THREE.Group();
      rotatingWingGroup.position.set(side * (boomLength + 4), 0, 0);

      // Dual Fore & Aft Photovoltaic Wings (2 wings per side, authentic ISS/Citadel layout)
      const wingConfigs = [
        { x: side * 4.5, z: -16, pitch: 0.10 },
        { x: side * 12.0, z: -16, pitch: 0.10 },
        { x: side * 4.5, z: 16, pitch: 0.10 },
        { x: side * 12.0, z: 16, pitch: 0.10 }
      ];

      wingConfigs.forEach((cfg) => {
        const wingMesh = new THREE.Mesh(panelGeo, pMaterials);
        wingMesh.position.set(cfg.x, 0, cfg.z);
        wingMesh.rotation.x = cfg.pitch;
        rotatingWingGroup.add(wingMesh);

        // Center deployment mast / spine guide wire
        const spineGeo = new THREE.BoxGeometry(0.35, 0.45, 27);
        const spineMesh = new THREE.Mesh(spineGeo, trussMat);
        spineMesh.position.set(cfg.x, 0, cfg.z);
        spineMesh.rotation.x = cfg.pitch;
        rotatingWingGroup.add(spineMesh);

        // Fine cross-tension spreader bars at 1/3 and 2/3 length
        [-7, 7].forEach((sz) => {
          const spreaderGeo = new THREE.BoxGeometry(5.6, 0.12, 0.2);
          const spreaderMesh = new THREE.Mesh(spreaderGeo, trussMat);
          spreaderMesh.position.set(cfg.x, 0, cfg.z + sz);
          spreaderMesh.rotation.x = cfg.pitch;
          rotatingWingGroup.add(spreaderMesh);
        });
      });

      // 4. Wing Tip Navigation Beacon (Port = Red, Starboard = Green)
      const strobeColor = side === -1 ? 0xff1828 : 0x00ff66;
      const tipX = side * 18;
      const strobeLight = new THREE.PointLight(strobeColor, 2.5, 35.0);
      strobeLight.position.set(tipX, 0, 0);
      rotatingWingGroup.add(strobeLight);

      const beaconGeo = new THREE.SphereGeometry(0.65, 8, 8);
      const beaconMat = new THREE.MeshBasicMaterial({
        color: strobeColor,
        toneMapped: false
      });
      const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
      beaconMesh.position.set(tipX, 0, 0);
      rotatingWingGroup.add(beaconMesh);

      // 5. CIWS Point-Defense Turret on SARJ node
      const turretBaseGeo = new THREE.CylinderGeometry(1.4, 1.8, 1.0, 8);
      const turretBase = new THREE.Mesh(turretBaseGeo, weaponMat);
      turretBase.position.set(sarjX, 1.8, 0);
      arrayBoomGroup.add(turretBase);

      const barrelGeo = new THREE.CylinderGeometry(0.15, 0.15, 3.2, 6);
      barrelGeo.rotateX(Math.PI / 2);
      const barrelLeft = new THREE.Mesh(barrelGeo, weaponMat);
      barrelLeft.position.set(sarjX - 0.5, 2.3, -1.4);
      arrayBoomGroup.add(barrelLeft);
      const barrelRight = new THREE.Mesh(barrelGeo, weaponMat);
      barrelRight.position.set(sarjX + 0.5, 2.3, -1.4);
      arrayBoomGroup.add(barrelRight);

      arrayBoomGroup.add(rotatingWingGroup);
      stationGroup.add(arrayBoomGroup);

      this.stationSolarArrays.push({
        group: rotatingWingGroup,
        side,
        strobe: strobeLight,
        beacon: beaconMesh,
        ciwsMuzzles: [barrelLeft, barrelRight]
      });
    });
  }

  buildAlliedArmada() {
    // 0. Dedicated Cinematic Key, Rim, and Planet Segma Fill Lights
    const keyLight = new THREE.DirectionalLight(0xfffaf0, 3.4);
    keyLight.position.set(80, 55, 45);
    this.cinematicGroup.add(keyLight);

    const planetRim = new THREE.DirectionalLight(0x00aaff, 2.6);
    planetRim.position.set(-65, 25, -120);
    this.cinematicGroup.add(planetRim);

    const hostileWarmRim = new THREE.DirectionalLight(0xff2200, 1.8);
    hostileWarmRim.position.set(50, -20, -150);
    this.cinematicGroup.add(hostileWarmRim);

    const ambLight = new THREE.AmbientLight(0x0e1828, 1.4);
    this.cinematicGroup.add(ambLight);

    // 1. Space Station Citadel (Defending Planet Segma)
    // NOTE: The Space Station is ALREADY stationed in orbit around Planet Segma (not warping in!)
    const stationMesh = assetManager.getFleetShipMesh('Vessel_Station_01');

    if (stationMesh) {
      this.alliedStation = new THREE.Group();
      stationMesh.position.set(0, 0, 0);
      stationMesh.rotation.set(0, 0, 0);
      this.alliedStation.add(stationMesh);

      // Locate internal habitat ring (which is part of Vessel_Station_01 hierarchy)
      const internalRing = stationMesh.getObjectByName('Station_Habitat_Ring');
      if (internalRing) {
        this.stationRing = internalRing;
      }

      // Station placed in high orbit overlooking Planet Segma
      this.alliedStationBaseY = 24;
      this.alliedStation.position.set(115, this.alliedStationBaseY, -200);
      this.alliedStation.rotation.set(0.12, -0.42, 0.06);
      this.alliedStation.scale.set(0.72, 0.72, 0.72);
      this.alliedStation.visible = true;

      // Apply dedicated AAA ceramic thermal & illuminated viewport materials
      this.applySpaceStationCitadelMaterials(this.alliedStation);

      // Install realistic open-truss aerospace solar arrays
      this.buildSpaceStationSolarArrays(this.alliedStation);

      this.cinematicGroup.add(this.alliedStation);
    }

    // 2. Allied Escort Frigate (Warps in via Hyperspace portal)
    const escortMesh = assetManager.getFleetShipMesh('Vessel_Frigate_01');
    if (escortMesh) {
      this.alliedEscort = escortMesh;
      this.alliedEscort.position.set(32, 4, -40);
      this.alliedEscort.rotation.y = 0;
      this.alliedEscort.scale.set(0.001, 0.001, 0.001);
      this.alliedEscort.visible = false;
      this.applyAAAFactionMaterials(this.alliedEscort, 'ALLIED', 3.0);

      // Attach dual afterburners to escort frigate
      this.attachEngineThrusters(
        this.alliedEscort,
        [{ x: -3.2, y: 0, z: 24.0 }, { x: 3.2, y: 0, z: 24.0 }],
        'ALLIED',
        1.2,
        5.5
      );
      this.cinematicGroup.add(this.alliedEscort);

      // Escort warp portal
      const portalFrigate = this.createWarpPortal(new THREE.Vector3(32, 4, -40), 0x00f3ff);
      portalFrigate.visible = true;
      portalFrigate.scale.set(1, 1, 1);
      this.alliedPortals.push({
        portal: portalFrigate,
        ship: this.alliedEscort,
        targetScale: 0.85,
        startPos: new THREE.Vector3(32, 4, -80),
        targetPos: new THREE.Vector3(32, 4, -40)
      });
    }

    // 3. Allied Heavy Destroyer Aegis (Warps in via Hyperspace portal)
    const destroyerMesh = assetManager.getFleetShipMesh('Vessel_Destroyer_01');
    if (destroyerMesh) {
      this.alliedDestroyer = destroyerMesh;
      this.alliedDestroyer.position.set(-32, 4, -40);
      this.alliedDestroyer.rotation.y = 0;
      this.alliedDestroyer.scale.set(0.001, 0.001, 0.001);
      this.alliedDestroyer.visible = false;
      this.applyAAAFactionMaterials(this.alliedDestroyer, 'ALLIED', 4.0);

      // Attach heavy twin direct-fire propulsion afterburners
      this.attachEngineThrusters(
        this.alliedDestroyer,
        [{ x: -6.0, y: 0, z: 42.0 }, { x: 6.0, y: 0, z: 42.0 }],
        'ALLIED',
        2.0,
        9.0
      );
      this.cinematicGroup.add(this.alliedDestroyer);

      // Destroyer warp portal
      const portalDestroyer = this.createWarpPortal(new THREE.Vector3(-32, 4, -40), 0x00f3ff);
      portalDestroyer.visible = true;
      portalDestroyer.scale.set(1.2, 1.2, 1.2);
      this.alliedPortals.push({
        portal: portalDestroyer,
        ship: this.alliedDestroyer,
        targetScale: 0.65,
        startPos: new THREE.Vector3(-32, 4, -80),
        targetPos: new THREE.Vector3(-32, 4, -40)
      });
    }
  }

  mountPlayerVessel(vesselType) {
    if (this.mountedVesselType === vesselType && this.playerMesh) {
      this.playerPos.set(0, 4, -20);
      this.playerMesh.position.set(0, 4, -60);
      this.playerMesh.scale.set(0.001, 0.001, 0.001);
      this.playerMesh.visible = false;
      this.playerRot.set(0, 0, 0);
      this.playerMesh.rotation.set(0, 0, 0);
      if (this.portalPlayer) {
        this.portalPlayer.visible = true;
        this.portalPlayer.scale.set(0.9, 0.9, 0.9);
      }
      return;
    }

    if (this.playerMesh) {
      this.cinematicGroup.remove(this.playerMesh);
      this.playerMesh = null;
    }

    // Remove previous player portal if any
    if (this.portalPlayer) {
      this.cinematicGroup.remove(this.portalPlayer);
      this.alliedPortals = this.alliedPortals.filter((p) => p.portal !== this.portalPlayer);
      this.portalPlayer = null;
    }

    // Remove any previous player engine FX from list
    this.engineFXList = this.engineFXList.filter((e) => !e.isPlayer);

    if (vesselType === 'FRIGATE') {
      const mesh = assetManager.getFleetShipMesh('Vessel_Frigate_01');
      if (mesh) {
        this.playerMesh = mesh;
        this.playerBaseScale = 0.85;
        this.playerMesh.scale.set(0.001, 0.001, 0.001);
        this.applyAAAFactionMaterials(this.playerMesh, 'ALLIED', 3.0);

        const pFX = this.attachEngineThrusters(
          this.playerMesh,
          [{ x: -3.2, y: 0, z: 24.0 }, { x: 3.2, y: 0, z: 24.0 }],
          'ALLIED',
          1.3,
          6.0
        );
        pFX.isPlayer = true;
      }
    } else if (vesselType === 'DESTROYER') {
      const mesh = assetManager.getFleetShipMesh('Vessel_Destroyer_01');
      if (mesh) {
        this.playerMesh = mesh;
        this.playerBaseScale = 0.65;
        this.playerMesh.scale.set(0.001, 0.001, 0.001);
        this.applyAAAFactionMaterials(this.playerMesh, 'ALLIED', 4.0);

        const pFX = this.attachEngineThrusters(
          this.playerMesh,
          [{ x: -6.0, y: 0, z: 42.0 }, { x: 6.0, y: 0, z: 42.0 }],
          'ALLIED',
          2.0,
          9.0
        );
        pFX.isPlayer = true;
      }
    }

    // Default fighter / interceptor
    if (!this.playerMesh) {
      const shipClassKey = ['INTERCEPTOR', 'STRIKE_FIGHTER', 'HEAVY_ASSAULT', 'STEALTH_RECON'].includes(vesselType)
        ? vesselType
        : 'INTERCEPTOR';

      this.playerMesh = assetManager.createProceduralShipModel(shipClassKey);
      this.playerBaseScale = 2.0;
      this.playerMesh.scale.set(0.001, 0.001, 0.001);
      this.applyAAAFactionMaterials(this.playerMesh, 'ALLIED', 2.0);

      const pFX = this.attachEngineThrusters(
        this.playerMesh,
        [{ x: -0.6, y: -0.06, z: 2.1 }, { x: 0.6, y: -0.06, z: 2.1 }],
        'ALLIED',
        0.35,
        2.2
      );
      pFX.isPlayer = true;
    }

    this.playerPos.set(0, 4, -20);
    this.playerMesh.position.set(0, 4, -60);
    this.playerMesh.visible = false;
    this.cinematicGroup.add(this.playerMesh);

    // Player Flagship warp portal
    const portalPlayer = this.createWarpPortal(new THREE.Vector3(0, 4, -20), 0x00f3ff);
    portalPlayer.visible = true;
    portalPlayer.scale.set(0.9, 0.9, 0.9);
    this.portalPlayer = portalPlayer;
    this.alliedPortals.push({
      portal: portalPlayer,
      ship: this.playerMesh,
      targetScale: this.playerBaseScale,
      startPos: new THREE.Vector3(0, 4, -60),
      targetPos: new THREE.Vector3(0, 4, -20)
    });

    this.mountedVesselType = vesselType;

    if (this.shipLabel) {
      this.shipLabel.textContent = `VESSEL: ${vesselType}`;
    }
  }

  registerTacticalFleet() {
    this.tacticalShips = {
      'PLAYER': {
        key: 'PLAYER',
        mesh: this.playerMesh,
        targetPos: new THREE.Vector3(0, 4, -20),
        label: 'FLAGSHIP (YOU)',
        baseScale: this.playerBaseScale
      },
      'FRIGATE': {
        key: 'FRIGATE',
        mesh: this.alliedEscort,
        targetPos: new THREE.Vector3(32, 4, -40),
        label: 'ESCORT FRIGATE',
        baseScale: 0.85
      },
      'DESTROYER': {
        key: 'DESTROYER',
        mesh: this.alliedDestroyer,
        targetPos: new THREE.Vector3(-32, 4, -40),
        label: 'DESTROYER AEGIS',
        baseScale: 0.65
      }
    };

    this.createSelectionRings();
  }

  createSelectionRings() {
    // Remove existing selection rings
    Object.values(this.selectionRings).forEach(ring => {
      if (ring && ring.parent) ring.parent.remove(ring);
    });
    this.selectionRings = {};

    Object.keys(this.tacticalShips).forEach(key => {
      const shipData = this.tacticalShips[key];
      if (!shipData || !shipData.mesh) return;

      const group = new THREE.Group();

      // Outer glowing ring
      const ringGeo = new THREE.RingGeometry(8, 8.8, 36);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: key === this.selectedShipKey ? 0x00f3ff : 0x0077aa,
        transparent: true,
        opacity: key === this.selectedShipKey ? 0.9 : 0.45,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      group.add(ring);

      // Inner dashed target reticle
      const innerGeo = new THREE.RingGeometry(5.2, 5.8, 16);
      innerGeo.rotateX(-Math.PI / 2);
      const innerMat = new THREE.MeshBasicMaterial({
        color: 0x00f3ff,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      });
      const inner = new THREE.Mesh(innerGeo, innerMat);
      group.add(inner);

      // Vertical holographic beacon cylinder
      const beaconGeo = new THREE.CylinderGeometry(0.2, 0.2, 12, 8);
      const beaconMat = new THREE.MeshBasicMaterial({
        color: 0x00f3ff,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending
      });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.y = 6;
      group.add(beacon);

      group.position.copy(shipData.targetPos);
      group.position.y = 0.5; // On defense plane
      group.visible = false;
      this.cinematicGroup.add(group);

      this.selectionRings[key] = group;
    });
  }

  enterTacticalPlacementMode() {
    this.isTacticalMode = false;
    if (this.tacticalDock) {
      this.tacticalDock.classList.add('hidden');
    }

    // Hide selection rings - zero manual placement
    Object.values(this.selectionRings).forEach(ring => {
      if (ring) ring.visible = false;
    });

    // Automatically establish Aegis fleet defense formation
    this.applyFormationPreset('AEGIS');

    if (this.flightHint) {
      this.flightHint.innerHTML = 'ARMADA IN FORMATION // AEGIS DEFENSIVE POSTURE ASSUMED';
    }

    if (this.statusTag) {
      this.statusTag.textContent = 'SECTOR SEGMA // ALLIED ARMADA DEPLOYED';
    }

    if (this.spaceAudio && this.spaceAudio.playTacticalNotification) {
      this.spaceAudio.playTacticalNotification();
    }
  }

  applyFormationPreset(formationKey) {
    this.currentFormation = formationKey;

    // Update preset UI button states
    ['aegis', 'citadel', 'screen'].forEach(k => {
      const btn = document.getElementById(`btn-formation-${k}`);
      if (btn) {
        if (k === formationKey.toLowerCase()) btn.classList.add('active');
        else btn.classList.remove('active');
      }
    });

    if (formationKey === 'AEGIS') {
      // Classic V-Wedge Escort Defense
      if (this.tacticalShips['PLAYER']) this.tacticalShips['PLAYER'].targetPos.set(0, 4, -20);
      if (this.tacticalShips['FRIGATE']) this.tacticalShips['FRIGATE'].targetPos.set(34, 4, -45);
      if (this.tacticalShips['DESTROYER']) this.tacticalShips['DESTROYER'].targetPos.set(-34, 4, -45);
    } else if (formationKey === 'CITADEL') {
      // Defensive perimeter encircling Space Station Citadel at (-60, 26, -180)
      if (this.tacticalShips['PLAYER']) this.tacticalShips['PLAYER'].targetPos.set(-40, 16, -135);
      if (this.tacticalShips['FRIGATE']) this.tacticalShips['FRIGATE'].targetPos.set(-20, 10, -150);
      if (this.tacticalShips['DESTROYER']) this.tacticalShips['DESTROYER'].targetPos.set(-80, 12, -145);
    } else if (formationKey === 'SCREEN') {
      // Broad lateral flank barrier across the planetary approach
      if (this.tacticalShips['PLAYER']) this.tacticalShips['PLAYER'].targetPos.set(0, 4, -30);
      if (this.tacticalShips['FRIGATE']) this.tacticalShips['FRIGATE'].targetPos.set(50, 4, -30);
      if (this.tacticalShips['DESTROYER']) this.tacticalShips['DESTROYER'].targetPos.set(-50, 4, -30);
    }

    // Play feedback chime
    if (this.spaceAudio && this.spaceAudio.playTacticalNotification) {
      this.spaceAudio.playTacticalNotification();
    }
  }

  selectTacticalShip(shipKey) {
    this.selectedShipKey = shipKey;

    // Update tactical ship selector buttons
    ['player', 'frigate', 'destroyer'].forEach(k => {
      const btn = document.getElementById(`btn-select-ship-${k}`);
      if (btn) {
        if (k === shipKey.toLowerCase()) btn.classList.add('active');
        else btn.classList.remove('active');
      }
    });

    // Update 3D selection rings highlights
    Object.keys(this.selectionRings).forEach(k => {
      const ringGroup = this.selectionRings[k];
      if (!ringGroup) return;
      const isSelected = k === this.selectedShipKey;
      ringGroup.traverse(child => {
        if (child.isMesh && child.material) {
          child.material.color.setHex(isSelected ? 0x00f3ff : 0x0077aa);
          child.material.opacity = isSelected ? 0.95 : 0.45;
        }
      });
    });
  }

  confirmDefensivePositions() {
    if (!this.isActive) return;

    // If tactical dock is active, hide dock and selection rings
    if (this.tacticalDock && !this.tacticalDock.classList.contains('hidden')) {
      this.tacticalDock.classList.add('hidden');
    }
    Object.values(this.selectionRings).forEach(ring => {
      if (ring) ring.visible = false;
    });

    const t = this.elapsedTime;
    if (t < 5.0) {
      // Advance to Act II: Hostile Incursion
      this.elapsedTime = 4.9;
    } else if (t < 9.0) {
      // Advance to Act III: Battle Erupts
      this.elapsedTime = 8.9;
    } else if (t < 15.8) {
      // Advance to Act IV: Stealth Escape
      this.elapsedTime = 15.7;
    } else {
      // End cinematic immediately and transition to Wave 1
      this.endCinematic();
    }
  }

  updatePointerCoords(e) {
    const rect = this.gameManager.spaceScene.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  onPointerDown(e) {
    if (!this.isActive || !this.isTacticalMode) return;
    // Don't drag if clicking UI elements
    if (e.target.closest('#segma-tactical-dock') || e.target.closest('.segma-telemetry-right')) return;

    this.updatePointerCoords(e);
    this.raycaster.setFromCamera(this.pointer, this.camera);

    // Check if clicked directly on any tactical ship
    const testObjects = [];
    Object.keys(this.tacticalShips).forEach(k => {
      const s = this.tacticalShips[k];
      if (s && s.mesh && s.mesh.visible) {
        testObjects.push({ key: k, obj: s.mesh });
      }
    });

    const meshes = testObjects.map(t => t.obj);
    const intersects = this.raycaster.intersectObjects(meshes, true);

    if (intersects.length > 0) {
      let hitMesh = intersects[0].object;
      let matchedKey = null;
      testObjects.forEach(t => {
        t.obj.traverse(child => {
          if (child === hitMesh) matchedKey = t.key;
        });
      });

      if (matchedKey) {
        this.selectTacticalShip(matchedKey);
        this.isDraggingShip = true;
        return;
      }
    }

    // Check intersection with defense horizontal plane
    const planeHit = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.defensePlane, planeHit)) {
      // Find closest tactical ship within 22 units
      let closestKey = null;
      let minDist = 22;
      Object.keys(this.tacticalShips).forEach(k => {
        const s = this.tacticalShips[k];
        if (s) {
          const d = s.targetPos.distanceTo(planeHit);
          if (d < minDist) {
            minDist = d;
            closestKey = k;
          }
        }
      });

      if (closestKey) {
        this.selectTacticalShip(closestKey);
        this.isDraggingShip = true;
        return;
      }
    }

    // Otherwise, start camera orbit drag (click & drag anywhere to look around and change camera angle)
    this.isOrbitDragging = true;
    this.orbitPointerStart.x = e.clientX;
    this.orbitPointerStart.y = e.clientY;
    this.orbitStartAngles.x = this.cameraOrbitAngleX;
    this.orbitStartAngles.y = this.cameraOrbitAngleY;
  }

  onPointerMove(e) {
    if (!this.isActive) return;

    if (this.isDraggingShip && this.isTacticalMode) {
      this.updatePointerCoords(e);
      this.raycaster.setFromCamera(this.pointer, this.camera);

      const hitPoint = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(this.defensePlane, hitPoint)) {
        const selected = this.tacticalShips[this.selectedShipKey];
        if (selected) {
          // Clamp to orbital operational boundaries
          selected.targetPos.x = THREE.MathUtils.clamp(hitPoint.x, -70, 70);
          selected.targetPos.z = THREE.MathUtils.clamp(hitPoint.z, -150, 10);
        }
      }
    } else if (this.isOrbitDragging) {
      // Dynamic camera angle rotation
      const deltaX = (e.clientX - this.orbitPointerStart.x) * 0.005;
      const deltaY = (e.clientY - this.orbitPointerStart.y) * 0.004;

      this.cameraOrbitAngleX = this.orbitStartAngles.x - deltaX;
      // Clamp pitch elevation
      this.cameraOrbitAngleY = THREE.MathUtils.clamp(this.orbitStartAngles.y + deltaY, -0.6, 0.85);
    }
  }

  onPointerUp() {
    this.isDraggingShip = false;
    this.isOrbitDragging = false;
  }

  prepareEnemyInvasionFleet() {
    // 1. Hostile Invasion Flagship (Center-Rear Open Sector)
    const carrierMesh = assetManager.getFleetShipMesh('Vessel_Carrier_01');
    if (carrierMesh) {
      this.enemyCarrier = carrierMesh;
      this.enemyCarrier.position.set(0, 12, -155);
      this.enemyCarrier.scale.set(0.001, 0.001, 0.001);
      this.enemyCarrier.visible = false;
      this.applyAAAFactionMaterials(this.enemyCarrier, 'HOSTILE', 4.5);

      this.attachEngineThrusters(
        this.enemyCarrier,
        [
          { x: -19.0, y: 0, z: 54.0 },
          { x: -15.0, y: 0, z: 54.0 },
          { x: 15.0, y: 0, z: 54.0 },
          { x: 19.0, y: 0, z: 54.0 }
        ],
        'HOSTILE',
        2.4,
        12.0
      );
      this.cinematicGroup.add(this.enemyCarrier);
    }

    // 2. Hostile Heavy Battleship (Open Port Flank)
    const bshipMesh = assetManager.getFleetShipMesh('Vessel_Destroyer_01');
    if (bshipMesh) {
      this.enemyBattleship = bshipMesh;
      this.enemyBattleship.position.set(-28, 6, -145);
      this.enemyBattleship.scale.set(0.001, 0.001, 0.001);
      this.enemyBattleship.visible = false;
      this.applyAAAFactionMaterials(this.enemyBattleship, 'HOSTILE', 4.0);

      this.attachEngineThrusters(
        this.enemyBattleship,
        [{ x: -6.0, y: 0, z: 42.0 }, { x: 6.0, y: 0, z: 42.0 }],
        'HOSTILE',
        2.2,
        10.0
      );
      this.cinematicGroup.add(this.enemyBattleship);
    }

    // 3. Authentic In-Game Wave 1 Crimson Drones (EnemyDrone)
    // Deployed across the open center corridor in an aggressive arrowhead wedge
    const droneOffsets = [
      { x: 0, y: 4, z: -105 },
      { x: -14, y: 6, z: -118 },
      { x: 14, y: 6, z: -118 },
      { x: -26, y: 8, z: -130 },
      { x: 26, y: 8, z: -130 },
      { x: 0, y: 10, z: -125 }
    ];
    this.waveEnemyDrones = [];
    droneOffsets.forEach((off, idx) => {
      const drone = new EnemyDrone(this.scene, { x: off.x, y: off.y, z: off.z });
      this.scene.remove(drone.meshGroup);
      drone.meshGroup.position.set(off.x, off.y, off.z);
      drone.meshGroup.rotation.y = Math.PI; // Face forward towards player
      drone.meshGroup.scale.set(0.001, 0.001, 0.001);
      drone.meshGroup.visible = false;
      this.cinematicGroup.add(drone.meshGroup);
      this.waveEnemyDrones.push({
        droneObj: drone,
        mesh: drone.meshGroup,
        basePos: new THREE.Vector3(off.x, off.y, off.z),
        isDestroyed: false,
        speed: 28.0 + idx * 2.5
      });
    });

    // 4. Authentic In-Game Stealth Fighters (StealthFighter)
    const stealthOffsets = [
      { x: -34, y: 8, z: -122 },
      { x: 34, y: 8, z: -122 }
    ];
    this.waveStealthFighters = [];
    stealthOffsets.forEach((off, idx) => {
      const sf = new StealthFighter(this.scene, this.particleManager, off);
      this.scene.remove(sf.meshGroup);
      sf.meshGroup.position.set(off.x, off.y, off.z);
      sf.meshGroup.rotation.y = Math.PI;
      sf.meshGroup.scale.set(0.001, 0.001, 0.001);
      sf.meshGroup.visible = false;
      this.cinematicGroup.add(sf.meshGroup);
      this.waveStealthFighters.push({
        stealthObj: sf,
        mesh: sf.meshGroup,
        basePos: new THREE.Vector3(off.x, off.y, off.z),
        isDestroyed: false,
        index: idx
      });
    });

    // 5. Authentic In-Game ECM Jammer Corvette (ECMJammerCorvette)
    const ecm = new ECMJammerCorvette(this.scene, this.particleManager, { x: 18, y: 2, z: -130 });
    this.scene.remove(ecm.meshGroup);
    ecm.meshGroup.position.set(18, 2, -130);
    ecm.meshGroup.rotation.y = Math.PI;
    ecm.meshGroup.scale.set(0.001, 0.001, 0.001);
    ecm.meshGroup.visible = false;
    this.cinematicGroup.add(ecm.meshGroup);
    this.waveEcmCorvette = {
      ecmObj: ecm,
      mesh: ecm.meshGroup,
      isDestroyed: false
    };

    // 6. Hyperspace Rupture Portals in the open center screen
    this.warpPortalCarrier = this.createWarpPortal(new THREE.Vector3(0, 12, -155), 0xff1133);
    this.warpPortalBattleship = this.createWarpPortal(new THREE.Vector3(-28, 6, -145), 0xff1133);
    this.warpPortalEscort = this.createWarpPortal(new THREE.Vector3(20, 4, -135), 0xff1133);

    // 7. Pre-instantiate escaping stealth fighter so t=16s never creates objects during combat
    if (!this.escapingStealthFighter) {
      const sf = new StealthFighter(this.scene, this.particleManager, this._stealthP0);
      this.scene.remove(sf.meshGroup);
      sf.meshGroup.position.copy(this._stealthP0);
      sf.meshGroup.scale.set(0.001, 0.001, 0.001);
      sf.meshGroup.visible = false;
      this.escapingStealthFighter = sf.meshGroup;
      this.escapingStealthFighterObj = sf;
      this.cinematicGroup.add(this.escapingStealthFighter);
    }
  }

  createWarpPortal(pos, colorHex) {
    const group = new THREE.Group();
    group.position.copy(pos);

    // Inner gravitational singularity sphere (dark event horizon)
    const coreGeo = new THREE.SphereGeometry(3.2, 20, 20);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x02050e, side: THREE.DoubleSide });
    group.add(new THREE.Mesh(coreGeo, coreMat));

    // Sleek concentric relativistic Cherenkov accretion shockwave rings
    const ringRadii = [6.5, 10.5];
    ringRadii.forEach((r, idx) => {
      const ringGeo = new THREE.TorusGeometry(r, 0.18 - idx * 0.04, 12, 48);
      const ringMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.85 - idx * 0.2,
        blending: THREE.AdditiveBlending
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      // Planar vortex facing forward along flight vector
      ring.rotation.z = idx * 0.4;
      group.add(ring);
    });

    // Subtle planar accretion swirl disk
    const diskGeo = new THREE.RingGeometry(2.0, 11.2, 32);
    const diskMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    const disk = new THREE.Mesh(diskGeo, diskMat);
    group.add(disk);

    // Controlled portal illumination light (localized, doesn't wash out the planet)
    const portalLight = new THREE.PointLight(colorHex, 2.5, 45);
    group.add(portalLight);

    group.scale.set(0.001, 0.001, 0.001);
    group.visible = false;
    this.cinematicGroup.add(group);
    return group;
  }

  cycleCameraMode() {
    this.cameraModeIndex = (this.cameraModeIndex + 1) % this.cameraModes.length;
    this.cameraMode = this.cameraModes[this.cameraModeIndex];
    if (this.camLabel) {
      this.camLabel.textContent = `CAM: ${this.cameraMode}`;
    }
    const btnOverview = document.getElementById('btn-segma-overview');
    if (btnOverview) {
      if (this.cameraMode === 'PANORAMA') btnOverview.classList.add('active-overview');
      else btnOverview.classList.remove('active-overview');
    }
  }

  /**
   * Adjusts camera zoom factor smoothly between 0.4 (close-up) and 3.0 (ultra-wide tactical view)
   * delta > 0 zooms out (larger distance / wider view), delta < 0 zooms in
   */
  adjustCameraZoom(delta) {
    this.cameraZoomFactor = THREE.MathUtils.clamp(this.cameraZoomFactor + delta, 0.4, 3.0);
    this.updateZoomDisplay();
  }

  /**
   * Toggles the panoramic "OVERVIEW (ALL ASSETS)" camera mode
   * Instantly frames the player craft, Space Station, solar arrays, Destroyer, Frigate,
   * hostile dreadnoughts, and Planet Segma all within a single cinematic viewport.
   */
  toggleOverviewCamera() {
    const btn = document.getElementById('btn-segma-overview');
    if (this.cameraMode === 'PANORAMA') {
      this.cameraMode = 'DIRECTOR';
      this.cameraModeIndex = this.cameraModes.indexOf('DIRECTOR');
      this.cameraZoomFactor = 1.0;
      if (btn) btn.classList.remove('active-overview');
    } else {
      this.cameraMode = 'PANORAMA';
      this.cameraModeIndex = this.cameraModes.indexOf('PANORAMA');
      this.cameraZoomFactor = 1.0;
      if (btn) btn.classList.add('active-overview');
    }

    if (this.camLabel) {
      this.camLabel.textContent = `CAM: ${this.cameraMode}`;
    }
    this.updateZoomDisplay();
  }

  /**
   * Toggles pausing the cinematic timeline
   * When paused, time freezes while all camera controls (zoom, orbit angles, pan)
   * remain completely interactive so the player can view and inspect all game assets.
   */
  togglePause() {
    this.isPaused = !this.isPaused;
    const label = document.getElementById('segma-pause-label');
    if (label) {
      label.textContent = this.isPaused ? 'RESUME (P)' : 'PAUSE (P)';
    }
    const btn = document.getElementById('btn-segma-pause');
    if (btn) {
      if (this.isPaused) btn.classList.add('active');
      else btn.classList.remove('active');
    }
    if (this.statusTag) {
      if (this.isPaused) {
        this._prePauseStatus = this.statusTag.textContent;
        this.statusTag.textContent = 'TIMELINE PAUSED // FREE CAMERA & ZOOM ACTIVE';
        this.statusTag.style.color = '#ffaa00';
      } else if (this._prePauseStatus) {
        this.statusTag.textContent = this._prePauseStatus;
        this.statusTag.style.color = '#00f3ff';
      }
    }
  }

  /**
   * Resets manual orbit angle offsets and zoom back to default
   */
  resetCameraAngleAndZoom() {
    this.cameraZoomFactor = 1.0;
    this.cameraOrbitAngleX = 0;
    this.cameraOrbitAngleY = 0;
    this.updateZoomDisplay();
  }

  updateZoomDisplay() {
    if (this.zoomLevelLabel) {
      this.zoomLevelLabel.textContent = `${Math.round(this.cameraZoomFactor * 100)}%`;
    }
  }

  cycleVesselControl() {
    this.currentVesselIndex = (this.currentVesselIndex + 1) % this.playerVesselOptions.length;
    const vessel = this.playerVesselOptions[this.currentVesselIndex];
    this.mountPlayerVessel(vessel);
  }

  update(dt) {
    if (!this.isActive) return;

    // When paused, freeze timeline advance while keeping camera controls & ambient visual rotations active
    if (this.isPaused) {
      if (this.stationRing) {
        this.stationRing.rotation.y += dt * 0.09;
      }
      if (this.alliedStation) {
        this.alliedStation.rotation.y += dt * 0.008;
      }
      this.updateCamera(dt);
      return;
    }

    this.elapsedTime += dt;

    // 1. Rotate Station Centrifugal Habitat Ring smoothly on true axial symmetry axis (Y)
    if (this.stationRing) {
      this.stationRing.rotation.y += dt * 0.09;
    }

    // 2. Natural Space Station Orbital Drift & Antigravity Float
    if (this.alliedStation) {
      this.alliedStation.rotation.y += dt * 0.008;
      const baseY = this.alliedStationBaseY || 38;
      this.alliedStation.position.y = baseY + Math.sin(this.elapsedTime * 0.3) * 1.5;
    }

    // 3. Update Allied Armada Warp-In Arrival (0s - 4.5s)
    if (!this.alliedWarpCompleted) {
      this.updateAlliedWarpEmergence(dt);
    } else {
      // Allied ships smoothly lerp to assigned tactical target positions
      Object.keys(this.tacticalShips).forEach(key => {
        const s = this.tacticalShips[key];
        if (s && s.mesh) {
          s.mesh.position.lerp(s.targetPos, dt * 4.0);
        }
      });
    }

    // 4. Update Selection Rings on Defense Plane
    if (this.isTacticalMode) {
      Object.keys(this.selectionRings).forEach(key => {
        const ring = this.selectionRings[key];
        const ship = this.tacticalShips[key];
        if (ring && ship && ship.mesh) {
          ring.position.x = ship.mesh.position.x;
          ring.position.z = ship.mesh.position.z;
          ring.rotation.y += dt * 0.6;
        }
      });
    }

    // 5. Update Player Ship Flight & Controls (if not actively dragging in tactical mode)
    if (!this.isDraggingShip) {
      this.updatePlayerFlight(dt);
    }

    // 6. Timeline Event Handling (Phase transitions & triggers)
    this.handleTimelineEvents(dt);

    // 7. Update Dynamic Fleet Combat Maneuvering (Ship banking, pitch alignment, recoil)
    this.updateFleetCombatManeuvers(dt);

    // 8. Update Station Solar Panels & Navigation Strobes
    this.updateStationSolarArrays(dt);

    // 9. Update Engine Plumes & Lighting
    this.updateEngineFX(dt);

    // 10. Update Cinematic Projectiles, Railgun Beams & Swarm Torpedoes
    this.updateProjectiles(dt);
    this.updateCinematicBattle(dt);

    // 11. Update Escaping Stealth Prototype
    this.updateStealthEscape(dt);

    // 12. Update Enemy Warp Portals & Ship Emergence
    if (this.warpTriggered && !this.warpCompleted) {
      this.updateWarpArrival(dt);
    }

    // 13. Update Midground Orbital Space Debris Field
    this.updateDebrisField(dt);

    // 14. Update Camera Positioning & Procedural Micro-Shake
    this.updateCamera(dt);
  }

  updateAlliedWarpEmergence(dt) {
    this.alliedWarpProgress += dt * 0.35;
    const p = THREE.MathUtils.clamp(this.alliedWarpProgress, 0, 1);

    this.alliedPortals.forEach(entry => {
      const portal = entry.portal;
      const ship = entry.ship;

      if (portal) {
        portal.rotation.z += dt * 3.5;
        // Vortex scale flares up then dissipates
        const scaleFactor = Math.sin(p * Math.PI) * 1.8;
        portal.scale.set(scaleFactor, scaleFactor, scaleFactor);
      }

      if (ship) {
        ship.visible = true;
        // Emerge forward out of portal
        const curScale = THREE.MathUtils.lerp(0.001, entry.targetScale, p);
        ship.scale.set(curScale, curScale, curScale);
        ship.position.lerpVectors(entry.startPos, entry.targetPos, p);
      }
    });

    if (p >= 1.0) {
      this.alliedWarpCompleted = true;
      this.alliedPortals.forEach(entry => {
        if (entry.portal) entry.portal.visible = false;
      });
      // Enter defensive placement mode once fleet has fully arrived
      this.enterTacticalPlacementMode();
    }
  }

  updateEngineFX(dt) {
    const isBoost = this.controlsManager && typeof this.controlsManager.isBoosting === 'function'
      ? this.controlsManager.isBoosting()
      : !!(this.controlsManager && (this.controlsManager.keys?.['ShiftLeft'] || this.controlsManager.keys?.['ShiftRight']));

    const flicker = Math.sin(this.elapsedTime * 35.0) * 0.08;

    this.engineFXList.forEach((fx) => {
      const isPlayer = fx.isPlayer;
      const boostMult = isPlayer && isBoost ? 1.8 : 1.0;
      const lengthScale = boostMult + flicker;

      fx.flames.forEach((flame) => {
        flame.scale.set(1.0 + (boostMult - 1.0) * 0.25, 1.0 + (boostMult - 1.0) * 0.25, lengthScale);
      });

      fx.shockDiamonds.forEach((dia, idx) => {
        dia.scale.setScalar(1.0 + Math.sin(this.elapsedTime * 18.0 + idx) * 0.15 * boostMult);
      });

      fx.lights.forEach((light) => {
        light.intensity = (fx.faction === 'ALLIED' ? 3.0 : 4.5) * (isPlayer && isBoost ? 1.7 : 1.0) + flicker * 2.0;
      });
    });
  }

  updatePlayerFlight(dt) {
    if (!this.playerMesh || !this.alliedWarpCompleted) return;

    // Read input from controls manager
    const input = this.controlsManager ? this.controlsManager.getInputVector() : { x: 0, y: 0, z: 0 };
    const isBoost = this.controlsManager && typeof this.controlsManager.isBoosting === 'function'
      ? this.controlsManager.isBoosting()
      : !!(this.controlsManager && (this.controlsManager.keys?.['ShiftLeft'] || this.controlsManager.keys?.['ShiftRight']));
    const speed = (isBoost ? 45.0 : 25.0) * dt;

    // Pitch & Yaw & Roll
    const targetRoll = -input.x * 0.6;
    const targetPitch = input.y * 0.35;
    this.playerRot.z = THREE.MathUtils.lerp(this.playerRot.z, targetRoll, dt * 6.0);
    this.playerRot.x = THREE.MathUtils.lerp(this.playerRot.x, targetPitch, dt * 6.0);
    this.playerRot.y -= input.x * dt * 0.8;

    this.playerMesh.rotation.copy(this.playerRot);

    // Movement vectors
    this._vForward.set(0, 0, -1).applyEuler(this.playerRot);
    this._vRight.set(1, 0, 0).applyEuler(this.playerRot);
    this._vUp.set(0, 1, 0).applyEuler(this.playerRot);

    if (input.x !== 0 || input.y !== 0 || input.z !== 0) {
      this.playerPos.addScaledVector(this._vRight, input.x * speed * 0.8);
      this.playerPos.addScaledVector(this._vUp, input.y * speed * 0.8);
      if (input.z !== 0) {
        this.playerPos.addScaledVector(this._vForward, -input.z * speed);
      }

      // Station-keeping bounds around Planet Segma defense corridor
      this.playerPos.x = THREE.MathUtils.clamp(this.playerPos.x, -60, 60);
      this.playerPos.y = THREE.MathUtils.clamp(this.playerPos.y, -18, 30);
      this.playerPos.z = THREE.MathUtils.clamp(this.playerPos.z, -80, 10);

      // Keep tactical targetPos in sync
      if (this.tacticalShips['PLAYER']) {
        this.tacticalShips['PLAYER'].targetPos.copy(this.playerPos);
      }
    }

    // Weapon firing
    this.fireTimer -= dt;
    const isFiring = this.controlsManager && typeof this.controlsManager.isFiring === 'function'
      ? this.controlsManager.isFiring()
      : !!(this.controlsManager && this.controlsManager.isFiringLaser);

    if (isFiring && this.fireTimer <= 0) {
      this.firePlayerWeapon();
      this.fireTimer = 0.14;
    }
  }

  firePlayerWeapon() {
    if (this.spaceAudio && this.spaceAudio.playLaserSound) {
      this.spaceAudio.playLaserSound();
    }

    const currentVessel = this.playerVesselOptions[this.currentVesselIndex];
    let muzzleSpread = 3.2;
    let forwardOffset = -18.0;

    if (currentVessel === 'DESTROYER') {
      muzzleSpread = 5.5;
      forwardOffset = -30.0;
    } else if (currentVessel === 'INTERCEPTOR') {
      muzzleSpread = 1.2;
      forwardOffset = -2.5;
    }

    this._vForward.set(0, 0, -1).applyEuler(this.playerRot);

    // Spawn twin high-speed plasma bolts using pooled meshes
    [-muzzleSpread, muzzleSpread].forEach((mx) => {
      this._tempV1.set(mx, 0, forwardOffset).applyEuler(this.playerRot).add(this.playerPos);

      const bolt = this.getPlayerBolt();
      bolt.position.copy(this._tempV1);
      bolt.rotation.copy(this.playerRot);
      this.cinematicGroup.add(bolt);

      this.cinematicProjectiles.push({
        mesh: bolt,
        velocity: this._vForward.clone().multiplyScalar(240.0),
        life: 1.8,
        isPlayer: true
      });

      // Muzzle sparks
      if (this.particleManager) {
        this.particleManager.createHitSparks(this._tempV1, 0x00f3ff);
      }
    });

    // Recoil kick on ship pitch
    this.playerRot.x -= 0.02;
  }

  updateProjectiles(dt) {
    for (let i = this.cinematicProjectiles.length - 1; i >= 0; i--) {
      const p = this.cinematicProjectiles[i];
      p.mesh.position.addScaledVector(p.velocity, dt);
      p.life -= dt;
      if (p.life <= 0) {
        if (p.isPlayer) {
          this.recyclePlayerBolt(p.mesh);
        } else {
          this.recycleEnemyBolt(p.mesh);
        }
        this.cinematicProjectiles.splice(i, 1);
      }
    }
  }

  handleTimelineEvents(dt) {
    const t = this.elapsedTime;

    // Ensure interactive prompt is hidden if timeline is before Shot 5
    if (t < 20.8 && this.shot5BoostPromptActive) {
      this.shot5BoostPromptActive = false;
      if (this.interactivePrompt) {
        this.interactivePrompt.classList.add('hidden');
      }
    }

    // ── ACT I: Armada Recall & Warp-In (0.0s – 5.0s) ──
    if (t < 5.0) {
      this.battlePhase = 'RECALL';
    }

    // Ensure Allied Armada warp is finalized at t >= 5.0
    if (t >= 5.0 && !this.alliedWarpCompleted) {
      this.alliedWarpCompleted = true;
      this.alliedPortals.forEach(entry => {
        if (entry.portal) entry.portal.visible = false;
        if (entry.ship) {
          entry.ship.visible = true;
          entry.ship.scale.set(entry.targetScale, entry.targetScale, entry.targetScale);
          entry.ship.position.copy(entry.targetPos);
        }
      });
      this.enterTacticalPlacementMode();
    }

    // ── ACT II: Hostile Incursion (5.0s – 9.0s) ──
    if (t >= 5.0 && t < 9.0 && !this.warpTriggered) {
      this.battlePhase = 'WARP_IN';
      this.warpTriggered = true;
      if (this.warpPortalCarrier) this.warpPortalCarrier.visible = true;
      if (this.warpPortalBattleship) this.warpPortalBattleship.visible = true;

      // Deep Sub-Bass Warp Drop Synthesis & Screen Trauma
      if (this.spaceAudio && this.spaceAudio.playSubBassWarpDrop) {
        this.spaceAudio.playSubBassWarpDrop();
      }
      this.addCameraShake(0.70);

      if (this.statusTag) {
        this.statusTag.textContent = 'SUBSPACE RUPTURE // HOSTILE CAPITAL FLEET DETECTED';
        this.statusTag.style.color = '#ff1133';
      }
      if (this.flightHint) {
        this.flightHint.innerHTML = 'HOSTILE WARP DETECTED // CAPITAL SHIPS ENTERING SECTOR';
      }
      if (this.spaceAudio && this.spaceAudio.playBossWarning) {
        this.spaceAudio.playBossWarning();
      }
    }

    // Ensure Hostile warp portals are finalized at t >= 9.0
    if (t >= 9.0 && !this.warpCompleted) {
      this.warpCompleted = true;
      if (this.warpPortalCarrier) this.warpPortalCarrier.visible = false;
      if (this.warpPortalBattleship) this.warpPortalBattleship.visible = false;
      if (this.warpPortalEscort) this.warpPortalEscort.visible = false;
      if (this.enemyCarrier) {
        this.enemyCarrier.visible = true;
        this.enemyCarrier.scale.set(1.0, 1.0, 1.0);
        this.enemyCarrier.position.z = -165;
      }
      if (this.enemyBattleship) {
        this.enemyBattleship.visible = true;
        this.enemyBattleship.scale.set(0.85, 0.85, 0.85);
        this.enemyBattleship.position.z = -145;
      }
      if (this.waveEnemyDrones) {
        this.waveEnemyDrones.forEach(d => {
          if (d.mesh && !d.isDestroyed) {
            d.mesh.visible = true;
            d.mesh.scale.set(0.85, 0.85, 0.85);
          }
        });
      }
      if (this.waveStealthFighters) {
        this.waveStealthFighters.forEach(sf => {
          if (sf.mesh && !sf.isDestroyed) {
            sf.mesh.visible = true;
            sf.mesh.scale.set(1.0, 1.0, 1.0);
          }
        });
      }
      if (this.waveEcmCorvette && this.waveEcmCorvette.mesh && !this.waveEcmCorvette.isDestroyed) {
        this.waveEcmCorvette.mesh.visible = true;
        this.waveEcmCorvette.mesh.scale.set(0.9, 0.9, 0.9);
      }
    }

    // ── ACT III: Battle Erupts & Capital Ships Destroyed (9.0s – 15.8s) ──
    if (t >= 9.0) {
      if (!this.alliedBroadsideFired) {
        this.battlePhase = 'BATTLE_ERUPTS';
        this.alliedBroadsideFired = true;

        // Auto-hide tactical formation dock once combat erupts
        if (this.tacticalDock && !this.tacticalDock.classList.contains('hidden')) {
          this.tacticalDock.classList.add('hidden');
        }
        Object.values(this.selectionRings).forEach(ring => {
          if (ring) ring.visible = false;
        });

        if (this.statusTag) {
          this.statusTag.textContent = 'FLEET ENGAGEMENT // CONCENTRATE ALL BATTERIES';
          this.statusTag.style.color = '#00f3ff';
        }
        if (this.flightHint) {
          this.flightHint.innerHTML = 'FLEET ENGAGEMENT ACTIVE // ALLIED WEAPONS FREE';
        }
      }

      // Drone wave 1 destruction beat at 10.4s (interception by Allied fire)
      if (t >= 10.4 && !this.dronesFirstWaveDestroyed) {
        this.dronesFirstWaveDestroyed = true;
        [0, 1].forEach(idx => {
          if (this.waveEnemyDrones && this.waveEnemyDrones[idx]) {
            const d = this.waveEnemyDrones[idx];
            d.isDestroyed = true;
            if (d.mesh) {
              const p = d.mesh.position;
              if (this.particleManager) {
                this.particleManager.createExplosion(p, 0xff2200, 36, 2.2);
                this.particleManager.createHitSparks(p, 0xff7700, 20);
                if (this.particleManager.spawnMetalDebris) {
                  this.particleManager.spawnMetalDebris(p, 14, 0x555555);
                }
              }
              if (this.spaceAudio && this.spaceAudio.playExplosion) {
                this.spaceAudio.playExplosion(1);
              }
              this.addCameraShake(0.18);
              d.mesh.visible = false;
            }
          }
        });
      }

      // Multi-stage secondary hull breaches on Goliath Battleship (10.8s - 12.4s)
      if (t >= 10.8 && t < 12.4 && !this.battleshipDestroyed && this.enemyBattleship) {
        this.battleshipBreachTimer -= dt;
        if (this.battleshipBreachTimer <= 0) {
          this.battleshipBreachTimer = 0.22;
          this._tempV1.copy(this.enemyBattleship.position);
          this._tempV1.x += (Math.random() - 0.5) * 20;
          this._tempV1.y += (Math.random() - 0.5) * 8;
          this._tempV1.z += (Math.random() - 0.5) * 16;
          const bp = this._tempV1;
          if (this.particleManager) {
            this.particleManager.createExplosion(bp, 0xff2200, 22, 1.5);
            this.particleManager.createHitSparks(bp, 0xffaa00, 14);
            if (this.particleManager.spawnMetalDebris) {
              this.particleManager.spawnMetalDebris(bp, 8, 0x664433);
            }
          }
          this.battleshipShudder = Math.min(2.5, this.battleshipShudder + 0.4);
          this.addCameraShake(0.14);
          if (this.spaceAudio && this.spaceAudio.playExplosion) {
            this.spaceAudio.playExplosion(1);
          }
        }
      }



      // Drone wave 2 destruction beat at 11.6s
      if (t >= 11.6 && !this.dronesSecondWaveDestroyed) {
        this.dronesSecondWaveDestroyed = true;
        [2, 3].forEach(idx => {
          if (this.waveEnemyDrones && this.waveEnemyDrones[idx]) {
            const d = this.waveEnemyDrones[idx];
            d.isDestroyed = true;
            if (d.mesh) {
              const p = d.mesh.position;
              if (this.particleManager) {
                this.particleManager.createExplosion(p, 0xff4400, 36, 2.2);
                this.particleManager.createHitSparks(p, 0xffaa00, 20);
                if (this.particleManager.spawnMetalDebris) {
                  this.particleManager.spawnMetalDebris(p, 14, 0x555555);
                }
              }
              if (this.spaceAudio && this.spaceAudio.playExplosion) {
                this.spaceAudio.playExplosion(1);
              }
              this.addCameraShake(0.18);
              d.mesh.visible = false;
            }
          }
        });
      }

      // ECM Jammer Corvette destruction beat at 12.0s with EMP discharge
      if (t >= 12.0 && !this.ecmCorvetteDestroyed) {
        this.ecmCorvetteDestroyed = true;
        if (this.waveEcmCorvette && this.waveEcmCorvette.mesh) {
          this.waveEcmCorvette.isDestroyed = true;
          const p = this.waveEcmCorvette.mesh.position;
          if (this.particleManager) {
            this.particleManager.createExplosion(p, 0x00f3ff, 70, 3.4);
            this.particleManager.createEmpShockwave(p, 0x00f3ff, 38.0);
            this.particleManager.createHitSparks(p, 0xffffff, 28);
            if (this.particleManager.spawnMetalDebris) {
              this.particleManager.spawnMetalDebris(p, 22, 0x336688);
            }
          }
          if (this.spaceAudio && this.spaceAudio.playExplosion) {
            this.spaceAudio.playExplosion(0);
          }
          this.addCameraShake(0.35);
          this.waveEcmCorvette.mesh.visible = false;
        }
      }

      // Battleship explosion beat at 12.5s
      if (t >= 12.5 && !this.battleshipDestroyed) {
        this.battleshipDestroyed = true;
        this.destroyEnemyBattleship();
      }

      // Multi-stage secondary hull breaches on Gorgon Carrier (13.0s - 14.7s)
      if (t >= 13.0 && t < 14.7 && !this.carrierDestroyed && this.enemyCarrier) {
        this.carrierBreachTimer -= dt;
        if (this.carrierBreachTimer <= 0) {
          this.carrierBreachTimer = 0.24;
          this._tempV1.copy(this.enemyCarrier.position);
          this._tempV1.x += (Math.random() - 0.5) * 32;
          this._tempV1.y += (Math.random() - 0.5) * 10;
          this._tempV1.z += (Math.random() - 0.5) * 24;
          const cp = this._tempV1;
          if (this.particleManager) {
            this.particleManager.createExplosion(cp, 0xff0044, 28, 1.8);
            this.particleManager.createHitSparks(cp, 0xffea00, 18);
            if (this.particleManager.spawnMetalDebris) {
              this.particleManager.spawnMetalDebris(cp, 10, 0x773344);
            }
          }
          this.carrierShudder = Math.min(3.0, this.carrierShudder + 0.5);
          this.addCameraShake(0.18);
          if (this.spaceAudio && this.spaceAudio.playExplosion) {
            this.spaceAudio.playExplosion(1);
          }
        }
      }

      // Carrier explosion beat at 14.8s
      if (t >= 14.8 && !this.carrierDestroyed) {
        this.carrierDestroyed = true;
        this.destroyEnemyCarrier();
      }
    }

    // ── ACT IV: Stealth Escape Launch from Carrier Hull (15.0s – 20.8s) ──
    if (t >= 15.0) {
      if (this.battlePhase !== 'FINISHED' && this.battlePhase !== 'ENGAGE_PROMPT') {
        this.battlePhase = 'STEALTH_ESCAPE';
      }

      if (!this.stealthEscapeActive) {
        this.spawnEscapingStealthFighter();
      }

      // Spatial Doppler Flyby Sound as Stealth Fighter zooms past open center
      if (t >= 17.2 && !this.shot4FlybyAudioTriggered) {
        this.shot4FlybyAudioTriggered = true;
        if (this.spaceAudio && this.spaceAudio.playFlybyDoppler) {
          this.spaceAudio.playFlybyDoppler(-1);
        }
        this.addCameraShake(0.40);
      }

      if (t >= 19.2 && !this.stealthEscaped) {
        this.stealthEscaped = true;
        if (this.statusTag) {
          this.statusTag.textContent = 'DIRECTIVE // PURSUE AND DESTROY';
          this.statusTag.style.color = '#00f3ff';
        }
        if (this.speakerName) {
          this.speakerName.textContent = 'HIGH COMMAND';
        }
        if (this.dialogueText) {
          this.dialogueText.textContent =
            'Commander: Launch pursuit vector! Intercept that stealth craft before it jumps to hyperspace.';
        }
        if (this.flightHint) {
          this.flightHint.innerHTML = 'MISSION DIRECTIVE // ENGAGE PURSUIT BOOST';
        }
        if (this.gameManager.voiceAnnouncer) {
          this.gameManager.voiceAnnouncer.speak(
            'Commander, launch pursuit vector. Intercept that craft before it jumps.',
            true,
            'COMMAND'
          );
        }
      }
    }

    // ── ACT V: Interactive Transition to Wave 1 (at 20.8s+) ──
    if (t >= 20.8) {
      if (this.battlePhase !== 'FINISHED') {
        this.battlePhase = 'ENGAGE_PROMPT';
      }

      if (!this.shot5BoostPromptActive) {
        this.shot5BoostPromptActive = true;
        this.shot5AutoTimer = 3.8;
        if (this.interactivePrompt) {
          this.interactivePrompt.classList.remove('hidden');
        }
        if (this.statusTag) {
          this.statusTag.textContent = 'INTERCEPT READY // ENGAGE SUBSPACE ENGINES';
          this.statusTag.style.color = '#00f3ff';
        }
        if (this.flightHint) {
          this.flightHint.innerHTML = 'READY FOR COMBAT // PRESS SPACE OR TAP TO ENGAGE BOOST';
        }
      }

      if (this.shot5BoostPromptActive && !this.boostEngaging) {
        this.shot5AutoTimer -= dt;
        if (this.autoTimerElem) {
          this.autoTimerElem.textContent = `AUTO-ENGAGING IN ${Math.max(0, this.shot5AutoTimer).toFixed(1)}s...`;
        }
        if (this.shot5AutoTimer <= 0) {
          this.triggerInteractiveBoost();
        }
      }
    }
  }

  destroyEnemyBattleship() {
    const pos = this.enemyBattleship ? this.enemyBattleship.position : new THREE.Vector3(-28, 6, -145);
    if (this.particleManager) {
      this.particleManager.createExplosion(pos, 0xff2200, 110, 4.2);
      this.particleManager.createExplosion(pos, 0xffaa00, 80, 3.2);
      this.particleManager.createEmpShockwave(pos, 0x00f3ff, 48.0);
      if (this.particleManager.spawnMetalDebris) {
        this.particleManager.spawnMetalDebris(pos, 35, 0x556677);
      }
    }
    if (this.spaceAudio) {
      this.spaceAudio.playExplosion(0);
      if (this.spaceAudio.playPlanetImpact) this.spaceAudio.playPlanetImpact();
    }
    this.addCameraShake(0.80);
    if (this.enemyBattleship) {
      this.enemyBattleship.visible = true; // Remains visible for death listing and orbital plunge
    }
    if (this.statusTag) {
      this.statusTag.textContent = 'TARGET OBLITERATED // ENEMY BATTLESHIP DESTROYED';
      this.statusTag.style.color = '#00f3ff';
    }
  }

  destroyEnemyCarrier() {
    const pos = this.enemyCarrier ? this.enemyCarrier.position : new THREE.Vector3(38, 6, -165);
    if (this.particleManager) {
      this.particleManager.createExplosion(pos, 0xff0044, 140, 5.2);
      this.particleManager.createExplosion(pos, 0xffea00, 100, 4.0);
      this.particleManager.createExplosion(pos, 0x00f3ff, 80, 3.5);
      this.particleManager.createEmpShockwave(pos, 0xff0044, 60.0);
      if (this.particleManager.spawnMetalDebris) {
        this.particleManager.spawnMetalDebris(pos, 45, 0x773344);
      }
    }
    if (this.spaceAudio) {
      this.spaceAudio.playExplosion(0);
      if (this.spaceAudio.playPlanetImpact) this.spaceAudio.playPlanetImpact();
    }
    this.addCameraShake(0.95);
    if (this.enemyCarrier) {
      this.enemyCarrier.visible = true; // Remains visible for heavy starboard listing and deep space drift
    }
    if (this.statusTag) {
      this.statusTag.textContent = 'TARGET OBLITERATED // ENEMY CARRIER DESTROYED';
      this.statusTag.style.color = '#00f3ff';
    }
  }

  spawnEscapingStealthFighter() {
    this.stealthEscapeActive = true;
    this.stealthEscapeProgress = 0;
    this.stealthCloakTriggered = false;

    if (!this.escapingStealthFighter) {
      const sf = new StealthFighter(this.scene, this.particleManager, this._stealthP0);
      this.scene.remove(sf.meshGroup);
      this.escapingStealthFighter = sf.meshGroup;
      this.escapingStealthFighterObj = sf;
      this.cinematicGroup.add(this.escapingStealthFighter);
    }

    // Anchor launch vector directly to Carrier's fractured hull breach coordinates
    if (this.enemyCarrier) {
      this._stealthP0.copy(this.enemyCarrier.position).add(new THREE.Vector3(-6, -1, 10));
    } else {
      this._stealthP0.set(18, 6, -135);
    }
    this._stealthP1.set(0, 4, -30); // Dramatic center-screen pass close to camera
    this._stealthP2.set(-28, 16, -280); // Escape vector toward deep asteroid field

    this.escapingStealthFighter.position.copy(this._stealthP0);
    this.escapingStealthFighter.scale.set(1.5, 1.5, 1.5);
    this.escapingStealthFighter.visible = true;

    if (!this._stealthMaterials || this._stealthMaterials.length === 0) {
      this._stealthMaterials = [];
      this.escapingStealthFighter.traverse(child => {
        if (child.isMesh && child.material) {
          this._stealthMaterials.push(child.material);
        }
      });
    }
    for (let i = 0; i < this._stealthMaterials.length; i++) {
      this._stealthMaterials[i].transparent = true;
      this._stealthMaterials[i].opacity = 1.0;
    }

    // High-energy audio triggers on explosive launch from Carrier breach
    if (this.spaceAudio) {
      if (this.spaceAudio.playSubspaceIgnition) {
        this.spaceAudio.playSubspaceIgnition();
      }
      if (this.spaceAudio.playFlybyDoppler) {
        this.spaceAudio.playFlybyDoppler(1);
      }
      if (this.spaceAudio.playBossWarning) {
        this.spaceAudio.playBossWarning();
      }
    }
    this.addCameraShake(0.65);

    if (this.statusTag) {
      this.statusTag.textContent = 'HOSTILE FLEET DESTROYED // TARGET ESCAPING';
      this.statusTag.style.color = '#ffaa00';
    }
    if (this.speakerName) {
      this.speakerName.textContent = 'TACTICAL SENSORS';
    }
    if (this.dialogueText) {
      this.dialogueText.textContent =
        'Hostile fleet destroyed! An enemy stealth craft broke through into the asteroid belt.';
    }
    if (this.flightHint) {
      this.flightHint.innerHTML = 'TARGET ESCAPING // PREPARE PURSUIT VECTOR';
    }
    if (this.gameManager.voiceAnnouncer) {
      this.gameManager.voiceAnnouncer.speak(
        'Hostile fleet destroyed. An enemy stealth craft escaped into the asteroid belt.',
        true,
        'TACTICAL'
      );
    }
  }

  updateStealthEscape(dt) {
    if (!this.stealthEscapeActive || !this.escapingStealthFighter) return;
    this.stealthEscapeProgress += dt * 0.22;
    const p = THREE.MathUtils.clamp(this.stealthEscapeProgress, 0, 1);

    // Quadratic bezier curve from Carrier blast through open center foreground to deep space
    const oneMinusP = 1 - p;
    this._stealthCurPos.set(0, 0, 0)
      .addScaledVector(this._stealthP0, oneMinusP * oneMinusP)
      .addScaledVector(this._stealthP1, 2 * oneMinusP * p)
      .addScaledVector(this._stealthP2, p * p);

    // Orientation tangent
    const nextP = Math.min(1.0, p + 0.02);
    const oneMinusNext = 1 - nextP;
    this._stealthNextPos.set(0, 0, 0)
      .addScaledVector(this._stealthP0, oneMinusNext * oneMinusNext)
      .addScaledVector(this._stealthP1, 2 * oneMinusNext * nextP)
      .addScaledVector(this._stealthP2, nextP * nextP);

    this.escapingStealthFighter.position.copy(this._stealthCurPos);
    this.escapingStealthFighter.lookAt(this._stealthNextPos);
    // Dramatic 35-degree aerodynamic roll into the escape turn
    this.escapingStealthFighter.rotation.z = -0.55;

    // Thruster spark exhaust trail while escaping
    if (this.particleManager && Math.random() < 0.40) {
      this.particleManager.createHitSparks(this._stealthCurPos, 0x00f3ff, 3);
    }

    // Mid-point flyby Doppler whoosh pass
    if (p >= 0.38 && !this.shot4FlybyAudioTriggered) {
      this.shot4FlybyAudioTriggered = true;
      if (this.spaceAudio && this.spaceAudio.playFlybyDoppler) {
        this.spaceAudio.playFlybyDoppler(-1);
      }
      this.addCameraShake(0.35);
    }

    // Cloaking effect engages at p >= 0.45 (around t = 17.5s)
    if (p >= 0.45) {
      if (!this.stealthCloakTriggered) {
        this.stealthCloakTriggered = true;
        if (this.particleManager) {
          this.particleManager.createEmpShockwave(this._stealthCurPos, 0xaa00ff, 24.0);
          this.particleManager.createHitSparks(this._stealthCurPos, 0xff0077, 16);
        }
        if (this.spaceAudio && this.spaceAudio.playQuantumArc) {
          this.spaceAudio.playQuantumArc(0);
        }
      }

      // Fade opacity from 1.0 down to 0.12 using cached material array (zero traverse overhead)
      const cloakOpacity = Math.max(0.12, 1.0 - (p - 0.45) * 3.5);
      if (this._stealthMaterials && this._stealthMaterials.length > 0) {
        for (let i = 0; i < this._stealthMaterials.length; i++) {
          const mat = this._stealthMaterials[i];
          mat.transparent = true;
          mat.opacity = cloakOpacity;
        }
      }
    }
  }

  /**
   * Updates Space Station solar panel arrays:
   * - Rotates SARJ gimbals smoothly to simulate star-tracking
   * - Flashes port and starboard wingtip navigation strobes in realistic aviation cadence
   */
  updateStationSolarArrays(dt) {
    if (!this.stationSolarArrays || this.stationSolarArrays.length === 0) return;

    // Smooth subtle solar star-tracking gimbal tilt
    const sunTrackAngle = Math.sin(this.elapsedTime * 0.12) * 0.18;

    // Aviation strobe cadence: crisp pulse every 1.2 seconds
    const strobeCycle = (this.elapsedTime % 1.2);
    const isFlashing = strobeCycle < 0.10 || (strobeCycle > 0.20 && strobeCycle < 0.30);

    this.stationSolarArrays.forEach((array) => {
      if (array.group) {
        array.group.rotation.x = sunTrackAngle;
      }
      if (array.strobe) {
        array.strobe.intensity = isFlashing ? 3.5 : 0.2;
      }
      if (array.beacon && array.beacon.material) {
        array.beacon.material.opacity = isFlashing ? 1.0 : 0.25;
      }
    });
  }

  /**
   * Procedural Midground Orbital Space Debris Field
   * Generates low-poly metallic armor fragments drifting in peripheral corridors,
   * catching dynamic reflections from weapons fire while keeping the center 75% unobstructed.
   */
  createOrbitalDebrisField() {
    this.debrisField = [];
    const debrisCount = 14;
    const debrisMat = new THREE.MeshStandardMaterial({
      color: 0x334455,
      metalness: 0.85,
      roughness: 0.35
    });

    for (let i = 0; i < debrisCount; i++) {
      let geo;
      const rType = i % 3;
      if (rType === 0) {
        geo = new THREE.DodecahedronGeometry(0.7 + Math.random() * 0.8, 0);
      } else if (rType === 1) {
        geo = new THREE.BoxGeometry(0.5 + Math.random() * 0.7, 0.2 + Math.random() * 0.4, 1.2 + Math.random() * 1.5);
      } else {
        geo = new THREE.TetrahedronGeometry(0.8 + Math.random() * 0.9, 0);
      }

      const mesh = new THREE.Mesh(geo, debrisMat);
      // Scatter on outer peripheral defense margins (keeping center open)
      const side = (i % 2 === 0 ? 1 : -1);
      const x = side * (24 + Math.random() * 28);
      const y = -8 + Math.random() * 26;
      const z = -35 - Math.random() * 75;
      mesh.position.set(x, y, z);
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

      this.cinematicGroup.add(mesh);
      this.debrisField.push({
        mesh,
        rotVel: new THREE.Vector3(
          (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.3
        ),
        driftVel: new THREE.Vector3(
          (Math.random() - 0.5) * 0.6,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.6
        )
      });
    }
  }

  updateDebrisField(dt) {
    if (!this.debrisField) return;
    this.debrisField.forEach(d => {
      if (d.mesh) {
        d.mesh.rotation.x += d.rotVel.x * dt;
        d.mesh.rotation.y += d.rotVel.y * dt;
        d.mesh.rotation.z += d.rotVel.z * dt;
        d.mesh.position.addScaledVector(d.driftVel, dt);
      }
    });
  }

  /**
   * Updates fleet warship combat maneuvering:
   * - Allied Destroyer Aegis banks and maneuvers into direct-fire spinal railgun arc against enemy Battleship
   * - Escort Frigate maneuvers into flanking broadside position, pitching up to unleash vertical missile pods
   * - Enemy Battleship and Carrier push through hyperspace rift with heavy dreadnought inertia
   * - Impact shudder & spinal recoil responses
   */
  updateFleetCombatManeuvers(dt) {
    // Decay recoil and shudder
    if (this.destroyerRecoil > 0) {
      this.destroyerRecoil = Math.max(0, this.destroyerRecoil - dt * 14.0);
    }
    if (this.battleshipShudder > 0) {
      this.battleshipShudder = Math.max(0, this.battleshipShudder - dt * 6.0);
    }
    if (this.carrierShudder > 0) {
      this.carrierShudder = Math.max(0, this.carrierShudder - dt * 6.0);
    }

    // 1. Allied Destroyer Aegis Combat Maneuvering
    if (this.alliedDestroyer && this.alliedWarpCompleted) {
      if (this.battlePhase === 'BATTLE_ERUPTS') {
        // Advance forward and bank into spinal firing position facing the Goliath Battleship
        this.alliedDestroyer.position.lerp(this._targetDestPos, dt * 1.5);
        // Apply spinal railgun recoil offset on Z
        this.alliedDestroyer.position.z += this.destroyerRecoil;

        // Dynamic combat attitude: bank slightly port (roll), pitch down towards Battleship
        this.alliedDestroyer.rotation.z = THREE.MathUtils.lerp(this.alliedDestroyer.rotation.z, -0.18, dt * 3.0);
        this.alliedDestroyer.rotation.x = THREE.MathUtils.lerp(this.alliedDestroyer.rotation.x, 0.08, dt * 3.0);
        this.alliedDestroyer.rotation.y = THREE.MathUtils.lerp(this.alliedDestroyer.rotation.y, -0.06, dt * 3.0);
      }
    }

    // 2. Allied Escort Frigate Combat Maneuvering
    if (this.alliedEscort && this.alliedWarpCompleted) {
      if (this.battlePhase === 'BATTLE_ERUPTS') {
        // Flank outward to starboard and elevate to provide missile coverage
        this.alliedEscort.position.lerp(this._targetFrigatePos, dt * 1.8);

        // Bank hard 30 degrees (roll: 0.35) so vertical missile decks angle directly at Carrier
        this.alliedEscort.rotation.z = THREE.MathUtils.lerp(this.alliedEscort.rotation.z, 0.35, dt * 3.5);
        this.alliedEscort.rotation.x = THREE.MathUtils.lerp(this.alliedEscort.rotation.x, -0.12, dt * 3.5);
        this.alliedEscort.rotation.y = THREE.MathUtils.lerp(this.alliedEscort.rotation.y, 0.18, dt * 3.5);
      }
    }

    // 3. Enemy Battleship Dreadnought Movement & Damage Shudder
    if (this.enemyBattleship && this.warpCompleted) {
      if (!this.battleshipDestroyed) {
        // Advance with ominous momentum towards allied fleet, holding at heavy bombardment range (-125)
        if (this.enemyBattleship.position.z < -125) {
          this.enemyBattleship.position.z += dt * 2.8;
        }
        // Kinetic impact shudder shake
        if (this.battleshipShudder > 0) {
          const shakeX = (Math.random() - 0.5) * this.battleshipShudder * 1.5;
          const shakeY = (Math.random() - 0.5) * this.battleshipShudder * 1.2;
          this.enemyBattleship.position.x += shakeX;
          this.enemyBattleship.position.y += shakeY;
        }
      } else {
        // Heavy listing & death roll into planetary orbit
        this.enemyBattleship.rotation.z += dt * 0.12;
        this.enemyBattleship.rotation.x += dt * 0.06;
        this.enemyBattleship.rotation.y += dt * 0.04;
        this.enemyBattleship.position.y -= dt * 2.8;
        this.enemyBattleship.position.z -= dt * 3.5;
        this.enemyBattleship.position.x -= dt * 0.8;

        // Secondary breach sparks (zero allocation)
        if (this.particleManager && Math.random() < 0.14) {
          this._tempV1.copy(this.enemyBattleship.position);
          this._tempV1.x += (Math.random() - 0.5) * 22;
          this._tempV1.y += (Math.random() - 0.5) * 8;
          this._tempV1.z += (Math.random() - 0.5) * 28;
          this.particleManager.createHitSparks(this._tempV1, 0xff5500, 5);
        }
      }
    }

    // 4. Enemy Carrier Movement & Damage Shudder
    if (this.enemyCarrier && this.warpCompleted) {
      if (!this.carrierDestroyed) {
        // Advance forward while deploying interceptors, holding at standoff launch range (-135)
        if (this.enemyCarrier.position.z < -135) {
          this.enemyCarrier.position.z += dt * 2.2;
        }
        if (this.carrierShudder > 0) {
          const shakeX = (Math.random() - 0.5) * this.carrierShudder * 1.8;
          const shakeY = (Math.random() - 0.5) * this.carrierShudder * 1.4;
          this.enemyCarrier.position.x += shakeX;
          this.enemyCarrier.position.y += shakeY;
        }
      } else {
        // Heavy listing & death roll into deep space
        this.enemyCarrier.rotation.z -= dt * 0.15;
        this.enemyCarrier.rotation.x += dt * 0.08;
        this.enemyCarrier.rotation.y -= dt * 0.05;
        this.enemyCarrier.position.y -= dt * 3.2;
        this.enemyCarrier.position.z -= dt * 4.0;
        this.enemyCarrier.position.x += dt * 1.2;

        // Secondary breach sparks (zero allocation)
        if (this.particleManager && Math.random() < 0.16) {
          this._tempV1.copy(this.enemyCarrier.position);
          this._tempV1.x += (Math.random() - 0.5) * 30;
          this._tempV1.y += (Math.random() - 0.5) * 10;
          this._tempV1.z += (Math.random() - 0.5) * 32;
          this.particleManager.createHitSparks(this._tempV1, 0xff0044, 6);
        }
      }
    }
  }

  updateCinematicBattle(dt) {
    // 1. Update and remove fading railgun slugs and beams
    for (let i = this.cinematicBeams.length - 1; i >= 0; i--) {
      const beam = this.cinematicBeams[i];
      beam.life -= dt;
      if (beam.life <= 0) {
        this.recycleRailgunBeam(beam.mesh);
        this.cinematicBeams.splice(i, 1);
      } else {
        if (beam.mesh && beam.mesh.material) {
          beam.mesh.material.opacity = Math.max(0, (beam.life / beam.maxLife) * 0.95);
        }
      }
    }

    // 2. Update and advance swarm torpedoes with dynamic rocket trails
    for (let i = this.cinematicTorpedoes.length - 1; i >= 0; i--) {
      const torp = this.cinematicTorpedoes[i];
      torp.t += dt * torp.speed;
      if (torp.t >= 1.0) {
        if (this.particleManager) {
          this.particleManager.createExplosion(torp.to, 0x00aaff, 18, 1.8);
          this.particleManager.createHitSparks(torp.to, 0x00f3ff, 12);
          if (this.particleManager.spawnMetalDebris) {
            this.particleManager.spawnMetalDebris(torp.to, 8, 0x6688aa);
          }
        }
        if (this.spaceAudio && this.spaceAudio.playExplosion) {
          this.spaceAudio.playExplosion(1);
        }
        this.carrierShudder = Math.min(2.0, this.carrierShudder + 0.35);
        this.recycleTorpedo(torp.mesh);
        this.cinematicTorpedoes.splice(i, 1);
      } else {
        // Multi-stage proportional navigation trajectory: arc upward then dive toward target
        this._torpCurPos.lerpVectors(torp.from, torp.to, torp.t);
        this._torpCurPos.y += Math.sin(torp.t * Math.PI) * 6.5;
        this._torpCurPos.x += Math.sin(torp.t * Math.PI * 2.0 + torp.phase) * 2.2;
        torp.mesh.position.copy(this._torpCurPos);

        // Rocket exhaust trail sparks
        if (this.particleManager && Math.random() > 0.35) {
          this.particleManager.createHitSparks(this._torpCurPos, 0x00f3ff, 2);
        }
      }
    }

    // 3. Fire active fleet combat volleys while in battle phase
    if (this.battlePhase === 'BATTLE_ERUPTS') {
      this.alliedSalvoTimer -= dt;
      this.stationCIWSTimer -= dt;

      if (this.alliedSalvoTimer <= 0) {
        this.alliedSalvoTimer = 0.20;

        // Allied Destroyer fires hypervelocity spinal railgun slug at Battleship
        if (this.alliedDestroyer && !this.battleshipDestroyed && this.enemyBattleship) {
          this._tempV1.copy(this.alliedDestroyer.position).add(this._offsetDestroyerMuzzle);
          this._tempV2.copy(this.enemyBattleship.position);
          this._tempV2.x += (Math.random() - 0.5) * 16;
          this._tempV2.y += (Math.random() - 0.5) * 8;
          this._tempV2.z += (Math.random() - 0.5) * 12;
          this.fireRailgunBeam(this._tempV1, this._tempV2, 0x00f3ff, 0.18, true);

          // Spinal recoil kickback on Destroyer
          this.destroyerRecoil = 0.95;
          // Kinetic shudder on Battleship
          this.battleshipShudder = Math.min(2.5, this.battleshipShudder + 0.5);

          if (this.particleManager) {
            this.particleManager.createHitSparks(this._tempV2, 0x00f3ff, 14);
            if (Math.random() > 0.3) {
              this.particleManager.createExplosion(this._tempV2, 0xff5500, 14, 1.4);
            }
          }
          if (this.spaceAudio && this.spaceAudio.playHeavyCannonSound) {
            this.spaceAudio.playHeavyCannonSound(-1.0);
          }
        }

        // Allied Frigate fires VLS Swarm Torpedoes at Carrier
        if (this.alliedEscort && !this.carrierDestroyed && this.enemyCarrier) {
          this._tempV1.copy(this.alliedEscort.position);
          this._tempV1.x += (Math.random() > 0.5 ? 4.5 : -4.5);
          this._tempV1.y += 2.0;
          this._tempV1.z -= 18;

          this._tempV2.copy(this.enemyCarrier.position);
          this._tempV2.x += (Math.random() - 0.5) * 28;
          this._tempV2.y += (Math.random() - 0.5) * 10;
          this._tempV2.z += (Math.random() - 0.5) * 22;
          this.fireTorpedo(this._tempV1, this._tempV2);
          if (this.spaceAudio && this.spaceAudio.playLaserPew) {
            this.spaceAudio.playLaserPew(1.0);
          }
        }

        // Player Vessel fires heavy plasma cannon bolts towards Carrier
        if (!this.carrierDestroyed && this.enemyCarrier) {
          this._tempV1.copy(this.playerPos);
          this._tempV1.x += (Math.random() > 0.5 ? 3.5 : -3.5);
          this._tempV1.z -= 12;

          this._tempV2.copy(this.enemyCarrier.position);
          this._tempV2.x += (Math.random() - 0.5) * 24;
          this._tempV2.z += (Math.random() - 0.5) * 18;
          this.fireRailgunBeam(this._tempV1, this._tempV2, 0x00d0ff, 0.14, false);
          if (this.particleManager) {
            this.particleManager.createHitSparks(this._tempV2, 0x00d0ff, 8);
          }
        }

        // Enemy Battleship fires heavy red plasma bursts back at Allied line
        if (!this.battleshipDestroyed && this.enemyBattleship) {
          this._tempV1.copy(this.enemyBattleship.position);
          this._tempV1.z += 18;

          this._tempV2.set(-32 + (Math.random() - 0.5) * 22, 2, -35);
          this.fireEnemyPlasma(this._tempV1, this._tempV2);
          if (this.spaceAudio && this.spaceAudio.playEnemyLaser) {
            this.spaceAudio.playEnemyLaser(-0.8);
          }
        }

        // Authentic In-Game Crimson Drones fire red plasma down center corridor
        if (this.waveEnemyDrones) {
          this.waveEnemyDrones.forEach((d, idx) => {
            if (!d.isDestroyed && d.mesh && d.mesh.visible) {
              if (Math.random() < 0.25) {
                this._tempV1.copy(d.mesh.position);
                this._tempV1.z += 2.5;
                this._tempV2.set((Math.random() - 0.5) * 35, (Math.random() - 0.5) * 8, -25);
                this.fireEnemyPlasma(this._tempV1, this._tempV2);
              }
            }
          });
        }

        // Authentic In-Game Stealth Fighters strafe and fire crimson bursts
        if (this.waveStealthFighters) {
          this.waveStealthFighters.forEach((sf, idx) => {
            if (!sf.isDestroyed && sf.mesh && sf.mesh.visible) {
              if (Math.random() < 0.20) {
                this._tempV1.copy(sf.mesh.position);
                this._tempV2.set((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 6, -20);
                this.fireEnemyPlasma(this._tempV1, this._tempV2);
              }
            }
          });
        }
      }

      // Station CIWS Point-Defense Turrets fire high-frequency tracer streams
      if (this.stationCIWSTimer <= 0 && this.alliedStation) {
        this.stationCIWSTimer = 0.08;
        if (this.stationSolarArrays && this.stationSolarArrays.length > 0) {
          const arr = this.stationSolarArrays[Math.floor(Math.random() * this.stationSolarArrays.length)];
          if (arr && arr.ciwsMuzzles) {
            const muzzle = arr.ciwsMuzzles[Math.floor(Math.random() * arr.ciwsMuzzles.length)];
            if (muzzle) {
              muzzle.getWorldPosition(this._tempV1);

              if (!this.carrierDestroyed && this.enemyCarrier) {
                this._tempV2.copy(this.enemyCarrier.position);
                this._tempV2.x += (Math.random() - 0.5) * 30;
                this._tempV2.y += (Math.random() - 0.5) * 12;
              } else {
                this._tempV2.set(30 + (Math.random() - 0.5) * 20, 10, -140);
              }

              this.fireRailgunBeam(this._tempV1, this._tempV2, 0x00f3ff, 0.09, false);
            }
          }
        }
      }
    }

    // 4. Update dynamic combat flight maneuvering of in-game wave crafts (60fps)
    if (this.waveEnemyDrones) {
      this.waveEnemyDrones.forEach((d, idx) => {
        if (!d.isDestroyed && d.mesh && d.mesh.visible) {
          if (d.mesh.position.z < -45) {
            d.mesh.position.z += dt * (d.speed || 30.0);
          }
          d.mesh.position.x = d.basePos.x + Math.sin(this.elapsedTime * 2.5 + idx) * 3.5;
          d.mesh.position.y = d.basePos.y + Math.cos(this.elapsedTime * 2.0 + idx) * 1.8;
          d.mesh.rotation.z = Math.sin(this.elapsedTime * 3.0 + idx) * 0.25;
        }
      });
    }

    if (this.waveStealthFighters) {
      this.waveStealthFighters.forEach((sf, idx) => {
        if (!sf.isDestroyed && sf.mesh && sf.mesh.visible) {
          if (sf.mesh.position.z < -55) {
            sf.mesh.position.z += dt * 18.0;
          }
          sf.mesh.position.x = sf.basePos.x + Math.sin(this.elapsedTime * 1.8 + idx * Math.PI) * 4.5;
          sf.mesh.rotation.z = -Math.sign(sf.basePos.x) * 0.22;
        }
      });
    }

    if (this.waveEcmCorvette && !this.waveEcmCorvette.isDestroyed && this.waveEcmCorvette.mesh && this.waveEcmCorvette.mesh.visible) {
      if (this.waveEcmCorvette.mesh.position.z < -70) {
        this.waveEcmCorvette.mesh.position.z += dt * 8.0;
      }
      this.waveEcmCorvette.mesh.rotation.z = Math.sin(this.elapsedTime * 1.2) * 0.10;
    }
  }

  fireRailgunBeam(from, to, colorHex = 0x00f3ff, duration = 0.16, hasSlug = false) {
    const dist = from.distanceTo(to);
    const beamRadius = hasSlug ? 0.48 : 0.28;
    const beam = this.getRailgunBeam(hasSlug);

    beam.position.copy(from).lerp(to, 0.5);
    beam.lookAt(to);
    beam.scale.set(beamRadius, beamRadius, dist);
    if (beam.material) {
      beam.material.color.setHex(colorHex);
      beam.material.opacity = 0.95;
    }

    const core = beam.getObjectByName('slugCore');
    if (core && hasSlug) {
      core.scale.set(0.38, 0.38, 1.0);
    }

    this.cinematicGroup.add(beam);
    this.cinematicBeams.push({ mesh: beam, life: duration, maxLife: duration });
  }

  fireTorpedo(from, to) {
    const torp = this.getTorpedoMesh();
    torp.position.copy(from);
    torp.lookAt(to);
    this.cinematicGroup.add(torp);
    this.cinematicTorpedoes.push({
      mesh: torp,
      from: from.clone(),
      to: to.clone(),
      t: 0,
      speed: 2.2,
      phase: Math.random() * Math.PI * 2
    });
  }

  fireEnemyPlasma(from, to) {
    const bolt = this.getEnemyBolt();
    bolt.position.copy(from);
    bolt.lookAt(to);
    this.cinematicGroup.add(bolt);

    this._tempV3.subVectors(to, from).normalize();
    this.cinematicProjectiles.push({
      mesh: bolt,
      velocity: this._tempV3.clone().multiplyScalar(220.0),
      life: 1.2,
      isPlayer: false
    });
  }

  updateWarpArrival(dt) {
    this.warpProgress += dt * 0.45;
    const p = THREE.MathUtils.clamp(this.warpProgress, 0, 1);

    // Spin warp vortex rings
    if (this.warpPortalCarrier && this.warpPortalCarrier.visible) {
      this.warpPortalCarrier.rotation.z += dt * 4.0;
      const ringScale = Math.sin(p * Math.PI) * 2.2;
      this.warpPortalCarrier.scale.set(ringScale, ringScale, ringScale);
    }
    if (this.warpPortalBattleship && this.warpPortalBattleship.visible) {
      this.warpPortalBattleship.rotation.z -= dt * 3.5;
      const ringScale = Math.sin(p * Math.PI) * 2.2;
      this.warpPortalBattleship.scale.set(ringScale, ringScale, ringScale);
    }
    if (this.warpPortalEscort && this.warpPortalEscort.visible) {
      this.warpPortalEscort.rotation.z += dt * 3.8;
      const ringScale = Math.sin(p * Math.PI) * 2.0;
      this.warpPortalEscort.scale.set(ringScale, ringScale, ringScale);
    }

    // Materialize incursion fleet and in-game wave crafts from portal
    if (p > 0.25) {
      const sFactor = (p - 0.25) / 0.75;
      if (this.enemyCarrier) {
        this.enemyCarrier.visible = true;
        const s = THREE.MathUtils.lerp(0.001, 1.0, sFactor);
        this.enemyCarrier.scale.set(s, s, s);
        this.enemyCarrier.position.z = -180 + sFactor * 25;
      }
      if (this.enemyBattleship) {
        this.enemyBattleship.visible = true;
        const s = THREE.MathUtils.lerp(0.001, 0.85, sFactor);
        this.enemyBattleship.scale.set(s, s, s);
        this.enemyBattleship.position.z = -170 + sFactor * 25;
      }
      if (this.waveEnemyDrones) {
        this.waveEnemyDrones.forEach(d => {
          if (d.mesh && !d.isDestroyed) {
            d.mesh.visible = true;
            const s = THREE.MathUtils.lerp(0.001, 0.85, sFactor);
            d.mesh.scale.set(s, s, s);
          }
        });
      }
      if (this.waveStealthFighters) {
        this.waveStealthFighters.forEach(sf => {
          if (sf.mesh && !sf.isDestroyed) {
            sf.mesh.visible = true;
            const s = THREE.MathUtils.lerp(0.001, 1.0, sFactor);
            sf.mesh.scale.set(s, s, s);
          }
        });
      }
      if (this.waveEcmCorvette && this.waveEcmCorvette.mesh && !this.waveEcmCorvette.isDestroyed) {
        this.waveEcmCorvette.mesh.visible = true;
        const s = THREE.MathUtils.lerp(0.001, 0.9, sFactor);
        this.waveEcmCorvette.mesh.scale.set(s, s, s);
      }
    }

    if (p >= 1.0) {
      this.warpCompleted = true;
      if (this.warpPortalCarrier) this.warpPortalCarrier.visible = false;
      if (this.warpPortalBattleship) this.warpPortalBattleship.visible = false;
      if (this.warpPortalEscort) this.warpPortalEscort.visible = false;
    }
  }

  spawnCarrierDroneWave() {
    const carrierPos = this.enemyCarrier ? this.enemyCarrier.position : new THREE.Vector3(70, 20, -140);
    for (let i = 0; i < 4; i++) {
      const droneMesh = assetManager.createProceduralShipModel('STEALTH');
      droneMesh.scale.set(0.8, 0.8, 0.8);
      droneMesh.position.set(carrierPos.x + (i % 2 === 0 ? -18 : 18), carrierPos.y, carrierPos.z + 10);
      this.applyAAAFactionMaterials(droneMesh, 'HOSTILE', 2.0);
      this.cinematicGroup.add(droneMesh);
      this.deployedDrones.push({
        mesh: droneMesh,
        speed: 35.0 + i * 5,
        offset: i
      });
    }
  }

  /**
   * Automated Hollywood Multi-Shot Camera Trajectory
   * Smooth Hermite S-curve interpolation capturing all battle assets:
   * Shot 1 (0.0s - 5.5s): Grand orbital crane framing Planet Segma on left, Space Station far off in high orbit (160, 45, -275), center 75% of screen completely open space looking down the defense corridor
   * Shot 2 (5.5s - 9.0s): Hostile incursion crane sweep showing crimson subspace rifts tearing open over Planet Segma as in-game wave fleet (Drones, Stealth, ECM, Dreadnoughts) arrives
   * Shot 3 (9.0s - 16.0s): High sweeping tactical combat tracking arc showing warship maneuvering, spinal railgun salvos, swarm torpedoes, CIWS tracers, and destruction of enemy drones, ECM corvette, and capital behemoths
   * Shot 4 (16.0s - 20.8s): Low-angle dramatic flyby tracking shot following the authentic enemy stealth fighter as it screams past open center screen and cloaks
   * Shot 5 (20.8s+): Smooth match-cut dolly right behind the player flagship as letterbox dissolves and Wave 1 begins
   */
  updateDirectorCameraTrajectory(t) {
    if (t < 5.5) {
      // Shot 1: Grand orbital crane (0.0s - 5.5s)
      const u = t / 5.5;
      const s = u * u * (3 - 2 * u); // Smoothstep cubic Hermite
      this.camTargetPos.set(
        THREE.MathUtils.lerp(-18.0, -4.0, s),
        THREE.MathUtils.lerp(38.0, 32.0, s),
        THREE.MathUtils.lerp(85.0, 72.0, s)
      );
      this.camLookAt.set(
        THREE.MathUtils.lerp(0.0, 0.0, s),
        THREE.MathUtils.lerp(2.0, 4.0, s),
        THREE.MathUtils.lerp(-75.0, -100.0, s)
      );
    } else if (t < 9.0) {
      // Shot 2: Hostile incursion crane sweep (5.5s - 9.0s)
      const u = (t - 5.5) / 3.5;
      const s = u * u * (3 - 2 * u);
      this.camTargetPos.set(
        THREE.MathUtils.lerp(-4.0, 8.0, s),
        THREE.MathUtils.lerp(32.0, 26.0, s),
        THREE.MathUtils.lerp(72.0, 58.0, s)
      );
      this.camLookAt.set(
        THREE.MathUtils.lerp(0.0, 0.0, s),
        THREE.MathUtils.lerp(4.0, 6.0, s),
        THREE.MathUtils.lerp(-100.0, -135.0, s)
      );
    } else if (t < 15.0) {
      // Shot 3: Sweeping tactical combat tracking arc (9.0s - 15.0s)
      const u = (t - 9.0) / 6.0;
      const s = u * u * (3 - 2 * u);
      // Sweeping arc banking from starboard to port while capturing the full theater of battle in open center
      const sweepX = -20.0 + Math.sin(u * Math.PI) * 26.0;
      const sweepY = THREE.MathUtils.lerp(28.0, 20.0, s);
      const sweepZ = THREE.MathUtils.lerp(55.0, 38.0, s);
      this.camTargetPos.set(sweepX, sweepY, sweepZ);

      // Focus pans dynamically across targets: Center fleet -> Battleship explosion -> Carrier explosion
      let targetFocusX = 0.0;
      if (t >= 12.0 && t < 14.0) {
        targetFocusX = -28.0; // Focus on Battleship explosion
      } else if (t >= 14.0) {
        targetFocusX = 38.0;  // Focus on Carrier cataclysmic explosion
      }
      this.camLookAt.set(
        THREE.MathUtils.lerp(this.camLookAt.x, targetFocusX, 0.08),
        6.0,
        -135.0
      );
    } else if (t < 20.8) {
      // Shot 4: Low-angle dramatic flyby tracking shot following escaping stealth fighter (15.0s - 20.8s)
      if (this.escapingStealthFighter && this.stealthEscapeActive) {
        const sPos = this.escapingStealthFighter.position;
        // Camera tracks dynamically: Starts near Carrier breach viewing escape launch, then dollys along center
        const u = THREE.MathUtils.clamp((t - 15.0) / 5.8, 0, 1);
        const s = u * u * (3 - 2 * u);
        this.camTargetPos.set(
          sPos.x + THREE.MathUtils.lerp(16.0, -10.0, s),
          sPos.y + THREE.MathUtils.lerp(6.0, 10.0, s),
          sPos.z + THREE.MathUtils.lerp(28.0, 46.0, s)
        );
        this.camLookAt.set(
          sPos.x,
          sPos.y,
          sPos.z - 28.0
        );
      } else {
        this.camTargetPos.set(0, 16.0, 48.0);
        this.camLookAt.set(0, 4.0, -80.0);
      }
    } else {
      // Shot 5: Smooth match-cut dolly right behind the player flagship for gameplay transition (20.8s+)
      this.camTargetPos.set(this.playerPos.x, this.playerPos.y + 8.5, this.playerPos.z + 38.0);
      this.camLookAt.set(this.playerPos.x, this.playerPos.y + 1.5, this.playerPos.z - 75.0);
    }
  }

  updateCamera(dt) {
    if (!this.playerMesh) return;

    const currentVessel = this.playerVesselOptions[this.currentVesselIndex];

    if (this.cameraMode === 'PANORAMA') {
      // PANORAMIC ALL-ASSETS OVERVIEW:
      // High-angle strategic vantage point positioned to encompass:
      // 1. Planet Segma & glowing atmospheric ring (bottom/side horizon)
      // 2. Space Station Citadel & extended dual solar panel wings (high orbit background)
      // 3. Allied Destroyer Aegis & Escort Frigate (center-port combat flank)
      // 4. Player Controllable Flagship (anchoring formation foreground)
      // 5. Hostile Goliath Battleship & Gorgon Carrier (forward invasion line)
      this.camTargetPos.set(-12.0, 72.0, 115.0);
      this.camLookAt.set(18.0, 2.0, -85.0);
    } else if (this.cameraMode === 'DIRECTOR') {
      this.updateDirectorCameraTrajectory(this.elapsedTime);
    } else if (this.cameraMode === 'CHASE') {
      // Dynamic 3rd person chase camera tailored to capital vessel dimensions
      this._chaseOffset.set(0, 9.5, 42.0);
      this._lookOffset.set(0, 2.0, -80.0);

      if (currentVessel === 'DESTROYER') {
        this._chaseOffset.set(0, 14.0, 58.0);
        this._lookOffset.set(0, 4.0, -90.0);
      } else if (currentVessel === 'INTERCEPTOR') {
        this._chaseOffset.set(0, 3.5, 14.0);
        this._lookOffset.set(0, 0.5, -40.0);
      }

      this.camTargetPos.copy(this.playerPos).add(this._chaseOffset.applyEuler(this.playerRot));
      this.camLookAt.copy(this.playerPos).add(this._lookOffset.applyEuler(this.playerRot));
    } else if (this.cameraMode === 'COCKPIT') {
      // 1st-person forward cockpit bridge perspective
      this._cockpitOffset.set(0, 2.4, -14.0);
      this._lookOffset.set(0, 2.0, -140.0);

      if (currentVessel === 'DESTROYER') {
        this._cockpitOffset.set(0, 5.2, -26.0);
        this._lookOffset.set(0, 4.0, -160.0);
      } else if (currentVessel === 'INTERCEPTOR') {
        this._cockpitOffset.set(0, 0.5, -0.6);
        this._lookOffset.set(0, 0.2, -60.0);
      }

      this.camTargetPos.copy(this.playerPos).add(this._cockpitOffset.applyEuler(this.playerRot));
      this.camLookAt.copy(this.playerPos).add(this._lookOffset.applyEuler(this.playerRot));
    }

    // Apply Interactive Zoom Scaling & Orbit Angle Offsets (Pitch & Yaw)
    // Relative to the current camera look-at anchor point
    this._camOffset.subVectors(this.camTargetPos, this.camLookAt);

    // Apply zoom multiplier (zoom factor > 1 pushes camera outward for wider asset coverage)
    this._camOffset.multiplyScalar(this.cameraZoomFactor);

    // Apply yaw orbit rotation around vertical axis (X angle)
    if (this.cameraOrbitAngleX !== 0) {
      this._camOffset.applyAxisAngle(this._yAxis, this.cameraOrbitAngleX);
    }

    // Apply pitch elevation angle (Y angle)
    if (this.cameraOrbitAngleY !== 0) {
      this._camRightAxis.set(1, 0, 0).applyAxisAngle(this._yAxis, this.cameraOrbitAngleX);
      this._camOffset.applyAxisAngle(this._camRightAxis, this.cameraOrbitAngleY);
    }

    this.camTargetPos.copy(this.camLookAt).add(this._camOffset);

    this.camera.position.lerp(this.camTargetPos, dt * 5.0);
    this.camCurrentLookAt.lerp(this.camLookAt, dt * 5.0);
    this.camera.lookAt(this.camCurrentLookAt);

    // Apply procedural camera micro-shake (distance-scaled & event trauma)
    if (this.camTrauma > 0) {
      this.camTrauma = Math.max(0, this.camTrauma - dt * 1.5);
      const shake = this.camTrauma * this.camTrauma;
      const pitchShake = (Math.random() - 0.5) * 0.85 * shake;
      const yawShake = (Math.random() - 0.5) * 0.95 * shake;
      const rollShake = (Math.random() - 0.5) * 0.65 * shake;

      this.camera.rotation.x += pitchShake * 0.04;
      this.camera.rotation.y += yawShake * 0.04;
      this.camera.rotation.z += rollShake * 0.04;
    }
  }

  addCameraShake(amount) {
    this.camTrauma = Math.min(1.0, this.camTrauma + amount);
  }

  triggerInteractiveBoost() {
    if (this.boostEngaging || !this.isActive) return;
    this.boostEngaging = true;

    // 1. Procedural audio ignition roar & bass punch
    if (this.spaceAudio && this.spaceAudio.playSubspaceIgnition) {
      this.spaceAudio.playSubspaceIgnition();
    }

    // 2. Camera Trauma
    this.addCameraShake(0.95);

    // 3. UI Status feedback
    if (this.interactivePrompt) {
      this.interactivePrompt.innerHTML = `
        <div class="segma-interactive-btn" style="background: rgba(0, 243, 255, 0.6); border-color: #ffffff; transform: scale(1.08);">
          <span>SUBSPACE BOOST ENGAGED</span>
          <span class="segma-key-badge">100% THRUST</span>
        </div>
      `;
    }
    if (this.statusTag) {
      this.statusTag.textContent = 'PURSUIT ACTIVE // SUBSPACE DRIVE MAXIMUM';
      this.statusTag.style.color = '#00f3ff';
    }
    if (this.dialogueText) {
      this.dialogueText.textContent = 'WARP DRIVE ENGAGED // COMMENCING HIGH-SPEED SECTOR PURSUIT';
    }

    // 4. Dynamic FOV Punch effect into Wave 1
    if (this.camera) {
      const origFov = this.camera.fov || 60;
      this.camera.fov = 85;
      this.camera.updateProjectionMatrix();

      let fovElapsed = 0;
      const fovInterval = setInterval(() => {
        fovElapsed += 0.04;
        this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, origFov, 0.22);
        this.camera.updateProjectionMatrix();
        if (fovElapsed >= 0.5) {
          clearInterval(fovInterval);
          this.camera.fov = origFov;
          this.camera.updateProjectionMatrix();
          this.endCinematic();
        }
      }, 30);
    } else {
      setTimeout(() => this.endCinematic(), 500);
    }
  }

  endCinematic() {
    if (!this.isActive) return;
    this.isActive = false;

    if (this.interactivePrompt) {
      this.interactivePrompt.classList.add('hidden');
    }
    this.debrisField = [];
    this.boostEngaging = false;
    this.shot5BoostPromptActive = false;

    document.body.classList.remove('cinematic-active');
    if (this.gameManager.playerShip) {
      if (this.gameManager.playerShip.mesh) this.gameManager.playerShip.mesh.visible = true;
      if (this.gameManager.playerShip.meshGroup) this.gameManager.playerShip.meshGroup.visible = true;
    }

    // Restore gameplay fog density
    if (this.gameManager.spaceScene && this.gameManager.spaceScene.scene && this.gameManager.spaceScene.scene.fog) {
      this.gameManager.spaceScene.scene.fog.density = 0.003;
    }
    if (this.gameManager.spaceScene && this.gameManager.spaceScene.orbitalStationGroup) {
      this.gameManager.spaceScene.orbitalStationGroup.visible = true;
    }

    // Clean up cinematic entities, projectiles, beams, and torpedoes
    this.scene.remove(this.cinematicGroup);
    this.cinematicProjectiles = [];
    this.cinematicBeams = [];
    this.cinematicTorpedoes = [];
    this.engineFXList = [];
    this.alliedPortals = [];
    this.waveEnemyDrones = [];
    this.waveStealthFighters = [];
    this.waveEcmCorvette = null;
    this.escapingStealthFighter = null;
    this.escapingStealthFighterObj = null;

    // Hide Cinematic HUD
    if (this.hudElem) {
      this.hudElem.classList.add('hidden');
    }

    // Trigger completion callback to start gameplay
    if (this.onCompleteCallback) {
      const cb = this.onCompleteCallback;
      this.onCompleteCallback = null;
      cb();
    }
  }
}
