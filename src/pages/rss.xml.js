import rss, { pagesGlobToRssItems } from '@astrojs/rss';
import { siteConfig } from '../config';
import { allPosts } from '../utils/posts';

export async function GET(context) {
  // 站点部署在子路径（/xilingblog/）下，这里有两个坑：
  // 1) pagesGlobToRssItems 返回的 item 链接已经包含 base，不能再拼一次（否则 /xilingblog/xilingblog/...）
  // 2) channel 的 link 必须带 base，否则订阅者会被带到域名根目录
  const siteWithBase = new URL(import.meta.env.BASE_URL, context.site);

  // 草稿不进 RSS：pagesGlobToRssItems 不保留 draft 字段，所以用 allPosts 先算出草稿 URL 再过滤
  const draftUrls = allPosts.filter((post) => post.draft).map((post) => post.url);

  return rss({
    title: `${siteConfig.title} | 博客`,
    description: siteConfig.description,
    site: siteWithBase,
    items: (await pagesGlobToRssItems(import.meta.glob('./**/*.md')))
      .filter((item) => !draftUrls.some((url) => String(item.link).includes(url)))
      .sort((a, b) => new Date(b.pubDate).valueOf() - new Date(a.pubDate).valueOf()),
    customData: `<language>zh-cn</language>`,
  });
}