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
      this.totalToSpawnInWave = 75; // Extended Wave 1: deep asteroid corridor + carrier + moon base
    } else if (this.currentWave === 2) {
      this.totalToSpawnInWave = 50; // Wave 2: stealth fighter incursions + halo ring
    } else if (this.currentWave === 3) {
      this.totalToSpawnInWave = 60; // Wave 3: heavy battleship battlefleet + babylon 5
    } else if (this.currentWave === 4) {
      this.totalToSpawnInWave = 70; // Wave 4: Apex command siege + Leviathan Mothership
    } else {
      this.totalToSpawnInWave = 65 + (this.currentWave - 4) * 10;
    }

    this.gameManager.announceWave(this.currentWave, this.getWaveSubtitle());
  }

  getWaveSubtitle() {
    if (this.currentWave === 1) return 'MISSION 1: ASTEROID CORRIDOR & MOON BASE SUPERWEAPON';
    if (this.currentWave === 2) return 'MISSION 2: SHADOW-WRAITH STEALTH INCURSION & HALO MEGASTRUCTURE';
    if (this.currentWave === 3) return 'MISSION 3: GOLIATH BATTLEFLEET SIEGE & BABYLON 5 CITADEL';
    if (this.currentWave === 4) return 'FINAL APEX MISSION: LEVIATHAN EXTREME COMMAND MOTHERSHIP';
    return `ENDLESS SECTOR DEFENSE - PHASE ${this.currentWave}`;
  }

  update(dt) {
    if (this.waveState !== 'SPAWNING') return;

    this.spawnTimer += dt;
    const spawnInterval = Math.max(0.35, 0.85 - this.currentWave * 0.05);

    if (this.spawnTimer >= spawnInterval && this.spawnedCount < this.totalToSpawnInWave) {
      this.spawnTimer = 0;
      this.spawnedCount++;

      // Milestone Capital / Heavy Battleship spawning
      if (this.currentWave === 1) {
        if (this.spawnedCount === 35) {
          this.gameManager.spawnCarrierBoss();
        }
      } else if (this.currentWave === 2) {
        // Wave 2: Shadow-Wraith Stealth Fighter wolfpacks
        if (this.spawnedCount === 15 || this.spawnedCount === 30 || this.spawnedCount === 42) {
          this.gameManager.spawnStealthFighter();
        }
      } else if (this.currentWave === 3) {
        // Wave 3: Goliath Heavy Battleship arrival
        if (this.spawnedCount === 25) {
          this.gameManager.spawnHeavyBattleship();
        } else if (this.spawnedCount === 45) {
          this.gameManager.spawnCapitalShip();
        }
      } else if (this.currentWave === 4) {
        // Wave 4: Combined arms elite assault
        if (this.spawnedCount === 20) {
          this.gameManager.spawnHeavyBattleship();
        } else if (this.spawnedCount === 35 || this.spawnedCount === 50) {
          this.gameManager.spawnStealthFighter();
        }
      }

      // Comet roll when spawning an asteroid
      const cometChance = this.currentWave === 1 ? 0.10 : this.currentWave === 2 ? 0.18 : 0.25;

      if (this.currentWave === 1) {
        const roll = Math.random();
        if (roll < 0.55) {
          if (Math.random() < cometChance) {
            this.gameManager.spawnAsteroid({ isComet: true });
          } else {
            this.gameManager.spawnAsteroid({ sizeCategory: Math.random() > 0.45 ? 'large' : 'medium' });
          }
        } else if (roll < 0.75) {
          this.gameManager.spawnAsteroid({ sizeCategory: 'medium' });
          this.gameManager.spawnAsteroid({ sizeCategory: 'small' });
        } else {
          this.gameManager.spawnDrone();
        }
      } else if (this.currentWave === 2) {
        const roll = Math.random();
        if (roll < 0.35) {
          this.gameManager.spawnStealthFighter();
        } else if (roll < 0.70) {
          this.gameManager.spawnDrone();
        } else {
          this.gameManager.spawnAsteroid({ sizeCategory: 'medium' });
        }
      } else if (this.currentWave === 3) {
        const roll = Math.random();
        if (roll < 0.45) {
          this.gameManager.spawnDrone();
        } else if (roll < 0.70) {
          this.gameManager.spawnStealthFighter();
        } else {
          this.gameManager.spawnAsteroid({ sizeCategory: 'large' });
        }
      } else {
        // Wave 4+ Elite mix
        const roll = Math.random();
        if (roll < 0.40) {
          this.gameManager.spawnDrone();
        } else if (roll < 0.70) {
          this.gameManager.spawnStealthFighter();
        } else {
          this.gameManager.spawnAsteroid({ sizeCategory: Math.random() > 0.5 ? 'large' : 'medium' });
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
      } else if (this.currentWave === 3) {
        // Wave 3: Babylon 5 Cylinder Citadel Boss
        this.gameManager.spawnBabylon5Boss();
      } else {
        // Wave 4 / Final Apex: Leviathan Extreme Command Mothership
        this.gameManager.spawnCommandMothership();
      }
    }
  }

  checkWaveComplete(activeAsteroidsCount, activeDronesCount, bossActive) {
    const stealthActive = this.gameManager.stealthFighters ? this.gameManager.stealthFighters.some(s => !s.isDead) : false;
    const battleshipActive = this.gameManager.heavyBattleships ? this.gameManager.heavyBattleships.some(b => !b.isDead) : false;

    if (
      this.totalToSpawnInWave > 0 &&
      this.spawnedCount >= this.totalToSpawnInWave &&
      this.bossSpawned &&
      this.waveState === 'WAITING_CLEAR' &&
      activeAsteroidsCount === 0 &&
      activeDronesCount === 0 &&
      !stealthActive &&
      !battleshipActive &&
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
