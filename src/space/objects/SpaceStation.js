import * as THREE from 'three';

// ============================================================
// WAVE 1 BOSS — Star Wars Death Star Imperial Superweapon (Overhaul)
// Visual Identity: Weathered PBR Dark Slate Sphere (#1a2030), Fresnel Shield,
//                 Churning Plasma Dish Shader, Trench Light Conduit Shader,
//                 Dynamic 3-Point & Turret Charge Lighting.
// Stats: 1500 Core HP, 350 Turret HP, 25% Active Shield Damage Absorption.
// ============================================================

// ── Procedural Canvas Generators for PBR Hull Textures ──
function generateHullNormalMap() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Neutral normal base (128, 128, 255)
  ctx.fillStyle = 'rgb(128, 128, 255)';
  ctx.fillRect(0, 0, 512, 512);

  // Panel grid lines with bevel highlights/shadows
  ctx.strokeStyle = 'rgb(90, 128, 255)';
  ctx.lineWidth = 3;
  for (let x = 0; x < 512; x += 32) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke();
  }
  for (let y = 0; y < 512; y += 32) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
  }

  // Random armor panel rivets and greeble bump details
  ctx.fillStyle = 'rgb(180, 180, 255)';
  for (let i = 0; i < 400; i++) {
    const rx = Math.floor(Math.random() * 16) * 32 + 4;
    const ry = Math.floor(Math.random() * 16) * 32 + 4;
    ctx.fillRect(rx, ry, 4, 4);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 2);
  return texture;
}

function generateHullRoughnessMap() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgb(140, 140, 140)';
  ctx.fillRect(0, 0, 512, 512);

  // Weathering noise & scuff marks
  for (let i = 0; i < 1200; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const size = Math.random() * 16 + 4;
    const val = Math.floor(Math.random() * 100 + 100);
    ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
    ctx.fillRect(x, y, size, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 2);
  return texture;
}

// ── Custom Shaders ──

