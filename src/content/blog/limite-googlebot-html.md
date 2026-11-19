---
title: 'O que o limite de 2 MB do Googlebot significa para seu HTML'
description: 'Saiba por que medir a resposta HTML individual e onde procurar conteúdo que pode ficar fora do rastreamento.'
date: 2026-11-19
author: 'IwetI'
category: 'Atualidade'
---

Em março de 2026, o Google detalhou como seu rastreador busca páginas. Segundo a publicação, o Googlebot lê até os primeiros 2 MB de um recurso típico, incluindo os cabeçalhos da resposta HTTP. PDFs têm limite próprio. O Google corrigiu em outubro que se referia aos cabeçalhos da resposta. [Explicação técnica do Googlebot](https://developers.google.com/search/blog/2026/03/crawler-blog-post)

## O que acontece com um HTML maior

O rastreador encaminha a parte que recebeu para os sistemas do Google. Num HTML muito grande, informações no fim do documento, como texto e links, podem ficar além da parte processada. Isso é diferente de somar todos os recursos da página. Um arquivo CSS solicitado por outro endereço, por exemplo, tem sua própria requisição. Uma imagem grande embutida como texto base64 aumenta o HTML que a contém.

Uma listagem que repete o texto completo de dezenas de artigos na mesma resposta pode crescer a cada publicação. Uma alternativa é mostrar títulos e resumos com links para as páginas dos artigos, separando a listagem em páginas se necessário. [Orientações para paginação](https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading)

## Como conferir

Abra a aba **Rede** do navegador e recarregue a URL. Selecione a requisição do tipo **Documento** para inspecionar a resposta HTML. Confira se o conteúdo principal e os links aparecem ali e procure blocos grandes repetidos. Se o HTML já é pequeno e o texto está acessível, o limite de rastreamento raramente é o primeiro ponto a investigar.
