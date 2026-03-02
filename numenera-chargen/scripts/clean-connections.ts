import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FOCI_FILE = path.resolve(__dirname, '../src/data/foci.json');

const foci = JSON.parse(fs.readFileSync(FOCI_FILE, 'utf8'));

for (const f of foci) {
  if (!f.connections) continue;

  // Clean each connection: strip bleeding section text after newlines
  f.connections = f.connections.map((c: string) => {
    // Cut at section headers that bleed in
    const cut = c.match(
      /^(.+?)(?:\n-MORE-|\nAdditional Equipment|\nFire Powers|\nDarkness Powers|\nIce Powers|\nElectricity Powers|\nMagnetic Powers|\nBeast Powers|\nPhase Powers|\nMoon Powers|\nGravity Powers|\nMind Powers|\nWeapon Powers|\nDefense Powers|\nSilver Tongue|\nMachine Powers|\nAlleys Powers|\nMurder Powers|\nRage Powers|\nLightning Powers|\nPanache Powers|\nWilderness Powers|\nPrecision Powers)/is
    );
    if (cut) return cut[1].trim();
    // Otherwise just first paragraph
    return c.split('\n')[0].trim();
  }).filter((c: string) => c.length > 10);

  // Deduplicate
  f.connections = [...new Set(f.connections)];
}

fs.writeFileSync(FOCI_FILE, JSON.stringify(foci, null, 2) + '\n');

for (const f of foci) {
  console.log(`${f.name}: ${f.connections?.length ?? 0} connections`);
}
