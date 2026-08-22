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

  reset(startPos, colorHex = 0x00f3ff, isEnemy = false, targetDir = null, projectileType = 'STANDARD') {
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

  destroy() {
    this.isDead = true;
    this.meshGroup.visible = false;
  }

  update(dt) {
    if (this.isDead) return;

    // Homing Steering Logic for TACTICIAN seeking plasma
    if (this.projectileType === 'HOMING' && !this.isEnemy && this.gameManager) {
      if (!this.homingTarget || this.homingTarget.isDead) {
        // Find nearest active enemy ahead
        let nearest = null;
        let minDist = 75;
        
        // Check drones
        if (this.gameManager.drones) {
          for (let d of this.gameManager.drones) {
            if (!d.isDead && d.meshGroup && d.meshGroup.position.z < this.meshGroup.position.z) {
              const dist = this.meshGroup.position.distanceTo(d.meshGroup.position);
              if (dist < minDist) { minDist = dist; nearest = d; }
            }
          }
        }
        // Check asteroids
        if (!nearest && this.gameManager.asteroids) {
          for (let a of this.gameManager.asteroids) {
            if (!a.isDead && a.meshGroup && a.meshGroup.position.z < this.meshGroup.position.z) {
              const dist = this.meshGroup.position.distanceTo(a.meshGroup.position);
              if (dist < minDist) { minDist = dist; nearest = a; }
            }
          }
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
