import * as THREE from 'three';

export class PlayerShip {
  constructor(scene, particleManager) {
    this.scene = scene;
    this.particleManager = particleManager;

    this.meshGroup = new THREE.Group();

    // Stats
    this.maxShield = 100;
    this.shield = 100;
    this.speed = 28;
    this.radius = 1.6;
    this.laserFireDelay = 0.10;

    // Velocity & Banking
    this.velocity = new THREE.Vector3();
    this.targetRoll = 0;
    this.currentRoll = 0;
    this.targetPitch = 0;
    this.currentPitch = 0;

    this.bounds = { minX: -14.0, maxX: 14.0, minY: -7.0, maxY: 8.0 };

    this.laserCooldown = 0;
    this.pulseCooldown = 0;
    this.maxPulseCD = 8.0;
    this.shieldRippleTimer = 0;
    this._thrusterTick = 0;
    this._time = 0;

    // AAA Upgrade Subsystems
    this.shipClass = 'INTERCEPTOR';
    this.dodgeTimer = 0;
    this.dodgeCooldown = 0;
    this.dodgeDirection = null;
    this.isInvulnerable = true; // Temporary test value
    this.tractorBeamLevel = 0;
    this.activePerks = new Set();

    this.buildShipMesh();
    this.meshGroup.position.set(0, 0, 0);
    this.scene.add(this.meshGroup);
  }

