import { AdaptiveSoundtrack } from './AdaptiveSoundtrack.js';

export class SpaceAudio {
  constructor() {
    this.ctx = null;
    this.isInitialized = false;
    this.soundtrack = null;

    // Drone audio nodes
    this.droneOsc = null;
    this.droneGain = null;
    this.droneFilter = null;
  }

  init() {
    if (this.isInitialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master Limiter / Dynamics Compressor to prevent any audio clipping or blearing
      this.masterLimiter = this.ctx.createDynamicsCompressor();
      this.masterLimiter.threshold.setValueAtTime(-14, this.ctx.currentTime);
      this.masterLimiter.knee.setValueAtTime(8, this.ctx.currentTime);
      this.masterLimiter.ratio.setValueAtTime(10, this.ctx.currentTime);
      this.masterLimiter.attack.setValueAtTime(0.002, this.ctx.currentTime);
      this.masterLimiter.release.setValueAtTime(0.20, this.ctx.currentTime);
      this.masterLimiter.connect(this.ctx.destination);

      this.soundtrack = new AdaptiveSoundtrack(this.ctx);
      this.soundtrack.init();
      this.isInitialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported', e);
    }
  }

  startSoundtrack() {
    this.ensureContext();
    if (this.soundtrack) {
      this.soundtrack.start();
    }
  }

  setSoundtrackTheme(theme) {
    this.ensureContext();
    if (this.soundtrack) {
      this.soundtrack.setTheme(theme);
    }
  }

  ensureContext() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setupSpaceDrone() {
    // Disabled continuous raw sawtooth drone to prevent acoustic interference with soundtrack
  }

  startDrone() {
    // Disabled continuous raw sawtooth drone
  }

