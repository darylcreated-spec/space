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

              if (Math.random() < 0.25) gameManager.spawnPowerUp(rock.meshGroup.position);

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

              if (Math.random() < 0.4) gameManager.spawnPowerUp(drone.meshGroup.position);
            }
            break;
          }
        }

        if (hit) continue;

        // Player Lasers vs Boss Dreadnought
        if (gameManager.activeBoss && !gameManager.activeBoss.isDead && gameManager.activeBoss.meshGroup) {
          const boss = gameManager.activeBoss;
          const bPos = boss.meshGroup.position;
          const distB = lPos.distanceTo(bPos);

          if (distB < 16) {
            laser.destroy();
            gameManager.lasers.splice(i, 1);
            this.particleManager.createExplosion(lPos, 0xffea00, 15);

            let target = 'core';
            if (boss.turretLeftHp > 0) target = 'turretLeft';
            else if (boss.turretRightHp > 0) target = 'turretRight';

            const dead = boss.takeDamage(target, 25);
            if (dead) {
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

      [...gameManager.asteroids, ...gameManager.drones].forEach(target => {
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
  }
}
