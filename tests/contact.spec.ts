import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const mock = 'http://127.0.0.1:4399';

async function setScenario(request: APIRequestContext, scenario: string) {
  await request.post(`${mock}/__scenario`, { data: { scenario } });
}

async function fillContact(page: Page) {
  await page.goto('/contact.html');
  await page.getByLabel('Nome', { exact: true }).fill('  Maria Silva  ');
  await page.getByLabel('E-mail', { exact: true }).fill('maria@exemplo.com');
  await page.getByLabel('Assunto', { exact: true }).fill('Orçamento de um site');
  await page
    .getByLabel('Como podemos ajudar?')
    .fill('  Gostaria de conversar sobre meu projeto.  ');
}

async function posts(request: APIRequestContext) {
  const response = await request.get(`${mock}/__requests`);
  const requests: { method: string; headers: Record<string, string>; body: unknown }[] =
    await response.json();
  return requests.filter((item) => item.method === 'POST');
}

test.beforeEach(async ({ request }) => setScenario(request, 'success'));

test('sends JSON directly with no API key, trims fields and opts out by default', async ({
  page,
  request,
}) => {
  await fillContact(page);
  await expect(page.getByRole('checkbox')).not.toBeChecked();
  await page.getByRole('button', { name: 'Enviar mensagem' }).click();
  await expect(page.getByRole('status')).toContainText('Sua mensagem foi encaminhada');
  const sent = await posts(request);
  expect(sent).toHaveLength(1);
  expect(sent[0].headers['content-type']).toBe('application/json');
  expect(sent[0].headers['x-api-key']).toBeUndefined();
  expect(sent[0].headers.origin).toBe('http://127.0.0.1:4321');
  expect(sent[0].body).toEqual({
    nome: 'Maria Silva',
    email: 'maria@exemplo.com',
    assunto: 'Orçamento de um site',
    mensagem: 'Gostaria de conversar sobre meu projeto.',
    recebernovidades: false,
  });
  await expect(page.getByLabel('Nome', { exact: true })).toHaveValue('');
});

for (const [scenario, expected] of [
  ['success', 'Sua inscrição para receber novidades foi concluída.'],
  ['already-subscribed', 'Seu e-mail já estava inscrito'],
]) {
  test(`newsletter opt-in: ${scenario}`, async ({ page, request }) => {
    await setScenario(request, scenario);
    await fillContact(page);
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Enviar mensagem' }).click();
    await expect(page.getByRole('status')).toContainText(expected);
    expect((await posts(request))[0].body).toMatchObject({ recebernovidades: true });
  });
}

test('partial 502 confirms the contact, preserves data and prevents a duplicate send', async ({
  page,
  request,
}) => {
  await setScenario(request, 'partial');
  await fillContact(page);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Enviar mensagem' }).click();
  await expect(page.getByRole('status')).toContainText('Sua mensagem já foi encaminhada');
  await expect(page.getByRole('status')).toContainText('Não é necessário reenviar');
  await expect(page.getByRole('button', { name: 'Mensagem encaminhada' })).toBeDisabled();
  await expect(page.getByLabel('Nome', { exact: true })).toHaveValue('  Maria Silva  ');
  await page.locator('form').evaluate((form: HTMLFormElement) => form.requestSubmit());
  expect(await posts(request)).toHaveLength(1);
});

for (const [scenario, expected] of [
  ['invalid', 'Email inválido'],
  ['rate-limited', 'O limite de envios foi atingido'],
  ['server-error', 'Não foi possível confirmar o resultado'],
  ['html-error', 'Não foi possível confirmar o resultado'],
  ['unavailable', 'Não foi possível confirmar o resultado'],
]) {
  test(`handles ${scenario}, retaining data with no automatic resend`, async ({
    page,
    request,
  }) => {
    await setScenario(request, scenario);
    await fillContact(page);
    await page.getByRole('button', { name: 'Enviar mensagem' }).click();
    await expect(page.getByRole('status')).toContainText(expected);
    await expect(page.getByLabel('Nome', { exact: true })).toHaveValue('  Maria Silva  ');
    expect(await posts(request)).toHaveLength(1);
  });
}

test('rejects whitespace-only fields before contacting the API', async ({ page, request }) => {
  await fillContact(page);
  await page.getByLabel('Nome', { exact: true }).fill('   ');
  await page.getByRole('button', { name: 'Enviar mensagem' }).click();
  expect(await posts(request)).toHaveLength(0);
  await expect(page.getByLabel('Nome', { exact: true })).toHaveJSProperty(
    'validationMessage',
    'Preencha este campo.',
  );
});

test('prevents concurrent submissions while the request is pending', async ({ page, request }) => {
  await setScenario(request, 'slow');
  await fillContact(page);
  await page.getByRole('button', { name: 'Enviar mensagem' }).click();
  await expect(page.getByRole('button', { name: 'Enviando' })).toBeDisabled();
  await page.locator('form').evaluate((form: HTMLFormElement) => form.requestSubmit());
  await expect(page.getByRole('status')).toContainText('Sua mensagem foi encaminhada');
  expect(await posts(request)).toHaveLength(1);
});
