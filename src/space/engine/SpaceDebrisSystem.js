import * as THREE from 'three';
import { getPBRMaterialSet } from './PBRTextureGenerator.js';

export class SpaceDebrisSystem {
  /**
   * @param {THREE.Scene} scene
   * @param {number} maxDebrisPool Maximum simultaneous debris fragments across entire game
   */
  constructor(scene, maxDebrisPool = 512) {
    this.scene = scene;
    this.poolSize = maxDebrisPool;
    this.currentIndex = 0; // Ring-buffer pointer

    this.initPool();
  }

  initPool() {
    // 1. Create Jagged Shard Geometry (Low poly: 4-8 triangles)
    const baseGeometry = new THREE.TetrahedronGeometry(0.8, 1);
    
    // Deform vertices slightly to give an irregular, torn-metal profile
    const pos = baseGeometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setXYZ(
        i,
        pos.getX(i) * (0.6 + Math.random() * 0.8),
        pos.getY(i) * (0.4 + Math.random() * 0.6),
        pos.getZ(i) * (0.6 + Math.random() * 0.8)
      );
    }
    baseGeometry.computeVertexNormals();

    // 2. Pre-allocate Instanced Attributes
    this.aOrigin = new THREE.InstancedBufferAttribute(new Float32Array(this.poolSize * 3), 3);
    this.aVelocity = new THREE.InstancedBufferAttribute(new Float32Array(this.poolSize * 3), 3);
    this.aAngularAxis = new THREE.InstancedBufferAttribute(new Float32Array(this.poolSize * 3), 3);
    this.aAngularSpeed = new THREE.InstancedBufferAttribute(new Float32Array(this.poolSize), 1);
    this.aLifeParams = new THREE.InstancedBufferAttribute(new Float32Array(this.poolSize * 2), 2);
    this.aScale = new THREE.InstancedBufferAttribute(new Float32Array(this.poolSize), 1);

    // Set draw usage to dynamic streaming
    this.aOrigin.setUsage(THREE.DynamicDrawUsage);
    this.aVelocity.setUsage(THREE.DynamicDrawUsage);
    this.aAngularAxis.setUsage(THREE.DynamicDrawUsage);
    this.aAngularSpeed.setUsage(THREE.DynamicDrawUsage);
    this.aLifeParams.setUsage(THREE.DynamicDrawUsage);
    this.aScale.setUsage(THREE.DynamicDrawUsage);

    // Initialize all debris in "expired" state
    for (let i = 0; i < this.poolSize; i++) {
      this.aLifeParams.setXY(i, -100.0, 1.0); // birthTime = -100 (inactive)
    }

    baseGeometry.setAttribute('aOrigin', this.aOrigin);
    baseGeometry.setAttribute('aVelocity', this.aVelocity);
    baseGeometry.setAttribute('aAngularAxis', this.aAngularAxis);
    baseGeometry.setAttribute('aAngularSpeed', this.aAngularSpeed);
    baseGeometry.setAttribute('aLifeParams', this.aLifeParams);
    baseGeometry.setAttribute('aScale', this.aScale);

    // 3. Embedded Mobile GLSL Shaders
    const vertexShader = `
      precision mediump float;

      attribute vec3 position;
      attribute vec3 normal;
      attribute vec2 uv;

      // Per-instance attributes (InstancedBufferAttribute)
      attribute vec3 aOrigin;          // Ship position at destruction
      attribute vec3 aVelocity;        // Ejection vector + parent momentum
      attribute vec3 aAngularAxis;     // Tumbling axis (normalized)
      attribute float aAngularSpeed;   // Rotation rate (rad/sec)
      attribute vec2 aLifeParams;      // x: birthTime (sec), y: maxLifetime (sec)
      attribute float aScale;          // Debris shard visual scale

      uniform mat4 modelViewMatrix;
      uniform mat4 projectionMatrix;
      uniform mat3 normalMatrix;
      uniform float uTime;             // Current game time in seconds

      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying float vNormalizedAge;    // 0.0 (fresh) -> 1.0 (dead)

      // Rodrigues' rotation formula for arbitrary axis rotation
      vec3 rotateAxisAngle(vec3 v, vec3 axis, float angle) {
          float cosTheta = cos(angle);
          float sinTheta = sin(angle);
          return v * cosTheta + cross(axis, v) * sinTheta + axis * dot(axis, v) * (1.0 - cosTheta);
      }

      void main() {
          vUv = uv;

          float birthTime = aLifeParams.x;
          float maxLifetime = aLifeParams.y;
          float age = uTime - birthTime;

          // Normalize lifetime; if inactive or expired, shrink to zero
          vNormalizedAge = clamp(age / maxLifetime, 0.0, 1.0);
          float alive = (age >= 0.0 && age < maxLifetime) ? 1.0 : 0.0;

          // Linear scale-down as fragment burns up / cools off
          float currentScale = aScale * (1.0 - vNormalizedAge * 0.7) * alive;

          // Kinematic displacement: P(t) = P0 + V0 * t
          vec3 worldOffset = aOrigin + (aVelocity * age);

          // Dynamic 3D rotation based on tumble velocity
          float rotationAngle = aAngularSpeed * age;
          vec3 rotatedPos = rotateAxisAngle(position, aAngularAxis, rotationAngle) * currentScale;
          vec3 rotatedNormal = rotateAxisAngle(normal, aAngularAxis, rotationAngle);

          vNormal = normalize(normalMatrix * rotatedNormal);

          vec4 worldPos = vec4(worldOffset + rotatedPos, 1.0);
          vec4 mvPosition = modelViewMatrix * worldPos;
          vViewPosition = -mvPosition.xyz;

          gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const fragmentShader = `
      precision mediump float;

