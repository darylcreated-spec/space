import * as THREE from 'three';

// ============================================================
// WAVE 1 BOSS — Star Wars Death Star Imperial Superweapon
// Full AAA overhaul: 30m sphere, superlaser beam, dramatic lighting,
// animated trench glow, multi-phase attack patterns
// ============================================================

// ── Canvas Texture Generators ──
function generateHullNormalMap() {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgb(128, 128, 255)';
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = 'rgb(90, 120, 255)';
  ctx.lineWidth = 2;
  for (let x = 0; x < 512; x += 24) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke(); }
  for (let y = 0; y < 512; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke(); }
  ctx.fillStyle = 'rgb(180, 180, 255)';
  for (let i = 0; i < 600; i++) {
    const rx = Math.floor(Math.random() * 21) * 24 + 2;
    const ry = Math.floor(Math.random() * 21) * 24 + 2;
    ctx.fillRect(rx, ry, 5, 5);
  }
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(5, 3);
  return t;
}

// ── Shader definitions ──
const PlasmaOrbShader = {
  uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0x00ff44) } },
  vertexShader: `varying vec3 vNormal; varying vec2 vUv; varying vec3 vPosition;
    void main() { vNormal = normalize(normalMatrix * normal); vUv = uv; vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform float uTime; uniform vec3 uColor;
    varying vec3 vNormal; varying vec2 vUv; varying vec3 vPosition;
    float noise(vec3 p) { return sin(p.x*5.0+uTime*3.0)*cos(p.y*5.0+uTime*2.5)*sin(p.z*5.0+uTime*3.5); }
    void main() {
      float n = noise(vPosition * 1.8);
      float turb = sin(vUv.y * 28.0 + uTime * 8.0 + n * 5.0) * 0.5 + 0.5;
      vec3 col = mix(uColor, vec3(1.0), turb * 0.7);
      float rim = 1.0 - max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
      col += vec3(0.1, 1.0, 0.3) * pow(rim, 2.5);
      gl_FragColor = vec4(col * 4.5, 1.0); }`
};

