const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const IMG_DIR = path.join(__dirname, '..', 'source', 'img', 'posts');
const CACHE_FILE = path.join(__dirname, '..', '.watermark-cache.json');
const WATERMARK_TEXT = '© Jasmine_Iris';

function createWatermarkSvg(width, height) {
  const fontSize = Math.max(Math.round(width * 0.035), 16);
  const padX = Math.round(width * 0.02);
  const padY = Math.round(height * 0.02);
  const x = width - padX;
  const y = height - padY;

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

function fileHash(filePath) {
  return crypto.createHash('md5').update(fs.readFileSync(filePath)).digest('hex');
}

function loadCache() {
  try { return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8')); }
  catch { return {}; }
}

function saveCache(cache) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

async function watermarkImage(filePath) {
  const image = sharp(filePath);
  const meta = await image.metadata();
  if (!meta.width || !meta.height) return false;

  const svg = createWatermarkSvg(meta.width, meta.height);
  const tmp = filePath + '.wm-tmp';

  await image
    .composite([{ input: svg, top: 0, left: 0 }])
    .withMetadata()
    .toFile(tmp);

  fs.rmSync(filePath, { force: true, maxRetries: 3 });
  fs.renameSync(tmp, filePath);
  return true;
}

function collectImages(dir) {
  const files = [];
  function walk(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(path.join(d, entry.name));
      else if (/\.(png|jpg|jpeg|webp)$/i.test(entry.name))
        files.push(path.join(d, entry.name));
    }
  }
  if (fs.existsSync(dir)) walk(dir);
  return files;
}

if (typeof hexo !== 'undefined') {
  hexo.extend.filter.register('before_generate', async function () {
    const cache = loadCache();
    const images = collectImages(IMG_DIR);
    let updated = false;

    for (const filePath of images) {
      const hash = fileHash(filePath);
      const rel = path.relative(IMG_DIR, filePath).replace(/\\/g, '/');
      if (cache[rel] === hash) continue;

      try {
        hexo.log.info(`[auto-watermark] ${rel}`);
        await watermarkImage(filePath);
        cache[rel] = fileHash(filePath);
        updated = true;
      } catch (e) {
        hexo.log.warn(`[auto-watermark] skip ${rel}: ${e.message}`);
      }
    }

    if (updated) saveCache(cache);
  });
}

// Allow manual run: node scripts/auto-watermark.js [--force]
if (require.main === module) {
  (async () => {
    const force = process.argv.includes('--force');
    const cache = force ? {} : loadCache();
    const images = collectImages(IMG_DIR);
    let count = 0;
    let skipped = 0;

    for (const filePath of images) {
      const hash = fileHash(filePath);
      const rel = path.relative(IMG_DIR, filePath).replace(/\\/g, '/');
      if (!force && cache[rel] === hash) {
        skipped++;
        continue;
      }

      try {
        console.log(`[${count + 1}/${images.length}] ${rel}`);
        await watermarkImage(filePath);
        cache[rel] = fileHash(filePath);
        saveCache(cache);
        count++;
      } catch (e) {
        console.error(`  FAIL: ${rel} — ${e.message}`);
      }
    }

    console.log(`Done: ${count} watermarked, ${skipped} skipped.`);
  })().catch(e => { console.error(e); process.exit(1); });
}
