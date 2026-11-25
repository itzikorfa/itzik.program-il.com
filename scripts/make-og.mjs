// Builds the 1200x630 share-preview card (public/og.png) from the profile drawing.
// Usage: node scripts/make-og.mjs [image=assets/portrait-drawing.jpg]
import sharp from 'sharp';

const input = process.argv[2] ?? 'assets/portrait-drawing.jpg';
const W = 1200, H = 630, PHOTO = 630;
// Head-and-beard crop (original pixels); excludes the corner label.
const ink = await sharp(input)
  .extract({ left: 175, top: 500, width: 1290, height: 1290 })
  .resize(PHOTO, PHOTO)
  .greyscale()
  .negate({ alpha: false }) // ink → bright
  .linear(1.4, -20)
  .extractChannel(0)
  .toBuffer();
// Use the drawing as an alpha mask over terminal green: light lines on the dark card.
const face = await sharp({ create: { width: PHOTO, height: PHOTO, channels: 3, background: '#7ee787' } })
  .joinChannel(ink, { raw: undefined })
  .png()
  .toBuffer();

const text = `<svg xmlns="http://www.w3.org/2000/svg" width="${W - PHOTO}" height="${H}">
  <style>text{font-family:Menlo,'DejaVu Sans Mono',monospace}</style>
  <text x="40" y="200" fill="#7ee787" font-size="26">$ whoami</text>
  <text x="40" y="270" fill="#ffa657" font-size="40" font-weight="bold">Yizhak (Itzik)</text>
  <text x="40" y="320" fill="#ffa657" font-size="40" font-weight="bold">Orfanian</text>
  <text x="40" y="385" fill="#c9d1d9" font-size="24">Senior Software Developer</text>
  <text x="40" y="420" fill="#c9d1d9" font-size="24">Cloud Security &amp; AI</text>
  <text x="40" y="520" fill="#79c0ff" font-size="22">itzik.program-il.com</text>
</svg>`;

await sharp({ create: { width: W, height: H, channels: 3, background: '#0d1117' } })
  .composite([
    { input: face, left: 0, top: 0 },
    { input: Buffer.from(text), left: PHOTO, top: 0 },
  ])
  .png()
  .toFile('public/og.png');
console.log('wrote public/og.png');
