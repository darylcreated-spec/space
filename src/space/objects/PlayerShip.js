import * as THREE from 'three';

export class PlayerShip {
  constructor(scene, particleManager) {
    this.scene = scene;
    this.particleManager = particleManager;

    this.meshGroup = new THREE.Group();

    // Default Stats (Interceptor)
    this.shipClass = 'INTERCEPTOR';
    this.maxShield = 90;
    this.shield = 90;
    this.speed = 36;
    this.radius = 1.6;
    this.laserFireDelay = 0.06;

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

    // Tactical Abilities & Mobility
    this.dodgeTimer = 0;
    this.dodgeCooldown = 0;
    this.dodgeMaxCooldown = 1.2;
    this.dodgeDirection = null;
    this.isInvulnerable = false;
    this.tractorBeamLevel = 0;
    this.activePerks = new Set();

    // Hyper-Boost & Swarm Missiles
    this.boostEnergy = 100;
    this.maxBoostEnergy = 100;
    this.isBoosting = false;
    this.swarmMissileCooldown = 0;
    this.maxSwarmCD = 3.0;

    // Premium Add-On Feature
    this.hasMiningAddon = false;

    // Archetype Specifics
    this.flameMeshes = [];
    this.muzzleOffsets = [];
    this.wingtipOffsets = [];
    this.engineTrailOffsets = [];

    this.rebuildShipMesh(this.shipClass);
    this.meshGroup.position.set(0, 0, 0);
    this.scene.add(this.meshGroup);
  }

  clearShipMesh() {
    while (this.meshGroup.children.length > 0) {
      this.meshGroup.remove(this.meshGroup.children[0]);
    }
    this.flameMeshes = [];
    this.muzzleOffsets = [];
    this.wingtipOffsets = [];
    this.engineTrailOffsets = [];
  }

