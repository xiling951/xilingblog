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

---

## 五、复验：giscus 主题同步（`097a240`，对应上文 R1 / R2）

- **被复验版本**：`097a240`「fix: giscus 主题同步（R1/R2）——等 iframe load 后再 postMessage，并在切换/懒加载场景下重试」= GitHub Actions run #7（`conclusion = success`）→ 线上即该提交
- **复验对象**：<https://xiling951.github.io/xilingblog/posts/python-notes/>
- **方法**：新起无头 Chrome（`--headless=new --remote-debugging-port=9224`，全新 profile）+ CDP，`Network.setCacheDisabled` + `clearBrowserCache`；因为 giscus 在跨域 OOPIF 里，先用「父页向 frame 发 nonce → 看哪个 iframe target 收到」定位**当前活着的**那一帧（`liveId` 每个页面实例稳定、`performance.timeOrigin` 一致），再在该帧内读计算样式与收到的 message；同时采集 `Log.entryAdded` / `Runtime.exceptionThrown`
- **关键背景（避免误判）**：`iframe src` 里的 `theme=preferred_color_scheme` **不会**被 giscus 改写（giscus 不会重写自己的 src），运行期主题靠 `postMessage(setConfig.theme)` 下发。所以判定依据取「widget 内实际渲染出的表面色」+「widget 收到的 setConfig 消息」，而不是读 src 参数。本次所有阶段的 `iframePrefDark` 恒为 `true`（即系统偏好一直是 dark，若只靠 `preferred_color_scheme`，评论区应当**始终**是暗色）。

| # | 复验点 | 结果 | 证据 |
| --- | --- | --- | --- |
| 1 | 站点 `html.dark`（含首次加载就是暗色）时，评论区主题为 dark | **PASS** | 阶段 D（`localStorage.theme=dark` 后重新加载文章页，滚动到评论区等懒加载完成）：`document.documentElement.className = "dark"`，widget `.gsc-comment-box` 背景 = `rgb(13, 17, 23)`（GitHub 暗色表面）、`textarea` 文字 `rgb(230, 237, 243)`；同一帧内 `iframePrefDark=true` → 说明是按站点主题下发的结果，而不是系统偏好碰巧一致 |
| 2 | 控制台不再出现 targetOrigin 不匹配 / 消息被丢弃的警告 | **FAIL（部分修复）** | 每次「文章页首次加载 + 懒加载评论 iframe」仍产生 **1 条**警告：`Failed to execute 'postMessage' on 'DOMWindow': The target origin provided ('https://giscus.app') does not match the recipient window's origin ('https://xiling951.github.io').`（stage0 警告 0 → stage A 加载后 1 → stage D 再次加载后 2，即 **每次页面加载 +1**；两条警告时间戳分别为 `1789990906530`、`1789990934296`，都落在加载阶段，对应代码即 body MutationObserver 在 iframe 插入时的首次同步发送）；**但主题切换路径已清零**：stage B/C/E 切换后警告计数不变（1、1、2） |
| 3 | 点击右上角主题开关后评论区主题随之切换 | **PASS** | 同一帧（`liveId=B3440A1D214F`，`iframePrefDark` 恒为 true）：site light → widget 表面 `rgb(255,255,255)`(light) → 点开关（`html` 变为 `dark`）→ widget 表面变 `rgb(13,17,23)`(dark) → 再点回（`html` 为空）→ widget 表面回到 `rgb(255,255,255)`(light)；另一轮（`liveId=A1534CABED48`）从暗色加载 → 点开关 → widget 由 dark 变 light。帧内同时收到父页消息：`{"giscus":{"setConfig":{}}}`（`origin = https://xiling951.github.io`，消息里 `theme` 键已被 giscus 自己的 handler 消费掉，属收到的证据），与切换时间一一对应 |
| 4 | 结论写入本报告追加章节 | **PASS** | 即本节 |

**结论**：**R1 已闭合**（评论区跟随站点明暗开关，而不再只跟系统偏好；首次加载即暗色也正确）；**R2 仅部分闭合**——切换主题不再产生任何警告、消息也确实被送达并生效，但**每次页面加载仍会因 iframe 插入瞬间的那一次过早发送产生 1 条警告**（该次消息被丢弃，功能由 load 事件与 1.5s 兜底定时器补上，因此不影响观感）。对比修复前的「每次加载 2 条 + 切换也告警」，属明显改善但未达成「控制台不再出现该警告」的验收标准。

