interface ProjectCover {
  src: string;
  alt: string;
  width: number;
  height: number;
}

interface Project {
  name: string;
  description: string;
  url: string | null;
  category: string;
  status: string;
  cover?: ProjectCover;
}

const projectEntries: Project[] = [
  {
    name: 'Frattellianos',
    description: 'Uma presença digital com a essência, a história e a identidade da marca.',
    url: 'https://frattellianos.com',
    category: 'Site institucional',
    status: 'Site publicado',
    cover: {
      src: '/assets/images/portimages/Frattellianos/Frattellianos-showcase.webp',
      alt: 'Close do site Frattellianos em notebook parcialmente fora do quadro, com a logo no canto superior esquerdo.',
      width: 1600,
      height: 1600,
    },
  },
  {
    name: 'Debinatos',
    description:
      'Identidade e conteúdo em uma experiência digital feita para apresentar o negócio.',
    url: 'https://debinatos.com',
    category: 'Site institucional',
    status: 'Site publicado',
    cover: {
      src: '/assets/images/portimages/Debinatos/Debinatos-showcase.webp',
      alt: 'Debinatos em smartphone ampliado à esquerda e notebook ao fundo à direita, destacando os produtos artesanais.',
      width: 1600,
      height: 1600,
    },
  },
  {
    name: 'LivesRun',
    description:
      'Aplicativo esportivo com telas de atividades, histórico e perfil. MVP navegável com dados demonstrativos.',
    category: 'Aplicativo esportivo',
    status: 'MVP',
    url: null,
    cover: {
      src: '/assets/images/portimages/LivesRun/LivesRun-showcase.webp',
      alt: 'Close diagonal do histórico e métricas do LivesRun em um smartphone, com a tela inicial menor ao fundo e iluminação laranja.',
      width: 1600,
      height: 1600,
    },
  },
  {
    name: 'NSS Gym',
    description: 'Projeto de aplicativo para academia, em fase inicial de desenvolvimento.',
    category: 'Aplicativo para academia',
    status: 'Em desenvolvimento',
    url: null,
    cover: {
      src: '/assets/images/portimages/NSS-Gym/NSS-Gym-showcase.webp',
      alt: 'NSS Gym com um smartphone em perspectiva no canto inferior direito e iluminação oliva.',
      width: 1600,
      height: 1600,
    },
  },
  {
    name: 'Jiu-jitsu',
    description:
      'Protótipo de plataforma para descobrir eventos e acompanhar a comunidade do jiu-jitsu, com dados demonstrativos.',
    category: 'Plataforma esportiva',
    status: 'Protótipo',
    url: null,
    cover: {
      src: '/assets/images/portimages/Jiu-jitsu/Jiu-jitsu-showcase.webp',
      alt: 'Close frontal da plataforma Jiu-jitsu em notebook recortado nas laterais, destacando a seção principal do site.',
      width: 1600,
      height: 1600,
    },
  },
];

export const projects = projectEntries.map((project) => ({
  ...project,
  slug: project.name.toLowerCase().replace(/\s+/g, '-'),
}));
