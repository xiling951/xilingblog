import rss, { pagesGlobToRssItems } from '@astrojs/rss';
import { siteConfig } from '../config';

export async function GET(context) {
  // 站点部署在子路径（/xilingblog/）下，这里有两个坑：
  // 1) pagesGlobToRssItems 返回的 item 链接已经包含 base，不能再拼一次（否则 /xilingblog/xilingblog/...）
  // 2) channel 的 link 必须带 base，否则订阅者会被带到域名根目录
  const siteWithBase = new URL(import.meta.env.BASE_URL, context.site);

  return rss({
    title: `${siteConfig.title} | 博客`,
    description: siteConfig.description,
    site: siteWithBase,
    items: (await pagesGlobToRssItems(import.meta.glob('./**/*.md'))).sort(
      (a, b) => new Date(b.pubDate).valueOf() - new Date(a.pubDate).valueOf()
    ),
    customData: `<language>zh-cn</language>`,
  });
}