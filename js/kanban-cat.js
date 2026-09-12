// 看板猫 v13：自家小猫视频 AI 抠图（96帧→48帧动画 WebP，会动会眨眼）
// 行为：左下角常驻、待机原地小跳（CSS）、小碎步摇摆走路（rAF）
// 说话：开场问候 / 悬停搭话 / 每 9~16s 自言自语 / 摸头开心冒爱心 / 昼夜切换致辞
// 开关在右下角按钮区（和日夜模式并排），小屏（≤768px 或高 ≤560px）自动收起
// 调试后门：window.__kgCatApi.show('文本') / toggle()
;(function () {
  if (window.__kgCat) return;
  window.__kgCat = true;

  // 抠图动画本体（视频→rembg 逐帧抠图→动画 WebP）。换图时 ?v= +1 防 CF 缓存
  var PHOTO = '/img/kanban-cat-live.webp?v=1';
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
    '本喵的原型就是博主家的小猫喵！'
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
    '<div class="kg-doll" role="button" tabindex="0" aria-label="戳戳猫猫" title="戳戳猫猫">' +
    '<div class="kg-waddler"><div class="kg-frame">' +
    '<img class="kg-cat-img" src="' + PHOTO + '" alt="看板猫：博主家的小猫" draggable="false">' +
    '</div></div></div></div>';
  document.body.appendChild(box);

  var wrap = box.querySelector('.kg-wrap');
  var doll = box.querySelector('.kg-doll');
  var waddler = box.querySelector('.kg-waddler');
  var bubble = box.querySelector('.kg-bubble');
  var bubbleText = box.querySelector('.kg-bubble-text');

  /* ---------- 右下角开关（和日夜模式并排） ---------- */
  function buildToggle() {
    var holder = document.getElementById('rightside-config-show') || document.getElementById('rightside');
    if (!holder || document.getElementById('kg-toggle')) return;
    var b = document.createElement('button');
    b.id = 'kg-toggle';
    b.type = 'button';
    b.title = '看板猫开关';
    b.setAttribute('aria-label', '显示或收起看板猫');
    b.innerHTML = '<img src="' + PHOTO + '" alt="">';
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
          s.style.left = (30 + Math.random() * 80) + 'px';
          s.style.bottom = (95 + Math.random() * 20) + 'px';
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
        say(t === 'dark' ? '灯关掉啦……猫猫把亮度调柔和了，记得保护眼睛喵' : '天亮啦！新的一天也要元气满满喵');
      }, 700);
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  /* ---------- 萌宠引擎：沿底部蹦跶（眨眼/动耳朵由视频本体负责） ---------- */
  var vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
  var vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
  window.addEventListener('resize', function () {
    vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
  }, { passive: true });

  // 猫：x 为猫左缘视口坐标；box 默认 left 16px，用 transform 偏移
  var cat = { x: 16, to: null, speed: 52, phase: 0, nextMoveAt: Date.now() + 6000, lastT: 0 };
  function startWalk(targetX) {
    cat.to = Math.max(10, Math.min(vw * 0.72, targetX));
  }
  function scheduleIdleWalk() {
    cat.nextMoveAt = Date.now() + 5000 + Math.random() * 6000; // 走路勤快些，5~11s 一次
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden) return;
    var show = visible();

    // 小碎步走路：移动时左右摇摆 + 碎步颠簸
    if (!REDUCED && show) {
      if (cat.to !== null) {
        var dt = Math.min(64, now - (cat.lastT || now));
        cat.lastT = now;
        var dir = cat.to > cat.x ? 1 : -1;
        var step = dir * cat.speed * dt / 1000;
        if ((dir > 0 && cat.x + step >= cat.to) || (dir < 0 && cat.x + step <= cat.to)) {
          cat.x = cat.to;
          cat.to = null;
          box.style.transform = 'translateX(' + (cat.x - 16) + 'px)';
          waddler.style.transform = '';
          scheduleIdleWalk();
        } else {
          cat.x += step;
          cat.phase += Math.abs(step) * 0.16;
          box.style.transform = 'translateX(' + (cat.x - 16).toFixed(1) + 'px)';
          waddler.style.transform = 'translateY(' + (-Math.abs(Math.sin(cat.phase)) * 3).toFixed(1) + 'px) rotate(' + (Math.sin(cat.phase) * 4).toFixed(1) + 'deg)';
        }
      } else {
        cat.lastT = now;
        if (now >= cat.nextMoveAt) startWalk(30 + Math.random() * vw * 0.6);
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
    }
  };
})();
