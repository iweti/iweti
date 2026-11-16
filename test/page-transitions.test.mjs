import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(
  new URL('../src/scripts/page-transitions.js', import.meta.url),
  'utf8',
).replace(/^import .*;\n/, '');
const flush = () => new Promise((resolve) => setImmediate(resolve));

function setup({
  path = '/',
  reduced = false,
  supported = true,
  fetchFails = false,
  holdNative = false,
} = {}) {
  const handlers = new Map();
  const frames = [];
  const requests = [];
  const navigations = [];
  const reloads = [];
  const destinations = [];
  const callbacks = [];
  let finishNative;
  class Node {
    constructor(tag = 'div', classes = '') {
      this.tag = tag;
      this.className = classes;
      this.children = [];
      this.attrs = new Map();
      this.style = {};
      this.dataset = {};
      this.hidden = false;
      this.classList = {
        remove: (name) => {
          this.className = this.className
            .split(' ')
            .filter((v) => v !== name)
            .join(' ');
        },
      };
    }
    get href() {
      return new URL(this.attrs.get('href') || '/', 'https://iweti.com').href;
    }
    get target() {
      return this.attrs.get('target') || '';
    }
    get relList() {
      return { contains: () => false };
    }
    get offsetHeight() {
      return this.className.includes('site-nav') ? 80 : 0;
    }
    getBoundingClientRect() {
      return {
        height: parseFloat(this.style.height) || 680,
        bottom: this.className === 'site-nav' ? 80 : 680,
      };
    }
    setAttribute(key, value) {
      this.attrs.set(key, value);
    }
    getAttribute(key) {
      return this.attrs.get(key) ?? null;
    }
    hasAttribute(key) {
      return this.attrs.has(key);
    }
    removeAttribute(key) {
      this.attrs.delete(key);
      if (key === 'style') this.style = {};
    }
    append(child) {
      child.remove();
      child.parent = this;
      this.children.push(child);
    }
    before(node) {
      const at = this.parent.children.indexOf(this);
      node.remove();
      node.parent = this.parent;
      this.parent.children.splice(at, 0, node);
    }
    replaceWith(node) {
      this.before(node);
      this.remove();
    }
    remove() {
      if (this.parent) this.parent.children = this.parent.children.filter((node) => node !== this);
      this.parent = undefined;
    }
    replaceChildren(...children) {
      [...this.children].forEach((node) => node.remove());
      children.forEach((node) => this.append(node));
    }
    matches(selector) {
      return selector.split(',').some((part) => {
        part = part.trim();
        if (part.includes(':not([data-page-preview] *)')) {
          let ancestor = this;
          while (ancestor) {
            if (ancestor.hasAttribute('data-page-preview')) return false;
            ancestor = ancestor.parent;
          }
          part = part.replace(':not([data-page-preview] *)', '');
        }
        const descendant = part.match(/^(\.[\w-]+) (a)$/);
        if (descendant) {
          let ancestor = this.parent;
          while (ancestor) {
            if (ancestor.matches(descendant[1])) return this.matches(descendant[2]);
            ancestor = ancestor.parent;
          }
          return false;
        }
        if (part.startsWith('.')) return this.className.split(' ').includes(part.slice(1));
        if (part.startsWith('[')) return this.hasAttribute(part.slice(1, -1));
        return this.tag === part;
      });
    }
    querySelectorAll(selector) {
      return this.children.flatMap((child) => [
        ...(child.matches(selector) ? [child] : []),
        ...child.querySelectorAll(selector),
      ]);
    }
    querySelector(selector) {
      return this.querySelectorAll(selector)[0] ?? null;
    }
    closest(selector) {
      return selector === 'a[href]' && this.tag === 'a' ? this : null;
    }
    cloneNode(deep) {
      const node = new Node(this.tag, this.className);
      node.attrs = new Map(this.attrs);
      node.style = { ...this.style };
      if (Object.hasOwn(this, 'decode')) node.decode = this.decode;
      if (deep) this.children.forEach((child) => node.append(child.cloneNode(true)));
      return node;
    }
    animate(keyframes, timing) {
      let finish;
      const animation = {
        playState: 'running',
        effect: {
          getComputedTiming: () => ({ progress: animation.playState === 'idle' ? null : 0.5 }),
        },
      };
      animation.finished = new Promise((resolve) => {
        finish = () => {
          animation.playState = 'finished';
          resolve();
        };
      });
      animation.cancel = () => {
        finish();
        animation.playState = 'idle';
      };
      frames.push({ node: this, keyframes, timing, animation, finish });
      return animation;
    }
  }
  function makePage(url) {
    const root = new Node('html');
    const body = new Node('body');
    root.append(body);
    const header = new Node('header', 'site-header');
    const nav = new Node('div', 'site-nav');
    const links = new Node('div', 'nav-links');
    const indicator = new Node('nav', 'header-page-indicator');
    for (const href of ['/', '/portifolios', '/about', '/contact']) {
      for (const parent of [links, indicator]) {
        const link = new Node('a');
        link.setAttribute('href', href);
        if (href === new URL(url, 'https://iweti.com').pathname)
          link.setAttribute('aria-current', 'page');
        parent.append(link);
      }
    }
    nav.append(links);
    if (new URL(url, 'https://iweti.com').pathname !== '/') nav.append(indicator);
    header.append(nav);
    const slot = new Node('div', 'page-journey-overlay');
    slot.setAttribute('data-page-journey', '');
    slot.hidden = true;
    header.append(slot);
    const hero = new Node('section', 'hero');
    if (new URL(url, 'https://iweti.com').pathname === '/') {
      header.append(hero);
      header.append(indicator);
    }
    const main = new Node('main');
    main.page = url;
    const input = new Node('input');
    input.value = 'preserved';
    main.append(input);
    const footer = new Node('footer', 'site-footer');
    body.append(header);
    body.append(main);
    body.append(footer);
    return {
      root,
      body,
      header,
      hero,
      nav,
      main,
      input,
      footer,
      slot,
      documentElement: root,
      querySelector: (selector) => root.querySelector(selector),
      querySelectorAll: (selector) => root.querySelectorAll(selector),
    };
  }
  const initial = makePage(path);
  const document = {
    documentElement: initial.root,
    body: initial.body,
    ...(supported ? { startViewTransition() {} } : {}),
    createElement: (tag) => new Node(tag),
    createComment: () => new Node('comment'),
    querySelector: (selector) => document.documentElement.querySelector(selector),
    querySelectorAll: (selector) => document.documentElement.querySelectorAll(selector),
    addEventListener: (name, handler) => {
      const list = handlers.get(name) || [];
      list.push(handler);
      handlers.set(name, list);
    },
  };
  const emit = (name, event = {}) => {
    let result;
    for (const handler of handlers.get(name) || []) result = handler(event);
    return result;
  };
  const location = {
    href: `https://iweti.com${path}`,
    origin: 'https://iweti.com',
    assign: (url) => reloads.push(url),
  };
  const navigate = async (url, options) => {
    navigations.push({ url, options });
    const destination = makePage(url);
    destinations.push(destination);
    const transition = {
      finished: holdNative
        ? new Promise((resolve) => {
            finishNative = resolve;
          })
        : Promise.resolve(),
    };
    emit('astro:before-swap', {
      from: new URL(location.href),
      to: new URL(url),
      info: options.info,
      newDocument: destination,
      viewTransition: transition,
    });
    const persisted = document.querySelector('[data-page-journey]');
    destination.slot.replaceWith(persisted);
    Object.keys(document.documentElement.dataset).forEach((key) => {
      delete document.documentElement.dataset[key];
    });
    Object.assign(document.documentElement.dataset, destination.root.dataset);
    document.documentElement.replaceChildren(destination.body);
    document.body = destination.body;
    location.href = url;
    emit('astro:after-swap');
    emit('astro:page-load');
  };
  vm.runInNewContext(source, {
    document,
    location,
    navigate,
    Element: Node,
    URL,
    AbortSignal,
    setTimeout,
    clearTimeout,
    queueMicrotask,
    requestAnimationFrame: (fn) => callbacks.push(fn),
    window: { innerWidth: 1000, scrollY: 0, matchMedia: () => ({ matches: reduced }) },
    fetch: async (url) => {
      requests.push(url);
      if (fetchFails) throw new Error('unavailable');
      return { ok: true, text: async () => url };
    },
    DOMParser: class {
      parseFromString(url) {
        return makePage(url);
      }
    },
  });
  const click = (url, options = {}) => {
    const link = new Node('a');
    link.setAttribute('href', url);
    if (options.target) link.setAttribute('target', options.target);
    if (options.download) link.setAttribute('download', '');
    const event = {
      target: link,
      button: 0,
      defaultPrevented: false,
      preventDefault() {
        this.defaultPrevented = true;
      },
      ...options.event,
    };
    return { event, done: emit('click', event) };
  };
  return {
    click,
    emit,
    document,
    frames,
    requests,
    navigations,
    reloads,
    destinations,
    initial,
    finishNative: () => finishNative(),
    callbacks,
    finishRunning: () =>
      frames
        .filter((frame) => frame.animation.playState === 'running')
        .forEach((frame) => frame.finish()),
  };
}

