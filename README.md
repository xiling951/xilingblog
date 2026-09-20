# 我的Astro站点

个人博客：课程笔记、学习日记和折腾记录。

用 [Astro](https://astro.build) 搭建（跟着官方中文教程的页面 / 组件 / 布局 / 标签 / RSS 一路做下来的），
界面借鉴 [Mizuki](https://github.com/LyraVoid/Mizuki)（Apache-2.0）的 Material Design 3 设计语言：
毛玻璃顶栏、全宽 banner、三栏栅格（个人卡 / 公告 / 标签云 · 文章卡片流 · 站点统计 / 日历 / 分类 / 目录）、
明暗双主题与"一个色相驱动整站配色"的令牌体系。

## 快速开始

```sh
npm install
npm run dev        # 本地预览：http://localhost:4321
npm run build      # 构建静态站点到 dist/
npm run preview    # 预览构建产物
```

## 写一篇新文章

在 `src/pages/posts/` 里新建一个 `.md` 文件即可，归档页、标签页、RSS 和站点统计都会自动更新：

```md
---
layout: ../../layouts/MarkdownPostLayout.astro
title: '文章标题'
description: '一句话摘要，会显示在卡片和 RSS 里'
category: '学习笔记'
author: '西岭'
pubDate: 2026-09-20
tags: ['标签A', '标签B']
---

正文写在这里（Markdown 语法）。
```

> `category` 会出现在首页/归档页顶部的分类筛选胶囊里；`tags` 会自动生成 `/tags/<标签>/` 页面。
> 还没写完的草稿放到仓库根目录的 `drafts/`（不参与构建、也不进 git）。

## 改站点信息 / 换配色

- **`src/config.ts`** —— 站点名、副标题、导航、左侧个人卡、公告、页脚、`themeHue`（0-360 一个数字就整站换色：0 红 / 60 黄 / 150 绿 / 200 青 / 240 蓝 / 300 紫 / 345 粉）
- **`src/styles/main.css`** —— 设计令牌（亮/暗两套，OKLCH）、卡片/按钮/胶囊/正文排版等组件样式

## 目录结构

```text
src/
├── config.ts                 # 全站配置（先改这里）
├── styles/main.css           # 设计令牌 + 组件样式（Tailwind v4）
├── utils/posts.ts            # 文章数据层：字数/阅读时长/标签/分类/站点统计
├── components/
│   ├── Navbar.astro          # 毛玻璃顶栏（导航 + 明暗切换 + 移动端菜单）
│   ├── Sidebar.astro         # 左栏：个人卡 / 公告 / 标签云
│   ├── RightSidebar.astro    # 右栏：站点统计 / 日历 / 分类
│   ├── PostCard.astro        # 文章卡片
│   ├── PostList.astro        # 卡片列表 + 分类筛选
│   └── Footer.astro
├── layouts/
│   ├── BaseLayout.astro      # 页面骨架：banner + 三栏栅格
│   └── MarkdownPostLayout.astro  # 文章页：meta / 正文排版 / 目录 / 上下篇
├── scripts/                  # theme.js（明暗主题）· menu.js（移动端抽屉）
└── pages/
    ├── index.astro           # 首页
    ├── blog.astro            # 归档
    ├── about.astro           # 关于
    ├── tags/                 # 标签索引 + 动态标签页
    ├── posts/                # ← 文章都在这里
    └── rss.xml.js            # RSS 订阅源 /rss.xml
```

## 主题与授权

- 界面设计借鉴 **Mizuki**（Apache-2.0），页脚保留了署名；本项目仅借鉴其设计语言与令牌取值，代码为重新实现
- 图标：[Material Symbols](https://fonts.google.com/icons) + [Simple Icons](https://simpleicons.org/)（经 `astro-icon` 按需内联，无运行时依赖）
- 文章内容版权归作者所有，默认采用 CC BY-NC-SA 4.0
