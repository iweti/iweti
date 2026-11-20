document.addEventListener('astro:before-swap', (event) => {
  const links = Array.from(document.querySelectorAll('.header-page-indicator a'));
  const indexOf = (url) => {
    const path = url.pathname.replace(/\/$/, '');
    return links.findIndex((link) => link.pathname.replace(/\/$/, '') === path);
  };
  const from = indexOf(event.from);
  const to = indexOf(event.to);

  if (from >= 0 && to >= 0 && from !== to) {
    event.newDocument.documentElement.dataset.pageDirection = to > from ? 'forward' : 'backward';
  }
});
