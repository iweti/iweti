import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const transition = readFileSync(
  new URL('../src/scripts/page-transitions.js', import.meta.url),
  'utf8',
);

function swap(from, to, paths = ['/', '/about', '/portifolios', '/blog', '/contact']) {
  const dataset = {};
  vm.runInNewContext(transition, {
    document: {
      querySelectorAll(selector) {
        assert.equal(selector, '.header-page-indicator a');
        return paths.map((pathname) => ({ pathname }));
      },
      addEventListener(name, callback) {
        assert.equal(name, 'astro:before-swap');
        callback({
          from: new URL(from, 'https://iweti.com'),
          to: new URL(to, 'https://iweti.com'),
          newDocument: { documentElement: { dataset } },
        });
      },
    },
  });
  return dataset.pageDirection;
}

test('uses one lateral transition for any destination in the indicator', () => {
  assert.equal(swap('/', '/about'), 'forward');
  assert.equal(swap('/', '/contact'), 'forward');
  assert.equal(swap('/contact', '/'), 'backward');
  assert.equal(swap('/portifolios', '/blog/'), 'forward');
  assert.equal(swap('/about/', '/#portfolio'), 'backward');
});

test('uses the rendered indicator order for the direction', () => {
  assert.equal(swap('/blog', '/about', ['/', '/blog', '/about']), 'forward');
});

test('leaves anchor changes and routes outside the indicator to Astro', () => {
  assert.equal(swap('/', '/#solucoes'), undefined);
  assert.equal(swap('/blog/', '/blog/post'), undefined);
  assert.equal(swap('/privacy', '/contact'), undefined);
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
