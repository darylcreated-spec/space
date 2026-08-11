import * as THREE from 'three';
import { HomingMissile } from './HomingMissile.js';

export class CarrierCapitalShip {
  constructor(scene, particleManager) {
    this.scene = scene;
    this.particleManager = particleManager;

    this.radius = 18.0;
    this.coreHp = 3500;
    this.maxCoreHp = 3500;
    this.shieldHp = 1000;
    this.maxShieldHp = 1000;
    this.hasShield = false;
    this.hasShieldTriggered = false;
    this.scoreValue = 35000;
    this.isDead = false;
    this.hitRadius = 22.0;

    this.meshGroup = new THREE.Group();
    this.meshGroup.position.set(0, 5, -160);

    this.targetZ = -45;
    this.speed = 10.0;
    this._time = Math.random() * 100;

    this.fireTimer = 1.0;
    this.missileTimer = 3.2;
    this.droneLaunchTimer = 4.2;

    this.homingMissiles = [];
    this.pendingDroneSpawns = 0;

    this.turrets = [
      { id: 0, relPos: new THREE.Vector3(-8.5, 3.5, -6), hp: 500, isDead: false, mesh: null },
      { id: 1, relPos: new THREE.Vector3(8.5, 3.5, -6),  hp: 500, isDead: false, mesh: null },
      { id: 2, relPos: new THREE.Vector3(-10.5, -3.5, 4), hp: 500, isDead: false, mesh: null },
      { id: 3, relPos: new THREE.Vector3(10.5, -3.5, 4),  hp: 500, isDead: false, mesh: null }
    ];

    // Targetable Carrier Sub-Systems
    this.subsystems = [
      { id: 'hangarLeft', name: 'PORT HANGAR BAY', relPos: new THREE.Vector3(-11, 0, 2), hp: 600, maxHp: 600, isDead: false, mesh: null },
      { id: 'hangarRight', name: 'STARBOARD HANGAR BAY', relPos: new THREE.Vector3(11, 0, 2), hp: 600, maxHp: 600, isDead: false, mesh: null },
      { id: 'missilePodLeft', name: 'PORT MISSILE POD', relPos: new THREE.Vector3(-9, 4, 0), hp: 500, maxHp: 500, isDead: false, mesh: null },
      { id: 'missilePodRight', name: 'STARBOARD MISSILE POD', relPos: new THREE.Vector3(9, 4, 0), hp: 500, maxHp: 500, isDead: false, mesh: null }
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

    // ── 4. Fresnel Energy Shield Mesh ──
    const shieldGeo = new THREE.IcosahedronGeometry(22.0, 3);
    this.shieldMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.0,
      wireframe: true,
      blending: THREE.AdditiveBlending
    });
    this.shieldMesh = new THREE.Mesh(shieldGeo, this.shieldMat);
    this.shieldMesh.visible = false;
    this.meshGroup.add(this.shieldMesh);
  }

  takeSubsystemDamage(systemId, amount) {
    const sub = this.subsystems.find(s => s.id === systemId);
    if (!sub || sub.isDead) return false;

    sub.hp -= amount;
    if (sub.hp <= 0) {
      sub.isDead = true;
      const wp = this.meshGroup.position.clone().add(sub.relPos);
      this.particleManager.createExplosion(wp, 0xffaa00, 80, 3.0);
      this.particleManager.createEmpShockwave(wp, 35);
    }
    return sub.isDead;
  }

  takeDamage(amount) {
    if (this.hasShield && this.shieldHp > 0) {
      this.shieldHp -= amount;
      if (this.shieldMesh) {
        this.shieldMesh.visible = true;
        this.shieldMat.opacity = 0.85;
      }
      if (this.shieldHp <= 0) {
        this.hasShield = false;
        if (this.shieldMesh) this.shieldMesh.visible = false;
        this.particleManager.createEmpShockwave(this.meshGroup.position, 60);
      }
      return false;
    }

    this.coreHp -= amount;

    // Phase 2 Energy Shield Overcharge at 50% HP (1750 HP)
    if (this.coreHp <= 1750 && !this.hasShieldTriggered && !this.isDead) {
      this.hasShield = true;
      this.hasShieldTriggered = true;
      this.shieldHp = this.maxShieldHp;
      if (this.shieldMesh) this.shieldMesh.visible = true;
      if (window.spaceGameManager && window.spaceGameManager.spaceHUD) {
        window.spaceGameManager.spaceHUD.showRadioTransmission("WARNING: Enemy Carrier Energy Shield Overcharged! Target Flight Decks!", "STARBOUND COMMAND", 5.5);
      }
      if (window.spaceGameManager && window.spaceGameManager.voiceAnnouncer) {
        window.spaceGameManager.voiceAnnouncer.speak("Warning! Heavy Carrier Shield Overcharged!", true);
      }
    }

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
      // Turn broadside sideways (90 deg) to face player craft!
      this.meshGroup.rotation.y = THREE.MathUtils.lerp(this.meshGroup.rotation.y, Math.PI / 2, dt * 2.5);
      // Hover weaving
      this.meshGroup.position.x = Math.sin(this._time * 0.8) * 14.0;
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

    // 2. Homing Missile Salvo firing (if missile pods active)
    const podL = this.subsystems.find(s => s.id === 'missilePodLeft');
    const podR = this.subsystems.find(s => s.id === 'missilePodRight');
    const canFireMissiles = (podL && !podL.isDead) || (podR && !podR.isDead);

    this.missileTimer -= dt;
    if (this.missileTimer <= 0 && arrived && canFireMissiles) {
      this.missileTimer = 4.2;
      const xOffsets = [];
      if (podL && !podL.isDead) xOffsets.push(-9);
      if (podR && !podR.isDead) xOffsets.push(9);

      xOffsets.forEach(xOff => {
        const launchPos = this.meshGroup.position.clone().add(new THREE.Vector3(xOff, 4.0, 0));
        const missile = new HomingMissile(this.scene, launchPos, playerPos);
        this.homingMissiles.push(missile);
      });

      if (playerShip && playerShip.gameManager && playerShip.gameManager.spaceHUD) {
        playerShip.gameManager.spaceHUD.showLockOnWarning(true, 'MISSILE LOCK DETECTED!');
        if (playerShip.gameManager.spaceAudio) playerShip.gameManager.spaceAudio.playLockOnAlarm();
      }
    }

    // Lock-break check when player dodges
    if (playerShip && playerShip.isDodging && this.homingMissiles.length > 0) {
      if (playerShip.gameManager && playerShip.gameManager.spaceHUD) {
        playerShip.gameManager.spaceHUD.showLockOnWarning(false);
        if (playerShip.gameManager.spaceAudio && !this._hasPlayedLockBreak) {
          playerShip.gameManager.spaceAudio.playLockBrokenSound();
          this._hasPlayedLockBreak = true;
          setTimeout(() => { this._hasPlayedLockBreak = false; }, 1000);
        }
      }
    }

    // Update active in-flight homing missiles
    for (let i = this.homingMissiles.length - 1; i >= 0; i--) {
      const m = this.homingMissiles[i];
      if (!m || m.isDead) {
        this.homingMissiles.splice(i, 1);
        if (this.homingMissiles.length === 0 && playerShip && playerShip.gameManager && playerShip.gameManager.spaceHUD) {
          playerShip.gameManager.spaceHUD.showLockOnWarning(false);
        }
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

    // 3. Drone Flight Deck Launching (if hangar bays active)
    const hL = this.subsystems.find(s => s.id === 'hangarLeft');
    const hR = this.subsystems.find(s => s.id === 'hangarRight');
    const canLaunchDrones = (hL && !hL.isDead) || (hR && !hR.isDead);

    this.droneLaunchTimer -= dt;
    let spawnDronesCount = 0;
    if (this.droneLaunchTimer <= 0 && arrived && canLaunchDrones) {
      this.droneLaunchTimer = 5.5;
      spawnDronesCount = (hL && !hL.isDead ? 1 : 0) + (hR && !hR.isDead ? 1 : 0);
    }

    return {
      lasers: laserOutputs.length > 0 ? laserOutputs : false,
      droneSpawns: spawnDronesCount
    };
  }
}
