# IWETI

Site institucional da IWETI, migrado para **Astro estático**, TypeScript e CSS puro. A estrutura compartilha layouts e componentes e preserva o visual e as URLs anteriores.

## Requisitos e comandos

- Node.js 22.23.4 ou superior, conforme o requisito do Astro instalado.
- npm e dependências instaladas com `npm ci`.

```sh
npm run dev       # Desenvolvimento local
npm run check     # Verificação de Astro e TypeScript
npm run build     # Verificação e build estático em dist/
npm run preview   # Conferir o build localmente
npm run format    # Padronizar os arquivos com Prettier e suporte a Astro
npm run format:check # Conferir a formatação sem alterar arquivos
```

O TypeScript permanece na versão 6, compatível com `@astrojs/check`. As versões exatas estão registradas em `package-lock.json`.

## Organização

```text
.
├── public/                       # Arquivos copiados sem processamento
│   ├── assets/images/            # Imagens e favicon; URLs /assets/images/...
│   └── docs/                     # PDFs públicos; URLs /docs/...
├── src/
│   ├── components/
│   │   ├── Brand.astro
│   │   ├── SiteHeader.astro
│   │   ├── SiteFooter.astro
│   │   ├── home/                 # Seções da página inicial
│   │   ├── contact/              # Formulário de contato
│   │   └── portfolio/            # Galerias e diálogos
│   ├── layouts/BaseLayout.astro  # Documento HTML e metadados compartilhados
│   ├── lib/contact.ts            # Contrato e cliente HTTP da API
│   ├── pages/                    # Páginas e rotas do Astro
│   ├── scripts/                  # Menu, animações, modais, portfólio e contato
│   ├── styles/                   # CSS global e estilos do novo formulário
│   └── env.d.ts                  # Tipos da configuração pública
├── docs/contact-api.md           # Contrato proposto e limites da integração
├── tests/                        # Verificação de navegador e API local simulada
├── .env.example                  # Configuração pública de exemplo
├── astro.config.mjs
├── playwright.config.ts
├── package.json
├── package-lock.json
└── tsconfig.json
```

As páginas são `/`, `/index.html`, `/about.html`, `/contact.html`, `/portifolios.html` e `/privacy.html`. `build.format: 'file'` mantém os arquivos `.html`; `/` serve a página inicial.

O CSS global mantém a ordem original: base, componentes, seções e responsividade. As imagens estão em `public/` para preservar os arquivos e seus endereços, sem alterar sua aparência. Documentos de manutenção ficam em `docs/`; somente os PDFs públicos ficam em `public/docs/`.

## Contato e variáveis de ambiente

Copie `.env.example` para `.env.local` se precisar alterar a configuração local:

```dotenv
PUBLIC_API_URL=https://api.iweti.com
```

O formulário chama diretamente `POST <PUBLIC_API_URL>/contato`, com JSON e sem `X-API-Key`. A variável é **pública**, inserida no build; seu valor pode ser visto no navegador. O padrão é `https://api.iweti.com`. Não coloque chaves ou outros segredos nessa variável.

O destinatário e o remetente são configurados no servidor da API. O e-mail do visitante deve ser usado como `Reply-To`. As rotas administrativas não são chamadas pelo site e não precisam de credenciais neste projeto.

O contrato de `/contato` ainda é uma **proposta ligada à issue #2**. A implementação externa precisa confirmar o CORS, os limites de texto, os limites de frequência e as respostas definitivas antes do uso em produção. Veja [o contrato e os estados do formulário](./docs/contact-api.md).

## Vercel

Configure o projeto como Astro, com instalação `npm ci`, build `npm run build` e saída `dist`. O site é estático e não precisa de adaptador de servidor nem de uma rota intermediária.

Defina `PUBLIC_API_URL` nos ambientes apropriados da Vercel e gere um novo deployment após alterar o valor. A API deve permitir via CORS as origens de produção, desenvolvimento e previews autorizados, incluindo preflight `OPTIONS` para `POST` com `Content-Type: application/json`. CORS não substitui validação nem proteção contra abuso na API.

Nenhum deployment é realizado automaticamente pelos comandos deste repositório.

## Verificação

```sh
npx playwright install chromium
npm test
```

Os testes iniciam uma API HTTP simulada em `127.0.0.1:4399`, constroem o site apontando para ela em `.astro/test-dist/` e servem esse build em `127.0.0.1:4321`. Esse build fica separado de `dist/`, destinado à produção.

Verificam as URLs, os arquivos públicos, o menu mobile, os diálogos, as galerias e o fluxo do formulário, incluindo inscrição opcional, falha parcial, erros e prevenção de envios simultâneos.

Os testes não enviam e-mails nem alteram o banco real. O mock representa o contrato fornecido; não comprova a implementação da API externa.
