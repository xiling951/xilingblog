# 线上修复效果独立验证报告（91541c9）

- **被验证版本**：`91541c9`「fix: 审计报告修复（搜索失效 blocker / 头像与 logo 缺 base / a11y / SEO / 本地封面）」
- **线上部署**：GitHub Actions run #6，`head_sha = 91541c90edb161bfb0b8868e9c4fcf31903d47a3`，`conclusion = success`（created 2026-09-21T11:27:35Z，updated 11:28:20Z）→ 线上即该提交
- **验证方式**：无头 Chrome（`--headless=new --remote-debugging-port=9222`）+ CDP 驱动真实交互，`Network.setCacheDisabled: true` 且 `Network.clearBrowserCache`（排除旧构建/缓存干扰）；同时采集 `Runtime.consoleAPICalled` / `Runtime.exceptionThrown` / `Log.entryAdded`；HTTP 层用 `curl` 复核；本地跑 `npm run check:build`
- **验证性质**：只读（未修改源码、未做任何 git 写操作；仅新增本报告）
- **结论**：**6/6 项验收 PASS**（原 blocker 搜索已真正可用）；另有 1 项「部分修复」残留（giscus 主题，medium）与 1 项低危新发现（postMessage origin 警告），详见文末

---

## 一、逐条验证结果

### 1. 搜索（原 blocker）——**PASS**

| 检查点 | 结果 | 证据 |
| --- | --- | --- |
| Ctrl+K 打开弹窗并聚焦输入框 | PASS | CDP `Input.dispatchKeyEvent`（Ctrl+K，modifiers=2）后：`{"open":true,"activeEl":"search-input"}` |
| 输入 `python` 出现结果 ≥1 条 | PASS | `Input.insertText('python')` 后 4s：`{"inputValue":"python","status":"找到 2 条结果","resultCount":2}`；结果 = `/xilingblog/posts/python-notes/`（Python 学习笔记）、`/xilingblog/posts/html-notes/`（HTML 学习笔记） |
| Network 有 `/xilingblog/pagefind/pagefind.js` 且 200 | PASS | `Network.responseReceived`：`{"status":200,"url":"https://xiling951.github.io/xilingblog/pagefind/pagefind.js"}`（并有 `pagefind-worker.js` 请求） |
| 控制台无 ReferenceError（`__VITE_PRELOAD__`） | PASS | `exceptions: []`；console 中无 `ReferenceError`；`hasPreloadReferenceError: false`；线上 HTML 中 `__VITE_PRELOAD__` 出现次数 **0**（`scriptMentionsPlaceholder:false`、`htmlMentionsPlaceholder:false`）；`typeof __VITE_PRELOAD__` = `"undefined"` 且不再被任何脚本引用 |
| 结果可点/可达 | PASS | 结果链接 `fetch` 复核：两条均 `200` |
| Esc 关闭弹窗 | PASS | `escapeCloses: true` |

修复方式已复核（`git show 91541c9 -- src/components/Search.astro`）：`const nativeImport = new Function('url', 'return import(url)'); loading = nativeImport(\`${base}pagefind/pagefind.js\`)` —— 绕开 Vite 的 `__vitePreload` 包装，与审计建议一致。

### 2. 头像（base 修复）——**PASS**

| 检查点 | 结果 | 证据 |
| --- | --- | --- |
| 文章页侧栏头像 src | PASS | `avatarSrc: "/xilingblog/favicon.svg"`，`avatarResolved: "https://xiling951.github.io/xilingblog/favicon.svg"`（首页同样） |
| naturalWidth > 0 | PASS | `avatarNatural: 150`（首页与文章页均 150） |
| HTTP 复核 | PASS | `curl -o NUL -w %{http_code} /xilingblog/favicon.svg` → `200`；对比域名根 `/favicon.svg` → `404`（此前破图 URL） |

线上标签（首页）：`<img src="/xilingblog/favicon.svg" alt="西岭" width="96" height="96" class="h-full w-full object-contain">`

### 3. 站点 logo ——**PASS**

| 检查点 | 结果 | 证据 |
| --- | --- | --- |
| 导航站点名 href | PASS | `logoHref: "/xilingblog/"`、`logoAbsHref: "https://xiling951.github.io/xilingblog/"`、文本「西岭的博客」（此前为 `href="/"`） |
| 站内链接整体可达 | PASS | 首页 23 个站内绝对链接逐一 `fetch`：`broken: []`（0 个 4xx/5xx） |

### 4. RSS ——**PASS**

`curl https://xiling951.github.io/xilingblog/rss.xml`：

- channel `<link>` = `https://xiling951.github.io/xilingblog/`（带 base，正确）
- item 链接双层 base 检查：`double base items: 0`；item 链接形如 `https://xiling951.github.io/xilingblog/posts/python-notes/`
- pubDate 顺序（实测 item 顺序）：

