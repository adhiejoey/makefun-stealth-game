// vision.js — what a guard can see: vision cones, line of sight and the
// detection meter. A cone is a fan of rays clipped by walls, so cover really
// blocks sight; detection fills faster up close, in lamplight and while the
// player runs, and much slower when the player hides in a bush.

import { TILE, isSolidTile, isBushAtPx } from './level.js';

export const CONE_RANGE = 260;
export const CONE_HALF_ANGLE = (38 * Math.PI) / 180;
export const CONE_RAYS = 26;

/** Shortest signed angle from `from` to `to`, in (-PI, PI]. */
export function angleDifference(from, to) {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

/** Distance between two points. */
export function distanceBetween(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

/**
 * Whether a straight line between two points crosses no solid tile.
 * Samples the segment every 6 px — cheap and tight enough for a 48 px tile.
 */
export function hasLineOfSight(x1, y1, x2, y2) {
  const dist = distanceBetween(x1, y1, x2, y2);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    if (isSolidTile(Math.floor(x / TILE), Math.floor(y / TILE))) return false;
  }
  return true;
}

/**
 * The guard's vision cone as a polygon: the guard's position plus one point
 * per ray, each ray marched until it hits a wall or the cone's range.
 */
export function computeVisionCone(guard) {
  const points = [{ x: guard.x, y: guard.y }];
  for (let i = 0; i <= CONE_RAYS; i++) {
    const a = guard.facing - CONE_HALF_ANGLE + (2 * CONE_HALF_ANGLE * i) / CONE_RAYS;
    points.push(castVisionRay(guard.x, guard.y, a));
  }
  return points;
}

/** March one ray until a wall or the cone's range; returns the hit point. */
function castVisionRay(x, y, angle) {
  const step = 8;
  for (let d = step; d <= CONE_RANGE; d += step) {
    const px = x + Math.cos(angle) * d;
    const py = y + Math.sin(angle) * d;
    if (isSolidTile(Math.floor(px / TILE), Math.floor(py / TILE))) {
      return { x: px, y: py };
    }
  }
  return { x: x + Math.cos(angle) * CONE_RANGE, y: y + Math.sin(angle) * CONE_RANGE };
}

/**
 * How visible the player is to this guard right now, 0 when unseen:
 * 0..1 that grows with closeness. Returns 0 outside the cone or behind a wall.
 * A player crouched in a bush is nearly invisible unless the guard is close.
 */
export function visibilityOf(guard, player, lamps) {
  const dist = distanceBetween(guard.x, guard.y, player.x, player.y);
  if (dist > CONE_RANGE) return 0;
  const angleToPlayer = Math.atan2(player.y - guard.y, player.x - guard.x);
  if (Math.abs(angleDifference(guard.facing, angleToPlayer)) > CONE_HALF_ANGLE) return 0;
  if (!hasLineOfSight(guard.x, guard.y, player.x, player.y)) return 0;
  let visibility = 1 - dist / CONE_RANGE;
  if (player.running) visibility *= 1.35;
  if (isBushAtPx(player.x, player.y)) {
    visibility *= dist < 90 ? 0.45 : 0.12;
  }
  if (isInLamplight(player.x, player.y, lamps)) visibility *= 1.3;
  return Math.min(1, Math.max(0, visibility));
}

/** Whether a point stands inside any lamp's pool of light. */
export function isInLamplight(x, y, lamps) {
  for (const lamp of lamps) {
    if (distanceBetween(x, y, lamp.x, lamp.y) < 110) return true;
  }
  return false;
}

/**
 * Advance one guard's suspicion meter (0..100) for a frame.
 * Seeing the player fills it (about 1.1 s at point blank, ~4 s at the cone's
 * edge); losing sight drains it, slowly at first so a near miss still stings.
 * Returns true on the frame the meter first hits 100 (the guard spots you).
 */
export function updateDetection(guard, visibility, dt) {
  if (visibility > 0) {
    // The caller keeps guard.lastSeen fresh while the player is visible.
    // Fill grows steeply with visibility: point blank spots you in about a
    // second, the cone's edge or a bush takes half a minute — so a glimpse
    // is a warning, not a sentence.
    const before = guard.suspicion;
    guard.suspicion = Math.min(100, guard.suspicion + 95 * Math.pow(visibility, 1.6) * dt);
    return before < 100 && guard.suspicion >= 100;
  }
  guard.suspicion = Math.max(0, guard.suspicion - 14 * dt);
  return false;
}
