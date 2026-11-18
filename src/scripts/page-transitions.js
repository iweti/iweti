import { navigate } from 'astro:transitions/client';

const routes = ['/', '/about', '/portifolios', '/blog', '/contact'];
const root = document.documentElement;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const routeIndex = (url) =>
  routes.indexOf(new URL(url, location.href).pathname.replace(/\/$/, '') || '/');
let busy = false;
let generation = 0;
let overlay;
let journey;
let sweep;
let movedContent;
let pageReady;
let swapTransition;

function restoreContent() {
  if (!movedContent) return;
  const { content, marker } = movedContent;
  marker.replaceWith(content);
  movedContent = undefined;
}

function reset() {
  sweep?.cancel();
  sweep = undefined;
  restoreContent();
  if (overlay) {
    overlay.hidden = true;
    overlay.replaceChildren();
  }
  overlay = undefined;
  journey = undefined;
  busy = false;
  delete root.dataset.pageDirection;
  delete root.dataset.pageInstant;
}

async function waitForImages(container) {
  let timeout;
  try {
    await Promise.race([
      Promise.all(
        Array.from(container.querySelectorAll('img'), (image) => {
          image.loading = 'eager';
          return image.decode().catch(() => {});
        }),
      ),
      new Promise((resolve) => {
        timeout = setTimeout(resolve, 1500);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

async function prepareJourney(destination) {
  const from = routeIndex(location.href);
  const to = routeIndex(destination.href);
  const direction = Math.sign(to - from);
  const indices = Array.from(
    { length: Math.abs(to - from) + 1 },
    (_, step) => from + step * direction,
  );
  const previews = await Promise.all(
    indices.slice(1, -1).map(async (index) => {
      const response = await fetch(routes[index], { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error('Page preview unavailable');
      return new DOMParser().parseFromString(await response.text(), 'text/html');
    }),
  );
  return { indices, direction, previews };
}

function buildJourney(prepared) {
  overlay = document.querySelector('[data-page-journey]');
  if (!overlay) throw new Error('Page transition container unavailable');
  const track = document.createElement('div');
  track.className = 'page-journey-track';
  const panels = prepared.indices.map((_, index) => {
    const panel = document.createElement('div');
    panel.className = 'page-journey-panel';
    if (index === prepared.indices.length - 1) return panel;
    panel.setAttribute('data-page-preview', '');
    const page = index === 0 ? document : prepared.previews[index - 1];
    const contents = page.querySelector('.page-content').cloneNode(true);
    contents.querySelectorAll('script').forEach((node) => node.remove());
    contents.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
    contents
      .querySelectorAll('.reveal-pending')
      .forEach((node) => node.classList.remove('reveal-pending'));
    if (index === 0) contents.style.transform = `translateY(-${window.scrollY}px)`;
    panel.append(contents);
    return panel;
  });
  (prepared.direction > 0 ? panels : [...panels].reverse()).forEach((panel) => track.append(panel));
  const start = prepared.direction > 0 ? 0 : -(panels.length - 1) * 100;
  track.style.transform = `translateX(${start}%)`;
  overlay.replaceChildren(track);
  journey = { ...prepared, track, panels, start };
}

// The last panel contains the live destination content.
function mountDestination() {
  const content = document.querySelector('.page-content:not([data-page-preview] *)');
  const marker = document.createComment('page-transition-position');
  content.before(marker);
  movedContent = { content, marker };
  journey.panels.at(-1).append(content);
}

function updateMenu(index, page = document) {
  page.querySelectorAll('.site-nav .brand, .nav-links a, .header-page-indicator a').forEach((link) => {
    if (routeIndex(link.href) === index) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

async function sweepJourney() {
  const currentJourney = journey;
  await waitForImages(overlay);
  if (journey !== currentJourney) return;
  const { indices, direction, track, start } = currentJourney;
  const steps = indices.length - 1;
  const animation = track.animate(
    [
      { transform: `translateX(${start}%)` },
      { transform: `translateX(${start - direction * steps * 100}%)` },
    ],
    {
      duration: (steps - 1) * 240 + 700,
      easing: 'cubic-bezier(0.45, 0, 0.2, 1)',
      fill: 'forwards',
    },
  );
  sweep = animation;
  const update = () => {
    // A queued frame may run after completion or after reset cancels the sweep.
    if (animation.playState !== 'running' || journey?.track !== track) return;
    const progress = animation.effect.getComputedTiming().progress ?? 0;
    updateMenu(indices[Math.min(steps, Math.round(progress * steps))]);
    requestAnimationFrame(update);
  };
  updateMenu(indices[0]);
  requestAnimationFrame(update);
  await animation.finished;
  if (journey !== currentJourney) return;
  updateMenu(indices[steps]);
}

// Astro swaps the real document content while preserving only the temporary transition container.
document.addEventListener('astro:before-swap', (event) => {
  if (!event.info?.controlled) {
    generation++;
    reset();
    pageReady?.();
  }
  swapTransition = event.viewTransition;
  const from = routeIndex(event.from.href);
  const to = routeIndex(event.to.href);
  if (from >= 0 && to >= 0 && from !== to) {
    event.newDocument.documentElement.dataset.pageDirection = to > from ? 'forward' : 'backward';
  }
  if (event.info?.journey || reducedMotion.matches || from < 0 || to < 0) {
    event.newDocument.documentElement.dataset.pageInstant = 'true';
  }
  // Set the departure state before layout can start a transition from the destination state.
  if (journey) updateMenu(journey.indices[0], event.newDocument);
});

document.addEventListener('astro:after-swap', () => {
  if (journey) mountDestination();
});

document.addEventListener('astro:page-load', () => {
  // Let all page initializers run before revealing the destination.
  queueMicrotask(() => pageReady?.());
  if (!busy) {
    const currentGeneration = generation;
    swapTransition?.finished
      .finally(() => {
        if (currentGeneration === generation && !busy) reset();
      })
      .catch(() => {});
  }
});

document.addEventListener(
  'click',
  async (event) => {
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (
      !link ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      link.hasAttribute('download') ||
      link.hasAttribute('data-astro-reload') ||
      (link.target && link.target !== '_self') ||
      link.relList.contains('external')
    )
      return;
    const destination = new URL(link.href, location.href);
    const from = routeIndex(location.href);
    const to = routeIndex(destination.href);
    if (
      destination.origin !== location.origin ||
      from < 0 ||
      to < 0 ||
      from === to ||
      reducedMotion.matches ||
      !document.startViewTransition
    )
      return;
    event.preventDefault();
    if (busy) return;
    busy = true;
    const currentGeneration = ++generation;
    try {
      let prepared;
      if (Math.abs(to - from) > 1 && !destination.hash) {
        try {
          prepared = await prepareJourney(destination);
        } catch {
          /* Direct transition remains available. */
        }
      }
      if (currentGeneration !== generation) return;
      if (prepared) {
        buildJourney(prepared);
        await waitForImages(overlay);
        if (currentGeneration !== generation) return;
        overlay.hidden = false;
        root.dataset.pageInstant = 'true';
      } else root.dataset.pageDirection = to > from ? 'forward' : 'backward';
      const loaded = new Promise((resolve) => {
        pageReady = resolve;
      });
      let timeout;
      try {
        await Promise.race([
          (async () => {
            await navigate(destination.href, {
              info: { controlled: true, journey: Boolean(prepared) },
              sourceElement: link,
            });
            await loaded;
          })(),
          new Promise((_, reject) => {
            timeout = setTimeout(() => reject(new Error('Navigation timed out')), 8000);
          }),
        ]);
      } finally {
        clearTimeout(timeout);
      }
      if (currentGeneration !== generation) return;
      await swapTransition?.finished.catch(() => {});
      if (currentGeneration === generation && journey) await sweepJourney();
    } catch {
      // If the router cannot load the destination, normal navigation remains available.
      if (currentGeneration === generation && routeIndex(location.href) !== to)
        location.assign(destination.href);
    } finally {
      if (currentGeneration === generation) {
        pageReady = undefined;
        reset();
        updateMenu(routeIndex(location.href));
      }
    }
  },
  true,
);
