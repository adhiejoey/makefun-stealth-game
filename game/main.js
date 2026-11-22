// main.js — Nightshade Gallery: boot, input, the game loop and the win/lose
// flow. The thief must reach the green EXIT unseen; getting grabbed ends the
// run. `?shot=cover|patrol|alert|exit` freezes a staged scene for screenshots.

import { COLS, ROWS, TILE, GUARD_PATROLS, lampPositions, gemPositions, playerStart, exitPosition } from './level.js';
import { visibilityOf, updateDetection } from './vision.js';
import { Guard } from './guard.js';
import { Player } from './player.js';
import { SoundEngine } from './audio.js';
import { Hud } from './hud.js';
import { drawScene } from './render.js';

// Any uncaught error renames the page, so a headless check can see it.
window.addEventListener('error', (event) => {
  document.title = `ERROR: ${event.message}`;
});

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
canvas.width = COLS * TILE;
canvas.height = ROWS * TILE;

const sound = new SoundEngine();
const hud = new Hud();
const lamps = lampPositions();

let player = null;
let guards = [];
let gems = [];
let keys = new Set();
let noises = [];
let state = 'start'; // 'start' | 'playing' | 'won' | 'lost'
let elapsed = 0;
let frozen = false;
let lastTimestamp = 0;
let stepSoundTimer = 0;

/** Build a fresh run: thief at the door, guards on their routes, gems reset. */
function resetRun() {
  player = new Player(playerStart());
  guards = GUARD_PATROLS.map((patrol) => new Guard(patrol));
  gems = gemPositions();
  noises = [];
  elapsed = 0;
  stepSoundTimer = 0;
}

/** Read a staged screenshot scene from the URL (?shot=...) and freeze it. */
function applyShotMode() {
  const shot = new URLSearchParams(window.location.search).get('shot');
  if (shot === null) return;
  resetRun();
  state = 'playing';
  frozen = true;
  if (shot === 'patrol') {
    player.x = 3.5 * TILE;
    player.y = 9.5 * TILE;
    guards[0].x = 8 * TILE;
    guards[0].y = 6 * TILE;
    guards[0].facing = Math.PI;
    guards[1].x = 13 * TILE;
    guards[1].y = 8 * TILE;
    guards[1].facing = Math.PI / 2;
  } else if (shot === 'alert') {
    player.x = 12.5 * TILE;
    player.y = 2.5 * TILE;
    player.running = true;
    guards[2].x = 15 * TILE;
    guards[2].y = 2.5 * TILE;
    guards[2].facing = Math.PI;
    guards[2].suspicion = 82;
    guards[2].state = 'suspicious';
    guards[2].lookTimer = 2;
    guards[1].x = 13 * TILE;
    guards[1].y = 6 * TILE;
    guards[1].facing = -Math.PI / 2;
    guards[1].suspicion = 45;
    guards[1].state = 'suspicious';
    guards[1].lookTimer = 2;
  } else if (shot === 'exit') {
    player.x = 19.5 * TILE;
    player.y = 3.5 * TILE;
    player.gems = 2;
    gems[0].taken = true;
    gems[1].taken = true;
    guards[2].x = 15 * TILE;
    guards[2].y = 1.5 * TILE;
    guards[2].facing = 0;
    guards[0].x = 8 * TILE;
    guards[0].y = 6 * TILE;
    guards[0].facing = Math.PI / 2;
  } else {
    // 'cover': the opening view — thief at the door, guards on patrol.
    player.x = 3.5 * TILE;
    player.y = 12.5 * TILE;
    guards[0].x = 8 * TILE;
    guards[0].y = 6 * TILE;
    guards[0].facing = 0;
    guards[1].x = 13 * TILE;
    guards[1].y = 4 * TILE;
    guards[1].facing = Math.PI / 2;
    guards[2].x = 16 * TILE;
    guards[2].y = 1.5 * TILE;
    guards[2].facing = Math.PI;
  }
  hud.hideScreens();
  refreshHud();
}

/** Push the current run into the top bar. */
function refreshHud() {
  const maxSuspicion = guards.reduce((m, g) => Math.max(m, g.suspicion), 0);
  const anyChase = guards.some((g) => g.state === 'chase');
  const status = anyChase ? 'ALARM — RUN!' : 'Reach the green EXIT unseen';
  hud.update({
    gems: player.gems,
    gemsTotal: gems.length,
    seconds: elapsed,
    status,
    maxSuspicion,
  });
}

