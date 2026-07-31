import { LEVELS } from '../game/Levels.js';

export class HUDOverlay {
  constructor(gridState, sceneManager, soundSynth, onLevelSelect) {
    this.gridState = gridState;
    this.sceneManager = sceneManager;
    this.soundSynth = soundSynth;
    this.onLevelSelect = onLevelSelect;

    this.currentLevelIndex = 0;
    this.levelStarsMap = new Map(); // levelId -> stars earned

    this.cacheElements();
    this.bindEvents();
  }

  cacheElements() {
    this.levelNumEl = document.getElementById('hud-level-num');
    this.movesEl = document.getElementById('hud-moves');
    this.levelBadgeBtn = document.getElementById('level-badge-btn');

    this.btnCamera = document.getElementById('btn-camera');
    this.btnAudio = document.getElementById('btn-audio');
    this.btnReset = document.getElementById('btn-reset');
    this.svgAudioOn = document.getElementById('svg-audio-on');
    this.svgAudioOff = document.getElementById('svg-audio-off');

    this.hintTitleEl = document.getElementById('hint-title');
    this.hintTextEl = document.getElementById('hint-text');

    this.modalLevelSelect = document.getElementById('modal-level-select');
    this.btnCloseLevels = document.getElementById('btn-close-levels');
    this.levelGridEl = document.getElementById('level-grid');

    this.modalVictory = document.getElementById('modal-victory');
    this.victoryLevelNameEl = document.getElementById('victory-level-name');
    this.victoryStarsEl = document.getElementById('victory-stars');
    this.vstatMovesEl = document.getElementById('vstat-moves');
    this.vstatParEl = document.getElementById('vstat-par');
    this.btnReplay = document.getElementById('btn-replay');
    this.btnNextLevel = document.getElementById('btn-next-level');
  }

  bindEvents() {
    this.btnCamera.addEventListener('click', () => {
      this.soundSynth.vibrate(10);
      this.sceneManager.toggleCameraView();
    });

    this.btnAudio.addEventListener('click', () => {
      const isMuted = this.soundSynth.toggleMute();
      if (isMuted) {
        this.svgAudioOn.classList.add('hidden');
        this.svgAudioOff.classList.remove('hidden');
      } else {
        this.svgAudioOn.classList.remove('hidden');
        this.svgAudioOff.classList.add('hidden');
      }
    });

    this.btnReset.addEventListener('click', () => {
      this.soundSynth.vibrate(15);
      this.onLevelSelect(this.currentLevelIndex);
    });

    this.levelBadgeBtn.addEventListener('click', () => {
      this.soundSynth.vibrate(10);
      this.openLevelSelectModal();
    });

    this.btnCloseLevels.addEventListener('click', () => {
      this.modalLevelSelect.classList.add('hidden');
    });

    this.btnReplay.addEventListener('click', () => {
      this.modalVictory.classList.add('hidden');
      this.onLevelSelect(this.currentLevelIndex);
    });

    this.btnNextLevel.addEventListener('click', () => {
      this.modalVictory.classList.add('hidden');
      const nextIdx = (this.currentLevelIndex + 1) % LEVELS.length;
      this.onLevelSelect(nextIdx);
    });
  }

  updateHUD(levelIndex, levelData) {
    this.currentLevelIndex = levelIndex;
    const numStr = String(levelData.id).padStart(2, '0');
    this.levelNumEl.textContent = numStr;
    this.movesEl.textContent = this.gridState.moveCount;

    if (levelData.hintTitle) this.hintTitleEl.textContent = levelData.hintTitle;
    if (levelData.hintText) this.hintTextEl.textContent = levelData.hintText;
  }

  updateMoves() {
    this.movesEl.textContent = this.gridState.moveCount;
  }

  openLevelSelectModal() {
    this.renderLevelGrid();
    this.modalLevelSelect.classList.remove('hidden');
  }

  renderLevelGrid() {
    this.levelGridEl.innerHTML = '';
    LEVELS.forEach((lvl, idx) => {
      const card = document.createElement('div');
      card.className = `level-card ${idx === this.currentLevelIndex ? 'active' : ''}`;
      
      const stars = this.levelStarsMap.get(lvl.id) || 0;
      const starStr = '★'.repeat(stars) + '☆'.repeat(3 - stars);

      card.innerHTML = `
        <span class="num">${String(lvl.id).padStart(2, '0')}</span>
        <span class="name">${lvl.name}</span>
        <span class="stars">${starStr}</span>
      `;

      card.addEventListener('click', () => {
        this.soundSynth.vibrate(15);
        this.modalLevelSelect.classList.add('hidden');
        this.onLevelSelect(idx);
      });

      this.levelGridEl.appendChild(card);
    });
  }

  showVictoryModal(levelData, starsCount) {
    this.levelStarsMap.set(levelData.id, Math.max(starsCount, this.levelStarsMap.get(levelData.id) || 0));

    this.victoryLevelNameEl.textContent = `${levelData.name} - Sector ${String(levelData.id).padStart(2, '0')}`;
    this.vstatMovesEl.textContent = this.gridState.moveCount;
    this.vstatParEl.textContent = levelData.par;

    // Render stars animation
    this.victoryStarsEl.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const star = document.createElement('span');
      star.className = `star ${i < starsCount ? 'active' : ''}`;
      star.textContent = '★';
      star.style.animationDelay = `${i * 0.15}s`;
      this.victoryStarsEl.appendChild(star);
    }

    setTimeout(() => {
      this.modalVictory.classList.remove('hidden');
    }, 500);
  }
}