      uniform sampler2D tAlbedo;
      uniform vec3 uSunDirection;
      uniform vec3 uSunColor;
      uniform vec3 uAmbientColor;
      uniform vec3 uMoltenColor;

      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying float vNormalizedAge;

      void main() {
          vec3 N = normalize(vNormal);
          vec3 V = normalize(vViewPosition);
          vec3 L = normalize(uSunDirection);

          float NdotL = max(dot(N, L), 0.0);
          vec4 albedo = texture2D(tAlbedo, vUv);
          vec3 baseColor = albedo.rgb * 0.5 + vec3(0.08, 0.09, 0.12);
          vec3 diffuse = baseColor * (uSunColor * NdotL + uAmbientColor);

          vec3 H = normalize(L + V);
          float NdotH = max(dot(N, H), 0.0);
          float spec = pow(NdotH, 20.0) * 0.35;

          // Molten breach cooling glow
          float heat = smoothstep(0.9, 0.0, vNormalizedAge);
          vec3 moltenGlow = uMoltenColor * heat * 2.8;

          vec3 finalColor = diffuse + vec3(spec) + moltenGlow;
          gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    const pbrSet = getPBRMaterialSet('ENEMY_ALIEN');
    const tAlbedo = pbrSet.map;

    this.material = new THREE.RawShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0.0 },
        tAlbedo: { value: tAlbedo },
        uSunDirection: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
        uSunColor: { value: new THREE.Vector3(1.2, 1.15, 1.1) },
        uAmbientColor: { value: new THREE.Vector3(0.08, 0.09, 0.12) },
        uMoltenColor: { value: new THREE.Vector3(1.0, 0.35, 0.05) }
      },
      depthWrite: true,
      depthTest: true,
      side: THREE.DoubleSide
    });

    // 4. InstancedMesh wrapper
    this.instancedMesh = new THREE.InstancedMesh(baseGeometry, this.material, this.poolSize);
    this.instancedMesh.frustumCulled = false; // GPU position offset happens outside CPU bounding box
    this.scene.add(this.instancedMesh);
  }

  /**
   * Ejects a burst of debris shards when a ship explodes
   * @param {THREE.Vector3} position - Center of explosion
   * @param {THREE.Vector3} parentVelocity - Momentum carried over from destroyed ship
   * @param {number} shardCount - Number of shards (e.g., 6 to 12)
   */
  explodeShip(position, parentVelocity = new THREE.Vector3(), shardCount = 8) {
    if (!position) return;
    const now = performance.now() * 0.001;
    const randomAxis = new THREE.Vector3();

    for (let i = 0; i < shardCount; i++) {
      const idx = this.currentIndex;

      // 1. Origin at ship destruction coordinate
      this.aOrigin.setXYZ(idx, position.x, position.y, position.z);

      // 2. Outward ejection velocity + inherit parent ship momentum
      const speed = 8.0 + Math.random() * 16.0;
      const angleTheta = Math.random() * Math.PI * 2;
      const anglePhi = Math.acos(Math.random() * 2 - 1);
      
      const vx = (parentVelocity ? parentVelocity.x * 0.5 : 0) + speed * Math.sin(anglePhi) * Math.cos(angleTheta);
      const vy = (parentVelocity ? parentVelocity.y * 0.5 : 0) + speed * Math.sin(anglePhi) * Math.sin(angleTheta);
      const vz = (parentVelocity ? parentVelocity.z * 0.5 : 0) + speed * Math.cos(anglePhi);
      this.aVelocity.setXYZ(idx, vx, vy, vz);

      // 3. Random tumble rotation axis and speed
      randomAxis.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
      this.aAngularAxis.setXYZ(idx, randomAxis.x, randomAxis.y, randomAxis.z);
      this.aAngularSpeed.setX(idx, 4.0 + Math.random() * 12.0); // 4-16 rad/s tumble

      // 4. Lifespan: Shards live between 2.5 and 4.0 seconds
      const lifetime = 2.5 + Math.random() * 1.5;
      this.aLifeParams.setXY(idx, now, lifetime);

      // 5. Random shard size
      this.aScale.setX(idx, 0.4 + Math.random() * 0.8);

      // Advance circular ring buffer
      this.currentIndex = (this.currentIndex + 1) % this.poolSize;
    }

    // Mark attributes dirty for GPU upload
    this.aOrigin.needsUpdate = true;
    this.aVelocity.needsUpdate = true;
    this.aAngularAxis.needsUpdate = true;
    this.aAngularSpeed.needsUpdate = true;
    this.aLifeParams.needsUpdate = true;
    this.aScale.needsUpdate = true;
  }

  // Alias for spawnDebris
  spawnDebris(position, count = 8, parentVelocity = null) {
    this.explodeShip(position, parentVelocity || new THREE.Vector3(), count);
  }

  /**
   * Called once per frame in main animation loop
   * @param {number} currentTimeSeconds
   */
  update(currentTimeSeconds) {
    if (this.material && this.material.uniforms) {
      this.material.uniforms.uTime.value = currentTimeSeconds !== undefined ? currentTimeSeconds : performance.now() * 0.001;
    }
  }

  destroy() {
    if (this.instancedMesh && this.instancedMesh.parent) {
      this.instancedMesh.parent.remove(this.instancedMesh);
    }
    if (this.instancedMesh && this.instancedMesh.geometry) {
      this.instancedMesh.geometry.dispose();
    }
    if (this.material) {
      this.material.dispose();
    }
  }
}
