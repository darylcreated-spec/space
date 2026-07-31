export class WaveSpawner {
  constructor(gameManager) {
    this.gameManager = gameManager;

    this.currentWave = 1;
    this.waveState = 'INACTIVE'; // 'INACTIVE', 'SPAWNING', 'WAITING_CLEAR', 'COMPLETED'
    
    this.spawnTimer = 0;
    this.totalToSpawnInWave = 0;
    this.spawnedCount = 0;
  }

  startWave(waveNum) {
    this.currentWave = waveNum;
    this.waveState = 'SPAWNING';
    // Trigger immediate spawn on start!
    this.spawnTimer = 5.0; 
    this.spawnedCount = 0;

    if (this.currentWave === 1) {
      this.totalToSpawnInWave = 14; // Asteroids
    } else if (this.currentWave === 2) {
      this.totalToSpawnInWave = 16; // Drones + Asteroids
    } else if (this.currentWave === 3) {
      this.totalToSpawnInWave = 24; // Heavy siege
    } else {
      // Endless Mode
      this.totalToSpawnInWave = 24 + (this.currentWave - 3) * 10;
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

    const spawnInterval = Math.max(0.5, 1.2 - this.currentWave * 0.15);

    if (this.spawnTimer >= spawnInterval && this.spawnedCount < this.totalToSpawnInWave) {
      this.spawnTimer = 0;
      this.spawnedCount++;

      // Spawning decisions based on wave number
      if (this.currentWave === 1) {
        this.gameManager.spawnAsteroid({ sizeCategory: Math.random() > 0.4 ? 'large' : 'medium' });
      } else if (this.currentWave === 2) {
        if (Math.random() > 0.35) {
          this.gameManager.spawnDrone();
        } else {
          this.gameManager.spawnAsteroid({ sizeCategory: 'medium' });
        }
      } else {
        // Wave 3 & Endless Mode: Mix of drones and large asteroids
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

  checkWaveComplete(activeAsteroidsCount, activeDronesCount) {
    if (this.waveState === 'WAITING_CLEAR' && activeAsteroidsCount === 0 && activeDronesCount === 0) {
      this.waveState = 'COMPLETED';
      setTimeout(() => {
        this.startWave(this.currentWave + 1);
      }, 2500);
      return true;
    }
    return false;
  }
}
