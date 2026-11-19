import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function mount() {
  const listeners = {};
  function element() {
    const classes = new Set();
    const attrs = {};
    const events = {};
    return {
      events,
      attrs,
      classList: {
        add: (c) => classes.add(c),
        remove: (c) => classes.delete(c),
        toggle(c, force) {
          const on = force ?? !classes.has(c);
          on ? classes.add(c) : classes.delete(c);
          return on;
        },
        contains: (c) => classes.has(c),
      },
      setAttribute: (k, v) => (attrs[k] = v),
      getAttribute: (k) => attrs[k],
      addEventListener: (k, fn) => (events[k] = fn),
      contains: () => false,
      offsetHeight: 90,
    };
  }
  const header = element(),
    button = element(),
    menu = element(),
    link = element();
  menu.querySelectorAll = () => [link];
  const root = { dataset: { navigationState: 'idle' } };
  const win = { scrollY: 0, addEventListener: (k, fn) => (listeners[k] = fn) };
  const doc = {
    documentElement: root,
    querySelector: (s) =>
      s === '.site-nav' ? header : s.startsWith('.menu-toggle') ? button : menu,
    addEventListener: (k, fn) => (listeners[k] = fn),
  };
  const source = ts.transpile(
    readFileSync(new URL('../src/scripts/navigation.ts', import.meta.url), 'utf8').replace(
      /^import .*;\n/,
      '',
    ),
  );
  vm.runInNewContext(source, {
    document: doc,
    window: win,
    onPageLoad: (fn) => fn(new AbortController().signal),
  });
  return { header, button, menu, link, root, win, listeners };
}
test('mobile menu toggles and closes on link activation and Escape', () => {
  const a = mount();
  a.button.events.click();
  assert.equal(a.button.attrs['aria-expanded'], 'true');
  assert.equal(a.menu.classList.contains('open'), true);
  a.link.events.click();
  assert.equal(a.button.attrs['aria-expanded'], 'false');
  a.button.events.click();
  a.listeners.keydown({ key: 'Escape' });
  assert.equal(a.menu.classList.contains('open'), false);
});
test('scroll hide is suspended throughout dragging and animation', () => {
  const a = mount();
  a.win.scrollY = 500;
  a.listeners.scroll();
  assert.equal(a.header.classList.contains('is-scroll-hidden'), true);
  for (const state of ['dragging', 'preparing', 'animating']) {
    a.root.dataset.navigationState = state;
    a.win.scrollY += 100;
    a.listeners.scroll();
    assert.equal(a.header.classList.contains('is-scroll-hidden'), false);
  }
});
