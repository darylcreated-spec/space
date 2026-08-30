export class ControlsManager {
  constructor() {
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

    // Squadron Doctrine Hotkeys (1: DEFEND, 2: FOCUS, 3: FLANK)
    if (e.code === 'Digit1' || e.key === '1') {
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

    // 3. Dedicated Left-Screen Touch Zone: Only touches on the left 55% of the screen control flight
    // The right 45% is strictly reserved for action buttons (Boost, Dodge, Pulse, Swarm, Nuke)
    if (e.clientX > window.innerWidth * 0.55) return;

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
    let base = document.getElementById('touch-joystick-base');
    let stick = document.getElementById('touch-joystick-stick');
    if (!base) {
      base = document.createElement('div');
      base.id = 'touch-joystick-base';
      base.style.cssText = 'position:fixed; width:90px; height:90px; border-radius:50%; border:2px solid rgba(0,243,255,0.45); background:rgba(0,243,255,0.1); pointer-events:none; z-index:99; transform:translate(-50%, -50%); display:none; box-shadow:0 0 15px rgba(0,243,255,0.3);';
      stick = document.createElement('div');
      stick.id = 'touch-joystick-stick';
      stick.style.cssText = 'position:fixed; width:44px; height:44px; border-radius:50%; background:linear-gradient(135deg, #00f3ff, #0088ff); pointer-events:none; z-index:100; transform:translate(-50%, -50%); display:none; box-shadow:0 0 12px rgba(0,243,255,0.6);';
      document.body.appendChild(base);
      document.body.appendChild(stick);
    }
    base.style.left = `${x}px`;
    base.style.top = `${y}px`;
    base.style.display = 'block';

    stick.style.left = `${x}px`;
    stick.style.top = `${y}px`;
    stick.style.display = 'block';
  }

  hideVirtualJoystick() {
    const base = document.getElementById('touch-joystick-base');
    const stick = document.getElementById('touch-joystick-stick');
    if (base) base.style.display = 'none';
    if (stick) stick.style.display = 'none';
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
      stick.style.left = `${this.touchStartPos.x + clampedX}px`;
      stick.style.top = `${this.touchStartPos.y + clampedY}px`;
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

    return { x, y, z };
  }
}
