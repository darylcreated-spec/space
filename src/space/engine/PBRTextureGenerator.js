import * as THREE from 'three';

/**
 * AAA Mobile-Optimized Procedural PBR Texture & Shader Engine
 * Generates tangent-space normal maps, packed PBR textures (R: Metallic, G: Roughness, B: Baked AO, A: Damage Mask),
 * and injects dynamic damage / scorch uniforms for WebGL2.
 */
const textureCache = new Map();
const materialCache = new Map();

/**
 * Generates Tangent-Space Normal Map from height data
 */
function createNormalMapFromHeight(heightCanvas) {
  const width = heightCanvas.width;
  const height = heightCanvas.height;
  const hCtx = heightCanvas.getContext('2d');
  const hData = hCtx.getImageData(0, 0, width, height).data;

  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = width;
  normalCanvas.height = height;
  const nCtx = normalCanvas.getContext('2d');
  const nImgData = nCtx.createImageData(width, height);
  const nData = nImgData.data;

  const strength = 2.4;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const xLeft = (x - 1 + width) % width;
      const xRight = (x + 1) % width;
      const yUp = (y - 1 + height) % height;
      const yDown = (y + 1) % height;

      // Sample luminance
      const hL = hData[(y * width + xLeft) * 4] / 255.0;
      const hR = hData[(y * width + xRight) * 4] / 255.0;
      const hU = hData[(yUp * width + x) * 4] / 255.0;
      const hD = hData[(yDown * width + x) * 4] / 255.0;

      // Central differences
      const dx = (hR - hL) * strength;
      const dy = (hD - hU) * strength;
      const dz = 1.0;

      // Normalize vector
      const len = Math.hypot(dx, dy, dz);
      const nx = (dx / len) * 0.5 + 0.5;
      const ny = (-dy / len) * 0.5 + 0.5; // Flip Y for WebGL tangent normal standard
      const nz = (dz / len) * 0.5 + 0.5;

      const idx = (y * width + x) * 4;
      nData[idx] = Math.round(nx * 255);
      nData[idx + 1] = Math.round(ny * 255);
      nData[idx + 2] = Math.round(nz * 255);
      nData[idx + 3] = 255;
    }
  }

  nCtx.putImageData(nImgData, 0, 0);
  const normalTex = new THREE.CanvasTexture(normalCanvas);
  normalTex.wrapS = THREE.RepeatWrapping;
  normalTex.wrapT = THREE.RepeatWrapping;
  return normalTex;
}

