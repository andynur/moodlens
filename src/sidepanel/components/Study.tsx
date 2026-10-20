import { useEffect, useRef, useState } from 'react';
import { BookCheck, Download, FolderPlus, Layers, Plus, Sparkles, Trash2, Upload } from 'lucide-react';
import { importCards, MAX_IMPORT_BYTES, type PortableCard } from '../../shared/cards';
import type { TranslationKey } from '../../shared/i18n';
import { SRS_RATINGS, type SrsRating } from '../../shared/srs';
import type {
  Site,
  StudyCardView,
  StudyDeckView,
  StudyExportResponse,
  StudyOverviewResponse
} from '../../shared/types';
import type { GuardView } from '../useGuard';
import { hasChrome } from '../useSites';
import { Alert, Button, Card, CardTitle, cx, Hint, Input, SectionLabel, Select, Textarea } from '../ui';
import { useXpView, XpCard } from './Xp';
import type { Feedback } from './Sites';

const RATING_LABELS: Record<SrsRating, TranslationKey> = {
  again: 'ratingAgain',
  hard: 'ratingHard',
  good: 'ratingGood',
  easy: 'ratingEasy'
};

async function send<T>(message: unknown, fallback: T): Promise<T> {
  if (!hasChrome) return fallback;
  return ((await chrome.runtime.sendMessage(message).catch(() => null)) as T | null) ?? fallback;
}

const EMPTY: StudyOverviewResponse = { ok: false, decks: [], queue: [], later: 0 };

function siteName(sites: readonly Site[], siteId: string): string {
  return sites.find((site) => site.id === siteId)?.label ?? siteId;
}

