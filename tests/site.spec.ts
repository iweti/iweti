import { expect, test } from '@playwright/test';

for (const path of [
  '/index.html',
  '/about.html',
  '/contact.html',
  '/portifolios.html',
  '/privacy.html',
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

for (const path of ['/portifolios.html']) {
  test(`fullscreen portfolio switches projects and images on ${path}`, async ({ page }) => {
    await page.goto(path);
    const showcase = page.locator('.project-showcase');
    await showcase.scrollIntoViewIfNeeded();
    const activeSlide = showcase.locator('.project-slide:visible');
    await expect(activeSlide).toHaveAttribute('data-project-name', 'Frattellianos');
    await showcase.getByRole('button', { name: 'Próximo projeto' }).click();
    await expect(activeSlide).toHaveAttribute('data-project-name', 'Debinatos');
    await expect(activeSlide.locator('.project-device-set:visible .project-device')).toHaveCount(3);
    await expect(
      activeSlide.locator('.project-device-set:visible .project-phone img'),
    ).toHaveAttribute('src', /Debinatos-main-mobile/);
    await expect(showcase.locator('[data-project="1"]')).toHaveAttribute('aria-pressed', 'true');
    await showcase.locator('[data-view="1"]').click();
    await expect(activeSlide.locator('img[data-original]:visible')).toHaveAttribute(
      'src',
      /Debinatos-hist/,
    );
    await showcase.getByRole('button', { name: 'Ampliar imagens do projeto' }).click();
    const lightbox = page.locator('.portfolio-lightbox');
    await expect(lightbox).toBeVisible();
    await expect(lightbox.locator('.portfolio-lightbox-title')).toHaveText('Debinatos');
    await page.keyboard.press('Escape');
    await expect(lightbox).not.toBeVisible();
    await showcase.getByRole('button', { name: 'Próximo projeto' }).click();
    await expect(activeSlide).toHaveAttribute('data-project-name', 'Frattellianos');
    await activeSlide.getByRole('link', { name: 'Acessar site' }).click();
    const confirmation = page.locator('.external-site-confirmation');
    await expect(confirmation).toBeVisible();
    await expect(confirmation.locator('.external-site-url')).toHaveText('frattellianos.com');
    await confirmation.getByRole('button', { name: 'Não', exact: true }).click();
    await expect(confirmation).not.toBeVisible();
  });
}

test('portfolio works on mobile and with the keyboard without horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/portifolios.html');
  const showcase = page.locator('.project-showcase');
  await showcase.getByRole('button', { name: 'Próximo projeto' }).click();
  await expect(showcase.locator('.project-slide:visible')).toHaveAttribute(
    'data-project-name',
    'Debinatos',
  );
  await showcase.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(showcase.locator('.project-slide:visible')).toHaveAttribute(
    'data-project-name',
    'Frattellianos',
  );
  await expect(showcase).toHaveJSProperty('clientWidth', 390);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await showcase.getByRole('button', { name: 'Ampliar imagens do projeto' }).click();
  await expect(page.locator('.portfolio-lightbox')).toBeVisible();
  await page.getByRole('button', { name: 'Próxima foto', exact: true }).click();
  await expect(page.locator('.portfolio-lightbox-image')).toHaveAttribute(
    'src',
    /Frattellianos-hist/,
  );
  await page.getByRole('button', { name: 'Fechar galeria' }).click();
  await expect(page.locator('.portfolio-lightbox')).not.toBeVisible();
});

test('home project cards open the selected project and handle unknown links', async ({ page }) => {
  for (const name of ['Frattellianos', 'Debinatos']) {
    await page.goto('/');
    const card = page.locator('.home-project-card').filter({ hasText: name });
    await expect(card.getByRole('img')).toBeVisible();
    await card.getByRole('link', { name: `Conhecer o projeto ${name}` }).click();
    await expect(page).toHaveURL(new RegExp(`#${name.toLowerCase()}$`));
    await expect(page.locator('.project-slide:visible')).toHaveAttribute('data-project-name', name);
  }
  await page.goto('/portifolios.html#desconhecido');
  await expect(page.locator('.project-slide:visible')).toHaveAttribute(
    'data-project-name',
    'Frattellianos',
  );
});
