// render.js — everything the player sees: the stone floor, walls, crates and
// bushes you can read at a glance, the glowing exit, the lamps' pools of
// light, each guard's vision cone, and the darkness that shows what is safe.
// Cones are drawn over the darkness so a cone's colour always reads.

import { TILE, COLS, ROWS, tileAt, lampPositions } from './level.js';
import { computeVisionCone } from './vision.js';

const FLOOR_A = '#2a2f45';
const FLOOR_B = '#262b40';
const WALL_FILL = '#171a28';
const WALL_TOP = '#3d4364';

/** Draw one frame of the level, the actors and the lighting. */
export function drawScene(ctx, player, guards, gems, noises, time) {
  const width = COLS * TILE;
  const height = ROWS * TILE;
  ctx.clearRect(0, 0, width, height);
  drawFloor(ctx);
  drawCoverAndExit(ctx, gems, time);
  drawLamps(ctx, time);
  // Night falls over the floor and the lamps, but the actors and their cones
  // are drawn after it so they always read clearly.
  drawDarkness(ctx, width, height);
  drawNoiseRings(ctx, noises);
  drawPlayer(ctx, player, time);
  for (const guard of guards) {
    drawVisionCone(ctx, guard);
    drawGuard(ctx, guard, time);
  }
}

/** Checkerboard stone floor with a faint vignette of wear. */
function drawFloor(ctx) {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      ctx.fillStyle = (col + row) % 2 === 0 ? FLOOR_A : FLOOR_B;
      ctx.fillRect(col * TILE, row * TILE, TILE, TILE);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
      ctx.strokeRect(col * TILE + 0.5, row * TILE + 0.5, TILE, TILE);
    }
  }
}

/** Walls, crates, bushes, gems and the exit door. */
function drawCoverAndExit(ctx, gems, time) {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const t = tileAt(col, row);
      const x = col * TILE;
      const y = row * TILE;
      if (t === '#') {
        ctx.fillStyle = WALL_FILL;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = WALL_TOP;
        ctx.fillRect(x, y, TILE, 5);
      } else if (t === 'C') {
        drawCrate(ctx, x, y);
      } else if (t === 'B') {
        drawBush(ctx, x, y, time);
      } else if (t === 'E') {
        drawExitDoor(ctx, x, y, time);
      }
    }
  }
  for (const gem of gems) {
    if (gem.taken) continue;
    drawGem(ctx, gem.x, gem.y, time);
  }
}

/** A wooden crate: solid cover you can duck behind. */
function drawCrate(ctx, x, y) {
  ctx.fillStyle = '#6b4a2b';
  ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
  ctx.strokeStyle = '#4a3018';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
  ctx.beginPath();
  ctx.moveTo(x + 3, y + 3);
  ctx.lineTo(x + TILE - 3, y + TILE - 3);
  ctx.moveTo(x + TILE - 3, y + 3);
  ctx.lineTo(x + 3, y + TILE - 3);
  ctx.stroke();
}

