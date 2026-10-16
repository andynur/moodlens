import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  CircleHelp,
  GraduationCap,
  LayoutDashboard,
  Moon,
  Settings2,
  Sun,
  ExternalLink,
  Sparkles,
  CircleDashed,
  Lock,
  Trash2
} from 'lucide-react';
import type { ClearDataResponse, CourseSnapshot, Locale, Theme, CompletionStatus, ActivityType } from '../shared/types';
import { t, type TranslationKey } from '../shared/i18n';
import { isActivityUrl, isCourseSnapshot } from '../shared/validation';

type Page = 'today' | 'courses' | 'study' | 'settings';
const hasChrome = typeof chrome !== 'undefined' && Boolean(chrome?.runtime?.id);
const completionStyle: Record<CompletionStatus, string> = {
  complete: 'text-emerald-600 dark:text-emerald-400',
  incomplete: 'text-amber-600 dark:text-amber-400',
  unknown: 'text-slate-400 dark:text-slate-500'
};

export default function App() {
  const [locale, setLocale] = useState<Locale>('en');
  const [theme, setTheme] = useState<Theme>('light');
  const [page, setPage] = useState<Page>('today');
  const [snapshot, setSnapshot] = useState<CourseSnapshot | null>(null);
  const [error, setError] = useState<TranslationKey | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [notice, setNotice] = useState<TranslationKey | null>(null);
  const translate = (key: TranslationKey) => t(locale, key);

  useEffect(() => {
    if (!hasChrome) return;
    void chrome.storage.local
      .get(['locale', 'theme', 'lastCourseSnapshot'])
      .then((values) => {
        if (values.locale === 'en' || values.locale === 'id') setLocale(values.locale);
        if (values.theme === 'light' || values.theme === 'dark') setTheme(values.theme);
        if (isCourseSnapshot(values.lastCourseSnapshot)) setSnapshot(values.lastCourseSnapshot);
      })
      .catch(() => setError('storageError'));
    const onChange = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area === 'local' && changes.lastCourseSnapshot && isCourseSnapshot(changes.lastCourseSnapshot.newValue)) {
        setSnapshot(changes.lastCourseSnapshot.newValue);
      }
    };
    chrome.storage.onChanged.addListener(onChange);
    return () => chrome.storage.onChanged.removeListener(onChange);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [locale, theme]);

  function saveLocale(next: Locale) {
    setLocale(next);
    if (hasChrome) void chrome.storage.local.set({ locale: next });
  }
  function saveTheme(next: Theme) {
    setTheme(next);
    if (hasChrome) void chrome.storage.local.set({ theme: next });
  }
  async function clearLocalData() {
    setConfirmingClear(false);
    if (hasChrome) {
      const response = (await chrome.runtime
        .sendMessage({ type: 'CLEAR_LOCAL_DATA' })
        .catch(() => null)) as ClearDataResponse | null;
      if (!response?.ok) {
        setError('clearDataError');
        return;
      }
    }
    // Return to first-run state: defaults, no snapshot, first page.
    setLocale('en');
    setTheme('light');
    setSnapshot(null);
    setError(null);
    setPage('today');
    setNotice('clearDataDone');
  }
  function openActivity(url: string) {
    if (!isActivityUrl(url)) {
      setError('noNavigation');
      return;
    }
    if (hasChrome) void chrome.tabs.create({ url });
    else window.open(url, '_blank', 'noopener,noreferrer');
  }

  const total = snapshot?.activities.length ?? 0;
  const counts = useMemo(
    () => ({
      complete: snapshot?.activities.filter((a) => a.completion === 'complete').length ?? 0,
      incomplete: snapshot?.activities.filter((a) => a.completion === 'incomplete').length ?? 0,
      unknown: snapshot?.activities.filter((a) => a.completion === 'unknown').length ?? 0
    }),
    [snapshot]
  );

  const navigation: { key: Page; icon: typeof LayoutDashboard; label: TranslationKey }[] = [
    { key: 'today', icon: LayoutDashboard, label: 'today' },
    { key: 'courses', icon: BookOpen, label: 'courses' },
    { key: 'study', icon: Sparkles, label: 'study' },
    { key: 'settings', icon: Settings2, label: 'settings' }
  ];
  const typeLabel: Record<ActivityType, TranslationKey> = {
    resource: 'activityResource',
    page: 'activityPage',
    url: 'activityUrl',
    attendance: 'activityAttendance',
    quiz: 'activityQuiz',
    forum: 'activityForum',
    assign: 'activityAssign',
    folder: 'activityFolder',
    book: 'activityBook',
    feedback: 'activityFeedback',
    unknown: 'activityUnknown'
  };
  const completionLabel: Record<CompletionStatus, TranslationKey> = {
    complete: 'completed',
    incomplete: 'incomplete',
    unknown: 'unknown'
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-700 text-white">
            <GraduationCap size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold">{translate('appName')}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{translate('tagline')}</p>
          </div>
          <select
            aria-label={translate('language')}
            value={locale}
            onChange={(e) => saveLocale(e.target.value as Locale)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
          >
            <option value="en">EN</option>
            <option value="id">ID</option>
          </select>
        </div>
      </header>
      <nav
        aria-label={translate('navigation')}
        className="grid grid-cols-4 gap-1 border-b border-slate-200 bg-white px-2 py-2 dark:border-slate-800 dark:bg-slate-900"
      >
        {navigation.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setPage(item.key)}
            className={`flex min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-2 text-[11px] ${page === item.key ? 'bg-blue-50 font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300' : 'text-slate-500 dark:text-slate-300'}`}
          >
            <item.icon size={17} />
            <span className="truncate">{translate(item.label)}</span>
          </button>
        ))}
      </nav>
      <main className="space-y-4 px-4 py-5">
        {!hasChrome && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            {translate('preview')}
          </p>
        )}
        {notice && (
          <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
            {translate(notice)}
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {translate(error)}
          </p>
        )}
        {(page === 'today' || page === 'courses') && (
          <>
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                {translate('currentCourse')}
              </p>
              <h2 className="mt-2 text-lg font-bold">
                {snapshot ? (snapshot.courseName ?? translate('untitledCourse')) : translate('ready')}
              </h2>
              {snapshot ? (
                <>
                  <p className="mt-1 break-words text-xs text-slate-500 dark:text-slate-400">
                    {translate('lastSeen')}:{' '}
                    {new Date(snapshot.capturedAt).toLocaleString(locale === 'id' ? 'id-ID' : 'en-US')}
                  </p>
                  <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{translate('refreshHint')}</p>
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{translate('noData')}</p>
              )}
            </section>
            {snapshot && (
              <>
                <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <h3 className="text-sm font-semibold">{translate('statusSummary')}</h3>
                  <p className="mt-2 text-sm font-bold">
                    {total} {translate('activities')}
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      <strong className="block text-lg">{counts.complete}</strong>
                      {translate('completed')}
                    </div>
                    <div className="rounded-lg bg-amber-50 p-2 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                      <strong className="block text-lg">{counts.incomplete}</strong>
                      {translate('incomplete')}
                    </div>
                    <div className="rounded-lg bg-slate-100 p-2 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <strong className="block text-lg">{counts.unknown}</strong>
                      {translate('unknown')}
                    </div>
                  </div>
                </section>
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold">{translate('activities')}</h3>
                  {snapshot.activities.length === 0 && (
                    <p className="rounded-lg bg-white p-3 text-sm text-slate-500 dark:bg-slate-900">
                      {translate('emptyActivities')}
                    </p>
                  )}
                  {snapshot.activities.map((activity) => (
                    <article
                      key={`${activity.type}-${activity.id}`}
                      className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="break-words text-sm font-semibold">{activity.title}</h4>
                          <p className="mt-1 text-xs capitalize text-slate-500 dark:text-slate-400">
                            {translate(typeLabel[activity.type])}
                          </p>
                        </div>
                        <div
                          className={`flex shrink-0 items-center gap-1 text-[11px] font-medium ${completionStyle[activity.completion]}`}
                        >
                          {activity.completion === 'complete' ? (
                            <CheckCircle2 size={14} />
                          ) : activity.completion === 'incomplete' ? (
                            <CircleDashed size={14} />
                          ) : (
                            <CircleHelp size={14} />
                          )}
                          {translate(completionLabel[activity.completion])}
                        </div>
                      </div>
                      {activity.url === null ? (
                        <p className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                          <Lock size={12} />
                          {translate('restricted')}
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openActivity(activity.url!)}
                          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline dark:text-blue-400"
                        >
                          {translate('open')} <ExternalLink size={12} />
                        </button>
                      )}
                    </article>
                  ))}
                </section>
              </>
            )}
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{translate('limitations')}</p>
          </>
        )}
        {page === 'study' && (
          <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <Sparkles className="text-blue-600" />
            <h2 className="mt-3 text-lg font-bold">{translate('study')}</h2>
            <p className="mt-2 text-sm">{translate('studyPlanned')}</p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{translate('studyPrivacy')}</p>
          </section>
        )}
        {page === 'settings' && (
          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-bold">{translate('settings')}</h2>
            <label className="block text-xs font-semibold">
              {translate('language')}
              <select
                value={locale}
                onChange={(e) => saveLocale(e.target.value as Locale)}
                className="mt-1 block w-full rounded-lg border border-slate-200 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="en">English</option>
                <option value="id">Bahasa Indonesia</option>
              </select>
            </label>
            <div>
              <p className="text-xs font-semibold">{translate('theme')}</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => saveTheme('light')}
                  className={`flex items-center justify-center gap-2 rounded-lg border p-2 text-sm ${theme === 'light' ? 'border-blue-600 text-blue-600' : 'border-slate-300 dark:border-slate-700'}`}
                >
                  <Sun size={15} />
                  {translate('light')}
                </button>
                <button
                  type="button"
                  onClick={() => saveTheme('dark')}
                  className={`flex items-center justify-center gap-2 rounded-lg border p-2 text-sm ${theme === 'dark' ? 'border-blue-600 text-blue-400' : 'border-slate-300 dark:border-slate-700'}`}
                >
                  <Moon size={15} />
                  {translate('dark')}
                </button>
              </div>
            </div>
            <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
              <p className="text-xs font-semibold">{translate('clearData')}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{translate('clearDataHint')}</p>
              {confirmingClear ? (
                <div className="mt-2 space-y-2">
                  <p role="alert" className="text-xs font-semibold text-red-700 dark:text-red-400">
                    {translate('clearDataConfirmQuestion')}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmingClear(false)}
                      className="rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-700"
                    >
                      {translate('cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={() => void clearLocalData()}
                      className="rounded-lg bg-red-600 p-2 text-sm font-semibold text-white"
                    >
                      {translate('clearDataConfirm')}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setNotice(null);
                    setConfirmingClear(true);
                  }}
                  className="mt-2 inline-flex items-center gap-2 rounded-lg border border-red-300 p-2 text-sm font-semibold text-red-700 dark:border-red-800 dark:text-red-400"
                >
                  <Trash2 size={15} />
                  {translate('clearData')}
                </button>
              )}
            </div>
          </section>
        )}
      </main>
      <footer className="border-t border-slate-200 px-4 py-4 text-center text-[11px] text-slate-400 dark:border-slate-800">
        <p>{translate('unofficial')}</p>
        <p className="mt-1">
          {translate('copyright')} · v{__APP_VERSION__}
        </p>
      </footer>
    </div>
  );
}
