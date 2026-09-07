import * as THREE from 'three';
import { assetManager } from '../engine/AssetManager.js';
import { getPBRMaterialSet } from '../engine/PBRTextureGenerator.js';

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
    this.escapingStealthFighter = null;
    this.stealthFighterFX = null;

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

    // PBR Material Cache
    this.pbrMaterials = {};

    this.createDomOverlay();
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
            <button id="btn-segma-ship" class="segma-btn-pill" title="Switch Controlled Fleet Vessel (V)">
              <span class="pill-dot"></span>
              <span id="segma-ship-label">VESSEL: FRIGATE</span>
            </button>
            <button id="btn-segma-engage" class="segma-btn-engage" title="Engage Combat / Skip Cinematic (Space)">
              <span>ENGAGE COMBAT</span>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Interactive Tactical Formation & Defensive Positioning Dock -->
        <div id="segma-tactical-dock" class="segma-tactical-dock hidden">
          <div class="segma-tactical-header">
            <span class="segma-tactical-title">DEFENSIVE FORMATION COMMAND</span>
            <span class="segma-tactical-hint">DRAG OR SELECT WARSHIPS TO ASSIGN DEFENSIVE SECTOR PATROLS</span>
          </div>
          <div class="segma-tactical-actions">
            <div class="segma-formation-presets">
              <button id="btn-formation-aegis" class="segma-preset-btn active" title="V-Wedge Escort Defense">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="12 2 22 20 12 16 2 20 12 2"/>
                </svg>
                <span>AEGIS WEDGE</span>
              </button>
              <button id="btn-formation-citadel" class="segma-preset-btn" title="Orbital Citadel Shield">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/>
                </svg>
                <span>CITADEL GUARD</span>
              </button>
              <button id="btn-formation-screen" class="segma-preset-btn" title="Horizontal Flank Perimeter">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="2" y1="12" x2="22" y2="12"/><circle cx="6" cy="12" r="3"/><circle cx="12" cy="12" r="3"/><circle cx="18" cy="12" r="3"/>
                </svg>
                <span>FLANK SCREEN</span>
              </button>
            </div>
            <div class="segma-ship-selector-row">
              <button id="btn-select-ship-player" class="segma-ship-btn active">FLAGSHIP (YOU)</button>
              <button id="btn-select-ship-frigate" class="segma-ship-btn">ESCORT FRIGATE</button>
              <button id="btn-select-ship-destroyer" class="segma-ship-btn">DESTROYER AEGIS</button>
            </div>
            <button id="btn-confirm-formation" class="segma-btn-lock-formation">
              <span>LOCK FORMATION // ENGAGE</span>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="segma-reticle-wrap">
          <div class="segma-flight-reticle"></div>
          <div class="segma-flight-hint" id="segma-flight-hint">ALLIED FLEET ARRIVAL // DROPPING OUT OF HYPERSPACE</div>
        </div>

        <div class="segma-letterbox bottom">
          <div class="segma-comms-panel">
            <div class="segma-speaker-bar">
              <span id="segma-speaker-name" class="segma-speaker-name">VANGUARD COMMAND</span>
              <span class="segma-comm-badge">PRIORITY COMM // ORBITAL AEGIS</span>
            </div>
            <div id="segma-dialogue-text" class="segma-dialogue-text">
              Distress Beacon Active at Planet Segma. Space Station Citadel holding orbit. Fleet armada dropping out of hyperspace now!
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
    this.flightHint = document.getElementById('segma-flight-hint');
    this.tacticalDock = document.getElementById('segma-tactical-dock');

    this.zoomLevelLabel = document.getElementById('segma-zoom-level');

    document.getElementById('btn-segma-zoom-out')?.addEventListener('click', () => this.adjustCameraZoom(0.25));
    document.getElementById('btn-segma-zoom-in')?.addEventListener('click', () => this.adjustCameraZoom(-0.25));
    document.getElementById('btn-segma-overview')?.addEventListener('click', () => this.toggleOverviewCamera());
    document.getElementById('btn-segma-pause')?.addEventListener('click', () => this.togglePause());

    document.getElementById('btn-segma-camera')?.addEventListener('click', () => this.cycleCameraMode());
    document.getElementById('btn-segma-ship')?.addEventListener('click', () => this.cycleVesselControl());
    document.getElementById('btn-segma-engage')?.addEventListener('click', () => this.confirmDefensivePositions());

    // Formation preset buttons
    document.getElementById('btn-formation-aegis')?.addEventListener('click', () => this.applyFormationPreset('AEGIS'));
    document.getElementById('btn-formation-citadel')?.addEventListener('click', () => this.applyFormationPreset('CITADEL'));
    document.getElementById('btn-formation-screen')?.addEventListener('click', () => this.applyFormationPreset('SCREEN'));

    // Ship selection buttons in tactical dock
    document.getElementById('btn-select-ship-player')?.addEventListener('click', () => this.selectTacticalShip('PLAYER'));
    document.getElementById('btn-select-ship-frigate')?.addEventListener('click', () => this.selectTacticalShip('FRIGATE'));
    document.getElementById('btn-select-ship-destroyer')?.addEventListener('click', () => this.selectTacticalShip('DESTROYER'));

    // Lock formation button
    document.getElementById('btn-confirm-formation')?.addEventListener('click', () => this.confirmDefensivePositions());

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
      } else if (e.code === 'Space' && (this.elapsedTime > 3.0)) {
        e.preventDefault();
        this.confirmDefensivePositions();
      } else if (e.code === 'Escape') {
        e.preventDefault();
        this.endCinematic();
      }
    });
  }

  async start(onCompleteCallback = null, selectedShipClass = 'INTERCEPTOR') {
    this.isActive = true;
    this.elapsedTime = 0;
    this.isPaused = false;
    const pauseLabel = document.getElementById('segma-pause-label');
    if (pauseLabel) pauseLabel.textContent = 'PAUSE (P)';
    const pauseBtn = document.getElementById('btn-segma-pause');
    if (pauseBtn) pauseBtn.classList.remove('active');
    const overviewBtn = document.getElementById('btn-segma-overview');
    if (overviewBtn) overviewBtn.classList.remove('active-overview');

    this.onCompleteCallback = onCompleteCallback;
    this.selectedShipClass = selectedShipClass || 'INTERCEPTOR';
    this.warpTriggered = false;
    this.warpCompleted = false;
    this.warpProgress = 0;
    this.alliedWarpProgress = 0;
    this.alliedWarpCompleted = false;
    this.isTacticalMode = false;
    this.cameraMode = 'DIRECTOR';
    this.currentVesselIndex = 0;

    // Reset Cinematic Battle & Stealth Escape State
    this.battlePhase = 'RECALL';
    this.battleTimer = 0;
    this.alliedBroadsideFired = false;
    this.carrierDestroyed = false;
    this.battleshipDestroyed = false;
    this.stealthEscaped = false;
    this.battleExplosions = [];
    this.alliedSalvoTimer = 0;
    this.escapingStealthFighter = null;
    this.stealthEscapeProgress = 0;
    this.stealthCloakTriggered = false;
    this.cinematicBeams = [];
    this.cinematicTorpedoes = [];

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

    // 2. Clear previous cinematic entities
    this.scene.add(this.cinematicGroup);
    while (this.cinematicGroup.children.length > 0) {
      this.cinematicGroup.remove(this.cinematicGroup.children[0]);
    }
    this.cinematicProjectiles = [];
    this.engineFXList = [];
    this.alliedPortals = [];
    this.stationSolarArrays = [];
    this.destroyerRecoil = 0;
    this.battleshipShudder = 0;
    this.carrierShudder = 0;
    this.stationCIWSTimer = 0;

    // 3. Load Fleet Assets
    await assetManager.loadFleetAssets();

    // 4. Build Allied Armada in orbit around Planet Segma
    this.buildAlliedArmada();

    // 5. Mount Player's Controllable Vessel (selected airframe)
    this.mountPlayerVessel(this.selectedShipClass);

    // 6. Register tactical fleet dictionary & selection rings
    this.registerTacticalFleet();

    // 7. Pre-position Enemy Warp Vessels (hidden initially)
    this.prepareEnemyInvasionFleet();

    // 8. Show Cinematic HUD
    if (this.hudElem) {
      this.hudElem.classList.remove('hidden');
    }

    // Initial audio greeting: Urgent armada recall at Planet Segma
    if (this.spaceAudio && this.spaceAudio.playRadioSquelch) {
      this.spaceAudio.playRadioSquelch();
    }
    if (this.speakerName) {
      this.speakerName.textContent = 'HIGH COMMAND // SECTOR DEFENSE';
    }
    if (this.statusTag) {
      this.statusTag.textContent = 'CODE RED ALERT // EMERGENCY ARMADA RECALL';
      this.statusTag.style.color = '#00f3ff';
    }
    if (this.dialogueText) {
      this.dialogueText.textContent =
        'CRITICAL ALERT: Planet Segma is under imminent attack! All armada battlegroups drop out of hyperspace to defense perimeter immediately!';
    }
    if (this.flightHint) {
      this.flightHint.innerHTML = 'ARMADA RECALL // ALLIED FLEET DROPPING OUT OF HYPERSPACE';
    }
    if (this.gameManager.voiceAnnouncer) {
      this.gameManager.voiceAnnouncer.speak(
        'Critical alert! Planet Segma is under imminent attack! All armada battlegroups drop out of hyperspace immediately!',
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

      // Dynamic local point light casting glow on rear hull
      const pLight = new THREE.PointLight(flameColorHex, isAllied ? 3.0 : 4.5, baseLength * 7.0);
      pLight.position.set(0, 0, baseLength * 0.3);
      nozzleGroup.add(pLight);
      lights.push(pLight);

      shipGroup.add(nozzleGroup);
    });

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
   * Builds realistic high-detail solar panel arrays on either side of the Space Station Citadel.
   * Features:
   * - Twin heavy titanium outrigger booms extending laterally from port (-X) and starboard (+X)
   * - Solar Alpha Rotary Joints (SARJ) with optical encoders & gimbal pivots
   * - 4 extended photovoltaic solar wings per side (8 wings total) with procedural silicon cell textures
   * - Space-grade gold multilayer insulation (MLI) thermal backing
   * - Micro-meteoroid shielding frames, longitudinal tension guide wires, and cross-trusses
   * - Active dual navigation strobes (red port, green starboard) and CIWS defensive weapon emplacements
   */
  buildSpaceStationSolarArrays(stationGroup) {
    const photoTex = generatePhotovoltaicTexture();
    photoTex.repeat.set(1, 2);

    // Front: Photovoltaic silicon cells with metallic sheen
    const solarFrontMat = new THREE.MeshStandardMaterial({
      map: photoTex,
      metalness: 0.85,
      roughness: 0.25,
      emissive: new THREE.Color(0x001a33),
      emissiveIntensity: 0.35,
      bumpMap: photoTex,
      bumpScale: 0.08
    });

    // Back: Space-grade gold kapton multilayer insulation (MLI) thermal foil
    const goldKaptonMat = new THREE.MeshStandardMaterial({
      color: 0xffb700,
      metalness: 0.95,
      roughness: 0.3,
      emissive: new THREE.Color(0x442200),
      emissiveIntensity: 0.2
    });

    // Structural truss frame material (dark titanium alloy)
    const trussMat = new THREE.MeshStandardMaterial({
      color: 0x2a3848,
      metalness: 0.8,
      roughness: 0.4
    });

    // CIWS and weapon mount material
    const weaponMat = new THREE.MeshStandardMaterial({
      color: 0x182230,
      metalness: 0.9,
      roughness: 0.35
    });

    // Wing panel geometry: width 14, height 0.35, depth 38
    const panelGeo = new THREE.BoxGeometry(14, 0.35, 38);
    // Custom UVs for panel faces so solar cell texture displays cleanly on top & bottom
    const pMaterials = [
      trussMat,       // right (+x)
      trussMat,       // left (-x)
      solarFrontMat,  // top (+y) - photovoltaic active side
      goldKaptonMat,  // bottom (-y) - gold thermal kapton
      trussMat,       // front (+z)
      trussMat        // back (-z)
    ];

    // Build port (-X, side = -1) and starboard (+X, side = 1) solar wings
    [-1, 1].forEach((side) => {
      const arrayBoomGroup = new THREE.Group();
      arrayBoomGroup.position.set(side * 28, 0, 0);

      // Primary cantilever tubular outrigger boom extending to side * 68 (world 96)
      const boomLength = 68;
      const boomGeo = new THREE.CylinderGeometry(1.6, 2.2, boomLength, 12);
      boomGeo.rotateZ(side * Math.PI / 2);
      const boomMesh = new THREE.Mesh(boomGeo, trussMat);
      boomMesh.position.set(side * (boomLength / 2), 0, 0);
      arrayBoomGroup.add(boomMesh);

      // Structural triangular cross-truss lattice along the boom
      const trussSteps = 5;
      for (let s = 1; s <= trussSteps; s++) {
        const tx = side * (s * 11);
        const strutRingGeo = new THREE.TorusGeometry(2.8, 0.3, 6, 12);
        strutRingGeo.rotateY(Math.PI / 2);
        const strutRing = new THREE.Mesh(strutRingGeo, trussMat);
        strutRing.position.set(tx, 0, 0);
        arrayBoomGroup.add(strutRing);

        // Diagonal tension brace wires
        const diagGeo = new THREE.CylinderGeometry(0.12, 0.12, 12, 4);
        diagGeo.rotateZ(Math.PI / 4 * side);
        const diagMesh = new THREE.Mesh(diagGeo, trussMat);
        diagMesh.position.set(tx, 0, 0);
        arrayBoomGroup.add(diagMesh);
      }

      // Solar Alpha Rotary Joint (SARJ) - Gimbal rotation housing for solar tracking
      const sarjHousingGeo = new THREE.CylinderGeometry(3.6, 3.6, 4.5, 16);
      sarjHousingGeo.rotateZ(Math.PI / 2);
      const sarjMesh = new THREE.Mesh(sarjHousingGeo, trussMat);
      sarjMesh.position.set(side * (boomLength + 2), 0, 0);
      arrayBoomGroup.add(sarjMesh);

      // Gimbals for rotating solar arrays relative to local star light
      const rotatingWingGroup = new THREE.Group();
      rotatingWingGroup.position.set(side * (boomLength + 4), 0, 0);

      // 4 Solar Panel Wings per side arranged in quad array (2 Fore, 2 Aft)
      const wingOffsets = [
        { x: side * 8, z: -24, pitch: 0.15 },
        { x: side * 24, z: -24, pitch: 0.15 },
        { x: side * 8, z: 24, pitch: 0.15 },
        { x: side * 24, z: 24, pitch: 0.15 }
      ];

      wingOffsets.forEach((cfg) => {
        const wingMesh = new THREE.Mesh(panelGeo, pMaterials);
        wingMesh.position.set(cfg.x, 0, cfg.z);
        wingMesh.rotation.x = cfg.pitch;
        rotatingWingGroup.add(wingMesh);

        // Longitudinal structural panel rib along center spine
        const ribGeo = new THREE.BoxGeometry(0.6, 0.8, 40);
        const ribMesh = new THREE.Mesh(ribGeo, trussMat);
        ribMesh.position.set(cfg.x, 0, cfg.z);
        ribMesh.rotation.x = cfg.pitch;
        rotatingWingGroup.add(ribMesh);
      });

      // Wing tip navigation beacon (Port = Red, Starboard = Green)
      const strobeColor = side === -1 ? 0xff2233 : 0x00ff66;
      const strobeLight = new THREE.PointLight(strobeColor, 2.5, 30.0);
      strobeLight.position.set(side * 34, 0, 0);
      rotatingWingGroup.add(strobeLight);

      const beaconGeo = new THREE.SphereGeometry(0.8, 8, 8);
      const beaconMat = new THREE.MeshBasicMaterial({
        color: strobeColor,
        toneMapped: false
      });
      const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
      beaconMesh.position.set(side * 34, 0, 0);
      rotatingWingGroup.add(beaconMesh);

      // CIWS Point-Defense Turret mounted on SARJ outrigger node
      const turretBaseGeo = new THREE.CylinderGeometry(1.8, 2.2, 1.2, 8);
      const turretBase = new THREE.Mesh(turretBaseGeo, weaponMat);
      turretBase.position.set(side * (boomLength + 2), 2.2, 0);
      arrayBoomGroup.add(turretBase);

      const barrelGeo = new THREE.CylinderGeometry(0.2, 0.2, 3.8, 6);
      barrelGeo.rotateX(Math.PI / 2);
      const barrelLeft = new THREE.Mesh(barrelGeo, weaponMat);
      barrelLeft.position.set(side * (boomLength + 2) - 0.6, 2.8, -1.8);
      arrayBoomGroup.add(barrelLeft);
      const barrelRight = new THREE.Mesh(barrelGeo, weaponMat);
      barrelRight.position.set(side * (boomLength + 2) + 0.6, 2.8, -1.8);
      arrayBoomGroup.add(barrelRight);

      arrayBoomGroup.add(rotatingWingGroup);
      stationGroup.add(arrayBoomGroup);

      // Keep reference for subtle sun-tracking rotation in update()
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
    const ringMesh = assetManager.getFleetShipMesh('Station_Habitat_Ring');

    if (stationMesh) {
      this.alliedStation = new THREE.Group();
      this.alliedStation.add(stationMesh);

      if (ringMesh) {
        this.stationRing = ringMesh;
        this.alliedStation.add(ringMesh);
      }

      // Station placed on starboard flank overlooking Planet Segma (x: 105, y: 15, z: -170)
      this.alliedStation.position.set(105, 15, -170);
      this.alliedStation.scale.set(1.15, 1.15, 1.15);
      this.alliedStation.visible = true;
      this.applyAAAFactionMaterials(this.alliedStation, 'ALLIED', 4.0);

      // Install realistic solar arrays on either side of the Space Station Citadel
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
    if (this.playerMesh) {
      this.cinematicGroup.remove(this.playerMesh);
      this.playerMesh = null;
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
    this.alliedPortals.push({
      portal: portalPlayer,
      ship: this.playerMesh,
      targetScale: this.playerBaseScale,
      startPos: new THREE.Vector3(0, 4, -60),
      targetPos: new THREE.Vector3(0, 4, -20)
    });

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
    this.isTacticalMode = true;
    if (this.tacticalDock) {
      this.tacticalDock.classList.remove('hidden');
    }

    // Show selection rings
    Object.values(this.selectionRings).forEach(ring => {
      ring.visible = true;
    });

    if (this.flightHint) {
      this.flightHint.innerHTML = 'TACTICAL PLACEMENT ACTIVE // DRAG OR SELECT WARSHIPS TO ASSIGN DEFENSIVE SECTOR PATROLS';
    }

    if (this.statusTag) {
      this.statusTag.textContent = 'SECTOR SEGMA // TACTICAL FLEET FORMATION';
    }

    if (this.speakerName) {
      this.speakerName.textContent = 'COMMAND ADMIRALTY';
    }

    if (this.dialogueText) {
      this.dialogueText.textContent = 'Allied armada on station! Commander, select fleet defense formation or reposition your warships around Planet Segma.';
    }

    if (this.spaceAudio && this.spaceAudio.playTacticalNotification) {
      this.spaceAudio.playTacticalNotification();
    }

    if (this.gameManager.voiceAnnouncer) {
      this.gameManager.voiceAnnouncer.speak(
        "Allied armada on station! Commander, assign defensive formation around Planet Segma.",
        true,
        "COMMAND"
      );
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
    // 1. Enemy Space Carrier (Catamaran Flight Deck)
    const carrierMesh = assetManager.getFleetShipMesh('Vessel_Carrier_01');
    if (carrierMesh) {
      this.enemyCarrier = carrierMesh;
      this.enemyCarrier.position.set(55, 18, -150);
      this.enemyCarrier.scale.set(0.001, 0.001, 0.001);
      this.enemyCarrier.visible = false;
      this.applyAAAFactionMaterials(this.enemyCarrier, 'HOSTILE', 4.5);

      // Attach 4 heavy fusion afterburners to carrier catamaran hulls
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

    // 2. Enemy Heavy Battleship (Direct Fire Flagship)
    const bshipMesh = assetManager.getFleetShipMesh('Vessel_Destroyer_01');
    if (bshipMesh) {
      this.enemyBattleship = bshipMesh;
      this.enemyBattleship.position.set(-40, -4, -140);
      this.enemyBattleship.scale.set(0.001, 0.001, 0.001);
      this.enemyBattleship.visible = false;
      this.applyAAAFactionMaterials(this.enemyBattleship, 'HOSTILE', 4.0);

      // Attach twin heavy fusion thrusters
      this.attachEngineThrusters(
        this.enemyBattleship,
        [{ x: -6.0, y: 0, z: 42.0 }, { x: 6.0, y: 0, z: 42.0 }],
        'HOSTILE',
        2.2,
        10.0
      );
      this.cinematicGroup.add(this.enemyBattleship);
    }

    // 3. Hyperspace Rupture Portals
    this.warpPortalCarrier = this.createWarpPortal(new THREE.Vector3(55, 18, -150), 0xff1133);
    this.warpPortalBattleship = this.createWarpPortal(new THREE.Vector3(-40, -4, -140), 0xff1133);
  }

  createWarpPortal(pos, colorHex) {
    const group = new THREE.Group();
    group.position.copy(pos);

    // Inner gravitational singularity sphere
    const coreGeo = new THREE.SphereGeometry(18, 24, 24);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x050510, side: THREE.DoubleSide });
    group.add(new THREE.Mesh(coreGeo, coreMat));

    // Outer swirling accretion warp rings
    for (let r = 0; r < 3; r++) {
      const ringGeo = new THREE.TorusGeometry(26 + r * 8, 1.8, 8, 36);
      const ringMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI * 0.5;
      ring.rotation.y = (r * Math.PI) / 3;
      group.add(ring);
    }

    // Dynamic portal illumination light
    const portalLight = new THREE.PointLight(colorHex, 5.0, 220);
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
        this.stationRing.rotation.z += dt * 0.15;
      }
      this.updateCamera(dt);
      return;
    }

    this.elapsedTime += dt;

    // 1. Rotate Station Centrifugal Ring
    if (this.stationRing) {
      this.stationRing.rotation.z += dt * 0.35;
    }

    // 2. Natural Space Station Antigravity Float
    if (this.alliedStation) {
      this.alliedStation.position.y = 15 + Math.sin(this.elapsedTime * 0.8) * 1.2;
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

    // 13. Update Camera Positioning
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
    const forward = new THREE.Vector3(0, 0, -1).applyEuler(this.playerRot);
    const right = new THREE.Vector3(1, 0, 0).applyEuler(this.playerRot);
    const up = new THREE.Vector3(0, 1, 0).applyEuler(this.playerRot);

    if (input.x !== 0 || input.y !== 0 || input.z !== 0) {
      this.playerPos.addScaledVector(right, input.x * speed * 0.8);
      this.playerPos.addScaledVector(up, input.y * speed * 0.8);
      if (input.z !== 0) {
        this.playerPos.addScaledVector(forward, -input.z * speed);
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

    // Spawn twin high-speed plasma bolts
    [-muzzleSpread, muzzleSpread].forEach((mx) => {
      const localPos = new THREE.Vector3(mx, 0, forwardOffset).applyEuler(this.playerRot).add(this.playerPos);

      // Plasma bolt geometry & material
      const boltGeo = new THREE.CylinderGeometry(0.14, 0.14, 4.2, 8);
      boltGeo.rotateX(Math.PI / 2);
      const boltMat = new THREE.MeshBasicMaterial({
        color: 0x00f3ff,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending
      });
      const bolt = new THREE.Mesh(boltGeo, boltMat);
      bolt.position.copy(localPos);
      bolt.rotation.copy(this.playerRot);
      this.cinematicGroup.add(bolt);

      const forward = new THREE.Vector3(0, 0, -1).applyEuler(this.playerRot);
      this.cinematicProjectiles.push({
        mesh: bolt,
        velocity: forward.multiplyScalar(240.0),
        life: 1.8
      });

      // Muzzle sparks
      if (this.particleManager) {
        this.particleManager.createHitSparks(localPos, 0x00f3ff);
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
        this.cinematicGroup.remove(p.mesh);
        this.cinematicProjectiles.splice(i, 1);
      }
    }
  }

  handleTimelineEvents(dt) {
    const t = this.elapsedTime;

    // ── ACT I: Armada Recall & Warp-In (0.0s – 5.0s) ──
    if (t < 5.0) {
      this.battlePhase = 'RECALL';
    }

    // ── ACT II: Hostile Incursion (5.0s – 9.0s) ──
    if (t >= 5.0 && t < 9.0 && !this.warpTriggered) {
      this.battlePhase = 'WARP_IN';
      this.warpTriggered = true;
      if (this.warpPortalCarrier) this.warpPortalCarrier.visible = true;
      if (this.warpPortalBattleship) this.warpPortalBattleship.visible = true;

      if (this.statusTag) {
        this.statusTag.textContent = 'SUBSPACE RUPTURE // HOSTILE CAPITAL FLEET DETECTED';
        this.statusTag.style.color = '#ff1133';
      }
      if (this.speakerName) {
        this.speakerName.textContent = 'AEGIS TACTICAL SENSORS';
      }
      if (this.dialogueText) {
        this.dialogueText.textContent =
          'WARNING: Cataclysmic subspace displacement detected! Hostile Goliath Battleship and Gorgon Carrier rupturing hyperspace directly over Planet Segma!';
      }
      if (this.flightHint) {
        this.flightHint.innerHTML = 'HOSTILE WARP DETECTED // ENEMY CAPITAL SHIPS ENTERING SECTOR';
      }
      if (this.spaceAudio && this.spaceAudio.playBossWarning) {
        this.spaceAudio.playBossWarning();
      }
      if (this.spaceAudio && this.spaceAudio.playPlanetImpact) {
        this.spaceAudio.playPlanetImpact();
      }
      if (this.gameManager.voiceAnnouncer) {
        this.gameManager.voiceAnnouncer.speak(
          'Warning: Cataclysmic subspace displacement detected! Hostile Battleship and Carrier rupturing hyperspace!',
          true,
          'AVIONICS'
        );
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
        if (this.speakerName) {
          this.speakerName.textContent = 'ADMIRAL VANCE // ALLIED ARMADA';
        }
        if (this.dialogueText) {
          this.dialogueText.textContent =
            'ALLIED ARMADA, ALL WEAPONS FREE! Concentrate all spinal railguns, torpedoes, and heavy batteries on the enemy Battleship and Carrier! Obliterate them!';
        }
        if (this.flightHint) {
          this.flightHint.innerHTML = 'FLEET ENGAGEMENT ACTIVE // ARMADA CONCENTRATING FIRE';
        }
        if (this.gameManager.voiceAnnouncer) {
          this.gameManager.voiceAnnouncer.speak(
            'Allied armada, all weapons free! Concentrate all firepower on the enemy capital ships! Obliterate them!',
            true,
            'COMMAND'
          );
        }
      }

      // Battleship explosion beat at 12.5s
      if (t >= 12.5 && !this.battleshipDestroyed) {
        this.battleshipDestroyed = true;
        this.destroyEnemyBattleship();
      }

      // Carrier explosion beat at 14.8s
      if (t >= 14.8 && !this.carrierDestroyed) {
        this.carrierDestroyed = true;
        this.destroyEnemyCarrier();
      }
    }

    // ── ACT IV: Stealth Escape (15.8s – 20.8s) ──
    if (t >= 15.8) {
      if (this.battlePhase !== 'FINISHED') {
        this.battlePhase = 'STEALTH_ESCAPE';
      }

      if (!this.escapingStealthFighter) {
        this.spawnEscapingStealthFighter();
      }

      if (t >= 18.5 && !this.stealthEscaped) {
        this.stealthEscaped = true;
        if (this.statusTag) {
          this.statusTag.textContent = 'DIRECTIVE ASSIGNED // PURSUE AND ELIMINATE';
          this.statusTag.style.color = '#ffaa00';
        }
        if (this.speakerName) {
          this.speakerName.textContent = 'HIGH COMMAND';
        }
        if (this.dialogueText) {
          this.dialogueText.textContent =
            'COMMANDER: You are tasked with hunting down that escaped stealth ship! Pursue it through the asteroid belt and eliminate it before it jumps to hyperspace!';
        }
        if (this.flightHint) {
          this.flightHint.innerHTML = 'MISSION ASSIGNED // PREPARE TO PURSUE ESCAPED STEALTH VESSEL';
        }
        if (this.gameManager.voiceAnnouncer) {
          this.gameManager.voiceAnnouncer.speak(
            'Commander: You are tasked with hunting down that escaped stealth ship! Eliminate it before it jumps to hyperspace!',
            true,
            'COMMAND'
          );
        }
      }
    }

    // ── ACT V: Transition to Wave 1 (at 20.8s) ──
    if (t >= 20.8) {
      this.battlePhase = 'FINISHED';
      this.endCinematic();
    }
  }

  destroyEnemyBattleship() {
    const pos = this.enemyBattleship ? this.enemyBattleship.position : new THREE.Vector3(-40, -4, -140);
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
    if (this.enemyBattleship) {
      this.enemyBattleship.visible = false;
    }
    if (this.statusTag) {
      this.statusTag.textContent = 'TARGET OBLITERATED // ENEMY BATTLESHIP DESTROYED';
      this.statusTag.style.color = '#00f3ff';
    }
    if (this.speakerName) {
      this.speakerName.textContent = 'AEGIS TACTICAL SENSORS';
    }
    if (this.dialogueText) {
      this.dialogueText.textContent =
        'CONFIRMED HIT: Enemy Goliath Battleship reactor core detonated! Behemoth destroyed! Concentrate fire on the Carrier!';
    }
  }

  destroyEnemyCarrier() {
    const pos = this.enemyCarrier ? this.enemyCarrier.position : new THREE.Vector3(55, 18, -150);
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
    if (this.enemyCarrier) {
      this.enemyCarrier.visible = false;
    }
    if (this.statusTag) {
      this.statusTag.textContent = 'TARGET OBLITERATED // ENEMY CARRIER DESTROYED';
      this.statusTag.style.color = '#00f3ff';
    }
    if (this.speakerName) {
      this.speakerName.textContent = 'ADMIRAL VANCE // ALLIED ARMADA';
    }
    if (this.dialogueText) {
      this.dialogueText.textContent =
        'DIRECT HIT! Catastrophic secondary explosion on the Gorgon Carrier! Hostile capital fleet eliminated!';
    }
  }

  spawnEscapingStealthFighter() {
    const startPos = new THREE.Vector3(55, 18, -145);
    this.escapingStealthFighter = assetManager.createProceduralShipModel('STEALTH');
    this.escapingStealthFighter.position.copy(startPos);
    this.escapingStealthFighter.scale.set(1.5, 1.5, 1.5);
    this.applyAAAFactionMaterials(this.escapingStealthFighter, 'HOSTILE', 3.5);

    // Twin crimson engine afterburners
    this.attachEngineThrusters(
      this.escapingStealthFighter,
      [{ x: -1.2, y: 0, z: 4.0 }, { x: 1.2, y: 0, z: 4.0 }],
      'HOSTILE',
      1.4,
      7.0
    );
    this.cinematicGroup.add(this.escapingStealthFighter);

    this.stealthEscapeProgress = 0;
    this.stealthCloakTriggered = false;

    if (this.spaceAudio && this.spaceAudio.playBossWarning) {
      this.spaceAudio.playBossWarning();
    }
    if (this.statusTag) {
      this.statusTag.textContent = 'PERIMETER BREACH // STEALTH PROTOTYPE ESCAPING';
      this.statusTag.style.color = '#ff0055';
    }
    if (this.speakerName) {
      this.speakerName.textContent = 'AEGIS TACTICAL SURVEILLANCE';
    }
    if (this.dialogueText) {
      this.dialogueText.textContent =
        'WARNING! An advanced enemy stealth prototype has slipped through the blast radius! It is cloaking and escaping into the asteroid corridor!';
    }
    if (this.flightHint) {
      this.flightHint.innerHTML = 'ALERT // ENEMY STEALTH VESSEL HAS ESCAPED THE BLAST';
    }
    if (this.gameManager.voiceAnnouncer) {
      this.gameManager.voiceAnnouncer.speak(
        'Warning! An advanced enemy stealth prototype slipped through the blast radius! It is cloaking and escaping into the asteroid corridor!',
        true,
        'AVIONICS'
      );
    }
  }

  updateStealthEscape(dt) {
    if (!this.escapingStealthFighter) return;
    this.stealthEscapeProgress += dt * 0.22;
    const p = THREE.MathUtils.clamp(this.stealthEscapeProgress, 0, 1);

    // Quadratic bezier curve from Carrier explosion through foreground to deep space
    const p0 = new THREE.Vector3(55, 18, -145);
    const p1 = new THREE.Vector3(12, 5, -45);
    const p2 = new THREE.Vector3(-30, 12, -280);

    const oneMinusP = 1 - p;
    const curPos = new THREE.Vector3()
      .addScaledVector(p0, oneMinusP * oneMinusP)
      .addScaledVector(p1, 2 * oneMinusP * p)
      .addScaledVector(p2, p * p);

    // Orientation tangent
    const nextP = Math.min(1.0, p + 0.02);
    const oneMinusNext = 1 - nextP;
    const nextPos = new THREE.Vector3()
      .addScaledVector(p0, oneMinusNext * oneMinusNext)
      .addScaledVector(p1, 2 * oneMinusNext * nextP)
      .addScaledVector(p2, nextP * nextP);

    this.escapingStealthFighter.position.copy(curPos);
    this.escapingStealthFighter.lookAt(nextPos);

    // Cloaking effect engages at p >= 0.35 (around t = 17.4s)
    if (p >= 0.35) {
      if (!this.stealthCloakTriggered) {
        this.stealthCloakTriggered = true;
        if (this.particleManager) {
          this.particleManager.createEmpShockwave(curPos, 0xaa00ff, 20.0);
          this.particleManager.createHitSparks(curPos, 0xff0077);
        }
        if (this.spaceAudio && this.spaceAudio.playQuantumArc) {
          this.spaceAudio.playQuantumArc(0);
        }
      }

      // Fade opacity from 1.0 down to 0.12
      const cloakOpacity = Math.max(0.12, 1.0 - (p - 0.35) * 3.0);
      this.escapingStealthFighter.traverse(child => {
        if (child.isMesh && child.material) {
          child.material.transparent = true;
          child.material.opacity = cloakOpacity;
        }
      });
    }
  }

  /**
   * Updates Space Station solar panel arrays:
   * - Rotates SARJ gimbals smoothly to simulate star-tracking
   * - Flashes port and starboard wingtip navigation strobes in realistic aviation cadence
   */
  updateStationSolarArrays(dt) {
    if (!this.stationSolarArrays || this.stationSolarArrays.length === 0) return;

    // Slow solar tracking gimbal tilt
    const sunTrackAngle = Math.sin(this.elapsedTime * 0.15) * 0.25;

    // Aviation strobe cadence: short flash every 1.2 seconds
    const strobeCycle = (this.elapsedTime % 1.2);
    const isFlashing = strobeCycle < 0.12 || (strobeCycle > 0.22 && strobeCycle < 0.34);

    this.stationSolarArrays.forEach((array) => {
      if (array.group) {
        array.group.rotation.x = sunTrackAngle;
      }
      if (array.strobe) {
        array.strobe.intensity = isFlashing ? 4.5 : 0.4;
      }
      if (array.beacon && array.beacon.material) {
        array.beacon.material.opacity = isFlashing ? 1.0 : 0.3;
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
        const targetDestPos = new THREE.Vector3(-36, 1, -82);
        this.alliedDestroyer.position.lerp(targetDestPos, dt * 1.5);
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
        const targetFrigatePos = new THREE.Vector3(28, 12, -78);
        this.alliedEscort.position.lerp(targetFrigatePos, dt * 1.8);

        // Bank hard 30 degrees (roll: 0.35) so vertical missile decks angle directly at Carrier
        this.alliedEscort.rotation.z = THREE.MathUtils.lerp(this.alliedEscort.rotation.z, 0.35, dt * 3.5);
        this.alliedEscort.rotation.x = THREE.MathUtils.lerp(this.alliedEscort.rotation.x, -0.12, dt * 3.5);
        this.alliedEscort.rotation.y = THREE.MathUtils.lerp(this.alliedEscort.rotation.y, 0.18, dt * 3.5);
      }
    }

    // 3. Enemy Battleship Dreadnought Movement & Damage Shudder
    if (this.enemyBattleship && !this.battleshipDestroyed && this.warpCompleted) {
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
    }

    // 4. Enemy Carrier Movement & Damage Shudder
    if (this.enemyCarrier && !this.carrierDestroyed && this.warpCompleted) {
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
    }
  }

  updateCinematicBattle(dt) {
    // 1. Update and remove fading railgun slugs and beams
    for (let i = this.cinematicBeams.length - 1; i >= 0; i--) {
      const beam = this.cinematicBeams[i];
      beam.life -= dt;
      if (beam.life <= 0) {
        this.cinematicGroup.remove(beam.mesh);
        if (beam.mesh.geometry) beam.mesh.geometry.dispose();
        if (beam.mesh.material) beam.mesh.material.dispose();
        this.cinematicBeams.splice(i, 1);
      } else {
        if (beam.mesh.material) {
          beam.mesh.material.opacity = Math.max(0, beam.life / beam.maxLife);
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
        this.cinematicGroup.remove(torp.mesh);
        if (torp.mesh.geometry) torp.mesh.geometry.dispose();
        if (torp.mesh.material) torp.mesh.material.dispose();
        this.cinematicTorpedoes.splice(i, 1);
      } else {
        // Multi-stage proportional navigation trajectory: arc upward then dive toward target
        const curPos = new THREE.Vector3().lerpVectors(torp.from, torp.to, torp.t);
        curPos.y += Math.sin(torp.t * Math.PI) * 6.5;
        curPos.x += Math.sin(torp.t * Math.PI * 2.0 + torp.phase) * 2.2;
        torp.mesh.position.copy(curPos);

        // Rocket exhaust trail sparks
        if (this.particleManager && Math.random() > 0.35) {
          this.particleManager.createHitSparks(curPos, 0x00f3ff, 2);
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
          const fromPos = this.alliedDestroyer.position.clone().add(new THREE.Vector3(0, 0, -26));
          const toPos = this.enemyBattleship.position.clone().add(new THREE.Vector3(
            (Math.random() - 0.5) * 16,
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 12
          ));
          this.fireRailgunBeam(fromPos, toPos, 0x00f3ff, 0.18, true);

          // Spinal recoil kickback on Destroyer
          this.destroyerRecoil = 0.95;
          // Kinetic shudder on Battleship
          this.battleshipShudder = Math.min(2.5, this.battleshipShudder + 0.5);

          if (this.particleManager) {
            this.particleManager.createHitSparks(toPos, 0x00f3ff, 14);
            if (Math.random() > 0.3) {
              this.particleManager.createExplosion(toPos, 0xff5500, 14, 1.4);
            }
          }
          if (this.spaceAudio && this.spaceAudio.playHeavyCannonSound) {
            this.spaceAudio.playHeavyCannonSound(-1.0);
          }
        }

        // Allied Frigate fires VLS Swarm Torpedoes at Carrier
        if (this.alliedEscort && !this.carrierDestroyed && this.enemyCarrier) {
          const fromPos = this.alliedEscort.position.clone().add(new THREE.Vector3(
            (Math.random() > 0.5 ? 4.5 : -4.5), 2.0, -18
          ));
          const toPos = this.enemyCarrier.position.clone().add(new THREE.Vector3(
            (Math.random() - 0.5) * 28,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 22
          ));
          this.fireTorpedo(fromPos, toPos);
          if (this.spaceAudio && this.spaceAudio.playLaserPew) {
            this.spaceAudio.playLaserPew(1.0);
          }
        }

        // Player Vessel fires heavy plasma cannon bolts towards Carrier
        if (!this.carrierDestroyed && this.enemyCarrier) {
          const playerMuzzle = this.playerPos.clone().add(new THREE.Vector3((Math.random() > 0.5 ? 3.5 : -3.5), 0, -12));
          const carrierHit = this.enemyCarrier.position.clone().add(new THREE.Vector3(
            (Math.random() - 0.5) * 24, 0, (Math.random() - 0.5) * 18
          ));
          this.fireRailgunBeam(playerMuzzle, carrierHit, 0x00d0ff, 0.14, false);
          if (this.particleManager) {
            this.particleManager.createHitSparks(carrierHit, 0x00d0ff, 8);
          }
        }

        // Enemy Battleship fires heavy red plasma bursts back at Allied line
        if (!this.battleshipDestroyed && this.enemyBattleship) {
          const enemyMuzzle = this.enemyBattleship.position.clone().add(new THREE.Vector3(0, 0, 18));
          const targetPos = new THREE.Vector3(-32 + (Math.random() - 0.5) * 22, 2, -35);
          this.fireEnemyPlasma(enemyMuzzle, targetPos);
          if (this.spaceAudio && this.spaceAudio.playEnemyLaser) {
            this.spaceAudio.playEnemyLaser(-0.8);
          }
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
              const fromPos = new THREE.Vector3();
              muzzle.getWorldPosition(fromPos);

              const targetPos = (!this.carrierDestroyed && this.enemyCarrier)
                ? this.enemyCarrier.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 30, (Math.random() - 0.5) * 12, 0))
                : new THREE.Vector3(30 + (Math.random() - 0.5) * 20, 10, -140);

              this.fireRailgunBeam(fromPos, targetPos, 0x00ff88, 0.09, false);
            }
          }
        }
      }
    }
  }

  fireRailgunBeam(from, to, colorHex = 0x00f3ff, duration = 0.16, hasSlug = false) {
    const dist = from.distanceTo(to);
    const beamRadius = hasSlug ? 0.48 : 0.28;
    const beamGeo = new THREE.CylinderGeometry(beamRadius, beamRadius, dist, 6);
    beamGeo.rotateX(Math.PI / 2);
    const beamMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.copy(from).lerp(to, 0.5);
    beam.lookAt(to);

    // If spinal railgun slug, add high-intensity bright white core
    if (hasSlug) {
      const coreGeo = new THREE.CylinderGeometry(0.18, 0.18, dist, 6);
      coreGeo.rotateX(Math.PI / 2);
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      beam.add(coreMesh);
    }

    this.cinematicGroup.add(beam);
    this.cinematicBeams.push({ mesh: beam, life: duration, maxLife: duration });
  }

  fireTorpedo(from, to) {
    const torpGeo = new THREE.ConeGeometry(0.75, 2.2, 8);
    torpGeo.rotateX(Math.PI / 2);
    const torpMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });
    const torp = new THREE.Mesh(torpGeo, torpMat);
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
    const boltGeo = new THREE.CylinderGeometry(0.32, 0.32, 6.0, 6);
    boltGeo.rotateX(Math.PI / 2);
    const boltMat = new THREE.MeshBasicMaterial({
      color: 0xff0033,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });
    const bolt = new THREE.Mesh(boltGeo, boltMat);
    bolt.position.copy(from);
    bolt.lookAt(to);
    this.cinematicGroup.add(bolt);

    const dir = new THREE.Vector3().subVectors(to, from).normalize();
    this.cinematicProjectiles.push({
      mesh: bolt,
      velocity: dir.multiplyScalar(220.0),
      life: 1.2
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

    // Materialize Carrier and Battleship from portal
    if (p > 0.25) {
      if (this.enemyCarrier) {
        this.enemyCarrier.visible = true;
        const s = THREE.MathUtils.lerp(0.001, 1.0, (p - 0.25) / 0.75);
        this.enemyCarrier.scale.set(s, s, s);
        this.enemyCarrier.position.z = -180 + (p - 0.25) * 45;
      }
      if (this.enemyBattleship) {
        this.enemyBattleship.visible = true;
        const s = THREE.MathUtils.lerp(0.001, 0.85, (p - 0.25) / 0.75);
        this.enemyBattleship.scale.set(s, s, s);
        this.enemyBattleship.position.z = -170 + (p - 0.25) * 55;
      }
    }

    if (p >= 1.0) {
      this.warpCompleted = true;
      if (this.warpPortalCarrier) this.warpPortalCarrier.visible = false;
      if (this.warpPortalBattleship) this.warpPortalBattleship.visible = false;
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

  updateCamera(dt) {
    if (!this.playerMesh) return;

    const currentVessel = this.playerVesselOptions[this.currentVesselIndex];

    if (this.cameraMode === 'PANORAMA') {
      // PANORAMIC ALL-ASSETS OVERVIEW:
      // High-angle strategic vantage point positioned to encompass:
      // 1. Planet Segma & glowing atmospheric ring (bottom/side horizon)
      // 2. Space Station Citadel & extended dual solar panel wings (starboard sector)
      // 3. Allied Destroyer Aegis & Escort Frigate (center-port combat flank)
      // 4. Player Controllable Flagship (anchoring formation foreground)
      // 5. Hostile Goliath Battleship & Gorgon Carrier (forward invasion line)
      const baseOverviewPos = new THREE.Vector3(-12.0, 72.0, 115.0);
      const baseLookAt = new THREE.Vector3(18.0, 2.0, -85.0);

      this.camTargetPos.copy(baseOverviewPos);
      this.camLookAt.copy(baseLookAt);
    } else if (this.cameraMode === 'DIRECTOR') {
      const t = this.elapsedTime;
      if (t < 5.0) {
        // Act I: Low dramatic wide angle framing Planet Segma at bottom-right while armada warps in
        const angle = t * 0.08;
        this.camTargetPos.set(
          this.playerPos.x - 24.0 + Math.sin(angle) * 8.0,
          this.playerPos.y + 14.0,
          this.playerPos.z + 46.0
        );
        this.camLookAt.set(
          this.playerPos.x + 8.0,
          this.playerPos.y + 2.0,
          this.playerPos.z - 70.0
        );
      } else if (t < 9.0) {
        // Act II: Hostile Incursion - over-the-shoulder view looking at the ominous crimson warp vortexes
        this.camTargetPos.set(-12.0, 16.0, 38.0);
        this.camLookAt.set(10.0, 8.0, -145.0);
      } else if (t < 15.8) {
        // Act III: Broad combat tracking shot - allied armada unleashing broadsides at capital ships
        const combatPan = (t - 9.0) * 0.12;
        this.camTargetPos.set(-28.0 + Math.sin(combatPan) * 14.0, 18.0, 28.0);
        const focusX = this.carrierDestroyed ? -40.0 : (this.battleshipDestroyed ? 55.0 : 8.0);
        this.camLookAt.set(focusX, 6.0, -145.0);
      } else {
        // Act IV: Dramatic tracking shot following the escaping stealth fighter
        if (this.escapingStealthFighter) {
          const sPos = this.escapingStealthFighter.position;
          this.camTargetPos.set(sPos.x + 16.0, sPos.y + 8.0, sPos.z + 36.0);
          this.camLookAt.set(sPos.x, sPos.y, sPos.z - 40.0);
        } else {
          this.camTargetPos.set(0, 14.0, 48.0);
          this.camLookAt.set(0, 4.0, -90.0);
        }
      }
    } else if (this.cameraMode === 'CHASE') {
      // Dynamic 3rd person chase camera tailored to capital vessel dimensions
      let chaseOffset = new THREE.Vector3(0, 9.5, 42.0);
      let lookOffset = new THREE.Vector3(0, 2.0, -80.0);

      if (currentVessel === 'DESTROYER') {
        chaseOffset.set(0, 14.0, 58.0);
        lookOffset.set(0, 4.0, -90.0);
      } else if (currentVessel === 'INTERCEPTOR') {
        chaseOffset.set(0, 3.5, 14.0);
        lookOffset.set(0, 0.5, -40.0);
      }

      this.camTargetPos.copy(this.playerPos).add(chaseOffset.applyEuler(this.playerRot));
      this.camLookAt.copy(this.playerPos).add(lookOffset.applyEuler(this.playerRot));
    } else if (this.cameraMode === 'COCKPIT') {
      // 1st-person forward cockpit bridge perspective
      let cockpitOffset = new THREE.Vector3(0, 2.4, -14.0);
      let lookOffset = new THREE.Vector3(0, 2.0, -140.0);

      if (currentVessel === 'DESTROYER') {
        cockpitOffset.set(0, 5.2, -26.0);
        lookOffset.set(0, 4.0, -160.0);
      } else if (currentVessel === 'INTERCEPTOR') {
        cockpitOffset.set(0, 0.5, -0.6);
        lookOffset.set(0, 0.2, -60.0);
      }

      this.camTargetPos.copy(this.playerPos).add(cockpitOffset.applyEuler(this.playerRot));
      this.camLookAt.copy(this.playerPos).add(lookOffset.applyEuler(this.playerRot));
    }

    // Apply Interactive Zoom Scaling & Orbit Angle Offsets (Pitch & Yaw)
    // Relative to the current camera look-at anchor point
    const camOffset = new THREE.Vector3().subVectors(this.camTargetPos, this.camLookAt);

    // Apply zoom multiplier (zoom factor > 1 pushes camera outward for wider asset coverage)
    camOffset.multiplyScalar(this.cameraZoomFactor);

    // Apply yaw orbit rotation around vertical axis (X angle)
    if (this.cameraOrbitAngleX !== 0) {
      camOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraOrbitAngleX);
    }

    // Apply pitch elevation angle (Y angle)
    if (this.cameraOrbitAngleY !== 0) {
      const rightAxis = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraOrbitAngleX);
      camOffset.applyAxisAngle(rightAxis, this.cameraOrbitAngleY);
    }

    this.camTargetPos.copy(this.camLookAt).add(camOffset);

    this.camera.position.lerp(this.camTargetPos, dt * 5.0);
    this.camera.lookAt(this.camLookAt);
  }

  endCinematic() {
    if (!this.isActive) return;
    this.isActive = false;

    document.body.classList.remove('cinematic-active');
    if (this.gameManager.playerShip) {
      if (this.gameManager.playerShip.mesh) this.gameManager.playerShip.mesh.visible = true;
      if (this.gameManager.playerShip.meshGroup) this.gameManager.playerShip.meshGroup.visible = true;
    }

    // Restore gameplay fog density
    if (this.gameManager.spaceScene && this.gameManager.spaceScene.scene && this.gameManager.spaceScene.scene.fog) {
      this.gameManager.spaceScene.scene.fog.density = 0.003;
    }

    // Clean up cinematic entities, projectiles, beams, and torpedoes
    this.scene.remove(this.cinematicGroup);
    this.cinematicProjectiles = [];
    this.cinematicBeams = [];
    this.cinematicTorpedoes = [];
    this.engineFXList = [];
    this.alliedPortals = [];
    this.escapingStealthFighter = null;

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
