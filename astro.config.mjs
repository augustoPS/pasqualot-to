// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://pasqualo.to',
  adapter: vercel({ edgeMiddleware: true }),
  vite: {
    plugins: [tailwindcss()],
  },
});
