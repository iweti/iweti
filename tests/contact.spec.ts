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
  await page.getByRole('button', { name: 'Enviar por e-mail' }).click();
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
    await page.getByRole('button', { name: 'Enviar por e-mail' }).click();
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
  await page.getByRole('button', { name: 'Enviar por e-mail' }).click();
  await expect(page.getByRole('status')).toContainText('Sua mensagem já foi encaminhada');
  await expect(page.getByRole('status')).toContainText('Não é necessário reenviar');
  await expect(page.getByRole('button', { name: 'Mensagem encaminhada' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Enviar por WhatsApp' })).toBeDisabled();
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
    await page.getByRole('button', { name: 'Enviar por e-mail' }).click();
    await expect(page.getByRole('status')).toContainText(expected);
    await expect(page.getByLabel('Nome', { exact: true })).toHaveValue('  Maria Silva  ');
    expect(await posts(request)).toHaveLength(1);
  });
}

test('rejects whitespace-only fields before contacting the API', async ({ page, request }) => {
  await fillContact(page);
  await page.getByLabel('Nome', { exact: true }).fill('   ');
  await page.locator('form').evaluate((form: HTMLFormElement) => form.requestSubmit());
  expect(await posts(request)).toHaveLength(0);
  await expect(page.getByLabel('Nome', { exact: true })).toHaveJSProperty(
    'validationMessage',
    'Preencha este campo.',
  );
});

test('prevents concurrent submissions while the request is pending', async ({ page, request }) => {
  await setScenario(request, 'slow');
  await fillContact(page);
  await page.getByRole('button', { name: 'Enviar por e-mail' }).click();
  await expect(page.getByRole('button', { name: 'Enviando' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Enviar por WhatsApp' })).toBeDisabled();
  await page.locator('form').evaluate((form: HTMLFormElement) => form.requestSubmit());
  await expect(page.getByRole('status')).toContainText('Sua mensagem foi encaminhada');
  expect(await posts(request)).toHaveLength(1);
});

test('marks both channels unavailable until all fields are valid', async ({ page }) => {
  await page.goto('/contact.html');
  const actions = page.locator('[data-contact-send]');
  for (const action of await actions.all()) {
    await expect(action).toHaveAttribute('aria-disabled', 'true');
  }
  await fillContact(page);
  for (const action of await actions.all()) {
    await expect(action).toHaveAttribute('aria-disabled', 'false');
  }
  await page.getByLabel('E-mail', { exact: true }).fill('invalid');
  for (const action of await actions.all()) {
    await expect(action).toHaveAttribute('aria-disabled', 'true');
  }
});

test('WhatsApp opens the main branch number with encoded data and does not call the API', async ({
  page,
  request,
}) => {
  // Capture the launch without visiting WhatsApp or sending a real message.
  await page.addInitScript(() => {
    window.open = (...args: Parameters<typeof window.open>) => {
      (window as Window & { contactLaunch?: unknown }).contactLaunch = args;
      return null;
    };
  });
  await fillContact(page);
  await page
    .getByLabel('Como podemos ajudar?')
    .fill('  Olá! Sites & sistemas?\nPreço: R$ 10 + suporte.  ');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Enviar por WhatsApp' }).click();
  const launch = await page.evaluate(
    () => (window as Window & { contactLaunch?: string[] }).contactLaunch,
  );
  expect(launch).toBeDefined();
  const url = new URL(launch![0]);
  expect(url.origin + url.pathname).toBe('https://wa.me/5511978538445');
  expect(url.searchParams.get('text')).toBe(
    'Olá, meu nome é Maria Silva.\nAssunto: Orçamento de um site\nOlá! Sites & sistemas?\nPreço: R$ 10 + suporte.\nEmail: maria@exemplo.com',
  );
  expect(launch!.slice(1)).toEqual(['_blank', 'noopener,noreferrer']);
  expect(await posts(request)).toHaveLength(0);
  await expect(page.getByLabel('Nome', { exact: true })).toHaveValue('  Maria Silva  ');
  await expect(page.getByRole('status')).toBeHidden();
});

test('WhatsApp rejects whitespace and invalid e-mail without opening a window', async ({
  page,
  request,
}) => {
  await page.addInitScript(() => {
    window.open = () => {
      throw new Error('Unexpected WhatsApp launch');
    };
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await fillContact(page);
  await page.getByLabel('Nome', { exact: true }).fill('   ');
  await page.getByRole('button', { name: 'Enviar por WhatsApp' }).click({ force: true });
  await expect(page.getByLabel('Nome', { exact: true })).toHaveJSProperty(
    'validationMessage',
    'Preencha este campo.',
  );
  await page.getByLabel('Nome', { exact: true }).fill('Maria Silva');
  await page.getByLabel('E-mail', { exact: true }).fill('invalid');
  await page.getByRole('button', { name: 'Enviar por WhatsApp' }).click({ force: true });
  expect(errors).toEqual([]);
  expect(await posts(request)).toHaveLength(0);
});