**剩余问题根因（源码/部署产物一致）**

`src/components/Comments.astro`：

```js
new MutationObserver(() => {           // ① body 子树变化：giscus client.js 插入 iframe 时触发
  if (attachToFrame()) sendTheme();    // ② 此时 iframe 刚插入，导航尚未提交 → origin 仍是父页 → targetOrigin 不匹配
}).observe(document.body, { childList: true, subtree: true });
```

部署版内联脚本同形（`new MutationObserver(()=>{s()&&t()}).observe(document.body,{childList:!0,subtree:!0})`）。虽然 `attachToFrame()` 里绑定了 `frame.addEventListener('load', sendTheme)` 并加了 `setTimeout(..., 1500)` 兜底，但 ② 的**立即发送**依旧发生在导航提交之前，于是被浏览器丢弃并打印警告。

**最小修复建议（3 行内）**

- 让 `sendTheme()` 只有在 iframe 真正加载过之后才发送，例如：在 `frame.addEventListener('load', ...)` 里打标记 `frame.dataset.themeReady = '1'`，`sendTheme()` 开头加 `if (frame.dataset.themeReady !== '1') return false;`（`syncWithRetry` 的重试机制天然会兜住懒加载）；或
- 把 `sendTheme()` 内的发送包进 `try { ... } catch { return false; }` 并只在 `frame.contentWindow.location.origin` 可读且等于 `https://giscus.app` 时才发（跨域未提交时读取会抛异常，正好用作判据）；或
- 最简单：`postMessage(..., '*')`（giscus 官方示例用法），此时不存在 targetOrigin 校验、也就不会有该警告（消息仍只发往 giscus 的 iframe）。

**复现命令（本节）**

```powershell
chrome --headless=new --remote-debugging-port=9224 --user-data-dir=<tmp> about:blank
# CDP 脚本流程：新 page target → Network.setCacheDisabled/clearBrowserCache → Log.enable
#  1) 打开 /xiling951.github.io/xilingblog/ 一次并 localStorage.setItem('theme','light')
#  2) 打开 /posts/python-notes/，window.scrollTo(0, document.body.scrollHeight)，等 9s（懒加载评论）
#  3) 用 nonce 定位活着的 giscus iframe target，在其中读 getComputedStyle('.gsc-comment-box').backgroundColor
#  4) 点 #theme-toggle 前后重复 3)，并统计 Log.entryAdded 里 /postMessage|target origin/ 的条数
```

---

## 六、复验：giscus 护栅（`cf6b2e0`，R2 是否归零）

- **被复验版本**：`cf6b2e0`「fix(giscus): 只在 iframe 导航完成后才 postMessage（消除每次加载的 targetOrigin 警告）」= GitHub Actions run #8（`conclusion = success`）→ 线上即该提交
- **护栅实现（源码与线上产物一致）**：`src/components/Comments.astro` 的 `sendTheme()` 增加前置条件 `frame.dataset.themeReady !== '1' → return false`；`attachToFrame()` 在 iframe 的 `load` 事件里调 `markReadyAndSync()`（置 `themeReady='1'` 后补发一次），另加 `setTimeout(..., 1200)` 在「load 已过/懒加载竞态」时兜底；主题 class 变化仍走 `syncWithRetry`（400ms × 8）
- **方法**：与第五节同一套脚本（无头 Chrome + CDP、`Network.setCacheDisabled` + `clearBrowserCache`、父页发 nonce 定位活着的 giscus OOPIF、按阶段统计 `Log.entryAdded` 中 `/postMessage|target origin/`），**共 3 次独立会话**（端口 9225 / 9226 / 9227，每次全新 profile，互不共享缓存）：会话① 跑第五节的五阶段脚本；会话② 专项对照（冷加载 + 热加载，在 +1.2s/+5s/+11s/+19s 各采样一次）；会话③ 重跑会话①的同一脚本

