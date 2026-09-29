// Writes every logo concept to /logos as standalone SVG files, plus favicon.svg.
// Run: node tools/export-logos.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { LOGOS, svgDoc } from '../js/logos-data.js';

const out = new URL('../logos/', import.meta.url);
mkdirSync(out, { recursive: true });
for (const l of LOGOS) {
  writeFileSync(new URL(`${l.id}-icon.svg`, out), svgDoc(l.mark('light'), '0 0 120 120', { standalone: true, title: l.name }));
  for (const t of ['light', 'dark']) {
    writeFileSync(new URL(`${l.id}-logo-${t}.svg`, out), svgDoc(l.lockup(t), l.lockupBox, { standalone: true, title: l.name }));
  }
}
writeFileSync(new URL('../favicon.svg', import.meta.url), svgDoc(LOGOS.find((l) => l.id === 'mosaic').mark('light'), '0 0 120 120', { title: "Johnny's Pool Services" }));
console.log('exported', LOGOS.length * 3, 'files');