  rebuildShipMesh(className) {
    this.clearShipMesh();
    this.shipClass = className;

    // Common Shield Dome
    const shieldGeo = new THREE.IcosahedronGeometry(3.2, 2);
    let shieldColor = 0x00f3ff;
    if (className === 'DREADNOUGHT') shieldColor = 0xff0044;
    else if (className === 'TACTICIAN') shieldColor = 0x00ff66;
    else if (className === 'REAPER') shieldColor = 0xaa00ff;

    this.shieldMat = new THREE.MeshBasicMaterial({
      color: shieldColor,
      wireframe: true,
      transparent: true,
      opacity: 0.0
    });
    this.shieldMesh = new THREE.Mesh(shieldGeo, this.shieldMat);
    this.meshGroup.add(this.shieldMesh);

    if (className === 'INTERCEPTOR') {
      this.buildInterceptorMesh();
    } else if (className === 'DREADNOUGHT') {
      this.buildDreadnoughtMesh();
    } else if (className === 'TACTICIAN') {
      this.buildTacticianMesh();
    } else if (className === 'REAPER') {
      this.buildReaperMesh();
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 1. ⚡ INTERCEPTOR: "Vanguard Alpha" (Supersonic Delta Fighter)
  // ─────────────────────────────────────────────────────────────
  buildInterceptorMesh() {
    this.maxShield = 90;
    this.shield = Math.min(this.shield, 90);
    this.speed = 36;
    this.laserFireDelay = 0.06;
    this.dodgeMaxCooldown = 1.2;
    this.maxSwarmCD = 3.0;

    // Main needle fuselage
    const bodyGeo = new THREE.ConeGeometry(0.85, 5.8, 8);
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x0a1424,
      metalness: 0.95,
      roughness: 0.15,
      emissive: 0x001a33,
      emissiveIntensity: 0.2,
    });
    this.meshGroup.add(new THREE.Mesh(bodyGeo, bodyMat));

    // Canopy
    const canopyGeo = new THREE.SphereGeometry(0.55, 14, 14);
    canopyGeo.scale(0.8, 0.6, 1.5);
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x00f3ff,
      emissive: 0x00aaff,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.85
    });
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 0.3, -0.4);
    this.meshGroup.add(canopy);

    // Delta Wings
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(3.4, -1.8);
    wingShape.lineTo(3.5, -2.8);
    wingShape.lineTo(0.6, -1.4);
    wingShape.closePath();

    const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.1, bevelEnabled: true, bevelSize: 0.03 });
    wingGeo.center();
    wingGeo.rotateX(Math.PI / 2);
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x142036, metalness: 0.88, roughness: 0.2 });

    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.position.set(1.4, 0, 0.3);
    this.meshGroup.add(rightWing);

    const leftWingGeo = wingGeo.clone();
    leftWingGeo.scale(-1, 1, 1);
    const leftWing = new THREE.Mesh(leftWingGeo, wingMat);
    leftWing.position.set(-1.4, 0, 0.3);
    this.meshGroup.add(leftWing);

    // Forward Canards
    const canardGeo = new THREE.BoxGeometry(1.2, 0.05, 0.5);
    canardGeo.rotateY(0.2);
    const canardR = new THREE.Mesh(canardGeo, wingMat);
    canardR.position.set(0.9, 0.08, -1.2);
    this.meshGroup.add(canardR);

    const canardL = canardR.clone();
    canardL.position.x = -0.9;
    canardL.rotation.y = -0.2;
    this.meshGroup.add(canardL);

    // Neon Edge Glow Strips
    const edgeMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
    [-2.2, 2.2].forEach(x => {
      const e = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 2.2), edgeMat);
      e.position.set(x, 0.06, 0.1);
      this.meshGroup.add(e);
    });

    // Triple Laser Muzzles (Left, Center, Right)
    this.muzzleOffsets = [
      new THREE.Vector3(-2.6, 0, -0.6),
      new THREE.Vector3(0, -0.15, -2.8),
      new THREE.Vector3(2.6, 0, -0.6)
    ];
    this.muzzleOffsets.forEach(pos => {
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), edgeMat);
      tip.position.copy(pos);
      this.meshGroup.add(tip);
    });

    // Twin High-Thrust Engines
    [-0.65, 0.65].forEach(x => {
      const eng = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, 1.1, 10), new THREE.MeshStandardMaterial({ color: 0x060b14, metalness: 0.9 }));
      eng.rotateX(Math.PI / 2);
      eng.position.set(x, -0.08, 2.3);
      this.meshGroup.add(eng);

      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.24, 1.4, 10), new THREE.MeshBasicMaterial({ color: 0x00f3ff }));
      flame.rotation.x = -Math.PI / 2;
      flame.position.set(0, 0, 0.65);
      eng.add(flame);
      this.flameMeshes.push(flame);
    });

    this.wingtipOffsets = [new THREE.Vector3(-3.2, 0, 0.3), new THREE.Vector3(3.2, 0, 0.3)];
    this.engineTrailOffsets = [new THREE.Vector3(-0.65, -0.08, 3.0), new THREE.Vector3(0.65, -0.08, 3.0)];

    this.engineLight = new THREE.PointLight(0x00f3ff, 1.5, 9);
    this.engineLight.position.set(0, 0, 2.5);
    this.meshGroup.add(this.engineLight);
  }

  // ─────────────────────────────────────────────────────────────
  // 2. 🛡️ DREADNOUGHT: "Titan Colossus" (Armored Brawler Fortress)
  // ─────────────────────────────────────────────────────────────
  buildDreadnoughtMesh() {
    this.maxShield = 220;
    this.shield = 220;
    this.speed = 20;
    this.laserFireDelay = 0.22;
    this.dodgeMaxCooldown = 2.4;
    this.maxSwarmCD = 6.0;

    // Heavy Faceted Chassis
    const hullGeo = new THREE.BoxGeometry(2.4, 1.3, 5.2);
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x1e1215,
      metalness: 0.95,
      roughness: 0.3,
      emissive: 0x220508,
      emissiveIntensity: 0.3
    });
    this.meshGroup.add(new THREE.Mesh(hullGeo, hullMat));

    // Reinforced Prow Ramming Wedge
    const ramGeo = new THREE.ConeGeometry(1.6, 2.0, 4);
    ramGeo.rotateX(Math.PI / 2);
    ramGeo.rotateY(Math.PI / 4);
    const ramMat = new THREE.MeshStandardMaterial({ color: 0x3a0d14, metalness: 0.9, roughness: 0.2 });
    const ram = new THREE.Mesh(ramGeo, ramMat);
    ram.position.set(0, 0, -3.2);
    this.meshGroup.add(ram);

    // Heavy Sloped Armored Wings
    const armGeo = new THREE.BoxGeometry(2.2, 0.3, 3.4);
    const armMat = new THREE.MeshStandardMaterial({ color: 0x140a0e, metalness: 0.9, roughness: 0.35 });

    const armR = new THREE.Mesh(armGeo, armMat);
    armR.position.set(2.0, 0, 0.4);
    armR.rotation.z = -0.15;
    this.meshGroup.add(armR);

    const armL = new THREE.Mesh(armGeo, armMat);
    armL.position.set(-2.0, 0, 0.4);
    armL.rotation.z = 0.15;
    this.meshGroup.add(armL);

    // Crimson Hazard Chevrons & Reactor Glow Core
    const coreGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.2, 12);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.set(0, 0.7, 0);
    this.meshGroup.add(core);

    // Heavy Artillery Cannons (Dual Flak Barrels)
    const barrelGeo = new THREE.CylinderGeometry(0.22, 0.22, 3.2, 8);
    barrelGeo.rotateX(Math.PI / 2);
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x0a0508, metalness: 0.95 });

    [-1.6, 1.6].forEach(x => {
      const b = new THREE.Mesh(barrelGeo, barrelMat);
      b.position.set(x, -0.1, -1.6);
      this.meshGroup.add(b);
    });

    this.muzzleOffsets = [
      new THREE.Vector3(-1.6, -0.1, -3.2),
      new THREE.Vector3(1.6, -0.1, -3.2)
    ];

    // Quad Heavy Rocket Thrusters
    const thrusterPositions = [
      [-0.8, 0.35, 2.6],
      [0.8, 0.35, 2.6],
      [-0.8, -0.35, 2.6],
      [0.8, -0.35, 2.6]
    ];
    thrusterPositions.forEach(([x, y, z]) => {
      const eng = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 1.0, 8), new THREE.MeshStandardMaterial({ color: 0x080406, metalness: 0.9 }));
      eng.rotateX(Math.PI / 2);
      eng.position.set(x, y, z);
      this.meshGroup.add(eng);

      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.6, 8), new THREE.MeshBasicMaterial({ color: 0xff0044 }));
      flame.rotation.x = -Math.PI / 2;
      flame.position.set(0, 0, 0.6);
      eng.add(flame);
      this.flameMeshes.push(flame);
    });

    this.wingtipOffsets = [new THREE.Vector3(-3.1, 0, 0.4), new THREE.Vector3(3.1, 0, 0.4)];
    this.engineTrailOffsets = [new THREE.Vector3(-0.8, 0, 3.4), new THREE.Vector3(0.8, 0, 3.4)];

    this.engineLight = new THREE.PointLight(0xff0044, 2.0, 10);
    this.engineLight.position.set(0, 0, 2.8);
    this.meshGroup.add(this.engineLight);
  }

  // ─────────────────────────────────────────────────────────────
  // 3. 🌀 TACTICIAN: "Chronos Spec-Ops" (EMP & Homing Arc Beam)
  // ─────────────────────────────────────────────────────────────
  buildTacticianMesh() {
    this.maxShield = 110;
    this.shield = 110;
    this.speed = 28;
    this.laserFireDelay = 0.12;
    this.dodgeMaxCooldown = 1.6;
    this.maxSwarmCD = 4.5;

    // Aerodynamic forward cockpit
    const bodyGeo = new THREE.CylinderGeometry(0.5, 0.9, 5.2, 8);
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x081a14,
      metalness: 0.92,
      roughness: 0.2,
      emissive: 0x002211,
      emissiveIntensity: 0.3
    });
    this.meshGroup.add(new THREE.Mesh(bodyGeo, bodyMat));

    // Forward-Swept Gull Wings
    const wingGeo = new THREE.BoxGeometry(2.4, 0.1, 1.6);
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x0d281e, metalness: 0.88, roughness: 0.25 });

    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.position.set(1.8, 0, -0.6);
    rightWing.rotation.y = -0.35;
    this.meshGroup.add(rightWing);

    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.position.set(-1.8, 0, -0.6);
    leftWing.rotation.y = 0.35;
    this.meshGroup.add(leftWing);

    // Rotating Electromagnetic Rings
    const ringGeo = new THREE.TorusGeometry(0.85, 0.08, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
    this.empRing = new THREE.Mesh(ringGeo, ringMat);
    this.empRing.position.set(0, 0.3, 0.5);
    this.meshGroup.add(this.empRing);

    // Sensor Radome
    const radomeGeo = new THREE.SphereGeometry(0.4, 12, 12);
    const radomeMat = new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00aa55, emissiveIntensity: 0.6 });
    const radome = new THREE.Mesh(radomeGeo, radomeMat);
    radome.position.set(0, 0.55, -0.8);
    this.meshGroup.add(radome);

    // Twin Homing Arc Emitters
    this.muzzleOffsets = [
      new THREE.Vector3(-2.6, 0, -1.6),
      new THREE.Vector3(2.6, 0, -1.6)
    ];
    this.muzzleOffsets.forEach(pos => {
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), ringMat);
      tip.position.copy(pos);
      this.meshGroup.add(tip);
    });

    // Twin Vector Thrusters
    [-0.7, 0.7].forEach(x => {
      const eng = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 1.1, 8), new THREE.MeshStandardMaterial({ color: 0x040e0a, metalness: 0.9 }));
      eng.rotateX(Math.PI / 2);
      eng.position.set(x, -0.05, 2.4);
      this.meshGroup.add(eng);

      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.4, 8), new THREE.MeshBasicMaterial({ color: 0x00ff88 }));
      flame.rotation.x = -Math.PI / 2;
      flame.position.set(0, 0, 0.6);
      eng.add(flame);
      this.flameMeshes.push(flame);
    });

    this.wingtipOffsets = [new THREE.Vector3(-2.8, 0, -1.4), new THREE.Vector3(2.8, 0, -1.4)];
    this.engineTrailOffsets = [new THREE.Vector3(-0.7, 0, 3.0), new THREE.Vector3(0.7, 0, 3.0)];

    this.engineLight = new THREE.PointLight(0x00ff88, 1.6, 9);
    this.engineLight.position.set(0, 0, 2.6);
    this.meshGroup.add(this.engineLight);
  }

  // ─────────────────────────────────────────────────────────────
  // 4. 💀 REAPER: "Void Phantom" (Stealth Diamond Crit Assassin)
  // ─────────────────────────────────────────────────────────────
  buildReaperMesh() {
    this.maxShield = 85;
    this.shield = 85;
    this.speed = 32;
    this.laserFireDelay = 0.09;
    this.dodgeMaxCooldown = 1.4;
    this.maxSwarmCD = 4.0;

    // Stealth Diamond Faceted Fuselage
    const bodyGeo = new THREE.ConeGeometry(1.0, 5.4, 4);
    bodyGeo.rotateX(Math.PI / 2);
    bodyGeo.rotateZ(Math.PI / 4);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x0c0614,
      metalness: 0.98,
      roughness: 0.12,
      emissive: 0x180028,
      emissiveIntensity: 0.4
    });
    this.meshGroup.add(new THREE.Mesh(bodyGeo, bodyMat));

    // Serrated Dagger Razor Wings
    const wingGeo = new THREE.BoxGeometry(3.6, 0.08, 1.8);
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x140a22, metalness: 0.95, roughness: 0.1 });

    const wing = new THREE.Mesh(wingGeo, wingMat);
    wing.position.set(0, 0, 0.4);
    this.meshGroup.add(wing);

    // Glowing Ultraviolet Plasma Blade Edges
    const bladeMat = new THREE.MeshBasicMaterial({ color: 0xaa00ff });
    [-1.8, 1.8].forEach(x => {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 2.4), bladeMat);
      edge.position.set(x, 0.06, 0.2);
      this.meshGroup.add(edge);
    });

    // Quad Needle Laser Cannons (2 Wing + 2 Fuselage)
    this.muzzleOffsets = [
      new THREE.Vector3(-1.8, 0, -0.6),
      new THREE.Vector3(-0.6, -0.1, -2.4),
      new THREE.Vector3(0.6, -0.1, -2.4),
      new THREE.Vector3(1.8, 0, -0.6)
    ];
    this.muzzleOffsets.forEach(pos => {
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), bladeMat);
      tip.position.copy(pos);
      this.meshGroup.add(tip);
    });

    // Central High-Density Plasma Core Thruster
    const engGeo = new THREE.CylinderGeometry(0.42, 0.52, 1.2, 6);
    engGeo.rotateX(Math.PI / 2);
    const eng = new THREE.Mesh(engGeo, new THREE.MeshStandardMaterial({ color: 0x05020a, metalness: 0.95 }));
    eng.position.set(0, 0, 2.4);
    this.meshGroup.add(eng);

    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.8, 6), bladeMat);
    flame.rotation.x = -Math.PI / 2;
    flame.position.set(0, 0, 0.7);
    eng.add(flame);
    this.flameMeshes.push(flame);

    this.wingtipOffsets = [new THREE.Vector3(-1.8, 0, 0.4), new THREE.Vector3(1.8, 0, 0.4)];
    this.engineTrailOffsets = [new THREE.Vector3(0, 0, 3.2)];

    this.engineLight = new THREE.PointLight(0xaa00ff, 1.8, 9);
    this.engineLight.position.set(0, 0, 2.6);
    this.meshGroup.add(this.engineLight);
  }

  takeDamage(amount) {
    if (this.dodgeTimer > 0 || this.isInvulnerable) {
      return false; // Immune during dodge roll!
    }

    // Reaper Phasing Boost Invulnerability
    if (this.shipClass === 'REAPER' && this.isBoosting) {
      return false;
    }

    let finalAmount = amount;
    if (this.shipClass === 'DREADNOUGHT') {
      finalAmount *= 0.65; // Dreadnought takes 35% less damage!
    }

    this.shield = Math.max(0, this.shield - finalAmount);
    this.shieldRippleTimer = 0.45;
    if (this.shieldMat) this.shieldMat.opacity = 0.95;

    const canvasContainer = document.getElementById('canvas-container');
    if (canvasContainer) {
      canvasContainer.classList.add('camera-glitch');
      setTimeout(() => {
        canvasContainer.classList.remove('camera-glitch');
      }, 120);
    }

    return this.shield <= 0;
  }

  setShipClass(className) {
    this.rebuildShipMesh(className);
  }

  healShield(amount) {
    this.shield = Math.min(this.maxShield, this.shield + amount);
    this.shieldRippleTimer = 0.3;
    if (this.shieldMat) this.shieldMat.opacity = 0.6;
  }

  dodgeRoll(direction = 'left') {
    if (this.dodgeCooldown > 0 || this.dodgeTimer > 0) return false;
    this.dodgeDirection = direction;
    this.dodgeTimer = 0.5;
    this.dodgeCooldown = this.dodgeMaxCooldown;
    return true;
  }

  triggerDodge(direction = 'left') {
    return this.dodgeRoll(direction);
  }

  reset() {
    this.shield = this.maxShield;
    this.velocity.set(0, 0, 0);
    this.meshGroup.position.set(0, 0, 0);
    this.meshGroup.rotation.set(0, 0, 0);
    this.currentRoll = 0;
    this.targetRoll = 0;
    this.currentPitch = 0;
    this.targetPitch = 0;
    this.laserCooldown = 0;
    this.pulseCooldown = 0;
    this.dodgeTimer = 0;
    this.dodgeCooldown = 0;
    this.boostEnergy = this.maxBoostEnergy;
    this.isBoosting = false;
    this.swarmMissileCooldown = 0;
  }

  update(dt, inputDir = { x: 0, y: 0 }) {
    this._time += dt;

    if (this.dodgeCooldown > 0) this.dodgeCooldown -= dt;
    if (this.swarmMissileCooldown > 0) this.swarmMissileCooldown -= dt;

    // Hyper-Boost Energy Management
    if (this.isBoosting && this.boostEnergy > 0) {
      this.boostEnergy = Math.max(0, this.boostEnergy - dt * 40.0);
      if (this.boostEnergy <= 0) this.isBoosting = false;
    } else if (!this.isBoosting && this.boostEnergy < this.maxBoostEnergy) {
      this.boostEnergy = Math.min(this.maxBoostEnergy, this.boostEnergy + dt * 20.0);
    }

    const currentSpeed = this.speed * (this.isBoosting ? 2.0 : 1.0);

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

    // Tactician EMP Ring Rotation
    if (this.empRing) {
      this.empRing.rotation.z += 5.0 * dt;
      this.empRing.rotation.y += 3.0 * dt;
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

      const progress = 1.0 - Math.max(0, this.dodgeTimer / 0.5);
      this.meshGroup.rotation.z = (this.dodgeDirection === 'left' ? 1 : -1) * progress * Math.PI * 2;
      this.meshGroup.rotation.x = 0;

      if (Math.random() < 0.4) {
        let pColor = 0x00f3ff;
        if (this.shipClass === 'DREADNOUGHT') pColor = 0xff0044;
        else if (this.shipClass === 'TACTICIAN') pColor = 0x00ff88;
        else if (this.shipClass === 'REAPER') pColor = 0xaa00ff;
        this.particleManager.spawnEngineParticle(this.meshGroup.position, pColor);
      }
    } else {
      this.velocity.x += (inputDir.x * currentSpeed - this.velocity.x) * 0.18;
      this.velocity.y += (inputDir.y * currentSpeed - this.velocity.y) * 0.18;

      this.meshGroup.position.x += this.velocity.x * dt;
      this.meshGroup.position.y += this.velocity.y * dt;

      this.meshGroup.position.x = THREE.MathUtils.clamp(this.meshGroup.position.x, minX, maxX);
      this.meshGroup.position.y = THREE.MathUtils.clamp(this.meshGroup.position.y, minY, maxY);

      this.targetRoll = -inputDir.x * (this.isBoosting ? 0.85 : 0.65);
      this.targetPitch = inputDir.y * 0.28;
      this.currentRoll += (this.targetRoll - this.currentRoll) * 0.18;
      this.currentPitch += (this.targetPitch - this.currentPitch) * 0.18;
      this.meshGroup.rotation.z = this.currentRoll;
      this.meshGroup.rotation.x = this.currentPitch;
    }

    // Flame scaling
    const flicker = 1.0 + Math.sin(this._time * 20) * 0.15;
    const thrustBoost = (this.isBoosting ? 2.4 : 1.0) * (1.0 + Math.abs(inputDir.x) * 0.3 + Math.abs(inputDir.y) * 0.3);
    this.flameMeshes.forEach(f => {
      f.scale.setScalar(flicker * thrustBoost);
    });

    if (this.engineLight) {
      this.engineLight.intensity = (this.isBoosting ? 2.8 : 1.2) + Math.sin(this._time * 12) * 0.25;
    }

    // Wingtip Vapor Contrails
    if (Math.abs(this.currentRoll) > 0.25 || this.isBoosting || this.dodgeTimer > 0) {
      if (Math.random() < 0.65 && this.wingtipOffsets.length >= 2) {
        const leftTip = this.meshGroup.localToWorld(this.wingtipOffsets[0].clone());
        const rightTip = this.meshGroup.localToWorld(this.wingtipOffsets[1].clone());
        let tipColor = 0xe0f7ff;
        if (this.shipClass === 'DREADNOUGHT') tipColor = 0xffa0b0;
        else if (this.shipClass === 'TACTICIAN') tipColor = 0xb0ffda;
        else if (this.shipClass === 'REAPER') tipColor = 0xe8b0ff;
        this.particleManager.spawnEngineParticle(leftTip, tipColor);
        this.particleManager.spawnEngineParticle(rightTip, tipColor);
      }
    }

    // Engine Exhaust Particles
    this._thrusterTick++;
    if (this._thrusterTick % 2 === 0 && this.engineTrailOffsets.length > 0) {
      let pColor = 0x00f3ff;
      if (this.shipClass === 'INTERCEPTOR') pColor = this.isBoosting ? 0xffea00 : 0x00f3ff;
      else if (this.shipClass === 'DREADNOUGHT') pColor = this.isBoosting ? 0xffea00 : 0xff0044;
      else if (this.shipClass === 'TACTICIAN') pColor = this.isBoosting ? 0xffea00 : 0x00ff88;
      else if (this.shipClass === 'REAPER') pColor = this.isBoosting ? 0xff00bb : 0xaa00ff;

      this.engineTrailOffsets.forEach(offset => {
        const worldPos = this.meshGroup.localToWorld(offset.clone());
        this.particleManager.spawnEngineParticle(worldPos, pColor);
      });
    }
  }
}
