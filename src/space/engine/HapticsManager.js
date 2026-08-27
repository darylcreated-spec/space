// ── Android Mobile Haptics Engine ──
export class HapticsManager {
  constructor() {
    this.enabled = true;
    this.hasVibration = typeof navigator !== 'undefined' && 'vibrate' in navigator;
  }

  toggleHaptics() {
    this.enabled = !this.enabled;
    if (this.enabled) this.triggerBoost();
    return this.enabled;
  }

  vibrate(pattern) {
    if (!this.enabled || !this.hasVibration) return;
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // Ignore vibration errors on unsupported platforms
    }
  }

  triggerLaser() {
    // Subtle, snappy micro-pulse (5ms)
    this.vibrate(5);
  }

  triggerImpact() {
    // Sharp double-pulse on hull/shield impact
    this.vibrate([25, 20, 30]);
  }

  triggerShieldBreak() {
    // Warning buzz on shield breach
    this.vibrate([80, 40, 100]);
  }

  triggerBoost() {
    // Smooth activation hum
    this.vibrate([35]);
  }

  triggerEMP() {
    // Resonant shockwave pulse
    this.vibrate([60, 30, 80]);
  }

  triggerExplosion() {
    // Heavy blast rumble
    this.vibrate([70, 40, 120]);
  }

  triggerWarp() {
    // Heavy capital ship warp-in rumble
    this.vibrate([100, 50, 200]);
  }

  triggerStarEarned() {
    // Triumphant 3-beat rhythm
    this.vibrate([30, 20, 50, 20, 90]);
  }
}
