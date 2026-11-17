import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = ts.transpile(
  readFileSync(new URL('../src/scripts/navigation.ts', import.meta.url), 'utf8').replace(
    /^import .*;\n/,
    '',
  ),
);

function setup(path = '/about', mobile = true) {
  const handlers = {};
  const clicks = [];
  class Element {
    closest() {
      return null;
    }
  }
  const target = new Element();
  const links = ['/', '/portifolios', '/about', '/contact'].map((pathname) => ({
    pathname,
    click: () => clicks.push(pathname),
  }));
  vm.runInNewContext(source, {
    onPageLoad: (fn) => fn({}),
    document: {
      querySelector: () => null,
      querySelectorAll: () => links,
      addEventListener: (name, fn) => {
        handlers[name] = fn;
      },
    },
    window: { matchMedia: () => ({ matches: mobile }), innerWidth: 390, getSelection: () => '' },
    location: { pathname: path },
    performance: { now: () => 0 },
    getComputedStyle: () => ({ overflowX: 'visible' }),
    Element,
  });
  function gesture(x, endX, y = 0, moveY = y) {
    const touch = (clientX, clientY) => ({ clientX, clientY, identifier: 1 });
    handlers.touchstart({ target, touches: [touch(x, 200)] });
    handlers.touchmove({ touches: [touch(endX, 200 + moveY)] });
    handlers.touchend({ touches: [], changedTouches: [touch(endX, 200 + y)] });
  }
  return { gesture, clicks, target, handlers };
}

test('swipes advance and return through adjacent pages', () => {
  const app = setup();
  app.gesture(280, 100);
  app.gesture(100, 280);
  assert.deepEqual(app.clicks, ['/contact', '/portifolios']);
});

test('swipes stop at the first and last page and ignore unsupported routes', () => {
  for (const [path, start, end] of [
    ['/', 100, 280],
    ['/contact', 280, 100],
    ['/privacy', 280, 100],
  ]) {
    const app = setup(path);
    app.gesture(start, end);
    assert.deepEqual(app.clicks, []);
  }
});

test('scrolling, short gestures, screen edges and desktop do not navigate', () => {
  const app = setup();
  app.gesture(280, 100, 80);
  app.gesture(200, 170);
  app.gesture(10, 200);
  app.gesture(280, 100, 0, 80);
  assert.deepEqual(app.clicks, []);
  const desktop = setup('/about', false);
  desktop.gesture(280, 100);
  assert.deepEqual(desktop.clicks, []);
});

test('interactive areas and cancelled touches do not navigate', () => {
  const app = setup();
  app.target.closest = () => ({});
  app.gesture(280, 100);
  assert.deepEqual(app.clicks, []);
  app.target.closest = () => null;
  app.handlers.touchstart({
    target: app.target,
    touches: [{ clientX: 280, clientY: 200, identifier: 1 }],
  });
  app.handlers.touchcancel();
  app.handlers.touchend({
    touches: [],
    changedTouches: [{ clientX: 100, clientY: 200, identifier: 1 }],
  });
  assert.deepEqual(app.clicks, []);
});
