import type { CardOrigin } from './cards';
import type { SrsRating } from './srs';
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
  | { type: 'GUARD_STATE'; payload: unknown }
  | { type: 'GET_GUARD' }
  | { type: 'SET_STUDY_RETENTION'; days: unknown }
  | { type: 'STUDY_OVERVIEW' }
  | { type: 'STUDY_CREATE_DECK'; siteId: string; name: string; courseId?: string }
  | { type: 'STUDY_DELETE_DECK'; deckId: string }
  | { type: 'STUDY_ADD_CARDS'; siteId: string; deckId: string; cards: unknown }
  | { type: 'STUDY_REVIEW'; cardId: string; rating: unknown }
  | { type: 'STUDY_EXPORT_CARDS'; format: 'json' | 'csv' }
  | { type: 'PRACTICE_OFFER'; count: unknown }
  | { type: 'STUDY_SAVE_MISTAKES'; deckId: string }
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
/** Fail-closed assessment verdict for every open tab of every registered site (ML-022). */
export interface GuardStatusResponse {
  ok: boolean;
  active: boolean;
  reasons: string[];
}
/** Deck summary for the Study page (ML-019). */
export interface StudyDeckView {
  id: string;
  siteId: string;
  name: string;
  courseId?: string;
  cards: number;
  due: number;
}
/** One card in the review queue, with the interval each rating would give today. */
export interface StudyCardView {
  id: string;
  siteId: string;
  deckId: string;
  front: string;
  back: string;
  sourceUrl?: string;
  origin: CardOrigin;
  intervals: Record<SrsRating, number>;
}
/** Wrong questions a finished quiz review page holds right now (ML-020); no question text. */
export interface PracticeOffer {
  siteId: string;
  count: number;
}
export interface StudyOverviewResponse {
  ok: boolean;
  decks: StudyDeckView[];
  queue: StudyCardView[];
  /** Null unless a finished review page of a registered site is open. */
  offer?: PracticeOffer | null;
  /** Cards that exist but are not due today, for the "nothing to review" message. */
  later: number;
}
export interface StudyExportResponse {
  ok: boolean;
  text: string;
  cards: number;
}
export interface EnableSiteResponse {
  ok: boolean;
  site: Site | null;
}
