# Jasmine's Blog — 运维与创作指南

博客地址: https://Jasmineee007.github.io
基于 Hexo 8 + Butterfly 5.5.4 主题，部署到 GitHub Pages。

## 技术栈概览

- **引擎与主题**：Hexo 8 + Butterfly 5.5.4（高度魔改）
- **渲染链路**：marked（Markdown）→ EJS + Pug 模板 → Stylus 样式；highlight.js 代码高亮
- **托管与部署**：GitHub Pages（`Jasmineee007.github.io`，main 分支）← Cloudflare 代理；`hexo-deployer-git` 部署
- **自定义域名**：`jasmine-iris.top`（Cloudflare 托管，主站已套 CF 代理）
- **图床**：GitHub 仓库 `Jasmineee007/blog-img` 开 GitHub Pages → 自定义域名 `img.jasmine-iris.top`（Cloudflare 代理）；文章图加水印上传
- **评论**：Waline 自托管 → `waline.jasmine-iris.top`（Cloudflare Worker）
- **访问统计**：Umami Cloud 免费版 + CF Worker `umami-proxy` 反代 → `umami.jasmine-iris.top`
- **站内搜索**：`hexo-generator-searchdb`
- **文章加密**：`hexo-blog-encrypt`（「随笔」分类）
- **SEO**：`hexo-generator-sitemap` + robots.txt（挡 AI 爬虫）
- **字体**：霞鹜文楷屏幕阅读版（本地 `font/`）
- **配套单页应用**（`source/quiz/`、`source/feedback/`，`skip_render` 原样发布）：
  - SecLearn 刷题平台（单文件 HTML + 内置题库）
  - 反馈箱（单文件 HTML，mailto 提交）

## 部署（每次修改后必须执行）

```bash
cd E:\my_blog && npx hexo generate && npx hexo deploy
```

部署目标: `git@github.com:Jasmineee007/Jasmineee007.github.io.git` (main 分支)
GitHub Pages 可能需要几分钟才能更新，用户需 Ctrl+F5 强制刷新。

- **`.nojekyll`（2026-09-06 补）**：hexo-deployer-git 默认跳过点开头文件，所以 `source/.nojekyll` 必须同时满足三件事才生效：`_config.yml` 的 `include` 列 `.nojekyll`、deploy 配置加 `ignore_hidden: false`、source 下没有其他点开头文件（`.github/workflows/deploy.yml` 死工作流残留已随之删除——它若被部署到 Pages 仓库会触发 Actions 把源码当站点部署）。改这些配置后需 `hexo clean` 再 generate
- **`/tags/` 标签页（2026-09-06 补）**：`source/tags/index.md`（type: tags，仿 categories 页）补齐了 /tags/ 直达 404 的问题；标签/分类点击仍被 inject 脚本拦截，此页只作直达兜底

**主站已套 Cloudflare 代理**：域名 `jasmine-iris.top` 的 NS 指向 Cloudflare（jose / aleena.ns.cloudflare.com），主域名 A 记录解析到 CF IP（104.21.70.77 / 172.67.221.163），响应头带 `Server: cloudflare` 与 `CF-RAY`。链路：访客 → Cloudflare → GitHub Pages。HTML 是 `cf-cache-status: DYNAMIC`（不缓存），但 css/js/字体等静态资源会被 CF 缓存——改内容不生效时，除 GitHub Pages 缓存外还要想到 CF 缓存（Dashboard → Caching → Purge Cache 清理）。防爬可在 Security → Bots 开启 Bot Fight Mode。

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

图片通过 CDN 图床管理，不再存本地。

### 图床仓库

`Jasmineee007/blog-img` — GitHub 仓库，开 GitHub Pages 绑自定义域名 `img.jasmine-iris.top`（经 Cloudflare 代理）。

### 上传脚本

`scripts/upload-images.js` — 从语雀导出的 md 中提取本地图片，加水印并上传到图床，替换为 CDN 链接。

```bash
# 加水印 + 上传
node scripts/upload-images.js --watermark 文章.md

# 不加水印
node scripts/upload-images.js 文章.md
```

- Token 存储在 `.env`（已 gitignore）
- 水印内容: `© Jasmine_Iris`，右下角半透明
- 输出 `文章_cdn.md`，放入 `source/_posts/` 即可
- 处理后语雀原始导出文件和本地图片可删除

## 主题关键配置

文件：`_config.butterfly.yml`