| # | 复验点 | 结果 | 证据 |
| --- | --- | --- | --- |
| 1 | 控制台 targetOrigin 不匹配类警告计数归零（冷加载 / 切换主题 / 再次冷加载三阶段均为 0） | **FAIL（未 100% 归零；2/3 会话为 0，1/3 会话仍有 1 条）** | 会话①：stage0(仅访问首页)=0 → A(首次冷加载文章页)=**1** → B/C(切换主题)=1/1（不增）→ D(再次冷加载)=1（**不增**）→ E=1，即整场只 1 条且出现在冷加载阶段（`Failed to execute 'postMessage' on 'DOMWindow': The target origin provided ('https://giscus.app') does not match the recipient window's origin ('https://xiling951.github.io')`）。会话②（专项对照，独立 profile，冷+热两次加载、每 2–8s 采样）：全程 **0** 条。会话③（重跑会话①脚本，独立 profile）：stage0/A/B/C/D/E **全为 0** 条、`exceptions=[]`。对比修复前 `097a240`（t4：每次冷加载 +1、单场 2 条）确有改善——不再「每次加载必然 1 条」，但仍非 0，属时序相关残留：当 giscus.app 的 iframe 导航在插入后 1.2s 内未提交（首次访问、网络慢或机器负载高时）时，`setTimeout(...,1200)` 兜底会先 `markReadyAndSync()` 置位并发消息，而此刻 `contentWindow` 的 origin 仍是父页 → 消息被丢弃并打印该警告 |
| 2 | 站点暗色冷加载后，活帧内 widget 表面仍为 dark（护栅未把主题同步一起挡掉） | **PASS** | 会话①/③ 的 D 阶段（`localStorage.theme=dark` 后冷加载 + 滚动等懒加载）：`html.class="dark"`、`iframe.dataset.themeReady="1"`、活帧 `.gsc-comment-box` 背景 `rgb(13, 17, 23)`、textarea 文字 `rgb(230, 237, 243)`；同帧 `iframePrefDark=true`（系统偏好为 dark，若只靠 `preferred_color_scheme` 不足以证明），说明主题仍由站点下发；会话③ D 阶段另在 3s 后复采一次（`D_later_state`）仍为 dark |
| 3 | 点击主题开关后评论区主题仍跟随（light→dark→light） | **PASS** | 会话①/③：A 阶段 site=light → widget 表面 `rgb(255,255,255)`；点 `#theme-toggle`（`html` 变 `dark`）→ B 阶段 `rgb(13,17,23)`；再点回（class 清空）→ C 阶段 `rgb(255,255,255)`；会话①/③ 的 D→E（从暗色冷加载点开关）同样 dark→light；会话①帧内实收到 `{"giscus":{"setConfig":{}}}`（`origin=https://xiling951.github.io`），时间戳与两次点击一一对应 |
| 4 | 结论追加到本报告，若 PASS 明确写出 R1/R2 均已闭合 | **PASS（报告已追加；R2 不能宣告闭合）** | 即本节 |

**结论**

- **R1 已闭合**：站点 `html.dark` → 评论区渲染 dark；点击主题开关 → 评论区随之在 light↔dark 间切换；护栅没有破坏主题同步（3 次会话、5 个阶段全部一致）。
- **R2 未闭合（残留为时序相关，非必然）**：`cf6b2e0` 已消除「每次冷加载必然 1 条」的确定性告警（t4 单场 2 条 → 现 3 次会话中出现 0/0/1 条），但验收要求的「三个阶段均为 0」未达成——会话①仍出现 1 条，且只出现在「评论 iframe 懒加载首次提交慢」的场景。

**残留根因与确定性修复建议（任选其一即可彻底归零）**

1. 去掉盲定时器：删掉 `setTimeout(..., 1200)` 的兜底（只保留 `load` 事件 + `syncWithRetry` 重试；`syncWithRetry` 在 400ms×8 内会一直重试到 `themeReady==='1'` 为止，懒加载场景已覆盖）；或
2. 发送前用 origin 作为判据：把 `frame.contentWindow.postMessage(...)` 包进 `try { if (frame.contentWindow.location.origin !== 'https://giscus.app') return false; postMessage(...) } catch { return false; }`（跨域未提交时读取 `location` 会抛异常，正好当作「未就绪」）；或
3. 最简单：`frame.contentWindow.postMessage({...}, '*')`（giscus 官方示例用法，不再有 targetOrigin 校验，消息仍只发往 giscus 的 iframe）。

**复现命令（本节，三次会话）**

