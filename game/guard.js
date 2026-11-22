// guard.js — the gallery watchmen. A guard patrols a fixed route, grows
// suspicious when something catches its eye, chases a spotted thief, walks
// over to investigate a noise, and gives up and goes back to patrol when the
// trail goes cold — so a player who breaks line of sight can recover.

import { TILE, tileCenter, findPath } from './level.js';
import { angleDifference, distanceBetween } from './vision.js';

export const GUARD_PATROL_SPEED = 62;
export const GUARD_CHASE_SPEED = 168;
export const GUARD_INVESTIGATE_SPEED = 105;

const STATE = {
  PATROL: 'patrol',
  SUSPICIOUS: 'suspicious',
  CHASE: 'chase',
  INVESTIGATE: 'investigate',
  RETURN: 'return',
};

export class Guard {
  constructor(patrol) {
    this.name = patrol.name;
    this.waypoints = patrol.waypoints.map((w) => tileCenter(w.col, w.row));
    this.waypointIndex = 0;
    this.x = this.waypoints[0].x;
    this.y = this.waypoints[0].y;
    this.facing = 0;
    this.state = STATE.PATROL;
    this.suspicion = 0;
    this.lastSeen = { x: this.x, y: this.y };
    this.path = [];
    this.pathTarget = null;
    this.lostTimer = 0;
    this.lookTimer = 0;
    this.pauseTimer = 0;
    this.walkPhase = 0;
  }

  /** Cone colour for this guard's state: calm blue, wary yellow, hunting red. */
  coneColor() {
    if (this.state === STATE.CHASE) return 'rgba(255, 64, 64, 0.30)';
    if (this.state === STATE.SUSPICIOUS || this.state === STATE.INVESTIGATE) return 'rgba(255, 214, 64, 0.26)';
    return 'rgba(255, 236, 140, 0.20)';
  }

  /** The mark floating over the guard's head: '?' when wary, '!' when hunting. */
  alertMark() {
    if (this.state === STATE.CHASE) return '!';
    if (this.state === STATE.SUSPICIOUS || this.state === STATE.INVESTIGATE) return '?';
    return '';
  }

  /** Send this guard to look at a point (a noise, or the last place it saw you). */
  investigatePoint(point) {
    const col = Math.floor(point.x / TILE);
    const row = Math.floor(point.y / TILE);
    const path = findPath(Math.floor(this.x / TILE), Math.floor(this.y / TILE), col, row);
    if (path === null) return;
    this.path = path;
    this.pathTarget = point;
    this.state = STATE.INVESTIGATE;
    this.lookTimer = 0;
  }

  /** The guard caught a clear look at the player: give chase to the last seen spot. */
  startChase(seenPoint) {
    this.lastSeen = { x: seenPoint.x, y: seenPoint.y };
    this.lostTimer = 0;
    if (this.state !== STATE.CHASE) {
      this.state = STATE.CHASE;
      this.path = [];
    }
  }

  /** Give up the chase and walk back to the nearest patrol waypoint. */
  giveUpChase() {
    this.state = STATE.RETURN;
    this.suspicion = 30;
    this.lostTimer = 0;
    let best = 0;
    let bestDist = Infinity;
    this.waypoints.forEach((w, i) => {
      const d = distanceBetween(this.x, this.y, w.x, w.y);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    this.waypointIndex = best;
  }

  /** One simulation step: move, turn and change state. Returns 'caught' when the guard grabs the player. */
  update(dt, player, canSeePlayer) {
    this.walkPhase += dt * 6;
    if (this.state === STATE.CHASE) {
      if (canSeePlayer) {
        // Eyes on the thief: run straight at them; touching them ends the run.
        this.lastSeen = { x: player.x, y: player.y };
        this.lostTimer = 0;
        this.path = [];
        if (this.moveToward({ x: player.x, y: player.y }, GUARD_CHASE_SPEED, dt)) return 'caught';
        return null;
      }
      // Trail gone cold: follow the floor plan to the last seen spot, then look
      // around. Only the lost timer ends the chase — arriving at the spot does
      // not count as catching anyone.
      this.lostTimer += dt;
      if (this.lostTimer > 4) {
        this.giveUpChase();
        return null;
      }
      if (this.path.length === 0) {
        const path = findPath(
          Math.floor(this.x / TILE),
          Math.floor(this.y / TILE),
          Math.floor(this.lastSeen.x / TILE),
          Math.floor(this.lastSeen.y / TILE),
        );
        this.path = path ?? [];
        if (this.path.length === 0) {
          this.lostTimer = 4;
          return null;
        }
      }
      this.followPath(GUARD_CHASE_SPEED, dt);
      return null;
    }

    if (this.state === STATE.SUSPICIOUS) {
      this.lookTimer -= dt;
      this.facing += Math.sin(this.lookTimer * 2.2) * 1.6 * dt;
      if (this.suspicion >= 100) {
        this.startChase({ x: player.x, y: player.y });
      } else if (this.lookTimer <= 0 && this.suspicion < 25) {
        this.state = STATE.PATROL;
      }
      return null;
    }

    if (this.state === STATE.INVESTIGATE) {
      if (this.followPath(GUARD_INVESTIGATE_SPEED, dt)) {
        this.lookTimer += dt;
        this.facing += 1.8 * dt;
        if (this.lookTimer > 2.2) {
          this.state = STATE.RETURN;
          this.lookTimer = 0;
        }
      }
      return null;
    }

    if (this.state === STATE.RETURN) {
      const target = this.waypoints[this.waypointIndex];
      if (this.moveToward(target, GUARD_PATROL_SPEED, dt)) {
        this.state = STATE.PATROL;
      }
      return null;
    }

    // PATROL: walk the route, pausing briefly at each waypoint to look around.
    if (this.pauseTimer > 0) {
      this.pauseTimer -= dt;
      this.facing += 0.9 * dt;
      return null;
    }
    const target = this.waypoints[this.waypointIndex];
    if (this.moveToward(target, GUARD_PATROL_SPEED, dt)) {
      this.waypointIndex = (this.waypointIndex + 1) % this.waypoints.length;
      this.pauseTimer = 1.1;
    }
    return null;
  }

  /** Walk along the stored path (chase shortcut or investigation route). Returns true on arrival. */
  followPath(speed, dt) {
    if (this.path.length === 0) return true;
    const next = this.path[0];
    if (this.moveToward(next, speed, dt)) this.path.shift();
    return this.path.length === 0;
  }

  /**
   * Step toward a point, turning to face it. Returns true when close enough
   * to count as arrived (or, in a chase, when the player is grabbed).
   */
  moveToward(target, speed, dt) {
    const dist = distanceBetween(this.x, this.y, target.x, target.y);
    if (dist < 6) return true;
    const want = Math.atan2(target.y - this.y, target.x - this.x);
    this.facing += angleDifference(this.facing, want) * Math.min(1, 8 * dt);
    const step = Math.min(dist, speed * dt);
    this.x += Math.cos(this.facing) * step;
    this.y += Math.sin(this.facing) * step;
    return dist < 26;
  }
}