### UI 行为
- `post_copyright.enable: false` — 不显示文章底部版权栏
- `post_pagination: 1` — 文章底部显示上一篇/下一篇导航
- `copy.enable: true` + `copy.copyright.enable: false` — 禁用主题自带复制处理
- `snackbar.enable: false` — 关闭 toast 通知
- 菜单: 首页、归档、友链、关于（分类和标签已从菜单中移除）
- `rightside_item_order.show: darkmode,hideAside,toc` — **show 列表是白名单**，设了 enable 后默认的 toc/chat/comment 全部失效；toc 是手机端文章目录按钮（`#mobile-toc-button`，桌面被主题 CSS 隐藏），漏掉它手机就没目录（踩过）。桌面端右下角只显示 darkmode/hideAside/go-up 不受影响

### 复制版权行为（copy-guard.js + copy-feedback.js）

`source/js/copy-guard.js` — 文章页复制保护，通过 inject.bottom 引入（只在 `#body-wrap.post` 页生效）：
- 选中字数 `<=500` → 正常复制，只弹 `.copy-guard-notice`「复制成功，转载请注明出处」
- 选中字数 `>500` → `preventDefault()`，剪贴板只塞文章目录（h1~h4 大纲），弹「复制内容过多，已替换为文章目录」
- 代码块复制按钮走主题 `navigator.clipboard.writeText`（设 `window.__copyingCode`），不触发 copy 事件，不受影响

`source/js/copy-feedback.js` — 代码块复制按钮内联提示（inject.bottom 引入，copy-guard.js 之后）：
- MutationObserver 捕获主题生成的 `.copy-notice` → 移除浮动气泡 → 在 `.highlight-tools` 复制按钮旁内联显示「✓ 复制成功」（1500ms 淡出）；失败显示「复制失败」
- 样式 `.copy-success-inline` 在 light-bg13.css（用户不要弹窗式提醒，要按钮旁边一句话）

### 字体（霞鹜文楷屏幕阅读版）

- `source/font/lxgwwenkaigbscreen/` — woff2 分包（247 个 N.woff2）+ `result.min.css`（unicode-range @font-face，family 名 `LXGW WenKai GB Screen`，font-display: swap）
- `_config.butterfly.yml` → `font.font_family: "'LXGW WenKai GB Screen', -apple-system, ..."`（整值必须用双引号包裹）；代码块走独立的 `code_font_family`（consolas 栈），不受影响
- inject.head 引入 `result.min.css` + preload
- **坑：改 `_config.butterfly.yml` 里 stylus 读的配置后必须 `hexo clean`** — 否则渲染缓存不失效，编译出的 index.css 还是旧值
- **坑：GitHub Pages 静态资源 max-age=14400，Cloudflare 按此缓存** — 改 CSS 后普通刷新最长 4 小时不见效，必须 Ctrl+F5；新文件首次若在 Pages 传播完成前被请求，CF 会把 404 缓存几分钟~几小时（绕参数探测源站真实状态，等自愈）

### SEO（robots.txt + sitemap）

- `source/robots.txt`：屏蔽 /archives/ /tags/ /categories/ /page/ 及 AI 训练爬虫（GPTBot/ClaudeBot/anthropic-ai/CCBot/Google-Extended/PerplexityBot/Applebot-Extended/Bytespider）。分类页整体屏蔽是**有意为之**
- `sitemap.xml` 由 hexo-generator-sitemap 插件生成（_config.yml `sitemap:` 段）：`tags: false`、`categories: false`、全局 `skip_render: [font/**]`
- `source/categories/index.md`、`source/archives/index.md` 的 front-matter 加了 `sitemap: false`（被 robots 屏蔽的实体页面不能进 sitemap）
- robots.txt 是君子协定，只约束守规矩的爬虫，拦不住恶意脚本



head:
- `<link rel="stylesheet" href="/font/lxgwwenkaigbscreen/result.min.css">` + preload — 霞鹜文楷分包字体
- `<link rel="stylesheet" href="/css/light-bg13.css?v=16">` — 所有自定义样式（版本号管理见下）
- `<link rel="stylesheet" href="/css/top-img.css">`
- `<link rel="preload" as="image" href="...leaf-arrow-forest-36.png">` + `...leaf-arrow-forest-hand-36.png` — 双形态光标图预载
- `<link rel="stylesheet" href="/css/fix-flash.css?v=6">` — 暗色模式闪烁修复
- h5/h6 字号调整 style

