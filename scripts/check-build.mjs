/**
 * 构建产物自检：在 CI 与本地 `npm run check:build` 里跑。
 * 目的是拦住「构建成功但线上坏掉」的那类问题 —— 已经踩过的坑：
 *   1. 子路径部署时 base 被重复拼接（/xilingblog/xilingblog/...）
 *   2. Markdown 布局里混进字面 `n`n 并在页面上可见
 *   3. sitemap / robots / 404 等产物悄悄没生成
 *   4. 站内链接指向不存在的文件
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = 'dist';
const BASE = '/xilingblog/';
const BACKTICK_N = '`' + 'n' + '`' + 'n';
const problems = [];

const mustExist = [
  'index.html',
  '404.html',
  'robots.txt',
  'sitemap-index.xml',
  'sitemap-0.xml',
  'rss.xml',
  'og.png',
  'pagefind/pagefind.js',
  'blog/index.html',
  'categories/index.html',
  'tags/index.html',
  'archive/index.html',
];
for (const file of mustExist) {
  if (!existsSync(join(DIST, file))) problems.push(`缺少产物: ${file}`);
}

/** 收集所有 HTML（pagefind 目录是搜索索引，跳过） */
const htmlFiles = [];
(function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'pagefind') walk(full);
    } else if (entry.name.endsWith('.html')) {
      htmlFiles.push(full);
    }
  }
})(DIST);

for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  const where = relative(DIST, file);

  if (html.includes('xilingblog/xilingblog')) problems.push(`base 被重复拼接: ${where}`);
  if (html.includes(BACKTICK_N)) problems.push(`出现字面 ${BACKTICK_N} 残留: ${where}`);

  for (const match of html.matchAll(/(?:href|src)="([^"]*)"/g)) {
    const url = match[1];
    if (!url.startsWith(BASE)) continue; // 只检查站内绝对链接
    const path = url.slice(BASE.length).split('#')[0].split('?')[0];
    const candidates = [join(DIST, path), join(DIST, path, 'index.html')];
    const ok = candidates.some((candidate) => existsSync(candidate) && statSync(candidate).isFile());
    if (!ok) problems.push(`站内链接失效: ${url}（来自 ${where}）`);
  }
}

if (existsSync(join(DIST, 'rss.xml'))) {
  const rss = readFileSync(join(DIST, 'rss.xml'), 'utf8');
  if (rss.includes('xilingblog/xilingblog')) problems.push('rss.xml 里 base 被重复拼接');
  if (!rss.includes(BASE)) problems.push('rss.xml 的链接缺少 base');
}

if (existsSync(join(DIST, 'robots.txt'))) {
  const robots = readFileSync(join(DIST, 'robots.txt'), 'utf8');
  if (!robots.includes(`${BASE}sitemap-index.xml`)) problems.push('robots.txt 的 Sitemap 地址不正确');
}

if (problems.length > 0) {
  console.error(`构建自检未通过（${problems.length} 个问题）：`);
  for (const problem of problems.slice(0, 40)) console.error(`  - ${problem}`);
  if (problems.length > 40) console.error(`  ...还有 ${problems.length - 40} 个`);
  process.exit(1);
}

console.log(`构建自检通过：${htmlFiles.length} 个 HTML 页面、站内链接全部有效、必需产物齐全。`);
