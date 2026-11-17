import { onPageLoad } from '../lib/page-lifecycle';

onPageLoad((signal) => {
  const menuButton = document.querySelector<HTMLButtonElement>(
    '.menu-toggle:not([data-page-preview] *)',
  );
  const menu = document.querySelector<HTMLElement>('.nav-links:not([data-page-preview] *)');

  if (menuButton && menu) {
    const closeMenu = () => {
      menu.classList.remove('open');
      menuButton.setAttribute('aria-expanded', 'false');
    };

    menuButton.addEventListener(
      'click',
      () => {
        const isOpen = menu.classList.toggle('open');
        menuButton.setAttribute('aria-expanded', String(isOpen));
      },
      { signal },
    );

    menu
      .querySelectorAll('a')
      .forEach((link) => link.addEventListener('click', closeMenu, { signal }));

    document.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Escape') closeMenu();
      },
      { signal },
    );
  }
});
