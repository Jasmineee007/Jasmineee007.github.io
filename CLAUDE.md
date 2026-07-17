# Jasmine's Blog — 运维与创作指南

博客地址: https://Jasmineee007.github.io
基于 Hexo 8 + Butterfly 5.5.4 主题，部署到 GitHub Pages。

## 部署（每次修改后必须执行）

```bash
cd E:\my_blog && npx hexo generate && npx hexo deploy
```

部署目标: `git@github.com:Jasmineee007/Jasmineee007.github.io.git` (main 分支)
GitHub Pages 可能需要几分钟才能更新，用户需 Ctrl+F5 强制刷新。

## 本地预览

```bash
cd E:\my_blog && npx hexo server
# 访问 http://localhost:4000
```

## 写新文章

```bash
npx hexo new post "文章标题"
```

### Front-matter 模板

```yaml
---
title: 文章标题
date: 2026-06-08 12:00:00
categories:
  - Web安全
  - XSS
tags:
  - XSS
---
```

### 文章规范
- 文件名: `source/_posts/<标题>/index.md`
- **标签只放跟分类一致的标签**，不要加多余描述性标签
- 分类统一用层级格式（见下方分类体系）
- 代码块标注语言类型 (```sql, ```python 等)
- 日期精确到创建时间的确切时分秒
- 时区: `Asia/Chongqing`（_config.yml 中配置）

## 分类体系

Web安全 下的子分类（每篇文章归入一个子分类）：

| 子分类 | 已有文章 |
|--------|---------|
| SQL | SQL注入漏洞、数据库基础 |
| XSS | XSS漏洞 |
| CSRF | CSRF与SSRF漏洞 |
| RCE | RCE漏洞 |
| 文件上传 | 文件上传漏洞 |
| 文件包含 | 文件包含漏洞 |
| PHP | PHP基础安全 |

其他顶级分类：
- CTF-WP：Contest-WP（比赛）、Lab-WP（练习）
- 随笔

CTF-WP 分类的文章默认添加 CTF 标签。

## 图片处理

### 最终方案：source/img/posts/ 绝对路径

所有文章图片统一放在：

```
source/img/posts/<文章slug>/
  ├── xxx.png
  └── yyy.png
```

文章中引用：`![](/img/posts/<文章slug>/xxx.png)`

Hexo 会自动将 `source/img/` 复制到 `public/img/`，路径可靠。

`{% asset_img %}` 标签插件已弃用（可靠性差）。

### 水印（强制）

