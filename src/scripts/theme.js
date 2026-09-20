// 主题切换：亮/暗模式（用 localStorage 记住选择）
const root = document.documentElement;
const toggle = document.getElementById('theme-toggle');

toggle?.addEventListener('click', () => {
  const isDark = root.classList.toggle('dark');
  try {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  } catch {
    /* 隐私模式下忽略 */
  }
});
