const lightbox = document.querySelector<HTMLDialogElement>('.portfolio-lightbox');
const lightboxImage = lightbox?.querySelector<HTMLImageElement>('.portfolio-lightbox-image');
const lightboxBackground = lightbox?.querySelector<HTMLImageElement>(
  '.portfolio-lightbox-image-background',
);
let changeLightboxView: ((direction: number) => void) | undefined;

document.querySelectorAll<HTMLElement>('.project-entry').forEach((project) => {
  const viewButtons = Array.from(project.querySelectorAll<HTMLButtonElement>('[data-view]'));
  const images = Array.from(project.querySelectorAll<HTMLImageElement>('img[data-original]'));
  let viewIndex = 0;

  const updateLightbox = () => {
    const image = images[viewIndex];
    if (!lightbox || !lightboxImage || !image) return;
    lightboxImage.src = image.src;
    lightboxImage.alt = image.alt;
    if (lightboxBackground) lightboxBackground.src = image.src;
    const values = {
      '.portfolio-lightbox-category': 'Site institucional',
      '.portfolio-lightbox-title': project.dataset.projectName ?? '',
      '.portfolio-lightbox-description':
        project.querySelector('.project-description p')?.textContent ?? '',
    };
    Object.entries(values).forEach(([selector, text]) => {
      const element = lightbox.querySelector(selector);
      if (element) element.textContent = text;
    });
    const link = lightbox.querySelector<HTMLAnchorElement>('.portfolio-lightbox-link');
    const source = project.querySelector<HTMLAnchorElement>('.project-link');
    if (link && source) link.href = source.href;
  };

  const showView = (index: number) => {
    viewIndex = (index + images.length) % images.length;
    project.querySelectorAll<HTMLElement>('[data-view-image]').forEach((view, index) => {
      view.hidden = index !== viewIndex;
    });
    viewButtons.forEach((button, index) =>
      button.setAttribute('aria-pressed', String(index === viewIndex)),
    );
    if (lightbox?.open) updateLightbox();
  };

  viewButtons.forEach((button, index) => button.addEventListener('click', () => showView(index)));
  project.querySelector('.project-expand')?.addEventListener('click', () => {
    updateLightbox();
    changeLightboxView = (direction) => showView(viewIndex + direction);
    lightbox?.showModal();
  });
});

lightbox
  ?.querySelector('.portfolio-lightbox-close')
  ?.addEventListener('click', () => lightbox.close());
lightbox
  ?.querySelector('.portfolio-lightbox-prev')
  ?.addEventListener('click', () => changeLightboxView?.(-1));
lightbox
  ?.querySelector('.portfolio-lightbox-next')
  ?.addEventListener('click', () => changeLightboxView?.(1));
lightbox?.addEventListener('click', (event) => {
  if (event.target === lightbox) lightbox.close();
});
lightbox?.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft') changeLightboxView?.(-1);
  if (event.key === 'ArrowRight') changeLightboxView?.(1);
});

const confirmation = document.querySelector<HTMLDialogElement>('.external-site-confirmation');
const externalUrl = confirmation?.querySelector('.external-site-url');
const externalConfirm = confirmation?.querySelector<HTMLAnchorElement>('.external-site-confirm');
if (confirmation && externalUrl && externalConfirm) {
  document
    .querySelectorAll<HTMLAnchorElement>('.project-link, .portfolio-lightbox-link')
    .forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        const destination = new URL(link.href);
        externalUrl.textContent = destination.hostname;
        externalConfirm.href = destination.href;
        confirmation.showModal();
      });
    });
  confirmation
    .querySelector('.external-site-cancel')
    ?.addEventListener('click', () => confirmation.close());
  confirmation.addEventListener('click', (event) => {
    if (event.target === confirmation) confirmation.close();
  });
  externalConfirm.addEventListener('click', () => confirmation.close());
}

export {};
