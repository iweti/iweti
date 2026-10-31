const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const portfolioLightbox = document.querySelector<HTMLDialogElement>('.portfolio-lightbox');
const lightboxImage = portfolioLightbox?.querySelector<HTMLImageElement>(
  '.portfolio-lightbox-image',
);
const lightboxImageBackground = portfolioLightbox?.querySelector<HTMLImageElement>(
  '.portfolio-lightbox-image-background',
);
const lightboxCategory = portfolioLightbox?.querySelector('.portfolio-lightbox-category');
const lightboxTitle = portfolioLightbox?.querySelector('.portfolio-lightbox-title');
const lightboxDescription = portfolioLightbox?.querySelector('.portfolio-lightbox-description');
const lightboxLink = portfolioLightbox?.querySelector<HTMLAnchorElement>(
  '.portfolio-lightbox-link',
);
const portfolioLightboxClose = portfolioLightbox?.querySelector('.portfolio-lightbox-close');
const portfolioLightboxPrev = portfolioLightbox?.querySelector('.portfolio-lightbox-prev');
const portfolioLightboxNext = portfolioLightbox?.querySelector('.portfolio-lightbox-next');
let sharedSlideIndex = 0;
interface PortfolioGallery {
  card: HTMLElement;
  gallery: HTMLElement;
  showSlide: (index: number) => void;
  slides: HTMLImageElement[];
  readonly activeIndex: number;
}

let lightboxGallery: PortfolioGallery | undefined;
let lightboxSlideIndex = 0;
let lightboxTransitionTimeout: number | undefined;

const portfolioGalleries = Array.from(
  document.querySelectorAll<HTMLElement>('.portfolio-card-gallery'),
).map((gallery) => {
  const slides = Array.from(gallery.querySelectorAll('img'));
  const card = gallery.closest<HTMLElement>('.portfolio-card');

  if (slides.length === 0 || !card) return null;

  let activeIndex = Math.max(
    slides.findIndex((slide) => slide.classList.contains('is-active')),
    0,
  );

  const showSlide = (index: number) => {
    slides[activeIndex].classList.remove('is-active');
    slides[activeIndex].setAttribute('aria-hidden', 'true');
    activeIndex = (index + slides.length) % slides.length;
    slides[activeIndex].classList.add('is-active');
    slides[activeIndex].setAttribute('aria-hidden', 'false');
  };

  slides.forEach((slide, index) => {
    slide.classList.toggle('is-active', index === activeIndex);
    slide.setAttribute('aria-hidden', String(index !== activeIndex));
  });

  const syncToSharedSlide = () => {
    if (card.matches(':hover')) return;
    showSlide(sharedSlideIndex);
  };

  gallery.querySelector('.portfolio-gallery-prev')?.addEventListener('click', (event) => {
    showSlide(activeIndex - 1);
    if (
      event instanceof MouseEvent &&
      event.detail > 0 &&
      event.currentTarget instanceof HTMLElement
    )
      event.currentTarget.blur();
  });
  gallery.querySelector('.portfolio-gallery-next')?.addEventListener('click', (event) => {
    showSlide(activeIndex + 1);
    if (
      event instanceof MouseEvent &&
      event.detail > 0 &&
      event.currentTarget instanceof HTMLElement
    )
      event.currentTarget.blur();
  });
  card.addEventListener('mouseleave', syncToSharedSlide);
  card.addEventListener('focusout', (event) => {
    if (!(event.relatedTarget instanceof Node) || !card.contains(event.relatedTarget))
      syncToSharedSlide();
  });

  const portfolioGallery = {
    card,
    gallery,
    showSlide,
    slides,
    get activeIndex() {
      return activeIndex;
    },
  };

  if (portfolioLightbox && lightboxImage) {
    card.addEventListener('click', (event) => {
      const isTouchInteraction =
        (event instanceof PointerEvent && event.pointerType === 'touch') ||
        window.matchMedia('(hover: none)').matches;
      const clickedControl = event.target instanceof Element && event.target.closest('a, button');

      if (!isTouchInteraction || clickedControl || portfolioLightbox.open) return;

      lightboxGallery = portfolioGallery;
      lightboxSlideIndex = activeIndex;
      updateLightboxImage();
      portfolioLightbox.showModal();
    });
  }

  return portfolioGallery;
});

const activePortfolioGalleries = portfolioGalleries.filter(
  (gallery): gallery is PortfolioGallery => gallery !== null,
);
const maxPortfolioSlides = Math.max(
  0,
  ...activePortfolioGalleries.map(({ slides }) => slides.length),
);

