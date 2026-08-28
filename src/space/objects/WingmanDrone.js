import * as THREE from 'three';

export class WingmanDrone {
  constructor(scene, particleManager, slot = 'LEFT') {
    this.scene = scene;
    this.particleManager = particleManager;
    this.slot = slot; // 'LEFT' or 'RIGHT'

    this.meshGroup = new THREE.Group();
    this.currentDoctrine = 'DEFEND'; // 'DEFEND', 'FOCUS_FIRE', 'SWARM_FLANK'

    this.targetOffset = new THREE.Vector3(slot === 'LEFT' ? -3.0 : 3.0, 0.4, 1.0);
    this.currentPos = new THREE.Vector3();
    this.fireTimer = 0;
    this.fireInterval = 0.16;
    this.shieldHp = 80;
    this.maxShieldHp = 80;
    this.isDead = false;

    this.buildMesh();
    this.scene.add(this.meshGroup);
  }

  setDoctrine(doctrine) {
    this.currentDoctrine = doctrine || 'DEFEND';
    if (this.currentDoctrine === 'DEFEND') {
      this.targetOffset.set(this.slot === 'LEFT' ? -2.6 : 2.6, 0.3, 1.2);
      this.fireInterval = 0.16;
    } else if (this.currentDoctrine === 'FOCUS_FIRE') {
      this.targetOffset.set(this.slot === 'LEFT' ? -4.5 : 4.5, 0.8, -1.0);
      this.fireInterval = 0.10; // Rapid coordinated suppression
    } else if (this.currentDoctrine === 'SWARM_FLANK') {
      this.targetOffset.set(this.slot === 'LEFT' ? -9.5 : 9.5, 0.5, 2.0);
      this.fireInterval = 0.14;
    }
  }

