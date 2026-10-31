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

test('portfolio gallery and external-link confirmation work', async ({ page }) => {
  await page.goto('/portifolios.html');
  const gallery = page.locator('.portfolio-card-gallery').first();
  await gallery.hover();
  const first = await gallery.locator('.is-active').getAttribute('src');
  await gallery.locator('.portfolio-gallery-next').click();
  await expect(gallery.locator('.is-active')).not.toHaveAttribute('src', first!);
  await page.locator('.portfolio-card-content a').first().click();
  const confirmation = page.locator('.external-site-confirmation');
  await expect(confirmation).toBeVisible();
  await expect(confirmation.locator('.external-site-url')).toHaveText('frattellianos.com');
  await confirmation.getByRole('button', { name: 'Não', exact: true }).click();
  await expect(confirmation).not.toBeVisible();
});

test('portfolio lightbox opens on touch devices', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4321/portifolios.html');
  await page.locator('.portfolio-card-gallery').first().tap();
  await expect(page.locator('.portfolio-lightbox')).toBeVisible();
  await expect(page.locator('.portfolio-lightbox-title')).toHaveText('Frattellianos');
  await page.getByRole('button', { name: 'Fechar galeria' }).click();
  await expect(page.locator('.portfolio-lightbox')).not.toBeVisible();
  await context.close();
});
