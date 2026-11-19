---
title: 'Animações CSS ligadas à rolagem ganham suporte no Firefox'
description: 'Veja onde usar animações que acompanham a rolagem e como preservar uma leitura confortável.'
date: 2026-11-19
author: 'IwetI'
category: 'Atualidade'
---

O web.dev registrou em outubro de 2026 que o Firefox 159 habilitou por padrão as animações ligadas à rolagem. Com a mudança, o recurso entrou na categoria Baseline Newly available, que indica disponibilidade nos navegadores principais considerados nessa classificação. [Novidades da plataforma web em outubro de 2026](https://web.dev/blog/web-platform-10-2026)

## Onde o recurso funciona bem

Uma animação convencional progride com o tempo. Com uma linha do tempo de rolagem, ela pode progredir conforme o leitor percorre a página ou conforme um elemento entra na área visível. Um exemplo é uma barra de progresso que preenche enquanto a pessoa lê um artigo. Outro é ajustar de leve a posição de uma ilustração enquanto a seção passa pela tela. [Novidades da plataforma web em outubro de 2026](https://web.dev/blog/web-platform-10-2026)

Escolha um efeito que ajude a perceber posição ou progresso. Títulos, botões e texto principal devem permanecer disponíveis mesmo que o recurso não funcione em um navegador mais antigo.

## Experimente sem comprometer a leitura

Monte primeiro a versão estática. Aplique o movimento como melhoria opcional e teste uma tela pequena, rolagem rápida e a preferência de movimento reduzido do sistema. Quando a pessoa pede menos movimento, deixe o conteúdo estável ou use uma mudança visual que não dependa de deslocamento. Compare as duas versões com alguém que ainda não conhece a página e pergunte se o efeito ajudou a se orientar. [Orientação do W3C sobre animação por interação](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)
