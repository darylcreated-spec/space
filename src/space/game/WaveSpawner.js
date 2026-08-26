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
      this.totalToSpawnInWave = 32; // Stage 1: Extended Opening -> Mid: Spacecraft Carrier & Drone Swarms -> Boss: Titan Asteroid Colossus
    } else if (this.currentWave === 2) {
      this.totalToSpawnInWave = 24; // Stage 2: Halo Megastructure -> Mid: Supercarrier & Drones -> Boss: Halo Ring
    } else if (this.currentWave === 3) {
      this.totalToSpawnInWave = 28; // Stage 3: Selene Moon Base -> Mid: Heavy Battleship -> Boss: Moon Base
    } else if (this.currentWave === 4) {
      this.totalToSpawnInWave = 34; // Stage 4: Sanctuary-9 Cylinder -> Phase 1: Battleship -> Phase 2: Supercarrier -> Boss: Sanctuary Cylinder
    } else if (this.currentWave === 5) {
      this.totalToSpawnInWave = 46; // Stage 5: Grand Armada -> Phase 1: Battleship -> Phase 2: Supercarrier -> Phase 3: Dreadnought -> Boss: Mothership
    } else {
      this.totalToSpawnInWave = 36 + (this.currentWave - 5) * 8;
    }

    this.gameManager.announceWave(this.currentWave, this.getWaveSubtitle());
  }

  getWaveSubtitle() {
    if (this.currentWave === 1) return 'STAGE 1: IRON MANTLE // CARRIER ESCALATION & TITAN ASTEROID COLOSSUS';
    if (this.currentWave === 2) return 'STAGE 2: RING OF LIGHT // HALO MEGASTRUCTURE // MID: SUPERCARRIER';
    if (this.currentWave === 3) return 'STAGE 3: SELENE SHIELD // LUNAR CITADEL MOON BASE // MID: BATTLESHIP';
    if (this.currentWave === 4) return 'STAGE 4: SANCTUARY STATION // O\'NEILL CYLINDER CITADEL // MID: DUAL CAPITAL';
    if (this.currentWave === 5) return 'STAGE 5: EXTINCTION PROTOCOL // GRAND ARMADA ESCALATION // BOSS: HIVE MOTHERSHIP';
    return `ENDLESS SECTOR DEFENSE - PHASE ${this.currentWave}`;
  }

  update(dt) {
    if (this.waveState !== 'SPAWNING') return;

    this.spawnTimer += dt;
    const spawnInterval = Math.max(0.30, 0.75 - this.currentWave * 0.05);

    if (this.spawnTimer >= spawnInterval && this.spawnedCount < this.totalToSpawnInWave) {
      this.spawnTimer = 0;
      this.spawnedCount++;

      // ── Staged Capital Escalations (Spread arrivals for buttery-smooth 60fps gameplay) ──
      if (this.currentWave === 1) {
        // Stage 1 Opening: Wave of Asteroids and Escorts -> Count 8: Spacecraft Carrier Warps In!
        if (this.spawnedCount === 4) {
          this.gameManager.spawnStealthFighter();
        } else if (this.spawnedCount === 8) {
          this.gameManager.spawnCarrierBoss();
        }
      } else if (this.currentWave === 2) {
        // Stage 2 Midpoint: Gorgon Supercarrier (with drone launch wings)
        if (this.spawnedCount === 8) {
          this.gameManager.spawnCarrierBoss();
        }
      } else if (this.currentWave === 3) {
        // Stage 3 Midpoint: Devastator Heavy Battleship siege
        if (this.spawnedCount === 10) {
          this.gameManager.spawnHeavyBattleship();
        }
      } else if (this.currentWave === 4) {
        // Stage 4 Phased Escalation: Battleship first, then Supercarrier
        if (this.spawnedCount === 8) {
          this.gameManager.spawnHeavyBattleship();
        } else if (this.spawnedCount === 18) {
          this.gameManager.spawnCarrierBoss();
        }
      } else if (this.currentWave === 5) {
        // Stage 5 Phased Armada: Spread arrivals smoothly before Mothership
        if (this.spawnedCount === 8) {
          this.gameManager.spawnHeavyBattleship();
        } else if (this.spawnedCount === 20) {
          this.gameManager.spawnCarrierBoss();
        } else if (this.spawnedCount === 32) {
          this.gameManager.spawnBoss();
          this.gameManager.spawnCapitalShip();
        }
      }

      // ── Combat Patrol Spawning Rules ──
      const carrierActive = this.gameManager.carrierBoss && !this.gameManager.carrierBoss.isDead;
      const cometChance = this.currentWave === 1 ? 0.12 : 0.22;

      const roll = Math.random();
      // When Carrier is active, spawn launched drone interceptor squadrons!
      if (carrierActive && roll < 0.45) {
        this.gameManager.spawnDrone();
      } else if (roll < 0.70) {
        this.gameManager.spawnStealthFighter();
      } else {
        if (Math.random() < cometChance) {
          this.gameManager.spawnAsteroid({ isComet: true });
        } else {
          this.gameManager.spawnAsteroid({ sizeCategory: Math.random() > 0.45 ? 'large' : 'medium' });
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
    const cruiserActive = this.gameManager.capitalShips ? this.gameManager.capitalShips.some(c => !c.isDead) : false;
    const carrierActive = this.gameManager.carrierBoss && !this.gameManager.carrierBoss.isDead;

    if (
      this.totalToSpawnInWave > 0 &&
      this.spawnedCount >= this.totalToSpawnInWave &&
      this.bossSpawned &&
      this.waveState === 'WAITING_CLEAR' &&
      activeAsteroidsCount === 0 &&
      activeDronesCount === 0 &&
      !stealthActive &&
      !battleshipActive &&
      !cruiserActive &&
      !carrierActive &&
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
