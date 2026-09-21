# 博客现状审计报告（xilingblog）

- **审计对象**：仓库 `D:\xilingblog`（Astro 5.17.1 + Tailwind v4 + Pagefind 1.5.2）与线上站点 <https://xiling951.github.io/xilingblog/>
- **代码快照**：`fc114ae`（`git log`：fc114ae / c337e47 / c17d425 / 96860c5 / cbe42e2 …），工作区干净（`git status` 无输出）
- **线上快照**：GitHub Pages 部署自 `fc114ae`（Actions run 列表最新几次均 success；`dist/pagefind/pagefind-entry.json` 的 hash 为 `zh-cn_2b5516ca574e1`）
- **审计方式（只读）**：源码逐文件阅读；`curl` 抓线上 HTML 与响应头；**无头 Chrome + CDP 实测**（真实浏览器里驱动交互、读 `Network` 404、读计算样式与 iframe 状态），并关闭浏览器缓存（`Network.setCacheDisabled`）以避免读到旧构建
- **结论**：**blocker 1 个、high 2 个、medium 8 个、low 13 个（共 24 条）**；其中 blocker 是「线上搜索完全不可用」，两个 high 是「头像破图」「站点 logo 跳离站点」

> 本轮已由船长修掉、**不再重复报告**的项（均已上线并可复验）：RSS 双层 base、文章页字面 `` `n`n `` 残留、canonical/OG/Twitter/JSON-LD/RSS 自动发现/theme-color/sitemap/robots/自定义 404/og.png、搜索弹窗 innerHTML→DOM 与焦点管理、图片 width/height、prefers-reduced-motion 与 :focus-visible、文章链接双层 base（`withoutBase()`）、CI 字数统计改 `?raw`、pageSize→10 + `/archive/` 时间线 + 相关文章 + 移动端折叠目录。

---

## 一、线上实测总览（fc114ae）

| 路由 / 资源 | 状态 | 说明 |
| --- | --- | --- |
| `/`、`/blog/`、`/categories/`、`/tags/`、`/about/`、`/archive/` | 200 | 首页文章卡片 5 张，链接全部 200（`/xilingblog/posts/xxx`） |
| `/posts/python-notes/`、`post-1..3`、`html-notes` | 200 | 字数已恢复（正文页显示 `376 字 · 约 1 分钟`） |
| `/categories/学习笔记/`、`/categories/Astro%20学习/`、`/tags/学习笔记/`、`/tags/learning%20in%20public/` | 200 | 中文/空格路径可用（utf-8 百分号编码） |
| `/blog/2/`、`/blog/10/` | 404 | pageSize=10 后只有 1 页，属预期；分页组件此时不渲染 |
| `/rss.xml` | 200 | item 链接单层 base、channel link 带 base；**但未按日期排序**（见 F9） |
| `/sitemap-index.xml`、`/sitemap-0.xml`、`/robots.txt`、`/og.png`、`/404.html` | 200 | robots 指向 `…/xilingblog/sitemap-index.xml`，正确 |
| `/this-does-not-exist/` | 404 + 自定义页 | 标题「页面走丢了 \| 西岭的博客」 |
| `/xilingblog/pagefind/pagefind.js`、`pagefind-entry.json`、`…pf_fragment`、`wasm.unknown.pagefind` | 200 | 搜索索引产物本身齐全（`page_count: 5`） |
| **站内搜索（弹窗实输）** | **失效** | 见 F1：输入关键词后提示「搜索索引还没生成…」，0 条结果，`Network` 里没有任何 pagefind 请求 |
| 头像图片 | **404** | `<img src="/favicon.svg">` → 实际请求 `https://xiling951.github.io/favicon.svg`（域名根），`naturalWidth = 0` |
| 站点 logo | **跳错站** | `<a href="/">` → `https://xiling951.github.io/`（非本站） |

---

## 二、问题清单

### 1) 路由与页面

**F10 [medium] 文章页有两个内容完全相同的 `<h1>`**
- 证据：线上 `https://xiling951.github.io/xilingblog/posts/python-notes/` 实测 `document.querySelectorAll('h1')` → `["Python 学习笔记", "Python 学习笔记"]`，两个都可见。来源：`src/layouts/BaseLayout.astro:135-136`（banner 大标题 `<h1>…{bannerTitle ?? pageTitle ?? siteConfig.title}…</h1>`；两者都可见，因为 banner 的 `hidden md:flex` 在 ≥768px 生效）与 `src/layouts/MarkdownPostLayout.astro:33`（正文 `<h1>{frontmatter.title}</h1>`）。
- 影响：SEO 的 H1 语义重复；朗读软件会把同一标题念两遍。
- 修复建议：`MarkdownPostLayout` 传 `bannerTitle` 时改用 `<h2>`/`<div>` 渲染 banner 标题（或在 BaseLayout 增加 `bannerAsHeading={false}` 开关，仅文章页生效）。

