import { withoutBase } from './url';

/**
 * 文章数据层：把 src/pages/posts/*.md 读成结构化数据，
 * 供首页、归档页、标签页、侧边栏统计共用。
 */

export interface Post {
  /** 路由地址，例如 /posts/post-1/ */
  url: string;
  /** 源文件路径 */
  file: string;
  title: string;
  description: string;
  author: string;
  category: string;
  tags: string[];
  pubDate: Date;
  /** 草稿：draft: true 时不进归档/标签/分类/RSS/搜索索引 */
  draft?: boolean;
  /** 可选：更新时间 */
  updatedDate?: Date;
  image?: { url: string; alt: string };
  /** 字数（中文按字、西文按词） */
  words: number;
  /** 预计阅读分钟数 */
  minutes: number;
}

/** 中英混排字数统计：汉字按 1 字算，西文按单词算 */
function countWords(markdown: string): number {
  const body = markdown.replace(/^---[\s\S]*?---/, '');
  const cjk = (body.match(/[\u4e00-\u9fa5]/g) ?? []).length;
  const latin = (body.replace(/[\u4e00-\u9fa5]/g, ' ').match(/[A-Za-z0-9]+/g) ?? []).length;
  return cjk + latin;
}

const modules = import.meta.glob('../pages/posts/*.md', { eager: true });
// 用 Vite 的 ?raw 直接拿到 Markdown 原文做字数统计：
// 之前用 fs.readFileSync(new URL(key, import.meta.url)) 在 GitHub runner 上路径解析失败，导致线上总字数变成 0
const rawModules = import.meta.glob('../pages/posts/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const allPosts: Post[] = Object.entries(modules)
  .map(([key, mod]) => {
    const m = mod as any;
    const words = countWords(rawModules[key] ?? '');
    return {
      url: withoutBase(m.url as string),
      file: key.split('/').pop() ?? key,
      title: m.frontmatter?.title ?? '未命名',
      description: m.frontmatter?.description ?? '',
      author: m.frontmatter?.author ?? '',
      category: m.frontmatter?.category ?? '未分类',
      tags: (m.frontmatter?.tags ?? []) as string[],
      pubDate: new Date(m.frontmatter?.pubDate ?? 0),
      updatedDate: m.frontmatter?.updatedDate ? new Date(m.frontmatter.updatedDate) : undefined,
      draft: Boolean(m.frontmatter?.draft),
      image: m.frontmatter?.image,
      words,
      minutes: Math.max(1, Math.round(words / 400)),
    };
  })
  .sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());

/** 全部文章（含草稿）——文章页找自己、以及需要"含草稿"的场景用 */
export { allPosts };

/** 只含已发布的文章：渲染列表、标签、分类、统计、相关阅读都用它 */
export const posts: Post[] = allPosts.filter((post) => !post.draft);

export const tagCounts: { name: string; count: number }[] = Object.entries(
  posts.reduce<Record<string, number>>((acc, post) => {
    for (const tag of post.tags) acc[tag] = (acc[tag] ?? 0) + 1;
    return acc;
  }, {})
)
  .map(([name, count]) => ({ name, count }))
  .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

export const categories: { name: string; count: number }[] = Object.entries(
  posts.reduce<Record<string, number>>((acc, post) => {
    acc[post.category] = (acc[post.category] ?? 0) + 1;
    return acc;
  }, {})
)
  .map(([name, count]) => ({ name, count }))
  .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

export const siteStats = {
  postCount: posts.length,
  categoryCount: categories.length,
  tagCount: tagCounts.length,
  totalWords: posts.reduce((sum, post) => sum + post.words, 0),
  lastActivity: posts[0]?.pubDate ?? new Date(),
};

/** 把日期格式化成 YYYY-MM-DD */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 距离某日期过去了多少天 */
export function daysSince(date: Date | string): number {
  const from = typeof date === 'string' ? new Date(date) : date;
  return Math.max(0, Math.floor((Date.now() - from.valueOf()) / 86_400_000));
}

/** “43 天前” 这种相对时间 */
export function relativeDays(date: Date): string {
  const days = daysSince(date);
  if (days === 0) return '今天';
  if (days === 1) return '昨天';
  if (days < 30) return `${days} 天前`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} 个月前`;
  return `${Math.floor(months / 12)} 年前`;
}

/** 取相关文章：同标签越多越相关，其次同分类，最后按时间新到旧 */
export function relatedPosts(current: Post, limit = 3): Post[] {
  return posts
    .filter((post) => post.url !== current.url)
    .map((post) => ({
      post,
      score:
        post.tags.filter((tag) => current.tags.includes(tag)).length +
        (post.category === current.category ? 1 : 0),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || b.post.pubDate.valueOf() - a.post.pubDate.valueOf())
    .slice(0, limit)
    .map((entry) => entry.post);
}