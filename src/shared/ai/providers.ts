/**
 * BYOK provider table and request shapes (ML-008, PRD-004). Pure: no key storage and no network here.
 * Destinations are fixed per provider so a document or a model reply can never redirect a request.
 */

// A local Ollama option needs a loopback host permission; the owner deferred it past v0.8.
// Anthropic is deferred by the owner (D-019).
export type AiProviderId = 'openai' | 'gemini' | 'deepseek' | 'qwen' | 'kimi' | 'commandcode' | 'sumopod';
export const AI_PROVIDERS: readonly AiProviderId[] = [
  'openai',
  'gemini',
  'deepseek',
  'qwen',
  'kimi',
  'commandcode',
  'sumopod'
];

/** Wire format of the provider's API. Every provider except Gemini speaks OpenAI Chat Completions. */
export type AiApiFormat = 'openai-chat' | 'gemini';

export interface AiProviderInfo {
  id: AiProviderId;
  label: string;
  format: AiApiFormat;
  /** Fixed endpoint URL; Gemini's is a prefix completed with the model name. */
  endpoint: string;
  /** Sends `response_format: json_object`. Off for gateways whose backends may reject it. */
  jsonMode: boolean;
  /** Origin the request goes to; shown on the consent screen. */
  origin: string;
  /** Optional host permission requested when the student picks this provider (D-002 style). */
  permission: string;
  defaultModel: string;
}

export const PROVIDER_INFO: Readonly<Record<AiProviderId, AiProviderInfo>> = {
  openai: {
    id: 'openai',
    label: 'OpenAI',
    format: 'openai-chat',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    jsonMode: true,
    origin: 'https://api.openai.com',
    permission: 'https://api.openai.com/*',
    defaultModel: 'gpt-4.1-mini'
  },
  gemini: {
    id: 'gemini',
    label: 'Google Gemini',
    format: 'gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/',
    jsonMode: true,
    origin: 'https://generativelanguage.googleapis.com',
    permission: 'https://generativelanguage.googleapis.com/*',
    // Alias, not a pinned version: Gemini retires pinned models for new keys (2.5-flash answered 404 in 2026-10).
    defaultModel: 'gemini-flash-latest'
  },
  deepseek: {
    id: 'deepseek',
    label: 'DeepSeek',
    format: 'openai-chat',
    endpoint: 'https://api.deepseek.com/chat/completions',
    jsonMode: true,
    origin: 'https://api.deepseek.com',
    permission: 'https://api.deepseek.com/*',
    defaultModel: 'deepseek-flash'
  },
  qwen: {
    // International (Singapore) Model Studio endpoint; mainland China keys are region-locked and not supported.
    id: 'qwen',
    label: 'Qwen (Alibaba Model Studio)',
    format: 'openai-chat',
    endpoint: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions',
    jsonMode: true,
    origin: 'https://dashscope-intl.aliyuncs.com',
    permission: 'https://dashscope-intl.aliyuncs.com/*',
    defaultModel: 'qwen-flash'
  },
  kimi: {
    // Global Moonshot platform; api.moonshot.cn keys are region-locked and not supported.
    id: 'kimi',
    label: 'Kimi (Moonshot AI)',
    format: 'openai-chat',
    endpoint: 'https://api.moonshot.ai/v1/chat/completions',
    jsonMode: true,
    origin: 'https://api.moonshot.ai',
    permission: 'https://api.moonshot.ai/*',
    defaultModel: 'kimi-k2.6'
  },
  commandcode: {
    id: 'commandcode',
    label: 'Command Code',
    format: 'openai-chat',
    endpoint: 'https://api.commandcode.ai/provider/v1/chat/completions',
    jsonMode: false,
    origin: 'https://api.commandcode.ai',
    permission: 'https://api.commandcode.ai/*',
    defaultModel: 'deepseek/deepseek-v4-flash'
  },
  sumopod: {
    id: 'sumopod',
    label: 'SumoPod',
    format: 'openai-chat',
    endpoint: 'https://ai.sumopod.com/v1/chat/completions',
    jsonMode: false,
    origin: 'https://ai.sumopod.com',
    permission: 'https://ai.sumopod.com/*',
    defaultModel: 'gpt-4.1-mini'
  }
};

export function isAiProvider(value: unknown): value is AiProviderId {
  return AI_PROVIDERS.includes(value as AiProviderId);
}

const MODEL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,79}$/;

/** Model names go into a URL path (Gemini) and a JSON body; anything outside this pattern is refused. */
export function cleanModel(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const model = value.trim();
  return MODEL_PATTERN.test(model) && !model.includes('..') ? model : null;
}

