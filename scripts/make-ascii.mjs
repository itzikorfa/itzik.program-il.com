// Turns the profile drawing into ASCII art for the home page.
// Usage: node scripts/make-ascii.mjs [image=assets/portrait-drawing.jpg] [cols=56] [gamma=1.4] [gain=1.0] [out=src/data/portrait.txt]
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

const [inputArg, colsArg, gammaArg, gainArg, outArg] = process.argv.slice(2);
const input = inputArg ?? 'assets/portrait-drawing.jpg';
const cols = Number(colsArg ?? 56);
const GAMMA = Number(gammaArg ?? 1.4);
const GAIN = Number(gainArg ?? 1.0);
const OUT = outArg ?? 'src/data/portrait.txt';
// Crop to head + beard (original-image pixels); drops the background and the corner label.
const crop = { left: 455, top: 520, width: 720, height: 1290 };
const CHAR_ASPECT = 0.5; // monospace cells are ~2x taller than wide
const rows = Math.round((crop.height / crop.width) * cols * CHAR_ASPECT);
const RAMP = ' .:-=+*#%@'; // more ink → denser character (drawn light-on-dark)

const { data } = await sharp(input)
  .extract(crop)
  .greyscale()
  .normalise()
  .resize(cols, rows, { fit: 'fill', kernel: 'lanczos3' })
  .raw()
  .toBuffer({ resolveWithObject: true });

const lines = [];
for (let y = 0; y < rows; y++) {
  let line = '';
  for (let x = 0; x < cols; x++) {
    const ink = 1 - data[y * cols + x] / 255; // 0 = paper, 1 = ink
    const boosted = Math.min(1, Math.pow(ink, GAMMA) * GAIN);
    line += RAMP[Math.min(RAMP.length - 1, Math.floor(boosted * RAMP.length))];
  }
  lines.push(line.replace(/\s+$/, ''));
}
while (lines.length && !lines[0].trim()) lines.shift();
while (lines.length && !lines.at(-1).trim()) lines.pop();
writeFileSync(OUT, lines.join('\n') + '\n');
console.log(`wrote ${OUT} (${cols}x${lines.length})`);
