export class SoundSynth {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.isInitialized = false;

    // Laser drone audio nodes
    this.laserOsc1 = null;
    this.laserOsc2 = null;
    this.laserGain = null;
    this.laserFilter = null;
  }

  init() {
    if (this.isInitialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      // Setup continuous laser drone background loop
      this.setupLaserDrone();
      this.isInitialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported', e);
    }
  }

  ensureContext() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setupLaserDrone() {
    if (!this.ctx) return;

    this.laserOsc1 = this.ctx.createOscillator();
    this.laserOsc2 = this.ctx.createOscillator();
    this.laserGain = this.ctx.createGain();
    this.laserFilter = this.ctx.createBiquadFilter();

    this.laserOsc1.type = 'sine';
    this.laserOsc1.frequency.setValueAtTime(65.41, this.ctx.currentTime); // C2 low hum

    this.laserOsc2.type = 'triangle';
    this.laserOsc2.frequency.setValueAtTime(130.81, this.ctx.currentTime); // C3 harmonic

    this.laserFilter.type = 'lowpass';
    this.laserFilter.frequency.setValueAtTime(250, this.ctx.currentTime);

    this.laserGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.laserOsc1.connect(this.laserFilter);
    this.laserOsc2.connect(this.laserFilter);
    this.laserFilter.connect(this.laserGain);
    this.laserGain.connect(this.ctx.destination);

    this.laserOsc1.start();
    this.laserOsc2.start();
  }

  setLaserActive(active, beamCount = 1) {
    if (!this.ctx || !this.laserGain || this.isMuted) return;

    const targetGain = active ? Math.min(0.08, 0.02 + beamCount * 0.01) : 0;
    const targetFreq = 200 + Math.min(600, beamCount * 80);

    const now = this.ctx.currentTime;
    this.laserGain.gain.setTargetAtTime(targetGain, now, 0.1);
    this.laserFilter.frequency.setTargetAtTime(targetFreq, now, 0.1);
  }

  playRotateChime() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Glass chime fundamental + harmonic overtones
    const freqs = [1046.5, 2093.0, 3135.96]; // C6, C7, G7
    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const vol = 0.15 / (idx + 1);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    });
  }

  playSnapChime() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.exponentialRampToValueAtTime(130.81, now + 0.12);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  playCoreEnergizedChime() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now); // A5
    osc.frequency.exponentialRampToValueAtTime(1760, now + 0.25); // A6 ping

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  playVictoryArpeggio() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 987.77, 1046.5, 1318.5]; // C major 7th / Pentatonic ascending
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const noteTime = now + idx * 0.09;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.18, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.6);
    });
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted && this.laserGain && this.ctx) {
      this.laserGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  vibrate(pattern) {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {}
    }
  }
}
