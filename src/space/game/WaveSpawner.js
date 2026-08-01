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
    this.isBossWave = false;
  }

  startWave(waveNum) {
    this.currentWave = waveNum;
    this.waveState = 'SPAWNING';
    this.spawnTimer = 5.0; // Initial instant spawn
    this.spawnedCount = 0;

    this.isBossWave = (this.currentWave === 5 || this.currentWave === 10);

    if (this.isBossWave) {
      this.totalToSpawnInWave = 1;
      this.gameManager.spawnBoss();
    } else if (this.currentWave === 1) {
      this.totalToSpawnInWave = 14;
    } else if (this.currentWave === 2) {
      this.totalToSpawnInWave = 16;
    } else if (this.currentWave === 3) {
      this.totalToSpawnInWave = 24;
    } else {
      this.totalToSpawnInWave = 24 + (this.currentWave - 3) * 10;
    }

    this.gameManager.announceWave(this.currentWave, this.getWaveSubtitle());
  }

  getWaveSubtitle() {
    if (this.currentWave === 5 || this.currentWave === 10) return 'SECTOR DREADNOUGHT APPROACHING';
    if (this.currentWave === 1) return 'ASTEROID SHOWER DETECTED';
    if (this.currentWave === 2) return 'DRONE INCURSION INBOUND';
    if (this.currentWave === 3) return 'ORBITAL SIEGE - ALL UNITS ENGAGE';
    return `ENDLESS ASSAULT - PHASE ${this.currentWave}`;
  }

  update(dt) {
    if (this.waveState !== 'SPAWNING') return;

    if (this.isBossWave) {
      this.waveState = 'WAITING_CLEAR';
      return;
    }

    this.spawnTimer += dt;
    const spawnInterval = Math.max(0.5, 1.2 - this.currentWave * 0.15);

    if (this.spawnTimer >= spawnInterval && this.spawnedCount < this.totalToSpawnInWave) {
      this.spawnTimer = 0;
      this.spawnedCount++;

      if (this.currentWave === 1) {
        this.gameManager.spawnAsteroid({ sizeCategory: Math.random() > 0.4 ? 'large' : 'medium' });
      } else if (this.currentWave === 2) {
        if (Math.random() > 0.35) {
          this.gameManager.spawnDrone();
        } else {
          this.gameManager.spawnAsteroid({ sizeCategory: 'medium' });
        }
      } else {
        if (Math.random() > 0.4) {
          this.gameManager.spawnDrone();
        } else {
          this.gameManager.spawnAsteroid({ sizeCategory: Math.random() > 0.5 ? 'large' : 'medium' });
        }
      }
    }

    if (this.spawnedCount >= this.totalToSpawnInWave) {
      this.waveState = 'WAITING_CLEAR';
    }
  }

  checkWaveComplete(activeAsteroidsCount, activeDronesCount, bossActive) {
    if (
      this.totalToSpawnInWave > 0 &&
      this.spawnedCount >= this.totalToSpawnInWave &&
      this.waveState === 'WAITING_CLEAR' &&
      activeAsteroidsCount === 0 &&
      activeDronesCount === 0 &&
      !bossActive
    ) {
      this.waveState = 'COMPLETED';
      setTimeout(() => {
        this.gameManager.onWaveCompleted(this.currentWave);
      }, 1800);
      return true;
    }
    return false;
  }
}
