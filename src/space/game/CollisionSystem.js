import * as THREE from 'three';

export class CollisionSystem {
  constructor(particleManager, spaceAudio, spaceScene) {
    this.particleManager = particleManager;
    this.spaceAudio = spaceAudio;
    this.spaceScene = spaceScene;

    // Pre-allocated reusable vectors to eliminate Garbage Collection thrashing
    this._tempVec1 = new THREE.Vector3();
    this._tempVec2 = new THREE.Vector3();
  }

  checkCollisions(gameManager) {
    const player = gameManager.playerShip;
    if (!player || !player.meshGroup) return;
    const pPos = player.meshGroup.position;

    // Retaliatory EMP perk check
    if (player.pendingRetaliateEMP) {
      player.pendingRetaliateEMP = false;
      this.spaceAudio.playExplosion();
      this.spaceScene.addScreenShake(0.9);
      
      const aoeRadius = 55.0;
      
      // Damage asteroids
      gameManager.asteroids.forEach(rock => {
        if (rock && rock.meshGroup && !rock.isDead && pPos.distanceTo(rock.meshGroup.position) < aoeRadius) {
          const dead = rock.takeDamage(100);
          if (dead) {
            gameManager.addScore(rock.scoreValue);
            gameManager.addScrap(15);
            gameManager.achievementSystem.recordAsteroidDestroyed();
          }
        }
      });

      // Damage drones
      gameManager.drones.forEach(drone => {
        if (drone && drone.meshGroup && !drone.isDead && pPos.distanceTo(drone.meshGroup.position) < aoeRadius) {
          const dead = drone.takeDamage(100);
          if (dead) {
            gameManager.addScore(drone.scoreValue);
            gameManager.addScrap(30);
            gameManager.achievementSystem.recordDroneKill();
          }
        }
      });

      // Damage capital ships
      gameManager.capitalShips.forEach(ship => {
        if (ship && ship.meshGroup && !ship.isDead && pPos.distanceTo(ship.meshGroup.position) < aoeRadius) {
          const dead = ship.takeDamage(100);
          if (dead) {
            gameManager.addScore(ship.scoreValue);
            gameManager.addScrap(80);
            gameManager.achievementSystem.recordDroneKill();
          }
        }
      });

      // Damage boss
      const boss = gameManager.activeBoss;
      if (boss && boss.meshGroup && !boss.isDead && pPos.distanceTo(boss.meshGroup.position) < aoeRadius + 20) {
        if (boss.takeCoreDamage) boss.takeCoreDamage(100);
        else if (boss.takeDamage) boss.takeDamage('core', 100);
      }
    }

    // 1. Power-Up Collection by Player Ship
    for (let i = gameManager.powerUps.length - 1; i >= 0; i--) {
      const pow = gameManager.powerUps[i];
      if (!pow || !pow.meshGroup) continue;

      const dist = pPos.distanceTo(pow.meshGroup.position);
      if (dist < player.radius + pow.radius) {
        gameManager.collectPowerUp(pow.type);
        pow.destroy();
        gameManager.powerUps.splice(i, 1);
      }
    }

    // 2. Lasers vs Threats & Boss
    for (let i = gameManager.lasers.length - 1; i >= 0; i--) {
      const laser = gameManager.lasers[i];
      if (!laser || !laser.meshGroup) continue;

      const lPos = laser.meshGroup.position;

      if (laser.isEnemy) {
        // Enemy plasma vs Player
        const distP = lPos.distanceTo(pPos);
        if (distP < player.radius + laser.radius) {
          laser.destroy();
          gameManager.lasers.splice(i, 1);

          const dead = player.takeDamage(12);
          this.particleManager.createExplosion(pPos, 0xff0055, 15);
          this.spaceAudio.playExplosion();
          this.spaceScene.addScreenShake(0.6);

          if (dead) gameManager.onGameOver('Craft Shield Destroyed');
          continue;
        }
      } else {
        // Player Lasers vs Asteroids
        let hit = false;
        for (let j = gameManager.asteroids.length - 1; j >= 0; j--) {
          const rock = gameManager.asteroids[j];
          if (!rock || !rock.meshGroup || rock.isDead) continue;

          laser.hitEntities = laser.hitEntities || new Set();
          if (laser.hitEntities.has(rock.meshGroup.uuid)) continue;

          const dist = lPos.distanceTo(rock.meshGroup.position);
          const rockPhysicalRadius = (rock.radius || 3.0) * 0.75 + 0.3;
          if (dist < rockPhysicalRadius) {
            laser.hitEntities.add(rock.meshGroup.uuid);
            let dmg = laser.damage || 25;
            if (laser.isCritical) {
              this.particleManager.createExplosion(lPos, 0xff0044, 25);
            } else if (laser.isAoe) {
              this.particleManager.createExplosion(lPos, 0xff5500, 30, 1.8);
              this.spaceScene.addScreenShake(0.4);
            } else {
              this.particleManager.createExplosion(lPos, 0x00f3ff, 12);
            }
            if (laser.hitEntities.size > 1) dmg *= 0.5;

            const dead = rock.takeDamage(dmg);
            this.spaceAudio.playExplosion();

            if (dead) {
              gameManager.addScore(rock.scoreValue);
              gameManager.addScrap(15);
              if (player.shipClass === 'REAPER' || laser.isSiphon) {
                player.healShield(8);
              }
              if (player.shipClass === 'TACTICIAN') {
                player.pulseCooldown = Math.max(0, player.pulseCooldown - 0.4);
              }
              const frags = rock.getSplitFragments(player.hasMiningAddon);
              if (frags && frags.length > 0) {
                gameManager.spawnAsteroidFragments(frags);
                gameManager.addScrap(25);
                this.particleManager.createExplosion(rock.meshGroup.position, 0xffea00, 30, 2.0);
              }
            }

            if (!gameManager.activePerks.has('piercing') && !laser.isAoe) {
              hit = true;
              laser.destroy();
              gameManager.lasers.splice(i, 1);
              break;
            }
          }
        }

        if (hit) continue;

        // Player Lasers vs Enemy Drones
        for (let j = gameManager.drones.length - 1; j >= 0; j--) {
          const drone = gameManager.drones[j];
          if (!drone || !drone.meshGroup || drone.isDead) continue;

          laser.hitEntities = laser.hitEntities || new Set();
          if (laser.hitEntities.has(drone.meshGroup.uuid)) continue;

          const dist = lPos.distanceTo(drone.meshGroup.position);
          const dronePhysicalRadius = 1.3;
          if (dist < dronePhysicalRadius) {
            laser.hitEntities.add(drone.meshGroup.uuid);
            let dmg = laser.damage || 20;
            if (laser.isCritical) {
              this.particleManager.createExplosion(lPos, 0xff0044, 28);
            } else if (laser.isAoe) {
              this.particleManager.createExplosion(lPos, 0xff5500, 30, 1.8);
              this.spaceScene.addScreenShake(0.4);
            } else {
              this.particleManager.createExplosion(lPos, 0xff0055, 18);
            }
            if (laser.hitEntities.size > 1) dmg *= 0.5;

            // Tactician EMP stun on hit
            if (laser.appliesEmp || player.shipClass === 'TACTICIAN') {
              drone.stunTimer = 2.5;
              this.particleManager.createEmpShockwave(drone.meshGroup.position, 6.0);
            }

            const dead = drone.takeDamage(dmg);
            this.spaceAudio.playExplosion();

            if (dead) {
              gameManager.addScore(drone.scoreValue);
              gameManager.addScrap(30);
              gameManager.achievementSystem.recordDroneKill();
              if (player.shipClass === 'REAPER' || laser.isSiphon) {
                player.healShield(8);
              }
              if (player.shipClass === 'TACTICIAN') {
                player.pulseCooldown = Math.max(0, player.pulseCooldown - 0.6);
              }
            }

            if (!gameManager.activePerks.has('piercing') && !laser.isAoe) {
              hit = true;
              laser.destroy();
              gameManager.lasers.splice(i, 1);
              break;
            }
          }
        }

        if (hit) continue;

        // Player Lasers vs Capital Ships
        if (gameManager.capitalShips && gameManager.capitalShips.length > 0) {
          for (let j = gameManager.capitalShips.length - 1; j >= 0; j--) {
            const ship = gameManager.capitalShips[j];
            if (!ship || !ship.meshGroup || ship.isDead) continue;

            laser.hitEntities = laser.hitEntities || new Set();
            if (laser.hitEntities.has(ship.meshGroup.uuid)) continue;

            const dist = lPos.distanceTo(ship.meshGroup.position);
            if (dist < ship.radius + laser.radius) {
              laser.hitEntities.add(ship.meshGroup.uuid);
              let dmg = 20;
              if (laser.isCritical) {
                dmg *= 3;
                this.particleManager.createExplosion(lPos, 0xff0044, 30);
              } else {
                this.particleManager.createExplosion(lPos, 0x00aaff, 22);
              }
              if (laser.hitEntities.size > 1) dmg *= 0.5;

              const dead = ship.takeDamage(dmg);
              this.spaceAudio.playExplosion();

              if (dead) {
                gameManager.addScore(ship.scoreValue);
                gameManager.addScrap(80);
                gameManager.achievementSystem.recordDroneKill();
                player.onKillHeal();
              }

              if (!gameManager.activePerks.has('piercing')) {
                hit = true;
                laser.destroy();
                gameManager.lasers.splice(i, 1);
                break;
              }
            }
          }
        }

        if (hit) continue;

        // Player Lasers vs Boss (SpaceStation / HaloRingBoss / Babylon5Boss / BossDreadnought)
        if (gameManager.activeBoss && !gameManager.activeBoss.isDead && gameManager.activeBoss.meshGroup) {
          const boss = gameManager.activeBoss;
          if (boss.isDead) continue;

          try {
            const bPos = boss.meshGroup ? boss.meshGroup.position : null;
            if (!bPos) continue;

            const distB = lPos.distanceTo(bPos);
            const bossHitRadius = boss.hitRadius || 32.0;

            laser.hitEntities = laser.hitEntities || new Set();

            if (distB < bossHitRadius) {
              let dmg = 25;
              if (laser.isCritical) {
                dmg *= 3;
                this.particleManager.createExplosion(lPos, 0xff0044, 25);
              } else {
                this.particleManager.createExplosion(lPos, 0xffea00, 15);
              }
              if (laser.hitEntities.size > 1) dmg *= 0.5;

              let hitRegistered = false;
              let dead = false;

              // 1. Check Shield Generators (MoonBase)
              if (boss.generators && Array.isArray(boss.generators)) {
                for (const g of boss.generators) {
                  if (!g.isDead && g.mesh) {
                    const gPos = g.mesh.getWorldPosition(this._tempVec1);
                    if (lPos.distanceTo(gPos) < 4.5) {
                      if (!laser.hitEntities.has(`gen_${g.id}`)) {
                        laser.hitEntities.add(`gen_${g.id}`);
                        boss.takeGeneratorDamage(g.id, dmg);
                        hitRegistered = true;
                        break;
                      }
                    }
                  }
                }
              }

              // 2. Check Turrets
              if (!hitRegistered && boss.turrets && Array.isArray(boss.turrets)) {
                const livingTurrets = boss.turrets.filter(t => t && !t.isDead && t.mesh);
                let hitTurret = null;
                let closestDist = Infinity;
                for (const t of livingTurrets) {
                  if (t.mesh) {
                    const tPos = t.mesh.getWorldPosition(this._tempVec1);
                    const td = lPos.distanceTo(tPos);
                    if (td < closestDist) { closestDist = td; hitTurret = t; }
                  }
                }
                if (hitTurret && closestDist < 4.0) {
                  if (!laser.hitEntities.has(hitTurret.id)) {
                    laser.hitEntities.add(hitTurret.id);
                    boss.takeTurretDamage(hitTurret.id, dmg);
                    hitRegistered = true;
                  }
                }
              }

              // 3. Check Thermal Exhaust Port Vulnerability (MoonBase)
              if (!hitRegistered && boss.vulnMesh && !boss.hasShield) {
                const vulnPos = boss.vulnMesh.getWorldPosition(this._tempVec1);
                if (lPos.distanceTo(vulnPos) < 4.2) {
                  if (!laser.hitEntities.has('boss_exhaust_core')) {
                    laser.hitEntities.add('boss_exhaust_core');
                    dead = boss.takeCoreDamage(dmg, true); // 2.5x Critical damage!
                    this.particleManager.createExplosion(lPos, 0xff3300, 40);
                    hitRegistered = true;
                  }
                }
              }

              // 4. Default Core Hit
              if (!hitRegistered) {
                if (!laser.hitEntities.has('boss_core')) {
                  laser.hitEntities.add('boss_core');
                  dead = boss.takeCoreDamage ? boss.takeCoreDamage(dmg, false) : (boss.takeDamage ? boss.takeDamage('core', dmg) : false);
                  hitRegistered = true;
                }
              }

              if (hitRegistered) {
                if (dead || boss.isDead) {
                  gameManager.addScore(boss.scoreValue);
                  gameManager.addScrap(500);
                  gameManager.achievementSystem.recordBossKilled();
                  player.onKillHeal();
                }

                if (!gameManager.activePerks.has('piercing')) {
                  laser.destroy();
                  gameManager.lasers.splice(i, 1);
                }
              }
              continue;
            }
          } catch (bossErr) {
            console.warn('Laser vs Boss collision error caught safely:', bossErr);
          }
        }

        // Carrier Capital Ship Laser Hit Check (Turrets, Hangar Bays, Missile Pods, Hull)
        if (gameManager.carrierBoss && !gameManager.carrierBoss.isDead && gameManager.carrierBoss.meshGroup) {
          const carrier = gameManager.carrierBoss;
          const carrierLocalPos = carrier.meshGroup.worldToLocal(lPos.clone());
          // Broad check within carrier bounding zone
          if (Math.abs(carrierLocalPos.x) < 14.0 && Math.abs(carrierLocalPos.y) < 6.5 && Math.abs(carrierLocalPos.z) < 22.0) {
            this.particleManager.createExplosion(lPos, 0x00f3ff, 15);
            let dmg = laser.isCritical ? 75 : 25;
            let hitRegistered = false;

            // 1. Check Turret Hits
            if (carrier.turrets) {
              for (const t of carrier.turrets) {
                if (!t.isDead && t.mesh) {
                  const tPos = t.mesh.getWorldPosition(this._tempVec1);
                  if (lPos.distanceTo(tPos) < 3.2) {
                    carrier.takeTurretDamage(t.id, dmg);
                    hitRegistered = true;
                    break;
                  }
                }
              }
            }

            // 2. Check Subsystem Hits (Hangars & Missile Pods)
            if (!hitRegistered && carrier.subsystems) {
              for (const sub of carrier.subsystems) {
                if (!sub.isDead && sub.mesh) {
                  const subPos = sub.mesh.getWorldPosition(this._tempVec1);
                  const hitRadius = sub.id.includes('hangar') ? 4.2 : 3.0;
                  if (lPos.distanceTo(subPos) < hitRadius) {
                    carrier.takeSubsystemDamage(sub.id, dmg);
                    hitRegistered = true;
                    break;
                  }
                }
              }
            }

            // 3. Fallback: Main Hull Damage
            if (!hitRegistered) {
              const dead = carrier.takeDamage(dmg);
              if (dead) {
                gameManager.addScore(carrier.scoreValue);
                gameManager.addScrap(300);
              }
            }

            if (!gameManager.activePerks.has('piercing')) {
              laser.destroy();
              gameManager.lasers.splice(i, 1);
            }
            continue;
          }
        }
      }
    }



    // 4. Plasma Pulse Ball Projectiles vs Threats & Bosses
    for (let i = gameManager.plasmaPulses.length - 1; i >= 0; i--) {
      const pulse = gameManager.plasmaPulses[i];
      if (!pulse || !pulse.meshGroup) continue;

      const pulsePos = pulse.meshGroup.position;
      let hitTarget = false;

      // When a boss is active, the Plasma Pulse PIERCES through normal threats
      // (dealing damage to them) so it can reach the shield regulator.
      // When no boss is active, it still detonates on normal enemies.
      const bossActive = gameManager.activeBoss && !gameManager.activeBoss.isDead;
      [...gameManager.asteroids, ...gameManager.drones, ...gameManager.capitalShips].forEach(target => {
        if (target && !target.isDead && target.meshGroup && pulsePos.distanceTo(target.meshGroup.position) < target.radius + pulse.radius + 1.0) {
          if (!bossActive) {
            // No boss — detonate on contact with any enemy
            hitTarget = true;
          } else {
            // Boss active — pierce: deal AOE-tier damage but don't stop the pulse
            if (target.takeDamage) target.takeDamage(250);
            else if (target.takeCoreDamage) target.takeCoreDamage(250);
            if (target.isDead) {
              gameManager.addScore(target.scoreValue || 0);
              gameManager.addScrap(target.scoreValue ? 20 : 0);
            }
          }
        }
      });

      if (gameManager.activeBoss && !gameManager.activeBoss.isDead && gameManager.activeBoss.meshGroup) {
        const boss = gameManager.activeBoss;
        
        // Deflector shield vulnerable point collision check with Special Pulse
        if (boss.hasShield && boss.vulnMesh && boss.vulnMesh.visible) {
          boss.vulnMesh.updateMatrixWorld(true);
          const vulnWorldPos = boss.vulnMesh.getWorldPosition(this._tempVec2);
          const distToVuln = pulsePos.distanceTo(vulnWorldPos);
          if (distToVuln < 22) { // Direct hit or close AoE hit on the regulator core
            boss.hasShield = false;
            boss.vulnMesh.visible = false;
            if (boss.vulnRing) boss.vulnRing.visible = false;
            this.particleManager.createExplosion(vulnWorldPos, 0xff3300, 80, 3.5);
            this.spaceAudio.playExplosion();
            gameManager.voiceAnnouncer.speak("Moon Base deflector shields offline! Attack the core!", true);
            if (gameManager.spaceHUD) {
              gameManager.spaceHUD.showWaveBanner("SHIELD DOWN", "DEFLECTOR SHIELDS OFFLINE!");
            }
            hitTarget = true;
          }
        }

        if (pulsePos.distanceTo(boss.meshGroup.position) < 22) {
          hitTarget = true;
        }
      }

      if (hitTarget) {
        pulse.destroy();
        gameManager.plasmaPulses.splice(i, 1);

        this.particleManager.createExplosion(pulsePos, 0x00f3ff, 60, 2.5);
        this.particleManager.createEmpShockwave(pulsePos, pulse.aoeRadius);
        this.spaceAudio.playTorpedoExplosion();
        this.spaceScene.addScreenShake(2.0);
        gameManager.triggerHitFreeze(0.05); // Tactile AAA Hit Pause!

        // Heavy Radial AoE Plasma Blast (250 Damage)
        gameManager.asteroids.forEach(rock => {
          if (rock && rock.meshGroup && pulsePos.distanceTo(rock.meshGroup.position) < pulse.aoeRadius) {
            if (rock.takeDamage(250)) {
              gameManager.addScore(rock.scoreValue);
              gameManager.addScrap(20);
            }
          }
        });

        gameManager.drones.forEach(drone => {
          if (drone && drone.meshGroup && pulsePos.distanceTo(drone.meshGroup.position) < pulse.aoeRadius) {
            if (drone.takeDamage(250)) {
              gameManager.addScore(drone.scoreValue);
              gameManager.addScrap(40);
            }
          }
        });

        gameManager.capitalShips.forEach(ship => {
          if (ship && ship.meshGroup && pulsePos.distanceTo(ship.meshGroup.position) < pulse.aoeRadius) {
            if (ship.takeDamage(250)) {
              gameManager.addScore(ship.scoreValue);
              gameManager.addScrap(100);
            }
          }
        });

        if (gameManager.activeBoss && !gameManager.activeBoss.isDead && gameManager.activeBoss.meshGroup) {
          const boss = gameManager.activeBoss;
          if (pulsePos.distanceTo(boss.meshGroup.position) < pulse.aoeRadius + 10) {
            const dead = boss.takeCoreDamage ? boss.takeCoreDamage(200) : boss.takeDamage('core', 200);
            if (dead) {
              gameManager.addScore(boss.scoreValue);
              gameManager.addScrap(500);
            }
          }
        }

        if (gameManager.carrierBoss && !gameManager.carrierBoss.isDead && gameManager.carrierBoss.meshGroup) {
          const carrier = gameManager.carrierBoss;
          if (pulsePos.distanceTo(carrier.meshGroup.position) < pulse.aoeRadius + 16) {
            // Splash damage all nearby turrets and subsystems
            if (carrier.turrets) {
              carrier.turrets.forEach(t => {
                if (!t.isDead && t.mesh) {
                  const tPos = t.mesh.getWorldPosition(this._tempVec1);
                  if (pulsePos.distanceTo(tPos) < pulse.aoeRadius + 6.0) {
                    carrier.takeTurretDamage(t.id, 150);
                  }
                }
              });
            }
            if (carrier.subsystems) {
              carrier.subsystems.forEach(sub => {
                if (!sub.isDead && sub.mesh) {
                  const subPos = sub.mesh.getWorldPosition(this._tempVec1);
                  if (pulsePos.distanceTo(subPos) < pulse.aoeRadius + 7.0) {
                    carrier.takeSubsystemDamage(sub.id, 180);
                  }
                }
              });
            }
            carrier.takeDamage(300);
          }
        }
      }
    }

    // Direct Carrier Collision with Player Ship
    if (gameManager.carrierBoss && !gameManager.carrierBoss.isDead && gameManager.carrierBoss.meshGroup) {
      const carrier = gameManager.carrierBoss;
      if (pPos.distanceTo(carrier.meshGroup.position) < player.radius + carrier.hitRadius) {
        player.takeDamage(40);
        this.particleManager.createExplosion(pPos, 0x00f3ff, 35);
        this.spaceAudio.playExplosion();
      }
    }

    // Superlaser Insta-Kill Collision Check
    const boss = gameManager.activeBoss;
    if (boss && !boss.isDead && boss.meshGroup && boss.superlaserfiring) {
      const bPos = boss.meshGroup.position;
      
      // Calculate perpendicular distance from player to beam center line (Z-axis corridor)
      const dx = pPos.x - bPos.x;
      const dy = pPos.y - bPos.y;
      const distFromBeamCenter = Math.sqrt(dx * dx + dy * dy);

      // Superlaser beam radius is 9.5 units
      if (distFromBeamCenter < 9.5) {
        if (player.isDodging) {
          // Player executed tactical dodge roll to clear the superlaser beam path!
          if (gameManager.spaceHUD) {
            gameManager.spaceHUD.showLockOnWarning(false);
          }
        } else {
          // Direct hit! Player craft is vaporized immediately!
          player.takeDamage(9999);
          this.particleManager.createExplosion(pPos, 0x00f3ff, 200, 5.0);
          this.particleManager.createExplosion(pPos, 0xff0055, 150, 4.0);
          this.particleManager.createExplosion(pPos, 0xffea00, 100, 3.5);
          this.particleManager.createEmpShockwave(pPos, 120);
          this.spaceAudio.playExplosion();
          this.spaceScene.addScreenShake(5.0);
          gameManager.onGameOver('VAPORIZED BY MOON BASE SUPERLASER');
          return;
        }
      }
    }

    // 5. Direct Player Collisions with Threats
    gameManager.asteroids.forEach(rock => {
      if (rock && !rock.isDead && rock.meshGroup && pPos.distanceTo(rock.meshGroup.position) < player.radius + rock.radius) {
        rock.isDead = true;
        const isDread = player.shipClass === 'DREADNOUGHT';
        const dmgTaken = isDread ? 6 : 25;
        const dead = player.takeDamage(dmgTaken);
        this.particleManager.createExplosion(pPos, isDread ? 0xff5500 : 0xff0055, isDread ? 45 : 30, isDread ? 2.0 : 1.0);
        this.spaceAudio.playExplosion();
        this.spaceScene.addScreenShake(isDread ? 0.7 : 1.2);
        if (dead) gameManager.onGameOver('Collision with Asteroid');
      }
    });

    gameManager.drones.forEach(drone => {
      if (drone && !drone.isDead && drone.meshGroup && pPos.distanceTo(drone.meshGroup.position) < player.radius + drone.radius) {
        drone.isDead = true;
        const isDread = player.shipClass === 'DREADNOUGHT';
        const dmgTaken = isDread ? 8 : 35;
        const dead = player.takeDamage(dmgTaken);
        this.particleManager.createExplosion(pPos, isDread ? 0xff3300 : 0xff0055, isDread ? 45 : 35, isDread ? 2.0 : 1.0);
        this.spaceAudio.playExplosion();
        this.spaceScene.addScreenShake(isDread ? 0.8 : 1.5);
        if (dead) gameManager.onGameOver('Collision with Enemy Drone');
      }
    });

    gameManager.capitalShips.forEach(ship => {
      if (ship && !ship.isDead && ship.meshGroup && pPos.distanceTo(ship.meshGroup.position) < player.radius + ship.radius) {
        ship.isDead = true;
        const isDread = player.shipClass === 'DREADNOUGHT';
        const dmgTaken = isDread ? 15 : 50;
        const dead = player.takeDamage(dmgTaken);
        this.particleManager.createExplosion(pPos, 0x00aaff, 45);
        this.spaceAudio.playExplosion();
        this.spaceScene.addScreenShake(2.0);
        if (dead) gameManager.onGameOver('Collision with Capital Ship');
      }
    });

    // Asteroids vs Enemy Drones & Capital Ships (Kinetic Debris Physics)
    for (let i = gameManager.asteroids.length - 1; i >= 0; i--) {
      const rock = gameManager.asteroids[i];
      if (!rock || !rock.meshGroup || rock.isDead) continue;

      // Check vs Drones
      for (let j = gameManager.drones.length - 1; j >= 0; j--) {
        const drone = gameManager.drones[j];
        if (!drone || !drone.meshGroup || drone.isDead) continue;

        const dist = rock.meshGroup.position.distanceTo(drone.meshGroup.position);
        if (dist < rock.radius + drone.radius) {
          rock.isDead = true;
          const dead = drone.takeDamage(50);
          this.particleManager.createExplosion(rock.meshGroup.position, 0xffaa00, 20);
          this.spaceAudio.playExplosion();
          if (dead) {
            gameManager.addScore(drone.scoreValue);
            gameManager.addScrap(30);
            gameManager.achievementSystem.recordDroneKill();
            player.onKillHeal();
          }
          break;
        }
      }

      if (rock.isDead) continue;

      // Check vs Capital Ships
      for (let j = gameManager.capitalShips.length - 1; j >= 0; j--) {
        const ship = gameManager.capitalShips[j];
        if (!ship || !ship.meshGroup || ship.isDead) continue;

        const dist = rock.meshGroup.position.distanceTo(ship.meshGroup.position);
        if (dist < rock.radius + ship.radius) {
          rock.isDead = true;
          const dead = ship.takeDamage(100);
          this.particleManager.createExplosion(rock.meshGroup.position, 0xffaa00, 25);
          this.spaceAudio.playExplosion();
          if (dead) {
            gameManager.addScore(ship.scoreValue);
            gameManager.addScrap(80);
            gameManager.achievementSystem.recordDroneKill();
            player.onKillHeal();
          }
          break;
        }
      }
    }

    // 5B. Player Swarm Missiles vs Threats & Bosses
    if (gameManager.playerSwarmMissiles) {
      for (let i = gameManager.playerSwarmMissiles.length - 1; i >= 0; i--) {
        const missile = gameManager.playerSwarmMissiles[i];
        if (!missile || missile.isDead) {
          gameManager.playerSwarmMissiles.splice(i, 1);
          continue;
        }

        const mPos = missile.meshGroup.position;
        let detonated = false;

        // Check vs Drones
        for (let j = gameManager.drones.length - 1; j >= 0; j--) {
          const drone = gameManager.drones[j];
          if (drone && !drone.isDead && drone.meshGroup && mPos.distanceTo(drone.meshGroup.position) < drone.radius + 1.5) {
            const dead = drone.takeDamage(missile.damage);
            if (dead) {
              gameManager.addScore(drone.scoreValue);
              gameManager.addScrap(20);
              gameManager.achievementSystem.recordDroneKill();
              player.onKillHeal();
            }
            detonated = true;
            break;
          }
        }

        // Check vs Asteroids
        if (!detonated) {
          for (let j = gameManager.asteroids.length - 1; j >= 0; j--) {
            const rock = gameManager.asteroids[j];
            if (rock && !rock.isDead && rock.meshGroup && mPos.distanceTo(rock.meshGroup.position) < rock.radius + 1.5) {
              const dead = rock.takeDamage(missile.damage);
              if (dead) {
                gameManager.addScore(rock.scoreValue);
                gameManager.addScrap(15);
                gameManager.achievementSystem.recordAsteroidDestroyed();
                player.onKillHeal();
                const frags = rock.getSplitFragments(player.hasMiningAddon);
                if (frags && frags.length > 0) {
                  gameManager.spawnAsteroidFragments(frags);
                  gameManager.addScrap(25);
                  this.particleManager.createExplosion(rock.meshGroup.position, 0xffea00, 30, 2.0);
                }
              }
              detonated = true;
              break;
            }
          }
        }

        // Check vs Carrier
        if (!detonated && gameManager.carrierBoss && !gameManager.carrierBoss.isDead) {
          const carrier = gameManager.carrierBoss;
          for (let t = 0; t < carrier.turrets.length; t++) {
            const turr = carrier.turrets[t];
            if (!turr.isDead && turr.mesh) {
              const turrPos = carrier.meshGroup.localToWorld(turr.relPos.clone());
              if (mPos.distanceTo(turrPos) < 4.5) {
                const dead = carrier.damageTurret(turr.id, missile.damage);
                if (dead && gameManager.spawnSeveredDebris) gameManager.spawnSeveredDebris(turrPos);
                detonated = true;
                break;
              }
            }
          }
          if (!detonated) {
            for (let s = 0; s < carrier.subsystems.length; s++) {
              const sub = carrier.subsystems[s];
              if (!sub.isDead && sub.mesh) {
                const subPos = carrier.meshGroup.localToWorld(sub.relPos.clone());
                if (mPos.distanceTo(subPos) < 4.8) {
                  const dead = carrier.damageSubsystem(sub.id, missile.damage);
                  if (dead && gameManager.spawnSeveredDebris) gameManager.spawnSeveredDebris(subPos);
                  detonated = true;
                  break;
                }
              }
            }
          }
          if (!detonated && mPos.distanceTo(carrier.meshGroup.position) < carrier.radius) {
            carrier.takeDamage(missile.damage);
            detonated = true;
          }
        }

        // Check vs Active Boss
        if (!detonated && gameManager.activeBoss && !gameManager.activeBoss.isDead) {
          const boss = gameManager.activeBoss;
          if (boss.takeDamage) {
            boss.takeDamage('core', missile.damage);
            detonated = true;
          } else if (boss.takeCoreDamage) {
            boss.takeCoreDamage(missile.damage);
            detonated = true;
          }
        }

        if (detonated) {
          missile.explode();
          this.spaceAudio.playExplosion();
          this.spaceScene.addScreenShake(0.6);
          gameManager.playerSwarmMissiles.splice(i, 1);
        }
      }
    }

    // 6. Planet Impacts
    gameManager.asteroids.forEach(rock => {
      if (rock && rock.impactedPlanet && rock.meshGroup) {
        gameManager.damagePlanet(10);
        this.particleManager.createExplosion(rock.meshGroup.position, 0xffea00, 20);
        this.spaceAudio.playExplosion();
      }
    });

    gameManager.drones.forEach(drone => {
      if (drone && drone.impactedPlanet && drone.meshGroup) {
        gameManager.damagePlanet(15);
        this.particleManager.createExplosion(drone.meshGroup.position, 0xff0055, 25);
        this.spaceAudio.playExplosion();
      }
    });

    gameManager.capitalShips.forEach(ship => {
      if (ship && ship.impactedPlanet && ship.meshGroup) {
        gameManager.damagePlanet(25);
        this.particleManager.createExplosion(ship.meshGroup.position, 0x00aaff, 35);
        this.spaceAudio.playExplosion();
      }
    });
  }
}
