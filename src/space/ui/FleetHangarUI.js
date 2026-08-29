import * as THREE from 'three';

/**
 * Tactical Holographic Fleet & Hangar Refit UI
 * Provides an interactive 3D turntable workshop to customize ships, weapons, and defense modules:
 * - 4 Selectable Starfighter Classes
 * - Modular Hardpoint Customizer (Weapons, Defense Matrix, Auxiliary Thrusters)
 * - Real-Time Canvas Stat Radar Chart (Firepower, Defense, Speed, Agility)
 * - Mobile Touch Responsive Layout
 */
export class FleetHangarUI {
  constructor(gameManager) {
    this.gameManager = gameManager;
    this.container = null;
    this.isOpen = false;
    this.currentShipIndex = 0;

    // Mini 3D Preview Engine
    this.previewRenderer = null;
    this.previewScene = null;
    this.previewCamera = null;
    this.previewMeshGroup = null;
    this.animFrameId = null;

    // Ship Classes Catalog
    this.ships = [
      {
        id: 'INTERCEPTOR',
        name: 'VG-01 VANGUARD INTERCEPTOR',
        role: 'High-Agility Air Superiority Fighter',
        stats: { firepower: 85, defense: 70, speed: 95, agility: 92 },
        color: 0x00f3ff,
        description: 'Standard issue Starbound fleet interceptor with balanced plasma cannons and superior atmospheric maneuvering.'
      },
      {
        id: 'JUGGERNAUT',
        name: 'TITAN GOLIATH JUGGERNAUT',
        role: 'Heavy Armored Siege Dreadnought',
        stats: { firepower: 98, defense: 95, speed: 60, agility: 55 },
        color: 0xffaa00,
        description: 'Reinforced titanium chassis carrying heavy twin-railgun batteries and fortified superconducting shielding.'
      },
      {
        id: 'STEALTH',
        name: 'PHANTOM STEALTHWING',
        role: 'Covert Recon & Infiltration Fighter',
        stats: { firepower: 78, defense: 60, speed: 100, agility: 98 },
        color: 0xff0055,
        description: 'Equipped with radar-absorbent faceted armor and active phase-cloaking emitter matrices for stealth ambushes.'
      },
      {
        id: 'SOLAR',
        name: 'HELIOS SOLAR CORSAIR',
        role: 'Overclocked Solar Energy Striker',
        stats: { firepower: 92, defense: 80, speed: 88, agility: 85 },
        color: 0xffdd00,
        description: 'Taps directly into solar stellar radiation to power sustained beam lances and high-output afterburners.'
      }
    ];

    this._createDOM();
  }

