// 滚动入场：卡片首次进入视口时淡入上浮，只播一次
// 播完后移除标记类，避免 transition 定义影响 hover 的位移速度
;(function () {
  var docEl = document.documentElement;
  if (docEl.classList.contains('reveal-init')) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  docEl.classList.add('reveal-init');

  var els = Array.prototype.slice.call(
    document.querySelectorAll('.recent-post-item, .card-widget, #article-container')
  );
  if (!els.length) return;

  function show(el) {
    el.classList.add('reveal-in');
    el.addEventListener('transitionend', function h(e) {
      if (e.target !== el || e.propertyName !== 'opacity') return;
      el.classList.remove('reveal', 'reveal-in');
      el.removeEventListener('transitionend', h);
    });
  }

  if (!('IntersectionObserver' in window)) {
    els.forEach(function (el) { el.classList.remove('reveal'); });
    return;
  }

  var batch = [];
  var timer = null;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      batch.push(en.target);
      io.unobserve(en.target);
    });
    if (batch.length && !timer) {
      timer = setTimeout(function () {
        batch.forEach(function (el, i) {
          setTimeout(function () { show(el); }, i * 70);
        });
        batch = [];
        timer = null;
      }, 30);
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });

  els.forEach(function (el) { el.classList.add('reveal'); io.observe(el); });
})();
