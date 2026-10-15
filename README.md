# IwetI

Site institucional da IwetI, uma empresa de tecnologia focada em transformar ideias em experiências digitais. O projeto reproduz a identidade visual escura, com acentos em azul e ciano, da referência fornecida.

## Tecnologias

- HTML5 semântico
- CSS puro organizado por responsabilidade
- JavaScript puro

Não há framework JavaScript, bibliotecas de componentes ou backend. O site é estático.


## Estrutura

```text
.
├── assets/images/       # Imagens utilizadas na página
├── css/
│   ├── base.css         # Variáveis, reset e estilos globais
│   ├── components.css   # Elementos reutilizáveis
│   ├── responsive.css   # Breakpoints e ajustes mobile
│   ├── sections.css     # Aparência das seções da página
│   └── styles.css       # Ponto de entrada dos estilos
├── js/main.js           # Menu mobile e animações de entrada
├── index.html           # Página inicial
├── portifolios.html     # Página de portfólios
├── about.html           # Página Quem somos
└── contact.html         # Página de contato
```

## Seções da página

1. Hero com chamada principal e ações.
2. Soluções e serviços digitais.
3. Bloco institucional com indicadores.
4. Portfólio de projetos.
5. Depoimentos.
6. CTA de contato e rodapé.

A página `portifolios.html` traz cartões-modelo. Substitua as imagens, nomes, categorias, descrições e endereços de exemplo pelos dados dos projetos publicados.

A página `contact.html` prepara a mensagem em um aplicativo de e-mail para envio a `contato@iweti.com.br`. Como o site é estático e não possui backend, o formulário não envia mensagens diretamente pelo navegador.

A página `about.html` está preparada para receber o conteúdo institucional da IwetI.

## Interações e acessibilidade

- Menu mobile com controle de `aria-expanded`.
- Fechamento do menu ao escolher um link ou pressionar `Escape`.
- Animações sutis ativadas com `IntersectionObserver`.
- Textos alternativos nas imagens e navegação por âncoras.

## Manutenção de estilos

O HTML carrega [`css/styles.css`](./css/styles.css), que apenas importa os demais arquivos. Edite o arquivo correspondente ao tipo de mudança: estilos globais em `base.css`, componentes reutilizáveis em `components.css`, seções em `sections.css` e breakpoints em `responsive.css`.
