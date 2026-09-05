/* 盘古之白：中英文之间自动加空格（pangu.min.js 提供库，本脚本控制作用范围）
   只处理 #article-container 内的文本节点；pre/code/kbd/代码高亮容器一律跳过，
   保证代码块复制出来的内容不受影响。评论区、目录等区域不在处理范围 */
(function () {
  'use strict'
  function ready(fn) {
    if (document.readyState !== 'loading') fn()
    else document.addEventListener('DOMContentLoaded', fn)
  }

  ready(function () {
    if (!window.pangu || typeof pangu.spacing !== 'function') return
    var container = document.getElementById('article-container')
    if (!container) return

    var SKIP = 'pre, code, kbd, samp, var, script, style, .highlight, .wl-editor'
    var HAS_MIXED = /[\u4e00-\u9fff][A-Za-z0-9`$@]|[A-Za-z0-9`$@][\u4e00-\u9fff]/
    var walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        var p = node.parentElement
        if (!p || p.closest(SKIP)) return NodeFilter.FILTER_REJECT
        return HAS_MIXED.test(node.data) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP
      }
    })

    var nodes = []
    while (walker.nextNode()) nodes.push(walker.currentNode)
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].data = pangu.spacing(nodes[i].data)
    }
  })
})()
