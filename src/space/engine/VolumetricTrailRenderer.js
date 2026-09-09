import * as THREE from 'three';

/**
 * AAA Volumetric Ribbon Engine Trail Renderer
 * Inspired by THREE.MeshLine & camera-facing quad strip ribbons.
 * Generates continuous, smooth ion exhaust and wingtip vapor ribbons in 3D space.
 */
export class VolumetricTrailRenderer {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.maxPoints = options.maxPoints || 26;
    this.lifetime = options.lifetime || 0.42; // seconds
    this.startWidth = options.startWidth || 0.38;
    this.endWidth = options.endWidth || 0.05;
    this.colorHex = options.colorHex || 0x00f3ff;

    this.points = [];
    this._tempTangent = new THREE.Vector3();
    this._tempCamDir = new THREE.Vector3();
    this._tempNormal = new THREE.Vector3();

    // 2 vertices per point, 3 floats per vertex
    const maxVerts = this.maxPoints * 2;
    this.positions = new Float32Array(maxVerts * 3);
    this.uvs = new Float32Array(maxVerts * 2);
    this.colors = new Float32Array(maxVerts * 4); // RGBA

    // 2 triangles (6 indices) per segment between points
    const maxIndices = (this.maxPoints - 1) * 6;
    this.indices = new Uint16Array(maxIndices);

    for (let i = 0; i < this.maxPoints - 1; i++) {
      const v = i * 2;
      const idx = i * 6;
      this.indices[idx + 0] = v + 0;
      this.indices[idx + 1] = v + 1;
      this.indices[idx + 2] = v + 2;
      this.indices[idx + 3] = v + 2;
      this.indices[idx + 4] = v + 1;
      this.indices[idx + 5] = v + 3;
    }

    this.geometry = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(this.positions, 3);
    this.posAttr.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('position', this.posAttr);

    this.uvAttr = new THREE.BufferAttribute(this.uvs, 2);
    this.uvAttr.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('uv', this.uvAttr);

    this.colorAttr = new THREE.BufferAttribute(this.colors, 4);
    this.colorAttr.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('color', this.colorAttr);

    this.geometry.setIndex(new THREE.BufferAttribute(this.indices, 1));
    this.geometry.setDrawRange(0, 0);

    const baseColor = new THREE.Color(this.colorHex);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uBaseColor: { value: baseColor },
        uCoreColor: { value: new THREE.Color(0xffffff) }
      },
      vertexShader: `
        attribute vec4 color;
        varying vec2 vUv;
        varying vec4 vColor;
        void main() {
          vUv = uv;
          vColor = color;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uBaseColor;
        uniform vec3 uCoreColor;
        varying vec2 vUv;
        varying vec4 vColor;

        void main() {
          // Center core luminescence
          float core = 1.0 - abs(vUv.x - 0.5) * 2.0;
          core = pow(max(0.0, core), 2.5);

          vec3 finalColor = mix(uBaseColor, uCoreColor, core * 0.85);
          float alpha = vColor.a * (0.35 + core * 0.65);

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
  }

  setColor(colorHex) {
    this.colorHex = colorHex;
    if (this.material && this.material.uniforms) {
      this.material.uniforms.uBaseColor.value.set(colorHex);
    }
  }

  update(worldPos, dt, camera, isBoosting = false) {
    // 1. Age existing trail points
    for (let i = this.points.length - 1; i >= 0; i--) {
      this.points[i].age += dt;
      if (this.points[i].age > this.lifetime) {
        this.points.splice(i, 1);
      }
    }

    // 2. Add current anchor position if ship moved or initial
    if (worldPos) {
      if (this.points.length === 0 || this.points[0].pos.distanceTo(worldPos) > 0.15) {
        this.points.unshift({
          pos: worldPos.clone(),
          age: 0
        });
        if (this.points.length > this.maxPoints) {
          this.points.pop();
        }
      } else {
        this.points[0].pos.copy(worldPos);
      }
    }

    const n = this.points.length;
    if (n < 2 || !camera) {
      this.geometry.setDrawRange(0, 0);
      return;
    }

    const currentWidth = isBoosting ? this.startWidth * 1.6 : this.startWidth;

    // 3. Build camera-facing quad strip
    let vIdx = 0;
    let uvIdx = 0;
    let colIdx = 0;

    for (let i = 0; i < n; i++) {
      const pt = this.points[i];
      const progress = i / (n - 1); // 0 at head, 1 at tail

      // Compute tangent vector
      if (i < n - 1) {
        this._tempTangent.subVectors(pt.pos, this.points[i + 1].pos);
      } else if (i > 0) {
        this._tempTangent.subVectors(this.points[i - 1].pos, pt.pos);
      } else {
        this._tempTangent.set(0, 0, 1);
      }
      if (this._tempTangent.lengthSq() < 0.0001) this._tempTangent.set(0, 0, 1);
      this._tempTangent.normalize();

      // Vector to camera
      this._tempCamDir.subVectors(camera.position, pt.pos).normalize();

      // Normal perpendicular to both tangent and camera direction
      this._tempNormal.crossVectors(this._tempTangent, this._tempCamDir).normalize();

      const halfW = THREE.MathUtils.lerp(currentWidth, this.endWidth, progress) * 0.5;
      const alpha = Math.max(0.0, Math.pow(1.0 - (pt.age / this.lifetime), 1.6));

      // Left vertex
      const lx = pt.pos.x + this._tempNormal.x * halfW;
      const ly = pt.pos.y + this._tempNormal.y * halfW;
      const lz = pt.pos.z + this._tempNormal.z * halfW;

      // Right vertex
      const rx = pt.pos.x - this._tempNormal.x * halfW;
      const ry = pt.pos.y - this._tempNormal.y * halfW;
      const rz = pt.pos.z - this._tempNormal.z * halfW;

      this.positions[vIdx + 0] = lx;
      this.positions[vIdx + 1] = ly;
      this.positions[vIdx + 2] = lz;

      this.positions[vIdx + 3] = rx;
      this.positions[vIdx + 4] = ry;
      this.positions[vIdx + 5] = rz;

      this.uvs[uvIdx + 0] = 0.0;
      this.uvs[uvIdx + 1] = progress;
      this.uvs[uvIdx + 2] = 1.0;
      this.uvs[uvIdx + 3] = progress;

      for (let k = 0; k < 2; k++) {
        const cOffset = colIdx + k * 4;
        this.colors[cOffset + 0] = 1.0;
        this.colors[cOffset + 1] = 1.0;
        this.colors[cOffset + 2] = 1.0;
        this.colors[cOffset + 3] = alpha;
      }

      vIdx += 6;
      uvIdx += 4;
      colIdx += 8;
    }

    this.posAttr.needsUpdate = true;
    this.uvAttr.needsUpdate = true;
    this.colorAttr.needsUpdate = true;

    this.geometry.setDrawRange(0, (n - 1) * 6);
  }

  destroy() {
    if (this.mesh && this.mesh.parent) {
      this.mesh.parent.remove(this.mesh);
    }
    if (this.geometry) this.geometry.dispose();
    if (this.material) this.material.dispose();
  }
}
