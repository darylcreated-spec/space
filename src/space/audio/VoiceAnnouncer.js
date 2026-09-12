export const PERSONAS = {
  COMMAND: {
    id: 'COMMAND',
    name: 'COMMAND',
    callsign: 'AWACS OVERLORD',
    tag: 'AWACS // FLEET CONTROL',
    color: '#00f3ff', // Vanguard Cyan
    badgeBg: 'rgba(0, 243, 255, 0.15)',
    pitch: 0.95,
    rate: 1.02,
    volume: 1.0,
    preferredNames: ['David', 'Guy', 'Mark', 'Daniel', 'Alex', 'Google US English']
  },
  VIPER: {
    id: 'VIPER',
    name: 'VIPER',
    callsign: 'VIPER-1',
    tag: 'ESCORT LEAD // VIPER',
    color: '#ffaa00', // Tactical Amber
    badgeBg: 'rgba(255, 170, 0, 0.15)',
    pitch: 1.16,
    rate: 1.18,
    volume: 0.95,
    preferredNames: ['Ryan', 'George', 'Alex', 'David', 'English']
  },
  GHOST: {
    id: 'GHOST',
    name: 'GHOST',
    callsign: 'GHOST-4',
    tag: 'TACTICAL EW // GHOST',
    color: '#c084fc', // EW Lavender
    badgeBg: 'rgba(192, 132, 252, 0.15)',
    pitch: 0.85,
    rate: 1.06,
    volume: 0.90,
    preferredNames: ['Daniel', 'Oliver', 'Mark', 'English']
  },
  AVIONICS: {
    id: 'AVIONICS',
    name: 'AVIONICS',
    callsign: 'AEGIS-9',
    tag: 'ONBOARD AI // AEGIS-9',
    color: '#10b981', // Telemetry Emerald Green
    badgeBg: 'rgba(16, 185, 129, 0.15)',
    pitch: 1.32,
    rate: 1.25,
    volume: 1.0,
    preferredNames: ['Zira', 'Samantha', 'Victoria', 'Karen', 'Google US English']
  },
  IMPERIAL: {
    id: 'IMPERIAL',
    name: 'IMPERIAL',
    callsign: 'OVERLORD-01',
    tag: 'HOSTILE TRANSMISSION // MONOLITH',
    color: '#ff0033', // Brutalist Crimson
    badgeBg: 'rgba(255, 0, 51, 0.2)',
    pitch: 0.65,
    rate: 0.88,
    volume: 1.0,
    preferredNames: ['David', 'Mark', 'Guy', 'Google UK English Male']
  }
};

