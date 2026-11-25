interface PageLink {
  href: string;
  label: string;
  menu?: boolean;
  lateral?: boolean;
  footerExplore?: true | string;
  prefetch?: 'false';
}

export const sitePages = {
  home: { href: '/', label: 'Início', lateral: true, footerExplore: true },
  about: { href: '/about', label: 'Quem somos', menu: true, lateral: true, footerExplore: true },
  portifolios: {
    href: '/portifolios',
    label: 'Projetos',
    menu: true,
    lateral: true,
    footerExplore: 'Nossos projetos',
  },
  blog: {
    href: '/blog',
    label: 'Blog',
    menu: true,
    lateral: true,
    footerExplore: true,
    prefetch: 'false',
  },
  contact: { href: '/contact', label: 'Fale conosco', menu: true, lateral: true },
  privacy: { href: '/privacy', label: 'Política de Privacidade' },
} as const satisfies Record<string, PageLink>;

export type SitePageId = keyof typeof sitePages;

export const navigationPages = Object.entries<PageLink>(sitePages).map(([id, page]) => ({
  id,
  ...page,
}));

export const lateralPages = navigationPages.filter((page) => page.lateral);

export function getLateralPageIndex(pathname: string) {
  const path = pathname.replace(/\/$/, '');
  return lateralPages.findIndex((page) => page.href.replace(/\/$/, '') === path);
}
