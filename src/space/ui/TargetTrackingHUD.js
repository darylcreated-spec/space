import * as THREE from 'three';

/**
 * 3D In-Viewport Target Tracking & Off-Screen Edge Chevrons
 * Eliminates aimless flying by dynamically projecting in-world hostiles,
 * waypoints, and stations into military-grade HUD brackets and directional bearings.
 */
export class TargetTrackingHUD {
  constructor(container, camera) {
    this.container = container;
    this.camera = camera;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.root = document.createElement('div');
    this.root.id = 'hud-target-tracking-overlay';
    this.root.style.position = 'absolute';
    this.root.style.top = '0';
    this.root.style.left = '0';
    this.root.style.width = '100%';
    this.root.style.height = '100%';
    this.root.style.pointerEvents = 'none';
    this.root.style.zIndex = '15';
    this.root.style.overflow = 'hidden';

    this.container.appendChild(this.root);

    // Pre-allocated DOM element pool (prevents GC allocation per frame)
    this.markerPool = [];
    this.maxMarkers = 16;
    this._tempV = new THREE.Vector3();

    for (let i = 0; i < this.maxMarkers; i++) {
      const el = document.createElement('div');
      el.className = 'hud-target-marker';
      el.style.position = 'absolute';
      el.style.transform = 'translate(-50%, -50%)';
      el.style.display = 'none';
      el.style.willChange = 'transform, opacity';
      el.innerHTML = `
        <div class="marker-bracket bracket-tl"></div>
        <div class="marker-bracket bracket-tr"></div>
        <div class="marker-bracket bracket-bl"></div>
        <div class="marker-bracket bracket-br"></div>
        <div class="marker-chevron" style="display:none;"></div>
        <div class="marker-info">
          <div class="marker-name">TARGET</div>
          <div class="marker-dist">0m</div>
          <div class="marker-hp-bar"><div class="marker-hp-fill"></div></div>
        </div>
      `;
      this.root.appendChild(el);
      this.markerPool.push({
        el,
        nameEl: el.querySelector('.marker-name'),
        distEl: el.querySelector('.marker-dist'),
        hpBar: el.querySelector('.marker-hp-bar'),
        hpFill: el.querySelector('.marker-hp-fill'),
        chevronEl: el.querySelector('.marker-chevron'),
        active: false
      });
    }

    window.addEventListener('resize', () => {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
    });
  }

  update(dt, gameManager) {
    if (!gameManager || gameManager.state !== 'PLAYING') {
      this.hideAll();
      return;
    }

    const camera = gameManager.spaceScene?.camera || this.camera;
    if (!camera) return;

    // Reset pool state
    this.markerPool.forEach(m => { m.active = false; });

    let poolIdx = 0;
    const pPos = gameManager.playerShip?.meshGroup?.position || new THREE.Vector3();

    // 1. Track Key Mission Target / Prototype / Boss
    if (gameManager.activeBoss && !gameManager.activeBoss.isDead && gameManager.activeBoss.meshGroup) {
      if (poolIdx < this.maxMarkers) {
        this.renderTarget(
          this.markerPool[poolIdx++],
          gameManager.activeBoss.meshGroup.position,
          gameManager.activeBoss.bossTitle || 'TITAN BOSS',
          'BOSS',
          pPos,
          camera,
          (gameManager.activeBoss.hp || 100) / (gameManager.activeBoss.maxHp || 100)
        );
      }
    }

    // 2. Track Next Nav Waypoint Ring
    if (gameManager.waypointRings && gameManager.waypointRings.length > 0) {
      const nextRing = gameManager.waypointRings.find(r => r && !r.isCleared && !r.isDead);
      if (nextRing && poolIdx < this.maxMarkers) {
        this.renderTarget(
          this.markerPool[poolIdx++],
          nextRing.meshGroup.position,
          `NAV WAYPOINT [${nextRing.ringIndex + 1}/${nextRing.totalRings}]`,
          'WAYPOINT',
          pPos,
          camera,
          null
        );
      }
    }

    // 3. Track Active Hostile Drones and Stealth Fighters
    const hostiles = [];
    if (gameManager.drones) {
      gameManager.drones.forEach(d => { if (d && !d.isDead && d.meshGroup) hostiles.push({ pos: d.meshGroup.position, name: 'VORN RECON DRONE', type: 'HOSTILE', hp: d.hp, maxHp: d.maxHp }); });
    }
    if (gameManager.stealthFighters) {
      gameManager.stealthFighters.forEach(s => {
        if (s && !s.isDead && s.meshGroup) {
          const name = s.isEscapedPrototype ? '★ ROGUE PROTOTYPE' : 'SHADOW WRAITH';
          hostiles.push({ pos: s.meshGroup.position, name, type: s.isEscapedPrototype ? 'PRIORITY' : 'HOSTILE', hp: s.hp, maxHp: s.maxHp });
        }
      });
    }
    if (gameManager.heavyBattleships) {
      gameManager.heavyBattleships.forEach(b => { if (b && !b.isDead && b.meshGroup) hostiles.push({ pos: b.meshGroup.position, name: 'DEVASTATOR BATTLESHIP', type: 'HOSTILE', hp: b.hp, maxHp: b.maxHp }); });
    }

    // Filter to nearest hostiles within 650m (or always include PRIORITY targets/prototypes)
    const nearHostiles = hostiles.filter(h => h.type === 'PRIORITY' || h.pos.distanceTo(pPos) < 650);
    nearHostiles.sort((a, b) => a.pos.distanceToSquared(pPos) - b.pos.distanceToSquared(pPos));

    const trackLimit = Math.min(4, nearHostiles.length);
    for (let i = 0; i < trackLimit && poolIdx < this.maxMarkers; i++) {
      const h = nearHostiles[i];
      this.renderTarget(
        this.markerPool[poolIdx++],
        h.pos,
        h.name,
        h.type,
        pPos,
        camera,
        h.hp !== undefined && h.maxHp ? (h.hp / h.maxHp) : null
      );
    }

    // 4. Track Citadel Station when in local sector range (< 850m)
    const stationGroup = gameManager.spaceScene?.orbitalStationGroup || gameManager.citadelStationGroup;
    if (stationGroup && poolIdx < this.maxMarkers && pPos.distanceTo(stationGroup.position) < 850) {
      this.renderTarget(
        this.markerPool[poolIdx++],
        stationGroup.position,
        'CITADEL ORBITAL STATION',
        'STATION',
        pPos,
        camera,
        null
      );
    }

    // Hide unused markers
    for (let i = poolIdx; i < this.maxMarkers; i++) {
      this.markerPool[i].el.style.display = 'none';
    }
  }

