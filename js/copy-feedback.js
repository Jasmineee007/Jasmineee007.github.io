/* 代码块复制按钮：点击后内联显示「复制成功」提醒（替换主题的浮动气泡） */
(function () {
  'use strict';
  var lastBtn = null;

  // 捕获最近点击的复制按钮
  document.addEventListener('click', function (e) {
    var t = e.target;
    while (t && t !== document) {
      if (t.classList && t.classList.contains('copy-button')) {
        lastBtn = t;
        return;
      }
      t = t.parentNode;
    }
  }, true);

  // 主题复制完成会向 body 追加 .copy-notice（成功=「复制成功」，失败=「复制失败」「浏览器不支持」）
  var observer = new MutationObserver(function (muts) {
    muts.forEach(function (m) {
      m.addedNodes.forEach(function (node) {
        if (node.nodeType !== 1 || !node.classList || !node.classList.contains('copy-notice')) return;
        var text = node.textContent || '';
        node.remove(); // 移除主题的浮动气泡（用户不想要弹窗式提醒）
        if (text.indexOf('复制成功') !== -1) showInline(lastBtn, '✓ 复制成功', true);
        else showInline(lastBtn, '复制失败', false);
      });
    });
  });
  observer.observe(document.body, { childList: true });

  function showInline(btn, text, ok) {
    if (!btn) return;
    var tools = btn.parentNode; // .highlight-tools
    if (!tools) return;
    var old = tools.querySelector('.copy-success-inline');
    if (old) old.remove();
    var span = document.createElement('span');
    span.className = 'copy-success-inline ' + (ok ? 'ok' : 'fail');
    span.textContent = text;
    tools.appendChild(span);
    setTimeout(function () {
      span.style.opacity = '0';
      setTimeout(function () {
        if (span.parentNode) span.parentNode.removeChild(span);
      }, 350);
    }, 1500);
  }
})();