  playRadioChirp() {
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1046.5, now); // C6 tone
      osc1.frequency.setValueAtTime(1318.5, now + 0.04); // E6 tone

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(523.25, now);
      osc2.frequency.setValueAtTime(659.25, now + 0.04);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.masterLimiter || this.ctx.destination);

      osc1.onended = () => {
        try { osc1.disconnect(); osc2.disconnect(); gain.disconnect(); } catch (e) {}
      };

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.12);
      osc2.stop(now + 0.12);
    } catch (e) {}
  }

  updateThreatLevel(threatCount) {
    if (!this.ctx || !this.droneFilter || !this.droneOsc) return;

    const targetFreq = 180 + Math.min(800, threatCount * 50);
    const targetPitch = 55 + Math.min(55, threatCount * 3);

    const now = this.ctx.currentTime;
    this.droneFilter.frequency.setTargetAtTime(targetFreq, now, 0.2);
    this.droneOsc.frequency.setTargetAtTime(targetPitch, now, 0.2);
  }

  playLaserPew(xPos) {
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.08);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    let panVal = 0;
    if (xPos !== undefined) {
      panVal = Math.max(-1.0, Math.min(1.0, xPos / 15.0));
    }

    if (this.ctx.createStereoPanner) {
      const panner = this.ctx.createStereoPanner();
      panner.pan.setValueAtTime(panVal, now);
      osc.connect(gain);
      gain.connect(panner);
      panner.connect(this.ctx.destination);
    } else {
      osc.connect(gain);
      gain.connect(this.ctx.destination);
    }

    osc.onended = () => {
      try { osc.disconnect(); gain.disconnect(); } catch(e) {}
    };

    try {
      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {}
  }

  playMissileLaunch(xPos) {
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.22);

    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    // Filter for deeper bass punch
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(120, now + 0.22);

    let panVal = 0;
    if (xPos !== undefined) {
      panVal = Math.max(-1.0, Math.min(1.0, xPos / 15.0));
    }

    if (this.ctx.createStereoPanner) {
      const panner = this.ctx.createStereoPanner();
      panner.pan.setValueAtTime(panVal, now);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(panner);
      panner.connect(this.ctx.destination);
    } else {
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
    }

    osc.onended = () => {
      try { osc.disconnect(); filter.disconnect(); gain.disconnect(); } catch(e) {}
    };

    try {
      osc.start(now);
      osc.stop(now + 0.22);
    } catch (e) {}
  }

  playQuantumArc(xPos) {
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const oscMod = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.14);

    oscMod.type = 'sawtooth';
    oscMod.frequency.setValueAtTime(60, now);
    modGain.gain.setValueAtTime(400, now);
    oscMod.connect(modGain);
    modGain.connect(osc.frequency);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    let panVal = 0;
    if (xPos !== undefined) {
      panVal = Math.max(-1.0, Math.min(1.0, xPos / 15.0));
    }

    if (this.ctx.createStereoPanner) {
      const panner = this.ctx.createStereoPanner();
      panner.pan.setValueAtTime(panVal, now);
      osc.connect(gain);
      gain.connect(panner);
      panner.connect(this.ctx.destination);
    } else {
      osc.connect(gain);
      gain.connect(this.ctx.destination);
    }

    try {
      oscMod.start(now);
      oscMod.stop(now + 0.14);
      osc.start(now);
      osc.stop(now + 0.14);
    } catch (e) {}
  }

  playTachyonNeedle(xPos, isCrit = false) {
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isCrit ? 'triangle' : 'sawtooth';
    osc.frequency.setValueAtTime(isCrit ? 1800 : 950, now);
    osc.frequency.exponentialRampToValueAtTime(isCrit ? 320 : 180, now + 0.1);

    gain.gain.setValueAtTime(isCrit ? 0.22 : 0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    let panVal = 0;
    if (xPos !== undefined) {
      panVal = Math.max(-1.0, Math.min(1.0, xPos / 15.0));
    }

    if (this.ctx.createStereoPanner) {
      const panner = this.ctx.createStereoPanner();
      panner.pan.setValueAtTime(panVal, now);
      osc.connect(gain);
      gain.connect(panner);
      panner.connect(this.ctx.destination);
    } else {
      osc.connect(gain);
      gain.connect(this.ctx.destination);
    }

    try {
      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) {}
  }

  playAegisIonBlast(xPos) {
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.12);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3200, now);
    filter.frequency.exponentialRampToValueAtTime(600, now + 0.12);

    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    let panVal = 0;
    if (xPos !== undefined) {
      panVal = Math.max(-1.0, Math.min(1.0, xPos / 15.0));
    }

    if (this.ctx.createStereoPanner) {
      const panner = this.ctx.createStereoPanner();
      panner.pan.setValueAtTime(panVal, now);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(panner);
      panner.connect(this.ctx.destination);
    } else {
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
    }

    try {
      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {}
  }

  playEnemyLaser(xPos) {
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(650, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.09);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    let panVal = 0;
    if (xPos !== undefined) {
      panVal = Math.max(-1.0, Math.min(1.0, xPos / 15.0));
    }

    if (this.ctx.createStereoPanner) {
      const panner = this.ctx.createStereoPanner();
      panner.pan.setValueAtTime(panVal, now);
      osc.connect(gain);
      gain.connect(panner);
      panner.connect(this.ctx.destination);
    } else {
      osc.connect(gain);
      gain.connect(this.ctx.destination);
    }

    osc.onended = () => {
      try { osc.disconnect(); gain.disconnect(); } catch(e) {}
    };

    try {
      osc.start(now);
      osc.stop(now + 0.09);
    } catch (e) {}
  }

  playHeavyCannonSound(xPos) {
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.18);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    let panVal = 0;
    if (xPos !== undefined) {
      panVal = Math.max(-1.0, Math.min(1.0, xPos / 15.0));
    }

    if (this.ctx.createStereoPanner) {
      const panner = this.ctx.createStereoPanner();
      panner.pan.setValueAtTime(panVal, now);
      osc.connect(gain);
      gain.connect(panner);
      panner.connect(this.ctx.destination);
    } else {
      osc.connect(gain);
      gain.connect(this.ctx.destination);
    }

    osc.onended = () => {
      try { osc.disconnect(); gain.disconnect(); } catch(e) {}
    };

    try {
      osc.start(now);
      osc.stop(now + 0.18);
    } catch (e) {}
  }

  playExplosion(xPos) {
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.06);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    let panVal = 0;
    if (xPos !== undefined) {
      panVal = Math.max(-1.0, Math.min(1.0, xPos / 15.0));
    }

    if (this.ctx.createStereoPanner) {
      const panner = this.ctx.createStereoPanner();
      panner.pan.setValueAtTime(panVal, now);
      osc.connect(gain);
      gain.connect(panner);
      panner.connect(this.ctx.destination);
    } else {
      osc.connect(gain);
      gain.connect(this.ctx.destination);
    }

    osc.onended = () => {
      try { osc.disconnect(); gain.disconnect(); } catch(e) {}
    };

    try {
      osc.start(now);
      osc.stop(now + 0.06);
    } catch (e) {}
  }

  playLaserHit(xPos) {
    this.playExplosion(xPos);
  }

  playPowerUpSound() {
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  playVictoryArpeggio() {
    this.ensureContext();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const now = this.ctx.currentTime + idx * 0.08;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    });
  }

  playTorpedoLaunch() {
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.25);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  playTorpedoExplosion() {
    this.playTorpedoExplode();
  }

  playTorpedoExplode() {
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();

    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(150, now);
    subOsc.frequency.exponentialRampToValueAtTime(30, now + 0.4);

    subGain.gain.setValueAtTime(0.3, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);

    subOsc.start(now);
    subOsc.stop(now + 0.4);

    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.25, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + 0.4);
  }

  playEmpPulse() {
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.35);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  playShipDamage() {
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.linearRampToValueAtTime(40, now + 0.15);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  playPlanetImpact() {
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + 0.6);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.6);
  }

  playGameOverSiren() {
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.linearRampToValueAtTime(110, now + 1.2);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 1.2);
  }

  vibrate(pattern) {
    if ('vibrate' in navigator) {
      try { navigator.vibrate(pattern); } catch (e) {}
    }
  }

  playLowShieldAlarm() {
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.linearRampToValueAtTime(220, now + 0.18);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.linearRampToValueAtTime(0.0001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.masterLimiter || this.ctx.destination);

    osc.onended = () => {
      try { osc.disconnect(); gain.disconnect(); } catch (e) {}
    };

    try {
      osc.start(now);
      osc.stop(now + 0.18);
    } catch (e) {}
  }

  playDodgeSound() {
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(450, now + 0.22);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.45);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    try {
      osc.start(now);
      osc.stop(now + 0.45);
    } catch (e) {}
  }

  playLockOnAlarm() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(440, now + 0.08);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.onended = () => { try { osc.disconnect(); gain.disconnect(); } catch(e){} };
    try { osc.start(now); osc.stop(now + 0.15); } catch(e){}
  }

  playLockBrokenSound() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.18);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.onended = () => { try { osc.disconnect(); gain.disconnect(); } catch(e){} };
    try { osc.start(now); osc.stop(now + 0.2); } catch(e){}
  }

  playHeavyCannonSound() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.35);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.onended = () => { try { osc.disconnect(); gain.disconnect(); } catch(e){} };
    try { osc.start(now); osc.stop(now + 0.35); } catch(e){}
  }

  setLowPassMuffle(enabled = true) {
    this.ensureContext();
    if (!this.ctx) return;
    if (!this.masterLowPassFilter) {
      this.masterLowPassFilter = this.ctx.createBiquadFilter();
      this.masterLowPassFilter.type = 'lowpass';
      this.masterLowPassFilter.frequency.setValueAtTime(20000, this.ctx.currentTime);
    }
    const targetFreq = enabled ? 550 : 20000;
    this.masterLowPassFilter.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.15);
  }

  vibrateSuperlaserCharge() {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([100, 50, 150, 50, 200, 50, 400]);
      } catch (e) {}
    }
  }

  vibrateSuperlaserImpact() {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([800, 100, 800, 100, 1200]);
      } catch (e) {}
    }
  }
}
