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
          if (dist < rock.radius + laser.radius) {
            laser.hitEntities.add(rock.meshGroup.uuid);
            let dmg = 25;
            if (laser.isCritical) {
              dmg *= 3;
              this.particleManager.createExplosion(lPos, 0xff0044, 25);
            } else {
              this.particleManager.createExplosion(lPos, 0x00f3ff, 12);
            }
            if (laser.hitEntities.size > 1) dmg *= 0.5;

            const dead = rock.takeDamage(dmg);
            this.spaceAudio.playExplosion();

            if (dead) {
              gameManager.addScore(rock.scoreValue);
              gameManager.addScrap(15);
              gameManager.achievementSystem.recordAsteroidDestroyed();
              player.onKillHeal();
              const frags = rock.getSplitFragments();
              gameManager.spawnAsteroidFragments(frags);
            }

            if (!gameManager.activePerks.has('piercing')) {
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
          if (dist < drone.radius + laser.radius) {
            laser.hitEntities.add(drone.meshGroup.uuid);
            let dmg = 20;
            if (laser.isCritical) {
              dmg *= 3;
              this.particleManager.createExplosion(lPos, 0xff0044, 28);
            } else {
              this.particleManager.createExplosion(lPos, 0xff0055, 18);
            }
            if (laser.hitEntities.size > 1) dmg *= 0.5;

            const dead = drone.takeDamage(dmg);
            this.spaceAudio.playExplosion();

            if (dead) {
              gameManager.addScore(drone.scoreValue);
              gameManager.addScrap(30);
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
            const bossHitRadius = boss.hitRadius || 28;

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

              if (boss.turrets && Array.isArray(boss.turrets)) {
                const livingTurrets = boss.turrets.filter(t => t && !t.isDead && t.mesh);
                let hitTurret = null;
                let closestDist = Infinity;
                for (const t of livingTurrets) {
                  if (t.mesh) {
                    t.mesh.updateMatrixWorld(true);
                    const tPos = t.mesh.getWorldPosition(this._tempVec1);
                    const td = lPos.distanceTo(tPos);
                    if (td < closestDist) { closestDist = td; hitTurret = t; }
                  }
                }
                if (hitTurret && closestDist < 12) {
                  if (!laser.hitEntities.has(hitTurret.id)) {
                    laser.hitEntities.add(hitTurret.id);
                    boss.takeTurretDamage(hitTurret.id, dmg);
                    hitRegistered = true;
                  }
                } else {
                  if (!laser.hitEntities.has('boss_core')) {
                    laser.hitEntities.add('boss_core');
                    dead = boss.takeCoreDamage(dmg);
                    hitRegistered = true;
                  }
                }
              } else {
                if (!laser.hitEntities.has('boss_core')) {
                  laser.hitEntities.add('boss_core');
                  let target = 'core';
                  if (boss.turretLeftHp > 0) target = 'turretLeft';
                  else if (boss.turretRightHp > 0) target = 'turretRight';
                  dead = boss.takeDamage ? boss.takeDamage(target, dmg) : (boss.takeCoreDamage ? boss.takeCoreDamage(dmg) : false);
                  hitRegistered = true;
                }
              }

              if (hitRegistered) {
                if (dead || boss.isDead) {
                  gameManager.addScore(boss.scoreValue);
                  gameManager.addScrap(300);
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

        // Carrier Capital Ship Laser Hit Check
        if (gameManager.carrierBoss && !gameManager.carrierBoss.isDead && gameManager.carrierBoss.meshGroup) {
          const carrier = gameManager.carrierBoss;
          const distC = lPos.distanceTo(carrier.meshGroup.position);
          if (distC < carrier.hitRadius) {
            this.particleManager.createExplosion(lPos, 0x00f3ff, 15);
            let dmg = laser.isCritical ? 75 : 25;
            const dead = carrier.takeDamage(dmg);
            if (dead) {
              gameManager.addScore(carrier.scoreValue);
              gameManager.addScrap(300);
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
          if (pulsePos.distanceTo(carrier.meshGroup.position) < pulse.aoeRadius + 10) {
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
      if (Math.abs(pPos.x - bPos.x) < 6.5 && Math.abs(pPos.y - bPos.y) < 6.5) {
        player.takeDamage(9999);
        this.particleManager.createExplosion(pPos, 0x00f3ff, 150, 4.0);
        this.particleManager.createExplosion(pPos, 0xff0055, 100, 3.0);
        this.spaceAudio.playExplosion();
        this.spaceScene.addScreenShake(3.5);
        gameManager.onGameOver('Vaporized by Moon Base Superlaser');
        return;
      }
    }

    // 5. Direct Player Collisions with Threats
    gameManager.asteroids.forEach(rock => {
      if (rock && !rock.isDead && rock.meshGroup && pPos.distanceTo(rock.meshGroup.position) < player.radius + rock.radius) {
        rock.isDead = true;
        const dead = player.takeDamage(25);
        this.particleManager.createExplosion(pPos, 0xff0055, 30);
        this.spaceAudio.playExplosion();
        this.spaceScene.addScreenShake(1.2);
        if (dead) gameManager.onGameOver('Collision with Asteroid');
      }
    });

    gameManager.drones.forEach(drone => {
      if (drone && !drone.isDead && drone.meshGroup && pPos.distanceTo(drone.meshGroup.position) < player.radius + drone.radius) {
        drone.isDead = true;
        const dead = player.takeDamage(35);
        this.particleManager.createExplosion(pPos, 0xff0055, 35);
        this.spaceAudio.playExplosion();
        this.spaceScene.addScreenShake(1.5);
        if (dead) gameManager.onGameOver('Collision with Enemy Drone');
      }
    });

    gameManager.capitalShips.forEach(ship => {
      if (ship && !ship.isDead && ship.meshGroup && pPos.distanceTo(ship.meshGroup.position) < player.radius + ship.radius) {
        ship.isDead = true;
        const dead = player.takeDamage(50);
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
