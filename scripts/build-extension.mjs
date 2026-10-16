import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

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
// package.json is the single version source.
const { version } = JSON.parse(await readFile('package.json', 'utf8'));
const manifest = JSON.parse(await readFile('public/manifest.json', 'utf8'));
await writeFile('dist/manifest.json', `${JSON.stringify({ ...manifest, version }, null, 2)}\n`);
console.log('Unpacked Chrome extension created in dist/');
