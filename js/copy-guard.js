(function(){
  // 只在文章页面生效
  if (typeof GLOBAL_CONFIG_SITE !== 'undefined' && GLOBAL_CONFIG_SITE.pageType !== 'post') return;

  var COPYRIGHT = '\n\n\n作者: Jasmine_Iris\n链接: '+window.location.href+'\n来源: Jasmine_Iris\n著作权归作者所有。商业转载请联系作者获得授权，非商业转载请注明出处。';
  document.addEventListener('copy', function(e) {
    var s = window.getSelection();
    if (!s || !s.rangeCount) return;
    var n = s.getRangeAt(0).commonAncestorContainer;
    var inArticle = document.getElementById('article-container')?.contains(n)
                 || document.querySelector('.recent-post-item')?.contains(n);
    if (!inArticle) return;
    var t = s.toString();
    if (!t) return;
    e.preventDefault();
    e.clipboardData.setData('text/plain', t + COPYRIGHT);
    var d = document.createElement('div');
    d.className = 'copy-notice';
    d.textContent = '转载要标明出处哦';
    document.body.appendChild(d);
    setTimeout(function(){ d.remove(); }, 1500);
  });
})();
