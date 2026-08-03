import * as THREE from 'three';

// ============================================================
// WAVE 3 FINAL BOSS — Babylon 5 Industrial Rotating Cylinder Citadel
// AAA Overhaul: 80m long cylinder, 3 massive contra-rotating rings,
// forward plasma cannon, 8 turrets, 3-phase enrage system
// ============================================================
export class Babylon5Boss {
  constructor(scene, particleManager) {
    this.scene = scene;
    this.particleManager = particleManager;

    this.meshGroup = new THREE.Group();
    this.meshGroup.position.set(0, 0, -135);

    this.targetZ = -50;
    this.speed = 5.5;

    this.coreHp = 1600;
    this.maxCoreHp = 1600;
    this.scoreValue = 60000;
    this.isDead = false;
    this.hitRadius = 38;

    this.fireTimer = 0.7;
    this.phase = 1;
    this.plasmaCannonTimer = 0;
    this._time = 0;

    this.turrets = [
      { id: 0, relPos: new THREE.Vector3(0,  16, 28), hp: 250, maxHp: 250, isDead: false, mesh: null, light: null },
      { id: 1, relPos: new THREE.Vector3(0, -16, 28), hp: 250, maxHp: 250, isDead: false, mesh: null, light: null },
      { id: 2, relPos: new THREE.Vector3(16,  0, 10), hp: 250, maxHp: 250, isDead: false, mesh: null, light: null },
      { id: 3, relPos: new THREE.Vector3(-16, 0, 10), hp: 250, maxHp: 250, isDead: false, mesh: null, light: null },
      { id: 4, relPos: new THREE.Vector3(16,  0,-10), hp: 250, maxHp: 250, isDead: false, mesh: null, light: null },
      { id: 5, relPos: new THREE.Vector3(-16, 0,-10), hp: 250, maxHp: 250, isDead: false, mesh: null, light: null },
      { id: 6, relPos: new THREE.Vector3(0,  16,-26), hp: 200, maxHp: 200, isDead: false, mesh: null, light: null },
      { id: 7, relPos: new THREE.Vector3(0, -16,-26), hp: 200, maxHp: 200, isDead: false, mesh: null, light: null },
    ];

    this._build();
    this.scene.add(this.meshGroup);
  }

