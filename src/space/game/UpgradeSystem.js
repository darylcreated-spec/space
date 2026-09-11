import * as THREE from 'three';

export class UpgradeSystem {
  constructor() {
    let parsedScrap = parseInt(localStorage.getItem('ov_scrap') || '0', 10);
    this.scrap = isNaN(parsedScrap) ? 0 : parsedScrap;

    // Levels
    this.upgrades = {
      thrust: parseInt(localStorage.getItem('ov_upg_thrust') || '0', 10),
      shield: parseInt(localStorage.getItem('ov_upg_shield') || '0', 10),
      lasers: parseInt(localStorage.getItem('ov_upg_lasers') || '0', 10),
      emp: parseInt(localStorage.getItem('ov_upg_emp') || '0', 10),
      magnet: parseInt(localStorage.getItem('ov_upg_magnet') || '0', 10)
    };

    for (const key in this.upgrades) {
      if (isNaN(this.upgrades[key])) {
        this.upgrades[key] = 0;
      }
    }

    this.maxLevel = 5;
    this.baseCost = 120;
  }

  addScrap(amount) {
    this.scrap += amount;
    localStorage.setItem('ov_scrap', this.scrap.toString());
  }

  getCost(type) {
    const lvl = this.upgrades[type] || 0;
    return Math.round(this.baseCost * Math.pow(1.5, lvl));
  }

  getTierName(type, level) {
    const tiers = {
      thrust: [
        'Standard Ion Drive',
        'Turbo Plasma Drive',
        'Dual Vector Afterburners',
        'Gimbal Evasion Thrusters',
        'Sub-Warp Kinetic Injectors',
        'Quantum Sub-Light Drive'
      ],
      shield: [
        'Standard Deflector Grid',
        'Kinetic Shield Lattice',
        'Ablative Nanite Armor',
        'Hard-Light Energy Barrier',
        'Reactive Matrix Nanites',
        'Aegis Bastion Overdrive'
      ],
      lasers: [
        'Twin Blasters',
        'Dual Plasma Repeaters',
        'Tri-Cannon Array',
        'Quad-Linked Heavy Blasters',
        'Penta-Spread Cannons',
        'Quantum Disruptor Array'
      ],
      emp: [
        'Standard EMP Pulse',
        'Expanded Shockwave',
        'Missile Intercept Surge',
        'Turret EMP Disruptor',
        'Resonance Sonic Disc',
        'Supernova EMP Nova'
      ],
      magnet: [
        'Manual Scavenger',
        'Tractor Beam (18m)',
        'Dual Magnetic Harvester',
        'Vortex Scavenger (34m)',
        'Nanite Gravity Well (42m)',
        'Global Scrap Harvester (50m)'
      ]
    };
    return (tiers[type] && tiers[type][level]) ? tiers[type][level] : `Tier ${level}`;
  }

  getStatBenefit(type, level) {
    const benefits = {
      thrust: [
        'Base Speed: 36 | Boost Recharge: 20/s | Dodge CD: 1.25s',
        '+6 Speed (42) | +8 Boost/s | -0.14s Dodge CD | 0.60s i-Frames',
        '+12 Speed (48) | +16 Boost/s | -0.28s Dodge CD | 0.70s i-Frames',
        '+18 Speed (54) | +24 Boost/s | -0.42s Dodge CD | 0.80s i-Frames',
        '+24 Speed (60) | +32 Boost/s | -0.56s Dodge CD | 0.90s i-Frames',
        '+30 Speed (66) | +40 Boost/s | Ultra-Agile 0.55s Dodge | 1.00s i-Frames'
      ],
      shield: [
        'Max Shield: 125 HP | Passive Regen: 2.5 HP/s',
        '+45 Shield (170 HP) | 6.0 HP/s Regen | 7% Kinetic Armor Mitigation',
        '+90 Shield (215 HP) | 9.5 HP/s Regen | 14% Kinetic Armor Mitigation',
        '+135 Shield (260 HP) | 13.0 HP/s Regen | 21% Kinetic Armor Mitigation',
        '+180 Shield (305 HP) | 16.5 HP/s Regen | 28% Kinetic Armor Mitigation',
        '+225 Shield (350 HP) | 20.0 HP/s Regen | 35% Armor Mitigation | Emergency Aegis Reboot ⚡'
      ],
      lasers: [
        'Twin Blasters | 24 Dmg/Bolt | 120 Velocity | 2 Muzzles (48 Dmg Salvo)',
        'Plasma Repeaters | 30 Dmg/Bolt | 130 Velocity | 2 Muzzles (60 Dmg Salvo)',
        'Tri-Cannon Array | 36 Dmg/Bolt | 140 Velocity | 3 Muzzles (108 Dmg Salvo)',
        'Quad Heavy Array | 42 Dmg/Bolt | 150 Velocity | 4 Muzzles (168 Dmg Salvo)',
        'Penta-Spread Array | 48 Dmg/Bolt | 160 Velocity | 5 Muzzles (240 Dmg Salvo)',
        'Quantum Hex Array | 54 Dmg/Bolt | 170 Velocity | 6 Muzzles (324 Dmg Salvo) ⚡'
      ],
      emp: [
        'Pulse CD: 6.5s | Deflection: 24m | 3 Flare Charges',
        'Pulse CD: 5.7s | Deflection: 33m | Missiles Cleared | 3 Flares',
        'Pulse CD: 4.9s | Deflection: 42m | Missiles Cleared | 4 Flares',
        'Pulse CD: 4.1s | Deflection: 51m | Missiles Cleared | 4 Flares',
        'Pulse CD: 3.3s | Deflection: 60m | Fast Countermeasures | 5 Flares',
        'Pulse CD: 2.5s | Deflection: 69m | Screen Shockwave | 5 Flares (5s CD) ⚡'
      ],
      magnet: [
        'Collection: 10m | Tech Scrap: 1.0x',
        'Collection: 18m | Tech Scrap: +20% Bonus (1.2x)',
        'Collection: 26m | Tech Scrap: +40% Bonus (1.4x)',
        'Collection: 34m | Tech Scrap: +60% Bonus (1.6x)',
        'Collection: 42m | Tech Scrap: +80% Bonus (1.8x)',
        'Collection: 50m Global | Tech Scrap: +100% Bonus (2.0x Double Scrap!) ⚡'
      ]
    };
    return (benefits[type] && benefits[type][level]) ? benefits[type][level] : '';
  }

