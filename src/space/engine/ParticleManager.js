import * as THREE from 'three';

export class ParticleManager {
  constructor(scene) {
    this.scene = scene;
    this.shockwaves = [];

    // 1. PRE-ALLOCATE Reusable Engine Thruster Particle Pool (150 particles)
    this.enginePool = this._buildParticlePool(150, 0.4);
    this.engineIndex = 0;

    // 2. PRE-ALLOCATE Reusable Explosion Particle Pool (400 particles)
    this.explosionPool = this._buildParticlePool(400, 0.6);
    this.explosionIndex = 0;
    // Cached Color object for explosion pool assignment
    this._tempColor = new THREE.Color();

    // Shared Geometry and Material for EMP Shockwaves
    this._shockwaveGeo = new THREE.RingGeometry(0.1, 0.5, 20);
    this._shockwaveMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }

  _buildParticlePool(count, defaultSize) {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3).fill(9999); // Hide offscreen
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      colors[i * 3] = 0.0;
      colors[i * 3 + 1] = 0.95;
      colors[i * 3 + 2] = 1.0;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: defaultSize,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geo, mat);
    this.scene.add(points);

    return {
      points,
      positions,
      colors,
      lives: new Float32Array(count).fill(0),
      velX: new Float32Array(count).fill(0),
      velY: new Float32Array(count).fill(0),
      velZ: new Float32Array(count).fill(0),
      decays: new Float32Array(count).fill(0.05),
      count
    };
  }

  spawnEngineParticle(pos, _colorHex = 0x00f3ff) {
    const pool = this.enginePool;
    const idx = this.engineIndex % pool.count;
    this.engineIndex++;

    pool.positions[idx * 3] = pos.x + (Math.random() - 0.5) * 0.4;
    pool.positions[idx * 3 + 1] = pos.y + (Math.random() - 0.5) * 0.4;
    pool.positions[idx * 3 + 2] = pos.z;

    pool.colors[idx * 3] = 0.0;
    pool.colors[idx * 3 + 1] = 0.95;
    pool.colors[idx * 3 + 2] = 1.0;

    pool.velX[idx] = (Math.random() - 0.5) * 0.05;
    pool.velY[idx] = (Math.random() - 0.5) * 0.05;
    pool.velZ[idx] = 0.25 + Math.random() * 0.3;
    pool.lives[idx] = 1.0;
    pool.decays[idx] = 0.07;
  }

  createExplosion(pos, colorHex = 0xff0077, count = 20, scale = 1.0) {
    const pool = this.explosionPool;
    const safeCount = Math.min(count, 15);

    this._tempColor.setHex(colorHex);

    for (let i = 0; i < safeCount; i++) {
      const idx = this.explosionIndex % pool.count;
      this.explosionIndex++;

      pool.positions[idx * 3] = pos.x;
      pool.positions[idx * 3 + 1] = pos.y;
      pool.positions[idx * 3 + 2] = pos.z;

      pool.colors[idx * 3] = this._tempColor.r;
      pool.colors[idx * 3 + 1] = this._tempColor.g;
      pool.colors[idx * 3 + 2] = this._tempColor.b;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = (0.3 + Math.random() * 0.7) * scale * 0.6;

      pool.velX[idx] = Math.sin(phi) * Math.cos(theta) * speed;
      pool.velY[idx] = Math.cos(phi) * speed;
      pool.velZ[idx] = Math.sin(phi) * Math.sin(theta) * speed;

      pool.lives[idx] = 1.0;
      pool.decays[idx] = 0.04 + Math.random() * 0.03;
    }
  }

  createEmpShockwave(pos, maxRadius = 25) {
    const ring = new THREE.Mesh(this._shockwaveGeo, this._shockwaveMat.clone());
    ring.position.copy(pos);
    ring.rotation.x = Math.PI / 2;
    this.scene.add(ring);

    this.shockwaves.push({ mesh: ring, currentRadius: 0.5, maxRadius, speed: 1.4 });
  }

  update() {
    // 1. Update Engine Thruster Particle Pool
    this._updatePool(this.enginePool);

    // 2. Update Explosion Particle Pool
    this._updatePool(this.explosionPool);

    // 3. Update EMP Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.currentRadius += sw.speed;

      if (sw.currentRadius >= sw.maxRadius) {
        this.scene.remove(sw.mesh);
        if (sw.mesh.material) sw.mesh.material.dispose();
        this.shockwaves.splice(i, 1);
        continue;
      }

      const progress = sw.currentRadius / sw.maxRadius;
      sw.mesh.scale.set(sw.currentRadius, sw.currentRadius, 1);
      sw.mesh.material.opacity = 1.0 - progress;
    }
  }

  _updatePool(pool) {
    let dirty = false;
    for (let i = 0; i < pool.count; i++) {
      if (pool.lives[i] <= 0) continue;

      pool.lives[i] -= pool.decays[i];
      if (pool.lives[i] <= 0) {
        pool.positions[i * 3] = 9999;
        pool.positions[i * 3 + 1] = 9999;
        pool.positions[i * 3 + 2] = 9999;
      } else {
        pool.positions[i * 3] += pool.velX[i];
        pool.positions[i * 3 + 1] += pool.velY[i];
        pool.positions[i * 3 + 2] += pool.velZ[i];
      }
      dirty = true;
    }

    if (dirty) {
      pool.points.geometry.attributes.position.needsUpdate = true;
    }
  }
}
