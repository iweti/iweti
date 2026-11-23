---
title: 'Como medir se um site está lento'
description: 'Use o PageSpeed Insights e um roteiro simples para separar carregamento, resposta e estabilidade visual.'
date: 2026-11-19
author: 'IwetI'
category: 'Guia'
---

Antes de trocar a hospedagem ou reduzir imagens, descubra onde a espera aparece. Uma página pode mostrar o texto logo e demorar para responder ao menu. Outra pode responder bem, mas deslocar os botões quando uma imagem termina de carregar.

## Comece pelas páginas que os clientes usam

Teste no PageSpeed Insights a página inicial e uma rota importante, como a página que recebe visitas de uma campanha. No relatório, diferencie **dados de campo**, coletados em visitas reais quando disponíveis, dos **dados de laboratório**, gerados em um teste controlado. O laboratório ajuda a repetir e investigar um problema. Os dados reais mostram o que aconteceu com visitantes em condições variadas. [Guia de Web Vitals](https://web.dev/articles/vitals)

## Relacione cada sintoma com uma medida

- **LCP** indica quando o maior elemento de conteúdo visível aparece. Se o elemento for uma foto, confira seu peso e quando a requisição começa.
- **INP** indica a capacidade de resposta da página a interações. Abra o menu ou use um filtro durante o teste para identificar qual ação parece lenta.
- **CLS** indica a instabilidade visual causada por mudanças inesperadas de posição. Observe se textos e botões saltam quando imagens, fontes ou banners aparecem.

Repita a mesma visita antes e depois de uma mudança, com o mesmo tamanho de tela e perfil de rede. Registre o que mudou e se melhorou a ação que importa para quem visita. [Como investigar o LCP](https://web.dev/articles/optimize-lcp)
