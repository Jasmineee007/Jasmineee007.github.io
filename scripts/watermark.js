// 正文隐藏水印:在文章正文中插入零宽字符编码的域名,被抓走后可溯源
// 编码:jasmine-iris.top 每个字符 → charCode 16位二进制,1=U+200B 0=U+200C,字符间 U+200D
// 整段水印在 2 处独立插入(首尾各一),复制任意部分若含其一即可检测到本站痕迹
(function () {
  const MARK_TEXT = 'jasmine-iris.top';
  const ONE = '​'; // U+200B zero width space
  const ZERO = '‌'; // U+200C zero width non-joiner
  const SEP = '‍'; // U+200D zero width joiner

  function encode() {
    let out = '';
    for (const ch of MARK_TEXT) {
      const bits = ch.codePointAt(0).toString(2).padStart(16, '0');
      for (const b of bits) out += b === '1' ? ONE : ZERO;
      out += SEP;
    }
    return out;
  }
  const WM = encode();

  function inCategory(data, name) {
    const c = data && (data.categories || data.category);
    if (c == null) return false;
    const hit = (x) => {
      if (x == null) return false;
      if (typeof x === 'string') return x === name;
      if (typeof x.name === 'string') return x.name === name;
      return false;
    };
    if (Array.isArray(c)) return c.some(hit);
    if (typeof c.toArray === 'function') return c.toArray().some(hit);
    if (typeof c.forEach === 'function') { let f = false; c.forEach(x => { if (hit(x)) f = true; }); return f; }
    return hit(c);
  }

  hexo.extend.filter.register('after_render:html', function (html, data) {
    // 只处理文章页
    if (!data.path || !/^2026\/\d+\/\d+\//.test(data.path)) return html;
    if (data.path.includes('hello-world')) return html;
    if (inCategory(data.page, '随笔')) return html;
    // 已有水印则跳过
    if (html.includes(WM)) return html;

    const closes = [];
    let idx = -1;
    while ((idx = html.indexOf('</p>', idx + 1)) !== -1) closes.push(idx);
    if (closes.length < 2) return html;

    // 从头和尾各取一个段落末尾插入完整水印,从后往前插避免索引偏移
    const tail = closes[closes.length - 1];
    const head = closes[0];
    let out = html;
    out = out.slice(0, tail) + WM + out.slice(tail);
    out = out.slice(0, head) + WM + out.slice(head);
    return out;
  });
})();
