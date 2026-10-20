import { useEffect, useMemo, useState } from 'react';
import {
  CircleAlert,
  CircleCheck,
  House,
  Library,
  ListChecks,
  Monitor,
  Moon,
  Settings2,
  Sparkles,
  Sun,
  Trash2,
  TriangleAlert
} from 'lucide-react';
import type { OkResponse, Locale, Theme } from '../shared/types';
import { t, type TranslationKey } from '../shared/i18n';
import { AiSettings } from './components/AiSettings';
import { AiStudy } from './components/AiStudy';
import { AppearanceSettings } from './components/Appearance';
import { BackupSettings } from './components/Backup';
import { Onboarding, ONBOARDED_KEY } from './components/Onboarding';
import { CourseDetail } from './components/CourseDetail';
import { GuardBanner } from './components/GuardBanner';
import { StudyPage } from './components/Study';
import { StudyRetentionSettings } from './components/StudyRetention';
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
import { Alert, BrandMark, Button, Card, cx, Hint, SectionLabel, Segmented, Select } from './ui';

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
  const [studyVersion, setStudyVersion] = useState(0);
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
  const courseNames = useMemo(
    () =>
      new Map(
        Object.values(taskData).flatMap((data) =>
          data.courses.map((course) => [`${course.siteId}/${course.id}`, course.name] as const)
        )
      ),
    [taskData]
  );
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
    const root = document.documentElement;
    root.lang = locale;
    // Swap the theme without color transitions, so controls do not fade from the old palette.
    root.classList.add('theme-changing');
    root.classList.toggle('dark', theme === 'dark' || (theme === 'system' && systemDark));
    void root.offsetHeight;
    root.classList.remove('theme-changing');
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
  const navigation: { key: Page; icon: typeof House; label: TranslationKey | 'tasks' }[] = [
    { key: 'today', icon: House, label: 'today' },
    { key: 'tasks', icon: ListChecks, label: 'tasks' },
    { key: 'courses', icon: Library, label: 'navCourses' },
    { key: 'study', icon: Sparkles, label: 'study' },
    { key: 'settings', icon: Settings2, label: 'navSettings' }
  ];
  return (
    <div className="flex min-h-screen flex-col bg-surface text-ink">
      <header className="sticky top-0 z-10 border-b border-line bg-canvas">
        <div className="flex items-center gap-3 px-4 pt-3 pb-2">
          <BrandMark className="h-9 w-9 shrink-0 rounded-lg shadow-card" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15px] leading-tight font-semibold">{translate('appName')}</h1>
            {/* The tagline is shown in full during onboarding; afterwards the header stays compact. */}
            {onboarding && <p className="text-[11px] leading-snug text-ink-3">{translate('tagline')}</p>}
          </div>
          <Segmented
            label={translate('language')}
            value={locale}
            onChange={saveLocale}
            className="w-[5.5rem] shrink-0"
            options={[
              { value: 'en', label: 'EN', ariaLabel: 'English' },
              { value: 'id', label: 'ID', ariaLabel: 'Bahasa Indonesia' }
            ]}
          />
        </div>
        {!onboarding && (
          <nav aria-label={translate('navigation')} className="grid grid-cols-5 gap-1 px-2 pb-2">
            {navigation.map((item) => (
              <button
                key={item.key}
                type="button"
                aria-current={page === item.key ? 'page' : undefined}
                onClick={() => {
                  setPage(item.key);
                  if (item.key === 'courses') setSelected(null);
                }}
                className={cx(
                  'flex min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[11px] font-medium transition-colors duration-150',
                  page === item.key ? 'bg-accent-soft text-accent-ink' : 'text-ink-3 hover:bg-well hover:text-ink'
                )}
              >
                <item.icon size={17} aria-hidden="true" />
                <span className="max-w-full truncate">
                  {item.label === 'tasks' ? taskText(locale, 'tasks') : translate(item.label)}
                </span>
              </button>
            ))}
          </nav>
        )}
      </header>
      <main className="flex-1 space-y-3 px-4 py-4">
        {onboarding ? (
          <Onboarding translate={translate} onDone={finishOnboarding} />
        ) : (
          <>
            {!hasChrome && (
              <Alert tone="warning" icon={TriangleAlert}>
                {translate('preview')}
              </Alert>
            )}
            {notice && (
              <Alert tone="success" icon={CircleCheck} role="status">
                {translate(notice)}
              </Alert>
            )}
            {shownError && (
              <Alert tone="error" icon={CircleAlert} role="alert">
                {translate(shownError)}
              </Alert>
            )}
            <GuardBanner guard={guard} translate={translate} />
            {(page === 'today' || page === 'courses') && (
              <>
                {hasChrome && sitesState.sites.length === 0 && (
                  <Card variant="accent">
                    <SiteEnableForm {...feedback} />
                  </Card>
                )}
                <SiteAlerts state={sitesState} {...feedback} />
                {page === 'today' && (
                  <Today
                    key={restored}
                    entries={entries}
                    tasks={tasks}
                    sites={sitesState.sites}
                    locale={locale}
                    courseNames={courseNames}
                    onSelect={selectCourse}
                    onOpenTasks={() => setPage('tasks')}
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
                <Hint faint className="px-1">
                  {translate('limitations')}
                </Hint>
              </>
            )}
            {page === 'tasks' && <TasksView sites={sitesState.sites} locale={locale} hidden={hiddenCourses} />}
            {page === 'study' && (
              <>
                {hasChrome && (
                  <AiStudy locale={locale} guard={guard} onCardsSaved={() => setStudyVersion((count) => count + 1)} />
                )}
                <StudyPage key={studyVersion} sites={sitesState.sites} guard={guard} {...feedback} />
              </>
            )}
            {page === 'settings' && (
              <>
                <h2 className="px-1 text-lg font-semibold">{translate('settings')}</h2>
                <Card className="space-y-4">
                  <SectionLabel>{translate('language')}</SectionLabel>
                  <Select
                    aria-label={translate('language')}
                    value={locale}
                    onChange={(e) => saveLocale(e.target.value as Locale)}
                  >
                    <option value="en">English</option>
                    <option value="id">Bahasa Indonesia</option>
                  </Select>
                  <SectionLabel>{translate('theme')}</SectionLabel>
                  <Segmented
                    label={translate('theme')}
                    value={theme}
                    onChange={saveTheme}
                    options={themeOptions.map((option) => ({
                      value: option.key,
                      icon: option.icon,
                      label: translate(option.key)
                    }))}
                  />
                </Card>
                {hasChrome && (
                  <Card>
                    <SitesSettings state={sitesState} {...feedback} />
                  </Card>
                )}
                {hasChrome && sitesState.sites.length > 0 && (
                  <Card>
                    <AppearanceSettings state={sitesState} {...feedback} />
                  </Card>
                )}
                {hasChrome && (
                  <Card>
                    <AiSettings locale={locale} onError={feedback.onError} />
                  </Card>
                )}
                {hasChrome && (
                  <Card>
                    <StudyRetentionSettings {...feedback} />
                  </Card>
                )}
                {hasChrome && (
                  <Card>
                    <BackupSettings
                      locale={locale}
                      {...feedback}
                      onNotice={(key) => {
                        feedback.onNotice(key);
                        setSelected(null);
                        setRestored((count) => count + 1);
                      }}
                    />
                  </Card>
                )}
                <Card variant="danger" className="space-y-2">
                  <SectionLabel tone="danger">{translate('clearData')}</SectionLabel>
                  <Hint>{translate('clearDataHint')}</Hint>
                  {confirmingClear ? (
                    <div className="space-y-2">
                      <p role="alert" className="text-xs font-semibold text-error-ink">
                        {translate('clearDataConfirmQuestion')}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <Button size="md" className="justify-center" onClick={() => setConfirmingClear(false)}>
                          {translate('cancel')}
                        </Button>
                        <Button
                          variant="danger"
                          size="md"
                          className="justify-center"
                          onClick={() => void clearLocalData()}
                        >
                          {translate('clearDataConfirm')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="dangerOutline"
                      onClick={() => {
                        setNotice(null);
                        setConfirmingClear(true);
                      }}
                    >
                      <Trash2 size={14} />
                      {translate('clearData')}
                    </Button>
                  )}
                </Card>
              </>
            )}
          </>
        )}
      </main>
      <footer className="px-4 pt-2 pb-5 text-center text-[11px] leading-relaxed text-ink-3">
        <p>{translate('unofficial')}</p>
        <p>
          {translate('copyright')} · v{__APP_VERSION__}
        </p>
      </footer>
    </div>
  );
}
