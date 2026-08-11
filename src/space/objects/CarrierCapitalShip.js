import * as THREE from 'three';
import { HomingMissile } from './HomingMissile.js';

export class CarrierCapitalShip {
  constructor(scene, particleManager) {
    this.scene = scene;
    this.particleManager = particleManager;

    this.radius = 16.0;
    this.coreHp = 2500;
    this.maxCoreHp = 2500;
    this.scoreValue = 25000;
    this.isDead = false;
    this.hitRadius = 18.0;

    this.meshGroup = new THREE.Group();
    this.meshGroup.position.set(0, 5, -160);

    this.targetZ = -45;
    this.speed = 10.0;
    this._time = Math.random() * 100;

    this.fireTimer = 1.2;
    this.missileTimer = 3.5;
    this.droneLaunchTimer = 5.0;

    this.homingMissiles = [];
    this.pendingDroneSpawns = 0;

    this.turrets = [
      { id: 0, relPos: new THREE.Vector3(-8.5, 3.5, -6), hp: 400, isDead: false, mesh: null },
      { id: 1, relPos: new THREE.Vector3(8.5, 3.5, -6),  hp: 400, isDead: false, mesh: null },
      { id: 2, relPos: new THREE.Vector3(-10.5, -3.5, 4), hp: 400, isDead: false, mesh: null },
      { id: 3, relPos: new THREE.Vector3(10.5, -3.5, 4),  hp: 400, isDead: false, mesh: null }
    ];

    this._build();
    this.scene.add(this.meshGroup);
  }

