/* 鼠标移动星星拖尾 + 点击小爆发（Miku 配色，参考 CSDN 案例4 魔改） */
(function () {
  'use strict';
  if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var COLORS = ['#39c5bb', '#00a0e9', '#ffb7dd', '#b8e6ff', '#ffffff'];
  var canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:999999;';
  document.body.appendChild(canvas);
  var ctx = canvas.getContext('2d');
  var W = 0, H = 0;
  var parts = [];
  var lastSpawn = 0;

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  function star(x, y, r, color, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = color;
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var rad = (i % 2 === 0) ? r : r * 0.45;
      var a = Math.PI / 5 * i - Math.PI / 2;
      var px = Math.cos(a) * rad;
      var py = Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function spawn(x, y, n) {
    for (var i = 0; i < n; i++) {
      parts.push({
        x: x, y: y,
        vx: (Math.random() - 0.5) * 1.6,
        vy: (Math.random() - 0.5) * 1.6 + 0.5,
        r: Math.random() * 5 + 3,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.2,
        life: 1,
        decay: Math.random() * 0.02 + 0.015,
        color: COLORS[(Math.random() * COLORS.length) | 0]
      });
    }
  }

  function onMove(e) {
    var now = Date.now();
    if (now - lastSpawn > 26) {
      spawn(e.clientX, e.clientY, 1);
      lastSpawn = now;
    }
  }
  function onClick(e) {
    spawn(e.clientX, e.clientY, 12);
  }
  window.addEventListener('mousemove', onMove, { passive: true });
  window.addEventListener('click', onClick);

  function loop() {
    ctx.clearRect(0, 0, W, H);
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.x += p.vx; p.y += p.vy;
      p.rot += p.vr;
      p.life -= p.decay;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      ctx.globalAlpha = Math.max(p.life, 0);
      star(p.x, p.y, p.r * (0.5 + p.life * 0.5), p.color, p.rot);
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(loop);
  }
  loop();
})();
