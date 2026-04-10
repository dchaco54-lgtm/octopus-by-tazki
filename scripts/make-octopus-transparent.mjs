import sharp from "sharp";

const inputPath = process.argv[2] ?? "public/octopus-mark.png";
const outputPath = process.argv[3] ?? "public/octopus-mark.png";

function clamp01(n) {
  return Math.max(0, Math.min(1, n));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function dist3(a, b) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

const THRESHOLD = 32; // how close to background to become transparent
const FEATHER = 18; // soften edges to avoid harsh halos

const image = sharp(inputPath).ensureAlpha();
const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

const { width, height, channels } = info;
if (channels !== 4) {
  throw new Error(`Expected RGBA image. Got channels=${channels}`);
}

const corners = [
  [0, 0],
  [width - 1, 0],
  [0, height - 1],
  [width - 1, height - 1],
];

let bg = [0, 0, 0];
for (const [x, y] of corners) {
  const idx = (y * width + x) * 4;
  bg[0] += data[idx + 0];
  bg[1] += data[idx + 1];
  bg[2] += data[idx + 2];
}
bg = bg.map((v) => Math.round(v / corners.length));

const out = Buffer.from(data);
for (let i = 0; i < out.length; i += 4) {
  const rgb = [out[i + 0], out[i + 1], out[i + 2]];
  const d = dist3(rgb, bg);

  if (d <= THRESHOLD) {
    out[i + 3] = 0;
    continue;
  }

  if (d < THRESHOLD + FEATHER) {
    const t = clamp01((d - THRESHOLD) / FEATHER);
    // ease-in to keep edge crisp but avoid a hard cut
    const eased = t * t;
    out[i + 3] = Math.round(lerp(0, out[i + 3], eased));
  }
}

await sharp(out, { raw: { width, height, channels: 4 } })
  .png()
  .toFile(outputPath);

console.log(
  `Wrote ${outputPath} (bg rgb=${bg.join(",")}, threshold=${THRESHOLD}, feather=${FEATHER})`,
);

