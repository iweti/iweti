import { expect, test } from '@playwright/test';

for (const path of [
  '/',
  '/about',
  '/contact',
  '/portifolios',
  '/privacy',
]) {
  test(`preserves ${path}, local assets and the shared navigation`, async ({ page, request }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.getByRole('navigation')).toHaveCount(1);
    await expect(page.locator('footer')).toContainText(
      '© 2026 IWETI. Todos os direitos reservados.',
    );

    const assets = await page.locator('img[src], iframe[src], a[href]').evaluateAll((elements) =>
      elements.flatMap((element) => {
        const url = element.getAttribute('src') ?? element.getAttribute('href');
        return url?.startsWith('/') && !url.includes('#') ? [url] : [];
      }),
    );
    for (const asset of new Set(assets)) {
      expect((await request.get(asset)).status(), asset).toBe(200);
    }
    expect(errors).toEqual([]);
  });
}

test('mobile menu opens and closes with Escape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const menu = page.getByRole('button', { name: 'Abrir menu' });
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
});

test('service details open and close', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Saiba mais' }).first().click();
  const dialog = page.locator('#service-dialog-sites');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
});

test('projects remain visible with independent image controls and a shared lightbox', async ({
  page,
}) => {
  await page.goto('/portifolios');
  const first = page.locator('#frattellianos');
  const second = page.locator('#debinatos');
  await expect(first).toBeVisible();
  await expect(second).toBeVisible();
  await expect(page.getByRole('button', { name: 'Próximo projeto' })).toHaveCount(0);
  await second.getByRole('button', { name: 'Sobre a marca' }).click();
  await expect(second.locator('img[data-original]:visible')).toHaveAttribute(
    'src',
    /Debinatos-hist/,
  );
  await expect(first.locator('img[data-original]:visible')).toHaveAttribute(
    'src',
    /Frattellianos-main/,
  );
  await second.getByRole('button', { name: 'Ampliar imagens do projeto' }).click();
  const lightbox = page.locator('.portfolio-lightbox');
  await expect(lightbox.locator('.portfolio-lightbox-title')).toHaveText('Debinatos');
  await expect(lightbox.locator('.portfolio-lightbox-link')).toHaveAttribute(
    'href',
    'https://debinatos.com/',
  );
  await page.keyboard.press('ArrowRight');
  await expect(lightbox.locator('.portfolio-lightbox-image')).toHaveAttribute(
    'src',
    /Debinatos-main/,
  );
  await page.keyboard.press('Escape');
  await expect(lightbox).not.toBeVisible();
  await first.getByRole('button', { name: 'Ampliar imagens do projeto' }).click();
  await expect(lightbox.locator('.portfolio-lightbox-title')).toHaveText('Frattellianos');
  await page.getByRole('button', { name: 'Próxima foto', exact: true }).click();
  await expect(lightbox.locator('.portfolio-lightbox-image')).toHaveAttribute(
    'src',
    /Frattellianos-hist/,
  );
  await page.keyboard.press('Escape');
  await first.getByRole('link', { name: 'Acessar site' }).click();
  await expect(page.locator('.external-site-url')).toHaveText('frattellianos.com');
  await page.getByRole('button', { name: 'Não', exact: true }).click();
});

test('both projects work on mobile without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/portifolios');
  for (const id of ['frattellianos', 'debinatos']) {
    const project = page.locator(`#${id}`);
    await project.scrollIntoViewIfNeeded();
    await expect(project).toBeVisible();
    await expect(project.locator('.project-device-set:visible .project-device')).toHaveCount(2);
    const view = project.getByRole('button', { name: 'Sobre a marca' });
    await view.focus();
    await page.keyboard.press('Enter');
    await expect(view).toHaveAttribute('aria-pressed', 'true');
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

test('home project links scroll to the matching project', async ({ page }) => {
  for (const name of ['Frattellianos', 'Debinatos']) {
    await page.goto('/');
    const card = page.locator('.home-project-card').filter({ hasText: name });
    await card.getByRole('link', { name: `Conhecer o projeto ${name}` }).click();
    await expect(page).toHaveURL(new RegExp(`#${name.toLowerCase()}$`));
    await expect(page.locator(`#${name.toLowerCase()}`)).toBeInViewport();
    await expect(page.locator('.project-entry:visible')).toHaveCount(2);
  }
  await page.goto('/portifolios#desconhecido');
  await expect(page.locator('.project-entry:visible')).toHaveCount(2);
});

test('both projects are available without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4321/portifolios#debinatos');
  await expect(page.locator('.project-entry:visible')).toHaveCount(2);
  await expect(page.locator('#debinatos')).toBeInViewport();
  await context.close();
});
