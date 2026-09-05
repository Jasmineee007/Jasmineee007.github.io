/* 文章页扩展（构建期注入，非运行时 JS）：
   1) 过时提醒 —— 最后更新超过 STALE_DAYS 天的文章，正文顶部插入时效提示（安全知识保鲜期短）
   2) 同系列文章 —— 正文末尾按末级分类列出同类文章（含本文共 ≥2 篇才显示），当前篇高亮
   豁免：加密文章（front-matter password 或「随笔」分类——随笔由 hexo-blog-encrypt 分类加密，
        内容已是密文不能再拼明文块）；front-matter stale: false / series: false 可单独关闭
   样式：source/css/post-extras.css（inject 引入） */
const STALE_DAYS = 90
const EXEMPT_CATEGORY = '随笔'

function inCategory(page, name) {
  const c = page && page.categories
  if (c == null) return false
  const hit = x => x != null && x.name === name
  if (typeof c.toArray === 'function') return c.toArray().some(hit)
  if (Array.isArray(c)) return c.some(hit)
  if (typeof c.forEach === 'function') { let f = false; c.forEach(x => { if (hit(x)) f = true }); return f }
  return false
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function localYmd(d) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

hexo.extend.filter.register('after_post_render', function (data) {
  if (data.layout !== 'post' || data.password) return data
  if (inCategory(data, EXEMPT_CATEGORY)) return data

  // 1) 过时提醒
  if (data.stale !== false) {
    // 判定基准：front-matter 显式写了 updated 用它；否则用创作日期。
    // 不用 Hexo 默认的文件 mtime——文件被脚本重写/格式化都会刷新 mtime，时钟永远归零
    let base = data.date && data.date.toDate ? data.date.toDate() : new Date(data.date)
    const um = /(^|\n)updated:\s*(.+)/.exec(data.raw || '')
    if (um) {
      const u = new Date(um[2].trim())
      if (!isNaN(u)) base = u
    }
    const days = Math.floor((Date.now() - base.getTime()) / 86400000)
    if (days >= STALE_DAYS) {
      const ago = days >= 365 ? Math.floor(days / 365) + ' 年多' : Math.max(1, Math.round(days / 30)) + ' 个多月'
      data.content = `<div class="stale-notice">⏳ 时效提醒：本文创作于 ${localYmd(base)}（${ago}前）。安全技术演进较快，阅读时请留意时效，实操前建议先在靶场验证。</div>` + data.content
    }
  }

  // 2) 同系列文章
  if (data.series !== false) {
    let cats = []
    try { cats = data.categories.toArray() } catch (e) { cats = [] }
    const leaf = cats.length ? cats[cats.length - 1].name : null
    if (leaf) {
      let posts = []
      try { posts = hexo.model('Post').find({}).toArray() } catch (e) { posts = [] }
      const list = posts
        .filter(p => p.published !== false && inCategory(p, leaf))
        .sort((a, b) => new Date(a.date) - new Date(b.date))
      if (list.length >= 2) {
        const items = list.map(p => {
          const t = esc(p.title || p.slug)
          if (data.path && p.path === data.path) return `<li class="current">${t}<span class="pes-cur">（本文）</span></li>`
          return `<li><a href="/${p.path}">${t}</a></li>`
        }).join('')
        data.content += `<div class="post-extras-series"><div class="pes-title">📚 同系列文章 · ${esc(leaf)}（${list.length} 篇）</div><ol>${items}</ol></div>`
      }
    }
  }
  return data
})
