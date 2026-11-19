---
title: 'Google anuncia plano de controle de treinamento de IA pelo robots.txt'
description: 'Entenda o anúncio de outubro de 2026 e quais decisões revisar antes da previsão de suporte em 2027.'
date: 2026-11-19
author: 'IwetI'
category: 'Atualidade'
---

Em 30 de outubro de 2026, o Google anunciou a intenção de adotar um sinal compartilhado em `robots.txt` para preferências de treinamento de IA. A proposta vem de um grupo de trabalho da IETF. O anúncio apresenta 2027 como meta de suporte, com adoção dependente dos provedores participantes. [Anúncio do Google Search Central](https://developers.google.com/search/blog/2026/10/ai-training-control)

## O que o anúncio prevê

A ideia é que donos de sites consigam declarar uma preferência ampla com um sinal comum. O Google descreve como pretende relacionar esse sinal às regras de `Google-Extended`, seu controle existente. Se o site declarar uma preferência de exclusão pelo sinal compartilhado e não tiver uma regra explícita para `Google-Extended`, a intenção anunciada é aplicar a preferência como uma exclusão desse controle. [Anúncio do Google Search Central](https://developers.google.com/search/blog/2026/10/ai-training-control)

## O que revisar agora

Liste os usos que importam para seu site: aparecer na busca, permitir que ferramentas acessem páginas públicas e definir preferências sobre treinamento. Cada decisão tem um objetivo próprio. A política de treinamento da proposta depende de adesão e implementação pelos provedores. Para páginas privadas, a proteção continua sendo o controle de acesso, como exigir autenticação. [Introdução ao robots.txt](https://developers.google.com/search/docs/crawling-indexing/robots/intro)

Antes de alterar o arquivo publicado, registre as regras existentes e confirme quais produtos elas afetam. Em seguida, acompanhe as atualizações do padrão e do Google para decidir se a mudança cabe na política do seu site.