test('a distant journey ends on the exact live destination elements without reloading', async () => {
  const app = setup({ path: '/portifolios' });
  let initialized = 0;
  app.document.addEventListener('astro:page-load', () => {
    initialized++;
    app.document.querySelector('main:not([data-page-preview] *)').children[0].value = 'initialized';
  });
  const click = app.click('https://iweti.com/contact');
  await flush();
  assert.deepEqual(app.requests, ['/about']);
  assert.equal(app.navigations.length, 1);
  assert.equal(app.frames.length, 1);
  const destination = app.destinations[0];
  const overlay = app.document.querySelector('[data-page-journey]');
  assert.equal(overlay.hidden, false);
  assert.ok(overlay.querySelectorAll('main').includes(destination.main));
  assert.equal(destination.input.value, 'initialized');
  assert.equal(app.frames[0].timing.easing, 'cubic-bezier(0.45, 0, 0.2, 1)');
  app.finishRunning();
  await click.done;
  assert.equal(app.document.querySelector('main'), destination.main);
  assert.equal(destination.main.parent, app.document.body);
  assert.equal(destination.input.value, 'initialized');
  assert.equal(initialized, 1);
  assert.equal(overlay.hidden, true);
  assert.deepEqual(app.reloads, []);
  assert.equal(app.navigations.length, 1);
});

