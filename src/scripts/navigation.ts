import { onPageLoad } from '../lib/page-lifecycle';

onPageLoad((signal) => {
  const header = document.querySelector<HTMLElement>('.site-nav');
  const menuButton = document.querySelector<HTMLButtonElement>(
    '.menu-toggle:not([data-page-preview] *)',
  );
  const menu = document.querySelector<HTMLElement>('.nav-links:not([data-page-preview] *)');

  if (header) {
    let previousY = Math.max(0, window.scrollY);
    header.classList.remove('is-scroll-hidden');

    window.addEventListener(
      'scroll',
      () => {
        const currentY = Math.max(0, window.scrollY);
        const delta = currentY - previousY;
        const keepVisible =
          document.documentElement.dataset.navigationState !== 'idle' ||
          currentY <= header.offsetHeight ||
          menuButton?.getAttribute('aria-expanded') === 'true' ||
          header.contains(document.activeElement);

        if (keepVisible || Math.abs(delta) >= 6) {
          header.classList.toggle('is-scroll-hidden', !keepVisible && delta > 0);
          previousY = currentY;
        }
      },
      { passive: true, signal },
    );

    header.addEventListener('focusin', () => header.classList.remove('is-scroll-hidden'), {
      signal,
    });
  }

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
