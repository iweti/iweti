import { createServer } from 'node:http';

// Local stand-in for the user-supplied proposed issue #2 contract.
// It does not call the real API, send mail or write to a database.
const origin = 'http://127.0.0.1:4321';
let scenario = 'success';
let requests = [];

const server = createServer(async (request, response) => {
  const reply = (status, body) => {
    response.writeHead(status, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(body));
  };

  if (request.url === '/__health') return reply(200, { ready: true });
  if (request.url === '/__requests') return reply(200, requests);

  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString();

  if (request.url === '/__scenario' && request.method === 'POST') {
    scenario = JSON.parse(raw).scenario;
    requests = [];
    return reply(200, { scenario });
  }

  if (request.headers.origin === origin) {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Vary', 'Origin');
  }

  if (request.url !== '/contato') {
    return reply(501, { erro: 'Operação não modelada nesta simulação.' });
  }

  requests.push({
    method: request.method,
    headers: request.headers,
    body: raw ? JSON.parse(raw) : null,
  });

  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return response.end();
  }

  if (request.method !== 'POST') return reply(501, { erro: 'Método não modelado.' });

  if (scenario === 'partial') {
    return reply(502, {
      sucesso: false,
      contato: 'encaminhado',
      newsletter: 'falhou',
      erro: 'Contato encaminhado, mas não foi possível concluir a inscrição.',
    });
  }

  if (scenario === 'invalid') return reply(400, { erro: 'Email inválido' });
  if (scenario === 'rate-limited') return reply(429, { erro: 'Limite excedido' });
  if (scenario === 'unavailable') {
    // Lose the response after its headers arrived, modeling an uncertain
    // outcome without triggering the browser's connection-level retries.
    response.writeHead(200, { 'Content-Type': 'application/json', 'Content-Length': '100' });
    response.flushHeaders();
    setTimeout(() => response.destroy(), 10);
    return;
  }
  if (scenario === 'html-error') {
    response.writeHead(502, { 'Content-Type': 'text/html' });
    return response.end('<h1>Bad Gateway</h1>');
  }
  if (scenario === 'server-error') return reply(500, { erro: 'Falha interna' });
  if (scenario === 'slow') await new Promise((resolve) => setTimeout(resolve, 500));

  const payload = JSON.parse(raw);
  return reply(200, {
    sucesso: true,
    contato: 'encaminhado',
    newsletter:
      scenario === 'already-subscribed'
        ? 'ja_inscrito'
        : payload.recebernovidades
          ? 'inscrito'
          : 'nao_solicitada',
  });
});

server.listen(4399, '127.0.0.1');
