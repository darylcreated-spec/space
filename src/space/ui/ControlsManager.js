export class ControlsManager {
  constructor() {
    this.keys = {};
    this.touchVector = { x: 0, y: 0 };
    this.activePointerId = null;

    // Listeners for Keyboard
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));

    // Listeners for Screen Pointer/Touch Directional Steering
    window.addEventListener('pointerdown', this.onPointerDown.bind(this), { passive: false });
    window.addEventListener('pointermove', this.onPointerMove.bind(this), { passive: false });
    window.addEventListener('pointerup', this.onPointerUp.bind(this));
    window.addEventListener('pointercancel', this.onPointerUp.bind(this));
  }

  onKeyDown(e) {
    this.keys[e.code] = true;
    this.keys[e.key] = true;
    this.keys[e.key.toLowerCase()] = true;
  }

  onKeyUp(e) {
    this.keys[e.code] = false;
    this.keys[e.key] = false;
    this.keys[e.key.toLowerCase()] = false;
  }

  onPointerDown(e) {
    // Ignore taps on interactive UI buttons or modal cards
    if (e.target.closest('button, .modal-card, .glass-panel, .action-btn')) return;

    this.activePointerId = e.pointerId;
    this.updateTouchVector(e.clientX, e.clientY);
  }

  onPointerMove(e) {
    if (this.activePointerId !== null && e.pointerId === this.activePointerId) {
      // Ignore if dragging over buttons
      if (e.target.closest('button, .modal-card, .action-btn')) return;
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
    const halfWidth = window.innerWidth / 2;
    const halfHeight = window.innerHeight / 2;

    // Center Deadzone margin (10% of screen size)
    const deadzoneX = window.innerWidth * 0.08;
    const deadzoneY = window.innerHeight * 0.08;

    let x = 0;
    let y = 0;

    // Horizontal Steering (Left vs Right)
    const dx = clientX - halfWidth;
    if (dx < -deadzoneX) {
      x = -1; // Touch Left -> Move Left
    } else if (dx > deadzoneX) {
      x = 1;  // Touch Right -> Move Right
    }

    // Vertical Steering (Top vs Bottom)
    const dy = clientY - halfHeight;
    if (dy < -deadzoneY) {
      y = 1;  // Touch Top -> Move Up
    } else if (dy > deadzoneY) {
      y = -1; // Touch Bottom -> Move Down
    }

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

    // Merge with Screen Touch Directional Vector
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