  renderTarget(slot, worldPos, title, type, pPos, camera, hpRatio = null) {
    slot.active = true;
    const dist = Math.round(pPos.distanceTo(worldPos));

    this._tempV.copy(worldPos);
    this._tempV.project(camera);

    const isBehind = this._tempV.z > 1.0;
    let ndcX = this._tempV.x;
    let ndcY = this._tempV.y;

    if (isBehind) {
      ndcX = -ndcX;
      ndcY = -ndcY;
    }

    const marginX = 50;
    const marginTop = 75; // Avoid covering top status bar
    const marginBottom = 50;
    const screenHalfW = this.width * 0.5;
    const screenHalfH = this.height * 0.5;

    let screenX = (ndcX * 0.5 + 0.5) * this.width;
    let screenY = (-ndcY * 0.5 + 0.5) * this.height;

    const isOffScreen = isBehind || screenX < marginX || screenX > this.width - marginX || screenY < marginTop || screenY > this.height - marginBottom;

    slot.el.style.display = 'flex';
    slot.nameEl.textContent = title;
    slot.distEl.textContent = `${dist}m`;

    if (hpRatio !== null) {
      slot.hpBar.style.display = 'block';
      slot.hpFill.style.transform = `scaleX(${Math.max(0, Math.min(1, hpRatio))})`;
    } else {
      slot.hpBar.style.display = 'none';
    }

    // Type-based styling classes
    slot.el.className = `hud-target-marker type-${type.toLowerCase()} ${isOffScreen ? 'is-offscreen' : 'is-onscreen'}`;

    if (isOffScreen) {
      // Clamp to screen edge margin
      const dirX = screenX - screenHalfW;
      const dirY = screenY - screenHalfH;
      const angle = Math.atan2(dirY, dirX);

      // Clamped border projection with asymmetric top margin
      const edgeDistX = screenHalfW - marginX;
      const edgeDistY = dirY < 0 ? (screenHalfH - marginTop) : (screenHalfH - marginBottom);

      const scale = Math.min(
        Math.abs(edgeDistX / (Math.cos(angle) || 0.0001)),
        Math.abs(edgeDistY / (Math.sin(angle) || 0.0001))
      );

      const clampedX = Math.max(marginX, Math.min(this.width - marginX, screenHalfW + Math.cos(angle) * scale));
      const clampedY = Math.max(marginTop, Math.min(this.height - marginBottom, screenHalfH + Math.sin(angle) * scale));

      slot.el.style.left = `${clampedX}px`;
      slot.el.style.top = `${clampedY}px`;
      slot.chevronEl.style.display = 'block';
      slot.chevronEl.style.transform = `rotate(${angle + Math.PI / 2}rad)`;
    } else {
      slot.el.style.left = `${screenX}px`;
      slot.el.style.top = `${screenY}px`;
      slot.chevronEl.style.display = 'none';
    }
  }

  hideAll() {
    this.markerPool.forEach(m => {
      m.el.style.display = 'none';
      m.active = false;
    });
  }

  destroy() {
    if (this.root && this.root.parentElement) {
      this.root.parentElement.removeChild(this.root);
    }
  }
}
