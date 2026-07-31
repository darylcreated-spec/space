import * as THREE from 'three';

export class ParticleManager {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.shockwaves = [];

    // PRE-ALLOCATE a single reusable engine particle pool (no per-frame GPU uploads)
    this.engineParticlePool = this._buildEnginePool(120);
    this.enginePoolIndex = 0;
  }

  _buildEnginePool(count) {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3).fill(9999); // Hide off-screen
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      colors[i * 3] = 0.0; colors[i * 3 + 1] = 0.95; colors[i * 3 + 2] = 1.0;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const pool = {
      points: new THREE.Points(geo, mat),
      positions,
      lives: new Float32Array(count).fill(0),
      velX: new Float32Array(count).fill(0),
      velY: new Float32Array(count).fill(0),
      velZ: new Float32Array(count).fill(0),
      count
    };

    this.scene.add(pool.points);
    return pool;
  }

  spawnEngineParticle(pos, _color = 0x00f3ff) {
    // Reuse next slot in the pool — zero allocations per frame
    const pool = this.engineParticlePool;
    const idx = this.enginePoolIndex % pool.count;
    this.enginePoolIndex++;

    pool.positions[idx * 3] = pos.x + (Math.random() - 0.5) * 0.4;
    pool.positions[idx * 3 + 1] = pos.y + (Math.random() - 0.5) * 0.4;
    pool.positions[idx * 3 + 2] = pos.z;

    pool.velX[idx] = (Math.random() - 0.5) * 0.05;
    pool.velY[idx] = (Math.random() - 0.5) * 0.05;
    pool.velZ[idx] = 0.25 + Math.random() * 0.3;
    pool.lives[idx] = 1.0;
  }

  createExplosion(pos, colorHex = 0xff0077, count = 30, scale = 1.0) {
    // Cap count for mobile safety
    const safeCount = Math.min(count, 25);
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(safeCount * 3);
    const velocities = new Float32Array(safeCount * 3);

    for (let i = 0; i < safeCount; i++) {
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = (0.3 + Math.random() * 0.7) * scale;

      velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      velocities[i * 3 + 1] = Math.cos(phi) * speed;
      velocities[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: colorHex,
      size: 0.5 * scale,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const pSystem = new THREE.Points(geo, mat);
    this.scene.add(pSystem);

    this.particles.push({ system: pSystem, velocities, life: 1.0, decay: 0.045 });
  }

  createEmpShockwave(pos, maxRadius = 25) {
    const geo = new THREE.RingGeometry(0.1, 0.5, 24);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const ring = new THREE.Mesh(geo, mat);
    ring.position.copy(pos);
    ring.rotation.x = Math.PI / 2;
    this.scene.add(ring);

    this.shockwaves.push({ mesh: ring, currentRadius: 0.5, maxRadius, speed: 1.4 });
  }

  update() {
    // ---- Engine Particle Pool update ----
    const pool = this.engineParticlePool;
    let poolDirty = false;
    for (let i = 0; i < pool.count; i++) {
      if (pool.lives[i] <= 0) continue;
      pool.lives[i] -= 0.07;
      if (pool.lives[i] <= 0) {
        pool.positions[i * 3] = 9999;
        pool.positions[i * 3 + 1] = 9999;
        pool.positions[i * 3 + 2] = 9999;
      } else {
        pool.positions[i * 3] += pool.velX[i];
        pool.positions[i * 3 + 1] += pool.velY[i];
        pool.positions[i * 3 + 2] += pool.velZ[i];
      }
      poolDirty = true;
    }
    if (poolDirty) {
      pool.points.geometry.attributes.position.needsUpdate = true;
    }

    // ---- Explosion Particles ----
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= p.decay;

      if (p.life <= 0) {
        this.scene.remove(p.system);
        p.system.geometry.dispose();
        p.system.material.dispose();
        this.particles.splice(i, 1);
        continue;
      }

      p.system.material.opacity = p.life;
      const positions = p.system.geometry.attributes.position.array;
      const vels = p.velocities;

      for (let j = 0; j < vels.length / 3; j++) {
        positions[j * 3] += vels[j * 3];
        positions[j * 3 + 1] += vels[j * 3 + 1];
        positions[j * 3 + 2] += vels[j * 3 + 2];
      }

      p.system.geometry.attributes.position.needsUpdate = true;
    }

    // ---- EMP Shockwaves ----
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.currentRadius += sw.speed;

      if (sw.currentRadius >= sw.maxRadius) {
        this.scene.remove(sw.mesh);
        sw.mesh.geometry.dispose();
        sw.mesh.material.dispose();
        this.shockwaves.splice(i, 1);
        continue;
      }

      const progress = sw.currentRadius / sw.maxRadius;
      sw.mesh.scale.set(sw.currentRadius, sw.currentRadius, 1);
      sw.mesh.material.opacity = 1.0 - progress;
    }
  }
}