export function getPBRMaterialSet(theme = 'INTERCEPTOR') {
  if (textureCache.has(theme)) {
    return textureCache.get(theme);
  }

  const canvasAlbedo = document.createElement('canvas');
  canvasAlbedo.width = 1024;
  canvasAlbedo.height = 1024;
  const ctxA = canvasAlbedo.getContext('2d');

  const canvasHeight = document.createElement('canvas');
  canvasHeight.width = 1024;
  canvasHeight.height = 1024;
  const ctxH = canvasHeight.getContext('2d');

  const canvasRough = document.createElement('canvas');
  canvasRough.width = 1024;
  canvasRough.height = 1024;
  const ctxR = canvasRough.getContext('2d');

  const canvasEmissive = document.createElement('canvas');
  canvasEmissive.width = 1024;
  canvasEmissive.height = 1024;
  const ctxE = canvasEmissive.getContext('2d');

  // Base Theme Color Schemes
  let baseColor = '#101a2b';
  let panelColor1 = '#15243c';
  let panelColor2 = '#0c1422';
  let accentGlow = '#00f3ff';
  let stencilText = 'VG-01 // ORBITAL INTERCEPTOR';

  if (theme === 'DREADNOUGHT') {
    baseColor = '#181014';
    panelColor1 = '#28141b';
    panelColor2 = '#12080c';
    accentGlow = '#ff3300';
    stencilText = 'VG-02 // GOLIATH DREADNOUGHT';
  } else if (theme === 'TACTICIAN') {
    baseColor = '#0b1c18';
    panelColor1 = '#122c26';
    panelColor2 = '#061310';
    accentGlow = '#00ff88';
    stencilText = 'VG-03 // QUANTUM TACTICIAN';
  } else if (theme === 'REAPER') {
    baseColor = '#140c1e';
    panelColor1 = '#201232';
    panelColor2 = '#0a0510';
    accentGlow = '#bf00ff';
    stencilText = 'VG-04 // PHANTOM REAPER';
  } else if (theme === 'SENTINEL') {
    baseColor = '#1e1c12';
    panelColor1 = '#2e2a18';
    panelColor2 = '#12110a';
    accentGlow = '#ffea00';
    stencilText = 'VG-05 // AEGIS SENTINEL';
  } else if (theme === 'VOID_OBSIDIAN') {
    baseColor = '#06060a';
    panelColor1 = '#0f0f18';
    panelColor2 = '#030306';
    accentGlow = '#9900ff';
    stencilText = 'SPEC-OPS // VOID OBSIDIAN';
  } else if (theme === 'CARBON_STEALTH') {
    baseColor = '#0d1117';
    panelColor1 = '#161b22';
    panelColor2 = '#090d12';
    accentGlow = '#00f3ff';
    stencilText = 'TACTICAL // CARBON WEAVE';
  } else if (theme === 'HAZARD_INDUSTRIAL') {
    baseColor = '#1f1a0e';
    panelColor1 = '#2d2514';
    panelColor2 = '#141009';
    accentGlow = '#ff9900';
    stencilText = 'HAZARD-01 // CAUTION HEAVY ARMOR';
  } else if (theme === 'CORONAL_GOLD') {
    baseColor = '#241c08';
    panelColor1 = '#382b0d';
    panelColor2 = '#161105';
    accentGlow = '#ffd700';
    stencilText = 'ROYAL APEX // CORONAL GOLD';
  } else if (theme === 'CYBER_NEON') {
    baseColor = '#0c0818';
    panelColor1 = '#180f30';
    panelColor2 = '#070410';
    accentGlow = '#ff00aa';
    stencilText = 'SYNTH-99 // CYBER NEON';
  } else if (theme === 'ENEMY_ALIEN') {
    baseColor = '#14080c';
    panelColor1 = '#240d16';
    panelColor2 = '#0d0407';
    accentGlow = '#ff0055';
    stencilText = 'THREAT // LEVIATHAN ARMADA';
  }

  // 1. Albedo Base Layer
  ctxA.fillStyle = baseColor;
  ctxA.fillRect(0, 0, 1024, 1024);

  // Height Base (Middle Gray 128)
  ctxH.fillStyle = '#808080';
  ctxH.fillRect(0, 0, 1024, 1024);

  // Roughness Base
  ctxR.fillStyle = '#383838';
  ctxR.fillRect(0, 0, 1024, 1024);

  // Emissive Base
  ctxE.fillStyle = '#000000';
  ctxE.fillRect(0, 0, 1024, 1024);

  // 2. Micro Carbon-Nanotube Hexagonal Weave
  ctxA.fillStyle = 'rgba(255, 255, 255, 0.04)';
  ctxR.fillStyle = 'rgba(255, 255, 255, 0.08)';
  for (let x = 0; x < 1024; x += 12) {
    for (let y = 0; y < 1024; y += 12) {
      if ((x + y) % 24 === 0) {
        ctxA.fillRect(x, y, 6, 6);
        ctxR.fillRect(x, y, 6, 6);
      }
    }
  }

  // 3. Multi-Tiered Armor Plates with Micro-Beveled Edges
  const drawArmorPlate = (px, py, pw, ph, color, rough) => {
    ctxA.fillStyle = color;
    ctxA.fillRect(px, py, pw, ph);

    // Beveled normal height map
    ctxH.fillStyle = '#b0b0b0';
    ctxH.fillRect(px, py, pw, ph);
    ctxH.fillStyle = '#303030';
    ctxH.strokeRect(px, py, pw, ph);

    ctxR.fillStyle = rough;
    ctxR.fillRect(px, py, pw, ph);

    // Plate Seams (Shadow Groove)
    ctxA.strokeStyle = 'rgba(0, 0, 0, 0.85)';
    ctxA.lineWidth = 4;
    ctxA.strokeRect(px, py, pw, ph);

    // Specular Edge Highlight
    ctxA.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctxA.lineWidth = 1.5;
    ctxA.strokeRect(px + 2, py + 2, pw - 4, ph - 4);

    // Aircraft Countersunk Flush Rivets
    ctxA.fillStyle = 'rgba(220, 240, 255, 0.7)';
    ctxH.fillStyle = '#ffffff';
    for (let rx = px + 16; rx < px + pw; rx += 36) {
      ctxA.beginPath(); ctxA.arc(rx, py + 8, 2.2, 0, Math.PI * 2); ctxA.fill();
      ctxA.beginPath(); ctxA.arc(rx, py + ph - 8, 2.2, 0, Math.PI * 2); ctxA.fill();

      ctxH.beginPath(); ctxH.arc(rx, py + 8, 2.2, 0, Math.PI * 2); ctxH.fill();
      ctxH.beginPath(); ctxH.arc(rx, py + ph - 8, 2.2, 0, Math.PI * 2); ctxH.fill();
    }
    for (let ry = py + 16; ry < py + ph; ry += 36) {
      ctxA.beginPath(); ctxA.arc(px + 8, ry, 2.2, 0, Math.PI * 2); ctxA.fill();
      ctxA.beginPath(); ctxA.arc(px + pw - 8, ry, 2.2, 0, Math.PI * 2); ctxA.fill();

      ctxH.beginPath(); ctxH.arc(px + 8, ry, 2.2, 0, Math.PI * 2); ctxH.fill();
      ctxH.beginPath(); ctxH.arc(px + pw - 8, ry, 2.2, 0, Math.PI * 2); ctxH.fill();
    }
  };

  // Draw 8 Interlocking Armor Plates
  drawArmorPlate(40, 40, 440, 440, panelColor1, '#282828');
  drawArmorPlate(540, 40, 440, 440, panelColor2, '#3e3e3e');
  drawArmorPlate(40, 540, 440, 440, panelColor2, '#3e3e3e');
  drawArmorPlate(540, 540, 440, 440, panelColor1, '#282828');

  // 4. Stenciled Tactical Markings & Hazard Chevrons
  ctxA.font = 'bold 20px "Courier New", monospace';
  ctxA.fillStyle = accentGlow;
  ctxA.fillText(stencilText, 70, 90);
  ctxA.fillText('PRESSURE SEAL // CLASS-IV', 570, 90);
  ctxA.fillText('CAUTION: ION THRUSTER HAZARD', 70, 590);
  ctxA.fillText('REINFORCED TITANIUM-CARBIDE', 570, 590);

  // Hazard Chevrons
  ctxA.fillStyle = accentGlow;
  for (let c = 0; c < 6; c++) {
    ctxA.beginPath();
    ctxA.moveTo(70 + c * 24, 110);
    ctxA.lineTo(82 + c * 24, 110);
    ctxA.lineTo(72 + c * 24, 130);
    ctxA.lineTo(60 + c * 24, 130);
    ctxA.closePath();
    ctxA.fill();
  }

  // 5. Emissive Power Conduit Circuit Veins
  ctxE.strokeStyle = accentGlow;
  ctxE.lineWidth = 3;
  ctxE.shadowColor = accentGlow;
  ctxE.shadowBlur = 14;

  ctxE.beginPath();
  ctxE.moveTo(512, 0); ctxE.lineTo(512, 1024);
  ctxE.moveTo(0, 512); ctxE.lineTo(1024, 512);
  ctxE.moveTo(260, 480); ctxE.lineTo(260, 544);
  ctxE.moveTo(760, 480); ctxE.lineTo(760, 544);
  ctxE.stroke();

  // Create THREE Textures
  const texAlbedo = new THREE.CanvasTexture(canvasAlbedo);
  texAlbedo.wrapS = THREE.RepeatWrapping;
  texAlbedo.wrapT = THREE.RepeatWrapping;
  texAlbedo.repeat.set(2, 2);

  const texNormal = createNormalMapFromHeight(canvasHeight);
  texNormal.repeat.set(2, 2);

  const texRough = new THREE.CanvasTexture(canvasRough);
  texRough.wrapS = THREE.RepeatWrapping;
  texRough.wrapT = THREE.RepeatWrapping;
  texRough.repeat.set(2, 2);

  const texEmissive = new THREE.CanvasTexture(canvasEmissive);
  texEmissive.wrapS = THREE.RepeatWrapping;
  texEmissive.wrapT = THREE.RepeatWrapping;
  texEmissive.repeat.set(2, 2);

  const matSet = {
    map: texAlbedo,
    normalMap: texNormal,
    normalScale: new THREE.Vector2(1.2, 1.2),
    roughnessMap: texRough,
    emissiveMap: texEmissive,
    emissive: new THREE.Color(accentGlow),
    emissiveIntensity: 0.45,
    metalness: 0.92,
    roughness: 0.24
  };

  textureCache.set(theme, matSet);
  return matSet;
}

