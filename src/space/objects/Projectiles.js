import * as THREE from 'three';

// â”€â”€ Shared Cache for LaserBolt Geometries & Materials â”€â”€
const laserGeoCache = {};
const laserMatCache = {};

function getLaserGeometries(type = 'STANDARD', isEnemy = false) {
  const key = `${type}_${isEnemy ? 'enemy' : 'player'}`;
  if (!laserGeoCache[key]) {
    let len = isEnemy ? 2.8 : 3.6;
    let radius = isEnemy ? 0.16 : 0.13;
    let glowRadius = isEnemy ? 0.42 : 0.32;

    if (type === 'FLAK') {
      len = 2.4;
      radius = 0.45;
      glowRadius = 0.95;
    } else if (type === 'CRIT_DART') {
      len = 4.8;
      radius = 0.08;
      glowRadius = 0.22;
    } else if (type === 'HOMING') {
      len = 2.2;
      radius = 0.22;
      glowRadius = 0.55;
    }
    
    const beamGeo = new THREE.CylinderGeometry(radius, radius, len, 8);
    beamGeo.rotateX(Math.PI / 2);

    const glowGeo = new THREE.CylinderGeometry(glowRadius, glowRadius, len * 0.85, 8);
    glowGeo.rotateX(Math.PI / 2);

    const coreGeo = new THREE.CylinderGeometry(radius * 0.45, radius * 0.45, len * 1.1, 6);
    coreGeo.rotateX(Math.PI / 2);

    const muzzleGeo = new THREE.SphereGeometry(radius * 1.5, 8, 8);

    laserGeoCache[key] = { beamGeo, glowGeo, coreGeo, muzzleGeo, len };
  }
  return laserGeoCache[key];
}

function getLaserMaterial(colorHex, transparent = false, opacity = 1.0) {
  const key = `${colorHex}_${transparent}_${opacity}`;
  if (!laserMatCache[key]) {
    laserMatCache[key] = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent,
      opacity
    });
  }
  return laserMatCache[key];
}

export class LaserBolt {
  constructor(scene, startPos, colorHex = 0x00f3ff, isEnemy = false, targetDir = null, projectileType = 'STANDARD', gameManager = null) {
    this.scene = scene;
    this.gameManager = gameManager;
    this.meshGroup = new THREE.Group();
    this.hitEntities = new Set();
    this.reset(startPos, colorHex, isEnemy, targetDir, projectileType);
    this.scene.add(this.meshGroup);
  }

  reset(startPos, colorHex = 0x00f3ff, isEnemy = false, targetDir = null, projectileType = 'STANDARD', gameManager = null) {
    if (gameManager) this.gameManager = gameManager;
    else if (!this.gameManager && typeof window !== 'undefined' && window.spaceGameManager) {
      this.gameManager = window.spaceGameManager;
    }
    this.isEnemy = isEnemy;
    this.projectileType = projectileType;
    this.isDead = false;
    this.isCritical = false;
    this.isAoe = false;
    this.isSiphon = false;
    this.appliesEmp = false;
    this.aoeRadius = 0;

    if (this.hitEntities) this.hitEntities.clear();
    else this.hitEntities = new Set();

    this.meshGroup.position.copy(startPos);
    this.meshGroup.visible = true;

    // Archetype-Specific Weapon Properties
    if (isEnemy) {
      this.damage = 15;
      this.speed = 52;
      this.radius = 1.4;
    } else if (projectileType === 'FLAK') {
      this.damage = 130;
      this.speed = 85;
      this.radius = 2.4;
      this.isAoe = true;
      this.aoeRadius = 8.0;
    } else if (projectileType === 'HOMING') {
      this.damage = 32;
      this.speed = 95;
      this.radius = 1.6;
      this.appliesEmp = true;
      this.homingTarget = null;
    } else if (projectileType === 'CRIT_DART') {
      this.isSiphon = true;
      this.speed = 135;
      this.radius = 1.2;
      const isCrit = Math.random() < 0.35;
      this.isCritical = isCrit;
      this.damage = isCrit ? 75 : 25;
      if (isCrit) colorHex = 0xff00ff; // Bright neon magenta on crit
    } else {
      // STANDARD / INTERCEPTOR
      this.damage = 22;
      this.speed = 115;
      this.radius = 1.4;
    }

    if (targetDir) {
      this.direction = targetDir.clone().normalize();
      this.meshGroup.lookAt(new THREE.Vector3().addVectors(startPos, this.direction));
    } else {
      this.direction = new THREE.Vector3(0, 0, isEnemy ? 1 : -1);
      if (isEnemy) this.meshGroup.rotation.y = Math.PI;
      else this.meshGroup.rotation.set(0, 0, 0);
    }

    // Rebuild mesh children for specific projectile geometry
    while (this.meshGroup.children.length > 0) {
      this.meshGroup.remove(this.meshGroup.children[0]);
    }

    if (projectileType === 'FLAK') {
      // 1. Aerodynamic Rocket Body (Dark metallic alloy)
      const bodyGeo = new THREE.CylinderGeometry(0.18, 0.18, 2.4, 8);
      bodyGeo.rotateX(Math.PI / 2);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x1a1c22,
        metalness: 0.94,
        roughness: 0.2
      });
      this.meshGroup.add(new THREE.Mesh(bodyGeo, bodyMat));

