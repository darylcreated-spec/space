import { deviceManager } from './DeviceManager.js';

export class PerformanceMonitor {
  constructor(gameManager) {
    this.gameManager = gameManager;
    this.fps = 60;
    this.stutterEvents = [];
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    this.fpsTimer = 0;
    this.isExpanded = false;

    this.createUI();

    // Attach global helper so it can be called from mobile address bar or remote console if needed
    window.getPerfLog = () => this.getReportData();
    window.copyPerfLog = () => this.copyReportToClipboard();
  }

  createUI() {
    const profile = deviceManager.getProfile();
    const browserName = typeof profile.browser === 'string' ? profile.browser : (profile.browser?.name || 'BROWSER');
    const osName = profile.isIOS ? 'iOS' : (profile.isAndroid ? 'Android' : (profile.isDesktop ? 'Desktop' : 'OS'));
    this.pill = document.createElement('div');
    this.pill.id = 'perf-diagnostic-pill';
    this.pill.innerHTML = `
      <div id="perf-pill-summary" style="display:flex;align-items:center;gap:6px;cursor:pointer;">
        <span id="perf-pill-dot" style="width:6px;height:6px;border-radius:50%;background:#00ff66;box-shadow:0 0 6px #00ff66;"></span>
        <span id="perf-pill-fps" style="font-family:monospace;font-size:10px;font-weight:700;color:#00f3ff;">60 FPS</span>
        <span id="perf-pill-device" style="font-family:monospace;font-size:9px;color:#38bdf8;background:rgba(56,189,248,0.15);padding:1px 4px;border-radius:2px;">${browserName.toUpperCase()} • TIER ${profile.gpuTier}</span>
        <span id="perf-pill-stutters" style="font-family:monospace;font-size:9px;color:#94a3b8;">0 STUTTERS</span>
      </div>
      <div id="perf-pill-details" style="display:none;margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.15);font-family:monospace;font-size:9px;color:#cbd5e1;line-height:1.4;">
        <div>Device / Form: <span id="perf-detail-form" style="color:#00f3ff;">${(profile.formFactor || 'DEVICE').toUpperCase()} (${osName})</span></div>
        <div>Renderer: <span id="perf-detail-gpu" style="color:#94a3b8;font-size:8px;">${(profile.gpuRenderer || 'WebGL').substring(0, 32)}</span></div>
        <div>Screen / DPR: <span id="perf-detail-dpr">${profile.width}x${profile.height} @ ${profile.optimalPixelRatio}x (Native ${profile.rawDPR || 1.0}x)</span></div>
        <div>Graphics Preset: <span id="perf-detail-quality" style="color:#22c55e;font-weight:bold;">${(deviceManager.adaptiveScaler?.currentQuality || 'BALANCED').toUpperCase()}</span></div>
        <div>Frame Time: <span id="perf-detail-ms">16.6ms</span></div>
        <div>Active Lasers: <span id="perf-detail-lasers">0</span></div>
        <div>Asteroids/Enemies: <span id="perf-detail-entities">0</span></div>
        <div>Touch Active: <span id="perf-detail-touch">NO</span></div>
        <div>Memory Heap: <span id="perf-detail-mem">--</span></div>
        <div style="margin-top:6px;">
          <button id="btn-copy-perf-log" style="background:rgba(0,243,255,0.25);border:1px solid #00f3ff;color:#fff;padding:5px 8px;border-radius:3px;font-size:9px;cursor:pointer;width:100%;font-weight:bold;">
            📋 COPY DIAGNOSTIC LOG
          </button>
        </div>
      </div>
    `;

    Object.assign(this.pill.style, {
      position: 'fixed',
      bottom: '12px',
      left: '12px',
      zIndex: '9999',
      background: 'rgba(8, 14, 24, 0.90)',
      border: '1px solid rgba(0, 243, 255, 0.35)',
      borderRadius: '4px',
      padding: '4px 8px',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      touchAction: 'manipulation'
    });

    document.body.appendChild(this.pill);

    const summary = this.pill.querySelector('#perf-pill-summary');
    const details = this.pill.querySelector('#perf-pill-details');
    summary.addEventListener('click', () => {
      this.isExpanded = !this.isExpanded;
      details.style.display = this.isExpanded ? 'block' : 'none';
    });

    const copyBtn = this.pill.querySelector('#btn-copy-perf-log');
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.copyReportToClipboard(copyBtn);
    });
  }

  update(now = performance.now()) {
    const delta = now - this.lastFrameTime;
    this.lastFrameTime = now;
    this.frameCount++;
    this.fpsTimer += delta;

    // Feed runtime frame delta into deviceManager adaptive scaler
    deviceManager.adaptiveScaler.reportFrame(delta);

    if (this.fpsTimer >= 500) {
      this.fps = Math.round((this.frameCount * 1000) / this.fpsTimer);
      this.frameCount = 0;
      this.fpsTimer = 0;
      this.updateDisplay(delta);
    }

    // Detect frame hitch / spike (> 35ms is < 28 FPS, noticeable stutter)
    if (delta > 35.0) {
      this.recordStutter(delta);
    }
  }

  recordStutter(deltaMs) {
    const gm = this.gameManager;
    const isTouch = !!gm?.controlsManager?.activePointerId;
    const event = {
      timestamp: Math.round(performance.now()),
      frameDurationMs: Math.round(deltaMs),
      estimatedFps: Math.round(1000 / deltaMs),
      lasers: gm?.lasers ? gm.lasers.length : 0,
      asteroids: gm?.asteroids ? gm.asteroids.length : 0,
      drones: gm?.drones ? gm.drones.length : 0,
      touchActive: isTouch,
      memory: window.performance?.memory ? `${Math.round(window.performance.memory.usedJSHeapSize / (1024 * 1024))}MB` : 'N/A'
    };

    this.stutterEvents.push(event);
    if (this.stutterEvents.length > 30) this.stutterEvents.shift();

    const stCount = document.getElementById('perf-pill-stutters');
    if (stCount) {
      stCount.textContent = `${this.stutterEvents.length} STUTTERS`;
      stCount.style.color = '#ff0055';
    }
    const dot = document.getElementById('perf-pill-dot');
    if (dot) {
      dot.style.background = '#ff0055';
      dot.style.boxShadow = '0 0 8px #ff0055';
      setTimeout(() => {
        if (dot) {
          dot.style.background = this.fps >= 50 ? '#00ff66' : (this.fps >= 35 ? '#ffaa00' : '#ff0055');
          dot.style.boxShadow = `0 0 6px ${dot.style.background}`;
        }
      }, 500);
    }
  }

  updateDisplay(lastDelta) {
    const fpsElem = document.getElementById('perf-pill-fps');
    if (fpsElem) {
      fpsElem.textContent = `${this.fps} FPS`;
      fpsElem.style.color = this.fps >= 50 ? '#00f3ff' : (this.fps >= 35 ? '#ffaa00' : '#ff0055');
    }

    if (this.isExpanded) {
      const msElem = document.getElementById('perf-detail-ms');
      if (msElem) msElem.textContent = `${lastDelta.toFixed(1)}ms`;
      const qElem = document.getElementById('perf-detail-quality');
      if (qElem) qElem.textContent = deviceManager.adaptiveScaler.currentQuality.toUpperCase();
      const lElem = document.getElementById('perf-detail-lasers');
      if (lElem) lElem.textContent = this.gameManager?.lasers?.length || 0;
      const eElem = document.getElementById('perf-detail-entities');
      if (eElem) {
        const a = this.gameManager?.asteroids?.length || 0;
        const d = this.gameManager?.drones?.length || 0;
        eElem.textContent = `${a} ast / ${d} dro`;
      }
      const tElem = document.getElementById('perf-detail-touch');
      if (tElem) {
        tElem.textContent = this.gameManager?.controlsManager?.activePointerId ? 'YES' : 'IDLE';
        tElem.style.color = this.gameManager?.controlsManager?.activePointerId ? '#00f3ff' : '#94a3b8';
      }
      const mElem = document.getElementById('perf-detail-mem');
      if (mElem && window.performance?.memory) {
        mElem.textContent = `${Math.round(window.performance.memory.usedJSHeapSize / (1024 * 1024))}MB`;
      }
    }
  }

  getReportData() {
    return {
      userAgent: navigator.userAgent,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      pixelRatio: window.devicePixelRatio,
      currentFps: this.fps,
      totalStuttersRecorded: this.stutterEvents.length,
      stutters: this.stutterEvents
    };
  }

  copyReportToClipboard(btn = null) {
    const data = this.getReportData();
    const text = JSON.stringify(data, null, 2);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        if (btn) {
          btn.textContent = '✅ COPIED TO CLIPBOARD!';
          setTimeout(() => { btn.textContent = '📋 COPY DIAGNOSTIC LOG'; }, 2500);
        } else {
          alert('Diagnostic report copied to clipboard!');
        }
      }).catch(() => {
        prompt('Copy Diagnostic Log:', text);
      });
    } else {
      prompt('Copy Diagnostic Log:', text);
    }
  }
}
