document.querySelectorAll<HTMLElement>('[data-project-pillars]').forEach((group) => {
  const cards = [...group.querySelectorAll<HTMLElement>('[data-pillar]')];
  const hoverPointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  const activate = (selected: HTMLElement) => {
    const moveFocus = cards.some(
      (card) =>
        card !== selected &&
        card.querySelector('.project-pillar-details')?.contains(document.activeElement),
    );

    cards.forEach((card) => {
      const active = card === selected;
      const trigger = card.querySelector<HTMLButtonElement>('.project-pillar-trigger');
      const details = card.querySelector<HTMLElement>('.project-pillar-details');

      card.classList.toggle('is-active', active);
      trigger?.setAttribute('aria-expanded', String(active));
      details?.setAttribute('aria-hidden', String(!active));
      if (details) details.inert = !active;
    });

    if (moveFocus) selected.querySelector<HTMLButtonElement>('.project-pillar-trigger')?.focus();
  };

  cards.forEach((card) => {
    card.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'mouse' && hoverPointer.matches) activate(card);
    });
    card.addEventListener('focusin', () => {
      if (!card.classList.contains('is-active')) activate(card);
    });
    card.querySelector('.project-pillar-trigger')?.addEventListener('click', () => activate(card));
  });
});

export {};
