// hud.js — the heads-up display and the start, win and lose screens.
// All text lives in the DOM (not the canvas) so it stays crisp and readable.

export class Hud {
  constructor() {
    this.statusEl = document.getElementById('hud-status');
    this.gemsEl = document.getElementById('hud-gems');
    this.timerEl = document.getElementById('hud-timer');
    this.alertEl = document.getElementById('hud-alert');
    this.alertFill = document.getElementById('alert-fill');
    this.startScreen = document.getElementById('screen-start');
    this.winScreen = document.getElementById('screen-win');
    this.loseScreen = document.getElementById('screen-lose');
    this.winStats = document.getElementById('win-stats');
    this.loseReason = document.getElementById('lose-reason');
  }

  /** Refresh the top bar: gems, timer, overall alert and the hottest guard. */
  update({ gems, gemsTotal, seconds, status, maxSuspicion }) {
    this.gemsEl.textContent = `◆ ${gems}/${gemsTotal}`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    this.timerEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    this.statusEl.textContent = status;
    this.statusEl.classList.toggle('alarm', status.startsWith('ALARM'));
    this.alertFill.style.width = `${Math.round(maxSuspicion)}%`;
    this.alertFill.style.background = maxSuspicion > 60 ? '#ff5252' : maxSuspicion > 25 ? '#ffd640' : '#35e0c0';
    this.alertEl.textContent = maxSuspicion > 60 ? 'HUNTED' : maxSuspicion > 25 ? 'SUSPICIOUS' : 'UNSEEN';
  }

  showStart() {
    this.startScreen.classList.remove('hidden');
    this.winScreen.classList.add('hidden');
    this.loseScreen.classList.add('hidden');
  }

  showWin(statsText) {
    this.winStats.textContent = statsText;
    this.winScreen.classList.remove('hidden');
    this.startScreen.classList.add('hidden');
    this.loseScreen.classList.add('hidden');
  }

  showLose(reasonText) {
    this.loseReason.textContent = reasonText;
    this.loseScreen.classList.remove('hidden');
    this.startScreen.classList.add('hidden');
    this.winScreen.classList.add('hidden');
  }

  hideScreens() {
    this.startScreen.classList.add('hidden');
    this.winScreen.classList.add('hidden');
    this.loseScreen.classList.add('hidden');
  }
}
