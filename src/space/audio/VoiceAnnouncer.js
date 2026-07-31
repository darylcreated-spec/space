export class VoiceAnnouncer {
  constructor() {
    this.synth = window.speechSynthesis || null;
    this.enabled = true;
    this.lastSpokenTime = 0;
  }

  speak(text, priority = false) {
    if (!this.synth || !this.enabled) return;

    // Prevent speech overlap unless high priority
    if (this.synth.speaking && !priority) return;

    if (priority) {
      this.synth.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    utterance.pitch = 0.9;
    utterance.volume = 0.85;

    // Select English Voice if available
    const voices = this.synth.getVoices();
    const engVoice = voices.find(v => v.lang.includes('en'));
    if (engVoice) utterance.voice = engVoice;

    this.synth.speak(utterance);
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
