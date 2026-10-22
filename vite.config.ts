import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({ appType: 'mpa', plugins: [tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./shared', import.meta.url)) } },
  build: { outDir: 'dist/web',
  rolldownOptions: { input: {
    checkout: fileURLToPath(new URL('./checkout/index.html', import.meta.url)),
    dashboard: fileURLToPath(new URL('./dashboard/index.html', import.meta.url))
  }, onwarn(warning, warn) {
    if (warning.code === 'MODULE_LEVEL_DIRECTIVE' && warning.message.includes('use client')) return;
    warn(warning);
  } }
} });