**F19 [low] 分页「上一页/下一页」禁用态仍是可聚焦链接**
- 证据：`src/components/Pagination.astro:30-36`（`class:list={['page-link', currentPage === 1 && 'disabled']}` 仍是 `<a href>`）、`:50-56`（同理）；`.page-link.disabled` 只做了 `opacity:.4; pointer-events:none`（`src/styles/main.css:410`）。该组件自 `cbe42e2` 未改动（`git diff --stat cbe42e2..HEAD -- src/components/Pagination.astro` 为空）。
- 影响：屏幕阅读器与键盘用户仍会把「下一页」当成可点链接（当前 pageSize=10 只有 1 页，组件不渲染，属潜伏问题；改为 1 页/多页切换的临界点会出现）。
- 修复建议：禁用态输出 `<span aria-disabled="true">`（或在 `<a>` 上加 `aria-disabled="true" tabindex="-1"`）。

**F9 [medium] RSS 条目没有按日期排序，阅读器里顺序错乱**
- 证据：线上 `https://xiling951.github.io/xilingblog/rss.xml` 的 item 顺序 = `HTML 学习笔记(03-02)` → `我的第一篇博客文章(01-29)` → `我的第二篇博客文章(02-04)` → `我的第三篇博客文章(03-02)` → `Python 学习笔记(03-02)`，既不是倒序也不是正序（是 `import.meta.glob` 的目录顺序）。源码：`src/pages/rss.xml.js:15`（`items: await pagesGlobToRssItems(import.meta.glob('./**/*.md'))`，直接透传，没有排序）；对比站内 `src/utils/posts.ts` 的文章列表是按 `pubDate` 倒序的。
- 影响：订阅者（RSS 阅读器/聚合站）看到的「最新」条目是 1 月的旧文，读者会以为站点很久没更新，也会影响文章的传播顺序。
- 修复建议：`rss.xml.js` 里先 `import { posts } from '../utils/posts'`，或对 glob 结果按 frontmatter `pubDate` 倒序：`items: (await pagesGlobToRssItems(...)).sort((a, b) => +new Date(b.pubDate) - +new Date(a.pubDate))`。其余 RSS 项已核验正确：item 链接单层 base（`…/xilingblog/posts/xxx/`）、`channel <link>` 带 base、`guid isPermaLink="true"`、`<language>zh-cn</language>`、`description` 与 `pubDate` 齐全。

**F20 [low] canonical 与站内链接的斜杠风格不一致**
- 证据：线上首页 `<link rel="canonical" href="https://xiling951.github.io/xilingblog">`（无尾斜杠），而 `sitemap-0.xml` 与站内链接都是 `https://xiling951.github.io/xilingblog/`（带尾斜杠）；`src/layouts/BaseLayout.astro:34` 用 `new URL(Astro.url.pathname, Astro.site)` 生成。
- 影响：同一页面对外暴露两种 URL 形式，弱化 canonical 的聚合效果。
- 修复建议：`canonicalURL` 统一补尾斜杠（`pathname` 已是 `/xilingblog/` 时保持一致），或统一改成无尾斜杠并给 sitemap 配置同一风格。

**F21 [low] 没有「跳到主内容」链接**
- 证据：`grep -r "skip" src/**/*.astro` 无结果；CDP 探测 `a[href="#main"], a.skip-link` → `false`（`<main>` 地标存在）。
- 影响：键盘用户每页都要 Tab 过 6 个导航项＋2 个图标按钮才能到正文。
- 修复建议：`BaseLayout.astro` 的 `<body>` 首个子元素加 `<a class="sr-only focus:not-sr-only" href="#main">跳到主内容</a>`，并给 `<main>` 加 `id="main"`。

### 2) 搜索（Pagefind）

