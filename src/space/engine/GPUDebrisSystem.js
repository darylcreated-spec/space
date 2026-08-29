import * as THREE from 'three';

/**
 * GPU-Instanced Kinematic Debris & Shrapnel System
 * Simulates hundreds of tumbling metal hull fragments entirely on the GPU in a single draw call.
 */
export class GPUDebrisSystem {
  constructor(scene, maxInstances = 200) {
    this.scene = scene;
    this.maxInstances = maxInstances;
    this.currentIndex = 0;
    this.totalTime = 0;

    this.initSystem();
  }

  initSystem() {
    // Sharp faceted shrapnel hull shard geometry
    const baseGeometry = new THREE.DodecahedronGeometry(0.7, 0);

    // Per-instance attributes
    this.origins = new Float32Array(this.maxInstances * 3);
    this.velocities = new Float32Array(this.maxInstances * 3);
    this.angularAxes = new Float32Array(this.maxInstances * 3);
    this.angularSpeeds = new Float32Array(this.maxInstances);
    this.lifeParams = new Float32Array(this.maxInstances * 2);
    this.scales = new Float32Array(this.maxInstances);

    // Initialize all as inactive (birthTime = -9999)
    for (let i = 0; i < this.maxInstances; i++) {
      this.origins[i * 3] = 0;
      this.origins[i * 3 + 1] = 0;
      this.origins[i * 3 + 2] = 0;

      this.velocities[i * 3] = 0;
      this.velocities[i * 3 + 1] = 0;
      this.velocities[i * 3 + 2] = 0;

      this.angularAxes[i * 3] = 0;
      this.angularAxes[i * 3 + 1] = 1;
      this.angularAxes[i * 3 + 2] = 0;

      this.angularSpeeds[i] = 0;
      this.lifeParams[i * 2] = -9999.0; // birthTime
      this.lifeParams[i * 2 + 1] = 2.5;   // maxLifetime
      this.scales[i] = 0.0;
    }

    this.attrOrigin = new THREE.InstancedBufferAttribute(this.origins, 3);
    this.attrOrigin.setUsage(THREE.DynamicDrawUsage);
    baseGeometry.setAttribute('aOrigin', this.attrOrigin);

    this.attrVelocity = new THREE.InstancedBufferAttribute(this.velocities, 3);
    this.attrVelocity.setUsage(THREE.DynamicDrawUsage);
    baseGeometry.setAttribute('aVelocity', this.attrVelocity);

    this.attrAngularAxis = new THREE.InstancedBufferAttribute(this.angularAxes, 3);
    this.attrAngularAxis.setUsage(THREE.DynamicDrawUsage);
    baseGeometry.setAttribute('aAngularAxis', this.attrAngularAxis);

    this.attrAngularSpeed = new THREE.InstancedBufferAttribute(this.angularSpeeds, 1);
    this.attrAngularSpeed.setUsage(THREE.DynamicDrawUsage);
    baseGeometry.setAttribute('aAngularSpeed', this.attrAngularSpeed);

    this.attrLifeParams = new THREE.InstancedBufferAttribute(this.lifeParams, 2);
    this.attrLifeParams.setUsage(THREE.DynamicDrawUsage);
    baseGeometry.setAttribute('aLifeParams', this.attrLifeParams);

    this.attrScale = new THREE.InstancedBufferAttribute(this.scales, 1);
    this.attrScale.setUsage(THREE.DynamicDrawUsage);
    baseGeometry.setAttribute('aScale', this.attrScale);

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
          vec3 baseColor = vec3(0.12, 0.14, 0.18);
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

    this.material = new THREE.RawShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0.0 },
        uSunDirection: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
        uSunColor: { value: new THREE.Vector3(1.2, 1.15, 1.1) },
        uAmbientColor: { value: new THREE.Vector3(0.08, 0.09, 0.12) },
        uMoltenColor: { value: new THREE.Vector3(1.0, 0.35, 0.05) }
      },
      depthWrite: true,
      depthTest: true
    });

    this.instancedMesh = new THREE.InstancedMesh(baseGeometry, this.material, this.maxInstances);
    this.instancedMesh.frustumCulled = false;
    this.scene.add(this.instancedMesh);
  }

  spawnDebris(originPos, count = 6, baseVelocity = null, scaleMultiplier = 1.0) {
    if (!originPos) return;

    for (let c = 0; c < count; c++) {
      const idx = this.currentIndex;
      this.currentIndex = (this.currentIndex + 1) % this.maxInstances;

      // 1. Origin with jitter
      this.origins[idx * 3 + 0] = originPos.x + (Math.random() - 0.5) * 1.5;
      this.origins[idx * 3 + 1] = originPos.y + (Math.random() - 0.5) * 1.5;
      this.origins[idx * 3 + 2] = originPos.z + (Math.random() - 0.5) * 1.5;

      // 2. High-Velocity Ejection
      const speed = 12.0 + Math.random() * 22.0;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const vx = Math.sin(phi) * Math.cos(theta) * speed + (baseVelocity ? baseVelocity.x * 0.4 : 0);
      const vy = Math.sin(phi) * Math.sin(theta) * speed + (baseVelocity ? baseVelocity.y * 0.4 : 0);
      const vz = Math.cos(phi) * speed + (baseVelocity ? baseVelocity.z * 0.4 : 6.0);

      this.velocities[idx * 3 + 0] = vx;
      this.velocities[idx * 3 + 1] = vy;
      this.velocities[idx * 3 + 2] = vz;

      // 3. Normalized Tumbling Axis
      const axis = new THREE.Vector3(
        (Math.random() - 0.5),
        (Math.random() - 0.5),
        (Math.random() - 0.5)
      ).normalize();

      this.angularAxes[idx * 3 + 0] = axis.x;
      this.angularAxes[idx * 3 + 1] = axis.y;
      this.angularAxes[idx * 3 + 2] = axis.z;

      // 4. Angular Speed (rad/sec)
      this.angularSpeeds[idx] = (Math.random() - 0.5) * (Math.PI * 8.0);

      // 5. Life Parameters (birthTime, maxLifetime)
      this.lifeParams[idx * 2 + 0] = this.totalTime;
      this.lifeParams[idx * 2 + 1] = 2.0 + Math.random() * 1.5; // 2.0 - 3.5s lifetime

      // 6. Scale
      this.scales[idx] = (0.5 + Math.random() * 0.8) * scaleMultiplier;
    }

    // Notify attributes of updates
    this.attrOrigin.needsUpdate = true;
    this.attrVelocity.needsUpdate = true;
    this.attrAngularAxis.needsUpdate = true;
    this.attrAngularSpeed.needsUpdate = true;
    this.attrLifeParams.needsUpdate = true;
    this.attrScale.needsUpdate = true;
  }

  update(dt) {
    this.totalTime += dt;
    if (this.material && this.material.uniforms) {
      this.material.uniforms.uTime.value = this.totalTime;
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
