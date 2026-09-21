import type { APIRoute } from 'astro';

/**
 * robots.txt 由配置生成，自动带上 base（子路径部署也能给出正确的 sitemap 地址）。
 */
export const GET: APIRoute = ({ site }) => {
  const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : import.meta.env.BASE_URL + '/';
  const sitemap = site ? new URL(`${base}sitemap-index.xml`, site).toString() : '/sitemap-index.xml';

  const body = ['User-agent: *', 'Allow: /', '', `Sitemap: ${sitemap}`, ''].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
