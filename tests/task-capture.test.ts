import { describe, expect, it, vi } from 'vitest';
import { captureTaskDataset } from '../src/content/moodle/task-capture';

const origin = 'https://learn.example.edu';
const siteId = 'learn.example.edu';

describe('task capture source fallback', () => {
  it('uses normalized AJAX results when both calls succeed', async () => {
    const client = {
      call: vi
        .fn()
        .mockResolvedValueOnce({ ok: true, data: [{ siteId, id: '1', name: 'Course', visible: true }] })
        .mockResolvedValueOnce({
          ok: true,
          data: [
            {
              siteId,
              courseId: '1',
              kind: 'quiz',
              title: 'Quiz',
              dueAt: '2027-01-15T08:00:00.000Z',
              url: `${origin}/mod/quiz/view.php?id=2`,
              status: 'open',
              source: 'ajax'
            }
          ]
        })
    };
    const result = await captureTaskDataset(
      document,
      `${origin}/my/`,
      siteId,
      new Date('2026-10-19T00:00:00Z'),
      client as never
    );
    expect(result.source).toBe('ajax');
    expect(result.tasks).toHaveLength(1);
  });

  it('falls back to visible DOM records when calendar AJAX is unavailable', async () => {
    const fallback = new DOMParser().parseFromString(
      `<div class="dashboard-card" data-course-id="1"><span class="coursename">Course</span></div>
       <div data-region="event-list-item" data-event-id="2" data-course-id="1"><h4>Quiz</h4>
       <a href="${origin}/mod/quiz/view.php?id=2">Open</a><span data-timestamp="1800000000"></span></div>`,
      'text/html'
    );
    const client = {
      call: vi.fn().mockResolvedValueOnce({ ok: false, reason: 'unsupported' }).mockResolvedValueOnce({
        ok: false,
        reason: 'unsupported'
      })
    };
    const result = await captureTaskDataset(fallback, `${origin}/my/`, siteId, new Date(), client as never);
    expect(result.source).toBe('dom');
    expect(result.courses).toHaveLength(1);
    expect(result.tasks[0]).toMatchObject({ title: 'Quiz', source: 'dom' });
  });
});
