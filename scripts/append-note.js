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
  // 排除 hello-world
  if (data.path.includes('hello-world')) return html;
  // 随笔分类不加学习笔记（after_render:html 里文章对象在 data.page，不是 data）
  if (inCategory(data.page, '随笔')) return html;
  // 已有则跳过
  if (html.includes('本文为个人学习笔记')) return html;
  // 在 </article> 前插入
  return html.replace('</article>', '<blockquote>\n<p>本文为个人学习笔记，如有错误或疏漏，欢迎批评指正。</p>\n</blockquote>\n</article>');
});