bottom:
- home/not-home class 注入脚本（非主页隐藏背景图）
- **标签点击拦截** — 拦截 `.card-tag-cloud a`、`.article-tag-list a`、`.site-data a[href="/tags/"]` 点击
- **copy-guard.js** — 自定义复制版权处理

## 自定义样式（light-bg13.css）

`source/css/light-bg13.css` — 所有自定义样式集中于此（文件名带版本号，改动后需在 inject.head 里把 `?v=N` +1 刷新缓存）：

1. **非主页纯色背景** — 隐藏 `#web_bg`，body 白底（暗色模式黑底）
2. **暗色模式配色** — `#content-inner`、`.card-widget`、`.layout`、`#article-container`、`.recent-post-item` 全黑系
3. **首页文章卡片渐变** — 7 色循环渐变（左→右渐浅到白），Hover 上浮阴影，暗色模式统一深色
4. **标签彩色 pill** — 8 色循环底色 + 彩色字，hover 半透明上浮
5. **公告内链接** — 颜色继承正文，hover 变蓝（暗色模式浅蓝）
6. **Footer 颜色** — 全站透明背景（日间/夜间一致），白字 + 深色文字阴影（透出 bg.jpg）
7. **复制成功提示动画** — `.copy-notice` 居中弹入淡出

CSS 版本号通过 `inject.head` 中的 `?v=N` 参数管理，修改后需 +1 以确保浏览器刷新缓存。

## 自定义光标（leaf-arrow-forest 双形态，36px：默认箭头 + 可点击处手势）

- 默认箭头：`html, body, body * { cursor: url(".../img/leaf-arrow-forest-36.png") 1 1, default !important; }`（light-bg13.css）
- 手势（可点击处）：`a, button, [onclick], [role="button"], select, summary, label, details, input[type="submit"/"button"/"checkbox"/"radio"/"range"], .btn, .navi, .brand, .bico, .note-item, .tag, .category, .page-number, .back-to-top { cursor: url(".../img/leaf-arrow-forest-hand-36.png") 7 1, pointer !important; }`
- **热点坐标**：箭头 `1 1` = 尖端；手势 `7 1` = 食指指尖（sweezy 官方 offset 26,4 @128px 缩放到 36px）。换光标图必须重新做像素分析找尖端并更新坐标
- `input, textarea, [contenteditable]` 保留 `cursor: text`
- 拖尾/点击特效：`source/js/cursor.js`（canvas，pointer-events:none）
- 同款双形态光标也各自内嵌在 feedback/index.html 与 SecLearn 源 HTML（`*{...} + a,button,...`）——三处 CSS 同步改，别只改一处

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

### gitee-card.js
Gitee 仓库卡片标签，用法：`{% gitee owner/repo %}`
- 通过 Gitee API 获取仓库信息，渲染为卡片（名称、描述、star、fork、语言）
- 数据缓存 1 小时（`.gitee-cache.json`），避免每次 build 都请求 API
- 支持暗色模式

### B站视频嵌入
使用 `hexo-tag-bilibili-card` 插件。
用法：`{% bilibili_card BV号 %}`
完整：`{% bilibili_card BV1xx411c7mD video 'views danmakus' system %}`

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

## 浏览量/访客数（Umami Cloud 免费方案）

- 架构：Umami Cloud 免费版收集 + **Share 分享链接协议**反代显示（绕开 $20/月 的 Pro API Key）。后台看板 https://cloud.umami.is ，website_id `ec777610-c4cf-493c-a333-c1dc46377957`
- 数据流：页面从 `umami.jasmine-iris.top/script.js` 加载统计脚本（Worker 反代 cloud.umami.is）→ 浏览上报走同域 `/api/send` → 侧栏数字由主题 JS 调同域 `/api/websites/{id}/stats` → CF Worker `umami-proxy` 用分享 JWT 问官方网关后原样吐回。workers.dev 域名大陆可达性差，故绑自有子域名
- 关键协议事实：`GET https://gateway-eu.umami.is/api/share/{slug}` **公开**返回 `{token}`（只读分享 JWT，payload 无 exp 字段）；随后带头 `x-umami-share-token: <jwt>` + `x-umami-share-context: 1` 读网关接口即可。此格式与主题 `themes/butterfly/layout/includes/third-party/umami_analytics.pug` 的 serverURL 取数分支天然兼容 → 无需任何自定义前端脚本
- 部署物：
  - CF Worker `umami-proxy`，代码备份在项目根目录 `cf-umami-worker.js`——**改动后须去 CF 在线编辑器重新粘贴并 Deploy**
  - 自定义域 `umami.jasmine-iris.top`（Workers 的 Settings→Domains & Routes 里绑定，DNS+证书自动创建）
  - Umami Share URL：`https://cloud.umami.is/share/2KkHZqs7wApqFxz6`
