export class ControlsManager {
  constructor() {
    this._inputVec = { x: 0, y: 0, z: 0 };
    this.keys = {};
    this.touchVector = { x: 0, y: 0 };
    this.activePointerId = null;
    this.touchStartPos = { x: 0, y: 0 };
    this.dragRadius = 50; // Comfortable 50px finger drag radius for max steering speed

    this.lastPressA = 0;
    this.lastPressD = 0;
    this.pendingDodge = null;

    // Listeners for Keyboard
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));

    // Window Blur Safety Reset (Guarantees zero control sticking)
    window.addEventListener('blur', this.resetAllInputs.bind(this));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.resetAllInputs();
    });

    // Listeners for Smooth Screen Touch Steering (Left 55% of Screen Only)
    window.addEventListener('pointerdown', this.onPointerDown.bind(this), { passive: false });
    window.addEventListener('pointermove', this.onPointerMove.bind(this), { passive: false });
    window.addEventListener('pointerup', this.onPointerUp.bind(this));
    window.addEventListener('pointercancel', this.onPointerUp.bind(this));
  }

  resetAllInputs() {
    this.keys = {};
    this.touchVector = { x: 0, y: 0 };
    this.activePointerId = null;
    this.pendingDodge = null;
    this.hideVirtualJoystick();
  }

  onKeyDown(e) {
    this.keys[e.code] = true;
    this.keys[e.key] = true;
    this.keys[e.key.toLowerCase()] = true;

    const now = performance.now();
    if (e.code === 'KeyA' || e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      if (now - this.lastPressA < 250) {
        this.pendingDodge = 'left';
      }
      this.lastPressA = now;
    }
    if (e.code === 'KeyD' || e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      if (now - this.lastPressD < 250) {
        this.pendingDodge = 'right';
      }
      this.lastPressD = now;
    }

    // Squadron Doctrine Hotkeys (B/T: Cycle, 1: DEFEND, 2: FOCUS, 3: FLANK)
    if (e.code === 'KeyB' || e.code === 'KeyT' || e.key === 'b' || e.key === 'B' || e.key === 't' || e.key === 'T') {
      if (window.spaceGameManager) window.spaceGameManager.cycleWingmanDoctrine();
    } else if (e.code === 'Digit1' || e.key === '1') {
      if (window.spaceGameManager) window.spaceGameManager.setWingmanDoctrine('DEFEND');
    } else if (e.code === 'Digit2' || e.key === '2') {
      if (window.spaceGameManager) window.spaceGameManager.setWingmanDoctrine('FOCUS_FIRE');
    } else if (e.code === 'Digit3' || e.key === '3') {
      if (window.spaceGameManager) window.spaceGameManager.setWingmanDoctrine('SWARM_FLANK');
    } else if (e.code === 'KeyF' || e.code === 'Digit4' || e.key === 'f' || e.key === 'F' || e.key === '4') {
      if (window.spaceGameManager) window.spaceGameManager.fireAntiMatterNuke();
    }
  }

  onKeyUp(e) {
    this.keys[e.code] = false;
    this.keys[e.key] = false;
    this.keys[e.key.toLowerCase()] = false;
  }

  getPendingDodge() {
    const d = this.pendingDodge;
    this.pendingDodge = null;
    return d;
  }

  onPointerDown(e) {
    // 1. Mouse clicks on computer must NEVER hijack keyboard flight steering
    if (e.pointerType === 'mouse') return;

    // 2. Ignore taps on interactive UI buttons, modal drawers, or header bars
    if (e.target.closest('button, .modal-card, .space-top-bar, .action-btn, .modal-overlay')) return;

    // 3. Ergonomic Touch Steering Zone: Covers screen up to the right action button column (left 80%)
    // Allows effortless transition between steering and tapping action knobs
    if (e.clientX > window.innerWidth * 0.80) return;

    this.activePointerId = e.pointerId;
    this.touchStartPos = { x: e.clientX, y: e.clientY };
    this.touchVector = { x: 0, y: 0 };
    this.showVirtualJoystick(e.clientX, e.clientY);
  }

  onPointerMove(e) {
    if (this.activePointerId !== null && e.pointerId === this.activePointerId) {
      this.updateTouchVector(e.clientX, e.clientY);
    }
  }

  onPointerUp(e) {
    if (this.activePointerId !== null && e.pointerId === this.activePointerId) {
      this.activePointerId = null;
      this.touchVector = { x: 0, y: 0 };
      this.hideVirtualJoystick();
    }
  }

  showVirtualJoystick(x, y) {
    const stick = document.getElementById('touch-joystick-stick');
    if (stick) {
      stick.style.transform = 'translate(-50%, -50%) scale(1.15)';
    }
  }

  hideVirtualJoystick() {
    const stick = document.getElementById('touch-joystick-stick');
    if (stick) {
      stick.style.transform = 'translate3d(0, 0, 0) translate(-50%, -50%) scale(1.0)';
    }
  }

  updateTouchVector(clientX, clientY) {
    const dx = clientX - this.touchStartPos.x;
    const dy = clientY - this.touchStartPos.y;

    const stick = document.getElementById('touch-joystick-stick');
    if (stick) {
      const dist = Math.hypot(dx, dy);
      const maxClamp = this.dragRadius;
      const clampedX = dist > 0 ? (dx / dist) * Math.min(dist, maxClamp) : 0;
      const clampedY = dist > 0 ? (dy / dist) * Math.min(dist, maxClamp) : 0;
      const pctX = 50 + (clampedX / maxClamp) * 38;
      const pctY = 50 + (clampedY / maxClamp) * 38;
      stick.style.transform = `translate3d(${((pctX - 50) / 50) * 38}px, ${((pctY - 50) / 50) * 38}px, 0) translate(-50%, -50%)`;
    }

    // Smooth proportional analog steering (-1.0 to +1.0)
    let x = Math.max(-1.0, Math.min(1.0, dx / this.dragRadius));
    let y = Math.max(-1.0, Math.min(1.0, -dy / this.dragRadius)); // Invert Y so drag up = move up

    this.touchVector = { x, y };
  }

  getInputVector() {
    let x = 0;
    let y = 0;
    let z = 0;

    // WASD & Arrow Key Steering
    if (this.keys['KeyA'] || this.keys['a'] || this.keys['ArrowLeft']) x -= 1;
    if (this.keys['KeyD'] || this.keys['d'] || this.keys['ArrowRight']) x += 1;
    if (this.keys['KeyW'] || this.keys['w'] || this.keys['ArrowUp']) y += 1;
    if (this.keys['KeyS'] || this.keys['s'] || this.keys['ArrowDown']) y -= 1;

    // Dedicated Tactical Throttle / Depth Keys (Shift/R forward, Ctrl/C backward)
    if (this.keys['KeyR'] || this.keys['ShiftLeft'] || this.keys['ShiftRight']) z -= 1.0;
    if (this.keys['KeyC'] || this.keys['ControlLeft'] || this.keys['ControlRight']) z += 1.0;

    // Smooth Touch Drag Vector on Mobile
    if (this.touchVector.x !== 0 || this.touchVector.y !== 0) {
      x = this.touchVector.x;
      y = this.touchVector.y;
    }

    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    z = Math.max(-1.0, Math.min(1.0, z));

    this._inputVec.x = x;
    this._inputVec.y = y;
    this._inputVec.z = z;
    return this._inputVec;
  }
}
