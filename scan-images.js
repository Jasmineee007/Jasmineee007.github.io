const fs = require('fs');
const path = require('path');

function walk(d) {
  let out = [];
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) out = out.concat(walk(p));
    else if (f === 'index.html') out.push(p);
  }
  return out;
}

const files = walk('public');
const urls = new Map(); // url -> [pages]
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  const re = /<img[^>]+src=['"](https?:\/\/[^'"]+)['"]/gi;
  let m;
  while ((m = re.exec(html))) {
    const url = m[1];
    if (!urls.has(url)) urls.set(url, []);
    const pages = urls.get(url);
    if (pages.length < 3) pages.push(f.replace(/\\/g, '/').replace(/^public\//, ''));
  }
}

console.log('唯一图片 URL 总数:', urls.size);

async function check(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(15000) });
    return res.status;
  } catch (e) {
    return 'ERR ' + (e.cause ? e.cause.code || e.cause.message : e.message);
  }
}

(async () => {
  const list = [...urls.keys()];
  let ok = 0;
  const failed = [];
  for (let i = 0; i < list.length; i += 12) {
    const batch = list.slice(i, i + 12);
    const results = await Promise.all(batch.map(check));
    batch.forEach((u, j) => {
      const st = results[j];
      if (st === 200) ok++;
      else failed.push([st, u, urls.get(u)]);
    });
    if ((i / 12) % 5 === 0) process.stdout.write(`进度 ${Math.min(i + 12, list.length)}/${list.length}\r`);
  }
  console.log('\n正常(200):', ok);
  console.log('异常:', failed.length);
  failed.forEach(([st, u, pages]) => console.log(`[${st}] ${u}\n   出现在: ${pages.join(', ')}`));
})();
