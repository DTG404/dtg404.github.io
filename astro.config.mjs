import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://dtg404.github.io',
  outDir: 'dist',
  build: {
    assets: 'assets',
  },
});
