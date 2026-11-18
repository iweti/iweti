import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { randomUUID } from 'node:crypto';
const source = readFileSync(new URL('../src/scripts/page-transitions.js', import.meta.url), 'utf8');
export function setup(path = '/', reduced = false) {
  const events = {},
    timers = [];
  class Element {
    constructor(route) {
      this.dataset = { panel: route, title: route, description: route };
      this.hidden = route !== path;
      this.style = {
        removeProperty(name) {
          delete this[name];
        },
      };
      this.classList = { remove() {}, add() {} };
      this.attributes = {};
      this.inert = this.hidden;
    }
    setAttribute(k, v) {
      this.attributes[k] = v;
    }
    getAttribute(k) {
      return this.attributes[k];
    }
    removeAttribute(k) {
      delete this.attributes[k];
    }
    querySelector() {
      return null;
    }
    closest(selector) {
      return selector === '[data-panel]' ? this : null;
    }
    animate(frames, options) {
      this.lastAnimation = { frames, options };
      return { cancel() {}, finished: new Promise(() => {}) };
    }
    setPointerCapture(id) {
      this.captured = id;
    }
    hasPointerCapture(id) {
      return this.captured === id;
    }
    releasePointerCapture(id) {
      if (this.captured !== id) return;
      this.captured = undefined;
      events.lostpointercapture?.({ pointerId: id });
    }
  }
  const panels = ['/', '/portifolios', '/about', '/contact', '/privacy'].map((r) => new Element(r));
  const location = new URL('http://localhost' + path);
  const entries = [{ url: location.href, state: {} }];
  let index = 0;
  let currentScroll = 0;
  const history = {
    replaceCalls: 0,
    get state() {
      return entries[index].state;
    },
    get length() {
      return entries.length;
    },
    pushState(data, _, url) {
      const href = new URL(url, location).href;
      entries.splice(++index);
      entries.push({ url: href, state: structuredClone(data) });
      location.href = href;
    },
    replaceState(data) {
      this.replaceCalls++;
      entries[index].state = structuredClone(data);
    },
    back() {
      if (index > 0) {
        location.href = entries[--index].url;
        events.popstate();
      }
    },
    forward() {
      if (index + 1 < entries.length) {
        location.href = entries[++index].url;
        events.popstate();
      }
    },
  };
  const root = { dataset: {} };
  const document = {
    documentElement: root,
    readyState: 'complete',
    querySelectorAll: (s) => (s === '[data-panel]' ? panels : []),
    querySelector: (s) => (s === 'meta[name="description"]' ? {} : null),
    addEventListener(n, cb) {
      events[n] = cb;
    },
    dispatchEvent() {},
  };
  const window = {
    addEventListener(n, cb) {
      events[n] = cb;
    },
    getSelection: () => null,
    scrollTo({ top }) {
      currentScroll = top;
    },
  };
  vm.runInNewContext(source, {
    document,
    window,
    location,
    history,
    Element,
    HTMLElement: Element,
    URL,
    Event,
    CSS: { escape: (x) => x },
    matchMedia: () => ({ matches: reduced, addEventListener() {} }),
    innerWidth: 1000,
    get scrollY() {
      return currentScroll;
    },
    crypto: { randomUUID },
    performance: { now: () => 100 },
    getComputedStyle: () => ({ overflowX: 'visible' }),
    setTimeout: (cb) => (timers.push(cb), timers.length),
    clearTimeout: (id) => {
      timers[id - 1] = null;
    },
  });
  const fire = (name, values = {}) => {
    const event = {
      target: panels.find((p) => !p.hidden),
      button: 0,
      isPrimary: true,
      pointerId: 1,
      clientX: 700,
      clientY: 300,
      preventDefault() {
        this.prevented = true;
      },
      ...values,
    };
    events[name]?.(event);
    return event;
  };
  return {
    panels,
    root,
    fire,
    history,
    location,
    events,
    scrollTo(top) {
      currentScroll = top;
      events.scroll?.();
    },
    get scrollY() {
      return currentScroll;
    },
    finish() {
      const queued = timers.splice(0);
      queued.forEach((cb) => cb?.());
    },
  };
}
test('drag follows the pointer and confirmation activates the same mounted panel', () => {
  const a = setup();
  const original = a.panels[1];
  a.fire('pointerdown');
  a.fire('pointermove', { clientX: 400 });
  assert.equal(a.root.dataset.navigationState, 'dragging');
  assert.equal(a.panels[0].style.transform, 'translateX(-300px)');
  a.fire('pointerup', { clientX: 400 });
  assert.equal(a.root.dataset.navigationState, 'animating');
  a.finish();
  assert.equal(original.hidden, false);
  assert.equal(a.location.pathname, '/portifolios');
  assert.equal(a.panels[0].inert, true);
});
test('short drag cancels in 280ms', () => {
  const a = setup();
  a.fire('pointerdown');
  a.fire('pointermove', { clientX: 680 });
  a.fire('pointerup');
  assert.equal(a.panels[0].lastAnimation.options.duration, 280);
  a.finish();
  assert.equal(a.location.pathname, '/');
  assert.equal(a.panels[1].hidden, true);
});
test('vertical intention preserves vertical scrolling', () => {
  const a = setup();
  a.fire('pointerdown');
  const e = a.fire('pointermove', { clientX: 695, clientY: 350 });
  assert.equal(e.prevented, undefined);
  assert.equal(a.root.dataset.navigationState, 'idle');
});
test('horizontal extremities and privacy are blocked', () => {
  for (const path of ['/', '/contact', '/privacy']) {
    const a = setup(path);
    a.fire('pointerdown');
    a.fire('pointermove', { clientX: path === '/' ? 900 : 200 });
    assert.equal(a.root.dataset.navigationState, 'idle');
  }
});
test('reduced motion commits immediately and pointercancel never commits', () => {
  const a = setup('/', true);
  a.fire('pointerdown');
  a.fire('pointermove', { clientX: 300 });
  a.fire('pointerup');
  assert.equal(a.location.pathname, '/portifolios');
  assert.equal(a.root.dataset.navigationState, 'idle');
  const b = setup();
  b.fire('pointerdown');
  b.fire('pointermove', { clientX: 300 });
  b.fire('pointercancel');
  b.finish();
  assert.equal(b.location.pathname, '/');
});
test('popstate cancels pending animation and reconciles the URL', () => {
  const a = setup();
  a.fire('pointerdown');
  a.fire('pointermove', { clientX: 300 });
  a.fire('pointerup');
  a.location.pathname = '/about';
  a.location.href = 'http://localhost/about';
  a.events.popstate();
  a.finish();
  assert.equal(a.root.dataset.navigationState, 'idle');
  assert.equal(a.panels[2].hidden, false);
  assert.equal(a.panels[1].hidden, true);
});
test('interactive controls and selection exclusions do not start a drag', () => {
  const a = setup();
  const control = { closest: () => true };
  a.fire('pointerdown', { target: control });
  a.fire('pointermove', { clientX: 200 });
  assert.equal(a.root.dataset.navigationState, 'idle');
});

