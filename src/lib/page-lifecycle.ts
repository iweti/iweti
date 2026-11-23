/** Reconnect page behavior after an Astro navigation and dispose global listeners on departure. */
export function onPageLoad(setup: (signal: AbortSignal) => void | (() => void)) {
  let dispose: (() => void) | undefined;
  const cleanup = () => {
    dispose?.();
    dispose = undefined;
  };
  document.addEventListener('astro:before-swap', cleanup);
  document.addEventListener('astro:page-load', () => {
    cleanup();
    const controller = new AbortController();
    const teardown = setup(controller.signal);
    dispose = () => {
      controller.abort();
      teardown?.();
    };
  });
}
