// main.ts — hands the Nightshade Gallery entry in: copies game/ and
// screenshots/ into the output directory and writes dossier.json with
// buildDossier from vendor/makefun-game.ts. Standard library only, and
// deterministic: two runs write the same bytes.

import { buildDossier } from './vendor/makefun-game.ts';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTreeIntoOutput(name: string): void {
  const source = join(repoRoot, name);
  if (!existsSync(source)) {
    throw new Error(`main.ts: ${name}/ is missing from the repository`);
  }
  cpSync(source, join(outputDir, name), { recursive: true });
}

if (existsSync(outputDir)) {
  rmSync(outputDir, { recursive: true, force: true });
}
mkdirSync(outputDir, { recursive: true });

copyTreeIntoOutput('game');
copyTreeIntoOutput('screenshots');

const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
console.log(`stealth-game: wrote ${outputDir}/ (game/ + screenshots/ + dossier.json, ${dossier.length} bytes)`);
