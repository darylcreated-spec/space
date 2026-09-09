import * as THREE from 'three';

/**
 * NASA Deep Space Science Telescope Array (JWST / Orbital Array)
 * High-value allied science installation deployed during special objective defense operations.
 * Features hexagonal gold primary mirror arrays, layered sunshield membranes,
 * and high-gain quantum telemetry antennae.
 */
export class DeepSpaceTelescope {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.isDead = false;
    this.isAllied = true;
    this.isObjective = true;
    this.hp = 1500;
    this.maxHp = 1500;
    this.radius = 8.5;
    this.defenseScoreReward = 1200;

    this.meshGroup = new THREE.Group();
    this.buildMesh();

    const spawnX = options.x !== undefined ? options.x : 0;
    const spawnY = options.y !== undefined ? options.y : 3.0;
    const spawnZ = options.z !== undefined ? options.z : -55;

    this.meshGroup.position.set(spawnX, spawnY, spawnZ);
    this.scene.add(this.meshGroup);

    this._rotYaw = 0.03;
    this._beaconTimer = 0;
  }

  buildMesh() {
    // 1. Layered Kite Sunshield Membranes (Five layers of Kapton thermal insulation)
    const sunshieldGeo = new THREE.CylinderGeometry(14, 18, 0.4, 4);
    const sunshieldMat = new THREE.MeshStandardMaterial({
      color: 0xc8cdd4,
      metalness: 0.9,
      roughness: 0.18,
      side: THREE.DoubleSide
    });
    const sunshield = new THREE.Mesh(sunshieldGeo, sunshieldMat);
    sunshield.rotation.y = Math.PI * 0.25;
    sunshield.scale.set(1.4, 1.0, 0.7);
    this.meshGroup.add(sunshield);

    // 2. Spacecraft Bus (Central Avionics & Thrusters)
    const busGeo = new THREE.BoxGeometry(4.2, 2.2, 4.2);
    const busMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      metalness: 0.8,
      roughness: 0.3
    });
    const bus = new THREE.Mesh(busGeo, busMat);
    bus.position.set(0, -1.2, 0);
    this.meshGroup.add(bus);

    // 3. Central Backplane Tower
    const towerGeo = new THREE.CylinderGeometry(1.2, 1.6, 3.5, 8);
    const towerMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      metalness: 0.8,
      roughness: 0.4
    });
    const tower = new THREE.Mesh(towerGeo, towerMat);
    tower.position.set(0, 1.5, 0);
    this.meshGroup.add(tower);

    // 4. Iconic Hexagonal Gold Beryllium Mirror Array
    this.mirrorsGroup = new THREE.Group();
    const hexMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0x996500,
      emissiveIntensity: 0.35,
      metalness: 0.95,
      roughness: 0.08
    });

    const hexRadius = 1.35;
    // Central hex ring + outer perimeter (18 hexagonal mirrors)
    const mirrorCoords = [
      [0, 0],
      [hexRadius * 1.732, 0], [-hexRadius * 1.732, 0],
      [hexRadius * 0.866, hexRadius * 1.5], [-hexRadius * 0.866, hexRadius * 1.5],
      [hexRadius * 0.866, -hexRadius * 1.5], [-hexRadius * 0.866, -hexRadius * 1.5],
      [0, hexRadius * 3.0], [0, -hexRadius * 3.0],
      [hexRadius * 1.732, hexRadius * 3.0], [-hexRadius * 1.732, hexRadius * 3.0],
      [hexRadius * 2.598, hexRadius * 1.5], [-hexRadius * 2.598, hexRadius * 1.5],
      [hexRadius * 2.598, -hexRadius * 1.5], [-hexRadius * 2.598, -hexRadius * 1.5],
      [hexRadius * 1.732, -hexRadius * 3.0], [-hexRadius * 1.732, -hexRadius * 3.0]
    ];

    mirrorCoords.forEach(([mx, my]) => {
      const segGeo = new THREE.CylinderGeometry(hexRadius * 0.94, hexRadius * 0.94, 0.15, 6);
      const segMesh = new THREE.Mesh(segGeo, hexMat);
      segMesh.position.set(mx, my + 3.2, 0.8);
      segMesh.rotation.x = Math.PI * 0.5;
      this.mirrorsGroup.add(segMesh);
    });
    this.meshGroup.add(this.mirrorsGroup);

    // 5. Secondary Mirror Support Booms (Tripod Mast)
    const mastMat = new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.9, roughness: 0.3 });
    for (let i = 0; i < 3; i++) {
      const mastGeo = new THREE.CylinderGeometry(0.08, 0.08, 7.5, 6);
      const mast = new THREE.Mesh(mastGeo, mastMat);
      const angle = (i / 3) * Math.PI * 2;
      mast.position.set(Math.cos(angle) * 2.8, 3.2 + Math.sin(angle) * 2.8, 2.8);
      mast.rotation.x = 0.45;
      mast.rotation.y = angle;
      this.meshGroup.add(mast);
    }

    // Secondary Focus Mirror
    const secGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.2, 6);
    const secMirror = new THREE.Mesh(secGeo, hexMat);
    secMirror.position.set(0, 3.2, 5.2);
    secMirror.rotation.x = Math.PI * 0.5;
    this.meshGroup.add(secMirror);

    // 6. Allied Telemetry Beacons (Blinking Cyan Defense Markers)
    this.beacons = [];
    const beaconGeo = new THREE.SphereGeometry(0.25, 8, 8);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });

    const beaconOffsets = [
      [8.5, 0.2, 0],
      [-8.5, 0.2, 0],
      [0, 6.8, 0.8],
      [0, -2.5, 0]
    ];

    beaconOffsets.forEach(([bx, by, bz]) => {
      const b = new THREE.Mesh(beaconGeo, beaconMat);
      b.position.set(bx, by, bz);
      this.meshGroup.add(b);
      this.beacons.push(b);
    });

    // 7. Protective Electromagnetic Allied Shield Bubble (Faint)
    const shieldGeo = new THREE.SphereGeometry(this.radius, 24, 24);
    this.shieldMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.08,
      wireframe: true
    });
    this.shieldMesh = new THREE.Mesh(shieldGeo, this.shieldMat);
    this.meshGroup.add(this.shieldMesh);
  }

  update(dt) {
    if (this.isDead) return;

    // Gentle orbital pitch and yaw
    this.meshGroup.rotation.y += this._rotYaw * dt;
    this.meshGroup.rotation.z = Math.sin(Date.now() * 0.0008) * 0.06;

    // Pulse telemetry beacons
    this._beaconTimer += dt * 3.5;
    const bVis = Math.sin(this._beaconTimer) > 0;
    this.beacons.forEach(b => {
      b.visible = bVis;
    });

    // Shield shimmer
    if (this.shieldMesh) {
      this.shieldMesh.rotation.y -= dt * 0.15;
    }
  }

  takeDamage(amount) {
    if (this.isDead) return false;
    this.hp -= amount;

    // Flash shield bubble on hit
    if (this.shieldMat) {
      this.shieldMat.opacity = 0.35;
      setTimeout(() => {
        if (this.shieldMat) this.shieldMat.opacity = 0.08;
      }, 80);
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
      return true; // Destroyed!
    }
    return false;
  }

  getHealthRatio() {
    return Math.max(0, this.hp / this.maxHp);
  }

  destroy() {
    this.isDead = true;
    if (this.meshGroup && this.scene) {
      this.scene.remove(this.meshGroup);
      this.meshGroup.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material.dispose();
        }
      });
    }
  }
}
