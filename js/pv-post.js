// 文章页侧栏顶部插入小卡片：本文浏览 : N
// 数据来自 umami-proxy Worker（按当前路径过滤）。
// 注意：主题在文章页不渲染 card_webinfo（见 themes/butterfly/layout/includes/widget/index.pug），
// 所以这里用独立卡片而不是往现有统计卡里塞行。
;(function () {
  if (!window.GLOBAL_CONFIG_SITE || window.GLOBAL_CONFIG_SITE.pageType !== 'post') return;

  var STATS_URL = 'https://umami.jasmine-iris.top/api/websites/ec777610-c4cf-493c-a333-c1dc46377957/stats';

  function build() {
    var aside = document.getElementById('aside-content');
    if (!aside || document.getElementById('pv-post-card')) return;

    var card = document.createElement('div');
    card.className = 'card-widget card-pv-post';
    card.id = 'pv-post-card';

    var anchor = aside.querySelector('.sticky_layout') || aside.firstChild;
    aside.insertBefore(card, anchor);

    var row = document.createElement('div');
    row.className = 'pv-row';

    var icon = document.createElement('i');
    icon.className = 'fas fa-eye';

    var label = document.createElement('span');
    label.className = 'pv-label';
    label.textContent = '本文浏览';

    var num = document.createElement('span');
    num.className = 'pv-count';
    num.textContent = '-';

    row.appendChild(icon);
    row.appendChild(label);
    row.appendChild(num);
    card.appendChild(row);
  }

  function fill() {
    build();
    var target = document.querySelector('#pv-post-card .pv-count');
    if (!target) return;

    var path = window.location.pathname;
    // pathname 浏览器返回的已是百分号编码，直接再 encodeURIComponent 会双重编码，
    // Umami 的 url 过滤就永远匹配不上（中文链接全部显示 -）。先解码再编码一次。
    try { path = decodeURIComponent(path); } catch (e) { /* 原样兜底 */ }
    var url = STATS_URL +
      '?startAt=0&endAt=' + Date.now() +
      '&url=' + encodeURIComponent(path) +
      '&path=' + encodeURIComponent(path);

    fetch(url, { credentials: 'omit' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (d) {
        var v = d && d.pageviews;
        v = v && typeof v.value !== 'undefined' ? v.value : v;
        target.textContent = typeof v === 'number' && v > 0 ? String(v) : '-';
      })
      .catch(function () {
        target.textContent = '-';
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fill);
  } else {
    fill();
  }
})();
