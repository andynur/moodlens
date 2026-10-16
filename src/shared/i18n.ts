import type { Locale } from './types';

export const strings = {
  en: {
    appName: 'Moodlens', tagline: 'All in One Moodle AI Agent for Student',
    unofficial: 'Independent project · Not affiliated with your university or Moodle HQ',
    navigation: 'Navigation',
    activityResource: 'Resource', activityPage: 'Page', activityUrl: 'Link',
    activityAttendance: 'Attendance', activityQuiz: 'Quiz', activityForum: 'Forum',
    activityAssign: 'Assignment', activityUnknown: 'Other activity',
    today: 'Today', courses: 'Courses', study: 'Study AI', settings: 'Settings',
    currentCourse: 'Last viewed course', activities: 'Activities',
    noData: 'Open a course in the LMS to load its activities.',
    lastSeen: 'Last captured', preview: 'Browser preview: extension APIs are unavailable.',
    completed: 'Completed', incomplete: 'Not completed', unknown: 'Unknown',
    statusSummary: 'Activity overview', open: 'Open in LMS',
    ready: 'Ready to inspect course activities',
    studyPlanned: 'AI study features are planned for a future release.',
    studyPrivacy: 'No API keys or course documents are sent to AI providers in this starter.',
    language: 'Language', theme: 'Appearance', light: 'Light', dark: 'Dark',
    refreshHint: 'Visit or refresh the course page to update this snapshot.',
    emptyActivities: 'No supported activities were detected on this page.',
    limitations: 'Completion and deadline details must be verified against the actual LMS.',
    noNavigation: 'This activity link could not be validated.',
    untitledCourse: 'Untitled course',
    storageError: 'Saved data could not be loaded. Reload the side panel and try again.',
    copyright: 'Local development build · v0.1.0'
  },
  id: {
    appName: 'Moodlens', tagline: 'Agen AI Moodle All in One untuk Mahasiswa',
    unofficial: 'Proyek independen · Tidak berafiliasi dengan universitas atau Moodle HQ',
    navigation: 'Navigasi',
    activityResource: 'Materi', activityPage: 'Halaman', activityUrl: 'Tautan',
    activityAttendance: 'Presensi', activityQuiz: 'Kuis', activityForum: 'Forum',
    activityAssign: 'Tugas', activityUnknown: 'Aktivitas lain',
    today: 'Hari ini', courses: 'Mata kuliah', study: 'AI Belajar', settings: 'Pengaturan',
    currentCourse: 'Mata kuliah terakhir dibuka', activities: 'Aktivitas',
    noData: 'Buka mata kuliah di LMS untuk memuat aktivitasnya.',
    lastSeen: 'Terakhir diambil', preview: 'Pratinjau browser: API ekstensi tidak tersedia.',
    completed: 'Selesai', incomplete: 'Belum selesai', unknown: 'Belum diketahui',
    statusSummary: 'Ringkasan aktivitas', open: 'Buka di LMS',
    ready: 'Siap memeriksa aktivitas perkuliahan',
    studyPlanned: 'Fitur AI untuk belajar direncanakan pada rilis mendatang.',
    studyPrivacy: 'Starter ini tidak mengirim API key atau dokumen kuliah ke penyedia AI.',
    language: 'Bahasa', theme: 'Tampilan', light: 'Terang', dark: 'Gelap',
    refreshHint: 'Buka atau muat ulang halaman mata kuliah untuk memperbarui data.',
    emptyActivities: 'Tidak ditemukan aktivitas yang didukung di halaman ini.',
    limitations: 'Status penyelesaian dan tenggat perlu diverifikasi pada LMS asli.',
    noNavigation: 'Tautan aktivitas ini tidak dapat divalidasi.',
    untitledCourse: 'Mata kuliah tanpa judul',
    storageError: 'Data tersimpan tidak dapat dimuat. Muat ulang panel samping lalu coba lagi.',
    copyright: 'Versi pengembangan lokal · v0.1.0'
  }
} as const;
export type TranslationKey = keyof typeof strings.en;
export function t(locale: Locale, key: TranslationKey): string {
  return strings[locale]?.[key] ?? strings.en[key];
}
