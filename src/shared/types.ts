export type ActivityType =
  'resource' | 'page' | 'url' | 'attendance' | 'quiz' | 'forum' | 'assign' | 'folder' | 'book' | 'feedback' | 'unknown';
export type CompletionStatus = 'complete' | 'incomplete' | 'unknown';

export interface MoodleActivity {
  id: string;
  courseId: string;
  title: string;
  type: ActivityType;
  /** Null when Moodle shows the activity without a link (restricted). */
  url: string | null;
  restricted: boolean;
  completion: CompletionStatus;
}
export interface CourseSnapshot {
  courseId: string;
  /** Null when the page has no visible heading; the UI shows a localized fallback. */
  courseName: string | null;
  sourceUrl: string;
  capturedAt: string;
  activities: MoodleActivity[];
}
export interface Course {
  siteId: string;
  id: string;
  name: string;
  shortName?: string;
  visible: boolean;
  progress?: number;
}
export type TaskKind = 'assign' | 'quiz' | 'attendance' | 'forum' | 'event' | 'other';
export type TaskStatus = 'open' | 'overdue' | 'done' | 'unknown';
export type TaskSource = 'ajax' | 'dom';
export type TaskAjaxCapability = 'courses' | 'tasks';
export interface MoodleTask {
  siteId: string;
  courseId: string;
  activityId?: string;
  kind: TaskKind;
  title: string;
  dueAt?: string;
  url: string;
  status: TaskStatus;
  source: TaskSource;
}
export interface TaskDataset {
  siteId: string;
  courses: Course[];
  tasks: MoodleTask[];
  capturedAt: string;
  source: TaskSource;
  unsupported?: TaskAjaxCapability[];
}
/** `system` follows `prefers-color-scheme` until the student picks light or dark. */
export type Theme = 'light' | 'dark' | 'system';
export type Locale = 'en' | 'id';
/** Result of `detect.ts` on one page; `none` means no Moodle markers were found. */
export type DetectionConfidence = 'high' | 'low' | 'none';
export interface Detection {
  isMoodle: boolean;
  confidence: DetectionConfidence;
  versionHint?: string;
}
/** One Moodle site the student enabled (D-002). `id` is derived from the origin and namespaces its data. */
export interface Site {
  id: string;
  origin: string;
  label: string;
  enabledAt: string;
  versionHint?: string;
  /** Absent until detection ran on a page of this site. */
  detection?: DetectionConfidence;
}
export type IncomingMessage =
  | { type: 'COURSE_SNAPSHOT'; payload: CourseSnapshot }
  | { type: 'TASK_CAPTURE_CLAIM'; force?: boolean }
  | { type: 'TASK_DATASET'; payload: TaskDataset }
  | { type: 'SET_REMINDERS'; prefs: unknown }
  | { type: 'ENABLE_SITE'; origin: string }
  | { type: 'RENAME_SITE'; siteId: string; label: string }
  | { type: 'REMOVE_SITE'; siteId: string }
  | { type: 'CLEAR_LOCAL_DATA' }
  | { type: 'MARK_COURSE_SEEN'; siteId: string; courseId: string }
  | { type: 'SET_COURSE_PREFS'; siteId: string; courseId: string; prefs: unknown }
  | { type: 'MOVE_COURSE'; siteId: string; courseId: string; direction: 'up' | 'down' }
  | { type: 'EXPORT_BACKUP' }
  | { type: 'IMPORT_BACKUP'; backup: unknown }
  | { type: 'GET_APPEARANCE' }
  | { type: 'SET_APPEARANCE'; siteId: string; appearance: unknown };
export interface OkResponse {
  ok: boolean;
}
export interface TaskCaptureClaimResponse {
  ok: boolean;
  due: boolean;
  siteId?: string;
  unsupported?: TaskAjaxCapability[];
}
export interface ExportBackupResponse {
  ok: boolean;
  backup: unknown;
}
export interface EnableSiteResponse {
  ok: boolean;
  site: Site | null;
}
