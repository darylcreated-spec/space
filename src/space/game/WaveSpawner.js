export class WaveSpawner {
  constructor(gameManager) {
    this.gameManager = gameManager;
    this.reset();
  }

  reset() {
    this.currentWave = 1;
    this.waveState = 'INACTIVE'; // 'INACTIVE', 'SPAWNING', 'WAITING_CLEAR', 'COMPLETED'
    this.spawnTimer = 0;
    this.totalToSpawnInWave = 0;
    this.spawnedCount = 0;
    this.bossSpawned = false;
  }

  startWave(waveNum) {
    this.currentWave = waveNum;
    this.waveState = 'SPAWNING';
    this.spawnTimer = 5.0; // Initial instant spawn
    this.spawnedCount = 0;
    this.bossSpawned = false;

    if (this.currentWave === 1) {
      this.totalToSpawnInWave = 30; // Full Wave 1: asteroid corridor + drone attacks
    } else if (this.currentWave === 2) {
      this.totalToSpawnInWave = 45; // Wave 2: heavier assault
    } else if (this.currentWave === 3) {
      this.totalToSpawnInWave = 60; // Wave 3: final siege
    } else {
      this.totalToSpawnInWave = 60 + (this.currentWave - 3) * 10;
    }

    this.gameManager.announceWave(this.currentWave, this.getWaveSubtitle());
  }

  getWaveSubtitle() {
    if (this.currentWave === 1) return 'MISSION 1: NAVIGATE ASTEROID FIELD & DESTROY MOON BASE SUPERWEAPON';
    if (this.currentWave === 2) return 'MISSION 2: HALO MEGASTRUCTURE SIEGE';
    if (this.currentWave === 3) return 'FINAL MISSION: BABYLON 5 CYLINDER CITADEL';
    return `ENDLESS ASSAULT - PHASE ${this.currentWave}`;
  }

  update(dt) {
    if (this.waveState !== 'SPAWNING') return;

    this.spawnTimer += dt;
    const spawnInterval = Math.max(0.35, 0.85 - this.currentWave * 0.06);

    if (this.spawnTimer >= spawnInterval && this.spawnedCount < this.totalToSpawnInWave) {
      this.spawnTimer = 0;
      this.spawnedCount++;

      // Milestone Capital Ship spawning
      if (this.currentWave === 2) {
        if (this.spawnedCount === 20 || this.spawnedCount === 35) {
          this.gameManager.spawnCapitalShip();
        }
      } else if (this.currentWave === 3) {
        if (this.spawnedCount === 15 || this.spawnedCount === 30 || this.spawnedCount === 45) {
          this.gameManager.spawnCapitalShip();
        }
      }

      // Comet roll when spawning an asteroid
      const cometChance = this.currentWave === 1 ? 0.10 : this.currentWave === 2 ? 0.18 : 0.25;

      if (this.currentWave === 1) {
        // Wave 1: Dense asteroid corridor with increasing drone attacks
        const roll = Math.random();
        if (roll < 0.55) {
          if (Math.random() < cometChance) {
            this.gameManager.spawnAsteroid({ isComet: true });
          } else {
            this.gameManager.spawnAsteroid({ sizeCategory: Math.random() > 0.45 ? 'large' : 'medium' });
          }
        } else if (roll < 0.75) {
          // Double asteroid cluster
          this.gameManager.spawnAsteroid({ sizeCategory: 'medium' });
          this.gameManager.spawnAsteroid({ sizeCategory: 'small' });
        } else {
          this.gameManager.spawnDrone();
        }
      } else if (this.currentWave === 2) {
        if (Math.random() > 0.35) {
          this.gameManager.spawnDrone();
        } else {
          if (Math.random() < cometChance) {
            this.gameManager.spawnAsteroid({ isComet: true });
          } else {
            this.gameManager.spawnAsteroid({ sizeCategory: 'medium' });
          }
        }
      } else {
        if (Math.random() > 0.35) {
          this.gameManager.spawnDrone();
        } else {
          if (Math.random() < cometChance) {
            this.gameManager.spawnAsteroid({ isComet: true });
          } else {
            this.gameManager.spawnAsteroid({ sizeCategory: Math.random() > 0.5 ? 'large' : 'medium' });
          }
        }
      }
    }

    // Boss Spawning Per Wave
    if (this.spawnedCount >= this.totalToSpawnInWave && !this.bossSpawned) {
      this.bossSpawned = true;
      this.waveState = 'WAITING_CLEAR';

      if (this.currentWave === 1) {
        // Wave 1: Sector Alpha Moon Base
        this.gameManager.spawnSpaceStation();
      } else if (this.currentWave === 2) {
        // Wave 2: Halo Megastructure Ring Boss
        this.gameManager.spawnHaloBoss();
      } else {
        // Wave 3 / Final Boss: Babylon 5 Industrial Rotating Cylinder Citadel
        this.gameManager.spawnBabylon5Boss();
      }
    }
  }

  checkWaveComplete(activeAsteroidsCount, activeDronesCount, bossActive) {
    if (
      this.totalToSpawnInWave > 0 &&
      this.spawnedCount >= this.totalToSpawnInWave &&
      this.bossSpawned &&
      this.waveState === 'WAITING_CLEAR' &&
      activeAsteroidsCount === 0 &&
      activeDronesCount === 0 &&
      !bossActive
    ) {
      this.waveState = 'COMPLETED';
      setTimeout(() => {
        this.gameManager.onWaveCompleted(this.currentWave);
      }, 1500);
      return true;
    }
    return false;
  }
}
