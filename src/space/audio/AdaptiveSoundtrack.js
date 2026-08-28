/**
 * Adaptive Web Audio Procedural Soundtrack Engine for Starbound
 * Generates dynamic multi-layer synthwave music in real-time without external audio downloads:
 * - Orbit Ambient Theme (Cosmic detuned pads, 55Hz sub-bass, celestial shimmer)
 * - Combat Adrenaline Theme (128 BPM analog bass arpeggio, synth percussion, energetic leads)
 * - Boss Battle Siege Theme (Dark chromatic chords, industrial resonance, dynamic intensity risers)
 */
export class AdaptiveSoundtrack {
  constructor(audioContext) {
    this.ctx = audioContext;
    this.state = 'ORBIT'; // 'ORBIT' | 'COMBAT' | 'BOSS' | 'VICTORY'
    this.isPlaying = false;
    this.masterGain = null;

    // Stem Gains
    this.ambientGain = null;
    this.combatGain = null;
    this.bossGain = null;

    // Arpeggiator & Rhythm Clock
    this.bpm = 128;
    this.step = 0;
    this.timerId = null;

    // Audio Nodes pool
    this.activeVoices = [];
  }

  init() {
    if (!this.ctx) return;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
    this.ambientGain.connect(this.masterGain);

    this.combatGain = this.ctx.createGain();
    this.combatGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
    this.combatGain.connect(this.masterGain);

    this.bossGain = this.ctx.createGain();
    this.bossGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
    this.bossGain.connect(this.masterGain);
  }

  start() {
    if (this.isPlaying || !this.ctx) return;
    this.isPlaying = true;

    // Start background Ambient Pad loop
    this._startAmbientPad();

    // Start 16th-note Rhythm Clock for combat arpeggiator & drums
    const intervalMs = (60 / this.bpm / 4) * 1000;
    this.timerId = setInterval(() => this._onTick(), intervalMs);
  }

  stop() {
    this.isPlaying = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.activeVoices.forEach(v => {
      try { v.stop(); v.disconnect(); } catch (e) {}
    });
    this.activeVoices = [];
  }

  setTheme(themeName) {
    if (!this.ctx) return;
    this.state = themeName;
    const now = this.ctx.currentTime;
    const fadeDuration = 1.5;

    if (themeName === 'ORBIT') {
      this.ambientGain.gain.setTargetAtTime(1.0, now, fadeDuration);
      this.combatGain.gain.setTargetAtTime(0.0, now, fadeDuration);
      this.bossGain.gain.setTargetAtTime(0.0, now, fadeDuration);
    } else if (themeName === 'COMBAT') {
      this.ambientGain.gain.setTargetAtTime(0.4, now, fadeDuration);
      this.combatGain.gain.setTargetAtTime(1.0, now, fadeDuration);
      this.bossGain.gain.setTargetAtTime(0.0, now, fadeDuration);
    } else if (themeName === 'BOSS') {
      this.ambientGain.gain.setTargetAtTime(0.2, now, fadeDuration);
      this.combatGain.gain.setTargetAtTime(0.7, now, fadeDuration);
      this.bossGain.gain.setTargetAtTime(1.0, now, fadeDuration);
    }
  }

  _startAmbientPad() {
    if (!this.ctx) return;

    // Celestial Pad Chords: D Minor / F Major / C Major ambient chord progression
    const freqs = [146.83, 220.0, 261.63, 329.63, 440.0]; // D3, A3, C4, E4, A4

    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = idx % 2 === 0 ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.detune.setValueAtTime((idx - 2) * 8, this.ctx.currentTime); // Chorus detune

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450 + idx * 80, this.ctx.currentTime);
      filter.Q.setValueAtTime(2.0, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ambientGain);

      try {
        osc.start();
        this.activeVoices.push(osc);
      } catch (e) {}
    });
  }

  _onTick() {
    if (!this.ctx || !this.isPlaying) return;
    this.step = (this.step + 1) % 16;
    const now = this.ctx.currentTime;

    // 1. Combat Bass Arpeggio (16th notes on D minor scale)
    if (this.state === 'COMBAT' || this.state === 'BOSS') {
      const bassScale = [73.42, 73.42, 110.0, 87.31, 73.42, 98.0, 110.0, 130.81]; // D2, A2, F2, G2, C3
      const noteFreq = bassScale[this.step % bassScale.length];

      this._playSynthBassNote(noteFreq, now);

      // Synthetic Kick on beats 0, 4, 8, 12
      if (this.step % 4 === 0) {
        this._playSynthKick(now);
      }

      // Snare / Hi-hat on beats 4, 12
      if (this.step % 8 === 4) {
        this._playSynthSnare(now);
      }
    }

    // 2. Boss Siege Stabs (Heavy tension chords on beats 0 and 8)
    if (this.state === 'BOSS' && (this.step === 0 || this.step === 8)) {
      this._playBossChord(now);
    }
  }

  _playSynthBassNote(freq, time) {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, time);
    filter.frequency.exponentialRampToValueAtTime(120, time + 0.14);

    gain.gain.setValueAtTime(0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.combatGain);

    osc.start(time);
    osc.stop(time + 0.18);
  }

  _playSynthKick(time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(35, time + 0.1);

    gain.gain.setValueAtTime(0.25, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    osc.connect(gain);
    gain.connect(this.combatGain);

    osc.start(time);
    osc.stop(time + 0.14);
  }

  _playSynthSnare(time) {
    // White noise snare transient
    const bufferSize = this.ctx.sampleRate * 0.08;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1200, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.08, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.combatGain);

    noise.start(time);
    noise.stop(time + 0.09);
  }

  _playBossChord(time) {
    // Dark Minor Diminished Tension Chord (D, F, Ab, C)
    [146.83, 174.61, 207.65, 261.63].forEach(freq => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, time);
      filter.Q.setValueAtTime(4.0, time);

      gain.gain.setValueAtTime(0.08, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.65);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.bossGain);

      osc.start(time);
      osc.stop(time + 0.7);
    });
  }
}
