import { describe, expect, it, vi } from 'vitest';
import { deleteStudyDb, removeSiteStudyData, STUDY_DB_NAME } from '../src/background/studyStore';

// The real IndexedDB paths are unverified (no test double, D-014); these cover only the cleanup entry points.
function deletingFactory(outcome: 'success' | 'error') {
  const deleteDatabase = vi.fn(() => {
    const request = { error: null } as unknown as IDBOpenDBRequest;
    queueMicrotask(() => {
      const handler = outcome === 'success' ? request.onsuccess : request.onerror;
      handler?.call(request, new Event(outcome));
    });
    return request;
  });
  return { factory: { deleteDatabase } as unknown as IDBFactory, deleteDatabase };
}

describe('study data cleanup', () => {
  it('is a no-op without IndexedDB', async () => {
    await expect(removeSiteStudyData('site', undefined)).resolves.toBeUndefined();
    await expect(deleteStudyDb(undefined)).resolves.toBeUndefined();
  });
  it('deletes the study database on clear-all', async () => {
    const { factory, deleteDatabase } = deletingFactory('success');
    await deleteStudyDb(factory);
    expect(deleteDatabase).toHaveBeenCalledWith(STUDY_DB_NAME);
  });
  it('rejects when the delete fails so clear-all reports an error', async () => {
    await expect(deleteStudyDb(deletingFactory('error').factory)).rejects.toThrow('IndexedDB delete failed');
  });
});
