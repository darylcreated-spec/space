import * as THREE from 'three';
import { SpaceDebrisSystem } from './SpaceDebrisSystem.js';

export class ParticleManager {
  constructor(scene) {
    this.scene = scene;
    this.shockwaves = [];
    this.sonicDiscs = [];
    this.lightningArcs = [];
    this.fireballs = [];
    this.metalDebris = [];

    // 1. Reusable Engine Thruster Particle Pool (250 particles)
    this.enginePool = this._buildParticlePool(250, 0.45);
    this.engineIndex = 0;

    // 2. Reusable Explosion Particle Pool (500 particles)
    this.explosionPool = this._buildParticlePool(500, 0.75);
    this.explosionIndex = 0;

    // 3. High-Velocity Ricochet Spark Pool (300 particles)
    this.sparkPool = this._buildParticlePool(300, 0.32);
    this.sparkIndex = 0;

    // 4. Reusable RCS Micro-Jet Pool (150 particles)
    this.rcsPool = this._buildParticlePool(150, 0.28);
    this.rcsIndex = 0;

    this._tempColor = new THREE.Color();

    // Shared Geometry and Material for EMP Shockwaves
    this._shockwaveGeo = new THREE.RingGeometry(0.1, 0.5, 32);
    this._shockwaveMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    // Sonic Boom Disc Geometry
    this._sonicDiscGeo = new THREE.RingGeometry(0.5, 1.8, 36);

    // Shared Fireball Geometry & Materials
    this._fireballGeo = new THREE.IcosahedronGeometry(1.0, 2);

    // ── GPU-Instanced Kinematic Metal Debris & Shrapnel System (512 Debris Pool) ──
    this.spaceDebris = new SpaceDebrisSystem(this.scene, 512);
  }

  _buildParticlePool(count, defaultSize) {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3).fill(9999);
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
      opacity: 0.9,
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

  spawnEngineParticle(pos, colorHex = 0x00f3ff) {
    const pool = this.enginePool;
    const idx = this.engineIndex % pool.count;
    this.engineIndex++;

    pool.positions[idx * 3] = pos.x + (Math.random() - 0.5) * 0.35;
    pool.positions[idx * 3 + 1] = pos.y + (Math.random() - 0.5) * 0.35;
    pool.positions[idx * 3 + 2] = pos.z;

    this._tempColor.setHex(colorHex);
    pool.colors[idx * 3] = this._tempColor.r;
    pool.colors[idx * 3 + 1] = this._tempColor.g;
    pool.colors[idx * 3 + 2] = this._tempColor.b;

    pool.velX[idx] = (Math.random() - 0.5) * 0.1;
    pool.velY[idx] = (Math.random() - 0.5) * 0.1;
    pool.velZ[idx] = 0.45 + Math.random() * 0.45;
    pool.lives[idx] = 1.0;
    pool.decays[idx] = 0.055;
  }

  spawnRcsJet(pos, dir, colorHex = 0x00f3ff) {
    const pool = this.rcsPool;
    for (let i = 0; i < 3; i++) {
      const idx = this.rcsIndex % pool.count;
      this.rcsIndex++;

      pool.positions[idx * 3] = pos.x;
      pool.positions[idx * 3 + 1] = pos.y;
      pool.positions[idx * 3 + 2] = pos.z;

      this._tempColor.setHex(colorHex);
      pool.colors[idx * 3] = this._tempColor.r;
      pool.colors[idx * 3 + 1] = this._tempColor.g;
      pool.colors[idx * 3 + 2] = this._tempColor.b;

      const spread = 0.18;
      pool.velX[idx] = (dir.x + (Math.random() - 0.5) * spread) * 0.85;
      pool.velY[idx] = (dir.y + (Math.random() - 0.5) * spread) * 0.85;
      pool.velZ[idx] = (dir.z + (Math.random() - 0.5) * spread) * 0.85;
      pool.lives[idx] = 1.0;
      pool.decays[idx] = 0.12;
    }
  }

  spawnSparks(pos, normal = new THREE.Vector3(0, 0, 1), colorHex = 0xffd700, count = 12) {
    const pool = this.sparkPool;
    const safeCount = Math.min(count, 18);
    this._tempColor.setHex(colorHex);

    for (let i = 0; i < safeCount; i++) {
      const idx = this.sparkIndex % pool.count;
      this.sparkIndex++;

      pool.positions[idx * 3] = pos.x;
      pool.positions[idx * 3 + 1] = pos.y;
      pool.positions[idx * 3 + 2] = pos.z;

      pool.colors[idx * 3] = this._tempColor.r;
      pool.colors[idx * 3 + 1] = this._tempColor.g;
      pool.colors[idx * 3 + 2] = this._tempColor.b;

      const speed = 0.8 + Math.random() * 1.4;
      const spread = 0.9;
      pool.velX[idx] = (normal.x + (Math.random() - 0.5) * spread) * speed;
      pool.velY[idx] = (normal.y + (Math.random() - 0.5) * spread) * speed;
      pool.velZ[idx] = (normal.z + (Math.random() - 0.5) * spread) * speed;

      pool.lives[idx] = 1.0;
      pool.decays[idx] = 0.08 + Math.random() * 0.06;
    }
  }

