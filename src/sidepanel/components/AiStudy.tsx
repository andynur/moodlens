import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BrainCircuit, FileText, Send, ShieldAlert, X } from 'lucide-react';
import { chunkPages, chunksInRange, retrieve, type DocChunk, type ExtractionReport } from '../../shared/ai/documents';
import {
  AI_PURPOSES,
  MAX_EVIDENCE,
  MAX_EVIDENCE_TOTAL,
  type AiPurpose,
  type AiResult,
  type GeneratedCard
} from '../../shared/ai/prompt';
import { PROVIDER_INFO, type AiErrorCode } from '../../shared/ai/providers';
import type {
  AiConsentPreview,
  AiPrepareResponse,
  AiSendResponse,
  Locale,
  StudyOverviewResponse
} from '../../shared/types';
import { aiErrorText, aiPurposeText, aiText, type AiStringKey } from '../aiStrings';
import { extractPdf } from '../pdf';
import type { GuardView } from '../useGuard';
import { hasChrome } from '../useSites';
import { Alert, Badge, Button, Card, CardTitle, Checkbox, Field, Hint, Input, Select, Textarea } from '../ui';
import { useAiSettings } from './AiSettings';

interface LoadedDoc {
  name: string;
  chunks: DocChunk[];
  report: ExtractionReport;
}

async function send<T>(message: unknown, fallback: T): Promise<T> {
  if (!hasChrome) return fallback;
  return ((await chrome.runtime.sendMessage(message).catch(() => null)) as T | null) ?? fallback;
}

/** Renders `[S1]` markers as page chips; everything else stays plain, escaped text. */
function citedText(text: string, pages: ReadonlyMap<string, number>, pageLabel: string): ReactNode[] {
  return text.split(/(\[S\d+\])/).map((part, index) => {
    const id = /^\[(S\d+)\]$/.exec(part)?.[1];
    const page = id ? pages.get(id) : undefined;
    if (page === undefined) return <span key={index}>{part}</span>;
    return (
      <span key={index} className="mx-0.5 rounded bg-accent-soft px-1 text-[11px] font-semibold text-accent-ink">
        {pageLabel} {page}
      </span>
    );
  });
}

/**
 * AI study (ML-009): local PDF, keyword retrieval, a consent screen with the exact text, then a cited
 * answer or generated cards the student checks before saving. Hidden entirely while the guard is on.
 */
