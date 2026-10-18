// Usage: npm run fixture:sanitize -- <input.html|input.json> <output.html|output.json>
// Requires Node >= 22.18 (runs TypeScript directly). Exit code 2 = manual review needed.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { JSDOM } from 'jsdom';
import { sanitizeDocument } from './sanitize-core.ts';
import { sanitizeAjaxEvents } from './sanitize-ajax-core.ts';

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error('Usage: npm run fixture:sanitize -- <input.html|input.json> <output.html|output.json>');
  process.exit(1);
}

if (input.endsWith('.json')) {
  const report = sanitizeAjaxEvents(JSON.parse(await readFile(input, 'utf8')));
  if (report.json) {
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, report.json);
  }
  const a = report.attendance;
  console.log(`Wrote ${output}: ${report.events} events.`);
  console.log(
    `Attendance: ${a.events} events, ${a.withTimestart} with timestart, ${a.withTimesort} with timesort, ` +
      `${a.withDuration} with duration, ${a.overdue} overdue, event types [${a.eventTypes.join(', ')}].`
  );
  for (const w of report.warnings) console.log(`WARNING: ${w}`);
  process.exit(report.warnings.length ? 2 : 0);
}

const dom = new JSDOM(await readFile(input, 'utf8'));
const report = sanitizeDocument(dom.window.document);
await mkdir(dirname(output), { recursive: true });
await writeFile(output, report.html);
console.log(
  `Wrote ${output}: ${report.sections} sections, ${report.activities} activities, ${report.removed} elements removed.`
);
for (const w of report.warnings) console.log(`WARNING: ${w}`);
process.exit(report.warnings.length ? 2 : 0);
