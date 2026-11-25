import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://itzik.program-il.com',
  output: 'static',
  integrations: [sitemap({ filter: (page) => !page.includes('/favorites/confirm/') })],
});
