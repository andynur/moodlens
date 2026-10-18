const ALLOWLISTED_METHODS = [
  'core_course_get_enrolled_courses_by_timeline_classification',
  'core_calendar_get_action_events_by_timesort',
  'core_calendar_get_action_events_by_course',
  'core_course_get_contents',
  'core_completion_get_activities_completion_status'
] as const;

export type MoodleReadMethod = (typeof ALLOWLISTED_METHODS)[number];

const ALLOWLIST: ReadonlySet<string> = new Set(ALLOWLISTED_METHODS);
const WRITE_LIKE_NAME = /(update|set|create|delete|submit|save|toggle|mark|process|add|remove)/i;
const SESSION_KEY = /^[a-z0-9]{1,128}$/i;

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_CALLS = 10;
const UNSUPPORTED_TTL_MS = 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 1_000_000;
const MAX_REQUEST_BYTES = 16_000;

export type MoodleAjaxFailure =
  | 'invalid-origin'
  | 'forbidden-method'
  | 'missing-sesskey'
  | 'invalid-arguments'
  | 'rate-limited'
  | 'unsupported'
  | 'timeout'
  | 'network-error'
  | 'http-error'
  | 'response-too-large'
  | 'invalid-response';

export type MoodleAjaxResult<T> = { ok: true; data: T } | { ok: false; reason: MoodleAjaxFailure };

interface MoodleAjaxClientOptions {
  fetchImpl?: typeof fetch;
  now?: () => number;
  timeoutMs?: number;
  maxResponseBytes?: number;
}

interface MoodleEnvelope {
  error: boolean;
  data?: unknown;
  exception?: unknown;
  errorcode?: unknown;
}

export function isAllowedReadMethod(method: string): method is MoodleReadMethod {
  return ALLOWLIST.has(method) && !WRITE_LIKE_NAME.test(method);
}

function readSesskey(document: Document, origin: string): string | null {
  const input = document.querySelector<HTMLInputElement>('input[name="sesskey"]')?.value.trim();
  if (input && SESSION_KEY.test(input)) return input;

  for (const anchor of document.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    try {
      const url = new URL(anchor.href, origin);
      if (url.origin !== origin || url.pathname !== '/login/logout.php') continue;
      const value = url.searchParams.get('sesskey')?.trim();
      if (value && SESSION_KEY.test(value)) return value;
    } catch {
      // Ignore malformed links from the untrusted page.
    }
  }
  return null;
}

function isEnvelope(input: unknown): input is MoodleEnvelope {
  return !!input && typeof input === 'object' && typeof (input as Partial<MoodleEnvelope>).error === 'boolean';
}

function isUnsupportedEnvelope(input: unknown): boolean {
  if (!input || typeof input !== 'object') return false;
  const envelope = input as Partial<MoodleEnvelope>;
  return envelope.error === true || envelope.exception !== undefined || envelope.errorcode !== undefined;
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

/**
 * Same-origin, read-only Moodle AJAX client (D-003).
 * Raw responses and the page sesskey never leave this class.
 */
export class MoodleAjaxClient {
  readonly #document: Document;
  readonly #origin: string | null;
  readonly #fetch: typeof fetch;
  readonly #now: () => number;
  readonly #timeoutMs: number;
  readonly #maxResponseBytes: number;
  readonly #callTimes: number[] = [];
  readonly #unsupportedUntil = new Map<MoodleReadMethod, number>();

  constructor(document: Document, pageUrl: string, options: MoodleAjaxClientOptions = {}) {
    this.#document = document;
    this.#fetch = options.fetchImpl ?? fetch;
    this.#now = options.now ?? Date.now;
    this.#timeoutMs = options.timeoutMs ?? TIMEOUT_MS;
    this.#maxResponseBytes = options.maxResponseBytes ?? MAX_RESPONSE_BYTES;

    try {
      const url = new URL(pageUrl);
      this.#origin = url.protocol === 'https:' ? url.origin : null;
    } catch {
      this.#origin = null;
    }
  }

  async call<T>(
    method: MoodleReadMethod,
    args: Readonly<Record<string, unknown>>,
    validate: (data: unknown) => T | null
  ): Promise<MoodleAjaxResult<T>> {
    if (!this.#origin) return { ok: false, reason: 'invalid-origin' };
    if (!isAllowedReadMethod(method)) return { ok: false, reason: 'forbidden-method' };

    const now = this.#now();
    if ((this.#unsupportedUntil.get(method) ?? 0) > now) return { ok: false, reason: 'unsupported' };

    const sesskey = readSesskey(this.#document, this.#origin);
    if (!sesskey) return { ok: false, reason: 'missing-sesskey' };

    const oldestAllowed = now - RATE_LIMIT_WINDOW_MS;
    while ((this.#callTimes[0] ?? Infinity) <= oldestAllowed) this.#callTimes.shift();
    if (this.#callTimes.length >= RATE_LIMIT_CALLS) return { ok: false, reason: 'rate-limited' };

    let body: string;
    try {
      body = JSON.stringify([{ index: 0, methodname: method, args }]);
    } catch {
      return { ok: false, reason: 'invalid-arguments' };
    }
    if (byteLength(body) > MAX_REQUEST_BYTES) return { ok: false, reason: 'invalid-arguments' };

    this.#callTimes.push(now);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), this.#timeoutMs);
    const endpoint = new URL('/lib/ajax/service.php', this.#origin);
    endpoint.searchParams.set('sesskey', sesskey);
    endpoint.searchParams.set('info', method);

    let response: Response;
    let text: string;
    try {
      response = await this.#fetch(endpoint, {
        method: 'POST',
        credentials: 'same-origin',
        redirect: 'error',
        headers: { 'content-type': 'application/json' },
        body,
        signal: controller.signal
      });
      if (!response.ok) return { ok: false, reason: 'http-error' };
      const declaredLength = Number(response.headers.get('content-length'));
      if (Number.isFinite(declaredLength) && declaredLength > this.#maxResponseBytes) {
        return { ok: false, reason: 'response-too-large' };
      }
      text = await response.text();
    } catch (error) {
      return {
        ok: false,
        reason: error instanceof DOMException && error.name === 'AbortError' ? 'timeout' : 'network-error'
      };
    } finally {
      window.clearTimeout(timeout);
    }

    if (byteLength(text) > this.#maxResponseBytes) return { ok: false, reason: 'response-too-large' };

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { ok: false, reason: 'invalid-response' };
    }
    if (!Array.isArray(parsed) || parsed.length !== 1) return { ok: false, reason: 'invalid-response' };
    const envelope = parsed[0];
    if (isUnsupportedEnvelope(envelope)) {
      this.#unsupportedUntil.set(method, now + UNSUPPORTED_TTL_MS);
      return { ok: false, reason: 'unsupported' };
    }
    if (!isEnvelope(envelope) || envelope.error || !('data' in envelope)) {
      return { ok: false, reason: 'invalid-response' };
    }

    try {
      const data = validate(envelope.data);
      return data === null ? { ok: false, reason: 'invalid-response' } : { ok: true, data };
    } catch {
      return { ok: false, reason: 'invalid-response' };
    }
  }
}
