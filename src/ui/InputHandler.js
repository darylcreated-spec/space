import * as THREE from 'three';

export class InputHandler {
  constructor(sceneManager, gridState, soundSynth) {
    this.sceneManager = sceneManager;
    this.gridState = gridState;
    this.soundSynth = soundSynth;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.selectedPiece = null;
    this.isDragging = false;
    this.pointerDownPos = { x: 0, y: 0 };
    this.pointerDownTime = 0;

    this.domElement = this.sceneManager.renderer.domElement;

    // Attach listeners
    this.domElement.addEventListener('pointerdown', this.onPointerDown.bind(this));
    this.domElement.addEventListener('pointermove', this.onPointerMove.bind(this));
    this.domElement.addEventListener('pointerup', this.onPointerUp.bind(this));
  }

  getPointerPos(e) {
    const rect = this.domElement.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
      y: -((e.clientY - rect.top) / rect.height) * 2 + 1
    };
  }

  onPointerDown(e) {
    this.soundSynth.ensureContext();
    this.pointerDownPos = { x: e.clientX, y: e.clientY };
    this.pointerDownTime = performance.now();

    const p = this.getPointerPos(e);
    this.mouse.set(p.x, p.y);

    this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);
    
    // Check intersection with pieces
    const pieceMeshes = this.gridState.pieces.map(pc => pc.meshGroup);
    const intersects = this.raycaster.intersectObjects(pieceMeshes, true);

    if (intersects.length > 0) {
      // Find top parent group with userData.piece3D
      let obj = intersects[0].object;
      while (obj && (!obj.userData || !obj.userData.piece3D) && obj.parent) {
        obj = obj.parent;
      }

      if (obj && obj.userData && obj.userData.piece3D) {
        const piece = obj.userData.piece3D;
        if (piece.movable || piece.rotatable) {
          this.selectedPiece = piece;
          this.sceneManager.controls.enabled = false; // Disable orbit controls while handling piece
        }
      }
    }
  }

  onPointerMove(e) {
    const p = this.getPointerPos(e);
    this.mouse.set(p.x, p.y);

    if (this.selectedPiece && this.selectedPiece.movable) {
      const dist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
      if (dist > 8) {
        this.isDragging = true;
      }

      if (this.isDragging) {
        // Raycast against grid floor tiles to show hover highlight
        this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);
        const tileMeshes = Array.from(this.sceneManager.tileMeshes.values());
        const intersects = this.raycaster.intersectObjects(tileMeshes);

        if (intersects.length > 0) {
          const tileData = intersects[0].object.userData;
          this.sceneManager.showTileHighlight(tileData.gridX, tileData.gridZ, this.gridState.width, this.gridState.height);
        } else {
          this.sceneManager.showTileHighlight(null, null);
        }
      }
    }
  }

  onPointerUp(e) {
    const duration = performance.now() - this.pointerDownTime;
    const dist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);

    if (this.selectedPiece) {
      if (dist < 8 && duration < 300) {
        // TAP / CLICK -> Rotate piece 90 degrees
        this.gridState.rotatePiece(this.selectedPiece);
      } else if (this.isDragging && this.selectedPiece.movable) {
        // DRAG RELEASE -> Move piece to hovered grid tile
        this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);
        const tileMeshes = Array.from(this.sceneManager.tileMeshes.values());
        const intersects = this.raycaster.intersectObjects(tileMeshes);

        if (intersects.length > 0) {
          const tileData = intersects[0].object.userData;
          this.gridState.movePiece(this.selectedPiece, tileData.gridX, tileData.gridZ);
        }
      }
    }

    // Reset state & re-enable OrbitControls
    this.selectedPiece = null;
    this.isDragging = false;
    this.sceneManager.controls.enabled = true;
    this.sceneManager.showTileHighlight(null, null);
  }
}
