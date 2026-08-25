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
      this.totalToSpawnInWave = 45; // Stage 1: Asteroid Perimeter Incursion -> Boss: Titan Asteroid Colossus
    } else if (this.currentWave === 2) {
      this.totalToSpawnInWave = 50; // Stage 2: Halo Megastructure -> Mid: Supercarrier & Drones -> Boss: Halo Ring
    } else if (this.currentWave === 3) {
      this.totalToSpawnInWave = 55; // Stage 3: Selene Moon Base -> Mid: Heavy Battleship -> Boss: Moon Base
    } else if (this.currentWave === 4) {
      this.totalToSpawnInWave = 65; // Stage 4: Sanctuary-9 Cylinder -> Mid: Dual Battleship + Carrier -> Boss: Sanctuary-9 Cylinder
    } else if (this.currentWave === 5) {
      this.totalToSpawnInWave = 75; // Stage 5: Grand Armada -> Mid: Tri-Threat (Battleship + Carrier + Dreadnought) -> Boss: Mothership
    } else {
      this.totalToSpawnInWave = 60 + (this.currentWave - 5) * 10;
    }

    this.gameManager.announceWave(this.currentWave, this.getWaveSubtitle());
  }

  getWaveSubtitle() {
    if (this.currentWave === 1) return 'STAGE 1: IRON MANTLE // ASTEROID BELT // BOSS: TITAN ASTEROID COLOSSUS';
    if (this.currentWave === 2) return 'STAGE 2: RING OF LIGHT // HALO MEGASTRUCTURE // MID: SUPERCARRIER';
    if (this.currentWave === 3) return 'STAGE 3: SELENE SHIELD // LUNAR CITADEL MOON BASE // MID: BATTLESHIP';
    if (this.currentWave === 4) return 'STAGE 4: SANCTUARY STATION // O\'NEILL CYLINDER CITADEL // MID: DUAL CAPITAL';
    if (this.currentWave === 5) return 'STAGE 5: EXTINCTION PROTOCOL // GRAND ARMADA // BOSS: HIVE MOTHERSHIP';
    return `ENDLESS SECTOR DEFENSE - PHASE ${this.currentWave}`;
  }

  update(dt) {
    if (this.waveState !== 'SPAWNING') return;

    this.spawnTimer += dt;
    const spawnInterval = Math.max(0.35, 0.85 - this.currentWave * 0.05);

    if (this.spawnTimer >= spawnInterval && this.spawnedCount < this.totalToSpawnInWave) {
      this.spawnTimer = 0;
      this.spawnedCount++;

      // ── Mid-Stage Capital Escalations ──
      if (this.currentWave === 1) {
        // Stage 1 Midpoint: Stealth wolfpack ambush
        if (this.spawnedCount === 22) {
          this.gameManager.spawnStealthFighter();
          this.gameManager.spawnStealthFighter();
        }
      } else if (this.currentWave === 2) {
        // Stage 2: Friendly Valiant Cruiser escort + Midpoint Supercarrier
        if (this.spawnedCount === 5) {
          this.gameManager.spawnCapitalShip();
        } else if (this.spawnedCount === 22) {
          this.gameManager.spawnCarrierBoss();
        }
      } else if (this.currentWave === 3) {
        // Stage 3 Midpoint: Devastator Heavy Battleship siege
        if (this.spawnedCount === 22) {
          this.gameManager.spawnHeavyBattleship();
        }
      } else if (this.currentWave === 4) {
        // Stage 4: Friendly Valiant Cruiser escort + Midpoint DUAL CAPITAL ASSAULT (Battleship + Supercarrier)
        if (this.spawnedCount === 5) {
          this.gameManager.spawnCapitalShip();
        } else if (this.spawnedCount === 24) {
          this.gameManager.spawnHeavyBattleship();
          setTimeout(() => {
            if (this.gameManager.state === 'PLAYING') this.gameManager.spawnCarrierBoss();
          }, 3000);
        }
      } else if (this.currentWave === 5) {
        // Stage 5 Pre-Boss: TRI-THREAT GRAND ARMADA (Battleship + Supercarrier + Dreadnought)
        if (this.spawnedCount === 5) {
          this.gameManager.spawnCapitalShip();
        } else if (this.spawnedCount === 25) {
          this.gameManager.spawnHeavyBattleship();
          this.gameManager.spawnCarrierBoss();
          setTimeout(() => {
            if (this.gameManager.state === 'PLAYING') this.gameManager.spawnBoss();
          }, 4000);
        }
      }

      // ── Standard Combat Patrol Spawning Rules ──
      // Drones only spawn if Supercarrier is active on the field!
      const carrierActive = this.gameManager.carrierBoss && !this.gameManager.carrierBoss.isDead;
      const cometChance = this.currentWave === 1 ? 0.12 : 0.22;

      if (this.currentWave === 1) {
        // Stage 1: Asteroids & Shadow-Wraith Stealth Fighters (NO DRONES without carrier)
        const roll = Math.random();
        if (roll < 0.65) {
          if (Math.random() < cometChance) {
            this.gameManager.spawnAsteroid({ isComet: true });
          } else {
            this.gameManager.spawnAsteroid({ sizeCategory: Math.random() > 0.45 ? 'large' : 'medium' });
          }
        } else {
          this.gameManager.spawnStealthFighter();
        }
      } else {
        // Stages 2-5: Stealth Fighters, Asteroids, and Carrier Drones (when Carrier is close)
        const roll = Math.random();
        if (carrierActive && roll < 0.45) {
          this.gameManager.spawnDrone();
        } else if (roll < 0.70) {
          this.gameManager.spawnStealthFighter();
        } else {
          this.gameManager.spawnAsteroid({ sizeCategory: Math.random() > 0.5 ? 'large' : 'medium' });
        }
      }
    }

    // ── Boss Spawning Per Stage ──
    if (this.spawnedCount >= this.totalToSpawnInWave && !this.bossSpawned) {
      this.bossSpawned = true;
      this.waveState = 'WAITING_CLEAR';

      if (this.currentWave === 1) {
        // Stage 1 Boss: ☄️ Titan Asteroid Colossus
        this.gameManager.spawnTitanBoss();
      } else if (this.currentWave === 2) {
        // Stage 2 Boss: 🌌 The Halo Megastructure Defense Ring
        this.gameManager.spawnHaloBoss();
      } else if (this.currentWave === 3) {
        // Stage 3 Boss: 🌕 Sector Alpha Moon Base Citadel
        this.gameManager.spawnSpaceStation();
      } else if (this.currentWave === 4) {
        // Stage 4 Boss: 🪐 Sanctuary-9 Industrial Rotating Cylinder Citadel
        this.gameManager.spawnSanctuaryCylinderBoss();
      } else {
        // Stage 5 / Final Apex: 👑 The Vorn Hive Command Mothership
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