  _build() {
    // ── 1. Heavy Carrier Hull (Dual-Deck Flight Flight Superstructure) ──
    const hullGeo = new THREE.BoxGeometry(22.0, 7.0, 36.0);
    this.hullMat = new THREE.MeshStandardMaterial({
      color: 0x0c1424,
      roughness: 0.35,
      metalness: 0.9,
      emissive: 0x000c1c,
      emissiveIntensity: 0.4
    });
    const hull = new THREE.Mesh(hullGeo, this.hullMat);
    this.meshGroup.add(hull);

    // Flight Deck Runway Stripes (Glowing Blue)
    const runwayGeo = new THREE.PlaneGeometry(16.0, 32.0);
    runwayGeo.rotateX(-Math.PI / 2);
    const runwayMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });
    const runway = new THREE.Mesh(runwayGeo, runwayMat);
    runway.position.set(0, 3.55, 0);
    this.meshGroup.add(runway);

    // Hangar Bay Openings (Left & Right Flank Flight Decks)
    const hangarGeo = new THREE.BoxGeometry(1.5, 3.0, 10.0);
    const hangarMat = new THREE.MeshBasicMaterial({ color: 0x00ff66 });
    [-11.1, 11.1].forEach(x => {
      const h = new THREE.Mesh(hangarGeo, hangarMat);
      h.position.set(x, 0, 2.0);
      this.meshGroup.add(h);
    });

    // Bridge Command Citadel
    const bridgeGeo = new THREE.BoxGeometry(6.0, 4.0, 8.0);
    const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x070b14, metalness: 0.95, roughness: 0.2 });
    const bridge = new THREE.Mesh(bridgeGeo, bridgeMat);
    bridge.position.set(0, 5.5, -8.0);
    this.meshGroup.add(bridge);

    // Bridge Window Glow
    const winGeo = new THREE.BoxGeometry(5.2, 0.6, 0.4);
    const winMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
    const win = new THREE.Mesh(winGeo, winMat);
    win.position.set(0, 6.2, -11.9);
    this.meshGroup.add(win);

    // ── 2. Quadruple Rear Ion Thrusters ──
    const engineMat = new THREE.MeshStandardMaterial({ color: 0x05070e, metalness: 0.95 });
    const engineGlowMat = new THREE.MeshBasicMaterial({ color: 0x00aaff });
    [-7, -2.5, 2.5, 7].forEach(x => {
      const eGeo = new THREE.CylinderGeometry(1.6, 2.0, 4.0, 12);
      eGeo.rotateX(Math.PI / 2);
      const e = new THREE.Mesh(eGeo, engineMat);
      e.position.set(x, 0, 18.0);
      this.meshGroup.add(e);

      const flare = new THREE.Mesh(new THREE.ConeGeometry(1.4, 4.0, 12), engineGlowMat);
      flare.rotation.x = -Math.PI / 2;
      flare.position.set(0, 0, 2.2);
      e.add(flare);
    });

    // Engine Point Light
    this.engineLight = new THREE.PointLight(0x0088ff, 6.0, 40);
    this.engineLight.position.set(0, 0, 20.0);
    this.meshGroup.add(this.engineLight);

    // ── 3. Heavy Dual Plasma Turrets ──
    const turretBaseGeo = new THREE.CylinderGeometry(1.5, 1.8, 0.8, 12);
    const turretBaseMat = new THREE.MeshStandardMaterial({ color: 0x080e1a, metalness: 0.95 });
    const barrelGeo = new THREE.CylinderGeometry(0.3, 0.3, 3.5, 8);
    barrelGeo.rotateX(Math.PI / 2);
    this.barrelMat = new THREE.MeshBasicMaterial({ color: 0x00ff66 });

    this.turrets.forEach(t => {
      const tGroup = new THREE.Group();
      tGroup.position.copy(t.relPos);

      const base = new THREE.Mesh(turretBaseGeo, turretBaseMat);
      tGroup.add(base);

      [-0.6, 0.6].forEach(xOff => {
        const b = new THREE.Mesh(barrelGeo, this.barrelMat);
        b.position.set(xOff, 0.5, 1.2);
        tGroup.add(b);
      });

      this.meshGroup.add(tGroup);
      t.mesh = tGroup;
    });
  }

  takeDamage(amount) {
    this.coreHp -= amount;

    // Emissive damage feedback
    if (this.hullMat) {
      this.hullMat.emissive.setHex(0xff0044);
      this.hullMat.emissiveIntensity = 2.5;
      setTimeout(() => {
        if (this.isDead) return;
        if (this.hullMat) {
          this.hullMat.emissive.setHex(0x000c1c);
          this.hullMat.emissiveIntensity = 0.4;
        }
      }, 100);
    }

    if (this.coreHp <= 0 && !this.isDead) {
      this.isDead = true;
      this._explode();
    }
    return this.isDead;
  }

  _explode() {
    this.particleManager.createExplosion(this.meshGroup.position, 0x00f3ff, 250, 5.0);
    this.particleManager.createExplosion(this.meshGroup.position, 0xff0055, 200, 4.0);
    this.particleManager.createExplosion(this.meshGroup.position, 0xffea00, 150, 3.5);
    this.particleManager.createEmpShockwave(this.meshGroup.position, 80);
  }

  destroy() {
    this.isDead = true;
    if (this.engineLight) this.scene.remove(this.engineLight);
    this.scene.remove(this.meshGroup);

    this.homingMissiles.forEach(m => m.destroy());
    this.homingMissiles = [];

    this.meshGroup.traverse(c => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    });
  }

  update(dt, playerShip) {
    if (this.isDead) return { lasers: false, missiles: false, droneSpawns: 0 };

    this._time += dt;
    const playerPos = playerShip && playerShip.meshGroup ? playerShip.meshGroup.position : new THREE.Vector3();

    // Advance from deep space to battle hover position
    const arrived = this.meshGroup.position.z >= this.targetZ;
    if (!arrived) {
      this.meshGroup.position.z += this.speed * dt;
    } else {
      // Hover weaving
      this.meshGroup.position.x = Math.sin(this._time * 0.8) * 12.0;
      this.meshGroup.position.y = 5.0 + Math.cos(this._time * 0.6) * 3.0;
    }

    // Update turrets looking at player
    if (arrived) {
      this.turrets.forEach(t => {
        if (!t.isDead && t.mesh) {
          const localTarget = this.meshGroup.worldToLocal(playerPos.clone());
          t.mesh.lookAt(localTarget);
        }
      });
    }

    // 1. Plasma Turrets firing
    this.fireTimer -= dt;
    const laserOutputs = [];
    if (this.fireTimer <= 0 && arrived) {
      this.fireTimer = 1.3;
      this.turrets.forEach(t => {
        if (!t.isDead && t.mesh) {
          laserOutputs.push(t.mesh.getWorldPosition(new THREE.Vector3()));
        }
      });
    }

    // 2. Homing Missile Salvo firing (every 4.0s)
    this.missileTimer -= dt;
    if (this.missileTimer <= 0 && arrived) {
      this.missileTimer = 4.2;
      // Fire 2 homing missiles from left and right dorsal launchers
      [-9, 9].forEach(xOff => {
        const launchPos = this.meshGroup.position.clone().add(new THREE.Vector3(xOff, 4.0, 0));
        const missile = new HomingMissile(this.scene, launchPos, playerPos);
        this.homingMissiles.push(missile);
      });
    }

    // Update active in-flight homing missiles
    for (let i = this.homingMissiles.length - 1; i >= 0; i--) {
      const m = this.homingMissiles[i];
      if (!m || m.isDead) {
        this.homingMissiles.splice(i, 1);
        continue;
      }
      m.update(dt, playerShip, this.particleManager);

      // Check collision with player
      if (playerShip && playerShip.meshGroup && !m.lockLost) {
        const dist = m.meshGroup.position.distanceTo(playerPos);
        if (dist < playerShip.radius + m.radius) {
          playerShip.takeDamage(30);
          this.particleManager.createExplosion(m.meshGroup.position, 0xff0044, 40, 1.8);
          m.destroy();
          this.homingMissiles.splice(i, 1);
        }
      }
    }

    // 3. Drone Flight Deck Launching (every 5.5s)
    this.droneLaunchTimer -= dt;
    let spawnDronesCount = 0;
    if (this.droneLaunchTimer <= 0 && arrived) {
      this.droneLaunchTimer = 5.5;
      spawnDronesCount = 2; // Request GameManager to launch 2 fighter drones
    }

    return {
      lasers: laserOutputs.length > 0 ? laserOutputs : false,
      droneSpawns: spawnDronesCount
    };
  }
}
