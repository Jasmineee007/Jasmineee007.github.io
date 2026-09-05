/* 自定义右键菜单：回顶部 / 昼夜切换 / 随便逛逛 / SecLearn 刷题 / 反馈箱
   - 输入框、选中文本、按住 Shift 时保留浏览器原生菜单（方便复制与检查元素）
   - 昼夜切换复用 btf.activate*，会自动带上 theme-switch.js 的圆形展开动画
   - 随便逛逛：优先从 /sitemap.xml 取全量文章链接（sessionStorage 缓存），失败则用当前页文章链接兜底 */
(function () {
  'use strict'

  var POST_LINK_RE = /\/\d{4}\/\d{2}\/\d{2}\//
  var menu = null

  function scrollTop() {
    if (window.btf && btf.scrollToDest) btf.scrollToDest(0, 500)
    else window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function toggleTheme() {
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark'
    var next = isDark ? 'light' : 'dark'
    var activate = isDark ? (window.btf && btf.activateLightMode) : (window.btf && btf.activateDarkMode)
    if (activate) {
      activate()
      // 与主题按钮（rightSideFn.darkmode）行为对齐：把选择写回 localStorage，刷新/跨标签页才不会丢
      if (window.btf && btf.saveToLocal) btf.saveToLocal.set('theme', next, 2)
    } else {
      document.documentElement.setAttribute('data-theme', next)
      try { localStorage.setItem('theme', JSON.stringify({ value: next, expiry: Date.now() + 2 * 86400000 })) } catch (e) { /* ignore */ }
    }
  }

  function randomPost() {
    var go = function (links) {
      var pick = links[Math.floor(Math.random() * links.length)]
      location.href = new URL(pick, location.origin).pathname
    }
    var domFallback = function () {
      var links = Array.prototype.map.call(document.querySelectorAll('a[href]'), function (a) { return a.href })
        .filter(function (h) { return POST_LINK_RE.test(h) && new URL(h).pathname !== location.pathname })
      if (links.length) go(links)
    }
    var cached = null
    try { cached = JSON.parse(sessionStorage.getItem('postLinks') || 'null') } catch (e) { /* ignore */ }
    if (cached && cached.length) return go(cached)
    fetch('/sitemap.xml').then(function (r) { return r.ok ? r.text() : Promise.reject(r) }).then(function (xml) {
      var doc = new DOMParser().parseFromString(xml, 'text/xml')
      var links = Array.prototype.map.call(doc.querySelectorAll('loc'), function (l) { return l.textContent })
        .filter(function (u) { return POST_LINK_RE.test(u) && new URL(u, location.origin).pathname !== location.pathname })
      if (!links.length) throw new Error('empty')
      try { sessionStorage.setItem('postLinks', JSON.stringify(links)) } catch (e) { /* ignore */ }
      go(links)
    }).catch(domFallback)
  }

  var ITEMS = [
    { icon: 'fas fa-arrow-up', text: '回到顶部', action: scrollTop },
    { icon: 'fas fa-moon', text: '昼夜切换', action: toggleTheme },
    { icon: 'fas fa-shuffle', text: '随便逛逛', action: randomPost },
    { sep: true },
    { icon: 'fas fa-keyboard', text: 'SecLearn 刷题', href: '/quiz/' },
    { icon: 'fas fa-envelope', text: '反馈箱', href: '/feedback/' }
  ]

  function build() {
    menu = document.createElement('div')
    menu.id = 'ctx-menu'
    menu.innerHTML = ITEMS.map(function (item, idx) {
      if (item.sep) return '<div class="ctx-sep"></div>'
      if (item.href) return '<div class="ctx-item" data-idx="' + idx + '"><i class="' + item.icon + '"></i><span>' + item.text + '</span></div>'
      return '<div class="ctx-item" data-idx="' + idx + '"><i class="' + item.icon + '"></i><span>' + item.text + '</span></div>'
    }).join('')
    document.body.appendChild(menu)
    menu.addEventListener('click', function (e) {
      var item = e.target.closest('.ctx-item')
      if (!item) return
      var conf = ITEMS[+item.getAttribute('data-idx')]
      hide()
      if (conf && conf.href) location.href = conf.href
      else if (conf && conf.action) conf.action()
    })
  }

  function show(x, y) {
    if (!menu) build()
    menu.classList.add('show')
    var w = menu.offsetWidth
    var h = menu.offsetHeight
    menu.style.left = Math.min(x, window.innerWidth - w - 8) + 'px'
    menu.style.top = Math.min(y, window.innerHeight - h - 8) + 'px'
  }

  function hide() {
    if (menu) menu.classList.remove('show')
  }

  document.addEventListener('contextmenu', function (e) {
    // 输入类元素、有选中文本、按住 Shift：保留原生菜单（复制/检查元素）
    if (e.target.closest('input, textarea, select, [contenteditable="true"]')) return
    if (String(window.getSelection())) return
    if (e.shiftKey) return
    e.preventDefault()
    show(e.clientX, e.clientY)
  })
  document.addEventListener('click', hide)
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide() })
  window.addEventListener('scroll', hide, { passive: true })
  window.addEventListener('blur', hide)
})()
