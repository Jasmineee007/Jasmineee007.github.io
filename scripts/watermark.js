const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const WATERMARK_TEXT = '© Jasmine_Iris';

function createWatermarkSvg(width, height) {
  const fontSize = Math.max(Math.round(width * 0.035), 16);
  const paddingX = Math.round(width * 0.02);
  const paddingY = Math.round(height * 0.02);
  const x = width - paddingX;
  const y = height - paddingY;

  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <text x="${x}" y="${y}"
        text-anchor="end"
        font-size="${fontSize}px"
        font-family="Arial, 'Microsoft YaHei', sans-serif"
        fill="rgba(255,255,255,0.55)"
        stroke="rgba(0,0,0,0.35)"
        stroke-width="${Math.max(fontSize * 0.05, 0.5)}"
        paint-order="stroke"
        stroke-linecap="round"
        stroke-linejoin="round">${WATERMARK_TEXT}</text>
    </svg>`
  );
}

async function watermarkImage(inputPath, outputPath) {
  try {
    const image = sharp(inputPath);
    const meta = await image.metadata();

    if (!meta.width || !meta.height) {
      console.error(`  skip: ${path.basename(inputPath)} (invalid dimensions)`);
      return false;
    }

    const svg = createWatermarkSvg(meta.width, meta.height);

    // Preserve EXIF orientation & original quality
    await image
      .composite([{ input: svg, top: 0, left: 0 }])
      .withMetadata()
      .toFile(outputPath);

    console.log(`  done: ${path.basename(inputPath)}`);
    return true;
  } catch (err) {
    console.error(`  fail: ${path.basename(inputPath)} — ${err.message}`);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node scripts/watermark.js <image-path> [image-path...]');
    console.log('       node scripts/watermark.js --dir <directory>');
    process.exit(0);
  }

  let files = [];

  if (args[0] === '--dir') {
    const dir = args[1];
    if (!dir || !fs.existsSync(dir)) {
      console.error('Directory not found:', dir);
      process.exit(1);
    }
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    files = entries
      .filter(e => e.isFile() && /\.(jpg|jpeg|png|webp)$/i.test(e.name))
      .map(e => path.join(dir, e.name));
  } else {
    files = args.filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
  }

  if (files.length === 0) {
    console.log('No image files to process.');
    process.exit(0);
  }

  console.log(`Watermarking ${files.length} image(s)...`);

  let success = 0;
  for (const file of files) {
    const parsed = path.parse(file);
    const output = path.join(parsed.dir, `${parsed.name}_wm${parsed.ext}`);

    if (await watermarkImage(file, output)) {
      // Replace original with watermarked version
      fs.unlinkSync(file);
      fs.renameSync(output, file);
      success++;
    }
  }

  console.log(`Done: ${success}/${files.length} watermarked.`);
}

if (require.main === module) main();
