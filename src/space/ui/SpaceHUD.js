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
    this.bossTitleElem = document.getElementById('space-boss-title');

    this.waveBanner = document.getElementById('space-wave-banner');
    this.waveTitle = document.getElementById('banner-wave-title') || document.getElementById('space-wave-title');
    this.waveSubtitle = document.getElementById('banner-wave-subtitle') || document.getElementById('space-wave-subtitle');

    this.btnFirePulse = document.getElementById('btn-fire-pulse');
    this.btnFireSwarm = document.getElementById('btn-fire-swarm');
    this.btnHyperBoost = document.getElementById('btn-hyper-boost');
    this.btnSpaceCamera = document.getElementById('btn-space-camera');
    this.btnOpenHangar = document.getElementById('btn-open-hangar');

    this.cdRingPulse = document.getElementById('cd-ring-pulse');
    this.cdRingSwarm = document.getElementById('cd-ring-swarm');

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
    this.btnBuyMiningAddon = document.getElementById('btn-buy-mining-addon');
    this.miningAddonStatus = document.getElementById('mining-addon-status');

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

    // Fleet Inspector Modal cache
    this.btnOpenFleetInspector = document.getElementById('btn-open-fleet-inspector');
    this.modalFleet = document.getElementById('space-modal-fleet');
    this.btnCloseFleet = document.getElementById('btn-close-fleet');
    this.btnFleetShowcaseAll = document.getElementById('btn-fleet-showcase-all');
    this.btnFleetToggleGod = document.getElementById('btn-fleet-toggle-god');
    this.btnFleetToggleFreeze = document.getElementById('btn-fleet-toggle-freeze');
    this.btnFleetClearAll = document.getElementById('btn-fleet-clear-all');
    this.fleetGodBtnText = document.getElementById('fleet-god-btn-text');
    this.fleetFreezeBtnText = document.getElementById('fleet-freeze-btn-text');
    this.fleetGodStatus = document.getElementById('fleet-god-status');

    // Settings Modal cache
    this.btnOpenSettings = document.getElementById('btn-open-settings');
    this.modalSettings = document.getElementById('space-modal-settings');
    this.btnCloseSettings = document.getElementById('btn-close-settings');
    this.btnGraphicsLow = document.getElementById('btn-graphics-low');
    this.btnGraphicsHigh = document.getElementById('btn-graphics-high');
    this.btnGraphicsUltra = document.getElementById('btn-graphics-ultra');
    this.btnVoiceOff = document.getElementById('btn-voice-off');
    this.btnVoiceOn = document.getElementById('btn-voice-on');
    this.btnStartSettings = document.getElementById('btn-start-settings');
    this.btnExitGame = document.getElementById('btn-exit-game');
    this.inputGodmodeCode = document.getElementById('input-godmode-code');
    this.btnSubmitGodmode = document.getElementById('btn-submit-godmode');
    this.godmodeActivePill = document.getElementById('godmode-active-pill');

    // Pilot Registration & Profile Elements
    this.modalPilotReg = document.getElementById('space-modal-pilot-reg');
    this.formPilotReg = document.getElementById('form-pilot-registration');
    this.inputPilotName = document.getElementById('input-pilot-name');
    this.inputPilotEmail = document.getElementById('input-pilot-email');
    this.previewPilotCallsign = document.getElementById('preview-pilot-callsign');
    this.holoPilotName = document.getElementById('holo-pilot-name');
    this.btnAuthorizePilot = document.getElementById('btn-authorize-pilot');
    this.hudPilotCallsign = document.getElementById('hud-pilot-callsign');
    this.hudPilotEmail = document.getElementById('hud-pilot-email');
    this.hudPilotRank = document.getElementById('hud-pilot-rank');
    this.btnOpenPilotProfile = document.getElementById('btn-open-pilot-profile');
    this.btnReopenPilotReg = document.getElementById('btn-reopen-pilot-reg');
    this.settingsPilotDisplay = document.getElementById('settings-pilot-display');

    // Top Navigation Action Triggers
    this.btnTopHangar = document.getElementById('btn-top-hangar');
    this.btnTopFleet = document.getElementById('btn-top-fleet');
    this.btnTopConfig = document.getElementById('btn-top-config');

    // Drawer Top Close Buttons
    this.btnCloseHangarTop = document.getElementById('btn-close-hangar-top');
    this.btnCloseFleetTop = document.getElementById('btn-close-fleet-top');
    this.btnCloseSettingsTop = document.getElementById('btn-close-settings-top');

    // Run platform detection & adjust UI settings for Vercel Web vs. Android Native
    this.configurePlatformUI();
    this.initPilotProfile();
  }

  configurePlatformUI() {
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i.test(navigator.userAgent) || 
                           ('ontouchstart' in window) || 
                           (navigator.maxTouchPoints > 0) || 
                           (window.innerWidth <= 768);
    this.isMobile = isMobileDevice;
    this.isNativeApp = window.Capacitor || window.cordova || navigator.userAgent.includes('WV') || window.location.search.includes('platform=android');
    
    if (this.isMobile || this.isNativeApp) {
      document.body.classList.add('is-mobile-browser');
    }

    // Show native exit button in settings only for Android App
    if (this.isNativeApp && this.btnExitGame) {
      this.btnExitGame.classList.remove('hidden');
    }

    // Hide desktop keyboard indicators completely if running on mobile browser or native app
    if (this.isMobile || this.isNativeApp) {
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
        }
      });
      if (selectedBtn) {
        selectedBtn.classList.add('active');
        this.gameManager.spaceAudio.vibrate(12);
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

    if (this.btnFireSwarm) {
      this.btnFireSwarm.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        triggerStartIfInStartScreen();
        this.gameManager.fireSwarmMissiles();
      });
    }

    if (this.btnHyperBoost) {
      this.btnHyperBoost.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        triggerStartIfInStartScreen();
        this.gameManager.triggerHyperBoost();
      });
    }

    if (this.btnSpaceCamera) {
      this.btnSpaceCamera.addEventListener('click', (e) => {
        e.stopPropagation();
        this.gameManager.spaceAudio.vibrate(10);
        this.gameManager.spaceScene.toggleCameraMode();
      });
    }

    // Fleet Inspector Modal Event Handlers
    if (this.btnOpenFleetInspector) {
      this.btnOpenFleetInspector.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showFleetModal();
      });
    }

    if (this.btnCloseFleet) {
      this.btnCloseFleet.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeFleetModal();
      });
    }

    if (this.btnFleetShowcaseAll) {
      this.btnFleetShowcaseAll.addEventListener('click', (e) => {
        e.stopPropagation();
        this.gameManager.spawnAllFleetFormation();
        this.closeFleetModal();
      });
    }

    if (this.btnFleetToggleGod) {
      this.btnFleetToggleGod.addEventListener('click', (e) => {
        e.stopPropagation();
        const isGod = this.gameManager.toggleGodMode();
        if (this.fleetGodBtnText) {
          this.fleetGodBtnText.textContent = isGod ? '🛡️ GOD MODE: ON' : '🛡️ GOD MODE: OFF';
        }
        if (this.fleetGodStatus) {
          this.fleetGodStatus.textContent = isGod ? 'INVULNERABILITY: ACTIVE' : 'INVULNERABILITY: READY';
          this.fleetGodStatus.style.color = isGod ? '#00ff66' : '#00f3ff';
        }
      });
    }

    if (this.btnFleetToggleFreeze) {
      this.btnFleetToggleFreeze.addEventListener('click', (e) => {
        e.stopPropagation();
        const isFrozen = this.gameManager.toggleFreezeFleetAI();
        if (this.fleetFreezeBtnText) {
          this.fleetFreezeBtnText.textContent = isFrozen ? '⏸️ FREEZE AI: ON' : '⏸️ FREEZE AI: OFF';
        }
      });
    }

    if (this.btnFleetClearAll) {
      this.btnFleetClearAll.addEventListener('click', (e) => {
        e.stopPropagation();
        this.gameManager.clearAllThreats();
        this.gameManager.clearAllEntities();
      });
    }

    // Individual inspect solo and spawn battle buttons
    document.querySelectorAll('.btn-inspect-solo').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const shipKey = btn.dataset.ship;
        if (shipKey) {
          this.gameManager.spawnSoloInspect(shipKey);
          this.closeFleetModal();
        }
      });
    });

    document.querySelectorAll('.btn-spawn-battle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const shipKey = btn.dataset.ship;
        if (shipKey) {
          this.closeFleetModal();
          this.closeHangarModal();
          this.gameManager.state = 'PLAYING';
          if (this.modalStart) this.modalStart.classList.add('hidden');
          switch(shipKey) {
            case 'DRONE': this.gameManager.spawnDrone(); break;
            case 'STEALTH': this.gameManager.spawnStealthFighter(); break;
            case 'CRUISER': this.gameManager.spawnCapitalShip(); break;
            case 'BATTLESHIP': this.gameManager.spawnHeavyBattleship(); break;
            case 'CARRIER': this.gameManager.spawnCarrierBoss(); break;
            case 'MOONBASE': this.gameManager.spawnSpaceStation(); break;
            case 'HALO': this.gameManager.spawnHaloBoss(); break;
            case 'SANCTUARY_CYLINDER': this.gameManager.spawnSanctuaryCylinderBoss(); break;
            case 'MOTHERSHIP': this.gameManager.spawnCommandMothership(); break;
            case 'TITAN': this.gameManager.spawnTitanBoss(); break;
            case 'DREADNOUGHT': this.gameManager.spawnBoss(); break;
          }
        }
      });
    });

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

    if (this.btnGraphicsUltra) {
      this.btnGraphicsUltra.addEventListener('click', (e) => {
        e.stopPropagation();
        localStorage.setItem('orbital_vanguard_graphics_quality', 'ultra');
        this.gameManager.postProcessing.setGraphicsQuality('ultra');
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

    // Admiralty Authorization God Mode Code Handler
    const handleGodModeCodeSubmit = () => {
      if (!this.inputGodmodeCode) return;
      const entered = this.inputGodmodeCode.value.trim().toLowerCase();
      const GOD_MODE_CODE = 'daryl.created@gmail.com';

      if (entered === GOD_MODE_CODE) {
        const active = this.gameManager.toggleGodMode();
        this.inputGodmodeCode.value = '';
        this.updateSettingsUI();
        if (active) {
          this.showRadioTransmission("⚡ ADMIRALTY AUTHORIZATION ACCEPTED: GOD MODE ACTIVE (Shield takes NO damage)", "ADMIRALTY COMMAND", 6.0);
        } else {
          this.showRadioTransmission("ADMIRALTY GOD MODE DEACTIVATED (Standard Combat Vulnerability)", "ADMIRALTY COMMAND", 4.0);
        }
      } else if (entered.length > 0) {
        this.inputGodmodeCode.style.borderColor = '#ff0055';
        setTimeout(() => {
          if (this.inputGodmodeCode) this.inputGodmodeCode.style.borderColor = 'rgba(0, 243, 255, 0.45)';
        }, 1200);
        this.showRadioTransmission("ACCESS DENIED: Invalid Authorization Code", "SECURITY CORE", 3.0);
      }
    };

    if (this.btnSubmitGodmode) {
      this.btnSubmitGodmode.addEventListener('click', (e) => {
        e.stopPropagation();
        handleGodModeCodeSubmit();
      });
    }

    if (this.inputGodmodeCode) {
      this.inputGodmodeCode.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.stopPropagation();
          handleGodModeCodeSubmit();
        }
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

      if (e.code === 'KeyQ' || e.key === 'q' || e.key === 'Q' || e.code === 'ShiftLeft') this.gameManager.fireEmpPulse();
      if (e.code === 'KeyE' || e.key === 'e' || e.key === 'E' || e.code === 'Digit2') this.gameManager.fireSwarmMissiles();
      if (e.code === 'KeyB' || e.key === 'b' || e.key === 'B') this.gameManager.triggerHyperBoost();
      if (e.code === 'KeyF' || e.key === 'f' || e.key === 'F') {
        if (this.modalFleet && !this.modalFleet.classList.contains('hidden')) {
          this.closeFleetModal();
        } else {
          this.showFleetModal();
        }
      }
      if (e.code === 'KeyH' || e.key === 'h' || e.key === 'H') {
        this.showHangarModal(this.gameManager.waveSpawner.currentWave, this.gameManager.upgradeSystem);
      }
      if (e.code === 'KeyC' || e.key === 'c' || e.key === 'C') {
        this.gameManager.spaceAudio.vibrate(10);
        this.gameManager.spaceScene.toggleCameraMode();
      }
      if (e.code === 'Escape') {
        if (this.modalFleet && !this.modalFleet.classList.contains('hidden')) {
          this.closeFleetModal();
        } else if (this.modalSettings && !this.modalSettings.classList.contains('hidden')) {
          this.closeSettingsModal();
        } else {
          this.showSettingsModal();
        }
      }
    });

    // ── Pilot Registration Event Bindings ──
    if (this.inputPilotName) {
      this.inputPilotName.addEventListener('input', (e) => {
        const val = (e.target.value || '').trim().toUpperCase() || 'PILOT';
        if (this.previewPilotCallsign) this.previewPilotCallsign.textContent = `VANGUARD // ${val}-01`;
        if (this.holoPilotName) this.holoPilotName.textContent = val;
      });
    }

    if (this.formPilotReg) {
      this.formPilotReg.addEventListener('submit', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.savePilotRegistration();
      });
    }

    if (this.btnAuthorizePilot) {
      this.btnAuthorizePilot.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.savePilotRegistration();
      });
    }

    if (this.btnOpenPilotProfile) {
      this.btnOpenPilotProfile.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showPilotRegistrationModal();
      });
    }

    if (this.btnReopenPilotReg) {
      this.btnReopenPilotReg.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeSettingsModal();
        this.showPilotRegistrationModal();
      });
    }

    // ── Top Navigation Triggers ──
    if (this.btnTopHangar) {
      this.btnTopHangar.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showHangarModal(this.gameManager.waveSpawner.currentWave, this.gameManager.upgradeSystem);
      });
    }

    if (this.btnTopFleet) {
      this.btnTopFleet.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showFleetModal();
      });
    }

    if (this.btnTopConfig) {
      this.btnTopConfig.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showSettingsModal();
      });
    }

    // ── Drawer Close Buttons ──
    if (this.btnCloseHangarTop) {
      this.btnCloseHangarTop.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeHangarModal();
      });
    }

    if (this.btnCloseFleetTop) {
      this.btnCloseFleetTop.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeFleetModal();
      });
    }

    if (this.btnCloseSettingsTop) {
      this.btnCloseSettingsTop.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeSettingsModal();
      });
    }

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
    stopCardProp('.pilot-reg-card');
    stopCardProp('.fleet-inspector-card');

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

    if (this.btnBuyMiningAddon) {
      this.btnBuyMiningAddon.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.gameManager.playerShip.hasMiningAddon) return;
        const cost = 500;
        if (this.gameManager.upgradeSystem.scrap >= cost) {
          this.gameManager.upgradeSystem.scrap -= cost;
          this.gameManager.playerShip.hasMiningAddon = true;
          this.gameManager.spaceAudio.playPowerUpSound();
          this.gameManager.voiceAnnouncer.speak("Vortex Mining Drill Online!", true);
          this.updateHangarUI(this.gameManager.upgradeSystem);
          this.updateScrap(this.gameManager.upgradeSystem.scrap);
        } else {
          this.gameManager.spaceAudio.playExplosion();
        }
      });
    }
  }

  showRadioTransmission(message, sender = 'STARBOUND COMMAND', duration = 2.2) {
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

    if (this.lockonTimer) clearTimeout(this.lockonTimer);

    if (active) {
      if (this.lockonTitle) this.lockonTitle.textContent = text;
      this.lockonBox.classList.remove('hidden');
      this.lockonTimer = setTimeout(() => {
        if (this.lockonBox) this.lockonBox.classList.add('hidden');
      }, 2500);
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
          btn.textContent = 'MAX REFIT';
          btn.disabled = true;
        } else {
          btn.textContent = `REFIT (${cost} CR)`;
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

    // Premium Mining Addon card state
    if (this.btnBuyMiningAddon && this.miningAddonStatus && this.gameManager.playerShip) {
      if (this.gameManager.playerShip.hasMiningAddon) {
        this.miningAddonStatus.textContent = 'UNLOCKED / ACTIVE';
        this.miningAddonStatus.className = 'premium-status unlocked';
        this.btnBuyMiningAddon.textContent = 'INSTALLED ⚡';
        this.btnBuyMiningAddon.disabled = true;
      } else {
        this.miningAddonStatus.textContent = 'LOCKED';
        this.miningAddonStatus.className = 'premium-status';
        const canAfford = upgradeSystem.scrap >= 500;
        this.btnBuyMiningAddon.textContent = 'UNLOCK DRILL (500 CR)';
        this.btnBuyMiningAddon.disabled = !canAfford;
      }
    }
  }

  closeHangarModal() {
    if (this.modalHangar) {
      this.modalHangar.classList.add('hidden');
    }
  }

  showAchievementToast(ach) {
    try {
      if (this.toastElem) {
        if (this.achIcon) this.achIcon.textContent = ach.icon || '🏆';
        if (this.achTitle) this.achTitle.textContent = ach.title || '';
        if (this.achDesc) this.achDesc.textContent = ach.desc || '';

        this.toastElem.classList.remove('hidden');
        if (this.toastTimer) clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => {
          if (this.toastElem) this.toastElem.classList.add('hidden');
        }, 2200);
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

  showWaveBanner(waveNum, subtitle, duration = 2.0) {
    if (this.waveBanner) {
      this.waveTitle.textContent = typeof waveNum === 'number' ? `WAVE ${waveNum}` : waveNum;
      this.waveSubtitle.textContent = subtitle;
      this.waveBanner.classList.remove('hidden');

      if (this.waveBannerTimer) clearTimeout(this.waveBannerTimer);
      this.waveBannerTimer = setTimeout(() => {
        if (this.waveBanner) this.waveBanner.classList.add('hidden');
      }, duration * 1000);
    }
  }

  showKillCam(title, subtitle, duration) {
    // Kill-cam removed for ultra-smooth mobile gameplay and uninterrupted 60fps dogfight flow
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
      const maxS = data.playerMaxShield || 90;
      const sPct = Math.max(0, Math.min(100, (data.playerShield / maxS) * 100));
      this.playerHpFill.style.width = `${sPct}%`;
      this.playerHpText.textContent = `${Math.round(sPct)}%`;
    }

    if (this.bossBarContainer && this.bossHpFill) {
      if (data.bossHpRatio !== null) {
        this.bossBarContainer.classList.remove('hidden');
        this.bossHpFill.style.width = `${data.bossHpRatio * 100}%`;
        if (this.bossTitleElem && data.bossTitle) {
          this.bossTitleElem.textContent = data.bossTitle;
        }
      } else {
        this.bossBarContainer.classList.add('hidden');
      }
    }

    if (this.scoreVal) this.scoreVal.textContent = String(data.score).padStart(6, '0');
    if (this.scrapVal) this.scrapVal.textContent = data.scrap;
    if (this.waveBadge) this.waveBadge.textContent = `WAVE ${data.waveNum}`;

    if (this.cdRingPulse) this.cdRingPulse.style.opacity = data.pulseCdRatio > 0 ? '1' : '0';
    if (this.cdRingSwarm && this.gameManager.playerShip) {
      this.cdRingSwarm.style.opacity = this.gameManager.playerShip.swarmMissileCooldown > 0 ? '1' : '0';
    }
    if (this.btnHyperBoost && this.gameManager.playerShip) {
      if (this.gameManager.playerShip.isBoosting) {
        this.btnHyperBoost.classList.add('active-boost');
      } else {
        this.btnHyperBoost.classList.remove('active-boost');
      }
    }
  }

  showFleetModal() {
    if (this.modalFleet) {
      if (this.fleetGodBtnText) {
        this.fleetGodBtnText.textContent = this.gameManager.isGodMode ? '🛡️ GOD MODE: ON' : '🛡️ GOD MODE: OFF';
      }
      if (this.fleetFreezeBtnText) {
        this.fleetFreezeBtnText.textContent = this.gameManager.freezeFleetAI ? '⏸️ FREEZE AI: ON' : '⏸️ FREEZE AI: OFF';
      }
      if (this.fleetGodStatus) {
        this.fleetGodStatus.textContent = this.gameManager.isGodMode ? 'INVULNERABILITY: ACTIVE' : 'INVULNERABILITY: READY';
        this.fleetGodStatus.style.color = this.gameManager.isGodMode ? '#00ff66' : '#00f3ff';
      }
      this.modalFleet.classList.remove('hidden');
    }
  }

  closeFleetModal() {
    if (this.modalFleet) {
      this.modalFleet.classList.add('hidden');
    }
  }

  closeHangarModal() {
    if (this.modalHangar) {
      this.modalHangar.classList.add('hidden');
    }
    if (this.gameManager.state === 'HANGAR') {
      this.gameManager.resumeFromHangar();
    }
  }

  showPilotRegistrationModal() {
    if (this.modalPilotReg) {
      this.modalPilotReg.classList.remove('hidden');
      if (this.inputPilotName) {
        setTimeout(() => this.inputPilotName.focus(), 100);
      }
    }
  }

  closePilotRegistrationModal() {
    if (this.modalPilotReg) {
      this.modalPilotReg.classList.add('hidden');
    }
  }

  initPilotProfile() {
    let profile = null;
    try {
      const stored = localStorage.getItem('orbital_vanguard_pilot_profile');
      if (stored) profile = JSON.parse(stored);
    } catch(e) {}

    const hasStored = !!(profile && profile.name);

    if (!hasStored) {
      profile = {
        name: 'Daryl',
        callsign: 'VANGUARD // DARYL-01',
        email: 'daryl.created@gmail.com',
        rank: 'COMMANDER'
      };
      if (this.modalPilotReg) this.modalPilotReg.classList.remove('hidden');
      if (this.modalStart) this.modalStart.classList.add('hidden');
    } else {
      if (this.modalPilotReg) this.modalPilotReg.classList.add('hidden');
      if (this.modalStart) this.modalStart.classList.remove('hidden');
    }

    this.currentPilotProfile = profile;
    this.updatePilotDisplays(profile);
  }

  updatePilotDisplays(profile) {
    if (!profile) return;
    const name = (profile.name || 'DARYL').trim().toUpperCase();
    const callsign = profile.callsign || `VANGUARD // ${name}-01`;
    const email = profile.email || 'daryl.created@gmail.com';
    const rank = profile.rank || 'COMMANDER';

    if (this.inputPilotName) this.inputPilotName.value = profile.name || '';
    if (this.inputPilotEmail) this.inputPilotEmail.value = email;
    if (this.previewPilotCallsign) this.previewPilotCallsign.textContent = callsign;
    if (this.holoPilotName) this.holoPilotName.textContent = name;
    if (this.hudPilotCallsign) this.hudPilotCallsign.textContent = `CDR. ${name} // VG-01`;
    if (this.hudPilotEmail) this.hudPilotEmail.textContent = email;
    if (this.hudPilotRank) this.hudPilotRank.textContent = rank;
    if (this.settingsPilotDisplay) {
      this.settingsPilotDisplay.textContent = `Callsign: CDR. ${name} // ${email}`;
    }

    if (this.gameManager) {
      this.gameManager.pilotProfile = profile;
    }
  }

  savePilotRegistration() {
    const rawName = this.inputPilotName ? this.inputPilotName.value.trim() : 'Daryl';
    const name = rawName.length > 0 ? rawName : 'Daryl';
    const cleanUpper = name.toUpperCase();
    const callsign = `VANGUARD // ${cleanUpper}-01`;
    const email = this.inputPilotEmail ? (this.inputPilotEmail.value.trim() || 'daryl.created@gmail.com') : 'daryl.created@gmail.com';

    const profile = {
      name: name,
      callsign: callsign,
      email: email,
      rank: 'COMMANDER'
    };

    try {
      localStorage.setItem('orbital_vanguard_pilot_profile', JSON.stringify(profile));
    } catch(e) {}

    this.currentPilotProfile = profile;
    this.updatePilotDisplays(profile);

    if (this.modalPilotReg) this.modalPilotReg.classList.add('hidden');
    if (this.modalStart) this.modalStart.classList.remove('hidden');

    if (this.gameManager && this.gameManager.spaceAudio) {
      this.gameManager.spaceAudio.vibrate(25);
    }
    this.showRadioTransmission(`PILOT REGISTRATION CONFIRMED: Welcome aboard, Commander ${name}!`, "VANGUARD FLEET COMMAND", 5.0);
  }

  hideAllModals() {
    if (this.modalPilotReg) this.modalPilotReg.classList.add('hidden');
    if (this.modalStart) this.modalStart.classList.add('hidden');
    if (this.modalGameOver) this.modalGameOver.classList.add('hidden');
    if (this.modalHangar) this.modalHangar.classList.add('hidden');
    if (this.modalSettings) this.modalSettings.classList.add('hidden');
    if (this.modalPerks) this.modalPerks.classList.add('hidden');
    if (this.modalFleet) this.modalFleet.classList.add('hidden');
  }

  flashShieldImpact() {
    const shieldPanel = document.querySelector('.player-panel');
    if (shieldPanel) {
      shieldPanel.classList.remove('shield-impact-flash');
      void shieldPanel.offsetWidth; // Trigger reflow for instantaneous re-trigger
      shieldPanel.classList.add('shield-impact-flash');
      setTimeout(() => {
        if (shieldPanel) shieldPanel.classList.remove('shield-impact-flash');
      }, 1000);
    }
  }

  showPerksModal(perks, onSelectCallback) {
    if (!this.modalPerks || !this.perkCardsContainer) return;
    this.perkCardsContainer.innerHTML = '';

    perks.forEach(perk => {
      const card = document.createElement('div');
      card.className = 'perk-card';

      let iconSvg = '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="var(--accent-cyan)" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>';
      if (perk.id === 'piercing') {
        iconSvg = '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#00f3ff" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>';
      } else if (perk.id === 'siphon') {
        iconSvg = '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#00ff66" stroke-width="2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';
      } else if (perk.id === 'retaliate') {
        iconSvg = '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#ff0055" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>';
      } else if (perk.id === 'magnet') {
        iconSvg = '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#ffb700" stroke-width="2"><path d="M6 3v7a6 6 0 0 0 12 0V3M6 7h12"/></svg>';
      } else if (perk.id === 'crit') {
        iconSvg = '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#ff0044" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>';
      } else if (perk.id === 'dodge_boost') {
        iconSvg = '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#ffea00" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>';
      }

      card.innerHTML = `
        <div class="perk-icon">${iconSvg}</div>
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
    const quality = savedQuality || 'ultra';
      
    if (this.btnGraphicsLow) this.btnGraphicsLow.classList.toggle('active', quality === 'low');
    if (this.btnGraphicsHigh) this.btnGraphicsHigh.classList.toggle('active', quality === 'high');
    if (this.btnGraphicsUltra) this.btnGraphicsUltra.classList.toggle('active', quality === 'ultra');

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

    const isGod = !!this.gameManager.isGodMode;
    if (this.godmodeActivePill) {
      this.godmodeActivePill.style.display = isGod ? 'inline-block' : 'none';
    }
    if (this.btnSubmitGodmode) {
      this.btnSubmitGodmode.textContent = isGod ? 'DISABLE' : 'UNLOCK';
      this.btnSubmitGodmode.style.borderColor = isGod ? '#00ff88' : '#00f3ff';
      this.btnSubmitGodmode.style.color = isGod ? '#00ff88' : '#00f3ff';
      this.btnSubmitGodmode.style.background = isGod ? 'rgba(0, 255, 136, 0.25)' : 'rgba(0, 243, 255, 0.2)';
    }
  }
}
