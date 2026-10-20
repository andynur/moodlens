/**
 * BYOK AI service (ML-008, ML-009). The background owns the key and the only provider request.
 *
 * Two steps, so nothing leaves the device before consent (PRD-004 AC 1, AC 2):
 * 1. `prepareAiTask` validates the excerpts, builds the exact prompt and keeps it in session storage
 *    under a one-time nonce; the panel shows that text, destination and purpose.
 * 2. `sendAiTask` sends exactly that stored prompt, once, after the student pressed Continue.
 * The assessment guard is checked at both steps and fails closed (AC 5).
 */
import { claimRollingWindow } from '../shared/rateLimit';
import { AI_ENABLED } from '../shared/ai/flag';
import {
  AI_PROVIDERS,
  AI_SETTINGS_KEY,
  buildProviderRequest,
  classifyHttpError,
  cleanKey,
  cleanModel,
  isAiProvider,
  normalizeAiSettings,
  PROVIDER_INFO,
  replyText,
  type AiErrorCode,
  type AiPrompt,
  type AiProviderId
} from '../shared/ai/providers';
import {
  buildPrompt,
  estimateTokens,
  parseReply,
  promptPreview,
  validateTaskInput,
  type AiEvidence,
  type AiPurpose
} from '../shared/ai/prompt';
import type { AiPrepareResponse, AiSendResponse, AiSettingsView, OkResponse } from '../shared/types';
import { guardStatus } from './guard';
import { loadSites } from './sites';

const KEY_PREFIX = 'aiKey:';
const PENDING_KEY = 'ai:pending';
const RATE_KEY = 'ai:rate';
/** A consent screen left open longer than this must be confirmed again. */
const PENDING_TTL_MS = 10 * 60 * 1000;
const RATE_MAX = 6;
const RATE_WINDOW_MS = 60 * 1000;
const REQUEST_TIMEOUT_MS = 90 * 1000;
const MAX_RESPONSE_BYTES = 2_000_000;

interface PendingTask {
  nonce: string;
  provider: AiProviderId;
  model: string;
  purpose: AiPurpose;
  prompt: AiPrompt;
  evidence: AiEvidence[];
  createdAt: number;
}

const keyName = (provider: AiProviderId) => `${KEY_PREFIX}${provider}`;

async function loadSettings() {
  return normalizeAiSettings((await chrome.storage.local.get(AI_SETTINGS_KEY))[AI_SETTINGS_KEY]);
}

async function loadKey(provider: AiProviderId): Promise<string | null> {
  const value: unknown = (await chrome.storage.session.get(keyName(provider)))[keyName(provider)];
  return cleanKey(value);
}

export async function aiSettingsView(): Promise<AiSettingsView> {
  const settings = await loadSettings();
  const stored = await chrome.storage.session.get(AI_PROVIDERS.map(keyName));
  const keys = Object.fromEntries(AI_PROVIDERS.map((id) => [id, cleanKey(stored[keyName(id)]) !== null]));
  return {
    ok: true,
    enabled: AI_ENABLED,
    provider: settings.provider,
    models: settings.models,
    keys: keys as Record<AiProviderId, boolean>
  };
}

/** Saves the provider choice and its model name. `provider: null` turns AI study off. */
export async function saveAiSettings(input: { provider: unknown; model?: unknown }): Promise<OkResponse> {
  if (!AI_ENABLED) return { ok: false };
  const settings = await loadSettings();
  if (input.provider === null) {
    settings.provider = null;
  } else {
    if (!isAiProvider(input.provider)) return { ok: false };
    settings.provider = input.provider;
    if (input.model !== undefined) {
      const model = cleanModel(input.model);
      if (!model) return { ok: false };
      settings.models[input.provider] = model;
    }
  }
  await chrome.storage.local.set({ [AI_SETTINGS_KEY]: settings });
  return { ok: true };
}

/** Keeps a key for this browser session only (`chrome.storage.session`, not encrypted, never synced). */
export async function saveAiKey(input: { provider: unknown; key: unknown }): Promise<OkResponse> {
  if (!AI_ENABLED || !isAiProvider(input.provider)) return { ok: false };
  const key = cleanKey(input.key);
  if (!key) return { ok: false };
  await chrome.storage.session.set({ [keyName(input.provider)]: key });
  return { ok: true };
}

/**
 * "Forget key": drops every stored key and any prepared request, and gives back the provider host
 * access, so the next request needs a fresh permission prompt. An enabled Moodle site keeps its access.
 */
export async function forgetAiKeys(): Promise<OkResponse> {
  await chrome.storage.session.remove([...AI_PROVIDERS.map(keyName), PENDING_KEY]);
  const siteOrigins = new Set((await loadSites()).map((site) => site.origin));
  const origins = AI_PROVIDERS.map((id) => PROVIDER_INFO[id])
    .filter((info) => !siteOrigins.has(info.origin))
    .map((info) => info.permission);
  const { origins: granted = [] } = await chrome.permissions.getAll();
  const held = origins.filter((origin) => granted.includes(origin));
  if (held.length > 0) await chrome.permissions.remove({ origins: held }).catch(() => false);
  return { ok: true };
}