  buildMesh() {
    // ── Allied Wingman Support Drone: Smooth Aerodynamic Lifting Body ──
    const bodyGeo = new THREE.CapsuleGeometry(0.38, 1.2, 8, 16);
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x142338,
      metalness: 0.92,
      roughness: 0.18,
      emissive: 0x002233,
      emissiveIntensity: 0.35
    });
    this.bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    this.meshGroup.add(this.bodyMesh);

    // Smooth Swept Winglets with Rounded Tips
    [-1, 1].forEach(side => {
      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, 0.3);
      wingShape.bezierCurveTo(side * 0.5, 0.1, side * 0.9, -0.3, side * 1.1, -0.5);
      wingShape.bezierCurveTo(side * 1.15, -0.65, side * 1.0, -0.7, side * 0.8, -0.6);
      wingShape.bezierCurveTo(side * 0.4, -0.4, 0, -0.5, 0, -0.5);
      wingShape.closePath();

      const wingExtrude = { depth: 0.08, bevelEnabled: true, bevelSize: 0.03, bevelSegments: 2 };
      const wingGeo = new THREE.ExtrudeGeometry(wingShape, wingExtrude);
      wingGeo.rotateX(-Math.PI / 2);
      const wing = new THREE.Mesh(wingGeo, bodyMat);
      this.meshGroup.add(wing);

      // Rounded Weapon Pod Blister
      const gunGeo = new THREE.CapsuleGeometry(0.08, 0.6, 6, 10);
      gunGeo.rotateX(Math.PI / 2);
      const gunMat = new THREE.MeshStandardMaterial({ color: 0x050c18, metalness: 0.95 });
      const gun = new THREE.Mesh(gunGeo, gunMat);
      gun.position.set(side * 0.45, -0.05, -0.4);
      this.meshGroup.add(gun);
    });

    // Glowing Nose Sensor Dome
    const noseGeo = new THREE.SphereGeometry(0.18, 12, 12);
    this.noseMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
    const nose = new THREE.Mesh(noseGeo, this.noseMat);
    nose.position.set(0, 0.05, -0.9);
    this.meshGroup.add(nose);

    // Smooth Rounded Ion Thruster Bell
    const engineGeo = new THREE.CylinderGeometry(0.16, 0.24, 0.4, 12);
    engineGeo.rotateX(Math.PI / 2);
    const engineBellMat = new THREE.MeshStandardMaterial({ color: 0x07111c, metalness: 0.96 });
    const engineBell = new THREE.Mesh(engineGeo, engineBellMat);
    engineBell.position.set(0, 0, 0.85);
    this.meshGroup.add(engineBell);

    const flameGeo = new THREE.ConeGeometry(0.2, 0.8, 12);
    flameGeo.rotateX(-Math.PI / 2);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0.9 });
    this.engineMesh = new THREE.Mesh(flameGeo, flameMat);
    this.engineMesh.position.set(0, 0, 1.25);
    this.meshGroup.add(this.engineMesh);

    // Mini Shield Bubble
    const shieldGeo = new THREE.IcosahedronGeometry(1.2, 2);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      wireframe: true,
      transparent: true,
      opacity: 0.22
    });
    this.shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    this.meshGroup.add(this.shieldMesh);
  }

  update(dt, playerShip, gameManager) {
    if (this.isDead || !playerShip || !playerShip.meshGroup) return;

    // Doctrine Color Updates
    if (this.noseMat) {
      if (this.currentDoctrine === 'FOCUS_FIRE') this.noseMat.color.setHex(0xff3300);
      else if (this.currentDoctrine === 'SWARM_FLANK') this.noseMat.color.setHex(0x00ff88);
      else this.noseMat.color.setHex(0x00f3ff);
    }

    const idealPos = playerShip.meshGroup.position.clone().add(this.targetOffset);
    idealPos.y += Math.sin(Date.now() * 0.004 + (this.slot === 'LEFT' ? 0 : Math.PI)) * 0.25;

    this.meshGroup.position.lerp(idealPos, 12.0 * dt);
    this.meshGroup.rotation.z = playerShip.meshGroup.rotation.z * 0.8;
    this.meshGroup.rotation.x = playerShip.meshGroup.rotation.x * 0.8;

    if (this.particleManager && Math.random() < 0.35) {
      const engineWorld = this.meshGroup.localToWorld(new THREE.Vector3(0, 0, 0.9));
      this.particleManager.spawnEngineParticle(engineWorld, 0x00f3ff);
    }

    this.fireTimer += dt;
    if (this.fireTimer >= this.fireInterval && gameManager && gameManager.state === 'PLAYING') {
      this.fireTimer = 0;
      this.fireSupportBlaster(gameManager);
    }
  }

  fireSupportBlaster(gameManager) {
    if (!gameManager) return;
    const muzzleL = this.meshGroup.localToWorld(new THREE.Vector3(-0.45, 0, -0.8));
    const muzzleR = this.meshGroup.localToWorld(new THREE.Vector3(0.45, 0, -0.8));

    let targetDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.meshGroup.quaternion);

    if (this.currentDoctrine === 'FOCUS_FIRE') {
      // Aim directly at Active Boss or nearest Capital Ship
      const boss = gameManager.activeBoss;
      if (boss && boss.meshGroup && !boss.isDead) {
        targetDir = new THREE.Vector3().subVectors(boss.meshGroup.position, muzzleL).normalize();
      } else if (gameManager.capitalShips.length > 0) {
        const c = gameManager.capitalShips[0];
        if (c && c.meshGroup && !c.isDead) {
          targetDir = new THREE.Vector3().subVectors(c.meshGroup.position, muzzleL).normalize();
        }
      }
    } else if (this.currentDoctrine === 'SWARM_FLANK') {
      // Spread fire outward slightly to clear peripheral asteroids/drones
      const spreadX = this.slot === 'LEFT' ? -0.15 : 0.15;
      targetDir.x += spreadX;
      targetDir.normalize();
    }

    const laserColor = this.currentDoctrine === 'FOCUS_FIRE' ? 0xff4400 : (this.currentDoctrine === 'SWARM_FLANK' ? 0x00ff88 : 0x00f3ff);
    gameManager.spawnLaser(muzzleL, laserColor, false, targetDir);
    gameManager.spawnLaser(muzzleR, laserColor, false, targetDir);
  }

  takeDamage(amount) {
    if (this.isDead) return;
    this.shieldHp -= amount;
    if (this.shieldHp <= 0) {
      this.isDead = true;
      if (this.particleManager) {
        this.particleManager.createExplosion(this.meshGroup.position, 0x00f3ff, 50, 2.5);
      }
      if (this.meshGroup.parent) {
        this.meshGroup.parent.remove(this.meshGroup);
      }
    }
  }
}
