'use strict'

hexo.extend.filter.register('before_generate', function () {
  const i18n = hexo.theme.i18n
  const lang = hexo.config.language || 'zh-CN'

  const t = key => {
    const result = i18n.get(key)
    return (result && result[lang]) || key
  }

  // Override page title for tags/categories index
  hexo.extend.filter.register('after_post_render', function () {
    // handled differently below
  })

  // Intercept the generator to set proper Chinese titles
  hexo.extend.generator.register('set_chinese_titles', function (locals) {
    // This runs before page rendering, we set titles via page properties
    return []
  })
})

// Simpler approach: override the page.title in template_locals
hexo.extend.filter.register('template_locals', function (locals) {
  const page = locals.page
  if (!page) return locals

  if (page.type === 'tags') {
    page.title = '标签'
    page.__page_type_title = '标签'
  } else if (page.type === 'categories') {
    page.title = '分类'
    page.__page_type_title = '分类'
  }

  return locals
})