const TrenchShader = {
  uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0x00ff44) } },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform float uTime; uniform vec3 uColor; varying vec2 vUv;
    void main() {
      float pulse = sin(vUv.x * 100.0 - uTime * 12.0) * 0.5 + 0.5;
      pulse = pow(pulse, 4.0);
      float secondary = sin(vUv.x * 40.0 + uTime * 5.0) * 0.3 + 0.7;
      gl_FragColor = vec4(uColor * (2.0 + pulse * 6.0) * secondary, 1.0); }`
};

const ShieldShader = {
  uniforms: { uTime: { value: 0 }, uHitTime: { value: 0 }, uColor: { value: new THREE.Color(0x00ff44) }, uHp: { value: 1.0 } },
  vertexShader: `varying vec3 vNormal; varying vec3 vViewPosition;
    void main() { vNormal = normalize(normalMatrix * normal);
      vec4 mvPos = modelViewMatrix * vec4(position, 1.0); vViewPosition = -mvPos.xyz;
      gl_Position = projectionMatrix * mvPos; }`,
  fragmentShader: `uniform float uTime; uniform float uHitTime; uniform vec3 uColor; uniform float uHp;
    varying vec3 vNormal; varying vec3 vViewPosition;
    void main() {
      vec3 n = normalize(vNormal); vec3 v = normalize(vViewPosition);
      float fresnel = pow(1.0 - abs(dot(n, v)), 3.2);
      float pulse = sin(uTime * 4.0) * 0.12 + 0.88;
      float hexPattern = step(0.5, fract(dot(n, vec3(8.0, 12.0, 6.0)) + uTime * 0.5));
      vec3 edgeCol = mix(uColor, vec3(1.0), uHitTime + hexPattern * 0.15);
      float alpha = (fresnel * 0.65 + uHitTime * 0.6) * pulse;
      gl_FragColor = vec4(edgeCol * (2.5 + uHitTime * 4.0 + hexPattern * 0.5), alpha); }`
};

export class MoonBase {
  constructor(scene, particleManager) {
    this.scene = scene;
    this.particleManager = particleManager;

    this.meshGroup = new THREE.Group();
    this.meshGroup.position.set(0, 0, -140);

    this.targetZ = -55;
    this.speed = 7.0;

    this.coreHp = 4000;
    this.maxCoreHp = 4000;
    this.scoreValue = 40000;
    this.isDead = false;
    this.hitRadius = 27; // Reduced size by 25%

    // Phase system — changes attack pattern as HP drops
    this.phase = 1;
    this.fireTimer = 0.6;
    this.superlasertimer = 0;
    this.superlaserfiring = false;
    this.phaseShieldTimer = 0;
    this.justPhaseTransitioned = false;

    // Deflector shield state & vulnerable point configuration
    this.hasShield = true;

    this.turrets = [
      { id: 0, relPos: new THREE.Vector3(-16.5, 9, 12), hp: 1200, maxHp: 1200, isDead: false, mesh: null, light: null },
      { id: 1, relPos: new THREE.Vector3(16.5, 9, 12),  hp: 1200, maxHp: 1200, isDead: false, mesh: null, light: null },
      { id: 2, relPos: new THREE.Vector3(-16.5, -9, 12), hp: 1200, maxHp: 1200, isDead: false, mesh: null, light: null },
      { id: 3, relPos: new THREE.Vector3(16.5, -9, 12),  hp: 1200, maxHp: 1200, isDead: false, mesh: null, light: null },
      { id: 4, relPos: new THREE.Vector3(0, 19.5, 0),    hp: 1000, maxHp: 1000, isDead: false, mesh: null, light: null },
      { id: 5, relPos: new THREE.Vector3(0, -19.5, 0),   hp: 1000, maxHp: 1000, isDead: false, mesh: null, light: null },
    ];

    this.shaderMaterials = [];
    this.activeIntervals = [];
    this.activeTimeouts = [];
    this._build();
    this.scene.add(this.meshGroup);
  }

  _build() {
    const R = 22.5;
    const normalMap = generateHullNormalMap();

    // ── 1. Dramatic 3-point lighting ──
    this.rimLight = new THREE.DirectionalLight(0xd0e8ff, 2.2);
    this.rimLight.position.set(60, 37.5, -45);
    this.scene.add(this.rimLight);

    this.backLight = new THREE.DirectionalLight(0x002244, 0.5);
    this.backLight.position.set(-45, -22.5, 30);
    this.scene.add(this.backLight);

    // Ambient fill
    this.ambLight = new THREE.AmbientLight(0x050d14, 0.5);
    this.scene.add(this.ambLight);

    // ── 2. Main PBR Sphere Hull ──
    const hullGeo = new THREE.SphereGeometry(R, 48, 40);
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x16202e,
      roughness: 0.52,
      metalness: 0.92,
      normalMap,
      normalScale: new THREE.Vector2(1.1, 1.1),
      flatShading: true,
    });
    this.spireMesh = new THREE.Mesh(hullGeo, hullMat);
    this.meshGroup.add(this.spireMesh);

    // ── 3. Equatorial Trench — the iconic Moon Base ring ──
    const trenchGeo = new THREE.TorusGeometry(R + 0.3, 2.25, 12, 100);
    const trenchMat = new THREE.MeshStandardMaterial({
      color: 0x060c14, roughness: 0.9, metalness: 1.0, normalMap,
    });
    this.meshGroup.add(new THREE.Mesh(trenchGeo, trenchMat));

    // Scrolling conduit light in trench
    const conduitGeo = new THREE.TorusGeometry(R + 0.375, 0.41, 10, 100);
    this.conduitMat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(TrenchShader.uniforms),
      vertexShader: TrenchShader.vertexShader,
      fragmentShader: TrenchShader.fragmentShader,
    });
    this.shaderMaterials.push(this.conduitMat);
    this.meshGroup.add(new THREE.Mesh(conduitGeo, this.conduitMat));

    // 60° N sub-trench
    const subTGeo = new THREE.TorusGeometry(R * 0.86 + 0.15, 0.9, 10, 80);
    const subT = new THREE.Mesh(subTGeo, trenchMat);
    subT.rotation.x = Math.PI / 3.5;
    this.meshGroup.add(subT);

    // ── 4. Northern Superlaser Dish ──
    const dishGroup = new THREE.Group();
    dishGroup.position.set(-5.25, 7.5, R - 1.5);
    dishGroup.rotation.y = -Math.PI / 10;
    dishGroup.rotation.x = Math.PI / 12;
    this.dishGroup = dishGroup;

    // Dish rim
    this.meshGroup.add(new THREE.Mesh(new THREE.TorusGeometry(6.375, 1.125, 14, 36), new THREE.MeshStandardMaterial({ color: 0x0a1420, roughness: 0.3, metalness: 1.0 })));
    dishGroup.position.set(-5.25, 7.5, R - 1.5);

    // Dish face
    const dishFaceGeo = new THREE.CylinderGeometry(6.0, 4.5, 1.5, 28);
    dishFaceGeo.rotateX(Math.PI / 2);
    dishGroup.add(new THREE.Mesh(dishFaceGeo, new THREE.MeshStandardMaterial({ color: 0x08101a, roughness: 0.2, metalness: 0.98 })));

    // 8 converging emitter beams
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const beamGeo = new THREE.CylinderGeometry(0.135, 0.135, 5.25, 7);
      const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: 0x00ff44 }));
      beam.position.set(Math.cos(a) * 4.35, Math.sin(a) * 4.35, 0.375);
      beam.rotation.z = a + Math.PI / 2;
      beam.rotation.x = Math.PI / 5;
      dishGroup.add(beam);
    }

    // Central churning plasma orb
    const orbGeo = new THREE.SphereGeometry(1.875, 28, 28);
    this.plasmaShaderMat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(PlasmaOrbShader.uniforms),
      vertexShader: PlasmaOrbShader.vertexShader,
      fragmentShader: PlasmaOrbShader.fragmentShader,
    });
    this.shaderMaterials.push(this.plasmaShaderMat);
    this.coreMesh = new THREE.Mesh(orbGeo, this.plasmaShaderMat);
    this.coreMesh.position.z = -0.375;
    dishGroup.add(this.coreMesh);

    this.meshGroup.add(dishGroup);

    // Dish point light
    this.superlightBoss = new THREE.PointLight(0x00ff44, 8.0, 100);
    this.superlightBoss.position.set(-5.25, 7.5, R + 1.5);
    this.meshGroup.add(this.superlightBoss);

    // ── 5. Superlaser Beam (visual, fires periodically) ──
    const laserBeamGeo = new THREE.CylinderGeometry(0.45, 0.45, 60, 10);
    laserBeamGeo.rotateX(Math.PI / 2);
    this.laserBeamMat = new THREE.MeshBasicMaterial({ color: 0x00ff66, transparent: true, opacity: 0.0 });
    this.laserBeam = new THREE.Mesh(laserBeamGeo, this.laserBeamMat);
    this.laserBeam.position.set(-5.25, 7.5, R + 28.5);
    this.meshGroup.add(this.laserBeam);

    const outerBeamGeo = new THREE.CylinderGeometry(1.05, 1.05, 60, 10);
    outerBeamGeo.rotateX(Math.PI / 2);
    this.outerBeamMat = new THREE.MeshBasicMaterial({ color: 0x88ffaa, transparent: true, opacity: 0.0 });
    this.outerBeam = new THREE.Mesh(outerBeamGeo, this.outerBeamMat);
    this.outerBeam.position.copy(this.laserBeam.position);
    this.meshGroup.add(this.outerBeam);

    // ── 6. Fresnel Shield ──
    const shieldGeo = new THREE.IcosahedronGeometry(R + 4.125, 4);
    this.shieldShaderMat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(ShieldShader.uniforms),
      vertexShader: ShieldShader.vertexShader,
      fragmentShader: ShieldShader.fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.shaderMaterials.push(this.shieldShaderMat);
    this.shieldRing = new THREE.Mesh(shieldGeo, this.shieldShaderMat);
    this.meshGroup.add(this.shieldRing);

    // ── 7. Shield Vulnerable Regulator Core ──
    const vulnGeo = new THREE.SphereGeometry(2.0, 16, 16);
    this.vulnMat = new THREE.MeshBasicMaterial({ color: 0xff3300, transparent: true, opacity: 0.9 });
    this.vulnMesh = new THREE.Mesh(vulnGeo, this.vulnMat);
    this.vulnRelPos = new THREE.Vector3(12, -8, R - 1.5);
    this.vulnMesh.position.copy(this.vulnRelPos);
    this.meshGroup.add(this.vulnMesh);

    const ringGeo = new THREE.TorusGeometry(3.0, 0.25, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    this.vulnRing = new THREE.Mesh(ringGeo, ringMat);
    this.vulnRing.position.copy(this.vulnRelPos);
    this.vulnRing.lookAt(new THREE.Vector3(0, 0, 1).add(this.vulnRelPos));
    this.meshGroup.add(this.vulnRing);

    // ── 8. Heavy Turrets ──
    const baseGeo = new THREE.BoxGeometry(3.0, 1.35, 3.0);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x0c1828, metalness: 0.99, roughness: 0.25 });
    const barrelGeo = new THREE.CylinderGeometry(0.26, 0.375, 3.375, 9);
    barrelGeo.rotateX(Math.PI / 2);
    this.barrelMat = new THREE.MeshStandardMaterial({
      color: 0x001100,
      emissive: 0x00ff44,
      emissiveIntensity: 2.0,
      roughness: 0.2,
      metalness: 0.8
    });
    const turretRingGeo = new THREE.TorusGeometry(0.75, 0.1875, 8, 16);

    this.turrets.forEach(t => {
      const tGroup = new THREE.Group();
      tGroup.position.copy(t.relPos);
      tGroup.add(new THREE.Mesh(baseGeo, baseMat));
      tGroup.add(new THREE.Mesh(turretRingGeo, new THREE.MeshBasicMaterial({ color: 0x00ff44 })));

      const bGroup = new THREE.Group();
      [-0.675, 0.675].forEach(xOff => {
        const b = new THREE.Mesh(barrelGeo, this.barrelMat);
        b.position.set(xOff, 0.525, 1.125);
        bGroup.add(b);
      });
      tGroup.add(bGroup);

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
      this.particleManager.createExplosion(wp, 0x00ff44, 60, 2.5);
    }
    return t.isDead;
  }

  takeCoreDamage(amount) {
    if (this.hasShield) {
      if (this.shieldShaderMat) this.shieldShaderMat.uniforms.uHitTime.value = 1.4;
      return false;
    }
    if (this.phaseShieldTimer > 0) return false;

    const activeTurrets = this.turrets.some(t => !t.isDead);
    const actualDamage = activeTurrets ? amount * 0.72 : amount;
    
    const prevPhase = this.phase;
    this.coreHp -= actualDamage;

    if (this.shieldShaderMat) this.shieldShaderMat.uniforms.uHitTime.value = 1.0;

    // Phase transitions
    const hpRatio = this.coreHp / this.maxCoreHp;
    if (hpRatio < 0.5 && this.phase === 1) {
      this.phase = 2;
      this.fireTimer *= 0.7; // faster fire
    }
    if (hpRatio < 0.25 && this.phase === 2) {
      this.phase = 3;
      this.fireTimer *= 0.7; // even faster
    }

    if (this.phase > prevPhase) {
      this.phaseShieldTimer = 3.0; // 3 seconds phase protection
      this.justPhaseTransitioned = true;
    }

    if (this.coreHp <= 0 && !this.isDead) {
      this.isDead = true;
      this._explode();
    }
    return this.isDead;
  }

  takeDamage(targetType, amount) {
    return targetType === 'core' ? this.takeCoreDamage(amount) : false;
  }

  _explode() {
    this.particleManager.createExplosion(this.meshGroup.position, 0x00ff44, 350, 6.0);
    this.particleManager.createExplosion(this.meshGroup.position, 0xffea00, 200, 5.0);
    this.particleManager.createExplosion(this.meshGroup.position, 0x111822, 150, 4.0);
    this.particleManager.createEmpShockwave(this.meshGroup.position, 130);
  }

  clearAllTimers() {
    this.activeIntervals.forEach(id => clearInterval(id));
    this.activeTimeouts.forEach(id => clearTimeout(id));
    this.activeIntervals = [];
    this.activeTimeouts = [];
  }

  destroy() {
    this.isDead = true; // Ensure isDead is set before clearing timers
    this.clearAllTimers();
    if (this.rimLight) this.scene.remove(this.rimLight);
    if (this.backLight) this.scene.remove(this.backLight);
    if (this.ambLight) this.scene.remove(this.ambLight);
    this.scene.remove(this.meshGroup);
    this.meshGroup.traverse(c => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    });
    // Null out material references so async callbacks can detect disposal
    this.laserBeamMat = null;
    this.outerBeamMat = null;
    this.shieldShaderMat = null;
    this.plasmaShaderMat = null;
    this.conduitMat = null;
    this.vulnMat = null;
    this.barrelMat = null;
  }

  update(dt, playerPos) {
    // If already dead, don't update anything — materials may be disposed
    if (this.isDead) return [];

    const arrived = this.meshGroup.position.z >= this.targetZ;
    if (!arrived) this.meshGroup.position.z += this.speed * dt;

    const time = performance.now() * 0.001;

    this.shaderMaterials.forEach(mat => {
      if (mat.uniforms?.uTime) mat.uniforms.uTime.value = time;
    });

    if (this.phaseShieldTimer > 0) {
      this.phaseShieldTimer -= dt;
      if (this.shieldShaderMat) {
        this.shieldShaderMat.uniforms.uHitTime.value = 1.8;
      }
    } else {
      if (this.shieldShaderMat?.uniforms.uHitTime.value > 0) {
        this.shieldShaderMat.uniforms.uHitTime.value = Math.max(0, this.shieldShaderMat.uniforms.uHitTime.value - dt * 3.5);
      }
    }

    if (this.shieldShaderMat) {
      this.shieldShaderMat.uniforms.uHp.value = this.coreHp / this.maxCoreHp;
    }

    // Majestic slow rotation
    this.meshGroup.rotation.y += 0.05 * dt;

    if (this.shieldRing) {
      this.shieldRing.visible = this.hasShield;
      if (this.hasShield) {
        this.shieldRing.rotation.z += 0.55 * dt;
        this.shieldRing.rotation.x += 0.32 * dt;
      }
    }

    // Vulnerable Point indicator animation
    if (this.vulnRing && this.vulnMesh && this.vulnMesh.visible) {
      this.vulnRing.rotation.z += 1.8 * dt;
      if (this.vulnMat) {
        this.vulnMat.opacity = 0.5 + Math.sin(time * 8.0) * 0.4;
      }
    }

    // Superlaser dish aim toward player
    if (this.dishGroup && arrived) {
      const localTarget = this.meshGroup.worldToLocal(playerPos.clone());
      this.dishGroup.lookAt(localTarget);
    }

    // Plasma orb intensity ramps up with phase
    if (this.superlightBoss) {
      this.superlightBoss.intensity = 6.0 + Math.sin(time * 4) * 2.0 + this.phase * 2.0;
    }

    // ── Superlaser beam attack (every 8s in phase 1, 5s in phase 2, 3s in phase 3) ──
    const laserInterval = this.phase === 1 ? 8 : this.phase === 2 ? 5 : 3;
    this.superlasertimer += dt;
    if (this.superlasertimer >= laserInterval && arrived && !this.superlaserfiring) {
      this.superlasertimer = 0;
      this.superlaserfiring = true;
      this._fireSuperLaser();
    }

    // Turret tracking
    if (arrived) {
      this.turrets.forEach(t => {
        if (!t.isDead && t.mesh) {
          const localTarget = this.meshGroup.worldToLocal(playerPos.clone());
          t.mesh.lookAt(localTarget);
        }
      });
    }

    // Turret charge lights (emissive animation)
    this.fireTimer -= dt;
    const chargeRatio = Math.max(0, 1.0 - this.fireTimer / (0.6 / this.phase));
    if (this.barrelMat) {
      this.barrelMat.emissiveIntensity = 2.0 + chargeRatio * 12.0;
    }

    const out = [];
    if (this.fireTimer <= 0 && arrived) {
      this.fireTimer = 0.55 / this.phase;
      this.turrets.forEach(t => {
        if (!t.isDead && t.mesh) {
          out.push(t.mesh.getWorldPosition(new THREE.Vector3()));
        }
      });
    }

    return out.length > 0 ? out : false;
  }

  _fireSuperLaser() {
    if (!this.laserBeamMat || !this.outerBeamMat) return;
    let alpha = 0;
    const chargeUp = setInterval(() => {
      // Guard: stop if boss was destroyed while this interval was in flight
      if (this.isDead || !this.laserBeamMat || !this.outerBeamMat) {
        clearInterval(chargeUp);
        this.superlaserfiring = false;
        return;
      }
      alpha += 0.08;
      this.laserBeamMat.opacity = Math.min(alpha, 0.95);
      this.outerBeamMat.opacity = Math.min(alpha * 0.5, 0.4);
      if (alpha >= 1.0) {
        clearInterval(chargeUp);
        const idx = this.activeIntervals.indexOf(chargeUp);
        if (idx > -1) this.activeIntervals.splice(idx, 1);

        const timeoutId = setTimeout(() => {
          // Guard: stop if boss was destroyed during the hold phase
          if (this.isDead || !this.laserBeamMat || !this.outerBeamMat) {
            this.superlaserfiring = false;
            return;
          }
          const tIdx = this.activeTimeouts.indexOf(timeoutId);
          if (tIdx > -1) this.activeTimeouts.splice(tIdx, 1);

          const fadeOut = setInterval(() => {
            // Guard: stop if boss was destroyed during fade-out
            if (this.isDead || !this.laserBeamMat || !this.outerBeamMat) {
              clearInterval(fadeOut);
              this.superlaserfiring = false;
              return;
            }
            alpha -= 0.04;
            this.laserBeamMat.opacity = Math.max(0, alpha);
            this.outerBeamMat.opacity = Math.max(0, alpha * 0.4);
            if (alpha <= 0) {
              clearInterval(fadeOut);
              const fIdx = this.activeIntervals.indexOf(fadeOut);
              if (fIdx > -1) this.activeIntervals.splice(fIdx, 1);
              this.superlaserfiring = false;
            }
          }, 30);
          this.activeIntervals.push(fadeOut);
        }, 600);
        this.activeTimeouts.push(timeoutId);
      }
    }, 40);
    this.activeIntervals.push(chargeUp);
  }
}