  buildShipMesh() {
    // ── 1. Main Fuselage — sleek elongated fighter ──
    const bodyGeo = new THREE.ConeGeometry(0.9, 5.5, 8);
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x0d1628,
      metalness: 0.95,
      roughness: 0.15,
      emissive: 0x001133,
      emissiveIntensity: 0.2,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    this.meshGroup.add(body);

    // ── 2. Cockpit Canopy — larger, more prominent ──
    const canopyGeo = new THREE.SphereGeometry(0.6, 14, 14);
    canopyGeo.scale(0.85, 0.65, 1.6);
    this.canopyMat = new THREE.MeshStandardMaterial({
      color: 0x00c8ff,
      transparent: true,
      opacity: 0.75,
      roughness: 0.0,
      metalness: 0.05,
      emissive: 0x00aaff,
      emissiveIntensity: 1.2,
    });
    const canopy = new THREE.Mesh(canopyGeo, this.canopyMat);
    canopy.position.set(0, 0.32, -0.3);
    this.meshGroup.add(canopy);

    // ── 3. Swept Delta Wings — larger, more dramatic ──
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(3.4, -1.6);
    wingShape.lineTo(3.6, -2.8);
    wingShape.lineTo(0.8, -1.4);
    wingShape.closePath();

    const extrudeSettings = { depth: 0.12, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 1 };
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);
    wingGeo.center();
    wingGeo.rotateX(Math.PI / 2);
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x172038, metalness: 0.85, roughness: 0.25 });

    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.position.set(1.5, 0, 0.3);
    this.meshGroup.add(rightWing);

    const leftWingGeo = wingGeo.clone();
    leftWingGeo.scale(-1, 1, 1);
    const leftWing = new THREE.Mesh(leftWingGeo, wingMat);
    leftWing.position.set(-1.5, 0, 0.3);
    this.meshGroup.add(leftWing);

    // ── 4. Wing Edge Accent Strips — neon cyan glow ──
    this.edgeMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
    const makeEdge = (x) => {
      const eg = new THREE.BoxGeometry(0.06, 0.06, 2.4);
      const e = new THREE.Mesh(eg, this.edgeMat);
      e.position.set(x, 0.07, 0.1);
      this.meshGroup.add(e);
    };
    makeEdge(2.1); makeEdge(-2.1);

    // ── 5. Laser Cannons — longer, more prominent ──
    const cannonGeo = new THREE.CylinderGeometry(0.09, 0.09, 2.0, 7);
    cannonGeo.rotateX(Math.PI / 2);
    const cannonMat = new THREE.MeshStandardMaterial({ color: 0x28405e, metalness: 0.95, roughness: 0.08 });
    this.muzzleMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });

    [-2.9, 2.9].forEach(x => {
      const cannon = new THREE.Mesh(cannonGeo, cannonMat);
      cannon.position.set(x, 0, -0.8);
      this.meshGroup.add(cannon);
      // Muzzle tip glow dot
      const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), this.muzzleMat);
      muzzle.position.set(x, 0, -1.8);
      this.meshGroup.add(muzzle);
    });

    // ── 6. Twin Engine Nacelles — wide, powerful ──
    const engineGeo = new THREE.CylinderGeometry(0.32, 0.44, 1.1, 10);
    engineGeo.rotateX(Math.PI / 2);
    const engineMat = new THREE.MeshStandardMaterial({ color: 0x060c18, metalness: 0.95, roughness: 0.05 });

    this.engineRight = new THREE.Mesh(engineGeo, engineMat);
    this.engineRight.position.set(0.68, -0.1, 2.3);
    this.meshGroup.add(this.engineRight);

    this.engineLeft = new THREE.Mesh(engineGeo, engineMat);
    this.engineLeft.position.set(-0.68, -0.1, 2.3);
    this.meshGroup.add(this.engineLeft);

    // Engine inner glow rings
    this.glowRingMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
    [this.engineRight, this.engineLeft].forEach(eng => {
      const gr = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.06, 8, 20), this.glowRingMat);
      gr.rotation.x = Math.PI / 2;
      gr.position.z = 0.5;
      eng.add(gr);
    });

    // ── 7. Afterburner Flame Cones — dynamic, large ──
    this.flameMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
    this.flameOuterMat = new THREE.MeshBasicMaterial({ color: 0x0044ff, transparent: true, opacity: 0.5 });

    this.flameR_inner = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1.4, 10), this.flameMat);
    this.flameR_inner.rotation.x = -Math.PI / 2;
    this.flameR_inner.position.set(0, 0, 0.65);
    this.engineRight.add(this.flameR_inner);

    this.flameL_inner = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1.4, 10), this.flameMat);
    this.flameL_inner.rotation.x = -Math.PI / 2;
    this.flameL_inner.position.set(0, 0, 0.65);
    this.engineLeft.add(this.flameL_inner);

    // outer halo
    this.flameR_outer = new THREE.Mesh(new THREE.ConeGeometry(0.44, 1.0, 10), this.flameOuterMat);
    this.flameR_outer.rotation.x = -Math.PI / 2;
    this.flameR_outer.position.set(0, 0, 0.5);
    this.engineRight.add(this.flameR_outer);

    // ── 8. Cant-Angled Vertical Stabilizers / Tail Fins ──
    const finGeo = new THREE.BoxGeometry(0.08, 0.95, 1.4);
    const finMat = new THREE.MeshStandardMaterial({ color: 0x0c1626, metalness: 0.9, roughness: 0.2 });
    const finR = new THREE.Mesh(finGeo, finMat);
    finR.position.set(0.72, 0.45, 1.3);
    finR.rotation.z = -0.25;
    this.meshGroup.add(finR);

    const finL = new THREE.Mesh(finGeo, finMat);
    finL.position.set(-0.72, 0.45, 1.3);
    finL.rotation.z = 0.25;
    this.meshGroup.add(finL);

    // ── 9. Wingtip Navigation Strobe Beacons (Green Starboard / Red Port) ──
    this.strobeR = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), new THREE.MeshBasicMaterial({ color: 0x00ff44 }));
    this.strobeR.position.set(3.4, 0.05, -1.6);
    this.meshGroup.add(this.strobeR);

    this.strobeL = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff0044 }));
    this.strobeL.position.set(-3.4, 0.05, -1.6);
    this.meshGroup.add(this.strobeL);

    // ── 10. Internal Cockpit Pilot Holographic Reticle ──
    const hudReticleGeo = new THREE.RingGeometry(0.10, 0.13, 16);
    const hudReticleMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, side: THREE.DoubleSide });
    this.cockpitHud = new THREE.Mesh(hudReticleGeo, hudReticleMat);
    this.cockpitHud.position.set(0, 0.35, -0.65);
    this.meshGroup.add(this.cockpitHud);

    // ── 11. Engine Point Lights ──
    this.engineLight = new THREE.PointLight(0x00aaff, 4.5, 14);
    this.engineLight.position.set(0, 0, 2.5);
    this.meshGroup.add(this.engineLight);

    // ── 12. Nose glow light ──
    this.noseLight = new THREE.PointLight(0x00f3ff, 1.5, 8);
    this.noseLight.position.set(0, 0, -2.5);
    this.meshGroup.add(this.noseLight);

    // ── 13. Shield Icosahedron ──
    const shieldGeo = new THREE.IcosahedronGeometry(3.2, 2);
    this.shieldMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      wireframe: true,
      transparent: true,
      opacity: 0.0
    });
    this.shieldMesh = new THREE.Mesh(shieldGeo, this.shieldMat);
    this.meshGroup.add(this.shieldMesh);
  }

  takeDamage(amount) {
    if (this.dodgeTimer > 0 || this.isInvulnerable) {
      return false; // Immune during dodge roll!
    }

    let finalAmount = amount;
    if (this.shipClass === 'DREADNOUGHT') {
      finalAmount *= 0.75; // Dreadnought takes 25% less damage!
    }

    const prevShield = this.shield;
    this.shield = Math.max(0, this.shield - finalAmount);
    this.shieldRippleTimer = 0.45;
    if (this.shieldMat) this.shieldMat.opacity = 0.95;

    // Trigger visual glitch overlay on DOM canvas-container!
    const canvasContainer = document.getElementById('canvas-container');
    if (canvasContainer) {
      canvasContainer.classList.add('camera-glitch');
      setTimeout(() => {
        canvasContainer.classList.remove('camera-glitch');
      }, 300);
    }

    // Breach check: if shields were > 0 and are now <= 0
    if (prevShield > 0 && this.shield <= 0) {
      if (this.activePerks && this.activePerks.has('retaliate')) {
        this.particleManager.createEmpShockwave(this.meshGroup.position, 90);
        this.pendingRetaliateEMP = true;
      }
    }

    return this.shield <= 0;
  }

  setShipClass(className) {
    this.shipClass = className;
    if (className === 'INTERCEPTOR') {
      this.maxShield = 80;
      this.speed = 36;
      this.laserFireDelay = 0.08;

      const yellow = 0xffea00;
      const gold = 0xffaa00;
      if (this.canopyMat) { this.canopyMat.color.setHex(yellow); this.canopyMat.emissive.setHex(gold); }
      if (this.edgeMat) this.edgeMat.color.setHex(yellow);
      if (this.muzzleMat) this.muzzleMat.color.setHex(yellow);
      if (this.glowRingMat) this.glowRingMat.color.setHex(yellow);
      if (this.flameMat) this.flameMat.color.setHex(yellow);
      if (this.flameOuterMat) this.flameOuterMat.color.setHex(gold);
      if (this.engineLight) this.engineLight.color.setHex(yellow);
      if (this.noseLight) this.noseLight.color.setHex(yellow);
      if (this.shieldMat) this.shieldMat.color.setHex(yellow);
    } else if (className === 'DREADNOUGHT') {
      this.maxShield = 180;
      this.speed = 22;
      this.laserFireDelay = 0.14;

      const red = 0xff0044;
      const darkRed = 0x990000;
      if (this.canopyMat) { this.canopyMat.color.setHex(red); this.canopyMat.emissive.setHex(darkRed); }
      if (this.edgeMat) this.edgeMat.color.setHex(red);
      if (this.muzzleMat) this.muzzleMat.color.setHex(red);
      if (this.glowRingMat) this.glowRingMat.color.setHex(red);
      if (this.flameMat) this.flameMat.color.setHex(red);
      if (this.flameOuterMat) this.flameOuterMat.color.setHex(darkRed);
      if (this.engineLight) this.engineLight.color.setHex(red);
      if (this.noseLight) this.noseLight.color.setHex(red);
      if (this.shieldMat) this.shieldMat.color.setHex(red);
    } else if (className === 'TACTICIAN') {
      this.maxShield = 100;
      this.speed = 28;
      this.laserFireDelay = 0.11;

      const green = 0x00ff66;
      const magenta = 0xff00ff;
      if (this.canopyMat) { this.canopyMat.color.setHex(green); this.canopyMat.emissive.setHex(magenta); }
      if (this.edgeMat) this.edgeMat.color.setHex(green);
      if (this.muzzleMat) this.muzzleMat.color.setHex(green);
      if (this.glowRingMat) this.glowRingMat.color.setHex(green);
      if (this.flameMat) this.flameMat.color.setHex(green);
      if (this.flameOuterMat) this.flameOuterMat.color.setHex(magenta);
      if (this.engineLight) this.engineLight.color.setHex(green);
      if (this.noseLight) this.noseLight.color.setHex(green);
      if (this.shieldMat) this.shieldMat.color.setHex(green);
    } else if (className === 'REAPER') {
      this.maxShield = 90;
      this.speed = 30;
      this.laserFireDelay = 0.10;

      const purple = 0x8800ff;
      const magenta = 0xff00bb;
      if (this.canopyMat) { this.canopyMat.color.setHex(purple); this.canopyMat.emissive.setHex(magenta); }
      if (this.edgeMat) this.edgeMat.color.setHex(purple);
      if (this.muzzleMat) this.muzzleMat.color.setHex(purple);
      if (this.glowRingMat) this.glowRingMat.color.setHex(purple);
      if (this.flameMat) this.flameMat.color.setHex(purple);
      if (this.flameOuterMat) this.flameOuterMat.color.setHex(magenta);
      if (this.engineLight) this.engineLight.color.setHex(purple);
      if (this.noseLight) this.noseLight.color.setHex(purple);
      if (this.shieldMat) this.shieldMat.color.setHex(purple);
    } else if (className === 'SENTINEL') {
      this.maxShield = 120;
      this.speed = 25;
      this.laserFireDelay = 0.13;

      const cyan = 0x00f3ff;
      const blue = 0x0044ff;
      if (this.canopyMat) { this.canopyMat.color.setHex(cyan); this.canopyMat.emissive.setHex(blue); }
      if (this.edgeMat) this.edgeMat.color.setHex(cyan);
      if (this.muzzleMat) this.muzzleMat.color.setHex(cyan);
      if (this.glowRingMat) this.glowRingMat.color.setHex(cyan);
      if (this.flameMat) this.flameMat.color.setHex(cyan);
      if (this.flameOuterMat) this.flameOuterMat.color.setHex(blue);
      if (this.engineLight) this.engineLight.color.setHex(cyan);
      if (this.noseLight) this.noseLight.color.setHex(cyan);
      if (this.shieldMat) this.shieldMat.color.setHex(cyan);
    }
    this.shield = this.maxShield;
  }

  triggerDodge(direction) {
    if (this.dodgeCooldown > 0) return;
    this.dodgeTimer = 0.5; // 0.5s roll duration
    this.dodgeDirection = direction;
    
    const baseCD = this.activePerks.has('dodge_boost') ? 1.5 : 3.0;
    this.dodgeCooldown = baseCD;

    if (this.activePerks.has('dodge_boost')) {
      this._dodgeBoostTimer = 2.0; // 2 seconds of super fire rate!
    }

    for (let i = 0; i < 15; i++) {
      const pOffset = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 1,
        (Math.random() - 0.5) * 1
      ).add(this.meshGroup.position);
      this.particleManager.spawnEngineParticle(pOffset, this.shipClass === 'INTERCEPTOR' ? 0xffaa00 : 0x00f3ff);
    }
  }

  reset() {
    this.shield = this.maxShield;
    this.meshGroup.position.set(0, 0, 0);
    this.velocity.set(0, 0, 0);
    this.laserCooldown = 0;
    this.pulseCooldown = 0;
    this.shieldRippleTimer = 0;
    if (this.shieldMat) this.shieldMat.opacity = 0.0;
  }

  onKillHeal() {
    let heal = 0;
    if (this.gameManager && this.gameManager.activePerks.has('siphon')) {
      heal += 5;
    }
    if (this.shipClass === 'REAPER') {
      heal += 2;
    }
    if (heal > 0) {
      this.shield = Math.min(this.maxShield, this.shield + heal);
    }
  }

  update(dt, inputDir = { x: 0, y: 0 }) {
    this._time += dt;
    if (this.laserCooldown > 0) this.laserCooldown -= dt;
    if (this.pulseCooldown > 0) this.pulseCooldown -= dt;
    if (this.dodgeCooldown > 0) this.dodgeCooldown -= dt;
    if (this._dodgeBoostTimer > 0) this._dodgeBoostTimer -= dt;

    // Shield ripple decay
    if (this.shieldRippleTimer > 0) {
      this.shieldRippleTimer -= dt;
      if (this.shieldMat) {
        this.shieldMat.opacity = Math.max(0, this.shieldRippleTimer / 0.45 * 0.95);
      }
      if (this.shieldMesh) {
        this.shieldMesh.rotation.z += 4.0 * dt;
        this.shieldMesh.rotation.y += 2.5 * dt;
      }
    }

      const bossActive = this.gameManager && this.gameManager.activeBoss && !this.gameManager.activeBoss.isDead;
      const minX = bossActive ? -36 : this.bounds.minX;
      const maxX = bossActive ? 36 : this.bounds.maxX;
      const minY = bossActive ? -20 : this.bounds.minY;
      const maxY = bossActive ? 20 : this.bounds.maxY;

      if (this.dodgeTimer > 0) {
        this.dodgeTimer -= dt;
        const dodgeSpeed = 54.0;
        this.meshGroup.position.x += (this.dodgeDirection === 'left' ? -1 : 1) * dodgeSpeed * dt;
        this.meshGroup.position.x = THREE.MathUtils.clamp(this.meshGroup.position.x, minX, maxX);

        // 360 roll rotation
        const progress = 1.0 - Math.max(0, this.dodgeTimer / 0.5);
        this.meshGroup.rotation.z = (this.dodgeDirection === 'left' ? 1 : -1) * progress * Math.PI * 2;
        this.meshGroup.rotation.x = 0; // lock pitch during roll
        
        // Spawn extra dodge exhaust trail
        if (Math.random() < 0.4) {
          this.particleManager.spawnEngineParticle(this.meshGroup.position, 0x00f3ff);
        }
      } else {
        this.velocity.x += (inputDir.x * this.speed - this.velocity.x) * 0.18;
        this.velocity.y += (inputDir.y * this.speed - this.velocity.y) * 0.18;

        this.meshGroup.position.x += this.velocity.x * dt;
        this.meshGroup.position.y += this.velocity.y * dt;

        this.meshGroup.position.x = THREE.MathUtils.clamp(this.meshGroup.position.x, minX, maxX);
        this.meshGroup.position.y = THREE.MathUtils.clamp(this.meshGroup.position.y, minY, maxY);

        // Banking & pitch
        this.targetRoll = -inputDir.x * 0.65;
        this.targetPitch = inputDir.y * 0.28;
        this.currentRoll += (this.targetRoll - this.currentRoll) * 0.18;
        this.currentPitch += (this.targetPitch - this.currentPitch) * 0.18;
        this.meshGroup.rotation.z = this.currentRoll;
        this.meshGroup.rotation.x = this.currentPitch;
      }

    // Animate flame flicker
    const flicker = 1.0 + Math.sin(this._time * 20) * 0.15;
    const thrustBoost = 1.0 + Math.abs(inputDir.x) * 0.3 + Math.abs(inputDir.y) * 0.3;
    if (this.flameR_inner) this.flameR_inner.scale.setScalar(flicker * thrustBoost);
    if (this.flameL_inner) this.flameL_inner.scale.setScalar(flicker * thrustBoost);
    if (this.flameR_outer) this.flameR_outer.scale.setScalar(flicker * 0.9 * thrustBoost);
    if (this.flameL_outer) this.flameL_outer.scale.setScalar(flicker * 0.9 * thrustBoost);

    // Strobe lights pulsing
    if (this.strobeR && this.strobeL) {
      const flash = Math.sin(this._time * 12.0) > 0.2;
      this.strobeR.visible = flash;
      this.strobeL.visible = !flash;
    }

    if (this.cockpitHud) {
      this.cockpitHud.rotation.z += 1.6 * dt;
    }

    // Engine light intensity
    if (this.engineLight) this.engineLight.intensity = 4.0 + Math.sin(this._time * 12) * 0.8;

    // Engine trail particles
    this._thrusterTick++;
    if (this._thrusterTick % 2 === 0) {
      if (!this._tempTrailR) {
        this._tempTrailR = new THREE.Vector3();
        this._tempTrailL = new THREE.Vector3();
        this._tempSide = new THREE.Vector3();
      }
      this._tempTrailR.set(0.68, -0.1, 3.2).add(this.meshGroup.position);
      this._tempTrailL.set(-0.68, -0.1, 3.2).add(this.meshGroup.position);
      
      let pColor = 0x00f3ff;
      if (this.shipClass === 'INTERCEPTOR') pColor = 0xffea00;
      else if (this.shipClass === 'DREADNOUGHT') pColor = 0xff0044;
      else if (this.shipClass === 'TACTICIAN') pColor = 0x00ff66;

      this.particleManager.spawnEngineParticle(this._tempTrailR, pColor);
      this.particleManager.spawnEngineParticle(this._tempTrailL, pColor);
    }
    // Side exhaust when banking hard
    if (Math.abs(inputDir.x) > 0.5 && this._thrusterTick % 4 === 0) {
      this._tempSide.set(-inputDir.x * 1.5, 0, 1.5).add(this.meshGroup.position);
      this.particleManager.spawnEngineParticle(this._tempSide, this.shipClass === 'DREADNOUGHT' ? 0x990000 : 0x0055ff);
    }
  }
}
