import { House, Library, ListChecks, Settings2, Sparkles } from 'lucide-react';
import { t, type TranslationKey } from '../shared/i18n';
import type { Locale, MoodleTask, Site } from '../shared/types';
import { Today } from '../sidepanel/components/Today';
import { AiStudy } from '../sidepanel/components/AiStudy';
import { StudyPage } from '../sidepanel/components/Study';
import { TasksView } from '../sidepanel/components/Tasks';
import type { CourseEntry } from '../sidepanel/courseEntries';
import { taskText } from '../sidepanel/taskStrings';
import { BrandMark } from '../sidepanel/ui';
import '../sidepanel/styles.css';

type Screen = 'today' | 'tasks' | 'practice' | 'ai' | 'consent';
const SCREENS: readonly Screen[] = ['today', 'tasks', 'practice', 'ai', 'consent'];

const params = new URLSearchParams(window.location.search);
const locale: Locale = params.get('locale') === 'id' ? 'id' : 'en';
const requestedScreen = params.get('screen') as Screen | null;
const screen: Screen = requestedScreen && SCREENS.includes(requestedScreen) ? requestedScreen : 'today';

const sites: Site[] = [
  { id: 'demo-a', origin: 'https://learn.example', label: 'Demo Learning Site', enabledAt: '2026-10-01T00:00:00Z' },
  { id: 'demo-b', origin: 'https://practice.example', label: 'Practice Portal', enabledAt: '2026-10-02T00:00:00Z' }
];
const now = Date.now();
const iso = (offsetMs: number) => new Date(now + offsetMs).toISOString();
const entries: CourseEntry[] = [
  {
    key: 'demo-a/101',
    site: sites[0]!,
    courseId: '101',
    prefs: { pinned: true, color: 'violet' },
    changes: [{ kind: 'added', activityId: 'a3', title: 'Graph traversal notes' }],
    snapshot: {
      courseId: '101',
      courseName: 'Data Structures',
      sourceUrl: 'https://learn.example/course/view.php?id=101',
      capturedAt: iso(-8 * 60_000),
      activities: [
        {
          id: 'a1',
          courseId: '101',
          title: 'Arrays and linked lists',
          type: 'resource',
          url: 'https://learn.example/mod/resource/view.php?id=1',
          restricted: false,
          completion: 'complete'
        },
        {
          id: 'a2',
          courseId: '101',
          title: 'Queue worksheet',
          type: 'assign',
          url: 'https://learn.example/mod/assign/view.php?id=2',
          restricted: false,
          completion: 'incomplete'
        }
      ]
    }
  },
  {
    key: 'demo-a/102',
    site: sites[0]!,
    courseId: '102',
    prefs: { pinned: true, color: 'amber' },
    changes: [],
    snapshot: {
      courseId: '102',
      courseName: 'Academic Writing',
      sourceUrl: 'https://learn.example/course/view.php?id=102',
      capturedAt: iso(-8 * 60_000),
      activities: [
        {
          id: 'b1',
          courseId: '102',
          title: 'Argument structure',
          type: 'page',
          url: 'https://learn.example/mod/page/view.php?id=3',
          restricted: false,
          completion: 'complete'
        },
        {
          id: 'b2',
          courseId: '102',
          title: 'Draft reflection',
          type: 'forum',
          url: 'https://learn.example/mod/forum/view.php?id=4',
          restricted: false,
          completion: 'incomplete'
        }
      ]
    }
  },
  {
    key: 'demo-b/201',
    site: sites[1]!,
    courseId: '201',
    prefs: { color: 'green' },
    changes: [
      {
        kind: 'completion',
        activityId: 'c1',
        title: 'Descriptive statistics',
        previous: 'incomplete',
        current: 'complete'
      }
    ],
    snapshot: {
      courseId: '201',
      courseName: 'Statistics Lab',
      sourceUrl: 'https://practice.example/course/view.php?id=201',
      capturedAt: iso(-12 * 60_000),
      activities: [
        {
          id: 'c1',
          courseId: '201',
          title: 'Descriptive statistics',
          type: 'quiz',
          url: 'https://practice.example/mod/quiz/view.php?id=5',
          restricted: false,
          completion: 'complete'
        },
        {
          id: 'c2',
          courseId: '201',
          title: 'Probability distributions',
          type: 'resource',
          url: 'https://practice.example/mod/resource/view.php?id=6',
          restricted: false,
          completion: 'unknown'
        }
      ]
    }
  }
];
const courseNames = new Map([
  ['demo-a/101', 'Data Structures'],
  ['demo-a/102', 'Academic Writing'],
  ['demo-b/201', 'Statistics Lab']
]);
const tasks: MoodleTask[] = [
  {
    siteId: 'demo-a',
    courseId: '102',
    activityId: '503',
    kind: 'assign',
    title: 'Essay outline',
    dueAt: iso(-20 * 60 * 60_000),
    url: 'https://learn.example/mod/assign/view.php?id=503',
    status: 'overdue',
    source: 'ajax'
  },
  {
    siteId: 'demo-a',
    courseId: '101',
    activityId: '501',
    kind: 'assign',
    title: 'Linked list worksheet',
    dueAt: iso(5 * 60 * 60_000),
    url: 'https://learn.example/mod/assign/view.php?id=501',
    status: 'open',
    source: 'ajax'
  },
  {
    siteId: 'demo-a',
    courseId: '102',
    activityId: '502',
    kind: 'forum',
    title: 'Peer review reflection',
    dueAt: iso(2 * 86_400_000),
    url: 'https://learn.example/mod/forum/view.php?id=502',
    status: 'open',
    source: 'ajax'
  },
  {
    siteId: 'demo-b',
    courseId: '201',
    activityId: '601',
    kind: 'quiz',
    title: 'Probability practice check',
    dueAt: iso(5 * 86_400_000),
    url: 'https://practice.example/mod/quiz/view.php?id=601',
    status: 'open',
    source: 'ajax'
  }
];

