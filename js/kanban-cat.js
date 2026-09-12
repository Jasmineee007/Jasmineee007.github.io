// 看板猫「小茉莉」：纯 SVG/CSS 自绘，零依赖（jsdelivr/unpkg 国内不可达，不引外部库）
// 行为：左下角常驻；≤768px 或屏高≤560px 自动收成猫头小圆钮（点开可再看）；桌面端可手动收起并记住偏好
// 彩蛋：小蝴蝶绕头顶飞，猫猫眼神追着它；每隔一阵子扑一次蝴蝶
// 调试后门：window.__kgCatApi.show('文本') / fold() / open() / chase()
;(function () {
  if (window.__kgCat) return;
  window.__kgCat = true;

  var FOLD_KEY = 'kg-cat-fold';
  var SMALL = window.matchMedia('(max-width: 768px)');
  var SHORT = window.matchMedia('(max-height: 560px)'); // 屏幕太矮也算「小屏」，同样收起

  /* ---------- SVG 造型 ---------- */
  // 头部（整只猫和小圆钮共用，保证收起前后是同一只猫）
  function headSVG(wrap, viewBox) {
    var s =
      // 耳朵（画在头后面，耳根被头盖住）
      '<g class="kg-ear kg-ear-l">' +
      '<path d="M60 62 L47 16 Q46 10 52 13 L94 42 Z" fill="#fffdf8" stroke="#7a6a63" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M63 54 L55 26 Q54 22 58 24 L82 40 Z" fill="#f6bfc8"/>' +
      '</g>' +
      '<g class="kg-ear kg-ear-r">' +
      '<path d="M140 62 L153 16 Q154 10 148 13 L106 42 Z" fill="#fffdf8" stroke="#7a6a63" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M137 54 L145 26 Q146 22 142 24 L118 40 Z" fill="#f6bfc8"/>' +
      '</g>' +
      // 脸
      '<ellipse cx="100" cy="88" rx="56" ry="50" fill="#fffdf8" stroke="#7a6a63" stroke-width="3"/>' +
      // 额头纹
      '<g fill="none" stroke="#eeb88a" stroke-width="3.5" stroke-linecap="round">' +
      '<path d="M86 42 Q88 48 86 54"/><path d="M100 40 Q102 47 100 54"/><path d="M114 42 Q112 48 114 54"/>' +
      '</g>' +
      // 眼睛（睁眼可随鼠标转动；闭合/开心两态切换）
      '<g class="kg-eye">' +
      '<g class="kg-eye-open">' +
      '<path d="M65 88 Q76 78 87 88" fill="none" stroke="#5a4a44" stroke-width="3.5" stroke-linecap="round"/>' +
      '<g class="kg-pupil-track">' +
      '<ellipse cx="76" cy="93" rx="10.5" ry="12" fill="#4f9e6f" stroke="#3c7d58" stroke-width="1.5"/>' +
      '<ellipse cx="76" cy="94" rx="4.2" ry="7.4" fill="#2e2a28"/>' +
      '<circle cx="72.6" cy="88.5" r="3.1" fill="#fff"/>' +
      '<circle cx="79.4" cy="97.5" r="1.6" fill="#fff" opacity=".85"/>' +
      '</g></g>' +
      '<path class="kg-eye-closed" d="M66 94 Q76 100 86 94" fill="none" stroke="#5a4a44" stroke-width="3" stroke-linecap="round"/>' +
      '<path class="kg-eye-happy" d="M66 93 Q76 82 86 93" fill="none" stroke="#5a4a44" stroke-width="3.5" stroke-linecap="round"/>' +
      '</g>' +
      '<g class="kg-eye">' +
      '<g class="kg-eye-open">' +
      '<path d="M113 88 Q124 78 135 88" fill="none" stroke="#5a4a44" stroke-width="3.5" stroke-linecap="round"/>' +
      '<g class="kg-pupil-track">' +
      '<ellipse cx="124" cy="93" rx="10.5" ry="12" fill="#4f9e6f" stroke="#3c7d58" stroke-width="1.5"/>' +
      '<ellipse cx="124" cy="94" rx="4.2" ry="7.4" fill="#2e2a28"/>' +
      '<circle cx="120.6" cy="88.5" r="3.1" fill="#fff"/>' +
      '<circle cx="127.4" cy="97.5" r="1.6" fill="#fff" opacity=".85"/>' +
      '</g></g>' +
      '<path class="kg-eye-closed" d="M114 94 Q124 100 134 94" fill="none" stroke="#5a4a44" stroke-width="3" stroke-linecap="round"/>' +
      '<path class="kg-eye-happy" d="M114 93 Q124 82 134 93" fill="none" stroke="#5a4a44" stroke-width="3.5" stroke-linecap="round"/>' +
      '</g>' +
      // 腮红
      '<ellipse cx="60" cy="109" rx="9" ry="4.8" fill="#f8c3cb" opacity=".8"/>' +
      '<ellipse cx="140" cy="109" rx="9" ry="4.8" fill="#f8c3cb" opacity=".8"/>' +
      // 鼻子和嘴
      '<path d="M95.5 105.5 Q100 102.5 104.5 105.5 Q103 112 100 113 Q97 112 95.5 105.5 Z" fill="#f2a7b3"/>' +
      '<path class="kg-mouth-normal" d="M100 113 Q95 118.5 89.5 115 M100 113 Q105 118.5 110.5 115" fill="none" stroke="#7a6a63" stroke-width="2.4" stroke-linecap="round"/>' +
      '<path class="kg-mouth-happy" d="M89 113.5 Q100 126 111 113.5 Q100 117.5 89 113.5 Z" fill="#e58a96"/>' +
      // 胡须
      '<g fill="none" stroke="#b3a196" stroke-width="2" stroke-linecap="round">' +
      '<path d="M50 101 L28 96"/><path d="M49 108 L25 108"/><path d="M50 115 L28 120"/>' +
      '<path d="M150 101 L172 96"/><path d="M151 108 L175 108"/><path d="M150 115 L172 120"/>' +
      '</g>';
    if (!wrap) return s;
    return '<svg class="kg-svg" viewBox="' + (viewBox || '0 0 200 212') + '" aria-hidden="true">' + s + '</svg>';
  }

  function fullSVG() {
    var tail =
      '<g class="kg-tail">' +
      '<path d="M144 182 C186 172 190 130 178 106 C173 95 163 90 153 93" fill="none" stroke="#7a6a63" stroke-width="24" stroke-linecap="round"/>' +
      '<path d="M144 182 C186 172 190 130 178 106 C173 95 163 90 153 93" fill="none" stroke="#fffdf8" stroke-width="18" stroke-linecap="round"/>' +
      '<circle cx="153" cy="93" r="8.5" fill="#eeb88a" stroke="#7a6a63" stroke-width="3"/>' +
      '</g>';
    var body =
      '<path d="M100 120 C64 120 52 148 54 176 C56 202 76 208 100 208 C124 208 144 202 146 176 C148 148 136 120 100 120 Z" fill="#fffdf8" stroke="#7a6a63" stroke-width="3"/>' +
      '<ellipse cx="100" cy="188" rx="26" ry="15" fill="#fdf3e7"/>' +
      '<ellipse cx="77" cy="201" rx="15" ry="8.5" fill="#fffdf8" stroke="#7a6a63" stroke-width="3"/>' +
      '<ellipse cx="123" cy="201" rx="15" ry="8.5" fill="#fffdf8" stroke="#7a6a63" stroke-width="3"/>';
    // 项圈 + 叶子吊牌（呼应全站树叶光标）
    var collar =
      '<path d="M74 132 Q100 146 126 132 L126 141 Q100 155 74 141 Z" fill="#7fae7f" stroke="#6a9a6a" stroke-width="2"/>' +
      '<g transform="translate(100 150) rotate(16)">' +
      '<path d="M0 -7 Q6 -2 0 7 Q-6 -2 0 -7 Z" fill="#5c9e63" stroke="#4a854f" stroke-width="1.5"/>' +
      '<path d="M0 -5 L0 5" stroke="#dcead8" stroke-width="1.2" fill="none"/>' +
      '</g>';
    // 头顶的小伙伴小蝴蝶（从旧稿并进来的点子）
    var bf =
      '<g class="kg-bf" transform="translate(172 22)">' +
      '<g class="kg-bf-float">' +
      '<g class="kg-bf-wings">' +
      '<path d="M2 0 C 10 -12 24 -11 25 -2 C 26 5 14 9 2 4 Z" fill="#f6bfc8" stroke="#e58a96" stroke-width="1.5"/>' +
      '<path d="M2 5 C 10 7 19 11 16 18 C 13 23 4 19 1 9 Z" fill="#f9d3da" stroke="#e58a96" stroke-width="1.5"/>' +
      '</g>' +
      '<g class="kg-bf-wings kg-bf-wings-r">' +
      '<path d="M-2 0 C -10 -12 -24 -11 -25 -2 C -26 5 -14 9 -2 4 Z" fill="#f6bfc8" stroke="#e58a96" stroke-width="1.5"/>' +
      '<path d="M-2 5 C -10 7 -19 11 -16 18 C -13 23 -4 19 -1 9 Z" fill="#f9d3da" stroke="#e58a96" stroke-width="1.5"/>' +
      '</g>' +
      '<ellipse cx="0" cy="8" rx="2.6" ry="7" fill="#7a6a63"/>' +
      '</g></g>';
    return '<svg class="kg-svg" viewBox="0 0 200 212" aria-hidden="true"><g class="kg-all">' + tail + body + collar + headSVG(false) + bf + '</g></svg>';
  }

  /* ---------- 文案 ---------- */
  var IDLE = [
    // 本命台词：留言梗
    '听说给博主留言，她会很开心的喵',
    // 通用陪伴
    '喵~ 猫猫会一直在角落陪着你的',
    '写代码久了要眨眨眼休息一下喵',
    '偷偷说：右键菜单里藏着「随便逛逛」哦',
    '深夜的 flag 虽香，可不要贪杯喵',
    '喵呜——(伸了个懒腰)',
    '喜欢猫猫的话，去关于页给主人留言吧~',
    '学习 Web 安全的时候，猫猫帮你盯着 XSS 喵',
    '据说摸猫头会变聪明，不信你点点看喵？',
    // 可爱的自言自语
    '咦……我的尾巴怎么自己在动喵？',
    '今天也把小爪子舔得干干净净了喵',
    '要是博客里能装个纸箱就好了喵',
    '呼……呼……（好像有人在看，假装睡觉）',
    '主人的文章里全是奇怪的符号，喵？',
    '唔，这一段有 SQL 注入的味道喵',
    '太阳好的日子，最适合窝在键盘上喵',
    '等等，让我想想昨天的小鱼干放哪了喵……',
    '哼，我才不是看板娘，我是看板猫喵！',
    '嘘——我在帮主人盯着评论区喵',
    '月亮出来的时候，猫猫的眼睛会更亮哦',
    '喵の心得：再复杂的漏洞，也要从原理啃起喵',
    '（盯着光标上的小叶子）这个……能吃吗喵？',
    '键盘那么暖，怪不得主人总敲个不停喵',
    '有 bug 就修，有鱼干就吃，喵生圆满',
    '侧栏那首小诗，是本站唯一的一小块阳光喵',
    '读到有趣的地方，猫猫的尾巴会摇得更快喵',
    '猫猫数过了，今天也是元气满满的一天喵',
    '（小声）其实……评论区就在文章最下面喵'
  ];
  var TOUCH = [
    '咕噜咕噜……好舒服喵',
    '喵？要摸摸头吗~',
    '别戳啦，猫猫会害羞的 (๑>ᴗ<๑)',
    '今天也是想小鱼干的一天喵',
    '喵呜！猫猫的肚皮是禁地喵！',
    '有想对主人说的话，去评论区告诉 TA 喵~'
  ];
  var CHASE = [
    '站住喵！',
    '小蝴蝶等等我喵！',
    '别飞啦，陪我玩喵！',
    '差一点点就抓到了喵！',
    '喵！又让它溜掉了……'
  ];

  function pick(list, not) {
    var i;
    do { i = Math.floor(Math.random() * list.length); } while (list.length > 1 && list[i] === not);
    return list[i];
  }

  function greeting() {
    var h = new Date().getHours(), t;
    if (h < 5) t = '夜深了喵……猫猫陪你熬夜，但要记得早点睡哦';
    else if (h < 11) t = '早上好喵~ 今天也要元气满满哦';
    else if (h < 14) t = '午安喵~ 吃饱了才有力气学习';
    else if (h < 18) t = '下午好喵~ 要来杯下午茶吗';
    else if (h < 23) t = '晚上好喵~ 今天的主页更新了吗';
    else t = '夜深了喵……猫猫陪你熬夜，但要记得早点睡哦';
    var pt = window.GLOBAL_CONFIG && window.GLOBAL_CONFIG.pageType;
    if (pt === 'home') t += ' 欢迎来到主人的小站喵~';
    else if (pt === 'post') t += ' 听说给博主留言，她会很开心的喵';
    return t;
  }

  /* ---------- DOM ---------- */
  var box = document.createElement('div');
  box.id = 'kg-cat';
  box.innerHTML =
    '<div class="kg-wrap">' +
    '<div class="kg-bubble"><span class="kg-bubble-text"></span></div>' +
    '<button class="kg-fold" type="button" title="把猫猫收起来" aria-label="收起看板猫">✕</button>' +
    '<div class="kg-doll" role="button" tabindex="0" aria-label="戳戳猫猫" title="戳戳猫猫">' + fullSVG() + '</div>' +
    '</div>' +
    '<button class="kg-ball" type="button" title="戳我展开看板猫" aria-label="展开看板猫">' + headSVG(true, '44 10 112 128') + '</button>';
  document.body.appendChild(box);

  var wrap = box.querySelector('.kg-wrap');
  var doll = box.querySelector('.kg-doll');
  var bubble = box.querySelector('.kg-bubble');
  var bubbleText = box.querySelector('.kg-bubble-text');
  var tracks = box.querySelectorAll('.kg-pupil-track');

  /* ---------- 展开 / 收起（核心：屏幕太小就收起来） ---------- */
  var state = { userFolded: false, openedOnSmall: false };
  try { state.userFolded = localStorage.getItem(FOLD_KEY) === '1'; } catch (e) {}

  function isFolded() {
    if (state.userFolded) return true;
    if (SMALL.matches || SHORT.matches) return !state.openedOnSmall;
    return false;
  }
  function apply() {
    box.classList.toggle('kg-folded', isFolded());
  }
  apply();

  function onBreakpoint() {
    state.openedOnSmall = false; // 跨过断点后重新按屏幕尺寸决定
    apply();
  }
  if (SMALL.addEventListener) {
    SMALL.addEventListener('change', onBreakpoint);
    SHORT.addEventListener('change', onBreakpoint);
  } else if (SMALL.addListener) {
    SMALL.addListener(onBreakpoint);
    SHORT.addListener(onBreakpoint);
  }

  box.querySelector('.kg-fold').addEventListener('click', function (e) {
    e.stopPropagation();
    state.userFolded = true;
    state.openedOnSmall = false;
    try { localStorage.setItem(FOLD_KEY, '1'); } catch (err) {}
    apply();
  });
  box.querySelector('.kg-ball').addEventListener('click', function () {
    state.userFolded = false;
    state.openedOnSmall = SMALL.matches || SHORT.matches; // 小屏上手动展开过就保持，直到跨断点
    try { localStorage.removeItem(FOLD_KEY); } catch (err) {}
    apply();
    doll.classList.remove('kg-greet');
    void doll.offsetWidth; // 重新触发弹跳动画
    doll.classList.add('kg-greet');
    showBubble(greeting());
  });

  /* ---------- 气泡 ---------- */
  var bubbleTimer = null;
  function showBubble(text, keep) {
    if (box.classList.contains('kg-folded')) return;
    bubbleText.textContent = text;
    bubble.classList.add('kg-show');
    clearTimeout(bubbleTimer);
    if (!keep) bubbleTimer = setTimeout(function () { bubble.classList.remove('kg-show'); }, 9000);
  }

  /* ---------- 互动 ---------- */
  function pet() {
    doll.classList.add('kg-happy');
    spawnHearts();
    showBubble(pick(TOUCH, bubbleText.textContent), 4200);
    setTimeout(function () { doll.classList.remove('kg-happy'); }, 1400);
  }
  doll.addEventListener('click', pet);
  doll.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pet(); }
  });

  // 摸头冒小爱心
  function spawnHearts() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    for (var i = 0; i < 3; i++) {
      (function (i) {
        setTimeout(function () {
          var s = document.createElement('span');
          s.className = 'kg-heart';
          s.textContent = '♥';
          s.style.left = (30 + Math.random() * 76) + 'px';
          s.style.bottom = (100 + Math.random() * 18) + 'px';
          s.style.setProperty('--kg-hx', ((Math.random() - 0.5) * 36).toFixed(0) + 'px');
          s.addEventListener('animationend', function () { s.remove(); });
          wrap.appendChild(s);
        }, i * 130);
      })(i);
    }
  }

  // 昼夜切换联动（theme-switch.js 会改 data-theme）
  var lastTheme = document.documentElement.getAttribute('data-theme');
  setTimeout(function () { lastTheme = document.documentElement.getAttribute('data-theme'); }, 800);
  if (window.MutationObserver) {
    new MutationObserver(function () {
      var t = document.documentElement.getAttribute('data-theme');
      if (t === lastTheme) return;
      lastTheme = t;
      setTimeout(function () {
        showBubble(t === 'dark' ? '灯关掉啦……猫猫把亮度调柔和了，记得保护眼睛喵' : '天亮啦！新的一天也要元气满满喵');
      }, 700);
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  // 闲聊轮播
  var lastIdle = '';
  setInterval(function () {
    if (document.hidden || box.classList.contains('kg-folded')) return;
    lastIdle = pick(IDLE, lastIdle);
    showBubble(lastIdle);
  }, 32000);
  setTimeout(function () { showBubble(greeting(), false); }, 1200);

  // 眨眼
  function blink() {
    if (!document.hidden && !box.classList.contains('kg-folded') && !doll.classList.contains('kg-happy')) {
      box.classList.add('kg-blink');
      setTimeout(function () {
        box.classList.remove('kg-blink');
        if (Math.random() < 0.25) { // 四分之一概率连眨两下
          box.classList.add('kg-blink');
          setTimeout(function () { box.classList.remove('kg-blink'); }, 130);
        }
      }, 140);
    }
    setTimeout(blink, 2800 + Math.random() * 3800);
  }
  blink();

  // 耳朵抖动
  function twitch() {
    if (!document.hidden && !box.classList.contains('kg-folded')) {
      box.classList.add('kg-twitch');
      setTimeout(function () { box.classList.remove('kg-twitch'); }, 480);
    }
    setTimeout(twitch, 6000 + Math.random() * 9000);
  }
  twitch();

  /* ---------- 小蝴蝶乱飞 + 小猫追蝴蝶 ---------- */
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var bfG = box.querySelector('.kg-bf');
  var bf = { x: 172, y: 22, mode: 'wander', until: 0, target: null, t0: Math.random() * 100 };
  var mouse = { x: 0, y: 0, t: -1e9 };
  if (!window.matchMedia('(pointer: coarse)').matches) {
    window.addEventListener('mousemove', function (e) {
      mouse.x = e.clientX; mouse.y = e.clientY; mouse.t = Date.now();
    }, { passive: true });
  }

  // 平时绕着猫猫头顶慢慢晃悠的目标点
  function wanderPoint(t) {
    return {
      x: 168 + Math.sin(t * 0.9) * 16 + Math.sin(t * 0.23) * 6,
      y: 24 + Math.sin(t * 1.3 + 1) * 9 + Math.cos(t * 0.31) * 4
    };
  }
  // 被追时逃跑的目的地（SVG 坐标，右上/左上方向）
  var DARTS = [[196, 4], [150, -8], [196, 66], [116, -10], [130, 54]];

  function triggerChase() {
    var d = DARTS[Math.floor(Math.random() * DARTS.length)];
    bf.mode = 'dart';
    bf.target = { x: d[0], y: d[1] };
    bf.until = performance.now() + 900;
    box.style.setProperty('--kg-dir', d[0] >= 160 ? 1 : -1); // 往哪边扑
    box.classList.add('kg-chase');
    showBubble(pick(CHASE), 3800);
    setTimeout(function () {
      bf.mode = 'return';
      bf.until = performance.now() + 1400;
      box.classList.remove('kg-chase');
    }, 900);
  }
  function chaseOnce() {
    setTimeout(function () {
      if (bfG && !document.hidden && !box.classList.contains('kg-folded') && !doll.classList.contains('kg-happy')) triggerChase();
      chaseOnce();
    }, 45000 + Math.random() * 45000);
  }
  if (bfG && !REDUCED) chaseOnce();

  var lastPupil = '';
  function setPupils(tx, ty) {
    var s = 'translate(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px)';
    if (s === lastPupil) return;
    lastPupil = s;
    for (var i = 0; i < tracks.length; i++) tracks[i].style.transform = s;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden || box.classList.contains('kg-folded')) return;
    var t = now / 1000 + bf.t0;

    // 蝴蝶运动：平时缓晃，被追时窜出去，再绕回来
    if (bfG && !REDUCED) {
      var goal, ease;
      if (bf.mode === 'dart' && now < bf.until) { goal = bf.target; ease = 0.16; }
      else if (bf.mode === 'return' && now < bf.until) { goal = wanderPoint(t); ease = 0.07; }
      else { bf.mode = 'wander'; goal = wanderPoint(t); ease = 0.05; }
      bf.x += (goal.x - bf.x) * ease;
      bf.y += (goal.y - bf.y) * ease;
      bfG.setAttribute('transform', 'translate(' + bf.x.toFixed(1) + ' ' + bf.y.toFixed(1) + ')');
    }

    // 眼神：追的时候死盯蝴蝶；平时最近动过鼠标就看鼠标，不然盯着蝴蝶看
    var r = doll.getBoundingClientRect();
    if (r.width) {
      var cx = r.left + r.width / 2;
      var cy = r.top + r.height * 0.42;
      if (bf.mode === 'dart' || Date.now() - mouse.t >= 2500) {
        var scale = r.width / 200; // 蝴蝶是 SVG 坐标，换算成视口坐标
        var dx = (r.left + bf.x * scale) - cx;
        var dy = (r.top + bf.y * scale) - cy;
        setPupils(Math.max(-3.2, Math.min(3.2, dx / 30)), Math.max(-2.4, Math.min(2.4, dy / 40)));
      } else {
        var mdx = mouse.x - cx;
        var mdy = mouse.y - cy;
        setPupils(Math.max(-3.2, Math.min(3.2, mdx / 60)), Math.max(-2.4, Math.min(2.4, mdy / 60)));
      }
    }
  }
  requestAnimationFrame(frame);

  // 调试后门
  window.__kgCatApi = {
    show: showBubble,
    fold: function () { state.userFolded = true; apply(); },
    open: function () { state.userFolded = false; state.openedOnSmall = false; apply(); },
    chase: triggerChase
  };
})();
