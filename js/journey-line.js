// 成长轨迹（/journey/）：滚动描绘轨迹线
// 效果：页面往下滚时，第一颗头像到最后一颗头像之间的竖线从上往下逐渐「画」出来——
//       已走过的部分变成渐变实线（端点带光点），未到达的保持淡虚线；
//       进度线扫过的节点头像依次点亮（去灰 + 分类色光晕）。
// 仅在存在 .journey-wrap 的页面激活（其他页自守门）；
// pjax 已关闭（_config.butterfly.yml pjax.enable: false），整页加载无需清理。
'use strict';

(function () {
  var wrap = null;
  var track = null;
  var progress = null;
  var nodes = [];    // 每个节点对应的 .journey-item
  var ratios = [];   // 每个节点中心相对 track 起点的纵向比值（0~1）
  var rafId = 0;

  // 进度线「笔尖」停留在视口 72% 高度处：滚到屏幕下 1/3 时点亮最后一段，
  // 既不太早（页面刚加载就全亮），也不太晚（必须滚到底才能看见终点）。
  var TIP_POS = 0.72;

  // 读 .journey-item 节点 + 头像中心 → 计算整条轨迹起止与每节比值
  function measure() {
    var items = wrap.querySelectorAll('.journey-item');
    if (items.length < 1) return false;

    var first = items[0].querySelector('.journey-avatar');
    var last = items[items.length - 1].querySelector('.journey-avatar');
    if (!first || !last) return false;

    var wr = wrap.getBoundingClientRect();
    var fr = first.getBoundingClientRect();
    var lr = last.getBoundingClientRect();
    var wrTop = wr.top + window.scrollY;
    var trackTopAbs = fr.top + window.scrollY + fr.height / 2;
    var trackBotAbs = lr.top + window.scrollY + lr.height / 2;
    var height = Math.max(0, trackBotAbs - trackTopAbs);
    // 端点 x 落在头像圆心；2px 宽线居中于圆心（avatar 36px → center 18px → left = 18 - 1）
    var leftAbs = fr.left + window.scrollX + fr.width / 2 - 1;

    track.style.top = (trackTopAbs - wrTop) + 'px';
    track.style.height = height + 'px';
    track.style.left = (leftAbs - wr.left) + 'px';

    nodes = [];
    ratios = [];
    items.forEach(function (it) {
      var av = it.querySelector('.journey-avatar');
      if (!av) return;
      var r = av.getBoundingClientRect();
      var cyAbs = r.top + window.scrollY + r.height / 2;
      nodes.push(it);
      ratios.push(height > 0 ? (cyAbs - trackTopAbs) / height : 0);
    });
    return height > 0;
  }

  function update() {
    rafId = 0;
    if (!wrap || !nodes.length) return;

    var viewH = window.innerHeight || document.documentElement.clientHeight;
    // 滚到页面底部（文档底边贴到视口底）时，轨迹必然走完——
    // 否则短轨迹的最后节点永远不会点亮。
    var atBottom = window.innerHeight + window.scrollY >=
                   document.documentElement.scrollHeight - 4;
    // 笔尖绝对 Y（文档坐标系）
    var tipAbsY = (window.scrollY + viewH * TIP_POS);
    var fr = nodes[0].querySelector('.journey-avatar').getBoundingClientRect();
    var trackTopAbs = fr.top + window.scrollY + fr.height / 2;
    var lr = nodes[nodes.length - 1].querySelector('.journey-avatar').getBoundingClientRect();
    var trackBotAbs = lr.top + window.scrollY + lr.height / 2;
    var height = trackBotAbs - trackTopAbs;
    if (height <= 0) return;

    var p = (tipAbsY - trackTopAbs) / height;
    if (atBottom) p = 1;
    p = Math.max(0, Math.min(1, p));

    progress.style.height = (p * 100).toFixed(2) + '%';
    // .passed 加在 item 上（CSS 选择器 .journey-item.passed）
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].classList.toggle('passed', ratios[i] <= p + 0.001);
    }
  }

  function onScroll() {
    if (rafId) return;
    rafId = requestAnimationFrame(update);
  }

  function onResize() {
    if (!wrap) return;
    if (measure()) update();
  }

  function init() {
    wrap = document.querySelector('.journey-wrap');
    if (!wrap || !wrap.querySelector('.journey-item')) return;

    track = document.createElement('div');
    track.className = 'journey-line-track';
    track.innerHTML =
      '<div class="journey-line-base"></div>' +
      '<div class="journey-line-progress"></div>';
    wrap.appendChild(track);
    progress = track.querySelector('.journey-line-progress');

    wrap.classList.add('journey-line-on');
    if (!measure()) return;

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    // 配图懒加载/评论区加载会改变高度，重新测量
    if ('ResizeObserver' in window) {
      new ResizeObserver(onResize).observe(wrap);
    }
    update();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();