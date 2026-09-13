// Live2D 看板猫（tororo 白猫，模型自托管在 /live2d/tororo/，不依赖外部 CDN）
// 位置：左侧；小屏（≤768px 或高 ≤560px）自动收起；点击可互动
// 调试后门：window.__kgLive2DApi.show() / hide()
;(function () {
  if (window.__kgLive2D) return;
  window.__kgLive2D = true;

  var SMALL = window.matchMedia('(max-width: 768px)');
  var SHORT = window.matchMedia('(max-height: 560px)');

  function apply() {
    var canvas = document.getElementById('live2d');
    if (canvas) canvas.style.display = (SMALL.matches || SHORT.matches) ? 'none' : 'block';
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
  }
  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init);

  window.__kgLive2DApi = {
    show: function () { var c = document.getElementById('live2d'); if (c) c.style.display = 'block'; },
    hide: function () { var c = document.getElementById('live2d'); if (c) c.style.display = 'none'; }
  };
})();
