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
    this.triggeredComms = new Set();
  }

  startWave(waveNum) {
    this.currentWave = waveNum;
    this.waveState = 'SPAWNING';
    this.spawnTimer = 4.0; // Initial quick spawn
    this.spawnedCount = 0;
    this.bossSpawned = false;
    this.triggeredComms.clear();

    // Target ~2.0 to 3.5 minutes per stage for short-session mobile flow
    if (this.currentWave === 1) {
      this.totalToSpawnInWave = 36; // Stage 1: Scouts -> Rogue Stealth Infiltrator -> Cruiser Extraction -> Titan Colossus
    } else if (this.currentWave === 2) {
      this.totalToSpawnInWave = 32; // Stage 2: Phase Interceptors -> ECM Jammer -> Halo Megastructure Staging Post
    } else if (this.currentWave === 3) {
      this.totalToSpawnInWave = 36; // Stage 3: Asteroid Storm -> Devastator Battleship -> JWST Telescope Defense -> Moon Base
    } else if (this.currentWave === 4) {
      this.totalToSpawnInWave = 40; // Stage 4: Industrial Convoys -> Dual Capital Fleet -> Sanctuary-9 Cylinder
    } else if (this.currentWave === 5) {
      this.totalToSpawnInWave = 50; // Stage 5: Grand Armada Escalation -> The Leviathan Command Mothership
    } else if (this.currentWave === 6) {
      this.totalToSpawnInWave = 54; // Stage 6: Dyson Mega-Forge -> Solar Siphon Colossus
    } else if (this.currentWave === 7) {
      this.totalToSpawnInWave = 52; // Stage 7: Chromosphere Probe Defense -> Ignis Titan Solar Devourer
    } else if (this.currentWave === 8) {
      this.totalToSpawnInWave = 56; // Stage 8: Event Horizon Singularity -> Oblivion Harbinger
    } else if (this.currentWave === 9) {
      this.totalToSpawnInWave = 60; // Stage 9: Boreas Cryo Abyss -> Glacial Archon Dual Dreadnoughts
    } else if (this.currentWave === 10) {
      this.totalToSpawnInWave = 62; // Stage 10: Null-Sector Blackout -> Chrono-Phantom Ghost Carrier
    } else if (this.currentWave === 11) {
      this.totalToSpawnInWave = 66; // Stage 11: Dyson Nexus Trench Run -> Arch-Constructor Omega Nexus
    } else if (this.currentWave === 12) {
      this.totalToSpawnInWave = 70; // Stage 12: Hyper-Gateway Finale -> Sovereign Apex & The First Intelligence
    } else {
      this.totalToSpawnInWave = 50 + (this.currentWave - 12) * 10;
    }

    this.gameManager.announceWave(this.currentWave, this.getWaveSubtitle());
    if (this.gameManager.spaceScene) {
      this.gameManager.spaceScene.setStageEnvironment(this.currentWave);
    }
    if (this.gameManager.spaceAudio) {
      this.gameManager.spaceAudio.startSoundtrack();
      this.gameManager.spaceAudio.setSoundtrackTheme('COMBAT');
    }

    // Configure Dynamic Tactical HUD Objective
    this.setWaveTacticalObjective(this.currentWave);

    // Deploy Allied Deep Space Telescope Defense Objective at Wave 3 & 7
    if (this.currentWave === 3 || this.currentWave === 7) {
      this.gameManager.spawnTelescopeObjective();
    }

    // Seed initial Segma Asteroid Corridor field and immediate combatants on Wave 1
    if (this.currentWave === 1) {
      for (let i = 0; i < 8; i++) {
        const sideX = (i % 2 === 0 ? 1 : -1) * (10 + Math.random() * 28);
        const spawnZ = -45 - i * 16;
        const sizeCat = (i % 3 === 0) ? 'large' : ((i % 2 === 0) ? 'medium' : 'small');
        this.gameManager.spawnAsteroid({
          x: sideX,
          y: (Math.random() - 0.5) * 14,
          z: spawnZ,
          sizeCategory: sizeCat
        });
      }
      this.gameManager.spawnAsteroid({ isComet: true });

      // Deploy 2 forward combat scout drones immediately so action starts without delay
      this.gameManager.spawnDrone(null, true);
      this.gameManager.spawnDrone(null, true);
    }

    // Spawn an in-flight derelict cargo salvage pod
    this.gameManager.spawnCargoPod();

    // Trigger Campaign Story Radio Intro Transmission
    setTimeout(() => {
      this.triggerStoryComms(this.currentWave, 'intro');
    }, 1600);
  }

  getWaveSubtitle() {
    if (this.currentWave === 1) return 'SECTOR 1: SEGMA ASTEROID CORRIDOR // THE RUNAWAY CIPHER';
    if (this.currentWave === 2) return 'SECTOR 2: CARINA NEBULA // CITADEL OF THE COSMIC CLIFFS';
    if (this.currentWave === 3) return 'SECTOR 3: PILLARS OF CREATION // THE EYE OF DEEP SPACE (JWST DEFENSE)';
    if (this.currentWave === 4) return 'SECTOR 4: PHANTOM GALAXY // GRAND DESIGN CONVOY INTERCEPT';
    if (this.currentWave === 5) return 'SECTOR 5: SOUTHERN RING // GRAVE OF THE BINARY STAR (MOTHERSHIP)';
    if (this.currentWave === 6) return 'SECTOR 6: HELIOS MEGA-FORGE // CORONAL CRUCIBLE & DYSON SIPHON';
    if (this.currentWave === 7) return 'SECTOR 7: SOLAR CHROMOSPHERE // THE IGNIS TITAN DEVOURER';
    if (this.currentWave === 8) return 'SECTOR 8: EVENT HORIZON // THE SINGULARITY CRADLE & HARBINGER';
    if (this.currentWave === 9) return 'SECTOR 9: CRYO ABYSS // THE BOREAS GLACIAL BASTION';
    if (this.currentWave === 10) return 'SECTOR 10: NULL SECTOR // THE CHRONO-PHANTOM GHOST FLEET';
    if (this.currentWave === 11) return 'SECTOR 11: DYSON NEXUS // MEGASTRUCTURE TRENCH ASSAULT';
    if (this.currentWave === 12) return 'SECTOR 12: HYPER-GATEWAY // SOVEREIGN APEX GRAND FINALE';
    return `ENDLESS SECTOR DEFENSE - PHASE ${this.currentWave}`;
  }

  setWaveTacticalObjective(waveNum) {
    if (!this.gameManager.spaceHUD) return;
    const hud = this.gameManager.spaceHUD;
    if (waveNum === 3) {
      hud.updateObjectiveBar(1.0, 'DEFEND OBJECTIVE: JWST SCIENCE ARRAY', '100% ARRAY INTEGRITY');
    } else if (waveNum === 7) {
      hud.updateObjectiveBar(1.0, 'DEFEND OBJECTIVE: CORONAL SENSOR PROBE', '100% SENSOR INTEGRITY');
    } else {
      hud.hideObjectiveBar();
    }
  }

  triggerStoryComms(wave, beat) {
    const key = `${wave}_${beat}`;
    if (this.triggeredComms.has(key)) return;
    this.triggeredComms.add(key);

    const hud = this.gameManager?.spaceHUD;
    const announcer = this.gameManager?.voiceAnnouncer;
    if (!hud) return;

    const commsData = {
      1: {
        intro: {
          speaker: 'HIGH COMMAND',
          text: 'Commander! That stealth infiltrator carries our planetary shield ciphers! Hunt it through the asteroid belt before it jumps to hyperspace!',
          voice: 'Commander: That stealth infiltrator carries our shield ciphers! Hunt it through the asteroid belt!',
          color: '#00f3ff'
        },
        mid: {
          speaker: 'ESCORT LEAD // VIPER-1',
          text: 'Lead, sensor contact! Stealth runner just flashed thermal signature at bearing zero-two-zero! Engage!',
          voice: 'Sensor contact! Stealth runner spotted at bearing zero-two-zero!',
          color: '#ffdd00'
        },
        warship: {
          speaker: 'HOSTILE OVERLORD // CRIMSON FLEET',
          text: 'Vanguard vermin... extract the data core! Annihilate their interceptor!',
          voice: 'Vanguard vermin... extract the data core! Annihilate their interceptor!',
          color: '#ff0055'
        },
        boss: {
          speaker: 'AEGIS TACTICAL AI',
          text: 'WARNING: Massive seismic gravity mine detected! Asteroid cluster coalescing into a Titan Colossus!',
          voice: 'Warning: Seismic gravity mine detected! Titan Colossus incoming!',
          color: '#ffaa00'
        }
      },
      2: {
        intro: {
          speaker: 'ADMIRAL VANCE // ALLIED ARMADA',
          text: 'Vanguard Squadron, you are entering the Cosmic Cliffs. Crimson Fleet has locked down the Halo Ring to refuel their strike armada.',
          voice: 'Vanguard Squadron, Crimson Fleet has locked down the Halo Ring to refuel their strike armada.',
          color: '#00f3ff'
        },
        mid: {
          speaker: 'AEGIS TACTICAL AI',
          text: 'WARNING: ECM Jammer Corvette detected! Cockpit radar and lead-targeting are being scrambled! Neutralize it!',
          voice: 'Warning: ECM Jammer Corvette detected! Radar scrambled! Neutralize it!',
          color: '#ffaa00'
        },
        boss: {
          speaker: 'HOSTILE OVERLORD // CRIMSON FLEET',
          text: 'Activate the Halo defense grid! Burn them with stellar fire!',
          voice: 'Activate the Halo defense grid! Burn them with stellar fire!',
          color: '#ff0055'
        }
      },
      3: {
        intro: {
          speaker: 'AEGIS TACTICAL AI',
          text: 'PRIORITY DEFENSE ALERT: Deep-Space Telescope Array is under siege! Protect the primary mirror array!',
          voice: 'Priority Defense Alert: Deep-Space Telescope Array is under siege! Protect the primary mirror array!',
          color: '#ffaa00'
        },
        mid: {
          speaker: 'ESCORT LEAD // VIPER-1',
          text: 'Heavy Devastator dropping out of hyperspace! It is locking siege torpedoes on the telescope! Intercept!',
          voice: 'Heavy Devastator dropping out of hyperspace! Locking siege torpedoes on the telescope! Intercept!',
          color: '#ffdd00'
        },
        boss: {
          speaker: 'ADMIRAL VANCE // ALLIED ARMADA',
          text: 'Citadel defense satellites online! Tear down their orbital batteries, Commander!',
          voice: 'Citadel defense satellites online! Tear down their orbital batteries, Commander!',
          color: '#00f3ff'
        }
      },
      4: {
        intro: {
          speaker: 'ADMIRAL VANCE // ALLIED ARMADA',
          text: 'You are behind enemy lines in Sector 4. Destroy their industrial cargo convoys and neutralize their logistics fleet.',
          voice: 'You are behind enemy lines in Sector 4. Destroy their industrial cargo convoys!',
          color: '#00f3ff'
        },
        mid: {
          speaker: 'ESCORT LEAD // VIPER-1',
          text: 'Dual capital signatures! Battleship on our starboard, Cruiser on our port! Break into the trench!',
          voice: 'Dual capital signatures! Battleship on starboard, Cruiser on port! Break into the trench!',
          color: '#ffdd00'
        },
        boss: {
          speaker: 'HOSTILE OVERLORD // CRIMSON FLEET',
          text: 'Sanctuary Citadel, arm all kinetic batteries! Wipe them from the void!',
          voice: 'Sanctuary Citadel, arm all kinetic batteries! Wipe them from the void!',
          color: '#ff0055'
        }
      },
      5: {
        intro: {
          speaker: 'HOSTILE OVERLORD // CRIMSON FLEET',
          text: 'You have pursued us far enough, Vanguard. Here, amidst the embers of dying stars, your coalition dies with you!',
          voice: 'You have pursued us far enough, Vanguard. Here amidst dying stars, your coalition dies with you!',
          color: '#ff0055'
        },
        mid: {
          speaker: 'ESCORT LEAD // VIPER-1',
          text: 'Missile launch detected! Multi-lock swarm heading right for you! Evade and clear them with EMP, Lead!',
          voice: 'Missile launch detected! Multi-lock swarm heading for you! Evade and clear them with EMP!',
          color: '#ffdd00'
        },
        boss: {
          speaker: 'ADMIRAL VANCE // ALLIED ARMADA',
          text: 'Allied Armada is jumping in to support! Target their hangar bays and crack that mothership wide open!',
          voice: 'Allied Armada jumping in to support! Target hangar bays and crack that mothership wide open!',
          color: '#00f3ff'
        },
        epilogue: {
          speaker: 'SOVEREIGN APEX // UNKNOWN SIGNAL',
          text: '[Quantum Transmission Intercepted] ...The herald has fallen. The ancient cradle awakens at the galactic core...',
          voice: 'The herald has fallen. The ancient cradle awakens at the galactic core...',
          color: '#cc44ff'
        }
      },
      6: {
        intro: {
          speaker: 'AEGIS TACTICAL AI',
          text: 'WARNING: Ambient temperature exceeding 12,000 Kelvin. Solar radiation charging laser cannons, but watch your hull temperature!',
          voice: 'Warning: Ambient temperature exceeding 12,000 Kelvin! Solar radiation charging laser cannons!',
          color: '#ffaa00'
        },
        mid: {
          speaker: 'ESCORT LEAD // VIPER-1',
          text: 'Enemy golden interceptors diving out of the solar flares! Keep moving!',
          voice: 'Enemy golden interceptors diving out of the solar flares! Keep moving!',
          color: '#ffdd00'
        },
        boss: {
          speaker: 'HIGH COMMAND',
          text: 'That siphon is draining the star magnetic core! Sever the orbital conduits!',
          voice: 'That siphon is draining the star magnetic core! Sever the orbital conduits!',
          color: '#00f3ff'
        }
      },
      7: {
        intro: {
          speaker: 'ADMIRAL VANCE // ALLIED ARMADA',
          text: 'Commander! A seismic entity is rising from the solar chromosphere! Protect the sensor probe while it calculates our exit trajectory!',
          voice: 'Commander! A seismic entity is rising from the chromosphere! Protect the sensor probe!',
          color: '#00f3ff'
        },
        boss: {
          speaker: 'AEGIS TACTICAL AI',
          text: 'TITAN CLASS CONTACT: Ignis Titan detected! Intense coronal discharge in all sectors!',
          voice: 'Titan Class Contact: Ignis Titan detected! Coronal discharge in all sectors!',
          color: '#ff0055'
        }
      },
      8: {
        intro: {
          speaker: 'ESCORT LEAD // VIPER-1',
          text: 'Look at the telemetry... space is literally warping! Keep your thrusters throttled up or we will get pulled past the photon sphere!',
          voice: 'Look at the telemetry... space is warping! Keep thrusters throttled up!',
          color: '#ffdd00'
        },
        boss: {
          speaker: 'SOVEREIGN APEX',
          text: 'Fall into oblivion. The singularity claims all matter.',
          voice: 'Fall into oblivion. The singularity claims all matter.',
          color: '#cc44ff'
        }
      },
      9: {
        intro: {
          speaker: 'HIGH COMMAND',
          text: 'Sector 9 is an uncharted cryo-belt. The enemy has frozen their primary capital reserve here. Destroy their cryo-anchors before the fleet wakes!',
          voice: 'Sector 9 is an uncharted cryo-belt. Destroy their cryo-anchors before the fleet wakes!',
          color: '#00f3ff'
        },
        boss: {
          speaker: 'ESCORT LEAD // VIPER-1',
          text: 'Twin capital dreadnoughts breaking free from the ice! Focus fire on the starboard engine manifold!',
          voice: 'Twin capital dreadnoughts breaking free from the ice! Focus fire on the starboard engines!',
          color: '#ffdd00'
        }
      },
      10: {
        intro: {
          speaker: 'AEGIS TACTICAL AI',
          text: 'WARNING: Severe electromagnetic blackout. Sensors detecting multiple phantom signatures. Trust visual crosshairs and lead-targeting pip!',
          voice: 'Warning: Severe electromagnetic blackout! Trust visual crosshairs and lead-targeting pip!',
          color: '#ffaa00'
        },
        boss: {
          speaker: 'HOSTILE OVERLORD // CRIMSON FLEET',
          text: 'Phase-cloaking engaged. You fight shadows, Vanguard.',
          voice: 'Phase-cloaking engaged. You fight shadows, Vanguard.',
          color: '#ff0055'
        }
      },
      11: {
        intro: {
          speaker: 'ADMIRAL VANCE // ALLIED ARMADA',
          text: 'Vanguard! You are inside the Dyson Trench! Fly through the megastructure arches, disable their shield generation pylons, and clear the path to the Gateway!',
          voice: 'Vanguard! Fly through the megastructure arches and disable their shield generation pylons!',
          color: '#00f3ff'
        },
        boss: {
          speaker: 'ESCORT LEAD // VIPER-1',
          text: 'The central nexus core is exposed! Hit it with everything in our loadout!',
          voice: 'The central nexus core is exposed! Hit it with everything in our loadout!',
          color: '#ffdd00'
        }
      },
      12: {
        intro: {
          speaker: 'SOVEREIGN APEX // THE FIRST INTELLIGENCE',
          text: 'We are the first thought of this galaxy. You are ephemeral sparks in an infinite void. Your coalition ends here.',
          voice: 'We are the first thought of this galaxy. Your coalition ends here.',
          color: '#cc44ff'
        },
        mid: {
          speaker: 'ADMIRAL VANCE // ALLIED ARMADA',
          text: 'All Vanguard wings, this is the final stand! For Segma! For the Coalition! All weapons fire at will!',
          voice: 'All Vanguard wings, this is the final stand! For Segma! For the Coalition! Fire at will!',
          color: '#00f3ff'
        },
        boss: {
          speaker: 'ESCORT LEAD // VIPER-1',
          text: 'Sovereign Dreadnought breaching realspace! Commander, this is it! Make every shot count!',
          voice: 'Sovereign Dreadnought breaching realspace! Commander, make every shot count!',
          color: '#ffdd00'
        },
        victory: {
          speaker: 'ADMIRAL VANCE // ALLIED ARMADA',
          text: 'SOVEREIGN APEX IS DOWN! The gateway is collapsing! Vanguard-01, you saved the galaxy! All stations, salute our new Fleet Admiral!',
          voice: 'Sovereign Apex is down! Vanguard-01, you saved the galaxy! Salute our new Fleet Admiral!',
          color: '#ffd700'
        }
      }
    };

    const waveData = commsData[wave];
    if (!waveData || !waveData[beat]) return;
    const item = waveData[beat];

    hud.showRadioTransmission(item.text, item.speaker, 5.0, item.color);
    if (announcer && item.voice) {
      announcer.speak(item.voice, true, item.speaker);
    }
  }

  update(dt) {
    if (this.waveState !== 'SPAWNING') return;

    // ── 📱 Mobile Performance Safeguard: Concurrency Throttle ──
    // Count active combatants. If screen is full, hold spawns to maintain rock-solid 60fps
    const activeAsteroids = this.gameManager.asteroids ? this.gameManager.asteroids.length : 0;
    const activeDrones = this.gameManager.drones ? this.gameManager.drones.filter(d => !d.isDead).length : 0;
    const activeStealth = this.gameManager.stealthFighters ? this.gameManager.stealthFighters.filter(s => !s.isDead).length : 0;
    const activeECM = this.gameManager.ecmCorvettes ? this.gameManager.ecmCorvettes.filter(e => !e.isDead).length : 0;
    const activePhase = this.gameManager.phaseInterceptors ? this.gameManager.phaseInterceptors.filter(p => !p.isDead).length : 0;
    const activeCruisers = this.gameManager.capitalShips ? this.gameManager.capitalShips.filter(c => !c.isDead).length : 0;
    const activeBattleships = this.gameManager.heavyBattleships ? this.gameManager.heavyBattleships.filter(b => !b.isDead).length : 0;
    const activeCarrier = this.gameManager.carrierBoss && !this.gameManager.carrierBoss.isDead;

    const isMobile = this.gameManager.isMobile;
    const diffMods = this.gameManager.getDifficultyModifiers ? this.gameManager.getDifficultyModifiers() : { fireRateMult: 1.0, speedMult: 1.0 };
    const diffBonus = this.gameManager.difficulty === 'ACE' ? 1 : (this.gameManager.difficulty === 'RECRUIT' ? -1 : 0);
    const budgets = this.gameManager.deviceManager?.getEntityBudgets() || { maxDrones: isMobile ? 3 : 5 };
    const maxConcurrent = budgets.maxDrones ? Math.min(6, budgets.maxDrones + diffBonus) : (isMobile ? 4 : 6);

    const activeHostiles = activeDrones + activeStealth + activeECM + activePhase + activeCruisers + activeBattleships + (activeCarrier ? 1 : 0);

    // Enforce active hostile concurrency throttle to prevent stutter
    if (activeHostiles >= maxConcurrent) {
      return;
    }

    this.spawnTimer += dt;
    // 🌌 Steady Tactical Encounter Pacing: ~2.2s - 2.8s between tactical waves (prevents entity flood)
    const baseInterval = (activeCarrier || activeBattleships > 0 ? 3.0 : Math.max(2.2, 2.8 - this.currentWave * 0.04)) / (diffMods.fireRateMult || 1.0);
    const spawnInterval = isMobile ? baseInterval * 1.25 : baseInterval;


    if (this.spawnTimer >= spawnInterval && this.spawnedCount < this.totalToSpawnInWave) {
      this.spawnTimer = 0;
      this.spawnedCount++;

      // ── ⭐ 3-Star Mastery: Cloaked Data Courier Drone Incursion ──
      if (this.spawnedCount === 6) {
        this.gameManager.spawnDataCourierDrone();
      }

      // ── 🚀 Staged Fleet Escalations Correlated to Story Direction ──
      if (this.currentWave === 1) {
        // Stage 1: Segma Asteroid Corridor // Hunt the Stealth Infiltrator
        if (this.spawnedCount <= 2) {
          // Contested corridor scouts immediately ahead
          this.gameManager.spawnDrone(null, true);
          this.gameManager.spawnDrone(null, true);
          this.gameManager.spawnAsteroid();
        } else if (this.spawnedCount === 3) {
          // Asteroid cluster crossing flight path
          this.gameManager.spawnAsteroid({ sizeCategory: 'large' });
          this.gameManager.spawnAsteroid({ isComet: true });
        } else if (this.spawnedCount === 4) {
          // Scripted Twin Pincer Flank Wing from port and starboard
          this.gameManager.spawnPincerFlightWing();
          this.gameManager.spawnAsteroid({ sizeCategory: 'medium' });
        } else if (this.spawnedCount === 6) {
          // Rogue Stealth Infiltrator uncloaks in close combat range!
          this.gameManager.spawnStealthFighter();
          this.gameManager.spawnAsteroid({ sizeCategory: 'large' });
          this.triggerStoryComms(1, 'mid');
        } else if (this.spawnedCount === 8) {
          this.gameManager.spawnPhaseInterceptor();
          this.gameManager.spawnDrone(null, true);
          this.gameManager.spawnAsteroid({ isComet: true });
        } else if (this.spawnedCount === 10) {
          // Crimson Battlecruiser warps in to extract the stealth runner
          this.gameManager.spawnCapitalShip();
          this.gameManager.spawnDrone(null, true);
          this.gameManager.spawnAsteroid({ sizeCategory: 'large' });
          this.triggerStoryComms(1, 'warship');
        } else if (this.spawnedCount === 14) {
          this.gameManager.spawnPincerFlightWing();
          this.gameManager.spawnAsteroid();
        } else if (this.spawnedCount === 18) {
          // Gorgon Carrier arrives to screen the retreat
          this.gameManager.spawnCarrierBoss();
        } else {
          // Continuous tactical encounter: 2 enemy craft paired with asteroid escort
          this.gameManager.spawnDrone(null, true);
          if (Math.random() < 0.45) {
            this.gameManager.spawnPhaseInterceptor();
          } else {
            this.gameManager.spawnDrone(null, true);
          }
          this.gameManager.spawnAsteroid({ sizeCategory: Math.random() > 0.4 ? 'large' : 'medium' });
        }
      } else if (this.currentWave === 2) {
        // Stage 2: Carina Nebula // Halo Citadel
        if (this.spawnedCount === 4) {
          this.gameManager.spawnDrone(null, true);
          this.gameManager.spawnPincerFlightWing();
        } else if (this.spawnedCount === 8) {
          this.gameManager.spawnECMCorvette();
          this.triggerStoryComms(2, 'mid');
        } else if (this.spawnedCount === 16) {
          this.gameManager.spawnCapitalShip();
        } else if (this.spawnedCount === 22) {
          this.gameManager.spawnCarrierBoss();
        }
      } else if (this.currentWave === 3) {
        // Stage 3: Pillars of Creation // JWST Science Array Defense
        if (this.spawnedCount === 4) {
          this.gameManager.spawnStealthFighter();
          this.gameManager.spawnPhaseInterceptor();
        } else if (this.spawnedCount === 12) {
          this.gameManager.spawnHeavyBattleship();
          this.triggerStoryComms(3, 'mid');
        } else if (this.spawnedCount === 22) {
          this.gameManager.spawnECMCorvette();
        }
      } else if (this.currentWave === 4) {
        // Stage 4: Phantom Galaxy // Grand Design Convoy Intercept
        if (this.spawnedCount === 6) {
          this.gameManager.spawnCapitalShip();
          this.gameManager.spawnECMCorvette();
        } else if (this.spawnedCount === 14) {
          this.gameManager.spawnHeavyBattleship();
          this.gameManager.spawnPhaseInterceptor();
          this.triggerStoryComms(4, 'mid');
        } else if (this.spawnedCount === 26) {
          this.gameManager.spawnCarrierBoss();
        }
      } else if (this.currentWave === 5) {
        // Stage 5: Southern Ring // The Crimson Command Mothership
        if (this.spawnedCount === 8) {
          this.gameManager.spawnHeavyBattleship();
          this.gameManager.spawnECMCorvette();
        } else if (this.spawnedCount === 16) {
          this.triggerStoryComms(5, 'mid');
        } else if (this.spawnedCount === 24) {
          this.gameManager.spawnCarrierBoss();
          this.gameManager.spawnPhaseInterceptor();
        } else if (this.spawnedCount === 34) {
          this.gameManager.spawnCapitalShip();
        }
      } else if (this.currentWave === 6) {
        // Stage 6: Helios Mega-Forge // Dyson Siphon
        if (this.spawnedCount === 8) {
          this.gameManager.spawnHeavyBattleship();
          this.gameManager.spawnStealthFighter();
        } else if (this.spawnedCount === 16) {
          this.gameManager.spawnECMCorvette();
          this.triggerStoryComms(6, 'mid');
        } else if (this.spawnedCount === 26) {
          this.gameManager.spawnCarrierBoss();
          this.gameManager.spawnPhaseInterceptor();
        }
      } else if (this.currentWave === 7) {
        // Stage 7: Solar Chromosphere // Ignis Titan Devourer
        if (this.spawnedCount === 10) {
          this.gameManager.spawnCapitalShip();
          this.gameManager.spawnECMCorvette();
        } else if (this.spawnedCount === 24) {
          this.gameManager.spawnHeavyBattleship();
          this.gameManager.spawnPhaseInterceptor();
        }
      } else if (this.currentWave === 8) {
        // Stage 8: Event Horizon // Singularity Cradle
        if (this.spawnedCount === 12) {
          this.gameManager.spawnCarrierBoss();
          this.gameManager.spawnECMCorvette();
        } else if (this.spawnedCount === 28) {
          this.gameManager.spawnPhaseInterceptor();
          this.gameManager.spawnStealthFighter();
        }
      } else if (this.currentWave === 9) {
        // Stage 9: Boreas Cryo Abyss // Glacial Bastion
        if (this.spawnedCount === 14) {
          this.gameManager.spawnHeavyBattleship();
          this.gameManager.spawnStealthFighter();
        } else if (this.spawnedCount === 30) {
          this.gameManager.spawnCarrierBoss();
        }
      } else if (this.currentWave === 10) {
        // Stage 10: Null-Sector Blackout // Chrono-Phantom Fleet
        if (this.spawnedCount === 16) {
          this.gameManager.spawnStealthFighter();
          this.gameManager.spawnECMCorvette();
        } else if (this.spawnedCount === 32) {
          this.gameManager.spawnCapitalShip();
          this.gameManager.spawnPhaseInterceptor();
        }
      } else if (this.currentWave === 11) {
        // Stage 11: Dyson Nexus // Trench Assault
        if (this.spawnedCount === 18) {
          this.gameManager.spawnCapitalShip();
          this.gameManager.spawnECMCorvette();
        } else if (this.spawnedCount === 36) {
          this.gameManager.spawnHeavyBattleship();
          this.gameManager.spawnPhaseInterceptor();
        }
      } else if (this.currentWave >= 12) {
        // Stage 12: Hyper-Gateway Finale // Sovereign Apex
        if (this.spawnedCount === 14) {
          this.gameManager.spawnCapitalShip();
          this.gameManager.spawnCarrierBoss();
          this.triggerStoryComms(12, 'mid');
        } else if (this.spawnedCount === 30) {
          this.gameManager.spawnHeavyBattleship();
          this.gameManager.spawnPhaseInterceptor();
        }
      }

      // ── Standard Combat Patrol Spawning (Tactical Pairs + Asteroid Escort) ──
      if (this.currentWave > 1) {
        const carrierActive = this.gameManager.carrierBoss && !this.gameManager.carrierBoss.isDead;
        const cometChance = 0.25;

        // 1. Spawn 2 Enemy Craft
        if (carrierActive) {
          this.gameManager.spawnDrone(null, true);
          this.gameManager.spawnPhaseInterceptor();
        } else {
          const roll = Math.random();
          if (roll < 0.45) {
            this.gameManager.spawnDrone(null, true);
            this.gameManager.spawnDrone(null, true);
          } else if (roll < 0.75) {
            this.gameManager.spawnDrone(null, true);
            this.gameManager.spawnPhaseInterceptor();
          } else {
            this.gameManager.spawnStealthFighter();
            this.gameManager.spawnDrone(null, true);
          }
        }

        // 2. Spawn 1 Asteroid Escort (unless boss active)
        if (!this.gameManager.activeBoss || this.gameManager.activeBoss.isDead) {
          if (Math.random() < cometChance) {
            this.gameManager.spawnAsteroid({ isComet: true });
          } else {
            this.gameManager.spawnAsteroid({ sizeCategory: Math.random() > 0.45 ? 'large' : 'medium' });
          }
        }
      }
    }

    // ── Stage Apex Boss Spawning ──
    if (this.spawnedCount >= this.totalToSpawnInWave && !this.bossSpawned) {
      this.bossSpawned = true;
      this.waveState = 'WAITING_CLEAR';
      if (this.gameManager.spaceAudio) {
        this.gameManager.spaceAudio.setSoundtrackTheme('BOSS');
      }

      // Disperse all regular asteroids and disable space debris for boss encounter
      this.gameManager.onBossArrived();

      if (this.currentWave === 1) {
        // Stage 1 Apex Boss: ☄️ Titan Asteroid Colossus
        this.gameManager.spawnTitanBoss();
        this.triggerStoryComms(1, 'boss');
      } else if (this.currentWave === 2) {
        // Stage 2 Apex Boss: 🌌 The Halo Megastructure Defense Ring
        this.gameManager.spawnHaloBoss();
        this.triggerStoryComms(2, 'boss');
      } else if (this.currentWave === 3) {
        // Stage 3 Apex Boss: 🌕 Sector Alpha Moon Base Citadel
        this.gameManager.spawnSpaceStation();
        this.triggerStoryComms(3, 'boss');
      } else if (this.currentWave === 4) {
        // Stage 4 Apex Boss: 🪐 Sanctuary-9 Industrial Rotating Cylinder Citadel
        this.gameManager.spawnSanctuaryCylinderBoss();
        this.triggerStoryComms(4, 'boss');
      } else if (this.currentWave === 5) {
        // Stage 5 Apex Boss: 👑 The Vorn Hive Command Mothership
        this.gameManager.spawnCommandMothership();
        this.triggerStoryComms(5, 'boss');
      } else if (this.currentWave === 6) {
        // Stage 6 Apex Boss: ☀️ Helios Solar Siphon Colossus
        this.gameManager.spawnHeliosSolarBoss();
        this.triggerStoryComms(6, 'boss');
      } else if (this.currentWave === 7) {
        // Stage 7 Apex Boss: 🔥 Ignis Titan Solar Devourer
        this.gameManager.spawnSolarTitan();
        this.triggerStoryComms(7, 'boss');
      } else if (this.currentWave === 8) {
        // Stage 8 Apex Boss: 🕳️ Oblivion Harbinger Singularity Cradle
        this.gameManager.spawnSingularityHarbinger();
        this.triggerStoryComms(8, 'boss');
      } else if (this.currentWave === 9) {
        // Stage 9 Apex Boss: 🧊 Glacial Archon Cryo-Dreadnought Fleet
        this.gameManager.spawnHeavyBattleship();
        this.gameManager.spawnCarrierBoss();
        this.triggerStoryComms(9, 'boss');
      } else if (this.currentWave === 10) {
        // Stage 10 Apex Boss: ⚡ Chrono-Phantom Ghost Carrier
        this.gameManager.spawnCommandMothership();
        this.triggerStoryComms(10, 'boss');
      } else if (this.currentWave === 11) {
        // Stage 11 Apex Boss: 🪐 Arch-Constructor Dyson Omega Nexus
        this.gameManager.spawnSanctuaryCylinderBoss();
        this.triggerStoryComms(11, 'boss');
      } else {
        // Stage 12 Grand Finale: 🌌 Sovereign Apex // The First Intelligence
        this.gameManager.spawnCommandMothership();
        this.gameManager.spawnSolarTitan();
        this.triggerStoryComms(12, 'boss');
      }
    }
  }

  checkWaveComplete(activeAsteroidsCount, activeDronesCount, bossActive) {
    const stealthActive = this.gameManager.stealthFighters ? this.gameManager.stealthFighters.some(s => !s.isDead) : false;
    const ecmActive = this.gameManager.ecmCorvettes ? this.gameManager.ecmCorvettes.some(e => !e.isDead) : false;
    const phaseActive = this.gameManager.phaseInterceptors ? this.gameManager.phaseInterceptors.some(p => !p.isDead) : false;
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
      !ecmActive &&
      !phaseActive &&
      !battleshipActive &&
      !cruiserActive &&
      !carrierActive &&
      !bossActive
    ) {
      this.waveState = 'COMPLETED';

      // Wave 5 Climax Transmission (Signal from Galactic Core)
      if (this.currentWave === 5) {
        setTimeout(() => {
          this.triggerStoryComms(5, 'epilogue');
        }, 800);
      }

      // Wave 12 Grand Finale Victory Sequence
      if (this.currentWave === 12) {
        setTimeout(() => {
          this.triggerStoryComms(12, 'victory');
          if (this.gameManager.spaceHUD) {
            this.gameManager.spaceHUD.showRankPromotionBanner('FLEET ADMIRAL');
          }
          this.gameManager.score += 50000;
        }, 800);
      }

      if (this.gameManager.activeTelescope && !this.gameManager.activeTelescope.isDead) {
        this.gameManager.onTelescopeObjectiveDefended();
      }
      setTimeout(() => {
        this.gameManager.onWaveCompleted(this.currentWave);
      }, 1500);
      return true;
    }
    return false;
  }
}
