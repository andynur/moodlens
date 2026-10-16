export type ActivityType =
  | 'resource' | 'page' | 'url' | 'attendance'
  | 'quiz' | 'forum' | 'assign' | 'unknown';
export type CompletionStatus = 'complete' | 'incomplete' | 'unknown';

export interface MoodleActivity {
  id: string;
  courseId: string;
  title: string;
  type: ActivityType;
  url: string;
  completion: CompletionStatus;
}
export interface CourseSnapshot {
  courseId: string;
  courseName: string;
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
