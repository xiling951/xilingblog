// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';

// https://astro.build/config
export default defineConfig({
  // 部署时的正式域名（RSS 与 canonical 链接会用到）。
  // TODO: 若部署到 GitHub Pages 的「项目页」（https://xiling951.github.io/xilingblog/），
  // 还需加上 base: '/xilingblog'；若把仓库改名为 xiling951.github.io，则用根路径即可。
  site: 'https://xiling951.github.io',
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [icon()],
});
