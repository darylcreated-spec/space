import * as THREE from 'three';

/**
 * Procedural Normal/Bump Texture for Valiant Capital Cruiser Armor (Silver Platinum Finish)
 */
function generateCruiserArmorTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Base metallic brushed silver alloy
  ctx.fillStyle = '#ccd6e0';
  ctx.fillRect(0, 0, 256, 256);

  // Geometric silver panel seams
  ctx.strokeStyle = '#8092a6';
  ctx.lineWidth = 2.2;
  for (let x = 0; x < 256; x += 32) {
    ctx.strokeRect(x, 0, 32, 256);
  }
  for (let y = 0; y < 256; y += 32) {
    ctx.strokeRect(0, y, 256, 32);
  }

  // Micro-rivets along armor boundaries
  ctx.fillStyle = '#f4f8fc';
  for (let y = 4; y < 256; y += 16) {
    for (let x = 4; x < 256; x += 32) {
      ctx.beginPath();
      ctx.arc(x, y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Cyan energized circuit conduits
  ctx.strokeStyle = '#00f3ff';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(0, 128); ctx.lineTo(64, 128); ctx.lineTo(96, 96); ctx.lineTo(256, 96);
  ctx.stroke();

  return new THREE.CanvasTexture(canvas);
}

export class CapitalShip {
  constructor(scene, particleManager) {
    this.scene = scene;
    this.particleManager = particleManager;

    this.radius = 4.5;
    this.hp = 350;
    this.maxHp = 350;
    this.scoreValue = 1200;
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
      { id: 0, relPos: new THREE.Vector3(-3.2, 1.2, -0.5), pedestalH: 1.6, hp: 90, maxHp: 90, isDead: false, mesh: null, barrelGroup: null },
      { id: 1, relPos: new THREE.Vector3( 3.2, 1.2, -0.5), pedestalH: 1.6, hp: 90, maxHp: 90, isDead: false, mesh: null, barrelGroup: null }
    ];
    this.underwingMissiles = [];
    this.missileTimer = 3.2;
    this.thrusters = [];

    this.buildMesh();
    this.scene.add(this.meshGroup);
  }

  buildMesh() {
    this.armorTexture = generateCruiserArmorTexture();

    // ── High-Definition Sleek Silver / Platinum Materials ──
    this.hullMat = new THREE.MeshStandardMaterial({
      color: 0xc8d6e5,
      bumpMap: this.armorTexture,
      bumpScale: 0.12,
      metalness: 0.95,
      roughness: 0.16,
      emissive: 0x182230,
      emissiveIntensity: 0.25
    });

    this.armorPlatesMat = new THREE.MeshStandardMaterial({
      color: 0xf0f5fb,
      metalness: 0.98,
      roughness: 0.10,
      bumpMap: this.armorTexture,
      bumpScale: 0.06
    });

    this.darkAlloyMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.92,
      roughness: 0.20
    });

    this.glowCyanMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });

    this.glowBlueMat = new THREE.MeshBasicMaterial({
      color: 0x0088ff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    this.glowAmberMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.9
    });

    // ── 1. Central Wedged Warship Hull ──
    const mainHullGeo = new THREE.BoxGeometry(3.6, 1.4, 8.4);
    const mainHull = new THREE.Mesh(mainHullGeo, this.hullMat);
    mainHull.position.set(0, 0, 0);
    this.meshGroup.add(mainHull);

    // Chisel-head bow prow
    const prowGeo = new THREE.ConeGeometry(2.2, 4.2, 4);
    prowGeo.rotateX(Math.PI / 2);
    prowGeo.scale(1.2, 0.45, 1.0);
    const prow = new THREE.Mesh(prowGeo, this.armorPlatesMat);
    prow.position.set(0, 0, 5.2);
    this.meshGroup.add(prow);

    // ── 2. Dorsal Command Bridge Spire ──
    const bridgeSpireGeo = new THREE.BoxGeometry(1.6, 0.9, 2.6);
    const bridgeSpire = new THREE.Mesh(bridgeSpireGeo, this.armorPlatesMat);
    bridgeSpire.position.set(0, 0.95, -1.2);
    this.meshGroup.add(bridgeSpire);

    // Glowing Cyan Bridge Visor
    const visorGeo = new THREE.BoxGeometry(1.4, 0.25, 0.6);
    const visor = new THREE.Mesh(visorGeo, this.glowCyanMat);
    visor.position.set(0, 1.1, -0.4);
    this.meshGroup.add(visor);

    // ── 3. Port & Starboard Heavy Outrigger Sponsons & Swept Warship Wings ──
    [-1, 1].forEach(side => {
      const sx = side * 3.2;

      // Heavy Inboard Sponson
      const sponsonGeo = new THREE.BoxGeometry(2.4, 0.8, 6.0);
      const sponson = new THREE.Mesh(sponsonGeo, this.hullMat);
      sponson.position.set(sx, 0, -0.2);
      this.meshGroup.add(sponson);

      // Connecting Pylon Strut
      const strutGeo = new THREE.BoxGeometry(1.6, 0.35, 2.2);
      const strut = new THREE.Mesh(strutGeo, this.darkAlloyMat);
      strut.position.set(side * 1.9, 0, -0.5);
      this.meshGroup.add(strut);

      // Sponson Armor Plating
      const pPlateGeo = new THREE.BoxGeometry(2.5, 0.15, 4.0);
      const pPlate = new THREE.Mesh(pPlateGeo, this.armorPlatesMat);
      pPlate.position.set(sx, 0.45, -0.2);
      this.meshGroup.add(pPlate);

      // ── ✨ SWEPT CAPITAL WARSHIP WING (Extending to 7.0m Span) ──
      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, 1.8);
      wingShape.lineTo(side * 3.8, -0.4);  // Outward swept wingtip leading edge
      wingShape.lineTo(side * 3.6, -2.4);  // Wingtip trailing edge
      wingShape.lineTo(0, -1.8);           // Root trailing edge
      wingShape.closePath();

      const wingExtrude = { depth: 0.22, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.05, bevelThickness: 0.05 };
      const wingGeo = new THREE.ExtrudeGeometry(wingShape, wingExtrude);
      wingGeo.rotateX(-Math.PI / 2);
      const wingMesh = new THREE.Mesh(wingGeo, this.hullMat);
      wingMesh.position.set(sx, 0.05, 0);
      this.meshGroup.add(wingMesh);

      // Titanium Leading Edge Armor Slat
      const slatGeo = new THREE.BoxGeometry(0.24, 0.28, 4.2);
      const slatMesh = new THREE.Mesh(slatGeo, this.darkAlloyMat);
      slatMesh.position.set(sx + side * 1.9, 0.1, 0.7);
      slatMesh.rotation.y = -side * 0.45;
      this.meshGroup.add(slatMesh);

      // Glowing Neon Cyan Wing Conduit
      const conduitGeo = new THREE.BoxGeometry(0.12, 0.12, 3.6);
      const conduit = new THREE.Mesh(conduitGeo, this.glowCyanMat);
      conduit.position.set(sx + side * 1.8, 0.18, 0.6);
      conduit.rotation.y = -side * 0.45;
      this.meshGroup.add(conduit);

      // Vertical Wingtip Winglet Stabilizer
      const wingletGeo = new THREE.BoxGeometry(0.18, 1.4, 2.2);
      const winglet = new THREE.Mesh(wingletGeo, this.armorPlatesMat);
      winglet.position.set(sx + side * 3.7, 0.5, -1.4);
      winglet.rotation.x = -0.15;
      winglet.rotation.z = side * 0.12;
      this.meshGroup.add(winglet);

      // Winglet Cyan Navigation Beacon
      const wBeaconGeo = new THREE.BoxGeometry(0.12, 1.2, 0.15);
      const wBeacon = new THREE.Mesh(wBeaconGeo, this.glowCyanMat);
      wBeacon.position.set(sx + side * 3.75, 0.5, -2.4);
      this.meshGroup.add(wBeacon);

      // ── 🚀 UNDERWING HEAVY MISSILE PYLONS & TORPEDO ORDNANCE ──
      const missilePylonGeo = new THREE.BoxGeometry(0.08, 0.32, 1.4);
      const missileBodyGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.8, 8);
      missileBodyGeo.rotateX(Math.PI / 2);
      const warheadGeo = new THREE.ConeGeometry(0.14, 0.45, 8);
      warheadGeo.rotateX(Math.PI / 2);
      const finGeo = new THREE.BoxGeometry(0.5, 0.04, 0.4);

      [
        { id: `${side < 0 ? 'port' : 'starboard'}_inboard`,  x: sx + side * 1.4, y: -0.32, z: 0.2 },
        { id: `${side < 0 ? 'port' : 'starboard'}_outboard`, x: sx + side * 2.6, y: -0.32, z: -0.6 }
      ].forEach(mPos => {
        const mGroup = new THREE.Group();
        mGroup.position.set(mPos.x, mPos.y, mPos.z);

        // Armored Suspension Pylon
        const pylon = new THREE.Mesh(missilePylonGeo, this.darkAlloyMat);
        pylon.position.set(0, 0.16, 0);
        mGroup.add(pylon);

        // Sleek Cylindrical Missile Fuselage
        const mBody = new THREE.Mesh(missileBodyGeo, this.armorPlatesMat);
        mGroup.add(mBody);

        // Kinetic Warhead Cone with Seeker Tip
        const warhead = new THREE.Mesh(warheadGeo, this.glowOrangeMat);
        warhead.position.set(0, 0, 1.1);
        mGroup.add(warhead);

        // Seeker Optical Lens
        const seeker = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), this.glowCyanMat);
        seeker.position.set(0, 0, 1.35);
        mGroup.add(seeker);

        // Cruciform Tail Stabilizer Fins
        const fin1 = new THREE.Mesh(finGeo, this.darkAlloyMat);
        fin1.position.set(0, 0, -0.7);
        mGroup.add(fin1);

        const fin2 = new THREE.Mesh(finGeo, this.darkAlloyMat);
        fin2.position.set(0, 0, -0.7);
        fin2.rotation.z = Math.PI / 2;
        mGroup.add(fin2);

        // Glowing Solid Rocket Exhaust Port
        const nozzle = new THREE.Mesh(new THREE.RingGeometry(0.04, 0.1, 8), this.glowCyanMat);
        nozzle.position.set(0, 0, -0.92);
        mGroup.add(nozzle);

        this.meshGroup.add(mGroup);

        this.underwingMissiles.push({
          id: mPos.id,
          mesh: mGroup,
          relPos: new THREE.Vector3(mPos.x, mPos.y, mPos.z),
          hp: 40,
          isDead: false
        });
      });
    });

    // ── 4. ✨ SWEPT DORSAL EMPENNAGE TAIL FIN ──
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, 1.6, -3.2);

    const tailFinGeo = new THREE.BoxGeometry(0.4, 2.4, 3.8);
    const tailFin = new THREE.Mesh(tailFinGeo, this.hullMat);
    tailFin.position.set(0, 0.9, 0);
    tailFin.rotation.x = -0.3; // Swept backwards
    tailGroup.add(tailFin);

    // Titanium Leading Edge Armor Spine
    const tailSpineGeo = new THREE.BoxGeometry(0.5, 2.6, 0.6);
    const tailSpine = new THREE.Mesh(tailSpineGeo, this.armorPlatesMat);
    tailSpine.position.set(0, 0.9, 1.6);
    tailSpine.rotation.x = -0.3;
    tailGroup.add(tailSpine);

    // Glowing Neon Cyan Trailing Beacon Strip
    const tailBeaconGeo = new THREE.BoxGeometry(0.2, 2.2, 0.2);
    const tailBeacon = new THREE.Mesh(tailBeaconGeo, this.glowCyanMat);
    tailBeacon.position.set(0, 0.9, -1.6);
    tailBeacon.rotation.x = -0.3;
    tailGroup.add(tailBeacon);

    // Dorsal Tail Antenna Mast
    const tailAntennaGeo = new THREE.CylinderGeometry(0.04, 0.08, 1.8, 6);
    const tailAntenna = new THREE.Mesh(tailAntennaGeo, this.darkAlloyMat);
    tailAntenna.position.set(0, 2.4, -0.6);
    tailGroup.add(tailAntenna);

    this.meshGroup.add(tailGroup);

    // ── 5. Twin Point-Defense Dual-Railgun Turrets (Elevated Superfiring Barbettes!) ──
    const turretBarbetteGeo = new THREE.CylinderGeometry(0.75, 0.95, 0.4, 8);
    const turretHouseGeo = new THREE.BoxGeometry(0.9, 0.5, 1.1);
    const barrelGeo = new THREE.CylinderGeometry(0.08, 0.1, 1.6, 8);
    barrelGeo.rotateX(Math.PI / 2);

    this.turrets.forEach(t => {
      const tGroup = new THREE.Group();
      tGroup.position.copy(t.relPos);

      // Armored Riser Pedestal
      const pedH = t.pedestalH || 1.6;
      const pedGeo = new THREE.CylinderGeometry(0.85, 1.1, pedH, 8);
      const pedMesh = new THREE.Mesh(pedGeo, this.darkAlloyMat);
      pedMesh.position.set(0, -pedH / 2, 0);
      tGroup.add(pedMesh);

      const barbette = new THREE.Mesh(turretBarbetteGeo, this.darkAlloyMat);
      tGroup.add(barbette);

      const barrelGroup = new THREE.Group();
      barrelGroup.position.set(0, 0.35, 0);

      const house = new THREE.Mesh(turretHouseGeo, this.armorPlatesMat);
      barrelGroup.add(house);

      [-0.24, 0.24].forEach(bx => {
        const barrel = new THREE.Mesh(barrelGeo, this.darkAlloyMat);
        barrel.position.set(bx, 0.08, 0.7);
        barrelGroup.add(barrel);

        const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.2, 8), this.glowCyanMat);
        tip.rotateX(Math.PI / 2);
        tip.position.set(bx, 0.08, 1.5);
        barrelGroup.add(tip);
      });

      tGroup.add(barrelGroup);
      this.meshGroup.add(tGroup);

      t.mesh = tGroup;
      t.barrelGroup = barrelGroup;
    });

    // ── 6. Stern Twin Heavy Vectoring Ion Thrusters ──
    [-1.1, 1.1].forEach(ex => {
      const engineNacelle = new THREE.Group();
      engineNacelle.position.set(ex, 0, -4.5);

      const cowlGeo = new THREE.BoxGeometry(1.3, 1.1, 2.2);
      const cowlMesh = new THREE.Mesh(cowlGeo, this.darkAlloyMat);
      engineNacelle.add(cowlMesh);

      // Exhaust Nozzle
      const nozzleGeo = new THREE.CylinderGeometry(0.45, 0.6, 0.8, 10);
      nozzleGeo.rotateX(Math.PI / 2);
      const nozzleMesh = new THREE.Mesh(nozzleGeo, this.armorPlatesMat);
      nozzleMesh.position.set(0, 0, -1.2);
      engineNacelle.add(nozzleMesh);

      // Glowing Ion Exhaust Core
      const coreGeo = new THREE.PlaneGeometry(0.8, 0.8);
      coreGeo.rotateY(Math.PI);
      const coreMesh = new THREE.Mesh(coreGeo, this.glowCyanMat);
      coreMesh.position.set(0, 0, -1.62);
      engineNacelle.add(coreMesh);

      // Pulsating Mach Shock Diamond
      const shockGeo = new THREE.ConeGeometry(0.35, 1.8, 8);
      shockGeo.rotateX(-Math.PI / 2);
      const shockMesh = new THREE.Mesh(shockGeo, this.glowCyanMat);
      shockMesh.position.set(0, 0, -2.4);
      engineNacelle.add(shockMesh);
      this.thrusters.push(shockMesh);

      this.meshGroup.add(engineNacelle);
    });

    // ── 7. Ventral Keel Torpedo Bay ──
    const torpedoBayGeo = new THREE.BoxGeometry(0.6, 0.4, 2.0);
    const torpedoBayMesh = new THREE.Mesh(torpedoBayGeo, this.darkAlloyMat);
    torpedoBayMesh.position.set(0, -0.65, 3.2);
    this.meshGroup.add(torpedoBayMesh);

    const torpedoCoreGeo = new THREE.SphereGeometry(0.25, 8, 8);
    const torpedoCore = new THREE.Mesh(torpedoCoreGeo, this.glowCyanMat);
    torpedoCore.position.set(0, -0.65, 4.2);
    this.meshGroup.add(torpedoCore);

    // Dedicated Specular Light for Hull Definition
    this.keyLight = new THREE.PointLight(0xd8e8ff, 3.5, 45);
    this.keyLight.position.set(0, 7.0, 4.0);
    this.meshGroup.add(this.keyLight);
  }

  takeTurretDamage(turretId, amount) {
    const t = this.turrets.find(tur => tur.id === turretId);
    if (!t || t.isDead) return false;
    t.hp -= amount;

    if (t.hp <= 0) {
      t.isDead = true;
      if (t.mesh) t.mesh.visible = false;
      const wp = t.mesh.getWorldPosition(new THREE.Vector3());
      if (this.particleManager) {
        this.particleManager.createExplosion(wp, 0x00f3ff, 40, 1.8);
      }
      return true;
    }
    return false;
  }

  takeDamage(amount, hitPos = null) {
    // Check if hit landed on a turret
    if (hitPos && this.turrets) {
      for (const t of this.turrets) {
        if (!t.isDead && t.mesh) {
          const tPos = t.mesh.getWorldPosition(new THREE.Vector3());
          if (hitPos.distanceTo(tPos) < 2.0) {
            this.takeTurretDamage(t.id, amount * 1.5);
            break;
          }
        }
      }
    }

    // Check if hit landed on an underwing missile
    if (hitPos && this.underwingMissiles) {
      for (const m of this.underwingMissiles) {
        if (!m.isDead && m.mesh) {
          const mPos = m.mesh.getWorldPosition(new THREE.Vector3());
          if (hitPos.distanceTo(mPos) < 1.4) {
            m.hp -= amount * 1.5;
            if (m.hp <= 0) {
              m.isDead = true;
              m.mesh.visible = false;
              if (this.particleManager) {
                this.particleManager.createExplosion(mPos, 0xff7700, 30, 1.4);
                this.particleManager.spawnSparks(mPos, new THREE.Vector3(0, -1, 0), 0xffaa00, 15);
              }
            }
            break;
          }
        }
      }
    }

    this.hp -= amount;

    if (this.particleManager) {
      this.particleManager.createLaserImpact(this.meshGroup.position, new THREE.Vector3(0, 0, 1), 0x00f3ff);
      this.particleManager.spawnSparks(this.meshGroup.position, new THREE.Vector3(0, 0, 1), 0x00d4ff, 8);
    }

    // Emissive flash feedback
    if (this.hullMat) {
      this.hullMat.emissive.setHex(0xff0055);
      this.hullMat.emissiveIntensity = 2.2;
      setTimeout(() => {
        if (this.isDead) return;
        if (this.hullMat) {
          this.hullMat.emissive.setHex(0x111c2e);
          this.hullMat.emissiveIntensity = 0.35;
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
    this.particleManager.spawnSparks(this.meshGroup.position, new THREE.Vector3(0, 0, 1), 0x00ffff, 25);
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

    // Pulsing Ion Thruster Shock Diamonds
    if (this.thrusters && this.thrusters.length > 0) {
      const pulse = 0.88 + Math.sin(Date.now() * 0.016) * 0.22;
      this.thrusters.forEach(t => {
        if (t && t.scale) t.scale.set(pulse, pulse, pulse * 1.25);
      });
    }

    // Move forward from deep space and hover
    if (this.meshGroup.position.z < this.targetZ) {
      this.meshGroup.position.z += this.speed * dt;
    } else {
      // Tactical hover weave movement
      this.meshGroup.position.z += Math.sin(this._time * 1.5) * 0.8 * dt;
      this.meshGroup.position.x += Math.cos(this._time * 1.0) * 1.2 * dt;
    }

    // Turrets aim at player in world coordinates with deck-clearance pitch clamping
    this.turrets.forEach(t => {
      if (!t.isDead && t.barrelGroup) {
        const localTarget = this.meshGroup.worldToLocal(playerPos.clone());
        localTarget.y = Math.max(localTarget.y, t.relPos.y + 0.15);
        t.barrelGroup.lookAt(localTarget);
      }
    });

    // ── Underwing Missile Launch Salvo ──
    this.missileTimer -= dt;
    if (this.missileTimer <= 0 && this.meshGroup.position.z >= -40 && this.meshGroup.position.z < 25) {
      this.missileTimer = 3.2 + Math.random() * 0.8;
      const gm = window.spaceGameManager;
      if (this.underwingMissiles && gm) {
        this.underwingMissiles.forEach(m => {
          if (!m.isDead && m.mesh && Math.random() < 0.6) {
            const mPos = m.mesh.getWorldPosition(new THREE.Vector3());
            if (gm.spawnEnemyMissile) {
              gm.spawnEnemyMissile(mPos, playerPos);
            } else if (gm.spawnEnemyLaser) {
              const dir = new THREE.Vector3().subVectors(playerPos, mPos).normalize();
              gm.spawnEnemyLaser(mPos, dir, 0xff7700, 38);
            }
            if (this.particleManager) {
              this.particleManager.spawnSparks(mPos, new THREE.Vector3(0, -1, 1), 0x00f3ff, 8);
            }
          }
        });
      }
    }

    // Firing logic
    this.fireTimer -= dt;
    let shouldFire = false;
    const out = [];

    // Firing starts once cruiser is near the player space
    if (this.fireTimer <= 0 && this.meshGroup.position.z < 25) {
      this.fireTimer = 1.4 + Math.random() * 0.4;
      this.turrets.forEach(t => {
        if (!t.isDead && t.mesh) {
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