const copy = {
  en: {
    eyebrow: 'YOUR STUDY DAY, IN ONE PLACE',
    todayTitle: 'Know what needs attention.',
    todayBody: 'Courses, deadlines, progress and changes—organized locally across the sites you enable.',
    tasksTitle: 'Deadlines without the tab hunt.',
    tasksBody: 'Filter every task, open the source safely, or export your own calendar in one click.',
    practiceTitle: 'Private practice that stays private.',
    practiceBody: 'Review with spaced repetition, local XP and an assessment guard built for integrity.',
    aiTitle: 'Ask your PDF. Get page-cited answers.',
    aiBody: 'Bring your own Gemini, OpenAI or other key. Summaries, answers and flashcards point back to their pages.',
    consentTitle: 'See every word before it leaves.',
    consentBody: 'Each AI request first shows the exact text and destination. Nothing is sent until you continue.',
    heroBody:
      'Courses, deadlines, flashcards and AI study for any Moodle site you enable—free, local-first and read-only.',
    foot: 'Local-first · Read-only · No telemetry',
    disclaimer: 'Independent project · Not affiliated with Moodle Pty Ltd or any university'
  },
  id: {
    eyebrow: 'HARI BELAJAR DALAM SATU TEMPAT',
    todayTitle: 'Tahu yang perlu diperhatikan.',
    todayBody: 'Mata kuliah, tenggat, progres, dan perubahan—diatur lokal dari situs yang kamu aktifkan.',
    tasksTitle: 'Tenggat tanpa berburu tab.',
    tasksBody: 'Filter semua tugas, buka sumber dengan aman, atau ekspor kalendermu dalam sekali klik.',
    practiceTitle: 'Latihan privat tetap privat.',
    practiceBody: 'Tinjau dengan pengulangan terjadwal, XP lokal, dan pengaman penilaian untuk integritas.',
    aiTitle: 'Tanya PDF-mu. Jawaban dengan nomor halaman.',
    aiBody:
      'Pakai key Gemini, OpenAI, atau penyedia lain milikmu. Ringkasan, jawaban, dan flashcard menunjuk ke halamannya.',
    consentTitle: 'Lihat setiap kata sebelum terkirim.',
    consentBody:
      'Setiap permintaan AI menampilkan teks dan tujuan persisnya lebih dulu. Tidak ada yang terkirim sebelum kamu lanjut.',
    heroBody:
      'Mata kuliah, tenggat, flashcard, dan belajar dengan AI untuk situs Moodle yang kamu aktifkan—gratis, lokal, dan baca‑saja.',
    foot: 'Lokal · Baca-saja · Tanpa telemetri',
    disclaimer: 'Proyek independen · Tidak berafiliasi dengan Moodle Pty Ltd atau universitas mana pun'
  }
} as const;

const navigation = [
  { key: 'today', icon: House, label: 'today' as TranslationKey },
  { key: 'tasks', icon: ListChecks, label: null },
  { key: 'courses', icon: Library, label: 'navCourses' as TranslationKey },
  { key: 'practice', icon: Sparkles, label: 'study' as TranslationKey },
  { key: 'settings', icon: Settings2, label: 'navSettings' as TranslationKey }
];

