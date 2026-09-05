'use strict';

// 按分类加密文章：给指定分类下的文章自动加 password，
// 由 hexo-blog-encrypt 在 after_post_render 阶段完成加密。
// 密码配置在 _config.yml 的 encrypt.categories 里（name 为分类名）。

function categoryNames(categories) {
  if (categories == null) return [];
  if (Array.isArray(categories)) {
    return categories.map(c => (typeof c === 'string' ? c : c && c.name));
  }
  if (typeof categories.toArray === 'function') {
    return categories.toArray().map(c => c && c.name);
  }
  if (typeof categories.forEach === 'function') {
    const out = [];
    categories.forEach(c => out.push(c && c.name));
    return out;
  }
  return [];
}

hexo.extend.filter.register('before_post_render', function (data) {
  const cfg = hexo.config && hexo.config.encrypt;
  if (!cfg || !Array.isArray(cfg.categories) || cfg.categories.length === 0) return data;

  // front-matter 里显式写了 password 的文章，尊重其设置（含 password: '' 禁用加密）
  if (data.password !== undefined && data.password !== null) return data;

  const names = categoryNames(data.categories);
  if (names.length === 0) return data;

  for (const rule of cfg.categories) {
    if (!rule || typeof rule.name !== 'string' || !rule.password) continue;
    if (names.includes(rule.name)) {
      data.password = rule.password;
      // 加密文章统一显示「该文被加密保护」，避免首页卡片/SEO 泄露正文
      if (data.description === undefined || data.description === null) {
        data.description = '该文被加密保护';
      }
      break;
    }
  }
  return data;
});
