import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  // package.json is the single version source; scripts/build-extension.mjs writes it into the manifest.
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    // D-007 cut line: `MOODLENS_AI=off` builds without AI study.
    __AI_ENABLED__: JSON.stringify(process.env.MOODLENS_AI !== 'off')
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: { input: 'sidepanel.html' }
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts']
  }
});