function Panel({ screen, className = '' }: { screen: Screen; className?: string }) {
  const translate = (key: TranslationKey) => t(locale, key);
  const feedback = { translate, onNotice: () => undefined, onError: () => undefined };
  return (
    <div className={`preview-panel ${className}`}>
      <header className="sticky top-0 z-10 border-b border-line bg-canvas">
        <div className="flex items-center gap-3 px-4 pt-3 pb-2">
          <BrandMark className="h-9 w-9 shrink-0 rounded-lg shadow-card" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15px] leading-tight font-semibold">Moodlens</h1>
          </div>
          <span className="rounded-md bg-well px-2 py-1 text-[11px] font-semibold text-ink-2">
            {locale.toUpperCase()}
          </span>
        </div>
        <nav className="grid grid-cols-5 gap-1 px-2 pb-2">
          {navigation.map((item) => (
            <span
              key={item.key}
              className={`flex min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[11px] font-medium ${screen === item.key || (item.key === 'practice' && (screen === 'ai' || screen === 'consent')) ? 'bg-accent-soft text-accent-ink' : 'text-ink-3'}`}
            >
              <item.icon size={17} />
              <span className="max-w-full truncate">
                {item.label ? translate(item.label) : taskText(locale, 'tasks')}
              </span>
            </span>
          ))}
        </nav>
      </header>
      <main className="space-y-3 px-4 py-4">
        {screen === 'today' && (
          <Today
            entries={entries}
            tasks={tasks}
            sites={sites}
            locale={locale}
            courseNames={courseNames}
            onSelect={() => undefined}
            onOpenTasks={() => undefined}
            {...feedback}
          />
        )}
        {screen === 'tasks' && <TasksView sites={sites} locale={locale} hidden={new Set()} />}
        {screen === 'practice' && <StudyPage sites={sites} guard={{ active: false, reasons: [] }} {...feedback} />}
        {(screen === 'ai' || screen === 'consent') && (
          <AiStudy locale={locale} guard={{ active: false, reasons: [] }} onCardsSaved={() => undefined} />
        )}
      </main>
    </div>
  );
}

function Promo() {
  return (
    <main className="promo-canvas" aria-label="Moodlens promo tile">
      <div className="promo-orbit promo-orbit-one" />
      <div className="promo-orbit promo-orbit-two" />
      <div className="promo-card promo-card-one">
        <span />
      </div>
      <div className="promo-card promo-card-two">
        <span />
      </div>
      <div className="promo-card promo-card-three">
        <span />
      </div>
      <BrandMark className="promo-lens" />
      <div className="promo-spark promo-spark-one">✦</div>
      <div className="promo-spark promo-spark-two">✦</div>
    </main>
  );
}

/** README hero (1280×640, also the GitHub social preview size) and store marquee (1400×560). */
function Banner({ kind }: { kind: 'hero' | 'marquee' }) {
  const words = copy[locale];
  return (
    <main className={`banner-canvas banner-${kind}`}>
      <section className="banner-copy">
        <div className="store-brand">
          <BrandMark />
          <span>Moodlens</span>
        </div>
        <h1>{t(locale, 'tagline')}</h1>
        <p className="store-body">{words.heroBody}</p>
        <p className="store-foot">{words.foot}</p>
      </section>
      <div className="banner-panels">
        <Panel screen="practice" className="banner-panel-back" />
        <Panel screen="today" className="banner-panel-front" />
      </div>
      <div className="store-dot store-dot-one" />
      <div className="store-grid" />
    </main>
  );
}

const headings: Record<Screen, { title: keyof (typeof copy)['en']; body: keyof (typeof copy)['en'] }> = {
  today: { title: 'todayTitle', body: 'todayBody' },
  tasks: { title: 'tasksTitle', body: 'tasksBody' },
  practice: { title: 'practiceTitle', body: 'practiceBody' },
  ai: { title: 'aiTitle', body: 'aiBody' },
  consent: { title: 'consentTitle', body: 'consentBody' }
};

export function StorePreview() {
  const asset = params.get('asset');
  if (asset === 'promo') return <Promo />;
  if (asset === 'hero' || asset === 'marquee') return <Banner kind={asset} />;
  const words = copy[locale];
  return (
    <main className="store-canvas">
      <section className="store-copy">
        <div className="store-brand">
          <BrandMark />
          <span>Moodlens</span>
        </div>
        <p className="store-eyebrow">{words.eyebrow}</p>
        <h1>{words[headings[screen].title]}</h1>
        <p className="store-body">{words[headings[screen].body]}</p>
        <p className="store-foot">{words.foot}</p>
        <p className="store-disclaimer">{words.disclaimer}</p>
      </section>
      <Panel screen={screen} />
      <div className="store-dot store-dot-one" />
      <div className="store-dot store-dot-two" />
      <div className="store-grid" />
    </main>
  );
}
