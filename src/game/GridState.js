import * as THREE from 'three';
import { Piece3D, COLOR_HEX_MAP } from '../engine/Piece3D.js';
import { RaycasterEngine, combineColors } from './RaycasterEngine.js';

export class GridState {
  constructor(sceneManager, particleSystem, soundSynth) {
    this.sceneManager = sceneManager;
    this.particleSystem = particleSystem;
    this.soundSynth = soundSynth;

    this.width = 6;
    this.height = 6;
    this.pieces = [];
    this.moveCount = 0;
    this.parMoves = 5;
    this.isSolved = false;

    this.raycasterEngine = new RaycasterEngine(this.width, this.height);

    // Mesh cache for active laser beams
    this.beamMeshes = [];
  }

  loadLevel(levelData) {
    this.width = levelData.width || 6;
    this.height = levelData.height || 6;
    this.parMoves = levelData.par || 5;
    this.moveCount = 0;
    this.isSolved = false;

    this.raycasterEngine = new RaycasterEngine(this.width, this.height);

    // Clear old pieces from scene
    this.pieces.forEach(p => {
      this.sceneManager.piecesGroup.remove(p.meshGroup);
    });
    this.pieces = [];

    // Clear old beams
    this.clearBeamMeshes();

    // Rebuild floor grid
    this.sceneManager.buildGrid(this.width, this.height);

    // Instantiate 3D pieces
    levelData.pieces.forEach(pData => {
      const piece = new Piece3D(pData, this.width, this.height);
      this.pieces.push(piece);
      this.sceneManager.piecesGroup.add(piece.meshGroup);
    });

    // Initial laser recalculation
    this.updateLasers();
  }

  rotatePiece(piece) {
    if (!piece || !piece.rotatable || this.isSolved) return false;

    const rotated = piece.rotate90();
    if (rotated) {
      this.moveCount++;
      this.soundSynth.playRotateChime();
      this.soundSynth.vibrate(15);
      this.updateLasers();
      this.checkWinCondition();
      return true;
    }
    return false;
  }

  movePiece(piece, targetGx, targetGz) {
    if (!piece || !piece.movable || this.isSolved) return false;
    if (targetGx < 0 || targetGx >= this.width || targetGz < 0 || targetGz >= this.height) return false;

    // Check if target tile is occupied
    const occupied = this.pieces.find(p => p !== piece && p.gridX === targetGx && p.gridZ === targetGz);
    if (occupied) return false;

    if (piece.gridX === targetGx && piece.gridZ === targetGz) return false;

    piece.moveTo(targetGx, targetGz);
    this.moveCount++;
    this.soundSynth.playSnapChime();
    this.soundSynth.vibrate(20);
    this.updateLasers();
    this.checkWinCondition();
    return true;
  }

  updateLasers() {
    const { beamSegments, targetEnergyMap } = this.raycasterEngine.calculateBeams(this.pieces);

    // Render 3D Laser Beam Meshes
    this.renderBeamMeshes(beamSegments);

    // Update Target Energy Cores charge state
    this.pieces.forEach(p => {
      if (p.type === 'target') {
        const key = `${p.gridX},${p.gridZ}`;
        const receivedColors = targetEnergyMap.get(key) || [];
        
        let finalColor = null;
        receivedColors.forEach(c => {
          finalColor = combineColors(finalColor, c);
        });

        const isCharged = (finalColor === p.color || (p.color === 'any' && finalColor !== null));
        
        if (isCharged && !p.isCharged) {
          // Newly charged! Spawn particle explosion
          const wPos = p.gridToWorld(p.gridX, p.gridZ);
          this.particleSystem.createCoreExplosion(wPos, COLOR_HEX_MAP[finalColor] || 0x00f3ff);
          this.soundSynth.playCoreEnergizedChime();
        }

        p.setCharged(isCharged, finalColor);
      }
    });

    // Update active laser drone volume/pitch based on active beams count
    this.soundSynth.setLaserActive(beamSegments.length > 0, beamSegments.length);
  }

  renderBeamMeshes(segments) {
    this.clearBeamMeshes();

    const offsetX = (this.width - 1) / 2;
    const offsetZ = (this.height - 1) / 2;

    segments.forEach(seg => {
      const p1 = new THREE.Vector3(seg.startX - offsetX, 0.3, seg.startZ - offsetZ);
      const p2 = new THREE.Vector3(seg.endX - offsetX, 0.3, seg.endZ - offsetZ);

      const distance = p1.distanceTo(p2);
      if (distance < 0.05) return;

      const beamGeo = new THREE.CylinderGeometry(0.04, 0.04, distance, 8);
      beamGeo.rotateX(Math.PI / 2); // Orient along Z axis

      const hexColor = COLOR_HEX_MAP[seg.color] || 0x00f3ff;
      const beamMat = new THREE.MeshBasicMaterial({
        color: hexColor,
        transparent: true,
        opacity: 0.95
      });

      const beamMesh = new THREE.Mesh(beamGeo, beamMat);
      
      // Position at midpoint between p1 and p2
      const midPoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
      beamMesh.position.copy(midPoint);
      beamMesh.lookAt(p2);

      // Core inner bright white beam cylinder
      const coreGeo = new THREE.CylinderGeometry(0.015, 0.015, distance, 8);
      coreGeo.rotateX(Math.PI / 2);
      const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      beamMesh.add(coreMesh);

      this.sceneManager.beamsGroup.add(beamMesh);
      this.beamMeshes.push(beamMesh);
    });
  }

  clearBeamMeshes() {
    while (this.sceneManager.beamsGroup.children.length > 0) {
      const child = this.sceneManager.beamsGroup.children[0];
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
      this.sceneManager.beamsGroup.remove(child);
    }
    this.beamMeshes = [];
  }

  checkWinCondition() {
    const targets = this.pieces.filter(p => p.type === 'target');
    if (targets.length === 0) return false;

    const allEnergized = targets.every(t => t.isCharged);
    if (allEnergized && !this.isSolved) {
      this.isSolved = true;
      this.soundSynth.playVictoryArpeggio();
      this.soundSynth.vibrate([100, 50, 100, 50, 200]);
      return true;
    }
    return false;
  }

  calculateStars() {
    if (this.moveCount <= this.parMoves) return 3;
    if (this.moveCount <= this.parMoves + 2) return 2;
    return 1;
  }

  update(dt) {
    this.pieces.forEach(p => p.update(dt));
  }
}
