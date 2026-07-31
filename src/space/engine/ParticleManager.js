import * as THREE from 'three';

export class ParticleManager {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.shockwaves = [];
  }

  createExplosion(pos, colorHex = 0xff0077, count = 50, scale = 1.0) {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = (0.3 + Math.random() * 0.7) * scale;

      velocities.push(new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.cos(phi) * speed,
        Math.sin(phi) * Math.sin(theta) * speed
      ));
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: colorHex,
      size: 0.5 * scale,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending
    });

    const pSystem = new THREE.Points(geo, mat);
    this.scene.add(pSystem);

    this.particles.push({
      system: pSystem,
      velocities,
      life: 1.0,
      decay: 0.03
    });
  }

  createEmpShockwave(pos, maxRadius = 25) {
    const geo = new THREE.RingGeometry(0.1, 0.5, 32);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    const ring = new THREE.Mesh(geo, mat);
    ring.position.copy(pos);
    ring.rotation.x = Math.PI / 2;
    this.scene.add(ring);

    this.shockwaves.push({
      mesh: ring,
      currentRadius: 0.5,
      maxRadius,
      speed: 1.2
    });
  }

  spawnEngineParticle(pos, dirColor = 0x00f3ff) {
    const count = 3;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = pos.x + (Math.random() - 0.5) * 0.4;
      positions[i * 3 + 1] = pos.y + (Math.random() - 0.5) * 0.4;
      positions[i * 3 + 2] = pos.z;

      velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 0.05,
        (Math.random() - 0.5) * 0.05,
        0.3 + Math.random() * 0.3 // Fire backward
      ));
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: dirColor,
      size: 0.35,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    const pSystem = new THREE.Points(geo, mat);
    this.scene.add(pSystem);

    this.particles.push({
      system: pSystem,
      velocities,
      life: 0.5,
      decay: 0.08
    });
  }

  update() {
    // Update particle explosions
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

      for (let j = 0; j < p.velocities.length; j++) {
        positions[j * 3] += p.velocities[j].x;
        positions[j * 3 + 1] += p.velocities[j].y;
        positions[j * 3 + 2] += p.velocities[j].z;
      }

      p.system.geometry.attributes.position.needsUpdate = true;
    }

    // Update EMP Shockwaves expansion
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