export function AiStudy({
  locale,
  guard,
  onCardsSaved
}: {
  locale: Locale;
  guard: GuardView;
  onCardsSaved: () => void;
}) {
  const text = (key: AiStringKey) => aiText(locale, key);
  const settings = useAiSettings();
  const [doc, setDoc] = useState<LoadedDoc | null>(null);
  const [reading, setReading] = useState(false);
  const [purpose, setPurpose] = useState<AiPurpose>('summary');
  const [question, setQuestion] = useState('');
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(1);
  const [preview, setPreview] = useState<AiConsentPreview | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<AiResult | null>(null);
  const [notice, setNotice] = useState<AiStringKey | null>(null);
  const [error, setError] = useState<AiErrorCode | null>(null);
  const [kept, setKept] = useState<boolean[]>([]);
  const [decks, setDecks] = useState<StudyOverviewResponse['decks']>([]);
  const [deckId, setDeckId] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  // A prepared request must not outlive the guard: drop it the moment an assessment page opens.
  // The background re-checks the guard before sending anyway.
  useEffect(() => {
    if (guard.active) void send({ type: 'AI_CANCEL' }, null);
  }, [guard.active]);

  if (!settings.enabled) return null;
  if (guard.active) {
    return (
      <Alert tone="warning" icon={ShieldAlert} role="status">
        {text('aiGuardPaused')}
      </Alert>
    );
  }

  const reset = () => {
    setResult(null);
    setNotice(null);
    setError(null);
  };

  async function choose(file: File | undefined) {
    if (fileInput.current) fileInput.current.value = '';
    if (!file) return;
    reset();
    setDoc(null);
    setReading(true);
    const extracted = await extractPdf(file).catch(() => ({ ok: false, error: 'unreadable' }) as const);
    setReading(false);
    if (!extracted.ok) {
      setNotice(
        extracted.error === 'too-large'
          ? 'aiPdfTooLarge'
          : extracted.error === 'password'
            ? 'aiPdfPassword'
            : 'aiPdfError'
      );
      return;
    }
    setDoc({ name: file.name, chunks: chunkPages(extracted.pages), report: extracted.report });
    setFrom(1);
    setTo(Math.min(extracted.report.pageCount, 5));
  }

  function evidence(loaded: LoadedDoc) {
    if (purpose === 'question' || purpose === 'outline') {
      return retrieve(loaded.chunks, question, MAX_EVIDENCE).sort((a, b) => a.page - b.page);
    }
    return chunksInRange(loaded.chunks, from, to, MAX_EVIDENCE_TOTAL).slice(0, MAX_EVIDENCE);
  }

  async function prepare() {
    if (!doc) return;
    reset();
    const picked = evidence(doc);
    // Nothing relevant means nothing to send: say so locally, with no provider request (AC 3).
    if (picked.length === 0) {
      setNotice(purpose === 'question' || purpose === 'outline' ? 'aiNoMatch' : 'aiInsufficient');
      return;
    }
    const response = await send<AiPrepareResponse>(
      {
        type: 'AI_PREPARE',
        task: {
          purpose,
          language: locale,
          docName: doc.name,
          question,
          evidence: picked.map((chunk) => ({ page: chunk.page, text: chunk.text }))
        }
      },
      { ok: false, error: 'provider-down' }
    );
    if (response.ok) setPreview(response.preview);
    else setError(response.error);
  }

  async function cancel() {
    setPreview(null);
    await send({ type: 'AI_CANCEL' }, null);
  }

  async function confirm() {
    if (!preview) return;
    const current = preview;
    // Asked inside the click, at the moment of use (D-002 style); refusing sends nothing.
    const granted = await chrome.permissions.request({ origins: [current.permission] }).catch(() => false);
    setPreview(null);
    if (!granted) {
      await send({ type: 'AI_CANCEL' }, null);
      setError('permission');
      return;
    }
    setSending(true);
    const response = await send<AiSendResponse>(
      { type: 'AI_SEND', nonce: current.nonce },
      {
        ok: false,
        error: 'provider-down'
      }
    );
    setSending(false);
    if (!response.ok) {
      setError(response.error);
      return;
    }
    setResult(response.result);
    if (response.result.kind === 'cards') {
      setKept(response.result.cards.map(() => true));
      const overview = await send<StudyOverviewResponse>(
        { type: 'STUDY_OVERVIEW' },
        { ok: false, decks: [], queue: [], later: 0 }
      );
      setDecks(overview.decks);
      setDeckId(overview.decks[0]?.id ?? '');
    }
  }

  async function saveCards(cards: GeneratedCard[]) {
    const deck = decks.find((item) => item.id === deckId);
    if (!deck) {
      setNotice('aiCardsNeedDeck');
      return;
    }
    const chosen = cards
      .filter((_, index) => kept[index])
      .map((card) => ({
        deck: deck.name,
        front: card.front,
        back: `${card.back}\n(${doc?.name ?? ''}, ${text('aiPage')} ${card.page})`
      }));
    if (chosen.length === 0) return;
    const response = await send<{ ok: boolean }>(
      { type: 'STUDY_ADD_CARDS', siteId: deck.siteId, deckId: deck.id, cards: chosen },
      { ok: false }
    );
    if (response.ok) {
      setResult(null);
      setNotice('aiCardsSaved');
      onCardsSaved();
    } else setError('invalid');
  }

  const ready = settings.provider !== null && settings.keys[settings.provider];
  const pageCount = doc?.report.pageCount ?? 1;
  const needsQuestion = purpose === 'question' || purpose === 'outline';
  const pageMap = new Map(result?.kind === 'answer' ? result.citations.map((item) => [item.id, item.page]) : []);

  return (
    <Card className="space-y-3">
      <CardTitle icon={BrainCircuit} tone="lavender" level={2}>
        {text('aiStudy')}
      </CardTitle>
      <Hint>{text('aiStudyHint')}</Hint>
      {!ready && (
        <Alert tone="info" role="status">
          {text('aiNeedsProvider')}
        </Alert>
      )}
      <input
        ref={fileInput}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(event) => void choose(event.target.files?.[0])}
      />
      {doc ? (
        <div className="flex items-center gap-2 rounded-lg bg-well p-2 text-xs">
          <FileText size={15} aria-hidden="true" className="shrink-0" />
          <span className="min-w-0 flex-1 truncate font-medium">{doc.name}</span>
          <Badge>
            {doc.report.pageCount} {text('aiPages')}
          </Badge>
          <Button
            size="icon"
            variant="ghost"
            aria-label={text('aiForgetDoc')}
            onClick={() => {
              setDoc(null);
              reset();
            }}
          >
            <X size={14} />
          </Button>
        </div>
      ) : (
        <Button onClick={() => fileInput.current?.click()} disabled={reading}>
          <FileText size={14} />
          {reading ? text('aiReading') : text('aiChoosePdf')}
        </Button>
      )}
      {doc && <Hint faint>{text('aiDocKept')}</Hint>}
      {doc?.report.scanned === 'all' && (
        <Alert tone="warning" role="status">
          {text('aiScannedAll')}
        </Alert>
      )}
      {doc?.report.scanned === 'partial' && (
        <Alert tone="warning" role="status">
          {text('aiScannedPartial')} {doc.report.emptyPages.join(', ')}
        </Alert>
      )}
      {doc && doc.report.failedPages.length > 0 && (
        <Alert tone="warning" role="status">
          {text('aiFailedPages')} {doc.report.failedPages.join(', ')}
        </Alert>
      )}

      {doc && doc.chunks.length > 0 && !preview && !sending && (
        <div className="space-y-3">
          <Field label={text('aiTask')}>
            <Select value={purpose} onChange={(event) => setPurpose(event.target.value as AiPurpose)}>
              {AI_PURPOSES.map((item) => (
                <option key={item} value={item}>
                  {aiPurposeText(locale, item)}
                </option>
              ))}
            </Select>
          </Field>
          {needsQuestion ? (
            <Field label={purpose === 'question' ? text('aiQuestion') : text('aiTopic')}>
              <Textarea
                rows={2}
                maxLength={1000}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
              />
            </Field>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Field label={text('aiFromPage')}>
                <Input
                  type="number"
                  min={1}
                  max={pageCount}
                  value={from}
                  onChange={(event) => setFrom(Math.max(1, Math.min(pageCount, Number(event.target.value) || 1)))}
                />
              </Field>
              <Field label={text('aiToPage')}>
                <Input
                  type="number"
                  min={from}
                  max={pageCount}
                  value={to}
                  onChange={(event) => setTo(Math.max(from, Math.min(pageCount, Number(event.target.value) || from)))}
                />
              </Field>
            </div>
          )}
          {purpose === 'outline' && <Hint>{text('aiOutlineHint')}</Hint>}
          <Button
            variant="primary"
            disabled={!ready || (needsQuestion && question.trim() === '')}
            onClick={() => void prepare()}
          >
            {text('aiPrepare')}
          </Button>
        </div>
      )}

      {preview && (
        <section aria-label={text('aiConsentTitle')} className="space-y-2 rounded-lg border border-line-strong p-3">
          <p className="text-sm font-semibold">{text('aiConsentTitle')}</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-xs">
            <dt className="text-ink-3">{text('aiConsentProvider')}</dt>
            <dd className="min-w-0 break-words">
              {PROVIDER_INFO[preview.provider].label} · {preview.model}
            </dd>
            <dt className="text-ink-3">{text('aiConsentDestination')}</dt>
            <dd className="min-w-0 font-mono break-all">{preview.destination}</dd>
            <dt className="text-ink-3">{text('aiConsentPurpose')}</dt>
            <dd>{aiPurposeText(locale, preview.purpose)}</dd>
          </dl>
          <p className="text-xs font-medium text-ink-2">{text('aiConsentText')}</p>
          {/* Focusable so keyboard users can scroll the full text they are agreeing to send. */}
          <pre
            tabIndex={0}
            aria-label={text('aiConsentText')}
            className="max-h-64 overflow-auto rounded-md bg-well p-2 text-[11px] leading-snug break-words whitespace-pre-wrap"
          >
            {preview.text}
          </pre>
          <Hint faint>{text('aiConsentTokens').replace('{n}', String(preview.tokens))}</Hint>
          <div className="grid grid-cols-2 gap-2">
            <Button size="md" className="justify-center" onClick={() => void cancel()}>
              {text('aiCancel')}
            </Button>
            <Button variant="primary" size="md" className="justify-center" onClick={() => void confirm()}>
              <Send size={14} />
              {text('aiContinue')}
            </Button>
          </div>
        </section>
      )}

      {sending && (
        <p role="status" className="text-xs text-ink-2">
          {text('aiSending')}
        </p>
      )}
      {error && (
        <Alert tone="error" role="alert">
          {aiErrorText(locale, error)}
        </Alert>
      )}
      {notice && (
        <Alert tone={notice === 'aiCardsSaved' ? 'success' : 'warning'} role="status">
          {text(notice)}
        </Alert>
      )}
      {result?.kind === 'insufficient' && (
        <Alert tone="warning" role="status">
          {text('aiInsufficient')}
        </Alert>
      )}
      {/* Announces a finished request to screen readers; the visible result follows. */}
      <p className="sr-only" role="status">
        {result?.kind === 'answer' ? text('aiAnswerReady') : result?.kind === 'cards' ? text('aiCardsTitle') : ''}
      </p>
      {result?.kind === 'answer' && (
        <div className="space-y-2">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {citedText(result.text, pageMap, text('aiPage'))}
          </p>
          <p className="text-xs text-ink-2">
            {text('aiSources')}: {doc?.name} —{' '}
            {result.citations.map((item) => `${text('aiPage')} ${item.page}`).join(', ')}
          </p>
          <Hint faint>{text('aiDisclaimer')}</Hint>
          {purpose === 'outline' && <Hint>{text('aiOutlineHint')}</Hint>}
        </div>
      )}
      {result?.kind === 'cards' && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">{text('aiCardsTitle')}</p>
          <Hint>{text('aiCardsHint')}</Hint>
          <ul className="space-y-2">
            {result.cards.map((card, index) => (
              <li key={index} className="rounded-lg border border-line p-2 text-xs">
                <Checkbox
                  checked={kept[index] ?? false}
                  onChange={(event) =>
                    setKept((list) => list.map((value, i) => (i === index ? event.target.checked : value)))
                  }
                  label={<span className="font-medium break-words">{card.front}</span>}
                />
                <p className="mt-1 pl-6 break-words whitespace-pre-wrap text-ink-2">{card.back}</p>
                <p className="mt-1 pl-6 text-ink-3">
                  {text('aiPage')} {card.page}
                </p>
              </li>
            ))}
          </ul>
          <Hint faint>{text('aiDisclaimer')}</Hint>
          {decks.length > 0 ? (
            <div className="flex gap-2">
              <Select
                compact
                aria-label={text('aiDeckTarget')}
                value={deckId}
                onChange={(event) => setDeckId(event.target.value)}
              >
                {decks.map((deck) => (
                  <option key={deck.id} value={deck.id}>
                    {deck.name}
                  </option>
                ))}
              </Select>
              <Button variant="primary" onClick={() => void saveCards(result.cards)}>
                {text('aiCardsSave')}
              </Button>
            </div>
          ) : (
            <Hint>{text('aiCardsNeedDeck')}</Hint>
          )}
        </div>
      )}
      <Hint faint>{text('aiPrivacy')}</Hint>
    </Card>
  );
}
