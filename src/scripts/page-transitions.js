// The five real panels belong to this document for its entire lifetime.
const panels = [...document.querySelectorAll('[data-panel]')];
const root = document.documentElement;
const sequence = ['/', '/portifolios', '/about', '/contact'];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const normalize = (path) => path.replace(/\/$/, '') || '/';
let active = panels.find((panel) => !panel.hidden);
let state = 'idle';
let gesture;
let incoming;
let timer;
let animations = [];
let generation = 0;
let suppressClick = false;
history.scrollRestoration = 'manual';
let currentEntry = history.state?.panelEntry ?? crypto.randomUUID();
const entryScrolls = new Map();
let scrollTimer;
history.replaceState({ ...history.state, panelEntry: currentEntry }, '');

function persistScroll() {
  const top = entryScrolls.get(currentEntry);
  if (top !== undefined && history.state?.panelScroll !== top)
    history.replaceState({ ...history.state, panelScroll: top }, '');
}
window.addEventListener(
  'scroll',
  () => {
    if (active.dataset.panel !== normalize(location.pathname)) return;
    entryScrolls.set(currentEntry, scrollY);
    if (scrollTimer !== undefined) return;
    scrollTimer = setTimeout(() => {
      scrollTimer = undefined;
      persistScroll();
    }, 100);
  },
  { passive: true },
);

