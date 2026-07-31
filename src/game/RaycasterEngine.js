import { COLOR_HEX_MAP } from '../engine/Piece3D.js';

export const DIR_VECTORS = [
  { x: 1, z: 0 },  // 0: East (+X)
  { x: 0, z: 1 },  // 1: South (+Z)
  { x: -1, z: 0 }, // 2: West (-X)
  { x: 0, z: -1 }  // 3: North (-Z)
];

// Helper: Color decomposition to RGB boolean components
export function getRGBComponents(color) {
  switch (color) {
    case 'red': return { r: true, g: false, b: false };
    case 'green': return { r: false, g: true, b: false };
    case 'blue': return { r: false, g: false, b: true };
    case 'cyan': return { r: false, g: true, b: true };
    case 'magenta': return { r: true, g: false, b: true };
    case 'yellow': return { r: true, g: true, b: false };
    case 'white': return { r: true, g: true, b: true };
    default: return { r: true, g: true, b: true };
  }
}

// Helper: RGB boolean components back to color string
export function componentsToColor(rgb) {
  const { r, g, b } = rgb;
  if (r && g && b) return 'white';
  if (r && g) return 'yellow';
  if (r && b) return 'magenta';
  if (g && b) return 'cyan';
  if (r) return 'red';
  if (g) return 'green';
  if (b) return 'blue';
  return null;
}

export function combineColors(color1, color2) {
  if (!color1) return color2;
  if (!color2) return color1;
  const rgb1 = getRGBComponents(color1);
  const rgb2 = getRGBComponents(color2);
  return componentsToColor({
    r: rgb1.r || rgb2.r,
    g: rgb1.g || rgb2.g,
    b: rgb1.b || rgb2.b
  });
}

export function filterColor(incomingColor, filterType) {
  const incRgb = getRGBComponents(incomingColor);
  const filterRgb = getRGBComponents(filterType);

  const resRgb = {
    r: incRgb.r && filterRgb.r,
    g: incRgb.g && filterRgb.g,
    b: incRgb.b && filterRgb.b
  };

  return componentsToColor(resRgb);
}

export class RaycasterEngine {
  constructor(gridWidth, gridHeight) {
    this.width = gridWidth;
    this.height = gridHeight;
  }

  calculateBeams(piecesGrid) {
    // Collect all emitters
    const emitters = [];
    const targets = [];
    
    piecesGrid.forEach(p => {
      if (p.type === 'emitter') emitters.push(p);
      if (p.type === 'target') targets.push(p);
    });

    const beamSegments = [];
    const targetEnergyMap = new Map(); // key `${gx},${gz}` -> array of received colors
    const visitedBeams = new Set(); // Prevent infinite reflection loops `${x},${z},${dir},${color}`

    // Queue of ray fronts: { x, z, dir, color }
    const rayQueue = [];

    emitters.forEach(e => {
      rayQueue.push({
        x: e.gridX,
        z: e.gridZ,
        dir: e.orientation,
        color: e.color || 'white'
      });
    });

    const MAX_STEPS = 100;
    let stepCount = 0;

    while (rayQueue.length > 0 && stepCount < MAX_STEPS) {
      stepCount++;
      const ray = rayQueue.shift();
      const stateKey = `${ray.x},${ray.z},${ray.dir},${ray.color}`;
      if (visitedBeams.has(stateKey)) continue;
      visitedBeams.add(stateKey);

      const stepVec = DIR_VECTORS[ray.dir];
      const nextX = ray.x + stepVec.x;
      const nextZ = ray.z + stepVec.z;

      // Check grid boundaries
      if (nextX < 0 || nextX >= this.width || nextZ < 0 || nextZ >= this.height) {
        // Beam shoots out into void space
        beamSegments.push({
          startX: ray.x, startZ: ray.z,
          endX: ray.x + stepVec.x * 0.8, endZ: ray.z + stepVec.z * 0.8,
          color: ray.color
        });
        continue;
      }

      // Record segment from (ray.x, ray.z) to (nextX, nextZ)
      beamSegments.push({
        startX: ray.x, startZ: ray.z,
        endX: nextX, endZ: nextZ,
        color: ray.color
      });

      // Check if piece exists at next tile
      const targetPiece = piecesGrid.find(p => p.gridX === nextX && p.gridZ === nextZ);

      if (!targetPiece) {
        // Empty tile, continue beam in same direction
        rayQueue.push({ x: nextX, z: nextZ, dir: ray.dir, color: ray.color });
        continue;
      }

      // Interact with piece
      switch (targetPiece.type) {
        case 'target': {
          const tKey = `${nextX},${nextZ}`;
          if (!targetEnergyMap.has(tKey)) targetEnergyMap.set(tKey, []);
          targetEnergyMap.get(tKey).push(ray.color);
          // Target absorbs ray (no outgoing ray)
          break;
        }

        case 'mirror': {
          const relDir = (ray.dir - targetPiece.orientation + 4) % 4;
          let newRelDir;
          if (relDir === 0) newRelDir = 1;
          else if (relDir === 1) newRelDir = 0;
          else if (relDir === 2) newRelDir = 3;
          else if (relDir === 3) newRelDir = 2;

          const outDir = (newRelDir + targetPiece.orientation) % 4;
          rayQueue.push({ x: nextX, z: nextZ, dir: outDir, color: ray.color });
          break;
        }

        case 'prism': {
          // Prism passes straight AND refracts 90 degrees
          const outDirStraight = ray.dir;
          const outDirRefract = (ray.dir + 1) % 4;

          // If beam is compound color, disperse into components!
          const rgb = getRGBComponents(ray.color);
          if (ray.color === 'white') {
            rayQueue.push({ x: nextX, z: nextZ, dir: outDirStraight, color: 'cyan' });
            rayQueue.push({ x: nextX, z: nextZ, dir: outDirRefract, color: 'red' });
          } else if (ray.color === 'magenta') {
            rayQueue.push({ x: nextX, z: nextZ, dir: outDirStraight, color: 'blue' });
            rayQueue.push({ x: nextX, z: nextZ, dir: outDirRefract, color: 'red' });
          } else if (ray.color === 'yellow') {
            rayQueue.push({ x: nextX, z: nextZ, dir: outDirStraight, color: 'green' });
            rayQueue.push({ x: nextX, z: nextZ, dir: outDirRefract, color: 'red' });
          } else {
            // Primary color gets cloned along both paths
            rayQueue.push({ x: nextX, z: nextZ, dir: outDirStraight, color: ray.color });
            rayQueue.push({ x: nextX, z: nextZ, dir: outDirRefract, color: ray.color });
          }
          break;
        }

        case 'filter': {
          const filtered = filterColor(ray.color, targetPiece.color);
          if (filtered) {
            rayQueue.push({ x: nextX, z: nextZ, dir: ray.dir, color: filtered });
          }
          break;
        }

        case 'splitter': {
          const out1 = (ray.dir + 1) % 4;
          const out2 = (ray.dir + 3) % 4;
          rayQueue.push({ x: nextX, z: nextZ, dir: out1, color: ray.color });
          rayQueue.push({ x: nextX, z: nextZ, dir: out2, color: ray.color });
          break;
        }

        case 'emitter': {
          // Emitter body blocks incoming light
          break;
        }
      }
    }

    return {
      beamSegments,
      targetEnergyMap
    };
  }
}
