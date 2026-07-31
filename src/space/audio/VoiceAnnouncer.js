export class VoiceAnnouncer {
  constructor() {
    try {
      this.synth = window.speechSynthesis || null;
    } catch (e) {
      this.synth = null;
    }
    this.enabled = true;
    this.lastSpokenTime = 0;
  }

  speak(text, priority = false) {
    if (!this.synth || !this.enabled) return;

    try {
      if (this.synth.speaking && !priority) return;

      if (priority) {
        this.synth.cancel();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.1;
      utterance.pitch = 0.9;
      utterance.volume = 0.8;

      const voices = this.synth.getVoices();
      if (voices && voices.length > 0) {
        const engVoice = voices.find(v => v.lang && v.lang.includes('en'));
        if (engVoice) utterance.voice = engVoice;
      }

      this.synth.speak(utterance);
    } catch (e) {
      console.warn("Speech Synthesis skipped on mobile device", e);
    }
  }

  announceWave(waveNum, subtitle) {
    if (waveNum === 5 || waveNum === 10) {
      this.speak("Warning! Sector Dreadnought Approaching!", true);
    } else {
      this.speak(`Wave ${waveNum}. ${subtitle}`);
    }
  }

  announceShieldCritical() {
    this.speak("Warning! Craft Shield Critical!", true);
  }

  announcePowerUp(type) {
    if (type === 'OVERCHARGE') this.speak("Overcharge Activated!");
    else if (type === 'REPAIR') this.speak("Nanites Repaired!");
    else if (type === 'STASIS') this.speak("Stasis Freeze Active!");
    else if (type === 'NUKE') this.speak("Tactical Nuke Detonated!", true);
  }
}
