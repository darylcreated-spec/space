export class ControlsManager {
  constructor() {
    this.keys = {};

    this.joystickVector = { x: 0, y: 0 };
    this.isLaserHeld = false;
    this.fireTorpedoRequested = false;
    this.firePulseRequested = false;

    // Listeners for Keyboard (Checking both code and key)
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));

    // Listeners for Mouse / Pointer directly on screen
    window.addEventListener('pointerdown', this.onPointerDown.bind(this));
    window.addEventListener('pointerup', this.onPointerUp.bind(this));

    // Setup Virtual Touch Joystick for Mobile
    this.setupJoystick();
  }

  onKeyDown(e) {
    this.keys[e.code] = true;
    this.keys[e.key] = true;
    this.keys[e.key.toLowerCase()] = true;

    if (e.code === 'Space' || e.key === ' ') {
      this.isLaserHeld = true;
      e.preventDefault();
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

  onPointerDown(e) {
    // Ignore if clicking on interactive buttons or HUD top bar
    if (e.target.closest('#game-selector, .actions, .mode-switcher, button, .modal-card')) return;

    if (e.button === 0) { // Left click / Touch
      this.isLaserHeld = true;
    } else if (e.button === 2) { // Right click
      this.fireTorpedoRequested = true;
    }
  }

  onPointerUp(e) {
    if (e.button === 0) {
      this.isLaserHeld = false;
    }
  }

  setupJoystick() {
    const zone = document.getElementById('joystick-container');
    const base = document.getElementById('joystick-base');
    const stick = document.getElementById('joystick-stick');

    if (!zone || !base || !stick) return;

    let activeTouchId = null;
    let baseCenter = { x: 0, y: 0 };
    const maxRadius = 45;

    zone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (activeTouchId !== null) return;

      const touch = e.changedTouches[0];
      activeTouchId = touch.identifier;

      const rect = base.getBoundingClientRect();
      baseCenter = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };

      this.updateJoystickPos(touch.clientX, touch.clientY, baseCenter, maxRadius, stick);
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (activeTouchId === null) return;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === activeTouchId) {
          this.updateJoystickPos(touch.clientX, touch.clientY, baseCenter, maxRadius, stick);
          break;
        }
      }
    }, { passive: false });

    const endTouch = (e) => {
      if (activeTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeTouchId) {
          activeTouchId = null;
          this.joystickVector = { x: 0, y: 0 };
          stick.style.transform = `translate(0px, 0px)`;
          break;
        }
      }
    };

    window.addEventListener('touchend', endTouch);
    window.addEventListener('touchcancel', endTouch);
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
      y: -dy / maxRadius // Invert Y so up is positive Y
    };
  }

  getInputVector() {
    let x = 0;
    let y = 0;

    // Check code, key, and lower-case keys for WASD / Arrow keys
    if (this.keys['KeyA'] || this.keys['a'] || this.keys['ArrowLeft']) x -= 1;
    if (this.keys['KeyD'] || this.keys['d'] || this.keys['ArrowRight']) x += 1;
    if (this.keys['KeyW'] || this.keys['w'] || this.keys['ArrowUp']) y += 1;
    if (this.keys['KeyS'] || this.keys['s'] || this.keys['ArrowDown']) y -= 1;

    // Merge with Virtual Joystick
    if (this.joystickVector.x !== 0 || this.joystickVector.y !== 0) {
      x = this.joystickVector.x;
      y = this.joystickVector.y;
    }

    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }

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
