import * as THREE from 'three';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];

    // Setup ambient void dust background
    this.setupAmbientDust();
  }

  setupAmbientDust() {
    const count = 150;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = Math.random() * 15;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
      speeds[i] = 0.002 + Math.random() * 0.005;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0x00f3ff,
      size: 0.12,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending
    });

    this.dustPoints = new THREE.Points(geo, mat);
    this.dustSpeeds = speeds;
    this.scene.add(this.dustPoints);
  }

  createCoreExplosion(worldPos, colorHex = 0x00f3ff) {
    const particleCount = 40;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = worldPos.x;
      positions[i * 3 + 1] = worldPos.y + 0.25;
      positions[i * 3 + 2] = worldPos.z;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 0.08 + Math.random() * 0.12;

      velocities.push(new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.cos(phi) * speed + 0.05,
        Math.sin(phi) * Math.sin(theta) * speed
      ));
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: colorHex,
      size: 0.2,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending
    });

    const pSystem = new THREE.Points(geo, mat);
    this.scene.add(pSystem);

    this.particles.push({
      system: pSystem,
      velocities: velocities,
      life: 1.0,
      decay: 0.02
    });
  }

  update() {
    // Update ambient dust floating
    if (this.dustPoints) {
      const positions = this.dustPoints.geometry.attributes.position.array;
      for (let i = 0; i < positions.length / 3; i++) {
        positions[i * 3 + 1] += this.dustSpeeds[i];
        if (positions[i * 3 + 1] > 15) {
          positions[i * 3 + 1] = 0;
        }
      }
      this.dustPoints.geometry.attributes.position.needsUpdate = true;
    }

    // Update active particle explosions
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
        p.velocities[j].y -= 0.002; // subtle gravity
      }

      p.system.geometry.attributes.position.needsUpdate = true;
    }
  }
}
