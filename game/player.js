// player.js — the thief. Walks quietly on WASD or arrow keys, runs loud on
// Shift, and leaves a fading noise ring while running that guards can hear.
// Hiding in a bush makes the thief much harder to spot.

import { TILE, moveCircle, isBushAtPx, isExitAtPx } from './level.js';

export const PLAYER_RADIUS = 14;
export const WALK_SPEED = 150;
export const RUN_SPEED = 255;
export const NOISE_RADIUS = 150;

export class Player {
  constructor(start) {
    this.x = start.x;
    this.y = start.y;
    this.radius = PLAYER_RADIUS;
    this.facing = -Math.PI / 2;
    this.running = false;
    this.moving = false;
    this.noiseTimer = 0;
    this.stepPhase = 0;
    this.gems = 0;
    this.everChased = false;
    this.everSpotted = false;
  }

  /** Whether the thief currently stands hidden inside a bush. */
  get hiddenInBush() {
    return isBushAtPx(this.x, this.y);
  }

  /** Whether the thief stands on the exit door. */
  get onExit() {
    return isExitAtPx(this.x, this.y);
  }

  /**
   * One simulation step. `keys` is the set of currently pressed key codes.
   * Returns a noise event ({x, y, radius}) when a running footstep rings out,
   * or null.
   */
  update(dt, keys) {
    let dx = 0;
    let dy = 0;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) dx -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) dx += 1;
    if (keys.has('KeyW') || keys.has('ArrowUp')) dy -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) dy += 1;
    this.moving = dx !== 0 || dy !== 0;
    this.running = this.moving && (keys.has('ShiftLeft') || keys.has('ShiftRight'));
    if (!this.moving) {
      this.noiseTimer = 0;
      return null;
    }
    const len = Math.hypot(dx, dy);
    dx /= len;
    dy /= len;
    const speed = this.running ? RUN_SPEED : WALK_SPEED;
    const moved = moveCircle(this.x, this.y, this.radius, dx * speed * dt, dy * speed * dt);
    this.x = moved.x;
    this.y = moved.y;
    this.facing = Math.atan2(dy, dx);
    this.stepPhase += dt * (this.running ? 11 : 7);
    if (!this.running) return null;
    this.noiseTimer -= dt;
    if (this.noiseTimer <= 0) {
      this.noiseTimer = 0.34;
      // Running through a bush muffles the steps: half the noise radius.
      const radius = this.hiddenInBush ? NOISE_RADIUS / 2 : NOISE_RADIUS;
      return { x: this.x, y: this.y, radius };
    }
    return null;
  }
}