- `_config.butterfly.yml` 要点：`umami_analytics.enable: true`、`serverURL: https://umami.jasmine-iris.top`、`UV_PV.site_uv/site_pv: true`、`page_pv: false`（文章页不显示）、`token:` 任意非空占位串（Worker 忽略真伪）；`waline.pageview: false`、busuanzi 三项全 false；侧栏槽位是 `card_webinfo.pug` 原生的 `<div id="umami-site-uv/pv">`
- Worker 安全行为：仅 `/api/*` 校验 Origin 白名单（jasmine-iris.top/www/localhost:4000）；`script.js` 是公开静态资源不能锁 Origin（`<script src>` 本来就不带该头，锁了统计会断）；**`/api/send` 只收生产来源，`http://localhost` 开头一律 405（本地调试不计浏览量）**；API 响应 Cache-Control 300s。改动 Worker 后须用户重新粘贴到 CF 编辑器部署（文件首行有 vN 标记供核对），改的是 Worker 而不是博客时无需 hexo 部署
- **Worker 取数缓存（v5）**：stats 查询按完整查询串分键缓存 60s + 4s 超时 + 上游挂了回吐同查询旧值（防侧栏转圈）。**v4 教训：缓存不分键会串数据**——侧栏查的全站总数会被错误塞给文章卡的单篇查询，排查统计数字"不对劲"时先想到这层；同键的串数据问题同理
- **侧栏运行时间实时计时**：`source/js/runtime-live.js`（inject.bottom 引入）——每秒覆写 `#runtimeshow`（主题 main.js 只算一次天数的静态值），显示 `N天 HH:MM:SS`；单行排版靠 light-bg13.css 的 `.card-webinfo .webinfo-item` flex 强约束（name 列 `flex:0 0 auto`+nowrap，count 列 `flex:1 1 auto`+右对齐）
- **单篇浏览量卡**：`source/js/pv-post.js`（inject.bottom 引入）——文章页往侧栏目录卡正上方插一条单行小卡「👁 本文浏览：N」，fetch Worker stats 接口按 `window.location.pathname` 过滤取数；**没人看过显示 "-" 不显示 0**；样式 `.card-pv-post/.pv-row/.pv-count` 在 light-bg13.css。注意主题在文章页不渲染 card_webinfo（widget/index.pug 写死），别想着往网站资讯卡里塞行
- **侧栏「今日诗签」卡**：`source/js/poem-card.js`（inject.bottom 引入）——往公告卡 `.card-announcement` 下面插一张暖阳渐变诗签卡（左上缓转 fa-sun + 实时时钟 HH:MM:SS + 左对齐诗行），文案硬编码在 JS 里，改诗直接改 innerHTML；样式 `.card-poem` 在 light-bg13.css。**设计定位就是全站唯一一张暖色卡**（其他卡白色磨砂），用户明确认可这是"那一小块阳光"而非突兀
- 本机排查坑：Windows 对新子域名有 DNS 负缓存，curl 报 exit 6 不代表没生效，用 `nslookup xxx 1.1.1.1` 或 `curl --resolve 域名:443:<边缘IP>` 绕过缓存验证
- 验证纪律：验站一律 curl（不执行 JS，永不计入浏览量）；看渲染效果用本地 hexo server 截图

## 立体感体系（毛玻璃 + 悬浮 + 入场）

2026-08-28 加的"立体感"套餐，全部克制向，一图流背景不动：

