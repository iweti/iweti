const lightbox = document.querySelector<HTMLDialogElement>('.portfolio-lightbox');
const lightboxImage = lightbox?.querySelector<HTMLImageElement>('.portfolio-lightbox-image');
const lightboxBackground = lightbox?.querySelector<HTMLImageElement>(
  '.portfolio-lightbox-image-background',
);
let changeLightboxView: ((direction: number) => void) | undefined;

document.querySelectorAll<HTMLElement>('.project-showcase').forEach((showcase) => {
  const slides = Array.from(showcase.querySelectorAll<HTMLElement>('.project-slide'));
  const projectButtons = Array.from(showcase.querySelectorAll<HTMLButtonElement>('[data-project]'));
  const viewButtons = Array.from(showcase.querySelectorAll<HTMLButtonElement>('[data-view]'));
  let projectIndex = 0;
  let viewIndex = 0;
  const activeImages = () =>
    Array.from(slides[projectIndex].querySelectorAll<HTMLImageElement>('img[data-original]'));

  const updateLightbox = () => {
    const slide = slides[projectIndex];
    const image = activeImages()[viewIndex];
    if (!lightbox || !lightboxImage) return;
    lightboxImage.src = image.src;
    lightboxImage.alt = image.alt;
    if (lightboxBackground) lightboxBackground.src = image.src;
    const values = {
      '.portfolio-lightbox-category': 'Site institucional',
      '.portfolio-lightbox-title': slide.dataset.projectName ?? '',
      '.portfolio-lightbox-description':
        slide.querySelector('.project-description p')?.textContent ?? '',
    };
    Object.entries(values).forEach(([selector, text]) => {
      const element = lightbox.querySelector(selector);
      if (element) element.textContent = text;
    });
    const link = lightbox.querySelector<HTMLAnchorElement>('.portfolio-lightbox-link');
    const source = slide.querySelector<HTMLAnchorElement>('.project-link');
    if (link && source) link.href = source.href;
  };

  const showView = (index: number) => {
    const images = activeImages();
    viewIndex = (index + images.length) % images.length;
    slides[projectIndex]
      .querySelectorAll<HTMLElement>('[data-view-image]')
      .forEach((view, index) => {
        view.hidden = index !== viewIndex;
      });
    viewButtons.forEach((button, index) =>
      button.setAttribute('aria-pressed', String(index === viewIndex)),
    );
    if (lightbox?.open) updateLightbox();
  };

  const showProject = (index: number) => {
    projectIndex = (index + slides.length) % slides.length;
    slides.forEach((slide, index) => {
      slide.hidden = index !== projectIndex;
    });
    projectButtons.forEach((button, index) =>
      button.setAttribute('aria-pressed', String(index === projectIndex)),
    );
    showView(0);
    const counter = showcase.querySelector('.project-count');
    if (counter)
      counter.textContent = `${String(projectIndex + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
    const announcement = showcase.querySelector('.project-announcement');
    if (announcement)
      announcement.textContent = `Projeto ${projectIndex + 1} de ${slides.length}: ${slides[projectIndex].dataset.projectName}`;
  };

  projectButtons.forEach((button, index) =>
    button.addEventListener('click', () => showProject(index)),
  );
  viewButtons.forEach((button, index) => button.addEventListener('click', () => showView(index)));
  showcase.querySelectorAll<HTMLButtonElement>('[data-direction]').forEach((button) => {
    button.addEventListener('click', () =>
      showProject(projectIndex + Number(button.dataset.direction)),
    );
  });
  showcase.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    showProject(projectIndex + (event.key === 'ArrowRight' ? 1 : -1));
  });
  showcase.querySelector('.project-expand')?.addEventListener('click', () => {
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
