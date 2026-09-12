// 看板猫 v4：贴纸画来自小红书作者「望舒清欢」（已获允许使用），AI 抠底后动态化
// 行为：悬浮飘动 + 沿屏幕底部蹦跶 + 满屏小蝴蝶可追 + 摸头摇摆冒爱心
// 说话：开场问候 / 悬停搭话 / 每 9~16s 自言自语 / 昼夜切换致辞
// 开关在右下角按钮区（和日夜模式并排），小屏（≤768px 或高 ≤560px）自动收起
// 调试后门：window.__kgCatApi.show('文本') / toggle() / chase()
;(function () {
  if (window.__kgCat) return;
  window.__kgCat = true;

  var IMG = '/img/kanban-cat.webp';
  var OFF_KEY = 'kg-cat-off';
  var SMALL = window.matchMedia('(max-width: 768px)');
  var SHORT = window.matchMedia('(max-height: 560px)');
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    '键盘那么暖，怪不得主人总敲个不停喵',
    '有 bug 就修，有鱼干就吃，喵生圆满',
    '侧栏那首小诗，是本站唯一的一小块阳光喵',
    '读到有趣的地方，猫猫会蹦得更高喵',
    '猫猫数过了，今天也是元气满满的一天喵',
    '（小声）其实……评论区就在文章最下面喵',
    '本喵的贴纸画师是「望舒清欢」喵，掌声！'
  ];
  var HOVER = ['喵？', '在的在的喵', '喵呜～', '叫我吗喵？', '（蹭蹭你的手）', '要摸摸头吗喵？', '嘿嘿，好痒喵'];
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
  // 动态眼珠层：盖在原图眼睛上（绿虹膜+竖瞳+高光可动，眼皮可眨，摸头变 ^^）
  var EYES_SVG =
    '<svg class="kg-eyes" viewBox="0 0 626 843" aria-hidden="true">' +
    '<g transform="rotate(-6 150 345)">' +
    '<ellipse cx="150" cy="345" rx="25" ry="25.5" fill="#fdeeee"/>' +
    '<g class="kg-pupil">' +
    '<circle cx="150" cy="345" r="20.5" fill="#6d9089"/>' +
    '<ellipse cx="150" cy="352" rx="14" ry="10" fill="#a3c2b8" opacity=".85"/>' +
    '<ellipse cx="150" cy="340" rx="3.6" ry="11.5" fill="#2f4f49"/>' +
    '<circle cx="147" cy="334" r="4.8" fill="#fff"/>' +
    '<circle cx="160" cy="354" r="2" fill="#fff" opacity=".9"/>' +
    '</g>' +
    '<ellipse class="kg-eyelid" cx="150" cy="345" rx="26.5" ry="25.5" fill="#fbeeea"/>' +
    '<path class="kg-arc" d="M132 348 Q150 330 168 348" fill="none" stroke="#7a6a71" stroke-width="5" stroke-linecap="round"/>' +
    '</g>' +
    '<g transform="rotate(-12 259 321)">' +
    '<ellipse cx="259" cy="321" rx="30" ry="28" fill="#fdeeee"/>' +
    '<g class="kg-pupil">' +
    '<circle cx="259" cy="322" r="25" fill="#6d9089"/>' +
    '<ellipse cx="259" cy="330" rx="17" ry="12" fill="#a3c2b8" opacity=".85"/>' +
    '<ellipse cx="259" cy="316" rx="4" ry="13" fill="#2f4f49"/>' +
    '<circle cx="256" cy="305" r="5" fill="#fff"/>' +
    '<circle cx="268" cy="331" r="2.2" fill="#fff" opacity=".9"/>' +
    '</g>' +
    '<ellipse class="kg-eyelid" cx="259" cy="321" rx="31" ry="29" fill="#fbeeea"/>' +
    '<path class="kg-arc" d="M237 325 Q259 303 281 325" fill="none" stroke="#7a6a71" stroke-width="5" stroke-linecap="round"/>' +
    '</g>' +
    '</svg>';

  var box = document.createElement('div');
  box.id = 'kg-cat';
  box.innerHTML =
    '<div class="kg-wrap">' +
    '<div class="kg-bubble"><span class="kg-bubble-text"></span></div>' +
    '<div class="kg-doll" role="button" tabindex="0" aria-label="戳戳猫猫" title="戳戳猫猫">' +
    '<img class="kg-cat-img" src="' + IMG + '" alt="看板娘 · 插画：望舒清欢（小红书）" draggable="false">' +
    EYES_SVG +
    '</div></div>';
  document.body.appendChild(box);

  // 满屏飞的小蝴蝶（独立元素）
  var bfHost = document.createElement('div');
  bfHost.id = 'kg-bf';
  bfHost.setAttribute('aria-hidden', 'true');
  bfHost.innerHTML =
    '<svg viewBox="-14 -14 28 32">' +
    '<g class="kg-bf-wings">' +
    '<path d="M-1 0 C -9 -11 -20 -10 -21 -3 C -22 3 -12 6 -1 2 Z" fill="#f6bfc8" stroke="#e58a96" stroke-width="1.3"/>' +
    '<path d="M-1 3 C -8 5 -15 8 -12.5 13.5 C -10 17.5 -3 14.5 -1 7 Z" fill="#f9d3da" stroke="#e58a96" stroke-width="1.3"/>' +
    '</g>' +
    '<g class="kg-bf-wings kg-bf-wings-r">' +
    '<path d="M1 0 C 9 -11 20 -10 21 -3 C 22 3 12 6 1 2 Z" fill="#f6bfc8" stroke="#e58a96" stroke-width="1.3"/>' +
    '<path d="M1 3 C 8 5 15 8 12.5 13.5 C 10 17.5 3 14.5 1 7 Z" fill="#f9d3da" stroke="#e58a96" stroke-width="1.3"/>' +
    '</g>' +
    '<ellipse cx="0" cy="7" rx="2" ry="5.5" fill="#7a6a63"/>' +
    '</svg>';
  document.body.appendChild(bfHost);

  var wrap = box.querySelector('.kg-wrap');
  var doll = box.querySelector('.kg-doll');
  var bubble = box.querySelector('.kg-bubble');
  var bubbleText = box.querySelector('.kg-bubble-text');
  var tracks = box.querySelectorAll('.kg-pupil');

  /* ---------- 右下角开关（和日夜模式并排） ---------- */
  function buildToggle() {
    var holder = document.getElementById('rightside-config-show') || document.getElementById('rightside');
    if (!holder || document.getElementById('kg-toggle')) return;
    var b = document.createElement('button');
    b.id = 'kg-toggle';
    b.type = 'button';
    b.title = '看板猫开关';
    b.setAttribute('aria-label', '显示或收起看板猫');
    b.innerHTML = '<img src="' + IMG + '" alt="">';
    var goUp = holder.querySelector('#go-up');
    if (goUp) holder.insertBefore(b, goUp);
    else holder.appendChild(b);
    b.addEventListener('click', function () {
      state.off = !state.off;
      if (state.off) { try { localStorage.setItem(OFF_KEY, '1'); } catch (e) {} }
      else {
        state.smallOn = true; // 手动唤出后本页保持可见
        try { localStorage.removeItem(OFF_KEY); } catch (e) {}
      }
      apply();
      if (!state.off) {
        say(greeting());
        doll.classList.remove('kg-greet');
        void doll.offsetWidth;
        doll.classList.add('kg-greet');
      }
    });
  }

  /* ---------- 显隐 ---------- */
  var state = { off: false, smallOn: false };
  try { state.off = localStorage.getItem(OFF_KEY) === '1'; } catch (e) {}

  function isSmall() { return SMALL.matches || SHORT.matches; }
  function visible() { return !state.off && (!isSmall() || state.smallOn); }
  function apply() {
    var v = visible();
    box.classList.toggle('kg-hidden', !v);
    bfHost.classList.toggle('kg-hidden', !v);
    var t = document.getElementById('kg-toggle');
    if (t) t.setAttribute('aria-pressed', v ? 'true' : 'false');
    if (!v) bubble.classList.remove('kg-show');
  }
  function onBreakpoint() { state.smallOn = false; apply(); }
  if (SMALL.addEventListener) {
    SMALL.addEventListener('change', onBreakpoint);
    SHORT.addEventListener('change', onBreakpoint);
  } else if (SMALL.addListener) {
    SMALL.addListener(onBreakpoint);
    SHORT.addListener(onBreakpoint);
  }
  buildToggle();
  apply();

  /* ---------- 气泡 ---------- */
  var bubbleTimer = null;
  function say(text, dur) {
    if (!visible()) return;
    bubbleText.textContent = text;
    bubble.classList.add('kg-show');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(function () { bubble.classList.remove('kg-show'); }, dur || 8000);
  }

  /* ---------- 说话时机 ---------- */
  var lastIdle = '';
  var lastHoverAt = 0;
  function idleLoop() {
    setTimeout(function () {
      if (!document.hidden && visible() && !doll.matches(':hover')) {
        var m = pick(IDLE, lastIdle);
        lastIdle = m;
        say(m, 9000);
      }
      idleLoop();
    }, 9000 + Math.random() * 7000);
  }
  setTimeout(function () { say(greeting()); }, 1200);
  idleLoop();

  doll.addEventListener('mouseenter', function () {
    var now = Date.now();
    if (now - lastHoverAt < 6000) return;
    lastHoverAt = now;
    say(Math.random() < 0.35 ? pick(TOUCH) : pick(HOVER, bubbleText.textContent), 4500);
  });

  function pet() {
    doll.classList.add('kg-happy');
    spawnHearts();
    say(pick(TOUCH, bubbleText.textContent), 4200);
    setTimeout(function () { doll.classList.remove('kg-happy'); }, 1400);
  }
  doll.addEventListener('click', pet);
  doll.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pet(); }
  });

  function spawnHearts() {
    if (REDUCED) return;
    for (var i = 0; i < 3; i++) {
      (function (i) {
        setTimeout(function () {
          var s = document.createElement('span');
          s.className = 'kg-heart';
          s.textContent = '♥';
          s.style.left = (30 + Math.random() * 110) + 'px';
          s.style.bottom = (140 + Math.random() * 30) + 'px';
          s.style.setProperty('--kg-hx', ((Math.random() - 0.5) * 36).toFixed(0) + 'px');
          s.addEventListener('animationend', function () { s.remove(); });
          wrap.appendChild(s);
        }, i * 130);
      })(i);
    }
  }

  // 眨眼（眼皮层闪一下）
  function blink() {
    if (!document.hidden && visible() && !doll.classList.contains('kg-happy')) {
      box.classList.add('kg-blink');
      setTimeout(function () {
        box.classList.remove('kg-blink');
        if (Math.random() < 0.25) {
          box.classList.add('kg-blink');
          setTimeout(function () { box.classList.remove('kg-blink'); }, 140);
        }
      }, 150);
    }
    setTimeout(blink, 2600 + Math.random() * 3600);
  }
  blink();

  // 昼夜切换联动（theme-switch.js 会改 data-theme）
  var lastTheme = document.documentElement.getAttribute('data-theme');
  setTimeout(function () { lastTheme = document.documentElement.getAttribute('data-theme'); }, 800);
  if (window.MutationObserver) {
    new MutationObserver(function () {
      var t = document.documentElement.getAttribute('data-theme');
      if (t === lastTheme) return;
      lastTheme = t;
      setTimeout(function () {
        say(t === 'dark' ? '灯关掉啦……猫猫把亮度调柔和了，记得保护眼睛喵' : '天亮啦！新的一天也要元气满满喵');
      }, 700);
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  /* ---------- 萌宠引擎：悬浮飘动(CSS) + 沿底部蹦跶 + 蝴蝶满屏飞 + 追蝴蝶 ---------- */
  var vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
  var vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
  window.addEventListener('resize', function () {
    vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
  }, { passive: true });

  var mouse = { x: 0, y: 0, t: -1e9 };
  var finePointer = !window.matchMedia('(pointer: coarse)').matches;
  if (finePointer) {
    window.addEventListener('mousemove', function (e) {
      mouse.x = e.clientX; mouse.y = e.clientY; mouse.t = Date.now();
    }, { passive: true });
  }

  // 猫：x 为猫左缘视口坐标；box 默认 left 16px，用 transform 偏移
  var cat = { x: 16, hop: null, queue: [], nextMoveAt: Date.now() + 7000, hopDur: 320, pause: 130, fast: false, pauseUntil: 0 };
  function startWalk(targetX, fast) {
    targetX = Math.max(10, Math.min(vw * 0.72, targetX));
    var steps = [];
    var from = cat.x;
    var n = Math.max(1, Math.ceil(Math.abs(targetX - from) / 80));
    for (var i = 1; i <= n; i++) steps.push(from + (targetX - from) * (i / n));
    cat.queue = steps;
    cat.hopDur = fast ? 240 : 320;
    cat.pause = fast ? 40 : 130;
    cat.fast = !!fast;
  }
  function scheduleIdleWalk() {
    cat.nextMoveAt = Date.now() + 8000 + Math.random() * 12000;
  }

  // 蝴蝶：视口坐标
  var bf = { x: vw * 0.5, y: 140, tx: vw * 0.5, ty: 140, nextAt: 0, mode: 'roam' };

  function triggerChase() {
    if (!visible() || document.hidden || REDUCED) return;
    bf.mode = 'dart';
    var far = [
      [vw * 0.55 + Math.random() * vw * 0.3, 60 + Math.random() * 90],
      [40 + Math.random() * vw * 0.25, 60 + Math.random() * 90],
      [vw * 0.5 + (Math.random() - 0.5) * vw * 0.5, 40 + Math.random() * 60]
    ];
    var d = far[Math.floor(Math.random() * far.length)];
    bf.tx = d[0]; bf.ty = d[1];
    startWalk(d[0] - 60 + (Math.random() - 0.5) * 40, true);
    say(pick(CHASE), 3800);
    setTimeout(function () { bf.mode = 'roam'; bf.nextAt = performance.now() + 500; }, 1500);
  }
  function chaseLoop() {
    setTimeout(function () {
      if (visible() && !document.hidden && !doll.classList.contains('kg-happy')) triggerChase();
      chaseLoop();
    }, 45000 + Math.random() * 45000);
  }
  if (!REDUCED) chaseLoop();

  // 悬停时猫往鼠标方向微微倾身；眼珠跟随鼠标/蝴蝶
  var lean = 0;
  var ex = 0, ey = 0, lastPupil = '';
  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden) return;
    var t = now / 1000;
    var show = visible();

    // 蝴蝶飞行
    if (!REDUCED && show) {
      if (now >= bf.nextAt && bf.mode !== 'dart') {
        bf.nextAt = now + 2600 + Math.random() * 3000;
        if (Math.random() < 0.35) {
          bf.tx = Math.max(40, Math.min(vw - 80, cat.x + 20 + Math.random() * 120));
          bf.ty = Math.max(60, vh - 250 - Math.random() * 60);
        } else {
          bf.tx = 40 + Math.random() * Math.max(60, vw - 130);
          bf.ty = 50 + Math.random() * Math.max(40, vh * 0.38);
        }
      }
      bf.x += (bf.tx - bf.x) * 0.035;
      bf.y += (bf.ty - bf.y) * 0.035;
      var fl = Math.sin(t * 9) * 3;
      bfHost.style.transform = 'translate(' + bf.x.toFixed(1) + 'px,' + (bf.y + fl).toFixed(1) + 'px)' +
        (bf.tx < bf.x - 2 ? ' scaleX(-1)' : '');
    }

    // 猫蹦跶
    if (!REDUCED && show) {
      if (!cat.hop && cat.queue.length && now >= cat.pauseUntil) {
        cat.hop = { from: cat.x, to: cat.queue.shift(), t0: now, dur: cat.hopDur };
      }
      if (cat.hop) {
        var p = (now - cat.hop.t0) / cat.hop.dur;
        if (p >= 1) {
          cat.x = cat.hop.to;
          box.style.transform = 'translateX(' + (cat.x - 16) + 'px)';
          doll.style.transform = '';
          cat.hop = null;
          cat.pauseUntil = now + cat.pause;
          if (!cat.queue.length) scheduleIdleWalk();
        } else {
          var q = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
          var cx2 = cat.hop.from + (cat.hop.to - cat.hop.from) * q;
          var dir = cat.hop.to >= cat.hop.from ? 1 : -1;
          var arc = -14 * Math.sin(Math.PI * p);
          box.style.transform = 'translateX(' + (cx2 - 16).toFixed(1) + 'px)';
          doll.style.transform = 'translateY(' + arc.toFixed(1) + 'px) rotate(' + (dir * 7 * Math.sin(Math.PI * p)).toFixed(1) + 'deg)';
        }
      } else if (now >= cat.nextMoveAt) {
        startWalk(30 + Math.random() * vw * 0.6, false);
      }
    }

    // 眼珠跟随 + 倾身
    var r = doll.getBoundingClientRect();
    if (r.width) {
      var cxx = r.left + r.width / 2;
      var cyy = r.top + r.height * 0.4;
      var dx, dy;
      if (Date.now() - mouse.t < 2500) {
        dx = mouse.x - cxx; dy = mouse.y - cyy;
      } else {
        var br = bfHost.getBoundingClientRect();
        dx = br.left + 14 - cxx; dy = br.top + 16 - cyy;
        dx += Math.sin(t * 0.7) * 60; dy += Math.cos(t * 0.5) * 40; // 没事也左看看右看看
      }
      var tx = Math.max(-7, Math.min(7, dx / 60));
      var ty = Math.max(-5.5, Math.min(5.5, dy / 80));
      ex += (tx - ex) * 0.12; ey += (ty - ey) * 0.12;
      var es = 'translate(' + ex.toFixed(2) + 'px,' + ey.toFixed(2) + 'px)';
      if (es !== lastPupil) {
        lastPupil = es;
        for (var i = 0; i < tracks.length; i++) tracks[i].style.transform = es;
      }
      if (finePointer && !cat.hop) {
        var target = Date.now() - mouse.t < 2500
          ? Math.max(-7, Math.min(7, dx / 30))
          : 0;
        lean += (target - lean) * 0.08;
        if (Math.abs(lean) < 0.05) lean = 0;
        doll.style.transform = lean ? 'rotate(' + lean.toFixed(2) + 'deg)' : '';
      }
    }
  }
  requestAnimationFrame(frame);

  // 调试后门
  window.__kgCatApi = {
    show: say,
    toggle: function () {
      var b = document.getElementById('kg-toggle');
      if (b) b.click(); else { state.off = !state.off; apply(); }
    },
    chase: triggerChase
  };
})();
