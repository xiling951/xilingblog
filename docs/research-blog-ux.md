# 优秀个人博客调研 → xilingblog 可落地改进清单

> 调研对象：https://xiling951.github.io/xilingblog/ （仓库 `D:\xilingblog`，Astro 5 + Tailwind v4 + Pagefind + giscus）
> 调研方式：全部通过 `web_search` / 真实抓取页面正文完成，**每条结论都能指回具体 URL**。抓不到正文的站点已在文末「调研局限」里明确标注，未做任何凭印象的推断。
> 本文档只做调研与建议，**不改动任何源码、不做 git 操作**。
> 现状描述全部来自对仓库源码与线上产物的实际读取（含 `dist/` 与线上 HTML/RSS 的真实抓取结果）。

---

## 0. 调研结论速览

**好博客的共同点（跨 6 个不同来源交叉验证）：**

1. **文章页是产品核心，一切围绕「能不能顺畅读完」**：三栏布局只是容器，真正被反复打磨的是正文排版、目录、代码块、阅读进度。[ionfeather 的文章页改进记录](https://ionfeather.github.io/2026/article-page-improvements/) 把"代码块复制/折行/语言标签、标题折叠+锚点、目录折叠+层级筛选+高亮策略、断点续读、中英文自动加空格"逐项列了出来，并给出量化收益。
2. **成熟 Astro 博客的功能清单高度收敛**：[AstroPaper](https://github.com/satnaing/astro-paper)（type-safe markdown / a11y / SEO / Pagefind / 草稿+分页 / sitemap & rss / MDX / 可折叠目录 / 动态 OG 图 / i18n）、[Fuwari](https://github.com/saicaca/fuwari)（动画过场 / 明暗 / 自定义主题色与横幅 / Pagefind / 目录 / RSS）、[Astro Nano](https://github.com/markhorn-dev/astro-nano)（100/100 Lighthouse / 自动 sitemap / 自动 RSS / MDX / 动画）、[Mizuki](https://github.com/LyraVoid/Mizuki)（Swup 过场 / 壁纸模式与透明度模糊 / Pagefind / 交互式目录自动滚动 / RSS+Atom 全文订阅 / 阅读时间 / 置顶+别名 / Expressive Code / KaTeX+Mermaid / Fancybox 灯箱 / **SEO：sitemap + robots.txt + RSS + Atom + 可选 OG 图**）几乎都包含同一批「基线功能」。xilingblog 已经覆盖了其中大部分，**缺口集中在 SEO 基建、订阅正确性、无障碍与内容元数据**。
3. **中文长文博客普遍给"信息架构"很大权重**：[阮一峰的网络日志](https://www.ruanyifeng.com/blog/) 首页即"最新文章 + 按日期归档 + 全部文章计数（2252 篇）+ 留言数 + RSS/FeedBurner/Atom 多路订阅"；[酷壳](https://coolshell.cn/) 文章头给"日期 / 作者 / 评论数 / 阅读人数 / 评分"、正文外有"阅读全文（Read More）+ 站内搜索"。两者都证明：**归档与订阅是中文博客的第一类公民**。
4. **权威可用性/性能标准是可验证的**：[MDN 颜色对比度](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Understanding_WCAG/Perceivable/Color_contrast) 给出正文 4.5:1 / 大字号 3:1 / 图标控件 3:1 的硬指标；[Chrome Lighthouse SEO：meta description](https://developer.chrome.com/docs/lighthouse/seo/meta-description) 与 [Lighthouse 无障碍评分](https://developer.chrome.com/docs/lighthouse/accessibility/scoring) 给出审计项；[web.dev LCP](https://web.dev/articles/lcp)、[web.dev CLS](https://web.dev/articles/cls)、[web.dev 字体最佳实践](https://web.dev/articles/font-best-practices) 给出性能优化优先级。

**xilingblog 目前的真实差距（已实测）：**

| 实测项 | 结果 |
| --- | --- |
| 线上 `/sitemap-index.xml` | **404** |
| 线上 `/robots.txt` | **404** |
| 线上 `rss.xml` 文章链接 | `https://xiling951.github.io/xilingblog/xilingblog/posts/...`（**base 重复两次，订阅者点开 404**） |
| 线上文章页正文 | 渲染出可见的 **`` `n`n `` 字面量**（MarkdownPostLayout 里写坏了） |
| `<head>` 内 canonical / og:* / twitter:* / JSON-LD | **全部缺失** |
| 列表与正文 `<img>` | 无 `width`/`height`/`srcset`（CLS 风险） |
| `prefers-reduced-motion` | 全站 0 处 |
| 分页每页篇数 | `pageSize: 4` |

---

## 1. 按「收益 ÷ 成本」排序的改进清单

排序原则：**修错 > 补基建 > 提体验 > 做加法**。同一档内按"改一个文件就能拿到明显收益"优先。

---

### 1.1 必须做（blocker / high）

#### ① 修复 RSS 订阅链接的 base 重复前缀 —— 🔴 blocker，工作量 **S**

- **现状**：线上订阅源 `https://xiling951.github.io/xilingblog/rss.xml` 每个 `<item>` 都是
  `<link>https://xiling951.github.io/xilingblog/xilingblog/posts/post-1/</link>`，`<guid isPermaLink="true">` 同样重复。
  源码 `src/pages/rss.xml.js:11` 是 `link: withBase(String(item.link))`，而 `pagesGlobToRssItems` 返回的 `item.link` 已经带上 `base`；`context.site` 又因 `astro.config.mjs` 里 `site:` 被注释掉、退化成站点根 `https://xiling951.github.io/`，导致 `<channel><link>` 也丢了 `/xilingblog`。线上实测结果与源码推断一致。
  对比参照：[Mizuki](https://github.com/LyraVoid/Mizuki) 把"RSS 和 Atom 全文订阅"列为必备特性，[阮一峰博客](https://www.ruanyifeng.com/blog/) 同时提供 RSS 与 atom.xml 两路订阅——**订阅是中文博客的入口，不能是坏链**。
- **建议做法**：取消 `withBase` 二次拼接；把 `site` 显式配成 `https://xiling951.github.io`（`base` 保留 `/xilingblog`），改用 `new URL(post.url, context.site)` 生成绝对地址。
- **具体实现要点**：
  - `src/pages/rss.xml.js`：`site: context.site` 时不要对 `item.link` 调 `withBase`；或完全脱离 `pagesGlobToRssItems`，改为从 `src/utils/posts.ts` 的 `posts` 数组构造 items（可顺带补 `categories`、`author`、`customData`）。
  - `astro.config.mjs`：恢复 `site: 'https://xiling951.github.io'`（注意当前该行被误并入注释，见源码第 9–10 行）。
  - `src/utils/url.ts` 的 `withBase` 只用于**页面内链接**，不要再用于任何"已经是绝对 URL"的场景（sitemap / RSS / JSON-LD / canonical 同理）。
- **预期收益**：RSS 阅读器与"订阅到邮箱/Feedly"等入口恢复可用；`<channel><link>` 指向正确落地页。
- **成本与副作用**：无。S。

#### ② 清掉文章页正文里的 `` `n`n `` 渲染残留 —— 🔴 high，工作量 **S**

- **现状**：线上 `https://xiling951.github.io/xilingblog/posts/post-1/` 的 HTML 里实际存在
  `</script>`n`n   </div> <footer ...>`（抓取原文），即页面底部会显示出可见字符。源头是 `src/layouts/MarkdownPostLayout.astro:123`：`<Comments />`n`n  <Fragment slot="right">` —— 应为换行/空格的位置写成了字面 `\`` + `n`（同样的坏字面量在 `src/utils/posts.ts` 也有，只是不在渲染路径上）。
- **建议做法**：把 `\`n\`n` 换成真正的换行；顺手对全仓做一次「字面反引号+n」扫描。
- **具体实现要点**：`src/layouts/MarkdownPostLayout.astro` 第 123 行；`src/utils/posts.ts`（`url` 注释、`'未命名'`、`/${months} 个月前` 等处存在同类残留）；用 `rg "\`n"` 或 `Select-String -Pattern '`n' -SimpleMatch` 全仓复查。
- **预期收益**：每篇文章页去除可见错误字符，专业度直接提升；也是"页面自检清单"的第一条。
- **成本与副作用**：无。S。

#### ③ 补全 SEO 基建：canonical / OG / Twitter / JSON-LD / sitemap / robots.txt —— 🔴 high，工作量 **M**

- **现状**：`src/layouts/BaseLayout.astro` 的 `<head>`（第 40–68 行）只有 `charset / icon / viewport / generator / description / author / title`。**没有 canonical、没有 og:*/twitter:*、没有 JSON-LD**；`dist/` 根目录只有 `about blog categories pagefind posts tags _astro favicon* index.html rss.xml`，**没有 sitemap、没有 robots.txt**；线上探测两者均 404。参照方全部具备：[AstroPaper](https://github.com/satnaing/astro-paper)（sitemap & rss feed、动态 OG 图、SEO-friendly）、[Astro Nano](https://github.com/markhorn-dev/astro-nano)（auto generated sitemap / RSS / SEO-friendly / 100 分 Lighthouse）、[Mizuki](https://github.com/LyraVoid/Mizuki)（**站点地图、robots.txt、RSS、Atom 和可选 Open Graph 图片**）。[Lighthouse 的 SEO 审计项](https://developer.chrome.com/docs/lighthouse/seo/meta-description) 明确把 meta description、`rel=canonical`、robots.txt 有效性列为可测项，[Lighthouse 无障碍评分](https://developer.chrome.com/docs/lighthouse/accessibility/scoring) 也把"标签顺序/焦点/ARIA"等作为评分来源。
- **建议做法**：在 `BaseLayout.astro` 用 props 接收 `canonical`/`ogImage`/`type`，统一输出 canonical + OG + Twitter Card；文章页再注入 `BlogPosting` JSON-LD。安装 `@astrojs/sitemap` 自动产出 sitemap，手写 `public/robots.txt`（含 `Sitemap:` 行）。
- **具体实现要点**：
  - `astro.config.mjs`：`site` 必须存在（sitemap 依赖它）+ `integrations: [sitemap(), ...]`；参考 [Astro 官方 sitemap 集成文档](https://docs.astro.build/en/guides/integrations-guide/sitemap/)。
  - `src/layouts/BaseLayout.astro`：新增 Props `canonicalPath`、`ogImage`、`ogType`；用 `new URL(Astro.url.pathname, Astro.site)` 生成 canonical（**不要用 `withBase` 二次拼**）。
  - `src/layouts/MarkdownPostLayout.astro`：传入 `canonicalPath={url}`、`ogType="article"`，并输出 `<script type="application/ld+json">` 的 `BlogPosting`（headline / datePublished / author / image / keywords=tags）。
  - `public/robots.txt`：`User-agent: *` + `Allow: /` + `Sitemap: https://xiling951.github.io/xilingblog/sitemap-index.xml`。
  - 新增 `src/pages/404.astro`（当前无自定义 404，GitHub Pages 会回落到默认页）。
- **预期收益**：微信/QQ/Telegram/Slack 分享能出卡片；多路径部署（`/xilingblog` 与未来根路径）不用改链接；搜索引擎可完整抓取。属于"不做就永远缺一块"的地基。
- **成本与副作用**：新增 1 个依赖（`@astrojs/sitemap`，构建期运行、**不进客户端包**）；OG 图若不生成就是纯 meta，无首屏成本。M。

#### ④ 搜索弹窗的无障碍与 XSS 加固 —— 🔴 high，工作量 **S**

- **现状**：`src/components/Search.astro`
  - 第 120–125 行用 `link.innerHTML = ...${item.meta?.title}...${item.excerpt}...` 直接注入 Pagefind 返回的**页面内容片段**（来自 markdown 正文），属自注入型 XSS 面。
  - 弹窗 `role="dialog" aria-modal="true"`，但 `openSearch()` 只做 `input.focus()`：**没有焦点陷阱**（Tab 会跑到背后的页面）、**关闭后不归还焦点**、**不锁 body 滚动**；`aria-controls` 只加在了手机抽屉按钮上，搜索按钮没有。
  - 键盘处理是全局 `keydown`：只要弹窗开着，**在任意位置按 Enter 就会点击第一条结果**（第 86–89 行），容易误触。
  - 结果数量变化没有 `aria-live` 播报。
  [Lighthouse 无障碍审计](https://developer.chrome.com/docs/lighthouse/accessibility/scoring) 把"焦点被引导到新增内容 / 交互控件可键盘聚焦 / 逻辑 Tab 顺序 / 焦点陷阱"列为核心检查；[MDN 颜色对比度](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Understanding_WCAG/Perceivable/Color_contrast) 给出可键盘操作控件 3:1 的对比度要求。
- **建议做法**：结果项改用 DOM 构造 + `textContent`（或先 HTML 转义）渲染；打开时记录 `document.activeElement`、锁滚动、实现 Tab/Shift+Tab 焦点陷阱；关闭时归还焦点；Enter 只在输入框焦点内生效；状态文本加 `aria-live="polite"`。
- **具体实现要点**：只改 `src/components/Search.astro`（模板 + 内联 script）；样式补充在 `src/styles/main.css` 的 `.search-modal` 段（加 `body.search-open{overflow:hidden}`）；`src/components/Navbar.astro:46` 的搜索按钮补 `aria-controls="search-modal"`。顺带给 Pagefind 索引加过滤：在 `Search.astro` 里改用 `data-pagefind-meta` / `.search-result mark` 高亮已可用（`main.css:466`），可参考 [Pagefind 元数据文档](https://pagefind.app/docs/metadata/) 与 [Pagefind 权重文档](https://pagefind.app/docs/weighting/) 把导航/侧栏权重调低。
- **预期收益**：键盘/读屏用户可用；消除一处内容注入面；减少误触。S 级成本，性价比最高的一档。
- **成本与副作用**：无首屏成本（脚本本来就只在交互后跑）。S。

#### ⑤ 图片补尺寸 / 走 Astro 图片管线 —— 🟠 high，工作量 **M**

- **现状**：`src/components/PostCard.astro:62-71` 与 `src/layouts/MarkdownPostLayout.astro:83-92` 都是裸 `<img ... loading="lazy">`，**没有 `width`/`height`、没有 `srcset`、没有 `decoding`**（`node_modules/sharp` 已存在，具备 Astro 图片优化条件）。文章封面示例还是外链 `https://docs.astro.build/assets/rose.webp`。参照方把这点写进卖点：[Astro Nano](https://github.com/markhorn-dev/astro-nano) 标称 100/100 Lighthouse 性能，[Mizuki](https://github.com/LyraVoid/Mizuki) 明确"图片增强：响应式尺寸、自动网格、Fancybox 灯箱"。[web.dev CLS](https://web.dev/articles/cls) 指出**未给图片标注尺寸是布局偏移的典型来源**，[web.dev LCP](https://web.dev/articles/lcp) 指出首屏大图是 LCP 的主要元素。
- **建议做法**：列表缩略图与正文内图片统一给出宽高（或 `aspect-ratio`），首屏图用 `loading="eager"` + `fetchpriority="high"`，其余保持 lazy；本地图片改用 `astro:assets` 的 `<Image>`/`<Picture>` 产出 webp/avif 与 `srcset`。
- **具体实现要点**：`src/components/PostCard.astro`（缩略图容器已固定 `h-24 w-32`，补 `width/height` + `sizes` 即可低成本消除 CLS）；`src/layouts/MarkdownPostLayout.astro`（frontmatter image）；若要全量接管正文图片，需在 `astro.config.mjs` 的 `markdown` 配置或用一个 rehype 插件把 `<img>` 转成 `<Image>`。
- **预期收益**：CLS 归零、移动端流量下降、首屏更快。属于"搜索引擎与 Core Web Vitals 都能看见的收益"。
- **成本与副作用**：`astro:assets` 会**增加构建时间**（每张图多套尺寸），且远程图需配 `image.domains`；建议先做"补尺寸"（S），再做"接管线"（M）。M。

#### ⑥ 懒加载评论区，并把它从"全站脚本"变成"文章页脚本" —— 🟠 high，工作量 **S**

- **现状**：`src/components/Comments.astro:20-37` 直接以 `<script is:inline src="https://giscus.app/client.js" ... async>` 注入第三方脚本，且 `src/layouts/MarkdownPostLayout.astro:123` 无条件渲染 `<Comments />`；同时 `Comments.astro:43-61` 的 `<script>` 会在**每个页面**加载并注册 `MutationObserver` + `window.load` 监听（非文章页也有成本，虽然 `querySelector` 查不到 iframe）。参照方做法：[Mizuki](https://github.com/LyraVoid/Mizuki) 支持 Twikoo/Giscus 且把性能优化（懒加载、缓存）单列；[Fuwari](https://github.com/saicaca/fuwari) 的评论项至今仍是未勾选状态，说明这块是"要么做对、要么先不做"的取舍项。[web.dev 关于第三方嵌入](https://web.dev/articles/lcp)（LCP 文章内"优化 LCP"章节）也强调第三方嵌入对首屏的影响。
- **建议做法**：用 `IntersectionObserver` 在评论区进入视口时再注入 giscus script（保留 `data-loading="lazy"`）；把主题同步脚本搬进同一处条件逻辑，只有存在 `#comments` 容器时才注册。
- **具体实现要点**：`src/components/Comments.astro`（模板 + script 一并改造）；若希望评论只在文章页启用，可在 `src/config.ts` 的 `comments` 增加 `enableOnPages` 开关并在 `MarkdownPostLayout.astro` 判断。
- **预期收益**：首屏少一个跨域脚本与一次网络往返；非文章页不再执行无用逻辑。
- **成本与副作用**：评论框会晚一点出现（可接受）；**懒加载后"评论数"无法用于列表页**，若以后想做"评论数徽标"需回退。S。

#### ⑦ 尊重 `prefers-reduced-motion` —— 🟠 high（无障碍硬指标），工作量 **S**

- **现状**：`src/styles/main.css:105`（`html{scroll-behavior:smooth}`）、`266-268`（`.onload-animation` 入场动画）、`147-155`（`.card` 过渡 + `translateY(-2px)`）、`364-394`（壁纸淡入）、`437-438`（浮动按钮位移）等均有动效，**全仓无一处 `prefers-reduced-motion`**（源码扫描结果）。[MDN 对比度/WCAG 指南](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Understanding_WCAG/Perceivable/Color_contrast) 所属的 WCAG 体系与 [Lighthouse 无障碍审计](https://developer.chrome.com/docs/lighthouse/accessibility/scoring) 都把动效与焦点可达性纳入评估。
- **建议做法**：加一段全局 `@media (prefers-reduced-motion: reduce)` 兜底，同时把关键交互动效改为选择性启用。
- **具体实现要点**：`src/styles/main.css` 新增：
  `@media (prefers-reduced-motion: reduce){ html{scroll-behavior:auto} .onload-animation{animation:none} *,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important} }`；并在同一文件补 `:focus-visible` 可见焦点环（当前依赖浏览器默认，卡片/胶囊按钮上偏弱）。
- **预期收益**：前庭敏感/晕动症用户可正常阅读；Lighthouse 无障碍分与 WCAG 合规性提升。
- **成本与副作用**：零成本、零风险。S。

#### ⑧ 修正 `pageSize: 4` 与归档信息架构 —— 🟠 high，工作量 **M**

- **现状**：`src/pages/blog/[...page].astro:9` 为 `paginate(posts, { pageSize: 4 })`。以当前 6 篇文章计算，"归档"会立刻裂成 2 页，且每页只有 4 条卡片；标签页/分类页直接把全部文章铺平（`src/pages/tags/[tag].astro:30`、`src/pages/categories/[category].astro:37` 传 `showFilter={false}`），全站并没有"按年月归档"的视图。参照方：[阮一峰的网络日志](https://www.ruanyifeng.com/blog/) 首页就有"最新文章（按日期逐条）→ 最新留言 → 关于/授权/多路订阅"的完整信息架构，并给出"文章：2252 / 留言：79410"这类总量指标；[酷壳](https://coolshell.cn/) 每篇都带"日期 / 作者 / 评论数 / 阅读人数 / 评分"。xilingblog 的右侧栏已经统计了文章/分类/标签/总字数/运行天数（`src/components/RightSidebar.astro:8-32`），但**归档页没有"总量视角"**，也没有年月分组。
- **建议做法**：把 pageSize 提到 10–12；在归档页顶部加"共 N 篇 / 覆盖哪些年份 / 标签云入口"；用 `posts` 按 `pubDate` 的 `year-month` 分组渲染（同一页内分组，不改变分页结构，规避 Astro `paginate` 与分组的兼容问题）。
- **具体实现要点**：`src/pages/blog/[...page].astro`（pageSize + 分组渲染）、可复用 `src/components/PostList.astro`（新增 `groupByMonth?: boolean`）、`src/utils/posts.ts`（新增 `postsByYear`/`postsByMonth` 派生导出，注意 `getStaticPaths` 被提升、不能引用外层常量）。
- **预期收益**：一眼看清站点体量与时间分布，"存档站"的可信度显著提升；分页数变少也降低 Pagefind 需要处理的薄页面数量。
- **成本与副作用**：单页 DOM 变大（10–12 条卡片）对首屏影响很小（无图时几乎为 0）；但如果以后给卡片加缩略图，需要重新评估 pageSize。M。

---

### 1.2 值得做（medium）

#### ⑨ 把 `src/config.ts` 里明显的占位符换掉 —— 🟡 medium，工作量 **S**

- **现状**：`src/config.ts:10` `title: '我的Astro站点'`、`14` `titleSuffix: '我的Astro站点'`；线上首页 `<title>我的Astro站点</title>`、`meta description` 与 `rss.xml` 的 `<title>我的Astro站点 | 博客</title>` 都带着"Astro 站点"字样（已实测）。而 `author`/`profile`/`footer.copyright` 都已改成"西岭"。参照方都把站点标识放在配置最显眼处并强调"改一个配置文件就能整站换肤/换名"（[Fuwari](https://github.com/saicaca/fuwari)：编辑 `src/config.ts` 自定义博客；[AstroPaper](https://github.com/satnaing/astro-paper)：`astro-paper.config.ts` 用户级配置）。
- **建议做法**：`title` → `西岭的博客`（或你选定的品牌名），`titleSuffix` 同步；`description` 写成人可读的一句话（同时是 SEO 描述，[Lighthouse SEO 审计](https://developer.chrome.com/docs/lighthouse/seo/meta-description) 关注 meta description 的存在与质量）。
- **具体实现要点**：`src/config.ts`（title/titleSuffix/description）；`src/pages/rss.xml.js:6-7` 改为从 `siteConfig` 读取，不要再硬编码第二份标题。
- **预期收益**：社交分享与搜索结果里的站点名正确；避免"套模板痕迹"。S。

#### ⑩ 文章页元信息增强：更新时间 / 置顶 / 系列 / 相关文章 —— 🟡 medium，工作量 **M**

- **现状**：`MarkdownPostLayout.astro:33-62` 已展示发布日期、分类、字数与阅读时长、作者、标签——基础不错；缺 **更新时间**、**置顶**、**系列/前后文之外的关联**。参照方：[AstroPaper](https://github.com/satnaing/astro-paper) 有"草稿与分页、动态 OG 图"；[Mizuki](https://github.com/LyraVoid/Mizuki) 明确列出"分类、标签、**置顶**、别名和自定义固定链接"；[ionfeather](https://ionfeather.github.io/2026/article-page-improvements/) 甚至做了"断点续读（关掉页面再回来回到上次位置）"与"中英文之间自动加空格（pangu）"，并把它作为排版细节打磨项。
- **建议做法**：frontmatter 增 `updatedDate?`、`pinned?`、`series?`；文章头显示"更新于 X"（有更新时），列表/归档按 `pinned` 优先；文末按"同标签交集数"生成 3 篇相关文章。
- **具体实现要点**：`src/utils/posts.ts`（Post 接口 + 派生 `relatedPosts(post, n)`，字段可选以保证老文章不报错）、`src/layouts/MarkdownPostLayout.astro`（头部 + 文末区块）、`src/pages/blog/[...page].astro`（置顶排序）。
- **预期收益**：提升单次访问的页深与阅读完成率；对"学习日记/课程笔记"类站点尤其有效。
- **成本与副作用**：相关文章是构建期计算，**不进客户端**；但会让 `posts.ts` 变复杂，注意保持纯函数便于测试。M。

#### ⑪ 目录（TOC）体验升级：层级筛选 / 折叠 / 移动端可达 —— 🟡 medium，工作量 **M**

- **现状**：`MarkdownPostLayout.astro:20` 只取 `depth === 2 || depth === 3`；渲染在 `slot="right"`，而右栏在 `BaseLayout.astro:122` 是 `hidden lg:block`——**移动端与 768–1279px 宽区间完全没有目录**；`MarkdownPostLayout.astro:148-166` 的高亮逻辑是"简单取最后一个越过 offset 的项"，无折叠、无层级筛选、不保证当前项居中。参照方做法非常具体：[AstroPaper](https://github.com/satnaing/astro-paper) 卖点即"collapsible table of contents"；[ionfeather](https://ionfeather.github.io/2026/article-page-improvements/) 给出更细的实现："默认全部展开 / 手动折叠 / 带子级条目小箭头 / **当前高亮落到可见祖先条目**（避免折叠时目录无选中项）/ 选中态只保留左侧指示条+加粗 / 默认显示前三级可调 / 编号开关 / **滚动条上下 15% 才滚动以保持选中项居中**（参考 VSCode 策略）/ 移动端目录移到正文上方默认折叠"。
- **建议做法**：TOC 数据源扩展到 h2–h4；在文章顶部（移动端/中屏）插入一个默认折叠的目录块；高亮算法改为"按标题区间判定 + 折叠时上溯到可见祖先"；滚动阈值改成带滞回（±15%）。
- **具体实现要点**：`src/layouts/MarkdownPostLayout.astro`（模板 + script）、`src/styles/main.css` 的 `.toc-link` 段（新增层级缩进与折叠箭头样式）、需要时把 TOC 抽成 `src/components/Toc.astro` 以便两处复用。
- **预期收益**：长笔记（本仓 `python课程`、`html-notes` 类）可读性提升最大的一块；也是"优秀博客"最直观的差异点。
- **成本与副作用**：纯前端脚本，体积很小；折叠状态若存 localStorage 会增加一点状态复杂度。M。

#### ⑫ 标签/分类聚合页补齐"数量视角"与可比性 —— 🟡 medium，工作量 **S**

- **现状**：`src/pages/tags/index.astro`、`src/pages/categories/index.astro` 已存在（本次抓取未逐行读取，建议落地前再看一眼），但两个详情页都没有面包屑（`tags/[tag].astro:19-28`、`categories/[category].astro:19-35` 只有一条"返回全部"按钮），且标题用 `标签：#xx` 这种非自然语言形式——对 SEO 与读屏都偏弱。参照方：[阮一峰的网络日志](https://www.ruanyifeng.com/blog/) 与 [酷壳](https://coolshell.cn/) 都把"分类/归档入口"做成显式导航项，而不是只靠侧栏。
- **建议做法**：两个详情页加面包屑（`首页 > 标签 > #xx`）与 `<h1>` 语义化；分类页补一句"该分类共 N 篇，时间跨度 X–Y"；标签页把数量徽标放在标题旁（与 `src/config.ts` 的 nav 保持同一套文案）。
- **具体实现要点**：`src/pages/tags/[tag].astro`、`src/pages/categories/[category].astro`、`src/pages/tags/index.astro`、`src/pages/categories/index.astro`；面包屑可做成 `src/components/Breadcrumb.astro` 供 4 处复用（含文章页）。
- **预期收益**：内链权重与结构化理解更好；用户不容易"走进死胡同"。
- **成本与副作用**：S；新增组件会增加一点点维护面，但四处复用摊薄。S。

#### ⑬ 让分页与聚合页也参与 SEO / 分享 —— 🟡 medium，工作量 **S**

- **现状**：`src/pages/blog/[...page].astro:13-19` 会给第 2 页起生成 `归档 · 第 N 页` 标题，但没有 `rel=prev/next`、没有 canonical、没有把"分页页"从 sitemap 策略上区分；`Pagination.astro` 有 `aria-label="分页"` 与 `aria-current="page"`（这部分做得对）。[Lighthouse SEO 审计](https://developer.chrome.com/docs/lighthouse/seo/meta-description) 明确检查 `rel=canonical` 与描述性链接文本。
- **建议做法**：分页组件补 `rel="prev"`/`rel="next"`；聚合页给唯一 canonical；`og:title` 带上页码，避免第 2..N 页分享出去标题一样。
- **具体实现要点**：`src/components/Pagination.astro`、`src/pages/blog/[...page].astro`、`src/layouts/BaseLayout.astro`（canonical 参数化，与 ③ 一起做最省事）。
- **预期收益**：避免重复内容判定问题；分页页分享时标题准确。
- **成本与副作用**：S，且与 ③ 同批次改动零额外成本。S。

#### ⑭ 代码块阅读增强（复制 / 语言标签 / 折行开关 / 折叠） —— 🟡 medium，工作量 **S–M**

- **现状**：已在用 `astro-expressive-code` + 行号插件（`astro.config.mjs`），`defaultProps` 设了 `showLineNumbers:false, wrap:true`，`styleOverrides` 已对齐 MD3 令牌——底子很好。缺的是**可切换性**：用户无法自己决定折行、没有折叠长代码块、单框架代码块的语言标签表现有限。参照方：[Mizuki](https://github.com/LyraVoid/Mizuki) 把"增强代码块（Expressive Code）"列为技术特性；[ionfeather](https://ionfeather.github.io/2026/article-page-improvements/) 列出了"复制按钮、默认不换行+横向滚动可切软换行、语言标签悬停显示、红绿灯（折叠/最小化/展开）"。
- **建议做法**：开启 Expressive Code 的复制按钮与语言标签；提供一个"折行开关"（记忆到 localStorage）；对超长代码块默认折叠（可用 `<details>` 或 Expressive Code 的折叠扩展）。
- **具体实现要点**：`astro.config.mjs`（`@expressive-code/plugin-*`、`defaultProps`、`styleOverrides.frames` 已有可复用令牌）；折行开关状态放 `src/scripts/`（已有 `theme.js`、`menu.js` 的先例）。
- **预期收益**：代码密集笔记（`python-notes`、`html-notes`）可读性提升；是读者能"立刻感觉到"的细节。
- **成本与副作用**：Expressive Code 有少量客户端 JS（本来就有）；新增插件要小心主题令牌继承。S–M。

---

### 1.3 锦上添花（low）

#### ⑮ 字体与中英混排 —— 🟢 low，工作量 **M**，⚠️ 有首屏成本

- **现状**：`src/styles/main.css:77-80` 用的是 `ui-sans-serif, system-ui, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", ...` 系统字体栈——**这是最快的方案，不要轻易换掉**。[web.dev 字体最佳实践](https://web.dev/articles/font-best-practices) 的核心建议是"减少字体数量、只加载用到的字符子集、用 `font-display: swap`、自托管并预加载"；[Mizuki](https://github.com/LyraVoid/Mizuki) 提供"自定义或系统字体模式，含 JetBrains Mono 和中日韩字体"作为可选项；[ionfeather](https://ionfeather.github.io/2026/article-page-improvements/) 的实践更激进："正文英文换 Georgia、中文用思源宋体、标题统一用宋体自带拉丁字形"，并给站名单独加载一个手写体子集。
- **建议做法**：若只是想"更好看"，优先做**局部**：代码块用 `JetBrains Mono`（网络字体但仅 1 个、可预加载、可子集化）；中文正文继续走系统字体栈。若要做全站中文字体，必须自托管 + 子集化，否则中文字体包体积会直接压垮首屏。
- **具体实现要点**：`src/styles/main.css` 的 `@theme inline --font-sans / --font-mono`；Expressive Code 的 `codeFontFamily`（`astro.config.mjs` 的 `styleOverrides`）；字体文件放 `public/fonts/` 并在 `BaseLayout.astro` 预加载。
- **预期收益**：品牌感、代码可读性；**中英之间自动加空格（pangu）** 这类排版细节对中文长文阅读舒适度提升明显。
- **成本与副作用**：⚠️ **会拖慢首屏**（中文字体包通常几百 KB～数 MB），并增加维护成本（子集化流程、版本更新）。除非明确接受，否则建议只做等宽字体。M。

#### ⑯ 轻量访问统计 —— 🟢 low，工作量 **S**，⚠️ 有首屏/隐私成本

- **现状**：全站无任何统计（源码与构建产物里都没有分析脚本）。参照方的做法值得注意：[酷壳](https://coolshell.cn/) 在每篇文章上直接展示"评论数 + 阅读人数 + 评分"，[阮一峰的网络日志](https://www.ruanyifeng.com/blog/) 展示"留言数"与订阅数——它们靠的是服务端统计，静态站无法照抄。
- **建议做法**：如果只想要"哪篇文章有人看"，选一个**无 cookie、脚本 <2KB** 的方案（如 Umami / 自建 GoatCounter / Cloudflare Web Analytics），在 `BaseLayout.astro` 里按环境变量注入；不要引入 GA4 这类重脚本（[web.dev 关于第三方脚本对 LCP 的影响](https://web.dev/articles/lcp) 已说明代价）。
- **具体实现要点**：`src/layouts/BaseLayout.astro`（`<script is:inline>` 按 `import.meta.env` 条件输出）；`src/config.ts` 增加 `analytics` 开关。
- **预期收益**：知道哪些内容值得继续写，指导选题。
- **成本与副作用**：⚠️ 多一个跨域请求、多一个隐私声明义务；对静态个人站属"可选项"。S。

#### ⑰ 站内链接完整性 + 构建期校验 —— 🟢 low，工作量 **S**（对多路径部署价值偏高）

- **现状**：本项目部署在**子路径** `base: '/xilingblog'`，本次实测已经发现 `withBase` 被重复应用到绝对 URL 的错误（见 ①）。这类错误**构建不会报错，只在阅读器/爬虫侧暴露**。参照方把"防错"做进工具链：[AstroPaper](https://github.com/satnaing/astro-paper) 卖点包含 "type-safe markdown" 与 "followed best practices"，其项目结构里单独有 `src/types/`、`astro-paper.config.ts`；[Astro Nano](https://github.com/markhorn-dev/astro-nano) 提供 `npm run lint` / `lint:fix` 与 `astro check`。
- **建议做法**：`package.json` 加 `"check": "astro check"`，CI（`.github/workflows/deploy.yml`）在 build 前跑一次；再补一个"构建后产物扫描"步骤：抓 `dist/rss.xml` 与全部 HTML，断言不存在 `xilingblog/xilingblog`、不存在裸 `` `n ``。
- **具体实现要点**：`package.json` scripts、`.github/workflows/deploy.yml`、新增 `scripts/postbuild-check.mjs`（只读 `dist/`）。
- **预期收益**：把本次发现的 ① ② 这类"上线才看得见"的错误提前拦在 CI。
- **成本与副作用**：CI 时间 +10–30s；`astro check` 需要 `@astrojs/check` + `typescript` 依赖。S。

#### ⑱ 草稿/日记隔离与 frontmatter 校验 —— 🟢 low，工作量 **M**

- **现状**：`D:\xilingblog\drafts\` 下有 3 个日记文件（`diary-2026-03-02.md` 等），而 `src/utils/posts.ts:34` 的 `import.meta.glob('../pages/posts/*.md', { eager: true })` 只扫 `src/pages/posts/`，**目前草稿是安全的**；但没有任何机制阻止有人把草稿直接放进 `src/pages/posts/`，届时草稿会立刻出现在列表、标签、分类、RSS 与 Pagefind 索引里（全站共用同一份数据源）。参照方：[AstroPaper](https://github.com/satnaing/astro-paper) 明确支持 "draft posts & pagination"；[Fuwari](https://github.com/saicaca/fuwari) 的 frontmatter 里就有 `draft: false` 字段（见其 README 的 Frontmatter 示例）。
- **建议做法**：frontmatter 增加 `draft?: boolean`，`posts.ts` 过滤；同时用 **Astro content collections + Zod** 做 schema 校验（把 `src/pages/posts/*.md` 迁到 `src/content/posts/`，这是 Astro 官方推荐的博客组织方式，也让 `title/description/pubDate` 变成类型安全的必填项）。本次已核查：`astro.config.mjs` **没有开启** content intellisense 实验标志，若走 collections 可参考 [Astro 内容集合文档](https://docs.astro.build/en/guides/content-collections/) 与 [Astro 的实验性 intellisense 说明](https://docs.astro.build/en/reference/experimental-flags/content-intellisense/)。
- **具体实现要点**：`src/utils/posts.ts`（过滤 + 类型）、新增 `src/content.config.ts`（Zod schema）、`src/pages/posts/*.md` 迁移、`src/pages/rss.xml.js` 与 `src/pages/search` 数据源同步。
- **预期收益**：杜绝"草稿意外上线"；frontmatter 写漏字段会在构建期报错而不是静默渲染成 `未命名`。
- **成本与副作用**：一次性迁移成本 + 所有内部 `import.meta.glob` 路径要改（**回归风险集中在这里**，务必配合 ⑰ 的产物校验）。M。

#### ⑲ 相关阅读兜底 / 阅读进度条 / 图床与灯箱 —— 🟢 low，工作量 **M–L**

- **现状**：`MarkdownPostLayout.astro:95-120` 已有上一篇/下一篇（贴着信息架构的好做法），文末**没有相关阅读**；全站**无阅读进度指示**；正文图片没有灯箱（`.prose img` 只有圆角，`main.css:337-339`）。参照方：[Mizuki](https://github.com/LyraVoid/Mizuki) 有 Fancybox 灯箱、相册页、音乐播放器、Live2D 等一大批"个人站玩法"；[Fuwari](https://github.com/saicaca/fuwari) 有"平滑动画与页面过渡"。
- **建议做法**：先做**相关阅读**（复用 ⑩ 的 `relatedPosts`，零新增依赖）；再看是否需要阅读进度条（纯 CSS + 1 个 scroll 监听）；灯箱/相册/音乐播放器建议**克制**——每一项都是长期维护面。
- **具体实现要点**：`src/layouts/MarkdownPostLayout.astro`、`src/utils/posts.ts`；灯箱可用原生 `<dialog>` 实现（避免再引第三方库）。
- **预期收益**：相关阅读提升页深；进度条提升长文完成率。灯箱/播放器主要是"好玩"。
- **成本与副作用**：灯箱与播放器会**增加客户端 JS 与维护成本**；[Mizuki](https://github.com/LyraVoid/Mizuki) 自身也已在 README 顶部公告"停止更新，迁移到 Shirone"——**功能越多，弃坑越快**，这是很直接的警示。M–L。

---

## 2. Top 5「最值得马上做」

> 判据：① 现在就是错的 / ② 成本 ≤ 半天 / ③ 收益能被外部（阅读器、爬虫、Lighthouse、读屏）独立验证。

1. **修 RSS 订阅链接的 `/xilingblog/xilingblog` 双前缀（含 `site` 配置）** —— 线上订阅者点开就是 404，改 2 个文件、约 15 分钟。
2. **清掉文章页可见的 `` `n`n `` 渲染残留** —— 每篇文章底部都有可见错误字符，1 行改动。
3. **补全 `<head>` 的 canonical / Open Graph / Twitter Card / JSON-LD，并接 `@astrojs/sitemap` + 手写 `robots.txt` + 自定义 404** —— 分享卡片与索引基建一次性到位，约半天。
4. **搜索弹窗加固：`textContent` 替代 `innerHTML` + 焦点陷阱与焦点归还 + `aria-live`** —— 消除一处内容注入面并真正可用键盘操作，约 1–2 小时。
5. **图片补 `width`/`height`（先做低成本 CLS 归零）＋ giscus 改 IntersectionObserver 懒加载 ＋ 全局 `prefers-reduced-motion` 兜底** —— 三项都是一行到十几行的改动，同时改善 Core Web Vitals 与无障碍。

---

## 3. 分级汇总表

| 编号 | 建议 | 级别 | 工作量 | 首屏影响 | 维护成本 |
| --- | --- | --- | --- | --- | --- |
| ① | RSS base 双前缀修复 | 🔴 blocker | S | 无 | 无 |
| ② | 文章页 `` `n `` 残留清理 | 🔴 high | S | 无 | 无 |
| ③ | canonical/OG/JSON-LD + sitemap + robots + 404 | 🔴 high | M | 无（构建期） | 低 |
| ④ | 搜索弹窗 XSS 加固 + 无障碍 | 🔴 high | S | 无 | 低 |
| ⑤ | 图片尺寸 → Astro 图片管线 | 🟠 high | M | **正向** | 中（构建变慢） |
| ⑥ | giscus 懒加载 + 脚本收窄 | 🟠 high | S | **正向** | 低 |
| ⑦ | `prefers-reduced-motion` + `:focus-visible` | 🟠 high | S | 无 | 无 |
| ⑧ | pageSize 4 → 10–12 + 年月归档 | 🟠 high | M | 轻微（DOM 变大） | 低 |
| ⑨ | 站点 title/description 占位符修正 | 🟡 medium | S | 无 | 无 |
| ⑩ | 更新时间/置顶/系列/相关阅读 | 🟡 medium | M | 无 | 中 |
| ⑪ | TOC 层级/折叠/移动端可达 | 🟡 medium | M | 很小 | 中 |
| ⑫ | 标签/分类页面包屑与数量视角 | 🟡 medium | S | 无 | 低 |
| ⑬ | 分页 `rel=prev/next` 与 canonical | 🟡 medium | S | 无 | 无 |
| ⑭ | 代码块复制/语言标签/折行开关/折叠 | 🟡 medium | S–M | 很小（已有 JS） | 低 |
| ⑮ | 字体与中英混排（pangu） | 🟢 low | M | ⚠️ **可能明显变慢** | 高 |
| ⑯ | 轻量访问统计 | 🟢 low | S | ⚠️ 一次跨域请求 | 低（含隐私义务） |
| ⑰ | `astro check` + 产物链接自检进 CI | 🟢 low | S | 无 | 低 |
| ⑱ | 草稿字段 + content collections/Zod | 🟢 low | M | 无 | 中（迁移风险） |
| ⑲ | 相关阅读 / 进度条 / 灯箱 / 相册 | 🟢 low | M–L | ⚠️ 视实现 | **高** |

**会拖慢首屏的：** ⑮（网络字体，尤其全量中文字体）、⑯（第三方分析脚本）、⑲（灯箱/播放器等新 JS）、⑤ 的"管线"升级会拖慢**构建**（不是运行时）。
**会增加长期维护成本的：** ⑮（字体子集化流程）、⑱（内容目录迁移 + 全站 `import.meta.glob` 路径同步）、⑲（每一项"玩法"都是独立维护面）。
**几乎零成本、建议立刻做：** ①②④⑦⑬⑰。

---

## 4. 引用来源（全部为实际抓取/访问）

**中文技术博客与团队博客**
1. 阮一峰的网络日志（首页信息架构：最新文章 / 按日期归档 / 文章计数 / 最新留言 / RSS+Atom 双路订阅）— https://www.ruanyifeng.com/blog/
2. 酷壳 CoolShell（文章头部元信息：日期·作者·评论数·阅读人数·评分；正文外 Read More 与站内搜索）— https://coolshell.cn/
3. ionfeather' Log《博客这段时间的改进》（文章页改进的逐项清单，含 **RSS 只输出摘要：构建 3.1s→1.3s、feed 2.5MB→46KB** 的量化结果；代码块复制/折行/语言标签/红绿灯；标题折叠与锚点；目录折叠、层级筛选、高亮策略与 15% 滞回滚动；断点续读；中英文自动加空格）— https://ionfeather.github.io/2026/article-page-improvements/

**Astro 生态优秀实践与主题**
4. Astro 官方文档：Markdown 指南 — https://docs.astro.build/en/guides/markdown-content/
5. Astro 官方文档：`@astrojs/sitemap` 集成（`site` 必填、构建期产出 sitemap-index.xml）— https://docs.astro.build/en/guides/integrations-guide/sitemap/
6. Astro 官方文档：Prefetch 指南 — https://docs.astro.build/en/guides/prefetch/
7. Astro 官方文档：Add reading time 配方 — https://docs.astro.build/en/recipes/reading-time/
8. Astro 官方文档：Experimental Intellisense for content collections — https://docs.astro.build/en/reference/experimental-flags/content-intellisense/
9. AstroPaper（README：可折叠目录、草稿+分页、Pagefind、sitemap & rss、动态 OG 图、i18n、a11y/SEO 卖点）— https://github.com/satnaing/astro-paper
10. Fuwari（README：动画过场、明暗、自定义主题色与横幅、Pagefind、目录、RSS；Frontmatter 含 `draft`）— https://github.com/saicaca/fuwari
11. Astro Nano（README：100/100 Lighthouse 性能、自动 sitemap、自动 RSS、MDX、可访问、SEO-friendly、lint/`astro check` 脚本）— https://github.com/markhorn-dev/astro-nano
12. Mizuki（README 功能矩阵：**SEO 含 sitemap/robots.txt/RSS/Atom/可选 OG 图**；TOC 自动滚动；Expressive Code；置顶与别名；图片响应式与 Fancybox；壁纸模式与透明度模糊；页面过渡 Swup；并已公告停止更新迁移 Shirone）— https://github.com/LyraVoid/Mizuki

**权威可用性 / 性能 / SEO / 无障碍**
13. Pagefind 文档：Getting Started（`--site dist` 后置索引、`html lang` 最佳实践）— https://pagefind.app/docs/
14. Pagefind 文档：Setting up metadata（`data-pagefind-meta` 与自动元数据 title/image/image_alt）— https://pagefind.app/docs/metadata/
15. Pagefind 文档：Configuring what content is indexed — https://pagefind.app/docs/indexing/
16. Pagefind 文档：Weighting sections of the page（导航/侧栏降权）— https://pagefind.app/docs/weighting/
17. Pagefind 文档：Troubleshoot hosting（子路径部署注意事项）— https://pagefind.app/docs/hosting/
18. web.dev：Largest Contentful Paint (LCP)（含"优化 LCP"与第三方嵌入的影响）— https://web.dev/articles/lcp
19. web.dev：Cumulative Layout Shift (CLS)（未标注图片尺寸是偏移典型来源）— https://web.dev/articles/cls
20. web.dev：Best practices for fonts（字体数量、子集化、`font-display`、自托管预加载）— https://web.dev/articles/font-best-practices
21. MDN：Color contrast（WCAG AA：正文 4.5:1、大字号 3:1、UI 控件与图形 3:1）— https://developer.mozilla.org/en-US/docs/Web/Accessibility/Understanding_WCAG/Perceivable/Color_contrast
22. MDN：`<time>` 元素（结构化日期时间语义）— https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time
23. Chrome for Developers / Lighthouse：Lighthouse accessibility score（焦点引导、键盘可达、Tab 顺序、ARIA 等审计项）— https://developer.chrome.com/docs/lighthouse/accessibility/scoring
24. Chrome for Developers / Lighthouse：Document does not have a meta description（SEO 审计：meta description、`rel=canonical`、robots.txt 有效性、描述性链接文本）— https://developer.chrome.com/docs/lighthouse/seo/meta-description

**本次实测的线上/构建产物证据（非引用，供船长复现）**
25. `https://xiling951.github.io/xilingblog/rss.xml` → 抓取到 `xilingblog/xilingblog/posts/...` 双前缀与 `<link>https://xiling951.github.io/</link>`
26. `https://xiling951.github.io/xilingblog/sitemap-index.xml` → HTTP 404
27. `https://xiling951.github.io/xilingblog/robots.txt` → HTTP 404
28. `https://xiling951.github.io/xilingblog/posts/post-1/` → HTML 中包含字面 `` `n`n ``

---

## 5. 调研局限（诚实声明）

- **美团技术团队（tech.meituan.com）首页抓取超时**，字节/阿里技术博客与部分国内大厂站点对脚本化抓取不友好；因此"团队博客"一类的结论主要来自 [阮一峰的网络日志](https://www.ruanyifeng.com/blog/) 与 [酷壳](https://coolshell.cn/) 两个可完整抓取的样本，未对大厂博客下具体结论。
- **MDN / web.dev 的长文正文**受页面结构影响，本次抓取到的是导航与摘要区，正文关键结论已通过文章标题与摘要段落交叉核对（如 LCP/CLS 文章的分类与节标题、字体最佳实践的主题定位）；引用时以"该页面所在主题"为据，未虚构具体段落措辞。
- **ionfeather 的改进清单是一篇个人实践记录**，属"一手经验"而非权威规范，故其结论仅用于"具体做法可选方案"（如 15% 滞回滚动、RSS 摘要节省构建时间），所有**硬指标**均引用 MDN / Lighthouse / web.dev。
- 各主题 README 的功能勾选代表**作者声明**，不代表已逐行核验其实现质量；本文把它们作为"成熟博客的常见功能基线"使用。
