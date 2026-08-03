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
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x00c8ff,
      transparent: true,
      opacity: 0.75,
      roughness: 0.0,
      metalness: 0.05,
      emissive: 0x00aaff,
      emissiveIntensity: 1.2,
    });
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
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
    const edgeMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
    const makeEdge = (x) => {
      const eg = new THREE.BoxGeometry(0.06, 0.06, 2.4);
      const e = new THREE.Mesh(eg, edgeMat);
      e.position.set(x, 0.07, 0.1);
      this.meshGroup.add(e);
    };
    makeEdge(2.1); makeEdge(-2.1);

    // ── 5. Laser Cannons — longer, more prominent ──
    const cannonGeo = new THREE.CylinderGeometry(0.09, 0.09, 2.0, 7);
    cannonGeo.rotateX(Math.PI / 2);
    const cannonMat = new THREE.MeshStandardMaterial({ color: 0x28405e, metalness: 0.95, roughness: 0.08 });
    const muzzleMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });

    [-2.9, 2.9].forEach(x => {
      const cannon = new THREE.Mesh(cannonGeo, cannonMat);
      cannon.position.set(x, 0, -0.8);
      this.meshGroup.add(cannon);
      // Muzzle tip glow dot
      const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), muzzleMat);
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
    const glowRingMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
    [this.engineRight, this.engineLeft].forEach(eng => {
      const gr = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.06, 8, 20), glowRingMat);
      gr.rotation.x = Math.PI / 2;
      gr.position.z = 0.5;
      eng.add(gr);
    });

    // ── 7. Afterburner Flame Cones — dynamic, large ──
    const flameMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
    const flameOuterMat = new THREE.MeshBasicMaterial({ color: 0x0044ff, transparent: true, opacity: 0.5 });

    this.flameR_inner = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1.4, 10), flameMat);
    this.flameR_inner.rotation.x = -Math.PI / 2;
    this.flameR_inner.position.set(0, 0, 0.65);
    this.engineRight.add(this.flameR_inner);

    this.flameL_inner = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1.4, 10), flameMat);
    this.flameL_inner.rotation.x = -Math.PI / 2;
    this.flameL_inner.position.set(0, 0, 0.65);
    this.engineLeft.add(this.flameL_inner);

    // outer halo
    this.flameR_outer = new THREE.Mesh(new THREE.ConeGeometry(0.44, 1.0, 10), flameOuterMat);
    this.flameR_outer.rotation.x = -Math.PI / 2;
    this.flameR_outer.position.set(0, 0, 0.5);
    this.engineRight.add(this.flameR_outer);

    this.flameL_outer = new THREE.Mesh(new THREE.ConeGeometry(0.44, 1.0, 10), flameOuterMat);
    this.flameL_outer.rotation.x = -Math.PI / 2;
    this.flameL_outer.position.set(0, 0, 0.5);
    this.engineLeft.add(this.flameL_outer);

    // ── 8. Engine Point Lights — illuminate the ship from behind ──
    this.engineLight = new THREE.PointLight(0x00aaff, 4.5, 14);
    this.engineLight.position.set(0, 0, 2.5);
    this.meshGroup.add(this.engineLight);

    // ── 9. Nose glow light ──
    this.noseLight = new THREE.PointLight(0x00f3ff, 1.5, 8);
    this.noseLight.position.set(0, 0, -2.5);
    this.meshGroup.add(this.noseLight);

    // ── 10. Shield Icosahedron ──
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
    this.shield = Math.max(0, this.shield - amount);
    this.shieldRippleTimer = 0.45;
    if (this.shieldMat) this.shieldMat.opacity = 0.95;
    return this.shield <= 0;
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

  update(dt, inputDir = { x: 0, y: 0 }) {
    this._time += dt;
    if (this.laserCooldown > 0) this.laserCooldown -= dt;
    if (this.pulseCooldown > 0) this.pulseCooldown -= dt;

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

    this.velocity.x += (inputDir.x * this.speed - this.velocity.x) * 0.18;
    this.velocity.y += (inputDir.y * this.speed - this.velocity.y) * 0.18;

    this.meshGroup.position.x += this.velocity.x * dt;
    this.meshGroup.position.y += this.velocity.y * dt;

    this.meshGroup.position.x = THREE.MathUtils.clamp(this.meshGroup.position.x, this.bounds.minX, this.bounds.maxX);
    this.meshGroup.position.y = THREE.MathUtils.clamp(this.meshGroup.position.y, this.bounds.minY, this.bounds.maxY);

    // Banking & pitch
    this.targetRoll = -inputDir.x * 0.65;
    this.targetPitch = inputDir.y * 0.28;
    this.currentRoll += (this.targetRoll - this.currentRoll) * 0.18;
    this.currentPitch += (this.targetPitch - this.currentPitch) * 0.18;
    this.meshGroup.rotation.z = this.currentRoll;
    this.meshGroup.rotation.x = this.currentPitch;

    // Animate flame flicker
    const flicker = 1.0 + Math.sin(this._time * 20) * 0.15;
    const thrustBoost = 1.0 + Math.abs(inputDir.x) * 0.3 + Math.abs(inputDir.y) * 0.3;
    if (this.flameR_inner) this.flameR_inner.scale.setScalar(flicker * thrustBoost);
    if (this.flameL_inner) this.flameL_inner.scale.setScalar(flicker * thrustBoost);
    if (this.flameR_outer) this.flameR_outer.scale.setScalar(flicker * 0.9 * thrustBoost);
    if (this.flameL_outer) this.flameL_outer.scale.setScalar(flicker * 0.9 * thrustBoost);

    // Engine light intensity
    if (this.engineLight) this.engineLight.intensity = 4.0 + Math.sin(this._time * 12) * 0.8;

    // Engine trail particles
    this._thrusterTick++;
    if (this._thrusterTick % 2 === 0) {
      const pR = new THREE.Vector3(0.68, -0.1, 3.2).add(this.meshGroup.position);
      const pL = new THREE.Vector3(-0.68, -0.1, 3.2).add(this.meshGroup.position);
      this.particleManager.spawnEngineParticle(pR, 0x00f3ff);
      this.particleManager.spawnEngineParticle(pL, 0x00f3ff);
    }
    // Side exhaust when banking hard
    if (Math.abs(inputDir.x) > 0.5 && this._thrusterTick % 4 === 0) {
      const sideP = new THREE.Vector3(-inputDir.x * 1.5, 0, 1.5).add(this.meshGroup.position);
      this.particleManager.spawnEngineParticle(sideP, 0x0055ff);
    }
  }
}