/** A leafy bush: soft cover — stand inside it and guards barely see you. */
function drawBush(ctx, x, y, time) {
  const sway = Math.sin(time * 1.4 + x * 0.05) * 1.5;
  ctx.fillStyle = 'rgba(46, 125, 62, 0.9)';
  for (const [dx, dy, r] of [[12, 14, 13], [30, 10, 15], [36, 28, 13], [14, 32, 12], [24, 22, 15]]) {
    ctx.beginPath();
    ctx.arc(x + dx + sway, y + dy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(120, 200, 110, 0.85)';
  for (const [dx, dy, r] of [[16, 14, 5], [30, 26, 5], [34, 12, 4]]) {
    ctx.beginPath();
    ctx.arc(x + dx + sway, y + dy, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The exit: a green doorway that pulses, with a lit EXIT sign above it. */
function drawExitDoor(ctx, x, y, time) {
  const pulse = 0.55 + 0.25 * Math.sin(time * 3);
  const glow = ctx.createRadialGradient(x + TILE / 2, y + TILE / 2, 4, x + TILE / 2, y + TILE / 2, 44);
  glow.addColorStop(0, `rgba(80, 255, 150, ${pulse})`);
  glow.addColorStop(1, 'rgba(80, 255, 150, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - 20, y - 20, TILE + 40, TILE + 40);
  ctx.fillStyle = '#0d3b22';
  ctx.fillRect(x + 8, y + 4, TILE - 16, TILE - 8);
  ctx.fillStyle = '#4dff9d';
  ctx.fillRect(x + 14, y + 10, TILE - 28, TILE - 20);
  ctx.fillStyle = '#0d3b22';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', x + TILE / 2, y - 6);
}

/** A pocketable gem: a cyan diamond that bobs and sparkles. */
function drawGem(ctx, x, y, time) {
  const bob = Math.sin(time * 2.5 + x) * 3;
  const glow = ctx.createRadialGradient(x, y + bob, 2, x, y + bob, 26);
  glow.addColorStop(0, 'rgba(120, 240, 255, 0.9)');
  glow.addColorStop(1, 'rgba(120, 240, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - 26, y + bob - 26, 52, 52);
  ctx.fillStyle = '#7df3ff';
  ctx.beginPath();
  ctx.moveTo(x, y + bob - 11);
  ctx.lineTo(x + 9, y + bob);
  ctx.lineTo(x, y + bob + 11);
  ctx.lineTo(x - 9, y + bob);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(x, y + bob - 6);
  ctx.lineTo(x + 4, y + bob - 1);
  ctx.lineTo(x, y + bob + 3);
  ctx.lineTo(x - 4, y + bob - 1);
  ctx.closePath();
  ctx.fill();
}

/** Warm lamp glows on the floor (the darkness overlay later cuts holes here). */
function drawLamps(ctx, time) {
  const flicker = 0.9 + 0.1 * Math.sin(time * 7);
  for (const lamp of lampPositions()) {
    const glow = ctx.createRadialGradient(lamp.x, lamp.y, 6, lamp.x, lamp.y, 110);
    glow.addColorStop(0, `rgba(255, 214, 130, ${0.5 * flicker})`);
    glow.addColorStop(1, 'rgba(255, 214, 130, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(lamp.x - 110, lamp.y - 110, 220, 220);
    ctx.fillStyle = '#ffd782';
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a5a1e';
    ctx.fillRect(lamp.x - 2, lamp.y - 12, 4, 6);
  }
}

/** Expanding rings where running footsteps rang out. */
function drawNoiseRings(ctx, noises) {
  for (const noise of noises) {
    const age = noise.age / noise.life;
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.55 * (1 - age)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(noise.x, noise.y, 12 + age * noise.radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/** The thief: a hooded figure in a dark cloak with a teal trim. */
function drawPlayer(ctx, player, time) {
  const bob = player.moving ? Math.sin(player.stepPhase) * 1.5 : 0;
  ctx.save();
  ctx.translate(player.x, player.y + bob);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 12, 13, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1c2438';
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#35e0c0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#35e0c0';
  ctx.beginPath();
  ctx.arc(Math.cos(player.facing) * 6, Math.sin(player.facing) * 6, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8ecff';
  ctx.beginPath();
  ctx.arc(Math.cos(player.facing) * 6, Math.sin(player.facing) * 6, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A guard's vision cone, clipped by walls, coloured by its state. */
function drawVisionCone(ctx, guard) {
  const cone = computeVisionCone(guard);
  ctx.fillStyle = guard.coneColor();
  ctx.beginPath();
  ctx.moveTo(cone[0].x, cone[0].y);
  for (let i = 1; i < cone.length; i++) ctx.lineTo(cone[i].x, cone[i].y);
  ctx.closePath();
  ctx.fill();
}

/** A guard: a uniformed watchman with a helmet, a facing tick and a ? or !. */
function drawGuard(ctx, guard, time) {
  const bob = Math.sin(guard.walkPhase) * 1.2;
  ctx.save();
  ctx.translate(guard.x, guard.y + bob);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 13, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  const body = guard.state === 'chase' ? '#7a1f1f' : guard.state === 'patrol' ? '#3a4a6b' : '#6b5a1e';
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d8deff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#20263a';
  ctx.beginPath();
  ctx.arc(0, -3, 9, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.arc(Math.cos(guard.facing) * 7, Math.sin(guard.facing) * 7 - 1, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  const mark = guard.alertMark();
  if (mark !== '') {
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = mark === '!' ? '#ff5252' : '#ffd640';
    ctx.fillText(mark, guard.x, guard.y - 24);
  }
  if (guard.suspicion > 1 && guard.state !== 'chase') {
    const w = 34;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(guard.x - w / 2, guard.y - 40, w, 5);
    ctx.fillStyle = guard.suspicion > 60 ? '#ff5252' : '#ffd640';
    ctx.fillRect(guard.x - w / 2, guard.y - 40, (w * guard.suspicion) / 100, 5);
  }
}

/**
 * Night darkness, painted on an offscreen layer: the floor dims, and a hole
 * is punched at every lamp so its pool of light stays bright. The layer is
 * then laid over the scene — never drawn with destination-out on the main
 * canvas, which would erase the game itself.
 */
const darknessLayer = document.createElement('canvas');
function drawDarkness(ctx, width, height) {
  darknessLayer.width = width;
  darknessLayer.height = height;
  const layer = darknessLayer.getContext('2d');
  layer.clearRect(0, 0, width, height);
  layer.fillStyle = 'rgba(5, 8, 20, 0.5)';
  layer.fillRect(0, 0, width, height);
  layer.globalCompositeOperation = 'destination-out';
  for (const lamp of lampPositions()) {
    const hole = layer.createRadialGradient(lamp.x, lamp.y, 10, lamp.x, lamp.y, 115);
    hole.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
    hole.addColorStop(1, 'rgba(0, 0, 0, 0)');
    layer.fillStyle = hole;
    layer.fillRect(lamp.x - 115, lamp.y - 115, 230, 230);
  }
  layer.globalCompositeOperation = 'source-over';
  ctx.drawImage(darknessLayer, 0, 0);
}
