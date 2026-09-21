// 移动端抽屉菜单
const drawer = document.getElementById('mobile-drawer');
const menuButton = document.querySelector('.menu-button');

function setDrawer(open) {
  if (!drawer || !menuButton) return;
  drawer.classList.toggle('hidden', !open);
  menuButton.setAttribute('aria-expanded', String(open));
  document.body.style.overflow = open ? 'hidden' : '';

  // 打开时把焦点送进抽屉，关闭时还给菜单按钮（键盘可用性）
  if (open) {
    const first = drawer.querySelector('a, button');
    if (first instanceof HTMLElement) first.focus();
  } else if (document.activeElement && drawer.contains(document.activeElement)) {
    menuButton.focus();
  }
}

menuButton?.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  setDrawer(!isOpen);
});

drawer?.querySelector('.drawer-backdrop')?.addEventListener('click', () => setDrawer(false));

drawer?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => setDrawer(false));
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') setDrawer(false);
});
