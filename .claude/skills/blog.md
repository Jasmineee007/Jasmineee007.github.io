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
| `source/css/light-bg13.css` | 所有自定义样式（全站一图流 + 白纱/黑纱罩，改名需同步 inject） |
| `source/css/fix-flash.css` | 暗色模式闪烁修复 + 默认底色白色 |
| `source/js/copy-guard.js` | 复制版权处理 |
| `themes/butterfly/source/js/main.js` | 主题 JS（修改了 `alertInfo` 和 `copy` 函数） |
| `source/_data/link.yml` | 友链数据 |
| `scripts/append-note.js` | 文章页自动追加学习笔记声明 |
| `scripts/page-title.js` | 标签/分类页中文标题 |
| `scripts/upload-cover.js` | 封面图上传 图床（WebP 压缩，不加水印 → `posts/<slug>/cover.webp`，删本地） |
| `scripts/upload-images.js` | 正文图片上传 图床（加水印+WebP，替换 md 图片 URL） |
| `scripts/copy-workflow.js` | 复制 .github 目录到 public |
| `scripts/list-categories.js` | 分类页计数（父分类显示子分类个数） |
| `themes/butterfly/layout/category.pug` | 分类页模板（父分类显示子分类） |
| `themes/butterfly/layout/includes/widget/card_announcement.pug` | 公告模板（动态显示当天文章） |

## inject 注入（当前状态）

head:
- `light-bg13.css`（全站一图流 + 白纱/黑纱罩，改名绕过 Cloudflare 缓存）
- `top-img.css`（文章页封面卡片）
- `fix-flash.css`
- h5/h6 字号 style

bottom:
- home/not-home class 注入（非主页隐藏背景图）
- 标签点击拦截：`.article-tag-list a`、`.site-data a[href="/tags/"]`
- `copy-guard.js`

## 夜间模式

`_config.butterfly.yml` 中 `darkmode.enable: true`，`autoChangeMode: 1`（跟随系统）。

- 切换按钮：右下角太阳/月亮图标
- 深色背景：`#1a1a1a`
- 自定义覆盖：`source/css/dark-mode.css`（匹配 light-bg.css 的所有 `[data-theme='dark']` 规则）

## 复制版权行为

仅在文章页（`#article-container`）和首页卡片（`.recent-post-item`）内生效：

- **代码块复制按钮** → 主题弹"复制成功"（`position: fixed`，按钮附近），不附带版权信息
- **Ctrl+C / 右键复制文本** → copy-guard 弹"转载要标明出处哦"（屏幕居中），附带版权信息
- 非文章页（友链、关于、归档、分类等）复制正常，不追加不弹窗

### 协作机制

- `main.js` 的 `copy` 函数在调用 `writeText` 前设置 `window.__copyingCode = true`
- `copy-guard.js` 的 `writeText` 拦截检测到该标记直接放行（不弹窗、不附版权）
- 两个弹窗用不同 CSS 类名，互不干扰：主题用 `.copy-notice`，copy-guard 用 `.copy-guard-notice`

### 注意事项

- `main.js` 的 `alertInfo` 函数已改为 `position: fixed`（原版 `position: absolute` 会被代码块容器 `overflow: hidden` 裁剪）
- `copy-guard.js` 的弹窗类名不能用 `.copy-notice`，会和主题的 `highlight.styl` 冲突
- 弹窗动画时长 2 秒，JS 移除 setTimeout 也要同步为 2000ms

## 标签行为

- 标签总览页 `/tags/` 已删除，不存在
- 侧边栏标签云（`.card-tag-cloud a`）：可点击，cursor pointer + hover 缩放，跳转到对应标签页（如 `/tags/SQL注入/`）
- 文章内标签列表（`.article-tag-list a`）：点击被拦截，不跳转
- 站点数据"标签: X"链接（`.site-data a[href="/tags/"]`）：点击被拦截
- "文章"和"分类"正常可点击跳转

## 样式要点

- 全站一图流：`/img/bg.jpg`（深色）`cover` 铺满 + 所有页面透明头部 + 白字
- 白纱/黑纱罩：`#web_bg::after`——日间 `rgba(255,255,255,0)` 全透明（与刷题平台/反馈箱统一），夜间 `rgba(0,0,0,0.06)` 黑纱（更弱）
- 夜间背景：`#web_bg` opacity=1，主题 `#web_bg:before` 黑遮罩 override 为 `rgba(0,0,0,0.45)`（原 0.7 太重）
- 夜间卡片：`--card-bg: rgba(30,30,42,0.72)` 磨砂深色（别用 0.2 透明，太糊）
- 首页文章卡片：7 色循环渐变 + hover 上浮
- 标签 pill：8 色循环，不可点击
- Footer 非主页颜色自适应
- 侧栏子分类下拉：覆盖 `limit-one-line`，文字完整显示不截断
- 顶部 banner：所有页面 `top_img: transparent`（透明头部+白字），文章页有 `cover` 时经 `scripts/modify.js` 注入 `.top-img` 封面卡片（样式在 `top-img.css`）
- 评论系统：Waline（后端 waline.jasmine-iris.top）

## 文章规范

- 文件名: `source/_posts/<标题>/index.md`
- 标签只放跟分类一致的标签
- 分类层级格式（如 `Web安全/XSS`）

### 首页卡片

`index_post_content.method: 1` — 首页文章卡片显示 frontmatter 的 `description` 简介，不显示正文截取。

### 分类体系

Web安全 子分类：SQL、XSS、CSRF、RCE、文件上传、文件包含、PHP
CTF-WP 子分类：Contest-WP（比赛）、Lab-WP（练习）
其他顶级分类：随笔

- CTF-WP 分类的文章默认添加 CTF 标签
- 父分类页面（如 `/categories/CTF-WP/`）显示子分类链接，不显示文章
- 叶子分类页面（如 `/categories/CTF-WP/Contest-WP/`）显示文章列表

侧栏分类计数规则：
- 有子分类的父分类 → 显示子分类个数（如 Web安全 显示 8）
- 叶子分类 → 显示文章数（如 SQL 显示 2）
- `card_categories.limit: 0` 显示全部分类
- 修改位置：`themes/butterfly/scripts/helpers/aside_categories.js`（父分类计数）、`scripts/list-categories.js`（分类页计数）

### WP/题解 文章

- `categories: WP`，`tags: CTF`
- WP 是顶级分类，与 Web安全 并列

### 图片处理（重要）

正文图片走 图床（`img.jasmine-iris.top`），见 `scripts/upload-images.js`（加水印 + WebP）。

封面图（`cover:` frontmatter）走 `scripts/upload-cover.js`（**不加水印**，WebP）：
```bash
node scripts/upload-cover.js <slug> <本地图片路径>
# → https://img.jasmine-iris.top/posts/<slug>/cover.webp
```
上传后删除本地封面图 + 空文件夹。

### 公告

公告自动更新，不需要手动改：
- 当天有文章发布 → 显示"最近更新：日期" + 当天所有文章链接
- 当天无文章 → 显示"最近更新：最新文章日期" + 最新一篇文章链接
- 模板位置：`themes/butterfly/layout/includes/widget/card_announcement.pug`

### 部署

每次修改后必须执行：
```bash
cd E:\my_blog && npx hexo generate && npx hexo deploy
```
