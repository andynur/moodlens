// Sanitizes a saved `core_calendar_get_action_events_by_*` response so it can be committed as a
// test fixture (ML-005 evidence). Allowlist strategy: every field not listed below is dropped,
// names are replaced, URLs keep only path and `id`. Timestamps and module fields are kept because
// they are the evidence.

export interface AjaxSanitizeReport {
  json: string;
  events: number;
  attendance: AttendanceEvidence;
  warnings: string[];
}

export interface AttendanceEvidence {
  events: number;
  withTimestart: number;
  withTimesort: number;
  withDuration: number;
  overdue: number;
  eventTypes: string[];
}

type UnknownRecord = Record<string, unknown>;

const EVENT_NUMBERS = ['id', 'instance', 'timestart', 'timesort', 'timeduration', 'timemodified', 'timeusermidnight'];
const EVENT_FLAGS = ['visible', 'overdue', 'isactionevent', 'iscourseevent', 'iscategoryevent', 'canedit', 'candelete'];
const EVENT_CODES = ['modulename', 'component', 'eventtype', 'normalisedeventtype', 'normalisedeventtypetext'];
const CODE = /^[a-z][a-z0-9_ ]{0,60}$/i;
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const SESSKEY = /sesskey/i;

function record(input: unknown): UnknownRecord | null {
  return input !== null && typeof input === 'object' && !Array.isArray(input) ? (input as UnknownRecord) : null;
}

/** Accepts the raw `service.php` array envelope, `{ data }`, or the bare `{ events }` object. */
function unwrap(input: unknown): UnknownRecord | null {
  const first = Array.isArray(input) ? record(input[0]) : record(input);
  if (!first) return null;
  if (Array.isArray(first.events)) return first;
  const data = record(first.data);
  return data && Array.isArray(data.events) ? data : null;
}

function safeUrl(input: unknown): string | undefined {
  if (typeof input !== 'string') return undefined;
  try {
    const url = new URL(input);
    const id = url.searchParams.get('id');
    return `${url.origin}${url.pathname}${id && /^\d+$/.test(id) ? `?id=${id}` : ''}`;
  } catch {
    return undefined;
  }
}

function copyNumbers(from: UnknownRecord, to: UnknownRecord, keys: string[]): void {
  for (const key of keys) if (typeof from[key] === 'number' && Number.isFinite(from[key])) to[key] = from[key];
}

function copyFlags(from: UnknownRecord, to: UnknownRecord, keys: string[]): void {
  for (const key of keys) {
    const value = from[key];
    if (typeof value === 'boolean' || value === 0 || value === 1) to[key] = value;
  }
}

export function sanitizeAjaxEvents(input: unknown): AjaxSanitizeReport {
  const warnings: string[] = [];
  const attendance: AttendanceEvidence = {
    events: 0,
    withTimestart: 0,
    withTimesort: 0,
    withDuration: 0,
    overdue: 0,
    eventTypes: []
  };
  const envelope = unwrap(input);
  if (!envelope) {
    return { json: '', events: 0, attendance, warnings: ['No `events` array found; nothing written.'] };
  }
  const courseNames = new Map<string, number>();
  const eventTypes = new Set<string>();
  const events = (envelope.events as unknown[]).flatMap((raw, index) => {
    const item = record(raw);
    if (!item) return [];
    const event: UnknownRecord = {};
    copyNumbers(item, event, EVENT_NUMBERS);
    copyFlags(item, event, EVENT_FLAGS);
    for (const key of EVENT_CODES) {
      const value = item[key];
      if (typeof value === 'string' && CODE.test(value)) event[key] = value;
    }
    const isAttendance = event.modulename === 'attendance' || event.component === 'mod_attendance';
    event.name = `${isAttendance ? 'Attendance' : 'Event'} ${index + 1}`;
    const url = safeUrl(item.url);
    if (url) event.url = url;

    const course = record(item.course);
    if (course) {
      const key = String(course.id);
      if (!courseNames.has(key)) courseNames.set(key, courseNames.size + 1);
      const n = courseNames.get(key);
      const sanitized: UnknownRecord = { fullname: `Sample Course ${n}`, fullnamedisplay: `Sample Course ${n}` };
      sanitized.shortname = `SC${n}`;
      copyNumbers(course, sanitized, ['id']);
      copyFlags(course, sanitized, ['visible']);
      event.course = sanitized;
    }

    const action = record(item.action);
    if (action) {
      const sanitized: UnknownRecord = { name: 'Action' };
      copyNumbers(action, sanitized, ['itemcount']);
      copyFlags(action, sanitized, ['actionable', 'showitemcount']);
      const actionUrl = safeUrl(action.url);
      if (actionUrl) sanitized.url = actionUrl;
      event.action = sanitized;
    }

    if (isAttendance) {
      attendance.events += 1;
      if (typeof event.timestart === 'number' && event.timestart > 0) attendance.withTimestart += 1;
      if (typeof event.timesort === 'number' && event.timesort > 0) attendance.withTimesort += 1;
      if (typeof event.timeduration === 'number' && event.timeduration > 0) attendance.withDuration += 1;
      if (event.overdue === true || event.overdue === 1) attendance.overdue += 1;
      if (typeof event.eventtype === 'string') eventTypes.add(event.eventtype);
    }
    return [event];
  });
  attendance.eventTypes = [...eventTypes].sort();

  const output: UnknownRecord = { events };
  copyNumbers(envelope, output, ['firstid', 'lastid']);
  const json = `${JSON.stringify(output, null, 2)}\n`;
  if (EMAIL.test(json)) warnings.push('Email-like text remains; review by hand.');
  if (SESSKEY.test(json)) warnings.push('`sesskey` text remains; review by hand.');
  if (attendance.events === 0) warnings.push('No attendance events found; ML-005 is not proven by this capture.');
  return { json, events: events.length, attendance, warnings };
}
