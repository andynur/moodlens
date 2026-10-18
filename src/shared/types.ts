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
  | { type: 'ENABLE_SITE'; origin: string }
  | { type: 'RENAME_SITE'; siteId: string; label: string }
  | { type: 'REMOVE_SITE'; siteId: string }
  | { type: 'CLEAR_LOCAL_DATA' };
export interface OkResponse {
  ok: boolean;
}
export interface EnableSiteResponse {
  ok: boolean;
  site: Site | null;
}
