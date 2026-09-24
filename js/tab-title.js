/* 恶搞标题：切走标签页时标题被「月亮」接管，切回来欢迎一声再还原
   - 标题在页面加载时捕获原值（各页标题不同：文章页是「文章名 | Jasmine_Iris」）
   - 快速切走/切回时先清掉未到期的还原定时器，避免标题错乱 */
(function () {
  'use strict'
  var originTitle = document.title
  var backTimer = null

  document.addEventListener('visibilitychange', function () {
    clearTimeout(backTimer)
    if (document.hidden) {
      document.title = '🌙 你去哪儿了呀……'
    } else {
      document.title = '🌕 欢迎回来！'
      backTimer = setTimeout(function () { document.title = originTitle }, 2000)
    }
  })
})()
