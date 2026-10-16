import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Machine-enforced rules from AGENTS.md (hard rules 4 and 5). Change these only with a PRD reason.
const ROOT = process.cwd();
const manifest = JSON.parse(readFileSync(join(ROOT, 'public/manifest.json'), 'utf8')) as {
  permissions?: string[];
  optional_permissions?: string[];
  host_permissions?: string[];
  optional_host_permissions?: string[];
  content_scripts?: { matches: string[] }[];
  icons?: Record<string, string>;
  action?: { default_icon?: Record<string, string> };
};
const FORBIDDEN = ['<all_urls>', 'cookies', 'tabs', 'webRequest', 'webRequestBlocking', 'debugger', 'history'];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

describe('manifest guard', () => {
  it('declares icons 16/32/48/128 that exist as PNG files', () => {
    expect(Object.keys(manifest.icons ?? {}).sort((a, b) => Number(a) - Number(b))).toEqual(['16', '32', '48', '128']);
    for (const [size, path] of Object.entries({ ...manifest.icons, ...manifest.action?.default_icon })) {
      const file = join(ROOT, 'public', path);
      expect(existsSync(file), path).toBe(true);
      const png = readFileSync(file);
      expect(png.subarray(1, 4).toString('ascii')).toBe('PNG');
      expect(png.readUInt32BE(16)).toBe(Number(size));
    }
  });
  it('matches the approved permission snapshot', () => {
    expect(manifest.permissions).toEqual(['storage', 'sidePanel']);
    expect(manifest.optional_permissions ?? []).toEqual([]);
    expect(manifest.host_permissions ?? []).toEqual([]);
    expect(manifest.optional_host_permissions ?? []).toEqual([]);
    expect(manifest.content_scripts?.flatMap((script) => script.matches)).toEqual([
      'https://solusi.sibermu.ac.id/course/view.php*'
    ]);
  });
  it('contains no forbidden permission or broad host pattern', () => {
    const all = [
      ...(manifest.permissions ?? []), ...(manifest.optional_permissions ?? []),
      ...(manifest.host_permissions ?? []), ...(manifest.optional_host_permissions ?? []),
      ...(manifest.content_scripts ?? []).flatMap((script) => script.matches)
    ];
    expect(all.filter((value) => FORBIDDEN.includes(value) || /^\*:\/\/|^https?:\/\/\*\//.test(value))).toEqual([]);
  });
});

describe('source guard', () => {
  it('never renders raw HTML', () => {
    const offenders = sourceFiles(join(ROOT, 'src'))
      .filter((file) => /dangerouslySetInnerHTML|\.(?:inner|outer)HTML\s*=/.test(readFileSync(file, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