      // 2. Heavy Explosive Ogive Warhead Nose
      const warheadGeo = new THREE.ConeGeometry(0.22, 0.85, 8);
      warheadGeo.rotateX(-Math.PI / 2);
      const warheadMat = new THREE.MeshStandardMaterial({
        color: 0xff3300,
        emissive: 0xff1100,
        emissiveIntensity: 0.5,
        metalness: 0.88,
        roughness: 0.22
      });
      const warhead = new THREE.Mesh(warheadGeo, warheadMat);
      warhead.position.set(0, 0, -1.45);
      this.meshGroup.add(warhead);

      // 3. Optical Seeker Lens
      const seeker = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffea00 })
      );
      seeker.position.set(0, 0, -1.9);
      this.meshGroup.add(seeker);

      // 4. Cruciform Delta Stabilizer Fins
      const finMat = new THREE.MeshStandardMaterial({ color: 0x2e323b, metalness: 0.96 });
      const finGeo = new THREE.BoxGeometry(0.04, 0.65, 0.55);
      
      const finVert = new THREE.Mesh(finGeo, finMat);
      finVert.position.set(0, 0, 0.8);
      this.meshGroup.add(finVert);

      const finHoriz = new THREE.Mesh(finGeo, finMat);
      finHoriz.rotation.z = Math.PI / 2;
      finHoriz.position.set(0, 0, 0.8);
      this.meshGroup.add(finHoriz);

      // 5. Rocket Thruster Nozzle & Flame Cone
      const nozzle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.18, 0.35, 8),
        new THREE.MeshStandardMaterial({ color: 0x0a0a0c, metalness: 0.95 })
      );
      nozzle.rotateX(Math.PI / 2);
      nozzle.position.set(0, 0, 1.25);
      this.meshGroup.add(nozzle);

      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.18, 0.95, 8),
        new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.9 })
      );
      flame.rotateX(Math.PI / 2);
      flame.position.set(0, 0, 1.7);
      this.meshGroup.add(flame);
    } else if (projectileType === 'HOMING') {
      // 1. Aerodynamic Plasma Dart Needle Fuselage
      const bodyGeo = new THREE.CylinderGeometry(0.12, 0.14, 2.4, 8);
      bodyGeo.rotateX(Math.PI / 2);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x06281a,
        metalness: 0.94,
        roughness: 0.18,
        emissive: 0x004422,
        emissiveIntensity: 0.6
      });
      this.meshGroup.add(new THREE.Mesh(bodyGeo, bodyMat));

      // 2. Ogive Tachyon Focus Nose Tip
      const warheadGeo = new THREE.ConeGeometry(0.18, 0.75, 8);
      warheadGeo.rotateX(-Math.PI / 2);
      const warheadMat = new THREE.MeshStandardMaterial({
        color: 0x00ff88,
        emissive: 0x00ff88,
        emissiveIntensity: 1.2,
        roughness: 0.1
      });
      const warhead = new THREE.Mesh(warheadGeo, warheadMat);
      warhead.position.set(0, 0, -1.45);
      this.meshGroup.add(warhead);

      // 3. Dual Concentric Electromagnetic Induction Rings
      [-0.4, 0.4].forEach((rz, i) => {
        const ringGeo = new THREE.TorusGeometry(0.24, 0.03, 6, 16);
        const ringMat = new THREE.MeshBasicMaterial({ color: i === 0 ? 0x00ff88 : 0x00f3ff });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.set(0, 0, rz);
        this.meshGroup.add(ring);
      });

      // 4. Cruciform Plasma Stabilizer Fins
      const finMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
      const finGeo = new THREE.BoxGeometry(0.03, 0.5, 0.45);

      const finV = new THREE.Mesh(finGeo, finMat);
      finV.position.set(0, 0, 0.85);
      this.meshGroup.add(finV);

      const finH = new THREE.Mesh(finGeo, finMat);
      finH.rotation.z = Math.PI / 2;
      finH.position.set(0, 0, 0.85);
      this.meshGroup.add(finH);

      // 5. Tachyon Nozzle Glow
      const glowLens = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x00ff88 })
      );
      glowLens.position.set(0, 0, 1.25);
      this.meshGroup.add(glowLens);
    } else {
      const geos = getLaserGeometries(projectileType, isEnemy);

      // Beam
      this.beamMesh = new THREE.Mesh(geos.beamGeo, getLaserMaterial(colorHex));
      this.meshGroup.add(this.beamMesh);

      // Glow
      this.glowMesh = new THREE.Mesh(geos.glowGeo, getLaserMaterial(colorHex, true, 0.25));
      this.meshGroup.add(this.glowMesh);

      // Core
      this.coreMesh = new THREE.Mesh(geos.coreGeo, getLaserMaterial(0xffffff));
      this.meshGroup.add(this.coreMesh);

      // Muzzle
      this.muzzleMesh = new THREE.Mesh(geos.muzzleGeo, getLaserMaterial(this.isCritical ? 0xff00ff : 0xffffff));
      this.muzzleMesh.position.z = -geos.len / 2;
      this.meshGroup.add(this.muzzleMesh);
    }
  }

  destroy() {
    this.isDead = true;
    this.meshGroup.visible = false;
  }

  update(dt) {
    if (this.isDead) return;

    const gm = this.gameManager || (typeof window !== 'undefined' ? window.spaceGameManager : null);

    // Dynamic Rocket Motor Exhaust for Heavy Missiles
    if (this.projectileType === 'FLAK' && gm && gm.particleManager) {
      gm.particleManager.spawnEngineParticle(this.meshGroup.position, 0xff4400);
      if (Math.random() < 0.6) {
        gm.particleManager.spawnEngineParticle(this.meshGroup.position, 0xffaa00);
      }
    }

    // Dynamic Tachyon Spark Trail for Homing Plasma Darts
    if (this.projectileType === 'HOMING' && gm && gm.particleManager) {
      gm.particleManager.spawnEngineParticle(this.meshGroup.position, 0x00ff88);
      if (Math.random() < 0.5) {
        gm.particleManager.spawnEngineParticle(this.meshGroup.position, 0x00f3ff);
      }
    }

    // Homing Steering Logic for TACTICIAN seeking plasma
    if (this.projectileType === 'HOMING' && !this.isEnemy && gm) {
      if (!this.homingTarget || this.homingTarget.isDead) {
        let nearest = null;
        let minDist = 85;
        
        // Check drones
        if (gm.drones) {
          for (let d of gm.drones) {
            if (!d.isDead && d.meshGroup && d.meshGroup.position.z < this.meshGroup.position.z) {
              const dist = this.meshGroup.position.distanceTo(d.meshGroup.position);
              if (dist < minDist) { minDist = dist; nearest = d; }
            }
          }
        }
        // Check stealth fighters
        if (!nearest && gm.stealthFighters) {
          for (let s of gm.stealthFighters) {
            if (!s.isDead && s.meshGroup && s.meshGroup.position.z < this.meshGroup.position.z) {
              const dist = this.meshGroup.position.distanceTo(s.meshGroup.position);
              if (dist < minDist) { minDist = dist; nearest = s; }
            }
          }
        }
        // Check heavy battleships
        if (!nearest && gm.heavyBattleships) {
          for (let b of gm.heavyBattleships) {
            if (!b.isDead && b.meshGroup && b.meshGroup.position.z < this.meshGroup.position.z) {
              const dist = this.meshGroup.position.distanceTo(b.meshGroup.position);
              if (dist < minDist) { minDist = dist; nearest = b; }
            }
          }
        }
        // Check asteroids
        if (!nearest && gm.asteroids) {
          for (let a of gm.asteroids) {
            if (!a.isDead && a.meshGroup && a.meshGroup.position.z < this.meshGroup.position.z) {
              const dist = this.meshGroup.position.distanceTo(a.meshGroup.position);
              if (dist < minDist) { minDist = dist; nearest = a; }
            }
          }
        }
        // Check carrier boss
        if (!nearest && gm.carrierBoss && !gm.carrierBoss.isDead && gm.carrierBoss.meshGroup) {
          nearest = gm.carrierBoss;
        }
        this.homingTarget = nearest;
      }

      if (this.homingTarget && !this.homingTarget.isDead && this.homingTarget.meshGroup) {
        const targetPos = this.homingTarget.meshGroup.position;
        const desiredDir = new THREE.Vector3().subVectors(targetPos, this.meshGroup.position).normalize();
        this.direction.lerp(desiredDir, 6.0 * dt).normalize();
        this.meshGroup.lookAt(new THREE.Vector3().addVectors(this.meshGroup.position, this.direction));
      }
    }

    this.meshGroup.position.addScaledVector(this.direction, this.speed * dt);

    if (
      this.meshGroup.position.z < -160 ||
      this.meshGroup.position.z > 45 ||
      Math.abs(this.meshGroup.position.x) > 60 ||
      Math.abs(this.meshGroup.position.y) > 50
    ) {
      this.destroy();
    }
  }
}