test('home collapses before the real document swap and intermediate pages share one sweep', async () => {
  const app = setup();
  const click = app.click('https://iweti.com/contact');
  await flush();
  assert.equal(app.frames.length, 2);
  assert.equal(app.navigations.length, 0);
  app.finishRunning();
  await flush();
  assert.equal(app.navigations.length, 1);
  assert.equal(app.frames.length, 3);
  assert.equal(app.frames[2].keyframes[1].transform, 'translateX(-3000px)');
  app.finishRunning();
  await click.done;
  assert.deepEqual(app.reloads, []);
});

test('home waits for its portfolio images before collapsing the hero', async () => {
  const app = setup();
  let ready;
  const image = app.document.createElement('img');
  const decoded = new Promise((resolve) => {
    ready = resolve;
  });
  image.decode = () => decoded;
  app.initial.main.append(image);
  const click = app.click('https://iweti.com/contact');
  await flush();
  assert.equal(image.loading, 'eager');
  assert.equal(app.frames.length, 0);
  ready();
  await flush();
  assert.equal(app.frames.length, 2);
  app.finishRunning();
  await flush();
  app.finishRunning();
  await click.done;
});

test('the source preview stays hidden until its cloned images are decoded', async () => {
  const app = setup({ path: '/portifolios' });
  let ready;
  const decoded = new Promise((resolve) => {
    ready = resolve;
  });
  const image = app.document.createElement('img');
  image.decode = () => decoded;
  app.initial.main.append(image);
  const click = app.click('https://iweti.com/contact');
  await flush();
  const overlay = app.document.querySelector('[data-page-journey]');
  assert.ok(overlay.querySelector('img'));
  assert.equal(overlay.hidden, true);
  assert.equal(app.navigations.length, 0);
  ready();
  await flush();
  assert.equal(overlay.hidden, false);
  assert.equal(app.navigations.length, 1);
  app.finishRunning();
  await click.done;
});

test('queued animation frames cannot move the indicator back after a journey finishes', async () => {
  for (const [from, to] of [
    ['/portifolios', '/contact'],
    ['/contact', '/portifolios'],
  ]) {
    const app = setup({ path: from });
    const click = app.click(`https://iweti.com${to}`);
    await flush();
    app.callbacks.shift()();
    const activeLinks = () =>
      app.document
        .querySelectorAll('.nav-links a, .header-page-indicator a')
        .filter((link) => link.getAttribute('aria-current') === 'page')
        .map((link) => new URL(link.href).pathname);
    assert.deepEqual(activeLinks(), ['/about', '/about']);
    app.finishRunning();
    await click.done;
    assert.deepEqual(activeLinks(), [to, to]);
    app.callbacks.splice(0).forEach((callback) => callback());
    assert.deepEqual(activeLinks(), [to, to]);
  }
});

