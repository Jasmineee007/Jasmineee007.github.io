/**
 * 构建守卫：扫描每篇文章渲染后的正文 HTML，
 * 发现代码块外有活的危险标签（裸 <script>、带 on* 事件的标签、<embed>/<center>）
 * 直接抛错终止构建，防止 payload 泄漏成真标签（2026-08-29 XSS-Labs 侧栏被吞事故）。
 * 注意：代码块/反引号里的内容已被 Hexo 转义成 &lt; 等，不会命中下面的 < 开头正则。
 */

hexo.extend.filter.register('after_post_render', data => {
  if (!data.content) return data

  // 跳过 HTML 类型的原始页面（skip_render 已放行，但仍会过 after_post_render）
  if (data.raw && data.raw.startsWith('<!DOCTYPE html')) return data

  // gitee-card 是站点脚本（scripts/gitee-card.js）注入的可信组件，
  // 其 img onerror 是为隐藏加载失败的头像，属预期行为，检测前先剥掉
  const content = data.content.replace(/<a class="gitee-card"[\s\S]*?<\/a>/g, '')

  const checks = [
    { re: /<script[\s>]/i, label: '裸 <script>' },
    { re: /<[a-z][^>]*\s+on[a-z]+\s*=\s*["']?/i, label: '带 on* 事件属性的活标签' },
    { re: /<(embed|center)[\s>]/i, label: '裸 <embed>/<center>' }
  ]

  for (const { re, label } of checks) {
    const m = content.match(re)
    if (m) {
      const idx = content.indexOf(m[0])
      const ctx = content.slice(Math.max(0, idx - 60), idx + 80).replace(/\s+/g, ' ')
      throw new Error(
        `[check-dangerous-tags] 文章「${data.title}」正文发现${label}，已终止构建。\n` +
        `位置片段: ...${ctx}...\n` +
        `修复：把正文里的标签用反引号或代码块包起来。`
      )
    }
  }
  return data
})
