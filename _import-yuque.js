const fs = require('fs');
const path = require('path');
const https = require('https');
const sharp = require('sharp');

const BLOG_DIR = 'E:/my_blog';
const POSTS_DIR = path.join(BLOG_DIR, 'source', '_posts');

// ========== watermark ==========
const WATERMARK_TEXT = '© Jasmine_Iris';

function wmSvg(width, height) {
  const fontSize = Math.max(Math.round(width * 0.035), 16);
  const padX = Math.round(width * 0.02);
  const padY = Math.round(height * 0.02);
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <text x="${width - padX}" y="${height - padY}" text-anchor="end"
        font-size="${fontSize}px" font-family="Arial,'Microsoft YaHei',sans-serif"
        fill="rgba(255,255,255,0.5)" stroke="rgba(0,0,0,0.3)"
        stroke-width="${Math.max(fontSize * 0.05, 0.5)}"
        paint-order="stroke" stroke-linecap="round" stroke-linejoin="round">${WATERMARK_TEXT}</text>
    </svg>`
  );
}

// ========== download ==========
function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const opts = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Referer': 'https://www.yuque.com/',
      }
    };
    const proto = url.startsWith('https') ? https : require('http');
    proto.get(url, opts, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const p = (res.headers.location.startsWith('https')) ? https : require('http');
        p.get(res.headers.location, { headers: opts.headers }, (r2) => {
          r2.pipe(file);
          file.on('finish', () => { file.close(); resolve(); });
        }).on('error', reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', reject);
  });
}

// ========== main ==========
async function processArticle(mdPath, slug) {
  const content = fs.readFileSync(mdPath, 'utf-8');
  const imgDir = path.join(POSTS_DIR, slug);
  const tmpDir = path.join(imgDir, '.tmp');

  // Extract unique CDN image URLs
  const re = /!\[[^\]]*\]\((https:\/\/cdn\.nlark\.com\/[^\)]+)\)/g;
  const urls = [...new Set([...content.matchAll(re)].map(m => m[1]))];

  if (urls.length === 0) {
    console.log(`\n[${slug}] 0 images — skip`);
    fs.mkdirSync(imgDir, { recursive: true });
    return { content, urls: [] };
  }

  console.log(`\n[${slug}] ${urls.length} images`);
  fs.mkdirSync(tmpDir, { recursive: true });

  // Download
  console.log(`  Downloading...`);
  const localNames = {};
  let done = 0;
  for (const url of urls) {
    const name = url.split('/').pop().split('?')[0];
    // Ensure .png extension
    const ext = name.includes('.') ? '' : '.png';
    const fname = `${name}${ext}`;
    const tmpPath = path.join(tmpDir, fname);
    try {
      await download(url, tmpPath);
      localNames[url] = fname;
      done++;
      if (done % 20 === 0) process.stdout.write(`  ${done}/${urls.length}\r`);
    } catch (e) {
      console.error(`  FAIL: ${fname} — ${e.message}`);
    }
  }
  console.log(`  Downloaded ${Object.keys(localNames).length}/${urls.length}`);

  // Watermark
  console.log(`  Watermarking...`);
  let wmDone = 0;
  for (const [url, fname] of Object.entries(localNames)) {
    const tmpPath = path.join(tmpDir, fname);
    const finalPath = path.join(imgDir, fname);
    try {
      const img = sharp(tmpPath);
      const meta = await img.metadata();
      if (meta.width && meta.height) {
        const svg = wmSvg(meta.width, meta.height);
        await img.composite([{ input: svg, top: 0, left: 0 }])
          .withMetadata()
          .toFile(finalPath);
      } else {
        fs.copyFileSync(tmpPath, finalPath);
      }
      wmDone++;
      if (wmDone % 20 === 0) process.stdout.write(`  ${wmDone}/${Object.keys(localNames).length}\r`);
    } catch (e) {
      console.error(`  WM FAIL: ${fname} — ${e.message}`);
      // Fallback: copy without watermark
      try { fs.copyFileSync(tmpPath, finalPath); } catch {}
    }
  }

  // Clean tmp
  fs.rmSync(tmpDir, { recursive: true, force: true });

  console.log(`  Watermarked ${wmDone}/${Object.keys(localNames).length}`);

  // Replace URLs in content
  let newContent = content;
  for (const [url, fname] of Object.entries(localNames)) {
    // Replace ![](url) with {% asset_img filename %}
    const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    newContent = newContent.replace(
      new RegExp(`!\\[[^\\]]*\\]\\(${escaped}\\)`, 'g'),
      `{% asset_img ${fname} %}`
    );
  }

  // Write index.md
  const indexMd = path.join(imgDir, 'index.md');
  fs.writeFileSync(indexMd, newContent, 'utf-8');

  console.log(`  Done: ${Object.keys(localNames).length} images → ${imgDir}/`);
  return { content: newContent, urls: localNames };
}

async function main() {
  const desktop = 'C:/Users/Jasmine/Desktop';
  const articles = [
    { file: 'CSRF&SSRF.md', slug: 'CSRF-SSRF' },
    { file: 'RCE漏洞.md', slug: 'RCE漏洞' },
    { file: 'XSS.md', slug: 'XSS漏洞' },
    { file: '文件上传漏洞.md', slug: '文件上传漏洞' },
    { file: '文件包含漏洞.md', slug: '文件包含漏洞' },
  ];

  for (const a of articles) {
    const mdPath = path.join(desktop, a.file);
    if (!fs.existsSync(mdPath)) {
      console.log(`\n[${a.slug}] file not found, skip`);
      continue;
    }
    await processArticle(mdPath, a.slug);
  }

  console.log('\n===== All done =====');
}

main().catch(console.error);