**F1 [blocker] 线上站内搜索完全不可用：构建产物里 `__VITE_PRELOAD__` 未被替换，运行时抛 `ReferenceError`**
- 证据（线上实测，关闭缓存）：
  - `Network`：页面加载后**没有任何** `pagefind/pagefind.js` 请求（`Network.requestWillBeSent` 过滤 `pagefind` 为空）；
  - 交互：`点击 .search-open → 输入 python → 等待 3s`，`#search-status` 文本 = `搜索索引还没生成：本地请先 npm run build 再 npm run preview；线上会自动带上索引。`，`#search-results` 0 条（该文案来自 `src/components/Search.astro:166` 的 catch 分支）；
  - 运行时：`typeof __VITE_PRELOAD__` → `"undefined"`，直接求值 → `ReferenceError: __VITE_PRELOAD__ is not defined`；
  - 线上 HTML 内联脚本（`https://xiling951.github.io/xilingblog/`）实际产物：
    ```js
    const S="modulepreload",P=function(e){return"/xilingblog/"+e},…,
    x="/xilingblog".replace(/\/?$/,"/");
    … E=T(()=>import(`${x}pagefind/pagefind.js`),__VITE_PRELOAD__) …
    ```
    `x` 求值为 `/xilingblog/`（路径本身是对的），但第二个参数 `__VITE_PRELOAD__` 是**未替换的裸标识符** → 调用 `T(...)` 时同步抛 `ReferenceError`，`getPagefind()` 的 promise 变成 rejected，被 catch 吞掉（控制台无报错）。
  - 对照实验（同一页面）：
    - 直接 `await import('/xilingblog/pagefind/pagefind.js')` → `ok:true`，`search('python')` 命中 2 条，首条 `url = /xilingblog/posts/python-notes/`；
    - `new Function('u','return import(u)')('/xilingblog/pagefind/pagefind.js')` → `ok:true`，`search('汉字比大小')` 命中 1 条。
    即：**索引文件与 baseUrl 都对，唯一坏点是 Vite 的预加载包装标记没被替换。**
- 代码位置：`src/components/Search.astro:40`（`const base = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/')`）与 `:51`（`import(/* @vite-ignore */ `${base}pagefind/pagefind.js`)`）。`/* @vite-ignore */` 挡不住 Vite 用 `__vitePreload` 包装「动态说明符的 import」，而 Astro 把这类脚本内联进 HTML 后，Vite 的 `__VITE_PRELOAD__` 替换不会作用到内联副本（这是 Astro 已知缺陷，见 <https://github.com/withastro/astro/issues/17265>：*Lone external dynamic imports in `<script>` tags cause ReferenceError: __VITE_PRELOAD__ is not defined*）。
- 影响：核心功能（搜索）100% 失效；访客看到的是给开发者看的构建提示；`src/components/Search.astro:6-32` 的弹窗、焦点陷阱、快捷键全部白做。
- 修复建议（按推荐顺序）：
  1. 绕开 Vite 的预加载包装（已在线上验证可行）：
     ```js
     // src/components/Search.astro
     const base = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');
     const importModule = (url: string) => new Function('u', 'return import(u)')(url) as Promise<any>;
     const mod = await importModule(`${base}pagefind/pagefind.js`);
     ```
  2. 顺带在自检里加护栏（`scripts/check-build.mjs` 目前 91 行，检查了产物齐全/双层 base/字面 `` `n`n ``/站内链接/字数，但**没有**拦这类问题）：
     ```js
     if (html.includes('__VITE_PRELOAD__')) problems.push(`未替换的 __VITE_PRELOAD__: ${where}`);
     ```
     更彻底的做法：CI 里对 `dist` 起静态服务并用无头浏览器跑一次「搜索能出结果」的 smoke test。
  3. 另一条可选路线：把搜索逻辑放进独立模块（`src/scripts/search.js`）由 `<script>` 静态 import，使其作为普通 chunk 产出（避免被内联），但需实测确认标记已被替换。

**F18 [low] 搜索索引只覆盖 5 篇文章，站内页面搜不到**
- 证据：线上 `pagefind/pagefind-entry.json` → `"page_count": 5`（正好等于 `src/pages/posts/*.md` 的 5 篇）；`data-pagefind-body` 仅出现在 `src/layouts/MarkdownPostLayout.astro:31`（`<article … data-pagefind-body>`），首页/关于/分类/标签页都没有这个属性。
- 影响：搜「关于我」「分类」「归档」这类站内导航词永远 0 结果；用户会以为站点很小。同时站点侧栏（标签云/统计）被排除反而合理，属有意为之，但建议显式化。
- 修复建议：把 `data-pagefind-body` 改为「排除法」：给 `BaseLayout` 的 `<main>` 加 `data-pagefind-body`，再给页脚/侧栏/导航加 `data-pagefind-ignore`；或明确保留「只索引文章」并把这个取舍写进 README。