/** Keys are opaque; only shape and length are checked so a pasted paragraph is not sent as a header. */
export function cleanKey(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const key = value.trim();
  return /^[\x21-\x7e]{8,300}$/.test(key) ? key : null;
}

/** Stored, non-secret provider choice. The key lives elsewhere (session storage only). */
export interface AiSettings {
  provider: AiProviderId | null;
  models: Record<AiProviderId, string>;
}

export const AI_SETTINGS_KEY = 'aiSettings';

export function defaultAiSettings(): AiSettings {
  return {
    provider: null,
    models: Object.fromEntries(AI_PROVIDERS.map((id) => [id, PROVIDER_INFO[id].defaultModel])) as Record<
      AiProviderId,
      string
    >
  };
}

export function normalizeAiSettings(input: unknown): AiSettings {
  const settings = defaultAiSettings();
  if (!input || typeof input !== 'object') return settings;
  const value = input as Record<string, unknown>;
  if (isAiProvider(value.provider)) settings.provider = value.provider;
  const models = value.models && typeof value.models === 'object' ? (value.models as Record<string, unknown>) : {};
  for (const id of AI_PROVIDERS) settings.models[id] = cleanModel(models[id]) ?? settings.models[id];
  return settings;
}

export interface AiPrompt {
  system: string;
  user: string;
  /** Ask the provider for a JSON object reply. */
  json: boolean;
}

export interface ProviderRequest {
  url: string;
  init: { method: 'POST'; headers: Record<string, string>; body: string };
}

/** Builds the one HTTP request for a prompt. The key goes only into a header, never the URL or body. */
export function buildProviderRequest(
  provider: AiProviderId,
  model: string,
  key: string,
  prompt: AiPrompt
): ProviderRequest {
  const info = PROVIDER_INFO[provider];
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (info.format === 'openai-chat') {
    headers.Authorization = `Bearer ${key}`;
    return {
      url: info.endpoint,
      init: {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: prompt.system },
            { role: 'user', content: prompt.user }
          ],
          ...(prompt.json && info.jsonMode ? { response_format: { type: 'json_object' } } : {})
        })
      }
    };
  }
  headers['x-goog-api-key'] = key;
  return {
    url: `${info.endpoint}${encodeURIComponent(model)}:generateContent`,
    init: {
      method: 'POST',
      headers,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: prompt.system }] },
        contents: [{ role: 'user', parts: [{ text: prompt.user }] }],
        ...(prompt.json ? { generationConfig: { responseMimeType: 'application/json' } } : {})
      })
    }
  };
}

/** Largest reply text accepted from a provider; longer replies are cut, never trusted further. */
export const MAX_REPLY_CHARS = 40_000;

/** Pulls the reply text out of a provider response body. Null when the shape is not recognized. */
export function replyText(provider: AiProviderId, body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const value = body as Record<string, unknown>;
  let text: unknown = null;
  if (PROVIDER_INFO[provider].format === 'openai-chat') {
    const choices = Array.isArray(value.choices) ? value.choices : [];
    const message = (choices[0] as { message?: { content?: unknown } } | undefined)?.message;
    text = message?.content;
  } else {
    const candidates = Array.isArray(value.candidates) ? value.candidates : [];
    const parts = (candidates[0] as { content?: { parts?: unknown } } | undefined)?.content?.parts;
    if (Array.isArray(parts)) {
      text = parts
        .map((part) =>
          part && typeof (part as { text?: unknown }).text === 'string' ? (part as { text: string }).text : ''
        )
        .join('');
    }
  }
  return typeof text === 'string' && text.trim() !== '' ? text.slice(0, MAX_REPLY_CHARS) : null;
}

export type AiErrorCode =
  | 'disabled'
  | 'no-provider'
  | 'no-key'
  | 'permission'
  | 'guard'
  | 'expired'
  | 'invalid'
  | 'too-many'
  | 'bad-key'
  | 'rate-limit'
  | 'provider-down'
  | 'bad-response';

/** Maps an HTTP failure to a student-facing error; the body text is inspected, never shown. */
export function classifyHttpError(provider: AiProviderId, status: number, bodyText: string): AiErrorCode {
  if (status === 429) return 'rate-limit';
  if (status === 401) return 'bad-key';
  if (status === 403) return 'bad-key';
  // Gemini answers an invalid key with 400 API_KEY_INVALID.
  if (status === 400 && provider === 'gemini' && /API_KEY_INVALID|API key not valid/i.test(bodyText)) return 'bad-key';
  if (status >= 500) return 'provider-down';
  return 'bad-response';
}