  buyUpgrade(type) {
    const cost = this.getCost(type);
    const lvl = this.upgrades[type] || 0;

    if (lvl < this.maxLevel && this.scrap >= cost) {
      this.scrap -= cost;
      this.upgrades[type] = lvl + 1;

      localStorage.setItem('ov_scrap', this.scrap.toString());
      localStorage.setItem(`ov_upg_${type}`, this.upgrades[type].toString());
      return true;
    }
    return false;
  }

  buyBoost(type, cost) {
    if (this.scrap >= cost) {
      this.scrap -= cost;
      localStorage.setItem('ov_scrap', this.scrap.toString());
      return true;
    }
    return false;
  }

  maxAllUpgrades() {
    this.upgrades.thrust = this.maxLevel;
    this.upgrades.shield = this.maxLevel;
    this.upgrades.lasers = this.maxLevel;
    this.upgrades.emp = this.maxLevel;
    this.upgrades.magnet = this.maxLevel;
    for (const key in this.upgrades) {
      localStorage.setItem(`ov_upg_${key}`, this.maxLevel.toString());
    }
  }

  applyUpgradesToShip(playerShip) {
    if (!playerShip) return;

    const gm = window.spaceGameManager;
    const isGodOverdrive = gm && gm.isGodMode && gm.godModeMaxUpgrades;

    // Equipment Multipliers
    const reactorCore = playerShip.reactorCore || 'DEFAULT';
    const thrusterManifold = playerShip.thrusterManifold || 'DEFAULT';

    let shieldCapacityMult = 1.0;
    let fireDelayMult = 1.0;
    let speedMult = 1.0;
    let dodgeCdMult = 1.0;

    if (reactorCore === 'OVERCLOCKED_PLASMA') {
      fireDelayMult = 0.78; // +28% faster fire
      shieldCapacityMult = 0.88; // -12% capacity trade-off
    } else if (reactorCore === 'TITANIUM_AEGIS') {
      shieldCapacityMult = 1.35; // +35% fortified shield capacity
      fireDelayMult = 1.10; // -10% fire cadence
    }

    if (thrusterManifold === 'AFTERBURNER') {
      speedMult = 1.25; // +25% top speed
    } else if (thrusterManifold === 'VECTOR_RCS') {
      dodgeCdMult = 0.70; // 30% faster dodge roll recovery
      speedMult = 1.08;
    }

    // 1. Thrusters & Mobility Progression
    let tLvl = isGodOverdrive ? this.maxLevel : (this.upgrades.thrust || 0);
    playerShip.thrustLevel = tLvl;
    playerShip.speed = Math.round((36 + tLvl * 6) * speedMult); // 36 to 66 base (up to 82 with Afterburner)
    playerShip.boostRechargeRate = (20 + tLvl * 8) * (thrusterManifold === 'AFTERBURNER' ? 1.3 : 1.0);
    playerShip.dodgeInvulnDuration = 0.50 + tLvl * 0.10; // 0.50s to 1.00s
    playerShip.dodgeMaxCooldown = Math.max(0.48, (1.25 - tLvl * 0.14) * dodgeCdMult); // Down to 0.48s

    // 2. Shield & Nanite Armor Progression
    let sLvl = isGodOverdrive ? this.maxLevel : (this.upgrades.shield || 0);
    playerShip.shieldLevel = sLvl;
    const baseShieldCalc = 125 + sLvl * 45; // 125 to 350 HP
    playerShip.maxShield = Math.round(baseShieldCalc * shieldCapacityMult);
    // Preserve current shield percentage if already active, or initialize to full
    if (!playerShip.shield || playerShip.shield > playerShip.maxShield) {
      playerShip.shield = playerShip.maxShield;
    }
    playerShip.shieldRegenRate = 2.5 + sLvl * 3.5; // 2.5 HP/s baseline at Tier 0, scaling up to 20.0 HP/s at Tier 5!
    playerShip.shieldMitigation = Math.max(0.65, 1.0 - sLvl * 0.07); // Up to 35% kinetic armor mitigation
    playerShip.hasEmergencyAegisReboot = sLvl >= 5;

    // 3. Laser Weapon Systems & Progressive Muzzle Cannon Array
    let lLvl = isGodOverdrive ? this.maxLevel : (this.upgrades.lasers || 0);
    playerShip.laserLevel = lLvl;
    playerShip.laserFireDelay = Math.max(0.068, (0.115 - lLvl * 0.007) * fireDelayMult);
    playerShip.laserDamage = 24 + lLvl * 6; // 24 to 54 damage per bolt
    playerShip.laserSpeed = 120 + lLvl * 10; // 120 to 170 velocity
    
    if (lLvl === 0) {
      playerShip.muzzleOffsets = [new THREE.Vector3(-1.4, 0, -1), new THREE.Vector3(1.4, 0, -1)];
    } else if (lLvl === 1) {
      // Enhanced Twin Plasma Cannons
      playerShip.muzzleOffsets = [new THREE.Vector3(-1.8, 0, -1.2), new THREE.Vector3(1.8, 0, -1.2)];
    } else if (lLvl === 2) {
      // Tri-Cannon Array (Center heavy + twin wingtip)
      playerShip.muzzleOffsets = [new THREE.Vector3(-1.9, 0, -1.2), new THREE.Vector3(0, 0.4, -2.2), new THREE.Vector3(1.9, 0, -1.2)];
    } else if (lLvl === 3) {
      // Quad-Linked Heavy Blasters
      playerShip.muzzleOffsets = [
        new THREE.Vector3(-2.2, 0, -1.0),
        new THREE.Vector3(-0.9, 0.2, -1.8),
        new THREE.Vector3(0.9, 0.2, -1.8),
        new THREE.Vector3(2.2, 0, -1.0)
      ];
    } else if (lLvl === 4) {
      // Penta-Spread Cannon Array
      playerShip.muzzleOffsets = [
        new THREE.Vector3(-2.4, 0, -0.8),
        new THREE.Vector3(-1.2, 0.2, -1.6),
        new THREE.Vector3(0, 0.5, -2.4),
        new THREE.Vector3(1.2, 0.2, -1.6),
        new THREE.Vector3(2.4, 0, -0.8)
      ];
    } else {
      // Level 5 Apex: Quantum Particle Disruptor Hex Array
      playerShip.muzzleOffsets = [
        new THREE.Vector3(-2.6, 0, -0.8),
        new THREE.Vector3(-1.4, 0.2, -1.6),
        new THREE.Vector3(-0.5, 0.5, -2.4),
        new THREE.Vector3(0.5, 0.5, -2.4),
        new THREE.Vector3(1.4, 0.2, -1.6),
        new THREE.Vector3(2.6, 0, -0.8)
      ];
      playerShip.hasQuantumOvercharge = true;
    }

    // 4. Tactical EMP Shockwave & Countermeasures
    let eLvl = isGodOverdrive ? this.maxLevel : (this.upgrades.emp || 0);
    playerShip.empLevel = eLvl;
    playerShip.maxPulseCD = Math.max(2.5, 6.5 - eLvl * 0.8);
    playerShip.empRadius = 24 + eLvl * 9; // 24m to 69m radius
    playerShip.maxFlareCharges = 3 + Math.floor(eLvl / 2); // 3 to 5 flares
    playerShip.maxFlareCD = Math.max(5.0, 10.0 - eLvl * 1.0); // 10s down to 5s flare recharge

    // 5. Magnetic Tractor Beam & Scrap Harvester
    let mLvl = isGodOverdrive ? this.maxLevel : (this.upgrades.magnet || 0);
    playerShip.tractorBeamLevel = mLvl;
    playerShip.magnetRadius = 10 + mLvl * 8; // 10m to 50m collection radius
    playerShip.scrapMultiplier = 1.0 + mLvl * 0.20; // Up to +100% bonus scrap (2.0x!)

    if (isGodOverdrive) {
      playerShip.hasMiningAddon = true;
      playerShip.hasQuantumOvercharge = true;
      playerShip.hasEmergencyAegisReboot = true;
    }
  }
}