### 3) 评论（giscus）

**F4 [medium] 暗色模式下评论区仍是亮色（giscus 主题不跟随初始主题）**
- 证据：线上实测（先 `localStorage.theme='dark'` 后重载，`html` class = `dark wallpaper`）→ `iframe.giscus-frame` 的 `src` 含 `theme=light`：
  `https://giscus.app/zh-CN/widget?origin=…&theme=light&reactionsEnabled=1&…&repoId=R_kgDORIR23w&category=Announcements&categoryId=DIC_kwDORIR2384DGFMc…`
  代码：`src/components/Comments.astro:32` 硬编码 `data-theme="light"`；`:43-60` 的同步逻辑只在「`html` 的 class 属性发生变化」时 `postMessage`，而预涂主题脚本（`src/layouts/BaseLayout.astro:86-102`）在 `MutationObserver` 注册**之前**就已经加好 `dark` class，页面 `load` 时 iframe 内的监听器通常还没就绪，消息会被丢弃。
- 影响：暗色模式/壁纸模式下，评论区白底闪现在深色页面里，观感割裂；只有用户手动点一次主题切换才会同步。
- 修复建议：不要写死 `data-theme`。改为在客户端注入：
  ```js
  const frame = document.querySelector('.giscus');       // 或自建容器
  frame.dataset.theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  ```
  按计算后的主题动态创建 `<script src="https://giscus.app/client.js" …>`；同时保留现有 `MutationObserver`，并补一次 `iframe.addEventListener('load', syncGiscusTheme)`（对 `iframe` 元素本身监听 load 比监听 `window` 更可靠）。可选：把主题名换成 giscus 的 `preferred_color_scheme`。
- 补充结论（同一项核验）：**评论系统配置本身是好的**——`repo = xiling951/xilingblog`、`repoId = R_kgDORIR23w`、`category = Announcements`、`categoryId = DIC_kwDORIR2384DGFMc` 与仓库匹配（GitHub API：`has_discussions = true`），线上 widget 实际渲染出「0 个表情 / 0 条评论 / 使用 GitHub 登录 / 输入预览」而**没有**出现「giscus app is not installed」提示，说明 App 已安装，不存在「未安装 App」风险。

### 4) 交互与响应式

**F5 [medium] 移动端抽屉：点遮罩不关闭，且页面滚动被锁死**
- 证据：线上实测（390×844）——点 `.menu-button` 后 `#mobile-drawer.hidden=false`、`body.style.overflow='hidden'`；再点 `.drawer-backdrop` 后仍是 `hidden=false, overflow='hidden'`（未关闭）；按 `Escape` 才关闭（`closedByEscape=true`）。
- 代码：`src/layouts/BaseLayout.astro:177` 有 `<button class="drawer-backdrop" aria-label="关闭菜单">`，但唯一的抽屉脚本 `src/scripts/menu.js`（23 行，全文）只绑定了「菜单按钮切换」「抽屉内链接点击」「Esc」三件事，**没有给遮罩绑 click**。
- 影响：手机上唯一的「直觉关闭方式」（点空白处）无效；抽屉打开期间正文无法滚动，用户会觉得页面卡住。另外抽屉本身没有 `role="dialog"`/`aria-modal`，也没有焦点陷阱（搜索弹窗已有，抽屉没有），键盘/读屏用户体验不一致。
- 修复建议：在 `src/scripts/menu.js` 里补
  ```js
  drawer?.querySelector('.drawer-backdrop')?.addEventListener('click', () => setDrawer(false));
  ```
  并给 `#mobile-drawer` 加 `role="dialog" aria-modal="true"`，打开时把焦点移入第一个链接、关闭时归还给 `.menu-button`（可复用搜索弹窗的做法）。

**F15 [low] 视口 <1280px 时右侧栏（统计/日历/分类）与桌面目录整体消失**
- 证据：CDP 逐档切换宽度实测：`innerWidth=1280 → columns "280px 648px 280px"、rightSidebar=true、toc=true`；`1279 → columns "280px 943px"、rightSidebar=false、toc=false`；`1024 → 同样 false`。原因：`src/styles/main.css:95` 把 Tailwind 的 `lg` 覆盖成 `1280px`（`:94-96` 同批覆盖了 `md/lg/xl`），而三栏栅格用的是 `lg:grid-cols-[…]`（`src/layouts/BaseLayout.astro:147`）。
- 影响：1280×800 笔记本（浏览器可视宽常因滚动条只剩 ~1265px）、1024×768、以及任何半屏分屏窗口都看不到目录/统计/日历；移动端折叠目录（`src/layouts/MarkdownPostLayout.astro:90`，`lg:hidden`）此时也不显示（它只在 <lg 时显示，但右侧栏也是 <lg 才隐藏 → 实际 1280 上下刚好互补，1024–1279 之间目录由 `<details>` 兜住，但侧栏统计/分类/日历彻底没有入口）。
- 修复建议：把 `--breakpoint-lg` 调回 1024（或三栏断点单独用一个自定义 variant，如 `@media (min-width: 1180px)`），并确认 1024–1279 时右栏内容是否需要降级到页脚/移动目录里。

