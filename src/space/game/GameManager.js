import * as THREE from 'three';
import { PlayerShip } from '../objects/PlayerShip.js';
import { Asteroid } from '../objects/Asteroid.js';
import { EnemyDrone } from '../objects/EnemyDrone.js';
import { PowerUp } from '../objects/PowerUp.js';
import { BossDreadnought } from '../objects/BossDreadnought.js';
import { TitanAsteroidBoss } from '../objects/TitanAsteroidBoss.js';
import { MoonBase } from '../objects/SpaceStation.js';
import { HaloRingBoss } from '../objects/HaloRingBoss.js';
import { Babylon5Boss } from '../objects/Babylon5Boss.js';
import { LaserBolt, PlasmaPulse } from '../objects/Projectiles.js';
import { PlayerSwarmMissile } from '../objects/PlayerSwarmMissile.js';
import { CapitalShip } from '../objects/CapitalShip.js';
import { CarrierCapitalShip } from '../objects/CarrierCapitalShip.js';
import { StealthFighter } from '../objects/StealthFighter.js';
import { HeavyBattleship } from '../objects/HeavyBattleship.js';
import { CommandMothership } from '../objects/CommandMothership.js';
import { CollisionSystem } from './CollisionSystem.js';
import { WaveSpawner } from './WaveSpawner.js';
import { UpgradeSystem } from './UpgradeSystem.js';
import { VoiceAnnouncer } from '../audio/VoiceAnnouncer.js';
import { AchievementSystem } from './AchievementSystem.js';

export class GameManager {
  constructor(spaceScene, postProcessing, particleManager, spaceAudio, controlsManager) {
    this.spaceScene = spaceScene;
    this.postProcessing = postProcessing;
    this.particleManager = particleManager;
    this.spaceAudio = spaceAudio;
    this.controlsManager = controlsManager;

    this.state = 'START'; // 'START', 'PLAYING', 'HANGAR', 'GAME_OVER'

    this.activeBoss = null;
    this.carrierBoss = null;

    // Systems
    this.upgradeSystem = new UpgradeSystem();
    this.voiceAnnouncer = new VoiceAnnouncer();
    this.achievementSystem = new AchievementSystem();

    // AAA Upgrade States
    this.selectedShipClass = 'INTERCEPTOR';
    this.activePerks = new Set();
    this.lowShieldWarningSoundTimer = 0;
    this.glitchOverlayTimer = 0;
    
    // Sentinel Companion states
    this.sentinelDrone = null;
    this.sentinelDroneWings = null;
    this.sentinelDroneFireTimer = 0;

    // Stats
    this.planetHp = 100;
    this.maxPlanetHp = 100;
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('orbital_vanguard_highscore') || '0', 10);
    this.totalKills = 0;

    // Active Entities
    this.playerShip = new PlayerShip(this.spaceScene.scene, this.particleManager);
    this.playerShip.gameManager = this;
    this.asteroids = [];
    this.drones = [];
    this.stealthFighters = [];
    this.capitalShips = [];
    this.heavyBattleships = [];
    this.powerUps = [];
    this.lasers = [];
    this.plasmaPulses = [];
    this.playerSwarmMissiles = [];
    this.severedDebris = [];
    this.laserPool = [];
    this.plasmaPulsePool = [];
    this.activeEmpPulse = null;
    this.showcaseBosses = [];
    this.isGodMode = false;
    this.freezeFleetAI = false;

    // Active Power-Up Timers
    this.overchargeTimer = 0;
    this.stasisTimer = 0;
    this.hitFreezeTimer = 0;
    this.killCamSlowMoTimer = 0;
    this.pendingNukeOnWaveStart = false;

    // Flag for pausing laser auto-fire during EMP launch
    this.specialWeaponActive = false;

    // Subsystems
    this.collisionSystem = new CollisionSystem(this.particleManager, this.spaceAudio, this.spaceScene);
    this.waveSpawner = new WaveSpawner(this);

    this.spaceHUD = null;
    
