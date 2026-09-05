/* 反拆解防护：快捷键拦截 + DevTools 打开检测 + 文章图片禁止拖拽另存
   定位是「劝退」不是「加密」——内容已在访客浏览器里，客户端防护只能抬高门槛：
   - F12 / Ctrl+Shift+I|J|C / Ctrl+U 按键拦截（注：现代浏览器部分快捷键在浏览器层处理，
     拦截只能尽力而为，Firefox 的 Ctrl+U 可挡，Chrome 的 F12 基本挡不住，属安慰剂层）
   - debugger 计时法检测 DevTools：真实暂停 >100ms 即判定打开（关 breakpoints 可绕过，认了）
   - 检测到后：清空控制台输出警告 + 页面顶部轻提示；HARD_MODE=true 时直接跳回首页（默认关，
     开了会伤真实读者，慎用）
   - 每次从关闭到打开只警告一次，重开可再触发
   - 站长自查后门：控制台执行 localStorage.setItem('jad-off','1') 后刷新，本防护完全关闭
   - 手机端（<900px）不启用，省流量也不误伤 */
(function () {
  'use strict'
  if (window.innerWidth < 900) return
  try { if (localStorage.getItem('jad-off') === '1') return } catch (e) { /* ignore */ }

  var HARD_MODE = false
  var devtoolsOpen = false

  /* 1) 快捷键拦截 */
  document.addEventListener('keydown', function (e) {
    var k = (e.key || '').toLowerCase()
    var hit = e.key === 'F12' ||
      ((e.ctrlKey || e.metaKey) && e.shiftKey && (k === 'i' || k === 'j' || k === 'c')) ||
      ((e.ctrlKey || e.metaKey) && k === 'u')
    if (hit) {
      e.preventDefault()
      e.stopPropagation()
    }
  }, { capture: true })

  /* 2) DevTools 检测 + 响应 */
  function detect() {
    if (document.hidden) return
    var t0 = performance.now()
    debugger
    var paused = performance.now() - t0 > 100
    if (paused && !devtoolsOpen) {
      devtoolsOpen = true
      onDetected()
    } else if (!paused) {
      devtoolsOpen = false
    }
  }

  function onDetected() {
    if (HARD_MODE) {
      location.replace('/')
      return
    }
    try {
      console.clear()
      console.log('%c        _..._\n      .::::  `.\n     :::::::.  :\n     ::::::::  :\n     `::::::\' .\'\n       `\'::\'-\'', 'color: #f5c26b')
      console.log('%c🛑 请勿拆解本站', 'font-size: 22px; font-weight: bold; color: #e74c3c')
      console.log('%c检测到开发者工具已打开。本站文章与代码受版权保护，复制超过 500 字本就会被替换为目录。', 'color: #9ca3af')
      console.log('%c想学技术欢迎正常交流 → https://jasmine-iris.top/feedback/', 'color: #49b1f5')
    } catch (e) { /* ignore */ }
    toast()
  }

  function toast() {
    var t = document.createElement('div')
    t.textContent = '🛑 请勿拆解本站 · 内容受版权保护'
    var s = t.style
    s.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:99999;' +
      'background:rgba(30,30,42,.92);color:#fff;padding:12px 22px;border-radius:10px;' +
      'font-size:14px;box-shadow:0 8px 30px rgba(0,0,0,.35);pointer-events:none;' +
      'opacity:0;transition:opacity .4s'
    document.body.appendChild(t)
    requestAnimationFrame(function () { s.opacity = '1' })
    setTimeout(function () {
      s.opacity = '0'
      setTimeout(function () { t.remove() }, 400)
    }, 2600)
  }

  /* 测试/自查钩子：window.__iadWarn() 手动触发一次警告效果 */
  window.__iadWarn = onDetected

  /* 3) 文章图片禁止拖拽另存（右键菜单已是自定义菜单） */
  document.addEventListener('dragstart', function (e) {
    if (e.target && e.target.tagName === 'IMG' && e.target.closest && e.target.closest('#article-container')) {
      e.preventDefault()
    }
  }, { capture: true })

  setInterval(detect, 2500)
})()