### 5) 资源与健壮性

**F2 [high] 侧边栏头像线上是破图（`/favicon.svg` 少了 base）**
- 证据：线上任意页面 `<img src="/favicon.svg" alt="西岭" width="96" height="96" class="h-full w-full object-contain">`；浏览器实际请求 `https://xiling951.github.io/favicon.svg` → **404**，`naturalWidth = 0`（`Network` 里每次加载都出现该 404，首页共 6 次）。
  源码：`src/config.ts:50`（`avatar: '/favicon.svg'`）+ `src/components/Sidebar.astro:12`（`<img src={siteConfig.profile.avatar} …>`，未走 `withBase()`）。注意同一页面的 favicon `<link>` 是对的（`href="/xilingblog/favicon.svg"`，200）。
- 影响：桌面端左栏个人卡、移动端抽屉里的头像都是破图（显示 alt「西岭」），是首屏最显眼的视觉缺陷之一。该 404 在**每次**页面加载都会出现（一次无头浏览器会话累计 6 次）。
- 修复建议：`Sidebar.astro:12` 改为 `src={withBase(siteConfig.profile.avatar)}`（`withBase` 对 `https://`/`mailto:` 原样返回，所以 profile.avatar 继续支持外链）；或把 config 里的 avatar 写成相对 base 的路径并在组件统一 `withBase`。

**F3 [high] 顶部站点 logo 链接 `href="/"` 把用户带离站点**
- 证据：线上每页导航首项 `<a href="/" class="flex shrink-0 items-center gap-2 rounded-lg px-1 py-1">`（站点名「西岭的博客」+ 图标）；`https://xiling951.github.io/` 不是本站（该 URL 返回 404）。源码：`src/components/Navbar.astro:17`，该文件自 `cbe42e2` 起未改动（其他导航项都用 `withBase(item.url)`，`:27`）。
- 影响：点击站点标题就跳出博客，访客与爬虫都会撞 404；是「首页」之外最容易被点的导航元素。
- 修复建议：`Navbar.astro:17` 改为 `href={withBase('/')}`。

**F16 [low] 文章正文配图没有 `width/height`（CLS）**
- 证据：线上 `https://xiling951.github.io/xilingblog/posts/post-1/` → `<figure class="mt-6"> <img src="https://docs.astro.build/assets/rose.webp" alt="…" class="w-full rounded-xl" loading="lazy"> </figure>`（无尺寸属性）；源码 `src/layouts/MarkdownPostLayout.astro:117-121`。PostCard 的缩略图已补 `width/height`（`src/components/PostCard.astro:66-68`）。
- 影响：正文配图加载时造成布局位移。
- 修复建议：给该 `<img>` 补 `width="1280" height="721"`（这三张 docs.astro.build 图都是 1281×721）或统一用 `aspect-ratio` 容器。

**F22 [low] `@expressive-code/plugin-line-numbers` 放在 devDependencies，但它参与生产构建**
- 证据：`package.json:25`（devDependencies）+ `astro.config.mjs:6,27`（构建期 `import { pluginLineNumbers }`）；CI 用 `npm ci`（默认装 dev）所以暂时不炸。
- 影响：任何 `npm ci --omit=dev` / 生产裁剪安装都会直接构建失败。
- 修复建议：移到 `dependencies`（与 `astro-expressive-code` 同级）。

**已核验正常**：`docs.astro.build` 三张示例图当前可达（`rose.webp` 211KB/1.8s、`arc.webp` 194KB/4.7s、`rays.webp` 186KB/1.2s，均为 1281×721，无本地副本）；字体用系统字体栈（`src/styles/main.css:78-80`），无外部字体请求；图标由 `astro-icon` 内联成 SVG `<symbol>`，无运行时 CDN 依赖；`npm ci + npm run build` 可复现（Actions 最近几次 run 均 success，且新增了 `npm run check:build` 前置自检）。

