'use strict'

// Override list_categories to show subcategory count for parent categories
hexo.extend.helper.register('list_categories', function (categories, options) {
  if (categories && typeof categories === 'object' && !categories.length) {
    options = categories
    categories = this.site.categories
  } else if (!categories) {
    categories = this.site.categories
  }

  if (!categories || !categories.length) return ''

  options = options || {}
  const { config } = this
  const showCount = options.hasOwnProperty('show_count') ? options.show_count : true
  const style = options.hasOwnProperty('style') ? options.style : 'list'
  const depth = options.depth ? parseInt(options.depth, 10) : 0
  const orderby = options.orderby || 'name'
  const order = options.order || 1
  const categoryDir = this.url_for(config.category_dir)
  const transform = options.transform
  const separator = options.separator || ', '

  // Build parent->children map
  const categoryMap = new Map()
  categories.forEach(cat => {
    const parentId = cat.parent || 'root'
    if (!categoryMap.has(parentId)) {
      categoryMap.set(parentId, [])
    }
    categoryMap.get(parentId).push(cat)
  })

  const sortFn = (a, b) => {
    const valA = a[orderby]
    const valB = b[orderby]
    if (valA < valB) return -order
    if (valA > valB) return order
    return 0
  }

  for (const list of categoryMap.values()) {
    list.sort(sortFn)
  }

  const hierarchicalList = (level = 0, parentId = 'root') => {
    let result = ''
    if (!depth || level < depth) {
      const children = categoryMap.get(parentId)
      if (children) {
        children.forEach(cat => {
          const childHtml = hierarchicalList(level + 1, cat._id)
          const hasChildren = categoryMap.has(cat._id) && categoryMap.get(cat._id).length > 0
          const displayCount = hasChildren ? categoryMap.get(cat._id).length : cat.length
          const catName = transform ? transform(cat.name) : cat.name

          if (style === 'list') {
            result += `<li class="category-list-item">`
            result += `<a class="category-list-link" href="${this.url_for(cat.path)}">${catName}</a>`
            if (showCount) {
              result += `<span class="category-list-count">${displayCount}</span>`
            }
            if (childHtml) {
              result += `<ul class="category-list-child">${childHtml}</ul>`
            }
            result += `</li>`
          } else {
            if (result) result += separator
            result += `<a class="category-list-link" href="${this.url_for(cat.path)}">${catName}`
            if (showCount) {
              result += ` (${displayCount})`
            }
            result += `</a>`
          }
        })
      }
    }
    return result
  }

  const content = hierarchicalList()

  if (style === 'list') {
    return `<ul class="category-list">${content}</ul>`
  }
  return content
})
