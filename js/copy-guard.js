(function(){
  var articleEl = document.getElementById('article-container');
  var recentEl = document.querySelector('.recent-post-item');
  // 非文章页直接退出
  if (!articleEl && !recentEl) return;

  var COPYRIGHT = '\n\n\n作者: Jasmine_Iris\n链接: '+window.location.href+'\n来源: Jasmine_Iris\n著作权归作者所有。商业转载请联系作者获得授权，非商业转载请注明出处。';

  function showNotice() {
    var d = document.createElement('div');
    d.className = 'copy-notice';
    d.textContent = '转载要标明出处哦';
    document.body.appendChild(d);
    setTimeout(function(){ d.remove(); }, 1500);
  }

  // 1. 拦截 Ctrl+C / 右键复制（触发 copy 事件）
  document.addEventListener('copy', function(e) {
    var s = window.getSelection();
    if (!s || !s.rangeCount) return;
    var n = s.getRangeAt(0).commonAncestorContainer;
    if (!articleEl?.contains(n) && !recentEl?.contains(n)) return;
    var t = s.toString();
    if (!t) return;
    e.preventDefault();
    e.clipboardData.setData('text/plain', t + COPYRIGHT);
    showNotice();
  });

  // 2. 拦截 navigator.clipboard.writeText（部分操作不触发 copy 事件）
  try {
    var origWrite = navigator.clipboard.writeText.bind(navigator.clipboard);
    navigator.clipboard.writeText = function(text) {
      // 判断是否来自代码块复制按钮
      var active = document.activeElement;
      var inCodeBlock = active && (
        active.closest('figure.highlight') ||
        active.closest('.code-block') ||
        active.closest('pre')
      );
      if (inCodeBlock) {
        return origWrite(text);
      }
      showNotice();
      return origWrite(text + COPYRIGHT);
    };
  } catch(e) {}
})();
