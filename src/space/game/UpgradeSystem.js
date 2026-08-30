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
    this.baseCost = 150;
  }

  addScrap(amount) {
    this.scrap += amount;
    localStorage.setItem('ov_scrap', this.scrap.toString());
  }

  getCost(type) {
    const lvl = this.upgrades[type] || 0;
    return Math.round(this.baseCost * Math.pow(1.6, lvl));
  }

  getTierName(type, level) {
    const tiers = {
      thrust: [
        'Standard Ion Drive',
        'Turbo Plasma Drive',
        'Dual Afterburners',
        'Vector-Gimbal Thrusters',
        'Sub-Warp Injectors',
        'Quantum Sub-Light Drive'
      ],
      shield: [
        'Standard Deflector',
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
        'Tractor Beam (12m)',
        'Dual Magnetic Harvester',
        'Vortex Scavenger (25m)',
        'Nanite Gravity Well (34m)',
        'Global Scrap Harvester (45m)'
      ]
    };
    return (tiers[type] && tiers[type][level]) ? tiers[type][level] : `Tier ${level}`;
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

    // 1. Thrusters & Mobility Progression
    let tLvl = isGodOverdrive ? this.maxLevel : (this.upgrades.thrust || 0);
    playerShip.thrustLevel = tLvl;
    playerShip.speed = 32 + tLvl * 5; // 32 to 57
    playerShip.boostRechargeRate = 16 + tLvl * 6;
    playerShip.dodgeInvulnDuration = 0.45 + tLvl * 0.08;

    // 2. Shield & Nanite Armor Progression
    let sLvl = isGodOverdrive ? this.maxLevel : (this.upgrades.shield || 0);
    playerShip.shieldLevel = sLvl;
    playerShip.maxShield = 100 + sLvl * 35; // 100 to 275 HP
    playerShip.shield = playerShip.maxShield;
    playerShip.shieldRegenRate = sLvl * 2.5; // Passive auto-regen
    playerShip.hasEmergencyAegisReboot = sLvl >= 5;

    // 3. Laser Weapon Systems & Progressive Muzzle Cannon Array
    let lLvl = isGodOverdrive ? this.maxLevel : (this.upgrades.lasers || 0);
    playerShip.laserLevel = lLvl;
    // High-performance rhythmic salvo cadence (8-11 salvos/sec) with punchy high-damage plasma bolts
    playerShip.laserFireDelay = Math.max(0.088, 0.12 - lLvl * 0.006);
    
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

    // 4. Tactical EMP Shockwave
    let eLvl = isGodOverdrive ? this.maxLevel : (this.upgrades.emp || 0);
    playerShip.empLevel = eLvl;
    playerShip.maxPulseCD = Math.max(3.0, 7.5 - eLvl * 0.9);
    playerShip.empRadius = 25 + eLvl * 8; // 25m to 65m radius

    // 5. Magnetic Tractor Beam & Scrap Harvester
    let mLvl = isGodOverdrive ? this.maxLevel : (this.upgrades.magnet || 0);
    playerShip.tractorBeamLevel = mLvl;
    playerShip.magnetRadius = 8 + mLvl * 7; // 8m to 43m collection radius
    playerShip.scrapMultiplier = 1.0 + mLvl * 0.15; // Up to +75% bonus scrap

    if (isGodOverdrive) {
      playerShip.hasMiningAddon = true;
      playerShip.hasQuantumOvercharge = true;
      playerShip.hasEmergencyAegisReboot = true;
    }
  }
}
