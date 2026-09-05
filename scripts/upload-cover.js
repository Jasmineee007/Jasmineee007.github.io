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

if (!TOKEN) {
  console.error('请在 E:\\my_blog\\.env 中设置 GITHUB_TOKEN');
  process.exit(1);
}

function apiRequest(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.github.com',
      path: apiPath,
      method,
      headers: {
        Authorization: `token ${TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'upload-cover',
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ statusCode: res.statusCode, data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function getFileSha(remotePath) {
  const encodedPath = remotePath.split('/').map(encodeURIComponent).join('/');
  const { statusCode, data } = await apiRequest('GET', `/repos/${REPO}/contents/${encodedPath}`);
  if (statusCode === 200) {
    return JSON.parse(data).sha;
  }
  return null;
}

async function uploadBuf(buf, remotePath) {
  const base64 = buf.toString('base64');
  const encodedPath = remotePath.split('/').map(encodeURIComponent).join('/');

  const sha = await getFileSha(remotePath);
  const body = JSON.stringify({
    message: `upload: ${remotePath}`,
    content: base64,
    branch: BRANCH,
    ...(sha ? { sha } : {}),
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.github.com',
      path: `/repos/${REPO}/contents/${encodedPath}`,
      method: 'PUT',
      headers: {
        Authorization: `token ${TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'upload-cover',
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode === 201 || res.statusCode === 200) {
          console.log(`  OK  ${remotePath}`);
          resolve(`https://img.jasmine-iris.top/${remotePath}`);
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

async function main() {
  const args = process.argv.slice(2);
  const slug = args[0];
  const imagePath = args[1];

  if (!slug || !imagePath) {
    console.error('用法: node scripts/upload-cover.js <slug> <图片路径>');
    process.exit(1);
  }

  const abs = path.resolve(imagePath);
  if (!fs.existsSync(abs)) {
    console.error(`图片不存在: ${abs}`);
    process.exit(1);
  }

  let buf = fs.readFileSync(abs);
  buf = await sharp(buf).webp({ quality: 85 }).toBuffer();

  const remotePath = `posts/${slug}/cover.webp`;
  const cdnUrl = await uploadBuf(buf, remotePath);
  console.log(`\n封面 CDN 地址:\n${cdnUrl}`);
}

if (require.main === module) main().catch(console.error);
