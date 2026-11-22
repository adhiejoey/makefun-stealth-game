// level.js — the gallery floor plan: walls, crates, bushes, gems, exit and lamps.
// Pure data and grid math only (no DOM), so it can be tested in Node.
// Tile legend: '#' wall, '.' floor, 'C' crate (solid cover), 'B' bush (soft cover),
// 'E' exit door, 'G' gem, 'P' player start.

export const TILE = 48;
export const COLS = 24;
export const ROWS = 15;

const GRID = [
  '########################',
  '#....C.....#....G...E..#',
  '#......................#',
  '#.####.....#..####..##.#',
  '#..........#...........#',
  '#..C....B..#..C....B...#',
  '#......................#',
  '#.####..####..####..##.#',
  '#..........#...........#',
  '#..B....C..#..B....C...#',
  '#......................#',
  '#.####.....#..####..##.#',
  '#..........#...........#',
  '#..P....G..#..C....G...#',
  '########################',
];

export const LAMP_TILES = [
  { col: 6, row: 1 },
  { col: 18, row: 5 },
  { col: 6, row: 9 },
  { col: 18, row: 11 },
];

export const GUARD_PATROLS = [
  {
    name: 'Rook',
    waypoints: [
      { col: 6, row: 6 },
      { col: 10, row: 6 },
      { col: 10, row: 2 },
      { col: 6, row: 2 },
    ],
  },
  {
    name: 'Bishop',
    waypoints: [
      { col: 13, row: 2 },
      { col: 13, row: 12 },
      { col: 18, row: 12 },
      { col: 18, row: 2 },
    ],
  },
  {
    name: 'Knight',
    waypoints: [
      { col: 13, row: 1 },
      { col: 19, row: 1 },
      { col: 19, row: 4 },
      { col: 13, row: 4 },
    ],
  },
];

/** Tile character at a grid cell; out of bounds counts as a wall. */
export function tileAt(col, row) {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return '#';
  return GRID[row][col];
}

/** Whether a grid cell blocks movement and sight. */
export function isSolidTile(col, row) {
  const t = tileAt(col, row);
  return t === '#' || t === 'C';
}

/** Whether a pixel point stands inside a bush (soft cover: hides the player). */
export function isBushAtPx(x, y) {
  const col = Math.floor(x / TILE);
  const row = Math.floor(y / TILE);
  return tileAt(col, row) === 'B';
}

/** Whether a pixel point stands inside the exit doorway. */
export function isExitAtPx(x, y) {
  const col = Math.floor(x / TILE);
  const row = Math.floor(y / TILE);
  return tileAt(col, row) === 'E';
}

/** Pixel centre of a grid cell. */
export function tileCenter(col, row) {
  return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 };
}

/** Pixel centres of every lamp in the level. */
export function lampPositions() {
  return LAMP_TILES.map(({ col, row }) => tileCenter(col, row));
}

/** Starting pixel position of the player. */
export function playerStart() {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (tileAt(col, row) === 'P') return tileCenter(col, row);
    }
  }
  return tileCenter(1, 1);
}

/** Pixel centres of every gem in the level, in reading order. */
export function gemPositions() {
  const gems = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (tileAt(col, row) === 'G') gems.push({ ...tileCenter(col, row), taken: false });
    }
  }
  return gems;
}

/** Pixel centre of the exit door. */
export function exitPosition() {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (tileAt(col, row) === 'E') return tileCenter(col, row);
    }
  }
  return tileCenter(COLS - 2, 1);
}

/**
 * Move a circle (x, y, radius) by (dx, dy), sliding along solid tiles instead of
 * sticking on corners. Returns the resolved position.
 */
export function moveCircle(x, y, radius, dx, dy) {
  let nx = x + dx;
  if (hitsSolid(nx, y, radius)) nx = x;
  let ny = y + dy;
  if (hitsSolid(nx, ny, radius)) ny = y;
  return { x: nx, y: ny };
}

/** Whether a circle at (x, y) overlaps any solid tile. */
function hitsSolid(x, y, radius) {
  const col0 = Math.floor((x - radius) / TILE);
  const col1 = Math.floor((x + radius) / TILE);
  const row0 = Math.floor((y - radius) / TILE);
  const row1 = Math.floor((y + radius) / TILE);
  for (let row = row0; row <= row1; row++) {
    for (let col = col0; col <= col1; col++) {
      if (isSolidTile(col, row)) return true;
    }
  }
  return false;
}

/**
 * Breadth-first path over walkable tiles, from one tile to another.
 * Returns a list of tile centres (excluding the start tile) or null when blocked.
 * Guards use it to chase and to investigate a noise without getting stuck.
 */
export function findPath(fromCol, fromRow, toCol, toRow) {
  if (isSolidTile(toCol, toRow)) return null;
  const key = (c, r) => `${c},${r}`;
  const prev = new Map();
  const queue = [{ col: fromCol, row: fromRow }];
  prev.set(key(fromCol, fromRow), null);
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur.col === toCol && cur.row === toRow) {
      const path = [];
      let node = cur;
      while (node !== null) {
        path.unshift(tileCenter(node.col, node.row));
        node = prev.get(key(node.col, node.row));
      }
      path.shift();
      return path;
    }
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = cur.col + dc;
      const nr = cur.row + dr;
      if (isSolidTile(nc, nr)) continue;
      if (prev.has(key(nc, nr))) continue;
      prev.set(key(nc, nr), cur);
      queue.push({ col: nc, row: nr });
    }
  }
  return null;
}

/** Quick sanity check: every floor tile reachable from the player start. */
export function levelIsConnected() {
  const start = playerStart();
  const sc = Math.floor(start.x / TILE);
  const sr = Math.floor(start.y / TILE);
  const seen = new Set([`${sc},${sr}`]);
  const queue = [{ col: sc, row: sr }];
  while (queue.length > 0) {
    const cur = queue.shift();
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = cur.col + dc;
      const nr = cur.row + dr;
      const k = `${nc},${nr}`;
      if (seen.has(k) || isSolidTile(nc, nr)) continue;
      seen.add(k);
      queue.push({ col: nc, row: nr });
    }
  }
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const t = tileAt(col, row);
      if ((t === '.' || t === 'B' || t === 'G' || t === 'E' || t === 'P') && !seen.has(`${col},${row}`)) {
        return false;
      }
    }
  }
  // Every guard's patrol waypoint must be reachable too, or a guard would
  // walk its route through a wall.
  for (const patrol of GUARD_PATROLS) {
    for (const w of patrol.waypoints) {
      if (!seen.has(`${w.col},${w.row}`)) return false;
    }
  }
  return true;
}
