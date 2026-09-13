// Live2D 看板猫（tororo 白猫，模型自托管在 /live2d/tororo/，不依赖外部 CDN）
// 位置：左侧；气泡台词（开场问候/自言自语/悬停搭话/点猫互动/昼夜致辞）；小屏自动收起
// 调试后门：window.__kgLive2DApi.say('文本')
;(function () {
  if (window.__kgLive2D) return;
  window.__kgLive2D = true;

  var SMALL = window.matchMedia('(max-width: 768px)');
  var SHORT = window.matchMedia('(max-height: 560px)');

  /* ---------- 气泡样式 + DOM ---------- */
  var style = document.createElement('style');
  style.textContent =
    '#kg-l2d-bubble{position:fixed;left:18px;bottom:290px;max-width:205px;padding:7px 11px;border-radius:12px;' +
    'background:var(--card-bg,rgba(255,255,255,.72));-webkit-backdrop-filter:blur(16px) saturate(1.35);backdrop-filter:blur(16px) saturate(1.35);' +
    'border:1px solid rgba(255,255,255,.6);box-shadow:0 4px 14px rgba(60,45,25,.12);font-size:13px;line-height:1.55;' +
    'color:var(--font-color,#4c4c4c);opacity:0;transform:translateY(8px) scale(.95);transition:opacity .3s ease,transform .3s ease;pointer-events:none;z-index:998}' +
    '#kg-l2d-bubble.kg-show{opacity:1;transform:none}' +
    '#kg-l2d-bubble::after{content:"";position:absolute;left:20px;bottom:-4.5px;width:10px;height:10px;' +
    'background:var(--card-bg,rgba(255,255,255,.72));transform:rotate(45deg);border-right:1px solid rgba(255,255,255,.6);border-bottom:1px solid rgba(255,255,255,.6)}' +
    "[data-theme='dark'] #kg-l2d-bubble{border-color:rgba(255,255,255,.08);box-shadow:0 4px 14px rgba(0,0,0,.35)}" +
    "[data-theme='dark'] #kg-l2d-bubble::after{border-color:rgba(255,255,255,.08)}";
  document.head.appendChild(style);

  var bubble = document.createElement('div');
  bubble.id = 'kg-l2d-bubble';
  document.body.appendChild(bubble);

  /* ---------- 文案 ---------- */
  var IDLE = [
    '听说给博主留言，她会很开心的喵',
    '喵~ 猫猫会一直在角落陪着你的',
    '写代码久了要眨眨眼休息一下喵',
    '偷偷说：右键菜单里藏着「随便逛逛」哦',
    '深夜的 flag 虽香，可不要贪杯喵',
    '喵呜——(伸了个懒腰)',
    '据说摸猫头会变聪明，不信你点点看喵？',
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

  /* ---------- 气泡逻辑 ---------- */
  var bubbleTimer = null, lastIdle = '', lastHoverAt = 0;
  function say(text, dur) {
    if (SMALL.matches || SHORT.matches) return;
    bubble.textContent = text;
    bubble.classList.add('kg-show');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(function () { bubble.classList.remove('kg-show'); }, dur || 8000);
  }
  function idleLoop() {
    setTimeout(function () {
      if (!document.hidden && !SMALL.matches && !SHORT.matches) {
        var m = pick(IDLE, lastIdle);
        lastIdle = m;
        say(m, 9000);
      }
      idleLoop();
    }, 9000 + Math.random() * 7000);
  }

  /* ---------- Live2D 初始化 ---------- */
  function apply() {
    var c = document.getElementById('live2d-widget-container');
    if (c) c.style.display = (SMALL.matches || SHORT.matches) ? 'none' : 'block';
    if (SMALL.matches || SHORT.matches) bubble.classList.remove('kg-show');
  }
  if (SMALL.addEventListener) {
    SMALL.addEventListener('change', apply);
    SHORT.addEventListener('change', apply);
  }

  function init() {
    if (!window.L2Dwidget) return;
    L2Dwidget.init({
      model: { jsonPath: '/live2d/tororo/tororo.model.json', scale: 1 },
      display: { position: 'left', width: 150, height: 260, hOffset: 10, vOffset: -20 },
      mobile: { show: true, scale: 0.5 },
      react: { opacityDefault: 0.9, opacityOnHover: 1, motionOnHover: true },
      dialog: { enable: false },
      dev: { border: false }
    });
    setTimeout(apply, 300);
    // 点猫互动（Live2D 事件）
    try {
      L2Dwidget.on('tapped', function () { say(pick(TOUCH, bubble.textContent), 4200); });
    } catch (e) {}
    var canvas = document.getElementById('live2dcanvas');
    if (canvas) {
      canvas.style.cursor = 'pointer';
      canvas.addEventListener('mouseenter', function () {
        var now = Date.now();
        if (now - lastHoverAt < 6000) return;
        lastHoverAt = now;
        say(Math.random() < 0.35 ? pick(TOUCH) : pick(HOVER, bubble.textContent), 4500);
      });
    }
  }
  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init);

  setTimeout(function () { say(greeting()); }, 1500);
  idleLoop();

  // 昼夜切换致辞
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

  // 调试后门
  window.__kgLive2DApi = { say: say };
})();
