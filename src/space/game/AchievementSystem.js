export class AchievementSystem {
  constructor() {
    this.achievements = {
      first_blood: { title: 'FIRST BLOOD', desc: 'Destroy an alien drone fighter', unlocked: false, icon: '🎯' },
      asteroid_obligator: { title: 'ASTEROID OBLITERATOR', desc: 'Destroy 25 asteroids', unlocked: false, icon: '💥' },
      emp_specialist: { title: 'EMP SPECIALIST', desc: 'Trigger 5 EMP Shockwaves', unlocked: false, icon: '⚡' },
      dreadnought_slayer: { title: 'DREADNOUGHT SLAYER', desc: 'Defeat a Sector Dreadnought Boss', unlocked: false, icon: '👑' },
      homeworld_guardian: { title: 'HOMEWORLD GUARDIAN', desc: 'Reach Wave 5 in defense mode', unlocked: false, icon: '🛡️' }
    };

    // Load saved achievements
    Object.keys(this.achievements).forEach(key => {
      const isUnlocked = localStorage.getItem(`ov_ach_${key}`) === 'true';
      if (isUnlocked) this.achievements[key].unlocked = true;
    });

    this.stats = {
      dronesKilled: 0,
      asteroidsDestroyed: 0,
      empUsed: 0
    };

    this.onUnlockCallback = null;
  }

  setCallback(cb) {
    this.onUnlockCallback = cb;
  }

  unlock(key) {
    if (this.achievements[key] && !this.achievements[key].unlocked) {
      this.achievements[key].unlocked = true;
      localStorage.setItem(`ov_ach_${key}`, 'true');

      if (this.onUnlockCallback) {
        this.onUnlockCallback(this.achievements[key]);
      }
    }
  }

  recordDroneKill() {
    this.stats.dronesKilled++;
    this.unlock('first_blood');
  }

  recordAsteroidDestroyed() {
    this.stats.asteroidsDestroyed++;
    if (this.stats.asteroidsDestroyed >= 25) {
      this.unlock('asteroid_obligator');
    }
  }

  recordEmpUsed() {
    this.stats.empUsed++;
    if (this.stats.empUsed >= 5) {
      this.unlock('emp_specialist');
    }
  }

  recordBossKilled() {
    this.unlock('dreadnought_slayer');
  }

  recordBossKill() {
    this.recordBossKilled();
  }

  recordWaveReached(waveNum) {
    if (waveNum >= 5) {
      this.unlock('homeworld_guardian');
    }
  }
}
