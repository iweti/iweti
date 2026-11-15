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