- 脚本: `scripts/watermark.js`，基于 sharp
- 水印内容: `© Jasmine_Iris`，右下角半透明
- 用法: `node scripts/watermark.js image.jpg` 或 `node scripts/watermark.js --dir ./images/`
- **所有文章配图必须先加水印再放入 source/img/posts/**

### 语雀文章导入

使用 `E:\my_blog\_import-yuque.js`（不在 scripts/ 目录，避免 hexo 自动执行）：
1. 下载语雀 CDN 图片（需浏览器 UA 头）
2. 批量加水印
3. 替换 markdown 中的 CDN URL 为本地路径
4. 创建 `source/img/posts/<slug>/` 目录

## 主题关键配置

文件：`_config.butterfly.yml`

### UI 行为
- `post_copyright.enable: false` — 不显示文章底部版权栏
- `post_pagination: 1` — 文章底部显示上一篇/下一篇导航
- `copy.enable: true` + `copy.copyright.enable: false` — 禁用主题自带复制处理
- `snackbar.enable: false` — 关闭 toast 通知
- 菜单: 首页、归档、友链、关于（分类和标签已从菜单中移除）

### 复制版权行为（copy-guard.js）

`source/js/copy-guard.js` — 自定义复制处理，通过 inject.bottom 引入：
- 页面加载时检测 `#article-container`（文章页）或 `.recent-post-item`（首页卡片），不存在则直接退出，确保只在文章页/首页生效
- Ctrl+C / 右键复制：监听 `copy` 事件，判断选中内容是否在文章/卡片区域内，是则追加版权信息
- **代码块复制按钮**：Butterfly 主题使用 `navigator.clipboard.writeText()`（不触发 copy 事件），因此在页面加载时覆盖 `navigator.clipboard.writeText`，追加版权信息后再写入剪贴板
- 弹窗文字："转载要标明出处哦"，1.5 秒后自动消失
- 版权信息：`作者: Jasmine_Iris\n链接: <当前URL>\n来源: Jasmine_Iris\n著作权归作者所有...`

### inject 内容

head:
- `<link rel="stylesheet" href="/css/light-bg.css?v=16">` — 所有自定义样式
- `<link rel="stylesheet" href="/css/fix-flash.css?v=4">` — 暗色模式闪烁修复
- h5/h6 字号调整 style

bottom:
- home/not-home class 注入脚本（非主页隐藏背景图）
- **标签点击拦截** — 拦截 `.card-tag-cloud a`、`.article-tag-list a`、`.site-data a[href="/tags/"]` 点击
- **copy-guard.js** — 自定义复制版权处理

## 自定义样式（light-bg.css v16）

`source/css/light-bg.css` — 所有自定义样式集中于此：

1. **非主页纯色背景** — 隐藏 `#web_bg`，body 白底（暗色模式黑底）
2. **暗色模式配色** — `#content-inner`、`.card-widget`、`.layout`、`#article-container`、`.recent-post-item` 全黑系
3. **首页文章卡片渐变** — 7 色循环渐变（左→右渐浅到白），Hover 上浮阴影，暗色模式统一深色
4. **标签彩色 pill** — 8 色循环底色 + 彩色字，hover 半透明上浮
5. **公告内链接** — 颜色继承正文，hover 变蓝（暗色模式浅蓝）
6. **Footer 颜色** — 非主页日间黑字、夜间浅灰
7. **复制成功提示动画** — `.copy-notice` 居中弹入淡出

CSS 版本号通过 `inject.head` 中的 `?v=N` 参数管理，修改后需 +1 以确保浏览器刷新缓存。

### 渐变颜色体系
| 序号 | 颜色 | 色值 |
|------|------|------|
| 1 | 浅粉 | #fce4ec |
| 2 | 浅蓝 | #e3f2fd |
| 3 | 浅绿 | #e8f5e9 |
| 4 | 浅橙 | #fff3e0 |
| 5 | 浅紫 | #f3e5f5 |
| 6 | 浅青 | #e0f7fa |
| 7 | 靛蓝 | #ede7f6 |

### 标签 pill 颜色体系
| 序号 | 底色 | 字色 |
|------|------|------|
| 1 | #fce4ec | #d4687c |
| 2 | #e3f2fd | #5b9bd5 |
| 3 | #e8f5e9 | #6aab73 |
| 4 | #fff3e0 | #e8a14b |
| 5 | #f3e5f5 | #b380b8 |
| 6 | #e0f7fa | #5cacb8 |
| 7 | #fce4ec | #e8899b |
| 8 | #ede7f6 | #8b7ec8 |

## 侧边栏公告

`card_announcement.content` 包含欢迎语 + 最近更新日期 + 新增文章列表（带跳转链接），格式：纯文本 + `<a href="...">` HTML 链接。URL 路径末尾必须带 `/index/`（如 `/2026/06/08/XSS漏洞/index/`）。

## 脚本目录注意事项

`scripts/` 目录下的所有 `.js` 文件会被 Hexo 自动加载执行。
工具脚本必须加 `if (require.main === module) main();` 守卫，防止 `hexo generate` 时误执行。
不需要 Hexo 加载的工具脚本放在项目根目录外用 `_` 前缀命名（如 `_import-yuque.js`）。

### append-note.js
自动在每篇文章末尾追加 `> 本文为个人学习笔记，如有错误或疏漏，欢迎批评指正。`
- 使用 `after_render:html` 过滤器（Hexo 8 兼容）
- 排除 hello-world
- 已有该句的文章不会重复添加

## 标签页与标签点击

- **标签总览页 `/tags/` 已禁用** — `source/tags/index.md` 已删除，页面不再生成
- **标签点击已拦截** — inject.bottom 中的脚本阻止以下所有标签链接的点击跳转：
  - `.card-tag-cloud a` — 侧边栏标签云
  - `.article-tag-list a` — 文章内标签列表
  - `.site-data a[href="/tags/"]` — 侧边栏"标签"统计数字
- 标签样式：`cursor: default`，hover 无上浮效果（视觉上不像是可点击的）
- 分类页 `/categories/` 正常可用（可点击跳转）
- 标签仍可出现在文章 front-matter 中（用于分类和标签云的视觉展示），但无法点击跳转

## 友链（link.yml）

`source/_data/link.yml` — Butterfly 友链数据文件：
- class_desc 留空（不显示"欢迎交换友链~"等描述文字）
- 修改后需 `hexo clean && hexo generate && hexo deploy` 才会生效（Hexo 缓存数据）

## 当前状态

- 主题: Butterfly 5.5.4
- 评论: Giscus
- 搜索: 本地搜索 (local_search)
- 代码高亮: highlight.js
- 暗色模式: 已启用，跟随系统
- 字数统计: 已启用
- 部署: git deployer → GitHub Pages
- 文章数: 8 篇
