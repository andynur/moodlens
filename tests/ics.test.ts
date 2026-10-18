import { describe, expect, it } from 'vitest';
import { tasksToIcs } from '../src/shared/ics';
import type { MoodleTask } from '../src/shared/types';

const base: MoodleTask = {
  siteId: 'site',
  courseId: '1',
  kind: 'assign',
  title: 'Essay, part 1; revise',
  dueAt: '2027-01-15T08:00:00.000Z',
  url: 'https://learn.example.edu/mod/assign/view.php?id=4',
  status: 'open',
  source: 'ajax'
};

describe('ICS export', () => {
  it('emits deterministic RFC 5545 events with CRLF and escaped text', () => {
    const output = tasksToIcs([base], new Date('2026-10-19T00:00:00Z'));
    expect(output).toContain('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n');
    expect(output).toContain('DTSTART:20270115T080000Z\r\n');
    expect(output).toContain('SUMMARY:Essay\\, part 1\\; revise\r\n');
    expect(output).toMatch(/UID:[a-f0-9]{8}@moodlens\.local/);
    expect(output.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(output.split('\r\n').every((line) => new TextEncoder().encode(line).byteLength <= 75)).toBe(true);
  });

  it('omits tasks without a Moodle timestamp', () => {
    expect(tasksToIcs([{ ...base, dueAt: undefined }])).not.toContain('BEGIN:VEVENT');
  });
});
