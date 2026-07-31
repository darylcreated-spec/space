import * as THREE from 'three';
import { PlayerShip } from '../objects/PlayerShip.js';
import { Asteroid } from '../objects/Asteroid.js';
import { EnemyDrone } from '../objects/EnemyDrone.js';
import { LaserBolt, Torpedo } from '../objects/Projectiles.js';
import { CollisionSystem } from './CollisionSystem.js';
import { WaveSpawner } from './WaveSpawner.js';

export class GameManager {
  constructor(spaceScene, postProcessing, particleManager, spaceAudio, controlsManager) {
    this.spaceScene = spaceScene;
    this.postProcessing = postProcessing;
    this.particleManager = particleManager;
    this.spaceAudio = spaceAudio;
    this.controlsManager = controlsManager;

    this.state = 'START'; // 'START', 'PLAYING', 'GAME_OVER'

    // Core Stats
    this.planetHp = 100;
    this.maxPlanetHp = 100;
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('orbital_vanguard_highscore') || '0', 10);
    this.totalKills = 0;

    // Entities
    this.playerShip = new PlayerShip(this.spaceScene.scene, this.particleManager);
    this.asteroids = [];
    this.drones = [];
    this.lasers = [];
    this.torpedoes = [];
    this.activeEmpPulse = null;

    // Subsystems
    this.collisionSystem = new CollisionSystem(this.particleManager, this.spaceAudio, this.spaceScene);
    this.waveSpawner = new WaveSpawner(this);