function setState(next) {
  state = next;
  root.dataset.navigationState = next;
  document.querySelector('.site-nav')?.classList.remove('is-scroll-hidden');
}
function stop() {
  generation++;
  clearTimeout(timer);
  animations.forEach((animation) => animation.cancel());
  animations = [];
  gesture = undefined;
  incoming = undefined;
  panels.forEach((panel) => {
    panel.style.removeProperty('transform');
    panel.classList.remove('is-moving');
    panel.hidden = panel !== active;
    panel.inert = panel !== active;
    panel.setAttribute('aria-hidden', String(panel !== active));
  });
  setState('idle');
}
function scrollToDestination(url, restore = false) {
  let target;
  try {
    target = active.querySelector('#' + CSS.escape(decodeURIComponent(url.hash.slice(1))));
  } catch {}
  const savedScroll = entryScrolls.get(currentEntry) ?? history.state?.panelScroll;
  if (restore && typeof savedScroll === 'number')
    window.scrollTo({ top: savedScroll, behavior: 'instant' });
  else if (url.hash && target) target.scrollIntoView({ behavior: 'instant', block: 'start' });
  else
    window.scrollTo({ top: restore ? (history.state?.panelScroll ?? 0) : 0, behavior: 'instant' });
}
function activate(url, push = true, restore = false) {
  const destination = panels.find((panel) => panel.dataset.panel === normalize(url.pathname));
  if (!destination) return;
  clearTimeout(scrollTimer);
  scrollTimer = undefined;
  if (push) {
    entryScrolls.set(currentEntry, scrollY);
    persistScroll();
    currentEntry = crypto.randomUUID();
    history.pushState({ panelEntry: currentEntry, panelScroll: 0 }, '', url);
  } else {
    currentEntry = history.state?.panelEntry ?? crypto.randomUUID();
    if (!history.state?.panelEntry)
      history.replaceState({ ...history.state, panelEntry: currentEntry }, '');
  }
  active = destination;
  stop();
  document.title = active.dataset.title;
  document.querySelector('meta[name="description"]').content = active.dataset.description;
  document.querySelectorAll('.site-nav a[href]').forEach((link) => {
    if (normalize(new URL(link.href).pathname) === active.dataset.panel)
      link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  // The header brand must point home even when the initial route was Home.
  const brand = document.querySelector('.site-nav .brand');
  if (brand) brand.setAttribute('href', active.dataset.panel === '/' ? '/#home' : '/');
  document.querySelector('.nav-links')?.classList.remove('open');
  document.querySelector('.menu-toggle')?.setAttribute('aria-expanded', 'false');
  scrollToDestination(url, restore);
  let focus;
  try {
    focus = active.querySelector(
      url.hash ? '#' + CSS.escape(decodeURIComponent(url.hash.slice(1))) : 'h1',
    );
  } catch {}
  if (focus instanceof HTMLElement) {
    focus.setAttribute('tabindex', '-1');
    focus.focus({ preventScroll: true });
  }
  document.dispatchEvent(new Event('panel:change'));
}
function prepare(destination, direction) {
  incoming = destination;
  incoming.hidden = false;
  incoming.classList.add('is-moving');
  incoming.style.transform = `translateX(${direction * innerWidth}px)`;
  // Compensate the document's vertical offset without changing the outgoing Hero height.
  incoming.style.top = `${scrollY}px`;
}
function move(dx, direction) {
  active.style.transform = `translateX(${dx}px)`;
  if (incoming) incoming.style.transform = `translateX(${dx + direction * innerWidth}px)`;
}
function settle(url, commit, dx, direction) {
  setState('animating');
  const version = generation;
  const finish = () => {
    if (version !== generation) return;
    if (commit) activate(url);
    else stop();
  };
  if (reduced.matches) {
    finish();
    return;
  }
  const end = commit ? -direction * innerWidth : 0;
  const options = { duration: 280, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'forwards' };
  animations = [
    active.animate(
      [{ transform: `translateX(${dx}px)` }, { transform: `translateX(${end}px)` }],
      options,
    ),
  ];
  if (incoming)
    animations.push(
      incoming.animate(
        [
          { transform: `translateX(${dx + direction * innerWidth}px)` },
          { transform: `translateX(${end + direction * innerWidth}px)` },
        ],
        options,
      ),
    );
  Promise.all(animations.map((animation) => animation.finished))
    .then(finish)
    .catch(() => {});
  timer = setTimeout(finish, 280);
}
document.addEventListener(
  'click',
  (event) => {
    if (suppressClick) {
      event.preventDefault();
      event.stopPropagation();
      suppressClick = false;
      return;
    }
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (
      !link ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.shiftKey ||
      link.hasAttribute('download') ||
      link.hasAttribute('data-astro-reload') ||
      (link.target && link.target !== '_self') ||
      link.relList.contains('external')
    )
      return;
    const url = new URL(link.href);
    const destination = panels.find((panel) => panel.dataset.panel === normalize(url.pathname));
    if (url.origin !== location.origin || !destination || url.search !== location.search) return;
    event.preventDefault();
    if (state !== 'idle') return;
    if (destination === active || reduced.matches) {
      activate(url);
      return;
    }
    setState('preparing');
    const direction = panels.indexOf(destination) > panels.indexOf(active) ? 1 : -1;
    prepare(destination, direction);
    settle(url, true, 0, direction);
  },
  true,
);
function excluded(target) {
  if (
    !(target instanceof Element) ||
    !target.closest('[data-panel]') ||
    document.querySelector('dialog[open]') ||
    document.querySelector('.menu-toggle')?.getAttribute('aria-expanded') === 'true' ||
    window.getSelection()?.toString()
  )
    return true;
  if (
    target.closest(
      'a,button,form,input,textarea,select,label,[contenteditable],dialog,[data-testimonial-carousel],[data-no-swipe]',
    )
  )
    return true;
  for (let node = target; node; node = node.parentElement) {
    if (node.scrollWidth > node.clientWidth && /auto|scroll/.test(getComputedStyle(node).overflowX))
      return true;
  }
  return false;
}
document.addEventListener('pointerdown', (event) => {
  if (gesture && event.pointerId !== gesture.id) {
    stop();
    return;
  }
  if (state !== 'idle' || !event.isPrimary || event.button !== 0 || excluded(event.target)) return;
  gesture = {
    id: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    time: performance.now(),
    dx: 0,
    direction: 0,
  };
});
document.addEventListener(
  'pointermove',
  (event) => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (state === 'idle') {
      if (Math.abs(dy) >= 10 && Math.abs(dy) > Math.abs(dx) / 1.5) {
        gesture = undefined;
        return;
      }
      if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      const index = sequence.indexOf(active.dataset.panel);
      const direction = dx < 0 ? 1 : -1;
      const destination = panels.find(
        (panel) => panel.dataset.panel === sequence[index + direction],
      );
      if (index < 0 || !destination) {
        gesture = undefined;
        return;
      }
      gesture.direction = direction;
      setState('dragging');
      prepare(destination, direction);
      active.setPointerCapture?.(event.pointerId);
    }
    if (state !== 'dragging') return;
    event.preventDefault();
    gesture.dx = Math.max(-innerWidth, Math.min(innerWidth, dx));
    // Never pull beyond the chosen adjacent page.
    gesture.dx = gesture.direction > 0 ? Math.min(0, gesture.dx) : Math.max(0, gesture.dx);
    move(gesture.dx, gesture.direction);
  },
  { passive: false },
);
function end(event, cancel = false) {
  if (!gesture || gesture.id !== event.pointerId) return;
  const current = gesture;
  gesture = undefined;
  if (state !== 'dragging') return;
  if (active.hasPointerCapture?.(event.pointerId)) active.releasePointerCapture(event.pointerId);
  const distance = Math.abs(current.dx);
  const velocity = distance / Math.max(1, performance.now() - current.time);
  const commit = !cancel && (distance >= innerWidth * 0.25 || (velocity >= 0.5 && distance >= 40));
  suppressClick = !cancel;
  // Synthetic click suppression expires even when the browser emits no click.
  setTimeout(() => {
    suppressClick = false;
  }, 0);
  settle(new URL(incoming.dataset.panel, location.href), commit, current.dx, current.direction);
}
document.addEventListener('pointerup', (event) => end(event));
document.addEventListener('pointercancel', (event) => end(event, true));
document.addEventListener('lostpointercapture', (event) => end(event, true));
window.addEventListener('blur', () => {
  if (gesture) end({ pointerId: gesture.id }, true);
});
window.addEventListener('popstate', () => {
  stop();
  activate(new URL(location.href), false, true);
});
window.addEventListener('resize', () => {
  if (state !== 'idle') stop();
});
window.addEventListener('pagehide', () => {
  clearTimeout(scrollTimer);
  scrollTimer = undefined;
  persistScroll();
  stop();
});
reduced.addEventListener('change', () => {
  if (state !== 'idle') {
    stop();
    activate(new URL(location.href), false, true);
  }
});
setState('idle');
// No initial focus jump; native direct-entry hash scrolling remains available.