```powershell
# 每次用全新 profile 起一个无头 Chrome，然后跑同一脚本（nonce 定位活帧 + 阶段化统计警告）
chrome --headless=new --remote-debugging-port=9225 --user-data-dir=<tmp1> about:blank   # 会话①：五阶段脚本 → 观察到 1 条（冷加载阶段）
chrome --headless=new --remote-debugging-port=9226 --user-data-dir=<tmp2> about:blank   # 会话②：冷/热加载专项采样 → 0 条
chrome --headless=new --remote-debugging-port=9227 --user-data-dir=<tmp3> about:blank   # 会话③：重跑五阶段脚本 → 0 条
# 关键断言：Log.entryAdded 中 /postMessage|target origin/ 计数；iframe.dataset.themeReady；活帧 .gsc-comment-box 背景色
```

---

## 七、终验：giscus 警告归零（确定性就绪判据 `5d85afa`，run #11）

- **被复验版本**：`5d85afa`「fix(giscus): 用确定性就绪判据替代 1200ms 盲兜底，彻底消除 targetOrigin 警告」= GitHub Actions run #11（`conclusion = success`）→ 线上即该提交
- **就绪判据（源码=线上产物）**：`frameReady(frame)` = `try { frame.contentWindow.location.origin === 'https://giscus.app' } catch { true }`；`sendTheme()` 以 `frameReady` 为前置条件；**已删除 1200ms 盲兜底**，改为 `syncWithRetry` 400ms × 25（≈10s）轮询到就绪；`themeReady` 仍在 `load` 回调里置位（仅作外部可观测标记）
- **方法**：与 t5 完全同一套脚本（无头 Chrome + CDP、`Network.setCacheDisabled` + `clearBrowserCache`、父页发 nonce 定位活着的 giscus OOPIF、按阶段统计 `Log.entryAdded` 中 `/postMessage|target origin/`），**3 次独立全新 profile 会话**（端口 9228 / 9229 / 9230），另加 1 次带 document-start 时间线注入的诊断会话（端口 9231）

### 7.1 逐条结果

| # | 复验点 | 结果 | 证据 |
| --- | --- | --- | --- |
| 1 | 三次会话的 targetOrigin 警告计数均为 0（冷加载 / 切换主题 / 再次冷加载） | **PASS** | 会话①(9228)：stage0=0、A(首次冷加载)=0、B/C(切换)=0/0、D(再次冷加载) 时间线 t1.2s/t2.4s/t6.4s=0/0/0、D_state=0、E=0，**合计 0**；会话②(9229)：各阶段同样 0，合计 0；会话③(9230)：各阶段同样 0，合计 0。3 次会话 `exceptions=[]`，`Log.entryAdded` 中无任何 `postMessage`/`target origin`/`DOMWindow` 记录 |
| 2 | 站点暗色冷加载后活帧 widget 仍为 dark（就绪判据未挡主题），themeReady 时序正常 | **PASS** | 3/3 会话的 D 阶段（`localStorage.theme=dark` 冷加载 + 滚动等懒加载）：`html.class="dark"`、`iframe.dataset.themeReady="1"`、活帧 `.gsc-comment-box` 背景 `rgb(13, 17, 23)`、textarea 文字 `rgb(230, 237, 243)`。时序（会话①）：`D_t1_2 ready=1`、`D_t2_4 ready=1`、`D_t6_4 ready=1`（会话③ t1.2s 时 ready 尚为 null、t2.4s 起为 1 —— 说明就绪是靠判据而非盲等）。诊断会话（9231，document-start 注入时间线）实测：iframe 插入 **t=987ms**（此时 `contentWindow.location.origin` 为 `null`，未提交）→ **t=2249ms** 变为跨域可读（判据自此为 true）→ **t=3422ms** `load` 触发（判据已 true、`themeReady` 仍 null，随后置 1）——证明「就绪」判定确实发生在导航提交之后 |
| 3 | 点击主题开关评论区仍跟随 light→dark→light | **PASS** | 3/3 会话：会话②(9229) 完整序列 A=light(`rgb(255,255,255)`) → 点开关(site=dark) → B=dark(`rgb(13,17,23)`) → 再点(site 无 class) → C=light；D(暗色冷加载)=dark → E(点开关)=light。会话①/③ 的 B/C/D/E 同形（B=dark、C=light、D=dark、E=light）。帧内实收消息 `{"giscus":{"setConfig":{}}}`（`origin=https://xiling951.github.io`，`theme` 键已被 giscus handler 消费），且只在切换后出现（B/E 各 1 条） |
| 4 | 结论追加本报告 | **PASS** | 即本节 |

### 7.2 结论（R1 / R2）

