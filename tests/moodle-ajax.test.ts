// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { isAllowedReadMethod, MoodleAjaxClient, type MoodleReadMethod } from '../src/content/moodle/ajax';

const ORIGIN = 'https://moodle.example.edu';
const METHOD: MoodleReadMethod = 'core_calendar_get_action_events_by_timesort';

function page(sesskey = 'safeSessionKey'): Document {
  return new DOMParser().parseFromString(
    `<a href="${ORIGIN}/login/logout.php?sesskey=${sesskey}">Log out</a>`,
    'text/html'
  );
}

function jsonResponse(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), { status: 200, ...init });
}

const acceptObject = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

describe('Moodle AJAX security boundary', () => {
  it('allows only the typed read allowlist and rejects write-like names', () => {
    expect(isAllowedReadMethod(METHOD)).toBe(true);
    expect(isAllowedReadMethod('core_completion_update_activity_completion_status_manually')).toBe(false);
    expect(isAllowedReadMethod('core_calendar_delete_calendar_events')).toBe(false);
    expect(isAllowedReadMethod('unknown_read_function')).toBe(false);
  });

  it('makes a same-origin credentialed POST and returns only validated data', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void input;
      void init;
      return jsonResponse([{ error: false, data: { events: [] } }]);
    });
    const client = new MoodleAjaxClient(page(), `${ORIGIN}/my/`, { fetchImpl });

    await expect(client.call(METHOD, { limitnum: 20 }, acceptObject)).resolves.toEqual({
      ok: true,
      data: { events: [] }
    });

    const [url, init] = fetchImpl.mock.calls[0]!;
    const endpoint = new URL(String(url));
    expect(endpoint.origin).toBe(ORIGIN);
    expect(endpoint.pathname).toBe('/lib/ajax/service.php');
    expect(endpoint.searchParams.get('info')).toBe(METHOD);
    expect(endpoint.searchParams.get('sesskey')).toBe('safeSessionKey');
    expect(init).toMatchObject({ method: 'POST', credentials: 'same-origin', redirect: 'error' });
    expect(String(init?.body)).not.toContain('safeSessionKey');
  });

  it('reads the sesskey at call time and never calls fetch when it is missing or malformed', async () => {
    const fetchImpl = vi.fn();
    const document = page('bad-value!');
    const client = new MoodleAjaxClient(document, `${ORIGIN}/my/`, { fetchImpl });
    await expect(client.call(METHOD, {}, acceptObject)).resolves.toEqual({ ok: false, reason: 'missing-sesskey' });

    document.body.innerHTML = '<input name="sesskey" value="freshKey123">';
    fetchImpl.mockResolvedValueOnce(jsonResponse([{ error: false, data: {} }]));
    await expect(client.call(METHOD, {}, acceptObject)).resolves.toEqual({ ok: true, data: {} });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('rejects non-HTTPS page origins before a network request', async () => {
    const fetchImpl = vi.fn();
    const client = new MoodleAjaxClient(page(), 'http://moodle.example.edu/my/', { fetchImpl });
    await expect(client.call(METHOD, {}, acceptObject)).resolves.toEqual({ ok: false, reason: 'invalid-origin' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('caps calls at ten per rolling minute', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse([{ error: false, data: {} }]));
    const client = new MoodleAjaxClient(page(), `${ORIGIN}/my/`, { fetchImpl, now: () => 1_000 });
    for (let index = 0; index < 10; index += 1) {
      await expect(client.call(METHOD, { index }, acceptObject)).resolves.toMatchObject({ ok: true });
    }
    await expect(client.call(METHOD, {}, acceptObject)).resolves.toEqual({ ok: false, reason: 'rate-limited' });
    expect(fetchImpl).toHaveBeenCalledTimes(10);
  });

  it('caches Moodle error envelopes as unsupported without exposing their content', async () => {
    let now = 1_000;
    const fetchImpl = vi.fn(async () =>
      jsonResponse([{ error: true, exception: { message: 'sensitive server detail' }, errorcode: 'invalidrecord' }])
    );
    const client = new MoodleAjaxClient(page(), `${ORIGIN}/my/`, { fetchImpl, now: () => now });
    await expect(client.call(METHOD, {}, acceptObject)).resolves.toEqual({ ok: false, reason: 'unsupported' });
    await expect(client.call(METHOD, {}, acceptObject)).resolves.toEqual({ ok: false, reason: 'unsupported' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    now += 24 * 60 * 60 * 1000 + 1;
    await client.call(METHOD, {}, acceptObject);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('rejects oversized and unvalidated responses', async () => {
    const oversized = vi.fn(async () => new Response('123456', { headers: { 'content-length': '6' } }));
    const cappedClient = new MoodleAjaxClient(page(), `${ORIGIN}/my/`, {
      fetchImpl: oversized,
      maxResponseBytes: 5
    });
    await expect(cappedClient.call(METHOD, {}, acceptObject)).resolves.toEqual({
      ok: false,
      reason: 'response-too-large'
    });

    const invalid = vi.fn(async () => jsonResponse([{ error: false, data: ['raw', 'array'] }]));
    const validatingClient = new MoodleAjaxClient(page(), `${ORIGIN}/my/`, { fetchImpl: invalid });
    await expect(validatingClient.call(METHOD, {}, acceptObject)).resolves.toEqual({
      ok: false,
      reason: 'invalid-response'
    });
  });
});
