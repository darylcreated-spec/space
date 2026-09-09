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
    this.textureLoader = new THREE.TextureLoader();
  }

  async init() {
    try {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const { DRACOLoader } = await import('three/examples/jsm/loaders/DRACOLoader.js');
      this.gltfLoader = new GLTFLoader();
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath('/draco/');
      this.gltfLoader.setDRACOLoader(dracoLoader);
    } catch (e) {
      console.warn('GLTFLoader/DRACOLoader dynamic import failed, procedural meshes will be used', e);
    }
  }

  /**
   * Loads and caches a 2D/cubemap texture
   */
  loadTexture(url, sRGB = false) {
    if (this.textures.has(url)) {
      return this.textures.get(url);
    }
    const tex = this.textureLoader.load(
      url,
      (t) => {
        if (sRGB && THREE.SRGBColorSpace) {
          t.colorSpace = THREE.SRGBColorSpace;
        }
      },
      undefined,
      (err) => {
        console.warn(`AssetManager: Failed to load texture from ${url}`, err);
      }
    );
    if (sRGB && THREE.SRGBColorSpace) {
      tex.colorSpace = THREE.SRGBColorSpace;
    }
    this.textures.set(url, tex);
    return tex;
  }

  /**
   * Loads and caches the Milky Way celestial cube texture
   */
  loadSkybox(folder = '/textures/skybox/milkyway/') {
    if (this.skyboxCube) return this.skyboxCube;
    if (!this.cubeLoader) {
      this.cubeLoader = new THREE.CubeTextureLoader();
    }
    const urls = [
      `${folder}dark-s_px.jpg`,
      `${folder}dark-s_nx.jpg`,
      `${folder}dark-s_py.jpg`,
      `${folder}dark-s_ny.jpg`,
      `${folder}dark-s_pz.jpg`,
      `${folder}dark-s_nz.jpg`
    ];
    this.skyboxCube = this.cubeLoader.load(urls);
    return this.skyboxCube;
  }

  /**
   * Preloads Kenney CC0 particle VFX textures with alpha channels
   */
  loadParticleTextures() {
    if (this.particleTextures) return this.particleTextures;
    this.particleTextures = {
      smoke: this.loadTexture('/textures/particles/smoke_04.png', true),
      flame: this.loadTexture('/textures/particles/flame_01.png', true),
      spark: this.loadTexture('/textures/particles/spark_02.png', true),
      shockwave: this.loadTexture('/textures/particles/circle_05.png', true),
      muzzle: this.loadTexture('/textures/particles/muzzle_01.png', true)
    };
    return this.particleTextures;
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

  /**
   * Rescales and centers a 3D model automatically to a target bounding dimension
   */
  normalizeModelSize(model, targetMaxDimension = 5.0, centerPivot = true) {
    if (!model) return;
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0.0001) {
      const scale = targetMaxDimension / maxDim;
      model.scale.multiplyScalar(scale);
      if (centerPivot) {
        model.position.sub(center.clone().multiplyScalar(scale));
      }
    }
  }

  /**
   * Loads the authentic orbital Space Station model (ISS or Citadel)
   */
  async loadSpaceStationModel() {
    // Try ISS GLB first, fallback to Citadel station from fleet GLB
    const iss = await this.loadModel('/models/Space_Station_ISS.glb', 'Space_Station_ISS');
    if (iss) {
      const wrapper = new THREE.Group();
      wrapper.name = 'SpaceStation_ISS';
      this.normalizeModelSize(iss, 32.0, true);
      wrapper.add(iss);
      return wrapper;
    }
    await this.loadFleetAssets();
    const citadel = this.getFleetShipMesh('Vessel_Station_01');
    if (citadel) {
      const wrapper = new THREE.Group();
      wrapper.name = 'SpaceStation_Citadel';
      this.normalizeModelSize(citadel, 32.0, true);
      wrapper.add(citadel);
      const ring = this.getFleetShipMesh('Station_Habitat_Ring');
      if (ring) {
        this.normalizeModelSize(ring, 32.0, true);
        wrapper.add(ring);
      }
      return wrapper;
    }
    return null;
  }

  /**
   * Loads a dedicated player spacecraft 3D model
   */
  async loadPlayerShipModel(shipClass = 'INTERCEPTOR') {
    if (shipClass === 'STEALTH' || shipClass === 'INTERCEPTOR') {
      const ionFighter = await this.loadModel('/models/Spacecraft_Ion_Fighter.glb', 'Spacecraft_Ion_Fighter');
      if (ionFighter) {
        const wrapper = new THREE.Group();
        wrapper.name = 'PlayerCraft_Ion';
        this.normalizeModelSize(ionFighter, 4.2, true);
        wrapper.add(ionFighter);
        return wrapper;
      }
    } else if (shipClass === 'JUGGERNAUT' || shipClass === 'TITAN') {
      const shuttle = await this.loadModel('/models/Spacecraft_Shuttle.glb', 'Spacecraft_Shuttle');
      if (shuttle) {
        const wrapper = new THREE.Group();
        wrapper.name = 'PlayerCraft_Shuttle';
        this.normalizeModelSize(shuttle, 5.0, true);
        wrapper.add(shuttle);
        return wrapper;
      }
    }
    return null;
  }

  /**
   * Loads an escort frigate model for wingmen
   */
  async loadEscortFrigateModel() {
    await this.loadFleetAssets();
    const frigate = this.getFleetShipMesh('Vessel_Frigate_01');
    if (frigate) {
      const wrapper = new THREE.Group();
      wrapper.name = 'Wingman_Frigate';
      this.normalizeModelSize(frigate, 3.2, true);
      wrapper.add(frigate);
      return wrapper;
    }
    return null;
  }

  /**
   * Loads NASA 3D scanned asteroid model (Asteroid 1999 RQ36)
   */
  async loadAsteroidModel() {
    const model = await this.loadModel('/models/Asteroid_1999_RQ36.glb', 'NASA_ASTEROID_RQ36');
    if (model) {
      const wrapper = new THREE.Group();
      wrapper.name = 'NASA_Asteroid';
      this.normalizeModelSize(model, 6.0, true);
      wrapper.add(model);
      return wrapper;
    }
    return null;
  }

  /**
   * Loads NASA Deep Space Comms Relay Probe
   */
  async loadProbeModel() {
    const model = await this.loadModel('/models/Deep_Space_Probe.glb', 'NASA_DEEP_SPACE_PROBE');
    if (model) {
      const wrapper = new THREE.Group();
      wrapper.name = 'NASA_Probe';
      this.normalizeModelSize(model, 8.0, true);
      wrapper.add(model);
      return wrapper;
    }
    return null;
  }
}

export const assetManager = new AssetManager();
