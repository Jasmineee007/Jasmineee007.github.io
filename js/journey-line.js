// 成长轨迹（/journey/）：滚动描绘「树干 + 横枝」轨迹
// 结构：左侧主干竖线（淡虚线底座 + 渐变进度，端点带光点），
//       每个节点从头像伸出一根横枝连到主干（底座淡色 + 渐变填充）。
// 效果：页面往下滚时，主干从上往下逐渐「画」出来；
//       笔尖越过某个节点时，该节点的横枝从左向右「长」出；
//       枝长出后头像像果实一样亮起（去灰 + 分类色光晕）。
// 仅在存在 .journey-wrap 的页面激活（其他页自守门）；
// pjax 已关闭（_config.butterfly.yml pjax.enable: false），整页加载无需清理。
'use strict';

(function () {
  var wrap = null;
  var track = null;
  var progress = null;
  var branches = [];   // 每个节点对应的 .journey-line-branch（横枝容器）
  var branchFills = [];
  var nodes = [];      // 每个节点对应的 .journey-item
  var ratios = [];     // 每个节点头像中心相对主干起点的纵向比值（0~1）
  var rafId = 0;

  // 进度线「笔尖」停留在视口 72% 高度处：滚到屏幕下 1/3 时点亮最后一段，
  // 既不太早（页面刚加载就全亮），也不太晚（必须滚到底才能看见终点）。
  var TIP_POS = 0.72;
  // 笔尖越过节点后，横枝在主干进度 span 内从左向右长完（模拟树枝伸展）
  var BRANCH_SPAN = 0.14;

  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }

  // 读 .journey-item 节点 + 头像中心 → 计算主干起止、每节比值与横枝几何
  function measure() {
    var items = wrap.querySelectorAll('.journey-item');
    if (items.length < 1) return false;

    var first = items[0];
    var last = items[items.length - 1];
    var wr = wrap.getBoundingClientRect();
    var wrTop = wr.top + window.scrollY;
    var fr = first.getBoundingClientRect();
    var lr = last.getBoundingClientRect();
    // 主干：从第一个条目顶部到最后一个条目底部（比只连头像圆心更长，轨迹感更足）
    var trackTopAbs = fr.top + window.scrollY;
    var trackBotAbs = lr.bottom + window.scrollY;
    var height = Math.max(0, trackBotAbs - trackTopAbs);

    track.style.top = (trackTopAbs - wrTop) + 'px';
    track.style.height = height + 'px';
    // left 由 CSS 固定（主干贴左缘），这里不动

    nodes = [];
    ratios = [];
    Array.prototype.forEach.call(items, function (it, i) {
      var av = it.querySelector('.journey-avatar');
      var br = branches[i];
      if (!av || !br) return;
      var r = av.getBoundingClientRect();
      var cyAbs = r.top + window.scrollY + r.height / 2;
      // 横枝：从头像圆心高度，主干右缘 → 头像圆心（果实坐在枝梢上）
      var bLeft = parseFloat(getComputedStyle(br).left) || 6;
      var bRightAbs = r.left + window.scrollX + r.width / 2;
      br.style.top = (cyAbs - wrTop - 1.5) + 'px';
      br.style.width = Math.max(0, (bRightAbs - wr.left) - bLeft) + 'px';
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
    var fr = nodes[0].getBoundingClientRect();
    var trackTopAbs = fr.top + window.scrollY;
    var lr = nodes[nodes.length - 1].getBoundingClientRect();
    var trackBotAbs = lr.bottom + window.scrollY;
    var height = trackBotAbs - trackTopAbs;
    if (height <= 0) return;

    var p = (tipAbsY - trackTopAbs) / height;
    if (atBottom) p = 1;
    p = clamp01(p);

    // 主干进度
    progress.style.height = (p * 100).toFixed(2) + '%';
    // 每根横枝：笔尖越过节点后 span 内从左向右长完；长完后节点点亮
    for (var i = 0; i < nodes.length; i++) {
      var bp = clamp01((p - ratios[i]) / BRANCH_SPAN);
      branchFills[i].style.width = (bp * 100).toFixed(2) + '%';
      nodes[i].classList.toggle('passed', bp >= 0.999);
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

    // 每根横枝：先建好容器，measure() 里再按节点定位
    Array.prototype.forEach.call(wrap.querySelectorAll('.journey-item'), function () {
      var br = document.createElement('div');
      br.className = 'journey-line-branch';
      br.innerHTML =
        '<div class="journey-line-branch-base"></div>' +
        '<div class="journey-line-branch-fill"></div>';
      wrap.appendChild(br);
      branches.push(br);
      branchFills.push(br.querySelector('.journey-line-branch-fill'));
    });

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
