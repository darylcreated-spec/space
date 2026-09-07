/**
 * DeviceManager.js
 * Comprehensive Platform, Browser, GPU Tier, and Display Profiler
 * Dynamically tunes WebGL rendering parameters, pixel ratios, post-processing,
 * and entity budgets across any device and screen size for 60-144 FPS performance.
 */
export class DeviceManager {
  constructor() {
    this.profile = this._detectPlatform();
    this.adaptiveScaler = new AdaptivePerformanceController(this);
    this._setupResizeListeners();
  }

  _detectPlatform() {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
    const platform = typeof navigator !== 'undefined' ? navigator.platform || '' : '';

    // 1. Browser Detection
    let browser = 'Unknown';
    let engine = 'Unknown';
    const isEdge = /Edg\//i.test(ua);
    const isChrome = /Chrome\//i.test(ua) && !isEdge;
    const isFirefox = /Firefox\//i.test(ua);
    const isSafari = /Safari\//i.test(ua) && !isChrome && !isEdge;
    const isSamsung = /SamsungBrowser/i.test(ua);
    const isOpera = /OPR\//i.test(ua) || /Opera/i.test(ua);

    if (isSamsung) browser = 'Samsung Internet';
    else if (isOpera) browser = 'Opera';
    else if (isEdge) browser = 'Edge';
    else if (isFirefox) { browser = 'Firefox'; engine = 'Gecko'; }
    else if (isChrome) { browser = 'Chrome'; engine = 'Blink'; }
    else if (isSafari) { browser = 'Safari'; engine = 'WebKit'; }

    if (engine === 'Unknown') {
      if (/AppleWebKit/i.test(ua)) engine = 'WebKit';
      else if (/Gecko/i.test(ua)) engine = 'Gecko';
    }

    // 2. Form Factor & Device Detection
    const isIOS = /iPhone|iPad|iPod/i.test(ua) || (platform === 'MacIntel' && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/i.test(ua);
    const isMobileUA = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|CriOS/i.test(ua);
    const isTabletUA = /iPad/i.test(ua) || (isAndroid && !/Mobile/i.test(ua)) || (platform === 'MacIntel' && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1);

    const hasTouch = typeof window !== 'undefined' && ('ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0));
    const screenMin = typeof window !== 'undefined' && window.screen ? Math.min(window.screen.width, window.screen.height) : 1024;

    let formFactor = 'desktop';
    if (isTabletUA || (hasTouch && screenMin >= 600 && screenMin <= 1024)) {
      formFactor = 'tablet';
    } else if (isMobileUA || (hasTouch && screenMin < 600) || (typeof window !== 'undefined' && window.innerWidth < 768)) {
      formFactor = 'mobile';
    }

    // 3. Hardware Capabilities
    const cpuCores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
    const deviceMemory = typeof navigator !== 'undefined' ? navigator.deviceMemory || 4 : 4; // in GB
    const isSaveData = typeof navigator !== 'undefined' && !!(navigator.connection && navigator.connection.saveData);

    // 4. WebGL GPU Identification & Tiering
    const gpuInfo = this._probeWebGLGPU();
    const gpuTier = this._calculateGPUTier(gpuInfo, formFactor, cpuCores, deviceMemory);

    // 5. Initial Display Metrics
    const width = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const height = typeof window !== 'undefined' ? window.innerHeight : 1080;
    const aspectRatio = width / (height || 1);
    const isPortrait = height > width;

    // 6. Safe Pixel Ratio Clamp based on GPU Tier & Form Factor
    let optimalPixelRatio = 1.0;
    const rawDPR = typeof window !== 'undefined' ? window.devicePixelRatio || 1.0 : 1.0;

    if (gpuTier === 0) {
      optimalPixelRatio = 1.0; // Software fallback
    } else if (gpuTier === 1) {
      optimalPixelRatio = Math.min(rawDPR, 1.0); // Budget mobile
    } else if (gpuTier === 2) {
      optimalPixelRatio = formFactor === 'mobile' ? Math.min(rawDPR, 1.25) : Math.min(rawDPR, 1.5);
    } else {
      optimalPixelRatio = formFactor === 'mobile' ? Math.min(rawDPR, 1.5) : Math.min(rawDPR, 2.0);
    }

    // 7. Recommended Graphics Quality
    let recommendedQuality = 'balanced';
    if (gpuTier === 0) recommendedQuality = 'low';
    else if (gpuTier === 1) recommendedQuality = 'balanced';
    else if (gpuTier === 2) recommendedQuality = 'high';
    else if (gpuTier === 3) recommendedQuality = 'ultra';

    if (isSaveData) recommendedQuality = 'low';

    return {
      browser,
      engine,
      isSafari,
      isIOS,
      isAndroid,
      formFactor,
      isMobile: formFactor === 'mobile',
      isTablet: formFactor === 'tablet',
      isDesktop: formFactor === 'desktop',
      hasTouch,
      cpuCores,
      deviceMemory,
      isSaveData,
      gpuRenderer: gpuInfo.renderer,
      gpuVendor: gpuInfo.vendor,
      gpuTier,
      width,
      height,
      aspectRatio,
      isPortrait,
      rawDPR,
      optimalPixelRatio,
      recommendedQuality,
      supportsWebGL2: gpuInfo.isWebGL2
    };
  }

  _probeWebGLGPU() {
    let renderer = 'Generic WebGL';
    let vendor = 'Generic';
    let isWebGL2 = false;

    if (typeof document === 'undefined') return { renderer, vendor, isWebGL2 };

    try {
      const canvas = document.createElement('canvas');
      let gl = canvas.getContext('webgl2');
      if (gl) {
        isWebGL2 = true;
      } else {
        gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      }

      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || renderer;
          vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || vendor;
        } else {
          renderer = gl.getParameter(gl.RENDERER) || renderer;
          vendor = gl.getParameter(gl.VENDOR) || vendor;
        }

        const loseContext = gl.getExtension('WEBGL_lose_context');
        if (loseContext) loseContext.loseContext();
      }
    } catch (e) {
      console.warn('DeviceManager: Could not probe WebGL GPU info:', e);
    }

    return { renderer, vendor, isWebGL2 };
  }

