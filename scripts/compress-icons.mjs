import sharp from 'sharp';
import { statSync, renameSync, existsSync, unlinkSync } from 'fs';

const SRC = existsSync('assets/images/icon.png') ? 'assets/images/icon.png' : null;
if (!SRC) { console.error('Source icon not found'); process.exit(1); }

// icon-192: lossless truecolor PNG (already compressed, re-generate cleanly)
await sharp(SRC)
  .resize(192, 192, { fit: 'contain', background: { r: 8, g: 8, b: 8, alpha: 1 } })
  .png({ compressionLevel: 9, palette: false })
  .toFile('public/icon-192.png.tmp');

// icon-512: palette PNG 128 colors — ideal for logos (~20KB vs 384KB original)
await sharp(SRC)
  .resize(512, 512, { fit: 'contain', background: { r: 8, g: 8, b: 8, alpha: 1 } })
  .png({ compressionLevel: 9, palette: true, colors: 128 })
  .toFile('public/icon-512.png.tmp');

renameSync('public/icon-192.png.tmp', 'public/icon-192.png');
renameSync('public/icon-512.png.tmp', 'public/icon-512.png');

// Clean up any leftover temp files from previous runs
for (const f of ['palette256','palette128','palette64']) {
  const p = `public/icon-512-${f}.deleted`;
  try { unlinkSync(p); } catch { /* already gone */ }
}

const s192 = statSync('public/icon-192.png').size;
const s512 = statSync('public/icon-512.png').size;
console.log(`icon-192.png: ${(s192/1024).toFixed(1)}KB  (was 384KB)`);
console.log(`icon-512.png: ${(s512/1024).toFixed(1)}KB  (was 384KB)`);
console.log(`Total saved: ${((768*1024 - s192 - s512)/1024).toFixed(0)}KB`);
