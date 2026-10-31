import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  trailingSlash: 'never',
  build: {
    // Keep the existing public URLs: /about.html, /contact.html, etc.
    format: 'file',
  },
});