    this.spaceHUD = null; // Bound later
  }

  setHUD(hud) {
    this.spaceHUD = hud;
    if (this.spaceHUD) {
      this.spaceHUD.updateHighScore(this.highScore);
    }
  }

  startGame() {
    this.resetState();
    this.state = 'PLAYING';
    this.waveSpawner.startWave(1);
    this.spaceAudio.ensureContext();
    this.spaceAudio.startDrone();
  }

  resetState() {
    this.planetHp = 100;
    this.score = 0;
    this.totalKills = 0;
    this.playerShip.reset();

    this.clearAllEntities();
  }

  clearAllEntities() {
    this.asteroids.forEach(a => a.destroy());
    this.asteroids = [];

    this.drones.forEach(d => d.destroy());
    this.drones = [];

    this.lasers.forEach(l => l.destroy());
    this.lasers = [];

    this.torpedoes.forEach(t => t.destroy());
    this.torpedoes = [];

    this.activeEmpPulse = null;
  }

  addScore(pts) {
    this.score += pts;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('orbital_vanguard_highscore', this.highScore.toString());
      if (this.spaceHUD) this.spaceHUD.updateHighScore(this.highScore);
    }
  }

  damagePlanet(amount) {
    this.planetHp = Math.max(0, this.planetHp - amount);
    if (this.planetHp <= 0) {
      this.onGameOver('Planet Shield Depleted');
    }
  }

  spawnAsteroid(options = {}) {
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

  fireRapidLaser() {
    if (this.state !== 'PLAYING' || this.playerShip.laserCooldown > 0) return;

    this.playerShip.laserCooldown = 0.12;

    const pPos = this.playerShip.meshGroup.position;
    const pRight = new THREE.Vector3(2.0, 0, -0.4).add(pPos);
    const pLeft = new THREE.Vector3(-2.0, 0, -0.4).add(pPos);

    this.lasers.push(new LaserBolt(this.spaceScene.scene, pRight, 0x00f3ff));
    this.lasers.push(new LaserBolt(this.spaceScene.scene, pLeft, 0x00f3ff));

    this.spaceAudio.playLaserPew();
    this.spaceAudio.vibrate(10);
  }

  fireTorpedo() {
    if (this.state !== 'PLAYING' || this.playerShip.torpedoCooldown > 0) return;

    this.playerShip.torpedoCooldown = this.playerShip.maxTorpedoCD;

    const pPos = this.playerShip.meshGroup.position;
    const startPos = new THREE.Vector3(0, -0.3, -1.0).add(pPos);

    const torpedo = new Torpedo(this.spaceScene.scene, startPos, this.particleManager);

    let nearestTarget = null;
    let minDist = Infinity;

    [...this.drones, ...this.asteroids].forEach(entity => {
      if (!entity.isDead) {
        const d = startPos.distanceTo(entity.meshGroup.position);
        if (d < minDist) {
          minDist = d;
          nearestTarget = entity;
        }
      }
    });

    if (nearestTarget) torpedo.setTarget(nearestTarget);

    this.torpedoes.push(torpedo);
    this.spaceAudio.playTorpedoLaunch();
    this.spaceAudio.vibrate(30);
  }

  fireEmpPulse() {
    if (this.state !== 'PLAYING' || this.playerShip.pulseCooldown > 0) return;

    this.playerShip.pulseCooldown = this.playerShip.maxPulseCD;

    const pPos = this.playerShip.meshGroup.position;
    this.particleManager.createEmpShockwave(pPos, 30);
    this.activeEmpPulse = { currentRadius: 0.5, maxRadius: 30 };

    this.spaceAudio.playEmpPulse();
    this.spaceAudio.vibrate([50, 30, 50]);
    this.spaceScene.addScreenShake(1.5);
  }

  announceWave(waveNum, subtitle) {
    if (this.spaceHUD) {
      this.spaceHUD.showWaveBanner(waveNum, subtitle);
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
    // Direct WebGL rendering guarantees 100% visible 3D scene rendering across all browsers
    this.spaceScene.renderer.render(this.spaceScene.scene, this.spaceScene.camera);
  }

  update(dt) {
    if (this.state !== 'PLAYING') {
      // Render background space scene preview continuously even on Start / GameOver screens!
      this.playerShip.update(dt, { x: 0, y: 0 });
      this.spaceScene.update(dt, { x: 0, y: 0 });
      this.particleManager.update();
      this.renderScene();
      return;
    }

    // 1. Update Controls & Player Ship
    const inputDir = this.controlsManager.getInputVector();
    this.playerShip.update(dt, inputDir);

    if (this.controlsManager.isLaserHeld) {
      this.fireRapidLaser();
    }

    // 2. Wave Spawner
    this.waveSpawner.update(dt);
    this.waveSpawner.checkWaveComplete(this.asteroids.length, this.drones.length);

    // 3. Update Entities
    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      const rock = this.asteroids[i];
      rock.update(dt);
      if (rock.isDead) {
        rock.destroy();
        this.asteroids.splice(i, 1);
      }
    }

    for (let i = 0; i < this.drones.length; i++) {
      const drone = this.drones[i];
      const firePlasma = drone.update(dt, this.playerShip.meshGroup.position);

      if (firePlasma) {
        const dPos = drone.meshGroup.position;
        this.lasers.push(new LaserBolt(this.spaceScene.scene, dPos, 0xff0055, true));
      }
    }

    for (let i = this.drones.length - 1; i >= 0; i--) {
      const drone = this.drones[i];
      if (drone.isDead) {
        drone.destroy();
        this.drones.splice(i, 1);
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

    for (let i = this.torpedoes.length - 1; i >= 0; i--) {
      const torpedo = this.torpedoes[i];
      torpedo.update(dt);
      if (torpedo.isDead) {
        torpedo.destroy();
        this.torpedoes.splice(i, 1);
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

    // 6. Update Audio Ambient Synth Pitch based on threat count
    const totalThreats = this.asteroids.length + this.drones.length;
    this.spaceAudio.updateThreatLevel(totalThreats);

    // 7. Update HUD
    if (this.spaceHUD) {
      this.spaceHUD.updateStatus({
        planetHp: this.planetHp,
        playerShield: this.playerShip.shield,
        score: this.score,
        waveNum: this.waveSpawner.currentWave,
        torpedoCdRatio: this.playerShip.torpedoCooldown / this.playerShip.maxTorpedoCD,
        pulseCdRatio: this.playerShip.pulseCooldown / this.playerShip.maxPulseCD
      });
    }

    // 8. Update Camera & Scene
    this.spaceScene.update(dt, this.playerShip.velocity);
    this.particleManager.update();
    this.renderScene();
  }
}