- **首页全屏标题页（已恢复）**：`index_top_img_height: 100vh`（曾误设 400px 导致进首页直接见文章卡）；inject.bottom 里的"1.5s 自动滚到文章区"脚本已删除（那个才是吃掉标题页的元凶），只保留 is-home/not-home class 注入。标题副标题定位是主题默认（43% + 底部下滑箭头）
- **毛玻璃**：`:root --card-bg` 日间 rgba(255,255,255,.64)/夜间 rgba(30,30,42,.55)（毛玻璃要透一些 blur 才有意义）；`.recent-post-item/.card-widget/#article-container` 加 `backdrop-filter: blur(16px) saturate(1.35)` + 1px 白边（夜间 .07）；阴影变量 `--card-box-shadow/--card-hover-box-shadow` 重定义为多层深投影 + `inset 0 1px 0` 顶部高光（玻璃倒角错觉，照片背景上阴影要重才"浮"得起来）。性能：blur 卡片数量多，低端机若卡就把 blur 降或去掉 article-container 的
- **悬浮**：`.recent-post-item:hover { transform: translateY(-8px) }`（主题 cardHover 只有阴影没有位移）
- **滚动入场**：`source/js/scroll-reveal.js`——html.reveal-init 门控（JS 挂了不隐藏内容），IntersectionObserver 首次进视口加 .reveal-in（淡入+上浮 .55s），同帧进入的卡片按批错开 70ms；**播完把 reveal/reveal-in 类全删**（cleanup 监听 transitionend 且 `propertyName === 'opacity'` 过滤）；prefers-reduced-motion 与无 IO 环境自动跳过
- **3D 倾斜已否决**：试过 ±4° 鼠标跟随倾斜（tilt-cards.js），用户觉得"像一张纸"（薄卡片转动暴露纸片感），文件已删、inject 已撤。别再提卡片倾斜类效果



## 日/夜切换体系（theme-bg.css + theme-switch.js）

2026-09-05 上线（借鉴 fomalhaut1998/hexo-theme-Fomalhaut 的思路但方案重新设计），两个文件 + inject 两行：

- **`source/css/theme-bg.css`**：日/夜背景变量层 + 切换动画关键帧。换背景只改文件顶部 `:root` 的变量：`--bg-day`/`--bg-night`（PC）、`--bg-day-mobile`/`--bg-night-mobile`（手机）、`--veil-night`（夜间黑纱浓度，默认沿用 light-bg13 的 0.45）。它必须在 inject 中排在 light-bg13.css/fix-flash.css **之后**（同权重 !important 后者胜出才能覆盖静态 URL）。默认日/夜同图，视觉与旧版完全一致
- **`source/js/theme-switch.js`**：包装 `window.btf.activateDarkMode/activateLightMode`（5.5.4 内联 head 脚本定义的 API），把 `data-theme` 变更包进 `document.startViewTransition()`。**不拦按钮、不改主题文件**，原主题的提示条/localStorage 保存/评论联动全部保留；点击按钮、跨标签页同步（storage 事件）、自动切换三条路径都走动画
- **动画**：新主题从点击按钮的坐标圆形展开（700ms，`--vt-x/--vt-y/--vt-r` 变量传给 clip-path），旧景层后退并按方向变暗（入夜）/提亮（破晓）；系统开启"减少动态效果"、页面隐藏或不支持 View Transitions 时直接切换无副作用
- 换日/夜**不同图**时 JS 会自动预热新图（`preloadBg` 读 CSS 变量里的 url），避免圆形展开后露出空白；若夜景图很大首次切换仍可能未加载完
- 调试技巧：往页面注入 `<style id="vt-slowmo">::view-transition-new(root){animation-duration:3s!important}</style>` 可放慢动画观察

## 右键菜单、控制台彩蛋、404（2026-09-05 第二批魔改）

- **右键菜单**：`source/js/context-menu.js` + `source/css/context-menu.css`（毛玻璃样式与卡片体系一致）。菜单项：回到顶部 / 昼夜切换 / 随便逛逛 ｜ SecLearn 刷题 / 反馈箱。输入框、选中文本、Shift+右键保留浏览器原生菜单。昼夜切换必须与主题按钮行为对齐——调完 `btf.activate*` 还要 `btf.saveToLocal.set('theme', next, 2)` 写回记忆（只调 activate 刷新会丢主题，踩过）。随便逛逛从 `/sitemap.xml` 取全量文章链接随机跳（sessionStorage 缓存），失败回退当前页文章链接
- **控制台彩蛋**：`source/js/console-art.js`，F12 输出月亮 ASCII + 站名 + 交流入口
- **404 页**：`source/404.html`（已加 skip_render，GitHub Pages 自动以它响应未知路由）。独立静态页、主站同风格，主题跟随 localStorage 记忆、无记忆跟系统深浅色。注意 hexo server 本地不给未知路由出 404.html（出的是 Error 页），本地只能直接访问 `/404.html` 验证，完整行为要上线测
- **缓存教训**：新静态资源部署后不要立刻用固定版本号 URL 探测线上——Pages 构建完成前探到的 404 会被 Pages/CF 边缘按完整 URL（含查询串）缓存，之后同一 URL 一直 404（context-menu.css 踩坑，换版本号才恢复）。探测加随机参数或等构建完成后再探

