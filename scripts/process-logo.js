// Process /public/logo.jpeg into two transparent-background PNGs.
//
//   /public/logo.png        — keep the white glyph AND the blue glow,
//                             drop only the near-pure-black background.
//                             Soft luminance threshold with a smooth
//                             alpha ramp preserves the glow's natural
//                             falloff.
//
//   /public/logo-clean.png  — keep only the white glyph itself.
//                             Aggressive luminance threshold + force
//                             every kept pixel to #FAFAFA so the glow
//                             can be re-added in CSS.
//
// Run with: npm run process-logo

const sharp = require("sharp");
const path = require("path");

const SOURCE = path.join(__dirname, "..", "public", "logo.jpeg");
const OUTPUT_FULL = path.join(__dirname, "..", "public", "logo.png");
const OUTPUT_CLEAN = path.join(__dirname, "..", "public", "logo-clean.png");

// Rec. 709 luminance weights.
function lum(r, g, b) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

// Smooth alpha ramp between two luminance thresholds. Below `low` is fully
// transparent, above `high` fully opaque; the smoothstep in between avoids
// the hard-edged jaggies a plain threshold would produce.
function smoothAlpha(l, low, high) {
  if (l <= low) return 0;
  if (l >= high) return 1;
  const t = (l - low) / (high - low);
  return t * t * (3 - 2 * t); // smoothstep
}

async function processFullVersion() {
  const { data, info } = await sharp(SOURCE)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const out = Buffer.alloc(width * height * 4);

  // Tuned for this source:
  //   • near-pure-black background sits at lum < ~0.015
  //   • the faintest blue-glow edges live around lum 0.02 – 0.06
  //   • bulk of the glow + glyph is well above lum 0.10
  const LOW = 0.015;
  const HIGH = 0.08;

  for (let i = 0; i < width * height; i++) {
    const r = data[i * channels];
    const g = data[i * channels + 1];
    const b = data[i * channels + 2];
    const a = smoothAlpha(lum(r, g, b), LOW, HIGH);
    out[i * 4] = r;
    out[i * 4 + 1] = g;
    out[i * 4 + 2] = b;
    out[i * 4 + 3] = Math.round(a * 255);
  }

  await sharp(out, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(OUTPUT_FULL);
}

async function processCleanVersion() {
  const { data, info } = await sharp(SOURCE)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const out = Buffer.alloc(width * height * 4);

  // Only the glyph itself: keep pixels brighter than ~70 % luminance and
  // force them to the design token white #FAFAFA so the result is a
  // pure white silhouette ready for CSS glow.
  const LOW = 0.6;
  const HIGH = 0.78;

  for (let i = 0; i < width * height; i++) {
    const r = data[i * channels];
    const g = data[i * channels + 1];
    const b = data[i * channels + 2];
    const a = smoothAlpha(lum(r, g, b), LOW, HIGH);
    out[i * 4] = 0xfa;
    out[i * 4 + 1] = 0xfa;
    out[i * 4 + 2] = 0xfa;
    out[i * 4 + 3] = Math.round(a * 255);
  }

  await sharp(out, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(OUTPUT_CLEAN);
}

(async () => {
  await processFullVersion();
  await processCleanVersion();
  // eslint-disable-next-line no-console
  console.log("✓ Logo processed: logo.png + logo-clean.png");
})().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Error:", err);
  process.exit(1);
});
