// 成长轨迹（/journey/）：滚动描绘「探索地图」轨迹
// 结构：一张探索地图——
//   1) 背景：几条淡淡的等高线 + 右上角小罗盘（.journey-map-contour / .journey-map-compass）；
//   2) 路线：一条蜿蜒的虚线（像地图上的徒步路线），底座整条淡显，
//      进度层用 mask 逐段点亮（虚线用 dashoffset 无法逐段生长，mask 才是正确做法）；
//      路线摆动基线/幅度读 CSS 变量 --journey-trail-x / --journey-trail-amp；
//   3) 地标：每个条目 = 地图上的一个地标——头像做图钉头，
//      下方一条分类色图钉尾（.journey-map-pin），里程碑再加一面金色小旗。
// 效果：页面往下滚时，虚线路线从上往下逐段画出来，路线上有个小小的行进光点
//       （.journey-hiker，getPointAtLength 跟随）；路线经过某个地标时，
//       图钉/小旗由灰转亮，头像也像被点亮的地标一样恢复满色（加 .passed）。
// 仅在存在 .journey-wrap 的页面激活；pjax 已关闭，整页加载无需清理。
'use strict';

(function () {
  var NS = 'http://www.w3.org/2000/svg';
  var wrap = null, svg = null;
  var contourPath = null, compass = null;
  var trailBase = null, trailProgress = null, hiker = null;
  var maskRect = null, maskGrad = null, maskStop = null;
  var trailLen = 0;
  var pins = [];   // 每节点 { pin(g), ratio }，pin 里含 tail/head/flag 元素
  var nodes = [];  // 每节点对应的 .journey-item

  // 进度「行进光点」停留在视口 72% 高度处：滚到屏幕下 1/3 时点亮最后一段，
  // 既不太早（页面刚加载就全亮），也不太晚（必须滚到底才能看见终点）。
  var TIP_POS = 0.72;
  // 光点越过地标后，图钉在路线进度 span 内点亮（模拟地标被「到达」）
  var PIN_SPAN = 0.08;

  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }

  function el(name, attrs) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  // 路线在地标 i 处的横向位置：正弦叠加，像地图路线自然蜿蜒（不呆板左右交替）
  function trailX(i, n, baseX, amp) {
    var t = n > 1 ? i / (n - 1) : 0;
    return baseX + amp * Math.sin(t * Math.PI * 3 + 0.8) - 8 * Math.sin(t * Math.PI * 7);
  }

  // 用 Catmull-Rom 样条把途径点连成平滑路线（转三次贝塞尔）
  function splinePath(pts) {
    if (!pts.length) return '';
    if (pts.length === 1) return 'M' + pts[0].x.toFixed(2) + ',' + pts[0].y.toFixed(2);
    var d = 'M' + pts[0].x.toFixed(2) + ',' + pts[0].y.toFixed(2);
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i];
      var p1 = pts[i];
      var p2 = pts[i + 1];
      var p3 = pts[i + 2] || p2;
      var c1x = p1.x + (p2.x - p0.x) / 6;
      var c1y = p1.y + (p2.y - p0.y) / 6;
      var c2x = p2.x - (p3.x - p1.x) / 6;
      var c2y = p2.y - (p3.y - p1.y) / 6;
      d += ' C' + c1x.toFixed(2) + ',' + c1y.toFixed(2) +
           ' ' + c2x.toFixed(2) + ',' + c2y.toFixed(2) +
           ' ' + p2.x.toFixed(2) + ',' + p2.y.toFixed(2);
    }
    return d;
  }

  // 等高线：3 条横贯页面的柔和波浪线（淡得像旧地图上的地形线）
  function buildContourD(W, H) {
    var d = '';
    for (var k = 0; k < 3; k++) {
      var y0 = H * (0.2 + 0.27 * k);
      var pts = [];
      for (var x = 0; x <= W; x += 48) {
        var y = y0 + 16 * Math.sin(x / 95 + k * 2.1) + 9 * Math.sin(x / 31 + k * 1.3);
        pts.push(x.toFixed(0) + ',' + y.toFixed(1));
      }
      d += (d ? ' ' : '') + 'M' + pts.join(' L');
    }
    return d;
  }

  // 小罗盘：右上角装饰
  function buildCompass() {
    var g = el('g', { 'class': 'journey-map-compass' });
    g.appendChild(el('circle', { 'class': 'compass-ring', 'r': '13' }));
    [[0, -10], [0, 10], [10, 0], [-10, 0]].forEach(function (v) {
      g.appendChild(el('line', { x1: '0', y1: '0', x2: String(v[0]), y2: String(v[1]) }));
    });
    var t = el('text', { 'class': 'compass-n', 'text-anchor': 'middle' });
    t.appendChild(document.createTextNode('N'));
    g.appendChild(t);
    return g;
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
    var baseX = parseFloat(css.getPropertyValue('--journey-trail-x')) || 42;
    var amp = parseFloat(css.getPropertyValue('--journey-trail-amp')) || 28;

    // 更新 SVG 画布尺寸（viewBox = 实际像素，1:1）
    svg.setAttribute('viewBox', '0 0 ' + wr.width + ' ' + wr.height);
    svg.style.width = wr.width + 'px';
    svg.style.height = wr.height + 'px';

    // 地图背景：等高线 + 罗盘位置（右上角）
    contourPath.setAttribute('d', buildContourD(wr.width, wr.height));
    compass.setAttribute('transform', 'translate(' + (wr.width - 26) + ',30)');

    // 途径点：每个地标头像圆心 + 入口/出口（让路线从图外走进来又走出去）
    var pts = [], meta = [];
    Array.prototype.forEach.call(items, function (it, i) {
      var av = it.querySelector('.journey-avatar');
      if (!av) { meta.push(null); return; }
      var r = av.getBoundingClientRect();
      var cx = r.left + window.scrollX + r.width / 2 - wr.left;
      var cy = r.top + window.scrollY + r.height / 2 - wrTop;
      pts.push({ x: trailX(i, items.length, baseX, amp), y: cy });
      meta.push({ cx: cx, cy: cy, size: r.height });
    });
    if (pts.length) {
      pts.unshift({ x: trailX(0, items.length, baseX, amp) - 14, y: pts[0].y - 70 });
      pts.push({ x: trailX(items.length - 1, items.length, baseX, amp) + 14, y: pts[pts.length - 1].y + 90 });
    }
    var d = splinePath(pts);
    trailBase.setAttribute('d', d);
    trailProgress.setAttribute('d', d);
    trailLen = trailProgress.getTotalLength() || 0;

    nodes = [];
    Array.prototype.forEach.call(items, function (it, i) {
      if (!meta[i]) return;
      var m = meta[i];
      var pin = pins[i];
      var py = m.cy + m.size / 2;              // 头像底边 = 图钉头中心
      pin.tail.setAttribute('d',
        'M' + (m.cx - 5).toFixed(2) + ',' + (py + 1).toFixed(2) +
        ' L' + (m.cx + 5).toFixed(2) + ',' + (py + 1).toFixed(2) +
        ' L' + m.cx.toFixed(2) + ',' + (py + 15).toFixed(2) + ' Z');
      pin.head.setAttribute('cx', m.cx.toFixed(2));
      pin.head.setAttribute('cy', py.toFixed(2));
      if (pin.flag) {
        pin.flag.setAttribute('transform',
          'translate(' + m.cx.toFixed(2) + ',' + (m.cy - m.size / 2 - 2).toFixed(2) + ')');
      }
      nodes.push(it);
      pins[i].ratio = H > 0 ? (m.cy - trackTopAbs + wrTop) / H : 0;
    });
    return true;
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

    // 路线：mask 从顶部往下逐段点亮虚线进度层
    if (trailLen > 0) {
      var pt = trailProgress.getPointAtLength(p * trailLen);
      var tipY = pt.y + 40;                    // 淡出区固定 40px
      maskRect.setAttribute('height', tipY.toFixed(1));
      maskGrad.setAttribute('y2', tipY.toFixed(1));
      maskStop.setAttribute('offset', (tipY / (tipY + 40) * 100).toFixed(2) + '%');
      // 行进光点跟随路线前端
      hiker.setAttribute('cx', pt.x.toFixed(2));
      hiker.setAttribute('cy', pt.y.toFixed(2));
    }

    // 地标：路线到达即点亮图钉/小旗 + 头像
    for (var i = 0; i < pins.length; i++) {
      var ap = clamp01((p - pins[i].ratio) / PIN_SPAN);
      pins[i].pin.classList.toggle('on', ap >= 0.999);
      nodes[i].classList.toggle('passed', ap >= 0.999);
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
    svg = el('svg', { 'class': 'journey-map', 'xmlns': NS });
    svg.setAttribute('aria-hidden', 'true');
    var defs = el('defs', {});

    // 路线渐变（纵向三色，与旧版树干同一视觉语言）
    var tg = el('linearGradient', { id: 'jm-trail-grad', x1: '0', y1: '0', x2: '0', y2: '1' });
    tg.appendChild(el('stop', { offset: '0%', 'stop-color': '#5b9bd5' }));
    tg.appendChild(el('stop', { offset: '55%', 'stop-color': '#6aab73' }));
    tg.appendChild(el('stop', { offset: '100%', 'stop-color': '#b380b8' }));
    defs.appendChild(tg);

    // 路线进度层的遮罩：白色从顶部覆盖到行进点，底部 40px 淡出——
    // 虚线无法用 dashoffset 逐段生长，mask 才能让虚线「逐段画出来」
    maskGrad = el('linearGradient', {
      id: 'jm-mask-grad', gradientUnits: 'userSpaceOnUse',
      x1: '0', y1: '0', x2: '0', y2: '1'
    });
    maskGrad.appendChild(el('stop', { offset: '0%', 'stop-color': '#fff' }));
    maskStop = el('stop', { offset: '80%', 'stop-color': '#fff' });
    maskGrad.appendChild(maskStop);
    maskGrad.appendChild(el('stop', { offset: '100%', 'stop-color': '#000' }));
    var mask = el('mask', { id: 'jm-trail-mask', maskUnits: 'userSpaceOnUse' });
    maskRect = el('rect', { x: '-40', y: '0', width: '2000', height: '0', fill: 'url(#jm-mask-grad)' });
    mask.appendChild(maskRect);
    defs.appendChild(maskGrad);
    defs.appendChild(mask);
    svg.appendChild(defs);

    // 背景：等高线 + 罗盘
    contourPath = el('path', { 'class': 'journey-map-contour' });
    compass = buildCompass();
    svg.appendChild(contourPath);
    svg.appendChild(compass);

    // 路线（虚线底座 + 渐变进度）+ 行进光点
    trailBase = el('path', { 'class': 'journey-trail journey-trail-base' });
    trailProgress = el('path', {
      'class': 'journey-trail journey-trail-progress',
      'stroke': 'url(#jm-trail-grad)',
      'mask': 'url(#jm-trail-mask)'
    });
    hiker = el('circle', { 'class': 'journey-hiker', 'r': '4' });
    svg.appendChild(trailBase);
    svg.appendChild(trailProgress);
    svg.appendChild(hiker);

    // 地标：每节点一个图钉（分类色头+尾），里程碑再加金旗
    Array.prototype.forEach.call(wrap.querySelectorAll('.journey-item'), function (it, i) {
      var jcd = getComputedStyle(it).getPropertyValue('--jcd').trim() || '#5b9bd5';
      var g = el('g', { 'class': 'journey-map-pin' });
      g.style.color = jcd;                  // currentColor 给头/尾同色
      g.style.setProperty('--jcd', jcd);    // 点亮光晕用
      var tail = el('path', { 'class': 'pin-tail' });
      var head = el('circle', { 'class': 'pin-head', 'r': '7' });
      g.appendChild(tail);
      g.appendChild(head);
      var flag = null;
      if (it.classList.contains('milestone')) {
        flag = el('g', { 'class': 'journey-map-flag' });
        flag.appendChild(el('line', { 'class': 'flag-pole', x1: '0', y1: '0', x2: '0', y2: '-17' }));
        flag.appendChild(el('path', {
          'class': 'flag-cloth',
          'd': 'M0,-17 L11,-13.5 L0,-10 Z'
        }));
        g.appendChild(flag);
      }
      svg.appendChild(g);
      pins.push({ pin: g, tail: tail, head: head, flag: flag, ratio: 0 });
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
