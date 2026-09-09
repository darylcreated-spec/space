import * as THREE from 'three';

/**
 * AAA Procedural Hexagonal Energy Shield Shader
 * Inspired by cortiz2894/flow-shield-effect.
 * Features:
 * - Analytical UV-independent hexagonal grid tiling
 * - Fresnel rim glow
 * - Dynamic 4-point impact ring buffer with expanding geodesic shockwave ripples
 * - Animated plasma flow noise
 */
export function createHexShieldMaterial(shieldColorHex = 0x00f3ff) {
  const color = new THREE.Color(shieldColorHex);

  const uniforms = {
    uTime: { value: 0.0 },
    uColor: { value: color },
    uImpactColor: { value: new THREE.Color(0xffffff) },
    uFresnelPower: { value: 2.6 },
    uHexScale: { value: 16.0 },
    uHexLineWidth: { value: 0.08 },
    uOverallOpacity: { value: 0.0 },
    uHitPoints: {
      value: [
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(0, 0, 1)
      ]
    },
    uHitTimes: { value: [99.0, 99.0, 99.0, 99.0] },
    uHitIntensities: { value: [0.0, 0.0, 0.0, 0.0] }
  };

  const vertexShader = `
    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying vec3 vLocalPos;
    varying vec3 vWorldPos;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPos = worldPos.xyz;
      vLocalPos = position;
      vViewDir = normalize(- (modelViewMatrix * vec4(position, 1.0)).xyz);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    uniform float uTime;
    uniform vec3 uColor;
    uniform vec3 uImpactColor;
    uniform float uFresnelPower;
    uniform float uHexScale;
    uniform float uHexLineWidth;
    uniform float uOverallOpacity;

    uniform vec3 uHitPoints[4];
    uniform float uHitTimes[4];
    uniform float uHitIntensities[4];

    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying vec3 vLocalPos;
    varying vec3 vWorldPos;

    // Analytical Hexagonal Grid Calculation (2D Axial Coordinates)
    float hexDistance(vec2 p) {
      p = abs(p);
      return max(dot(p, vec2(1.7320508, 1.0) * 0.5), p.y);
    }

    vec4 hexCoords(vec2 uv) {
      vec2 r = vec2(1.0, 1.7320508);
      vec2 h = r * 0.5;
      vec2 a = mod(uv, r) - h;
      vec2 b = mod(uv - h, r) - h;
      vec2 gv = dot(a, a) < dot(b, b) ? a : b;
      float d = hexDistance(gv);
      return vec4(gv.x, gv.y, d, 0.0);
    }

    void main() {
      if (uOverallOpacity <= 0.005) {
        discard;
      }

      // 1. Spherical / Cylindrical Project Coordinates for Hex Grid
      vec3 normPos = normalize(vLocalPos);
      vec2 hexUv = vec2(
        atan(normPos.z, normPos.x) / 3.14159265,
        normPos.y
      ) * uHexScale;

      // Hexagonal Lattice lines
      vec4 hex = hexCoords(hexUv);
      float hexEdge = 0.5 - hex.z;
      float hexLine = 1.0 - smoothstep(0.0, uHexLineWidth, hexEdge);

      // 2. Fresnel Rim Glow
      float NdotV = max(0.0, dot(vNormal, vViewDir));
      float fresnel = pow(1.0 - NdotV, uFresnelPower);

      // 3. Multi-Point Impact Shockwave Ripples
      float totalHitEnergy = 0.0;
      float waveSpeed = 9.0;
      float waveFrequency = 5.0;

      for (int i = 0; i < 4; i++) {
        float hitTime = uHitTimes[i];
        if (hitTime < 1.2 && uHitIntensities[i] > 0.01) {
          float dist = distance(vLocalPos, uHitPoints[i]);
          float wavePos = hitTime * waveSpeed;
          float ringDist = abs(dist - wavePos);

          // Shockwave ripple wave profile
          float ringWave = exp(-ringDist * 2.2) * sin(ringDist * waveFrequency - uTime * 6.0);
          ringWave = max(0.0, ringWave) * exp(-hitTime * 2.8) * uHitIntensities[i];

          // Flash center point
          float flashCenter = exp(-dist * 2.2) * exp(-hitTime * 5.0) * uHitIntensities[i] * 0.7;

          totalHitEnergy += ringWave * 0.8 + flashCenter;
        }
      }

      // 4. Subtle plasma energy flow noise
      float plasmaPulse = sin(uTime * 3.5 + vLocalPos.y * 3.0) * 0.08;

      // 5. Combine Surface Emission & Impact Glow
      vec3 baseShieldColor = uColor * (hexLine * 0.95 + fresnel * 0.7 + plasmaPulse);
      vec3 impactGlow = mix(uColor, uImpactColor, 0.45) * (totalHitEnergy * 0.9);
      vec3 finalColor = baseShieldColor + impactGlow;

      float alpha = (fresnel * 0.35 + hexLine * 0.55 + totalHitEnergy * 0.6) * uOverallOpacity;
      alpha = clamp(alpha, 0.0, 0.8);

      gl_FragColor = vec4(finalColor, alpha);
    }
  `;

  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  return mat;
}
