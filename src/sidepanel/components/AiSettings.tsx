import { useEffect, useState } from 'react';
import { KeyRound, Trash2 } from 'lucide-react';
import { AI_PROVIDERS, PROVIDER_INFO, type AiProviderId } from '../../shared/ai/providers';
import type { TranslationKey } from '../../shared/i18n';
import type { AiSettingsView, Locale } from '../../shared/types';
import { AI_PROVIDER_ORDER, aiText, type AiStringKey } from '../aiStrings';
import { hasChrome } from '../useSites';
import { Alert, Button, CardTitle, Field, Hint, Input, Select } from '../ui';

async function send<T>(message: unknown, fallback: T): Promise<T> {
  if (!hasChrome) return fallback;
  return ((await chrome.runtime.sendMessage(message).catch(() => null)) as T | null) ?? fallback;
}

const EMPTY: AiSettingsView = {
  ok: false,
  enabled: false,
  provider: null,
  models: Object.fromEntries(AI_PROVIDERS.map((id) => [id, ''])) as Record<AiProviderId, string>,
  keys: Object.fromEntries(AI_PROVIDERS.map((id) => [id, false])) as Record<AiProviderId, boolean>
};

/** Loads the provider settings view; `version` reloads it after a change. */
export function useAiSettings(version = 0): AiSettingsView {
  const [view, setView] = useState<AiSettingsView>(EMPTY);
  useEffect(() => {
    let live = true;
    void send<AiSettingsView>({ type: 'AI_SETTINGS' }, EMPTY).then((next) => live && setView(next));
    return () => {
      live = false;
    };
  }, [version]);
  return view;
}

/** BYOK provider settings (ML-008): provider, model, session-only key, and an always visible Forget key. */
export function AiSettings({ locale, onError }: { locale: Locale; onError: (key: TranslationKey) => void }) {
  const text = (key: AiStringKey) => aiText(locale, key);
  const [version, setVersion] = useState(0);
  const view = useAiSettings(version);
  const [draft, setDraft] = useState<{ provider: AiProviderId; model: string } | null>(null);
  const [key, setKey] = useState('');
  const [message, setMessage] = useState<AiStringKey | null>(null);
  const provider = view.provider;
  // The typed model name until it is saved; otherwise the stored one.
  const model = provider ? (draft?.provider === provider ? draft.model : view.models[provider]) : '';

  if (!view.enabled) return null;

  async function choose(next: AiProviderId | null) {
    const result = await send<{ ok: boolean }>({ type: 'AI_SAVE_SETTINGS', provider: next }, { ok: false });
    if (!result.ok) onError('siteActionError');
    setMessage(null);
    setVersion((count) => count + 1);
  }
  async function saveModel() {
    if (!provider) return;
    const result = await send<{ ok: boolean }>({ type: 'AI_SAVE_SETTINGS', provider, model }, { ok: false });
    if (result.ok) setMessage('aiSettingsSaved');
    else onError('siteActionError');
    setDraft(null);
    setVersion((count) => count + 1);
  }
  async function saveKey() {
    if (!provider) return;
    const result = await send<{ ok: boolean }>({ type: 'AI_SAVE_KEY', provider, key }, { ok: false });
    // The field is cleared either way; the key never stays in panel state.
    setKey('');
    if (result.ok) setMessage('aiSettingsSaved');
    else onError('siteActionError');
    setVersion((count) => count + 1);
  }
  async function forget() {
    await send<{ ok: boolean }>({ type: 'AI_FORGET_KEYS' }, { ok: false });
    setKey('');
    setMessage('aiKeyForgotten');
    setVersion((count) => count + 1);
  }

  return (
    <div className="space-y-3">
      <CardTitle icon={KeyRound} tone="lavender">
        {text('aiProvider')}
      </CardTitle>
      <Hint>{text('aiProviderHint')}</Hint>
      <Select
        aria-label={text('aiProvider')}
        value={provider ?? ''}
        onChange={(event) => void choose((event.target.value || null) as AiProviderId | null)}
      >
        <option value="">{text('aiProviderNone')}</option>
        {AI_PROVIDER_ORDER.map((id) => (
          <option key={id} value={id}>
            {PROVIDER_INFO[id].label}
          </option>
        ))}
      </Select>
      {provider && (
        <>
          <Field label={text('aiModel')}>
            <div className="flex gap-2">
              <Input
                value={model}
                onChange={(event) => provider && setDraft({ provider, model: event.target.value })}
                maxLength={80}
              />
              <Button onClick={() => void saveModel()} disabled={model.trim() === ''}>
                {text('aiModelSave')}
              </Button>
            </div>
          </Field>
          <Hint faint>{PROVIDER_INFO[provider].origin}</Hint>
          {
            <Field label={text('aiKey')}>
              <div className="flex gap-2">
                <Input
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={text('aiKeyPlaceholder')}
                  value={key}
                  onChange={(event) => setKey(event.target.value)}
                />
                <Button variant="primary" onClick={() => void saveKey()} disabled={key.trim() === ''}>
                  {text('aiKeySave')}
                </Button>
              </div>
            </Field>
          }
          {<Hint>{view.keys[provider] ? text('aiKeyHeld') : text('aiKeyMissing')}</Hint>}
          <Hint faint>{text('aiKeyStorage')}</Hint>
          <Hint faint>{text('aiPermissionRequest')}</Hint>
          <Hint faint>{text('aiProviderTerms')}</Hint>
        </>
      )}
      {/* Always visible, whatever the provider choice (PRD-004). */}
      <Button variant="dangerOutline" onClick={() => void forget()}>
        <Trash2 size={14} />
        {text('aiForgetKey')}
      </Button>
      {message && (
        <Alert tone="success" role="status">
          {text(message)}
        </Alert>
      )}
    </div>
  );
}
