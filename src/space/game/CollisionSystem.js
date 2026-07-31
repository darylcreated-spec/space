export class CollisionSystem {
  constructor(particleManager, spaceAudio, spaceScene) {
    this.particleManager = particleManager;
    this.spaceAudio = spaceAudio;
    this.spaceScene = spaceScene;
  }

  checkCollisions(gameManager) {
    const { playerShip, asteroids, drones, lasers, torpedoes, activeEmpPulse } = gameManager;

    // 1. Player Lasers vs Asteroids & Drones
    for (let i = lasers.length - 1; i >= 0; i--) {
      const laser = lasers[i];
      if (laser.isEnemy || laser.isDead) continue;

      const laserPos = laser.mesh.position;

      // Check vs Asteroids
      for (const rock of asteroids) {
        if (rock.isDead) continue;
        const dist = laserPos.distanceTo(rock.meshGroup.position);
        if (dist < laser.radius + rock.radius) {
          laser.isDead = true;
          const killed = rock.takeDamage(laser.damage);
          this.particleManager.createExplosion(laserPos, 0x00f3ff, 15, 0.5);
          this.spaceAudio.playLaserHit();

          if (killed) {
            gameManager.addScore(rock.scoreValue);
            this.particleManager.createExplosion(rock.meshGroup.position, 0x5a6375, 40, 1.2);
            // Spawn split fragment rocks
            const newFragments = rock.getSplitFragments();
            gameManager.spawnAsteroidFragments(newFragments);
          }
          break;
        }
      }

      if (laser.isDead) continue;

      // Check vs Enemy Drones
      for (const drone of drones) {
        if (drone.isDead) continue;
        const dist = laserPos.distanceTo(drone.meshGroup.position);
        if (dist < laser.radius + drone.radius) {
          laser.isDead = true;
          const killed = drone.takeDamage(laser.damage);
          this.particleManager.createExplosion(laserPos, 0xff0055, 20, 0.6);
          this.spaceAudio.playLaserHit();

          if (killed) {
            gameManager.addScore(drone.scoreValue);
            this.particleManager.createExplosion(drone.meshGroup.position, 0xff0077, 50, 1.5);
            gameManager.totalKills++;
          }
          break;
        }
      }
    }

    // 2. Torpedoes vs Targets (AoE Explosion)
    for (let i = torpedoes.length - 1; i >= 0; i--) {
      const torpedo = torpedoes[i];
      if (torpedo.isDead) continue;

      const torpPos = torpedo.meshGroup.position;
      let impacted = false;

      // Check vs Asteroids
      for (const rock of asteroids) {
        if (rock.isDead) continue;
        if (torpPos.distanceTo(rock.meshGroup.position) < torpedo.radius + rock.radius) {
          impacted = true;
          break;
        }
      }

      // Check vs Drones
      if (!impacted) {
        for (const drone of drones) {
          if (drone.isDead) continue;
          if (torpPos.distanceTo(drone.meshGroup.position) < torpedo.radius + drone.radius) {
            impacted = true;
            break;
          }
        }
      }

      if (impacted) {
        torpedo.isDead = true;
        this.particleManager.createExplosion(torpPos, 0xffea00, 70, 2.2);
        this.spaceAudio.playTorpedoExplode();
        this.spaceScene.addScreenShake(1.2);

        // Apply AoE Damage to all nearby entities
        for (const rock of asteroids) {
          if (rock.isDead) continue;
          const d = torpPos.distanceTo(rock.meshGroup.position);
          if (d < torpedo.aoeRadius) {
            const killed = rock.takeDamage(torpedo.damage);
            if (killed) {
              gameManager.addScore(rock.scoreValue);
              this.particleManager.createExplosion(rock.meshGroup.position, 0x5a6375, 30, 1.0);
              gameManager.spawnAsteroidFragments(rock.getSplitFragments());
            }
          }
        }

        for (const drone of drones) {
          if (drone.isDead) continue;
          const d = torpPos.distanceTo(drone.meshGroup.position);
          if (d < torpedo.aoeRadius) {
            const killed = drone.takeDamage(torpedo.damage);
            if (killed) {
              gameManager.addScore(drone.scoreValue);
              this.particleManager.createExplosion(drone.meshGroup.position, 0xff0077, 45, 1.4);
              gameManager.totalKills++;
            }
          }
        }
      }
    }

    // 3. Active EMP Pulse Wave Shockwave vs Entities
    if (activeEmpPulse) {
      const pPos = playerShip.meshGroup.position;
      const radius = activeEmpPulse.currentRadius;

      // Destroys nearby asteroids and repels/damages drones
      for (const rock of asteroids) {
        if (rock.isDead) continue;
        const d = pPos.distanceTo(rock.meshGroup.position);
        if (Math.abs(d - radius) < 2.5) {
          rock.takeDamage(100);
          this.particleManager.createExplosion(rock.meshGroup.position, 0x00f3ff, 25, 0.8);
          gameManager.addScore(rock.scoreValue);
        }
      }

      for (const drone of drones) {
        if (drone.isDead) continue;
        const d = pPos.distanceTo(drone.meshGroup.position);
        if (Math.abs(d - radius) < 2.5) {
          drone.takeDamage(40);
          // Push drone backward
          drone.meshGroup.position.z -= 10;
          this.particleManager.createExplosion(drone.meshGroup.position, 0x00f3ff, 30, 1.0);
        }
      }
    }

    // 4. Enemy Plasma Bolts vs Player Ship
    for (const laser of lasers) {
      if (!laser.isEnemy || laser.isDead) continue;

      const dPlayer = laser.mesh.position.distanceTo(playerShip.meshGroup.position);
      if (dPlayer < laser.radius + playerShip.radius) {
        laser.isDead = true;
        const killed = playerShip.takeDamage(12);
        this.particleManager.createExplosion(laser.mesh.position, 0xff0055, 20, 0.6);
        this.spaceAudio.playShipDamage();
        this.spaceAudio.vibrate([40, 20, 40]);
        this.spaceScene.addScreenShake(0.6);

        if (killed) {
          gameManager.onGameOver('Player Shield Depleted');
        }
      }
    }

    // 5. Threat Impacts vs Player Ship or Home Planet
    for (const rock of asteroids) {
      if (rock.isDead) continue;

      // Check vs Player Ship
      const dShip = rock.meshGroup.position.distanceTo(playerShip.meshGroup.position);
      if (dShip < rock.radius + playerShip.radius) {
        rock.isDead = true;
        this.particleManager.createExplosion(rock.meshGroup.position, 0xffea00, 40, 1.5);
        const killed = playerShip.takeDamage(25);
        this.spaceAudio.playShipDamage();
        this.spaceAudio.vibrate(150);
        this.spaceScene.addScreenShake(1.0);

        if (killed) gameManager.onGameOver('Collision with Asteroid');
      } else if (rock.impactedPlanet) {
        // Impacted Planet!
        gameManager.damagePlanet(15);
        this.particleManager.createExplosion(rock.meshGroup.position, 0xff0055, 60, 2.0);
        this.spaceAudio.playPlanetImpact();
        this.spaceAudio.vibrate([100, 50, 150]);
        this.spaceScene.addScreenShake(1.5);
      }
    }

    for (const drone of drones) {
      if (drone.isDead) continue;

      const dShip = drone.meshGroup.position.distanceTo(playerShip.meshGroup.position);
      if (dShip < drone.radius + playerShip.radius) {
        drone.isDead = true;
        this.particleManager.createExplosion(drone.meshGroup.position, 0xff0077, 45, 1.6);
        const killed = playerShip.takeDamage(30);
        this.spaceAudio.playShipDamage();
        this.spaceAudio.vibrate(200);

        if (killed) gameManager.onGameOver('Collision with Enemy Drone');
      } else if (drone.impactedPlanet) {
        gameManager.damagePlanet(20);
        this.particleManager.createExplosion(drone.meshGroup.position, 0xff0055, 60, 2.0);
        this.spaceAudio.playPlanetImpact();
        this.spaceAudio.vibrate([100, 50, 150]);
      }
    }
  }
}
