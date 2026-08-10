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
import { CapitalShip } from '../objects/CapitalShip.js';
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
    this.capitalShips = [];
    this.powerUps = [];
    this.lasers = [];
    this.plasmaPulses = [];
    this.activeEmpPulse = null;
    this.activeBoss = null;

    // Active Power-Up Timers
    this.overchargeTimer = 0;
    this.stasisTimer = 0;
    this.hitFreezeTimer = 0;
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
    if (this.selectedShipClass) {
      this.playerShip.setShipClass(this.selectedShipClass);
    } else {
      this.playerShip.setShipClass('INTERCEPTOR');
    }
    this.upgradeSystem.applyUpgradesToShip(this.playerShip);
    this.playerShip.shield = this.playerShip.maxShield;
    this.state = 'PLAYING';
    this.waveSpawner.startWave(1);
    this.spaceAudio.ensureContext();
    this.spaceAudio.startDrone();
  }

  setSelectedShipClass(shipClass) {
    this.selectedShipClass = shipClass;
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

    this.capitalShips.forEach(c => c.destroy());
    this.capitalShips = [];

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

    this.activeEmpPulse = null;
    this.destroySentinelDrone();
  }

  clearAllThreats() {
    this.asteroids.forEach(a => {
      if (a.meshGroup) this.particleManager.createExplosion(a.meshGroup.position, 0xffaa00, 10);
      a.destroy();
    });
    this.asteroids = [];

    this.drones.forEach(d => {
      if (d.meshGroup) this.particleManager.createExplosion(d.meshGroup.position, 0xff0055, 12);
      d.destroy();
    });
    this.drones = [];

    this.capitalShips.forEach(c => {
      if (c.meshGroup) this.particleManager.createExplosion(c.meshGroup.position, 0x00aaff, 20);
      c.destroy();
    });
    this.capitalShips = [];
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
    const rock = new Asteroid(this.spaceScene.scene, options);
    this.asteroids.push(rock);
  }

  spawnAsteroidFragments(fragments) {
    fragments.forEach(frag => {
      this.spawnAsteroid(frag);
    });
  }

  spawnDrone() {
    const drone = new EnemyDrone(this.spaceScene.scene);
    this.drones.push(drone);
  }

  spawnCapitalShip() {
    const ship = new CapitalShip(this.spaceScene.scene, this.particleManager);
    this.capitalShips.push(ship);
    this.voiceAnnouncer.speak("Alert! Capital Warship Entering Sector!", false);
  }

  spawnBoss() {
    this.activeBoss = new BossDreadnought(this.spaceScene.scene, this.particleManager);
    this.voiceAnnouncer.speak("Warning! Sector Dreadnought Approaching!", true);
  }

  spawnTitanBoss() {
    this.activeBoss = new TitanAsteroidBoss(this.spaceScene.scene, this.particleManager);
    this.voiceAnnouncer.speak("Warning! Titan Asteroid Core Approaching!", true);
  }

  spawnSpaceStation() {
    this.activeBoss = new MoonBase(this.spaceScene.scene, this.particleManager);
    this.voiceAnnouncer.speak("Warning! Sector Alpha Moon Base in Sight!", true);
  }

  spawnHaloBoss() {
    this.activeBoss = new HaloRingBoss(this.spaceScene.scene, this.particleManager);
    this.voiceAnnouncer.speak("Warning! Halo Megastructure Ring Approaching!", true);
  }

  spawnBabylon5Boss() {
    this.activeBoss = new Babylon5Boss(this.spaceScene.scene, this.particleManager);
    this.voiceAnnouncer.speak("Warning! Babylon 5 Industrial Rotating Citadel Approaching!", true);
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

  fireRapidLaser() {
    if (this.state !== 'PLAYING' || this.playerShip.laserCooldown > 0 || this.specialWeaponActive) return;

    let delay = this.playerShip.laserFireDelay || 0.12;
    if (this.playerShip._dodgeBoostTimer > 0) {
      delay *= 0.8;
    }
    this.playerShip.laserCooldown = delay;

    const pPos = this.playerShip.meshGroup.position;
    const isCrit = this.activePerks.has('crit') && Math.random() < 0.20;
    const color = isCrit ? 0xff0044 : (this.overchargeTimer > 0 ? 0xffea00 : 0x00f3ff);

    if (this.overchargeTimer > 0) {
      const b1 = new LaserBolt(this.spaceScene.scene, new THREE.Vector3(3.0, 0, -0.4).add(pPos), color);
      const b2 = new LaserBolt(this.spaceScene.scene, new THREE.Vector3(1.0, 0, -0.4).add(pPos), color);
      const b3 = new LaserBolt(this.spaceScene.scene, new THREE.Vector3(-1.0, 0, -0.4).add(pPos), color);
      const b4 = new LaserBolt(this.spaceScene.scene, new THREE.Vector3(-3.0, 0, -0.4).add(pPos), color);
      if (isCrit) { b1.isCritical = true; b2.isCritical = true; b3.isCritical = true; b4.isCritical = true; }
      this.lasers.push(b1, b2, b3, b4);
    } else {
      const b1 = new LaserBolt(this.spaceScene.scene, new THREE.Vector3(2.0, 0, -0.4).add(pPos), color);
      const b2 = new LaserBolt(this.spaceScene.scene, new THREE.Vector3(-2.0, 0, -0.4).add(pPos), color);
      if (isCrit) { b1.isCritical = true; b2.isCritical = true; }
      this.lasers.push(b1, b2);
    }

    this.spaceAudio.playLaserPew(pPos.x);
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

    const pulse = new PlasmaPulse(this.spaceScene.scene, startPos, this.particleManager);
    this.plasmaPulses.push(pulse);

    this.achievementSystem.recordEmpUsed();
    this.spaceAudio.playEmpPulse();
    this.spaceAudio.vibrate([50, 30, 50]);
    this.spaceScene.addScreenShake(1.8);
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

  renderScene() {
    this.postProcessing.render();
  }

  update(dt) {
    if (this.state !== 'PLAYING') {
      this.playerShip.update(dt, { x: 0, y: 0 });
      this.spaceScene.update(dt, { x: 0, y: 0 });
      this.particleManager.update();
      this.renderScene();
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
      rock.update(effectiveDt);
      if (rock.isDead) {
        rock.destroy();
        this.asteroids.splice(i, 1);
      }
    }

    const pPos = this.playerShip.meshGroup.position;

    for (let i = 0; i < this.drones.length; i++) {
      const drone = this.drones[i];
      const firePlasma = drone.update(effectiveDt, pPos);

      if (firePlasma) {
        const dPos = drone.meshGroup.position;
        const targetDir = new THREE.Vector3().subVectors(pPos, dPos).normalize();
        this.lasers.push(new LaserBolt(this.spaceScene.scene, dPos, 0xff0055, true, targetDir));
        this.spaceAudio.playLaserPew();
      }
    }

    for (let i = this.drones.length - 1; i >= 0; i--) {
      const drone = this.drones[i];
      if (drone.isDead) {
        drone.destroy();
        this.drones.splice(i, 1);
      }
    }

    // Update Capital Ships
    for (let i = 0; i < this.capitalShips.length; i++) {
      const ship = this.capitalShips[i];
      const firePositions = ship.update(effectiveDt, pPos);

      if (firePositions && Array.isArray(firePositions)) {
        firePositions.forEach(tPos => {
          const targetDir = new THREE.Vector3().subVectors(pPos, tPos).normalize();
          this.lasers.push(new LaserBolt(this.spaceScene.scene, tPos, 0xff0055, true, targetDir));
        });
        this.spaceAudio.playLaserPew();
      }
    }

    for (let i = this.capitalShips.length - 1; i >= 0; i--) {
      const ship = this.capitalShips[i];
      if (ship.isDead) {
        ship.destroy();
        this.capitalShips.splice(i, 1);
      }
    }

    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const pow = this.powerUps[i];
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
                this.lasers.push(new LaserBolt(this.spaceScene.scene, tPos, 0xff0055, true, targetDir));
              });
            } else if (salvo !== false) {
              const bPos = this.activeBoss.meshGroup.position;
              const targetDir = new THREE.Vector3().subVectors(pPos, bPos).normalize();
              this.lasers.push(new LaserBolt(this.spaceScene.scene, new THREE.Vector3(-8, 0, 4).add(bPos), 0xff0055, true, targetDir));
              this.lasers.push(new LaserBolt(this.spaceScene.scene, new THREE.Vector3(8, 0, 4).add(bPos), 0xff0055, true, targetDir));
            }
            this.spaceAudio.playLaserPew();
          }
        } catch(e) {
          console.warn('Boss update error (suppressed):', e);
        }
      }
    }

    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const laser = this.lasers[i];
      laser.update(dt);
      if (laser.isDead) {
        laser.destroy();
        this.lasers.splice(i, 1);
      }
    }

    for (let i = this.plasmaPulses.length - 1; i >= 0; i--) {
      const pulse = this.plasmaPulses[i];
      pulse.update(dt);
      if (pulse.isDead) {
        pulse.destroy();
        this.plasmaPulses.splice(i, 1);
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
        score: this.score,
        scrap: this.upgradeSystem.scrap,
        waveNum: this.waveSpawner.currentWave,
        pulseCdRatio: this.playerShip.pulseCooldown / this.playerShip.maxPulseCD,
        bossHpRatio: this.activeBoss ? Math.max(0, this.activeBoss.coreHp / this.activeBoss.maxCoreHp) : null,
        overchargeActive: this.overchargeTimer > 0,
        stasisActive: this.stasisTimer > 0
      });
    }

    // 7. Update Scene & Render
    this.spaceScene.update(dt, this.playerShip.velocity);
    this.particleManager.update();
    this.renderScene();
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

      const bolt = new LaserBolt(this.spaceScene.scene, this.sentinelDrone.position.clone(), 0x00f3ff);
      bolt.velocity.copy(fireDir).multiplyScalar(58);
      this.lasers.push(bolt);

      // Trigger visual/audio feedback
      this.particleManager.createExplosion(this.sentinelDrone.position, 0x00f3ff, 5, 0.4);
      this.spaceAudio.playLaserPew(this.sentinelDrone.position.x);
    }
  }
}
