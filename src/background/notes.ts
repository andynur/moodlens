/**
 * Activity notes (ML-026): plain text the student writes about one course activity. Stored in the study
 * IndexedDB (`notes`, schema v2), deleted with the site, never part of backups or card exports.
 */
import { cleanNoteText, isNoteTarget, MAX_NOTE_LENGTH, noteId, type ActivityNote } from '../shared/focus';
import type { OkResponse } from '../shared/types';
import { loadSites } from './sites';
import { deleteNote, listCourseNotes, openStudyDb, putNote } from './studyStore';

export interface NoteView {
  activityId: string;
  text: string;
  updatedAt: string;
}

export interface CourseNotesResponse {
  ok: boolean;
  notes: NoteView[];
}

async function withDb<T>(factory: IDBFactory | undefined, fallback: T, run: (db: IDBDatabase) => Promise<T>) {
  if (!factory) return fallback;
  const db = await openStudyDb(factory);
  try {
    return await run(db);
  } finally {
    db.close();
  }
}

async function isRegistered(siteId: unknown): Promise<boolean> {
  return (await loadSites()).some((site) => site.id === siteId);
}

export async function courseNotes(
  input: { siteId: unknown; courseId: unknown },
  factory: IDBFactory | undefined = globalThis.indexedDB
): Promise<CourseNotesResponse> {
  // Any activity id makes the target check cover the site and course formats.
  if (!isNoteTarget(input.siteId, input.courseId, '0') || !(await isRegistered(input.siteId))) {
    return { ok: false, notes: [] };
  }
  const siteId = input.siteId as string;
  const courseId = input.courseId as string;
  return withDb(factory, { ok: true, notes: [] }, async (db) => ({
    ok: true,
    notes: (await listCourseNotes(db, siteId, courseId)).map((note) => ({
      activityId: note.activityId,
      text: note.text,
      updatedAt: note.updatedAt
    }))
  }));
}

/** Saves a note; empty text deletes it. Text past the length limit is refused, not cut. */
export async function saveNote(
  input: { siteId: unknown; courseId: unknown; activityId: unknown; text: unknown },
  factory: IDBFactory | undefined = globalThis.indexedDB,
  at = new Date()
): Promise<OkResponse> {
  if (!isNoteTarget(input.siteId, input.courseId, input.activityId) || typeof input.text !== 'string') {
    return { ok: false };
  }
  if (!(await isRegistered(input.siteId))) return { ok: false };
  const text = cleanNoteText(input.text);
  if (text.length > MAX_NOTE_LENGTH) return { ok: false };
  const siteId = input.siteId as string;
  const courseId = input.courseId as string;
  const activityId = input.activityId as string;
  const id = noteId(siteId, courseId, activityId);
  return withDb(factory, { ok: false }, async (db) => {
    if (text.trim() === '') {
      await deleteNote(db, id);
      return { ok: true };
    }
    const note: ActivityNote = { id, siteId, courseId, activityId, text, updatedAt: at.toISOString() };
    return { ok: await putNote(db, note) };
  });
}
