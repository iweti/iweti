const menuButton = document.querySelector<HTMLButtonElement>('.menu-toggle');
const menu = document.querySelector<HTMLElement>('.nav-links');

if (menuButton && menu) {
  const closeMenu = () => {
    menu.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
  };

  menuButton.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(isOpen));
  });

  menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });
}

const navigation = document.querySelector<HTMLElement>('.site-nav');

if (navigation) {
  const scrollThreshold = 8;
  let previousScrollY = Math.max(0, window.scrollY);
  let framePending = false;

  const updateNavigation = () => {
    // Clamp elastic overscroll so bouncing at either edge does not change direction.
    const maxScrollY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const scrollY = Math.min(maxScrollY, Math.max(0, window.scrollY));
    const delta = scrollY - previousScrollY;
    const nearTop = scrollY <= navigation.offsetHeight;
    const menuOpen = menuButton?.getAttribute('aria-expanded') === 'true';
    const keyboardFocus = navigation.querySelector(':focus-visible');

    navigation.classList.toggle('is-scrolled', scrollY > 0);

    if (nearTop || menuOpen || keyboardFocus) {
      navigation.classList.remove('is-hidden');
      previousScrollY = scrollY;
    } else if (Math.abs(delta) >= scrollThreshold) {
      navigation.classList.toggle('is-hidden', delta > 0);
      previousScrollY = scrollY;
    }

    framePending = false;
  };

  window.addEventListener(
    'scroll',
    () => {
      if (!framePending) {
        framePending = true;
        window.requestAnimationFrame(updateNavigation);
      }
    },
    { passive: true },
  );

  navigation.addEventListener('focusin', () => {
    navigation.classList.remove('is-hidden');
  });

  updateNavigation();
}

export {};
