# Nightshade Gallery — a stealth game

[![Stealth game](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![Rank](https://make.fun/badge/best-stealth-game-20261121-1759/adhiejoey/makefun-stealth-game/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![Reward](https://make.fun/badge/best-stealth-game-20261121-1759/adhiejoey/makefun-stealth-game/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)

An original top-down stealth game for the [best stealth game bounty](https://make.fun/bounty/best-stealth-game-20261121-1759) on make.fun. You are a thief in a moonlit gallery: slip past three patrolling watchmen, pocket the gems, and reach the green EXIT without being seen.

## How to play

Serve `game/` with any static server and open `index.html` in a desktop browser. No network, no build step, no libraries — just local files.

- **WASD / arrow keys** — move
- **Shift** — run (faster, but loud: running leaves noise rings guards come to check)
- **R** — restart the run · **Enter** — start

Stay out of the guards' yellow vision cones. A cone turns red when a guard is hunting you. If a guard loses sight of you for a few seconds it gives up and goes back to patrol — so breaking line of sight is how you recover. Bushes hide you; crates and walls block sight. Lamps light pools where you are easier to spot. Grab all three gems for the GHOST rating.

## What is inside

- `game/level.js` — the gallery floor plan, collision and guard pathfinding
- `game/vision.js` — vision cones, line of sight and the detection meter
- `game/guard.js` — patrol, suspicion, chase, investigate and give-up states
- `game/player.js` — the thief: quiet walk, loud run, noise rings
- `game/audio.js` — procedural WebAudio sounds (footsteps, alarm, pickups)
- `game/render.js` — floor, cover, lamps, cones, guards and night lighting
- `game/hud.js` — the HUD and the start / win / lose screens
- `game/main.js` — boot, input, game loop and the win/lose flow

`screenshots/` holds four real renders of the game taken in headless Chromium:
the full level at the start, a patrol scene, a guard going suspicious, and the
thief closing in on the exit. The game also accepts `?shot=cover|patrol|alert|exit`
to stage those exact scenes (frozen, for screenshots only).

## License

MIT — see `LICENSE`.
