/** @type {import('tailwindcss').Config} */
import typography from '@tailwindcss/typography';

export default {
  content: [
    './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
    './src/components/**/*.{astro,ts,tsx}',
    './src/layouts/**/*.{astro,ts,tsx}',
    './src/pages/**/*.{astro,ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [typography],
};
