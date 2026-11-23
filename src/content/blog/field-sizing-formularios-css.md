---
title: 'Campos de formulário que crescem conforme a pessoa escreve'
description: 'Entenda o suporte a field-sizing e veja como aplicá-lo a um campo de mensagem.'
date: 2026-11-19
author: 'IwetI'
category: 'Atualidade'
---

Em junho de 2026, o Firefox 152 passou a oferecer suporte a `field-sizing`. A propriedade alcançou a classificação Baseline Newly available, segundo o web.dev. Em um formulário de contato, ela permite que um campo de mensagem aumente de altura conforme a pessoa escreve. [Novidades da plataforma web em junho de 2026](https://web.dev/blog/web-platform-06-2026)

## Onde usar

Um pedido de orçamento costuma começar com duas linhas e crescer quando o visitante inclui detalhes. Um campo que acompanha esse texto ajuda a conferir o pedido antes do envio. O comportamento vem de `field-sizing: content`. Defina uma altura mínima para o campo vazio e uma altura máxima para evitar que uma mensagem longa empurre o botão de envio para muito longe.

```css
.mensagem {
  width: 100%;
  min-height: 6rem;
  max-height: 16rem;
  field-sizing: content;
}
```

## O que conferir antes de publicar

Teste a digitação, a colagem de um texto longo e o acesso com teclado em tela pequena. O rótulo, a orientação sobre erros e o botão de envio precisam continuar claros. Em navegadores sem suporte, deixe o campo utilizável no tamanho padrão ou com o redimensionamento do navegador. Se o formulário já tem um script para expandir esse campo, compare os comportamentos antes de removê-lo, especialmente se sua equipe atende usuários com navegadores mais antigos. [Verificações de acessibilidade do W3C](https://www.w3.org/WAI/test-evaluate/preliminary/)