// â”€â”€ Shared Cache for PlasmaPulse â”€â”€
let plasmaGeoCache = null;
let plasmaMatCache = null;

function getPlasmaResources() {
  if (!plasmaGeoCache) {
    plasmaGeoCache = {
      orbGeo: new THREE.SphereGeometry(1.8, 20, 20),
      haloGeo: new THREE.SphereGeometry(3.2, 16, 16),
      ringGeo: new THREE.TorusGeometry(2.6, 0.22, 10, 30),
      centerGeo: new THREE.SphereGeometry(0.9, 12, 12),
    };
    plasmaMatCache = {
      haloMat: new THREE.MeshBasicMaterial({ color: 0x00aaff, transparent: true, opacity: 0.18 }),
      rMat1: new THREE.MeshBasicMaterial({ color: 0xff00cc }),
      rMat2: new THREE.MeshBasicMaterial({ color: 0x00f3ff }),
      rMat3: new THREE.MeshBasicMaterial({ color: 0x8800ff }),
      centerMat: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    };
  }
  return { geos: plasmaGeoCache, mats: plasmaMatCache };
}

export class PlasmaPulse {
  constructor(scene, startPos, particleManager) {
    this.scene = scene;
    this.particleManager = particleManager;
    this.meshGroup = new THREE.Group();
    this._build();
    this.reset(startPos);
    this.scene.add(this.meshGroup);
  }

