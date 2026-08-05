import * as THREE from 'three';

export class CollisionSystem {
  constructor(particleManager, spaceAudio, spaceScene) {
    this.particleManager = particleManager;
    this.spaceAudio = spaceAudio;
    this.spaceScene = spaceScene;
  }

  checkCollisions(gameManager) {
    const player = gameManager.playerShip;
    if (!player || !player.meshGroup) return;
    const pPos = player.meshGroup.position;

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

          const dist = lPos.distanceTo(rock.meshGroup.position);

          if (dist < rock.radius + laser.radius) {
            hit = true;
            laser.destroy();
            gameManager.lasers.splice(i, 1);

            this.particleManager.createExplosion(lPos, 0x00f3ff, 12);
            const dead = rock.takeDamage(25);
            this.spaceAudio.playExplosion();

            if (dead) {
              gameManager.addScore(rock.scoreValue);
              gameManager.addScrap(15);
              gameManager.achievementSystem.recordAsteroidDestroyed();



              const frags = rock.getSplitFragments();
              gameManager.spawnAsteroidFragments(frags);
            }
            break;
          }
        }

        if (hit) continue;

        // Player Lasers vs Enemy Drones
        for (let j = gameManager.drones.length - 1; j >= 0; j--) {
          const drone = gameManager.drones[j];
          if (!drone || !drone.meshGroup || drone.isDead) continue;

          const dist = lPos.distanceTo(drone.meshGroup.position);

          if (dist < drone.radius + laser.radius) {
            hit = true;
            laser.destroy();
            gameManager.lasers.splice(i, 1);

            this.particleManager.createExplosion(lPos, 0xff0055, 18);
            const dead = drone.takeDamage(20);
            this.spaceAudio.playExplosion();

            if (dead) {
              gameManager.addScore(drone.scoreValue);
              gameManager.addScrap(30);
              gameManager.achievementSystem.recordDroneKill();


            }
            break;
          }
        }

        // Player Lasers vs Capital Ships
        if (gameManager.capitalShips && gameManager.capitalShips.length > 0) {
          for (let j = gameManager.capitalShips.length - 1; j >= 0; j--) {
            const ship = gameManager.capitalShips[j];
            if (!ship || !ship.meshGroup || ship.isDead) continue;

            const dist = lPos.distanceTo(ship.meshGroup.position);
            if (dist < ship.radius + laser.radius) {
              hit = true;
              laser.destroy();
              gameManager.lasers.splice(i, 1);

              this.particleManager.createExplosion(lPos, 0x00aaff, 22);
              const dead = ship.takeDamage(20);
              this.spaceAudio.playExplosion();

              if (dead) {
                gameManager.addScore(ship.scoreValue);
                gameManager.addScrap(80);
                gameManager.achievementSystem.recordDroneKill();

              }
              break;
            }
          }
        }

        if (hit) continue;

        // Player Lasers vs Boss (SpaceStation / HaloRingBoss / Babylon5Boss / BossDreadnought)
        if (gameManager.activeBoss && !gameManager.activeBoss.isDead && gameManager.activeBoss.meshGroup) {
          const boss = gameManager.activeBoss;
          const bPos = boss.meshGroup.position;
          const distB = lPos.distanceTo(bPos);

          // Dynamic hit radius — large bosses need bigger collision zones
          const bossHitRadius = boss.hitRadius || 28;

          if (distB < bossHitRadius) {
            laser.destroy();
            gameManager.lasers.splice(i, 1);
            this.particleManager.createExplosion(lPos, 0xffea00, 15);

            let dead = false;

            // Modern boss API: turrets[] array + takeCoreDamage()
            if (boss.turrets && Array.isArray(boss.turrets)) {
              // Try to find and damage the first living turret near the hit
              const livingTurrets = boss.turrets.filter(t => !t.isDead && t.mesh);
              let hitTurret = null;
              let closestDist = Infinity;
              for (const t of livingTurrets) {
                const tPos = t.mesh.getWorldPosition(new THREE.Vector3());
                const td = lPos.distanceTo(tPos);
                if (td < closestDist) { closestDist = td; hitTurret = t; }
              }
              if (hitTurret && closestDist < 12) {
                boss.takeTurretDamage(hitTurret.id, 25);
              } else {
                dead = boss.takeCoreDamage(25);
              }
            } else if (boss.takeDamage) {
              // Legacy BossDreadnought API
              let target = 'core';
              if (boss.turretLeftHp > 0) target = 'turretLeft';
              else if (boss.turretRightHp > 0) target = 'turretRight';
              dead = boss.takeDamage(target, 25);
            } else if (boss.takeCoreDamage) {
              dead = boss.takeCoreDamage(25);
            }

            if (dead || boss.isDead) {
              gameManager.addScore(boss.scoreValue);
              gameManager.addScrap(300);
              gameManager.achievementSystem.recordBossKilled();
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

      [...gameManager.asteroids, ...gameManager.drones, ...gameManager.capitalShips].forEach(target => {
        if (target && !target.isDead && target.meshGroup && pulsePos.distanceTo(target.meshGroup.position) < target.radius + pulse.radius + 1.0) {
          hitTarget = true;
        }
      });

      if (gameManager.activeBoss && !gameManager.activeBoss.isDead && gameManager.activeBoss.meshGroup) {
        if (pulsePos.distanceTo(gameManager.activeBoss.meshGroup.position) < 22) {
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