## 反拆解防护（anti-devtools.js）

2026-09-05 加入，定位是「劝退」不是「加密」——内容已在访客浏览器里，客户端防护只能抬高门槛：

- `source/js/anti-devtools.js`（inject.bottom，?v=1）三件事：
  1. **按键拦截**：F12 / Ctrl+Shift+I|J|C / Ctrl+U（capture 阶段 preventDefault）。注意现代浏览器部分快捷键在浏览器层处理，Chrome 的 F12 实际拦不住（安慰剂层），Firefox 的 Ctrl+U 可挡——别对按键拦截的实效有过高预期
  2. **DevTools 打开检测**：debugger 计时法（暂停 >100ms 判定打开），每 2.5s 一查，仅桌面（≥900px）且页面可见时跑。命中后 console.clear() + 月亮 ASCII + 警告 + 页面顶部 toast（2.6s），每次「关→开」只警告一次。`HARD_MODE = true` 可改为直接跳回首页（默认关，误伤真实读者）
  3. **文章图片禁止拖拽另存**（仅 `#article-container img`，侧栏头像不受影响）
- **站长后门**：控制台执行 `localStorage.setItem('jad-off','1')` 刷新后防护完全关闭（自查/调试用）；`window.__iadWarn()` 可手动触发一次警告效果
- **覆盖范围（独立静态页要手动维护）**：inject 只对主题 layout 的页面生效；`/feedback/`、`/quiz/`、404 三个独立静态页（skip_render 原样拷贝）不走 inject，已在各自 `</body>` 前手动内置同一组脚本——FA 7.1.0 CDN + context-menu.css/js + console-art.js + anti-devtools.js（版本号与 _config.butterfly.yml 同步，URL 相同还能共享浏览器缓存）。**新增独立静态页时必须手动带这一块，改版本号时三处 + inject 共四处要一起改**。独立页上 copy-guard/copy-feedback 不适用（依赖主题文章页 DOM），无需加
- 与既有体系的配合：右键菜单(context-menu.js)已挡掉右键检查入口（Shift+右键保留原生，是刻意留的活口）；复制限制在 copy-guard.js（>500 字替换为目录）；控制台彩蛋(console-art.js)与检测警告衔接——打开 DevTools 会先看到彩蛋、2.5s 内被清掉换成警告
- **代码层做不了、要去 Cloudflare Dashboard 手动开的**：Scrape Shield → Hotlink Protection（给 img.jasmine-iris.top 防图床盗链，源站是 GitHub Pages 只能在 CF 层做）；Security → Bots 里的 Bot Fight Mode（robots.txt 只能挡守规矩的爬虫）

## 恶搞标题（tab-title.js）

2026-09-05 加入，`source/js/tab-title.js`（inject.bottom，?v=1）：切走标签页标题变「🌙 你去哪儿了呀……」，切回显示「🌕 欢迎回来！」2 秒后精确还原原页标题（页面加载时捕获原值，快速切换先清定时器防错乱）。

## 文章页扩展（post-extras.js + post-extras.css）

2026-09-05 加入，构建期注入（`scripts/post-extras.js`，after_post_render）。**改此脚本必须 `hexo clean`**，且不要在 `hexo server` 运行时 generate——server 渲染的是自己内存里的版本，不会反映新产物：

- **过时提醒**：判定基准 = front-matter 显式 `updated:`，没写就用创作日期 `date`。**不要用 Hexo 默认的文件 mtime**——文件被脚本重写/格式化一次时钟就归零，提醒永远不触发（踩过）。超过 90 天（`STALE_DAYS`）在正文顶部插琥珀色提醒条，文案用「创作于」（主题 meta 行的「更新于」是 mtime，两者含义不同，刻意区分）。豁免：加密文章（front-matter password 或「随笔」分类——随笔是 hexo-blog-encrypt 分类级加密，密文上不能拼明文块）；front-matter `stale: false` 单独关闭
- **同系列文章**：正文末尾按末级分类列出同类文章（含本文 ≥2 篇才显示），日期升序、当前篇高亮。**发表新文章零维护**——挂对分类重新 generate，所有同分类文章的列表自动更新；front-matter `series: false` 单独关闭