  _build() {
    const { geos, mats } = getPlasmaResources();

    this.orbMat = new THREE.MeshStandardMaterial({
      color: 0x00f3ff,
      emissive: 0x00f3ff,
      emissiveIntensity: 4.0,
      roughness: 0.0,
      metalness: 0.0,
    });
    this.orbMesh = new THREE.Mesh(geos.orbGeo, this.orbMat);
    this.meshGroup.add(this.orbMesh);

    this.meshGroup.add(new THREE.Mesh(geos.haloGeo, mats.haloMat));

    this.rings = [];
    [[0, 0, 0], [Math.PI / 2, 0, 0], [0, Math.PI / 2, 0]].forEach((rot, i) => {
      const mat = i === 0 ? mats.rMat1 : i === 1 ? mats.rMat2 : mats.rMat3;
      const ring = new THREE.Mesh(geos.ringGeo, mat);
      ring.rotation.set(...rot);
      this.meshGroup.add(ring);
      this.rings.push(ring);
    });

    this.meshGroup.add(new THREE.Mesh(geos.centerGeo, mats.centerMat));

    this.light = new THREE.PointLight(0x00f3ff, 8.0, 24);
    this.meshGroup.add(this.light);
  }

  reset(startPos) {
    this.damage = 300;
    this.aoeRadius = 20.0;
    this.speed = 62;
    this.radius = 2.2;
    this.isDead = false;
    this._time = 0;

    this.meshGroup.position.copy(startPos);
    this.meshGroup.visible = true;
  }

  destroy() {
    this.isDead = true;
    this.meshGroup.visible = false;
  }

  update(dt) {
    if (this.isDead) return;
    this._time += dt;
    this.meshGroup.position.z -= this.speed * dt;

    if (this.rings[0]) this.rings[0].rotation.z += 6.0 * dt;
    if (this.rings[1]) this.rings[1].rotation.x += 5.0 * dt;
    if (this.rings[2]) this.rings[2].rotation.y += 4.5 * dt;

    if (this.orbMat) {
      this.orbMat.emissiveIntensity = 3.5 + Math.sin(this._time * 20) * 1.5;
    }
    if (this.orbMesh) {
      const s = 1.0 + Math.sin(this._time * 15) * 0.08;
      this.orbMesh.scale.setScalar(s);
    }

    if (this.particleManager) {
      this.particleManager.spawnEngineParticle(this.meshGroup.position, 0x00f3ff);
      if (Math.random() < 0.5) this.particleManager.spawnEngineParticle(this.meshGroup.position, 0xff00cc);
    }

    if (this.meshGroup.position.z < -160) this.destroy();
  }
}
