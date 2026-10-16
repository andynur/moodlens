import { build } from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';

await mkdir('dist', { recursive: true });
const common = {
  bundle: true,
  platform: 'browser',
  format: 'iife',
  target: ['chrome116'],
  minify: false,
  sourcemap: false,
  logLevel: 'info'
};
await build({ ...common, entryPoints: ['src/background/index.ts'], outfile: 'dist/background.js' });
await build({ ...common, entryPoints: ['src/content/index.ts'], outfile: 'dist/content.js' });
await copyFile('public/manifest.json', 'dist/manifest.json');
console.log('Unpacked Chrome extension created in dist/');
