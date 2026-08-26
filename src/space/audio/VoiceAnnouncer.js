export class VoiceAnnouncer {
  constructor(spaceAudio = null, spaceHUD = null) {
    this.spaceAudio = spaceAudio;
    this.spaceHUD = spaceHUD;
    this.enabled = true;
    this.lastSpokenTime = 0;
    this.selectedVoice = null;
    this.isUnlocked = false;

    try {
      this.synth = window.speechSynthesis || null;
      if (this.synth) {
        this.loadVoices();
        if (typeof this.synth.onvoiceschanged !== 'undefined') {
          this.synth.onvoiceschanged = () => this.loadVoices();
        }
      }
    } catch (e) {
      this.synth = null;
    }

    // Auto-bind touch/click unlock for mobile browsers
    this.setupMobileUnlock();
  }

  setDependencies(spaceAudio, spaceHUD) {
    if (spaceAudio) this.spaceAudio = spaceAudio;
    if (spaceHUD) this.spaceHUD = spaceHUD;
  }

  loadVoices() {
    if (!this.synth) return;
    try {
      const voices = this.synth.getVoices();
      if (!voices || voices.length === 0) return;

      // 🎯 Computer Browser Voice Standardization Hierarchy:
      // Priority 1: High-Definition Desktop Computer English Voices
      const preferredComputerNames = [
        'Google US English',
        'Microsoft David',
        'Microsoft Mark',
        'Microsoft Guy',
        'Microsoft Ryan',
        'Microsoft Zira',
        'Chrome OS US English',
        'Samantha',
        'Daniel',
        'Alex'
      ];

      for (const prefName of preferredComputerNames) {
        const found = voices.find(v => v.name && v.name.toLowerCase().includes(prefName.toLowerCase()));
        if (found) {
          this.selectedVoice = found;
          return;
        }
      }

      // Priority 2: en-US Natural / Primary English voices
      const enUS = voices.find(v => v.lang === 'en-US' || v.lang === 'en_US');
      if (enUS) {
        this.selectedVoice = enUS;
        return;
      }

      // Priority 3: Any English voice
      const anyEng = voices.find(v => v.lang && v.lang.startsWith('en'));
      if (anyEng) {
        this.selectedVoice = anyEng;
        return;
      }

      // Fallback
      this.selectedVoice = voices[0] || null;
    } catch (e) {
      console.warn("Could not load speech voices:", e);
    }
  }

  setupMobileUnlock() {
    const unlockHandler = () => {
      this.unlock();
      window.removeEventListener('pointerdown', unlockHandler);
      window.removeEventListener('touchstart', unlockHandler);
      window.removeEventListener('click', unlockHandler);
    };

    window.addEventListener('pointerdown', unlockHandler, { passive: true, once: true });
    window.addEventListener('touchstart', unlockHandler, { passive: true, once: true });
    window.addEventListener('click', unlockHandler, { passive: true, once: true });
  }

  unlock() {
    if (this.isUnlocked || !this.synth) return;
    this.isUnlocked = true;

    try {
      if (this.synth.paused) {
        this.synth.resume();
      }
      this.loadVoices();
      
      // Prime mobile Web Speech engine with silent micro-utterance
      const blankUtterance = new SpeechSynthesisUtterance(' ');
      blankUtterance.volume = 0.01;
      blankUtterance.rate = 2.0;
      this.synth.speak(blankUtterance);
    } catch (e) {}
  }

  speak(text, priority = false, sender = 'STARBOUND COMMAND', showHUD = true) {
    if (!text || !this.enabled) return;

    // 1. Play Tactical Radio Chirp on all browsers
    if (this.spaceAudio && this.spaceAudio.playRadioChirp) {
      this.spaceAudio.playRadioChirp();
    }

    // 2. Synchronize with Tactical Radio Comms HUD if available
    if (showHUD && this.spaceHUD && this.spaceHUD.showRadioTransmission) {
      this.spaceHUD.showRadioTransmission(text, sender, priority ? 5.0 : 3.5);
    }

    if (!this.synth) return;

    try {
      // Un-stall Android / iOS if paused
      if (this.synth.paused) {
        this.synth.resume();
      }

      if (this.synth.speaking) {
        if (priority) {
          this.synth.cancel();
        } else {
          return;
        }
      }

      if (!this.selectedVoice) {
        this.loadVoices();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Authoritative Computer Tactical Voice Parameters
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
        utterance.lang = this.selectedVoice.lang || 'en-US';
      } else {
        utterance.lang = 'en-US';
      }

      // Safety handlers against Android speech freeze bug
      utterance.onend = () => {
        this.lastSpokenTime = performance.now();
      };
      utterance.onerror = () => {
        try { this.synth.resume(); } catch (e) {}
      };

      this.synth.speak(utterance);
    } catch (e) {
      console.warn("Speech Synthesis skipped on device:", e);
    }
  }

  announceWave(waveNum, subtitle) {
    if (waveNum === 5 || waveNum === 10) {
      this.speak("Warning! Sector Dreadnought Approaching!", true, "STARBOUND COMMAND");
    } else {
      const text = subtitle ? `Wave ${waveNum}. ${subtitle}` : `Wave ${waveNum}. Battle stations ready!`;
      this.speak(text, false, "STARBOUND COMMAND");
    }
  }

  announceShieldCritical() {
    this.speak("Warning! Craft Shield Critical!", true, "TACTICAL COMPUTER");
  }

  announcePowerUp(type) {
    if (type === 'OVERCHARGE') this.speak("Overcharge Matrix Activated!", false, "SUBSYSTEMS");
    else if (type === 'REPAIR') this.speak("Nano-Repair Grid Active!", false, "SUBSYSTEMS");
    else if (type === 'STASIS') this.speak("Stasis Web Deployed!", false, "SUBSYSTEMS");
    else if (type === 'NUKE') this.speak("Tactical Nuke Detonated!", true, "TACTICAL WEAPONS");
  }
}

