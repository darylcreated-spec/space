import * as THREE from 'three';

export class CapitalShip {
  constructor(scene, particleManager) {
    this.scene = scene;
    this.particleManager = particleManager;

    this.radius = 4.0;
    this.hp = 250;
    this.maxHp = 250;
    this.scoreValue = 1000;
    this.isDead = false;

    this.meshGroup = new THREE.Group();

    // Spawn far away and drift in slowly
    const spawnX = (Math.random() - 0.5) * 24;
    const spawnY = (Math.random() - 0.5) * 12;
    const spawnZ = -100 - Math.random() * 20;
    this.meshGroup.position.set(spawnX, spawnY, spawnZ);

    this.targetZ = 12; // slow down and hover in front of the screen
    this.speed = 14;
    this.fireTimer = 1.5;
    this._time = Math.random() * 100;

    this.turrets = [
      { relPos: new THREE.Vector3(-3.2, 0.4, -1.0), mesh: null },
      { relPos: new THREE.Vector3(3.2, 0.4, -1.0), mesh: null }
    ];

    this.buildMesh();
    this.scene.add(this.meshGroup);
  }

  buildMesh() {
    // ── 1. Arrowhead Cruiser Fuselage ──
    const hullGeo = new THREE.ConeGeometry(2.2, 7.0, 5);
    hullGeo.rotateX(Math.PI / 2);
    hullGeo.scale(1.2, 0.6, 1.0); // flat cruiser design
    this.hullMat = new THREE.MeshStandardMaterial({
      color: 0x0f1424,
      metalness: 0.95,
      roughness: 0.2,
      emissive: 0x000c1a,
      emissiveIntensity: 0.4
    });
    const hull = new THREE.Mesh(hullGeo, this.hullMat);
    this.meshGroup.add(hull);

    // ── 2. Top Bridge Citadel ──
    const bridgeGeo = new THREE.BoxGeometry(1.6, 0.8, 2.2);
    const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x0a0c16, metalness: 0.9, roughness: 0.3 });
    const bridge = new THREE.Mesh(bridgeGeo, bridgeMat);
    bridge.position.set(0, 0.5, 0.8);
    this.meshGroup.add(bridge);

    // Glowing Bridge Windows
    const windowGeo = new THREE.BoxGeometry(1.45, 0.15, 0.15);
    const windowMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const win = new THREE.Mesh(windowGeo, windowMat);
    win.position.set(0, 0.7, -0.3);
    this.meshGroup.add(win);

    // ── 3. Twin Glowing Engines ──
    const engineMat = new THREE.MeshStandardMaterial({ color: 0x05070e, metalness: 0.95 });
    const flareMat = new THREE.MeshBasicMaterial({ color: 0x00aaff });
    [-0.8, 0.8].forEach(x => {
      const eGeo = new THREE.CylinderGeometry(0.5, 0.7, 1.2, 8);
      eGeo.rotateX(Math.PI / 2);
      const e = new THREE.Mesh(eGeo, engineMat);
      e.position.set(x, -0.1, 3.4);
      this.meshGroup.add(e);

      // Flare cone
      const flare = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.4, 8), flareMat);
      flare.rotation.x = -Math.PI / 2;
      flare.position.set(0, 0, 0.6);
      e.add(flare);
    });

    // Engine light
    this.engineLight = new THREE.PointLight(0x0088ff, 3.0, 16);
    this.engineLight.position.set(0, 0, 4.0);
    this.meshGroup.add(this.engineLight);

    // ── 4. Flank Turrets ──
    const turretBaseGeo = new THREE.CylinderGeometry(0.5, 0.6, 0.3, 8);
    const turretBaseMat = new THREE.MeshStandardMaterial({ color: 0x090b12, metalness: 0.9 });
    const barrelGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.4, 6);
    barrelGeo.rotateX(Math.PI / 2);
    const barrelMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });

    this.turrets.forEach(t => {
      const tGroup = new THREE.Group();
      tGroup.position.copy(t.relPos);
      
      const base = new THREE.Mesh(turretBaseGeo, turretBaseMat);
      tGroup.add(base);

      const barrel = new THREE.Mesh(barrelGeo, barrelMat);
      barrel.position.set(0, 0.2, 0.5);
      tGroup.add(barrel);

      this.meshGroup.add(tGroup);
      t.mesh = tGroup;
    });
  }

  takeDamage(amount) {
    this.hp -= amount;

    // Emissive flash feedback
    if (this.hullMat) {
      this.hullMat.emissive.setHex(0xff0044);
      this.hullMat.emissiveIntensity = 2.5;
      setTimeout(() => {
        if (this.hullMat) {
          this.hullMat.emissive.setHex(0x000c1a);
          this.hullMat.emissiveIntensity = 0.4;
        }
      }, 100);
    }

    if (this.hp <= 0 && !this.isDead) {
      this.isDead = true;
      this._explode();
    }
    return this.isDead;
  }

  _explode() {
    this.particleManager.createExplosion(this.meshGroup.position, 0x00aaff, 120, 3.2);
    this.particleManager.createExplosion(this.meshGroup.position, 0xffea00, 80, 2.5);
    this.particleManager.createEmpShockwave(this.meshGroup.position, 40);
  }

  destroy() {
    this.scene.remove(this.meshGroup);
    this.meshGroup.traverse(c => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    });
  }

  update(dt, playerPos) {
    this._time += dt;

    // Move forward from deep space and hover
    if (this.meshGroup.position.z < this.targetZ) {
      this.meshGroup.position.z += this.speed * dt;
    } else {
      // Hover weave movement
      this.meshGroup.position.z += Math.sin(this._time * 1.5) * 0.8 * dt;
      this.meshGroup.position.x += Math.cos(this._time * 1.0) * 1.2 * dt;
    }

    // Engine light oscillation
    if (this.engineLight) {
      this.engineLight.intensity = 2.5 + Math.sin(this._time * 15) * 0.6;
    }

    // Turrets aim at player in local coordinate space
    this.turrets.forEach(t => {
      if (t.mesh) {
        const localTarget = this.meshGroup.worldToLocal(playerPos.clone());
        t.mesh.lookAt(localTarget);
      }
    });

    // Firing logic
    this.fireTimer -= dt;
    let shouldFire = false;
    const out = [];

    // Firing starts once cruiser is near the player space
    if (this.fireTimer <= 0 && this.meshGroup.position.z < 25) {
      this.fireTimer = 1.4 + Math.random() * 0.4;
      this.turrets.forEach(t => {
        if (t.mesh) {
          out.push(t.mesh.getWorldPosition(new THREE.Vector3()));
        }
      });
      shouldFire = true;
    }

    // Check if passed player and impacted home planet at Z > 18
    if (this.meshGroup.position.z > 18) {
      this.isDead = true;
      this.impactedPlanet = true;
    }

    return shouldFire ? out : false;
  }
}
