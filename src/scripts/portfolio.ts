import { onPageLoad } from '../lib/page-lifecycle';

onPageLoad((signal) => {
  const showcase = document.querySelector<HTMLElement>('.project-showcase');
  if (showcase) {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;

    const updateBackground = () => {
      frame = 0;
      const offset = reducedMotion.matches ? 0 : -showcase.getBoundingClientRect().top * 0.8;
      showcase.style.setProperty('--portfolio-background-offset', `${offset}px`);
    };
    const scheduleUpdate = () => {
      if (!frame) frame = requestAnimationFrame(updateBackground);
    };

    updateBackground();
    window.addEventListener('scroll', scheduleUpdate, { passive: true, signal });
    window.addEventListener('resize', scheduleUpdate, { signal });
    reducedMotion.addEventListener('change', scheduleUpdate, { signal });
    signal.addEventListener('abort', () => cancelAnimationFrame(frame), { once: true });
  }

  const confirmation = document.querySelector<HTMLDialogElement>('.external-site-confirmation');
  const externalUrl = confirmation?.querySelector('.external-site-url');
  const externalConfirm = confirmation?.querySelector<HTMLAnchorElement>('.external-site-confirm');
  if (confirmation && externalUrl && externalConfirm) {
    document.querySelectorAll<HTMLAnchorElement>('.project-link').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        const destination = new URL(link.href);
        externalUrl.textContent = destination.hostname;
        externalConfirm.href = destination.href;
        confirmation.showModal();
      });
    });
    confirmation
      .querySelector('.external-site-cancel')
      ?.addEventListener('click', () => confirmation.close());
    confirmation.addEventListener('click', (event) => {
      if (event.target === confirmation) confirmation.close();
    });
    externalConfirm.addEventListener('click', () => confirmation.close());
  }
});