for (const interruption of ['blur', 'lostpointercapture']) {
  test(interruption + ' cancels an unfinished drag without creating a history entry', () => {
    const a = setup();
    a.fire('pointerdown');
    a.fire('pointermove', { clientX: 300 });
    assert.equal(a.root.dataset.navigationState, 'dragging');
    a.fire(interruption);
    a.finish();
    assert.equal(a.root.dataset.navigationState, 'idle');
    assert.equal(a.history.length, 1);
    assert.equal(a.location.pathname, '/');
    assert.ok(a.panels.every((panel) => panel.style.transform === undefined));
    assert.equal(a.panels[1].hidden, true);
  });
}
test('normal capture release does not cancel a confirmed pointerup', () => {
  const a = setup();
  a.fire('pointerdown');
  a.fire('pointermove', { clientX: 300 });
  a.fire('pointerup');
  a.finish();
  assert.equal(a.location.pathname, '/portifolios');
  assert.equal(a.history.length, 2);
  assert.equal(a.root.dataset.navigationState, 'idle');
});
test('new scroll after back survives forward and back, even before persistence timer fires', () => {
  const a = setup('/', true);
  a.scrollTo(200);
  a.fire('pointerdown');
  a.fire('pointermove', { clientX: 300 });
  a.fire('pointerup');
  assert.equal(a.location.pathname, '/portifolios');
  a.history.back();
  assert.equal(a.scrollY, 200);
  a.scrollTo(640);
  a.history.forward();
  a.finish();
  assert.equal(a.scrollY, 0);
  a.history.back();
  assert.equal(a.scrollY, 640);
  assert.equal(a.location.pathname, '/');
});

test('scroll events coalesce history writes and persist the latest position', () => {
  const a = setup();
  const initialWrites = a.history.replaceCalls;
  for (let top = 10; top <= 300; top += 10) a.scrollTo(top);
  assert.equal(a.history.replaceCalls, initialWrites);
  a.finish();
  assert.equal(a.history.replaceCalls, initialWrites + 1);
  assert.equal(a.history.state.panelScroll, 300);
  a.scrollTo(300);
  a.finish();
  assert.equal(a.history.replaceCalls, initialWrites + 1);
});
test('capture loss from a different pointer leaves the active drag intact', () => {
  const a = setup();
  a.fire('pointerdown');
  a.fire('pointermove', { clientX: 300 });
  a.fire('lostpointercapture', { pointerId: 2 });
  assert.equal(a.root.dataset.navigationState, 'dragging');
  a.fire('pointercancel');
  a.finish();
  assert.equal(a.root.dataset.navigationState, 'idle');
  assert.equal(a.history.length, 1);
});
