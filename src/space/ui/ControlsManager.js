export class ControlsManager {
  constructor() {
    this.keys = {};
    this.joystickVector = { x: 0, y: 0 };
    this.isLaserHeld = false;
    this.fireTorpedoRequested = false;
    this.firePulseRequested = false;

    // Track whether a joystick pointer is active (to prevent canvas tap = laser)
    this._joystickActive = false;

    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));

    // Pointer on canvas (fire only — not movement)
    const canvas = document.getElementById('canvas-container');
    if (canvas) {
      canvas.addEventListener('pointerdown', (e) => {
        if (this._joystickActive) return;
        if (e.target.closest('button, .modal-card, #joystick-container')) return;
        if (e.button === 0) this.isLaserHeld = true;
      });
      canvas.addEventListener('pointerup', () => {
        this.isLaserHeld = false;
      });
      canvas.addEventListener('pointercancel', () => {
        this.isLaserHeld = false;
      });
    }

    this.setupJoystick();
  }

  onKeyDown(e) {
    this.keys[e.code] = true;
    this.keys[e.key] = true;
    this.keys[e.key.toLowerCase()] = true;

    if (e.code === 'Space' || e.key === ' ') {
      this.isLaserHeld = true;
      try { e.preventDefault(); } catch (err) {}
    }
  }

  onKeyUp(e) {
    this.keys[e.code] = false;
    this.keys[e.key] = false;
    this.keys[e.key.toLowerCase()] = false;

    if (e.code === 'Space' || e.key === ' ') {
      this.isLaserHeld = false;
    }
  }

  setupJoystick() {
    const zone = document.getElementById('joystick-container');
    const base = document.getElementById('joystick-base');
    const stick = document.getElementById('joystick-stick');

    if (!zone || !base || !stick) return;

    let activePointerId = null;
    let baseCenter = { x: 0, y: 0 };
    const maxRadius = 45;

    zone.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (activePointerId !== null) return;

      activePointerId = e.pointerId;
      this._joystickActive = true;
      try { zone.setPointerCapture(e.pointerId); } catch (err) {}

      const rect = base.getBoundingClientRect();
      baseCenter = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
      this.updateJoystickPos(e.clientX, e.clientY, baseCenter, maxRadius, stick);
    });

    zone.addEventListener('pointermove', (e) => {
      if (activePointerId === null || e.pointerId !== activePointerId) return;
      e.preventDefault();
      this.updateJoystickPos(e.clientX, e.clientY, baseCenter, maxRadius, stick);
    });

    const endPointer = (e) => {
      if (activePointerId !== null && e.pointerId === activePointerId) {
        activePointerId = null;
        this._joystickActive = false;
        this.joystickVector = { x: 0, y: 0 };
        stick.style.transform = 'translate(0px, 0px)';
        try { zone.releasePointerCapture(e.pointerId); } catch (err) {}
      }
    };

    zone.addEventListener('pointerup', endPointer);
    zone.addEventListener('pointercancel', endPointer);
  }

  updateJoystickPos(clientX, clientY, center, maxRadius, stickEl) {
    let dx = clientX - center.x;
    let dy = clientY - center.y;

    const dist = Math.hypot(dx, dy);
    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }

    stickEl.style.transform = `translate(${dx}px, ${dy}px)`;
    this.joystickVector = {
      x: dx / maxRadius,
      y: -dy / maxRadius // invert Y so up = positive
    };
  }

  getInputVector() {
    let x = 0;
    let y = 0;

    if (this.keys['KeyA'] || this.keys['a'] || this.keys['ArrowLeft']) x -= 1;
    if (this.keys['KeyD'] || this.keys['d'] || this.keys['ArrowRight']) x += 1;
    if (this.keys['KeyW'] || this.keys['w'] || this.keys['ArrowUp']) y += 1;
    if (this.keys['KeyS'] || this.keys['s'] || this.keys['ArrowDown']) y -= 1;

    // Joystick overrides keyboard
    if (this.joystickVector.x !== 0 || this.joystickVector.y !== 0) {
      x = this.joystickVector.x;
      y = this.joystickVector.y;
    }

    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }

    return { x, y };
  }

  isKeyTriggered(code) {
    if (this.keys[code]) {
      this.keys[code] = false;
      return true;
    }
    return false;
  }
}
