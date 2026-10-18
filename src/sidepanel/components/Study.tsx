import { useEffect, useRef, useState } from 'react';
import { Download, Plus, Trash2, Upload } from 'lucide-react';
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
import { smallButton } from './CourseDetail';
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
    setOverview(next);
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

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-bold">{translate('flashcards')}</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{translate('flashcardsHint')}</p>
      </section>

      {xp && <XpCard view={xp} refreshed={() => setXpRefresh((count) => count + 1)} {...feedback} />}

      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-bold">{translate('reviewToday')}</h3>
        {guard.active ? (
          <p className="mt-2 text-xs font-semibold text-amber-800 dark:text-amber-200">{translate('guardPaused')}</p>
        ) : !card ? (
          <p className="mt-2 text-xs">
            {overview.queue.length > 0 ? translate('reviewFinished') : translate('reviewEmpty')}
            {overview.later > 0 && ` ${overview.later} ${translate('reviewLater')}.`}
          </p>
        ) : (
          <div className="mt-2 space-y-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {queueAt + 1}/{overview.queue.length} · {siteName(sites, card.siteId)}
            </p>
            <p className="rounded-lg bg-slate-50 p-3 text-sm whitespace-pre-wrap dark:bg-slate-800">{card.front}</p>
            {revealed ? (
              <>
                <p className="rounded-lg bg-slate-50 p-3 text-sm whitespace-pre-wrap dark:bg-slate-800">{card.back}</p>
                {card.sourceUrl && (
                  <a
                    href={card.sourceUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-xs font-semibold text-blue-700 dark:text-blue-300"
                  >
                    {translate('cardSource')}
                  </a>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {SRS_RATINGS.map((rating) => (
                    <button key={rating} type="button" className={smallButton} onClick={() => void rate(rating)}>
                      {translate(RATING_LABELS[rating])} · {card.intervals[rating]}
                      {translate('daysShort')}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <button
                type="button"
                className="w-full rounded-lg bg-blue-700 p-2 text-sm font-semibold text-white"
                onClick={() => setRevealed(true)}
              >
                {translate('showAnswer')}
              </button>
            )}
          </div>
        )}
      </section>

      {overview.offer && !guard.active && (
        <section className="space-y-2 rounded-xl border border-blue-200 bg-white p-4 dark:border-blue-900 dark:bg-slate-900">
          <h3 className="text-sm font-bold">{translate('practiceOffer')}</h3>
          <p className="text-xs">
            {overview.offer.count} {translate('questionsCount')} · {siteName(sites, overview.offer.siteId)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{translate('practiceOfferHint')}</p>
          {decks.some((deck) => deck.siteId === overview.offer?.siteId) ? (
            <>
              <select
                aria-label={translate('practiceSave')}
                value={offerDeck || decks.find((deck) => deck.siteId === overview.offer?.siteId)?.id}
                onChange={(event) => setOfferDeck(event.target.value)}
                className="block w-full rounded-lg border border-slate-200 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                {decks
                  .filter((deck) => deck.siteId === overview.offer?.siteId)
                  .map((deck) => (
                    <option key={deck.id} value={deck.id}>
                      {deck.name}
                    </option>
                  ))}
              </select>
              <button type="button" className={smallButton} onClick={() => void saveMistakes()}>
                <Plus size={13} />
                {translate('practiceSave')}
              </button>
            </>
          ) : (
            <p className="text-xs">{translate('deckEmpty')}</p>
          )}
        </section>
      )}

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-bold">{translate('decks')}</h3>
        {decks.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">{translate('deckEmpty')}</p>
        ) : (
          <ul className="space-y-2">
            {decks.map((deck: StudyDeckView) => (
              <li key={deck.id} className="rounded-lg border border-slate-200 p-2 text-xs dark:border-slate-700">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{deck.name}</p>
                    <p className="text-slate-500 dark:text-slate-400">
                      {siteName(sites, deck.siteId)} · {deck.cards} {translate('cardsCount')} · {deck.due}{' '}
                      {translate('dueCount')}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={translate('deleteDeck')}
                    className={smallButton}
                    onClick={() => setConfirmDelete(deck.id)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                {confirmDelete === deck.id && (
                  <div className="mt-2 space-y-2">
                    <p role="alert" className="font-semibold text-red-700 dark:text-red-400">
                      {translate('deleteDeckConfirm')}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" className={smallButton} onClick={() => setConfirmDelete(null)}>
                        {translate('cancel')}
                      </button>
                      <button
                        type="button"
                        className="rounded-lg bg-red-600 p-2 text-xs font-semibold text-white"
                        onClick={() => void removeDeck(deck.id)}
                      >
                        {translate('deleteDeck')}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-2 border-t border-slate-200 pt-3 dark:border-slate-800">
          <p className="text-xs font-semibold">{translate('newDeck')}</p>
          {sites.length > 1 && (
            <select
              aria-label={translate('newDeck')}
              value={deckSite || sites[0]?.id}
              onChange={(event) => setDeckSite(event.target.value)}
              className="block w-full rounded-lg border border-slate-200 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.label}
                </option>
              ))}
            </select>
          )}
          <div className="flex gap-2">
            <input
              value={deckName}
              onChange={(event) => setDeckName(event.target.value)}
              placeholder={translate('deckName')}
              aria-label={translate('deckName')}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
            <button type="button" className={smallButton} onClick={() => void create()}>
              <Plus size={13} />
              {translate('createDeck')}
            </button>
          </div>
        </div>

        {decks.length > 0 && (
          <div className="space-y-2 border-t border-slate-200 pt-3 dark:border-slate-800">
            <p className="text-xs font-semibold">{translate('addCard')}</p>
            <select
              aria-label={translate('decks')}
              value={cardDeck || decks[0]?.id}
              onChange={(event) => setCardDeck(event.target.value)}
              className="block w-full rounded-lg border border-slate-200 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              {decks.map((deck) => (
                <option key={deck.id} value={deck.id}>
                  {deck.name}
                </option>
              ))}
            </select>
            <textarea
              value={front}
              onChange={(event) => setFront(event.target.value)}
              placeholder={translate('cardFront')}
              aria-label={translate('cardFront')}
              rows={2}
              className="block w-full rounded-lg border border-slate-200 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
            <textarea
              value={back}
              onChange={(event) => setBack(event.target.value)}
              placeholder={translate('cardBack')}
              aria-label={translate('cardBack')}
              rows={2}
              className="block w-full rounded-lg border border-slate-200 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
            <button type="button" className={smallButton} onClick={() => void addCard()}>
              <Plus size={13} />
              {translate('addCard')}
            </button>
          </div>
        )}

        <div className="space-y-2 border-t border-slate-200 pt-3 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">{translate('importCardsHint')}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={smallButton} onClick={() => void exportCards('json')}>
              <Download size={13} />
              {translate('exportCardsJson')}
            </button>
            <button type="button" className={smallButton} onClick={() => void exportCards('csv')}>
              <Download size={13} />
              {translate('exportCardsCsv')}
            </button>
            {decks.length > 0 && (
              <button type="button" className={smallButton} onClick={() => fileInput.current?.click()}>
                <Upload size={13} />
                {translate('importCards')}
              </button>
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
      </section>
    </div>
  );
}
