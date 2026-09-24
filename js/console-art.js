/* 控制台彩蛋：给按 F12 的访客一点惊喜（安全圈的读者打开控制台是肌肉记忆） */
(function () {
  'use strict'

  var moon = [
    '        _..._        ',
    '      .::::  `.      ',
    '     :::::::.  :     ',
    '     ::::::::  :     ',
    '     `::::::\' .\'     ',
    '       `\'::\'-\'       '
  ]

  console.log('%cJasmine_Iris', 'font-size: 28px; font-weight: bold; color: #49b1f5; text-shadow: 1px 1px 0 rgba(0,0,0,.1)')
  console.log('%c' + moon.join('\n'), 'color: #f5c26b')
  console.log('%c满地都是六便士，我却抬头看见了月亮', 'color: #9ca3af; font-style: italic')
  console.log('%c咦，同是练剑人？博客源码与安全技术都欢迎来聊 → https://jasmine-iris.top/feedback/', 'color: #49b1f5')
  console.log('%cGitHub → https://github.com/Jasmineee007', 'color: #9ca3af')
})()
