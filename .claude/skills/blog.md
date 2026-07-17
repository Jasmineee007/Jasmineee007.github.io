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
| `source/css/light-bg.css` | 所有自定义样式 |
| `source/css/fix-flash.css` | 暗色模式闪烁修复 + 默认底色白色 |
| `source/js/copy-guard.js` | 复制版权处理 |
| `themes/butterfly/source/js/main.js` | 主题 JS（修改了 `alertInfo` 和 `copy` 函数） |
| `source/_data/link.yml` | 友链数据 |
| `scripts/append-note.js` | 文章页自动追加学习笔记声明 |
| `scripts/page-title.js` | 标签/分类页中文标题 |
| `scripts/watermark.js` | 图片水印 CLI 工具 |
| `scripts/copy-workflow.js` | 复制 .github 目录到 public |
| `scripts/list-categories.js` | 分类页计数（父分类显示子分类个数） |
| `themes/butterfly/layout/category.pug` | 分类页模板（父分类显示子分类） |
| `themes/butterfly/layout/includes/widget/card_announcement.pug` | 公告模板（动态显示当天文章） |

## inject 注入（当前状态）

head:
- `light-bg.css`
- `dark-mode.css`（夜间模式覆盖）
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

- 非主页纯色背景（日间白/夜间黑），隐藏 `#web_bg`
- 深色模式：全黑系配色
- 首页文章卡片：7 色循环渐变 + hover 上浮
- 标签 pill：8 色循环，不可点击
- Footer 非主页颜色自适应
- 侧栏子分类下拉：覆盖 `limit-one-line`，文字完整显示不截断
- 顶部 banner：主题默认蓝色图片全部换成白色（`/img/white.png`），文章页用用户自己的 `/img/post-1.png`，首页用 `/img/bg.jpg`
- `--default-bg-color: #fff` 消除首页蓝色闪烁
- 评论系统：Giscus（`https://giscus.app/client.js`），需要代理才能访问

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

### 序号规则

- H1 (`#`): 一、二、三、四…（中文数字+顿号）
- H2 (`##`): (一)(二)(三)(四)…（括号+中文数字）
- H3 (`###`): 1. 2. 3. 4.…（数字+点）
- H2/H3 中属于"正文列表项"的不算序号，保持原样（如正文中的 `1. 启动 MSF 框架`）
- `---` 分隔线仅用于 H1 之间，H2/H3 之间不用，末尾不用
- 不要动 YAML frontmatter 的 `---`

### WP/题解 文章

- `categories: WP`，`tags: CTF`
- WP 是顶级分类，与 Web安全 并列

### 图片处理（重要）

1. 下载图片到 `source/img/posts/<文章slug>/`
2. 运行水印脚本：`cd E:\my_blog && node scripts/watermark.js --dir "source/img/posts/<文章slug>"`
3. markdown 引用路径：`![](/img/posts/<文章slug>/xxx.png)`
4. 不要放在 `source/_posts/` 下，Hexo 不会复制

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
