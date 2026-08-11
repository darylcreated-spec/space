import * as THREE from 'three';

// ── Shared Cache for LaserBolt Geometries & Materials ──
const laserGeoCache = {};
const laserMatCache = {};

function getLaserGeometries(isEnemy) {
  const key = isEnemy ? 'enemy' : 'player';
  if (!laserGeoCache[key]) {
    const len = isEnemy ? 2.8 : 3.6;
    
    const beamGeo = new THREE.CylinderGeometry(isEnemy ? 0.16 : 0.13, isEnemy ? 0.16 : 0.13, len, 8);
    beamGeo.rotateX(Math.PI / 2);

    const glowGeo = new THREE.CylinderGeometry(isEnemy ? 0.42 : 0.32, isEnemy ? 0.42 : 0.32, len * 0.85, 8);
    glowGeo.rotateX(Math.PI / 2);

    const coreGeo = new THREE.CylinderGeometry(0.055, 0.055, len * 1.1, 6);
    coreGeo.rotateX(Math.PI / 2);

    const muzzleGeo = new THREE.SphereGeometry(isEnemy ? 0.28 : 0.22, 8, 8);

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
  constructor(scene, startPos, colorHex = 0x00f3ff, isEnemy = false, targetDir = null) {
    this.scene = scene;
    this.meshGroup = new THREE.Group();
    this.hitEntities = new Set();
    this.reset(startPos, colorHex, isEnemy, targetDir);
    this.scene.add(this.meshGroup);
  }

  reset(startPos, colorHex = 0x00f3ff, isEnemy = false, targetDir = null) {
    this.isEnemy = isEnemy;
    this.damage = 15;
    this.speed = isEnemy ? 52 : 110;
    this.radius = 1.4;
    this.isDead = false;
    this.isCritical = false;
    if (this.hitEntities) this.hitEntities.clear();
    else this.hitEntities = new Set();

    this.meshGroup.position.copy(startPos);
    this.meshGroup.visible = true;

    if (targetDir) {
      this.direction = targetDir.clone().normalize();
      this.meshGroup.lookAt(new THREE.Vector3().addVectors(startPos, this.direction));
    } else {
      this.direction = new THREE.Vector3(0, 0, isEnemy ? 1 : -1);
      if (isEnemy) this.meshGroup.rotation.y = Math.PI;
      else this.meshGroup.rotation.set(0, 0, 0);
    }

    // Build or update mesh children using shared geometries
    if (this.meshGroup.children.length === 0) {
      const geos = getLaserGeometries(isEnemy);

      // Beam
      this.beamMesh = new THREE.Mesh(geos.beamGeo, getLaserMaterial(colorHex));
      this.meshGroup.add(this.beamMesh);

      // Glow
      this.glowMesh = new THREE.Mesh(geos.glowGeo, getLaserMaterial(colorHex, true, 0.2));
      this.meshGroup.add(this.glowMesh);

      // Core
      this.coreMesh = new THREE.Mesh(geos.coreGeo, getLaserMaterial(0xffffff));
      this.meshGroup.add(this.coreMesh);

      // Muzzle
      this.muzzleMesh = new THREE.Mesh(geos.muzzleGeo, getLaserMaterial(0xffffff));
      this.muzzleMesh.position.z = -geos.len / 2;
      this.meshGroup.add(this.muzzleMesh);
    } else {
      this.beamMesh.material = getLaserMaterial(colorHex);
      this.glowMesh.material = getLaserMaterial(colorHex, true, 0.2);
    }
  }

  destroy() {
    this.isDead = true;
    this.meshGroup.visible = false;
  }

  update(dt) {
    if (this.isDead) return;
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

// ── Shared Cache for PlasmaPulse ──
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

