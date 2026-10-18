/** Local calendar days as `YYYY-MM-DD` keys, shared by XP streaks and the SRS review queue. */

const DAY_MS = 86_400_000;

/** Local calendar day of `at` in `timeZone`, as `YYYY-MM-DD`. */
export function dayKey(at: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(at);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

/** Whole days since the Unix epoch for a day key; differences give calendar-day gaps. */
export function dayNumber(key: string): number {
  return Math.round(Date.parse(`${key}T00:00:00Z`) / DAY_MS);
}

export function keyFromDayNumber(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

export function addDays(key: string, days: number): string {
  return keyFromDayNumber(dayNumber(key) + days);
}

export function isDayKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const day = dayNumber(value);
  return Number.isFinite(day) && keyFromDayNumber(day) === value;
}

/** Monday of the ISO week that contains `key`, as a day key. */
export function weekKey(key: string): string {
  const day = dayNumber(key);
  const weekday = new Date(day * DAY_MS).getUTCDay();
  return keyFromDayNumber(day - ((weekday + 6) % 7));
}
