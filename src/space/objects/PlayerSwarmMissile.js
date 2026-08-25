import * as THREE from 'three';

export class PlayerSwarmMissile {
  constructor(scene, startPos, target, particleManager, gameManager = null, themeColor = 0x00f3ff) {
    this.scene = scene;
    this.particleManager = particleManager;
    this.gameManager = gameManager || (typeof window !== 'undefined' ? window.spaceGameManager : null);
    this.target = target;
    this.themeColor = themeColor;
    this.isDead = false;
    this.damage = 195;
    this.speed = 55.0;
    this.maxSpeed = 98.0;
    this.life = 4.2;
    this._time = 0;

    this.meshGroup = new THREE.Group();
    this.meshGroup.position.copy(startPos);

    // Initial outward arc ejection impulse (VLS / Wing Pod Launch)
    const arcX = (Math.random() - 0.5) * 22.0;
    const arcY = (Math.random() - 0.2) * 16.0;
    this.velocity = new THREE.Vector3(arcX, arcY, -28.0);

    // ── 1. 3D Aerodynamic Homing Micro-Missile Mesh ──
    // Cylindrical Missile Fuselage
    const bodyGeo = new THREE.CylinderGeometry(0.14, 0.16, 2.2, 8);
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x141820,
      metalness: 0.95,
      roughness: 0.2,
      emissive: themeColor,
      emissiveIntensity: 0.35
    });
    this.meshGroup.add(new THREE.Mesh(bodyGeo, bodyMat));

    // Explosive Ogive Seeker Nose Cone
    const noseGeo = new THREE.ConeGeometry(0.18, 0.75, 8);
    noseGeo.rotateX(-Math.PI / 2);
    const noseMat = new THREE.MeshStandardMaterial({
      color: 0xff3300,
      emissive: 0xff1100,
      emissiveIntensity: 0.6,
      metalness: 0.9,
      roughness: 0.2
    });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, 0, -1.35);
    this.meshGroup.add(nose);

    // Infrared Optical Seeker Lens
    const seeker = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffea00 })
    );
    seeker.position.set(0, 0, -1.75);
    this.meshGroup.add(seeker);

    // 4 Cruciform Delta Stabilizer Fins
    const finMat = new THREE.MeshStandardMaterial({ color: 0x222832, metalness: 0.96 });
    const finGeo = new THREE.BoxGeometry(0.03, 0.55, 0.45);

    const finVert = new THREE.Mesh(finGeo, finMat);
    finVert.position.set(0, 0, 0.75);
    this.meshGroup.add(finVert);

    const finHoriz = new THREE.Mesh(finGeo, finMat);
    finHoriz.rotation.z = Math.PI / 2;
    finHoriz.position.set(0, 0, 0.75);
    this.meshGroup.add(finHoriz);

    // Rocket Exhaust Nozzle & Flame Cone
    const nozzle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.15, 0.3, 8),
      new THREE.MeshStandardMaterial({ color: 0x0a0c10, metalness: 0.98 })
    );
    nozzle.rotateX(Math.PI / 2);
    nozzle.position.set(0, 0, 1.15);
    this.meshGroup.add(nozzle);

    const flameGeo = new THREE.ConeGeometry(0.16, 0.9, 8);
    flameGeo.rotateX(Math.PI / 2);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff9900, transparent: true, opacity: 0.9 });
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.set(0, 0, 1.6);
    this.meshGroup.add(flame);

    this.scene.add(this.meshGroup);
  }

  findNearestTarget() {
    const gm = this.gameManager || (typeof window !== 'undefined' ? window.spaceGameManager : null);
    if (!gm) return null;

    const curPos = this.meshGroup.position;
    let closestTarget = null;
    let minDistanceSq = Infinity;

    const testTarget = (t) => {
      if (!t || t.isDead) return;
      let pos = null;
      if (t.meshGroup) pos = t.meshGroup.position;
      else if (t.mesh) {
        pos = new THREE.Vector3();
        t.mesh.getWorldPosition(pos);
      } else if (t.position) pos = t.position;

      if (pos) {
        const dSq = curPos.distanceToSquared(pos);
        if (dSq < minDistanceSq) {
          minDistanceSq = dSq;
          closestTarget = t;
        }
      }
    };

    // Check all active hostiles
    if (gm.drones) gm.drones.forEach(testTarget);
    if (gm.stealthFighters) gm.stealthFighters.forEach(testTarget);
    if (gm.heavyBattleships) {
      gm.heavyBattleships.forEach(b => {
        if (!b.isDead) {
          if (b.turrets) b.turrets.forEach(testTarget);
          testTarget(b);
        }
      });
    }
    if (gm.carrierBoss && !gm.carrierBoss.isDead) {
      if (gm.carrierBoss.turrets) gm.carrierBoss.turrets.forEach(testTarget);
      if (gm.carrierBoss.subsystems) gm.carrierBoss.subsystems.forEach(testTarget);
      testTarget(gm.carrierBoss);
    }
    if (gm.activeBoss && !gm.activeBoss.isDead) {
      if (gm.activeBoss.generators) gm.activeBoss.generators.forEach(testTarget);
      if (gm.activeBoss.turrets) gm.activeBoss.turrets.forEach(testTarget);
      testTarget(gm.activeBoss);
    }
    if (gm.asteroids) {
      gm.asteroids.forEach(a => {
        if (!a.isDead && a.meshGroup && a.meshGroup.position.z < curPos.z + 10) {
          testTarget(a);
        }
      });
    }

    return closestTarget;
  }

  getTargetPosition() {
    if (!this.target || this.target.isDead) {
      this.target = this.findNearestTarget();
    }
    if (!this.target || this.target.isDead) return null;

    if (this.target.meshGroup) return this.target.meshGroup.position;
    if (this.target.mesh) {
      const p = new THREE.Vector3();
      this.target.mesh.getWorldPosition(p);
      return p;
    }
    if (this.target.position) return this.target.position;
    return null;
  }

  update(dt) {
    if (this.isDead) return;
    this._time += dt;
    this.life -= dt;
    if (this.life <= 0) {
      this.explode();
      return;
    }

    // Accelerate smoothly along motor burn
    this.speed = Math.min(this.maxSpeed, this.speed + dt * 38.0);

    const tPos = this.getTargetPosition();
    const curPos = this.meshGroup.position;

    // High-G Proportional Navigation Guidance
    if (tPos && this._time > 0.12) {
      const desiredDir = new THREE.Vector3().subVectors(tPos, curPos).normalize();
      const steerSpeed = Math.min(16.0, 5.0 + this._time * 10.0);
      this.velocity.lerp(desiredDir.multiplyScalar(this.speed), steerSpeed * dt);
    } else {
      // Forward cruising thrust if no current target locked
      const fwd = new THREE.Vector3(0, 0, -1);
      this.velocity.lerp(fwd.multiplyScalar(this.speed), 4.0 * dt);
    }

    curPos.addScaledVector(this.velocity, dt);

    if (this.velocity.lengthSq() > 0.01) {
      const lookTarget = curPos.clone().add(this.velocity);
      this.meshGroup.lookAt(lookTarget);
    }

    // Rocket Motor Fire and Smoke Particle Trails
    if (this.particleManager) {
      this.particleManager.spawnEngineParticle(curPos, 0xff5500);
      if (Math.random() < 0.6) {
        this.particleManager.spawnEngineParticle(curPos, 0xffaa00);
      }
    }
  }

  explode() {
    if (this.particleManager) {
      this.particleManager.createExplosion(this.meshGroup.position, 0xff3300, 48, 2.2);
      this.particleManager.createEmpShockwave(this.meshGroup.position, 18);
    }
    this.destroy();
  }

  destroy() {
    this.isDead = true;
    this.scene.remove(this.meshGroup);
    this.meshGroup.traverse(c => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    });
  }
}