  createExplosion(pos, colorHex = 0xff0077, count = 24, scale = 1.0) {
    const pool = this.explosionPool;
    const safeCount = Math.min(count, 28);

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
      const speed = (0.4 + Math.random() * 0.85) * scale * 0.75;

      pool.velX[idx] = Math.sin(phi) * Math.cos(theta) * speed;
      pool.velY[idx] = Math.cos(phi) * speed;
      pool.velZ[idx] = Math.sin(phi) * Math.sin(theta) * speed;

      pool.lives[idx] = 1.0;
      pool.decays[idx] = 0.035 + Math.random() * 0.03;
    }

    // Spawn rich incandescent spark shower
    this.spawnSparks(pos, new THREE.Vector3(0, 0, 1), 0xffaa00, 14);

    // Spawn Volumetric Expanding Fireball
    this.createVolumetricFireball(pos, scale * 3.5, colorHex);
  }

  createLaserImpact(pos, normal = new THREE.Vector3(0, 0, 1), colorHex = 0x00f3ff, count = 10) {
    this.spawnSparks(pos, normal, colorHex, count);
  }

  createVolumetricFireball(pos, maxRadius = 3.5, colorHex = 0xff5500) {
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(this._fireballGeo, mat);
    mesh.position.copy(pos);
    mesh.scale.setScalar(0.4);
    this.scene.add(mesh);

    this.fireballs.push({
      mesh,
      currentScale: 0.4,
      maxScale: maxRadius,
      growthRate: 14.0,
      opacity: 0.9
    });
  }

  spawnSonicBoomDisc(pos, colorHex = 0x00f3ff) {
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const disc = new THREE.Mesh(this._sonicDiscGeo, mat);
    disc.position.copy(pos);
    this.scene.add(disc);

    this.sonicDiscs.push({ mesh: disc, scale: 0.6, maxScale: 9.0, speed: 20.0 });
  }

  createEmpShockwave(pos, maxRadius = 28) {
    const ring = new THREE.Mesh(this._shockwaveGeo, this._shockwaveMat.clone());
    ring.position.copy(pos);
    ring.rotation.x = Math.PI / 2;
    this.scene.add(ring);

    this.shockwaves.push({ mesh: ring, currentRadius: 0.5, maxRadius, speed: 1.6 });
  }

  update(dt = 0.016) {
    const delta = dt || 0.016;
    this._updatePool(this.enginePool);
    this._updatePool(this.explosionPool);
    this._updatePool(this.sparkPool);
    this._updatePool(this.rcsPool);

    // Update Volumetric Fireballs
    for (let i = this.fireballs.length - 1; i >= 0; i--) {
      const fb = this.fireballs[i];
      fb.currentScale += fb.growthRate * 0.016;
      fb.opacity -= 0.025;
      fb.mesh.scale.setScalar(fb.currentScale);
      fb.mesh.material.opacity = Math.max(0, fb.opacity);

      if (fb.opacity <= 0 || fb.currentScale >= fb.maxScale) {
        this.scene.remove(fb.mesh);
        fb.mesh.material.dispose();
        this.fireballs.splice(i, 1);
      }
    }

    // Update EMP Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.currentRadius += sw.speed;

      if (sw.currentRadius >= sw.maxRadius) {
        this.scene.remove(sw.mesh);
        if (sw.mesh.material) sw.mesh.material.dispose();
        this.shockwaves.splice(i, 1);
      } else {
        sw.mesh.scale.set(sw.currentRadius, sw.currentRadius, 1);
        const progress = sw.currentRadius / sw.maxRadius;
        sw.mesh.material.opacity = Math.max(0, (1 - progress) * 0.95);
      }
    }

    // Update Sonic Boom Rings
    for (let i = this.sonicDiscs.length - 1; i >= 0; i--) {
      const sd = this.sonicDiscs[i];
      sd.scale += sd.speed * 0.016;

      if (sd.scale >= sd.maxScale) {
        this.scene.remove(sd.mesh);
        if (sd.mesh.material) sd.mesh.material.dispose();
        this.sonicDiscs.splice(i, 1);
      } else {
        sd.mesh.scale.set(sd.scale, sd.scale, 1);
        const progress = sd.scale / sd.maxScale;
        sd.mesh.material.opacity = Math.max(0, (1 - progress) * 0.85);
      }
    }

    // ── Update Physical Severed Metal Debris Meshes (Wings, Armor, Turrets) ──
    for (let i = this.metalDebris.length - 1; i >= 0; i--) {
      const d = this.metalDebris[i];
      d.life -= (d.decay || 0.2) * delta * 60.0;

      if (d.life <= 0 || !d.mesh) {
        if (d.mesh) {
          if (d.mesh.parent) d.mesh.parent.remove(d.mesh);
          else this.scene.remove(d.mesh);
          if (d.geo) d.geo.dispose();
          if (d.mat) {
            if (Array.isArray(d.mat)) d.mat.forEach(m => m.dispose());
            else d.mat.dispose();
          }
        }
        this.metalDebris.splice(i, 1);
      } else {
        if (d.mesh) {
          d.mesh.position.x += (d.vx || 0) * delta;
          d.mesh.position.y += (d.vy || 0) * delta;
          d.mesh.position.z += (d.vz || 0) * delta;
          d.mesh.rotation.x += (d.rotSpeedX || 1.0) * delta;
          d.mesh.rotation.y += (d.rotSpeedY || 1.0) * delta;
          d.mesh.rotation.z += (d.rotSpeedZ || 1.0) * delta;

          // Smooth fade-out as chunk tumbles into deep space
          if (d.life < 0.35) {
            const alpha = Math.max(0, d.life / 0.35);
            if (d.mat) {
              if (Array.isArray(d.mat)) {
                d.mat.forEach(m => { m.transparent = true; m.opacity = alpha; });
              } else {
                d.mat.transparent = true;
                d.mat.opacity = alpha;
              }
            }
          }
        }
      }
    }

    // ── Update GPU Instanced Metal Debris (512 Shard Pool) ──
    if (this.spaceDebris) {
      this.spaceDebris.update(performance.now() * 0.001);
    }
  }

  clear() {
    // Purge and dispose all severed physical metal debris
    if (this.metalDebris) {
      this.metalDebris.forEach(d => {
        if (d && d.mesh) {
          if (d.mesh.parent) d.mesh.parent.remove(d.mesh);
          else this.scene.remove(d.mesh);
          if (d.geo) d.geo.dispose();
          if (d.mat) {
            if (Array.isArray(d.mat)) d.mat.forEach(m => m.dispose());
            else d.mat.dispose();
          }
        }
      });
      this.metalDebris = [];
    }

    // Purge shockwaves
    if (this.shockwaves) {
      this.shockwaves.forEach(sw => {
        if (sw && sw.mesh) {
          if (sw.mesh.parent) sw.mesh.parent.remove(sw.mesh);
          else this.scene.remove(sw.mesh);
          if (sw.mesh.material) sw.mesh.material.dispose();
        }
      });
      this.shockwaves = [];
    }

    // Purge sonic discs
    if (this.sonicDiscs) {
      this.sonicDiscs.forEach(sd => {
        if (sd && sd.mesh) {
          if (sd.mesh.parent) sd.mesh.parent.remove(sd.mesh);
          else this.scene.remove(sd.mesh);
          if (sd.mesh.material) sd.mesh.material.dispose();
        }
      });
      this.sonicDiscs = [];
    }

    // Purge fireballs
    if (this.fireballs) {
      this.fireballs.forEach(fb => {
        if (fb && fb.mesh) {
          if (fb.mesh.parent) fb.mesh.parent.remove(fb.mesh);
          else this.scene.remove(fb.mesh);
          if (fb.mesh.material) fb.mesh.material.dispose();
        }
      });
      this.fireballs = [];
    }
  }

  spawnMetalDebris(originPos, count = 8, defaultColorHex = null, baseVel = null) {
    if (!originPos || !this.spaceDebris) return;
    this.spaceDebris.explodeShip(originPos, baseVel || new THREE.Vector3(), count);
  }

  _updatePool(pool) {
    let needsUpdate = false;

    for (let i = 0; i < pool.count; i++) {
      if (pool.lives[i] > 0) {
        pool.lives[i] -= pool.decays[i];

        if (pool.lives[i] <= 0) {
          pool.positions[i * 3] = 9999;
          pool.positions[i * 3 + 1] = 9999;
          pool.positions[i * 3 + 2] = 9999;
        } else {
          pool.positions[i * 3] += pool.velX[i];
          pool.positions[i * 3 + 1] += pool.velY[i];
          pool.positions[i * 3 + 2] += pool.velZ[i];

          // Drag
          pool.velX[i] *= 0.94;
          pool.velY[i] *= 0.94;
          pool.velZ[i] *= 0.94;
        }
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      pool.points.geometry.attributes.position.needsUpdate = true;
      pool.points.geometry.attributes.color.needsUpdate = true;
    }
  }
}
