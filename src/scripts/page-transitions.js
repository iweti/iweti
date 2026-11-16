import { navigate } from 'astro:transitions/client';

const routes = ['/', '/portifolios', '/about', '/contact'];
const root = document.documentElement;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const routeIndex = (url) =>
  routes.indexOf(new URL(url, location.href).pathname.replace(/\/$/, '') || '/');
const timing = { duration: 650, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' };
let busy = false;
let generation = 0;
let overlay;
let journey;
let animations = [];
let movedNodes = [];
let styledHeader;
let headerStyle;
let pageReady;
let swapTransition;

function saveHeader(header) {
  styledHeader = header;
  headerStyle = header.getAttribute('style');
}

function restoreHeader() {
  if (!styledHeader) return;
  if (headerStyle === null) styledHeader.removeAttribute('style');
  else styledHeader.setAttribute('style', headerStyle);
  styledHeader = undefined;
}

function restoreNodes() {
  movedNodes.forEach(({ node, marker }) => marker.replaceWith(node));
  movedNodes = [];
}

function reset() {
  animations.forEach((animation) => animation.cancel());
  animations = [];
  restoreNodes();
  restoreHeader();
  if (overlay) {
    overlay.hidden = true;
    overlay.replaceChildren();
  }
  overlay = undefined;
  journey = undefined;
  busy = false;
  delete root.dataset.pageLeaving;
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

async function collapseHero() {
  const header = document.querySelector('.site-header');
  const hero = document.querySelector('.hero:not([data-page-preview] *)');
  const navigation = document.querySelector('.site-nav');
  if (
    routeIndex(location.href) !== 0 ||
    !header ||
    !hero ||
    !navigation ||
    hero.getBoundingClientRect().bottom <= navigation.getBoundingClientRect().bottom
  )
    return;
  const currentGeneration = generation;
  await waitForImages(document.querySelector('main'));
  if (currentGeneration !== generation) return;
  saveHeader(header);
  const height = header.getBoundingClientRect().height;
  header.style.minHeight = '0';
  header.style.overflow = 'hidden';
  animations = [
    hero.animate(
      [
        { transform: 'translateY(0)', opacity: 1 },
        { transform: 'translateY(-100%)', opacity: 0 },
      ],
      timing,
    ),
    header.animate([{ height: `${height}px` }, { height: `${navigation.offsetHeight}px` }], timing),
  ];
  await Promise.all(animations.map((animation) => animation.finished));
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
  const width = window.innerWidth;
  const panels = prepared.indices.map((_, index) => {
    const panel = document.createElement('div');
    panel.className = 'page-journey-panel';
    panel.style.width = `${width}px`;
    if (index === prepared.indices.length - 1) return panel;
    panel.setAttribute('data-page-preview', '');
    const page = index === 0 ? document : prepared.previews[index - 1];
    const contents = document.createElement('div');
    Array.from(page.body.children).forEach((child) => {
      if (!child.matches('script, .astro-route-announcer')) contents.append(child.cloneNode(true));
    });
    contents
      .querySelectorAll(
        'script, .site-nav, .header-background, .header-page-indicator, [data-page-journey]',
      )
      .forEach((node) => node.remove());
    contents.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
    contents
      .querySelectorAll('.reveal-pending')
      .forEach((node) => node.classList.remove('reveal-pending'));
    if (index === 0) {
      if (styledHeader) {
        const header = contents.querySelector('.site-header');
        header.style.minHeight = '0';
        header.style.height = `${document.querySelector('.site-nav').offsetHeight}px`;
        header.style.overflow = 'hidden';
      }
      contents.style.transform = `translateY(-${window.scrollY}px)`;
    }
    panel.append(contents);
    return panel;
  });
  (prepared.direction > 0 ? panels : [...panels].reverse()).forEach((panel) => track.append(panel));
  const start = prepared.direction > 0 ? 0 : -(panels.length - 1) * width;
  track.style.transform = `translateX(${start}px)`;
  overlay.replaceChildren(track);
  journey = { ...prepared, track, panels, width, start };
}

function moveToPanel(node, panel) {
  if (!node) return;
  const marker = document.createComment('page-transition-position');
  node.before(marker);
  movedNodes.push({ node, marker });
  panel.append(node);
}

// The last panel contains live destination nodes, never a preview of the destination.
function mountDestination() {
  const panel = journey.panels.at(-1);
  const header = document.querySelector('.site-header');
  const shell = header.cloneNode(false);
  shell.removeAttribute('id');
  if (routeIndex(location.href) === 0) {
    const compact = `${document.querySelector('.site-nav').offsetHeight}px`;
    saveHeader(header);
    header.style.minHeight = shell.style.minHeight = '0';
    header.style.height = shell.style.height = compact;
    header.style.overflow = shell.style.overflow = 'hidden';
  }
  panel.append(shell);
  moveToPanel(document.querySelector('.hero:not([data-page-preview] *)'), shell);
  moveToPanel(document.querySelector('main:not([data-page-preview] *)'), panel);
  moveToPanel(document.querySelector('.site-footer:not([data-page-preview] *)'), panel);
}

function updateMenu(index, page = document) {
  page.querySelectorAll('.nav-links a, .header-page-indicator a').forEach((link) => {
    if (routeIndex(link.href) === index) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

async function sweepJourney() {
  await waitForImages(overlay);
  const { indices, direction, track, width, start } = journey;
  const steps = indices.length - 1;
  const sweep = track.animate(
    [
      { transform: `translateX(${start}px)` },
      { transform: `translateX(${start - direction * steps * width}px)` },
    ],
    {
      duration: (steps - 1) * 240 + 700,
      easing: 'cubic-bezier(0.45, 0, 0.2, 1)',
      fill: 'forwards',
    },
  );
  animations.push(sweep);
  const update = () => {
    // A queued frame may run after completion or after reset cancels the sweep.
    if (sweep.playState !== 'running' || journey?.track !== track) return;
    const progress = sweep.effect.getComputedTiming().progress ?? 0;
    updateMenu(indices[Math.min(steps, Math.round(progress * steps))]);
    if (sweep.playState === 'running') requestAnimationFrame(update);
  };
  updateMenu(indices[0]);
  requestAnimationFrame(update);
  await sweep.finished;
  updateMenu(indices[steps]);
}

async function expandHero() {
  const header = document.querySelector('.site-header');
  const hero = document.querySelector('.hero:not([data-page-preview] *)');
  if (!header || !hero) return;
  const compact = document.querySelector('.site-nav').offsetHeight;
  restoreHeader();
  const height = header.getBoundingClientRect().height;
  saveHeader(header);
  header.style.minHeight = '0';
  header.style.overflow = 'hidden';
  animations = [
    header.animate([{ height: `${compact}px` }, { height: `${height}px` }], timing),
    hero.animate(
      [
        { transform: 'translateY(-100%)', opacity: 0 },
        { transform: 'translateY(0)', opacity: 1 },
      ],
      timing,
    ),
  ];
  await Promise.all(animations.map((animation) => animation.finished));
  restoreHeader();
}

// Astro swaps the real document content while preserving only the temporary transition container.
document.addEventListener('astro:before-swap', (event) => {
  if (!event.info?.controlled) {
    generation++;
    reset();
    pageReady?.();
  }
  restoreHeader();
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
  if (busy) event.newDocument.documentElement.dataset.pageLeaving = 'true';
});

document.addEventListener('astro:after-swap', () => {
  if (journey) mountDestination();
  else if (busy && routeIndex(location.href) === 0) {
    const header = document.querySelector('.site-header');
    saveHeader(header);
    header.style.minHeight = '0';
    header.style.height = `${document.querySelector('.site-nav').offsetHeight}px`;
    header.style.overflow = 'hidden';
  }
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
    root.dataset.pageLeaving = 'true';
    try {
      let prepared;
      if (Math.abs(to - from) > 1) {
        try {
          prepared = await prepareJourney(destination);
        } catch {
          /* Direct transition remains available. */
        }
      }
      await collapseHero();
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
      if (journey) await sweepJourney();
      restoreNodes();
      if (overlay) {
        overlay.hidden = true;
        overlay.replaceChildren();
      }
      if (to === 0) await expandHero();
    } catch {
      // If the router cannot load the destination, normal navigation remains available.
      if (currentGeneration === generation && routeIndex(location.href) !== to)
        location.assign(destination.href);
    } finally {
      if (currentGeneration === generation) {
        pageReady = undefined;
        reset();
      }
    }
  },
  true,
);
