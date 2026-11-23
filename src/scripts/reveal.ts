import { onPageLoad } from '../lib/page-lifecycle';

onPageLoad(() => {
  const revealElements = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.remove('reveal-pending');
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12 },
    );

    revealElements.forEach((element) => {
      observer.observe(element);
      element.classList.add('reveal-pending');
    });
    return () => observer.disconnect();
  }
});
