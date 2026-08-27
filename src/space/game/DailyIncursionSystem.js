export class DailyIncursionSystem {
  constructor() {
    this.modifiers = [
      {
        id: 'ION_TEMPEST',
        name: 'ION TEMPEST PROTOCOL',
        desc: 'Energy weapons +35% DMG // Shields recharge 20% slower // +50% Scrap yield',
        damageMult: 1.35,
        shieldRegenMult: 0.80,
        scrapMult: 1.50
      },
      {
        id: 'SOLAR_SURGE',
        name: 'SOLAR FLARE SURGE',
        desc: 'Comet density +100% // Blaster velocity +30% // Comets yield 3x Tech Scrap',
        damageMult: 1.15,
        scrapMult: 1.75
      },
      {
        id: 'ARMADA_SIEGE',
        name: 'ARMADA SIEGE WARNING',
        desc: 'Enemy Warship HP +30% // Boss Defeat awards Double Tech Scrap (2x CR)',
        enemyHpMult: 1.30,
        scrapMult: 2.0
      },
      {
        id: 'QUANTUM_VOID',
        name: 'QUANTUM SINGULARITY',
        desc: 'Tractor beam range x2 // Hyper-Boost recharge +50% // +25% Laser Crit Chance',
        damageMult: 1.25,
        scrapMult: 1.40
      },
      {
        id: 'VOID_ECLIPSE',
        name: 'VOID ECLIPSE INVASION',
        desc: 'Stealth Incursion wings +50% // Tactical EMP cooldown reduced by 40%',
        damageMult: 1.20,
        scrapMult: 1.60
      }
    ];

    this.todayKey = new Date().toISOString().slice(0, 10);
    this.activeModifier = this.getDailyModifier();
  }

  getDailyModifier() {
    // Deterministic hash based on date string
    let hash = 0;
    for (let i = 0; i < this.todayKey.length; i++) {
      hash = (hash * 31 + this.todayKey.charCodeAt(i)) >>> 0;
    }
    const idx = hash % this.modifiers.length;
    return this.modifiers[idx];
  }

  isDailyCompleted() {
    return localStorage.getItem(`ov_daily_done_${this.todayKey}`) === 'true';
  }

  markDailyCompleted() {
    localStorage.setItem(`ov_daily_done_${this.todayKey}`, 'true');
  }
}
