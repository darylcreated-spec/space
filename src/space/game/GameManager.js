import * as THREE from 'three';
import { PlayerShip } from '../objects/PlayerShip.js';
import { Asteroid } from '../objects/Asteroid.js';
import { EnemyDrone } from '../objects/EnemyDrone.js';
import { PowerUp } from '../objects/PowerUp.js';
import { BossDreadnought } from '../objects/BossDreadnought.js';
import { TitanAsteroidBoss } from '../objects/TitanAsteroidBoss.js';
import { SpaceStation } from '../objects/SpaceStation.js';
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

    // Stats
    this.planetHp = 100;
    this.maxPlanetHp = 100;
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('orbital_vanguard_highscore') || '0', 10);
    this.totalKills = 0;

    // Active Entities
    this.playerShip = new PlayerShip(this.spaceScene.scene, this.particleManager);
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
    this.upgradeSystem.applyUpgradesToShip(this.playerShip);
    this.state = 'PLAYING';
    this.waveSpawner.startWave(1);
    this.spaceAudio.ensureContext();
    this.spaceAudio.startDrone();
  }

  resetState() {
    this.planetHp = 100;
    this.score = 0;
    this.totalKills = 0;
    this.overchargeTimer = 0;
    this.stasisTimer = 0;
    this.specialWeaponActive = false;
    this.pendingNukeOnWaveStart = false;
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
    this.activeBoss = new SpaceStation(this.spaceScene.scene, this.particleManager);
    this.voiceAnnouncer.speak("Warning! Sector Alpha Death Star Superweapon in Sight!", true);
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

    this.playerShip.laserCooldown = this.playerShip.laserFireDelay || 0.12;
    const pPos = this.playerShip.meshGroup.position;

    if (this.overchargeTimer > 0) {
      this.lasers.push(new LaserBolt(this.spaceScene.scene, new THREE.Vector3(3.0, 0, -0.4).add(pPos), 0xffea00));
      this.lasers.push(new LaserBolt(this.spaceScene.scene, new THREE.Vector3(1.0, 0, -0.4).add(pPos), 0xffea00));
      this.lasers.push(new LaserBolt(this.spaceScene.scene, new THREE.Vector3(-1.0, 0, -0.4).add(pPos), 0xffea00));
      this.lasers.push(new LaserBolt(this.spaceScene.scene, new THREE.Vector3(-3.0, 0, -0.4).add(pPos), 0xffea00));
    } else {
      this.lasers.push(new LaserBolt(this.spaceScene.scene, new THREE.Vector3(2.0, 0, -0.4).add(pPos), 0x00f3ff));
      this.lasers.push(new LaserBolt(this.spaceScene.scene, new THREE.Vector3(-2.0, 0, -0.4).add(pPos), 0x00f3ff));
    }

    this.spaceAudio.playLaserPew();
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
    this.spaceAudio.playVictoryArpeggio();
    this.voiceAnnouncer.speak(`Wave ${completedWaveNum} Cleared!`, true);

    this.pendingNextWaveNum = completedWaveNum + 1;

    // Automatically open the Hangar Upgrade Modal so player can upgrade craft before next wave!
    setTimeout(() => {
      if (this.state === 'PLAYING') {
        if (this.spaceHUD) {
          this.spaceHUD.showHangarModal(completedWaveNum, this.upgradeSystem);
        }
      }
    }, 1200);
  }

  resumeFromHangar() {
    this.upgradeSystem.applyUpgradesToShip(this.playerShip);
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
      pow.update(dt, pPos);
      if (pow.isDead) {
        pow.destroy();
        this.powerUps.splice(i, 1);
      }
    }

    if (this.activeBoss && !this.activeBoss.isDead) {
      const salvo = this.activeBoss.update(effectiveDt, pPos);
      if (salvo) {
        if (Array.isArray(salvo)) {
          salvo.forEach(tPos => {
            const targetDir = new THREE.Vector3().subVectors(pPos, tPos).normalize();
            this.lasers.push(new LaserBolt(this.spaceScene.scene, tPos, 0xff0055, true, targetDir));
          });
        } else {
          const bPos = this.activeBoss.meshGroup.position;
          const targetDir = new THREE.Vector3().subVectors(pPos, bPos).normalize();
          this.lasers.push(new LaserBolt(this.spaceScene.scene, new THREE.Vector3(-8, 0, 4).add(bPos), 0xff0055, true, targetDir));
          this.lasers.push(new LaserBolt(this.spaceScene.scene, new THREE.Vector3(8, 0, 4).add(bPos), 0xff0055, true, targetDir));
        }
        this.spaceAudio.playLaserPew();
      }
    } else if (this.activeBoss && this.activeBoss.isDead) {
      this.activeBoss.destroy();
      this.activeBoss = null;
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
}
