const fs = require('fs');
const path = require('path');
const { parse } = require('url');

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
let badCount = 0;
let extCount = 0;
const extBad = [];
const suspiciousAnchors = new Map();

for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  const re = /<a.*?(href=['"](.*?)['"]).*?>/gi;
  let m;
  while ((m = re.exec(html))) {
    const href = m[2];
    try { parse(href); } catch (e) {
      badCount++;
      console.log('抛错 href:', f.replace(/\\/g, '/'), '->', href.slice(0, 150));
    }
    if (/^https?:\/\//.test(href)) {
      extCount++;
      if (/[\u4e00-\u9fff]|\*\*|\{\{|\s/.test(href)) {
        extBad.push([f.replace(/\\/g, '/').replace(/^public\//, ''), href]);
      }
    } else if (/[\u4e00-\u9fff]|\*\*|`|\{\{/.test(href) && !suspiciousAnchors.has(href.slice(0, 60))) {
      suspiciousAnchors.set(href.slice(0, 60), f.replace(/\\/g, '/').replace(/^public\//, ''));
    }
  }
}

console.log('=== 抛错 href 总数:', badCount);
console.log('=== 外链总数:', extCount);
console.log('=== 可疑外链(含中文/空白/模板符):', extBad.length);
extBad.forEach(([f, h]) => console.log(f, '\n  ->', h.slice(0, 140)));
console.log('=== 非外链可疑 href(锚点等):', suspiciousAnchors.size, '(抽样)');
let i = 0;
for (const [h, f] of suspiciousAnchors) {
  if (i++ >= 10) break;
  console.log(f, '->', h);
}