## RSS 订阅（hexo-generator-feed）

2026-09-05 加入：`feed` 配置在 `_config.yml`（atom、limit 20、全文、autodiscovery），入口在页脚 custom_text。加密文章安全性已验证：hexo-blog-encrypt 在 feed 序列化前就把正文替换为密文容器，atom.xml 无明文（用两篇随笔实测）。全站只有 `Hello！` 和 `CCF2026 参赛总结` 两篇加密（随笔分类配置级密码 1313113，不是 front-matter password——grep "password" 会误匹配正文里出现该词的技术文章）。

## 评论区表情包（Waline 自定义 emoji）

2026-09-05 加入，Miku（雪初音）+ 水豚噜噜两套：

- **图源**：噜噜 13 张动图 GIF（github.com/Wanglx02/lulu-stickers 的 stickers-small）；雪初音 40 张 PNG（github.com/hotarugali/Emoji 的 Snow-Miku 分支，含初音和她的兔子搭档 Yukine，官方贴纸本来混排）
- **托管**：`blog-img` 仓库 `emoji/lulu/` 和 `emoji/miku/`（img.jasmine-iris.top 是 GitHub Pages，自带 `access-control-allow-origin: *`，Waline 跨域拉 info.json 没问题）
- **配置**：`_config.butterfly.yml` 的 `waline.option.emoji` 数组（主题模板 `...option` 展开进 Waline.init）
- **⚠️ info.json 必须带 `icon` 和 `prefix` 字段**（Waline client 3.8）：`{"name":"噜噜","prefix":"","type":"gif","icon":"sticker_10","items":[...]}`。icon 是表情面板 tab 的缩略图（缺了显示 `undefined.gif`，踩过）；items 是不带扩展名的文件名，实际图片 = `目录/prefix+item.type`
- 改表情包流程：图丢进 blog-img 对应目录 → 更新 info.json → push → 等 Pages → `npx hexo generate && npx hexo deploy`（emoji 配置在 butterfly 配置里，配置变更需 hexo clean）
- 想加官方包（微博/B站/QQ 等）：往 `option.emoji` 数组追加 `https://unpkg.com/@waline/emojis@1.4.0/xxx` 即可

## 盘古之白与分享按钮（2026-09-05 第三批）

- **pangu 中英文空格**：`source/js/pangu.min.js`（自托管 v4.0.7，jsdelivr 国内不稳）+ `source/js/pangu-init.js`。init 用 TreeWalker 只处理 `#article-container` 的文本节点，**跳过 `pre, code, kbd, samp, var, script, style, .highlight`**（合成节点实测：段落加空格、代码块/行内代码原样不动）。只处理含中英相邻边界的文本，无边界不重排
- **分享按钮**：本来就开着（`share: use: sharejs`；share.js 客户端渲染图标，静态 HTML 里只有容器没有图标，curl 验证时别被迷惑）。仅把 sites 从 facebook,x,wechat,weibo,qq 改为 `wechat,qzone,weibo,qq`

## 文章链接美化（link-polish.js + link-style.css，2026-09-05 第三批）

文章内链接此前是主题默认裸样式（蓝色无下划线、hover 才出下划线、外链无标识、裸 URL 直接杵在正文里）。四件套：

- **裸网址短显示**：link-polish.js 把「文本=网址」的链接显示改为 `域名/首段路径…`（href 不变，完整地址进 title），短于原文才替换
- **外链 ↗ 标识**：JS 给外链加 .lp-ext，CSS 用 currentColor mask 画箭头（日夜自适应）；图片链接不处理
- **下划线动画**：隐形底线 hover 从左向右渐显，作用域 = p/li/td/th/blockquote/标题内的行内文本链接（:not(:has(img)):not(.headerlink)），卡片/图片不受影响
- **外链 nofollow**：hexo-filter-nofollow（_config.yml nofollow 段），exclude 自有域名 jasmine-iris.top/www/jasmineee007.github.io；实测外链 rel="noopener external nofollow noreferrer"，站内链接不受影响

## 评论通知（waline-worker 代码改动）

2026-09-05 给 waline-worker（第三方 CF Worker 版 Waline，D1 存储）加了评论通知，上游项目没有此能力：

