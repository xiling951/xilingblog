/**
 * 全站配置：改这里就能改站点信息、导航、侧边栏个人卡和页脚。
 *
 * UI 走的是 Material Design 3 风格，整体配色由 themeHue 一个数字驱动
 * （0=红 60=黄 150=绿 200=青 240=蓝 250=蓝绿 300=紫 345=粉）。
 */

export const siteConfig = {
  /** 站点名 / 首页大标题 */
  title: '西岭的博客',
  /** 首页副标题（显示在标题下方） */
  subtitle: '把课程笔记、学习日记和折腾记录都放在这里',
  /** 浏览器标签页标题后缀 */
  titleSuffix: '西岭的博客',
  /** 描述（SEO / RSS） */
  description: '西岭的个人博客：课程笔记、学习日记和折腾记录',
  /** 主题色相（0-360）—— 整个站点的配色都由它推导 */
  themeHue: 240,
  /** 默认配色模式：'auto' | 'light' | 'dark' */
  defaultTheme: 'auto' as 'auto' | 'light' | 'dark',
  /** 语言 */
  lang: 'zh-cn',
  /** 作者（RSS / meta） */
  author: '西岭',
  /** 首页 banner 上的文字（想关掉就把 enable 改成 false） */
  banner: {
    /** 首页 banner 高度（vh） */
    homeHeight: 65,
    /** 内页 banner 高度（vh）—— 手机上会自动收起 */
    pageHeight: 35,
    /** 是否显示首页标题文字 */
    showTitle: true,
  },
  /** 归档每页文章数（分页用） */
  postsPerPage: 10,
  /** 顶部导航 */
  nav: [
    { name: '首页', url: '/', icon: 'material-symbols:home-rounded' },
    { name: '归档', url: '/blog/', icon: 'material-symbols:archive-rounded' },
    { name: '标签', url: '/tags/', icon: 'material-symbols:tag-rounded' },
    { name: '时间线', url: '/archive/', icon: 'material-symbols:history-rounded' },
    { name: '分类', url: '/categories/', icon: 'material-symbols:folder-rounded' },
    { name: '关于', url: '/about/', icon: 'material-symbols:person-rounded' },
  ],
  /** 左侧边栏的个人卡 */
  profile: {
    name: '西岭',
    bio: '集成电路设计与集成系统 本科生 · 在这里记录学习和折腾',
    /** 头像（放 public/ 下即可，也可以是外链） */
    avatar: '/favicon.svg',
    links: [
      { name: 'GitHub', url: 'https://github.com/xiling951', icon: 'simple-icons:github' },
      { name: 'RSS', url: '/rss.xml', icon: 'simple-icons:rss' },
      { name: '邮箱', url: 'mailto:jh400@qq.com', icon: 'material-symbols:mail-rounded' },
    ],
  },
  /** 左侧边栏的公告（不想要就整段注释掉/删掉） */
  announcement: {
    title: '公告',
    content: '这里是我的个人博客，内容主要是课程笔记、学习日记和一些折腾记录。文章还在陆续整理中。',
    link: { name: '看看归档', url: '/blog/' },
  },
  /**
   * 评论区（giscus，基于 GitHub Discussions）
   * repoId / categoryId 已用 GitHub API 填好，Discussions 已开启。
   * 若页面上评论框提示需要安装 App，点一次即可：
   *   https://github.com/apps/giscus/installations/new
   */
  comments: {
    enable: true,
    repo: 'xiling951/xilingblog',
    repoId: 'R_kgDORIR23w',
    category: 'Announcements',
    categoryId: 'DIC_kwDORIR2384DGFMc',
    mapping: 'pathname',
  },
  /** 页脚 */
  footer: {
    copyright: '西岭',
    /** 站点启动日期，用于统计"运行天数" */
    startDate: '2026-01-29',
    license: { name: 'CC BY-NC-SA 4.0', url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/' },
    /** UI 借鉴声明（尊重原作者的署名） */
    credit: { text: 'UI 借鉴 Mizuki 主题', url: 'https://github.com/LyraVoid/Mizuki' },
  },
} as const;

export type SiteConfig = typeof siteConfig;
