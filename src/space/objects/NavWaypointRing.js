import * as THREE from 'three';

/**
 * Holographic Navigational Waypoint Ring
 * Provides spatial direction through asteroid corridors, gives hyper-boost surges,
 * and tracks objective progress in the semi-open world.
 */
export class NavWaypointRing {
  constructor(scene, particleManager, position, ringIndex = 0, totalRings = 5, forwardDir = new THREE.Vector3(0, 0, -1)) {
    this.scene = scene;
    this.particleManager = particleManager;
    this.ringIndex = ringIndex;
    this.totalRings = totalRings;
    this.radius = 12.0;
    this.isCleared = false;
    this.isDead = false;
    this.time = Math.random() * 10;

    this.meshGroup = new THREE.Group();
    this.meshGroup.position.copy(position);

    // Orient ring to face along corridor forward vector
    const lookTarget = position.clone().add(forwardDir);
    this.meshGroup.lookAt(lookTarget);

    // 1. Primary Structural Energy Torus Ring
    const torusGeo = new THREE.TorusGeometry(this.radius, 0.45, 16, 48);
    this.ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      wireframe: false,
      transparent: true,
      opacity: 0.85
    });
    this.ringMesh = new THREE.Mesh(torusGeo, this.ringMat);
    this.meshGroup.add(this.ringMesh);

    // 2. Outer Orbiting Chevron Nodes
    this.chevronNodes = [];
    const nodeGeo = new THREE.BoxGeometry(1.2, 0.6, 2.2);
    const nodeMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.95
    });

    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const node = new THREE.Mesh(nodeGeo, nodeMat);
      node.position.set(Math.cos(angle) * this.radius, Math.sin(angle) * this.radius, 0);
      this.chevronNodes.push({ mesh: node, baseAngle: angle });
      this.meshGroup.add(node);
    }

    // 3. Inner Holographic Energy Membrane / Scan Veil
    const discGeo = new THREE.CircleGeometry(this.radius * 0.95, 32);
    this.veilMat = new THREE.MeshBasicMaterial({
      color: 0x00aaff,
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.veilMesh = new THREE.Mesh(discGeo, this.veilMat);
    this.meshGroup.add(this.veilMesh);

    this.scene.add(this.meshGroup);
  }

  update(dt, playerShip, gameManager = null) {
    if (this.isDead) return;
    this.time += dt;

    // Gentle holographic pulsation & rotation of chevrons
    const pulse = 0.8 + Math.sin(this.time * 3.5) * 0.2;
    if (this.veilMat) {
      this.veilMat.opacity = 0.12 * pulse;
    }

    this.chevronNodes.forEach(node => {
      const curAngle = node.baseAngle + this.time * 0.65;
      node.mesh.position.set(
        Math.cos(curAngle) * this.radius,
        Math.sin(curAngle) * this.radius,
        0
      );
      node.mesh.rotation.z = curAngle + Math.PI / 2;
    });

    if (this.isCleared) {
      // Cleared ring fades away
      this.ringMat.opacity = Math.max(0, this.ringMat.opacity - dt * 2.0);
      this.veilMat.opacity = Math.max(0, this.veilMat.opacity - dt * 2.0);
      if (this.ringMat.opacity <= 0.01) {
        this.destroy();
      }
      return;
    }

    // Collision / Transit Check with Player
    if (playerShip && playerShip.meshGroup) {
      const pPos = playerShip.meshGroup.position;
      const rPos = this.meshGroup.position;
      const dist = pPos.distanceTo(rPos);

      // Check if inside cylindrical pass-through envelope (within radius and close along Z plane)
      if (dist < this.radius + 3.0) {
        // Project onto ring's local coordinate system
        const localPos = this.meshGroup.worldToLocal(pPos.clone());
        const perpDist = Math.hypot(localPos.x, localPos.y);
        const planeDist = Math.abs(localPos.z);

        if (perpDist <= this.radius + 2.0 && planeDist < 4.0) {
          this.triggerClear(playerShip, gameManager);
        }
      }
    }
  }

  triggerClear(playerShip, gameManager) {
    if (this.isCleared) return;
    this.isCleared = true;

    // Visual flare
    this.ringMat.color.setHex(0x00ff88);
    this.veilMat.color.setHex(0x00ffaa);
    this.veilMat.opacity = 0.65;

    if (this.particleManager) {
      this.particleManager.createExplosion(this.meshGroup.position, 0x00f3ff, 25);
    }

    // Speed surge and boost recharge
    if (playerShip) {
      playerShip.boostEnergy = Math.min(playerShip.maxBoostEnergy || 100, playerShip.boostEnergy + 40);
      // Give temporary speed impulse forward
      const fwd = playerShip._shipForward || new THREE.Vector3(0, 0, -1);
      playerShip.velocity.addScaledVector(fwd, 16.0);
    }

    if (gameManager) {
      gameManager.addScore(250);
      gameManager.spaceAudio?.playQuantumArc?.(this.meshGroup.position.x);
      gameManager.onWaypointRingCleared?.(this.ringIndex, this.totalRings);
    }
  }

  destroy() {
    this.isDead = true;
    if (this.meshGroup && this.scene) {
      this.scene.remove(this.meshGroup);
      this.meshGroup.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    }
  }
}
