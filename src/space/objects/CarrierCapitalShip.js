import * as THREE from 'three';
import { HomingMissile } from './HomingMissile.js';

export class CarrierCapitalShip {
  constructor(scene, particleManager) {
    this.scene = scene;
    this.particleManager = particleManager;

    this.radius = 20.0;
    this.coreHp = 3500;
    this.maxCoreHp = 3500;
    this.shieldHp = 1200;
    this.maxShieldHp = 1200;
    this.hasShield = false;
    this.hasShieldTriggered = false;
    this.scoreValue = 45000;
    this.isDead = false;
    this.hitRadius = 24.0;

    this.meshGroup = new THREE.Group();
    this.meshGroup.position.set(0, 5, -160);

    this.targetZ = -45;
    this.speed = 10.0;
    this._time = Math.random() * 100;

    this.fireTimer = 1.0;
    this.missileTimer = 3.2;
    this.droneLaunchTimer = 4.2;
    this.siegeCannonTimer = 6.0;
    this.siegeCharging = false;

    this.homingMissiles = [];
    this.pendingDroneSpawns = 0;

    // ── 4 Targetable Heavy Plasma Turrets (Must be destroyed to silence lasers) ──
    this.turrets = [
      { id: 0, name: 'FWD PORT BATTERY', relPos: new THREE.Vector3(-8.5, 3.8, -8), hp: 450, maxHp: 450, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 1, name: 'FWD STBD BATTERY', relPos: new THREE.Vector3(8.5, 3.8, -8),  hp: 450, maxHp: 450, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 2, name: 'AFT PORT BATTERY', relPos: new THREE.Vector3(-10.5, 3.8, 8),  hp: 450, maxHp: 450, isDead: false, mesh: null, barrelGroup: null, reticle: null },
      { id: 3, name: 'AFT STBD BATTERY', relPos: new THREE.Vector3(10.5, 3.8, 8),   hp: 450, maxHp: 450, isDead: false, mesh: null, barrelGroup: null, reticle: null }
    ];

    // ── Targetable Carrier Sub-Systems (Hangars & Missile Pods) ──
    this.subsystems = [
      { id: 'hangarLeft', name: 'PORT HANGAR BAY', relPos: new THREE.Vector3(-11.2, 0, 2), hp: 650, maxHp: 650, isDead: false, mesh: null, forcefield: null, reticle: null },
      { id: 'hangarRight', name: 'STARBOARD HANGAR BAY', relPos: new THREE.Vector3(11.2, 0, 2), hp: 650, maxHp: 650, isDead: false, mesh: null, forcefield: null, reticle: null },
      { id: 'missilePodLeft', name: 'PORT MISSILE POD', relPos: new THREE.Vector3(-9.2, 4.5, 0), hp: 450, maxHp: 450, isDead: false, mesh: null, reticle: null },
      { id: 'missilePodRight', name: 'STARBOARD MISSILE POD', relPos: new THREE.Vector3(9.2, 4.5, 0), hp: 450, maxHp: 450, isDead: false, mesh: null, reticle: null }
    ];

    this.runwayLights = [];
    this.thrusterPositions = [];
    this.siegeCannons = [];
    this.reticleMeshes = [];

    this._build();
    this.scene.add(this.meshGroup);
  }

