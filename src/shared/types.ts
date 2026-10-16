export type ActivityType =
  | 'resource' | 'page' | 'url' | 'attendance'
  | 'quiz' | 'forum' | 'assign' | 'folder' | 'book' | 'feedback' | 'unknown';
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
export type Theme = 'light' | 'dark';
export type Locale = 'en' | 'id';
export type IncomingMessage =
  | { type: 'COURSE_SNAPSHOT'; payload: CourseSnapshot }
  | { type: 'GET_COURSE_SNAPSHOT' };
export interface SnapshotResponse {
  ok: boolean;
  snapshot: CourseSnapshot | null;
}
