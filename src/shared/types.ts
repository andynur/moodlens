import type { CardOrigin } from './cards';
import type { AiErrorCode, AiProviderId } from './ai/providers';
import type { AiPurpose, AiResult } from './ai/prompt';
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
  | { type: 'STUDY_SESSION_DONE' }
  | { type: 'XP_STATE' }
  | { type: 'SET_WEEKLY_GOAL'; goal: unknown }
  | { type: 'TASK_OPENED'; taskId: string; dueAt: string }
  | { type: 'FOCUS_STATE' }
  | { type: 'FOCUS_START'; siteId: string; courseId: string; minutes: unknown }
  | { type: 'FOCUS_CANCEL' }
  | { type: 'NOTES_FOR_COURSE'; siteId: string; courseId: string }
  | { type: 'SAVE_NOTE'; siteId: string; courseId: string; activityId: string; text: unknown }
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
/** Local XP for the panel (ML-021); never a Moodle grade. */
export interface XpView {
  ok: boolean;
  totalXp: number;
  level: number;
  levelStartXp: number;
  nextLevelXp: number;
  today: number;
  streak: number;
  longestStreak: number;
  weeklyGoal: number;
  weeklyEarned: number;
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
/** Provider settings for the panel (ML-008). Keys are never sent back, only whether one is held. */
export interface AiSettingsView {
  ok: boolean;
  enabled: boolean;
  provider: AiProviderId | null;
  models: Record<AiProviderId, string>;
  keys: Record<AiProviderId, boolean>;
}
/** What the consent screen shows before anything is sent (PRD-004 AC 1, AC 2). */
export interface AiConsentPreview {
  nonce: string;
  provider: AiProviderId;
  model: string;
  destination: string;
  purpose: AiPurpose;
  text: string;
  tokens: number;
  permission: string;
}
export type AiPrepareResponse = { ok: true; preview: AiConsentPreview } | { ok: false; error: AiErrorCode };
export type AiSendResponse = { ok: true; result: AiResult } | { ok: false; error: AiErrorCode };