export class VoiceAnnouncer {
  constructor(spaceAudio = null, spaceHUD = null) {
    this.spaceAudio = spaceAudio;
    this.spaceHUD = spaceHUD;
    this.enabled = true;
    this.lastSpokenTime = 0;
    this.lastBanterTime = 0;
    this.selectedVoice = null;
    this.personaVoices = {};
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

      const englishVoices = voices.filter(v => v.lang && v.lang.startsWith('en'));
      const pool = englishVoices.length > 0 ? englishVoices : voices;

      // Default primary voice
      this.selectedVoice = pool.find(v => v.name && v.name.includes('David')) ||
                           pool.find(v => v.lang === 'en-US' || v.lang === 'en_US') ||
                           pool[0] || null;

      // Persona voice assignments
      Object.keys(PERSONAS).forEach(key => {
        const persona = PERSONAS[key];
        let matched = null;
        for (const pref of persona.preferredNames) {
          matched = pool.find(v => v.name && v.name.toLowerCase().includes(pref.toLowerCase()));
          if (matched) break;
        }
        this.personaVoices[key] = matched || this.selectedVoice;
      });
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

  /**
   * Dispatches speech and tactical radio effects for a specific persona.
   */
  speakPersona(personaKey = 'COMMAND', text = '', priority = false, duration = null) {
    if (!text || !this.enabled) return;

    const persona = PERSONAS[personaKey.toUpperCase()] || PERSONAS.COMMAND;
    const now = performance.now();

    // Anti-spam filter for non-priority combat banter
    if (!priority) {
      if (now - this.lastBanterTime < 3500 || (this.synth && this.synth.speaking)) {
        return; // Silently skip to avoid cluttered audio during high-intensity combat
      }
      this.lastBanterTime = now;
    }

    // 1. Procedural Tactical Radio Chirp
    if (this.spaceAudio && this.spaceAudio.playRadioChirp) {
      this.spaceAudio.playRadioChirp();
    }

    // 2. Synchronize with Tactical Radio Comms HUD
    const showDuration = duration || (priority ? 4.5 : 3.2);
    if (this.spaceHUD && this.spaceHUD.showRadioTransmission) {
      this.spaceHUD.showRadioTransmission(text, persona.tag, showDuration, persona.color);
    }

    if (!this.synth) return;

    const cleanedText = this.cleanTextForSpeech(text);
    if (!cleanedText) return;

    const utteranceItem = {
      text: cleanedText,
      persona: persona,
      priority: priority
    };

    if (priority) {
      this.queue = [];
      try { this.synth.cancel(); } catch (e) {}
      this.executeSpeak(utteranceItem);
    } else {
      this.queue.push(utteranceItem);
      this.processQueue();
    }
  }

  /**
   * Backwards-compatible generic speak method.
   */
  speak(text, priority = false, sender = 'STARBOUND COMMAND', showHUD = true) {
    if (!text || !this.enabled) return;

    // Detect persona from sender string if applicable
    let personaKey = 'COMMAND';
    const sUpper = sender.toUpperCase();
    if (sUpper.includes('VIPER') || sUpper.includes('ESCORT')) personaKey = 'VIPER';
    else if (sUpper.includes('GHOST') || sUpper.includes('EW') || sUpper.includes('ELECTRONIC')) personaKey = 'GHOST';
    else if (sUpper.includes('AVIONICS') || sUpper.includes('AI') || sUpper.includes('AEGIS') || sUpper.includes('COMPUTER') || sUpper.includes('SUBSYSTEMS')) personaKey = 'AVIONICS';
    else if (sUpper.includes('IMPERIAL') || sUpper.includes('MONOLITH') || sUpper.includes('HOSTILE') || sUpper.includes('DREADNOUGHT')) personaKey = 'IMPERIAL';

    const persona = PERSONAS[personaKey];
    const displayTag = sender === 'STARBOUND COMMAND' ? persona.tag : sender;

    if (this.spaceAudio && this.spaceAudio.playRadioChirp) {
      this.spaceAudio.playRadioChirp();
    }

    const showDuration = priority ? 4.5 : 3.2;
    if (showHUD && this.spaceHUD && this.spaceHUD.showRadioTransmission) {
      this.spaceHUD.showRadioTransmission(text, displayTag, showDuration, persona.color);
    }

    if (!this.synth) return;

    const cleanedText = this.cleanTextForSpeech(text);
    if (!cleanedText) return;

    const utteranceItem = {
      text: cleanedText,
      persona: persona,
      priority: priority
    };

    if (priority) {
      this.queue = [];
      try { this.synth.cancel(); } catch (e) {}
      this.executeSpeak(utteranceItem);
    } else {
      this.queue.push(utteranceItem);
      this.processQueue();
    }
  }

  processQueue() {
    if (this.isProcessingQueue || this.queue.length === 0) return;
    if (this.synth && this.synth.speaking) return;

    const nextItem = this.queue.shift();
    if (nextItem) {
      this.executeSpeak(nextItem);
    }
  }

  executeSpeak(item) {
    if (!this.synth || !this.enabled) return;

    // Windows Chromium and Android WebSpeech IPC synchronously block the browser render thread
    // during speech playback (300ms - 950ms freeze). Procedural radio SFX + HUD comms provide instant AAA immersion without thread lock.
    const isFreezePlatform = /Windows|Android/i.test(navigator.userAgent);
    if (isFreezePlatform) {
      this.isProcessingQueue = false;
      if (this.spaceAudio && this.spaceAudio.playRadioRelease) {
        setTimeout(() => this.spaceAudio.playRadioRelease(), 600);
      }
      return;
    }

    this.isProcessingQueue = true;

    try {
      if (this.synth.paused) {
        this.synth.resume();
      }

      const utterance = new SpeechSynthesisUtterance(item.text);
      const persona = item.persona || PERSONAS.COMMAND;

      utterance.rate = persona.rate;
      utterance.pitch = persona.pitch;
      utterance.volume = persona.volume;

      const personaVoice = this.personaVoices[persona.id] || this.selectedVoice;
      if (personaVoice) {
        utterance.voice = personaVoice;
        utterance.lang = personaVoice.lang || 'en-US';
      } else {
        utterance.lang = 'en-US';
      }

      utterance.onend = () => {
        this.lastSpokenTime = performance.now();
        this.isProcessingQueue = false;
        // Release squelch tail click
        if (this.spaceAudio && this.spaceAudio.playRadioRelease) {
          this.spaceAudio.playRadioRelease();
        }
        setTimeout(() => this.processQueue(), 200);
      };

      utterance.onerror = () => {
        try { this.synth.resume(); } catch (e) {}
        this.isProcessingQueue = false;
        if (this.spaceAudio && this.spaceAudio.playRadioRelease) {
          this.spaceAudio.playRadioRelease();
        }
        setTimeout(() => this.processQueue(), 150);
      };

      this.synth.speak(utterance);
    } catch (e) {
      console.warn("Speech Synthesis skipped on device:", e);
      this.isProcessingQueue = false;
    }
  }

  // ==================== TACTICAL COMBAT CALLOUT TRIGGERS ====================

  /**
   * Dynamic dogfight streak callouts (3 kills, 7 kills, 15 kills).
   */
  announceDogfightStreak(streak) {
    if (streak === 3) {
      const lines = [
        "Splash three bogeys! Clean shooting, lead!",
        "Triple kill! Maintain offensive vector!",
        "Three down! Good hunting, Vanguard!"
      ];
      const pick = lines[Math.floor(Math.random() * lines.length)];
      this.speakPersona('VIPER', pick, false);
    } else if (streak === 7) {
      const lines = [
        "Dominating the engagement zone! Seven confirmed hostiles neutralized!",
        "Command acknowledges: Outstanding marksmanship, Vanguard!",
        "Seven hostiles eliminated in rapid succession! Keep up the barrage!"
      ];
      const pick = lines[Math.floor(Math.random() * lines.length)];
      this.speakPersona('COMMAND', pick, false);
    } else if (streak === 15) {
      const lines = [
        "Unbelievable! Fifteen hostile signatures wiped from the grid!",
        "Viper-1 to Lead: You're an absolute apex predator!",
        "Dominating the entire combat theater! Fifteen confirmed kills!"
      ];
      const pick = lines[Math.floor(Math.random() * lines.length)];
      this.speakPersona('VIPER', pick, true);
    }
  }

  /**
   * Player shield depleted alert.
   */
  announceShieldCollapse() {
    const lines = [
      "Warning! Deflector shields collapsed! Hull taking direct fire!",
      "Shield matrix drained! Direct hull breach risk! Evasive recommended!"
    ];
    const pick = lines[Math.floor(Math.random() * lines.length)];
    this.speakPersona('AVIONICS', pick, true);
  }

  /**
   * Player low hull / near-death banter from wingman.
   */
  announceNearDeath() {
    const lines = [
      "Hang on, lead! Break hard, I'm providing covering fire!",
      "Viper-1 engaging hostiles on your tail! Pull up, lead!",
      "Stay with us, Vanguard! Break left, clearing your flight path!"
    ];
    const pick = lines[Math.floor(Math.random() * lines.length)];
    this.speakPersona('VIPER', pick, true);
  }

  /**
   * Wingman doctrine shift acknowledgment.
   */
  announceDoctrineSwitch(doctrine) {
    if (doctrine === 'FOCUS_FIRE') {
      this.speakPersona('VIPER', "Squadron Directive: Alpha Strike! Concentrating all fire on primary target!", true);
    } else if (doctrine === 'SWARM_FLANK') {
      this.speakPersona('GHOST', "Squadron Directive: Pincer Flank. Dispersing firing vectors across the sector.", true);
    } else {
      this.speakPersona('GHOST', "Squadron Directive: Aegis Escort. Tight defensive perimeter around lead ship.", true);
    }
  }

  /**
   * Monolithic Brutalist Empire hostile boss broadcast.
   */
  announceImperialIncursion(bossName = 'Dreadnought') {
    const lines = [
      "Insignificant vermin. The Monolith shall grind your vessel into stellar ash.",
      "Imperial Dreadnought online. Bow before the Brutalist Empire, or be atomized.",
      "Resistance is mathematically futile. Surrender your vessel to the Monolith."
    ];
    const pick = lines[Math.floor(Math.random() * lines.length)];
    this.speakPersona('IMPERIAL', pick, true, 5.0);
  }

  /**
   * Boss shield collapsed callout from Command.
   */
  announceBossShieldBroken() {
    const lines = [
      "Hostile deflector matrix shattered! Strike the exposed reactor core now!",
      "Target weakpoint exposed! All wings, pour on maximum firepower!"
    ];
    const pick = lines[Math.floor(Math.random() * lines.length)];
    this.speakPersona('COMMAND', pick, true);
  }

  /**
   * Superweapon armed alert.
   */
  announceSuperweaponReady(weaponName = 'Railgun') {
    this.speakPersona('AVIONICS', `${weaponName} fully charged and armed! Ready for deployment!`, false);
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

    this.speakPersona('COMMAND', text, true, 4.5);
  }

  announceShieldCritical() {
    this.announceShieldCollapse();
  }

  announcePowerUp(type) {
    if (type === 'OVERCHARGE') this.speakPersona('AVIONICS', "Overcharge Activated! Maximum weapon output!", false);
    else if (type === 'REPAIR') this.speakPersona('AVIONICS', "Nanite repair swarm deployed! Hull integrity restored!", false);
    else if (type === 'STASIS') this.speakPersona('GHOST', "Stasis field active! Hostile telemetry frozen!", false);
    else if (type === 'NUKE') this.speakPersona('COMMAND', "Tactical Antimatter Nuke detonated! Sector swept clean!", true);
  }
}



