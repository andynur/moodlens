import { createHash } from 'node:crypto';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', stdio: 'pipe', ...options });
  if (result.status !== 0) {
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
    throw new Error(`${command} ${args.join(' ')} failed${output ? `\n${output}` : ''}`);
  }
  return (result.stdout ?? '').trim();
}

const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
if (!/^\d+(?:\.\d+){0,3}$/.test(pkg.version)) {
  throw new Error(`Chrome requires a numeric version with up to four parts; received ${pkg.version}`);
}

console.log(`Running the full release gate for v${pkg.version}...`);
run('npm', ['run', 'check', '--silent'], { stdio: 'inherit' });

const manifest = JSON.parse(await readFile(path.join(root, 'dist/manifest.json'), 'utf8'));
if (manifest.version !== pkg.version) throw new Error('dist/manifest.json does not match package.json');
if (Array.isArray(manifest.host_permissions) && manifest.host_permissions.length > 0) {
  throw new Error('Static host permissions are forbidden');
}
if (JSON.stringify(manifest.optional_host_permissions) !== JSON.stringify(['https://*/*'])) {
  throw new Error('Unexpected optional host permissions');
}
const forbiddenPermissions = ['tabs', 'cookies', 'webRequest', 'webRequestBlocking', '<all_urls>'];
const declared = [...(manifest.permissions ?? []), ...(manifest.optional_permissions ?? [])];
const forbidden = forbiddenPermissions.filter((permission) => declared.includes(permission));
if (forbidden.length > 0) throw new Error(`Forbidden permissions: ${forbidden.join(', ')}`);

const releaseDir = path.join(root, 'release');
const filename = `moodlens-v${pkg.version}.zip`;
const archive = path.join(releaseDir, filename);
await mkdir(releaseDir, { recursive: true });
await rm(archive, { force: true });
run('zip', ['-q', '-r', archive, '.'], { cwd: path.join(root, 'dist') });

const entries = run('unzip', ['-Z1', archive]).split('\n').filter(Boolean);
const required = ['manifest.json', 'sidepanel.html', 'background.js', 'content.js', 'appearance.js'];
for (const entry of required) if (!entries.includes(entry)) throw new Error(`Release ZIP is missing ${entry}`);
const unsafe = entries.filter(
  (entry) =>
    entry.startsWith('/') ||
    entry.startsWith('dist/') ||
    entry.includes('..') ||
    entry.endsWith('.map') ||
    entry.includes('fixtures/') ||
    entry.includes('store-preview') ||
    entry.startsWith('tests/') ||
    entry.startsWith('src/')
);
if (unsafe.length > 0) throw new Error(`Unexpected release entries: ${unsafe.join(', ')}`);

const bytes = await readFile(archive);
const digest = createHash('sha256').update(bytes).digest('hex');
console.log(`Created release/${filename}`);
console.log(`Files: ${entries.length}; bytes: ${bytes.length}; SHA-256: ${digest}`);
