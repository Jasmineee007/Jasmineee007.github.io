// 侧栏「今日诗签」小卡：插在公告卡下方，暖阳渐变 + 居中诗行
;(function () {
  var aside = document.getElementById('aside-content');
  if (!aside) return;
  if (aside.querySelector('.card-poem')) return;

  var card = document.createElement('div');
  card.className = 'card-widget card-poem';
  card.innerHTML =
    '<div class="poem-sun"><i class="fas fa-sun"></i><span class="poem-time"></span></div>' +
    '<div class="poem-text">' +
    '人类需要很多很多晴天和阳光，<br>' +
    '去晒干过往的雨滴和潮湿。<br>' +
    '如果可以，<br>' +
    '我想当我睁开双眼，<br>' +
    '阳光连同幸福一起穿过我的瞳孔。' +
    '</div>';

  var timeEl = card.querySelector('.poem-time');
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function tickTime() {
    var d = new Date();
    timeEl.textContent = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }
  tickTime();
  setInterval(tickTime, 1000);

  var anchor = aside.querySelector('.card-announcement');
  if (anchor && anchor.parentNode === aside) {
    anchor.after(card);
  } else {
    aside.prepend(card);
  }
})();
