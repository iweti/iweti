import { getLateralPageIndex } from '../data/navigation';

document.addEventListener('astro:before-swap', (event) => {
  const from = getLateralPageIndex(event.from.pathname);
  const to = getLateralPageIndex(event.to.pathname);

  if (from >= 0 && to >= 0 && from !== to) {
    event.newDocument.documentElement.dataset.pageDirection = to > from ? 'forward' : 'backward';
  }
});
