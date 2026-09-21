/**
 * 站点部署在子路径（GitHub Pages 项目页：/xilingblog/）时，
 * 所有内部链接都要带上 base。用 withBase() 统一处理。
 *
 * 如果以后把仓库改名成 xiling951.github.io（根路径部署），
 * 只需把 astro.config.mjs 里的 base 去掉，这里不用动。
 */
const RAW_BASE = import.meta.env.BASE_URL || '/';

/** 去掉末尾斜杠的 base，例如 '/xilingblog' 或 '' */
export const basePath = RAW_BASE.endsWith('/') ? RAW_BASE.slice(0, -1) : RAW_BASE;

/** 把站内绝对路径转成带 base 的路径；外链、mailto、锚点原样返回 */
export function withBase(path: string): string {
  if (!path.startsWith('/')) return path;
  if (path === '/') return `${basePath}/`;
  return `${basePath}${path}`;
}
