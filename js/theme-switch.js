/* 昼夜切换动画（View Transitions API）
   设计与关键帧见 /css/theme-bg.css，本文件只负责触发：
   - 包装 btf.activateDarkMode / activateLightMode，不拦截按钮、不改主题文件，
     主题原有的提示条、localStorage 保存、评论组件联动全部保留
   - 展开圆心取用户点击暗色按钮时的坐标，键盘/跨标签页/自动切换则回退屏幕中心
   - 浏览器不支持 View Transitions 或系统开启减少动效时，直接切换（与原行为一致） */
(function () {
  'use strict'

  var lastPoint = null
  document.addEventListener('pointerdown', function (e) {
    lastPoint = { x: e.clientX, y: e.clientY }
  }, { capture: true, passive: true })

  function setOrigin(point) {
    var w = window.innerWidth
    var h = window.innerHeight
    var x = point ? point.x : w / 2
    var y = point ? point.y : h / 2
    var s = document.documentElement.style
    s.setProperty('--vt-x', Math.round(x) + 'px')
    s.setProperty('--vt-y', Math.round(y) + 'px')
    s.setProperty('--vt-r', Math.ceil(Math.hypot(Math.max(x, w - x), Math.max(y, h - y))) + 12 + 'px')
  }

  // 日/夜两套背景 URL 不同时，提前触发加载，避免圆形展开后露出未加载的空白
  function preloadBg(varName) {
    var val = getComputedStyle(document.documentElement).getPropertyValue(varName)
    var m = val && val.match(/url\(["']?(.*?)["']?\)/)
    if (m && m[1]) {
      var img = new Image()
      img.src = m[1]
    }
  }

  function withThemeTransition(mutate) {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!document.startViewTransition || reduce || document.hidden) {
      mutate()
      return
    }
    var toDark = document.documentElement.getAttribute('data-theme') !== 'dark'
    preloadBg(toDark ? '--bg-night' : '--bg-day')
    setOrigin(lastPoint)
    document.startViewTransition(mutate)
  }

  function wrapBtf() {
    if (!window.btf) return false
    ;['activateDarkMode', 'activateLightMode'].forEach(function (name) {
      var raw = window.btf[name]
      if (typeof raw !== 'function' || raw.__themeWrapped) return
      var wrapped = function () {
        withThemeTransition(raw)
      }
      wrapped.__themeWrapped = true
      window.btf[name] = wrapped
    })
    return true
  }

  // btf 定义在 </head> 内联脚本中，正常先于本文件执行；兜底轮询防异常加载顺序
  if (!wrapBtf()) {
    var timer = setInterval(function () {
      if (wrapBtf()) clearInterval(timer)
    }, 80)
    setTimeout(function () { clearInterval(timer) }, 5000)
  }
})()