// 1. Churning Superlaser Plasma Orb Shader
const PlasmaOrbShader = {
  uniforms: {
    uTime: { value: 0.0 },
    uColor: { value: new THREE.Color(0x00ff44) }
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec2 vUv;
    varying vec3 vPosition;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vUv = uv;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColor;
    varying vec3 vNormal;
    varying vec2 vUv;
    varying vec3 vPosition;

    // Simple 3D noise emulation for churning plasma
    float noise(vec3 p) {
      return sin(p.x * 4.0 + uTime * 3.0) * cos(p.y * 4.0 + uTime * 2.5) * sin(p.z * 4.0 + uTime * 3.5);
    }

    void main() {
      float n = noise(vPosition * 1.5);
      float turbulent = sin(vUv.y * 20.0 + uTime * 6.0 + n * 4.0) * 0.5 + 0.5;
      vec3 coreColor = mix(uColor, vec3(1.0, 1.0, 1.0), turbulent * 0.65);
      float rim = 1.0 - max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
      coreColor += vec3(0.2, 1.0, 0.4) * pow(rim, 2.0);
      gl_FragColor = vec4(coreColor * 3.5, 1.0);
    }
  `
};

// 2. Scrolling Trench Conduit Light Shader
const TrenchConduitShader = {
  uniforms: {
    uTime: { value: 0.0 },
    uColor: { value: new THREE.Color(0x00ff44) }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColor;
    varying vec2 vUv;
    void main() {
      float pulse = sin(vUv.x * 80.0 - uTime * 8.0) * 0.5 + 0.5;
      pulse = pow(pulse, 3.0);
      vec3 glow = uColor * (1.5 + pulse * 4.0);
      gl_FragColor = vec4(glow, 1.0);
    }
  `
};

// 3. Ethereal Fresnel Deflector Shield Shader
const ShieldFresnelShader = {
  uniforms: {
    uTime: { value: 0.0 },
    uHitTime: { value: 0.0 },
    uColor: { value: new THREE.Color(0x00ff44) }
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uHitTime;
    uniform vec3 uColor;
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(vViewPosition);
      float fresnel = pow(1.0 - abs(dot(normal, viewDir)), 2.8);
      float pulse = sin(uTime * 3.0) * 0.15 + 0.85;

      vec3 edgeColor = mix(uColor, vec3(1.0, 1.0, 1.0), uHitTime);
      float alpha = (fresnel * 0.75 + uHitTime * 0.5) * pulse;

      gl_FragColor = vec4(edgeColor * (2.0 + uHitTime * 3.0), alpha);
    }
  `
};

export class SpaceStation {
  constructor(scene, particleManager) {
    this.scene = scene;
    this.particleManager = particleManager;

    this.meshGroup = new THREE.Group();
    this.meshGroup.position.set(0, 5, -110);

    this.targetZ = -40;
    this.speed = 6.0;

    // DIFFICULTY BUFF: 1500 Core HP, 350 Turret HP
    this.coreHp = 1500;
    this.maxCoreHp = 1500;
    this.scoreValue = 35000;
    this.isDead = false;

    // 40% Faster Fire Rate (0.55s cooldown)
    this.fireTimer = 0.55;

    // Imperial point-defense gun turrets
    this.turrets = [
      { id: 0, relPos: new THREE.Vector3(-18, 10, 14), hp: 350, maxHp: 350, isDead: false, mesh: null, light: null, barrelGroup: null },
      { id: 1, relPos: new THREE.Vector3(18, 10, 14), hp: 350, maxHp: 350, isDead: false, mesh: null, light: null, barrelGroup: null },
      { id: 2, relPos: new THREE.Vector3(-18, -10, 14), hp: 350, maxHp: 350, isDead: false, mesh: null, light: null, barrelGroup: null },
      { id: 3, relPos: new THREE.Vector3(18, -10, 14), hp: 350, maxHp: 350, isDead: false, mesh: null, light: null, barrelGroup: null },
    ];

    this.shaderMaterials = [];

    this._build();
    this.scene.add(this.meshGroup);
  }

  _build() {
    const R = 22.0;

    // ── 1. Dynamic 3-Point Lighting Setup ──
    // Harsh cool-white directional rim light simulating distant sun
    this.rimLight = new THREE.DirectionalLight(0xe0f0ff, 3.2);
    this.rimLight.position.set(60, 40, -50);
    this.scene.add(this.rimLight);

    // Warm fill light
    this.fillLight = new THREE.DirectionalLight(0x223344, 1.2);
    this.fillLight.position.set(-50, -20, 30);
    this.scene.add(this.fillLight);

    // ── 2. PBR Imperial Spherical Armor Hull ──
    const normalMap = generateHullNormalMap();
    const roughnessMap = generateHullRoughnessMap();

    const hullGeo = new THREE.SphereGeometry(R, 36, 32);
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x1a2030,
      roughness: 0.55,
      metalness: 0.88,
      normalMap: normalMap,
      normalScale: new THREE.Vector2(0.85, 0.85),
      roughnessMap: roughnessMap,
      flatShading: true,
    });
    this.spireMesh = new THREE.Mesh(hullGeo, hullMat);
    this.meshGroup.add(this.spireMesh);

    // ── 3. Equatorial & 60° North Sub-Trenches with Custom Shaders ──
    const trenchGeo = new THREE.TorusGeometry(R + 0.3, 2.2, 10, 80);
    const trenchMat = new THREE.MeshStandardMaterial({
      color: 0x090d12,
      roughness: 0.8,
      metalness: 1.0,
      normalMap: normalMap,
    });
    this.equatorialTrench = new THREE.Mesh(trenchGeo, trenchMat);
    this.meshGroup.add(this.equatorialTrench);

    // Scrolling Trench Conduit Light Shader Strip
    const conduitGeo = new THREE.TorusGeometry(R + 0.32, 0.4, 8, 80);
    this.conduitMat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(TrenchConduitShader.uniforms),
      vertexShader: TrenchConduitShader.vertexShader,
      fragmentShader: TrenchConduitShader.fragmentShader,
      transparent: true,
    });
    this.shaderMaterials.push(this.conduitMat);
    this.meshGroup.add(new THREE.Mesh(conduitGeo, this.conduitMat));

    // 60° North Sub-Trench
    const subTrenchGeo = new THREE.TorusGeometry(R * 0.87 + 0.2, 0.95, 8, 64);
    const subTrench = new THREE.Mesh(subTrenchGeo, trenchMat);
    subTrench.rotation.x = Math.PI / 3.5;
    this.meshGroup.add(subTrench);

    // ── 4. Superlaser Dish with Churning Procedural Plasma Noise Shader ──
    const dishGroup = new THREE.Group();
    dishGroup.position.set(-5.5, 8, R - 1.5);
    dishGroup.rotation.y = -Math.PI / 12;
    dishGroup.rotation.x = Math.PI / 14;

    const rimGeo = new THREE.TorusGeometry(6.0, 1.1, 12, 28);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x111820, roughness: 0.3, metalness: 1.0 });
    dishGroup.add(new THREE.Mesh(rimGeo, rimMat));

    const dishFaceGeo = new THREE.CylinderGeometry(5.5, 4.0, 1.5, 24);
    dishFaceGeo.rotateX(Math.PI / 2);
    const dishFaceMat = new THREE.MeshStandardMaterial({ color: 0x0a1218, roughness: 0.3, metalness: 0.95 });
    dishGroup.add(new THREE.Mesh(dishFaceGeo, dishFaceMat));

    // 8 Converging Superlaser Emitter Beams
    const beamGeo = new THREE.CylinderGeometry(0.12, 0.12, 5.2, 8);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0x00ff44 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set(Math.cos(a) * 4.0, Math.sin(a) * 4.0, 0.3);
      beam.rotation.z = a + Math.PI / 2;
      beam.rotation.x = Math.PI / 5.5;
      dishGroup.add(beam);
    }

    // Central Churning Plasma Shader Orb
    const orbGeo = new THREE.SphereGeometry(1.85, 24, 24);
    this.plasmaShaderMat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(PlasmaOrbShader.uniforms),
      vertexShader: PlasmaOrbShader.vertexShader,
      fragmentShader: PlasmaOrbShader.fragmentShader,
    });
    this.shaderMaterials.push(this.plasmaShaderMat);
    this.coreMesh = new THREE.Mesh(orbGeo, this.plasmaShaderMat);
    this.coreMesh.position.z = -0.5;
    dishGroup.add(this.coreMesh);

    this.meshGroup.add(dishGroup);

    // Dynamic Dish Green Point Light
    this.superlightBoss = new THREE.PointLight(0x00ff44, 4.5, 75);
    this.superlightBoss.position.set(-5.5, 8, R - 1.5);
    this.meshGroup.add(this.superlightBoss);

    // ── 5. Fresnel Deflector Shield ──
    const shieldGeo = new THREE.IcosahedronGeometry(R + 3.8, 3);
    this.shieldShaderMat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(ShieldFresnelShader.uniforms),
      vertexShader: ShieldFresnelShader.vertexShader,
      fragmentShader: ShieldFresnelShader.fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.shaderMaterials.push(this.shieldShaderMat);
    this.shieldRing = new THREE.Mesh(shieldGeo, this.shieldShaderMat);
    this.meshGroup.add(this.shieldRing);

    // ── 6. Imperial Turrets with Dynamic Charge Lights ──
    const baseGeo = new THREE.BoxGeometry(3.2, 1.4, 3.2);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x0d1520, metalness: 0.98, roughness: 0.3 });

    const barrelGeo = new THREE.CylinderGeometry(0.28, 0.38, 3.4, 8);
    barrelGeo.rotateX(Math.PI / 2);
    const barrelMat = new THREE.MeshBasicMaterial({ color: 0x00ff44 });

    this.turrets.forEach(t => {
      const tGroup = new THREE.Group();
      tGroup.position.copy(t.relPos);

      tGroup.add(new THREE.Mesh(baseGeo, baseMat));

      const bGroup = new THREE.Group();
      const b1 = new THREE.Mesh(barrelGeo, barrelMat);
      b1.position.set(0.7, 0.6, 1.2);
      bGroup.add(b1);
      const b2 = new THREE.Mesh(barrelGeo, barrelMat);
      b2.position.set(-0.7, 0.6, 1.2);
      bGroup.add(b2);

      tGroup.add(bGroup);

      // Dynamic Green Charge Light per turret
      const tLight = new THREE.PointLight(0x00ff44, 1.5, 25);
      tLight.position.set(0, 1.0, 1.8);
      tGroup.add(tLight);
      t.light = tLight;

      this.meshGroup.add(tGroup);
      t.mesh = tGroup;
      t.barrelGroup = bGroup;
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
      this.particleManager.createExplosion(wp, 0x00ff44, 50, 2.2);
    }
    return turret.isDead;
  }

  takeCoreDamage(amount) {
    // SHIELD MECHANIC: 25% damage absorption if at least 1 turret is active!
    const activeTurretExists = this.turrets.some(t => !t.isDead);
    const actualDamage = activeTurretExists ? amount * 0.75 : amount;

    this.coreHp -= actualDamage;

    // Trigger Shield Fresnel Hit Pulse
    if (this.shieldShaderMat) {
      this.shieldShaderMat.uniforms.uHitTime.value = 1.0;
    }

    if (this.coreHp <= 0 && !this.isDead) {
      this.isDead = true;
      this._explode();
    }

    return this.isDead;
  }

  takeDamage(targetType, amount) {
    if (targetType === 'core') {
      return this.takeCoreDamage(amount);
    }
    return false;
  }

  _explode() {
    // Enhanced 500 Particle Count (Emerald, Gold, Dark Debris)
    this.particleManager.createExplosion(this.meshGroup.position, 0x00ff44, 250, 5.0);
    this.particleManager.createExplosion(this.meshGroup.position, 0xffea00, 150, 4.0);
    this.particleManager.createExplosion(this.meshGroup.position, 0x111822, 100, 3.5);
    this.particleManager.createEmpShockwave(this.meshGroup.position, 110);

    // Lingering half-second white flash & screen flash
    const flash = new THREE.PointLight(0xffffff, 80.0, 900);
    flash.position.copy(this.meshGroup.position);
    this.scene.add(flash);

    let intensity = 80.0;
    const fade = setInterval(() => {
      intensity -= 3.5;
      if (intensity <= 0) {
        clearInterval(fade);
        this.scene.remove(flash);
      } else {
        flash.intensity = intensity;
      }
    }, 60);
  }

  destroy() {
    if (this.rimLight) this.scene.remove(this.rimLight);
    if (this.fillLight) this.scene.remove(this.fillLight);
    this.scene.remove(this.meshGroup);
    this.meshGroup.traverse(c => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    });
  }

  update(dt, playerPos) {
    if (this.meshGroup.position.z < this.targetZ) {
      this.meshGroup.position.z += this.speed * dt;
    }

    const time = performance.now() * 0.001;

    // Update custom shader uniforms
    this.shaderMaterials.forEach(mat => {
      if (mat.uniforms && mat.uniforms.uTime) mat.uniforms.uTime.value = time;
    });

    // Decay shield hit pulse
    if (this.shieldShaderMat && this.shieldShaderMat.uniforms.uHitTime.value > 0) {
      this.shieldShaderMat.uniforms.uHitTime.value = Math.max(0, this.shieldShaderMat.uniforms.uHitTime.value - dt * 3.0);
    }

    // Majestic slow Y-axis rotation
    this.meshGroup.rotation.y += 0.06 * dt;

    if (this.shieldRing) {
      this.shieldRing.rotation.z += 0.6 * dt;
      this.shieldRing.rotation.x += 0.35 * dt;
    }

    // 30% Faster Turret Tracking Speed (Smooth Quaternion Slerp)
    this.turrets.forEach(t => {
      if (!t.isDead && t.mesh) {
        const currentQuat = t.mesh.quaternion.clone();
        t.mesh.lookAt(playerPos);
        const targetQuat = t.mesh.quaternion.clone();
        t.mesh.quaternion.copy(currentQuat).slerp(targetQuat, 0.25);
      }
    });

    // Charge-up turret lights as fireTimer approaches 0
    this.fireTimer -= dt;

    const chargeRatio = Math.max(0, 1.0 - this.fireTimer / 0.55);
    this.turrets.forEach(t => {
      if (!t.isDead && t.light) {
        t.light.intensity = 1.5 + chargeRatio * 6.5; // Intensifies right before firing!
      }
    });

    const out = [];
    if (this.fireTimer <= 0) {
      this.fireTimer = 0.55; // 40% faster fire rate!
      this.turrets.forEach(t => {
        if (!t.isDead && t.mesh) {
          out.push(t.mesh.getWorldPosition(new THREE.Vector3()));
          if (t.light) t.light.intensity = 1.5;
        }
      });
    }

    return out.length > 0 ? out : false;
  }
}
