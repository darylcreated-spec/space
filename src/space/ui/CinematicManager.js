export class CinematicManager {
  constructor(gameManager = null, spaceHUD = null) {
    this.gameManager = gameManager;
    this.spaceHUD = spaceHUD;
    this.isPlaying = false;
    this.currentSlideIndex = 0;
    this.slideTimer = null;
    this.typewriterTimer = null;
    this.onCompleteCallback = null;

    this.scenes = [
      {
        id: 'frontier',
        image: '/cinematics/prologue_1_frontier.jpg',
        chapter: 'CHAPTER I // THE GOLDEN FRONTIER',
        location: 'EARTH ORBITAL DEFENSE GRID // STATION AEGIS-7',
        speaker: 'AWACS OVERLORD',
        persona: 'COMMAND',
        color: '#00f3ff',
        text: 'Solar Era 2184. Humanity flourished beneath the Aegis Orbital Defense Array. For sixty years, the Solar frontier knew peace... until today.',
        duration: 8000,
        kenBurns: 'kenburns-zoom-in'
      },
      {
        id: 'breach',
        image: '/cinematics/prologue_2_breach.jpg',
        chapter: 'CHAPTER II // THE SINGULARITY BREACH',
        location: 'SECTOR ALPHA IV // DEEP VOID GRAVITATIONAL TEAR',
        speaker: 'AEGIS-9 // TACTICAL AI',
        persona: 'AVIONICS',
        color: '#10b981',
        text: 'PRIORITY ALERT: Deep space listening post Orion-9 is gone. Massive gravitational rupture detected. An obsidian biomechanical swarm is disengaging from warp space!',
        duration: 8500,
        kenBurns: 'kenburns-pan-right'
      },
      {
        id: 'fall',
        image: '/cinematics/prologue_3_fall.jpg',
        chapter: 'CHAPTER III // PERIMETER COLLAPSE',
        location: 'OUTER DEFENSE MATRIX // ORBITAL ALPHA',
        speaker: 'AWACS OVERLORD',
        persona: 'COMMAND',
        color: '#ff0055',
        text: 'Outer battle groups are decimated! Vorn hive dreadnoughts have severed our planetary shield conduits! Sector Alpha IV defenses have failed!',
        duration: 8500,
        kenBurns: 'kenburns-pan-left'
      },
      {
        id: 'launch',
        image: '/cinematics/prologue_4_launch.jpg',
        chapter: 'CHAPTER IV // EMERGENCY SCRAMBLE',
        location: 'CATAPULT BAY 03 // VANGUARD PROTOTYPE',
        speaker: 'VANGUARD COMMAND',
        persona: 'COMMAND',
        color: '#00f3ff',
        text: 'Commander Daryl, launch clamps disengaged! You are cleared hot in the prototype Chronos Interceptor. You are humanity\'s last defense line. Godspeed!',
        duration: 9000,
        kenBurns: 'kenburns-zoom-out'
      }
    ];

    this.cacheElements();
    this.bindEvents();
  }

  setDependencies(gameManager, spaceHUD) {
    if (gameManager) this.gameManager = gameManager;
    if (spaceHUD) this.spaceHUD = spaceHUD;
  }

  cacheElements() {
    this.modal = document.getElementById('space-modal-cinematic');
    this.slideImage = document.getElementById('cinematic-slide-img');
    this.chapterTag = document.getElementById('cinematic-chapter-tag');
    this.locationTag = document.getElementById('cinematic-location-tag');
    this.speakerTag = document.getElementById('cinematic-speaker-tag');
    this.dialogueText = document.getElementById('cinematic-dialogue-text');
    this.dotsContainer = document.getElementById('cinematic-dots-container');
    this.btnSkip = document.getElementById('btn-skip-cinematic');
    this.btnNext = document.getElementById('btn-next-cinematic');
  }

  bindEvents() {
    if (this.btnSkip) {
      this.btnSkip.addEventListener('click', (e) => {
        e.stopPropagation();
        this.skip();
      });
    }

    if (this.btnNext) {
      this.btnNext.addEventListener('click', (e) => {
        e.stopPropagation();
        this.next();
      });
    }

    // Keyboard controls for cutscene
    window.addEventListener('keydown', (e) => {
      if (!this.isPlaying) return;
      if (e.code === 'Escape') {
        e.preventDefault();
        this.skip();
      } else if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowRight') {
        e.preventDefault();
        this.next();
      }
    });

    // Clicking anywhere on cinematic viewport advances slide
    const viewport = document.getElementById('cinematic-viewport');
    if (viewport) {
      viewport.addEventListener('click', (e) => {
        if (!e.target.closest('button')) {
          this.next();
        }
      });
    }
  }

  playPrologue(onCompleteCallback = null) {
    this.cacheElements();
    if (!this.modal) return;

    this.isPlaying = true;
    this.currentSlideIndex = 0;
    this.onCompleteCallback = onCompleteCallback;

    // Release any pointer lock and hide background HUD
    if (this.gameManager && this.gameManager.controlsManager) {
      this.gameManager.controlsManager.exitPointerLock();
    }

    this.modal.classList.remove('hidden');
    this.renderDots();
    this.loadSlide(this.currentSlideIndex);
  }

  renderDots() {
    if (!this.dotsContainer) return;
    this.dotsContainer.innerHTML = '';
    this.scenes.forEach((_, idx) => {
      const dot = document.createElement('div');
      dot.className = `cinematic-dot ${idx === this.currentSlideIndex ? 'active' : ''}`;
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        this.jumpToSlide(idx);
      });
      this.dotsContainer.appendChild(dot);
    });
  }

  updateDots() {
    if (!this.dotsContainer) return;
    const dots = this.dotsContainer.querySelectorAll('.cinematic-dot');
    dots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === this.currentSlideIndex);
    });
  }

  loadSlide(index) {
    if (index < 0 || index >= this.scenes.length) {
      this.complete();
      return;
    }

    this.currentSlideIndex = index;
    const scene = this.scenes[index];
    this.clearTimers();
    this.updateDots();

    // 1. Update Chapter & Location telemetry
    if (this.chapterTag) this.chapterTag.textContent = scene.chapter;
    if (this.locationTag) this.locationTag.textContent = scene.location;

    // 2. Update Speaker Badge
    if (this.speakerTag) {
      this.speakerTag.textContent = scene.speaker;
      this.speakerTag.style.color = scene.color;
      this.speakerTag.style.borderColor = scene.color;
      this.speakerTag.style.boxShadow = `0 0 10px ${scene.color}66`;
    }

    // 3. Update Image & Ken Burns Animation
    if (this.slideImage) {
      this.slideImage.className = 'cinematic-image-elem';
      void this.slideImage.offsetWidth;
      this.slideImage.src = scene.image;
      this.slideImage.classList.add(scene.kenBurns);
    }

    // 4. Trigger Voice Synthesizer & Audio Squelch
    if (this.gameManager) {
      if (this.gameManager.spaceAudio && this.gameManager.spaceAudio.playRadioSquelch) {
        this.gameManager.spaceAudio.playRadioSquelch();
      }
      if (this.gameManager.voiceAnnouncer && this.gameManager.voiceAnnouncer.enabled) {
        this.gameManager.voiceAnnouncer.speak(scene.text, true, scene.persona);
      }
    }

    // 5. Typewriter Subtitles
    this.typewriterText(scene.text);

    // 6. Schedule Next Slide
    this.slideTimer = setTimeout(() => {
      this.next();
    }, scene.duration);
  }

  typewriterText(fullText) {
    if (!this.dialogueText) return;
    this.dialogueText.textContent = '';
    let charIndex = 0;
    const speed = Math.max(15, Math.min(30, 2500 / fullText.length));

    this.typewriterTimer = setInterval(() => {
      if (charIndex < fullText.length) {
        this.dialogueText.textContent += fullText[charIndex];
        charIndex++;
      } else {
        clearInterval(this.typewriterTimer);
        this.typewriterTimer = null;
      }
    }, speed);
  }

  next() {
    if (!this.isPlaying) return;
    if (this.currentSlideIndex < this.scenes.length - 1) {
      this.loadSlide(this.currentSlideIndex + 1);
    } else {
      this.complete();
    }
  }

  jumpToSlide(idx) {
    if (!this.isPlaying) return;
    this.loadSlide(idx);
  }

  skip() {
    if (!this.isPlaying) return;
    this.complete();
  }

  complete() {
    this.isPlaying = false;
    this.clearTimers();

    try {
      if (window.speechSynthesis && window.speechSynthesis.cancel) {
        window.speechSynthesis.cancel();
      }
    } catch (e) {}

    if (this.modal) {
      this.modal.classList.add('fade-out');
      setTimeout(() => {
        this.modal.classList.add('hidden');
        this.modal.classList.remove('fade-out');
      }, 400);
    }

    if (this.onCompleteCallback) {
      const cb = this.onCompleteCallback;
      this.onCompleteCallback = null;
      cb();
    }
  }

  clearTimers() {
    if (this.slideTimer) {
      clearTimeout(this.slideTimer);
      this.slideTimer = null;
    }
    if (this.typewriterTimer) {
      clearInterval(this.typewriterTimer);
      this.typewriterTimer = null;
    }
  }
}