- **R2 已闭合**：`5d85afa` 采用确定性就绪判据后，**3 次独立全新 profile 会话的 targetOrigin 警告全部为 0**（冷加载 / 切换主题 / 再次冷加载各阶段均为 0），`exceptions` 亦为 0。对比 `097a240`（每次加载 1 条）与 `cf6b2e0`（3 次会话 1/0/0）已彻底消除。
- **R1 已闭合（本任务验收的两条路径）**：暗色冷加载 → 评论区 dark；点击主题开关 → 评论区随之 light↔dark 切换；3/3 会话一致，就绪判据未破坏主题同步。

### 7.3 新发现 R3（medium/low，不影响 7.2 的两条结论）：首次「浅色冷加载」时评论区可能停留在系统主题

- **现象**：站点为浅色（`localStorage.theme='light'`，`html` 无 `dark`）而系统偏好为深色时，评论 iframe 加载完成后 widget **仍是暗色**（`rgb(13,17,23)`），直到用户点一次主题开关才跟随站点。
- **复现率**：3 次会话中 2 次复现（会话① 9228、会话③ 9230 的 A 阶段 widget=dark；会话② 9229 的 A 阶段为 light，正常），诊断会话（9231）稳定复现。
- **证据链**（用于排除「判据提前发送」这一旧根因）：
  1. 诊断时间线：iframe 插入(`t=987ms`，origin 为 `null`) → 跨域就绪(`t=2249ms`) → `load`(`t=3422ms`)，即发送时机已晚于导航提交，**不是** targetOrigin 被丢弃（且 0 警告、无异常）；
  2. `themeReady="1"` 说明 `load` 回调确实执行并调用了 `sendTheme()`；
  3. 在同一页手工补发**完全相同**的 `{giscus:{setConfig:{theme:'light'}}}`（`targetOrigin` 同为 `https://giscus.app`）→ 2.5s 内 widget 变为 `rgb(255,255,255)`（light）✓；
  4. 切换路径（B/C/E 阶段）每次都能正确生效。
  由 3、4 可判定：消息通道正常，问题在于**首次发送早于 giscus 应用自己的初始主题**（`theme=preferred_color_scheme`）→ 我们的 `light` 被 widget 的初始渲染覆盖；用户切换一次主题（更晚的发送）即恢复。
- **影响**：仅影响「手动把站点主题切到与系统相反」的回头访客（`defaultTheme='auto'` 时两者一致，多数场景无感）；表现为评论区与页面主题不一致，切换一次主题即自愈。
- **修复建议（任选；因发送前仍有 `frameReady()` 判据，不会重新引入警告）**：
  1. **改用 giscus 自己的就绪信号**：父页 `window.addEventListener('message', (e) => { if (e.origin === 'https://giscus.app') sendTheme(); })`——giscus widget 渲染后会向父页发 `resizeHeight`（客户端已用它设置 iframe 高度），这条消息是「widget 已渲染」的现成信号，此时补发必然生效；
  2. 或在 `load` 回调里多发几次：`sendTheme(); setTimeout(sendTheme, 800); setTimeout(sendTheme, 2500);`（判据保证不会提前发送）；
  3. 或按当前主题直出 iframe 的初始 `data-theme`（客户端按 `class/localStorage` 注入 `client.js` 的 `data-theme="dark|light"`），从根上避免「先 preferred_color_scheme 再纠正」。

### 7.4 复现命令（本节，四次会话）

```powershell
# 三次验收会话（与 t5 同一脚本，仅端口不同；各自全新 profile）
chrome --headless=new --remote-debugging-port=9228 --user-data-dir=<tmp1> about:blank  # 会话①：全阶段 0 警告；A 阶段 widget=dark（R3）
chrome --headless=new --remote-debugging-port=9229 --user-data-dir=<tmp2> about:blank  # 会话②：全阶段 0 警告；A 阶段 widget=light（正常）
chrome --headless=new --remote-debugging-port=9230 --user-data-dir=<tmp3> about:blank  # 会话③：全阶段 0 警告；A 阶段 widget=dark（R3）
# 诊断会话：document-start 注入时间线 + 手工补发 setConfig，验证 R3 机制
chrome --headless=new --remote-debugging-port=9231 --user-data-dir=<tmp4> about:blank  # 插入 987ms(origin=null) → 就绪 2249ms → load 3422ms；补发 light 后 widget 变 light
```
