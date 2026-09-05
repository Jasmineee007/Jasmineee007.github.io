const https = require('https');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Auto-load .env
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const [k, ...v] = line.trim().split('=');
    if (k && v.length) process.env[k] = v.join('=');
  });
}

const TOKEN = process.env.GITHUB_TOKEN;
const REPO = 'Jasmineee007/blog-img';
const BRANCH = 'main';
const WATERMARK_TEXT = '© Jasmine_Iris';

if (!TOKEN) {
  console.error('请在 E:\\my_blog\\.env 中设置 GITHUB_TOKEN');
  process.exit(1);
}

async function downloadUrl(url) {
  const res = await fetch(url.trim(), { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`Download ${url} failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function addWatermark(inputBuf) {
  const image = sharp(inputBuf);
  const meta = await image.metadata();
  if (!meta.width || !meta.height) return inputBuf;

  const fontSize = Math.max(Math.round(meta.width * 0.035), 16);
  const padX = Math.round(meta.width * 0.02);
  const padY = Math.round(meta.height * 0.02);

  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${meta.width}" height="${meta.height}">
      <text x="${meta.width - padX}" y="${meta.height - padY}"
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

  return image.composite([{ input: svg, top: 0, left: 0 }]).withMetadata().toBuffer();
}

function uploadBuf(buf, remotePath) {
  const base64 = buf.toString('base64');

  const body = JSON.stringify({
    message: `upload: ${remotePath}`,
    content: base64,
    branch: BRANCH,
  });

  const encodedPath = remotePath.split('/').map(encodeURIComponent).join('/');

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.github.com',
      path: `/repos/${REPO}/contents/${encodedPath}`,
      method: 'PUT',
      headers: {
        Authorization: `token ${TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'upload-images',
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode === 201 || res.statusCode === 200) {
          const cdn = `https://img.jasmine-iris.top/${remotePath}`;
          console.log(`  OK  ${remotePath}`);
          resolve(cdn);
        } else {
          console.error(`  FAIL ${remotePath} (${res.statusCode}): ${data}`);
          reject(new Error(`Upload failed: ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function getImageBuf(src, mdDir) {
  if (/^https?:\/\//.test(src)) {
    return { buf: await downloadUrl(src), localFile: null };
  }
  let localFile = path.resolve(mdDir, src);
  if (!fs.existsSync(localFile)) localFile = path.resolve(src);
  if (!fs.existsSync(localFile)) return null;
  return { buf: fs.readFileSync(localFile), localFile };
}

async function uploadSingle(imgPath, withWatermark, dirName, name) {
  if (!fs.existsSync(imgPath)) {
    console.error('文件不存在: ' + imgPath);
    process.exit(1);
  }
  let buf = fs.readFileSync(imgPath);
  const isGif = /\.gif$/i.test(imgPath);
  let ext = path.extname(imgPath).toLowerCase();
  if (withWatermark && !isGif) buf = await addWatermark(buf);
  if (!isGif) {
    buf = await sharp(buf).webp({ quality: 85 }).toBuffer();
    ext = '.webp';
  }
  const dir = dirName ? `posts/${dirName}` : 'posts';
  const fn = name || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
  const remotePath = `${dir}/${fn}`;
  const cdn = await uploadBuf(buf, remotePath);
  console.log(cdn);
}

async function main() {
  const args = process.argv.slice(2);
  const withWatermark = args.includes('--watermark');
  const dirIdx = args.indexOf('--dir');
  const dirName = dirIdx > -1 ? args[dirIdx + 1] : null;
  const nameIdx = args.indexOf('--name');
  const nameVal = nameIdx > -1 ? args[nameIdx + 1] : null;
  const target = args.find((a, i) => !a.startsWith('--') && i !== dirIdx + 1 && i !== nameIdx + 1);

  if (!target) {
    console.error('用法: node scripts/upload-images.js [--watermark] [--dir <子目录>] <文章.md|图片.后缀>');
    process.exit(1);
  }

  // 单图模式：直接上传一张图片，输出 CDN 地址
  if (/\.(png|jpe?g|webp|gif)$/i.test(target)) {
    await uploadSingle(target, withWatermark, dirName, nameVal);
    return;
  }

  const mdFile = target;

  const mdContent = fs.readFileSync(mdFile, 'utf-8');
  const postName = path.basename(mdFile, path.extname(mdFile));
  const remoteDir = `posts/${postName}`;
  const mdDir = path.dirname(mdFile);

  const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const images = [];
  const seen = new Set();
  let match;
  while ((match = imgRegex.exec(mdContent)) !== null) {
    if (seen.has(match[2])) continue;
    seen.add(match[2]);
    images.push({ imgPath: match[2] });
  }

  if (images.length === 0) {
    console.log('没有找到图片');
    process.exit(0);
  }

  const remoteUrls = images.filter(i => /^https?:\/\//.test(i.imgPath)).length;
  const localOnly = images.filter(i => !/^https?:\/\//.test(i.imgPath)).length;
  console.log(`${withWatermark ? '加水印 + 上传' : '上传'} ${images.length} 张图片`);
  if (remoteUrls) console.log(`  远程下载: ${remoteUrls} 张`);
  if (localOnly) console.log(`  本地文件: ${localOnly} 张`);
  console.log('');

  let newContent = mdContent;
  const deletedDirs = new Set();

  for (const img of images) {
    const result = await getImageBuf(img.imgPath, mdDir);
    if (!result) {
      console.log(`  SKIP ${img.imgPath} (无法读取)`);
      continue;
    }

    const srcIsUrl = /^https?:\/\//.test(img.imgPath);
    const fn = srcIsUrl ? img.imgPath.split('/').pop().split('?')[0] : path.basename(img.imgPath);
    const isGif = /\.gif$/i.test(fn);

    try {
      let buf = result.buf;
      let ext = path.extname(fn).toLowerCase() || '.png';
      if (withWatermark && /\.(png|jpg|jpeg|webp)$/i.test(ext)) {
        buf = await addWatermark(buf);
      }
      // 非动图统一压缩为 WebP，大幅减小体积
      if (!isGif) {
        buf = await sharp(buf).webp({ quality: 85 }).toBuffer();
        ext = '.webp';
      }
      const filename = Date.now() + '_' + Math.random().toString(36).slice(2, 8) + ext;
      const remotePath = `${remoteDir}/${filename}`;
      const cdnUrl = await uploadBuf(buf, remotePath);
      const escapedPath = img.imgPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      newContent = newContent.replace(new RegExp(escapedPath, 'g'), cdnUrl);

      if (result.localFile) {
        fs.unlinkSync(result.localFile);
        deletedDirs.add(path.dirname(result.localFile));
      }
    } catch (err) {
      console.error(`  失败: ${img.imgPath} — ${err.message}`);
    }
  }

  // Remove empty local directories
  for (const dir of deletedDirs) {
    try {
      const remaining = fs.readdirSync(dir);
      if (remaining.length === 0) fs.rmdirSync(dir);
    } catch {}
  }

  const outputFile = mdFile.replace(/\.md$/, '_cdn.md');
  fs.writeFileSync(outputFile, newContent, 'utf-8');
  console.log(`\n已生成: ${outputFile}`);
}

if (require.main === module) main().catch(console.error);