    // Dynamically update scroll behavior on resize (e.g. rotating device or resizing desktop tester)
    window.addEventListener('resize', () => this.updateBodyGuiClass());
  }

  get state() {
    return this._state;
  }

  set state(val) {
    this._state = val;
    this.updateBodyGuiClass();
  }

  updateBodyGuiClass() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 1024;
    if (isMobile) {
      if (this._state !== 'PLAYING') {
        document.documentElement.classList.add('gui-active');
        document.body.classList.add('gui-active');
      } else {
        document.documentElement.classList.remove('gui-active');
        document.body.classList.remove('gui-active');
      }
    } else {
      document.documentElement.classList.remove('gui-active');
      document.body.classList.remove('gui-active');
    }
  }

  setHUD(hud) {
    this.spaceHUD = hud;
    if (this.spaceHUD) {
      this.spaceHUD.updateHighScore(this.highScore);
      this.spaceHUD.updateScrap(this.upgradeSystem.scrap);

      this.achievementSystem.setCallback((ach) => {
        this.spaceHUD.showAchievementToast(ach);
        this.spaceAudio.playVictoryArpeggio();
      });
    }
  }

  startGame() {
    this.resetState();
    if (this.spaceHUD) this.spaceHUD.hideAllModals();
    if (this.selectedShipClass) {
      this.playerShip.setShipClass(this.selectedShipClass);
    } else {
      this.playerShip.setShipClass('INTERCEPTOR');
    }
    this.upgradeSystem.applyUpgradesToShip(this.playerShip);
    this.playerShip.shield = this.playerShip.maxShield;
    this.state = 'PLAYING';
    this.waveSpawner.startWave(1);
    if (this.spaceHUD) {
      this.spaceHUD.showRadioTransmission("All Vanguard units, Sector Alpha IV is under attack! Clear the asteroid corridor!", "STARBOUND COMMAND", 5.0);
    }
    this.spaceAudio.ensureContext();
    this.spaceAudio.startDrone();
  }

  setSelectedShipClass(shipClass) {
    this.selectedShipClass = shipClass || 'INTERCEPTOR';
    if (this.playerShip) {
      this.playerShip.setShipClass(this.selectedShipClass);
      if (this.upgradeSystem) {
        this.upgradeSystem.applyUpgradesToShip(this.playerShip);
      }
      this.playerShip.shield = this.playerShip.maxShield;
    }
  }

  triggerDodgeRoll(direction = null) {
    if (this.state !== 'PLAYING') return;
    if (!direction) {
      direction = Math.random() < 0.5 ? 'left' : 'right';
    }
    this.playerShip.triggerDodge(direction);
    this.spaceAudio.playDodgeSound();
  }

  resetState() {
    this.planetHp = 100;
    this.score = 0;
    this.totalKills = 0;
    this.overchargeTimer = 0;
    this.stasisTimer = 0;
    this.specialWeaponActive = false;
    this.pendingNukeOnWaveStart = false;
    this.activePerks.clear();
    if (this.playerShip) {
      this.playerShip.activePerks.clear();
    }
    this.playerShip.reset();
    this.waveSpawner.reset();
    this.clearAllEntities();
  }

  clearAllEntities() {
    this.asteroids.forEach(a => a.destroy());
    this.asteroids = [];

    this.drones.forEach(d => d.destroy());
    this.drones = [];

    this.stealthFighters.forEach(s => s.destroy());
    this.stealthFighters = [];

    this.capitalShips.forEach(c => c.destroy());
    this.capitalShips = [];

    this.heavyBattleships.forEach(b => b.destroy());
    this.heavyBattleships = [];

    this.powerUps.forEach(p => p.destroy());
    this.powerUps = [];

    this.lasers.forEach(l => l.destroy());
    this.lasers = [];

    this.plasmaPulses.forEach(p => p.destroy());
    this.plasmaPulses = [];

    if (this.activeBoss) {
      this.activeBoss.destroy();
      this.activeBoss = null;
    }

    if (this.carrierBoss) {
      this.carrierBoss.destroy();
      this.carrierBoss = null;
    }

    if (this.showcaseBosses && this.showcaseBosses.length > 0) {
      this.showcaseBosses.forEach(b => { try { b.destroy(); } catch(e) {} });
      this.showcaseBosses = [];
    }

    this.activeEmpPulse = null;
    this.destroySentinelDrone();
  }

  clearAllThreats() {
    this.asteroids.forEach(a => {
      if (a && a.meshGroup) this.particleManager.createExplosion(a.meshGroup.position, 0xffaa00, 10);
      try { a.destroy(); } catch(e) { /* already disposed */ }
    });
    this.asteroids = [];

    this.drones.forEach(d => {
      if (d && d.meshGroup) this.particleManager.createExplosion(d.meshGroup.position, 0xff0055, 12);
      try { d.destroy(); } catch(e) { /* already disposed */ }
    });
    this.drones = [];

    this.stealthFighters.forEach(s => {
      if (s && s.meshGroup) this.particleManager.createExplosion(s.meshGroup.position, 0xaa00ff, 15);
      try { s.destroy(); } catch(e) {}
    });
    this.stealthFighters = [];

    this.capitalShips.forEach(c => {
      if (c && c.meshGroup) this.particleManager.createExplosion(c.meshGroup.position, 0x00aaff, 20);
      try { c.destroy(); } catch(e) { /* already disposed */ }
    });
    this.capitalShips = [];

    this.heavyBattleships.forEach(b => {
      if (b && b.meshGroup) this.particleManager.createExplosion(b.meshGroup.position, 0xff0044, 30);
      try { b.destroy(); } catch(e) {}
    });
    this.heavyBattleships = [];

    if (this.showcaseBosses && this.showcaseBosses.length > 0) {
      this.showcaseBosses.forEach(b => { try { b.destroy(); } catch(e) {} });
      this.showcaseBosses = [];
    }

    // Clear ALL in-flight projectiles (enemy lasers, plasma pulses) to prevent
    // stale references after boss death / wave transition
    this.lasers.forEach(l => { try { l.destroy(); } catch(e) {} });
    this.lasers = [];

    this.plasmaPulses.forEach(p => { try { p.destroy(); } catch(e) {} });
    this.plasmaPulses = [];

    this.powerUps.forEach(p => { try { p.destroy(); } catch(e) {} });
    this.powerUps = [];
  }

  triggerHitFreeze(duration = 0.04) {
    this.hitFreezeTimer = duration;
  }

  addScore(pts) {
    this.score += pts;
    this.totalKills++;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('orbital_vanguard_highscore', this.highScore.toString());
      if (this.spaceHUD) this.spaceHUD.updateHighScore(this.highScore);
    }
  }

  addScrap(amount) {
    this.upgradeSystem.addScrap(amount);
    if (this.spaceHUD) this.spaceHUD.updateScrap(this.upgradeSystem.scrap);
  }

  damagePlanet(amount) {
    this.planetHp = Math.max(0, this.planetHp - amount);
    if (this.planetHp <= 0) {
      this.onGameOver('Planet Shield Depleted');
    }
  }

  spawnAsteroid(options = {}) {
    options.particleManager = this.particleManager;

    // When a capital ship or boss is active, divert asteroid spawn trajectories to the outer flanks
    const capitalActive = (this.carrierBoss && !this.carrierBoss.isDead) || 
                          (this.activeBoss && !this.activeBoss.isDead) || 
                          (this.heavyBattleships && this.heavyBattleships.some(b => !b.isDead));
    if (capitalActive && options.x === undefined) {
      const side = Math.random() > 0.5 ? 1 : -1;
      options.x = side * (30.0 + Math.random() * 16.0); // Outer corridor [-46, -30] or [30, 46]
      options.vx = -side * (2.5 + Math.random() * 3.0); // Inward trajectory
    }

    const rock = new Asteroid(this.spaceScene.scene, options);
    this.asteroids.push(rock);
  }

  spawnAsteroidFragments(fragments) {
    fragments.forEach(frag => {
      this.spawnAsteroid(frag);
    });
  }

  spawnDrone(spawnPos = null, force = false) {
    if (!force && (!this.carrierBoss || this.carrierBoss.isDead)) {
      // Assault Drones only deploy when Gorgon Supercarrier is active in the combat zone!
      return this.spawnStealthFighter(spawnPos);
    }
    const drone = new EnemyDrone(this.spaceScene.scene, spawnPos);
    this.drones.push(drone);
    return drone;
  }

  spawnCapitalShip() {
    const ship = new CapitalShip(this.spaceScene.scene, this.particleManager);
    this.capitalShips.push(ship);
    this.voiceAnnouncer.speak("Alert! Capital Warship Entering Sector!", false);
  }

  spawnBoss() {
    this.activeBoss = new BossDreadnought(this.spaceScene.scene, this.particleManager);
    this.voiceAnnouncer.speak("Warning! Sector Dreadnought Approaching!", true);
    if (this.spaceScene) this.spaceScene.triggerBossIntroCamera();
  }

  spawnTitanBoss() {
    this.activeBoss = new TitanAsteroidBoss(this.spaceScene.scene, this.particleManager);
    this.voiceAnnouncer.speak("Warning! Titan Asteroid Core Approaching!", true);
    if (this.spaceScene) this.spaceScene.triggerBossIntroCamera();
  }

  spawnCarrierBoss() {
    this.carrierBoss = new CarrierCapitalShip(this.spaceScene.scene, this.particleManager);
    this.voiceAnnouncer.speak("Alert! Heavy Enemy Spacecraft Carrier Detected! Interceptors Launching!", true);
    if (this.spaceHUD) {
      this.spaceHUD.showRadioTransmission("ALERT: Heavy Enemy Spacecraft Carrier detected! Target its flight decks & missile pods!", "STARBOUND COMMAND", 5.5);
    }
    if (this.spaceScene) {
      this.spaceScene.triggerHyperspaceWarp(new THREE.Vector3(0, 5, -120));
      this.spaceScene.triggerBossIntroCamera();
    }
  }

  spawnSpaceStation() {
    this.activeBoss = new MoonBase(this.spaceScene.scene, this.particleManager);
    this.voiceAnnouncer.speak("Warning! Orbital Alpha Moon Base Approaching! Destroy Shield Generators!", true);
    if (this.spaceHUD) {
      this.spaceHUD.showRadioTransmission("WARNING: Orbital Alpha Moon Base arriving! Destroy its equatorial shield generators to expose the thermal core!", "STARBOUND COMMAND", 5.5);
      this.spaceHUD.showWaveBanner("BOSS BATTLE", "ORBITAL ALPHA MOON BASE");
    }
    if (this.spaceScene) {
      this.spaceScene.triggerBossIntroCamera();
    }
  }

  spawnHaloBoss() {
    this.activeBoss = new HaloRingBoss(this.spaceScene.scene, this.particleManager);
    this.voiceAnnouncer.speak("Warning! Halo Megastructure Ring Approaching!", true);
    if (this.spaceScene) this.spaceScene.triggerBossIntroCamera();
  }

  spawnBabylon5Boss() {
    this.activeBoss = new Babylon5Boss(this.spaceScene.scene, this.particleManager);
    this.voiceAnnouncer.speak("Warning! Babylon 5 Industrial Rotating Citadel Approaching!", true);
    if (this.spaceScene) this.spaceScene.triggerBossIntroCamera();
  }

  spawnStealthFighter(spawnPos = null) {
    const fighter = new StealthFighter(this.spaceScene.scene, this.particleManager, spawnPos);
    this.stealthFighters.push(fighter);
    return fighter;
  }

  spawnHeavyBattleship() {
    const battleship = new HeavyBattleship(this.spaceScene.scene, this.particleManager);
    this.heavyBattleships.push(battleship);
    this.voiceAnnouncer.speak("Warning! Goliath Heavy Dreadnought Battleship Entering Sector!", true);
    if (this.spaceHUD) {
      this.spaceHUD.showRadioTransmission("WARNING: Goliath Heavy Battleship detected! Target its triple railgun turrets and engine nacelles!", "STARBOUND COMMAND", 5.5);
      this.spaceHUD.showWaveBanner("BATTLEFLEET SIEGE", "GOLIATH HEAVY BATTLESHIP");
    }
    if (this.spaceScene) this.spaceScene.triggerBossIntroCamera();
    return battleship;
  }

  spawnCommandMothership() {
    this.activeBoss = new CommandMothership(this.spaceScene.scene, this.particleManager);
    this.voiceAnnouncer.speak("Warning! Leviathan Command Mothership Approaching! Destroy Entrance Shield Generators to Breach Trench!", true);
    if (this.spaceHUD) {
      this.spaceHUD.showRadioTransmission("FINAL SIEGE: Leviathan Command Mothership detected! Destroy the dual Shield Generators at the entrance pylons to lower the Plasma Shield, then fly inside and sever the 4 Magnetic Couplings!", "STARBOUND COMMAND", 8.0);
      this.spaceHUD.showWaveBanner("APEX COMMAND SIEGE", "LEVIATHAN COMMAND MOTHERSHIP");
    }
    if (this.spaceScene) {
      this.spaceScene.triggerHyperspaceWarp(new THREE.Vector3(0, 5, -120));
      this.spaceScene.triggerBossIntroCamera();
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ADMIRALTY FLEET INSPECTOR & SHOWCASE MATRIX
  // ══════════════════════════════════════════════════════════════════════════════
  toggleGodMode() {
    this.isGodMode = !this.isGodMode;
    if (this.playerShip) {
      this.playerShip.isInvulnerable = this.isGodMode;
      if (this.isGodMode) this.playerShip.shield = this.playerShip.maxShield;
    }
    if (this.spaceHUD) {
      this.spaceHUD.showRadioTransmission(
        this.isGodMode ? "ADMIRALTY GOD MODE: ACTIVE (Invulnerable)" : "ADMIRALTY GOD MODE: DISABLED (Standard Combat)",
        "FLEET COMMAND",
        3.0
      );
    }
    return this.isGodMode;
  }

  toggleFreezeFleetAI() {
    this.freezeFleetAI = !this.freezeFleetAI;
    if (this.spaceHUD) {
      this.spaceHUD.showRadioTransmission(
        this.freezeFleetAI ? "FLEET AI: FROZEN (Static 3D Inspection Mode)" : "FLEET AI: RESUMED (Active Combat Simulation)",
        "FLEET COMMAND",
        3.0
      );
    }
    return this.freezeFleetAI;
  }

  spawnAllFleetFormation() {
    this.clearAllEntities();
    this.state = 'PLAYING';
    this.isGodMode = true;
    this.freezeFleetAI = true;
    if (this.playerShip) {
      this.playerShip.isInvulnerable = true;
      this.playerShip.shield = this.playerShip.maxShield;
      this.playerShip.meshGroup.position.set(0, -2, 20);
    }

    if (this.spaceHUD) {
      if (this.spaceHUD.modalStart) this.spaceHUD.modalStart.classList.add('hidden');
      if (this.spaceHUD.modalFleet) this.spaceHUD.modalFleet.classList.add('hidden');
      this.spaceHUD.showRadioTransmission(
        "ADMIRALTY FLEET REVIEW: All 11 enemy craft archetypes & bosses assembled in formation! Use Optics (C) or fly freely to inspect each vessel.",
        "HIGH COMMAND",
        6.5
      );
      this.spaceHUD.showWaveBanner("FLEET REVIEW", "ALL 11 ENEMY CRAFTS & BOSSES ASSEMBLED");
    }

    // 1. Light Interceptors & Drones (Front Echelon)
    [-24, -8, 8, 24].forEach(x => {
      const drone = new EnemyDrone(this.spaceScene.scene);
      if (drone.meshGroup) {
        drone.meshGroup.position.set(x, 0, -28);
        drone.meshGroup.rotation.y = 0;
      }
      this.drones.push(drone);
    });

    // 2. Shadow-Wraith Stealth Fighters (Flanking Echelon)
    [-18, 18].forEach(x => {
      const sf = new StealthFighter(this.spaceScene.scene, this.particleManager, new THREE.Vector3(x, 2, -44));
      sf.isCloaked = false;
      sf.cloakOpacity = 1.0;
      sf.targetCloakOpacity = 1.0;
      if (sf.hullMat) sf.hullMat.opacity = 1.0;
      if (sf.accentMat) sf.accentMat.opacity = 1.0;
      if (sf.glowMat) sf.glowMat.opacity = 1.0;
      this.stealthFighters.push(sf);
    });

    // 3. Valiant Capital Cruiser & Goliath Heavy Battleship (Mid-Line Battlefleet)
    const cruiser = new CapitalShip(this.spaceScene.scene, this.particleManager);
    if (cruiser.meshGroup) cruiser.meshGroup.position.set(-34, 4, -68);
    this.capitalShips.push(cruiser);

    const bship = new HeavyBattleship(this.spaceScene.scene, this.particleManager);
    if (bship.meshGroup) bship.meshGroup.position.set(34, 4, -68);
    this.heavyBattleships.push(bship);

    // 4. CV-99 Hyperion Supercarrier (Center Capital Supercarrier)
    this.carrierBoss = new CarrierCapitalShip(this.spaceScene.scene, this.particleManager);
    if (this.carrierBoss.meshGroup) this.carrierBoss.meshGroup.position.set(0, 5, -88);

    // 5. Boss Megastructures & Flagships (Backdrop Formation Line)
    this.showcaseBosses = [];

    const moonBase = new MoonBase(this.spaceScene.scene, this.particleManager);
    if (moonBase.meshGroup) moonBase.meshGroup.position.set(-46, 12, -130);
    this.showcaseBosses.push(moonBase);

    const halo = new HaloRingBoss(this.spaceScene.scene, this.particleManager);
    if (halo.meshGroup) halo.meshGroup.position.set(46, 12, -130);
    this.showcaseBosses.push(halo);

    const leviathan = new CommandMothership(this.spaceScene.scene, this.particleManager);
    if (leviathan.meshGroup) leviathan.meshGroup.position.set(0, 16, -155);
    this.showcaseBosses.push(leviathan);

    const babylon = new Babylon5Boss(this.spaceScene.scene, this.particleManager);
    if (babylon.meshGroup) babylon.meshGroup.position.set(0, 26, -190);
    this.showcaseBosses.push(babylon);
  }

  spawnSoloInspect(shipKey) {
    this.clearAllEntities();
    this.state = 'PLAYING';
    this.isGodMode = true;
    this.freezeFleetAI = true;
    const isPlayerCraft = (shipKey === 'INTERCEPTOR' || shipKey.endsWith('_PLAYER'));
    if (this.playerShip) {
      this.playerShip.isInvulnerable = true;
      this.playerShip.shield = this.playerShip.maxShield;
      this.playerShip.isInspectingSolo = isPlayerCraft;
      if (!isPlayerCraft) {
        this.playerShip.meshGroup.position.set(0, 0, 15);
      }
    }

    if (this.spaceHUD) {
      if (this.spaceHUD.modalStart) this.spaceHUD.modalStart.classList.add('hidden');
      if (this.spaceHUD.modalFleet) this.spaceHUD.modalFleet.classList.add('hidden');
      if (this.spaceHUD.modalGameOver) this.spaceHUD.modalGameOver.classList.add('hidden');
    }

    switch (shipKey) {
      case 'INTERCEPTOR': {
        if (this.playerShip) {
          this.playerShip.setShipClass('INTERCEPTOR');
          this.playerShip.meshGroup.position.set(0, 0.4, 2.5);
          this.playerShip.meshGroup.rotation.set(0.28, 0.45, -0.15);
          this.playerShip.meshGroup.scale.set(1.4, 1.4, 1.4);
        }
        this.spaceHUD?.showWaveBanner("INSPECTING", "VANGUARD ALPHA INTERCEPTOR");
        break;
      }

      case 'DREADNOUGHT_PLAYER': {
        if (this.playerShip) {
          this.playerShip.setShipClass('DREADNOUGHT');
          this.playerShip.meshGroup.position.set(0, 0, 4);
          this.playerShip.meshGroup.rotation.set(0.28, 0.45, -0.2);
        }
        this.spaceHUD?.showWaveBanner("INSPECTING", "TITAN COLOSSUS DREADNOUGHT");
        break;
      }

      case 'TACTICIAN_PLAYER': {
        if (this.playerShip) {
          this.playerShip.setShipClass('TACTICIAN');
          this.playerShip.meshGroup.position.set(0, 0, 4);
          this.playerShip.meshGroup.rotation.set(0.28, 0.45, -0.2);
        }
        this.spaceHUD?.showWaveBanner("INSPECTING", "CHRONOS COMMAND TACTICIAN");
        break;
      }

      case 'REAPER_PLAYER': {
        if (this.playerShip) {
          this.playerShip.setShipClass('REAPER');
          this.playerShip.meshGroup.position.set(0, 0, 4);
          this.playerShip.meshGroup.rotation.set(0.28, 0.45, -0.2);
        }
        this.spaceHUD?.showWaveBanner("INSPECTING", "VOID REAPER PHANTOM");
        break;
      }

      case 'SENTINEL_PLAYER': {
        if (this.playerShip) {
          this.playerShip.setShipClass('SENTINEL');
          this.playerShip.meshGroup.position.set(0, 0, 4);
          this.playerShip.meshGroup.rotation.set(0.28, 0.45, -0.2);
        }
        this.spaceHUD?.showWaveBanner("INSPECTING", "AEGIS BASTION SENTINEL");
        break;
      }

      case 'DRONE': {
        const drone = new EnemyDrone(this.spaceScene.scene);
        if (drone.meshGroup) {
          drone.meshGroup.position.set(0, 1.2, -3.5);
          drone.meshGroup.scale.set(1.4, 1.4, 1.4);
          drone.meshGroup.rotation.set(0.18, 0.35, 0);
        }
        this.drones.push(drone);
        this.spaceHUD?.showWaveBanner("INSPECTING", "ENEMY SCOUT RECON DRONE");
        break;
      }

      case 'STEALTH': {
        const sf = new StealthFighter(this.spaceScene.scene, this.particleManager, new THREE.Vector3(0, 1.2, -3.5));
        if (sf.meshGroup) {
          sf.meshGroup.scale.set(1.4, 1.4, 1.4);
          sf.meshGroup.rotation.set(0.18, 0.35, 0);
        }
        sf.isCloaked = false;
        sf.cloakOpacity = 1.0;
        sf.targetCloakOpacity = 1.0;
        sf.state = 'UNCLOAK_AMBUSH';
        if (sf.hullMat) sf.hullMat.opacity = 1.0;
        if (sf.titaniumMat) sf.titaniumMat.opacity = 1.0;
        if (sf.conduitMat) sf.conduitMat.opacity = 1.0;
        if (sf.oculusMat) sf.oculusMat.opacity = 1.0;
        if (sf.glowMat) sf.glowMat.opacity = 1.0;
        if (sf.shimmerMesh) sf.shimmerMesh.visible = false;
        if (sf.keyLight) sf.keyLight.intensity = 2.4;
        this.stealthFighters.push(sf);
        this.spaceHUD?.showWaveBanner("INSPECTING", "SHADOW-WRAITH STEALTH FIGHTER");
        break;
      }

      case 'CRUISER': {
        const cruiser = new CapitalShip(this.spaceScene.scene, this.particleManager);
        if (cruiser.meshGroup) {
          cruiser.meshGroup.position.set(0, 0.8, -4.8);
          cruiser.meshGroup.rotation.set(0.24, 0.42, 0);
          cruiser.meshGroup.scale.set(1.3, 1.3, 1.3);
        }
        this.capitalShips.push(cruiser);
        this.spaceHUD?.showWaveBanner("INSPECTING", "VALIANT CAPITAL CRUISER (SILVER)");
        break;
      }

      case 'BATTLESHIP': {
        const bship = new HeavyBattleship(this.spaceScene.scene, this.particleManager);
        if (bship.meshGroup) {
          bship.meshGroup.position.set(0, -1, -26);
          bship.meshGroup.rotation.set(0.32, 0.7, 0);
          bship.meshGroup.scale.set(0.8, 0.8, 0.8);
        }
        this.heavyBattleships.push(bship);
        this.spaceHUD?.showWaveBanner("INSPECTING", "GOLIATH HEAVY BATTLESHIP (WHITE)");
        break;
      }

      case 'CARRIER': {
        this.carrierBoss = new CarrierCapitalShip(this.spaceScene.scene, this.particleManager);
        if (this.carrierBoss.meshGroup) {
          this.carrierBoss.meshGroup.position.set(0, 1.5, -42);
          this.carrierBoss.meshGroup.rotation.set(0.18, 0.35, 0);
          this.carrierBoss.meshGroup.scale.set(0.9, 0.9, 0.9);
        }
        this.spaceHUD?.showWaveBanner("INSPECTING", "CV-99 HYPERION SUPERCARRIER");
        break;
      }

      case 'MOONBASE': {
        this.activeBoss = new MoonBase(this.spaceScene.scene, this.particleManager);
        if (this.activeBoss.meshGroup) {
          this.activeBoss.meshGroup.position.set(0, 0, -64);
          this.activeBoss.meshGroup.rotation.set(0.12, 0.25, 0);
          this.activeBoss.meshGroup.scale.set(0.9, 0.9, 0.9);
        }
        this.spaceHUD?.showWaveBanner("INSPECTING", "SECTOR ALPHA MOON BASE CITADEL");
        break;
      }

      case 'HALO': {
        this.activeBoss = new HaloRingBoss(this.spaceScene.scene, this.particleManager);
        if (this.activeBoss.meshGroup) {
          this.activeBoss.meshGroup.position.set(0, 0, -56);
          this.activeBoss.meshGroup.rotation.set(0.35, 0.45, 0);
          this.activeBoss.meshGroup.scale.set(0.85, 0.85, 0.85);
        }
        this.spaceHUD?.showWaveBanner("INSPECTING", "HALO MEGASTRUCTURE RING");
        break;
      }

      case 'BABYLON': {
        this.activeBoss = new Babylon5Boss(this.spaceScene.scene, this.particleManager);
        if (this.activeBoss.meshGroup) {
          this.activeBoss.meshGroup.position.set(0, 0, -78);
          this.activeBoss.meshGroup.rotation.set(0.28, 0.65, 0);
          this.activeBoss.meshGroup.scale.set(0.72, 0.72, 0.72);
        }
        this.spaceHUD?.showWaveBanner("INSPECTING", "BABYLON 5 CYLINDER CITADEL");
        break;
      }

      case 'MOTHERSHIP': {
        this.activeBoss = new CommandMothership(this.spaceScene.scene, this.particleManager);
        if (this.activeBoss.meshGroup) {
          this.activeBoss.meshGroup.position.set(0, 4, -85);
          this.activeBoss.meshGroup.rotation.set(0.15, 0.38, 0);
          this.activeBoss.meshGroup.scale.set(0.62, 0.62, 0.62);
        }
        this.spaceHUD?.showWaveBanner("INSPECTING", "LEVIATHAN COMMAND MOTHERSHIP");
        break;
      }

      case 'TITAN': {
        this.activeBoss = new TitanAsteroidBoss(this.spaceScene.scene, this.particleManager);
        if (this.activeBoss.meshGroup) {
          this.activeBoss.meshGroup.position.set(0, 0, -42);
          this.activeBoss.meshGroup.rotation.set(0.2, 0.3, 0);
          this.activeBoss.meshGroup.scale.set(0.9, 0.9, 0.9);
        }
        this.spaceHUD?.showWaveBanner("INSPECTING", "TITAN ASTEROID COLOSSUS");
        break;
      }

      case 'DREADNOUGHT': {
        this.activeBoss = new BossDreadnought(this.spaceScene.scene, this.particleManager);
        if (this.activeBoss.meshGroup) {
          this.activeBoss.meshGroup.position.set(0, 0, -38);
          this.activeBoss.meshGroup.rotation.set(0.22, 0.4, 0);
          this.activeBoss.meshGroup.scale.set(0.9, 0.9, 0.9);
        }
        this.spaceHUD?.showWaveBanner("INSPECTING", "BOSS DREADNOUGHT FLAGSHIP");
        break;
      }
    }
  }

  spawnEnemyLaser(origin, dir, color = 0xff0044, speed = 40) {
    this.spawnLaser(origin, color, true, dir, speed);
  }

  spawnPowerUp(pos) {
    const types = ['OVERCHARGE', 'REPAIR', 'STASIS', 'NUKE'];
    const selected = types[Math.floor(Math.random() * types.length)];
    this.powerUps.push(new PowerUp(this.spaceScene.scene, pos, selected));
  }

  collectPowerUp(type) {
    this.voiceAnnouncer.announcePowerUp(type);
    this.spaceAudio.playPowerUpSound();

    if (type === 'OVERCHARGE') {
      this.overchargeTimer = 8.0;
    } else if (type === 'REPAIR') {
      this.playerShip.shield = Math.min(this.playerShip.maxShield, this.playerShip.shield + 50);
      this.planetHp = Math.min(this.maxPlanetHp, this.planetHp + 30);
    } else if (type === 'STASIS') {
      this.stasisTimer = 6.0;
    } else if (type === 'NUKE') {
      this.particleManager.createEmpShockwave(this.playerShip.meshGroup.position, 60);
      const canvasContainer = document.getElementById('canvas-container');
      if (canvasContainer) {
        canvasContainer.classList.add('camera-glitch');
        setTimeout(() => { canvasContainer.classList.remove('camera-glitch'); }, 400);
      }
      this.asteroids.forEach(a => {
        a.takeDamage(500);
        this.addScore(a.scoreValue);
      });
      this.drones.forEach(d => {
        d.takeDamage(500);
        this.addScore(d.scoreValue);
      });
      this.spaceScene.addScreenShake(2.0);
    }
  }

  spawnLaser(startPos, colorHex = 0x00f3ff, isEnemy = false, targetDir = null, isCrit = false, projectileType = 'STANDARD') {
    let bolt = this.laserPool.find(l => l.isDead);
    if (!bolt) {
      if (this.laserPool.length < 200) {
        bolt = new LaserBolt(this.spaceScene.scene, startPos, colorHex, isEnemy, targetDir, projectileType, this);
        this.laserPool.push(bolt);
      } else {
        bolt = this.laserPool[0];
        this.laserPool.push(this.laserPool.shift());
      }
    }
    bolt.gameManager = this;
    bolt.reset(startPos, colorHex, isEnemy, targetDir, projectileType);
    if (isCrit) bolt.isCritical = true;
    if (!this.lasers.includes(bolt)) this.lasers.push(bolt);

    // AAA Dynamic Muzzle Lighting Flash
    if (!isEnemy && this.spaceScene && Math.random() < 0.4) {
      this.spaceScene.triggerDynamicLightFlash(startPos, colorHex, 3.0, 0.07);
    }

    return bolt;
  }

  spawnPlasmaPulse(startPos) {
    let pulse = this.plasmaPulsePool.find(p => p.isDead);
    if (!pulse) {
      if (this.plasmaPulsePool.length < 15) {
        pulse = new PlasmaPulse(this.spaceScene.scene, startPos, this.particleManager);
        this.plasmaPulsePool.push(pulse);
      } else {
        pulse = this.plasmaPulsePool[0];
        this.plasmaPulsePool.push(this.plasmaPulsePool.shift());
      }
    }
    pulse.reset(startPos);
    if (!this.plasmaPulses.includes(pulse)) this.plasmaPulses.push(pulse);
    return pulse;
  }

  fireRapidLaser() {
    if (this.state !== 'PLAYING' || this.playerShip.laserCooldown > 0 || this.specialWeaponActive) return;

    let delay = this.playerShip.laserFireDelay || 0.10;
    if (this.playerShip._dodgeBoostTimer > 0) {
      delay *= 0.8;
    }
    this.playerShip.laserCooldown = delay;

    const shipClass = this.playerShip.shipClass || 'INTERCEPTOR';
    let projectileType = 'STANDARD';
    let color = 0x00f3ff;

    if (shipClass === 'DREADNOUGHT') {
      projectileType = 'FLAK';
      color = 0xff3300;
      this.playerShip.triggerBarrelRecoil();
      this.spaceScene.addScreenShake(0.28);
    } else if (shipClass === 'TACTICIAN') {
      projectileType = 'HOMING';
      color = 0x00ff88;
    } else if (shipClass === 'REAPER') {
      projectileType = 'CRIT_DART';
      color = 0xaa00ff;
    } else if (shipClass === 'SENTINEL') {
      projectileType = 'STANDARD';
      color = 0x00e5ff;
    }

    if (this.overchargeTimer > 0) color = 0xffea00;

    const muzzles = this.playerShip.muzzleOffsets && this.playerShip.muzzleOffsets.length > 0
      ? this.playerShip.muzzleOffsets
      : [new THREE.Vector3(-2, 0, -1), new THREE.Vector3(2, 0, -1)];

    muzzles.forEach(offset => {
      const worldMuzzle = this.playerShip.meshGroup.localToWorld(offset.clone());
      this.spawnLaser(worldMuzzle, color, false, null, false, projectileType);
      if (shipClass === 'DREADNOUGHT') {
        this.particleManager.spawnEngineParticle(worldMuzzle, 0xff5500);
      } else if (shipClass === 'TACTICIAN') {
        this.particleManager.spawnEngineParticle(worldMuzzle, 0x00ff88);
      } else if (shipClass === 'REAPER') {
        this.particleManager.spawnEngineParticle(worldMuzzle, 0xcc00ff);
      } else if (shipClass === 'SENTINEL') {
        this.particleManager.spawnEngineParticle(worldMuzzle, 0x00e5ff);
      }
    });

    if (shipClass === 'DREADNOUGHT') {
      this.spaceAudio.playMissileLaunch(this.playerShip.meshGroup.position.x);
    } else if (shipClass === 'TACTICIAN') {
      this.spaceAudio.playQuantumArc(this.playerShip.meshGroup.position.x);
    } else if (shipClass === 'REAPER') {
      this.spaceAudio.playTachyonNeedle(this.playerShip.meshGroup.position.x, Math.random() < 0.35);
    } else if (shipClass === 'SENTINEL') {
      this.spaceAudio.playAegisIonBlast(this.playerShip.meshGroup.position.x);
    } else {
      this.spaceAudio.playLaserPew(this.playerShip.meshGroup.position.x);
    }
  }

  fireEmpPulse() {
    this.firePlasmaPulse();
  }

  firePlasmaPulse() {
    if (this.state !== 'PLAYING' || this.playerShip.pulseCooldown > 0) return;

    this.specialWeaponActive = true;
    setTimeout(() => { this.specialWeaponActive = false; }, 400);

    this.playerShip.pulseCooldown = this.playerShip.maxPulseCD;
    const pPos = this.playerShip.meshGroup.position;
    const startPos = new THREE.Vector3(0, 0, -1.5).add(pPos);

    this.spawnPlasmaPulse(startPos);

    this.achievementSystem.recordEmpUsed();
    this.spaceAudio.playEmpPulse();
    this.spaceAudio.vibrate([50, 30, 50]);
    this.spaceScene.addScreenShake(1.8);
  }

  fireSwarmMissiles() {
    if (this.state !== 'PLAYING' || this.playerShip.swarmMissileCooldown > 0) return;
    this.playerShip.swarmMissileCooldown = this.playerShip.maxSwarmCD;

    // Collect candidate hostile targets
    const targets = [];
    if (this.drones) this.drones.forEach(d => { if (!d.isDead) targets.push(d); });
    if (this.stealthFighters) this.stealthFighters.forEach(s => { if (!s.isDead) targets.push(s); });
    if (this.heavyBattleships) {
      this.heavyBattleships.forEach(b => {
        if (!b.isDead) {
          if (b.turrets) b.turrets.forEach(t => { if (!t.isDead) targets.push(t); });
          targets.push(b);
        }
      });
    }
    if (this.carrierBoss && !this.carrierBoss.isDead) {
      if (this.carrierBoss.turrets) this.carrierBoss.turrets.forEach(t => { if (!t.isDead) targets.push(t); });
      if (this.carrierBoss.subsystems) this.carrierBoss.subsystems.forEach(s => { if (!s.isDead) targets.push(s); });
      targets.push(this.carrierBoss);
    }
    if (this.activeBoss && !this.activeBoss.isDead) {
      if (this.activeBoss.generators) this.activeBoss.generators.forEach(g => { if (!g.isDead) targets.push(g); });
      if (this.activeBoss.turrets) this.activeBoss.turrets.forEach(t => { if (!t.isDead) targets.push(t); });
      targets.push(this.activeBoss);
    }
    if (this.asteroids) {
      this.asteroids.forEach(a => {
        if (!a.isDead && a.meshGroup && a.meshGroup.position && a.meshGroup.position.z < 10) targets.push(a);
      });
    }

    const pPos = this.playerShip.meshGroup.position;
    const getTargetPos = (t) => {
      if (!t || t.isDead) return null;
      if (t.meshGroup) return t.meshGroup.position;
      if (t.mesh) {
        const p = new THREE.Vector3();
        t.mesh.getWorldPosition(p);
        return p;
      }
      if (t.position) return t.position;
      return null;
    };

    // Sort targets strictly ascending by distance to player (nearest enemy first!)
    const sortedTargets = targets
      .filter(t => !t.isDead && getTargetPos(t) !== null)
      .sort((a, b) => {
        const posA = getTargetPos(a);
        const posB = getTargetPos(b);
        return pPos.distanceTo(posA) - pPos.distanceTo(posB);
      });

    const shipClass = this.playerShip.shipClass || 'INTERCEPTOR';
    const numMissiles = shipClass === 'DREADNOUGHT' ? 8 : 6;
    let themeColor = 0x00f3ff;
    if (shipClass === 'DREADNOUGHT') themeColor = 0xff0044;
    else if (shipClass === 'TACTICIAN') themeColor = 0x00ff88;
    else if (shipClass === 'REAPER') themeColor = 0xaa00ff;
    else if (shipClass === 'SENTINEL') themeColor = 0x00e5ff;

    for (let i = 0; i < numMissiles; i++) {
      setTimeout(() => {
        if (this.state !== 'PLAYING') return;
        const target = sortedTargets.length > 0 ? sortedTargets[i % sortedTargets.length] : null;
        const sideOffset = (i % 2 === 0 ? -2.6 : 2.6);
        const launchPos = new THREE.Vector3(sideOffset, -0.2, -0.4).add(this.playerShip.meshGroup.position);
        const missile = new PlayerSwarmMissile(this.spaceScene.scene, launchPos, target, this.particleManager, this, themeColor);
        this.playerSwarmMissiles.push(missile);
        this.spaceAudio.playMissileLaunch(sideOffset);
        if (this.particleManager) {
          this.particleManager.spawnEngineParticle(launchPos, 0xff5500);
        }
      }, i * 65);
    }

    if (navigator.vibrate) navigator.vibrate([40, 30, 40, 30, 80]);
  }

  triggerHyperBoost() {
    if (this.state !== 'PLAYING') return;
    if (this.playerShip.boostEnergy > 15) {
      this.playerShip.isBoosting = !this.playerShip.isBoosting;
      if (this.playerShip.isBoosting) {
        this.spaceScene.addScreenShake(0.8);
        if (this.particleManager) {
          const boomColor = this.playerShip.shipClass === 'REAPER' ? 0xaa00ff : (this.playerShip.shipClass === 'DREADNOUGHT' ? 0xff0044 : (this.playerShip.shipClass === 'TACTICIAN' ? 0x00ff88 : 0x00f3ff));
          this.particleManager.spawnSonicBoomDisc(this.playerShip.meshGroup.position, boomColor);
        }
        if (navigator.vibrate) navigator.vibrate(80);
      }
    }
  }

  spawnSeveredDebris(worldPos) {
    const chunkGeo = new THREE.DodecahedronGeometry(1.6, 1);
    const chunkMat = new THREE.MeshStandardMaterial({
      color: 0x141e2c,
      emissive: 0xff3300,
      emissiveIntensity: 0.6,
      metalness: 0.9,
      roughness: 0.4
    });
    const chunk = new THREE.Mesh(chunkGeo, chunkMat);
    chunk.position.copy(worldPos);
    this.spaceScene.scene.add(chunk);

    const vel = new THREE.Vector3((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 14 + 10);
    const rot = new THREE.Vector3((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
    this.severedDebris.push({ mesh: chunk, vel, rot, life: 4.0 });
  }


  announceWave(waveNum, subtitle) {
    if (this.spaceHUD) {
      this.spaceHUD.showWaveBanner(waveNum, subtitle);
    }
    this.voiceAnnouncer.announceWave(waveNum, subtitle);
    this.achievementSystem.recordWaveReached(waveNum);
  }

  onWaveCompleted(completedWaveNum) {
    try {
      this.spaceAudio.playVictoryArpeggio();
      this.voiceAnnouncer.speak(`Wave ${completedWaveNum} Cleared!`, true);

      this.pendingNextWaveNum = completedWaveNum + 1;

      // Automatically open the Hangar Upgrade Modal so player can upgrade craft before next wave!
      setTimeout(() => {
        try {
          if (this.state === 'PLAYING') {
            if (this.spaceHUD) {
              this.spaceHUD.showHangarModal(completedWaveNum, this.upgradeSystem);
            }
          }
        } catch (innerErr) {
          console.error("Error in showHangarModal timeout callback:", innerErr);
        }
      }, 1200);
    } catch (err) {
      console.error("Error in onWaveCompleted:", err);
    }
  }

  resumeFromHangar() {
    this.upgradeSystem.applyUpgradesToShip(this.playerShip);

    const perks = this.getThreeRandomPerks();
    if (this.spaceHUD) {
      this.spaceHUD.showPerksModal(perks, (chosenPerk) => {
        this.activePerks.add(chosenPerk.id);
        this.playerShip.activePerks.add(chosenPerk.id);
        this.executeWaveResume();
      });
    } else {
      this.executeWaveResume();
    }
  }

  getThreeRandomPerks() {
    const pool = [
      { id: 'piercing', name: 'PIERCING BEAM', desc: 'Main lasers pierce through small asteroids, dealing 50% damage to targets behind.' },
      { id: 'siphon', name: 'NANO-SIPHON', desc: 'Destroying any enemy drone or capital cruiser restores +5 shield instantly.' },
      { id: 'retaliate', name: 'RETALIATORY EMP', desc: 'Releases a localized 100-damage EMP shockwave when your shields are breached.' },
      { id: 'magnet', name: 'SUPER MAGNETISM', desc: 'Tractor beam collection range is doubled for Tech Scrap drops.' },
      { id: 'crit', name: 'CRITICAL CAPACITOR', desc: 'Lasers have a 20% chance to fire red critical bolts dealing 3x damage.' },
      { id: 'dodge_boost', name: 'THRUST THRILLER', desc: 'Dodge roll cooldown is halved (1.5s). Dodging grants +20% fire rate for 2s.' }
    ];
    return pool.sort(() => 0.5 - Math.random()).slice(0, 3);
  }

  executeWaveResume() {
    this.state = 'PLAYING';

    if (this.pendingNukeOnWaveStart) {
      this.pendingNukeOnWaveStart = false;
      setTimeout(() => {
        if (this.state === 'PLAYING') {
          this.collectPowerUp('NUKE');
        }
      }, 1500);
    }

    if (this.pendingNextWaveNum) {
      const nextWave = this.pendingNextWaveNum;
      this.pendingNextWaveNum = null;
      this.waveSpawner.startWave(nextWave);
    }
  }

  onGameOver(reason = 'Defenses Breached') {
    if (this.state === 'GAME_OVER') return;
    this.state = 'GAME_OVER';

    this.spaceAudio.playGameOverSiren();
    if (this.spaceHUD) {
      this.spaceHUD.showGameOverModal({
        title: 'DEFENSES BREACHED',
        reason: reason,
        finalScore: this.score,
        waveNum: this.waveSpawner.currentWave,
        totalKills: this.totalKills
      });
    }
  }

  renderScene(dt = 0.016) {
    if (this.postProcessing) {
      this.postProcessing.update(dt, this.playerShip);
      this.postProcessing.render();
    } else {
      this.spaceScene.renderer.render(this.spaceScene.scene, this.spaceScene.camera);
    }
  }

  update(dt) {
    if (this.state !== 'PLAYING') {
      this.playerShip.update(dt, { x: 0, y: 0 });
      this.spaceScene.update(dt, this.playerShip, this.activeBoss);
      this.particleManager.update();
      this.renderScene(dt);
      return;
    }

    // Low shield warning beep sound
    if (this.playerShip && this.playerShip.shield < this.playerShip.maxShield * 0.25 && this.playerShip.shield > 0) {
      this.lowShieldWarningSoundTimer -= dt;
      if (this.lowShieldWarningSoundTimer <= 0) {
        this.spaceAudio.playLowShieldAlarm();
        this.lowShieldWarningSoundTimer = 1.2;
      }
    } else {
      this.lowShieldWarningSoundTimer = 0;
    }

    // AAA Hit Freeze-Frame Micro-Stutter for heavy impacts
    if (this.hitFreezeTimer > 0) {
      this.hitFreezeTimer -= dt;
      this.renderScene();
      return;
    }

    if (this.overchargeTimer > 0) this.overchargeTimer -= dt;
    if (this.stasisTimer > 0) this.stasisTimer -= dt;

    const timeScale = this.stasisTimer > 0 ? 0.25 : 1.0;
    const effectiveDt = dt * timeScale;

    // 1. Update Controls & Player Ship Movement
    const inputDir = this.controlsManager.getInputVector();
    const pendingDodge = this.controlsManager.getPendingDodge();
    if (pendingDodge) {
      this.triggerDodgeRoll(pendingDodge);
    }
    this.playerShip.update(dt, inputDir);

    // DEFAULT WEAPON AUTO-FIRE: Rapid Lasers fire continuously while playing
    this.fireRapidLaser();

    // 2. Wave Spawner
    this.waveSpawner.update(effectiveDt);
    this.waveSpawner.checkWaveComplete(
      this.asteroids.length,
      this.drones.length + this.capitalShips.length,
      this.activeBoss && !this.activeBoss.isDead
    );

    // 3. Update Entities
    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      const rock = this.asteroids[i];
      if (!rock || !rock.meshGroup) { this.asteroids.splice(i, 1); continue; }
      rock.update(effectiveDt);
      if (rock.isDead) {
        rock.destroy();
        this.asteroids.splice(i, 1);
      }
    }

    const pPos = this.playerShip.meshGroup.position;

    for (let i = 0; i < this.drones.length; i++) {
      const drone = this.drones[i];
      if (!drone || drone.isDead || !drone.meshGroup) continue;
      if (this.freezeFleetAI) {
        drone.meshGroup.rotation.y += 0.005;
      } else {
        const firePlasma = drone.update(effectiveDt, pPos);
        if (firePlasma && drone.meshGroup) {
          const dPos = drone.meshGroup.position;
          const targetDir = new THREE.Vector3().subVectors(pPos, dPos).normalize();
          this.spawnLaser(dPos, 0xff0055, true, targetDir);
          this.spaceAudio.playLaserPew();
        }
      }
    }

    if (!this.freezeFleetAI) {
      for (let i = this.drones.length - 1; i >= 0; i--) {
        const drone = this.drones[i];
        if (drone.isDead) {
          drone.destroy();
          this.drones.splice(i, 1);
        }
      }
    }

    // Update Shadow-Wraith Stealth Fighters
    for (let i = 0; i < this.stealthFighters.length; i++) {
      const fighter = this.stealthFighters[i];
      if (!fighter || fighter.isDead || !fighter.meshGroup) continue;
      if (this.freezeFleetAI) {
        fighter.meshGroup.rotation.y += 0.005;
      } else {
        fighter.update(effectiveDt, this.playerShip, this);
      }
    }

    if (!this.freezeFleetAI) {
      for (let i = this.stealthFighters.length - 1; i >= 0; i--) {
        const fighter = this.stealthFighters[i];
        if (fighter.isDead) {
          fighter.destroy();
          this.stealthFighters.splice(i, 1);
        }
      }
    }

    // Update Capital Ships
    for (let i = 0; i < this.capitalShips.length; i++) {
      const ship = this.capitalShips[i];
      if (!ship || ship.isDead || !ship.meshGroup) continue;
      if (this.freezeFleetAI) {
        ship.meshGroup.rotation.y += 0.003;
      } else {
        const firePositions = ship.update(effectiveDt, pPos);

        if (firePositions && Array.isArray(firePositions)) {
          firePositions.forEach(tPos => {
            const targetDir = new THREE.Vector3().subVectors(pPos, tPos).normalize();
            this.spawnLaser(tPos, 0xff0055, true, targetDir);
          });
          this.spaceAudio.playLaserPew();
        }
      }
    }

    if (!this.freezeFleetAI) {
      for (let i = this.capitalShips.length - 1; i >= 0; i--) {
        const ship = this.capitalShips[i];
        if (ship.isDead) {
          ship.destroy();
          this.capitalShips.splice(i, 1);
        }
      }
    }

    // Update Goliath Heavy Battleships
    for (let i = 0; i < this.heavyBattleships.length; i++) {
      const battleship = this.heavyBattleships[i];
      if (!battleship || battleship.isDead || !battleship.meshGroup) continue;
      if (this.freezeFleetAI) {
        battleship.meshGroup.rotation.y += 0.003;
      } else {
        battleship.update(effectiveDt, this.playerShip, this);
      }
    }

    if (!this.freezeFleetAI) {
      for (let i = this.heavyBattleships.length - 1; i >= 0; i--) {
        const battleship = this.heavyBattleships[i];
        if (battleship.isDead) {
          battleship.destroy();
          this.heavyBattleships.splice(i, 1);
        }
      }
    }

    // Update Carrier Capital Ship (Mission 1 Mid-Boss)
    if (this.carrierBoss) {
      if (this.carrierBoss.isDead) {
        this.carrierBoss.destroy();
        this.carrierBoss = null;
        this.voiceAnnouncer.speak("Carrier Destroyed! Clearing asteroid corridor!", true);
        this.addScore(25000);
        this.addScrap(300);
      } else {
        if (this.freezeFleetAI) {
          if (this.carrierBoss.meshGroup) this.carrierBoss.meshGroup.rotation.y += 0.002;
        } else {
          const carrierStatus = this.carrierBoss.update(effectiveDt, this.playerShip);
          if (carrierStatus && carrierStatus.lasers && Array.isArray(carrierStatus.lasers)) {
            carrierStatus.lasers.forEach(tPos => {
              const targetDir = new THREE.Vector3().subVectors(pPos, tPos).normalize();
              this.spawnLaser(tPos, 0x00ff66, true, targetDir);
            });
            this.spaceAudio.playLaserPew();
          }
          if (carrierStatus && carrierStatus.siegeLasers && Array.isArray(carrierStatus.siegeLasers)) {
            carrierStatus.siegeLasers.forEach(tPos => {
              const targetDir = new THREE.Vector3().subVectors(pPos, tPos).normalize();
              this.spawnLaser(tPos, 0xff0044, true, targetDir);
            });
            if (this.spaceAudio.playHeavyCannonSound) {
              this.spaceAudio.playHeavyCannonSound();
            }
          }
          if (carrierStatus && carrierStatus.droneLaunches && carrierStatus.droneLaunches.length > 0) {
            carrierStatus.droneLaunches.forEach(launch => {
              this.spawnDrone({
                x: launch.pos.x,
                y: launch.pos.y,
                z: launch.pos.z,
                vx: launch.vx,
                vy: launch.vy,
                vz: launch.vz
              }, true);
            });
          } else if (carrierStatus && carrierStatus.droneSpawns > 0) {
            for (let d = 0; d < carrierStatus.droneSpawns; d++) {
              this.spawnDrone(null, true);
            }
          }
        }
      }
    }

    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const pow = this.powerUps[i];
      if (!pow || !pow.meshGroup) { this.powerUps.splice(i, 1); continue; }
      pow.update(dt, this.playerShip);
      if (pow.isDead) {
        pow.destroy();
        this.powerUps.splice(i, 1);
      }
    }

    // Update Sentinel Companion Drone
    if (this.playerShip && this.playerShip.shipClass === 'SENTINEL') {
      if (!this.sentinelDrone) {
        this.spawnSentinelDrone();
      }
      this.updateSentinelDrone(effectiveDt);
    } else {
      this.destroySentinelDrone();
    }

    if (this.activeBoss) {
      if (this.activeBoss.isDead) {
        // Boss just died — destroy and null immediately so nothing accesses disposed materials
        try { this.activeBoss.destroy(); } catch(e) { console.warn('Boss destroy error:', e); }
        this.activeBoss = null;
        this.clearAllThreats();
      } else {
        try {
          const salvo = this.activeBoss.update(effectiveDt, pPos);

          if (this.freezeFleetAI) {
            if (this.activeBoss.meshGroup) {
              this.activeBoss.meshGroup.rotation.y += 0.003;
            }
          } else {
            if (this.activeBoss && this.activeBoss.justPhaseTransitioned) {
              this.activeBoss.justPhaseTransitioned = false;
              this.voiceAnnouncer.speak("Warning! Boss shield overcharging!", true);
              if (this.spaceHUD) {
                this.spaceHUD.showWaveBanner("WARNING", "BOSS SHIELD OVERCHARGED!");
              }
            }

            if (salvo && this.activeBoss) {
              if (Array.isArray(salvo)) {
                salvo.forEach(tPos => {
                  const targetDir = new THREE.Vector3().subVectors(pPos, tPos).normalize();
                  this.spawnLaser(tPos, 0xff0055, true, targetDir);
                });
              } else if (salvo !== false) {
                const bPos = this.activeBoss.meshGroup.position;
                const targetDir = new THREE.Vector3().subVectors(pPos, bPos).normalize();
                this.spawnLaser(new THREE.Vector3(-8, 0, 4).add(bPos), 0xff0055, true, targetDir);
                this.spawnLaser(new THREE.Vector3(8, 0, 4).add(bPos), 0xff0055, true, targetDir);
              }

              this.spaceAudio.playLaserPew();
            }
          }
        } catch(e) {
          console.warn('Boss update error (suppressed):', e);
        }
      }
    }

    // Update Fleet Showcase Bosses in Review Formation
    if (this.showcaseBosses && this.showcaseBosses.length > 0) {
      this.showcaseBosses.forEach(boss => {
        if (boss && !boss.isDead && boss.meshGroup) {
          try {
            if (this.freezeFleetAI) {
              if (boss.meshGroup) boss.meshGroup.rotation.y += 0.003;
            } else {
              boss.update(effectiveDt, pPos);
            }
          } catch(e) {}
        }
      });
    }

    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const laser = this.lasers[i];
      if (!laser || !laser.meshGroup) { this.lasers.splice(i, 1); continue; }
      laser.update(dt);
      if (laser.isDead) {
        laser.destroy();
        this.lasers.splice(i, 1);
      }
    }

    for (let i = this.plasmaPulses.length - 1; i >= 0; i--) {
      const pulse = this.plasmaPulses[i];
      if (!pulse || !pulse.meshGroup) { this.plasmaPulses.splice(i, 1); continue; }
      pulse.update(dt);
      if (pulse.isDead) {
        pulse.destroy();
        this.plasmaPulses.splice(i, 1);
      }
    }

    // Update Player Swarm Missiles
    for (let i = this.playerSwarmMissiles.length - 1; i >= 0; i--) {
      const missile = this.playerSwarmMissiles[i];
      if (!missile || missile.isDead) {
        this.playerSwarmMissiles.splice(i, 1);
        continue;
      }
      missile.update(dt);
    }

    // Update Severed Physical Debris
    for (let i = this.severedDebris.length - 1; i >= 0; i--) {
      const deb = this.severedDebris[i];
      deb.life -= dt;
      deb.mesh.position.addScaledVector(deb.vel, dt);
      deb.mesh.rotation.x += deb.rot.x * dt;
      deb.mesh.rotation.y += deb.rot.y * dt;
      deb.mesh.rotation.z += deb.rot.z * dt;
      if (Math.random() < 0.3) {
        this.particleManager.spawnEngineParticle(deb.mesh.position, 0xff4400);
      }
      if (deb.life <= 0) {
        this.spaceScene.scene.remove(deb.mesh);
        deb.mesh.geometry.dispose();
        deb.mesh.material.dispose();
        this.severedDebris.splice(i, 1);
      }
    }

    // 4. Update EMP Shockwave state
    if (this.activeEmpPulse) {
      this.activeEmpPulse.currentRadius += 1.2;
      if (this.activeEmpPulse.currentRadius >= this.activeEmpPulse.maxRadius) {
        this.activeEmpPulse = null;
      }
    }

    // 5. Check Collisions
    this.collisionSystem.checkCollisions(this);

    // 6. Update HUD Status
    if (this.spaceHUD) {
      this.spaceHUD.updateStatus({
        planetHp: this.planetHp,
        playerShield: this.playerShip.shield,
        playerMaxShield: this.playerShip.maxShield,
        score: this.score,
        scrap: this.upgradeSystem.scrap,
        waveNum: this.waveSpawner.currentWave,
        pulseCdRatio: this.playerShip.pulseCooldown / this.playerShip.maxPulseCD,
        bossHpRatio: (this.activeBoss && !this.activeBoss.isDead) 
          ? Math.max(0, this.activeBoss.coreHp / this.activeBoss.maxCoreHp) 
          : ((this.heavyBattleships && this.heavyBattleships.length > 0 && !this.heavyBattleships[0].isDead)
            ? Math.max(0, this.heavyBattleships[0].coreHp / this.heavyBattleships[0].maxCoreHp)
            : ((this.carrierBoss && !this.carrierBoss.isDead) 
              ? Math.max(0, this.carrierBoss.coreHp / this.carrierBoss.maxCoreHp) 
              : null)),
        bossTitle: (this.activeBoss && !this.activeBoss.isDead) 
          ? (this.activeBoss.aegisFrigates ? "⚠️ LEVIATHAN COMMAND MOTHERSHIP ⚠️" : (this.activeBoss.generators ? "⚠️ ORBITAL ALPHA MOON BASE ⚠️" : "⚠️ ENEMY MEGASTRUCTURE ⚠️"))
          : ((this.heavyBattleships && this.heavyBattleships.length > 0 && !this.heavyBattleships[0].isDead)
            ? "⚠️ GOLIATH HEAVY BATTLESHIP DREADNOUGHT ⚠️"
            : ((this.carrierBoss && !this.carrierBoss.isDead) 
              ? "⚠️ ENEMY SPACECRAFT CARRIER CAPITAL SHIP ⚠️" 
              : "⚠️ ENEMY TARGET ⚠️")),
        overchargeActive: this.overchargeTimer > 0,
        stasisActive: this.stasisTimer > 0
      });
    }

    // 7. Update Scene & Render
    const bossForCam = this.activeBoss || this.carrierBoss || (this.heavyBattleships && this.heavyBattleships.find(b => !b.isDead));
    this.spaceScene.update(dt, this.playerShip, bossForCam);
    this.particleManager.update();
    this.renderScene(effectiveDt);
  }

  spawnSentinelDrone() {
    const droneGroup = new THREE.Group();
    
    // Drone Core Spherical hull
    const coreGeo = new THREE.SphereGeometry(0.55, 12, 12);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x0c1e30,
      roughness: 0.3,
      metalness: 0.9,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    droneGroup.add(core);

    // Glowing sensor eye
    const eyeGeo = new THREE.SphereGeometry(0.18, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(0, 0, -0.45);
    droneGroup.add(eye);

    // Rotating wings
    const wingGeo = new THREE.BoxGeometry(1.6, 0.08, 0.4);
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x0055ff, metalness: 0.8, roughness: 0.2 });
    const wings = new THREE.Mesh(wingGeo, wingMat);
    wings.position.set(0, 0, 0);
    droneGroup.add(wings);
    this.sentinelDroneWings = wings;

    // Point light glow
    const light = new THREE.PointLight(0x00f3ff, 1.5, 8);
    droneGroup.add(light);

    const pPos = this.playerShip.meshGroup.position;
    droneGroup.position.copy(pPos).add(new THREE.Vector3(4, 2, -1));

    this.spaceScene.scene.add(droneGroup);
    this.sentinelDrone = droneGroup;
    this.sentinelDroneFireTimer = 1.0;
  }

  destroySentinelDrone() {
    if (this.sentinelDrone) {
      this.spaceScene.scene.remove(this.sentinelDrone);
      this.sentinelDrone.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      this.sentinelDrone = null;
      this.sentinelDroneWings = null;
    }
  }

  updateSentinelDrone(dt) {
    if (!this.sentinelDrone || !this.playerShip || !this.playerShip.meshGroup) return;

    const pPos = this.playerShip.meshGroup.position;
    const time = performance.now() * 0.001;

    // Smooth orbiting follow logic
    const angle = time * 2.2;
    const targetPos = new THREE.Vector3(
      pPos.x + Math.cos(angle) * 3.5,
      pPos.y + Math.sin(angle * 0.5) * 1.5 + 1.2,
      pPos.z - 1.0
    );
    this.sentinelDrone.position.lerp(targetPos, 0.08);

    // Rotate wings
    if (this.sentinelDroneWings) {
      this.sentinelDroneWings.rotation.y += 2.0 * dt;
    }

    this.sentinelDrone.rotation.y = Math.sin(time) * 0.25;

    // Firing logic
    this.sentinelDroneFireTimer -= dt;
    if (this.sentinelDroneFireTimer <= 0) {
      this.sentinelDroneFireTimer = 2.5; // shoots every 2.5s

      // Search closest threat (drone, capital ship, asteroid, or boss)
      let closestTarget = null;
      let minDist = 9999;
      const threats = [...this.asteroids, ...this.drones, ...this.capitalShips];
      if (this.activeBoss && !this.activeBoss.isDead) {
        threats.push(this.activeBoss);
      }

      threats.forEach(t => {
        if (t && t.meshGroup && !t.isDead) {
          const dist = this.sentinelDrone.position.distanceTo(t.meshGroup.position);
          if (dist < minDist) {
            minDist = dist;
            closestTarget = t;
          }
        }
      });

      // Aim and fire!
      let fireDir = new THREE.Vector3(0, 0, -1);
      if (closestTarget && closestTarget.meshGroup) {
        fireDir.copy(closestTarget.meshGroup.position).sub(this.sentinelDrone.position).normalize();
      }

      this.spawnLaser(
        this.sentinelDrone.position.clone(),
        0x00f3ff,
        false,
        fireDir
      );

      // Trigger visual/audio feedback
      this.particleManager.createExplosion(this.sentinelDrone.position, 0x00f3ff, 5, 0.4);
      this.spaceAudio.playLaserPew(this.sentinelDrone.position.x);
    }
  }
}