| # | 标题 | pubDate |
| --- | --- | --- |
| 1 | HTML 学习笔记 | Mon, 02 Mar 2026 |
| 2 | 我的第三篇博客文章 | Mon, 02 Mar 2026 |
| 3 | Python 学习笔记 | Mon, 02 Mar 2026 |
| 4 | 我的第二篇博客文章 | Wed, 04 Feb 2026 |
| 5 | 我的第一篇博客文章 | Thu, 29 Jan 2026 |

程序化判定：`pubDate 严格倒序: True`（判定为**非递增**：3 篇同为 2026-03-02，其内部保持 glob 顺序；没有任何升序逆序项）。修复方式：`src/pages/rss.xml.js` 对 `pagesGlobToRssItems(...)` 结果按 `new Date(b.pubDate) - new Date(a.pubDate)` 排序。

### 5. 文章页结构 ——**PASS**

| 检查点 | 结果 | 证据（`https://xiling951.github.io/xilingblog/posts/python-notes/`） |
| --- | --- | --- |
| `<h1>` 数量 = 1 | PASS | CDP `h1Count: 1`、`h1s: ["Python 学习笔记"]`；原始 HTML `<h1>` 出现 1 次 |
| 含 skip-link | PASS | HTML：`<a href="#main" class="skip-link">跳到正文</a>`（`BaseLayout.astro:117`），`<main id="main">`（`:160`）；CSS `.skip-link{position:absolute;left:-9999px}` + `.skip-link:focus{left:1rem}`（`main.css:478-490`）→ 平时屏外、聚焦时可见，符合无障碍惯例 |
| `og:type` = article | PASS | `<meta property="og:type" content="article">`（python-notes 与 post-1 均为此值） |
| 正文配图来自 `/xilingblog/covers/*` 且 200 | PASS | post-1：`<img src="/xilingblog/covers/post-1.png" alt="…" width="1200" height="800" class="w-full rounded-xl" loading="lazy">`，`currentSrc=https://xiling951.github.io/xilingblog/covers/post-1.png`，`naturalWidth=1200`；`curl` 三个封面均 200：`/covers/post-1.png 200 (88885, image/png)`、`post-2.png 200 (78396)`、`post-3.png 200 (118882)`；frontmatter 已改为 `/covers/post-N.png`（post-1.md:9 / post-2.md:7-8 / post-3.md:7-8），原 `docs.astro.build` 热链已消失 |
| canonical | PASS（附带） | `https://xiling951.github.io/xilingblog/posts/python-notes/`（尾斜杠风格统一） |

### 6. 本地构建自检 ——**PASS**

```
> xilingblog@0.0.1 check:build
> node scripts/check-build.mjs

构建自检通过：23 个 HTML 页面、站内链接全部有效、必需产物齐全。
exit=0
```

断言覆盖复核（`scripts/check-build.mjs`）：

- **Vite 占位符**：`:86-87` `if (readFileSync(file,'utf8').includes('__VITE_PRELOAD__')) problems.push('构建产物残留 Vite 占位符 __VITE_PRELOAD__: ...')` —— 即审计要求新增的护栏
- **字数**：`:65-72` 文章页必须匹配 `/(\d+) 字 · 约/` 且不能为 0
- 另有：必需产物齐全（index/404/robots/sitemap/rss/og.png/pagefind.js/各栏目页）、`xilingblog/xilingblog` 双层 base、站内 `href|src` 指向存在的文件

`dist` 为 91541c9 的构建产物（`dist/index.html` mtime 19:27:18 > 最后一次源码改动 19:27:14），因此该自检结果对应当前提交。

---

## 二、同批次 medium 修复的附加核验（非验收项，供参考）

| 附加项 | 结果 | 证据 |
| --- | --- | --- |
| 移动端抽屉遮罩可关闭 + role/aria-modal | **PASS** | 390×844 实测：点 `.menu-button` 后 `{hidden:false, overflow:"hidden", role:"dialog", ariaModal:"true"}`；点 `.drawer-backdrop` 后 `{hidden:true, overflow:""}`（此前点遮罩无反应、滚动被锁） |
| 亮色主色文字对比度 | **PASS** | `main.css:81` 把 `--color-primary` 指向 `--primary-deep`，`--btn-content` 由 `oklch(0.55 0.12)` 加深到 `oklch(0.50 0.13)`；按 oklch→sRGB 计算：widget-title 亮色 **4.77:1**（原 2.63:1）、chip 文字 **5.04:1**（原 4.14:1）、暗色 widget-title 6.9:1 —— 均达 AA |
| 分页禁用态语义化 | 无法线上观测 | 当前 5 篇 < pageSize 10，`/blog/` 只有 1 页 → 分页组件不渲染（`/blog/2/` 404 属预期）；该项已在本批次 `Pagination.astro` 静态修改，本次线上无观测点 |
| giscus 主题 | **部分修复**（见文末 R1） | `data-theme` 已由写死的 `light` 改为 `preferred_color_scheme`（`Comments.astro:32`） |
| 控制台干净度 | 基本干净，有 2 类警告 | `exceptions: []`、无 `ReferenceError`；仅有 giscus 常规提示 `[giscus] Discussion not found...` 与 postMessage 目标 origin 不匹配警告（见文末 R2） |

