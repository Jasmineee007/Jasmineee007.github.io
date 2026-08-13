(function () {
  // 仅在支持精确指针（鼠标）的设备上启用，触屏设备不受影响
  if (window.matchMedia && !window.matchMedia('(pointer: fine)').matches) return;

  var dot = document.createElement('div');
  dot.className = 'custom-cursor-dot';
  var ring = document.createElement('div');
  ring.className = 'custom-cursor-ring';
  document.body.appendChild(dot);
  document.body.appendChild(ring);

  var x = -100, y = -100, rx = -100, ry = -100;

  document.addEventListener('mousemove', function (e) {
    x = e.clientX;
    y = e.clientY;
    dot.style.left = x + 'px';
    dot.style.top = y + 'px';
  });

  document.addEventListener('mouseover', function (e) {
    var t = e.target;
    var isHover = !!(t && t.closest && t.closest('a, button, input, textarea, select, label, .site-card, [role="button"]'));
    ring.classList.toggle('is-hover', isHover);
  });

  // 点击特效：随机符号上浮淡出
  var SYMBOLS = ['♥', '★', '✦', '✧', '❀'];
  document.addEventListener('click', function (e) {
    var s = document.createElement('span');
    s.className = 'click-effect';
    s.textContent = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    s.style.left = e.clientX + 'px';
    s.style.top = e.clientY + 'px';
    document.body.appendChild(s);
    setTimeout(function () { s.remove(); }, 1000);
  });

  function loop() {
    rx += (x - rx) * 0.18;
    ry += (y - ry) * 0.18;
    ring.style.left = rx + 'px';
    ring.style.top = ry + 'px';
    requestAnimationFrame(loop);
  }
  loop();
})();