/** The thief's rating for a finished run. */
function ratingFor() {
  if (!player.everSpotted && player.gems === gems.length) return 'GHOST — never seen, every gem taken';
  if (!player.everChased) return 'SHADOW — slipped past them all';
  return 'SPOTTED — loud, but out alive';
}

/** One simulation step. */
function update(dt) {
  elapsed += dt;
  const noise = player.update(dt, keys);
  if (noise !== null) noises.push({ ...noise, age: 0, life: 0.6 });
  for (const noiseRing of noises) noiseRing.age += dt;
  noises = noises.filter((n) => n.age < n.life);

  if (player.moving) {
    stepSoundTimer -= dt;
    if (stepSoundTimer <= 0) {
      sound.footstep(player.running);
      stepSoundTimer = player.running ? 0.3 : 0.45;
    }
  }

  if (noise !== null) {
    for (const guard of guards) {
      if (guard.state === 'patrol' || guard.state === 'return') {
        const dx = guard.x - noise.x;
        const dy = guard.y - noise.y;
        if (Math.hypot(dx, dy) < noise.radius + 40) guard.investigatePoint(noise);
      }
    }
  }

  let anyChase = false;
  for (const guard of guards) {
    const visibility = visibilityOf(guard, player, lamps);
    if (visibility > 0) guard.lastSeen = { x: player.x, y: player.y };
    const spotted = updateDetection(guard, visibility, dt);
    if (spotted) {
      guard.startChase({ x: player.x, y: player.y });
      player.everSpotted = true;
      player.everChased = true;
    }
    if (guard.suspicion >= 55 && guard.state === 'patrol') {
      // A guard that is more than half sure stops patrolling and stares at
      // the spot — the player's warning before a full chase.
      guard.state = 'suspicious';
      guard.lookTimer = 2.5;
    }
    if (guard.state === 'chase') anyChase = true;
    const result = guard.update(dt, player, visibility > 0.25);
    if (result === 'caught') {
      endRun(false, 'A guard grabbed you in the gallery.');
      return;
    }
  }
  if (anyChase) sound.startAlarm();
  else sound.stopAlarm();

  for (const gem of gems) {
    if (!gem.taken && Math.hypot(player.x - gem.x, player.y - gem.y) < 26) {
      gem.taken = true;
      player.gems += 1;
      sound.pickup();
    }
  }

  if (player.onExit) {
    endRun(true, '');
    return;
  }
  refreshHud();
}

/** Finish a run and show its screen. */
function endRun(won, reason) {
  sound.stopAlarm();
  if (won) {
    state = 'won';
    sound.win();
    const mins = Math.floor(elapsed / 60);
    const secs = Math.floor(elapsed % 60);
    hud.showWin(
      `Out in ${mins}:${String(secs).padStart(2, '0')} — ${player.gems}/${gems.length} gems. ${ratingFor()}.`,
    );
  } else {
    state = 'lost';
    sound.caught();
    hud.showLose(reason);
  }
}

/** The frame loop: simulate, then draw. */
function frame(timestamp) {
  const dt = Math.min(0.05, (timestamp - lastTimestamp) / 1000 || 0);
  lastTimestamp = timestamp;
  if (state === 'playing' && !frozen) update(dt);
  drawScene(ctx, player, guards, gems, noises, timestamp / 1000);
  requestAnimationFrame(frame);
}

function startGame() {
  sound.unlock();
  resetRun();
  state = 'playing';
  hud.hideScreens();
  refreshHud();
}

document.getElementById('btn-start').addEventListener('click', startGame);
document.getElementById('btn-again-win').addEventListener('click', startGame);
document.getElementById('btn-again-lose').addEventListener('click', startGame);
document.getElementById('btn-sound').addEventListener('click', (event) => {
  sound.unlock();
  const on = sound.toggle();
  event.currentTarget.textContent = on ? '🔊 Sound on' : '🔇 Sound off';
});
document.getElementById('btn-restart').addEventListener('click', startGame);

window.addEventListener('keydown', (event) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
    event.preventDefault();
  }
  sound.unlock();
  keys.add(event.code);
  if (event.code === 'Enter' && (state === 'start' || state === 'won' || state === 'lost')) startGame();
  if (event.code === 'KeyR' && state !== 'start') startGame();
});
window.addEventListener('keyup', (event) => keys.delete(event.code));
window.addEventListener('blur', () => keys.clear());
canvas.addEventListener('click', () => sound.unlock());

resetRun();
applyShotMode();
if (state === 'start') hud.showStart();
refreshHud();
requestAnimationFrame(frame);
