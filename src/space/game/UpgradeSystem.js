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

  applyUpgradesToShip(playerShip) {
    let tLvl = this.upgrades.thrust;
    if (typeof tLvl !== 'number' || isNaN(tLvl)) tLvl = 0;
    playerShip.speed = 28 + tLvl * 4;

    let sLvl = this.upgrades.shield;
    if (typeof sLvl !== 'number' || isNaN(sLvl)) sLvl = 0;
    playerShip.maxShield = 100 + sLvl * 25;

    let lLvl = this.upgrades.lasers;
    if (typeof lLvl !== 'number' || isNaN(lLvl)) lLvl = 0;
    playerShip.laserFireDelay = Math.max(0.06, 0.12 - lLvl * 0.012);

    let eLvl = this.upgrades.emp;
    if (typeof eLvl !== 'number' || isNaN(eLvl)) eLvl = 0;
    playerShip.maxPulseCD = Math.max(3.5, 8.0 - eLvl * 0.9);

    let mLvl = this.upgrades.magnet;
    if (typeof mLvl !== 'number' || isNaN(mLvl)) mLvl = 0;
    playerShip.tractorBeamLevel = mLvl;
  }
}
