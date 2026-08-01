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
      this.totalToSpawnInWave = 16;
    } else if (this.currentWave === 2) {
      this.totalToSpawnInWave = 22;
    } else if (this.currentWave === 3) {
      this.totalToSpawnInWave = 28;
    } else {
      this.totalToSpawnInWave = 28 + (this.currentWave - 3) * 8;
    }

    this.gameManager.announceWave(this.currentWave, this.getWaveSubtitle());
  }

  getWaveSubtitle() {
    if (this.currentWave === 1) return 'ASTEROID SHOWER DETECTED';
    if (this.currentWave === 2) return 'DRONE INCURSION INBOUND';
    if (this.currentWave === 3) return 'ORBITAL SIEGE - ALL UNITS ENGAGE';
    return `ENDLESS ASSAULT - PHASE ${this.currentWave}`;
  }

  update(dt) {
    if (this.waveState !== 'SPAWNING') return;

    this.spawnTimer += dt;
    const spawnInterval = Math.max(0.4, 0.9 - this.currentWave * 0.08);

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
        if (Math.random() > 0.35) {
          this.gameManager.spawnDrone();
        } else {
          this.gameManager.spawnAsteroid({ sizeCategory: Math.random() > 0.5 ? 'large' : 'medium' });
        }
      }
    }

    // When wave threats finish spawning, spawn the Wave Boss to culminate the wave!
    if (this.spawnedCount >= this.totalToSpawnInWave && !this.bossSpawned) {
      this.bossSpawned = true;
      this.waveState = 'WAITING_CLEAR';

      if (this.currentWave === 1 || this.currentWave === 3) {
        this.gameManager.spawnTitanBoss();
      } else {
        this.gameManager.spawnBoss();
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
