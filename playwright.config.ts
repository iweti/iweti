import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4321',
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'node tests/fixtures/contact-api.mjs',
      url: 'http://127.0.0.1:4399/__health',
    },
    {
      command:
        'npm run build -- --outDir .astro/test-dist && npm run preview -- --outDir .astro/test-dist --host 127.0.0.1 --port 4321 --ignore-lock',
      url: 'http://127.0.0.1:4321',
      env: { PUBLIC_API_URL: 'http://127.0.0.1:4399' },
      timeout: 120_000,
    },
  ],
});
