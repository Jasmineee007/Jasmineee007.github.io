// 首页文章卡 3D 倾斜：卡片随鼠标位置微转（±4°）+ 上浮，移开时走主题 transition 平滑复位
// 仅精确指针设备（桌面鼠标）；触屏 / prefers-reduced-motion 直接跳过
;(function () {
  if (!window.matchMedia) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var MAX_DEG = 4;
  var cards = document.querySelectorAll('.recent-post-item');
  if (!cards.length) return;

  cards.forEach(function (card) {
    var raf = null;
    var ev = null;

    function apply() {
      raf = null;
      var rect = card.getBoundingClientRect();
      var px = (ev.clientX - rect.left) / rect.width - 0.5;
      var py = (ev.clientY - rect.top) / rect.height - 0.5;
      var rx = (-py * 2 * MAX_DEG).toFixed(2);
      var ry = (px * 2 * MAX_DEG).toFixed(2);
      card.style.transition = 'transform .12s ease-out';
      card.style.willChange = 'transform';
      card.style.transform = 'perspective(900px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) translateY(-8px)';
    }

    card.addEventListener('mousemove', function (e) {
      ev = e;
      if (!raf) raf = requestAnimationFrame(apply);
    });

    card.addEventListener('mouseleave', function () {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      card.style.transition = '';
      card.style.willChange = '';
      card.style.transform = '';
    });
  });
})();
