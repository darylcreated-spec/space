import * as THREE from 'three';
import { getPBRMaterialSet } from './PBRTextureGenerator.js';

export class SpaceFleetDamageSystem {
  constructor(scene, count = 80) {
    this.scene = scene;
    this.instanceCount = count;
    this.damageData = new Float32Array(count); // Tracks HP/damage per instance (0.0 = pristine, 1.0 = destroyed)

    this.initSystem();
  }

  initSystem() {
    // 1. Prepare Base Geometry with Vertex Color Paint
    const baseGeometry = new THREE.ConeGeometry(1.5, 4, 8); // Proxy for low-poly fighter hull
    baseGeometry.rotateX(Math.PI / 2);

    const vertexCount = baseGeometry.attributes.position.count;
    const vertexColors = new Float32Array(vertexCount * 4);

    // Pre-bake localized vulnerability zones into vertex color R channel
    for (let i = 0; i < vertexCount; i++) {
      const zPos = baseGeometry.attributes.position.getZ(i);
      const isWingOrNose = Math.abs(zPos) > 1.0 ? 1.0 : 0.2;
      vertexColors[i * 4 + 0] = isWingOrNose; // R: Structural weak point mask
      vertexColors[i * 4 + 1] = 0.0;
      vertexColors[i * 4 + 2] = 0.0;
      vertexColors[i * 4 + 3] = 1.0;
    }
    baseGeometry.setAttribute('color', new THREE.BufferAttribute(vertexColors, 4));

    // 2. Add Instanced Attribute for Dynamic Damage
    this.damageAttribute = new THREE.InstancedBufferAttribute(this.damageData, 1);
    this.damageAttribute.setUsage(THREE.DynamicDrawUsage);
    baseGeometry.setAttribute('aInstanceDamage', this.damageAttribute);

    // 3. Load Packed PBR Textures
    const pbrSet = getPBRMaterialSet('ENEMY_ALIEN');
    const tAlbedo = pbrSet.map;
    const tORM = pbrSet.roughnessMap;
    const tDamageMask = pbrSet.normalMap;

    // 4. Embedded Mobile GLSL Shaders with Instancing Support
    const vertexShader = `
      precision mediump float;

      attribute vec3 position;
      attribute vec3 normal;
      attribute vec2 uv;
      attribute vec4 color;              // Vertex-painted damage pre-mask (R channel)
      attribute float aInstanceDamage;   // Per-instance health/damage scalar (0.0 to 1.0)

      #ifdef USE_INSTANCING
      attribute mat4 instanceMatrix;
      #endif

      uniform mat4 modelViewMatrix;
      uniform mat4 projectionMatrix;
      uniform mat3 normalMatrix;

      varying vec2 vUv;
      varying vec3 vWorldNormal;
      varying vec3 vViewPosition;
      varying float vDamageFactor;

      void main() {
          vUv = uv;

          // Combine local vertex-painted fracture zones with overall instance damage
          vDamageFactor = clamp(color.r * 0.4 + aInstanceDamage * 0.8, 0.0, 1.0);

          #ifdef USE_INSTANCING
          vec4 worldPos = instanceMatrix * vec4(position, 1.0);
          vWorldNormal = normalize(mat3(instanceMatrix) * normal);
          #else
          vec4 worldPos = vec4(position, 1.0);
          vWorldNormal = normalize(normalMatrix * normal);
          #endif

          vec4 mvPosition = modelViewMatrix * worldPos;
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const fragmentShader = `
      precision mediump float;

      uniform sampler2D tAlbedo;
      uniform sampler2D tORM;
      uniform sampler2D tDamageMask;
      uniform vec3 uSunDirection;
      uniform vec3 uSunColor;
      uniform vec3 uAmbientColor;
      uniform vec3 uMoltenColor;
      uniform float uMoltenIntensity;

      varying vec2 vUv;
      varying vec3 vWorldNormal;
      varying vec3 vViewPosition;
      varying float vDamageFactor;

      void main() {
          vec4 albedo = texture2D(tAlbedo, vUv);
          vec4 orm = texture2D(tORM, vUv);
          vec4 damageTex = texture2D(tDamageMask, vUv);

          float roughness = orm.g * 0.8 + 0.1;
          float metallic = orm.r * 0.9;
          float ao = orm.b;

          vec3 N = normalize(vWorldNormal);
          vec3 V = normalize(vViewPosition);
          vec3 L = normalize(uSunDirection);

          float NdotL = max(dot(N, L), 0.0);
          vec3 diffuse = albedo.rgb * (uSunColor * NdotL + uAmbientColor) * ao;

          vec3 H = normalize(L + V);
          float NdotH = max(dot(N, H), 0.0);
          float spec = pow(NdotH, 16.0 / max(0.01, roughness)) * metallic;

          vec3 finalColor = diffuse + vec3(spec);

          if (vDamageFactor > 0.01) {
              float burnNoise = damageTex.r * 0.5 + sin(vUv.x * 32.0) * cos(vUv.y * 32.0) * 0.25 + 0.25;
              float burnMask = smoothstep(1.0 - vDamageFactor, 1.0, burnNoise + vDamageFactor * 0.5);

              vec3 scorchCharcoal = vec3(0.04, 0.03, 0.03);
              vec3 moltenBreach = uMoltenColor * uMoltenIntensity * smoothstep(0.35, 0.95, vDamageFactor);

              finalColor = mix(finalColor, scorchCharcoal, burnMask * 0.88);
              finalColor += moltenBreach * burnMask;
          }

          gl_FragColor = vec4(finalColor, albedo.a);
      }
    `;

    // 5. Construct ShaderMaterial with Instancing Support
    this.material = new THREE.RawShaderMaterial({
      vertexShader,
      fragmentShader,
      defines: {
        USE_INSTANCING: ''
      },
      uniforms: {
        tAlbedo: { value: tAlbedo },
        tORM: { value: tORM },
        tDamageMask: { value: tDamageMask },
        uSunDirection: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
        uSunColor: { value: new THREE.Vector3(1.2, 1.15, 1.1) },
        uAmbientColor: { value: new THREE.Vector3(0.05, 0.06, 0.08) },
        uMoltenColor: { value: new THREE.Vector3(1.0, 0.32, 0.04) },
        uMoltenIntensity: { value: 3.5 }
      },
      transparent: false,
      depthWrite: true,
      depthTest: true
    });

    // 6. Create InstancedMesh
    this.instancedMesh = new THREE.InstancedMesh(baseGeometry, this.material, this.instanceCount);
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    // Scatter instances across space
    const dummy = new THREE.Object3D();
    for (let i = 0; i < this.instanceCount; i++) {
      dummy.position.set(
        (Math.random() - 0.5) * 260,
        (Math.random() - 0.5) * 120,
        -90 - Math.random() * 180
      );
      dummy.rotation.set(0, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.4);
      dummy.updateMatrix();
      this.instancedMesh.setMatrixAt(i, dummy.matrix);
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.instancedMesh);
  }

  // Apply hit damage to a specific fighter in the fleet
  applyDamage(instanceIndex, damageAmount, debrisSystem = null) {
    if (instanceIndex >= this.instanceCount) return;

    this.damageData[instanceIndex] = Math.min(1.0, this.damageData[instanceIndex] + damageAmount);
    this.damageAttribute.setX(instanceIndex, this.damageData[instanceIndex]);
    this.damageAttribute.needsUpdate = true;

    if (debrisSystem && this.damageData[instanceIndex] >= 1.0) {
      this.checkShipDestruction(instanceIndex, debrisSystem);
    }
  }

  // Check and process ship destruction with shrapnel ejection
  checkShipDestruction(shipIndex, debrisSystem) {
    if (shipIndex >= this.instanceCount) return false;
    const currentDamage = this.damageData[shipIndex];

    if (currentDamage >= 1.0) {
      // 1. Get world transform of the destroyed ship
      const matrix = new THREE.Matrix4();
      this.instancedMesh.getMatrixAt(shipIndex, matrix);

      const position = new THREE.Vector3();
      const quaternion = new THREE.Quaternion();
      const scale = new THREE.Vector3();
      matrix.decompose(position, quaternion, scale);

      // 2. Hide destroyed ship (scale to zero)
      matrix.makeScale(0, 0, 0);
      this.instancedMesh.setMatrixAt(shipIndex, matrix);
      this.instancedMesh.instanceMatrix.needsUpdate = true;

      // 3. Eject 8-10 dynamic debris pieces
      if (debrisSystem && debrisSystem.explodeShip) {
        debrisSystem.explodeShip(position, new THREE.Vector3(0, 0, -5), 10);
      }
      return true;
    }
    return false;
  }

  // Pulse molten slag heat or update lighting uniforms
  update(delta) {
    if (!this.material || !this.material.uniforms) return;
    const pulse = 3.0 + Math.sin(performance.now() * 0.005) * 0.8;
    this.material.uniforms.uMoltenIntensity.value = pulse;
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

/**
 * Standalone Combat Manager Destruction Hook
 */
export function checkShipDestruction(shipIndex, damageSystem, debrisSystem, fleetMesh) {
  const currentDamage = damageSystem.damageData[shipIndex];

  if (currentDamage >= 1.0) {
    // 1. Get world transform of the destroyed ship
    const matrix = new THREE.Matrix4();
    fleetMesh.getMatrixAt(shipIndex, matrix);

    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    matrix.decompose(position, quaternion, scale);

    // 2. Hide destroyed ship (scale to zero)
    matrix.makeScale(0, 0, 0);
    fleetMesh.setMatrixAt(shipIndex, matrix);
    fleetMesh.instanceMatrix.needsUpdate = true;

    // 3. Eject 8-10 dynamic debris pieces
    if (debrisSystem && debrisSystem.explodeShip) {
      debrisSystem.explodeShip(position, new THREE.Vector3(0, 0, -5), 10);
    }
  }
}
