(function () {
  // 仅在支持精确指针（鼠标）的设备上启用点击特效
  if (window.matchMedia && !window.matchMedia('(pointer: fine)').matches) return;

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
})();
