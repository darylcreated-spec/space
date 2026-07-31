export class SpaceHUD {
  constructor(gameManager) {
    this.gameManager = gameManager;

    this.cacheElements();
    this.bindEvents();
  }

  cacheElements() {
    this.planetHpFill = document.getElementById('space-planet-hp-fill');
    this.planetHpText = document.getElementById('space-planet-hp-text');

    this.playerHpFill = document.getElementById('space-player-hp-fill');
    this.playerHpText = document.getElementById('space-player-hp-text');

    this.scoreVal = document.getElementById('space-score');
    this.waveBadge = document.getElementById('space-wave-badge');

    this.waveBanner = document.getElementById('space-wave-banner');
    this.waveTitle = document.getElementById('space-wave-title');
    this.waveSubtitle = document.getElementById('space-wave-subtitle');

    this.btnFireLaser = document.getElementById('btn-fire-laser');
    this.btnFireTorpedo = document.getElementById('btn-fire-torpedo');
    this.btnFirePulse = document.getElementById('btn-fire-pulse');
    this.btnSpaceCamera = document.getElementById('btn-space-camera');

    this.cdRingTorpedo = document.getElementById('cd-ring-torpedo');
    this.cdRingPulse = document.getElementById('cd-ring-pulse');

    this.modalStart = document.getElementById('space-modal-start');
    this.btnStartGame = document.getElementById('btn-start-space');
    this.highScoreVal = document.getElementById('space-high-score');

    this.modalGameOver = document.getElementById('space-modal-gameover');
    this.gameoverTitle = document.getElementById('space-gameover-title');
    this.gameoverReason = document.getElementById('space-gameover-reason');
    this.finalScore = document.getElementById('space-final-score');
    this.finalWave = document.getElementById('space-final-wave');
    this.finalKills = document.getElementById('space-final-kills');
    this.btnRestartGame = document.getElementById('btn-restart-space');
  }

  bindEvents() {
    const triggerStartIfInStartScreen = () => {
      if (this.gameManager.state === 'START') {
        if (this.modalStart) this.modalStart.classList.add('hidden');
        this.gameManager.startGame();
      }
    };

    // Action Buttons
    if (this.btnFireLaser) {
      this.btnFireLaser.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        triggerStartIfInStartScreen();
        this.gameManager.controlsManager.isLaserHeld = true;
      });
      window.addEventListener('pointerup', () => {
        this.gameManager.controlsManager.isLaserHeld = false;
      });
    }

    if (this.btnFireTorpedo) {
      this.btnFireTorpedo.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        triggerStartIfInStartScreen();
        this.gameManager.fireTorpedo();
      });
    }

    if (this.btnFirePulse) {
      this.btnFirePulse.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        triggerStartIfInStartScreen();
        this.gameManager.fireEmpPulse();
      });
    }

    if (this.btnSpaceCamera) {
      this.btnSpaceCamera.addEventListener('click', () => {
        this.gameManager.spaceAudio.vibrate(10);
        this.gameManager.spaceScene.toggleCameraMode();
      });
    }

    // Global Key Triggers to auto-engage defense if player presses any key!
    window.addEventListener('keydown', (e) => {
      if (this.gameManager.state === 'START') {
        if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter'].includes(e.code) ||
            ['w', 'a', 's', 'd', 'W', 'A', 'S', 'D', ' '].includes(e.key)) {
          triggerStartIfInStartScreen();
        }
      }

      if (e.code === 'KeyE' || e.key === 'e' || e.key === 'E') this.gameManager.fireTorpedo();
      if (e.code === 'KeyQ' || e.key === 'q' || e.key === 'Q' || e.code === 'ShiftLeft') this.gameManager.fireEmpPulse();
      if (e.code === 'KeyC' || e.key === 'c' || e.key === 'C') {
        this.gameManager.spaceAudio.vibrate(10);
        this.gameManager.spaceScene.toggleCameraMode();
      }
    });

    // Start Screen Modal Card Click Trigger
    if (this.modalStart) {
      this.modalStart.addEventListener('click', (e) => {
        triggerStartIfInStartScreen();
      });
    }

    // Start & Restart Buttons
    if (this.btnStartGame) {
      this.btnStartGame.addEventListener('click', (e) => {
        e.stopPropagation();
        triggerStartIfInStartScreen();
      });
    }

    if (this.btnRestartGame) {
      this.btnRestartGame.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.modalGameOver) this.modalGameOver.classList.add('hidden');
        this.gameManager.startGame();
      });
    }
  }

  updateHighScore(score) {
    if (this.highScoreVal) {
      this.highScoreVal.textContent = String(score).padStart(6, '0');
    }
  }

  showWaveBanner(waveNum, subtitle) {
    if (this.waveBanner) {
      this.waveTitle.textContent = `WAVE ${waveNum}`;
      this.waveSubtitle.textContent = subtitle;
      this.waveBanner.classList.remove('hidden');

      this.waveBanner.style.animation = 'none';
      this.waveBanner.offsetHeight;
      this.waveBanner.style.animation = 'bannerFade 3s ease forwards';
    }
  }

  showGameOverModal(data) {
    if (this.modalGameOver) {
      this.gameoverTitle.textContent = data.title;
      this.gameoverReason.textContent = data.reason;
      this.finalScore.textContent = String(data.finalScore).padStart(6, '0');
      this.finalWave.textContent = `Wave ${data.waveNum}`;
      this.finalKills.textContent = data.totalKills;
      this.modalGameOver.classList.remove('hidden');
    }
  }

  updateStatus(data) {
    // Planet HP Meter
    if (this.planetHpFill) {
      const pPct = Math.max(0, data.planetHp);
      this.planetHpFill.style.width = `${pPct}%`;
      this.planetHpText.textContent = `${Math.round(pPct)}%`;
      if (pPct < 30) {
        this.planetHpFill.style.background = 'linear-gradient(90deg, #ff0055, #ffea00)';
      } else {
        this.planetHpFill.style.background = 'linear-gradient(90deg, #00ff66, #00f3ff)';
      }
    }

    // Player Shield Meter
    if (this.playerHpFill) {
      const sPct = Math.max(0, data.playerShield);
      this.playerHpFill.style.width = `${sPct}%`;
      this.playerHpText.textContent = `${Math.round(sPct)}%`;
    }

    // Score & Wave
    if (this.scoreVal) {
      this.scoreVal.textContent = String(data.score).padStart(6, '0');
    }
    if (this.waveBadge) {
      this.waveBadge.textContent = `WAVE ${data.waveNum}`;
    }

    // Cooldown Rings
    if (this.cdRingTorpedo) {
      const tRatio = Math.max(0, data.torpedoCdRatio);
      this.cdRingTorpedo.style.opacity = tRatio > 0 ? '1' : '0';
    }
    if (this.cdRingPulse) {
      const pRatio = Math.max(0, data.pulseCdRatio);
      this.cdRingPulse.style.opacity = pRatio > 0 ? '1' : '0';
    }
  }
}