### 6) SEO / 元信息 / 可访问性

**F6 [medium] 主色被当正文色用，对比度不达 WCAG AA**
- 证据：`src/styles/main.css:20` `--primary: oklch(0.70 0.14 var(--hue))`，被当作文字色用在 `src/components/Sidebar.astro:38`（以及 `:58`）、`src/components/RightSidebar.astro:51`（以及 `:70`、`:94`）的 `class="widget-title text-primary"` 等小标题/强调处。按 oklch→sRGB 标准换算（同一套 token，`themeHue=240`）得到：
  - 亮色 `--primary`(#37a8ec) on 卡片白 → **2.63:1**；on 页面底色(`--page-bg` #e9f0f5) → **2.29:1**（AA 正文需 4.5:1，大字号需 3:1）
  - 对照：亮色正文 `--plain-text` → 8.39:1 ✔；`--content-meta` → 5.25:1 ✔；`--primary-deep`(#0079b5) → 4.77:1 ✔；暗色下 `--primary` → 7.67:1 ✔
- 影响：亮色模式下侧栏小标题、统计/日历标题等低视力用户难以辨认；也是移动端白天场景最常被吐槽的观感问题。
- 修复建议：文字场景改用 `--primary-deep`（已达标 4.77:1），或在 `main.css:20` 把亮色 `--primary` 的 L 降到 ~0.58；纯装饰（图标、边框）可继续用 `--primary`。

**F12 [low] 文章页 `og:type` 仍是 `website`，缺 `article:*`**
- 证据：线上文章页：`<meta property="og:type" content="website">`（无 `article:published_time`/`article:tag`）；`src/layouts/BaseLayout.astro:78` 写死 `website`。JSON-LD 已正确给了 `BlogPosting`（文章页第二个 JSON-LD，含 `headline/datePublished/keywords`）。
- 影响：分享到部分平台时不会按文章卡片处理，时间/作者信息缺失。
- 修复建议：`BaseLayout` 增加 `ogType` prop，`MarkdownPostLayout` 传 `'article'` 并补 `article:published_time = frontmatter.pubDate`。

**F13 [low] 分类/标签/归档/分页页的 description 全是站点同一句**
- 证据：`src/pages/categories/[category].astro:19-23`、`src/pages/tags/[tag].astro:19`、`src/pages/archive/index.astro`、`src/pages/blog/[...page].astro:16-20` 都未传 `description`，`BaseLayout.astro:26` 的默认值即 `siteConfig.description`（线上这些页面 `<meta name="description" content="西岭的个人博客：课程笔记、学习日记和折腾记录">`）。
- 影响：站内多页 description 重复，搜索引擎易判定为低质重复页。
- 修复建议：分类页传 `分类「X」下的 N 篇文章`、标签页传 `包含标签「X」的 N 篇文章`、归档/分页带上页码或年月范围。

**F14 [low] 标签胶囊（12px 小字）对比度 4.14:1，略低于 4.5:1**
- 证据：`src/styles/main.css:215-229` `.chip` = `color: var(--btn-content)`(#1479b0) on `background: var(--btn-regular-bg)`(#e0f1fe)，按 oklch 换算 **4.14:1**（暗色下为 5.51:1 ✔）。线上会出现在文章头部标签、侧栏标签云、标签页。
- 修复建议：亮色下把 chip 文字用 `--primary-deep`，或把 `--btn-regular-bg` 提亮到 `oklch(0.97 0.02 …)`。

**已核验正常**：`<html lang="zh-cn">`；每页唯一（非文章页）`<h1>`；所有 `<img>` 都有 `alt`（无 alt 缺失、无空 alt）；所有链接/按钮都有可读名称（5 个无 `aria-label` 的按钮是 expressive-code 的「Copy to clipboard」，有 `title`，属第三方组件）；`<main>` 地标存在；`role="status" aria-live="polite"` 已加在搜索状态行；`:focus-visible` 全局外框已加（`main.css:492-494`）；`prefers-reduced-motion` 已处理（`main.css:474-483`）。搜索结果渲染已从 `innerHTML` 改为 DOM 构建，只取文本与 `<mark>`，无注入风险。

### 7) 内容与结构

**F7 [medium] 5 篇文章里 3 篇是 Astro 教程示例，且正文图热链第三方域名**
- 证据：`src/pages/posts/post-1.md:8-10`（`image.url: https://docs.astro.build/assets/rose.webp`）、`post-2.md:7-9`（`arc.webp`）、`post-3.md:7-9`（`rays.webp`）；三篇标题分别是「我的第一/二/三篇博客文章」，正文仍是教程话术（「欢迎来到我学习关于 Astro 的新博客」）；线上首页卡片区这 3 张缩略图直接来自 docs.astro.build（实测 1.2s–4.7s 才下载完 186–212KB）。
- 影响：（a）站点 3/5 的内容是脚手架残留，访客第一印象是「没写完」；（b）示例图无本地副本，docs.astro.build 在国内网络下可能超时/被墙，会导致首屏 3 张缩略图长期空窗，且站外图片不受本站控制（对方改路径即全挂）；（c）标签体系被示例污染：`blogging`、`learning in public`、`setbacks`、`successes`、`community` 只服务这 3 篇（`/tags/` 共 9 个标签）。
- 修复建议：二选一——删除 post-1~3（连带清理对应标签、`Astro 学习` 分类会只剩 0 篇 → 分类也会减少），或改写成真实内容；无论保留与否，都应把示例图下载到 `src/assets/`（用 `astro:assets` 生成优化图）或 `public/images/`，不再热链。

**F8 [medium] `drafts/` 草稿没有工作流：既不在站点里，也不在版本库里**
- 证据：`.gitignore:30-31`（`# 草稿：不参与构建、不进 git` + `drafts/`）；本地存在 `drafts/diary-2026-03-02.md`、`diary-2026-03-03.md`、`diary-2026-03-05.md`；`grep -r "draft" src/**` 无任何命中（没有 `draft: true` 过滤逻辑）；草稿目录不在 `src/` 下，所以 `astro dev` 也看不到。
- 影响：（a）草稿只存在一台机器上，误删/换机即丢失（无任何远端副本）；（b）「发布」只能手工把文件搬进 `src/pages/posts/`，没有草稿预览，也没有已发布/未发布的可查状态。
- 修复建议：改用内容集合 `src/content/posts/*.md` + `draft: true` frontmatter，在 `getStaticPaths`/列表层过滤 `import.meta.env.PROD && draft`；草稿进仓库（这才有版本历史与备份）；或退一步：保留 `drafts/` 但写进 README 的发布流程（`mv` + 改日期），并把它排除在 build 里的方式说明白。

**F17 [low] 统计数字口径说明缺失，`运行天数` 起点是未来/人工日期**
- 证据：`src/config.ts:81` `startDate: '2026-01-29'`，`src/components/RightSidebar.astro:20-25` 用 `Date.now()` 直接算天数；线上实测（今天 2026-09-21）显示「运行天数 235」「最近更新 6 个月前」（对应最新文章 `pubDate: 2026-03-02`）、「总字数 743」（字数修正后已真实）。
- 影响：数据本身对得上，但 `startDate` 与仓库首个 commit 日期不同（commit 时间戳是 2026-09-21），如果这不是有意的「站点纪念日」，统计口径会误导。
- 修复建议：在 `config.ts:81` 注释里写清口径（站点纪念日 or 首次发布日），或改成从最早文章 `pubDate` 推导。

### 8) 代码质量

**F11 [medium] CI 没有类型检查，也没有针对运行时的预检（本轮两次「构建成功但线上坏」正是靠人肉发现）**
- 证据：`package.json:5-12` scripts 仅 `dev / build / preview / check:build / astro`，**无 `astro check`**；`tsconfig.json` 用 `astro/tsconfigs/strict`；`src/pages/blog/[...page].astro:9`、`src/pages/categories/[category].astro:8`、`src/pages/tags/[tag].astro:8`、`:15`（`const { tag } = Astro.params`）都是隐式 `any`，`astro check` 会报出来但没人跑。`scripts/check-build.mjs` 只覆盖产物/链接/双层 base/字数，不含 `__VITE_PRELOAD__`（见 F1）。
- 影响：类型错误、以及「HTML 里出现未替换标记 / 索引文件缺失」这类只有浏览器才知道的问题，都不会在 CI 被拦住（搜索 blocker 就是这样上线的）。
- 修复建议：`npm i -D @astrojs/check typescript && npx astro check`，在 `.github/workflows/deploy.yml` 的 build 前插入一步；`scripts/check-build.mjs` 增加 `__VITE_PRELOAD__` 断言与「`pagefind/pagefind-entry.json` 存在且 `page_count > 0`」断言。

**F17b [low] 死代码 / 重复代码 / 多余产物**
- 证据（`src/styles/main.css`，行号为当前文件）：
  - `.btn-primary`（`:173-181`）、`.float-panel`（`:158-163`）、`.comments-wrap`（`:469`）全仓库无使用处（`grep` 只命中 CSS 自身）；
  - `--radius-large` 同时定义在 `:root`（`:14`）和 `@theme inline`（`:93`）；
  - `src/icons/.gitkeep`（2 字节）——`astro-icon` 并未配置本地图标目录（`grep -r "icons/" src astro.config.mjs` 无结果），目录是脚手架残留；
  - `src/scripts/theme.js`（12 行）与 `src/layouts/BaseLayout.astro:86-102` 的内联预涂脚本逻辑重复（一份用 localStorage、一份用 class），改主题逻辑时要同时改两处；
  - `src/pages/about.astro:8-13` 把「南京 / 东南大学 / 爱好」硬编码在页面里，与 `src/config.ts` 的 `profile` 部分重复；
  - `src/components/Pagination.astro:9` 的 `basePath` prop 从未被覆盖（唯一的调用点 `blog/[...page].astro` 不传），属预留但无用的抽象。
- 影响：改主题/改配置时容易漏改；审阅时需要分辨哪些是活的。
- 修复建议：删掉未使用的 CSS/目录，`theme.js` 合并进内联脚本或反之，about 页身份信息挪进 `siteConfig`。

**F18b [low] 首页条数与归档每页条数分散在两处**
- 证据：`src/config.ts:35` `postsPerPage: 10`，`src/pages/blog/[...page].astro:11` 使用它；首页 `src/pages/index.astro:8` 固定 `posts.slice(0, 6)`。当前 5 篇文章 < 10 → 分页永不渲染（`/blog/2/` 404）。
- 影响：不是 bug，但「首页 6 篇」与「归档每页 10 篇」两个数字分散在两处，内容变多后归档会是一页 10 条的长页（而 Mizuki 风格一般 6–8）。建议同时收敛到 `siteConfig`，并在评论里说明取舍。

---

## 三、最该先修的 5 件事

| # | 优先级 | 事项 | Blocking |
| --- | --- | --- | --- |
| 1 | **blocker** | **修线上搜索：`Search.astro` 的动态 import 被 Vite 包成 `__vitePreload(..., __VITE_PRELOAD__)`，标记未替换 → `ReferenceError`，搜索 100% 失效。** 用 `new Function('u','return import(u)')` 绕开（已验证可行），并在 `scripts/check-build.mjs` 加 `__VITE_PRELOAD__` 断言 + `page_count>0` 断言 | **是（Blocking）** |
| 2 | high | 修侧边栏头像破图：`Sidebar.astro:12` 的 `src={siteConfig.profile.avatar}` 补 `withBase()`（线上请求 `https://xiling951.github.io/favicon.svg` → 404，全站每页一个破图） | 否（但属必崩的显性缺陷） |
| 3 | high | 修站点 logo 跳站：`Navbar.astro:17` 的 `href="/"` 改 `withBase('/')`（点击站点名跳到 `https://xiling951.github.io/` 404） | 否 |
| 4 | medium | 评论与移动端观感：giscus 初始主题跟随暗色（`Comments.astro:32` 去掉写死的 `data-theme="light"`，按 `html.dark` 动态注入 + `iframe` load 后再同步一次）；移动端抽屉遮罩点击关闭（`src/scripts/menu.js` 补 backdrop click） | 否 |
| 5 | medium | 内容与可访问性收口：清理 Astro 教程示例文章 post-1~3 或改写，并把 `docs.astro.build` 热链图**下载进仓库**（国内可达性 + 版权/稳定性）；同时把亮色 `--primary` 文本场景换成 `--primary-deep`（2.63:1 → 4.77:1），`drafts/` 改内容集合 + `draft: true` 工作流 | 否 |

> 复现要点（供修复后回归）：无头 Chrome（`--headless=new --remote-debugging-port=9222`）打开线上页 → ① 点 `.search-open`、给 `#search-input` 输入 `python` 并派发 `input` 事件，2–3s 后读 `#search-status`（应为「找到 N 条结果」，`#search-results` 有链接）；② 读 `document.querySelector('img[alt="西岭"]').naturalWidth`（应 >0）；③ 读 `document.querySelector('.navbar-blur a').getAttribute('href')`（应为 `/xilingblog/`）；④ `localStorage.theme='dark'` 重载后读 `iframe.giscus-frame` 的 `theme=` 参数（应为 `dark`）；⑤ 390px 宽点 `.menu-button` 再点 `.drawer-backdrop`，抽屉应关闭且 `body.style.overflow` 清空。
