import type { MoodleTask } from './types';

/** Today widgets (ML-004). Streak joins when XP (v0.6) stores data. */
export const WIDGETS = ['dueSoon', 'whatsNew', 'pinned', 'progress'] as const;
export type WidgetId = (typeof WIDGETS)[number];

export interface DashboardLayout {
  order: WidgetId[];
  hidden: WidgetId[];
}

export const DASHBOARD_KEY = 'dashboard';

function isWidget(value: unknown): value is WidgetId {
  return (WIDGETS as readonly unknown[]).includes(value);
}

/** Any stored value as a complete layout: unknown and duplicate ids dropped, missing widgets appended. */
export function normalizeLayout(input: unknown): DashboardLayout {
  const raw = input && typeof input === 'object' ? (input as Partial<Record<keyof DashboardLayout, unknown>>) : {};
  const order = Array.isArray(raw.order) ? [...new Set(raw.order.filter(isWidget))] : [];
  for (const widget of WIDGETS) if (!order.includes(widget)) order.push(widget);
  const hidden = Array.isArray(raw.hidden) ? [...new Set(raw.hidden.filter(isWidget))] : [];
  return { order, hidden };
}

/** Stored shape check: only known, unique ids. A layout saved before a widget existed stays valid. */
export function isDashboardLayout(input: unknown): input is DashboardLayout {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false;
  const raw = input as Record<string, unknown>;
  const ids = (value: unknown) => Array.isArray(value) && value.every(isWidget) && new Set(value).size === value.length;
  return Object.keys(raw).every((key) => key === 'order' || key === 'hidden') && ids(raw.order) && ids(raw.hidden);
}

export function moveWidget(layout: DashboardLayout, widget: WidgetId, direction: 'up' | 'down'): DashboardLayout {
  const order = [...layout.order];
  const index = order.indexOf(widget);
  const target = index + (direction === 'up' ? -1 : 1);
  if (index < 0 || target < 0 || target >= order.length) return layout;
  [order[index], order[target]] = [order[target]!, widget];
  return { ...layout, order };
}

export function toggleWidget(layout: DashboardLayout, widget: WidgetId): DashboardLayout {
  const hidden = layout.hidden.includes(widget)
    ? layout.hidden.filter((item) => item !== widget)
    : [...layout.hidden, widget];
  return { ...layout, hidden };
}

export const DUE_SOON_DAYS = 7;
export const DUE_SOON_LIMIT = 8;

/**
 * Open tasks due from now to `DUE_SOON_DAYS` ahead, soonest first, without hidden courses.
 * `hidden` holds `<siteId>/<courseId>` keys. Done tasks and tasks without a date are left out.
 */
export function dueSoon(tasks: MoodleTask[], hidden: ReadonlySet<string>, now = new Date()): MoodleTask[] {
  const start = now.valueOf();
  const end = start + DUE_SOON_DAYS * 86_400_000;
  return tasks
    .filter((task) => {
      const due = task.dueAt ? Date.parse(task.dueAt) : NaN;
      return task.status !== 'done' && due >= start && due <= end && !hidden.has(`${task.siteId}/${task.courseId}`);
    })
    .sort((a, b) => Date.parse(a.dueAt!) - Date.parse(b.dueAt!))
    .slice(0, DUE_SOON_LIMIT);
}