test('adjacent arrival at home waits for the lateral transition before expanding', async () => {
  const app = setup({ path: '/portifolios', holdNative: true });
  const click = app.click('https://iweti.com/');
  await flush();
  assert.equal(app.frames.length, 0);
  assert.equal(app.document.querySelector('.site-header').style.height, '80px');
  app.finishNative();
  await flush();
  assert.equal(app.frames.length, 2);
  assert.equal(app.frames[0].keyframes[1].height, '680px');
  app.finishRunning();
  await click.done;
  assert.deepEqual(app.reloads, []);
});

test('distant reverse journey reveals the live home then expands its actual hero', async () => {
  const app = setup({ path: '/contact' });
  const click = app.click('https://iweti.com/');
  await flush();
  assert.deepEqual(app.requests, ['/about', '/portifolios']);
  assert.equal(app.frames[0].keyframes[0].transform, 'translateX(-3000px)');
  const hero = app.destinations[0].hero;
  app.finishRunning();
  await flush();
  assert.equal(app.frames.length, 3);
  assert.equal(app.document.querySelector('.hero'), hero);
  assert.equal(app.document.querySelector('[data-page-journey]').hidden, true);
  app.finishRunning();
  await click.done;
  assert.equal(app.document.querySelector('main'), app.destinations[0].main);
});

test('the incoming header keeps the departure indicator before its first layout', async () => {
  for (const [from, to] of [
    ['/contact', '/'],
    ['/portifolios', '/contact'],
  ]) {
    const app = setup({ path: from, holdNative: true });
    const incoming = [];
    app.document.addEventListener('astro:before-swap', (event) => {
      incoming.push(
        event.newDocument
          .querySelectorAll('.nav-links a, .header-page-indicator a')
          .filter((link) => link.getAttribute('aria-current') === 'page')
          .map((link) => new URL(link.href).pathname),
      );
    });
    const click = app.click(`https://iweti.com${to}`);
    await flush();
    assert.deepEqual(incoming, [[from, from]]);
    app.finishNative();
    await flush();
    app.finishRunning();
    await flush();
    app.finishRunning();
    await click.done;
    const active = app.document
      .querySelectorAll('.header-page-indicator a')
      .find((link) => link.getAttribute('aria-current') === 'page');
    assert.equal(new URL(active.href).pathname, to);
  }
});

test('failed previews still use a direct client navigation instead of a second document load', async () => {
  const app = setup({ path: '/contact', fetchFails: true });
  const click = app.click('https://iweti.com/');
  await flush();
  app.finishRunning();
  await click.done;
  assert.equal(app.navigations.length, 1);
  assert.equal(app.navigations[0].options.info.journey, false);
  assert.deepEqual(app.reloads, []);
});

test('modified, external, same-page, reduced-motion and unsupported navigation are not intercepted', async () => {
  for (const [configuration, url, options] of [
    [{ reduced: true }, 'https://iweti.com/contact', {}],
    [{ supported: false }, 'https://iweti.com/contact', {}],
    [{}, 'https://example.com/contact', {}],
    [{}, 'https://iweti.com/#solucoes', {}],
    [{}, 'https://iweti.com/contact', { target: '_blank' }],
    [{}, 'https://iweti.com/contact', { download: true }],
    [{}, 'https://iweti.com/contact', { event: { ctrlKey: true } }],
  ]) {
    const app = setup(configuration);
    const click = app.click(url, options);
    await click.done;
    assert.equal(click.event.defaultPrevented, false);
    assert.equal(app.navigations.length, 0);
  }
});

test('repeated clicks do not create competing transitions', async () => {
  const app = setup({ path: '/portifolios' });
  const first = app.click('https://iweti.com/contact');
  const second = app.click('https://iweti.com/about');
  await second.done;
  await flush();
  assert.equal(app.navigations.length, 1);
  app.finishRunning();
  await first.done;
});

test('page initializers clean their global events before swapping and reconnect on each page load', () => {
  const listeners = new Map();
  const lifecycle = ts.transpile(
    readFileSync(new URL('../src/lib/page-lifecycle.ts', import.meta.url), 'utf8'),
    { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.CommonJS },
  );
  const exports = {};
  vm.runInNewContext(lifecycle, {
    exports,
    AbortController,
    document: { addEventListener: (name, callback) => listeners.set(name, callback) },
  });
  const signals = [];
  let disposed = 0;
  exports.onPageLoad((signal) => {
    signals.push(signal);
    return () => {
      disposed++;
    };
  });
  listeners.get('astro:page-load')();
  assert.equal(signals[0].aborted, false);
  listeners.get('astro:before-swap')();
  assert.equal(signals[0].aborted, true);
  listeners.get('astro:page-load')();
  assert.equal(signals.length, 2);
  assert.equal(signals[1].aborted, false);
  assert.equal(disposed, 1);
});
