import rss, { pagesGlobToRssItems } from '@astrojs/rss';
import { withBase } from '../utils/url';

export async function GET(context) {
  return rss({
    title: '我的Astro站点 | 博客',
    description: '我的课程笔记、学习日记和折腾记录',
    site: context.site,
    items: (await pagesGlobToRssItems(import.meta.glob('./**/*.md'))).map((item) => ({
      ...item,
      link: withBase(String(item.link)),
    })),
    customData: `<language>zh-cn</language>`,
  });
}