/** Deck list, card entry and the daily review queue (ML-019). Review is hidden while the guard is active. */
export function StudyPage({ sites, guard, ...feedback }: Feedback & { sites: Site[]; guard: GuardView }) {
  const { translate } = feedback;
  const [overview, setOverview] = useState<StudyOverviewResponse>(EMPTY);
  const [deckName, setDeckName] = useState('');
  const [deckSite, setDeckSite] = useState('');
  const [cardDeck, setCardDeck] = useState('');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [offerDeck, setOfferDeck] = useState('');
  const [xpRefresh, setXpRefresh] = useState(0);
  const [queueAt, setQueueAt] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const xp = useXpView(xpRefresh);

  const apply = (next: StudyOverviewResponse) => {
    // A refused or malformed reply must not crash the page; show the empty state instead.
    setOverview(next.ok && Array.isArray(next.queue) && Array.isArray(next.decks) ? next : EMPTY);
    setQueueAt(0);
    setRevealed(false);
  };
  const reload = async () => apply(await send<StudyOverviewResponse>({ type: 'STUDY_OVERVIEW' }, EMPTY));
  useEffect(() => {
    let live = true;
    void send<StudyOverviewResponse>({ type: 'STUDY_OVERVIEW' }, EMPTY).then((next) => {
      if (live) apply(next);
    });
    return () => {
      live = false;
    };
    // Loaded once per mount; every change reloads through `reload`.
  }, []);

  const decks = overview.decks;
  const card: StudyCardView | undefined = overview.queue[queueAt];

  async function create() {
    const siteId = deckSite || sites[0]?.id;
    if (!siteId || deckName.trim() === '') return;
    const result = await send<{ ok: boolean }>({ type: 'STUDY_CREATE_DECK', siteId, name: deckName }, { ok: false });
    if (!result.ok) {
      feedback.onError('siteActionError');
      return;
    }
    setDeckName('');
    feedback.onNotice('deckCreated');
    await reload();
  }

  async function addCard() {
    const deck = decks.find((item) => item.id === (cardDeck || decks[0]?.id));
    if (!deck || front.trim() === '' || back.trim() === '') return;
    const cards: PortableCard[] = [{ deck: deck.name, front, back }];
    const result = await send<{ ok: boolean }>(
      { type: 'STUDY_ADD_CARDS', siteId: deck.siteId, deckId: deck.id, cards },
      { ok: false }
    );
    if (!result.ok) {
      feedback.onError('siteActionError');
      return;
    }
    setFront('');
    setBack('');
    feedback.onNotice('cardSaved');
    await reload();
  }

  async function removeDeck(deckId: string) {
    setConfirmDelete(null);
    const result = await send<{ ok: boolean }>({ type: 'STUDY_DELETE_DECK', deckId }, { ok: false });
    if (result.ok) feedback.onNotice('deckDeleted');
    else feedback.onError('siteActionError');
    await reload();
  }

  async function rate(rating: SrsRating) {
    if (!card) return;
    const result = await send<{ ok: boolean }>({ type: 'STUDY_REVIEW', cardId: card.id, rating }, { ok: false });
    if (!result.ok) {
      feedback.onError('siteActionError');
      await reload();
      return;
    }
    setRevealed(false);
    const next = queueAt + 1;
    setQueueAt(next);
    setXpRefresh((count) => count + 1);
    // The whole queue is done: the session itself earns XP once (ML-021).
    if (next >= overview.queue.length) {
      await send<{ ok: boolean }>({ type: 'STUDY_SESSION_DONE' }, { ok: false });
      setXpRefresh((count) => count + 1);
    }
  }

  async function saveMistakes() {
    const siteDecks = decks.filter((item) => item.siteId === overview.offer?.siteId);
    const deck = siteDecks.find((item) => item.id === (offerDeck || siteDecks[0]?.id));
    if (!deck || !overview.offer) return;
    const result = await send<{ ok: boolean }>({ type: 'STUDY_SAVE_MISTAKES', deckId: deck.id }, { ok: false });
    if (result.ok) feedback.onNotice('practiceSaved');
    else feedback.onError('practiceSaveError');
    await reload();
  }

  async function exportCards(format: 'json' | 'csv') {
    const result = await send<StudyExportResponse>(
      { type: 'STUDY_EXPORT_CARDS', format },
      {
        ok: false,
        text: '',
        cards: 0
      }
    );
    if (!result.ok) {
      feedback.onError('siteActionError');
      return;
    }
    if (result.cards === 0) {
      feedback.onError('exportCardsEmpty');
      return;
    }
    const type = format === 'json' ? 'application/json' : 'text/csv';
    const url = URL.createObjectURL(new Blob([result.text], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `moodlens-cards-${new Date().toISOString().slice(0, 10)}.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function choose(file: File | undefined) {
    if (fileInput.current) fileInput.current.value = '';
    const deck = decks.find((item) => item.id === (cardDeck || decks[0]?.id));
    if (!file || !deck) return;
    const text = file.size <= MAX_IMPORT_BYTES ? await file.text() : '';
    const parsed = text ? importCards(text, file.name.toLowerCase().endsWith('.csv') ? 'csv' : 'json') : null;
    if (!parsed || parsed.cards.length === 0) {
      feedback.onError('cardsImportInvalid');
      return;
    }
    const result = await send<{ ok: boolean }>(
      { type: 'STUDY_ADD_CARDS', siteId: deck.siteId, deckId: deck.id, cards: parsed.cards },
      { ok: false }
    );
    if (result.ok) feedback.onNotice('cardsImported');
    else feedback.onError('siteActionError');
    await reload();
  }

  const ratingVariant: Record<SrsRating, string> = {
    again: 'border-error/40 text-error-ink hover:bg-error-soft',
    hard: 'border-warning/40 text-warning-ink hover:bg-warning-soft',
    good: 'border-success/40 text-success-ink hover:bg-success-soft',
    easy: 'border-brand-600/40 text-accent-ink hover:bg-accent-soft'
  };

  return (
    <div className="space-y-3">
      <div className="px-1">
        <h2 className="text-lg font-semibold">{translate('flashcards')}</h2>
        <Hint className="mt-0.5">{translate('flashcardsHint')}</Hint>
      </div>

      <Card className="space-y-3">
        <CardTitle
          icon={BookCheck}
          tone="mint"
          actions={
            card && (
              <span className="text-xs text-ink-2 tabular-nums">
                {queueAt + 1}/{overview.queue.length}
              </span>
            )
          }
        >
          {translate('reviewToday')}
        </CardTitle>
        {guard.active ? (
          <Alert tone="warning">{translate('guardPaused')}</Alert>
        ) : !card ? (
          <Hint>
            {overview.queue.length > 0 ? translate('reviewFinished') : translate('reviewEmpty')}
            {overview.later > 0 && ` ${overview.later} ${translate('reviewLater')}.`}
          </Hint>
        ) : (
          <div className="space-y-3">
            <SectionLabel>{siteName(sites, card.siteId)}</SectionLabel>
            <p className="rounded-lg border border-line bg-well p-4 text-sm leading-relaxed whitespace-pre-wrap">
              {card.front}
            </p>
            {revealed ? (
              <>
                <p className="rounded-lg border border-brand-200 bg-accent-soft p-4 text-sm leading-relaxed whitespace-pre-wrap dark:border-brand-900">
                  {card.back}
                </p>
                {card.sourceUrl && (
                  <a
                    href={card.sourceUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-block text-xs font-medium text-accent-ink hover:underline"
                  >
                    {translate('cardSource')}
                  </a>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {SRS_RATINGS.map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      className={cx(
                        'inline-flex min-h-9 items-center justify-center rounded-lg border bg-canvas px-3 text-sm font-medium transition-colors duration-150',
                        ratingVariant[rating]
                      )}
                      onClick={() => void rate(rating)}
                    >
                      {translate(RATING_LABELS[rating])} · {card.intervals[rating]}
                      {translate('daysShort')}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <Button variant="primary" size="md" className="w-full justify-center" onClick={() => setRevealed(true)}>
                {translate('showAnswer')}
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Review comes first: it is the daily action; XP only reports on it. */}
      {xp && <XpCard view={xp} refreshed={() => setXpRefresh((count) => count + 1)} {...feedback} />}
      {overview.offer && !guard.active && (
        <Card variant="accent" className="space-y-3">
          <CardTitle icon={Sparkles} tone="brand">
            {translate('practiceOffer')}
          </CardTitle>
          <p className="text-xs">
            {overview.offer.count} {translate('questionsCount')} · {siteName(sites, overview.offer.siteId)}
          </p>
          <Hint>{translate('practiceOfferHint')}</Hint>
          {decks.some((deck) => deck.siteId === overview.offer?.siteId) ? (
            <>
              <Select
                aria-label={translate('practiceSave')}
                value={offerDeck || decks.find((deck) => deck.siteId === overview.offer?.siteId)?.id}
                onChange={(event) => setOfferDeck(event.target.value)}
              >
                {decks
                  .filter((deck) => deck.siteId === overview.offer?.siteId)
                  .map((deck) => (
                    <option key={deck.id} value={deck.id}>
                      {deck.name}
                    </option>
                  ))}
              </Select>
              <Button variant="primary" onClick={() => void saveMistakes()}>
                <Plus size={14} />
                {translate('practiceSave')}
              </Button>
            </>
          ) : (
            <Hint>{translate('deckEmpty')}</Hint>
          )}
        </Card>
      )}

      <Card className="space-y-4">
        <CardTitle icon={Layers} tone="sky">
          {translate('decks')}
        </CardTitle>
        {decks.length === 0 ? (
          <Hint>{translate('deckEmpty')}</Hint>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
            {decks.map((deck: StudyDeckView) => (
              <li key={deck.id} className="p-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{deck.name}</p>
                    <p className="mt-0.5 text-ink-3">
                      {siteName(sites, deck.siteId)} · {deck.cards} {translate('cardsCount')} ·{' '}
                      <span className={deck.due > 0 ? 'font-medium text-warning-ink' : ''}>
                        {deck.due} {translate('dueCount')}
                      </span>
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={translate('deleteDeck')}
                    onClick={() => setConfirmDelete(deck.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
                {confirmDelete === deck.id && (
                  <div className="mt-2 space-y-2">
                    <p role="alert" className="font-semibold text-error-ink">
                      {translate('deleteDeckConfirm')}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button className="justify-center" onClick={() => setConfirmDelete(null)}>
                        {translate('cancel')}
                      </Button>
                      <Button variant="danger" className="justify-center" onClick={() => void removeDeck(deck.id)}>
                        {translate('deleteDeck')}
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-2 border-t border-line pt-4">
          <SectionLabel>{translate('newDeck')}</SectionLabel>
          {sites.length > 1 && (
            <Select
              aria-label={translate('newDeck')}
              value={deckSite || sites[0]?.id}
              onChange={(event) => setDeckSite(event.target.value)}
            >
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.label}
                </option>
              ))}
            </Select>
          )}
          <div className="flex gap-2">
            <Input
              value={deckName}
              onChange={(event) => setDeckName(event.target.value)}
              placeholder={translate('deckName')}
              aria-label={translate('deckName')}
              className="flex-1"
            />
            <Button size="md" onClick={() => void create()}>
              <FolderPlus size={14} />
              {translate('createDeck')}
            </Button>
          </div>
        </div>

        {decks.length > 0 && (
          <div className="space-y-2 border-t border-line pt-4">
            <SectionLabel>{translate('addCard')}</SectionLabel>
            <Select
              aria-label={translate('decks')}
              value={cardDeck || decks[0]?.id}
              onChange={(event) => setCardDeck(event.target.value)}
            >
              {decks.map((deck) => (
                <option key={deck.id} value={deck.id}>
                  {deck.name}
                </option>
              ))}
            </Select>
            <Textarea
              value={front}
              onChange={(event) => setFront(event.target.value)}
              placeholder={translate('cardFront')}
              aria-label={translate('cardFront')}
              rows={2}
            />
            <Textarea
              value={back}
              onChange={(event) => setBack(event.target.value)}
              placeholder={translate('cardBack')}
              aria-label={translate('cardBack')}
              rows={2}
            />
            <Button variant="primary" onClick={() => void addCard()}>
              <Plus size={14} />
              {translate('addCard')}
            </Button>
          </div>
        )}

        <div className="space-y-2 border-t border-line pt-4">
          <Hint>{translate('importCardsHint')}</Hint>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void exportCards('json')}>
              <Download size={14} />
              {translate('exportCardsJson')}
            </Button>
            <Button onClick={() => void exportCards('csv')}>
              <Download size={14} />
              {translate('exportCardsCsv')}
            </Button>
            {decks.length > 0 && (
              <Button onClick={() => fileInput.current?.click()}>
                <Upload size={14} />
                {translate('importCards')}
              </Button>
            )}
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json,text/csv,.csv"
              className="hidden"
              aria-label={translate('importCards')}
              onChange={(event) => void choose(event.target.files?.[0])}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
