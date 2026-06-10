---
name: blog
description: Jasmine's Hexo blog — deploy, customize, and manage content
---

# Blog Skill

Blog 地址: https://Jasmineee007.github.io
基于 Hexo 8 + Butterfly 5.5.4，部署到 GitHub Pages。

## 部署

```bash
cd E:\my_blog && npx hexo generate && npx hexo deploy
```

## 关键文件

| 文件 | 用途 |
|------|------|
| `_config.butterfly.yml` | 主题配置（inject、菜单、插件等） |
| `source/css/light-bg.css?v=16` | 所有自定义样式 |
| `source/css/fix-flash.css?v=4` | 暗色模式闪烁修复 |
| `source/js/copy-guard.js` | 复制版权处理 |
| `source/_data/link.yml` | 友链数据 |

## inject 注入（当前状态）

head:
- `light-bg.css?v=16`
- `fix-flash.css?v=4`
- h5/h6 字号 style

bottom:
- home/not-home class 注入（非主页隐藏背景图）
- 标签点击拦截：`.card-tag-cloud a`、`.article-tag-list a`、`.site-data a[href="/tags/"]`
- `copy-guard.js`

## 复制版权行为

仅在文章页（`#article-container`）和首页卡片（`.recent-post-item`）内生效：
- Ctrl+C / 右键复制 → 监听 copy 事件，追加版权信息
- 代码块复制按钮 → 覆盖 `navigator.clipboard.writeText`，追加版权信息
- 弹窗："转载要标明出处哦"，1.5 秒后消失
- 非文章页（友链、关于、归档、分类等）复制正常，不追加不弹窗

## 标签行为

- 标签总览页 `/tags/` 已删除
- 所有标签链接点击被拦截（不跳转），仅保留数量展示功能
- CSS `cursor: default` + hover 无效果（视觉上不像可点击链接）
- "文章"和"分类"正常可点击跳转

## 样式要点

- 非主页纯色背景（日间白/夜间黑），隐藏 `#web_bg`
- 深色模式：全黑系配色
- 首页文章卡片：7 色循环渐变 + hover 上浮
- 标签 pill：8 色循环，不可点击
- Footer 非主页颜色自适应

## 文章规范

- 文件名: `source/_posts/<标题>/index.md`
- 标签只放跟分类一致的标签
- 分类层级格式（如 `Web安全/XSS`）
- 图片: `source/img/posts/<文章slug>/`，引用 `/img/posts/<slug>/xxx.png`
- 图片需加水印：`node scripts/watermark.js image.jpg`
