// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';
import expressiveCode from 'astro-expressive-code';
import { pluginLineNumbers } from '@expressive-code/plugin-line-numbers';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // GitHub Pages 项目页地址：https://xiling951.github.io/xilingblog/
  // 若以后把仓库改名为 xiling951.github.io（根路径站点），把 base 删掉即可，代码不用动。
  site: 'https://xiling951.github.io',
  base: '/xilingblog',

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [
    icon(),
    sitemap(),
    expressiveCode({
      // 跟随站点的 .dark class（而不是系统的 prefers-color-scheme）
      themes: ['github-light-default', 'github-dark-default'],
      useDarkModeMediaQuery: false,
      themeCssSelector: (theme) => (theme.type === 'dark' ? '.dark' : ':root:not(.dark)'),
      // 行号插件：默认不显示，某个代码块想显示就写 showLineNumbers
      plugins: [pluginLineNumbers()],
      defaultProps: {
        showLineNumbers: false,
        wrap: true,
      },
      styleOverrides: {
        // 让代码块与站点的 MD3 令牌保持一致
        borderRadius: '0.8rem',
        borderColor: 'var(--line-divider)',
        codeBackground: 'var(--codeblock-bg)',
        codeFontSize: '0.85rem',
        codeLineHeight: '1.65',
        uiFontSize: '0.78rem',
        frames: {
          shadowColor: 'transparent',
          editorTabBarBackground: 'var(--codeblock-topbar-bg)',
          editorActiveTabBackground: 'var(--codeblock-bg)',
          editorActiveTabBorderColor: 'var(--line-divider)',
          terminalTitlebarBackground: 'var(--codeblock-topbar-bg)',
          terminalTitlebarBorderBottomColor: 'var(--line-divider)',
          inlineButtonBackground: 'var(--btn-regular-bg)',
          inlineButtonForeground: 'var(--btn-content)',
          inlineButtonBorder: 'var(--line-divider)',
          tooltipBackground: 'var(--float-panel-bg)',
        },
      },
    }),
  ],
});
