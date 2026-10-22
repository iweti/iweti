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