  _build() {
    // ── 1. Heavy Carrier Hull (Multi-Tier Armored Flight Superstructure) ──
    const hullGeo = new THREE.BoxGeometry(22.0, 6.5, 38.0);
    this.hullMat = new THREE.MeshStandardMaterial({
      color: 0x0c1626,
      roughness: 0.35,
      metalness: 0.92,
      emissive: 0x000c1c,
      emissiveIntensity: 0.4
    });
    const hull = new THREE.Mesh(hullGeo, this.hullMat);
    this.meshGroup.add(hull);

    // Armored Lower Keel Citadel
    const keelGeo = new THREE.BoxGeometry(16.0, 4.0, 32.0);
    const keelMat = new THREE.MeshStandardMaterial({ color: 0x080e1a, metalness: 0.95, roughness: 0.3 });
    const keel = new THREE.Mesh(keelGeo, keelMat);
    keel.position.set(0, -3.8, 0);
    this.meshGroup.add(keel);

    // Flight Deck Runway Surface (Dual Catapult Lanes)
    const runwayGeo = new THREE.PlaneGeometry(16.0, 34.0);
    runwayGeo.rotateX(-Math.PI / 2);
    const runwayMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide
    });
    const runway = new THREE.Mesh(runwayGeo, runwayMat);
    runway.position.set(0, 3.3, 0);
    this.meshGroup.add(runway);

    // Catapult Launch Lanes (Port & Starboard Track Decals)
    [-4.5, 4.5].forEach(x => {
      const trackGeo = new THREE.PlaneGeometry(1.2, 30.0);
      trackGeo.rotateX(-Math.PI / 2);
      const trackMat = new THREE.MeshBasicMaterial({ color: 0x00ff66, transparent: true, opacity: 0.45 });
      const track = new THREE.Mesh(trackGeo, trackMat);
      track.position.set(x, 3.32, 0);
      this.meshGroup.add(track);
    });

    // Animated Runway Guide Lights (Left & Right Flight Deck Edges)
    const lightGeo = new THREE.BoxGeometry(0.3, 0.15, 0.8);
    for (let z = -15; z <= 15; z += 3.0) {
      [-7.8, 7.8].forEach(x => {
        const mat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
        const lightMesh = new THREE.Mesh(lightGeo, mat);
        lightMesh.position.set(x, 3.35, z);
        this.meshGroup.add(lightMesh);
        this.runwayLights.push({ mesh: lightMesh, mat, baseZ: z });
      });
    }

    // ── 2. Detailed Port & Starboard Hangar Bay Entrances ──
    const bayFrameGeo = new THREE.BoxGeometry(2.0, 3.6, 12.0);
    const bayFrameMat = new THREE.MeshStandardMaterial({ color: 0x141e2e, metalness: 0.9, roughness: 0.25 });
    const bayCavityGeo = new THREE.BoxGeometry(1.6, 2.8, 10.0);
    const bayCavityMat = new THREE.MeshBasicMaterial({ color: 0x040810 });
    const forcefieldGeo = new THREE.PlaneGeometry(10.0, 2.8);
    forcefieldGeo.rotateY(Math.PI / 2);

    [-11.2, 11.2].forEach((x, idx) => {
      const hGroup = new THREE.Group();
      hGroup.position.set(x, 0, 2.0);

      // Metallic Bulkhead Arch Frame
      const frame = new THREE.Mesh(bayFrameGeo, bayFrameMat);
      hGroup.add(frame);

      // Dark Interior Cavity
      const cavity = new THREE.Mesh(bayCavityGeo, bayCavityMat);
      cavity.position.set(x > 0 ? -0.4 : 0.4, 0, 0);
      hGroup.add(cavity);

      // Glowing Magnetic Forcefield Barrier
      const ffMat = new THREE.MeshBasicMaterial({
        color: 0x00ff88,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      });
      const ff = new THREE.Mesh(forcefieldGeo, ffMat);
      ff.position.set(x > 0 ? 0.9 : -0.9, 0, 0);
      hGroup.add(ff);

      // Hazard Caution Stripes (Top & Bottom of Bay Entrance)
      const hazardGeo = new THREE.BoxGeometry(0.2, 0.4, 11.6);
      const hazardMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });
      const hazardTop = new THREE.Mesh(hazardGeo, hazardMat);
      hazardTop.position.set(x > 0 ? 1.0 : -1.0, 1.6, 0);
      hGroup.add(hazardTop);

      // 3D Target Reticle for Hangar Entrance
      const reticleGeo = new THREE.RingGeometry(1.6, 2.0, 16);
      reticleGeo.rotateY(Math.PI / 2);
      const reticleMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
      const reticle = new THREE.Mesh(reticleGeo, reticleMat);
      reticle.position.set(x > 0 ? 2.5 : -2.5, 0, 0);
      hGroup.add(reticle);

      this.meshGroup.add(hGroup);
      const sub = this.subsystems[idx];
      sub.mesh = hGroup;
      sub.forcefield = ff;
      sub.reticle = reticle;
      this.reticleMeshes.push(reticle);
    });

    // ── 3. Targetable Missile Pod Batteries ──
    const podBaseGeo = new THREE.BoxGeometry(3.0, 2.0, 4.5);
    const podBaseMat = new THREE.MeshStandardMaterial({ color: 0x182436, metalness: 0.9 });
    const tubeGeo = new THREE.CylinderGeometry(0.3, 0.3, 2.0, 8);
    tubeGeo.rotateX(Math.PI / 2);
    const tubeMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });

    [-9.2, 9.2].forEach((x, idx) => {
      const pGroup = new THREE.Group();
      pGroup.position.set(x, 4.5, 0);

      const base = new THREE.Mesh(podBaseGeo, podBaseMat);
      pGroup.add(base);

      // 6 Missile Launch Tubes
      for (let r = -0.5; r <= 0.5; r += 0.5) {
        for (let c = -0.6; c <= 0.6; c += 1.2) {
          const tube = new THREE.Mesh(tubeGeo, tubeMat);
          tube.position.set(c, r + 0.3, 1.4);
          pGroup.add(tube);
        }
      }

      // 3D Target Reticle for Missile Pod
      const reticleGeo = new THREE.RingGeometry(1.4, 1.8, 16);
      const reticleMat = new THREE.MeshBasicMaterial({ color: 0xff0055, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
      const reticle = new THREE.Mesh(reticleGeo, reticleMat);
      reticle.position.set(0, 2.2, 0);
      reticle.rotation.x = -Math.PI / 2;
      pGroup.add(reticle);

      this.meshGroup.add(pGroup);
      const sub = this.subsystems[idx + 2];
      sub.mesh = pGroup;
      sub.reticle = reticle;
      this.reticleMeshes.push(reticle);
    });

    // ── 4. Starboard Island Command Spire & Radar Radome ──
    const bridgeGeo = new THREE.BoxGeometry(5.5, 6.0, 9.0);
    const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x070d18, metalness: 0.95, roughness: 0.2 });
    const bridge = new THREE.Mesh(bridgeGeo, bridgeMat);
    bridge.position.set(6.5, 6.5, -6.0);
    this.meshGroup.add(bridge);

    // Command Deck Windows (Glowing Cyan)
    const winGeo = new THREE.BoxGeometry(4.8, 0.8, 0.4);
    const winMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
    const win = new THREE.Mesh(winGeo, winMat);
    win.position.set(6.5, 7.5, -10.6);
    this.meshGroup.add(win);

    // Rotating Radar Dish on Island Spire
    const radarMastGeo = new THREE.CylinderGeometry(0.2, 0.2, 3.0, 8);
    const radarDishGeo = new THREE.TorusGeometry(1.2, 0.25, 8, 16);
    const radarMat = new THREE.MeshStandardMaterial({ color: 0x00f3ff, metalness: 0.8 });
    const mast = new THREE.Mesh(radarMastGeo, bridgeMat);
    mast.position.set(6.5, 10.5, -6.0);
    this.meshGroup.add(mast);
    this.radarDish = new THREE.Mesh(radarDishGeo, radarMat);
    this.radarDish.position.set(6.5, 12.0, -6.0);
    this.meshGroup.add(this.radarDish);

    // ── 5. Quadruple Heavy Rear Ion Thrusters ──
    const engineMat = new THREE.MeshStandardMaterial({ color: 0x050812, metalness: 0.95 });
    const engineGlowMat = new THREE.MeshBasicMaterial({ color: 0x00aaff });
    [-7.5, -2.5, 2.5, 7.5].forEach(x => {
      const eGeo = new THREE.CylinderGeometry(1.8, 2.2, 4.5, 12);
      eGeo.rotateX(Math.PI / 2);
      const e = new THREE.Mesh(eGeo, engineMat);
      e.position.set(x, 0, 19.0);
      this.meshGroup.add(e);

      const flare = new THREE.Mesh(new THREE.ConeGeometry(1.5, 4.5, 12), engineGlowMat);
      flare.rotation.x = -Math.PI / 2;
      flare.position.set(0, 0, 2.4);
      e.add(flare);

      this.thrusterPositions.push(new THREE.Vector3(x, 0, 21.0));
    });

    // Engine Glow Point Light
    this.engineLight = new THREE.PointLight(0x0088ff, 2.5, 35);
    this.engineLight.position.set(0, 0, 21.0);
    this.meshGroup.add(this.engineLight);

    // ── 6. 4 Targetable Heavy Plasma Defense Batteries ──
    const turretBaseGeo = new THREE.CylinderGeometry(1.6, 2.0, 1.0, 12);
    const turretBaseMat = new THREE.MeshStandardMaterial({ color: 0x0a1220, metalness: 0.95 });
    const barrelGeo = new THREE.CylinderGeometry(0.32, 0.35, 4.0, 8);
    barrelGeo.rotateX(Math.PI / 2);
    this.barrelMat = new THREE.MeshBasicMaterial({ color: 0x00ff66 });

    this.turrets.forEach(t => {
      const tGroup = new THREE.Group();
      tGroup.position.copy(t.relPos);

      const base = new THREE.Mesh(turretBaseGeo, turretBaseMat);
      tGroup.add(base);

      const bGroup = new THREE.Group();
      [-0.65, 0.65].forEach(xOff => {
        const b = new THREE.Mesh(barrelGeo, this.barrelMat);
        b.position.set(xOff, 0.6, 1.4);
        bGroup.add(b);
      });
      tGroup.add(bGroup);

      // 3D Target Reticle for Turret
      const reticleGeo = new THREE.RingGeometry(1.4, 1.8, 16);
      const reticleMat = new THREE.MeshBasicMaterial({ color: 0x00ff66, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
      const reticle = new THREE.Mesh(reticleGeo, reticleMat);
      reticle.position.set(0, 2.0, 0);
      reticle.rotation.x = -Math.PI / 2;
      tGroup.add(reticle);

      this.meshGroup.add(tGroup);
      t.mesh = tGroup;
      t.barrelGroup = bGroup;
      t.reticle = reticle;
      this.reticleMeshes.push(reticle);
    });

    // ── 7. Heavy Broadside Siege Cannons & Laser Telegraph Sights ──
    const siegeBaseGeo = new THREE.BoxGeometry(2.8, 2.2, 4.0);
    const siegeBaseMat = new THREE.MeshStandardMaterial({ color: 0x060a12, metalness: 0.95, roughness: 0.2 });
    const siegeBarrelGeo = new THREE.CylinderGeometry(0.55, 0.65, 7.5, 10);
    siegeBarrelGeo.rotateX(Math.PI / 2);
    const siegeBarrelMat = new THREE.MeshStandardMaterial({ color: 0x111c2c, emissive: 0xff0044, emissiveIntensity: 0.2 });

    [-11.5, 11.5].forEach(x => {
      const sGroup = new THREE.Group();
      sGroup.position.set(x, -1.0, -8.0);

      const base = new THREE.Mesh(siegeBaseGeo, siegeBaseMat);
      sGroup.add(base);

      const barrel = new THREE.Mesh(siegeBarrelGeo, siegeBarrelMat);
      barrel.position.set(0, 0, 3.5);
      barrel.rotation.y = x > 0 ? Math.PI / 2 : -Math.PI / 2;
      sGroup.add(barrel);

      // Red laser telegraph sight
      const sightGeo = new THREE.CylinderGeometry(0.12, 0.12, 90, 6);
      sightGeo.rotateX(Math.PI / 2);
      const sightMat = new THREE.MeshBasicMaterial({ color: 0xff0044, transparent: true, opacity: 0.0 });
      const sight = new THREE.Mesh(sightGeo, sightMat);
      sight.position.set(x > 0 ? 45 : -45, 0, 0);
      sight.rotation.y = x > 0 ? Math.PI / 2 : -Math.PI / 2;
      sGroup.add(sight);

      this.meshGroup.add(sGroup);
      this.siegeCannons.push({ group: sGroup, barrel, sight, sightMat, isRight: x > 0 });
    });

    // ── 8. Hexagonal Hologram Shield Grid ──
    const shieldGeo = new THREE.IcosahedronGeometry(23.5, 3);
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

  takeTurretDamage(turretId, amount) {
    const t = this.turrets.find(item => item.id === turretId);
    if (!t || t.isDead) return false;

    t.hp -= amount;
    if (t.mesh) {
      t.mesh.traverse(c => {
        if (c.material && c.material.color) {
          c.material.color.setHex(0xff0044);
          setTimeout(() => {
            if (c && c.material && c.material.color) {
              c.material.color.setHex(t.isDead ? 0x111111 : 0x0a1220);
            }
          }, 100);
        }
      });
    }

    if (t.reticle && t.reticle.material) {
      const pct = t.hp / t.maxHp;
      t.reticle.material.color.setHex(pct > 0.5 ? 0x00ff66 : (pct > 0.25 ? 0xffaa00 : 0xff0044));
    }

    if (t.hp <= 0) {
      t.isDead = true;
      if (t.reticle) t.reticle.visible = false;
      const wp = this.meshGroup.position.clone().add(t.relPos);
      this.particleManager.createExplosion(wp, 0xff5500, 70, 2.5);
      this.particleManager.createEmpShockwave(wp, 30);
      if (window.spaceGameManager && window.spaceGameManager.spaceHUD) {
        window.spaceGameManager.spaceHUD.showRadioTransmission(`DEFENSE TURRET SILENCED! (${t.name})`, "STARBOUND COMMAND", 3.0);
      }
      if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
    }
    return t.isDead;
  }

  takeSubsystemDamage(systemId, amount) {
    const sub = this.subsystems.find(s => s.id === systemId);
    if (!sub || sub.isDead) return false;

    sub.hp -= amount;
    if (sub.mesh) {
      sub.mesh.traverse(c => {
        if (c.material && c.material.color) {
          c.material.color.setHex(0xff0044);
          setTimeout(() => {
            if (c && c.material && c.material.color) {
              c.material.color.setHex(sub.isDead ? 0x111111 : (systemId.includes('hangar') ? 0x141e2e : 0x182436));
            }
          }, 100);
        }
      });
    }

    if (sub.reticle && sub.reticle.material) {
      const pct = sub.hp / sub.maxHp;
      sub.reticle.material.color.setHex(pct > 0.5 ? 0x00ff88 : (pct > 0.25 ? 0xffea00 : 0xff0044));
    }

    if (sub.hp <= 0) {
      sub.isDead = true;
      if (sub.reticle) sub.reticle.visible = false;
      if (sub.forcefield) sub.forcefield.visible = false;
      const wp = this.meshGroup.position.clone().add(sub.relPos);
      this.particleManager.createExplosion(wp, 0xffaa00, 90, 3.5);
      this.particleManager.createEmpShockwave(wp, 40);
      if (navigator.vibrate) navigator.vibrate([80, 40, 100]);

      if (window.spaceGameManager && window.spaceGameManager.spaceHUD) {
        if (systemId === 'hangarLeft' || systemId === 'hangarRight') {
          const otherHangar = this.subsystems.find(s => (s.id === 'hangarLeft' || s.id === 'hangarRight') && s.id !== systemId);
          if (otherHangar && otherHangar.isDead) {
            window.spaceGameManager.spaceHUD.showRadioTransmission("ALL ENEMY HANGARS DESTROYED! REINFORCEMENTS HALTED!", "STARBOUND COMMAND", 5.0);
            if (window.spaceGameManager.voiceAnnouncer) {
              window.spaceGameManager.voiceAnnouncer.speak("All enemy hangars destroyed! Reinforcements halted!", true);
            }
          } else {
            window.spaceGameManager.spaceHUD.showRadioTransmission(`${sub.name} ENTRANCE COLLAPSED!`, "STARBOUND COMMAND", 3.5);
          }
        } else if (systemId.includes('missile')) {
          window.spaceGameManager.spaceHUD.showRadioTransmission(`${sub.name} DESTROYED!`, "STARBOUND COMMAND", 3.5);
        }
      }
    }
    return sub.isDead;
  }

  takeDamage(amount) {
    if (this.hasShield && this.shieldHp > 0) {
      this.shieldHp -= amount;
      if (this.shieldMesh) {
        this.shieldMesh.visible = true;
        this.shieldMat.opacity = 0.85;
        this.shieldMat.color.setHex(0xff0055); // Flashes red on impact
        setTimeout(() => {
          if (this.shieldMat) this.shieldMat.color.setHex(0x00f3ff);
        }, 100);
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
      if (this.shieldMesh) {
        this.shieldMesh.visible = true;
        this.shieldMat.opacity = 0.85;
      }
      if (window.spaceGameManager && window.spaceGameManager.spaceHUD) {
        window.spaceGameManager.spaceHUD.showRadioTransmission("WARNING: Enemy Carrier Energy Shield Overcharged! Target Flight Decks!", "STARBOUND COMMAND", 5.5);
      }
      if (window.spaceGameManager && window.spaceGameManager.voiceAnnouncer) {
        window.spaceGameManager.voiceAnnouncer.speak("Warning! Heavy Carrier Shield Overcharged!", true);
      }
      if (navigator.vibrate) navigator.vibrate([100, 50, 200]);
    }

    // Emissive damage feedback
    if (this.hullMat) {
      this.hullMat.emissive.setHex(0xff0044);
      this.hullMat.emissiveIntensity = 0.8;
      setTimeout(() => {
        if (this.isDead) return;
        if (this.hullMat) {
          this.hullMat.emissive.setHex(0x000c1c);
          this.hullMat.emissiveIntensity = 0.3;
        }
      }, 100);
    }

    if (this.coreHp <= 0 && !this.isDead) {
      this.isDead = true;
      if (window.spaceGameManager && window.spaceGameManager.spaceHUD) {
        window.spaceGameManager.spaceHUD.showLockOnWarning(false);
      }
      this._explode();
    }
    return this.isDead;
  }

  _explode() {
    this.particleManager.createExplosion(this.meshGroup.position, 0x00f3ff, 250, 5.0);
    this.particleManager.createExplosion(this.meshGroup.position, 0xff0055, 200, 4.0);
    this.particleManager.createExplosion(this.meshGroup.position, 0xffea00, 150, 3.5);
    this.particleManager.createEmpShockwave(this.meshGroup.position, 80);
    if (navigator.vibrate) navigator.vibrate([100, 50, 200, 50, 400]);
  }

  destroy() {
    this.isDead = true;
    if (window.spaceGameManager && window.spaceGameManager.spaceHUD) {
      window.spaceGameManager.spaceHUD.showLockOnWarning(false);
    }
    if (this.engineLight) this.scene.remove(this.engineLight);
    this.scene.remove(this.meshGroup);

    this.homingMissiles.forEach(m => m.destroy());
    this.homingMissiles = [];

    this.meshGroup.traverse(c => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) {
        if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
        else c.material.dispose();
      }
    });
  }

  update(dt, playerShip) {
    if (this.isDead) return { lasers: false, missiles: false, droneSpawns: 0, siegeLasers: false };

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

    if (this.radarDish) this.radarDish.rotation.y += 2.2 * dt;
    this.reticleMeshes.forEach(r => {
      if (r && r.visible) {
        r.rotation.z += 1.8 * dt;
      }
    });

    // 1. Dynamic Rear Ion Thruster Particle Plumes
    if (this.particleManager && Math.random() < 0.8) {
      this.thrusterPositions.forEach(relP => {
        const wp = this.meshGroup.localToWorld(relP.clone());
        this.particleManager.spawnEngineParticle(wp, 0x00f3ff);
      });
    }

    // 2. Sub-System Damage Smoke & Electrical Spark Particles
    this.subsystems.forEach(sub => {
      if (sub.isDead || sub.hp < sub.maxHp * 0.5) {
        if (Math.random() < (sub.isDead ? 0.6 : 0.3)) {
          const wp = this.meshGroup.localToWorld(sub.relPos.clone().add(new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 1.5,
            (Math.random() - 0.5) * 2
          )));
          this.particleManager.spawnEngineParticle(wp, sub.isDead ? 0xff4400 : 0x00f3ff);
        }
      }
    });

    // 3. Animated Runway Lights (Sequential pulse vs. Hazard Alert during drone launch)
    const isLaunchingSoon = this.droneLaunchTimer < 1.2;
    this.runwayLights.forEach(rl => {
      if (isLaunchingSoon) {
        // Red flashing hazard alert
        const flash = Math.sin(this._time * 16) > 0;
        rl.mat.color.setHex(flash ? 0xff0044 : 0x330000);
      } else {
        // Sequential blue runway light wave
        const wave = Math.sin((rl.baseZ * 0.3) + this._time * 6.0);
        rl.mat.color.setHex(wave > 0.3 ? 0x00f3ff : 0x004466);
      }
    });

    // 4. Hexagonal Shield Grid rotation & fade
    if (this.shieldMesh && this.shieldMesh.visible) {
      this.shieldMesh.rotation.y += 0.4 * dt;
      this.shieldMesh.rotation.x += 0.2 * dt;
      if (this.shieldMat.opacity > 0.3) {
        this.shieldMat.opacity = Math.max(0.3, this.shieldMat.opacity - dt * 1.2);
      }
    }

    // 5. Update turrets looking at player
    if (arrived) {
      this.turrets.forEach(t => {
        if (!t.isDead && t.mesh) {
          const localTarget = this.meshGroup.worldToLocal(playerPos.clone());
          t.mesh.lookAt(localTarget);
        }
      });
    }

    // 6. Plasma Turrets firing
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

    // 7. Heavy Broadside Siege Cannons (Telegraphed Aiming & Salvo)
    let siegeOutputs = [];
    if (arrived) {
      this.siegeCannonTimer -= dt;
      if (this.siegeCannonTimer <= 1.8 && !this.siegeCharging) {
        this.siegeCharging = true;
      }

      if (this.siegeCharging) {
        // Telegraph aiming lasers
        const alpha = Math.min(1.0, (1.8 - this.siegeCannonTimer) / 1.8);
        this.siegeCannons.forEach(sc => {
          sc.sightMat.opacity = alpha * 0.85;
        });

        if (this.siegeCannonTimer <= 0) {
          this.siegeCharging = false;
          this.siegeCannonTimer = 7.0;
          this.siegeCannons.forEach(sc => {
            sc.sightMat.opacity = 0.0;
            const wPos = sc.barrel.getWorldPosition(new THREE.Vector3());
            siegeOutputs.push(wPos);
            this.particleManager.createExplosion(wPos, 0xff0044, 25, 1.8);
          });
          if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
        }
      }
    }

    // 8. Homing Missile Salvo firing (if missile pods active)
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
      if (navigator.vibrate) navigator.vibrate(80);
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

    // 9. Drone Flight Deck Launching (if hangar bays active)
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
      siegeLasers: siegeOutputs.length > 0 ? siegeOutputs : false,
      droneSpawns: spawnDronesCount
    };
  }
}

