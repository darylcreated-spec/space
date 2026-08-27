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
    this.maxConcurrentEnemies = 9; // Mobile safeguard: limits on-screen non-boss entities to prevent CPU/GPU throttling
  }

  startWave(waveNum) {
    this.currentWave = waveNum;
    this.waveState = 'SPAWNING';
    this.spawnTimer = 4.0; // Initial quick spawn
    this.spawnedCount = 0;
    this.bossSpawned = false;

    // Target ~2.0 to 3.5 minutes per stage for short-session mobile flow
    if (this.currentWave === 1) {
      this.totalToSpawnInWave = 36; // Stage 1: Scouts -> Capital Cruiser -> Gorgon Carrier & Drones -> Titan Colossus
    } else if (this.currentWave === 2) {
      this.totalToSpawnInWave = 32; // Stage 2: Drone Swarms -> Dual Cruisers -> Supercarrier -> Halo Megastructure
    } else if (this.currentWave === 3) {
      this.totalToSpawnInWave = 36; // Stage 3: Asteroid Storm -> Devastator Battleship -> Cruiser Escorts -> Moon Base
    } else if (this.currentWave === 4) {
      this.totalToSpawnInWave = 40; // Stage 4: Heavy Strike Fleet -> Battleship + Supercarrier Dual Capital -> Sanctuary Cylinder
    } else if (this.currentWave === 5) {
      this.totalToSpawnInWave = 50; // Stage 5: Grand Armada Escalation (Cruisers + Battleships + Supercarrier) -> Leviathan Mothership
    } else {
      this.totalToSpawnInWave = 40 + (this.currentWave - 5) * 8;
    }

    this.gameManager.announceWave(this.currentWave, this.getWaveSubtitle());
  }

  getWaveSubtitle() {
    if (this.currentWave === 1) return 'STAGE 1: IRON MANTLE // CARRIER INCURSION & TITAN ASTEROID COLOSSUS';
    if (this.currentWave === 2) return 'STAGE 2: RING OF LIGHT // HALO MEGASTRUCTURE & FLEET CARRIER';
    if (this.currentWave === 3) return 'STAGE 3: SELENE SHIELD // LUNAR CITADEL & HEAVY BATTLESHIP';
    if (this.currentWave === 4) return 'STAGE 4: SANCTUARY STATION // O\'NEILL CYLINDER & DUAL CAPITAL FLEET';
    if (this.currentWave === 5) return 'STAGE 5: EXTINCTION PROTOCOL // GRAND ARMADA ESCALATION & COMMAND MOTHERSHIP';
    return `ENDLESS SECTOR DEFENSE - PHASE ${this.currentWave}`;
  }

  update(dt) {
    if (this.waveState !== 'SPAWNING') return;

    // ── 📱 Mobile Performance Safeguard: Concurrency Throttle ──
    // Count active non-boss combatants. If too many are alive, hold spawns to maintain rock-solid 60fps
    const activeAsteroids = this.gameManager.asteroids ? this.gameManager.asteroids.length : 0;
    const activeDrones = this.gameManager.drones ? this.gameManager.drones.filter(d => !d.isDead).length : 0;
    const activeStealth = this.gameManager.stealthFighters ? this.gameManager.stealthFighters.filter(s => !s.isDead).length : 0;
    const activeCruisers = this.gameManager.capitalShips ? this.gameManager.capitalShips.filter(c => !c.isDead).length : 0;
    const activeBattleships = this.gameManager.heavyBattleships ? this.gameManager.heavyBattleships.filter(b => !b.isDead).length : 0;
    const activeCarrier = this.gameManager.carrierBoss && !this.gameManager.carrierBoss.isDead;

    const totalActiveCombatants = activeAsteroids + activeDrones + activeStealth + (activeCruisers * 2) + (activeBattleships * 3) + (activeCarrier ? 4 : 0);

    if (totalActiveCombatants >= this.maxConcurrentEnemies && this.spawnedCount < this.totalToSpawnInWave) {
      // Screen is occupied — pause spawner until player destroys enemies
      return;
    }

    this.spawnTimer += dt;
    // Dynamic spawn pacing: fast initial waves that relax slightly during heavy capital encounters
    const spawnInterval = activeCarrier || activeBattleships > 0 ? 1.6 : Math.max(0.65, 1.2 - this.currentWave * 0.08);

    if (this.spawnTimer >= spawnInterval && this.spawnedCount < this.totalToSpawnInWave) {
      this.spawnTimer = 0;
      this.spawnedCount++;

      // ── 🚀 Staged Fleet Escalations Utilizing ALL Non-Boss Warships ──
      if (this.currentWave === 1) {
        // Stage 1 Progression:
        if (this.spawnedCount === 4) {
          this.gameManager.spawnStealthFighter();
        } else if (this.spawnedCount === 10) {
          // Vanguard Capital Cruiser Warps In!
          this.gameManager.spawnCapitalShip();
          this.gameManager.spawnDrone(null, true);
        } else if (this.spawnedCount === 18) {
          // Gorgon Spacecraft Carrier drops out of hyperspace!
          this.gameManager.spawnCarrierBoss();
        }
      } else if (this.currentWave === 2) {
        // Stage 2 Progression:
        if (this.spawnedCount === 4) {
          this.gameManager.spawnDrone(null, true);
          this.gameManager.spawnDrone(null, true);
        } else if (this.spawnedCount === 10) {
          this.gameManager.spawnCapitalShip();
        } else if (this.spawnedCount === 18) {
          this.gameManager.spawnCarrierBoss();
        }
      } else if (this.currentWave === 3) {
        // Stage 3 Progression:
        if (this.spawnedCount === 4) {
          this.gameManager.spawnStealthFighter();
        } else if (this.spawnedCount === 12) {
          // Goliath Devastator Heavy Battleship siege!
          this.gameManager.spawnHeavyBattleship();
        } else if (this.spawnedCount === 22) {
          this.gameManager.spawnCapitalShip();
        }
      } else if (this.currentWave === 4) {
        // Stage 4 Dual Capital Progression:
        if (this.spawnedCount === 6) {
          this.gameManager.spawnCapitalShip();
        } else if (this.spawnedCount === 16) {
          this.gameManager.spawnHeavyBattleship();
        } else if (this.spawnedCount === 26) {
          this.gameManager.spawnCarrierBoss();
        }
      } else if (this.currentWave === 5) {
        // Stage 5 Grand Armada Gauntlet:
        if (this.spawnedCount === 8) {
          this.gameManager.spawnHeavyBattleship();
        } else if (this.spawnedCount === 20) {
          this.gameManager.spawnCarrierBoss();
        } else if (this.spawnedCount === 34) {
          this.gameManager.spawnBoss(); // Dreadnought
          this.gameManager.spawnCapitalShip();
        }
      }

      // ── Standard Combat Patrol Spawning ──
      const carrierActive = this.gameManager.carrierBoss && !this.gameManager.carrierBoss.isDead;
      const cometChance = this.currentWave === 1 ? 0.15 : 0.25;

      const roll = Math.random();
      if (carrierActive && roll < 0.45) {
        // Carrier deploys active drone interceptors!
        this.gameManager.spawnDrone(null, true);
      } else if (roll < 0.68) {
        this.gameManager.spawnStealthFighter();
      } else {
        if (Math.random() < cometChance) {
          this.gameManager.spawnAsteroid({ isComet: true });
        } else {
          this.gameManager.spawnAsteroid({ sizeCategory: Math.random() > 0.45 ? 'large' : 'medium' });
        }
      }
    }

    // ── Stage Apex Boss Spawning ──
    if (this.spawnedCount >= this.totalToSpawnInWave && !this.bossSpawned) {
      this.bossSpawned = true;
      this.waveState = 'WAITING_CLEAR';

      if (this.currentWave === 1) {
        // Stage 1 Apex Boss: ☄️ Titan Asteroid Colossus
        this.gameManager.spawnTitanBoss();
      } else if (this.currentWave === 2) {
        // Stage 2 Apex Boss: 🌌 The Halo Megastructure Defense Ring
        this.gameManager.spawnHaloBoss();
      } else if (this.currentWave === 3) {
        // Stage 3 Apex Boss: 🌕 Sector Alpha Moon Base Citadel
        this.gameManager.spawnSpaceStation();
      } else if (this.currentWave === 4) {
        // Stage 4 Apex Boss: 🪐 Sanctuary-9 Industrial Rotating Cylinder Citadel
        this.gameManager.spawnSanctuaryCylinderBoss();
      } else {
        // Stage 5 Final Apex Boss: 👑 The Vorn Hive Command Mothership
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
