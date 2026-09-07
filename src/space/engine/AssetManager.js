import * as THREE from 'three';

/**
 * 3D Asset Pipeline & Mesh Manager for Starbound
 * Handles loading GLTF/GLB 3D models, textures, caching, and provides
 * procedural high-fidelity fallback mesh generation.
 */
export class AssetManager {
  constructor() {
    this.models = new Map();
    this.textures = new Map();
    this.audioBuffers = new Map();
    this.loadingPromises = new Map();
    this.gltfLoader = null;
  }

  async init() {
    try {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      this.gltfLoader = new GLTFLoader();
    } catch (e) {
      console.warn('GLTFLoader dynamic import failed, procedural meshes will be used', e);
    }
  }

  /**
   * Loads a GLTF/GLB asset with caching and error fallback
   */
  async loadModel(url, key) {
    const assetKey = key || url;
    if (this.models.has(assetKey)) {
      return this.models.get(assetKey).clone();
    }

    if (this.loadingPromises.has(assetKey)) {
      return this.loadingPromises.get(assetKey);
    }

    if (!this.gltfLoader) {
      await this.init();
    }

    if (!this.gltfLoader) {
      return null;
    }

    const loadPromise = new Promise((resolve) => {
      this.gltfLoader.load(
        url,
        (gltf) => {
          const scene = gltf.scene || gltf.scenes[0];
          scene.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              if (child.material) {
                child.material.side = THREE.DoubleSide;
              }
            }
          });
          this.models.set(assetKey, scene);
          this.loadingPromises.delete(assetKey);
          resolve(scene.clone());
        },
        undefined,
        (err) => {
          console.warn(`AssetManager: Failed to load 3D model from ${url}. Using procedural fallback.`, err);
          this.loadingPromises.delete(assetKey);
          resolve(null);
        }
      );
    });

    this.loadingPromises.set(assetKey, loadPromise);
    return loadPromise;
  }

  /**
   * Loads the unified armada fleet GLB and caches individual ship models & sockets
   */
  async loadFleetAssets(url = '/models/Enemy_Fleet_Updated.glb') {
    if (this.fleetLoaded) return this.fleetAssets;
    if (this.fleetLoadingPromise) return this.fleetLoadingPromise;

    this.fleetLoadingPromise = new Promise(async (resolve) => {
      try {
        if (!this.gltfLoader) await this.init();
        if (!this.gltfLoader) {
          resolve(null);
          return;
        }

        this.gltfLoader.load(
          url,
          (gltf) => {
            const scene = gltf.scene || gltf.scenes[0];
            const assets = {
              scene: scene,
              ships: new Map(),
              sockets: new Map()
            };

            const vesselNames = [
              'Vessel_Frigate_01',
              'Vessel_Destroyer_01',
              'Vessel_Carrier_01',
              'Vessel_Station_01',
              'Station_Habitat_Ring'
            ];

            scene.traverse((child) => {
              if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                if (child.material) {
                  child.material.side = THREE.DoubleSide;
                }
              }

              if (vesselNames.includes(child.name)) {
                assets.ships.set(child.name, child.clone(true));
              }

              if (child.name.startsWith('SOCKET_')) {
                assets.sockets.set(child.name, child.position.clone());
              }
            });

            this.fleetAssets = assets;
            this.fleetLoaded = true;
            this.fleetLoadingPromise = null;
            resolve(assets);
          },
          undefined,
          (err) => {
            console.warn('AssetManager: Failed to load fleet assets from', url, err);
            this.fleetLoadingPromise = null;
            resolve(null);
          }
        );
      } catch (e) {
        console.warn('AssetManager: Fleet load exception', e);
        this.fleetLoadingPromise = null;
        resolve(null);
      }
    });

    return this.fleetLoadingPromise;
  }

  /**
   * Retrieves a cloned instance of a specific fleet ship mesh
   */
  getFleetShipMesh(shipName) {
    if (!this.fleetAssets || !this.fleetAssets.ships.has(shipName)) {
      return null;
    }
    return this.fleetAssets.ships.get(shipName).clone(true);
  }

  /**
   * Generates a procedural 3D model for specific ship classes
   */
  createProceduralShipModel(shipClass = 'INTERCEPTOR') {
    const group = new THREE.Group();

    if (shipClass === 'JUGGERNAUT') {
      const hullMat = new THREE.MeshStandardMaterial({ color: 0x1c2b3d, metalness: 0.95, roughness: 0.2 });
      const glowMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });

      const body = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.4, 6.0), hullMat);
      group.add(body);

      [-1, 1].forEach(side => {
        const pod = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, 5.0), hullMat);
        pod.position.set(side * 2.4, 0, -0.5);
        group.add(pod);

        const strip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 4.0), glowMat);
        strip.position.set(side * 2.8, 0.6, -0.5);
        group.add(strip);
      });
    } else if (shipClass === 'STEALTH') {
      const stealthMat = new THREE.MeshStandardMaterial({ color: 0x0a0c10, metalness: 0.98, roughness: 0.1 });
      const glowMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });

      const body = new THREE.Mesh(new THREE.ConeGeometry(2.4, 6.5, 4), stealthMat);
      body.rotateX(Math.PI / 2);
      group.add(body);

      [-1, 1].forEach(side => {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.2, 3.2), stealthMat);
        wing.position.set(side * 2.2, 0, -1.0);
        wing.rotation.y = side * -0.4;
        group.add(wing);

        const led = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), glowMat);
        led.position.set(side * 3.4, 0, -2.0);
        group.add(led);
      });
    } else {
      const mat = new THREE.MeshStandardMaterial({ color: 0x22384d, metalness: 0.9, roughness: 0.25 });
      const glowMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });

      const fuselage = new THREE.Mesh(new THREE.ConeGeometry(1.6, 5.5, 6), mat);
      fuselage.rotateX(Math.PI / 2);
      group.add(fuselage);

      [-1, 1].forEach(side => {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.18, 2.8), mat);
        wing.position.set(side * 1.8, 0, -0.8);
        wing.rotation.y = side * -0.25;
        group.add(wing);
      });
    }

    return group;
  }
}

export const assetManager = new AssetManager();
