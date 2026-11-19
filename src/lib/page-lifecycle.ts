/** Mount each behavior once for the persistent document. */
export function onPageLoad(setup: (signal: AbortSignal) => void | (() => void)) {
  const mount = () => {
    const controller = new AbortController();
    const teardown = setup(controller.signal);
    window.addEventListener(
      'pagehide',
      (event) => {
        if (event.persisted) return;
        controller.abort();
        teardown?.();
      },
      { once: true },
    );
  };
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
}
