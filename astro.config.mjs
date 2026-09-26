import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://north-lab-ro.github.io',
  integrations: [
    mdx(),
    sitemap({ i18n: { defaultLocale: 'en', locales: { en: 'en-US', ro: 'ro-RO' } } }),
  ],
  markdown: {
    shikiConfig: { theme: 'poimandres' },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
