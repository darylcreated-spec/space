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
    this.radius = 1.4;
    this.laserFireDelay = 0.12;

    // Velocity & Banking
    this.velocity = new THREE.Vector3();
    this.targetRoll = 0;
    this.currentRoll = 0;
    this.targetPitch = 0;
    this.currentPitch = 0;

    // Tight Movement Bounds — keeps ship 100% inside visible camera screen viewport
    this.bounds = { minX: -13.0, maxX: 13.0, minY: -6.5, maxY: 7.5 };

    // Cooldown Timers
    this.laserCooldown = 0;
    this.torpedoCooldown = 0;
    this.pulseCooldown = 0;
    this.maxTorpedoCD = 3.0;
    this.maxPulseCD = 8.0;

    // Shield Ripple Timer
    this.shieldRippleTimer = 0;

    // Thruster particle throttle
    this._thrusterTick = 0;

    this.buildShipMesh();
    this.meshGroup.position.set(0, 0, 0);
    this.scene.add(this.meshGroup);
  }

  buildShipMesh() {
    // Fuselage
    const bodyGeo = new THREE.ConeGeometry(0.75, 3.4, 8);
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x121a2c,
      metalness: 0.9,
      roughness: 0.2
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    this.meshGroup.add(body);

    // Cockpit Canopy
    const canopyGeo = new THREE.SphereGeometry(0.48, 10, 10);
    canopyGeo.scale(0.8, 0.6, 1.4);
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.7,
      roughness: 0.05,
      metalness: 0.1,
      emissive: 0x00f3ff,
      emissiveIntensity: 0.6
    });
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 0.25, 0.2);
    this.meshGroup.add(canopy);

    // Swept Delta Wings
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(2.4, -1.3);
    wingShape.lineTo(2.4, -2.0);
    wingShape.lineTo(0, -1.1);
    wingShape.closePath();

    const extrudeSettings = { depth: 0.09, bevelEnabled: false };
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);
    wingGeo.center();
    wingGeo.rotateX(Math.PI / 2);

    const wingMat = new THREE.MeshStandardMaterial({ color: 0x1e2a42, metalness: 0.8, roughness: 0.3 });

    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.position.set(1.2, 0, 0);
    this.meshGroup.add(rightWing);

    const leftWingGeo = wingGeo.clone();
    leftWingGeo.scale(-1, 1, 1);
    const leftWing = new THREE.Mesh(leftWingGeo, wingMat);
    leftWing.position.set(-1.2, 0, 0);
    this.meshGroup.add(leftWing);

    // Dual Wingtip Laser Cannons
    const cannonGeo = new THREE.CylinderGeometry(0.07, 0.07, 1.4, 6);
    cannonGeo.rotateX(Math.PI / 2);
    const cannonMat = new THREE.MeshStandardMaterial({ color: 0x334466, metalness: 0.9, roughness: 0.1 });

    const rightCannon = new THREE.Mesh(cannonGeo, cannonMat);
    rightCannon.position.set(2.2, 0, -0.5);
    this.meshGroup.add(rightCannon);

    const leftCannon = new THREE.Mesh(cannonGeo, cannonMat);
    leftCannon.position.set(-2.2, 0, -0.5);
    this.meshGroup.add(leftCannon);

    // Engine Nozzles
    const engineGeo = new THREE.CylinderGeometry(0.24, 0.3, 0.7, 8);
    engineGeo.rotateX(Math.PI / 2);
    const engineMat = new THREE.MeshStandardMaterial({ color: 0x0a0e18, metalness: 0.9, roughness: 0.1 });

    this.engineRight = new THREE.Mesh(engineGeo, engineMat);
    this.engineRight.position.set(0.45, 0, 1.5);
    this.meshGroup.add(this.engineRight);

    this.engineLeft = new THREE.Mesh(engineGeo, engineMat);
    this.engineLeft.position.set(-0.45, 0, 1.5);
    this.meshGroup.add(this.engineLeft);

    // Thruster Flame Cores
    const flameGeo = new THREE.ConeGeometry(0.2, 0.9, 8);
    flameGeo.rotateX(-Math.PI / 2);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });

    const flameR = new THREE.Mesh(flameGeo, flameMat);
    flameR.position.set(0, 0, 0.45);
    this.engineRight.add(flameR);

    const flameL = new THREE.Mesh(flameGeo, flameMat);
    flameL.position.set(0, 0, 0.45);
    this.engineLeft.add(flameL);

    // AAA Deflector Shield Hex-Grid Envelope Overlay
    const shieldGeo = new THREE.IcosahedronGeometry(2.6, 2);
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

    // Trigger AAA Hex-Grid Energy Shield Ripple
    this.shieldRippleTimer = 0.35;
    if (this.shieldMat) {
      this.shieldMat.opacity = 0.9;
    }

    return this.shield <= 0;
  }

  reset() {
    this.shield = this.maxShield;
    this.meshGroup.position.set(0, 0, 0);
    this.velocity.set(0, 0, 0);
    this.laserCooldown = 0;
    this.torpedoCooldown = 0;
    this.pulseCooldown = 0;
    this.shieldRippleTimer = 0;
    if (this.shieldMat) this.shieldMat.opacity = 0.0;
  }

  update(dt, inputDir = { x: 0, y: 0 }) {
    if (this.laserCooldown > 0) this.laserCooldown -= dt;
    if (this.torpedoCooldown > 0) this.torpedoCooldown -= dt;
    if (this.pulseCooldown > 0) this.pulseCooldown -= dt;

    // Shield Ripple Decay
    if (this.shieldRippleTimer > 0) {
      this.shieldRippleTimer -= dt;
      if (this.shieldMat) {
        this.shieldMat.opacity = Math.max(0, this.shieldRippleTimer / 0.35 * 0.9);
      }
      if (this.shieldMesh) {
        this.shieldMesh.rotation.z += 3.0 * dt;
        this.shieldMesh.rotation.y += 2.0 * dt;
      }
    }

    this.velocity.x += (inputDir.x * this.speed - this.velocity.x) * 0.2;
    this.velocity.y += (inputDir.y * this.speed - this.velocity.y) * 0.2;

    this.meshGroup.position.x += this.velocity.x * dt;
    this.meshGroup.position.y += this.velocity.y * dt;

    // Tight clamp inside visible screen camera bounds
    this.meshGroup.position.x = THREE.MathUtils.clamp(this.meshGroup.position.x, this.bounds.minX, this.bounds.maxX);
    this.meshGroup.position.y = THREE.MathUtils.clamp(this.meshGroup.position.y, this.bounds.minY, this.bounds.maxY);

    this.targetRoll = -inputDir.x * 0.6;
    this.targetPitch = inputDir.y * 0.3;
    this.currentRoll += (this.targetRoll - this.currentRoll) * 0.2;
    this.currentPitch += (this.targetPitch - this.currentPitch) * 0.2;
    this.meshGroup.rotation.z = this.currentRoll;
    this.meshGroup.rotation.x = this.currentPitch;

    this._thrusterTick++;
    if (this._thrusterTick % 3 === 0) {
      const pR = new THREE.Vector3(0.45, 0, 1.8).add(this.meshGroup.position);
      const pL = new THREE.Vector3(-0.45, 0, 1.8).add(this.meshGroup.position);
      this.particleManager.spawnEngineParticle(pR, 0x00f3ff);
      this.particleManager.spawnEngineParticle(pL, 0x00f3ff);
    }
  }
}
