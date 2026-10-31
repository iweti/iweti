# Integração de contato IWETI

Fonte: contrato proposto fornecido pelo responsável pelo projeto, referente à issue #2. `/contato` e suas respostas ainda precisam ser confirmadas na implementação externa. As demais rotas existentes permanecem na API e não são consumidas por este formulário.

## Requisição

`POST https://api.iweti.com/contato`, público, sem `X-API-Key`.

```http
Content-Type: application/json
```

```json
{
  "nome": "Maria Silva",
  "email": "maria@exemplo.com",
  "assunto": "Orçamento de um site",
  "mensagem": "Gostaria de conversar sobre meu projeto.",
  "recebernovidades": true
}
```

| Campo              | Obrigatório | Regra                                             |
| ------------------ | ----------- | ------------------------------------------------- |
| `nome`             | Sim         | String não vazia após remover espaços externos    |
| `email`            | Sim         | E-mail válido, no máximo 254 caracteres           |
| `assunto`          | Sim         | String não vazia, sem quebras de linha            |
| `mensagem`         | Sim         | String não vazia após remover espaços externos    |
| `recebernovidades` | Não         | Booleano; padrão `false`; strings não são aceitas |

O formulário sempre envia o booleano, inicialmente desmarcado. Remove espaços externos dos textos, sem alterar maiúsculas/minúsculas do e-mail. A validação do navegador não substitui a validação definitiva da API.

## Responsabilidades da API

- Validar tudo antes de enviar ou alterar o banco.
- Encaminhar exclusivamente ao destinatário IWETI configurado no servidor, ainda a definir.
- Manter o remetente da aplicação e usar o e-mail do visitante como `Reply-To`.
- Processar a inscrição opcional somente depois de encaminhar o contato.
- Com `true`, inscrever sem duplicação. Com `false` ou ausência, não inscrever nem cancelar inscrições anteriores.

## Respostas e comportamento do site

| Resposta                                                                          | Significado                             | Comportamento                                                                        |
| --------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------ |
| `200`, `sucesso: true`, `contato: "encaminhado"`, `newsletter: "inscrito"`        | Contato aceito e nova inscrição         | Confirmar ambos e limpar o formulário                                                |
| `200`, mesmos campos, `newsletter: "ja_inscrito"`                                 | Contato aceito e inscrição já existente | Confirmar contato e informar inscrição existente                                     |
| `200`, mesmos campos, `newsletter: "nao_solicitada"`                              | Contato aceito sem pedido de inscrição  | Confirmar contato                                                                    |
| `502`, `sucesso: false`, `contato: "encaminhado"`, `newsletter: "falhou"`, `erro` | Contato aceito, inscrição falhou        | Mostrar resultado parcial, preservar dados e impedir reenvio desse contato na página |
| `400`, `erro`                                                                     | Dados inválidos                         | Mostrar erro como texto e preservar dados                                            |
| `429`, `erro`                                                                     | Limite atingido                         | Orientar a aguardar e preservar dados                                                |
| `500`/`502` sem confirmação, falha de rede/CORS, timeout ou resposta inesperada   | Resultado do contato incerto            | Informar incerteza, preservar dados e não repetir automaticamente                    |

`encaminhado` significa aceitação pelo serviço de e-mail; não confirma entrega na caixa de entrada. O site não tenta reenviar automaticamente nenhuma solicitação. O tempo de espera do cliente é de 30 segundos; o encerramento dessa espera não cancela nem desfaz um envio no servidor.

## Dependências em aberto

- Confirmar implementação e disponibilidade de `/contato` na API externa.
- Definir limites de tamanho dos textos e frequência da nova rota.
- Confirmar tratamento definitivo de falhas de infraestrutura.
- Configurar CORS para as origens autorizadas e aceitar o preflight `OPTIONS` de JSON.
- Configurar o destinatário da IWETI e o serviço de e-mail no servidor externo.

## Evidência local

O mock de [tests/fixtures/contact-api.mjs](../tests/fixtures/contact-api.mjs) serve respostas do contrato para os testes de navegador. Ele não envia e-mails nem grava inscrições. Os testes verificam o payload, o uso de booleano, a ausência de chave e a apresentação dos resultados, sem estabelecer o comportamento da API real.

A ausência de retentativas se refere ao código do formulário. Em um ensaio local com a conexão interrompida antes de qualquer resposta, o Chromium repetiu o POST na camada de transporte. Por isso, o site não promete deduplicação de ponta a ponta; uma garantia desse tipo precisaria de suporte da API. O cenário automatizado de resposta interrompida ocorre após o recebimento dos cabeçalhos e confirma que o formulário informa a incerteza sem iniciar outra chamada.
