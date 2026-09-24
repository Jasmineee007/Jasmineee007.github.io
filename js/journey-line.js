// 成长轨迹（/journey/）：滚动描绘「树枝」轨迹
// 结构：SVG 画一根微微弯曲的树干（主干），
//       每个节点从树干上斜斜地「长」出一根上扬的枝（二次贝塞尔曲线），
//       节点头像像果实一样挂在枝头。
// 效果：页面往下滚时，树干从上往下逐渐长出来（笔尖光点跟随）；
//       笔尖越过某个节点时，该节点的枝从树干向外长出来（末端渐亮）；
//       枝长满后头像像果实一样亮起（去灰 + 分类色光晕）。
// 仅在存在 .journey-wrap 的页面激活（其他页自守门）；
// pjax 已关闭（_config.butterfly.yml pjax.enable: false），整页加载无需清理。
'use strict';

(function () {
  var NS = 'http://www.w3.org/2000/svg';
  var wrap = null;
  var svg = null;
  var trunkBase = null;
  var trunkProgress = null;
  var pen = null;
  var trunkLen = 0;
  var branches = [];   // 每节点 { base, fill, tip, ratio, grad }
  var nodes = [];      // 每节点对应的 .journey-item

  // 进度线「笔尖」停留在视口 72% 高度处：滚到屏幕下 1/3 时点亮最后一段，
  // 既不太早（页面刚加载就全亮），也不太晚（必须滚到底才能看见终点）。
  var TIP_POS = 0.72;
  // 笔尖越过节点后，枝在树干进度 span 内从树干向外长完（模拟枝条伸展）
  var BRANCH_SPAN = 0.14;

  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }

  function el(name, attrs) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  // 主干在纵向位置 y 处的横向摆动——模拟自然弯曲（一个完整正弦波，幅度 ±AMP）
  function trunkX(x0, y, yTop, H, AMP) {
    var t = H > 0 ? (y - yTop) / H : 0;
    return x0 + AMP * Math.sin(t * Math.PI * 2);
  }

  // 树干路径：从 yTop 到 yBot，采样 28 段折线（足够平滑，且 getTotalLength 精确）
  function buildTrunkPath(x0, yTop, yBot, AMP) {
    var H = yBot - yTop;
    var pts = [];
    var N = 28;
    for (var i = 0; i <= N; i++) {
      var y = yTop + H * i / N;
      pts.push(trunkX(x0, y, yTop, H, AMP).toFixed(2) + ',' + y.toFixed(2));
    }
    return 'M' + pts.join(' L');
  }

  // 枝条路径：从树干上（起点，略低于头像圆心）向上弯到头像左缘——斜斜上扬
  function buildBranchPath(sx, sy, tx, ty) {
    var cxp = (sx + tx) / 2;
    var cyp = Math.min(sy, ty) - 20;   // 控制点明显上扬，形成弧线
    return 'M' + sx.toFixed(2) + ',' + sy.toFixed(2) +
           ' Q' + cxp.toFixed(2) + ',' + cyp.toFixed(2) +
           ' ' + tx.toFixed(2) + ',' + ty.toFixed(2);
  }

  // 把 #rrggbb 朝 #ffffff 混合 t（0~1），用于枝头渐亮
  function mixWhite(hex, t) {
    var v = parseInt(hex.slice(1), 16);
    var r = ((v >> 16) & 255), g = ((v >> 8) & 255), b = (v & 255);
    r = Math.round(r + (255 - r) * t);
    g = Math.round(g + (255 - g) * t);
    b = Math.round(b + (255 - b) * t);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }

  function measure() {
    var items = wrap.querySelectorAll('.journey-item');
    if (items.length < 1) return false;
    var first = items[0], last = items[items.length - 1];
    var wr = wrap.getBoundingClientRect();
    var wrTop = wr.top + window.scrollY;
    var fr = first.getBoundingClientRect();
    var lr = last.getBoundingClientRect();
    var trackTopAbs = fr.top + window.scrollY;
    var trackBotAbs = lr.bottom + window.scrollY;
    var H = Math.max(0, trackBotAbs - trackTopAbs);
    if (H <= 0) return false;

    var css = getComputedStyle(wrap);
    var x0 = parseFloat(css.getPropertyValue('--journey-trunk-x')) || 7.5;
    var AMP = parseFloat(css.getPropertyValue('--journey-trunk-wave')) || 3;

    // 更新 SVG 画布尺寸（viewBox = 实际像素，1:1）
    svg.setAttribute('viewBox', '0 0 ' + wr.width + ' ' + wr.height);
    svg.style.width = wr.width + 'px';
    svg.style.height = wr.height + 'px';

    var trunkD = buildTrunkPath(x0, trackTopAbs - wrTop, trackBotAbs - wrTop, AMP);
    trunkBase.setAttribute('d', trunkD);
    trunkProgress.setAttribute('d', trunkD);
    trunkLen = trunkProgress.getTotalLength() || 0;

    nodes = [];
    branches = [];
    Array.prototype.forEach.call(items, function (it, i) {
      var av = it.querySelector('.journey-avatar');
      if (!av) return;
      var r = av.getBoundingClientRect();
      // 头像圆心 / 枝起点（wrap 坐标系）
      var tx = r.left + window.scrollX + r.width / 2 - wr.left;
      var ty = r.top + window.scrollY + r.height / 2 - wrTop;
      var sy = ty + 6;                        // 起点略低于圆心——枝从下方斜向上长
      var sx = trunkX(x0, sy, trackTopAbs - wrTop, H, AMP);
      var txe = tx - r.width / 2 + 5;         // 终点伸进头像左缘一点，被头像盖住（像挂在枝头）
      var d = buildBranchPath(sx, sy, txe, ty);

      var base = branches[i] ? branches[i].base : null;
      var fill = branches[i] ? branches[i].fill : null;
      var tip = branches[i] ? branches[i].tip : null;
      base.setAttribute('d', d);
      fill.setAttribute('d', d);
      tip.setAttribute('cx', txe.toFixed(2));
      tip.setAttribute('cy', ty.toFixed(2));
      // 枝条渐变：userSpaceOnUse，从树干到枝头
      branches[i].grad.setAttribute('x1', sx.toFixed(2));
      branches[i].grad.setAttribute('y1', sy.toFixed(2));
      branches[i].grad.setAttribute('x2', txe.toFixed(2));
      branches[i].grad.setAttribute('y2', ty.toFixed(2));

      nodes.push(it);
      branches[i].ratio = H > 0 ? (ty - trackTopAbs + wrTop) / H : 0;
    });
    return H > 0;
  }

  function update() {
    if (!wrap || !nodes.length) return;
    var viewH = window.innerHeight || document.documentElement.clientHeight;
    // 滚到页面底部（文档底边贴到视口底）时，轨迹必然走完
    var atBottom = window.innerHeight + window.scrollY >=
                   document.documentElement.scrollHeight - 4;
    var tipAbsY = window.scrollY + viewH * TIP_POS;
    var fr = nodes[0].getBoundingClientRect();
    var trackTopAbs = fr.top + window.scrollY;
    var lr = nodes[nodes.length - 1].getBoundingClientRect();
    var trackBotAbs = lr.bottom + window.scrollY;
    var H = trackBotAbs - trackTopAbs;
    if (H <= 0) return;
    var p = (tipAbsY - trackTopAbs) / H;
    if (atBottom) p = 1;
    p = clamp01(p);

    // 树干：从上往下长（dash 从全长收拢到 0）
    trunkProgress.setAttribute('stroke-dashoffset', (100 * (1 - p)).toFixed(2));
    // 笔尖光点跟随树干生长端
    if (trunkLen > 0) {
      var pt = trunkProgress.getPointAtLength(p * trunkLen);
      pen.setAttribute('cx', pt.x.toFixed(2));
      pen.setAttribute('cy', pt.y.toFixed(2));
    }

    // 枝条：从树干向外长；长满后节点像果实一样点亮
    for (var i = 0; i < branches.length; i++) {
      var bp = clamp01((p - branches[i].ratio) / BRANCH_SPAN);
      branches[i].fill.setAttribute('stroke-dashoffset', (100 * (1 - bp)).toFixed(2));
      branches[i].tip.setAttribute('opacity', bp >= 0.999 ? 1 : 0.25);
      nodes[i].classList.toggle('passed', bp >= 0.999);
    }
  }

  // 直接同步调用 update()：节点数很少（每帧几次 getTotalLength/getPointAtLength），
  // 且不依赖 rAF——后台/节能标签页会暂停 rAF，异步节流反而会让轨迹卡在 0%。
  function onScroll() {
    update();
  }

  function onResize() {
    if (!wrap) return;
    if (measure()) update();
  }

  function init() {
    wrap = document.querySelector('.journey-wrap');
    if (!wrap || !wrap.querySelector('.journey-item')) return;

    // 建 SVG 画布（覆盖整个 wrap，z-index:-1 垫在内容之下）
    svg = el('svg', { 'class': 'journey-tree', 'xmlns': NS });
    svg.setAttribute('aria-hidden', 'true');
    var defs = el('defs', {});

    // 树干渐变（纵向三色）
    var tg = el('linearGradient', { id: 'jt-trunk-grad', x1: '0', y1: '0', x2: '0', y2: '1' });
    tg.appendChild(el('stop', { offset: '0%', 'stop-color': '#5b9bd5' }));
    tg.appendChild(el('stop', { offset: '55%', 'stop-color': '#6aab73' }));
    tg.appendChild(el('stop', { offset: '100%', 'stop-color': '#b380b8' }));
    defs.appendChild(tg);

    // 枝条渐变（每个节点一个：分类色 → 枝头渐亮）
    var brGrads = [];
    Array.prototype.forEach.call(wrap.querySelectorAll('.journey-item'), function (it, i) {
      var jcd = getComputedStyle(it).getPropertyValue('--jcd').trim() || '#5b9bd5';
      var g = el('linearGradient', {
        id: 'jt-branch-grad-' + i,
        gradientUnits: 'userSpaceOnUse'
      });
      defs.appendChild(g);
      brGrads.push({ g: g, jcd: jcd });
    });
    svg.appendChild(defs);

    trunkBase = el('path', {
      'class': 'journey-tree-trunk journey-tree-trunk-base',
      'stroke-dasharray': '100', 'pathLength': '100'
    });
    trunkProgress = el('path', {
      'class': 'journey-tree-trunk journey-tree-trunk-progress',
      'stroke': 'url(#jt-trunk-grad)',
      'stroke-dasharray': '100', 'pathLength': '100'
    });
    pen = el('circle', { 'class': 'journey-tree-pen', 'r': '3.5' });
    svg.appendChild(trunkBase);
    svg.appendChild(trunkProgress);
    svg.appendChild(pen);

    // 每节点一根枝
    Array.prototype.forEach.call(wrap.querySelectorAll('.journey-item'), function (it, i) {
      var grad = brGrads[i];
      var g = el('g', { 'class': 'journey-tree-branch' });
      var base = el('path', {
        'class': 'journey-tree-branch-base',
        'pathLength': '100'
      });
      var fill = el('path', {
        'class': 'journey-tree-branch-fill',
        'stroke': 'url(#jt-branch-grad-' + i + ')',
        'stroke-dasharray': '100', 'pathLength': '100'
      });
      var tip = el('circle', {
        'class': 'journey-tree-branch-tip',
        'r': '2.5',
        'fill': mixWhite(grad.jcd, 0.35),
        'opacity': '0.25'
      });
      g.appendChild(base);
      g.appendChild(fill);
      g.appendChild(tip);
      svg.appendChild(g);
      branches.push({ base: base, fill: fill, tip: tip, ratio: 0, grad: grad });
    });

    wrap.appendChild(svg);
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
