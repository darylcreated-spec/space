import * as THREE from 'three';

// ============================================================
// WAVE 3 FINAL BOSS — Babylon 5 Industrial Rotating Cylinder Citadel
// Silhouette: Long rotating cylinder, 3 LARGE rings spinning on X-axis (not Z!),
//             forward-facing concave launch bay with red reactor glow,
//             tail-fin weapon nacelles
// Color Identity: Near-void black hull + MOLTEN ORANGE/RED (#ff6600)
// Motion: Full hull slowly rotates on Z-axis, RINGS spin fast on X-axis
// ============================================================
export class Babylon5Boss {
  constructor(scene, particleManager) {
    this.scene = scene;
    this.particleManager = particleManager;

    this.meshGroup = new THREE.Group();
    // Enter end-on so player sees the face of the cylinder — MORE INTIMIDATING
    this.meshGroup.position.set(0, 0, -120);

    this.targetZ = -48;
    this.speed = 5.8;

    this.coreHp = 1200;
    this.maxCoreHp = 1200;
    this.scoreValue = 50000;
    this.isDead = false;

    this.fireTimer = 0.8;

    // 6 TRIPLE-barrel turrets — Babylon 5's military doctrine
    this.turrets = [
      { id: 0, relPos: new THREE.Vector3(0, 14, 20), hp: 200, maxHp: 200, isDead: false, mesh: null },
      { id: 1, relPos: new THREE.Vector3(0, -14, 20), hp: 200, maxHp: 200, isDead: false, mesh: null },
      { id: 2, relPos: new THREE.Vector3(14, 0, 0), hp: 200, maxHp: 200, isDead: false, mesh: null },
      { id: 3, relPos: new THREE.Vector3(-14, 0, 0), hp: 200, maxHp: 200, isDead: false, mesh: null },
      { id: 4, relPos: new THREE.Vector3(0, 14, -18), hp: 200, maxHp: 200, isDead: false, mesh: null },
      { id: 5, relPos: new THREE.Vector3(0, -14, -18), hp: 200, maxHp: 200, isDead: false, mesh: null },
    ];

    this._build();
    this.scene.add(this.meshGroup);
  }

