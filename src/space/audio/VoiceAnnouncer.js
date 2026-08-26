export class VoiceAnnouncer {
  constructor(spaceAudio = null, spaceHUD = null) {
    this.spaceAudio = spaceAudio;
    this.spaceHUD = spaceHUD;
    this.enabled = true;
    this.lastSpokenTime = 0;
    this.selectedVoice = null;
    this.isUnlocked = false;
    this.queue = [];
    this.isProcessingQueue = false;

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

      // 🎯 Standardized Computer Desktop English Voices
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

      const enUS = voices.find(v => v.lang === 'en-US' || v.lang === 'en_US');
      if (enUS) {
        this.selectedVoice = enUS;
        return;
      }

      const anyEng = voices.find(v => v.lang && v.lang.startsWith('en'));
      if (anyEng) {
        this.selectedVoice = anyEng;
        return;
      }

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

  /**
   * Cleans text of raw markdown, slashes, and symbols so mobile speech engines
   * don't literally say "slash slash" or "bracket" out loud.
   */
  cleanTextForSpeech(text) {
    if (!text) return '';
    return text
      .replace(/\/\//g, ', ')
      .replace(/::/g, ', ')
      .replace(/\[.*?\]/g, ' ')
      .replace(/[\*\#\_\~]/g, '')
      .replace(/&/g, ' and ')
      .replace(/[🛡️⚡💥🛸🛰️👑🎮🚀]/g, '')
      .replace(/SEC-HASH:[^\s]+/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  speak(text, priority = false, sender = 'STARBOUND COMMAND', showHUD = true) {
    if (!text || !this.enabled) return;

    // 1. Play Tactical Radio Chirp
    if (this.spaceAudio && this.spaceAudio.playRadioChirp) {
      this.spaceAudio.playRadioChirp();
    }

    // 2. Synchronize with Tactical Radio Comms HUD
    if (showHUD && this.spaceHUD && this.spaceHUD.showRadioTransmission) {
      this.spaceHUD.showRadioTransmission(text, sender, priority ? 5.0 : 3.5);
    }

    if (!this.synth) return;

    const cleanedText = this.cleanTextForSpeech(text);
    if (!cleanedText) return;

    if (priority) {
      this.queue = [];
      try { this.synth.cancel(); } catch (e) {}
      this.executeSpeak(cleanedText);
    } else {
      this.queue.push(cleanedText);
      this.processQueue();
    }
  }

  processQueue() {
    if (this.isProcessingQueue || this.queue.length === 0) return;
    if (this.synth && this.synth.speaking) return;

    const nextText = this.queue.shift();
    if (nextText) {
      this.executeSpeak(nextText);
    }
  }

  executeSpeak(text) {
    if (!this.synth || !this.enabled) return;
    this.isProcessingQueue = true;

    try {
      if (this.synth.paused) {
        this.synth.resume();
      }

      if (!this.selectedVoice) {
        this.loadVoices();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Standardized authoritative military tactical computer voice parameters
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
        utterance.lang = this.selectedVoice.lang || 'en-US';
      } else {
        utterance.lang = 'en-US';
      }

      utterance.onend = () => {
        this.lastSpokenTime = performance.now();
        this.isProcessingQueue = false;
        setTimeout(() => this.processQueue(), 250);
      };

      utterance.onerror = () => {
        try { this.synth.resume(); } catch (e) {}
        this.isProcessingQueue = false;
        setTimeout(() => this.processQueue(), 150);
      };

      this.synth.speak(utterance);
    } catch (e) {
      console.warn("Speech Synthesis skipped on device:", e);
      this.isProcessingQueue = false;
    }
  }

  announceWave(waveNum, rawSubtitle) {
    let text = '';
    if (waveNum === 1) {
      text = "Wave 1. Iron Mantle. Clear the asteroid corridor!";
    } else if (waveNum === 2) {
      text = "Wave 2. Ring of Light. Halo Megastructure incursion!";
    } else if (waveNum === 3) {
      text = "Wave 3. Selene Shield. Lunar Citadel Moon Base!";
    } else if (waveNum === 4) {
      text = "Wave 4. Sanctuary Station. O'Neill Cylinder Citadel!";
    } else if (waveNum === 5) {
      text = "Wave 5. Extinction Protocol. Grand Armada Escalation! Warning! Hive Mothership Approaching!";
    } else {
      text = `Wave ${waveNum}. Endless Sector Defense. Battle stations ready!`;
    }

    this.speak(text, true, "STARBOUND COMMAND");
  }

  announceShieldCritical() {
    this.speak("Warning! Craft Shield Critical!", true, "TACTICAL COMPUTER");
  }

  announcePowerUp(type) {
    if (type === 'OVERCHARGE') this.speak("Overcharge Activated!", false, "SUBSYSTEMS");
    else if (type === 'REPAIR') this.speak("Nanites Repaired!", false, "SUBSYSTEMS");
    else if (type === 'STASIS') this.speak("Stasis Freeze Active!", false, "SUBSYSTEMS");
    else if (type === 'NUKE') this.speak("Tactical Nuke Detonated!", true, "TACTICAL WEAPONS");
  }
}


