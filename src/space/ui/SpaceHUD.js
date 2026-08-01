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
    this.scrapVal = document.getElementById('space-scrap');
    this.waveBadge = document.getElementById('space-wave-badge');

    this.bossBarContainer = document.getElementById('space-boss-bar-container');
    this.bossHpFill = document.getElementById('space-boss-hp-fill');

    this.waveBanner = document.getElementById('space-wave-banner');
    this.waveTitle = document.getElementById('space-wave-title');
    this.waveSubtitle = document.getElementById('space-wave-subtitle');

    this.btnFireTorpedo = document.getElementById('btn-fire-torpedo');
    this.btnFirePulse = document.getElementById('btn-fire-pulse');
    this.btnSpaceCamera = document.getElementById('btn-space-camera');

    this.cdRingTorpedo = document.getElementById('cd-ring-torpedo');
    this.cdRingPulse = document.getElementById('cd-ring-pulse');

    this.modalStart = document.getElementById('space-modal-start');
    this.btnStartGame = document.getElementById('btn-start-space');
    this.highScoreVal = document.getElementById('space-high-score');

    // Hangar Modal
    this.modalHangar = document.getElementById('space-modal-hangar');
    this.hangarScrapVal = document.getElementById('hangar-scrap-val');
    this.btnNextWave = document.getElementById('btn-next-wave');

    this.btnBuyThrust = document.getElementById('btn-buy-thrust');
    this.btnBuyShield = document.getElementById('btn-buy-shield');
    this.btnBuyLasers = document.getElementById('btn-buy-lasers');
    this.btnBuyEmp = document.getElementById('btn-buy-emp');

    this.upgLvlThrust = document.getElementById('upg-lvl-thrust');
    this.upgLvlShield = document.getElementById('upg-lvl-shield');
    this.upgLvlLasers = document.getElementById('upg-lvl-lasers');
    this.upgLvlEmp = document.getElementById('upg-lvl-emp');

    // Achievement Toast
    this.toastElem = document.getElementById('achievement-toast');
    this.achIcon = document.getElementById('ach-icon');
    this.achTitle = document.getElementById('ach-title');
    this.achDesc = document.getElementById('ach-desc');

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

    // Action Weapon Special Buttons (Tap Torpedo or EMP -> pauses rapid laser, fires special weapon, resumes lasers)
    if (this.btnFireTorpedo) {
      this.btnFireTorpedo.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        triggerStartIfInStartScreen();
        this.gameManager.fireTorpedo();
      });
    }

    if (this.btnFirePulse) {
      this.btnFirePulse.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        triggerStartIfInStartScreen();
        this.gameManager.fireEmpPulse();
      });
    }

    if (this.btnSpaceCamera) {
      this.btnSpaceCamera.addEventListener('click', (e) => {
        e.stopPropagation();
        this.gameManager.spaceAudio.vibrate(10);
        this.gameManager.spaceScene.toggleCameraMode();
      });
    }

    // Global Key Triggers
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

    if (this.modalStart) {
      this.modalStart.addEventListener('pointerdown', (e) => {
        triggerStartIfInStartScreen();
      });
    }

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

    // Hangar Upgrade Buttons
    if (this.btnNextWave) {
      this.btnNextWave.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.modalHangar) this.modalHangar.classList.add('hidden');
        this.gameManager.resumeNextWave();
      });
    }

    const bindUpgBtn = (btn, type) => {
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.gameManager.upgradeSystem.buyUpgrade(type)) {
            this.gameManager.spaceAudio.playPowerUpSound();
            this.updateHangarUI(this.gameManager.upgradeSystem);
            this.updateScrap(this.gameManager.upgradeSystem.scrap);
          }
        });
      }
    };

    bindUpgBtn(this.btnBuyThrust, 'thrust');
    bindUpgBtn(this.btnBuyShield, 'shield');
    bindUpgBtn(this.btnBuyLasers, 'lasers');
    bindUpgBtn(this.btnBuyEmp, 'emp');
  }

  showHangarModal(completedWaveNum, upgradeSystem) {
    if (this.modalHangar) {
      this.updateHangarUI(upgradeSystem);
      this.modalHangar.classList.remove('hidden');
    }
  }

  updateHangarUI(upgradeSystem) {
    if (this.hangarScrapVal) this.hangarScrapVal.textContent = upgradeSystem.scrap;

    const updateBtn = (btn, lvlSpan, type) => {
      const lvl = upgradeSystem.upgrades[type] || 0;
      const cost = upgradeSystem.getCost(type);

      if (lvlSpan) lvlSpan.textContent = `Lvl ${lvl} / 5`;
      if (btn) {
        if (lvl >= upgradeSystem.maxLevel) {
          btn.textContent = 'MAX LEVEL';
          btn.disabled = true;
        } else {
          btn.textContent = `UPGRADE (${cost} Scrap)`;
          btn.disabled = upgradeSystem.scrap < cost;
        }
      }
    };

    updateBtn(this.btnBuyThrust, this.upgLvlThrust, 'thrust');
    updateBtn(this.btnBuyShield, this.upgLvlShield, 'shield');
    updateBtn(this.btnBuyLasers, this.upgLvlLasers, 'lasers');
    updateBtn(this.btnBuyEmp, this.upgLvlEmp, 'emp');
  }

  showAchievementToast(ach) {
    if (this.toastElem) {
      this.achIcon.textContent = ach.icon;
      this.achTitle.textContent = ach.title;
      this.achDesc.textContent = ach.desc;

      this.toastElem.classList.remove('hidden');
      setTimeout(() => {
        this.toastElem.classList.add('hidden');
      }, 4000);
    }
  }

  updateHighScore(score) {
    if (this.highScoreVal) {
      this.highScoreVal.textContent = String(score).padStart(6, '0');
    }
  }

  updateScrap(amount) {
    if (this.scrapVal) {
      this.scrapVal.textContent = amount;
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
    if (this.planetHpFill) {
      const pPct = Math.max(0, data.planetHp);
      this.planetHpFill.style.width = `${pPct}%`;
      this.planetHpText.textContent = `${Math.round(pPct)}%`;
    }

    if (this.playerHpFill) {
      const sPct = Math.max(0, data.playerShield);
      this.playerHpFill.style.width = `${sPct}%`;
      this.playerHpText.textContent = `${Math.round(sPct)}%`;
    }

    if (this.bossBarContainer && this.bossHpFill) {
      if (data.bossHpRatio !== null) {
        this.bossBarContainer.classList.remove('hidden');
        this.bossHpFill.style.width = `${data.bossHpRatio * 100}%`;
      } else {
        this.bossBarContainer.classList.add('hidden');
      }
    }

    if (this.scoreVal) this.scoreVal.textContent = String(data.score).padStart(6, '0');
    if (this.scrapVal) this.scrapVal.textContent = data.scrap;
    if (this.waveBadge) this.waveBadge.textContent = `WAVE ${data.waveNum}`;

    if (this.cdRingTorpedo) this.cdRingTorpedo.style.opacity = data.torpedoCdRatio > 0 ? '1' : '0';
    if (this.cdRingPulse) this.cdRingPulse.style.opacity = data.pulseCdRatio > 0 ? '1' : '0';
  }
}