- **代码**：`src/utils/notify.ts`（新）+ `src/env.ts`（NOTIFY_* 字段）+ `src/router/comment.ts`（POST 成功后 `executionCtx.waitUntil(sendCommentNotify(...))`，不阻塞评论响应）。渠道：pushplus(微信推送，需实名认证)/serverchan(Server酱，免实名，免费版5条/天)/telegram/webhook，`NOTIFY_TYPE` 门控，未配置 = 完全关闭零行为变化
- **⚠️ waline-worker 的 git remote 是上游 wuyilingwei/Waline_On_Worker，无推送权限**——改动只提交在本地。**部署走本地文件**：`cd waline-worker && npx wrangler deploy`（wrangler.toml 在 .gitignore 里，notify 配置脚手架已同步进 wrangler.toml.example）
- **现状（2026-09-05）**：用户决定暂不启用，NOTIFY 变量已注释、代码保留为惰性。pushplus 需实名认证（code 905，verify.pushplus.plus）是当时放弃的原因；以后想开：免实名选 serverchan（sct.ftqq.com 微信登录拿 SendKey），填 NOTIFY_TYPE="serverchan"/NOTIFY_TOKEN 后 `npx wrangler deploy` 即可。站长自己（登录态）的评论默认不推送（NOTIFY_SKIP_ADMIN）

## SecLearn 面试题集成（2026-09-05）

- **源文档**：E:\网络安全面试题 下 9 份 docx 已整合为单文件《网络安全面试题整合版.md》（115 题，按来源分八节），原始 docx 已按用户要求删除。经人工全量审查 + 定点修复：题答粘连拆分、应急排查子步骤合并、TCP/UDP 与 cookie 条目重写、答案断句重排（句末标点才换行）、『─』字符与「x。用 SSH」碎片清理、SSH/TCP/cookie 重复条目去重
- **集成方式**：面试题以**简答背诵题型（t:"b"）**融入现有题库体系（不是独立模式）——新分类 CATS.iv「网络安全面试题 🎤」121 题，首页分类卡直接进入；练习时「回忆→看参考答案→自评 记住了/没记住」，没记住自动进错题本和复习排期，与选择题共用 stats/wrong/review 全套机制
- **代码改动点**（quiz/index.html）：isCorrect 支持 b（ans==="ok"）、typeBadge、verdict 文案、rQuestion 的 bHtml（看答案/自评按钮）、gradeB()、nav/jump 重置 bRev、考试快速配卷排除 b、redoWrong 改用 isCorrect
- **全选按钮是切换式**（2026-09-05 修）：allCats() 全选/全不选交替，按钮文案随状态变（✅ 全选 ⇄ ❌ 全不选）；cfg.cats 清空后 startSession 会提示"请至少选择一个分类"
- **⚠️ 坑：改 quiz/**（skip_render）后必须 `hexo clean && hexo generate && hexo deploy`**——generate 的缓存不感知 skip_render 文件变化，不 clean 的话 public 里永远是旧文件（踩过：部署"成功"三次线上还是旧的）
- **⚠️ 题库 JSON 里 q/e 是转义后文本**（&lt; 等），生成时用 esc() 处理；答案重排规则在解析脚本里：句末标点才换行、断句拼回、≤14 字短行视为列表项

## 当前状态

- 主题: Butterfly 5.5.4
- 评论: Waline (waline.jasmine-iris.top)
- 部署: git deployer → GitHub Pages
- 文章数: 26 篇
- 统计: Umami 全托管（访问分析看板 + 侧栏本站访客数/访问量，经 umami-proxy Worker 反代，详见「浏览量」节）、Waline 评论系统、wordcount 字数、busuanzi 与 waline.pageview 已关
- SEO: robots.txt（屏蔽分类/标签/归档/AI爬虫）+ hexo-generator-sitemap 生成 sitemap.xml + RSS 订阅（atom.xml，hexo-generator-feed，详见「RSS 订阅」节）
- 文章页扩展: 过时提醒 + 同系列文章导航（2026-09-05，详见「文章页扩展」节）
- 视觉: 全站一图流 + 毛玻璃立体感体系（2026-08-28，详见「立体感体系」节）、日/夜切换动画与背景变量层（2026-09-05，详见「日/夜切换体系」节）、右键菜单 + 控制台彩蛋 + 404 页（2026-09-05 第二批）、反拆解防护（2026-09-05，详见「反拆解防护」节）、恶搞标题（2026-09-05，详见「恶搞标题」节）、评论区表情包（2026-09-05，详见「评论区表情包」节）、侧栏诗签卡、实时运行计时
