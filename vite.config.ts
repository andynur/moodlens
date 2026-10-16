import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  plugins: [react()],
  base: './',
  // package.json is the single version source; scripts/build-extension.mjs writes it into the manifest.
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: { input: 'sidepanel.html' }
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts']
  }
});