/** Reads a response body without holding more than `max` bytes; null when it is longer. */
async function readCapped(response: Response, max: number): Promise<string | null> {
  const declared = Number(response.headers.get('Content-Length'));
  if (Number.isFinite(declared) && declared > max) {
    await response.body?.cancel().catch(() => undefined);
    return null;
  }
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export async function cancelAiTask(): Promise<OkResponse> {
  await chrome.storage.session.remove(PENDING_KEY);
  return { ok: true };
}

const fail = (error: AiErrorCode) => ({ ok: false as const, error });

/** Step 1: builds the request and returns what the consent screen must show. Sends nothing. */
export async function prepareAiTask(input: unknown, now = Date.now()): Promise<AiPrepareResponse> {
  if (!AI_ENABLED) return fail('disabled');
  if ((await guardStatus()).active) return fail('guard');
  const settings = await loadSettings();
  const provider = settings.provider;
  if (!provider) return fail('no-provider');
  if (!(await loadKey(provider))) return fail('no-key');
  const task = validateTaskInput(input);
  if (!task) return fail('invalid');
  const prompt = buildPrompt(task);
  const model = settings.models[provider];
  const pending: PendingTask = {
    nonce: crypto.randomUUID(),
    provider,
    model,
    purpose: task.purpose,
    prompt,
    evidence: task.evidence,
    createdAt: now
  };
  await chrome.storage.session.set({ [PENDING_KEY]: pending });
  const text = promptPreview(prompt);
  return {
    ok: true,
    preview: {
      nonce: pending.nonce,
      provider,
      model,
      destination: buildProviderRequest(provider, model, '', prompt).url,
      purpose: task.purpose,
      text,
      tokens: estimateTokens(text),
      permission: PROVIDER_INFO[provider].permission
    }
  };
}

function isPending(value: unknown): value is PendingTask {
  if (!value || typeof value !== 'object') return false;
  const task = value as Partial<PendingTask>;
  return (
    typeof task.nonce === 'string' &&
    isAiProvider(task.provider) &&
    cleanModel(task.model) === task.model &&
    typeof task.createdAt === 'number' &&
    !!task.prompt &&
    typeof task.prompt.system === 'string' &&
    typeof task.prompt.user === 'string' &&
    Array.isArray(task.evidence)
  );
}

const inFlight = new Set<string>();

/** Step 2: sends the prepared prompt once. Only the nonce comes from the panel, never the text. */
export async function sendAiTask(
  nonce: unknown,
  fetchImpl: typeof fetch = globalThis.fetch.bind(globalThis),
  now = Date.now()
): Promise<AiSendResponse> {
  if (!AI_ENABLED) return fail('disabled');
  if (typeof nonce !== 'string' || inFlight.has(nonce)) return fail('expired');
  inFlight.add(nonce);
  try {
    const stored: unknown = (await chrome.storage.session.get(PENDING_KEY))[PENDING_KEY];
    if (!isPending(stored) || stored.nonce !== nonce) return fail('expired');
    // One consent, one request: the prepared prompt is gone whatever happens next.
    await chrome.storage.session.remove(PENDING_KEY);
    if (now - stored.createdAt > PENDING_TTL_MS || stored.createdAt > now) return fail('expired');
    if ((await guardStatus()).active) return fail('guard');
    const settings = await loadSettings();
    if (settings.provider !== stored.provider) return fail('expired');
    const info = PROVIDER_INFO[stored.provider];
    const key = await loadKey(stored.provider);
    if (!key) return fail('no-key');
    if (!(await chrome.permissions.contains({ origins: [info.permission] }))) return fail('permission');
    const rate = claimRollingWindow(
      (await chrome.storage.session.get(RATE_KEY))[RATE_KEY],
      now,
      RATE_MAX,
      RATE_WINDOW_MS
    );
    if (!rate.allowed) return fail('too-many');
    await chrome.storage.session.set({ [RATE_KEY]: rate.timestamps });

    const request = buildProviderRequest(stored.provider, stored.model, key, stored.prompt);
    let response: Response;
    try {
      response = await fetchImpl(request.url, {
        ...request.init,
        credentials: 'omit',
        redirect: 'error',
        referrerPolicy: 'no-referrer',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      });
    } catch {
      return fail('provider-down');
    }
    // The body is capped while it streams, so a huge reply never sits whole in worker memory.
    const body = await readCapped(response, MAX_RESPONSE_BYTES).catch(() => null);
    if (!response.ok) return fail(classifyHttpError(stored.provider, response.status, (body ?? '').slice(0, 2000)));
    if (body === null) return fail('bad-response');
    let json: unknown;
    try {
      json = JSON.parse(body);
    } catch {
      return fail('bad-response');
    }
    const reply = replyText(stored.provider, json);
    const result = reply ? parseReply(stored.purpose, reply, stored.evidence) : null;
    return result ? { ok: true, result } : fail('bad-response');
  } finally {
    inFlight.delete(nonce);
  }
}
