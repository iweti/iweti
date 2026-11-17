import { onPageLoad } from '../lib/page-lifecycle';

onPageLoad((signal) => {
  const header = document.querySelector<HTMLElement>('.site-nav');
  const menuButton = document.querySelector<HTMLButtonElement>(
    '.menu-toggle:not([data-page-preview] *)',
  );
  const menu = document.querySelector<HTMLElement>('.nav-links:not([data-page-preview] *)');

  const mobile = window.matchMedia('(max-width: 961px) and (pointer: coarse)');
  let swipe: { x: number; y: number; time: number; id: number } | undefined;

  document.addEventListener(
    'touchstart',
    (event) => {
      swipe = undefined;
      if (!mobile.matches || event.touches.length !== 1) return;
      if (menuButton?.getAttribute('aria-expanded') === 'true') return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (
        target.closest(
          'a, button, form, input, textarea, select, [contenteditable], dialog, [data-testimonial-carousel], [data-no-swipe]',
        )
      )
        return;
      for (let element: Element | null = target; element; element = element.parentElement) {
        if (
          element.scrollWidth > element.clientWidth &&
          /auto|scroll/.test(getComputedStyle(element).overflowX)
        )
          return;
      }
      const touch = event.touches[0];
      if (touch.clientX < 24 || touch.clientX > window.innerWidth - 24) return;
      swipe = { x: touch.clientX, y: touch.clientY, time: performance.now(), id: touch.identifier };
    },
    { passive: true, signal },
  );

  document.addEventListener(
    'touchmove',
    (event) => {
      if (!swipe) return;
      const touch = event.touches[0];
      if (
        event.touches.length !== 1 ||
        touch.identifier !== swipe.id ||
        Math.abs(touch.clientY - swipe.y) > 24
      )
        swipe = undefined;
    },
    { passive: true, signal },
  );

  document.addEventListener(
    'touchcancel',
    () => {
      swipe = undefined;
    },
    { passive: true, signal },
  );
  document.addEventListener(
    'touchend',
    (event) => {
      const start = swipe;
      swipe = undefined;
      if (!start || !mobile.matches || event.touches.length) return;
      const touch = Array.from(event.changedTouches).find((item) => item.identifier === start.id);
      if (!touch) return;
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      if (
        Math.abs(dx) < 72 ||
        Math.abs(dx) < Math.abs(dy) * 1.8 ||
        performance.now() - start.time > 700
      )
        return;
      if (window.getSelection()?.toString()) return;
      const links = Array.from(
        document.querySelectorAll<HTMLAnchorElement>('.header-page-indicator a'),
      );
      const current = links.findIndex(
        (link) =>
          link.pathname === location.pathname.replace(/\/$/, '') ||
          (link.pathname === '/' && location.pathname === '/'),
      );
      if (current < 0) return;
      links[current + (dx < 0 ? 1 : -1)]?.click();
    },
    { passive: true, signal },
  );

  if (header) {
    let previousY = Math.max(0, window.scrollY);
    header.classList.remove('is-scroll-hidden');

    window.addEventListener(
      'scroll',
      () => {
        const currentY = Math.max(0, window.scrollY);
        const delta = currentY - previousY;
        const keepVisible =
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