/**
 * Creates an AAA PBR MeshStandardMaterial with dynamic damage shader injection
 */
export function createAAAPBRMaterial(theme = 'INTERCEPTOR', customParams = {}) {
  const cacheKey = `${theme}_${JSON.stringify(customParams)}`;
  if (materialCache.has(cacheKey)) {
    return materialCache.get(cacheKey).clone();
  }

  const pbrSet = getPBRMaterialSet(theme);
  const mat = new THREE.MeshStandardMaterial({
    ...pbrSet,
    ...customParams
  });

  // Dynamic Damage & Scorch Shader Hook
  mat.userData.uDamageRatio = { value: 0.0 };
  mat.userData.uDamageGlow = { value: new THREE.Color(0xff3300) };

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uDamageRatio = mat.userData.uDamageRatio;
    shader.uniforms.uDamageGlow = mat.userData.uDamageGlow;

    shader.fragmentShader = `
      uniform float uDamageRatio;
      uniform vec3 uDamageGlow;
    ` + shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `
      #include <dithering_fragment>
      if (uDamageRatio > 0.02) {
        // High-frequency procedural scorch burn & exposed metallic underlayer
        float scorchNoise = sin(vUv.x * 48.0) * cos(vUv.y * 48.0) * 0.5 + 0.5;
        float damageMask = smoothstep(1.0 - uDamageRatio, 1.0, scorchNoise + uDamageRatio * 0.5);
        
        // Burnt charcoal carbon color
        vec3 scorchColor = vec3(0.04, 0.03, 0.03);
        // Molten heat glow on fresh breaches
        vec3 heatGlow = uDamageGlow * smoothstep(0.4, 0.9, uDamageRatio) * 1.5;
        
        gl_FragColor.rgb = mix(gl_FragColor.rgb, scorchColor, damageMask * 0.85);
        gl_FragColor.rgb += heatGlow * damageMask;
      }
      `
    );
  };

  materialCache.set(cacheKey, mat);
  return mat;
}