  _build() {
    const len = 52.0;
    const cR = 10.0; // core cylinder radius

    // ── 1. Main hull cylinder — near-VOID black, horizontal, end-on ──
    const hullGeo = new THREE.CylinderGeometry(cR, cR + 2, len, 12, 1);
    hullGeo.rotateX(Math.PI / 2);
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x06080d,       // near void — deep space black with a blue tint
      roughness: 0.7,
      metalness: 0.92,
      flatShading: true,     // faceted industrial look
    });
    this.spireMesh = new THREE.Mesh(hullGeo, hullMat);
    this.meshGroup.add(this.spireMesh);

    // Hull orange accent stripe rings — visual banding to break up the cylinder
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
    [-20, -6, 8, 22].forEach(zOff => {
      const sGeo = new THREE.TorusGeometry(cR + 2.2, 0.55, 6, 40);
      sGeo.rotateX(Math.PI / 2);
      const s = new THREE.Mesh(sGeo, stripeMat);
      s.position.z = zOff;
      this.meshGroup.add(s);
    });

    // ── 2. 3 LARGE contra-rotating habitat rings — on X-AXIS (perpendicular to hull) ──
    //    They spin like rolling wheels around the cylinder — NOT like the ring boss
    this.habitatRings = [];
    const ringPositions = [-16, 0, 16];
    const ringColors = [0xff4400, 0xff6600, 0xff8800]; // orange gradient

    ringPositions.forEach((zOff, idx) => {
      const rGeo = new THREE.TorusGeometry(cR + 7.5, 1.8, 14, 48);
      // Rings oriented perpendicular to cylinder (rotate around the cylinder axis)
      const rMat = new THREE.MeshStandardMaterial({
        color: ringColors[idx],
        emissive: ringColors[idx],
        emissiveIntensity: 0.6,
        roughness: 0.35,
        metalness: 0.8,
      });
      const ring = new THREE.Mesh(rGeo, rMat);
      ring.position.z = zOff;
      // Each ring in XY plane (perpendicular to cylinder Z-axis)
      // No initial rotation needed — TorusGeometry lies in XY plane by default
      this.meshGroup.add(ring);
      this.habitatRings.push({
        mesh: ring,
        speedX: (idx % 2 === 0 ? 0.9 : -0.7),
        speedY: (idx % 2 === 0 ? 0.3 : -0.4),
      });

      // Glowing orange point light per ring
      const rLight = new THREE.PointLight(ringColors[idx], 2.5, 50);
      rLight.position.z = zOff;
      this.meshGroup.add(rLight);
    });

    // ── 3. Forward concave reactor bay — the FACE of the station ──
    //    Big glowing red/orange dish that the player is flying toward
    const bayGeo = new THREE.CylinderGeometry(9.0, 7.5, 5.5, 16);
    bayGeo.rotateX(Math.PI / 2);
    this.coreMat = new THREE.MeshStandardMaterial({
      color: 0xff2200,        // DEEP RED — completely different from previous bosses
      emissive: 0xff3300,
      emissiveIntensity: 3.5,
      roughness: 0.05,
    });
    this.coreMesh = new THREE.Mesh(bayGeo, this.coreMat);
    this.coreMesh.position.z = len / 2 + 2.0;
    this.meshGroup.add(this.coreMesh);

    // Reactor bay glow light — intense red
    this.coreLight = new THREE.PointLight(0xff3300, 8.0, 90);
    this.coreLight.position.z = len / 2 + 4;
    this.meshGroup.add(this.coreLight);

    // Reactor bay outer rim
    const bayRimGeo = new THREE.TorusGeometry(9.5, 1.2, 10, 28);
    const bayRimMat = new THREE.MeshStandardMaterial({ color: 0x3a1200, metalness: 0.95, roughness: 0.4 });
    const bayRim = new THREE.Mesh(bayRimGeo, bayRimMat);
    bayRim.position.z = len / 2 + 0.5;
    this.meshGroup.add(bayRim);

    // ── 4. 4 Rear weapon nacelles — diagonal spines off the aft end ──
    const nacellePositions = [
      { x: 14, y: 14, z: -len / 2 - 6 },
      { x: -14, y: 14, z: -len / 2 - 6 },
      { x: 14, y: -14, z: -len / 2 - 6 },
      { x: -14, y: -14, z: -len / 2 - 6 },
    ];
    const nacMat = new THREE.MeshStandardMaterial({
      color: 0x0e1520,
      emissive: 0xff5500,
      emissiveIntensity: 1.2,
      roughness: 0.5,
      metalness: 0.9,
    });
    nacellePositions.forEach(np => {
      const nacGeo = new THREE.BoxGeometry(2.0, 2.0, 10.0);
      const nac = new THREE.Mesh(nacGeo, nacMat);
      nac.position.set(np.x, np.y, np.z);
      // Angle each nacelle outward diagonally
      const dx = np.x > 0 ? 1 : -1;
      const dy = np.y > 0 ? 1 : -1;
      nac.rotation.x = -dy * 0.35;
      nac.rotation.y = dx * 0.35;
      this.meshGroup.add(nac);

      // Nacelle thruster glow
      const thrusterGeo = new THREE.CylinderGeometry(1.5, 0.5, 2.0, 8);
      const thrusterMat = new THREE.MeshBasicMaterial({ color: 0xff7700 });
      const thruster = new THREE.Mesh(thrusterGeo, thrusterMat);
      thruster.position.set(np.x, np.y, np.z - 5.5);
      this.meshGroup.add(thruster);
    });

    // ── 5. TRIPLE-barrel heavy turrets — completely different from other bosses ──
    const baseGeo = new THREE.CylinderGeometry(2.2, 3.0, 1.8, 8);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x0a0e14, metalness: 0.98, roughness: 0.25 });

    // 3 barrels in a row — distinguishes from Death Star twin barrels and Halo single rail
    const barrelGeo = new THREE.CylinderGeometry(0.22, 0.3, 4.5, 6);
    barrelGeo.rotateX(Math.PI / 2);
    const barrelMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });

    this.turrets.forEach(t => {
      const tGroup = new THREE.Group();
      tGroup.position.copy(t.relPos);

      // Flat octagonal base
      tGroup.add(new THREE.Mesh(baseGeo, baseMat));

      // THREE barrels in a row
      const bGroup = new THREE.Group();
      [-1.1, 0, 1.1].forEach(xOff => {
        const barrel = new THREE.Mesh(barrelGeo, barrelMat);
        barrel.position.set(xOff, 0.6, 1.8);
        bGroup.add(barrel);
      });

      tGroup.add(bGroup);
      this.meshGroup.add(tGroup);
      t.mesh = tGroup;
    });
  }

  takeTurretDamage(turretId, amount) {
    const turret = this.turrets.find(t => t.id === turretId);
    if (!turret || turret.isDead) return false;
    turret.hp -= amount;
    if (turret.hp <= 0) {
      turret.isDead = true;
      turret.mesh.visible = false;
      const wp = turret.mesh.getWorldPosition(new THREE.Vector3());
      this.particleManager.createExplosion(wp, 0xff6600, 55, 2.5);
    }
    return turret.isDead;
  }

  takeCoreDamage(amount) {
    this.coreHp -= amount;
    if (this.coreMat) {
      this.coreMat.emissiveIntensity = 9.0;
      if (this.coreLight) this.coreLight.intensity = 18.0;
      setTimeout(() => {
        if (this.coreMat) this.coreMat.emissiveIntensity = 3.5;
        if (this.coreLight) this.coreLight.intensity = 8.0;
      }, 100);
    }
    if (this.coreHp <= 0 && !this.isDead) {
      this.isDead = true;
      this._explode();
    }
    return this.isDead;
  }

  _explode() {
    this.particleManager.createExplosion(this.meshGroup.position, 0xff4400, 280, 5.5);
    this.particleManager.createExplosion(this.meshGroup.position, 0xffaa00, 200, 4.2);
    this.particleManager.createExplosion(this.meshGroup.position, 0xff0000, 120, 3.0);
    this.particleManager.createEmpShockwave(this.meshGroup.position, 110);
    const flash = new THREE.PointLight(0xff5500, 75, 900);
    flash.position.copy(this.meshGroup.position);
    this.scene.add(flash);
    let i = 75;
    const fade = setInterval(() => {
      i -= 5.5; if (i <= 0) { clearInterval(fade); this.scene.remove(flash); } else { flash.intensity = i; }
    }, 50);
  }

  destroy() {
    this.scene.remove(this.meshGroup);
    this.meshGroup.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); });
  }

  update(dt, playerPos) {
    if (this.meshGroup.position.z < this.targetZ) this.meshGroup.position.z += this.speed * dt;

    // Slowly rotate the whole cylinder on Z — the station spins like a space habitat
    this.spireMesh.rotation.z += 0.12 * dt;

    // Each habitat ring spins independently on X and Y axes (ROLLING around the cylinder)
    this.habitatRings.forEach(r => {
      r.mesh.rotation.x += r.speedX * dt;
      r.mesh.rotation.y += r.speedY * dt;
    });

    // Reactor bay slight pulse
    if (this.coreMesh && this.coreMat) {
      const pulse = 3.5 + Math.sin(Date.now() * 0.003) * 0.8;
      this.coreMat.emissiveIntensity = pulse;
    }

    this.turrets.forEach(t => { if (!t.isDead && t.mesh) t.mesh.lookAt(playerPos); });

    this.fireTimer -= dt;
    const out = [];
    if (this.fireTimer <= 0) {
      this.fireTimer = 0.75;
      this.turrets.forEach(t => {
        if (!t.isDead && t.mesh) out.push(t.mesh.getWorldPosition(new THREE.Vector3()));
      });
    }
    return out.length > 0 ? out : false;
  }
}
