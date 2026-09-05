// 侧栏"网站运行"改为实时计时（天 时 分 秒，每秒跳动）
// 数据源沿用主题渲染的 #runtimeshow[data-publishDate]，与主题 main.js 的一次性计算共存，
// 本脚本每秒覆写 textContent
;(function () {
  var el = document.getElementById('runtimeshow');
  if (!el) return;
  var base = new Date(el.getAttribute('data-publishDate'));
  if (isNaN(base.getTime())) return;

  function pad(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  function tick() {
    var s = Math.max(0, Math.floor((Date.now() - base.getTime()) / 1000));
    var d = Math.floor(s / 86400); s -= d * 86400;
    var h = Math.floor(s / 3600);  s -= h * 3600;
    var m = Math.floor(s / 60);    s -= m * 60;
    el.textContent = d + '天 ' + pad(h) + ':' + pad(m) + ':' + pad(s);
  }

  tick();
  setInterval(tick, 1000);
})();
