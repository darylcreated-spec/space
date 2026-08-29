import * as THREE from 'three';

/**
 * AAA Procedural PBR Shader Texture Suite
 * Generates 1024x1024 Albedo, Normal/Bump, Roughness, and Emissive maps
 * with aircraft panel lines, flush rivets, carbon nanotube weave, and military stencils.
 */
const textureCache = new Map();

export function getPBRMaterialSet(theme = 'INTERCEPTOR') {
  if (textureCache.has(theme)) {
    return textureCache.get(theme);
  }

  const canvasAlbedo = document.createElement('canvas');
  canvasAlbedo.width = 1024;
  canvasAlbedo.height = 1024;
  const ctxA = canvasAlbedo.getContext('2d');

  const canvasBump = document.createElement('canvas');
  canvasBump.width = 1024;
  canvasBump.height = 1024;
  const ctxB = canvasBump.getContext('2d');

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

  // Bump Base
  ctxB.fillStyle = '#808080';
  ctxB.fillRect(0, 0, 1024, 1024);

  // Roughness Base
  ctxR.fillStyle = '#404040';
  ctxR.fillRect(0, 0, 1024, 1024);

  // Emissive Base
  ctxE.fillStyle = '#000000';
  ctxE.fillRect(0, 0, 1024, 1024);

  // 2. Micro Carbon-Nanotube Hexagonal Weave
  ctxA.fillStyle = 'rgba(255, 255, 255, 0.035)';
  ctxR.fillStyle = 'rgba(255, 255, 255, 0.06)';
  for (let x = 0; x < 1024; x += 12) {
    for (let y = 0; y < 1024; y += 12) {
      if ((x + y) % 24 === 0) {
        ctxA.fillRect(x, y, 6, 6);
        ctxR.fillRect(x, y, 6, 6);
      }
    }
  }

  // 3. Multi-Tiered Armor Plates
  const drawArmorPlate = (px, py, pw, ph, color, rough) => {
    // Albedo Plate
    ctxA.fillStyle = color;
    ctxA.fillRect(px, py, pw, ph);

    // Bump Beveled Edge
    ctxB.fillStyle = '#b0b0b0';
    ctxB.fillRect(px, py, pw, ph);
    ctxB.fillStyle = '#404040';
    ctxB.strokeRect(px, py, pw, ph);

    // Roughness
    ctxR.fillStyle = rough;
    ctxR.fillRect(px, py, pw, ph);

    // Plate Seams (Shadow Groove)
    ctxA.strokeStyle = 'rgba(0, 0, 0, 0.75)';
    ctxA.lineWidth = 4;
    ctxA.strokeRect(px, py, pw, ph);

    // Specular Highlight Ridge
    ctxA.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctxA.lineWidth = 1.5;
    ctxA.strokeRect(px + 2, py + 2, pw - 4, ph - 4);

    // Aircraft Flush Rivets
    ctxA.fillStyle = 'rgba(220, 240, 255, 0.6)';
    ctxB.fillStyle = '#ffffff';
    for (let rx = px + 16; rx < px + pw; rx += 36) {
      ctxA.beginPath(); ctxA.arc(rx, py + 8, 2, 0, Math.PI * 2); ctxA.fill();
      ctxA.beginPath(); ctxA.arc(rx, py + ph - 8, 2, 0, Math.PI * 2); ctxA.fill();

      ctxB.beginPath(); ctxB.arc(rx, py + 8, 2, 0, Math.PI * 2); ctxB.fill();
      ctxB.beginPath(); ctxB.arc(rx, py + ph - 8, 2, 0, Math.PI * 2); ctxB.fill();
    }
    for (let ry = py + 16; ry < py + ph; ry += 36) {
      ctxA.beginPath(); ctxA.arc(px + 8, ry, 2, 0, Math.PI * 2); ctxA.fill();
      ctxA.beginPath(); ctxA.arc(px + pw - 8, ry, 2, 0, Math.PI * 2); ctxA.fill();

      ctxB.beginPath(); ctxB.arc(px + 8, ry, 2, 0, Math.PI * 2); ctxB.fill();
      ctxB.beginPath(); ctxB.arc(px + pw - 8, ry, 2, 0, Math.PI * 2); ctxB.fill();
    }
  };

  // Draw 8 Interlocking Armor Plates
  drawArmorPlate(40, 40, 440, 440, panelColor1, '#303030');
  drawArmorPlate(540, 40, 440, 440, panelColor2, '#484848');
  drawArmorPlate(40, 540, 440, 440, panelColor2, '#484848');
  drawArmorPlate(540, 540, 440, 440, panelColor1, '#303030');

  // 4. Stenciled Tactical Markings & Hazard Chevrons
  ctxA.font = 'bold 20px "Courier New", monospace';
  ctxA.fillStyle = accentGlow;
  ctxA.fillText(stencilText, 70, 90);
  ctxA.fillText('PRESSURE SEAL // CLASS-IV', 570, 90);
  ctxA.fillText('CAUTION: ION THRUSTER HAZARD', 70, 590);
  ctxA.fillText('REINFORCED TITANIUM-CARBIDE', 570, 590);

  // Hazard Chevrons (Yellow / Black or Cyan / Black)
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
  ctxE.shadowBlur = 12;

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

  const texBump = new THREE.CanvasTexture(canvasBump);
  texBump.wrapS = THREE.RepeatWrapping;
  texBump.wrapT = THREE.RepeatWrapping;
  texBump.repeat.set(2, 2);

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
    bumpMap: texBump,
    bumpScale: 0.04,
    roughnessMap: texRough,
    emissiveMap: texEmissive,
    emissive: new THREE.Color(accentGlow),
    emissiveIntensity: 0.4,
    metalness: 0.94,
    roughness: 0.22
  };

  textureCache.set(theme, matSet);
  return matSet;
}