  _calculateGPUTier(gpuInfo, formFactor, cpuCores, deviceMemory) {
    const r = (gpuInfo.renderer || '').toLowerCase();

    // Tier 0: Software emulators / potato / CPU renderers
    if (r.includes('swiftshader') || r.includes('llvmpipe') || r.includes('software') || r.includes('microsoft basic render')) {
      return 0;
    }

    // Tier 3: High-end dedicated desktop GPUs & Apple Silicon Pro/Max
    if (
      r.includes('rtx') ||
      r.includes('gtx 1080') ||
      r.includes('gtx 1070') ||
      r.includes('gtx 1660') ||
      r.includes('radeon rx') ||
      r.includes('apple m1 pro') ||
      r.includes('apple m1 max') ||
      r.includes('apple m1 ultra') ||
      r.includes('apple m2 pro') ||
      r.includes('apple m2 max') ||
      r.includes('apple m3') ||
      r.includes('apple m4')
    ) {
      return 3;
    }

    // Tier 2: Mid-range dedicated, modern integrated, or flagship mobile GPUs
    if (
      r.includes('apple m1') ||
      r.includes('apple m2') ||
      r.includes('apple a15') ||
      r.includes('apple a16') ||
      r.includes('apple a17') ||
      r.includes('apple a18') ||
      r.includes('adreno (tm) 7') ||
      r.includes('adreno 730') ||
      r.includes('adreno 740') ||
      r.includes('adreno 750') ||
      r.includes('mali-g710') ||
      r.includes('mali-g720') ||
      r.includes('iris') ||
      r.includes('radeon vega') ||
      r.includes('gtx')
    ) {
      return 2;
    }

    // Tier 1: Budget mobile GPUs (Adreno 5xx/6xx, Mali-G5x/T8xx, Intel HD Graphics)
    if (
      r.includes('adreno (tm) 5') ||
      r.includes('adreno (tm) 6') ||
      r.includes('mali') ||
      r.includes('intel hd') ||
      r.includes('powervr')
    ) {
      return 1;
    }

    // Heuristic fallback based on cores and memory
    if (formFactor === 'desktop' && cpuCores >= 8 && deviceMemory >= 8) return 2;
    if (formFactor === 'mobile' && (cpuCores <= 4 || deviceMemory <= 3)) return 1;

    return formFactor === 'desktop' ? 2 : 1;
  }

  _setupResizeListeners() {
    if (typeof window === 'undefined') return;
    let resizeTimeout = null;

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.profile.width = w;
      this.profile.height = h;
      this.profile.aspectRatio = w / (h || 1);
      this.profile.isPortrait = h > w;

      if (this.profile.hasTouch && Math.min(w, h) < 600) {
        this.profile.formFactor = 'mobile';
      } else if (this.profile.hasTouch && Math.min(w, h) <= 1024) {
        this.profile.formFactor = 'tablet';
      } else if (!this.profile.hasTouch) {
        this.profile.formFactor = 'desktop';
      }
      this.profile.isMobile = this.profile.formFactor === 'mobile';
      this.profile.isTablet = this.profile.formFactor === 'tablet';
      this.profile.isDesktop = this.profile.formFactor === 'desktop';
    };