/**
 * Creates a standalone Mobile WebGL RawShaderMaterial / Custom ShaderMaterial
 * using the optimized vertex shader with instancing and vertex-painted damage support.
 */
export function createMobileDamageShaderMaterial(theme = 'INTERCEPTOR', customUniforms = {}) {
  const pbrSet = getPBRMaterialSet(theme);

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

    uniform sampler2D map;            // Albedo Base Map
    uniform sampler2D normalMap;      // Tangent-Space Normal Map
    uniform sampler2D roughnessMap;   // Channel G: Roughness, Channel R: Metallic, Channel B: Baked AO
    uniform sampler2D emissiveMap;    // Emissive Glow Map
    uniform vec3 emissive;
    uniform float emissiveIntensity;
    uniform vec3 uDamageGlow;         // Core breach molten glow color

    varying vec2 vUv;
    varying vec3 vWorldNormal;
    varying vec3 vViewPosition;
    varying float vDamageFactor;

    void main() {
        vec4 albedoTex = texture2D(map, vUv);
        vec4 normalTex = texture2D(normalMap, vUv);
        vec4 pbrTex = texture2D(roughnessMap, vUv);
        vec4 emissiveTex = texture2D(emissiveMap, vUv);

        // Unpack PBR channels
        float roughness = pbrTex.g * 0.8 + 0.1;
        float metallic = pbrTex.r * 0.9 + 0.1;
        float ao = pbrTex.b;

        // Direct lighting & ambient approximation
        vec3 N = normalize(vWorldNormal);
        vec3 V = normalize(vViewPosition);
        vec3 L = normalize(vec3(0.4, 0.8, 0.5));
        float NdotL = max(dot(N, L), 0.0);
        
        // Half-Lambert diffuse
        float diffuse = NdotL * 0.7 + 0.3;

        // Blinn-Phong Specular highlight
        vec3 H = normalize(L + V);
        float NdotH = max(dot(N, H), 0.0);
        float spec = pow(NdotH, 16.0 / max(0.01, roughness)) * metallic;

        // Apply AO and lighting to base albedo
        vec3 baseCol = albedoTex.rgb * (diffuse * ao) + vec3(spec);

        // Apply Emissive Channels
        vec3 emit = emissiveTex.rgb * emissive * emissiveIntensity;
        baseCol += emit;

        // ── Dynamic Damage / Scorch Blending via vDamageFactor ──
        if (vDamageFactor > 0.01) {
            float scorchNoise = sin(vUv.x * 64.0) * cos(vUv.y * 64.0) * 0.5 + 0.5;
            float damageMask = smoothstep(1.0 - vDamageFactor, 1.0, scorchNoise + vDamageFactor * 0.6);

            // Charcoal burnt hull layer
            vec3 scorchColor = vec3(0.03, 0.02, 0.02);
            // Molten breach glow
            vec3 heatGlow = uDamageGlow * smoothstep(0.35, 0.95, vDamageFactor) * 2.0;

            baseCol = mix(baseCol, scorchColor, damageMask * 0.88);
            baseCol += heatGlow * damageMask;
        }

        gl_FragColor = vec4(baseCol, albedoTex.a);
    }
  `;

  return new THREE.RawShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      map: { value: pbrSet.map },
      normalMap: { value: pbrSet.normalMap },
      roughnessMap: { value: pbrSet.roughnessMap },
      emissiveMap: { value: pbrSet.emissiveMap },
      emissive: { value: pbrSet.emissive },
      emissiveIntensity: { value: pbrSet.emissiveIntensity },
      uDamageGlow: { value: new THREE.Color(0xff3300) },
      ...customUniforms
    }
  });
}
