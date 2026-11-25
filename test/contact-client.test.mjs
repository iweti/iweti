import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sendContact, CONTACT_TIMEOUT_MS } from '../src/lib/contact.ts';

const payload = {
  nome: 'Cliente',
  email: 'cliente@example.com',
  assunto: 'Projeto',
  mensagem: 'Gostaria de um orçamento.',
  recebernovidades: false,
};

test('envia o contrato e reconhece cada confirmação de newsletter', async (t) => {
  for (const newsletter of ['inscrito', 'ja_inscrito', 'nao_solicitada']) {
    t.mock.method(globalThis, 'fetch', async (url, options) => {
      assert.equal(url, 'https://api.example.com/contato');
      assert.equal(options.method, 'POST');
      assert.equal(options.credentials, 'omit');
      assert.deepEqual(JSON.parse(options.body), payload);
      return Response.json({ sucesso: true, contato: 'encaminhado', newsletter });
    });
    assert.deepEqual(await sendContact(' https://api.example.com/// ', payload), {
      kind: 'success',
      newsletter,
    });
    t.mock.restoreAll();
  }
});

test('contato encaminhado com erro de newsletter não sugere novo envio', async (t) => {
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json(
      {
        sucesso: false,
        contato: 'encaminhado',
        newsletter: 'erro',
      },
      { status: 502 },
    ),
  );
  assert.deepEqual(await sendContact('https://api.example.com', payload), { kind: 'partial' });
});

test('usa a URL padrão quando o endereço da API está ausente ou em branco', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url) => {
    assert.equal(url, 'https://api.iweti.com/contato');
    return Response.json({ sucesso: true });
  });
  for (const apiUrl of [undefined, '   ']) {
    assert.deepEqual(await sendContact(apiUrl, payload), { kind: 'success' });
  }
});

test('trata limite mesmo quando o proxy responde HTML', async (t) => {
  t.mock.method(
    globalThis,
    'fetch',
    async () => new Response('<html>Too many requests</html>', { status: 429 }),
  );
  const result = await sendContact('https://api.example.com', payload);
  assert.equal(result.kind, 'error');
  assert.match(result.message, /limite de envios/);
});

test('validação sem JSON mantém orientação para conferir campos', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('', { status: 400 }));
  assert.match((await sendContact('https://api.example.com', payload)).message, /Confira os dados/);
});

test('200 sem confirmação nunca é apresentado como envio concluído', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('<html>OK</html>'));
  const result = await sendContact('https://api.example.com', payload);
  assert.equal(result.kind, 'error');
  assert.match(result.message, /Não foi possível confirmar/);
});

test('espera até 60 segundos e não repete envio após timeout', async (t) => {
  t.mock.method(AbortSignal, 'timeout', (duration) => {
    assert.equal(duration, 60_000);
    assert.equal(duration, CONTACT_TIMEOUT_MS);
    return AbortSignal.abort(new DOMException('Timeout', 'TimeoutError'));
  });
  const fetch = t.mock.method(globalThis, 'fetch', async (_url, options) => {
    options.signal.throwIfAborted();
  });
  const result = await sendContact('https://api.example.com', payload);
  assert.equal(fetch.mock.callCount(), 1);
  assert.equal(result.kind, 'error');
  assert.match(result.message, /demorou para responder/);
  assert.match(result.message, /pode ter sido encaminhada/);
});
