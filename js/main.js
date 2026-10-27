const menuButton = document.querySelector(".menu-toggle");
const menu = document.querySelector(".nav-links");

if (menuButton && menu) {
  const closeMenu = () => {
    menu.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
  };

  menuButton.addEventListener("click", () => {
    const isOpen = menu.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
  });

  menu.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });
}

document.querySelectorAll(".service-more").forEach((trigger) => {
  const dialogId = trigger.getAttribute("aria-controls");
  const dialog = dialogId ? document.getElementById(dialogId) : null;

  if (!(dialog instanceof HTMLDialogElement)) {
    console.error(`Janela de detalhes do serviço não encontrada: ${dialogId}`);
    return;
  }

  const closeButton = dialog.querySelector(".service-dialog-close");
  let isClosing = false;
  let closeTimeout;

  const getMorphTransform = (source, target) => {
    const translateX = source.left + source.width / 2 - (target.left + target.width / 2);
    const translateY = source.top + source.height / 2 - (target.top + target.height / 2);
    const scaleX = source.width / target.width;
    const scaleY = source.height / target.height;

    return `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;
  };

  const openDialog = () => {
    if (dialog.open) return;

    const triggerRect = trigger.getBoundingClientRect();

    dialog.style.transition = "none";
    dialog.showModal();

    const dialogRect = dialog.getBoundingClientRect();
    dialog.style.transform = getMorphTransform(triggerRect, dialogRect);
    dialog.style.opacity = "0";
    dialog.style.willChange = "transform, opacity";
    dialog.getBoundingClientRect();
    dialog.style.removeProperty("transition");

    requestAnimationFrame(() => {
      if (!dialog.open) return;
      dialog.style.removeProperty("transform");
      dialog.style.removeProperty("opacity");
    });
  };

  const finishClose = () => {
    window.clearTimeout(closeTimeout);
    dialog.close();
    dialog.style.removeProperty("transform");
    dialog.style.removeProperty("opacity");
    dialog.style.removeProperty("will-change");
    isClosing = false;
  };

  const closeDialog = () => {
    if (!dialog.open || isClosing) return;

    isClosing = true;
    const triggerRect = trigger.getBoundingClientRect();
    const dialogRect = dialog.getBoundingClientRect();
    const duration = getComputedStyle(dialog)
      .transitionDuration.split(",")
      .map((value) => parseFloat(value) * (value.trim().endsWith("ms") ? 1 : 1000))
      .reduce((longest, value) => Math.max(longest, value), 0);

    if (duration === 0) {
      finishClose();
      return;
    }

    dialog.style.willChange = "transform, opacity";
    dialog.style.transform = getMorphTransform(triggerRect, dialogRect);
    dialog.style.opacity = "0";
    closeTimeout = window.setTimeout(finishClose, duration + 50);
  };

  trigger.addEventListener("click", openDialog);
  closeButton?.addEventListener("click", closeDialog);
  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape" && dialog.open) {
        event.preventDefault();
        closeDialog();
      }
    },
    true,
  );
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeDialog();
  });
  dialog.addEventListener("transitionend", (event) => {
    if (isClosing && event.target === dialog && event.propertyName === "transform") {
      finishClose();
    }
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeDialog();
  });
});

const revealElements = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12 },
  );

  revealElements.forEach((element) => observer.observe(element));
} else {
  revealElements.forEach((element) => element.classList.add("visible"));
}

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const portfolioLightbox = document.querySelector(".portfolio-lightbox");
const lightboxImage = portfolioLightbox?.querySelector(".portfolio-lightbox-image");
const lightboxImageBackground = portfolioLightbox?.querySelector(
  ".portfolio-lightbox-image-background",
);
const lightboxCategory = portfolioLightbox?.querySelector(".portfolio-lightbox-category");
const lightboxTitle = portfolioLightbox?.querySelector(".portfolio-lightbox-title");
const lightboxDescription = portfolioLightbox?.querySelector(".portfolio-lightbox-description");
const lightboxLink = portfolioLightbox?.querySelector(".portfolio-lightbox-link");
const portfolioLightboxClose = portfolioLightbox?.querySelector(".portfolio-lightbox-close");
const portfolioLightboxPrev = portfolioLightbox?.querySelector(".portfolio-lightbox-prev");
const portfolioLightboxNext = portfolioLightbox?.querySelector(".portfolio-lightbox-next");
let sharedSlideIndex = 0;
let lightboxGallery;
let lightboxSlideIndex = 0;
let lightboxTransitionTimeout;

const portfolioGalleries = Array.from(document.querySelectorAll(".portfolio-card-gallery"))
  .map((gallery) => {
    const slides = Array.from(gallery.querySelectorAll("img"));
    const card = gallery.closest(".portfolio-card");

    if (slides.length === 0 || !card) return null;

    let activeIndex = Math.max(
      slides.findIndex((slide) => slide.classList.contains("is-active")),
      0,
    );

    const showSlide = (index) => {
      slides[activeIndex].classList.remove("is-active");
      slides[activeIndex].setAttribute("aria-hidden", "true");
      activeIndex = (index + slides.length) % slides.length;
      slides[activeIndex].classList.add("is-active");
      slides[activeIndex].setAttribute("aria-hidden", "false");
    };

    slides.forEach((slide, index) => {
      slide.classList.toggle("is-active", index === activeIndex);
      slide.setAttribute("aria-hidden", String(index !== activeIndex));
    });

    const syncToSharedSlide = () => {
      if (card.matches(":hover")) return;
      showSlide(sharedSlideIndex);
    };

    gallery.querySelector(".portfolio-gallery-prev")?.addEventListener("click", (event) => {
      showSlide(activeIndex - 1);
      if (event.detail > 0) event.currentTarget.blur();
    });
    gallery.querySelector(".portfolio-gallery-next")?.addEventListener("click", (event) => {
      showSlide(activeIndex + 1);
      if (event.detail > 0) event.currentTarget.blur();
    });
    card.addEventListener("mouseleave", syncToSharedSlide);
    card.addEventListener("focusout", (event) => {
      if (!card.contains(event.relatedTarget)) syncToSharedSlide();
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
      card.addEventListener("click", (event) => {
        const isTouchInteraction =
          (event instanceof PointerEvent && event.pointerType === "touch") ||
          window.matchMedia("(hover: none)").matches;
        const clickedControl = event.target instanceof Element && event.target.closest("a, button");

        if (!isTouchInteraction || clickedControl || portfolioLightbox.open) return;

        lightboxGallery = portfolioGallery;
        lightboxSlideIndex = activeIndex;
        updateLightboxImage();
        portfolioLightbox.showModal();
      });
    }

    return portfolioGallery;
  });

const activePortfolioGalleries = portfolioGalleries.filter(Boolean);
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

  const cardContent = lightboxGallery.card.querySelector(".portfolio-card-content");
  if (!cardContent) return;

  if (lightboxCategory) {
    lightboxCategory.textContent = cardContent.querySelector("span")?.textContent.trim() ?? "";
  }
  if (lightboxTitle) {
    lightboxTitle.textContent = cardContent.querySelector("h2")?.textContent.trim() ?? "";
  }
  if (lightboxDescription) {
    lightboxDescription.textContent = cardContent.querySelector("p")?.textContent.trim() ?? "";
  }
  if (lightboxLink) {
    const projectLink = cardContent.querySelector("a");
    lightboxLink.href = projectLink?.href ?? "#";
    lightboxLink.textContent = projectLink?.textContent.trim() ?? "Acessar projeto →";
    lightboxLink.hidden = !projectLink;
  }
}

const changeLightboxSlide = (direction) => {
  if (!lightboxGallery) return;

  lightboxSlideIndex =
    (lightboxSlideIndex + direction + lightboxGallery.slides.length) %
    lightboxGallery.slides.length;

  if (prefersReducedMotion || !lightboxImage) {
    updateLightboxImage();
    return;
  }

  window.clearTimeout(lightboxTransitionTimeout);
  lightboxImage.classList.add("is-changing");
  lightboxTransitionTimeout = window.setTimeout(() => {
    updateLightboxImage();
    window.setTimeout(() => lightboxImage.classList.remove("is-changing"), 20);
  }, 180);
};

portfolioLightboxPrev?.addEventListener("click", () => changeLightboxSlide(-1));
portfolioLightboxNext?.addEventListener("click", () => changeLightboxSlide(1));
portfolioLightboxClose?.addEventListener("click", () => portfolioLightbox?.close());
portfolioLightbox?.addEventListener("click", (event) => {
  if (event.target === portfolioLightbox) portfolioLightbox.close();
});
portfolioLightbox?.addEventListener("close", () => {
  if (!lightboxGallery) return;

  sharedSlideIndex = lightboxSlideIndex;
  activePortfolioGalleries.forEach(({ showSlide }) => showSlide(sharedSlideIndex));
  lightboxGallery = undefined;
});

const externalSiteConfirmation = document.querySelector(".external-site-confirmation");
const externalSiteUrl = externalSiteConfirmation?.querySelector(".external-site-url");
const externalSiteConfirm = externalSiteConfirmation?.querySelector(".external-site-confirm");
const externalSiteCancel = externalSiteConfirmation?.querySelector(".external-site-cancel");

if (
  externalSiteConfirmation instanceof HTMLDialogElement &&
  externalSiteUrl instanceof HTMLElement &&
  externalSiteConfirm instanceof HTMLAnchorElement
) {
  document
    .querySelectorAll(".portfolio-card-content a, .portfolio-lightbox-link")
    .forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        const destination = new URL(link.href, window.location.href);
        externalSiteUrl.textContent = destination.hostname;
        externalSiteConfirm.href = destination.href;
        externalSiteConfirmation.showModal();
      });
    });

  externalSiteCancel?.addEventListener("click", () => externalSiteConfirmation.close());
  externalSiteConfirmation.addEventListener("click", (event) => {
    if (event.target === externalSiteConfirmation) externalSiteConfirmation.close();
  });
  externalSiteConfirm.addEventListener("click", () => externalSiteConfirmation.close());
}

if (!prefersReducedMotion && maxPortfolioSlides > 1) {
  window.setInterval(() => {
    if (portfolioLightbox?.open) return;

    sharedSlideIndex = (sharedSlideIndex + 1) % maxPortfolioSlides;
    activePortfolioGalleries.forEach(({ card, showSlide }) => {
      if (!card.matches(":hover, :focus-within")) showSlide(sharedSlideIndex);
    });
  }, 4000);
}

const contactForm = document.querySelector(".contact-form");

if (contactForm) {
  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(contactForm);
    const name = String(formData.get("name")).trim();
    const email = String(formData.get("email")).trim();
    const message = String(formData.get("message")).trim();
    const emailContent = new URLSearchParams({
      subject: `Contato pelo site - ${name}`,
      body: `Nome: ${name}\nE-mail: ${email}\n\nMensagem:\n${message}`,
    });

    window.location.href = `mailto:contato@iweti.com.br?${emailContent.toString()}`;
  });
}
