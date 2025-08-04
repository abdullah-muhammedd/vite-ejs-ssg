import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import htmlBuilderDev from './vite-plugins/html-builder-dev.plugin.js';
import htmlBuilderPostBuild from './vite-plugins/html-builder-post-build.js';
import path from 'node:path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: [
        'src/styles.css',
        'src/layout/layout.client.ts',
        'src/pages/home/home.client.ts',
      ],
    },
    emptyOutDir: true,
    manifest: true,
    outDir: 'dist',
  },
  plugins: [tailwindcss(), htmlBuilderDev(), htmlBuilderPostBuild()],
  server: {
    port: 4000,
    strictPort: true,
    fs: {
      strict: false,
    },
  },
  preview: {
    port: 4200,
    strictPort: true,
    headers: {
      'Cache-Control': 'public, max-age=0',
    },
  },
  base: './',
  publicDir: path.resolve(__dirname, 'public'),
});
