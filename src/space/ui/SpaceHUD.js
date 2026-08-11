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

    this.scoreVal = document.getElementById('space-score-val') || document.getElementById('space-score');
    this.scrapVal = document.getElementById('space-scrap-val') || document.getElementById('space-scrap');
    this.waveBadge = document.getElementById('space-wave-badge');

    this.bossBarContainer = document.getElementById('space-boss-bar-container');
    this.bossHpFill = document.getElementById('space-boss-hp-fill');

    this.waveBanner = document.getElementById('space-wave-banner');
    this.waveTitle = document.getElementById('banner-wave-title') || document.getElementById('space-wave-title');
    this.waveSubtitle = document.getElementById('banner-wave-subtitle') || document.getElementById('space-wave-subtitle');

    this.btnFirePulse = document.getElementById('btn-fire-pulse');
    this.btnSpaceCamera = document.getElementById('btn-space-camera');
    this.btnOpenHangar = document.getElementById('btn-open-hangar');

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
    this.btnBuyMagnet = document.getElementById('btn-buy-magnet');

    this.btnBuyRepair = document.getElementById('btn-buy-repair');
    this.btnBuyOvercharge = document.getElementById('btn-buy-overcharge');
    this.btnBuyStasis = document.getElementById('btn-buy-stasis');
    this.btnBuyNuke = document.getElementById('btn-buy-nuke');

    this.upgLvlThrust = document.getElementById('upg-lvl-thrust');
    this.upgLvlShield = document.getElementById('upg-lvl-shield');
    this.upgLvlLasers = document.getElementById('upg-lvl-lasers');
    this.upgLvlEmp = document.getElementById('upg-lvl-emp');
    this.upgLvlMagnet = document.getElementById('upg-lvl-magnet');

    this.btnSelectInterceptor = document.getElementById('btn-select-interceptor');
    this.btnSelectDreadnought = document.getElementById('btn-select-dreadnought');
    this.btnSelectTactician = document.getElementById('btn-select-tactician');
    this.btnSelectReaper = document.getElementById('btn-select-reaper');
    this.btnSelectSentinel = document.getElementById('btn-select-sentinel');
    this.btnDodgeRoll = document.getElementById('btn-dodge-roll');
    this.modalPerks = document.getElementById('space-modal-perks');
    this.perkCardsContainer = document.getElementById('perk-cards-container');

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

    // Settings Modal cache
    this.btnOpenSettings = document.getElementById('btn-open-settings');
    this.modalSettings = document.getElementById('space-modal-settings');
    this.btnCloseSettings = document.getElementById('btn-close-settings');
    this.btnGraphicsLow = document.getElementById('btn-graphics-low');
    this.btnGraphicsHigh = document.getElementById('btn-graphics-high');
    this.btnVoiceOff = document.getElementById('btn-voice-off');
    this.btnVoiceOn = document.getElementById('btn-voice-on');
    this.btnStartSettings = document.getElementById('btn-start-settings');
    this.btnExitGame = document.getElementById('btn-exit-game');

    // Run platform detection & adjust UI settings for Vercel Web vs. Android Native
    this.configurePlatformUI();
  }

  configurePlatformUI() {
    this.isNativeApp = window.Capacitor || window.cordova || navigator.userAgent.includes('WV') || window.location.search.includes('platform=android');
    
    // Show native exit button in settings only for Android App
    if (this.isNativeApp && this.btnExitGame) {
      this.btnExitGame.classList.remove('hidden');
    }

    // Hide desktop keyboard indicators completely if running natively as an app
    if (this.isNativeApp) {
      const keyboardLegend = document.querySelector('.desktop-controls-hint');
      if (keyboardLegend) {
        keyboardLegend.style.display = 'none';
      }
    }
  }

  bindEvents() {
    const triggerStartIfInStartScreen = () => {
      if (this.gameManager.state === 'START') {
        if (this.modalStart) this.modalStart.classList.add('hidden');
        this.gameManager.startGame();
      }
    };

    const selectShip = (selectedBtn, className) => {
      [
        this.btnSelectInterceptor,
        this.btnSelectDreadnought,
        this.btnSelectTactician,
        this.btnSelectReaper,
        this.btnSelectSentinel
      ].forEach(btn => {
        if (btn) {
          btn.classList.remove('active');
          btn.style.borderColor = 'rgba(255, 255, 255, 0.08)';
          btn.style.background = 'rgba(255, 255, 255, 0.02)';
          const str = btn.querySelector('strong');
          if (str) str.style.color = '#fff';
        }
      });
      if (selectedBtn) {
        selectedBtn.classList.add('active');
        selectedBtn.style.borderColor = 'var(--accent-cyan)';
        selectedBtn.style.background = 'rgba(0, 243, 255, 0.12)';
        const str = selectedBtn.querySelector('strong');
        if (str) str.style.color = 'var(--accent-cyan)';
      }
      this.gameManager.setSelectedShipClass(className);
    };

    const bindShipSelect = (btn, className) => {
      if (btn) {
        let triggered = false;
        const handler = (e) => {
          e.stopPropagation();
          e.preventDefault();
          if (triggered) return;
          triggered = true;
          setTimeout(() => { triggered = false; }, 300);
          selectShip(btn, className);
        };
        btn.addEventListener('pointerdown', handler, { passive: false });
        btn.addEventListener('click', handler);
      }
    };

    bindShipSelect(this.btnSelectInterceptor, 'INTERCEPTOR');
    bindShipSelect(this.btnSelectDreadnought, 'DREADNOUGHT');
    bindShipSelect(this.btnSelectTactician, 'TACTICIAN');
    bindShipSelect(this.btnSelectReaper, 'REAPER');
    bindShipSelect(this.btnSelectSentinel, 'SENTINEL');

    if (this.btnDodgeRoll) {
      this.btnDodgeRoll.addEventListener('click', (e) => {
        e.stopPropagation();
        this.gameManager.triggerDodgeRoll();
      });
    }

    // User-triggered Hangar Modal open
    if (this.btnOpenHangar) {
      this.btnOpenHangar.addEventListener('click', (e) => {
        e.stopPropagation();
        this.gameManager.spaceAudio.vibrate(15);
        this.showHangarModal(this.gameManager.waveSpawner.currentWave, this.gameManager.upgradeSystem);
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

    if (this.btnOpenSettings) {
      this.btnOpenSettings.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showSettingsModal();
      });
    }

    if (this.btnStartSettings) {
      this.btnStartSettings.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showSettingsModal();
      });
    }

    if (this.btnCloseSettings) {
      this.btnCloseSettings.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeSettingsModal();
      });
    }

    if (this.btnExitGame) {
      this.btnExitGame.addEventListener('click', (e) => {
        e.stopPropagation();
        if (navigator.app && navigator.app.exitApp) {
          navigator.app.exitApp();
        } else if (window.close) {
          window.close();
        } else {
          window.location.href = 'about:blank';
        }
      });
    }

    if (this.btnGraphicsLow) {
      this.btnGraphicsLow.addEventListener('click', (e) => {
        e.stopPropagation();
        localStorage.setItem('orbital_vanguard_graphics_quality', 'low');
        this.gameManager.postProcessing.setGraphicsQuality('low');
        this.updateSettingsUI();
      });
    }

    if (this.btnGraphicsHigh) {
      this.btnGraphicsHigh.addEventListener('click', (e) => {
        e.stopPropagation();
        localStorage.setItem('orbital_vanguard_graphics_quality', 'high');
        this.gameManager.postProcessing.setGraphicsQuality('high');
        this.updateSettingsUI();
      });
    }

    if (this.btnVoiceOff) {
      this.btnVoiceOff.addEventListener('click', (e) => {
        e.stopPropagation();
        this.gameManager.voiceAnnouncer.enabled = false;
        this.updateSettingsUI();
      });
    }

    if (this.btnVoiceOn) {
      this.btnVoiceOn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.gameManager.voiceAnnouncer.enabled = true;
        this.updateSettingsUI();
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

      if (e.code === 'KeyQ' || e.key === 'q' || e.key === 'Q' || e.code === 'ShiftLeft' || e.code === 'Space') this.gameManager.fireEmpPulse();
      if (e.code === 'KeyH' || e.key === 'h' || e.key === 'H') {
        this.showHangarModal(this.gameManager.waveSpawner.currentWave, this.gameManager.upgradeSystem);
      }
      if (e.code === 'KeyC' || e.key === 'c' || e.key === 'C') {
        this.gameManager.spaceAudio.vibrate(10);
        this.gameManager.spaceScene.toggleCameraMode();
      }
      if (e.code === 'Escape') {
        if (this.modalSettings && !this.modalSettings.classList.contains('hidden')) {
          this.closeSettingsModal();
        } else {
          this.showSettingsModal();
        }
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

    // Stop event propagation inside panel cards so clicking inside them does not trigger backdrop pointerdowns
    const stopCardProp = (selector) => {
      const card = document.querySelector(selector);
      if (card) {
        ['pointerdown', 'mousedown', 'click'].forEach(evtName => {
          card.addEventListener(evtName, (e) => e.stopPropagation());
        });
      }
    };
    stopCardProp('.space-start-card');
    stopCardProp('.settings-card');
    stopCardProp('.hangar-card');
    stopCardProp('.perk-choice-card');
    stopCardProp('.space-gameover-card');

    // Hangar Upgrade Buttons
    if (this.btnNextWave) {
      this.btnNextWave.addEventListener('click', (e) => {
        try {
          e.stopPropagation();
          if (this.modalHangar) this.modalHangar.classList.add('hidden');
          this.gameManager.resumeFromHangar();
        } catch (err) {
          console.error("CRITICAL ERROR IN RESUME DEFENSE CLICK:", err);
          alert("CRITICAL ERROR IN RESUME DEFENSE CLICK: " + err.message + "\n" + err.stack);
        }
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
    bindUpgBtn(this.btnBuyMagnet, 'magnet');

    const bindBoostBtn = (btn, boostType, cost, action) => {
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.gameManager.upgradeSystem.buyBoost(boostType, cost)) {
            this.gameManager.spaceAudio.playPowerUpSound();
            action();
            this.updateHangarUI(this.gameManager.upgradeSystem);
            this.updateScrap(this.gameManager.upgradeSystem.scrap);
          }
        });
      }
    };

    bindBoostBtn(this.btnBuyRepair, 'repair', 100, () => {
      this.gameManager.collectPowerUp('REPAIR');
    });
    bindBoostBtn(this.btnBuyOvercharge, 'overcharge', 120, () => {
      this.gameManager.overchargeTimer = 8.0;
    });
    bindBoostBtn(this.btnBuyStasis, 'stasis', 150, () => {
      this.gameManager.stasisTimer = 6.0;
    });
    bindBoostBtn(this.btnBuyNuke, 'nuke', 200, () => {
      this.gameManager.pendingNukeOnWaveStart = true;
    });
  }

  showRadioTransmission(message, sender = 'STARBOUND COMMAND', duration = 4.5) {
    if (!this.commsBox) {
      this.commsBox = document.getElementById('space-comms-box');
      this.commsSender = document.getElementById('comms-sender');
      this.commsMessage = document.getElementById('comms-message');
    }
    if (!this.commsBox || !this.commsMessage) return;

    if (this.commsSender) this.commsSender.textContent = sender;
    this.commsMessage.textContent = message;

    this.commsBox.classList.remove('hidden');
    if (this.commsTimer) clearTimeout(this.commsTimer);

    this.commsTimer = setTimeout(() => {
      this.commsBox.classList.add('hidden');
    }, duration * 1000);
  }

  showLockOnWarning(active, text = 'MISSILE LOCK DETECTED!') {
    if (!this.lockonBox) {
      this.lockonBox = document.getElementById('space-lockon-warning');
      this.lockonTitle = document.getElementById('lockon-title');
    }
    if (!this.lockonBox) return;

    if (active) {
      if (this.lockonTitle) this.lockonTitle.textContent = text;
      this.lockonBox.classList.remove('hidden');
    } else {
      this.lockonBox.classList.add('hidden');
    }
  }

  showHangarModal(completedWaveNum, upgradeSystem) {
    try {
      if (this.modalHangar) {
        this.gameManager.state = 'HANGAR';
        this.updateHangarUI(upgradeSystem);
        this.modalHangar.classList.remove('hidden');
      }
    } catch (err) {
      console.error("Error in showHangarModal UI code:", err);
    }
  }

  updateHangarUI(upgradeSystem) {
    if (this.hangarScrapVal) this.hangarScrapVal.textContent = upgradeSystem.scrap;

    const updateBtn = (btn, lvlSpan, type) => {
      const lvl = upgradeSystem.upgrades[type] || 0;
      const cost = upgradeSystem.getCost(type);

      if (lvlSpan) {
        let pipsHtml = `<div class="upgrade-pips" title="Lvl ${lvl} / 5">`;
        for (let i = 1; i <= 5; i++) {
          pipsHtml += `<span class="upg-pip ${i <= lvl ? 'active' : ''}"></span>`;
        }
        pipsHtml += '</div>';
        lvlSpan.innerHTML = pipsHtml;
      }
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
    updateBtn(this.btnBuyMagnet, this.upgLvlMagnet, 'magnet');

    if (this.btnBuyRepair) this.btnBuyRepair.disabled = upgradeSystem.scrap < 100;
    if (this.btnBuyOvercharge) this.btnBuyOvercharge.disabled = upgradeSystem.scrap < 120;
    if (this.btnBuyStasis) this.btnBuyStasis.disabled = upgradeSystem.scrap < 150;
    if (this.btnBuyNuke) this.btnBuyNuke.disabled = upgradeSystem.scrap < 200;
  }

  showAchievementToast(ach) {
    try {
      if (this.toastElem) {
        if (this.achIcon) this.achIcon.textContent = ach.icon || '🏆';
        if (this.achTitle) this.achTitle.textContent = ach.title || '';
        if (this.achDesc) this.achDesc.textContent = ach.desc || '';

        this.toastElem.classList.remove('hidden');
        setTimeout(() => {
          if (this.toastElem) this.toastElem.classList.add('hidden');
        }, 4000);
      }
    } catch (err) {
      console.error("Error in showAchievementToast:", err);
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
      this.waveTitle.textContent = typeof waveNum === 'number' ? `WAVE ${waveNum}` : waveNum;
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

    if (this.cdRingPulse) this.cdRingPulse.style.opacity = data.pulseCdRatio > 0 ? '1' : '0';
  }

  showPerksModal(perks, onSelectCallback) {
    if (!this.modalPerks || !this.perkCardsContainer) return;
    this.perkCardsContainer.innerHTML = '';

    perks.forEach(perk => {
      const card = document.createElement('div');
      card.className = 'perk-card';

      let icon = '🌀';
      if (perk.id === 'piercing') icon = '⚡';
      else if (perk.id === 'siphon') icon = '💚';
      else if (perk.id === 'retaliate') icon = '💥';
      else if (perk.id === 'magnet') icon = '🧲';
      else if (perk.id === 'crit') icon = '🟥';
      else if (perk.id === 'dodge_boost') icon = '🚀';

      card.innerHTML = `
        <div class="perk-icon">${icon}</div>
        <div class="perk-title">${perk.name}</div>
        <div class="perk-desc">${perk.desc}</div>
      `;

      let triggered = false;
      const selectPerkHandler = (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (triggered) return;
        triggered = true;
        setTimeout(() => { triggered = false; }, 300);
        this.gameManager.spaceAudio.playPowerUpSound();
        this.modalPerks.classList.add('hidden');
        onSelectCallback(perk);
      };
      card.addEventListener('pointerdown', selectPerkHandler, { passive: false });
      card.addEventListener('click', selectPerkHandler);

      this.perkCardsContainer.appendChild(card);
    });

    this.gameManager.state = 'PERK_SELECTION';
    this.modalPerks.classList.remove('hidden');
  }

  showSettingsModal() {
    if (!this.modalSettings) return;
    
    this.prevHUDState = this.gameManager.state;
    if (this.gameManager.state === 'PLAYING') {
      this.gameManager.state = 'SETTINGS';
    }
    
    this.updateSettingsUI();
    this.modalSettings.classList.remove('hidden');
  }

  closeSettingsModal() {
    if (!this.modalSettings) return;
    this.modalSettings.classList.add('hidden');
    
    if (this.gameManager.state === 'SETTINGS') {
      this.gameManager.state = this.prevHUDState || 'PLAYING';
    }
  }

  updateSettingsUI() {
    const savedQuality = localStorage.getItem('orbital_vanguard_graphics_quality');
    const quality = savedQuality || (this.gameManager.postProcessing.isMobile ? 'low' : 'high');
      
    if (this.btnGraphicsLow && this.btnGraphicsHigh) {
      if (quality === 'low') {
        this.btnGraphicsLow.classList.add('active');
        this.btnGraphicsHigh.classList.remove('active');
      } else {
        this.btnGraphicsLow.classList.remove('active');
        this.btnGraphicsHigh.classList.add('active');
      }
    }

    const voiceEnabled = this.gameManager.voiceAnnouncer.enabled;
    if (this.btnVoiceOff && this.btnVoiceOn) {
      if (voiceEnabled) {
        this.btnVoiceOff.classList.remove('active');
        this.btnVoiceOn.classList.add('active');
      } else {
        this.btnVoiceOff.classList.add('active');
        this.btnVoiceOn.classList.remove('active');
      }
    }
  }
}
