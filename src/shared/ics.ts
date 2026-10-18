import type { MoodleTask } from './types';
import { taskIdentity } from './tasks';

function utc(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

function escapeText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function hash(value: string): string {
  let result = 2_166_136_261;
  for (const char of value) {
    result ^= char.codePointAt(0)!;
    result = Math.imul(result, 16_777_619);
  }
  return (result >>> 0).toString(16).padStart(8, '0');
}

function fold(line: string): string[] {
  const lines: string[] = [];
  let current = '';
  let bytes = 0;
  for (const char of line) {
    const size = new TextEncoder().encode(char).byteLength;
    const limit = lines.length === 0 ? 75 : 74;
    if (bytes + size > limit && current) {
      lines.push(`${lines.length === 0 ? '' : ' '}${current}`);
      current = char;
      bytes = size;
    } else {
      current += char;
      bytes += size;
    }
  }
  lines.push(`${lines.length === 0 ? '' : ' '}${current}`);
  return lines;
}

/** RFC 5545 calendar generated locally. Tasks without a due timestamp are intentionally omitted. */
export function tasksToIcs(tasks: MoodleTask[], now = new Date()): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Moodlens//Tasks//EN', 'CALSCALE:GREGORIAN'];
  for (const task of tasks) {
    if (!task.dueAt) continue;
    const due = new Date(task.dueAt);
    if (!Number.isFinite(due.valueOf())) continue;
    lines.push(
      'BEGIN:VEVENT',
      `UID:${hash(taskIdentity(task))}@moodlens.local`,
      `DTSTAMP:${utc(now)}`,
      `DTSTART:${utc(due)}`,
      `SUMMARY:${escapeText(task.title)}`,
      `URL:${task.url}`,
      'END:VEVENT'
    );
  }
  lines.push('END:VCALENDAR');
  return `${lines.flatMap(fold).join('\r\n')}\r\n`;
}
