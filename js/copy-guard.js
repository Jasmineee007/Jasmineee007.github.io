(function(){
  var bodyWrap = document.getElementById('body-wrap');
  // 只在文章页生效（#body-wrap 带 post 类）
  if (!bodyWrap || !bodyWrap.classList.contains('post')) return;

  var articleEl = document.getElementById('article-container');

  // 复制字数阈值：选中超过该字数算「过多」，只给目录
  var THRESHOLD = 500;

  function showNotice(text) {
    var d = document.createElement('div');
    d.className = 'copy-guard-notice';
    d.textContent = text;
    document.body.appendChild(d);
    setTimeout(function(){ d.remove(); }, 2000);
  }

  // 收集文章目录（h1~h4 标题大纲），结果缓存一次
  var tocCache = null;
  function buildTOC() {
    if (!articleEl) return '';
    var heads = articleEl.querySelectorAll('h1,h2,h3,h4');
    var lines = [];
    for (var i = 0; i < heads.length; i++) {
      var level = parseInt(heads[i].tagName.charAt(1), 10) || 2;
      var txt = heads[i].textContent.replace(/\s+/g, ' ').trim();
      if (txt) lines.push(new Array(Math.max(0, level - 1) + 1).join('  ') + txt);
    }
    var toc = lines.join('\n');
    return '本文已开启复制保护，复制内容过多时仅提供文章目录。\n\n' +
           (toc || '（本文无目录）') +
           '\n\n完整内容请访问原文：' + window.location.href;
  }
  function getTOC() {
    if (tocCache === null) tocCache = buildTOC();
    return tocCache;
  }

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
  }

  // 拦截「选中文字后复制」（Ctrl+C / 右键复制）
  document.addEventListener('copy', function(e) {
    // 代码块复制按钮（Butterfly 走 navigator.clipboard.writeText + __copyingCode）不拦截
    if (window.__copyingCode) return;

    var s = window.getSelection();
    if (!s || !s.rangeCount) return;
    var n = s.getRangeAt(0).commonAncestorContainer;
    if (articleEl && !articleEl.contains(n)) return;
    var t = s.toString();
    if (!t) return;

    if (t.length <= THRESHOLD) {
      // 复制少：正常复制，只弹提示
      showNotice('复制成功，转载请注明出处');
      return;
    }

    // 复制多：拦截，剪贴板只放目录（同时覆盖 text/plain 和 text/html，避免正文泄漏）
    e.preventDefault();
    if (e.clipboardData) {
      var toc = getTOC();
      e.clipboardData.setData('text/plain', toc);
      try { e.clipboardData.setData('text/html', escapeHtml(toc)); } catch (err) {}
    }
    showNotice('复制内容过多，已替换为文章目录');
  });

  // 代码块复制按钮走 navigator.clipboard.writeText，直接放行（不追加版权、不改内容）
  try {
    var origWrite = navigator.clipboard.writeText.bind(navigator.clipboard);
    navigator.clipboard.writeText = function(text) {
      return origWrite(text);
    };
  } catch (err) {}
})();
