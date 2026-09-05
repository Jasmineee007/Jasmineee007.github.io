/* 文章链接美化（link-style.css 配套）：
   1) 外链（不含图片的文本链接）加 .lp-ext 类 —— CSS 据此绘制 ↗ 图标
   2) 「链接文本 = 裸网址」的链接改为短格式显示：只改显示文本不改 href，
      完整地址放 title 悬停可见；短于原文才替换
   图片链接、其它元素一律不动；作用域 #article-container */
(function () {
  'use strict'
  function ready(fn) {
    if (document.readyState !== 'loading') fn()
    else document.addEventListener('DOMContentLoaded', fn)
  }

  function shortDisplay(a) {
    var host = a.hostname.replace(/^www\./, '')
    var segs
    try { segs = decodeURIComponent(a.pathname).split('/').filter(Boolean) } catch (e) {
      segs = a.pathname.split('/').filter(Boolean)
    }
    var display = host
    if (segs.length) {
      var seg = segs[0].length > 18 ? segs[0].slice(0, 18) + '…' : segs[0]
      display = host + '/' + seg
      if (segs.length > 1) display += '/…'
    }
    if (a.search || a.hash) display += display.endsWith('…') ? '' : '…'
    return display
  }

  ready(function () {
    var container = document.getElementById('article-container')
    if (!container) return
    var links = container.querySelectorAll('a[href]')
    for (var i = 0; i < links.length; i++) {
      var a = links[i]
      if (a.querySelector('img')) continue
      if (a.host && a.host !== location.host) a.classList.add('lp-ext')

      var text = a.textContent.trim()
      if (text.length < 8 || !/^https?:\/\//i.test(text)) continue
      var display = shortDisplay(a)
      if (display && display.length < text.length) {
        if (!a.title) a.title = text
        a.classList.add('lp-short')
        a.textContent = display
      }
    }
  })
})()