function updateLightboxImage() {
  if (!lightboxGallery || !lightboxImage) return;

  const slide = lightboxGallery.slides[lightboxSlideIndex];
  const imageSource = slide.currentSrc || slide.src;
  lightboxImage.src = imageSource;
  lightboxImage.alt = slide.alt;
  if (lightboxImageBackground) lightboxImageBackground.src = imageSource;

  const cardContent = lightboxGallery.card.querySelector('.portfolio-card-content');
  if (!cardContent) return;

  if (lightboxCategory) {
    lightboxCategory.textContent = cardContent.querySelector('span')?.textContent?.trim() ?? '';
  }
  if (lightboxTitle) {
    lightboxTitle.textContent = cardContent.querySelector('h2')?.textContent?.trim() ?? '';
  }
  if (lightboxDescription) {
    lightboxDescription.textContent = cardContent.querySelector('p')?.textContent?.trim() ?? '';
  }
  if (lightboxLink) {
    const projectLink = cardContent.querySelector('a');
    lightboxLink.href = projectLink?.href ?? '#';
    lightboxLink.textContent = projectLink?.textContent?.trim() ?? 'Acessar projeto →';
    lightboxLink.hidden = !projectLink;
  }
}

const changeLightboxSlide = (direction: number) => {
  if (!lightboxGallery) return;

  lightboxSlideIndex =
    (lightboxSlideIndex + direction + lightboxGallery.slides.length) %
    lightboxGallery.slides.length;

  if (prefersReducedMotion || !lightboxImage) {
    updateLightboxImage();
    return;
  }

  window.clearTimeout(lightboxTransitionTimeout);
  lightboxImage.classList.add('is-changing');
  lightboxTransitionTimeout = window.setTimeout(() => {
    updateLightboxImage();
    window.setTimeout(() => lightboxImage.classList.remove('is-changing'), 20);
  }, 180);
};

portfolioLightboxPrev?.addEventListener('click', () => changeLightboxSlide(-1));
portfolioLightboxNext?.addEventListener('click', () => changeLightboxSlide(1));
portfolioLightboxClose?.addEventListener('click', () => portfolioLightbox?.close());
portfolioLightbox?.addEventListener('click', (event) => {
  if (event.target === portfolioLightbox) portfolioLightbox.close();
});
portfolioLightbox?.addEventListener('close', () => {
  if (!lightboxGallery) return;

  sharedSlideIndex = lightboxSlideIndex;
  activePortfolioGalleries.forEach(({ showSlide }) => showSlide(sharedSlideIndex));
  lightboxGallery = undefined;
});

const externalSiteConfirmation = document.querySelector<HTMLDialogElement>(
  '.external-site-confirmation',
);
const externalSiteUrl = externalSiteConfirmation?.querySelector('.external-site-url');
const externalSiteConfirm =
  externalSiteConfirmation?.querySelector<HTMLAnchorElement>('.external-site-confirm');
const externalSiteCancel = externalSiteConfirmation?.querySelector('.external-site-cancel');

if (
  externalSiteConfirmation instanceof HTMLDialogElement &&
  externalSiteUrl instanceof HTMLElement &&
  externalSiteConfirm instanceof HTMLAnchorElement
) {
  document
    .querySelectorAll<HTMLAnchorElement>('.portfolio-card-content a, .portfolio-lightbox-link')
    .forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        const destination = new URL(link.href, window.location.href);
        externalSiteUrl.textContent = destination.hostname;
        externalSiteConfirm.href = destination.href;
        externalSiteConfirmation.showModal();
      });
    });

  externalSiteCancel?.addEventListener('click', () => externalSiteConfirmation.close());
  externalSiteConfirmation.addEventListener('click', (event) => {
    if (event.target === externalSiteConfirmation) externalSiteConfirmation.close();
  });
  externalSiteConfirm.addEventListener('click', () => externalSiteConfirmation.close());
}

if (!prefersReducedMotion && maxPortfolioSlides > 1) {
  window.setInterval(() => {
    if (portfolioLightbox?.open) return;

    sharedSlideIndex = (sharedSlideIndex + 1) % maxPortfolioSlides;
    activePortfolioGalleries.forEach(({ card, showSlide }) => {
      if (!card.matches(':hover, :focus-within')) showSlide(sharedSlideIndex);
    });
  }, 4000);
}

export {};