---

## 三、仍未通过 / 新发现的问题

**R1 [medium] giscus 评论区主题跟随「浏览器/系统偏好」，而不是站点主题开关（部分修复）**
- 证据 1（机制，在 giscus iframe 自身 target 上切换 `prefers-color-scheme` 实测）：
  - `pref=light` → `bodyColor: rgb(0,0,0)` → `renderedTheme: "light"`
  - `pref=dark` → `bodyColor: rgb(255,255,255)` → `renderedTheme: "dark"`
  即 `data-theme="preferred_color_scheme"` 完全由 iframe 内的媒体查询决定，父页面的 `.dark` class 无法影响它。
- 证据 2（失配场景实测）：站点已为暗色（`document.documentElement.className === "dark"`；包括「刷新后按 localStorage 保持暗色」与「点击主题按钮切到暗色」两种）时，若 iframe 侧偏好为 light，widget 仍渲染为亮色（`bodyColor: rgb(0,0,0)`）。
- 影响：系统/浏览器是浅色、但用户用站点按钮切到暗色的读者，评论区仍是一片白；反之系统深色而站点浅色时评论区又偏暗。
- 修复建议：不要依赖 `preferred_color_scheme` 作为唯一来源。可在预涂脚本里算出站点主题后，用 JS 注入 giscus（`script.dataset.theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light'`），或在 `iframe.giscus-frame` 的 **load 事件**里用正确 targetOrigin 发一次 `setConfig.theme`（见 R2），并保留 `html` class 的 MutationObserver 用于用户手动切换。

**R2 [low] 主题同步用的 postMessage 目标 origin 不匹配，消息被浏览器丢弃并打印警告**
- 证据（线上 console，`Log.entryAdded`）：`Failed to execute 'postMessage' on 'DOMWindow': The target origin provided ('https://giscus.app') does not match the recipient window's origin ('https://xiling951.github.io').`（一次会话出现多次）
- 成因：`Comments.astro:50-53` 用 `frame.contentWindow?.postMessage(..., 'https://giscus.app')`，而 `Comments.astro:63-66` 的 `MutationObserver` 在 iframe 刚插入（尚未导航到 giscus.app、origin 仍继承父页）时就调用它 → 抛错、消息被丢弃；`window` 的 `load` 时机同样可能偏早。
- 影响：站点主题切换后评论区不跟随（与 R1 同源），并给控制台留下噪音（对以「控制台零报错」为验收标准的团队是干扰项）。
- 修复建议：改为在 iframe 元素上监听 `load` 后再发一次（`frame.addEventListener('load', syncGiscusTheme)`），发送前用 `frame.getAttribute('src')?.startsWith('https://giscus.app')` 或 `frame.contentWindow.location?.origin` 做判断，或直接改用 `{targetOrigin: '*'}`（giscus 官方示例即如此）以消除该警告。

**未发现其它回归**：站内链接（首页 23 条）0 个 4xx/5xx；无 JS 异常；`__VITE_PRELOAD__` 已彻底从产物中消失；头像/logo/RSS/封面/结构各项均无反向问题。

---

## 四、复现命令（本次验证可直接重跑）

```powershell
# HTTP 层
curl.exe -s -o NUL -w "%{http_code}" https://xiling951.github.io/xilingblog/favicon.svg      # 200
curl.exe -s -o NUL -w "%{http_code}" https://xiling951.github.io/favicon.svg                 # 404（旧破图 URL）
curl.exe -s https://xiling951.github.io/xilingblog/rss.xml | Select-String "<link>","<pubDate>"
curl.exe -s -o NUL -w "%{http_code} %{size_download}" https://xiling951.github.io/xilingblog/covers/post-1.png  # 200 88885

# 本地自检
npm run check:build        # → 构建自检通过：23 个 HTML 页面 …

# 浏览器层（无头 Chrome + CDP，关缓存）
chrome --headless=new --remote-debugging-port=9222 --user-data-dir=<tmp> about:blank
# 然后运行验证脚本：Network.setCacheDisabled + clearBrowserCache →
#   Input.dispatchKeyEvent(Ctrl+K) → Input.insertText('python') → 读 #search-status / #search-results
#   读 img[alt="西岭"].naturalWidth、.navbar-blur a[href]、document.querySelectorAll('h1').length
#   读 meta[property="og:type"]、article figure img[src]/naturalWidth
```
