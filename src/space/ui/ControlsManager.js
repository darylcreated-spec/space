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

    // Listeners for Smooth Screen Touch-Drag Steering
    window.addEventListener('pointerdown', this.onPointerDown.bind(this), { passive: false });
    window.addEventListener('pointermove', this.onPointerMove.bind(this), { passive: false });
    window.addEventListener('pointerup', this.onPointerUp.bind(this));
    window.addEventListener('pointercancel', this.onPointerUp.bind(this));
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
    // Ignore taps on buttons, modal cards, or top HUD header
    if (e.target.closest('button, .modal-card, .space-top-bar, .action-btn')) return;

    this.activePointerId = e.pointerId;
    this.touchStartPos = { x: e.clientX, y: e.clientY };
    this.touchVector = { x: 0, y: 0 };
  }

  onPointerMove(e) {
    if (this.activePointerId !== null && e.pointerId === this.activePointerId) {
      if (e.target.closest('button, .modal-card, .space-top-bar, .action-btn')) return;
      this.updateTouchVector(e.clientX, e.clientY);
    }
  }

  onPointerUp(e) {
    if (this.activePointerId !== null && e.pointerId === this.activePointerId) {
      this.activePointerId = null;
      this.touchVector = { x: 0, y: 0 };
    }
  }

  updateTouchVector(clientX, clientY) {
    // Relative displacement drag delta from touch start position
    const dx = clientX - this.touchStartPos.x;
    const dy = clientY - this.touchStartPos.y;

    // Smooth proportional analog steering (-1.0 to +1.0)
    let x = Math.max(-1.0, Math.min(1.0, dx / this.dragRadius));
    let y = Math.max(-1.0, Math.min(1.0, -dy / this.dragRadius)); // Invert Y so drag up = move up

    this.touchVector = { x, y };
  }

  getInputVector() {
    let x = 0;
    let y = 0;

    // WASD & Arrow Key Steering
    if (this.keys['KeyA'] || this.keys['a'] || this.keys['ArrowLeft']) x -= 1;
    if (this.keys['KeyD'] || this.keys['d'] || this.keys['ArrowRight']) x += 1;
    if (this.keys['KeyW'] || this.keys['w'] || this.keys['ArrowUp']) y += 1;
    if (this.keys['KeyS'] || this.keys['s'] || this.keys['ArrowDown']) y -= 1;

    // Merge with Smooth Touch Drag Vector
    if (this.touchVector.x !== 0 || this.touchVector.y !== 0) {
      x = this.touchVector.x;
      y = this.touchVector.y;
    }

    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }

    return { x, y };
  }
}
