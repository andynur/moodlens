import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  Monitor,
  Moon,
  Settings2,
  Sun,
  Sparkles,
  Trash2
} from 'lucide-react';
import type { OkResponse, Locale, Theme } from '../shared/types';
import { t, type TranslationKey } from '../shared/i18n';
import { AppearanceSettings } from './components/Appearance';
import { BackupSettings } from './components/Backup';
import { Onboarding, ONBOARDED_KEY } from './components/Onboarding';
import { CourseDetail } from './components/CourseDetail';
import { GuardBanner } from './components/GuardBanner';
import { CourseList } from './components/Courses';
import { SiteAlerts, SiteEnableForm, SitesSettings } from './components/Sites';
import { TasksView } from './components/Tasks';
import { Today } from './components/Today';
import { courseEntries } from './courseEntries';
import { useGuard } from './useGuard';
import { hasChrome, useSites } from './useSites';
import { useTaskData } from './useTaskData';
import { mergeTaskDatasets } from '../shared/tasks';
import { hiddenCourseKeys } from '../shared/courses';
import { taskText } from './taskStrings';

type Page = 'today' | 'tasks' | 'courses' | 'study' | 'settings';
const themeOptions: { key: Theme; icon: typeof Sun }[] = [
  { key: 'light', icon: Sun },
  { key: 'dark', icon: Moon },
  { key: 'system', icon: Monitor }
];

