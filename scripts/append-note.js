hexo.extend.filter.register('after_render:html', function (html, data) {
  // 只处理文章页
  if (!data.path || !/^2026\/\d+\/\d+\//.test(data.path)) return html;
  // 排除 hello-world
  if (data.path.includes('hello-world')) return html;
  // 已有则跳过
  if (html.includes('本文为个人学习笔记')) return html;
  // 在 </article> 前插入
  return html.replace('</article>', '<blockquote>\n<p>本文为个人学习笔记，如有错误或疏漏，欢迎批评指正。</p>\n</blockquote>\n</article>');
});