    window.addEventListener('resize', () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 150);
    });

    window.addEventListener('orientationchange', () => {
      setTimeout(handleResize, 200);
    });
  }

  getProfile() {
    return this.profile;
  }

  getOptimalPixelRatio() {
    return this.profile.optimalPixelRatio;
  }

  getRecommendedQuality() {
    return this.profile.recommendedQuality;
  }

  /**
   * Returns entity budget multipliers tailored for the current device capability
   */
  getEntityBudgets() {
    const tier = this.profile.gpuTier;
    const isMob = this.profile.isMobile;

    if (tier === 0) {
      return {
        maxAsteroids: 4,
        maxDrones: 2,
        maxLasers: 12,
        dustParticles: 150,
        starsCount: 800,
        laserCooldownScale: 1.6,
        allowVolumetricLights: false
      };
    } else if (tier === 1 || isMob) {
      return {
        maxAsteroids: 6,
        maxDrones: 3,
        maxLasers: 20,
        dustParticles: 250,
        starsCount: 1200,
        laserCooldownScale: 1.35,
        allowVolumetricLights: false
      };
    } else if (tier === 2) {
      return {
        maxAsteroids: 9,
        maxDrones: 5,
        maxLasers: 36,
        dustParticles: 450,
        starsCount: 2000,
        laserCooldownScale: 1.0,
        allowVolumetricLights: true
      };
    } else {
      return {
        maxAsteroids: 14,
        maxDrones: 8,
        maxLasers: 60,
        dustParticles: 750,
        starsCount: 3000,
        laserCooldownScale: 1.0,
        allowVolumetricLights: true
      };
    }
  }
}

/**
 * AdaptivePerformanceController
 * Dynamically monitors runtime FPS and thermal throttling, automatically stepping down
 * graphics presets when sustained lag or stutters occur.
 */
class AdaptivePerformanceController {
  constructor(deviceManager) {
    this.deviceManager = deviceManager;
    this.currentQuality = deviceManager.getRecommendedQuality();
    this.listeners = [];

    this.sampleWindowMs = 2500;
    this.sampleTimer = 0;
    this.sampleFrames = 0;
    this.lowFpsStreak = 0;
    this.highFpsStreak = 0;
    this.hasAutoDownscaled = false;
    this.autoScaleEnabled = true;
  }

  onQualityChange(callback) {
    this.listeners.push(callback);
  }

  reportFrame(deltaMs) {
    if (!this.autoScaleEnabled) return;

    this.sampleFrames++;
    this.sampleTimer += deltaMs;

    if (this.sampleTimer >= this.sampleWindowMs) {
      const avgFps = (this.sampleFrames * 1000) / this.sampleTimer;
      this.sampleFrames = 0;
      this.sampleTimer = 0;

      this._evaluatePerformance(avgFps);
    }
  }

  _evaluatePerformance(avgFps) {
    if (avgFps < 38.0) {
      this.lowFpsStreak++;
      this.highFpsStreak = 0;

      if (this.lowFpsStreak >= 2) {
        this._downgradeQuality();
        this.lowFpsStreak = 0;
      }
    } else if (avgFps >= 57.0) {
      this.highFpsStreak++;
      this.lowFpsStreak = 0;

      if (this.highFpsStreak >= 6 && this.hasAutoDownscaled) {
        this._upgradeQuality();
        this.highFpsStreak = 0;
      }
    } else {
      this.lowFpsStreak = 0;
      this.highFpsStreak = 0;
    }
  }

  _downgradeQuality() {
    const qualities = ['ultra', 'high', 'balanced', 'low'];
    const currIdx = qualities.indexOf(this.currentQuality);
    if (currIdx < qualities.length - 1) {
      const nextQuality = qualities[currIdx + 1];
      console.warn(`DeviceManager: Dynamic adaptive downscale triggered (${this.currentQuality} -> ${nextQuality}) to maintain target 60 FPS.`);
      this.currentQuality = nextQuality;
      this.hasAutoDownscaled = true;
      this._notifyListeners(nextQuality, 'downgrade');
    }
  }

  _upgradeQuality() {
    const qualities = ['low', 'balanced', 'high', 'ultra'];
    const currIdx = qualities.indexOf(this.currentQuality);
    if (currIdx < qualities.length - 1) {
      const nextQuality = qualities[currIdx + 1];
      console.log(`DeviceManager: Performance stabilized, restoring quality (${this.currentQuality} -> ${nextQuality}).`);
      this.currentQuality = nextQuality;
      this._notifyListeners(nextQuality, 'upgrade');
    }
  }

  _notifyListeners(newQuality, direction) {
    this.listeners.forEach((fn) => {
      try {
        fn(newQuality, direction);
      } catch (e) {
        console.error('DeviceManager: Error in quality change listener:', e);
      }
    });
  }
}

// Global Singleton Export
export const deviceManager = new DeviceManager();
