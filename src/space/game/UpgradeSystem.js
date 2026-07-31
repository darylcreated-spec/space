export class UpgradeSystem {
  constructor() {
    this.scrap = parseInt(localStorage.getItem('ov_scrap') || '0', 10);

    // Levels
    this.upgrades = {
      thrust: parseInt(localStorage.getItem('ov_upg_thrust') || '0', 10),
      shield: parseInt(localStorage.getItem('ov_upg_shield') || '0', 10),
      lasers: parseInt(localStorage.getItem('ov_upg_lasers') || '0', 10),
      emp: parseInt(localStorage.getItem('ov_upg_emp') || '0', 10)
    };

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

  applyUpgradesToShip(playerShip) {
    const tLvl = this.upgrades.thrust || 0;
    playerShip.speed = 28 + tLvl * 4;

    const sLvl = this.upgrades.shield || 0;
    playerShip.maxShield = 100 + sLvl * 25;

    const lLvl = this.upgrades.lasers || 0;
    playerShip.laserFireDelay = Math.max(0.06, 0.12 - lLvl * 0.012);

    const eLvl = this.upgrades.emp || 0;
    playerShip.maxPulseCD = Math.max(3.5, 8.0 - eLvl * 0.9);
  }
}