  _build() {
    const len = 72.0;
    const cR  = 12.0;

    // ── 1. Main Hull Cylinder — deep space black, faceted ──
    const hullGeo = new THREE.CylinderGeometry(cR, cR + 2.5, len, 14, 1);
    hullGeo.rotateX(Math.PI / 2);
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x060810,
      roughness: 0.68,
      metalness: 0.94,
      flatShading: true,
    });
    this.spireMesh = new THREE.Mesh(hullGeo, hullMat);
    this.meshGroup.add(this.spireMesh);

    // ── 2. Orange hull accent bands ──
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xff5500 });
    [-28, -12, 4, 20].forEach(zOff => {
      const sGeo = new THREE.TorusGeometry(cR + 3.0, 0.7, 8, 50);
      sGeo.rotateX(Math.PI / 2);
      const s = new THREE.Mesh(sGeo, stripeMat);
      s.position.z = zOff;
      this.meshGroup.add(s);
    });

    // ── 3. 3 MASSIVE Contra-rotating Habitat Rings ──
    this.habitatRings = [];
    const ringPositions = [-20, 0, 20];
    const ringColors    = [0xff3300, 0xff6600, 0xff9900];
    const ringSpeeds    = [1.1, -0.8, 0.95];

    ringPositions.forEach((zOff, idx) => {
      const rGeo = new THREE.TorusGeometry(cR + 10, 2.4, 18, 60);
      const rMat = new THREE.MeshStandardMaterial({
        color: ringColors[idx],
        emissive: ringColors[idx],
        emissiveIntensity: 0.85,
        roughness: 0.3,
        metalness: 0.82,
      });
      const ring = new THREE.Mesh(rGeo, rMat);
      ring.position.z = zOff;
      this.meshGroup.add(ring);
      this.habitatRings.push({ mesh: ring, speedX: ringSpeeds[idx], mat: rMat });

      // Ring glow point light
      const rLight = new THREE.PointLight(ringColors[idx], 5.0, 65);
      rLight.position.z = zOff;
      this.meshGroup.add(rLight);

      // Ring detail spars
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const sparGeo = new THREE.BoxGeometry(0.8, 0.8, 6.0);
        const spar = new THREE.Mesh(sparGeo, new THREE.MeshStandardMaterial({ color: 0x1a0800, metalness: 0.95 }));
        spar.position.set(Math.cos(a) * (cR + 10), Math.sin(a) * (cR + 10), zOff);
        this.meshGroup.add(spar);
      }
    });

    // ── 4. Forward Reactor Bay — the face of the station ──
    const bayGeo = new THREE.CylinderGeometry(11.0, 8.5, 7.0, 20);
    bayGeo.rotateX(Math.PI / 2);
    this.coreMat = new THREE.MeshStandardMaterial({
      color: 0xff1a00,
      emissive: 0xff3300,
      emissiveIntensity: 5.0,
      roughness: 0.04,
    });
    this.coreMesh = new THREE.Mesh(bayGeo, this.coreMat);
    this.coreMesh.position.z = len / 2 + 3.0;
    this.meshGroup.add(this.coreMesh);

    // Reactor bay rim ring
    const bayRimGeo = new THREE.TorusGeometry(12, 1.6, 12, 36);
    const bayRimMat = new THREE.MeshStandardMaterial({ color: 0x3a1200, metalness: 0.98, roughness: 0.35 });
    const bayRim = new THREE.Mesh(bayRimGeo, bayRimMat);
    bayRim.position.z = len / 2 + 0.5;
    this.meshGroup.add(bayRim);

    // Reactor glow light — intense red
    this.coreLight = new THREE.PointLight(0xff3300, 14.0, 120);
    this.coreLight.position.z = len / 2 + 6;
    this.meshGroup.add(this.coreLight);

    // Inner reactor core orb
    const orbGeo = new THREE.SphereGeometry(5.5, 20, 20);
    const orbMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const orb = new THREE.Mesh(orbGeo, orbMat);
    orb.position.z = len / 2 + 1;
    this.meshGroup.add(orb);

    // ── 5. Plasma Cannon Ring around reactor (fires a beam) ──
    const cannonRingGeo = new THREE.TorusGeometry(9, 0.9, 10, 28);
    this.cannonRingMat = new THREE.MeshStandardMaterial({ color: 0x1a0a00, emissive: 0xff6600, emissiveIntensity: 1.5 });
    const cannonRing = new THREE.Mesh(cannonRingGeo, this.cannonRingMat);
    cannonRing.position.z = len / 2 + 1.5;
    this.meshGroup.add(cannonRing);

    // ── 6. Rear Engine Cluster ──
    const rearEngMat = new THREE.MeshBasicMaterial({ color: 0xff8800 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x050810, metalness: 0.98 });
    [[-8,8],[-8,-8],[8,8],[8,-8],[0,0]].forEach(([x,y], i) => {
      const eGeo = new THREE.CylinderGeometry(i===4?3.5:2.0, i===4?2.5:1.4, 4.0, 8);
      eGeo.rotateX(Math.PI / 2);
      const eMesh = new THREE.Mesh(eGeo, darkMat);
      eMesh.position.set(x, y, -len / 2 - 1.5);
      this.meshGroup.add(eMesh);

      const flameGeo = new THREE.ConeGeometry(i===4?2.8:1.6, i===4?5:3.5, 9);
      flameGeo.rotateX(Math.PI / 2);
      const flame = new THREE.Mesh(flameGeo, rearEngMat);
      flame.position.set(x, y, -len / 2 - 3.5);
      this.meshGroup.add(flame);
    });

    // Rear glow
    const rearLight = new THREE.PointLight(0xff6600, 6.0, 80);
    rearLight.position.z = -len / 2 - 8;
    this.meshGroup.add(rearLight);

    // ── 7. 8 Triple-barrel Heavy Turrets ──
    const tBaseMat   = new THREE.MeshStandardMaterial({ color: 0x0a0e14, metalness: 0.99, roughness: 0.22 });
    const tBarrelMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });

    this.turrets.forEach(t => {
      const tGroup = new THREE.Group();
      tGroup.position.copy(t.relPos);

      // Octagonal turret base
      tGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.8, 2.2, 8), tBaseMat));

      // Triple barrels
      const bGroup = new THREE.Group();
      [-1.2, 0, 1.2].forEach(xOff => {
        const bGeo = new THREE.CylinderGeometry(0.28, 0.38, 5.5, 7);
        bGeo.rotateX(Math.PI / 2);
        const b = new THREE.Mesh(bGeo, tBarrelMat);
        b.position.set(xOff, 0.8, 2.2);
        bGroup.add(b);

        // Muzzle glow tip
        const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff8800 }));
        muzzle.position.set(xOff, 0.8, 4.8);
        bGroup.add(muzzle);
      });
      tGroup.add(bGroup);

      // Per-turret glow light
      const tLight = new THREE.PointLight(0xff6600, 3.0, 32);
      tLight.position.set(0, 2.0, 4.0);
      tGroup.add(tLight);
      t.light = tLight;

      this.meshGroup.add(tGroup);
      t.mesh = tGroup;
    });
  }

  takeTurretDamage(turretId, amount) {
    const t = this.turrets.find(t => t.id === turretId);
    if (!t || t.isDead) return false;
    t.hp -= amount;
    if (t.hp <= 0) {
      t.isDead = true;
      t.mesh.visible = false;
      const wp = t.mesh.getWorldPosition(new THREE.Vector3());
      this.particleManager.createExplosion(wp, 0xff6600, 70, 3.0);
    }
    return t.isDead;
  }

  takeCoreDamage(amount) {
    this.coreHp -= amount;

    if (this.coreMat) {
      this.coreMat.emissiveIntensity = 12.0;
      if (this.coreLight) this.coreLight.intensity = 30.0;
      setTimeout(() => {
        if (this.coreMat) this.coreMat.emissiveIntensity = 5.0 + this.phase;
        if (this.coreLight) this.coreLight.intensity = 12.0 + this.phase * 2;
      }, 130);
    }

    const hpRatio = this.coreHp / this.maxCoreHp;
    if (hpRatio < 0.5 && this.phase === 1) { this.phase = 2; }
    if (hpRatio < 0.25 && this.phase === 2) { this.phase = 3; }

    if (this.coreHp <= 0 && !this.isDead) {
      this.isDead = true;
      this._explode();
    }
    return this.isDead;
  }

  _explode() {
    this.particleManager.createExplosion(this.meshGroup.position, 0xff4400, 350, 7.0);
    this.particleManager.createExplosion(this.meshGroup.position, 0xffaa00, 250, 5.5);
    this.particleManager.createExplosion(this.meshGroup.position, 0xff0000, 180, 4.0);
    this.particleManager.createEmpShockwave(this.meshGroup.position, 140);
    const flash = new THREE.PointLight(0xff5500, 150, 1400);
    flash.position.copy(this.meshGroup.position);
    this.scene.add(flash);
    let i = 150;
    const fade = setInterval(() => { i -= 6; if (i <= 0) { clearInterval(fade); this.scene.remove(flash); } else flash.intensity = i; }, 50);
  }

  destroy() {
    this.scene.remove(this.meshGroup);
    this.meshGroup.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); });
  }

  update(dt, playerPos) {
    this._time += dt;
    const arrived = this.meshGroup.position.z >= this.targetZ;
    if (!arrived) this.meshGroup.position.z += this.speed * dt;

    // Hull slow roll
    this.spireMesh.rotation.z += (0.1 + this.phase * 0.04) * dt;

    // Habitat rings spin on X-axis — rolling wheel effect
    this.habitatRings.forEach((r, idx) => {
      r.mesh.rotation.x += r.speedX * (1.0 + this.phase * 0.25) * dt;
      // Ring emissive pulse
      r.mat.emissiveIntensity = 0.7 + Math.sin(this._time * 4 + idx * 2) * 0.3;
    });

    // Reactor bay pulse — more frantic in higher phases
    if (this.coreMesh && this.coreMat) {
      const pulse = 5.0 + Math.sin(this._time * (3 + this.phase * 2)) * 1.5;
      this.coreMat.emissiveIntensity = pulse;
      if (this.coreLight) this.coreLight.intensity = 12.0 + pulse;
    }

    // Cannon ring charge glow
    if (this.cannonRingMat) {
      this.cannonRingMat.emissiveIntensity = 1.2 + Math.sin(this._time * 8) * 0.8;
    }

    // Turret tracking
    if (arrived) {
      this.turrets.forEach(t => {
        if (!t.isDead && t.mesh) {
          const localTarget = this.meshGroup.worldToLocal(playerPos.clone());
          t.mesh.lookAt(localTarget);
          if (t.light) t.light.intensity = 2.5 + Math.sin(this._time * 10 + t.id * 1.5) * 0.8;
        }
      });
    }

    this.fireTimer -= dt;
    const out = [];
    if (this.fireTimer <= 0 && arrived) {
      this.fireTimer = 0.65 / this.phase;
      this.turrets.forEach(t => {
        if (!t.isDead && t.mesh) out.push(t.mesh.getWorldPosition(new THREE.Vector3()));
      });
    }
    return out.length > 0 ? out : false;
  }
}