  _createDOM() {
    // Check if already in DOM
    if (document.getElementById('hangar-modal-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'hangar-modal-overlay';
    overlay.className = 'hangar-overlay hidden';
    overlay.innerHTML = `
      <div class="hangar-window">
        <div class="hangar-header">
          <div class="hangar-title-group">
            <span class="hangar-badge">FLEET DOCK // REFIT</span>
            <h2 class="hangar-title">TACTICAL STARFIGHTER HANGAR</h2>
          </div>
          <button id="btn-close-hangar" class="hangar-close-btn">&times;</button>
        </div>

        <div class="hangar-body">
          <!-- Left: 3D Holographic Turntable Canvas -->
          <div class="hangar-preview-panel">
            <div class="preview-canvas-container">
              <canvas id="hangar-3d-canvas"></canvas>
              <div class="hologram-grid-overlay"></div>
              <div class="ship-holo-tag" id="ship-holo-tag">VG-01 VANGUARD</div>
            </div>
            
            <!-- Ship Selection Carousel Buttons -->
            <div class="ship-selector-bar">
              <button id="btn-prev-ship" class="btn-ship-nav">&larr; PREV</button>
              <span id="ship-page-indicator" class="ship-indicator">1 / 4</span>
              <button id="btn-next-ship" class="btn-ship-nav">NEXT &rarr;</button>
            </div>
          </div>

          <!-- Right: Specs, Hardpoints & Radar Chart -->
          <div class="hangar-specs-panel">
            <div class="ship-info-card">
              <h3 id="ship-name-display" class="ship-name">VG-01 VANGUARD</h3>
              <p id="ship-role-display" class="ship-role">High-Agility Superiority Fighter</p>
              <p id="ship-desc-display" class="ship-desc">Standard issue Starbound fleet interceptor with balanced plasma cannons.</p>
            </div>

            <!-- Hardpoints Loadout Selectors -->
            <div class="hardpoint-section">
              <div class="hardpoint-slot">
                <label>AESTHETIC LIVERY SKIN</label>
                <select id="sel-livery-skin" class="hangar-select">
                  <option value="DEFAULT">Standard Naval Titanium</option>
                  <option value="VOID_OBSIDIAN">Void Obsidian (Stealth Onyx & Violet)</option>
                  <option value="CARBON_STEALTH">Carbon Stealth (Carbon Weave & Cyan)</option>
                  <option value="HAZARD_INDUSTRIAL">Hazard Industrial (Amber Chevrons)</option>
                  <option value="CORONAL_GOLD">Coronal Gold (Solar Plated Alloy)</option>
                  <option value="CYBER_NEON">Cyber Neon (Synthwave Magenta/Cyan)</option>
                </select>
              </div>

              <div class="hardpoint-slot">
                <label>SUPERWEAPON MUNITION</label>
                <select id="sel-superweapon" class="hangar-select">
                  <option value="ANTIMATTER_NUKE">Sub-Space Anti-Matter Nuke (Screen-Clear)</option>
                  <option value="HYPER_RAILGUN">Spinal Hyper-Railgun (Kinetic Piercing)</option>
                  <option value="TACHYON_LANCE">Tachyon Beam Lance (Continuous Melt)</option>
                </select>
              </div>

              <div class="hardpoint-slot">
                <label>REACTOR CORE</label>
                <select id="sel-reactor-core" class="hangar-select">
                  <option value="DEFAULT">Standard Fusion Core (Balanced)</option>
                  <option value="OVERCLOCKED_PLASMA">Overclocked Plasma (+25% Rapid Fire)</option>
                  <option value="TITANIUM_AEGIS">Titanium Aegis Core (+100% Shield Capacity)</option>
                </select>
              </div>

              <div class="hardpoint-slot">
                <label>THRUSTER MANIFOLD</label>
                <select id="sel-thruster-manifold" class="hangar-select">
                  <option value="DEFAULT">Standard Ion Drive</option>
                  <option value="AFTERBURNER">Hyper-Boost Afterburner (+35% Top Speed)</option>
                  <option value="VECTOR_RCS">Vector RCS Thrusters (Instant 360° Agility)</option>
                </select>
              </div>
            </div>

            <!-- Radar Telemetry Chart -->
            <div class="radar-chart-container">
              <canvas id="hangar-radar-canvas" width="220" height="140"></canvas>
            </div>

            <!-- Action Buttons -->
            <div class="hangar-actions">
              <button id="btn-equip-launch" class="btn-hangar-launch">EQUIP & LAUNCH TO SECTOR</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.container = overlay;

    // Attach Event Listeners
    document.getElementById('btn-close-hangar')?.addEventListener('click', () => this.close());
    document.getElementById('btn-prev-ship')?.addEventListener('click', () => this.prevShip());
    document.getElementById('btn-next-ship')?.addEventListener('click', () => this.nextShip());
    document.getElementById('btn-equip-launch')?.addEventListener('click', () => this.equipAndLaunch());

    // Hook HUD Hangar Button
    document.querySelectorAll('#btn-hangar, .btn-hangar-open, [data-action="hangar"]').forEach(btn => {
      btn.addEventListener('click', () => this.open());
    });

    this._injectStyles();
  }

  _injectStyles() {
    if (document.getElementById('hangar-custom-styles')) return;
    const style = document.createElement('style');
    style.id = 'hangar-custom-styles';
    style.textContent = `
      .hangar-overlay {
        position: fixed;
        inset: 0;
        background: rgba(4, 8, 16, 0.88);
        backdrop-filter: blur(12px);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
      }
      .hangar-overlay.hidden { display: none !important; }
      
      .hangar-window {
        background: linear-gradient(145deg, #09121d, #040810);
        border: 1px solid rgba(0, 243, 255, 0.4);
        box-shadow: 0 0 40px rgba(0, 243, 255, 0.15), inset 0 0 20px rgba(0, 243, 255, 0.05);
        border-radius: 12px;
        width: 100%;
        max-width: 860px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        font-family: 'Rajdhani', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .hangar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 14px 20px;
        border-bottom: 1px solid rgba(0, 243, 255, 0.2);
        background: rgba(0, 243, 255, 0.04);
      }
      .hangar-badge {
        font-size: 11px;
        letter-spacing: 2px;
        color: #00f3ff;
        font-weight: 700;
      }
      .hangar-title {
        margin: 2px 0 0 0;
        font-size: 18px;
        color: #ffffff;
        letter-spacing: 1.5px;
      }
      .hangar-close-btn {
        background: transparent;
        border: none;
        color: #00f3ff;
        font-size: 28px;
        cursor: pointer;
        line-height: 1;
      }

      .hangar-body {
        display: flex;
        flex: 1;
        overflow-y: auto;
      }

      @media (max-width: 768px) {
        .hangar-body { flex-direction: column; }
      }

      .hangar-preview-panel {
        flex: 1.1;
        padding: 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
        border-right: 1px solid rgba(0, 243, 255, 0.15);
      }

      .preview-canvas-container {
        position: relative;
        width: 100%;
        height: 260px;
        background: radial-gradient(circle at center, #0d1e30, #040912);
        border: 1px solid rgba(0, 243, 255, 0.25);
        border-radius: 8px;
        overflow: hidden;
      }
      #hangar-3d-canvas {
        width: 100%;
        height: 100%;
        display: block;
      }
      .ship-holo-tag {
        position: absolute;
        bottom: 8px;
        left: 12px;
        font-size: 11px;
        color: #00f3ff;
        letter-spacing: 1px;
        font-weight: 700;
        background: rgba(0, 0, 0, 0.6);
        padding: 2px 8px;
        border-radius: 4px;
        border-left: 2px solid #00f3ff;
      }

      .ship-selector-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        margin-top: 12px;
      }
      .btn-ship-nav {
        background: rgba(0, 243, 255, 0.1);
        border: 1px solid rgba(0, 243, 255, 0.4);
        color: #00f3ff;
        padding: 6px 14px;
        font-weight: 700;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .btn-ship-nav:hover {
        background: #00f3ff;
        color: #000;
      }
      .ship-indicator {
        color: #8fa0b5;
        font-size: 13px;
        font-weight: 600;
      }

      .hangar-specs-panel {
        flex: 1.2;
        padding: 16px 20px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }

      .ship-name {
        margin: 0;
        font-size: 19px;
        color: #00f3ff;
        letter-spacing: 1px;
      }
      .ship-role {
        margin: 2px 0 6px 0;
        font-size: 12px;
        color: #ffaa00;
        font-weight: 600;
      }
      .ship-desc {
        margin: 0 0 12px 0;
        font-size: 12px;
        color: #8fa0b5;
        line-height: 1.4;
      }

      .hardpoint-section {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 12px;
      }
      .hardpoint-slot label {
        display: block;
        font-size: 10px;
        letter-spacing: 1px;
        color: #00f3ff;
        margin-bottom: 3px;
        font-weight: 700;
      }
      .hangar-select {
        width: 100%;
        background: #06101c;
        border: 1px solid rgba(0, 243, 255, 0.3);
        color: #e0f0ff;
        padding: 6px 10px;
        border-radius: 4px;
        font-size: 12px;
        outline: none;
      }

      .radar-chart-container {
        display: flex;
        justify-content: center;
        margin-bottom: 12px;
      }

      .btn-hangar-launch {
        width: 100%;
        background: linear-gradient(90deg, #00f3ff, #0099ff);
        border: none;
        color: #040810;
        font-weight: 800;
        letter-spacing: 1.5px;
        padding: 10px;
        border-radius: 6px;
        cursor: pointer;
        box-shadow: 0 0 16px rgba(0, 243, 255, 0.4);
        transition: all 0.2s;
      }
      .btn-hangar-launch:hover {
        transform: translateY(-1px);
        box-shadow: 0 0 24px rgba(0, 243, 255, 0.7);
      }
    `;
    document.head.appendChild(style);
  }

  init3DPreview() {
    const canvas = document.getElementById('hangar-3d-canvas');
    if (!canvas || this.previewRenderer) return;

    const width = canvas.clientWidth || 360;
    const height = canvas.clientHeight || 260;

    this.previewScene = new THREE.Scene();
    this.previewCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.previewCamera.position.set(0, 4, 12);
    this.previewCamera.lookAt(0, 0, 0);

    this.previewRenderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.previewRenderer.setSize(width, height);
    this.previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Lighting
    const amb = new THREE.AmbientLight(0xffffff, 1.2);
    this.previewScene.add(amb);

    const dir = new THREE.DirectionalLight(0x00f3ff, 2.5);
    dir.position.set(5, 8, 5);
    this.previewScene.add(dir);

    const rim = new THREE.DirectionalLight(0xff0055, 1.8);
    rim.position.set(-5, -4, -5);
    this.previewScene.add(rim);

    this.previewMeshGroup = new THREE.Group();
    this.previewScene.add(this.previewMeshGroup);

    this._update3DModel();
    this._startAnimLoop();
  }

  _startAnimLoop() {
    const animate = () => {
      if (this.isOpen && this.previewRenderer && this.previewScene && this.previewCamera) {
        if (this.previewMeshGroup) {
          this.previewMeshGroup.rotation.y += 0.015;
          this.previewMeshGroup.rotation.x = Math.sin(Date.now() * 0.002) * 0.08;
        }
        this.previewRenderer.render(this.previewScene, this.previewCamera);
      }
      this.animFrameId = requestAnimationFrame(animate);
    };
    animate();
  }

  _update3DModel() {
    if (!this.previewMeshGroup) return;

    // Clear old preview meshes
    while (this.previewMeshGroup.children.length > 0) {
      this.previewMeshGroup.remove(this.previewMeshGroup.children[0]);
    }

    const ship = this.ships[this.currentShipIndex];
    const mat = new THREE.MeshStandardMaterial({
      color: ship.color,
      metalness: 0.9,
      roughness: 0.2,
      emissive: ship.color,
      emissiveIntensity: 0.3
    });

    if (ship.id === 'JUGGERNAUT') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.2, 5.0), mat);
      this.previewMeshGroup.add(body);
      [-1, 1].forEach(s => {
        const pod = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.6, 4.0), mat);
        pod.position.set(s * 2.2, 0, 0);
        this.previewMeshGroup.add(pod);
      });
    } else if (ship.id === 'STEALTH') {
      const body = new THREE.Mesh(new THREE.ConeGeometry(2.0, 5.5, 4), mat);
      body.rotateX(Math.PI / 2);
      this.previewMeshGroup.add(body);
      [-1, 1].forEach(s => {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, 2.8), mat);
        wing.position.set(s * 1.8, 0, -0.6);
        this.previewMeshGroup.add(wing);
      });
    } else {
      const fuselage = new THREE.Mesh(new THREE.ConeGeometry(1.4, 5.0, 6), mat);
      fuselage.rotateX(Math.PI / 2);
      this.previewMeshGroup.add(fuselage);
      [-1, 1].forEach(s => {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.15, 2.4), mat);
        wing.position.set(s * 1.6, 0, -0.6);
        this.previewMeshGroup.add(wing);
      });
    }
  }

  _drawRadarChart() {
    const canvas = document.getElementById('hangar-radar-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2 + 5;
    const radius = 45;

    ctx.clearRect(0, 0, w, h);

    const labels = ['FIREPOWER', 'DEFENSE', 'SPEED', 'AGILITY'];
    const ship = this.ships[this.currentShipIndex];
    const values = [
      ship.stats.firepower / 100,
      ship.stats.defense / 100,
      ship.stats.speed / 100,
      ship.stats.agility / 100
    ];

    // Draw Web Grid Rings
    [0.33, 0.66, 1.0].forEach(rPct => {
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const angle = (Math.PI / 2) * i - Math.PI / 2;
        const x = cx + Math.cos(angle) * (radius * rPct);
        const y = cy + Math.sin(angle) * (radius * rPct);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Draw Stat Polygon
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI / 2) * i - Math.PI / 2;
      const x = cx + Math.cos(angle) * (radius * values[i]);
      const y = cy + Math.sin(angle) * (radius * values[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 243, 255, 0.35)';
    ctx.fill();
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw Labels
    ctx.fillStyle = '#8fa0b5';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(labels[0], cx, cy - radius - 6);
    ctx.fillText(labels[1], cx + radius + 22, cy + 3);
    ctx.fillText(labels[2], cx, cy + radius + 12);
    ctx.fillText(labels[3], cx - radius - 22, cy + 3);
  }

  open() {
    if (!this.container) this._createDOM();
    this.container.classList.remove('hidden');
    this.isOpen = true;

    setTimeout(() => {
      this.init3DPreview();
      this._updateUI();
    }, 50);

    if (this.gameManager && this.gameManager.spaceAudio) {
      this.gameManager.spaceAudio.playRadioChirp();
    }
  }

  close() {
    if (this.container) {
      this.container.classList.add('hidden');
    }
    this.isOpen = false;
  }

  prevShip() {
    this.currentShipIndex = (this.currentShipIndex - 1 + this.ships.length) % this.ships.length;
    this._updateUI();
  }

  nextShip() {
    this.currentShipIndex = (this.currentShipIndex + 1) % this.ships.length;
    this._updateUI();
  }

  _updateUI() {
    const ship = this.ships[this.currentShipIndex];
    document.getElementById('ship-name-display').textContent = ship.name;
    document.getElementById('ship-role-display').textContent = ship.role;
    document.getElementById('ship-desc-display').textContent = ship.description;
    document.getElementById('ship-page-indicator').textContent = `${this.currentShipIndex + 1} / ${this.ships.length}`;
    document.getElementById('ship-holo-tag').textContent = ship.name;

    this._update3DModel();
    this._drawRadarChart();

    if (this.gameManager && this.gameManager.spaceAudio) {
      this.gameManager.spaceAudio.playLaserPew();
    }
  }

  equipAndLaunch() {
    const ship = this.ships[this.currentShipIndex];
    if (this.gameManager && this.gameManager.playerShip) {
      const p = this.gameManager.playerShip;
      p.shipClass = ship.id;

      // Apply Livery
      const livery = document.getElementById('sel-livery-skin')?.value || 'DEFAULT';
      p.setLivery(livery);

      // Apply Superweapon
      const superweapon = document.getElementById('sel-superweapon')?.value || 'ANTIMATTER_NUKE';
      p.equippedSuperweapon = superweapon;

      // Apply Modular Components
      const reactor = document.getElementById('sel-reactor-core')?.value || 'DEFAULT';
      const thruster = document.getElementById('sel-thruster-manifold')?.value || 'DEFAULT';
      p.setEquipment('reactor', reactor);
      p.setEquipment('thruster', thruster);

      this.gameManager.voiceAnnouncer?.speak(`${ship.name} refitted with ${livery} livery. Launching!`, true);
      if (this.gameManager.spaceHUD) {
        this.gameManager.spaceHUD.showRadioTransmission(`REFIT COMPLETE: ${ship.name} [${livery} // ${superweapon}]`, "STARBOUND COMMAND", 5.0);
      }
    }
    this.close();
  }
}
