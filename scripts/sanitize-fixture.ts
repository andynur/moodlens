// Usage: npm run fixture:sanitize -- <input.html> <output.html>
// Requires Node >= 22.18 (runs TypeScript directly). Exit code 2 = manual review needed.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { JSDOM } from 'jsdom';
import { sanitizeDocument } from './sanitize-core.ts';

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error('Usage: npm run fixture:sanitize -- <input.html> <output.html>');
  process.exit(1);
}
const dom = new JSDOM(await readFile(input, 'utf8'));
const report = sanitizeDocument(dom.window.document);
await mkdir(dirname(output), { recursive: true });
await writeFile(output, report.html);
console.log(`Wrote ${output}: ${report.sections} sections, ${report.activities} activities, ${report.removed} elements removed.`);
for (const w of report.warnings) console.log(`WARNING: ${w}`);
process.exit(report.warnings.length ? 2 : 0);