function useSystemDark(): boolean {
  const query = useMemo(
    () => (typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)') : null),
    []
  );
  const [dark, setDark] = useState(query?.matches ?? false);
  useEffect(() => {
    if (!query) return;
    const onChange = (event: MediaQueryListEvent) => setDark(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [query]);
  return dark;
}

export default function App() {
  const [locale, setLocale] = useState<Locale>('en');
  const [theme, setTheme] = useState<Theme>('system');
  const systemDark = useSystemDark();
  const [page, setPage] = useState<Page>('today');
  const sitesState = useSites();
  const guard = useGuard();
  const [error, setError] = useState<TranslationKey | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [notice, setNotice] = useState<TranslationKey | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [restored, setRestored] = useState(0);
  const [onboarding, setOnboarding] = useState(false);
  const translate = (key: TranslationKey) => t(locale, key);

  useEffect(() => {
    if (!hasChrome) return;
    void chrome.storage.local
      .get(['locale', 'theme', ONBOARDED_KEY, 'sites'])
      .then((values) => {
        if (values.locale === 'en' || values.locale === 'id') setLocale(values.locale);
        if (values.theme === 'light' || values.theme === 'dark' || values.theme === 'system') setTheme(values.theme);
        // First run only: existing users with enabled sites skip the screens.
        const hasSites = Array.isArray(values.sites) && values.sites.length > 0;
        setOnboarding(values[ONBOARDED_KEY] !== true && !hasSites);
      })
      .catch(() => setError('storageError'));
  }, [restored]);
  const shownError = error ?? (sitesState.failed ? 'storageError' : null);

  const entries = useMemo(() => courseEntries(sitesState), [sitesState]);
  const taskData = useTaskData(sitesState.sites);
  const tasks = useMemo(() => mergeTaskDatasets(Object.values(taskData)), [taskData]);
  const hiddenCourses = useMemo(() => hiddenCourseKeys(sitesState.prefs), [sitesState.prefs]);
  const selectedEntry = entries.find((entry) => entry.key === selected) ?? null;
  const feedback = {
    translate,
    onNotice: (key: TranslationKey) => {
      setError(null);
      setNotice(key);
    },
    onError: (key: TranslationKey) => {
      setNotice(null);
      setError(key);
    }
  };

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.classList.toggle('dark', theme === 'dark' || (theme === 'system' && systemDark));
  }, [locale, theme, systemDark]);

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
        .catch(() => null)) as OkResponse | null;
      if (!response?.ok) {
        setError('clearDataError');
        return;
      }
    }
    // Return to first-run state: defaults, first page. Sites and snapshots reload from the cleared storage.
    setLocale('en');
    setTheme('system');
    setError(null);
    setPage('today');
    setSelected(null);
    setNotice('clearDataDone');
    setOnboarding(true);
  }
  function finishOnboarding() {
    setOnboarding(false);
    if (hasChrome) void chrome.storage.local.set({ [ONBOARDED_KEY]: true });
  }
  function selectCourse(key: string) {
    setSelected(key);
    setPage('courses');
  }
  const navigation: { key: Page; icon: typeof LayoutDashboard; label: TranslationKey | 'tasks' }[] = [
    { key: 'today', icon: LayoutDashboard, label: 'today' },
    { key: 'tasks', icon: BookOpen, label: 'tasks' },
    { key: 'courses', icon: BookOpen, label: 'courses' },
    { key: 'study', icon: Sparkles, label: 'study' },
    { key: 'settings', icon: Settings2, label: 'settings' }
  ];
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
      {!onboarding && (
        <nav
          aria-label={translate('navigation')}
          className="grid grid-cols-5 gap-1 border-b border-slate-200 bg-white px-2 py-2 dark:border-slate-800 dark:bg-slate-900"
        >
          {navigation.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setPage(item.key);
                if (item.key === 'courses') setSelected(null);
              }}
              className={`flex min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-2 text-[11px] ${page === item.key ? 'bg-blue-50 font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300' : 'text-slate-500 dark:text-slate-300'}`}
            >
              <item.icon size={17} />
              <span className="truncate">
                {item.label === 'tasks' ? taskText(locale, 'tasks') : translate(item.label)}
              </span>
            </button>
          ))}
        </nav>
      )}
      <main className="space-y-4 px-4 py-5">
        {onboarding ? (
          <Onboarding translate={translate} onDone={finishOnboarding} />
        ) : (
          <>
            {!hasChrome && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                {translate('preview')}
              </p>
            )}
            {notice && (
              <p
                role="status"
                className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"
              >
                {translate(notice)}
              </p>
            )}
            {shownError && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {translate(shownError)}
              </p>
            )}
            <GuardBanner guard={guard} translate={translate} />
            {(page === 'today' || page === 'courses') && (
              <>
                {hasChrome && sitesState.sites.length === 0 && (
                  <section className="rounded-xl border border-blue-200 bg-white p-4 shadow-xs dark:border-blue-900 dark:bg-slate-900">
                    <SiteEnableForm {...feedback} />
                  </section>
                )}
                <SiteAlerts state={sitesState} {...feedback} />
                {page === 'today' && (
                  <Today
                    key={restored}
                    entries={entries}
                    tasks={tasks}
                    sites={sitesState.sites}
                    locale={locale}
                    onSelect={selectCourse}
                    {...feedback}
                  />
                )}
                {page === 'courses' &&
                  (selectedEntry ? (
                    <CourseDetail
                      entry={selectedEntry}
                      locale={locale}
                      onBack={() => setSelected(null)}
                      {...feedback}
                    />
                  ) : (
                    <CourseList entries={entries} onSelect={selectCourse} {...feedback} />
                  ))}
                <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{translate('limitations')}</p>
              </>
            )}
            {page === 'tasks' && <TasksView sites={sitesState.sites} locale={locale} hidden={hiddenCourses} />}
            {page === 'study' && (
              <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <Sparkles className="text-blue-600" />
                <h2 className="mt-3 text-lg font-bold">{translate('study')}</h2>
                <p className="mt-2 text-sm">{guard.active ? translate('guardPaused') : translate('studyPlanned')}</p>
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
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {themeOptions.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        aria-pressed={theme === option.key}
                        onClick={() => saveTheme(option.key)}
                        className={`flex items-center justify-center gap-2 rounded-lg border p-2 text-sm ${theme === option.key ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-slate-300 dark:border-slate-700'}`}
                      >
                        <option.icon size={15} />
                        {translate(option.key)}
                      </button>
                    ))}
                  </div>
                </div>
                {hasChrome && (
                  <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
                    <SitesSettings state={sitesState} {...feedback} />
                  </div>
                )}
                {hasChrome && sitesState.sites.length > 0 && (
                  <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
                    <AppearanceSettings state={sitesState} {...feedback} />
                  </div>
                )}
                {hasChrome && (
                  <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
                    <BackupSettings
                      locale={locale}
                      {...feedback}
                      onNotice={(key) => {
                        feedback.onNotice(key);
                        setSelected(null);
                        setRestored((count) => count + 1);
                      }}
                    />
                  </div>
                )}
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
          </>
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
