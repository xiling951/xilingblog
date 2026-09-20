// 移动端抽屉菜单
const drawer = document.getElementById('mobile-drawer');
const menuButton = document.querySelector('.menu-button');

function setDrawer(open) {
  if (!drawer || !menuButton) return;
  drawer.classList.toggle('hidden', !open);
  menuButton.setAttribute('aria-expanded', String(open));
  document.body.style.overflow = open ? 'hidden' : '';
}

menuButton?.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  setDrawer(!isOpen);
});

drawer?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => setDrawer(false));
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') setDrawer(false);
});
